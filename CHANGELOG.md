# Changelog

## Checkpoint 4 — QA e rifinitura (12/11/2026)
- 68 test end-to-end Playwright, 8 test unitari, 39 controlli SQL.
- Barra d'acquisto mobile basata sulla posizione: con IntersectionObserver uno scroll veloce poteva saltarla.
- Corretto il padding laterale annullato su breadcrumb, intestazioni e fascia dei vantaggi.
- La barra di confronto compare solo dove si selezionano i modelli.
- Topbar ridotta sotto i 400 px; il toast nascosto non compare più nelle catture.
- Sleep Match: indicazione dell'altezza anche quando ne esiste una sola acquistabile.
- Aggiunti `PENDING_PRIMA_DEL_LANCIO.md`, README, architettura, procedura per il primo admin e `.env.example`.

## Checkpoint 3 — Carrello, WhatsApp, preventivi
- Carrello persistente, validazione «lato server» prima del riepilogo, avviso e correzione se cambiano prezzi o disponibilità.
- Riepilogo con riferimento univoco, link `wa.me` con testo modificabile e pulsante «Copia il riepilogo» con fallback.
- Messaggio breve per carrelli lunghi; il riepilogo sul sito resta completo.
- Numero mancante: nessun link, solo copia, avviso nella preview e nell'admin.
- Richieste in bozza o «in attesa di contatto», mai confermate o pagate in automatico; il carrello non si svuota da solo.
- Fuori misura e strutture ricettive: misure e note, nessun dato personale, preventivo su WhatsApp.
- Interfaccia pagamenti Stripe, PayPal e Klarna predisposta e disattivata.
- Funzione extra: proposta di una rete della stessa misura nel carrello.

## Checkpoint 2 — Supabase, admin, media
- Migrazioni: schema, RLS, storage privato, funzioni pubbliche validate, storico prezzi, protezione dalle eliminazioni, note interne separate.
- Seed idempotente generato dal dataset; verificato su Postgres 16 locale (bug corretto: il trigger dello storico prezzi richiedeva `security definer`).
- Admin della preview: primo accesso senza password predefinite; CRUD di categorie, prodotti e varianti; generazione della griglia di misure e SKU; stati bozza, pubblicato e archiviato; eliminazione solo di bozze non collegate.
- Media manager: carica, sostituisci, elimina, riordina, copertina, slot, testo alternativo obbligatorio, punto focale con anteprima dei ritagli, bozza fino alla pubblicazione.
- Richieste: ricerca, filtri, stati, note, tracking, storico, risposta al preventivo e SKU personalizzato.
- Impostazioni: numero WhatsApp validato, testi, claim, pagamenti in sola lettura, sitemap, esportazione e ripristino.

## Checkpoint 1 — Home, catalogo, schede
- Logica condivisa in `core/` (TypeScript).
- Hero editoriale con entrata a livelli e profilo del Vesuvio cucito; tab delle categorie animate; card con prezzo e disponibilità reali.
- Schede con galleria, zoom, esploso interattivo del Pocket 2400 Elite, selettori di misura e altezza con configurazioni disabilitate, SKU e prezzo aggiornati, abbinamenti contestuali.
- Sleep Match a risultato singolo, confronto con soli dati confermati, guida alle misure in scala (funzione extra: due misure a confronto), showroom con indicazioni.
- Asset WebP responsive dal kit; illustrazioni di categoria dove mancano foto confermate.
