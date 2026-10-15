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
