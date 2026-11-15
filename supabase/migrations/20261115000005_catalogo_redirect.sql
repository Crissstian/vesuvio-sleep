-- Aggiornamento catalogo 15/11/2026.
-- 1) Redirect degli slug cambiati (es. pocket-2400-elite -> pocket-2600-elite):
--    l'app risponde con un 301 dal vecchio indirizzo al nuovo.
create table public.slug_redirects (
  old_slug text primary key check (old_slug ~ '^[a-z0-9-]+$'),
  new_slug text not null check (new_slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now()
);
alter table public.slug_redirects enable row level security;
create policy redirects_public_read on public.slug_redirects for select to anon, authenticated using (true);
create policy admin_all_redirects on public.slug_redirects for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.slug_redirects to anon, authenticated;
grant insert, update, delete on public.slug_redirects to authenticated;

-- 2) Sfondo dell'immagine prodotto ("white" per le foto su fondo bianco),
--    usato dal sito per fondere la foto con il riquadro della card.
alter table public.media add column bg text check (bg in ('white'));
