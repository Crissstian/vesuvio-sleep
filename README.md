# Vesuvio Sleep — concept indipendente

È una seconda versione del sito, separata da quella in uso, che serve a confrontare un concept nuovo. Non modifica e non pubblica nulla sul sito attuale e non si collega a database o account di produzione.

## Cosa c'è

| Cartella | Contenuto |
| --- | --- |
| `preview/` | Sito statico completo e navigabile: vetrina, catalogo, schede, Sleep Match, confronto, guida alle misure, fuori misura, carrello, riepilogo WhatsApp e admin. I dati vivono nel browser (localStorage + IndexedDB). |
| `core/` | Logica condivisa in TypeScript: prezzi, SKU, acquistabilità, abbinamenti, Sleep Match, messaggio e link WhatsApp, validazione carrello, dati strutturati e sitemap, interfaccia pagamenti disattivata. Compilata in `preview/js/core/`. |
| `supabase/` | Migrazioni (schema, RLS, storage, funzioni server) e `seed.sql` idempotente. |
| `scripts/` | `build_seed.py` genera il catalogo dal dataset ufficiale; `build_assets.py` genera i WebP pubblici dal kit. |
| `tests/` | Test unitari, test SQL su Postgres locale, test end-to-end con Playwright. |
| `input-vesuvio/` | Il kit originale (dati, prompt, asset). Non è pubblico: da qui si generano solo gli asset approvati. |

## Avvio

```bash
npm run build:core     # compila core/ in preview/js/core (richiede tsc)
npm run build:seed     # rigenera preview/js/seed.js e supabase/seed.sql dal JSON
npm run serve          # http://localhost:8765
```

La preview non richiede dipendenze: basta servire `preview/`. Dopo aver modificato i file in `preview/js/`, esegui `npm run build:bundle`. La pagina carica `js/bundle.js`, uno script classico, perché i moduli ES vengono bloccati nei frame isolati come il visualizzatore degli artifact.

**Admin:** apri `#admin`. Al primo accesso crei una password, perché non esistono password predefinite. L'accesso è locale al browser e non sostituisce Supabase Auth.

**Numero WhatsApp:** finché è vuoto, il sito permette solo di copiare il riepilogo. Lo imposti in Admin › Impostazioni, oppure in `preview/js/config.js`, che prevale come una variabile d'ambiente.

## Test

```bash
npm run test:unit   # logica core
npm run test:sql    # migrazioni + seed due volte + RLS (Postgres 16 locale, usa runuser postgres)
npm run test:e2e    # flussi della preview (serve npm run serve attivo)
```

## Flusso d'acquisto al lancio

scheda → variante → carrello → verifica (ricontrollo prezzi e disponibilità) → «Invia la richiesta su WhatsApp» → il cliente invia il messaggio → Vesuvio Sleep conferma a mano.

Aprire WhatsApp **non** conferma l'ordine e non svuota il carrello. La richiesta resta «in attesa di contatto» finché l'admin non la aggiorna. Nessun pagamento è attivo.

## Verificato e predisposto

Vedi `PENDING_PRIMA_DEL_LANCIO.md`. In sintesi:
- **Verificato:** core, SQL/RLS su Postgres locale e flussi della preview.
- **Predisposto:** la porta Next.js (vedi `docs/ARCHITETTURA.md`), la distribuzione Supabase e i pagamenti.
