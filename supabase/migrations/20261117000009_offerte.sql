-- Offerte abbinate (bundle), 17/11/2026. Progetto: docs/OFFERTE.md.
--
-- Che cosa aggiunge:
--   * products.bundle_family: famiglia commerciale del materasso (foam | pocket);
--   * offers: le REGOLE di sconto, con i numeri in params (si cambiano da Admin);
--   * bundles + bundle_items: le VETRINE (es. "Letto Elite"), cioè quali prodotti stanno insieme;
--   * settings.offers_enabled: interruttore generale, leggibile dal pubblico;
--   * requests: subtotale, sconto e offerte applicate, salvati con la richiesta;
--   * price_cart: il calcolo, identico a core/offers.ts (un test lo verifica su centinaia di carrelli);
--   * validate_cart e create_cart_request: restituiscono e salvano lo sconto. create_cart_request
--     accetta il totale visto dal cliente e rifiuta se nel frattempo è cambiato (offer_changed).
--
-- Il prezzo lo decide il database: il browser mostra un'anteprima con le stesse regole, ma la
-- richiesta salvata usa sempre il calcolo fatto qui.

-- ------------------------------------------------------------------ prodotti
alter table public.products add column if not exists bundle_family text
  check (bundle_family in ('foam', 'pocket'));
comment on column public.products.bundle_family is
  'Famiglia per le offerte abbinate (foam | pocket). null = il prodotto non partecipa alle offerte.';

-- ------------------------------------------------------------------ regole
create or replace function public.offer_params_valid(p_code text, p jsonb) returns boolean
language plpgsql immutable set search_path = public as $$
declare
  pct_ok constant text := 'number';
  t jsonb;
  ok boolean := true;
  function_pct numeric;
begin
  if jsonb_typeof(p) <> 'object' then return false; end if;
  -- ogni percentuale presente deve essere un numero intero tra 0 e 30
  for function_pct in
    select (v)::text::numeric from (
      select p #> '{pct,foam}' v union all select p #> '{pct,pocket}' union all
      select p #> '{pct,topper}' union all select p #> '{pct,guanciale}' union all
      select case when jsonb_typeof(p -> 'pct') = 'number' then p -> 'pct' end
    ) x where v is not null and jsonb_typeof(v) = pct_ok
  loop
    if function_pct < 0 or function_pct > 30 or function_pct <> trunc(function_pct) then ok := false; end if;
  end loop;
  if p_code = 'letti-multipli' then
    if jsonb_typeof(p -> 'tiers') <> 'array' then return false; end if;
    for t in select * from jsonb_array_elements(p -> 'tiers') loop
      if jsonb_typeof(t -> 'pct') <> 'number' or jsonb_typeof(t -> 'min_sets') <> 'number' then return false; end if;
      if (t ->> 'pct')::numeric not between 0 and 30 or (t ->> 'min_sets')::numeric < 2 then ok := false; end if;
    end loop;
  end if;
  return ok;
end $$;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('letto-completo', 'letti-multipli', 'accessori', 'per-due', 'coppia-guanciali', 'tetto')),
  label text not null check (length(label) between 1 and 80),
  description text not null default '' check (length(description) <= 300),
  params jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  constraint offers_params_ok check (public.offer_params_valid(code, params)),
  constraint offers_dates_ok check (starts_at is null or ends_at is null or starts_at < ends_at)
);
comment on table public.offers is 'Regole delle offerte abbinate. I numeri stanno in params; le modifica solo un admin.';

-- ------------------------------------------------------------------ vetrine
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(name) between 1 and 80),
  tagline text not null default '' check (length(tagline) <= 180),
  description text not null default '' check (length(description) <= 800),
  badge text not null default '' check (length(badge) <= 40),
  theme text not null default 'classic' check (theme in ('elite', 'classic', 'start')),
  sizes text[],
  default_size text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.bundles is 'Offerte abbinate in vetrina. Il prezzo non si salva: lo calcolano le regole in offers.';

create table if not exists public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  height_cm int check (height_cm is null or height_cm between 5 and 45),
  qty int not null default 1 check (qty between 1 and 10),
  optional boolean not null default false,
  sort int not null default 0,
  unique (bundle_id, product_id)
);
create index if not exists bundle_items_product_idx on public.bundle_items (product_id);

