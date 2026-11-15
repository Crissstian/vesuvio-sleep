# CLAUDE — AGGIORNAMENTO CATALOGO VESUVIO SLEEP (15/11/2026)

Agisci come sviluppatore senior full-stack e responsabile QA del sito **Vesuvio Sleep**. Devi **aggiornare il sito esistente**, senza ricostruirlo da zero. Mantieni design, UX, animazioni, configurazioni, database, admin, SEO e logiche già funzionanti; modifica solo ciò che serve a sincronizzare il catalogo reale, i prezzi e le nuove immagini.

## Allegato da usare

Riceverai lo ZIP `VESUVIO_SLEEP_HANDOFF_CLAUDE_CATALOGO_MEDIA.zip`, contenente:

- `01_CATALOGO/Vesuvio_Sleep_Listino_Prezzi_CONFERMATO_2600_H5.xlsx`: **fonte primaria** dei prezzi e delle misure. È il listino compilato dal titolare, con le due sole correzioni confermate: molle **2600** anziché 2400 e topper **H5 cm** anziché 80 cm.
- `01_CATALOGO/Vesuvio_Sleep_varianti_CONFERMATE.csv` e `.json`: 130 combinazioni prezzo/misura già trascritte dall'Excel, solo per facilitare l'importazione. In caso di discordanza prevale l'Excel corretto.
- `01_CATALOGO/Vesuvio_Sleep_varianti_SOSPESE.csv`: controllo delle combinazioni senza prezzo, **non pubblicabili**.
- `02_IMMAGINI_PRODOTTI/`: immagini originali ripartite per modello e ruolo (`hero`, `exploded`, `detail`).
- `03_DOCUMENTAZIONE/MEDIA_MANIFEST.csv` e `README.md`: mappa file → prodotto → impiego; `99_DA_VERIFICARE` contiene un'immagine non attribuita.

**Non utilizzare prezzi storici, vecchi JSON, placeholder prezzati o nomi tecnici precedenti al posto di quelli aggiornati.** Non calcolare prezzi non presenti, non interpolare, non raddoppiare i prezzi e non sostituire celle vuote con zero.

## 1. Prima di modificare: ricognizione e checkpoint

1. Esamina l'attuale repository/sito, le tabelle Supabase (se usate), l'eventuale sistema di media storage, le schede prodotto, la pagina catalogo, il pannello admin e i selettori di variante.
2. Identifica eventuali prodotti già esistenti tramite corrispondenza tecnica/ID/slug. Esegui **upsert**, non una seconda importazione che duplica gli stessi articoli.
3. Crea un checkpoint/commit ripristinabile **prima** delle modifiche. Se non hai accesso all'ambiente o al repository, non fingere di avere applicato modifiche: prepara la patch e indica esattamente come integrarla.
4. Mantieni la fonte dati centralizzata. Niente array di prezzi divergenti tra homepage, PDP, carrello e admin.

## 2. Fonte dei prezzi: 130 varianti ufficiali

Pubblica **solo** le combinazioni con prezzo numerico maggiore di zero nel listino confermato. Sono **91 varianti materassi + 26 reti + 13 topper**, tutte con prezzo finale in euro **IVA inclusa**. Sono presenti 13 misure, da `80×190` a `180×200` (King Size), ma ogni misura è disponibile solo se valorizzata per la singola variante.

### Materassi da aggiornare/attivare

- **Vesuvio Essential Foam** — poliuretano espanso, H20 / H25 / H30. Foto cartella `vesuvio-essential-foam`; gli originali erano etichettati “ECO POLIURETANO”. Conserva il nome commerciale già adottato sul sito, salvo altra indicazione esplicita.
- **Vesuvio Memory Duo** — Memory Foam 2 strati sfoderabile, **solo H25** con prezzo. Foto cartella `vesuvio-memory-duo`. La H30, senza prezzo, non è selezionabile.
- **Vesuvio Pocket 2600 Elite** — **2600 molle insacchettate + Memory**, **solo H25** con prezzo. Foto cartella `vesuvio-pocket-2600-elite`. Il vecchio “Pocket 2400 Elite” va **aggiornato a 2600, non duplicato**; aggiorna nome pubblico, descrizioni, attributi, alt, URL/slug e riferimenti collegati, assicurando eventuali redirect dal vecchio slug e mantenendo integro lo storico di eventuali ordini. Non cambiare per errore il modello Pocket 1600.
- **Vesuvio Pocket 1600** — H25 con prezzo, H30 senza prezzo. Per le immagini mantieni asset esistenti **solo se realmente pertinenti**; non riutilizzare foto del 2600.
- **Memory Foam 3 strati** — H27 con prezzo. Se nel sito esiste già il prodotto equivalente (es. Memory Trio), riconcilia identità/ID senza creare doppioni; non inventare una nuova scheda con specifiche tecniche non confermate. Mantieni immagini verificate già presenti oppure un placeholder neutro e segnala il media mancante.

### Reti da aggiornare/attivare

- **Vesuvio Rete Flex** — a doghe.
- **Vesuvio Rete Strong** — rinforzata.

Usa tutte e sole le combinazioni prezzo/misura presenti nel file. La voce “Rete a tavole” non ha prezzo: non pubblicarla.

### Topper da aggiornare/attivare

- **Vesuvio Topper Memory Cloud 5** — Memory Foam **H5 cm**, non H80. Sono prezzate 13 misure. L'altezza 80 nel file originario era un errore di compilazione: nel file allegato è già corretta.

### Non pubblicare / non vendere

