# Changelog

## Restyling (16/11/2026)
Punto di ripristino della versione precedente: tag e branch `checkpoint-pre-restyling-2026-11-16` (commit `1b599da`).
- **Home**: vetrina interattiva al posto della griglia (elenco dei modelli a sinistra, prodotto in scena a destra che cambia al passaggio e segue il puntatore; carosello sul telefono), fascia cinetica a due righe che scorre con la pagina, numeri più grandi con cucitura che si disegna.
- **Scheda prodotto**: galleria "in scena" che resta ferma mentre scorri, foto che segue il puntatore, titolo e prezzo più grandi, nome della misura scelta, sezione «Com'è fatto» con riquadri, fascia scura «Strato per strato» con la foto esplosa che si apre scorrendo, sezione sul rivestimento con la foto di dettaglio, abbinamenti più grandi, tre riquadri finali (consegna, pagamento, su misura). Strati e rivestimento compaiono solo dove foto e composizione sono confermate.
- **Catalogo**: con 5 modelli il primo è in evidenza (nessuna card orfana), foto che si avvicina al passaggio.
- **Entrata**: lettere del nome una per una, trama trapuntata sul sipario, intestazione che scende dopo l'apertura.
- **Dettagli**: titoli di sezione più grandi, luce sui pulsanti che segue il puntatore, foto che si scoprono dall'alto.

## Database Supabase del nuovo sito (16/11/2026)
- Creato il progetto Supabase **Vesuvio Sleep – nuovo sito** (Francoforte), separato da quello del sito attuale.
- Applicate le 5 migrazioni esistenti più 2 nuove: permessi minimi per il pubblico e correzioni suggerite dai controlli di Supabase (search_path, is_admin, indici).
- Caricato il catalogo ufficiale: 130 varianti con prezzo identiche al listino, foto, redirect, contatti e pagamenti.
- Verificato come visitatore anonimo: legge solo il catalogo pubblicato, non scrive, il carrello si valida sul server. Dettagli in `docs/SUPABASE.md`.

## Entrata animata, foto centrate, più movimento (15/11/2026, notte)
- **Entrata**: all'arrivo sul sito, su qualsiasi pagina, un sipario blu: la cucitura disegna il profilo del Vesuvio, compare il nome, una cucitura corre lungo il taglio e il sipario si apre in due. Poi la foto d'apertura si assesta e il titolo sale. Dura meno di 2 secondi, una volta per visita; un clic o un tasto la saltano; con "riduci movimento" non c'è. Sostituisce le vecchie bande dell'apertura, che sembravano un errore di caricamento.
- **Foto prodotto centrate**: le foto su fondo bianco di Essential Foam, Memory Duo e Pocket 2600 Elite sono ricentrate sul materasso, su una tela 4:3 con margini uguali, e hanno lo sfondo trasparente: niente più riquadri bianchi sul fondo azzurro (comparivano durante le animazioni). Corretto anche un errore che ritagliava la foto principale nelle card invece di mostrarla intera.
- **Movimento**: cucitura di avanzamento in cima alla pagina, testo della hero che si allontana scorrendo, foto delle testate e della fabbrica in parallasse, cucitura che si disegna sotto i titoli di sezione, foto delle card che si assestano quando entrano, cucitura sul bordo delle card al passaggio, titoli delle pagine interne che salgono, galleria e scheda che entrano.
- Test: 115 end-to-end sull'anteprima (entrata, salto, una volta per visita, foto trasparenti e centrate), 22 sul sito pubblico.