drop trigger if exists t_offers_touch on public.offers;
create trigger t_offers_touch before update on public.offers for each row execute function public.touch_updated_at();
drop trigger if exists t_bundles_touch on public.bundles;
create trigger t_bundles_touch before update on public.bundles for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ RLS
alter table public.offers enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_items enable row level security;

-- le percentuali non sono segrete: le pagine le spiegano. Le bozze sì.
drop policy if exists offers_public_read on public.offers;
create policy offers_public_read on public.offers for select to anon, authenticated using (status <> 'draft');
-- Una vetrina pubblicata si vede solo se tutti i suoi pezzi obbligatori sono in vendita:
-- altrimenti (per esempio un guanciale ancora senza prezzo) resterebbe a metà. Il controllo
-- sta in una funzione SECURITY DEFINER perché le policy di bundles e bundle_items, citandosi
-- a vicenda, andrebbero in ricorsione.
create or replace function public.bundle_visible(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bundles b
     where b.id = bid and b.status = 'published'
       and not exists (select 1 from public.bundle_items i join public.products p on p.id = i.product_id
                        where i.bundle_id = b.id and not i.optional and p.status <> 'published'))
$$;
revoke all on function public.bundle_visible(uuid) from public;
grant execute on function public.bundle_visible(uuid) to anon, authenticated;

