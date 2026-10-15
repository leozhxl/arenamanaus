-- ════════════════════════════════════════════════════════════════════
-- Arena Manaus — Segurança
-- O site deixa de gravar direto nas tabelas: reservas e pedidos de aula
-- passam por funções que validam tudo, calculam o preço no servidor e
-- limitam abusos (robôs reservando todos os horários, spam etc.).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Área privada (não acessível pela internet) ───────────────────
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.rate_limits (
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_key_idx on private.rate_limits (key, created_at);
create index if not exists rate_limits_created_idx on private.rate_limits (created_at);

-- IP de quem está chamando (enviado pelo Supabase nos cabeçalhos)
create or replace function private.client_ip()
returns text language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::json ->> 'cf-connecting-ip', ''),
    nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''),
    'unknown'
  )
$$;

-- Conta uma tentativa. Devolve false se passou do limite na janela de tempo.
create or replace function private.hit(p_key text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = private
as $$
declare n int;
begin
  delete from private.rate_limits where created_at < now() - interval '2 days';
  select count(*) into n from private.rate_limits where key = p_key and created_at > now() - p_window;
  if n >= p_max then
    return false;
  end if;
  insert into private.rate_limits (key) values (p_key);
  return true;
end $$;

-- ── 2. Funções internas não podem ser chamadas pela internet ────────
revoke execute on function public.upsert_customer(text, text, text) from public, anon, authenticated;
revoke execute on function public.normalize_phone(text) from public, anon, authenticated;
revoke execute on function public.link_reservation_customer() from public, anon, authenticated;
revoke execute on function public.link_trial_customer() from public, anon, authenticated;
revoke execute on function public.link_student_customer() from public, anon, authenticated;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ── 3. O banco impede duas reservas no mesmo horário/quadra ─────────
create extension if not exists btree_gist with schema extensions;

alter table public.reservations drop constraint if exists reservations_no_overlap;
alter table public.reservations add constraint reservations_no_overlap
  exclude using gist (
    court_id with =,
    tsrange(date + start_time, date + start_time + duration_hours::float8 * interval '1 hour') with &&
  ) where (status <> 'cancelled');

-- Limites básicos de tamanho (evita textos gigantes)
alter table public.reservations drop constraint if exists reservations_sane;
alter table public.reservations add constraint reservations_sane check (
  duration_hours > 0 and duration_hours <= 6
  and num_players between 1 and 30
  and length(player_name) <= 100 and length(player_phone) <= 30 and length(player_email) <= 150
  and total_price >= 0
);
alter table public.trial_classes drop constraint if exists trial_classes_sane;
alter table public.trial_classes add constraint trial_classes_sane check (
  length(name) <= 100 and length(phone) <= 30 and length(email) <= 150
);

-- ── 4. Reserva pelo site (valida tudo e calcula o preço no servidor) ─
-- Tabela de preço por hora — manter igual a PRICING em src/lib/constants.ts
create or replace function public.create_reservation(
  p_court_id int,
  p_sport text,
  p_date date,
  p_start_time time,
  p_duration numeric,
  p_num_players int,
  p_name text,
  p_phone text,
  p_email text,
  p_payment_method text
)
returns json
language plpgsql security definer set search_path = public, private
as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_ip text := private.client_ip();
  v_now timestamp := now() at time zone 'America/Sao_Paulo';
  v_start timestamp := p_date + p_start_time;
  v_end timestamp := p_date + p_start_time + p_duration::float8 * interval '1 hour';
  v_dow int := extract(dow from p_date);
  v_hourly numeric;
  v_price numeric;
  v_id uuid;
begin
  -- Dados válidos
  if p_sport not in ('futevolei', 'volei', 'beachtennis') then raise exception 'Modalidade inválida.'; end if;
  if p_duration not in (1, 1.5, 2) then raise exception 'Duração inválida.'; end if;
  if p_num_players is null or p_num_players not between 1 and 20 then raise exception 'Número de jogadores inválido.'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'Informe seu nome.'; end if;
  if length(v_phone) not between 10 and 13 then raise exception 'Informe um WhatsApp válido com DDD.'; end if;
  if length(coalesce(p_email, '')) > 120 then raise exception 'E-mail muito longo.'; end if;
  if p_payment_method not in ('pix', 'arena') then raise exception 'Forma de pagamento inválida.'; end if;
  if v_start < v_now then raise exception 'Esse horário já passou.'; end if;
  if p_date > (v_now::date + 90) then raise exception 'Só é possível reservar até 90 dias à frente.'; end if;
  if p_start_time < time '06:00' or v_end > p_date + time '23:00' then raise exception 'Fora do horário de funcionamento.'; end if;
  if not exists (select 1 from public.courts where id = p_court_id and active) then raise exception 'Quadra indisponível.'; end if;

  -- Proteção contra abuso
  if not private.hit('res:phone:' || v_phone, 3, interval '1 day') then
    raise exception 'Limite de reservas pelo site atingido para este telefone hoje. Fale com a arena no WhatsApp.';
  end if;
  if v_ip <> 'unknown' and not private.hit('res:ip:' || v_ip, 6, interval '1 hour') then
    raise exception 'Muitas tentativas seguidas. Aguarde alguns minutos ou fale com a arena no WhatsApp.';
  end if;

  -- Horário livre? (reservas e bloqueios)
  if exists (
    select 1 from public.get_busy_slots(p_date) b
    where (b.court_id is null or b.court_id = p_court_id)
      and p_start_time < b.end_time::time
      and b.start_time::time < p_start_time + p_duration::float8 * interval '1 hour'
  ) then
    raise exception 'HORARIO_OCUPADO';
  end if;

  -- Preço: fim de semana > noite (a partir das 18h) > dia
  v_hourly := case
    when v_dow in (0, 6) then 100
    when p_start_time >= time '18:00' then 80
    else 60
  end;
  v_price := v_hourly * p_duration;

  begin
    insert into public.reservations (
      court_id, sport, date, start_time, duration_hours, num_players,
      player_name, player_phone, player_email, total_price, payment_method, status, paid, source
    ) values (
      p_court_id, p_sport, p_date, p_start_time, p_duration, p_num_players,
      trim(p_name), trim(p_phone), coalesce(trim(p_email), ''), v_price, p_payment_method, 'confirmed', false, 'site'
    )
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_OCUPADO';
  end;

  return json_build_object('id', v_id, 'total_price', v_price);
end $$;

revoke execute on function public.create_reservation(int, text, date, time, numeric, int, text, text, text, text) from public;
grant execute on function public.create_reservation(int, text, date, time, numeric, int, text, text, text, text) to anon, authenticated;

-- ── 5. Pedido de aula experimental pelo site ────────────────────────
create or replace function public.request_trial_class(
  p_sport text,
  p_level text,
  p_day text,
  p_time text,
  p_name text,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql security definer set search_path = public, private
as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_ip text := private.client_ip();
  v_id uuid;
begin
  if p_sport not in ('futevolei', 'volei', 'beachtennis') then raise exception 'Modalidade inválida.'; end if;
  if length(coalesce(p_level, '')) not between 1 and 40 then raise exception 'Escolha o nível.'; end if;
  if length(coalesce(p_day, '')) > 20 or length(coalesce(p_time, '')) > 20 then raise exception 'Dados inválidos.'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'Informe seu nome.'; end if;
  if length(v_phone) not between 10 and 13 then raise exception 'Informe um WhatsApp válido com DDD.'; end if;
  if length(coalesce(p_email, '')) > 120 then raise exception 'E-mail muito longo.'; end if;

  if not private.hit('trial:phone:' || v_phone, 2, interval '1 day') then
    raise exception 'Já recebemos seu pedido hoje. Em breve a gente chama no WhatsApp!';
  end if;
  if v_ip <> 'unknown' and not private.hit('trial:ip:' || v_ip, 5, interval '1 hour') then
    raise exception 'Muitas tentativas seguidas. Aguarde alguns minutos.';
  end if;

  insert into public.trial_classes (sport, level, preferred_day, preferred_time, name, phone, email, status)
  values (p_sport, p_level, nullif(p_day, ''), nullif(p_time, ''), trim(p_name), trim(p_phone), coalesce(trim(p_email), ''), 'pending')
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.request_trial_class(text, text, text, text, text, text, text) from public;
grant execute on function public.request_trial_class(text, text, text, text, text, text, text) to anon, authenticated;

-- ── 6. O site não grava mais direto nas tabelas ─────────────────────
drop policy if exists "site cria reserva" on public.reservations;
drop policy if exists "site cria aula experimental" on public.trial_classes;
