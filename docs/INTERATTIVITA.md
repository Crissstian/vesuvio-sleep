# Interattività del sito — esame del 17/11/2026

Criterio: un'interazione resta se aiuta a **scegliere**, a **fidarsi** o a **comprare**. Se serve solo a stupire, deve almeno non rallentare.

## Che cosa c'è oggi

| Dove | Interazione | Serve a | Giudizio |
| --- | --- | --- | --- |
| Home, apertura | Hero con foto a scorrimento e titolo animato | presentarsi | Tenere |
| Home | Numeri che contano (1986, 40 anni, 13 misure) | fiducia | Tenere, ma vedi sotto |
| Home | Frase sul Vesuvio + due righe di testo scorrevole | atmosfera | **Alleggerire** |
| Home | Vetrina del catalogo a schede | scegliere | Tenere |
| Home | Letto completo in evidenza (una scheda) | comprare | Tenere |
| Home | «Apri il materasso, strato per strato» (sei modelli, rivestimento di ognuno) | scegliere | Tenere: è il pezzo più riconoscibile del sito |
| Home | Fabbrica, striscia di foto, consegna | fiducia | Tenere |
| Home | Avvio dello Sleep Match con le scelte | scegliere | Tenere |
| Home e Showroom | Stato «aperto ora», orari, indicazioni | venire in negozio | Tenere |
| Home e Showroom | **Mappa di Google su richiesta** (nuova) | venire in negozio | Nuova, senza cookie fino al clic |
| Home e Showroom | **Recensioni di Google** (nuova, spenta) | fiducia | Pronta: serve la chiave |
| Scheda | Galleria con zoom, esploso con cursore, ingombro in scala, barra d'acquisto fissa | scegliere e comprare | Tenere |
| Scheda | Completa il letto: **prima i guanciali**, poi la rete | comprare | Nuova |
| Confronto, Guida misure, Fuori misura | tabelle e disegni in scala | scegliere | Tenere |
| Letti completi | vetrine, «Componi il tuo letto» | comprare | Nuova |
| Carrello e riepilogo | vantaggi, «Aggiungi», «Sali al…», WhatsApp | comprare | Tenere |
| Carrello | **Condividi il carrello** (nuova) | decidere in due | Nuova |
| Ovunque | inclinazione delle schede al passaggio, transizioni di pagina | estetica | Tenere: leggere, spente con «movimento ridotto» |

## Peso della home da telefono

Undici sezioni, circa **11.400 px**: tredici schermate. Il catalogo comincia dopo **2.300 px**, cioè dopo tre blocchi di «racconto»: numeri, frase sul Vesuvio, testo scorrevole. Chi arriva da Google per comprare un materasso li scorre prima di vedere un prezzo.

**Proposta (non applicata, decidi tu):**
1. Spostare il catalogo subito dopo l'apertura.
2. Unire numeri e frase sul Vesuvio in un solo blocco.
3. Togliere le due righe di testo scorrevole.

Risultato atteso: catalogo dopo circa 1.000 px, home più corta di circa 1.300 px, nessun contenuto perso.

## Fatto oggi

- **Mappa di Google su richiesta.** Al posto dell'illustrazione c'è il pulsante «Mostra la mappa interattiva». Prima del clic nessun collegamento a Google, quindi nessun banner dei cookie. Dopo il clic la mappa resta caricata per la visita in corso. L'informativa privacy è aggiornata.
- **Recensioni di Google, predisposte.** La funzione `supabase/functions/google-reviews` legge voto, numero e recensioni con la chiave API, che non va mai nel browser. Il sito le mostra tutte come le restituisce Google, senza scegliere le migliori, con il collegamento alla scheda. Si accende con `reviews: true` in `js/config.js`. **Servono:** una chiave API di Google (Places API, con fatturazione attiva), l'ID del luogo e il deploy della funzione. **Non provata**: da qui non si raggiungono né Google né Supabase.
- **Carrello condivisibile.** Si crea un link con codici e quantità, senza prezzi né dati personali, da mandare su WhatsApp a chi sceglie insieme a te. Chi lo apre vede articoli e totale ai prezzi di oggi e sceglie se usarlo o aggiungerlo al suo.
- **Guanciali al centro delle offerte.** Valgono con qualunque materasso, anche senza rete, e c'è anche la coppia da sola. Sono pronti ma invisibili finché i guanciali non hanno un prezzo (`Vesuvio_Sleep_guanciali_da_compilare.xlsx`).

## Altre funzioni, in ordine di valore e senza appesantire

| # | Funzione | Perché | Che cosa serve |
| --- | --- | --- | --- |
| 1 | **Prenota una prova in showroom** | Chi prova in fabbrica compra. Si scelgono giorno e fascia oraria, e parte un messaggio WhatsApp precompilato | Niente: orari già noti |
| 2 | **Consegna stimata per CAP** («ordini oggi, arriva giovedì») | Toglie il dubbio sui tempi | Calendario dei giri del furgone e tempi del corriere |
| 3 | **«Entra dalla porta?»** | Scale strette e ascensori piccoli dei palazzi napoletani: la paura vera di chi compra un materasso a molle | Misure da imballato e quali modelli si arrotolano |
| 4 | **Tracciamento con foto dalla fabbrica** | Fiducia nei circa 2 giorni di produzione | Qualcuno che scatti la foto in fabbrica |
| 5 | Realtà aumentata a misura reale | Chiarisce l'ingombro | Modelli 3D da preparare: costoso, rimandabile |

**Cosa NON aggiungerei:** chat automatica (c'è già WhatsApp), pop-up di sconto all'uscita, conti alla rovescia, notifiche push. Appesantiscono, e in un sito che si fonda sulla fiducia sembrano trucchi.
