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
insert into storage.objects (bucket_id, name) values ('product-media', 'seed/pocket-2400-cutaway-1200.webp'), ('product-media', 'bozze/foto-non-pubblicata.webp');
insert into public.media (product_id, slot, storage_path, alt, published)
  select id, 'extra', 'bozze/foto-non-pubblicata.webp', '', false from public.products where slug = 'memory-duo';

select pg_temp.check((select count(*) from public.variants) = 100, 'seed: 100 varianti');
select pg_temp.check((select count(*) from public.variants where price_cents is not null) = 84, 'seed: 84 varianti con prezzo');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-MD-H25-160190') = 22000, 'Memory Duo H25 160x190 = 220 € (listino recente)');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-P2400-H30-160190') is null, 'Pocket H30 senza prezzo');

-- ---------------- pubblico (anon)
set role anon;
set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from public.products) = 10, 'anon vede solo i 10 prodotti pubblicati');
select pg_temp.check(not exists (select 1 from public.products where slug in ('topper-memory-cloud-5','pocket-1600','castello-steel')), 'anon non vede le bozze');
select pg_temp.check((select count(*) from public.categories) = 4, 'anon non vede la categoria in bozza');
select pg_temp.check((select count(*) from public.media) = 2, 'anon vede solo le foto pubblicate');
select pg_temp.check((select count(*) from storage.objects) = 1, 'anon scarica solo file di foto pubblicate');
select pg_temp.check((select count(*) from public.settings) = 3, 'anon legge solo le impostazioni pubbliche');
select pg_temp.expect_error('select * from public.requests', 'anon non legge le richieste');
select pg_temp.expect_error('select * from public.product_private', 'anon non legge le note interne');
select pg_temp.expect_error($q$update public.variants set price_cents = 1$q$, 'anon non modifica i prezzi');
select pg_temp.expect_error($q$insert into public.requests (ref, type) values ('X', 'cart')$q$, 'anon non inserisce richieste direttamente');

select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P2400-H30-160190'), 'qty', 1))) -> 'lines' -> 0 ->> 'status') = 'unavailable', 'validate_cart: Pocket H30 non acquistabile');
select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 2, 'seen_price_cents', 25000))) -> 'lines' -> 0 ->> 'status') = 'price_changed', 'validate_cart: prezzo cambiato segnalato');
select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', gen_random_uuid(), 'qty', 1))) -> 'lines' -> 0 ->> 'status') = 'missing', 'validate_cart: variante inesistente');
select pg_temp.check((public.validate_cart(jsonb_build_array(
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 2, 'seen_price_cents', 22000),
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-FLEX-160190'), 'qty', 1)
  )) ->> 'total_cents')::int = 61000, 'validate_cart: totale 2×220 + 170 = 610 €');
select pg_temp.expect_error($q$select public.validate_cart('[{"variant_id":"00000000-0000-0000-0000-000000000000","qty":99}]')$q$, 'validate_cart: quantità fuori limite');
select pg_temp.check((public.create_cart_request(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P2400-H30-160190'), 'qty', 1))) ->> 'ok')::boolean = false, 'create_cart_request rifiuta carrello non valido');
select set_config('test.ref', public.create_cart_request(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-ESS-H25-160190'), 'qty', 1, 'seen_price_cents', 20000))) ->> 'ref', false);
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
select pg_temp.check((select count(*) from public.products) = 10, 'utente normale: vede solo i pubblicati');

-- ---------------- admin
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
select pg_temp.check((select count(*) from public.products) = 14, 'admin vede anche le bozze');
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
