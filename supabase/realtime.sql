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
