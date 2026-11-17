# Changelog

## 17/11/2026 sera — guanciali in vendita, home da telefono più corta

- Guanciali pubblicati (Piuma 45 €, Memory Flakes 33 €, Memory Classic 37 €, Memory Cervical 34 €), H12, foto generate; prezzi provvisori = media concorrenti −10 %. Vetrine Notte Memory e Notte Flakes visibili.
- Reti: «Portata alta» nella scheda (riquadro e caratteristiche), senza valori in kg.
- Home da telefono: catalogo e letto completo subito dopo l'apertura (da 2.343 a 1.041 px); tolti testo scorrevole e «40 anni». Computer invariato.
- SQL: `bundle_visible` richiede una variante in vendita per ogni pezzo obbligatorio.
- Test aggiornati: unitari 40, flussi 147, offerte 100, sito 26, SQL 91 + parità su 600 carrelli.

## Guanciali al centro, mappa, recensioni, carrello condivisibile (17/11/2026, notte)
- **Guanciali**: −15 % su due guanciali con qualunque materasso, anche senza rete; −10 % sulla coppia da sola. Proposti per primi (Memory Flakes, Memory Classic) nella scheda materasso, nel carrello, nel riepilogo e in «Componi il tuo letto»; nella scheda guanciale c'è «Prendine due». Nuove vetrine **Notte Memory** e **Notte Flakes** in testa. Tutto si accende da solo quando i guanciali avranno un prezzo: oggi resta nascosto. Database e sito calcolano allo stesso modo (600 carrelli confrontati, 150 con i guanciali).
- Una vetrina si mostra solo se tutti i pezzi obbligatori sono in vendita (regola nel database e nel sito).
- **Mappa di Google** nella pagina showroom e in home, caricata solo al clic: niente collegamenti a Google prima, informativa aggiornata (anche con Supabase, che mancava).
- **Recensioni di Google** predisposte: funzione server con la chiave API e sezione che le mostra tutte, nell'ordine di Google. Spente finché non ci sono chiave e ID del luogo.
- **Condividi il carrello**: link con codici e quantità da mandare su WhatsApp; chi lo apre sceglie se usarlo o aggiungerlo al suo.
- Esame dell'interattività in `docs/INTERATTIVITA.md`, con la proposta di accorciare la home.

## Vista esplosa completa, rivestimenti per modello, home più leggera (17/11/2026)
- La vista esplosa («Apri il materasso, strato per strato») ora ha **tutti e sei i materassi**: aggiunti **Memory Trio** (tre strati di Memory Foam) e **Pocket 1600** (Memory Foam, poliuretano, molle, base), con gli strati ricavati dalle foto «esploso» dell'azienda. Le stesse schede prodotto ora mostrano anche «Strato per strato».
- **Il rivestimento cambia con il modello**, preso dalle foto: Eco tutto bianco con trapuntatura a onde; Duo Classic fascia marrone a rombi con maniglia; Duo fascia grigio antracite; Trio grigio chiaro con catene di esagoni; Pocket 1600 fascia testa di moro e trapuntatura a incastro; Pocket 3000 fascia cammello a righe verticali e capitonné. Anche i riquadri della legenda usano quei colori.
- In home resta **una sola scheda** dei letti completi (Letto Elite), con il collegamento a tutti gli altri.

## Offerte abbinate: letti completi (17/11/2026)
- **Letto completo**: materasso e rete della stessa misura costano meno insieme. −5 % sui materassi in schiuma, −8 % sui Pocket, arrotondato ai 5 €. In più: 3–4 letti −10 %, da 5 −12 %; topper −10 % con un letto completo; due materassi uguali −5/−8 %; tetto 15 % sul carrello. Percentuali prudenti, scelte senza conoscere i margini, modificabili da **Admin › Offerte**.
- **Cinque vetrine nel database**: Letto Elite (Pocket 3000 + Rete Strong), Letto Pocket, Letto Trio, Letto Memory, Singolo completo (Eco H20 + Rete Flex, da 160 €). Ognuna ha la sua pagina con misura, altezza e topper facoltativo.
- **Schede speciali**, riconoscibili dalle schede prodotto: bordo cucito ed etichetta cucita del risparmio, come quella sul fianco del materasso. In home, tra i prodotti di materassi e reti, e nella pagina **Letti completi** con **Componi il tuo letto** (misura una volta sola, poi materasso, rete, topper, numero di letti).
- **Quasi al checkout**: nel carrello e nel riepilogo compaiono subtotale, vantaggi e totale, la quota di vantaggio su ogni riga e i pulsanti **Aggiungi** (rete della misura, topper sul letto completo) con il risparmio ricalcolato; nel carrello anche **Sali al…** con la differenza netta. Il messaggio WhatsApp porta subtotale, vantaggi e totale.
- La scheda materasso ha il pannello **Completa il letto**; lo Sleep Match si chiude con **Il tuo letto completo**.
- **Database**: tabelle `offers`, `bundles`, `bundle_items`, famiglia commerciale dei materassi, interruttore `offers_enabled`, sconto salvato con la richiesta; `price_cart` in SQL identica al calcolo del sito (verificato su 450 carrelli). La richiesta non si crea se il totale visto dal cliente non è più quello giusto (`offer_changed`).
- **Recesso su una parte**: si rimborsa quanto pagato per i pezzi restituiti, il vantaggio sui pezzi tenuti resta. Calcolo in Admin › Richieste.
- Migrazioni scritte e verificate in locale, **non ancora applicate a Supabase** (manca la conferma richiesta dal server). Il sito regge anche il database non aggiornato.

