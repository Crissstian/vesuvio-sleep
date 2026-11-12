# Mappa asset — cosa usare e dove

## Brand

| File in `asset/brand/` | Impiego |
| --- | --- |
| `logo-vesuvio-sleep-trasparente.png` | Logo principale: materasso con profilo del Vesuvio. Usa questo su sfondi chiari per header e footer; su fondo scuro usa una superficie chiara oppure una variante monocromatica approvata. |
| `logo-circolare-avatar.jpeg` | Avatar social o riferimento per un favicon derivato dal simbolo ufficiale; non sostituisce il logo in testata. |
| `watermark-storico.jpeg` | Archivio visivo: è un'altra interpretazione del marchio. Non usarlo come secondo logo né mescolarlo al simbolo ufficiale. |

Palette di partenza: blu Vesuvio `#206786`, blu profondo `#0E3444`, ghiaccio `#EAF3F6`, avorio `#F7F1E8`, inchiostro `#172B35`, lava `#C8785B` come accento. Manrope per titoli e UI, Inter per i testi come punto di partenza; eventuale serif editoriale solo per accenti. Verifica il contrasto effettivo.

## WebP di partenza

| File in `asset/web/` | Impiego |
| --- | --- |
| `hero-mediterranea.webp` | Hero ambientata, 1672×941. Tieni il testo in HTML e componi il ritaglio mobile senza tagliare il materasso. Immagine illustrativa, non foto di un modello specifico. |
| `pocket-2400-cutaway.webp` | Pocket 2400 Elite: vista in sezione, 1536×1024. Adatta alla galleria e alla card del modello. Etichetta «Render illustrativo»; non usare per ricavare quote. |
| `pocket-2400-esploso.webp` | Pocket 2400 Elite / Material Lab, 1200×800. Vista a strati, non disegno costruttivo. Etichette in HTML, con materiali ricavati dal dataset; non dedurre spessori. |
| `lavorazione-illustrativa.webp` | Sezione produzione, 1997×788. Scena generata: non presentarla come foto del personale o della sede. Sostituiscila con una foto reale quando disponibile. |

## Originali e riferimenti, non da pubblicare in blocco

- `asset/originali/`: originali a risoluzione più alta per i quattro WebP, un'alternativa hero e due render neutri di un materasso con fascia beige (prospettiva ed esploso). Gli ultimi due non hanno un abbinamento commerciale confermato e non vanno usati come immagini ufficiali di uno SKU. Parti dai WebP; dai PNG originali crea nuove esportazioni solo quando servono altri ritagli o risoluzioni.
- `asset/render-da-assegnare/`: set da tre viste del materasso con fascia scura e set da tre viste del materasso chiaro (prospettiva, dettaglio, esploso). Sono riferimenti senza mappatura certa allo SKU. Non pubblicarli automaticamente. Le immagini non autorizzano claim su materiali, numero di strati, certificazioni o comfort.
- `asset/foto-riferimento/`: foto d'archivio raggruppate per aspetto (fascia beige, fascia scura e fascia chiara). Utili per confrontare cuciture, tessuti, taglio e proporzioni; gli identificativi dei modelli non sono confermati. Chiedi a Cristian di indicare modello/SKU e autorizzazione prima di metterle online.

Per hero, copertine ed esplosi usa `alt` descrittivi, non ripetizioni di parole chiave. Lascia alt vuoto agli elementi puramente decorativi. Carica gli asset pubblici necessari soltanto; conserva originali e riferimenti fuori dalla directory pubblica. Per reti, guanciali, topper e gli altri SKU senza foto confermate usa un fallback coerente con la categoria, non la foto del Pocket su tutti i prodotti. Le foto approvate dovranno poter sostituire i render dall'admin, senza cambiare codice.

## Dati e precedenze

I due file originali in `dati/` sono la baseline del catalogo, non un'autorizzazione a pubblicare. Il **prompt nuovo** prevale sulle indicazioni storiche di checkout e pagamenti: WhatsApp soltanto al lancio. Il dataset tiene in sospeso, tra l'altro, i modelli Pocket 1600 e Bonnell, l'altezza H30 del Pocket 2400 Elite e il prezzo del Topper Memory Cloud 5. Non trasformarli in prodotti o varianti acquistabili senza completamento e approvazione.