## Contatti, pagine legali e sito SEO (15/11/2026, sera)
- **Contatti reali**: WhatsApp e telefono +39 366 121 8346, email fdimaterassi@gmail.com. Il checkout apre WhatsApp sul numero aziendale; footer, pagina Contatti, pulsante WhatsApp fisso e dati strutturati usano gli stessi recapiti, modificabili da Admin › Impostazioni.
- **Pagamenti**: contrassegno alla consegna o bonifico (con bolla di spedizione poco dopo). Il cliente sceglie nel riepilogo e la scelta finisce nel messaggio WhatsApp. Indicati nel carrello, nella scheda e nella pagina Pagamenti.
- **15 pagine nuove**: Contatti, Domande frequenti, Chi siamo, Hotel e B&B, Materassi a Napoli, Spedizioni e consegna, Pagamenti, Resi e recesso (con modulo stampabile), Garanzia, Condizioni di vendita, Privacy, Cookie, Guide con due articoli. Più la ricerca interna.
- **Indirizzi veri**: `/materassi/essential-foam/` al posto di `#prodotto-essential-foam`. Nell'anteprima dell'artifact restano dopo il cancelletto (`#/materassi/…`). I vecchi indirizzi portano ai nuovi.
- **Sito pubblico statico** (`npm run build:site` → `dist/`): 32 pagine indicizzabili con HTML completo già scritto, titolo e descrizione unici, canonical, Open Graph con immagine, dati strutturati (Product con offerte, spedizione gratuita e reso 14 giorni; FurnitureStore; BreadcrumbList; FAQPage; Article; ItemList), `sitemap.xml` con immagini, `robots.txt`, 404 vera, 301 dal vecchio Pocket 2400, header di sicurezza e cache.
- Testi descrittivi con link interni sotto le categorie e nella guida alle misure; footer con tutte le sezioni; immagine di condivisione 1200×630.
- Corretti: titolo duplicato carrello/riepilogo, salti di livello dei titoli, preload dell'immagine d'apertura sbagliata.
- Test: 107 end-to-end sull'anteprima, 22 sul sito pubblico, 48 SQL, 12 unitari.

## Catalogo ufficiale (15/11/2026)
- **Prezzi dal listino confermato** (`Vesuvio_Sleep_Listino_Prezzi_CONFERMATO_2600_H5.xlsx`, unica fonte): 130 varianti acquistabili, IVA inclusa: 91 materassi, 26 reti, 13 topper. Le celle vuote restano senza prezzo (mai zero, mai interpolate) e non sono acquistabili. Misure standard da 8 a 13 (80×190 … 180×200).
- **Pocket 2400 Elite → Pocket 2600 Elite**: stesso prodotto (stesso ID, nessun duplicato), nuovo nome, slug `pocket-2600-elite`, SKU `VS-P2600-…`, testi e stratigrafia con «2600 molle insacchettate». Il vecchio indirizzo porta al nuovo (tabella `slug_redirects`). Le vecchie immagini 2400 restano in archivio, non pubblicate.
- **Nuovi prodotti pubblicati**: Vesuvio Pocket 1600 (H25), Memory Foam 3 strati (H27), Vesuvio Topper Memory Cloud 5 (H5). Testi limitati a quanto scritto nel listino.
- **Sospesi (bozza admin)**: Memory Air 3D, Bonnell Classic, guanciali, Castello Steel. Non compaiono in categorie, ricerca, Sleep Match, abbinamenti, confronto o carrello. H30 di Memory Duo, Pocket 2600 e Pocket 1600 non sono mostrate. Rete a tavole non creata (nessun prezzo).
- **Foto ufficiali** da `MEDIA_MANIFEST.csv` per Essential Foam, Memory Duo e Pocket 2600 Elite: hero (copertina), esploso, dettaglio tessuto, in WebP responsive. Le foto su fondo bianco si fondono con il riquadro. L'immagine Grafeno non è stata caricata né associata.
- **Nessuna scritta provvisoria** sul sito pubblico: tolti «Anteprima concept», «WhatsApp da configurare», «Immagine/Render illustrativo», «Foto in arrivo», segnaposto, «non in scala», «non online», gli avvisi «a breve». L'accesso admin è nel footer («Area riservata»). Senza foto il prodotto mostra un disegno pulito, senza strati inventati.
- Aggiornamento dei dati salvati: il catalogo ufficiale sostituisce prezzi e varianti per ID; restano richieste, impostazioni, foto caricate dall'admin e prodotti creati dall'admin.
- Supabase: migrazione `20261115000005_catalogo_redirect.sql` (redirect e `media.bg`), script `supabase/catalog/2026-11-15_catalogo_ufficiale.sql` per aggiornare un database esistente (upsert, rieseguibile).
- Test: 95 end-to-end, 46 SQL, 10 unitari.