Ogni **prodotto senza alcun prezzo** e ogni **singola combinazione senza prezzo**, comprese Memory Air 3D, Bonnell Classic, eventuali H30 non prezzate, Rete a tavole, guanciali e letti a castello. Se sono già pubblici, toglili da homepage, categorie, ricerca, confronta, Sleep Match, consigli, carrello e checkout. Mantieni i record nel pannello admin come bozza/sospesi, senza cancellarli. Nessun prezzo 0 €, “da 0 €”, ordine WhatsApp da prodotto nascosto o acquisto di varianti sospese.

## 3. Associazione e uso delle 9 immagini approvate

Leggi `MEDIA_MANIFEST.csv`; non basarti sul mero ordine dei file in ZIP. Le immagini sono già separate in tre cartelle:

- `vesuvio-essential-foam/`: `hero_01.jpeg` (materasso intero bianco), `exploded_01.jpeg` (vista esplosa), `detail_fabric_01.jpeg` (macro rivestimento).
- `vesuvio-memory-duo/`: `hero_01.jpeg` (materasso intero con fascia grigio scuro), `exploded_01.jpeg` (vista esplosa), `detail_fabric_01.jpeg` (macro tessuto e fascia).
- `vesuvio-pocket-2600-elite/`: `hero_01.png` (materasso intero con fascia marrone), `exploded_01.png` (molle insacchettate + schiume), `detail_fabric_01.png` (macro tessuto e fascia).

Assegna per ciascuna scheda **hero principale, vista esplosa e dettaglio** nello slot giusto. Riusa queste immagini nelle card dove pertinente, senza sovrascrivere altri prodotti. Mantieni gli originali disponibili, le proporzioni e il ritaglio non distruttivo; usa ottimizzazione web (WebP/AVIF responsive) se l'architettura la supporta. Per le immagini caricate in storage rendi persistenti URL e metadati, funzionanti anche in produzione; completa gli alt SEO descrittivi ma senza affermazioni tecniche non verificate. Le viste esplose sono visualizzazioni illustrative: non dedurre dai rendering densità, numero di strati effettivi o centimetri interni non confermati.

**Esclusione obbligatoria:** `99_DA_VERIFICARE/grafeno_detail_non_assegnato.png` mostra la parola “Grafeno”, non verificata come caratteristica del catalogo. **Non caricarla sul sito e non attribuire il claim Grafeno a nessun modello** prima di istruzioni successive.

## 4. Comportamento del sito da preservare/correggere

- Su ogni PDP i selettori **misura + altezza**, se applicabili, cambiano immediatamente prezzo, disponibilità, SKU e selezione carrello. Solo varianti prezzate possono essere selezionate, aggiunte al carrello o inviate nel riepilogo WhatsApp.
- Card e risultati devono mostrare correttamente il prezzo minimo **tra le varianti pubblicate**; nessun prezzo statico vecchio.
- Chi possiede già un record prodotto deve poterlo aggiornare dall'admin: prezzo per variante, media (hero/exploded/detail), ordinamento immagini, stato bozza/pubblicato, descrizioni, abilitazione delle misure. Conserva la gestione media già presente, correggendo eventuali anomalie senza duplicare i file inutilmente.
- Mantieni l'attuale **checkout operativo solo via WhatsApp**, con pagamento alla consegna se è la configurazione reale attiva; non abilitare autonomamente Stripe, PayPal, Klarna o altri sistemi predisposti.
- Consigli d'acquisto coerenti: su un **materasso** proporre reti/topper eventualmente pubblicati, non un altro materasso; su una **rete** materassi disponibili. Non proporre cuscini sospesi.
- Non alterare visual, homepage, animazioni, SEO e componenti estranei al catalogo salvo per far sparire gli articoli non vendibili. Se cambia lo slug 2400→2600, gestire redirect SEO e link interni.

## 5. Verifiche obbligatorie

Controlla il numero totale di combinazioni acquistabili: **130** (91 materassi + 26 reti + 13 topper). A parità di disponibilità dati, verifica anche questi esempi **160×190** con prezzo IVA inclusa:

| Modello | Altezza | Prezzo |
|---|---:|---:|
| Essential Foam | H20 | 200 € |
| Essential Foam | H25 | 250 € |
| Essential Foam | H30 | 270 € |
| Memory Duo | H25 | 280 € |
| Pocket **2600** Elite | H25 | 550 € |
| Pocket 1600 | H25 | 450 € |
| Memory Foam 3 strati | H27 | 400 € |
| Rete Flex | — | 180 € |
| Rete Strong | — | 200 € |
| Topper Memory Cloud 5 | H5 | 200 € |

Controlla anche **Rete Strong 160×200 = 219 €** e **Topper 120×200 = 159 €**: sono valori intenzionali riportati nel file, non arrotondarli. Verifica catalogo desktop e mobile, PDP, prezzo minimo, filtro/ricerca, selettori, immagini, carrello, WhatsApp, admin, prodotti sospesi, reload, build, eventuali migrazioni DB e comportamento dei link da vecchi prodotti.

## 6. Output di lavoro richiesto

Applica le modifiche reali se hai accesso al progetto. Produci: (1) elenco sintetico dei file/tabelle aggiornati; (2) migrazioni e mapping vecchi→nuovi ID/slug; (3) catalogo pubblico risultante; (4) conteggio e QA delle 130 varianti; (5) segnalazione dei prodotti con prezzo ma senza foto verificata; (6) checkpoint e hash commit, se disponibile; (7) istruzioni di deploy solo se necessarie. Evita lunghe domande preliminari su informazioni già presenti nello ZIP. **Non dichiarare pubblicato un sito che non hai effettivamente distribuito.**
