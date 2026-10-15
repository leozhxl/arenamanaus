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
