# Database Supabase del nuovo sito

Creato il 16/11/2026.

| | |
| --- | --- |
| Progetto | Vesuvio Sleep – nuovo sito |
| Riferimento | `bsojqhtidiwwzmzqtgde` |
| URL | https://bsojqhtidiwwzmzqtgde.supabase.co |
| Regione | Francoforte (eu-central-1) |
| Organizzazione | Vesuvio Sleep |

È separato dal progetto **Vesuvio Sleep** creato a maggio 2025 (`wzofpnyowtlqtdpzvkfn`, in pausa), che
probabilmente appartiene al sito attuale: quello non è stato toccato.

## Cosa contiene

Migrazioni applicate, nell'ordine (le stesse di `supabase/migrations/`):

1. `20261112000001_schema` — categorie, prodotti, varianti, foto, impostazioni, richieste, storico
2. `20261112000002_rls` — Row Level Security, bucket privato `product-media` e regole delle foto
3. `20261112000003_functions` — funzioni per carrello, riepilogo WhatsApp e preventivi
4. `20261113000004_media_fit`
5. `20261115000005_catalogo_redirect` — redirect `pocket-2400-elite` → `pocket-2600-elite`
6. `20261116000006_permessi_minimi` — il pubblico legge solo il catalogo, non scrive niente
7. `20261116000007_consigli_supabase` — correzioni suggerite dai controlli di Supabase

Dati caricati: 5 categorie, 15 prodotti (8 pubblicati), 225 varianti di cui **130 con prezzo**
(identiche al listino: impronta controllata riga per riga), 23 foto, 1 redirect, 7 impostazioni
(WhatsApp, telefono, email, pagamenti contrassegno e bonifico, spedizione, claim, pagamenti online spenti).
Gli ID sono gli stessi del sito: un carrello fatto sul sito si valida sul database.

## Verificato come visitatore anonimo

- vede 8 prodotti e 130 varianti con prezzo, nessuna nota interna, nessuna richiesta;
- non può scrivere su nessuna tabella né usare le funzioni interne;
- il carrello si valida lato server (Memory Duo 160×190 = 280 €, Pocket 2600 180×200 = 650 €).

Controlli di sicurezza di Supabase: restano solo gli avvisi sulle quattro funzioni pubbliche delle
richieste (`validate_cart`, `create_cart_request`, `mark_request_waiting`, `create_quote_request`),
eseguibili dal pubblico **di proposito**: sono l'unico modo per creare una richiesta e ricontrollano
prezzi e disponibilità sul server.

## Cosa manca

- **Primo amministratore**: procedura in `docs/PRIMO_ADMIN.md` (crei l'utente da Authentication e lo aggiungi a `public.admins`). Nessuna password predefinita.
- **Foto nello storage**: le righe delle foto ci sono, i file no. Il sito pubblico statico usa le foto dalla sua cartella `img/`; vanno caricate nel bucket `product-media` quando il sito leggerà dal database.
- **Collegare il sito**: oggi il sito statico usa il catalogo incluso nel codice. Leggere da Supabase (e salvare le richieste) è il passo successivo, insieme all'admin condiviso.
- **Limite anti-abuso** sulle funzioni pubbliche, e piano di backup (il piano gratuito non ha backup giornalieri scaricabili).
