\set ON_ERROR_STOP 1
-- helper per verificare che un'operazione venga rifiutata
create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'OK  % (rifiutato: %)', label, sqlerrm; return; end;
  raise exception 'FAIL % : doveva essere rifiutato', label;
end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin if not cond then raise exception 'FAIL %', label; end if; raise notice 'OK  %', label; end $$;
grant execute on function pg_temp.expect_error(text,text), pg_temp.check(boolean,text) to anon, authenticated;

-- dati di prova: un admin e un utente normale
insert into auth.users values ('00000000-0000-0000-0000-00000000a001'), ('00000000-0000-0000-0000-00000000b002');
insert into public.admins values ('00000000-0000-0000-0000-00000000a001');
insert into storage.objects (bucket_id, name) values ('product-media', 'seed/prodotti/vesuvio-pocket-2600-elite/hero-1200.webp'), ('product-media', 'seed/pocket-2400-cutaway-1200.webp'), ('product-media', 'bozze/foto-non-pubblicata.webp');
insert into public.media (product_id, slot, storage_path, alt, published)
  select id, 'extra', 'bozze/foto-non-pubblicata.webp', '', false from public.products where slug = 'memory-duo';

select pg_temp.check((select count(*) from public.variants) = 225, 'seed: 225 varianti (listino completo, anche senza prezzo)');
select pg_temp.check((select count(*) from public.variants where price_cents is not null) = 130, 'listino 15/11/2026: 130 varianti con prezzo');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-MD-H25-160190') = 28000, 'Memory Duo H25 160x190 = 280 € (listino 15/11/2026)');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-P2600-H30-160190') is null, 'Pocket H30 senza prezzo');
select pg_temp.check((select count(*) from public.products where slug in ('pocket-2400-elite', 'pocket-2600-elite')) = 1, 'Pocket 2600 Elite: un solo prodotto, nessun duplicato del 2400');
select pg_temp.check((select count(*) from public.variants where sku like 'VS-P2400-%') = 0, 'nessuno SKU 2400 residuo');
select pg_temp.check((select count(*) from (select product_id from public.media where is_cover group by product_id having count(*) > 1) x) = 0, 'una sola copertina per prodotto');
select pg_temp.check((select count(*) from public.media where storage_path ilike '%grafeno%') = 0, 'immagine Grafeno non caricata');
select pg_temp.check((select count(*) from public.variants v join public.products p on p.id = v.product_id where p.status = 'published' and v.price_cents is not null) = 130, '130 varianti con prezzo, tutte su prodotti pubblicati');
select pg_temp.check((select count(*) from public.products where status = 'published' and not exists (select 1 from public.variants v where v.product_id = products.id and v.price_cents > 0)) = 0, 'nessun prodotto pubblicato senza prezzo');
select pg_temp.check((select count(distinct storage_path) from public.media) = (select count(*) from public.media), 'percorsi delle foto univoci');

-- ---------------- pubblico (anon)
set role anon;
set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from public.products) = 8, 'anon vede solo gli 8 prodotti con prezzo');
select pg_temp.check(not exists (select 1 from public.products where slug in ('memory-air-3d','bonnell-classic','guanciale-piuma','castello-steel')), 'anon non vede i prodotti sospesi (senza prezzo)');
select pg_temp.check((select count(*) from public.categories) = 4, 'anon non vede la categoria in bozza');
select pg_temp.check((select count(*) from public.media) = 13, 'anon vede solo le foto pubblicate di prodotti pubblicati (13)');
select pg_temp.check((select count(*) from storage.objects) = 1, 'anon scarica solo file di foto pubblicate (non la vecchia foto 2400)');
select pg_temp.check((select count(*) from public.settings) = 6, 'anon legge solo le impostazioni pubbliche (contatti, pagamenti, spedizione, claim)');
select pg_temp.check((select value #>> '{}' from public.settings where key = 'whatsapp_number') = '+39 366 121 8346', 'numero WhatsApp aziendale pubblico');
select pg_temp.check((select value from public.settings where key = 'payment_methods') = '["contrassegno", "bonifico"]'::jsonb, 'pagamenti: contrassegno e bonifico');
select pg_temp.check((select new_slug from public.slug_redirects where old_slug = 'pocket-2400-elite') = 'pocket-2600-elite', 'anon legge il redirect pocket-2400-elite -> pocket-2600-elite');
select pg_temp.expect_error($q$insert into public.slug_redirects (old_slug, new_slug) values ('x', 'y')$q$, 'anon non scrive redirect');
select pg_temp.expect_error('select * from public.requests', 'anon non legge le richieste');
select pg_temp.expect_error('select * from public.product_private', 'anon non legge le note interne');
select pg_temp.expect_error($q$update public.variants set price_cents = 1$q$, 'anon non modifica i prezzi');
select pg_temp.expect_error($q$insert into public.requests (ref, type) values ('X', 'cart')$q$, 'anon non inserisce richieste direttamente');

select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P2600-H30-160190'), 'qty', 1))) -> 'lines' -> 0 ->> 'status') = 'unavailable', 'validate_cart: Pocket H30 non acquistabile');
select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 2, 'seen_price_cents', 25000))) -> 'lines' -> 0 ->> 'status') = 'price_changed', 'validate_cart: prezzo cambiato segnalato');
select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', gen_random_uuid(), 'qty', 1))) -> 'lines' -> 0 ->> 'status') = 'missing', 'validate_cart: variante inesistente');
select pg_temp.check((public.validate_cart(jsonb_build_array(
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 2, 'seen_price_cents', 28000),
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-FLEX-160190'), 'qty', 1)
  )) ->> 'total_cents')::int = 74000, 'validate_cart: totale 2×280 + 180 = 740 €');
