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
insert into storage.objects (bucket_id, name) values ('product-media', 'seed/prodotti/vesuvio-pocket-3000-elite/hero-1200.webp'), ('product-media', 'seed/pocket-2400-cutaway-1200.webp'), ('product-media', 'bozze/foto-non-pubblicata.webp');
insert into public.media (product_id, slot, storage_path, alt, published)
  select id, 'extra', 'bozze/foto-non-pubblicata.webp', '', false from public.products where slug = 'memory-duo';

select pg_temp.check((select count(*) from public.variants) = 238, 'seed: 238 varianti (listino completo, anche senza prezzo)');
select pg_temp.check((select count(*) from public.variants where price_cents is not null) = 182, 'listino: 182 varianti con prezzo');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-MD-H25-160190') = 28000, 'Memory Duo H25 160x190 = 280 € (listino 15/11/2026)');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-P3000-H30-160190') = 65000, 'Pocket 3000 H30 160x190 = 650 € (16/11/2026 sera)');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-MD-H30-160190') = 33000, 'Memory Duo H30 160x190 = 330 €');
select pg_temp.check((select count(*) from public.products where slug in ('pocket-2400-elite', 'pocket-2600-elite', 'pocket-3000-elite')) = 1, 'Pocket 3000 Elite: un solo prodotto, nessun duplicato dei nomi precedenti');
select pg_temp.check((select count(*) from public.variants where sku like 'VS-P2400-%' or sku like 'VS-P2600-%') = 0, 'nessuno SKU dei nomi precedenti del Pocket');
select pg_temp.check((select count(*) from (select product_id from public.media where is_cover group by product_id having count(*) > 1) x) = 0, 'una sola copertina per prodotto');
select pg_temp.check((select count(*) from public.media where storage_path ilike '%grafeno%') = 0, 'immagine Grafeno non caricata');
select pg_temp.check((select count(*) from public.variants v join public.products p on p.id = v.product_id where p.status = 'published' and v.price_cents is not null) = 182, '182 varianti acquistabili, tutte su prodotti pubblicati');
select pg_temp.check((select status from public.products where slug = 'pocket-1600') = 'published', 'Pocket 1600 rientrato in catalogo');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-P1600-H25-160190') = 50000, 'Pocket 1600 H25 160x190 = 500 € (16/11/2026)');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-P3000-H25-160190') = 62000, 'Pocket 3000 H25 160x190 = 620 € (16/11/2026)');
select pg_temp.check((select price_cents from public.variants where sku = 'VS-MDC-H25-160190') = 26000, 'Memory Duo Classic H25 160x190 = 260 € (Duo meno 20 €)');
select pg_temp.check((select count(*) from public.variants v join public.products p on p.id = v.product_id where p.category_id = (select id from public.categories where slug = 'materassi') and v.price_cents is not null and v.price_cents % 1000 <> 0) = 0, 'materassi: nessun prezzo che non sia un multiplo di 10 euro');
select pg_temp.check((select count(*) from public.products where status = 'archived') = 2, 'fuori gamma dal 16/11/2026: Memory Air 3D e Bonnell Classic');
select pg_temp.check((select count(*) from public.products where status = 'published' and not exists (select 1 from public.variants v where v.product_id = products.id and v.price_cents > 0)) = 0, 'nessun prodotto pubblicato senza prezzo');
select pg_temp.check((select count(distinct storage_path) from public.media) = (select count(*) from public.media), 'percorsi delle foto univoci');