drop policy if exists bundles_public_read on public.bundles;
create policy bundles_public_read on public.bundles for select to anon, authenticated using (public.bundle_visible(id));
drop policy if exists bundle_items_public_read on public.bundle_items;
create policy bundle_items_public_read on public.bundle_items for select to anon, authenticated
  using (public.bundle_visible(bundle_id)
         and exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists admin_all_offers on public.offers;
create policy admin_all_offers on public.offers for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_all_bundles on public.bundles;
create policy admin_all_bundles on public.bundles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_all_bundle_items on public.bundle_items;
create policy admin_all_bundle_items on public.bundle_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.offers, public.bundles, public.bundle_items from anon, authenticated;
grant select on public.offers, public.bundles, public.bundle_items to anon, authenticated;
grant insert, update, delete on public.offers, public.bundles, public.bundle_items to authenticated;

-- ------------------------------------------------------------------ interruttore
insert into public.settings (key, value, is_public) values ('offers_enabled', 'true'::jsonb, true)
  on conflict (key) do update set is_public = true;

-- ------------------------------------------------------------------ richieste
alter table public.requests add column if not exists subtotal_cents int;
alter table public.requests add column if not exists discount_cents int not null default 0 check (discount_cents >= 0);
alter table public.requests add column if not exists offers jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------------ calcolo
-- Numero intero da un valore jsonb (troncato), con un valore di riserva.
create or replace function public._jint(j jsonb, d int) returns int
language sql immutable set search_path = public as $$
  select case when jsonb_typeof(j) = 'number' then trunc((j)::text::numeric)::int else d end
$$;
-- Percentuale: intera, tra 0 e 30 (come clampPct in core/offers.ts).
create or replace function public._jpct(j jsonb) returns int
language sql immutable set search_path = public as $$
  select greatest(0, least(30, public._jint(j, 0)))
$$;
-- cents × pct %, arrotondato al multiplo di step euro più vicino (metà verso l'alto).
create or replace function public._round_pct(cents bigint, pct int, step_eur int) returns int
language sql immutable set search_path = public as $$
  select (((2 * cents * pct + 100 * step_eur * 100) / (2 * 100 * step_eur * 100)) * step_eur * 100)::int
$$;

-- Regole attive come oggetto { codice: params }, oppure null se le offerte sono spente.
create or replace function public.offer_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((select value = 'true'::jsonb from public.settings where key = 'offers_enabled'), false)
    then coalesce((select jsonb_object_agg(code, params) from public.offers
                    where status = 'active'
                      and (starts_at is null or starts_at <= now())
                      and (ends_at is null or ends_at > now())), '{}'::jsonb)
  end
$$;

-- items: righe GIÀ VALIDE [{variant_id, qty}]. cfg: offer_config() (null = offerte spente).
-- Stesse regole e stesso ordine di priceCart in core/offers.ts.
create or replace function public.price_cart(items jsonb, cfg jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  n_lines int := case when jsonb_typeof(items) = 'array' then jsonb_array_length(items) else 0 end;
  u_line int[] := '{}'; u_kind text[] := '{}'; u_fam text[] := '{}'; u_size text[] := '{}';
  u_var uuid[] := '{}'; u_price int[] := '{}'; u_used boolean[] := '{}'; u_disc int[] := '{}';
  o_code text[] := '{}'; o_pct int[] := '{}'; o_size text[] := '{}'; o_amount int[] := '{}';
  o_u1 int[] := '{}'; o_u2 int[] := '{}';
  nu int; li int; k int; i int; m int; r int; rr int; g int[];
  it jsonb; rec record;
  subtotal bigint := 0; discount bigint; cap bigint; cap_pct int;
  set_m int[] := '{}'; set_r int[] := '{}'; nsets int := 0;
  tier int := 0; base int; pct int; step int; amt int; left_n int;
  top_sizes text[] := '{}'; pillows int;
  pa bigint; pb bigint; tot bigint; ba bigint; bb bigint; ra bigint; rb bigint;
  line_disc int[]; offers_out jsonb := '[]'::jsonb; vv uuid; idx int;
begin
  -- pezzi (una unità per pezzo)
  for li in 0 .. n_lines - 1 loop
    it := items -> li;
    select va.id, va.size, va.price_cents, p.bundle_family, c.kind::text as kind into rec
      from public.variants va
      join public.products p on p.id = va.product_id
      join public.categories c on c.id = p.category_id
     where va.id = (it ->> 'variant_id')::uuid;
    if not found or rec.price_cents is null then continue; end if;
    for k in 1 .. greatest(0, coalesce((it ->> 'qty')::int, 0)) loop
      u_line := u_line || li; u_kind := u_kind || rec.kind; u_fam := u_fam || rec.bundle_family;
      u_size := u_size || rec.size; u_var := u_var || rec.id; u_price := u_price || rec.price_cents;
      u_used := u_used || false; u_disc := u_disc || 0;
      subtotal := subtotal + rec.price_cents;
    end loop;
  end loop;
  nu := coalesce(array_length(u_price, 1), 0);

  if cfg is not null and nu > 0 then
    -- 1. letti completi: materassi più cari prima, ciascuno con la rete più cara libera della sua misura
    for m in select x from generate_series(1, nu) x
              where u_kind[x] = 'materasso' and u_fam[x] is not null order by u_price[x] desc, x loop
      rr := null;
      for r in select x from generate_series(1, nu) x where u_kind[x] = 'rete' order by u_price[x] desc, x loop
        if not u_used[r] and u_size[r] = u_size[m] then rr := r; exit; end if;
      end loop;
      if rr is not null then
        u_used[m] := true; u_used[rr] := true;
        set_m := set_m || m; set_r := set_r || rr;
      end if;
    end loop;
    nsets := coalesce(array_length(set_m, 1), 0);
    if cfg ? 'letti-multipli' and jsonb_typeof(cfg -> 'letti-multipli' -> 'tiers') = 'array' then
      select coalesce(max(public._jpct(t -> 'pct')), 0) into tier
        from jsonb_array_elements(cfg -> 'letti-multipli' -> 'tiers') t
       where nsets >= greatest(2, public._jint(t -> 'min_sets', 0));
    end if;
    for k in 1 .. nsets loop
      m := set_m[k]; r := set_r[k];
      base := case when cfg ? 'letto-completo' then public._jpct(cfg -> 'letto-completo' -> 'pct' -> u_fam[m]) else 0 end;
      pct := greatest(base, tier);
      if pct <= 0 then continue; end if;
      step := case when cfg ? 'letto-completo' then greatest(1, public._jint(cfg -> 'letto-completo' -> 'round_eur', 5)) else 5 end;
      o_code := o_code || (case when tier > base then 'letti-multipli' else 'letto-completo' end);
      o_pct := o_pct || pct; o_size := o_size || u_size[m];
      o_amount := o_amount || public._round_pct(u_price[m]::bigint + u_price[r], pct, step);
      o_u1 := o_u1 || m; o_u2 := o_u2 || r;
    end loop;

    -- 2. accessori: topper per letto completo della stessa misura; guanciali fino a N per materasso
    if cfg ? 'accessori' then
      pct := public._jpct(cfg -> 'accessori' -> 'pct' -> 'topper');
      step := greatest(1, public._jint(cfg -> 'accessori' -> 'round_eur', 1));
      for i in select x from generate_series(1, nu) x where u_kind[x] = 'topper' order by u_price[x] desc, x loop
        select count(*) into left_n from unnest(set_m) s where u_size[s] = u_size[i];
        left_n := left_n - coalesce((select count(*) from unnest(top_sizes) z where z = u_size[i]), 0);
        if left_n <= 0 or pct <= 0 then continue; end if;
        top_sizes := top_sizes || u_size[i];
        u_used[i] := true;
        o_code := o_code || 'accessori'::text; o_pct := o_pct || pct; o_size := o_size || u_size[i];
        o_amount := o_amount || public._round_pct(u_price[i], pct, step); o_u1 := o_u1 || i; o_u2 := o_u2 || null::int;
      end loop;
      pct := public._jpct(cfg -> 'accessori' -> 'pct' -> 'guanciale');
      select count(*) * greatest(0, public._jint(cfg -> 'accessori' -> 'guanciali_per_materasso', 2)) into pillows
        from generate_series(1, nu) x where u_kind[x] = 'materasso' and u_fam[x] is not null;
      for i in select x from generate_series(1, nu) x where u_kind[x] = 'guanciale' order by u_price[x] desc, x loop
        if pillows <= 0 or pct <= 0 then exit; end if;
        pillows := pillows - 1;
        u_used[i] := true;
        o_code := o_code || 'accessori'::text; o_pct := o_pct || pct; o_size := o_size || null::text;
        o_amount := o_amount || public._round_pct(u_price[i], pct, step); o_u1 := o_u1 || i; o_u2 := o_u2 || null::int;
      end loop;
    end if;

    -- 3. per due: materassi uguali rimasti senza rete, a coppie, nell'ordine del carrello
    if cfg ? 'per-due' then
      step := greatest(1, public._jint(cfg -> 'per-due' -> 'round_eur', 5));
      for vv in select u_var[x] from generate_series(1, nu) x
                 where u_kind[x] = 'materasso' and u_fam[x] is not null and not u_used[x]
                 group by u_var[x] order by min(x) loop
        g := array(select x from generate_series(1, nu) x
                    where u_var[x] = vv and u_kind[x] = 'materasso' and u_fam[x] is not null and not u_used[x] order by x);
        k := 1;
        while k + 1 <= coalesce(array_length(g, 1), 0) loop
          pct := public._jpct(cfg -> 'per-due' -> 'pct' -> u_fam[g[k]]);
          if pct > 0 then
            u_used[g[k]] := true; u_used[g[k + 1]] := true;
            o_code := o_code || 'per-due'::text; o_pct := o_pct || pct; o_size := o_size || u_size[g[k]];
            o_amount := o_amount || public._round_pct(u_price[g[k]]::bigint + u_price[g[k + 1]], pct, step);
            o_u1 := o_u1 || g[k]; o_u2 := o_u2 || g[k + 1];
          end if;
          k := k + 2;
        end loop;
      end loop;
    end if;

    -- 4. coppia di guanciali: guanciali uguali rimasti liberi, a coppie, nell'ordine del carrello
    if cfg ? 'coppia-guanciali' and public._jpct(cfg -> 'coppia-guanciali' -> 'pct') > 0 then
      pct := public._jpct(cfg -> 'coppia-guanciali' -> 'pct');
      step := greatest(1, public._jint(cfg -> 'coppia-guanciali' -> 'round_eur', 1));
      for vv in select u_var[x] from generate_series(1, nu) x
                 where u_kind[x] = 'guanciale' and not u_used[x]
                 group by u_var[x] order by min(x) loop
        g := array(select x from generate_series(1, nu) x where u_var[x] = vv and u_kind[x] = 'guanciale' and not u_used[x] order by x);
        k := 1;
        while k + 1 <= coalesce(array_length(g, 1), 0) loop
          u_used[g[k]] := true; u_used[g[k + 1]] := true;
          o_code := o_code || 'coppia-guanciali'::text; o_pct := o_pct || pct; o_size := o_size || null::text;
          o_amount := o_amount || public._round_pct(u_price[g[k]]::bigint + u_price[g[k + 1]], pct, step);
          o_u1 := o_u1 || g[k]; o_u2 := o_u2 || g[k + 1];
          k := k + 2;
        end loop;
      end loop;
    end if;

    -- 5. tetto
    cap_pct := case when cfg ? 'tetto' then public._jpct(cfg -> 'tetto' -> 'pct') else 15 end;
    cap := (subtotal * cap_pct) / 100;
    discount := coalesce((select sum(a) from unnest(o_amount) a), 0);
    if discount > cap then
      for k in 1 .. coalesce(array_length(o_amount, 1), 0) loop
        o_amount[k] := ((o_amount[k]::bigint * cap) / discount)::int;
      end loop;
    end if;

    -- 6. ripartizione sui pezzi (proporzionale al prezzo, resto maggiore, parità al primo)
    for k in 1 .. coalesce(array_length(o_amount, 1), 0) loop
      if o_u2[k] is null then
        u_disc[o_u1[k]] := u_disc[o_u1[k]] + o_amount[k];
      else
        pa := u_price[o_u1[k]]; pb := u_price[o_u2[k]]; tot := pa + pb;
        ba := (o_amount[k] * pa) / tot; bb := (o_amount[k] * pb) / tot;
        ra := o_amount[k] * pa - ba * tot; rb := o_amount[k] * pb - bb * tot;
        if o_amount[k] - ba - bb > 0 then
          if ra >= rb then ba := ba + 1; else bb := bb + 1; end if;
        end if;
        u_disc[o_u1[k]] := u_disc[o_u1[k]] + ba;
        u_disc[o_u2[k]] := u_disc[o_u2[k]] + bb;
      end if;
    end loop;

    -- offerte raggruppate per tipo, percentuale e misura, nell'ordine in cui compaiono
    for k in 1 .. coalesce(array_length(o_amount, 1), 0) loop
      if o_amount[k] <= 0 then continue; end if;
      idx := null;
      for i in 0 .. jsonb_array_length(offers_out) - 1 loop
        if offers_out -> i ->> 'code' = o_code[k] and (offers_out -> i ->> 'pct')::int = o_pct[k]
           and (offers_out -> i ->> 'size') is not distinct from o_size[k] then idx := i; exit; end if;
      end loop;
      if idx is null then
        offers_out := offers_out || jsonb_build_object(
          'code', o_code[k],
          'label', coalesce((select label from public.offers where code = o_code[k]),
                            case o_code[k] when 'letto-completo' then 'Vantaggio letto completo' when 'letti-multipli' then 'Vantaggio più letti'
                                           when 'accessori' then 'Vantaggio accessori' when 'coppia-guanciali' then 'Vantaggio coppia di guanciali'
                                           else 'Vantaggio per due' end),
          'pct', o_pct[k], 'size', o_size[k], 'amount_cents', o_amount[k], 'count', 1);
      else
        offers_out := jsonb_set(jsonb_set(offers_out, array[idx::text, 'amount_cents'], to_jsonb((offers_out -> idx ->> 'amount_cents')::int + o_amount[k])),
                                array[idx::text, 'count'], to_jsonb((offers_out -> idx ->> 'count')::int + 1));
      end if;
    end loop;
  end if;

  line_disc := array_fill(0, array[greatest(n_lines, 1)]);
  for i in 1 .. nu loop
    line_disc[u_line[i] + 1] := line_disc[u_line[i] + 1] + u_disc[i];
  end loop;
  discount := coalesce((select sum(d) from unnest(u_disc) d), 0);
  return jsonb_build_object(
    'subtotal_cents', subtotal,
    'discount_cents', discount,
    'total_cents', subtotal - discount,
    'line_discounts', to_jsonb(line_disc[1:n_lines]),
    'offers', offers_out,
    'sets', nsets);
end $$;

-- ------------------------------------------------------------------ validate_cart con lo sconto
-- Compatibile all'indietro: total_cents resta "quanto si paga" (ora al netto dello sconto).
create or replace function public.validate_cart(items jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  it jsonb;
  v record;
  lines jsonb := '[]'::jsonb;
  ok_items jsonb := '[]'::jsonb;
  ok_pos int[] := '{}';
  issues int := 0;
  qty int;
  status text;
  priced jsonb;
  k int;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 30 then
    raise exception 'Carrello non valido' using errcode = '22023';
  end if;
  for it in select * from jsonb_array_elements(items) loop
    qty := coalesce((it ->> 'qty')::int, 0);
    if qty < 1 or qty > 20 then
      raise exception 'Quantità non valida' using errcode = '22023';
    end if;
    select va.id, va.sku, va.size, va.height_cm, va.price_cents, va.availability, va.active,
           p.id as product_id, p.name, p.status as p_status, c.status as c_status
      into v
      from public.variants va
      join public.products p on p.id = va.product_id
      join public.categories c on c.id = p.category_id
     where va.id = (it ->> 'variant_id')::uuid;
    if not found then
      status := 'missing';
    elsif not (v.active and v.price_cents is not null and v.availability <> 'unavailable'
               and v.p_status = 'published' and v.c_status = 'published') then
      status := 'unavailable';
    elsif (it ->> 'seen_price_cents') is not null and (it ->> 'seen_price_cents')::int <> v.price_cents then
      status := 'price_changed';
    else
      status := 'ok';
      ok_items := ok_items || jsonb_build_object('variant_id', v.id, 'qty', qty);
      ok_pos := ok_pos || jsonb_array_length(lines);
    end if;
    if status <> 'ok' then issues := issues + 1; end if;
    lines := lines || jsonb_build_object(
      'variant_id', it ->> 'variant_id', 'qty', qty, 'status', status,
      'product_id', case when found then v.product_id end,
      'name', case when found then v.name end, 'sku', case when found then v.sku end,
      'size', case when found then v.size end, 'height_cm', case when found then v.height_cm end,
      'unit_cents', case when status in ('ok', 'price_changed') then v.price_cents end,
      'discount_cents', 0);
  end loop;
  priced := public.price_cart(ok_items, public.offer_config());
  for k in 1 .. coalesce(array_length(ok_pos, 1), 0) loop
    lines := jsonb_set(lines, array[ok_pos[k]::text, 'discount_cents'], priced -> 'line_discounts' -> (k - 1));
  end loop;
  return jsonb_build_object(
    'lines', lines,
    'subtotal_cents', (priced ->> 'subtotal_cents')::int,
    'discount_cents', (priced ->> 'discount_cents')::int,
    'total_cents', (priced ->> 'total_cents')::int,
    'offers', priced -> 'offers',
    'issues', issues,
    'can_submit', issues = 0);
end $$;

-- ------------------------------------------------------------------ create_cart_request con lo sconto
-- Cambia firma (aggiunge seen_total_cents): la vecchia si toglie, altrimenti PostgREST
-- troverebbe due funzioni con lo stesso nome.
drop function if exists public.create_cart_request(jsonb);
create or replace function public.create_cart_request(items jsonb, seen_total_cents int default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  res jsonb;
  ref text;
  rid uuid;
begin
  perform public.throttle('create_cart_request', 10, 600, 300);
  res := public.validate_cart(items);
  if not (res ->> 'can_submit')::boolean then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'validation', res);
  end if;
  -- il cliente ha visto un totale diverso (un'offerta è cambiata o scaduta nel frattempo):
  -- non si crea nulla, si mostra il nuovo calcolo e si chiede di confermare
  if seen_total_cents is not null and seen_total_cents <> (res ->> 'total_cents')::int then
    return jsonb_build_object('ok', false, 'reason', 'offer_changed', 'validation', res);
  end if;
  ref := public.make_ref('R');
  insert into public.requests (ref, type, status, items, subtotal_cents, discount_cents, offers, total_cents)
  values (ref, 'cart', 'bozza',
          (select jsonb_agg(l - 'status') from jsonb_array_elements(res -> 'lines') l),
          (res ->> 'subtotal_cents')::int, (res ->> 'discount_cents')::int, res -> 'offers',
          (res ->> 'total_cents')::int)
  returning id into rid;
  insert into public.request_events (request_id, status, note, actor)
  values (rid, 'bozza', case when (res ->> 'discount_cents')::int > 0
                             then 'Riepilogo generato dal carrello, con offerta abbinata'
                             else 'Riepilogo generato dal carrello' end, 'sito');
  return jsonb_build_object('ok', true, 'ref', ref, 'validation', res);
end $$;

-- ------------------------------------------------------------------ permessi
revoke all on function public.price_cart(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.offer_config() from public, anon, authenticated;
revoke all on function public._jint(jsonb, int) from public, anon, authenticated;
revoke all on function public._jpct(jsonb) from public, anon, authenticated;
revoke all on function public._round_pct(bigint, int, int) from public, anon, authenticated;
-- offer_params_valid resta eseguibile da authenticated: la usa il vincolo di controllo quando l'admin salva
revoke all on function public.offer_params_valid(text, jsonb) from public, anon;
grant execute on function public.offer_params_valid(text, jsonb) to authenticated;
revoke all on function public.create_cart_request(jsonb, int) from public;
grant execute on function public.validate_cart(jsonb) to anon, authenticated;
grant execute on function public.create_cart_request(jsonb, int) to anon, authenticated;
