# Vesuvio Sleep — concept indipendente

È una seconda versione del sito, separata da quella in uso, che serve a confrontare un concept nuovo. Non modifica e non pubblica nulla sul sito attuale e non si collega a database o account di produzione.

## Cosa c'è

| Cartella | Contenuto |
| --- | --- |
| `dist/` | **Sito pubblico generato** (`npm run build:site`): una pagina HTML vera per ogni indirizzo (/materassi/essential-foam/, /contatti/ …), con titolo, descrizione, canonical, Open Graph e dati strutturati già scritti; `sitemap.xml`, `robots.txt`, `404.html`, `_redirects`, `_headers`. Si carica così com'è su Netlify o Cloudflare Pages. |
| `preview/` | Sorgente del sito e anteprima navigabile: vetrina, catalogo, schede, Sleep Match, confronto, guida alle misure, fuori misura, carrello, riepilogo WhatsApp e admin. I dati vivono nel browser (localStorage + IndexedDB). |
| `core/` | Logica condivisa in TypeScript: prezzi, SKU, acquistabilità, abbinamenti, Sleep Match, messaggio e link WhatsApp, validazione carrello, dati strutturati e sitemap, interfaccia pagamenti disattivata. Compilata in `preview/js/core/`. |
| `docs/SUPABASE.md` | Il progetto Supabase del nuovo sito: cosa contiene, cosa è verificato, cosa manca. |
| `supabase/` | Migrazioni (schema, RLS, storage, funzioni server), `seed.sql` idempotente e `catalog/catalogo_corrente.sql` per aggiornare un database già popolato. |
| `scripts/` | `build_seed.py` genera il catalogo dal listino Excel confermato (prezzi) e dal dataset (testi), in due versioni: `seed.js` completo per l'anteprima e l'admin, `seed.public.js` per il sito pubblico (solo pubblicati, senza note interne); `build_product_images.py` converte le foto approvate di `MEDIA_MANIFEST.csv`; `build_assets.py` genera i WebP pubblici dal kit. |
| `tests/` | Test unitari, test SQL su Postgres locale, test end-to-end con Playwright. |
| `input-vesuvio/` | Il kit originale (dati, prompt, asset). Non è pubblico: da qui si generano solo gli asset approvati. |

## Avvio

```bash
npm run build:core     # compila core/ in preview/js/core (richiede tsc)
npm run build:seed     # rigenera seed.js, seed.sql e lo script di aggiornamento dal listino Excel
npm run serve          # http://localhost:8765
```

La preview non richiede dipendenze: basta servire `preview/`. Dopo aver modificato i file in `preview/js/`, esegui `npm run build:bundle`. La pagina carica `js/bundle.js`, uno script classico, perché i moduli ES vengono bloccati nei frame isolati come il visualizzatore degli artifact.

**Admin:** apri `#admin`. Al primo accesso crei una password, perché non esistono password predefinite. L'accesso è locale al browser e non sostituisce Supabase Auth.

**Contatti e WhatsApp:** +39 366 121 8346 (WhatsApp e telefono) e fdimaterassi@gmail.com, dal catalogo (`build_seed.py`). Si cambiano in Admin › Impostazioni; `preview/js/config.js` (`whatsappNumber`) prevale come una variabile d'ambiente.

**Pagamenti:** contrassegno alla consegna o bonifico bancario, scelti dal cliente nel riepilogo e scritti nel messaggio WhatsApp. Nessun pagamento online.

## Sito pubblico e SEO

```bash
npm run build          # core, catalogo, apertura, bundle e sito pubblico in dist/
npm run build:site     # solo dist/ (dominio: --site https://vesuviosleep.it, oppure SITE_URL)
npm run test:site      # sitemap, robots, 301, 404, HTML senza JavaScript, navigazione
```

Indirizzi del sito pubblico: `/` · `/materassi/` · `/materassi/<modello>/` · `/reti/` · `/topper/` · `/sleep-match/` · `/confronta-materassi/` · `/guida-misure-materassi/` · `/materassi-su-misura/` · `/showroom/` · `/contatti/` · `/domande-frequenti/` · `/chi-siamo/` · `/hotel-e-bb/` · `/materassi-napoli/` · `/spedizioni-e-consegna/` · `/pagamenti/` · `/resi-e-recesso/` · `/garanzia/` · `/condizioni-di-vendita/` · `/privacy/` · `/cookie/` · `/guide/…`. Carrello, riepilogo, ricerca e admin non sono indicizzabili.

Nell'anteprima dentro l'artifact gli stessi indirizzi stanno dopo il cancelletto (`#/materassi/`), perché il frame non permette percorsi veri. I vecchi indirizzi (`#materassi`, `#prodotto-…`, `#fuori-misura`) portano a quelli nuovi.

**Pubblicare su Netlify o Cloudflare Pages:** carica la cartella `dist/` già generata (trascinandola nel pannello, oppure collegando il repository senza comando di build e con cartella di pubblicazione `dist`). La generazione usa strumenti locali (Python con openpyxl, tsc, Playwright), quindi si fa su questo computer, non sul servizio di hosting. Poi collega il dominio `vesuviosleep.it` e invia `https://vesuviosleep.it/sitemap.xml` a Google Search Console.

**Aggiornare prezzi o testi:** modifica il listino o i file in `preview/js/`, poi `npm run build` e ricarica `dist/`. Sul sito statico l'admin lavora solo nel browser di chi lo usa: per un admin condiviso serve il backend Supabase (vedi `docs/ARCHITETTURA.md`).

## Test

```bash
npm run test:unit   # logica core
npm run test:sql    # migrazioni + seed due volte + RLS (Postgres 16 locale, usa runuser postgres)
npm run test:e2e    # flussi della preview (serve npm run serve attivo)
npm run test:site   # sito pubblico generato in dist/
```

## Flusso d'acquisto al lancio

scheda → variante → carrello → verifica (ricontrollo prezzi e disponibilità) → «Invia la richiesta su WhatsApp» → il cliente invia il messaggio → Vesuvio Sleep conferma a mano.

Aprire WhatsApp **non** conferma l'ordine e non svuota il carrello. La richiesta resta «in attesa di contatto» finché l'admin non la aggiorna. Nessun pagamento è attivo.

## Verificato e predisposto

Vedi `PENDING_PRIMA_DEL_LANCIO.md`. In sintesi:
- **Verificato:** core, SQL/RLS su Postgres locale e flussi della preview.
- **Predisposto:** la porta Next.js (vedi `docs/ARCHITETTURA.md`), la distribuzione Supabase e i pagamenti.
