-- Vesuvio Sleep — schema catalogo, media, richieste, impostazioni, storico.
-- Prezzi in centesimi IVA inclusa. Nessun dato di pagamento.

create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.availability as enum ('available', 'in_production', 'made_to_order', 'unavailable');
create type public.category_kind as enum ('materasso', 'rete', 'guanciale', 'topper', 'letto');
create type public.media_slot as enum ('hero', 'exploded', 'fabric', 'extra');
create type public.request_type as enum ('cart', 'quote', 'b2b');
create type public.request_status as enum (
  'bozza', 'in_attesa_contatto', 'in_trattativa', 'confermato_manualmente',
  'in_preparazione', 'spedito', 'consegnato', 'annullato', 'chiuso'
);

-- Amministratori: un utente Supabase Auth diventa admin solo se inserito qui
-- (procedura in docs/PRIMO_ADMIN.md, nessuna password predefinita).
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind public.category_kind not null,
  name text not null check (length(name) between 1 and 80),
  description text not null default '',
  sort int not null default 0,
  status public.publish_status not null default 'draft',
  seo_title text check (length(seo_title) <= 70),
  seo_description text check (length(seo_description) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  technical_name text not null default '',
  short text not null default '' check (length(short) <= 180),
  description text not null default '',
  composition text not null default '',
  highlights jsonb not null default '[]'::jsonb check (jsonb_typeof(highlights) = 'array'),
  claims jsonb not null default '[]'::jsonb check (jsonb_typeof(claims) = 'array'),
  removable_cover boolean,
  reversible boolean,
  summer_winter boolean,
  hybrid boolean not null default false,
  firmness_display text,
  line_code text not null default '',
  status public.publish_status not null default 'draft',
  sort int not null default 0,
  lead_time text,
  match jsonb,
  seo_title text check (length(seo_title) <= 70),
  seo_description text check (length(seo_description) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id, status, sort);

-- Note interne (conflitti di prezzo, campi da verificare): tabella separata, solo admin.
create table public.product_private (
  product_id uuid primary key references public.products (id) on delete cascade,
  internal_notes text not null default ''
);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  size text check (size ~ '^\d{2,3}x\d{2,3}$'),
  height_cm int check (height_cm between 1 and 60),
  price_cents int check (price_cents > 0),
  availability public.availability not null default 'unavailable',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (product_id, size, height_cm)
);
create index variants_product_idx on public.variants (product_id, sort);

-- Storico prezzi: base per comunicare correttamente eventuali riduzioni.
create table public.price_history (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.variants (id) on delete cascade,
  old_price_cents int,
  new_price_cents int,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  slot public.media_slot not null default 'extra',
  storage_path text not null unique,
  alt text not null default '',
  caption text,
  illustrative boolean not null default false,
  is_cover boolean not null default false,
  published boolean not null default false,
  sort int not null default 0,
  focal_x smallint not null default 50 check (focal_x between 0 and 100),
  focal_y smallint not null default 50 check (focal_y between 0 and 100),
  width int,
  height int,
  hotspots jsonb,
  created_at timestamptz not null default now(),
  -- una foto pubblicata deve avere un testo alternativo
  constraint media_alt_when_published check (not published or length(trim(alt)) > 0)
);
create unique index media_one_cover on public.media (product_id) where is_cover;

create table public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  type public.request_type not null,
  status public.request_status not null default 'bozza',
  items jsonb not null default '[]'::jsonb,
  total_cents int,
  quote jsonb,
  internal_notes text not null default '',
  tracking text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_status_idx on public.requests (status, created_at desc);

create table public.request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  status public.request_status not null,
  note text,
  actor text not null,
  at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid default auth.uid(),
  action text not null,
  entity text not null,
  detail text
);

-- updated_at automatico
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger t_cat_touch before update on public.categories for each row execute function public.touch_updated_at();
create trigger t_prod_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger t_var_touch before update on public.variants for each row execute function public.touch_updated_at();
create trigger t_req_touch before update on public.requests for each row execute function public.touch_updated_at();

-- storico prezzi automatico
create function public.log_price_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.price_cents is distinct from old.price_cents then
    insert into public.price_history (variant_id, old_price_cents, new_price_cents) values (new.id, old.price_cents, new.price_cents);
  end if;
  return new;
end $$;
create trigger t_var_price after update of price_cents on public.variants for each row execute function public.log_price_change();

-- Eliminazione definitiva solo per bozze non collegate a richieste: le altre si archiviano.
create function public.guard_product_delete() returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' then
    raise exception 'Solo le bozze si possono eliminare: archivia il prodotto %', old.slug using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.requests r
    where r.items @> jsonb_build_array(jsonb_build_object('product_id', old.id::text))
       or r.quote ->> 'product_id' = old.id::text
  ) then
    raise exception 'Il prodotto % è presente nello storico delle richieste: archivialo', old.slug using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger t_prod_delete before delete on public.products for each row execute function public.guard_product_delete();