## Foto dei due modelli nuovi, primo admin, decisioni dell'azienda (16/11/2026, sera)
- **Memory Trio** e **Memory Duo Classic** hanno le loro tre foto (prospettiva, esploso, dettaglio), consegnate dall'azienda. Lavorate con la stessa pipeline delle foto ufficiali: bianco ritagliato, prodotto centrato su tela 4:3, fondo reso trasparente, WebP a due larghezze. Restano con i segnaposto solo Pocket 1600 e Topper.
- Le foto del Memory Trio portano la scritta **«Grafeno»** sul tessuto e quelle del Memory Duo Classic la scritta **«Bamboo»**. L'immagine Grafeno era marcata «non associare ad alcun prodotto» nel manifest del 15/11, con riserva «fino a istruzioni successive»: l'azienda l'ha assegnata a questo modello. **Le schede non riprendono né l'una né l'altra scritta**, nemmeno nel testo alternativo delle immagini, perché né il grafene né il bambù sono caratteristiche verificate. Un controllo automatico lo impedisce.
- Il testo del Memory Duo Classic ora dice che il rivestimento è diverso da quello del Memory Duo, perché nelle foto si vede.
- **Primo admin creato** su Supabase: utente promosso in `public.admins`, email confermata, **senza password** — la imposta il titolare dell'indirizzo con «Password dimenticata». Verificato che da quell'utente le policy RLS mostrano bozze, archiviati e note interne.
- **`vercel.json` generato** insieme a `_redirects` e `_headers`: stessi redirect, stesse intestazioni di sicurezza e di cache, stessi rewrite per admin e ricerca. L'hosting si sceglie al caricamento.
- Decisioni dell'azienda registrate nel pending: claim del rivestimento invariati, contrassegno senza sovrapprezzo, nome «Eco» confermato, foto generate con AI pubblicate senza dichiarazione (con la segnalazione del rischio agli atti).

## Listino confermato e altezze H30 a catalogo (16/11/2026, sera)
L'azienda ha rimandato indietro il listino. Le scale che avevo ricostruito sono tornate invariate, quindi sono **confermate**; in più sono arrivati i prezzi delle tre altezze H30 che finora non erano in vendita.

- **Memory Duo H30**, **Pocket 1600 H30** e **Pocket 3000 Elite H30** ora si comprano: 39 misure in più. Varianti acquistabili da 143 a **182** (143 materassi, 26 reti, 13 topper).
- Sulle schede compare la scelta dell'altezza anche per Memory Duo e per i due Pocket.
- **Due prezzi corretti su autorizzazione dell'azienda**, dopo averli segnalati: Memory Duo H30 160×190 da **329 a 330 €** (era l'unico prezzo dei materassi non multiplo di 10, tra un 290 e un 340) e Pocket 1600 H30 160×190 da **540 a 520 €** (costava più del 160×200 e del 165×190, che stanno a 530: il prezzo scendeva al crescere della misura). I 520 € sono l'H25 dello stesso modello, 500 €, più i 20 € di scarto che separano H25 e H30 in 9 misure su 13; rimettono l'ordine 520 < 530 = 530, come in H25 sale 500 < 510 = 510. Entrambe le correzioni restano annotate nelle note interne dei due prodotti, da ricontrollare al prossimo listino.
- Un controllo SQL in più impedisce d'ora in poi che un materasso finisca a listino con un prezzo che non sia un multiplo di 10 €. Restano fuori, perché vengono dal listino confermato, i 219 € della Rete Strong 160×200 e i 159 € del Topper 120×200.
- **Sleep Match**: quando propone un'altezza, il prezzo «da» è ora quello di quell'altezza. Prima mostrava il minimo del modello, che poteva appartenere a un'altra altezza: con le H30 a listino sarebbe stato un prezzo diverso da quello proposto.
- Applicato al database Supabase (182 varianti acquistabili, nessun prezzo a zero, 78 variazioni a storico).

## Gamma rifatta: 6 materassi (16/11/2026, sera)
L'azienda ha indicato l'elenco definitivo dei materassi. Il catalogo, le schede, i testi del sito e il database Supabase sono stati allineati; i prezzi non dettati sono stati **ricostruiti in proporzione**, non inventati.

