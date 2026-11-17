# Offerte abbinate (letto completo)

Costruite il 17/11/2026. Progetto completo e motivazioni: `docs/offerte/PROGETTO_BETA.md`. Proposte di partenza: `docs/offerte/PROPOSTE.md`.

## Che cosa c'è

| Parte | Dove | Stato |
| --- | --- | --- |
| Calcolo dello sconto | `core/offers.ts` (anteprima nel browser) e `public.price_cart` (database) | **Verificato**: stesse cifre al centesimo su 450 carrelli generati (`tests/sql/gen_parity.mjs`) |
| Regole | tabella `offers`; nel catalogo compilato `SEED.offers` | **Verificato** in locale (Postgres 16) |
| Vetrine | tabelle `bundles` e `bundle_items`; 5 vetrine: Letto Elite, Letto Pocket, Letto Trio, Letto Memory, Singolo completo | **Verificato** in locale |
| Interruttore | impostazione `offers_enabled` (pubblica) | Acceso: il sito non è ancora pubblico |
| Sito | home, categorie, `/offerte/`, `/offerte/<vetrina>/`, scheda materasso, carrello, riepilogo, WhatsApp, Sleep Match | **Verificato**: 69 test end-to-end, sito statico con 39 pagine indicizzabili |
| Admin | Admin › Offerte; nelle richieste, vantaggi e calcolo del recesso parziale | **Verificato** in anteprima |
| Database Supabase | migrazioni `20261117000008_rate_limit.sql` e `20261117000009_offerte.sql` | **Non ancora applicate**: la conferma richiesta dal server non è arrivata (vedi sotto) |

## Le regole (valori di partenza, modificabili da Admin › Offerte)

| Regola | Valore | Note |
| --- | --- | --- |
| Letto completo | −5 % schiuma, −8 % Pocket | Materasso e rete della stessa misura, sul totale dei due, arrotondato ai 5 € |
| Più letti | 3–4 letti −10 %, da 5 −12 % | Vale la più alta tra questa e quella del letto completo. Da 10 letti: preventivo |
| Accessori | topper −10 %, guanciali −10 % | Un topper per letto completo della stessa misura; guanciali 2 per letto (dormiente: non hanno prezzo) |
| Per due | −5 % schiuma, −8 % Pocket | Due materassi uguali senza rete |
| Tetto | 15 % | Nessun carrello va oltre, qualunque percentuale si scriva |

Ogni percentuale è un intero tra 0 e 30: il database rifiuta il resto (vincolo `offers_params_ok`) e il calcolo comunque non va oltre il 30 %. Le percentuali sono una **scelta prudente fatta senza conoscere i margini**.

## Come si calcola, in breve

1. Si abbinano i materassi più cari alla rete più cara libera della stessa misura.
2. A ogni letto si applica la percentuale più alta tra quella della famiglia e lo scaglione per numero di letti.
3. Topper della stessa misura di un letto, poi guanciali; poi coppie di materassi uguali rimasti soli.
4. Il tetto riduce tutto in proporzione se serve.
5. Lo sconto di ogni offerta si divide sui pezzi in proporzione al prezzo (resto maggiore) e si **salva per riga** nella richiesta.

Solo numeri interi: centesimi e percentuali intere. Nessun prezzo barrato: il confronto è sempre «separati» (somma dei prezzi correnti) contro «insieme».

## Recesso su una parte

Si rimborsa quanto il cliente ha pagato per i pezzi restituiti, compresa la loro quota di vantaggio; sui pezzi che tiene il vantaggio resta suo. Esempio: Pocket 3000 + Rete Strong pagati 755 €; restituito il solo materasso → 570,85 €. Calcolo in Admin › Richieste › Recesso parziale. Motivazione nel progetto (§4). **Da far rivedere all'avvocato** insieme al testo nelle condizioni di vendita.

## Database

- `validate_cart` restituisce in più `subtotal_cents`, `discount_cents`, `offers` e la quota per riga; `total_cents` resta «quanto si paga».
- `create_cart_request(items, seen_total_cents)`: se il totale ricalcolato è diverso da quello visto dal cliente risponde `offer_changed` e non crea nulla; il sito mostra il nuovo totale da confermare.
- `price_cart` e `offer_config` non sono esposte al pubblico.
- Il sito regge anche un database **senza** la migrazione 000009: calcola lo sconto in pagina sui prezzi letti dal database e non salva nel database una richiesta scontata (vi finirebbe con il totale di listino). Verificato con risposte simulate.

### Per applicarle (quando si dà la conferma)

1. `20261117000008_rate_limit.sql`, poi `20261117000009_offerte.sql`.
2. `supabase/catalog/catalogo_corrente.sql` (riscrive il catalogo per ID, aggiunge famiglia, regole e vetrine; le regole già presenti non vengono toccate).
3. Controllo: `select count(*) from bundles` = 5, `select public.validate_cart(...)` sul caso G3 = 755 €.

## Test

- `npm run test:unit` — casi G1–G13, ripartizione, recesso, suggerimenti, vetrine, 400 carrelli casuali.
- `npm run test:sql` — RLS delle tabelle nuove, casi G3 e G7, `offer_changed`, interruttore, regole in pausa, percentuali oltre il 30 %, parità con 450 carrelli.
- `npm run test:offers` (con l'anteprima su `localhost:8765`) — 69 controlli su pagine, carrello, WhatsApp, Sleep Match, Admin, interruttore spento, risposte del database simulate.