-- ---------------- pubblico (anon)
set role anon;
set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from public.products) = 9, 'anon vede solo i 9 prodotti in catalogo');
select pg_temp.check(not exists (select 1 from public.products where slug in ('memory-air-3d','bonnell-classic','guanciale-piuma','castello-steel')), 'anon non vede i prodotti sospesi (senza prezzo)');
select pg_temp.check((select count(*) from public.categories) = 4, 'anon non vede la categoria in bozza');
select pg_temp.check((select count(*) from public.media) = 24, 'anon vede solo le foto pubblicate di prodotti pubblicati (24)');
select pg_temp.check((select count(*) from storage.objects) = 1, 'anon scarica solo file di foto pubblicate (non la vecchia foto 2400)');
select pg_temp.check((select count(*) from public.settings) = 7, 'anon legge solo le impostazioni pubbliche (contatti, pagamenti, spedizione, claim, interruttore offerte)');
select pg_temp.check((select value #>> '{}' from public.settings where key = 'whatsapp_number') = '+39 366 121 8346', 'numero WhatsApp aziendale pubblico');
select pg_temp.check((select value from public.settings where key = 'payment_methods') = '["contrassegno", "bonifico"]'::jsonb, 'pagamenti: contrassegno e bonifico');
select pg_temp.check((select new_slug from public.slug_redirects where old_slug = 'pocket-2400-elite') = 'pocket-3000-elite', 'anon legge il redirect pocket-2400-elite -> pocket-3000-elite');
select pg_temp.expect_error($q$insert into public.slug_redirects (old_slug, new_slug) values ('x', 'y')$q$, 'anon non scrive redirect');
select pg_temp.expect_error('select * from public.requests', 'anon non legge le richieste');
select pg_temp.expect_error('select * from public.product_private', 'anon non legge le note interne');
select pg_temp.expect_error($q$update public.variants set price_cents = 1$q$, 'anon non modifica i prezzi');
select pg_temp.expect_error($q$insert into public.requests (ref, type) values ('X', 'cart')$q$, 'anon non inserisce richieste direttamente');

select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MDC-H25-80190'), 'qty', 1))) -> 'lines' -> 0 ->> 'status') = 'ok', 'validate_cart: variante a listino acquistabile');
select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 2, 'seen_price_cents', 25000))) -> 'lines' -> 0 ->> 'status') = 'price_changed', 'validate_cart: prezzo cambiato segnalato');
select pg_temp.check((public.validate_cart(jsonb_build_array(jsonb_build_object('variant_id', gen_random_uuid(), 'qty', 1))) -> 'lines' -> 0 ->> 'status') = 'missing', 'validate_cart: variante inesistente');
select pg_temp.check((public.validate_cart(jsonb_build_array(
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 2, 'seen_price_cents', 28000),
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-FLEX-160190'), 'qty', 1)
  )) ->> 'subtotal_cents')::int = 74000, 'validate_cart: listino 2×280 + 180 = 740 €');
select pg_temp.check((public.validate_cart(jsonb_build_array(
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 2, 'seen_price_cents', 28000),
    jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-FLEX-160190'), 'qty', 1)
  )) ->> 'total_cents')::int = 71500, 'validate_cart: un letto completo (−25 €), il secondo materasso resta a listino: 715 €');
select pg_temp.expect_error($q$select public.validate_cart('[{"variant_id":"00000000-0000-0000-0000-000000000000","qty":99}]')$q$, 'validate_cart: quantità fuori limite');
select pg_temp.check((public.create_cart_request(jsonb_build_array(jsonb_build_object('variant_id', (select id from public.variants where sku='VS-BON-H25-160190'), 'qty', 1))) ->> 'ok')::boolean = false, 'create_cart_request rifiuta carrello non valido');
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
select pg_temp.check((select count(*) from public.products) = 9, 'utente normale: vede solo i pubblicati');

-- ---------------- admin
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
select pg_temp.check((select count(*) from public.products) = 16, 'admin vede anche bozze e archiviati');
select pg_temp.check((select status::text from public.requests where ref = current_setting('test.ref')) = 'in_attesa_contatto', 'richiesta in attesa di contatto (mai "pagata")');
select pg_temp.check((select count(*) from public.request_events) = 3, 'storico eventi richieste');
update public.variants set price_cents = 23000 where sku = 'VS-MD-H25-160190';
select pg_temp.check((select count(*) from public.price_history) = 1, 'storico prezzi registrato');
select pg_temp.expect_error($q$delete from public.products where slug = 'memory-duo'$q$, 'non si elimina un prodotto pubblicato');
update public.products set status = 'draft' where slug = 'eco';
select pg_temp.expect_error($q$delete from public.products where slug = 'eco'$q$, 'non si elimina una bozza presente nelle richieste');
update public.products set status = 'published' where slug = 'eco';
delete from public.products where slug = 'castello-steel';
select pg_temp.check(not exists (select 1 from public.products where slug = 'castello-steel'), 'bozza non collegata eliminata');
select pg_temp.expect_error($q$update public.media set published = true where storage_path = 'bozze/foto-non-pubblicata.webp'$q$, 'foto senza alt non pubblicabile');
update public.media set alt = 'Memory Duo, dettaglio del tessuto', published = true where storage_path = 'bozze/foto-non-pubblicata.webp';
reset role;
set role anon;
set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from storage.objects) = 2, 'foto pubblicata dall''admin ora visibile al pubblico');