select pg_temp.expect_error($q$select public.validate_cart('[{"variant_id":"00000000-0000-0000-0000-000000000000","qty":99}]')$q$, 'validate_cart: quantità fuori limite');
select pg_temp.check((public.create_cart_request(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P2600-H30-160190'), 'qty', 1))) ->> 'ok')::boolean = false, 'create_cart_request rifiuta carrello non valido');
select set_config('test.ref', public.create_cart_request(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-ESS-H25-160190'), 'qty', 1, 'seen_price_cents', 25000))) ->> 'ref', false);
select pg_temp.check(current_setting('test.ref') ~ '^VS-R-\d{8}-[2-9A-Z]{4}$', 'create_cart_request restituisce un riferimento');
select public.mark_request_waiting(current_setting('test.ref'));
select pg_temp.check((public.create_quote_request(null, 175, 195, 22, 'angoli smussati') ->> 'ok')::boolean, 'create_quote_request ok');
select pg_temp.expect_error($q$select public.create_quote_request(null, 10, 195, null, '')$q$, 'create_quote_request rifiuta misure assurde');
select pg_temp.expect_error($q$select public.make_ref('R')$q$, 'make_ref non esposta al pubblico');

-- ---------------- utente autenticato NON admin
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000b002';
select pg_temp.check((select count(*) from public.requests) = 0, 'utente normale: 0 richieste visibili');
select pg_temp.check((select count(*) from public.product_private) = 0, 'utente normale: 0 note interne');
update public.variants set price_cents = 1;
select pg_temp.check((select min(price_cents) from public.variants) > 1, 'utente normale: update prezzi senza effetto');
select pg_temp.check((select count(*) from public.products) = 8, 'utente normale: vede solo i pubblicati');

-- ---------------- admin
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
select pg_temp.check((select count(*) from public.products) = 15, 'admin vede anche le bozze');
select pg_temp.check((select status::text from public.requests where ref = current_setting('test.ref')) = 'in_attesa_contatto', 'richiesta in attesa di contatto (mai "pagata")');
select pg_temp.check((select count(*) from public.request_events) = 3, 'storico eventi richieste');
update public.variants set price_cents = 23000 where sku = 'VS-MD-H25-160190';
select pg_temp.check((select count(*) from public.price_history) = 1, 'storico prezzi registrato');
select pg_temp.expect_error($q$delete from public.products where slug = 'memory-duo'$q$, 'non si elimina un prodotto pubblicato');
update public.products set status = 'draft' where slug = 'vesuvio-essential-foam' or slug = 'essential-foam';
select pg_temp.expect_error($q$delete from public.products where slug = 'essential-foam'$q$, 'non si elimina una bozza presente nelle richieste');
update public.products set status = 'published' where slug = 'essential-foam';
delete from public.products where slug = 'bonnell-classic';
select pg_temp.check(not exists (select 1 from public.products where slug = 'bonnell-classic'), 'bozza non collegata eliminata');
select pg_temp.expect_error($q$update public.media set published = true where storage_path = 'bozze/foto-non-pubblicata.webp'$q$, 'foto senza alt non pubblicabile');
update public.media set alt = 'Memory Duo, dettaglio del tessuto', published = true where storage_path = 'bozze/foto-non-pubblicata.webp';
reset role;
set role anon;
set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from storage.objects) = 2, 'foto pubblicata dall''admin ora visibile al pubblico');
reset role;
\echo TUTTI I TEST SQL SUPERATI
