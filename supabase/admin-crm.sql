-- ════════════════════════════════════════════════════════════════════
-- Arena Manaus — Admin + CRM
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem problema.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Equipe com acesso ao admin ───────────────────────────────────
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff where user_id = auth.uid()) $$;

grant execute on function public.is_staff() to authenticated;

-- ── 2. Clientes (CRM) ───────────────────────────────────────────────
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,          -- só dígitos, ex: 48996411280
  email text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.normalize_phone(p text)
returns text language sql immutable
as $$ select regexp_replace(coalesce(p, ''), '\D', '', 'g') $$;

-- Cria o cliente pelo telefone, ou devolve o que já existe
create or replace function public.upsert_customer(p_name text, p_phone text, p_email text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_id uuid;
begin
  if v_phone = '' then
    return null;
  end if;

  insert into public.customers (name, phone, email)
  values (coalesce(nullif(trim(p_name), ''), 'Sem nome'), v_phone, nullif(trim(p_email), ''))
  on conflict (phone) do update set
    name = case when public.customers.name = 'Sem nome' then excluded.name else public.customers.name end,
    email = coalesce(public.customers.email, excluded.email),
    updated_at = now()
  returning id into v_id;

  return v_id;
end $$;

-- ── 3. Novas colunas em reservas e aulas experimentais ──────────────
alter table public.reservations add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.reservations add column if not exists notes text;
alter table public.reservations add column if not exists paid boolean not null default false;
alter table public.reservations add column if not exists source text not null default 'site';
alter table public.reservations add column if not exists created_at timestamptz not null default now();

alter table public.trial_classes add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.trial_classes add column if not exists notes text;
alter table public.trial_classes add column if not exists created_at timestamptz not null default now();

-- ── 4. Liga cada reserva / pedido ao cliente automaticamente ────────
create or replace function public.link_reservation_customer()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.player_phone is distinct from old.player_phone then
    new.customer_id := public.upsert_customer(new.player_name, new.player_phone, new.player_email);
  end if;
  return new;
end $$;

drop trigger if exists trg_reservation_customer on public.reservations;
create trigger trg_reservation_customer
  before insert or update of player_phone on public.reservations
  for each row execute function public.link_reservation_customer();

create or replace function public.link_trial_customer()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.phone is distinct from old.phone then
    new.customer_id := public.upsert_customer(new.name, new.phone, new.email);
  end if;
  return new;
end $$;

drop trigger if exists trg_trial_customer on public.trial_classes;
create trigger trg_trial_customer
  before insert or update of phone on public.trial_classes
  for each row execute function public.link_trial_customer();

-- Clientes para o que já existe no banco
update public.reservations
  set customer_id = public.upsert_customer(player_name, player_phone, player_email)
  where customer_id is null;
update public.trial_classes
  set customer_id = public.upsert_customer(name, phone, email)
  where customer_id is null;

-- ── 5. Horários ocupados para o site (sem expor nome nem telefone) ──
create or replace function public.get_busy_slots(p_date date)
returns table (court_id int, start_time text, end_time text)
language sql stable security definer set search_path = public
as $$
  select r.court_id::int,
         to_char(r.start_time::time, 'HH24:MI'),
         to_char(r.start_time::time + make_interval(mins => (r.duration_hours * 60)::int), 'HH24:MI')
  from public.reservations r
  where r.date::date = p_date and r.status <> 'cancelled'
  union all
  select b.court_id::int,                -- null = todas as quadras
         to_char(b.start_time::time, 'HH24:MI'),
         to_char(b.end_time::time, 'HH24:MI')
  from public.court_blocks b
  where b.date::date = p_date
$$;

grant execute on function public.get_busy_slots(date) to anon, authenticated;

-- ── 6. Permissões (RLS) ─────────────────────────────────────────────
-- Apaga as regras antigas destas tabelas e recria do zero
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('reservations', 'trial_classes', 'courts', 'court_blocks', 'events', 'customers', 'staff')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.reservations enable row level security;
alter table public.trial_classes enable row level security;
alter table public.courts enable row level security;
alter table public.court_blocks enable row level security;
alter table public.events enable row level security;
alter table public.customers enable row level security;
alter table public.staff enable row level security;

-- Site (visitantes): só cria reservas e pedidos, e lê quadras e eventos
create policy "site cria reserva" on public.reservations
  for insert to anon, authenticated with check (paid = false);
create policy "site cria aula experimental" on public.trial_classes
  for insert to anon, authenticated with check (true);
create policy "site lê quadras" on public.courts
  for select to anon, authenticated using (true);
create policy "site lê eventos" on public.events
  for select to anon, authenticated using (true);

-- Equipe: acesso total
create policy "equipe reservas" on public.reservations
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe aulas" on public.trial_classes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe quadras" on public.courts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe bloqueios" on public.court_blocks
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe eventos" on public.events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe clientes" on public.customers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe vê equipe" on public.staff
  for select to authenticated using (public.is_staff());

-- ── 7. Dê acesso ao admin ───────────────────────────────────────────
-- Antes: crie o usuário em Authentication > Users > Add user (e-mail + senha).
-- Depois troque o e-mail abaixo e rode só esta linha (repita para cada pessoa da equipe):
--
-- insert into public.staff (user_id) select id from auth.users where email = 'seu-email@exemplo.com' on conflict do nothing;

-- ── 8. Tempo real: o admin recebe novas reservas e pedidos na hora ──
-- (o Supabase continua aplicando as permissões: só a equipe recebe os dados)
do $$
declare t text;
begin
  foreach t in array array['reservations', 'trial_classes', 'customers', 'court_blocks'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── 9. Eventos publicados pelo admin ─────────────────────────────────
-- Rascunho: evento salvo mas ainda não visível no site
alter table public.events add column if not exists published boolean not null default true;

drop policy if exists "site lê eventos" on public.events;
create policy "site lê eventos" on public.events
  for select to anon, authenticated using (published);

-- Pasta pública para as fotos dos eventos (só a equipe envia/apaga)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "equipe envia fotos de eventos" on storage.objects;
create policy "equipe envia fotos de eventos" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-images' and public.is_staff());

drop policy if exists "equipe troca fotos de eventos" on storage.objects;
create policy "equipe troca fotos de eventos" on storage.objects
  for update to authenticated using (bucket_id = 'event-images' and public.is_staff());

drop policy if exists "equipe apaga fotos de eventos" on storage.objects;
create policy "equipe apaga fotos de eventos" on storage.objects
  for delete to authenticated using (bucket_id = 'event-images' and public.is_staff());

-- ── 10. Alunos e mensalidades ───────────────────────────────────────
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  birth_date date,
  sport text not null default 'futevolei',
  level text,
  plan text not null,                                   -- ex.: 2x/semana
  monthly_fee numeric(10, 2) not null default 0,
  due_day int not null default 10 check (due_day between 1 and 31),
  start_date date not null default current_date,
  status text not null default 'active',                -- active | paused | cancelled
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  reference_month date not null,                        -- sempre o dia 1 do mês
  due_date date not null,
  amount numeric(10, 2) not null,
  paid_at date,                                         -- null = não pago
  method text,
  notes text,
  created_at timestamptz not null default now(),
  unique (student_id, reference_month)
);

create index if not exists student_payments_due_idx on public.student_payments (due_date) where paid_at is null;

-- Aluno também entra no CRM (Clientes) com a etiqueta "aluno"
create or replace function public.link_student_customer()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.phone is distinct from old.phone then
    new.customer_id := public.upsert_customer(new.name, new.phone, new.email);
    update public.customers
      set tags = array_append(tags, 'aluno')
      where id = new.customer_id and not ('aluno' = any (tags));
  end if;
  return new;
end $$;

drop trigger if exists trg_student_customer on public.students;
create trigger trg_student_customer
  before insert or update of phone on public.students
  for each row execute function public.link_student_customer();

-- Só a equipe vê e mexe
alter table public.students enable row level security;
alter table public.student_payments enable row level security;

drop policy if exists "equipe alunos" on public.students;
create policy "equipe alunos" on public.students
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "equipe mensalidades" on public.student_payments;
create policy "equipe mensalidades" on public.student_payments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Tempo real no admin
do $$
declare t text;
begin
  foreach t in array array['students', 'student_payments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