-- ---------------- limite anti-abuso sulle funzioni pubbliche
-- Ultimo blocco di proposito: crea richieste di prova, quindi va dopo i conteggi.
do $$
declare
  i int;
  riuscite int := 0;
begin
  for i in 1..12 loop
    begin
      perform public.create_quote_request(null, 160, 195, 20, 'prova del limite');
      riuscite := riuscite + 1;
    exception when sqlstate 'PT429' then
      raise notice 'OK  limite anti-abuso: respinto al tentativo % (preventivi riusciti: %)', i, riuscite;
      return;
    end;
  end loop;
  raise exception 'FAIL limite anti-abuso: 12 preventivi di fila sono stati accettati';
end $$;
reset role;
select pg_temp.check((select hits from public.rate_limits where bucket = 'create_quote_request' and client = '*') = 5,
                     'contatore fermo sul limite: le chiamate respinte non lo gonfiano');
select pg_temp.check((select count(*) from public.rate_limits where client <> '*') > 0, 'contatore anche per singolo chiamante');

-- ---------------- offerte abbinate (17/11/2026)
set role anon;
set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from public.bundles) = 5, 'anon vede le 5 vetrine pubblicate');
select pg_temp.check((select count(*) from public.bundle_items) = 14, 'anon vede i 14 pezzi delle vetrine');
select pg_temp.check((select count(*) from public.offers) = 5, 'anon legge le regole attive (le percentuali non sono segrete)');
select pg_temp.check((select value from public.settings where key = 'offers_enabled') = 'true'::jsonb, 'interruttore offerte leggibile dal pubblico');
select pg_temp.expect_error($q$insert into public.offers (code, label) values ('tetto', 'x')$q$, 'anon non crea regole');
select pg_temp.expect_error($q$update public.offers set params = '{"pct":{"foam":30,"pocket":30}}' where code = 'letto-completo'$q$, 'anon non cambia le percentuali');
select pg_temp.expect_error($q$update public.bundles set status = 'archived'$q$, 'anon non tocca le vetrine');
select pg_temp.expect_error($q$select public.price_cart('[]', null)$q$, 'price_cart non esposta al pubblico');
select pg_temp.expect_error($q$select public.offer_config()$q$, 'offer_config non esposta al pubblico');
-- G3: Pocket 3000 H25 160x190 + Rete Strong 160x190 = 820 €, −8 % arrotondato = −65 €
select set_config('test.g3', public.validate_cart(jsonb_build_array(
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P3000-H25-160190'), 'qty', 1),
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-STRONG-160190'), 'qty', 1)))::text, false);
select pg_temp.check((current_setting('test.g3')::jsonb ->> 'subtotal_cents')::int = 82000, 'G3: listino 820 €');
select pg_temp.check((current_setting('test.g3')::jsonb ->> 'discount_cents')::int = 6500, 'G3: vantaggio letto completo 65 € (8 % Pocket)');
select pg_temp.check((current_setting('test.g3')::jsonb ->> 'total_cents')::int = 75500, 'G3: totale 755 €');
select pg_temp.check((current_setting('test.g3')::jsonb -> 'lines' -> 0 ->> 'discount_cents')::int = 4915
                     and (current_setting('test.g3')::jsonb -> 'lines' -> 1 ->> 'discount_cents')::int = 1585, 'G3: sconto ripartito per pezzo (49,15 + 15,85)');
select pg_temp.check(current_setting('test.g3')::jsonb -> 'offers' -> 0 ->> 'code' = 'letto-completo', 'G3: offerta applicata registrata');
-- G7: 3 letti completi Duo 90x200 → scaglione 10 %
select pg_temp.check((public.validate_cart(jsonb_build_array(
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-90200'), 'qty', 3),
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-FLEX-90200'), 'qty', 3))) ->> 'discount_cents')::int = 9000,
  'G7: tre letti completi, scaglione 10 % (90 €)');
-- totale visto diverso: nessuna richiesta, si chiede conferma
select pg_temp.check((public.create_cart_request(jsonb_build_array(
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P3000-H25-160190'), 'qty', 1),
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-STRONG-160190'), 'qty', 1)), 82000) ->> 'reason') = 'offer_changed',
  'create_cart_request: totale visto diverso → offer_changed, nessuna richiesta');
select set_config('test.ref2', public.create_cart_request(jsonb_build_array(
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P3000-H25-160190'), 'qty', 1),
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-STRONG-160190'), 'qty', 1)), 75500) ->> 'ref', false);
reset role;
select pg_temp.check((select discount_cents = 6500 and subtotal_cents = 82000 and total_cents = 75500 and offers -> 0 ->> 'code' = 'letto-completo'
                        from public.requests where ref = current_setting('test.ref2')), 'richiesta salvata con subtotale, sconto e offerta');
select pg_temp.check((select (items -> 0 ->> 'discount_cents')::int from public.requests where ref = current_setting('test.ref2')) = 4915,
                     'quota di sconto per riga salvata (base del recesso parziale)');
select pg_temp.check(not exists (select 1 from public.requests where total_cents is null and type = 'cart'), 'nessuna richiesta carrello senza totale');
-- interruttore spento: nessuno sconto
update public.settings set value = 'false'::jsonb where key = 'offers_enabled';
select pg_temp.check((public.validate_cart(jsonb_build_array(
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-P3000-H25-160190'), 'qty', 1),
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-STRONG-160190'), 'qty', 1))) ->> 'discount_cents')::int = 0,
  'offerte spente: nessuno sconto');
update public.settings set value = 'true'::jsonb where key = 'offers_enabled';
-- regola in pausa: quel vantaggio sparisce
update public.offers set status = 'paused' where code = 'letto-completo';
select pg_temp.check((public.price_cart(jsonb_build_array(
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-MD-H25-160190'), 'qty', 1),
  jsonb_build_object('variant_id', (select id from public.variants where sku='VS-RETE-FLEX-160190'), 'qty', 1)), public.offer_config()) ->> 'discount_cents')::int = 0,
  'regola letto completo in pausa: nessuno sconto');
update public.offers set status = 'active' where code = 'letto-completo';
-- admin: cambia le percentuali, ma non oltre il 30 %
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
update public.offers set params = '{"pct":{"foam":6,"pocket":9},"round_eur":5}' where code = 'letto-completo';
select pg_temp.check((select params #>> '{pct,pocket}' from public.offers where code = 'letto-completo') = '9', 'admin cambia le percentuali');
select pg_temp.expect_error($q$update public.offers set params = '{"pct":{"foam":50,"pocket":8},"round_eur":5}' where code = 'letto-completo'$q$, 'percentuale oltre il 30 % rifiutata');
update public.offers set params = '{"pct":{"foam":5,"pocket":8},"round_eur":5}' where code = 'letto-completo';
update public.bundles set status = 'draft' where slug = 'letto-trio';
reset role;
set role anon;
select pg_temp.check((select count(*) from public.bundles) = 4, 'vetrina in bozza non più visibile al pubblico');
reset role;
update public.bundles set status = 'published' where slug = 'letto-trio';
select pg_temp.expect_error($q$delete from public.products where slug = 'rete-flex'$q$, 'un prodotto usato in una vetrina non si elimina');
\echo TUTTI I TEST SQL SUPERATI