- **Vesuvio Eco** (era Vesuvio Essential Foam). Prezzi e foto invariati. Il nome «Eco» resta una denominazione commerciale: sul sito non è accompagnato da nessuna dichiarazione ambientale, perché non ne abbiamo di documentate.
- **Vesuvio Memory Duo Classic** pubblicato: Memory Foam due strati con rivestimento fisso. Prezzi indicati dall'azienda come «Memory Duo meno 20 €», applicati misura per misura (160×190 = 260 €).
- **Vesuvio Memory Duo** invariato.
- **Vesuvio Memory Trio** (era «Memory Foam 3 strati», nome di listino): il nome richiama il Memory Duo e dichiara i tre strati. Prezzi invariati.
- **Vesuvio Pocket 3000 Elite** (era Pocket 2600, prima ancora 2400). Prezzi ricostruiti in proporzione portando il 160×190 a 620 € (fattore 1,1273, arrotondamento a 10 €). Il numero di molle è cambiato anche in composizione, punti chiave, strati della scheda, confronto e guida: **va confermato prima del lancio**, è un dato tecnico pubblicato.
- **Vesuvio Pocket 1600** rientrato in catalogo. Prezzi ricostruiti portando il 160×190 a 500 € (fattore 1,1111).
- **Memory Air 3D** e **Bonnell Classic** fuori gamma: archiviati, non eliminati. Spariscono dal sito, prezzi e storico restano, si ripubblicano da Admin con un clic.
- Materassi in catalogo: da 4 a **6**. Varianti acquistabili: da 117 a **143** (104 materassi, 26 reti, 13 topper).
- **Segnaposto per le foto mancanti**: ogni scheda senza foto mostra, per ogni inquadratura prevista, un riquadro dichiarato «Foto in arrivo» invece di riempire il vuoto. Riguarda Memory Trio, Memory Duo Classic, Pocket 1600 e il Topper.
- **Indirizzi**: `/materassi/essential-foam/`, `/materassi/memory-foam-3-strati/`, `/materassi/pocket-2600-elite/` e `/materassi/pocket-2400-elite/` reindirizzano in modo permanente alle pagine nuove; i redirect del sito statico ora si generano dal catalogo, non a mano.
- Rinominate anche le cartelle delle foto, mantenendo gli ID delle immagini: il database non vede foto nuove.
- Applicato al database Supabase del nuovo sito (143 varianti acquistabili, 9 prodotti pubblici, nessuno SKU vecchio residuo) e verificato con una query di controllo.
- Test aggiornati: 134 end-to-end sulla preview, 26 sul sito statico, 12 unitari, SQL completi su Postgres 16. Tutti superati.

## Catalogo: Pocket 1600 ritirato, Memory Duo Classic in arrivo (16/11/2026)
- **Vesuvio Pocket 1600 fuori catalogo** su indicazione dell'azienda. È **archiviato**, non eliminato: sparisce da categorie, ricerca, Sleep Match, abbinamenti e confronto, la sua pagina non esiste più, ma prezzi e storico restano e si ripubblica da Admin con un clic. Se qualcuno ce l'ha nel carrello da prima, al riepilogo risulta non disponibile e non può essere inviato. Tolto anche dai testi del catalogo e dalla guida alle tecnologie.
- **Vesuvio Memory Duo Classic**: stesso materasso del Memory Duo con il rivestimento fisso, non sfoderabile. Creato in **bozza**, visibile solo nell'admin, perché i prezzi non sono nel listino e non si inventano. Si pubblica appena l'azienda li fornisce.
- Materassi in catalogo: da 5 a 4. Varianti acquistabili: da 130 a **117** (78 materassi, 26 reti, 13 topper).
- Il catalogo generato per Supabase ora è un unico file aggiornato, `supabase/catalog/catalogo_corrente.sql`.
- Applicato anche al database Supabase, con verifica da visitatore anonimo.
- **Corretta una fuga di dati trovata durante il lavoro**: il JavaScript del sito pubblico conteneva anche prodotti in bozza, archiviati e le **note interne** (per esempio «portata massima non verificata: non pubblicare un valore»), leggibili da chiunque. Ora il sito pubblico usa un catalogo separato, `seed.public.js`, con i soli prodotti pubblicati e senza note. Due controlli automatici lo verificano a ogni build.

## Effetti per il telefono (16/11/2026)
- Vetrina della home come carosello in profondità: la scheda al centro è in primo piano, le altre si allontanano; puntini a forma di cucitura.
- Galleria della scheda sfogliabile col dito, con puntini; la foto segue il dito e la successiva entra dal lato giusto.
- Onda al tocco su pulsanti, misure, schede e voci del menu; breve vibrazione quando aggiungi al carrello (dove supportata).
- Menu a tutto schermo che si apre a cerchio dal pulsante, con voci grandi che entrano in sequenza.
- Ciò che arriva al centro dello schermo si accende (bordo cucito, foto che si avvicina): sostituisce il passaggio del mouse.
- Card che entrano alternando il lato, foto della scheda che si allontana scorrendo, barra d'acquisto con scatto morbido, pulsante WhatsApp che si fa da parte mentre scendi.

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
