-- Row Level Security: il pubblico (anon/authenticated non admin) vede solo il
-- catalogo pubblicato. Richieste, note, bozze, storico e impostazioni private
-- sono accessibili solo agli admin. Le richieste dal sito passano da funzioni
-- security definer con validazione (0003_functions.sql).

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.product_private enable row level security;
alter table public.price_history enable row level security;
alter table public.media enable row level security;
alter table public.settings enable row level security;
alter table public.requests enable row level security;
alter table public.request_events enable row level security;
alter table public.audit_log enable row level security;

-- Lettura pubblica del solo catalogo pubblicato
create policy cat_public_read on public.categories for select to anon, authenticated
  using (status = 'published');
create policy prod_public_read on public.products for select to anon, authenticated
  using (status = 'published' and exists (select 1 from public.categories c where c.id = category_id and c.status = 'published'));
create policy var_public_read on public.variants for select to anon, authenticated
  using (active and exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy media_public_read on public.media for select to anon, authenticated
  using (published and exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy settings_public_read on public.settings for select to anon, authenticated
  using (is_public);

grant select on public.categories, public.products, public.variants, public.media, public.settings to anon, authenticated;

-- Admin: accesso completo
create policy admin_all_categories on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_products on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_private on public.product_private for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_variants on public.variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_media on public.media for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_settings on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_requests on public.requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_events on public.request_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_read_prices on public.price_history for select to authenticated using (public.is_admin());
create policy admin_read_audit on public.audit_log for select to authenticated using (public.is_admin());
create policy admin_insert_audit on public.audit_log for insert to authenticated with check (public.is_admin());
create policy admin_read_admins on public.admins for select to authenticated using (public.is_admin());

grant insert, update, delete on public.categories, public.products, public.variants, public.media, public.settings,
  public.requests, public.request_events, public.product_private to authenticated;
grant select on public.product_private to authenticated;
grant select on public.requests, public.request_events, public.price_history, public.audit_log, public.admins to authenticated;
grant insert on public.audit_log to authenticated;

-- ------------------------------------------------------------------ Storage
-- Bucket privato: le foto si leggono solo se la riga media è pubblicata e il
-- prodotto è pubblicato. Le bozze restano invisibili al pubblico.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy media_objects_public_read on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'product-media'
    and exists (
      select 1 from public.media m join public.products p on p.id = m.product_id
      where m.storage_path = storage.objects.name and m.published and p.status = 'published'
    )
  );
create policy media_objects_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'product-media' and public.is_admin())
  with check (bucket_id = 'product-media' and public.is_admin());