## Foto e apertura animata (13/11/2026)
- Integrate 23 foto generate (render illustrativi) in WebP responsive: Memory Air 3D (3/4, sezione, tessuto), tessuto del Pocket, reti Flex e Strong con dettagli, quattro guanciali, fabbrica, showroom, camera, consegna e testate delle categorie. Tutte etichettate «Render illustrativo» o «Immagine illustrativa».
- Nuova apertura: strati blu che scorrono via mentre si disegna il profilo cucito del Vesuvio, poi una presentazione di foto con zoom lento, cambio a «telo» con cucitura che corre, pallini di avanzamento, pausa e swipe. Si ferma quando non è visibile; con movimento ridotto non parte da sola.
- Nastro fotografico «Dentro la fabbrica» che scorre (si ferma al passaggio del puntatore), fascia della fabbrica con foto e zoom, consegna con foto del furgone, Sleep Match con foto dei guanciali, testate delle categorie con foto, card con leggera inclinazione 3D, dissolvenza nella galleria.
- Il seed si aggiorna senza perdere le modifiche fatte dall'admin (si aggiungono solo gli elementi nuovi). Migrazione `media.fit`.
- Corretto un conflitto: i contatori animati leggevano anche l'attributo della presentazione.
- 80 test end-to-end, 39 controlli SQL, 8 test unitari.

## Apertura su Napoli e segnaposto foto (12/11/2026, notte)
- Corretto il blocco all'avvio: IndexedDB non fermava più il primo disegno della pagina. Hero e ticker sono già nell'HTML; in caso di errore compare un avviso visibile.
- Apertura con un panorama illustrato del Golfo di Napoli (Vesuvio, lungomare, Castel dell'Ovo, pino di Posillipo) e un ingresso a strati: il mare luccica, le barche ondeggiano, le nuvole scorrono e la cucitura ricalca il profilo del Vesuvio. È un segnaposto dichiarato: la foto reale si carica in Admin › Immagini del sito.
- Segnaposto «Foto in arrivo» per tutte le immagini mancanti: card dei prodotti, galleria della scheda (prospettiva 3/4, esploso, tessuto), fabbrica (cucito, taglio, materiali) e showroom.
- Nuova sezione con il render dell'ombra del Vesuvio e la cucitura che si disegna quando entra in vista.
- Verificata la pagina pubblicata in Chrome: nessun errore in console. Corretta la sovrapposizione tra titolo e menu su schermi bassi.

## Revisione estetica (12/11/2026, sera)
- **Causa della pagina "vuota":** nel visualizzatore degli artifact, che gira in un frame isolato, gli script caricati come moduli ES venivano bloccati e restavano visibili solo intestazione e footer. Ora `scripts/bundle.py` unisce tutto in uno script classico (`js/bundle.js`); un test e2e verifica il rendering in un iframe con origine opaca.
- Nuova hero a tutto schermo con `hero-alternativa` (ambientazione illustrativa): un punto a filo animato ricalca l'ombra del Vesuvio sul muro. Il titolo entra a righe e il fondo resta leggero sul puntatore; l'header è trasparente sopra la foto.
- Topbar con messaggi che scorrono, fascia trapuntata con contatori, catalogo con tab a pillola e card che entrano in sequenza.
- Illustrazioni schematiche a strati per i prodotti senza foto (materassi, reti, guanciali). Gli strati si aprono al passaggio del puntatore, nella scheda con un cursore e nel nuovo «Laboratorio» della home.
- Fabbrica a tutta larghezza con «1986» in grande, Sleep Match con prima domanda direttamente in home, consegna, stato «Aperto ora» dello showroom e slogan nel footer.
- Testate trapuntate per le pagine interne, transizioni tra pagine (View Transitions), ingombro della misura animato nella scheda.
- Texture materica su tutto il sito; con movimento ridotto restano fermi l'entrata della hero, il ticker e le rivelazioni allo scorrimento.

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
