# Vesuvio Sleep — Offerte abbinate (bundle), progetto della versione beta

Data: 17/11/2026 · Stato: **progetto, nessuna riga di codice di produzione scritta** · Destinatario: chi implementerà (Opus)

Allegato eseguibile: `offers_reference.mjs` (calcolo di riferimento sui prezzi reali; si lancia con `node offers_reference.mjs`). I numeri di questo documento escono da lì, non da calcoli a mano.

---

## 0. Decisioni prese (sintesi)

| Tema | Decisione |
| --- | --- |
| Vantaggio «Letto completo» (materasso + rete, stessa misura) | **−5 %** sui materassi in schiuma (Eco, Duo Classic, Duo, Trio), **−8 %** sui Pocket (1600 e 3000), sul totale materasso + rete, **arrotondato ai 5 € più vicini** |
| Più letti nello stesso ordine | **3–4 letti −10 %**, **5 o più −12 %** (non si cumulano con la percentuale di base: vale la più alta). Da 10 letti in su: preventivo dedicato |
| Accessori | **Topper −10 %** se nel carrello c'è un letto completo della stessa misura. **Guanciali −10 %**: regola pronta ma **dormiente** finché non hanno un prezzo |
| Due materassi uguali senza rete | −5 % (schiuma) / −8 % (Pocket) sul totale dei due |
| Tetto di sicurezza | Nessun carrello può superare **15 %** di sconto complessivo |
| Recesso su una parte | **Lo sconto è ripartito pezzo per pezzo al momento dell'ordine; si rimborsa quanto effettivamente pagato per i pezzi restituiti; sui pezzi che il cliente tiene il vantaggio resta acquisito, nessun recupero** |
| Servizi inclusi (ritiro usato, montaggio rete) | Progettati come «vantaggio non in denaro», **spenti** finché l'azienda non conferma cosa è oggi gratuito |
| Stagionali | Il sistema supporta date di validità; nessuna campagna in beta |
| Partenza | Interruttore globale in Admin, spento di default sul sito pubblico, sempre acceso nella preview |

**Premessa da dichiarare.** Non conosco costi né margini. La premessa («i Pocket hanno ampio margine») è tua; l'ho presa come data. Per questo ho scelto percentuali **prudenti** (la più alta in assoluto è il 12 %) e ho reso **ogni numero modificabile da Admin senza toccare il codice**. Sensibilità: sul Pocket 3000 160×190 con rete (800 €) ogni punto percentuale vale circa 8 €; passare dall'8 % al 10 % significa 80 € invece di 65 €.

---

## 1. Perché queste percentuali

1. **Scala di gamma coerente.** Con lo sconto, un letto completo 160×190 con Rete Flex costa: Eco **410**, Duo Classic **420**, Duo **435**, Trio **550**, Pocket 1600 **625**, Pocket 3000 **735**. I gradini restano ordinati, e **il passaggio Trio → Pocket 1600 costa 75 € netti invece di 100 €**: il vantaggio più alto sui Pocket aiuta a salire di gamma senza una regola apposta.
2. **Pocket più generoso del resto**: segue la tua indicazione (margine ampio) ed è dove il cliente esita di più (prezzi da 500 € in su).
3. **Percentuali effettive dopo l'arrotondamento: da 4,5 % a 8,3 %.** Arrotondare ai 5 € dà numeri «puliti» («risparmi 25 €») ed evita centesimi.
4. **Il tetto del 15 %** protegge da errori di configurazione (se qualcuno digita 80 invece di 8, il carrello non va sotto costo).
5. **Niente sconto sul materasso venduto da solo.** I prezzi sono appena stati confermati dall'azienda: restano come sono per chi compra un pezzo solo.

Esposizione massima per un letto completo con le regole di base: 65 € (Pocket 1600 H30 180×200 e Pocket 3000 160×190); fino a 80 € sulle misure più alte del Pocket 3000.

---

## 2. Il catalogo delle offerte beta

Ogni proposta citata nell'analisi precedente ha una collocazione. **Una sola logica di calcolo, più superfici**.

| # | Proposta | Come si realizza | Stato in beta |
| --- | --- | --- | --- |
| A | **Letto completo** | Regola `letto-completo` | **Attiva** |
| B | **Singolo da 160 €** (kit d'ingresso) | Non è una regola nuova: pagina di raccolta sulla regola A con i prodotti Eco H20 + Rete Flex. Prezzi netti: 80×190 **160 €**, 80×200 **180 €**, 90×200 **220 €**, 90×190 **210 €** | **Attiva** |
| C | **Sali di gamma** | Suggerimento nel carrello con differenza **netta** («passare al Trio costa +115 €») | **Attiva** (solo informativa) |
| D | **Rinnova** (topper + guanciali, senza materasso) | Nessuna regola: topper da solo resta a listino. Le richieste di questo tipo si servono con la regola accessori quando c'è un letto | **Rinviata**: i guanciali non hanno prezzo |
| E | **Servizi inclusi** | Voce a 0 € nel riepilogo («Ritiro del materasso usato incluso») collegata alla regola A | **Costruita, spenta** finché l'azienda non conferma |
| F | **Per due** | Regola `per-due` | **Attiva** |
| G | **Camere multiple / strutture** | Scaglioni `letti-multipli` (3+ e 5+); da 10 letti in su pagina «preventivo strutture» | **Attiva** (scaglioni), preventivo PDF **fase 2** |
| H | **Componi il tuo letto** | Pagina nuova `/componi-il-tuo-letto/` | **Attiva** |
| I | **Sleep Match chiude con il letto completo** | Ultima schermata del risultato | **Attiva** |
| J | **Stagionali** | Date di inizio/fine sulle regole | Solo predisposto |

---

## 3. Regole di calcolo (il contratto)

Valgono **identiche** nel codice condiviso (`core/offers.ts`) e nella funzione SQL. L'autorità è il database; il browser mostra.

### 3.1 Definizioni
- **Unità**: un pezzo. Una riga con quantità 3 genera 3 unità.
- **Famiglia** del materasso: `pocket` se la tecnologia è «molle», `foam` se «foam» o «memory». Un materasso senza famiglia **non partecipa** a nessuna offerta (ad esempio un futuro prodotto non classificato).
- **Letto completo**: un materasso (con famiglia) + una rete **della stessa misura**.

### 3.2 Ordine di valutazione
1. **Letti completi.** Per ogni misura: si abbinano i materassi (dal più caro) alle reti. Il numero di letti completi `N` è il totale su tutte le misure.
2. **Percentuale del letto** = max(percentuale di famiglia, percentuale dello scaglione per `N`). Scaglioni: `N ≥ 3` → 10 %; `N ≥ 5` → 12 %.
3. **Sconto del letto** = `arrotonda_a_5_€((prezzo materasso + prezzo rete) × percentuale)`.
4. **Accessori.** Un **topper** riceve −10 % se nel carrello c'è un letto completo della **stessa misura**, uno per letto. I **guanciali** (che non hanno misura) ricevono −10 %, fino a 2 per letto completo. Arrotondamento all'euro. Un accessorio non abbinato non ha sconto.
5. **Per due.** I materassi con famiglia **non** inseriti in un letto completo, in coppie della stessa variante: −5 % (schiuma) o −8 % (Pocket) sul totale della coppia, arrotondato ai 5 €.
6. **Tetto.** Se lo sconto totale supera il 15 % del totale a listino, tutti gli sconti si riducono in proporzione (arrotondando per difetto).
7. **Nessun cumulo** tra regole sullo stesso pezzo: ogni unità appartiene al massimo a una offerta.

### 3.3 Ripartizione dello sconto sui pezzi
Lo sconto di ogni offerta si divide tra i suoi pezzi **in proporzione al prezzo di listino**, con il metodo del resto maggiore (i centesimi tornano esatti). Ne esce, per ogni unità: `listino`, `sconto`, `pagato`. È la base dei rimborsi (§4).

### 3.4 Errori e casi limite da trattare
| Caso | Comportamento |
| --- | --- |
| Rete e materasso di misura diversa | Nessun letto; suggerimento «aggiungi la rete della stessa misura» con risparmio calcolato |
| Fuori misura | Non entra nel carrello: nessuna offerta |
| Riga non acquistabile o prezzo cambiato | La riga segue le regole attuali (`unavailable`, `price_changed`); le offerte si calcolano **solo sulle righe valide** |
| Offerta scaduta o spenta tra carrello e riepilogo | Il totale cambia: il riepilogo va **bloccato con un avviso** finché il cliente non conferma il nuovo totale (vedi `seen_total_cents`, §6.3) |
| Quantità > 20 | Resta il limite attuale |
| Prodotto archiviato | Non partecipa |
| Offerte disattivate | `discount_cents = 0`, tutto come oggi |

### 3.5 Casi golden (prezzi reali, già verificati dal riferimento)

| # | Carrello | Listino | Sconto | Totale |
| --- | --- | --- | --- | --- |
| G1 | Duo H25 160×190 + Rete Flex | 460 | 25 (5 %) | **435** |
| G2 | Eco H20 80×190 + Rete Flex | 170 | 10 | **160** |
| G3 | Pocket 3000 H25 160×190 + Rete Strong | 820 | 65 (8 %) | **755** |
| G4 | Pocket 1600 H30 180×200 + Rete Flex | 840 | 65 | **775** |
| G5 | Trio H27 160×190 + Rete Flex | 580 | 30 | **550** |
| G6 | G1 + Topper 160×190 | 660 | 25 + 20 | **615** |
| G7 | 3 × (Duo H25 90×200 + Flex) | 840 | 90 (10 %, 30 a letto) | **750** |
| G8 | 5 × (Pocket 1600 H25 90×200 + Flex) | 1950 | 225 (12 %, 45 a letto) | **1725** |
| G9 | 2 × Duo H25 90×200 (senza rete) | 340 | 15 | **325** |
| G10 | Pocket 3000 H25 160×190 da solo | 620 | 0 | **620** — suggerimento: «con una rete risparmi 65 €» |
| G11 | Duo 160×190 + Rete Flex 160×**200** | 470 | 0 | **470** — suggerimento: rete 160×190 a 180 €, risparmi 25 € |
| G12 | Topper da solo | 200 | 0 | **200** |
| G13 | G1 + Topper 140×190 (altra misura) | 620 | 25 | **595** (topper senza sconto) |

Tabella del prezzo netto «materasso + Rete Flex» per misura (altezza standard; `listino → netto`):

| Modello | 80×190 | 90×200 | 140×190 | 160×190 | 160×200 | 180×200 |
| --- | --- | --- | --- | --- | --- | --- |
| Eco H25 | 180 → 170 | 250 → 235 | 370 → 350 | 430 → 410 | 470 → 445 | 560 → 530 |
| Duo Classic H25 | 190 → 180 | 260 → 245 | 390 → 370 | 440 → 420 | 470 → 445 | 570 → 540 |
| Duo H25 | 210 → 200 | 280 → 265 | 410 → 390 | 460 → 435 | 490 → 465 | 590 → 560 |
| Trio H27 | 250 → 235 | 330 → 315 | 500 → 475 | 580 → 550 | 610 → 580 | 720 → 685 |
| Pocket 1600 H25 | 300 → 275 | 390 → 360 | 580 → 535 | 680 → 625 | 700 → 645 | 820 → 755 |
| Pocket 3000 H25 | 310 → 285 | 400 → 370 | 630 → 580 | 800 → 735 | 820 → 755 | 970 → 890 |

---

## 4. Recesso su una parte dell'ordine — decisione

### 4.1 La regola
1. **Al momento dell'ordine** lo sconto viene ripartito sui singoli pezzi (§3.3) e **salvato** nella richiesta: per ogni pezzo, listino, quota di sconto, importo pagato.
2. **Recesso su alcuni pezzi** → si rimborsa **l'importo effettivamente pagato per quei pezzi**.
3. **Sui pezzi che il cliente tiene, il vantaggio resta acquisito**: nessun ricalcolo, nessun recupero, nessuna trattenuta.
4. **Recesso totale** → rimborso del totale pagato.
5. **Garanzia / difetto**: nessun cambiamento: lo sconto non influisce.

Esempio (G3, Pocket 3000 + Rete Strong, 755 € pagati): materasso 620 − 49,15 = **570,85 €**; rete 200 − 15,85 = **184,15 €**. Se restituisce il solo materasso riceve 570,85 € e tiene la rete a 184,15 € (listino 200 €).

### 4.2 Perché questa e non il ricalcolo
Le alternative possibili erano: (a) far decadere lo sconto sui pezzi rimasti e trattenerne l'importo dal rimborso; (b) rimborsare a listino e far pagare la differenza. Ho scartato entrambe per tre motivi.
- **Rischio legale.** Il consumatore che recede può essere gravato soltanto delle spese dirette di restituzione. Una trattenuta legata all'aver esercitato il recesso può essere letta come una penale e come clausola vessatoria. Su 15–65 € non vale il rischio.
- **Costo reale basso.** L'esposizione massima è la percentuale di sconto sui pezzi tenuti: al massimo l'8 % di un pezzo da 200 € (≈ 16 €). Il caso tipico (restituire il materasso e tenere la rete) è raro.
- **Semplicità.** È una regola dicibile in una riga, calcolabile dall'Admin senza interpretazioni.

**Salvaguardia.** Il rapporto tra recessi parziali e letti venduti si monitora (§8). Se superasse il 10 % dei letti completi si riprende in mano la regola, con parere dell'avvocato.

### 4.3 Testo per le condizioni di vendita (bozza, da far rivedere dall'avvocato)
> **Offerte abbinate.** Quando acquisti più prodotti insieme in un'offerta, il vantaggio è calcolato rispetto alla somma dei prezzi dei singoli prodotti e viene ripartito sui prodotti dell'offerta in proporzione al loro prezzo. Se eserciti il diritto di recesso su una parte dei prodotti, ti rimborsiamo quanto hai effettivamente pagato per i prodotti restituiti, compresa la quota di vantaggio a essi attribuita. Per i prodotti che scegli di tenere, il vantaggio resta acquisito.

### 4.4 Strumento in Admin
Pulsante **«Recesso parziale»** su una richiesta: si spuntano i pezzi restituiti e compare l'importo da rimborsare (dalle quote salvate). Registra un evento nello storico della richiesta («Recesso parziale: rimborsati X € su Y»). Senza questo strumento la regola si applicherebbe a mano e a occhio.

---

## 5. Esperienza d'uso

### 5.1 Principi
- Il vantaggio **si vede dove si decide**: scheda prodotto, carrello, risultato del Sleep Match.
- Si mostra sempre **il prezzo separato e il prezzo insieme**: «Separati 460 € · Insieme 435 € · Risparmi 25 €». Nessun prezzo «barrato» inventato: il confronto è con la somma dei prezzi reali.
- Un solo vantaggio per volta, spiegato in una frase. Nessun conto alla rovescia, nessuna urgenza finta.
- Se il vantaggio **sparisce** (si toglie la rete) il carrello lo dice.

### 5.2 Scheda materasso — pannello «Letto completo»
Sotto la scelta di misura e altezza, quando la rete della stessa misura esiste:

```
┌───────────────────────────────────────────┐
│ Completa il letto            −25 €        │
│ ( ) Solo materasso               280 €    │
│ (•) + Rete Flex 160×190    460 → 435 €    │
│ ( ) + Rete Strong 160×190  480 → 455 €    │
│  Risparmi 25 € · rete della stessa misura │
│  [ Aggiungi il letto completo ]           │
└───────────────────────────────────────────┘
```
Cambiando misura il pannello si ricalcola; se la rete non esiste in quella misura il pannello non compare.

### 5.3 Carrello
```
Letto completo 160×190            [modifica]
  Memory Duo H25                    280 €
  Rete Flex                         180 €
  Vantaggio letto completo          −25 €
  Insieme                           435 €
─────────────────────────────────────────
? Aggiungi il topper 160×190: −20 €   [+ Aggiungi]
? Passa al Trio: +115 € (27 cm, tre strati)
```
Righe sciolte restano come oggi, con un suggerimento calcolato («con una rete 160×190 risparmi 25 €»). Togliere un pezzo di un letto mostra: «Senza la rete perdi il vantaggio di 25 €».

### 5.4 Riepilogo e messaggio WhatsApp
Il messaggio mostra le righe come oggi e **aggiunge**:
```
Subtotale: 460 €
Vantaggio letto completo: −25 €
Totale: 435 € (IVA inclusa)
```
Il messaggio breve (oltre 1.900 caratteri di URL) dice: «2 articoli, totale 435 € (IVA inclusa, vantaggio 25 € incluso)». Nessun dato personale in più.

### 5.5 «Componi il tuo letto» (pagina nuova)
```
1 Misura   [80×190][90×200]…[180×200]   (altre → preventivo)
2 Materasso  carte dei 6 modelli con il prezzo NELLA MISURA SCELTA
3 Rete       ( ) Nessuna  (•) Flex  ( ) Strong
4 Completa   [ ] Topper −20 €     (guanciali: quando disponibili)
─────────────────── riepilogo sempre visibile ───────────────────
Separati 460 € · Insieme 435 € · Risparmi 25 €   [ Aggiungi al carrello ]
```
Su telefono il riepilogo è una barra fissa in basso. La misura si sceglie una volta sola e tutto il resto si filtra di conseguenza (non si può più ordinare rete e materasso di misure diverse).

### 5.6 Sleep Match
Ultima schermata: «Il tuo letto» con materasso consigliato + rete consigliata (la più economica della misura, con alternativa) + totale e risparmio + due pulsanti: **Aggiungi il letto completo** e **Modifica nella pagina Componi**. Dipende dalla correzione del motore (il Trio oggi non viene mai consigliato).

### 5.7 Pagine di raccolta
- `/offerte/` — elenco delle offerte attive, con la regola scritta in chiaro.
- `/offerte/singolo-completo/` — «Il singolo completo da 160 €» (kit d'ingresso).
- `/offerte/strutture/` — calcolatrice per camere (scaglioni 3+ e 5+) con pulsante «Chiedi un preventivo» da 10 letti.

---

## 6. Architettura

### 6.1 Principio
**Il database decide il prezzo.** Nessun totale arriva dal browser come dato fidato. Il codice condiviso (`core/offers.ts`) esiste per mostrare l'anteprima e per la preview offline; **deve dare gli stessi risultati della funzione SQL**, e un test lo verifica.

### 6.2 Dati (nuova migrazione `…000009_offerte.sql`)

**`public.offers`** — le regole (una riga per regola):
| Colonna | Note |
| --- | --- |
| `code` text unique | `letto-completo`, `letti-multipli`, `accessori`, `per-due`, `servizio-ritiro` |
| `kind` text | tipo di logica, uno dei codici sopra |
| `label` text | testo mostrato («Vantaggio letto completo») |
| `description` text | una frase pubblica che spiega la regola |
| `params` jsonb | percentuali, scaglioni, arrotondamenti (struttura in §6.4) |
| `status` text | `draft` / `active` / `paused` |
| `starts_at`, `ends_at` timestamptz | validità; vuoti = sempre |
| `updated_at`, `updated_by` | tracciamento |

RLS: **lettura pubblica solo delle regole `active` e nel periodo** (le percentuali non sono segrete, servono alla pagina), scrittura solo admin. Nessun permesso di default ad `anon` oltre al `select` (coerente con la migrazione dei permessi minimi).

**`public.settings`**: nuova chiave `offers_enabled` (boolean). È l'**interruttore generale**. Spento: tutto come oggi.

**`public.products`**: nuova colonna **`bundle_family`** (`foam` | `pocket` | null), valorizzata dal catalogo (Eco, Duo Classic, Duo, Trio → `foam`; Pocket 1600 e 3000 → `pocket`). Esplicita al posto del dedurla da `match.tech`, perché è una decisione commerciale e non una descrizione tecnica. Null = escluso dalle offerte.

**`public.requests`**: nuove colonne `subtotal_cents int`, `discount_cents int not null default 0`, `offers jsonb not null default '[]'`. Le righe in `items` portano già `unit_cents` e guadagnano **`discount_cents`** e **`paid_cents`** per ciascun pezzo (o per riga con quantità, con la regola di ripartizione sui pezzi dichiarata).

**`public.audit_log`**: ogni modifica a `offers` e a `offers_enabled` viene registrata (esiste già).

### 6.3 Funzioni
- **`price_cart(items jsonb)`** — interna (nessun `grant` al pubblico): applica §3 e restituisce righe con sconto, offerte applicate, subtotale, totale. È pura (`stable`) e leggibile per i test.
- **`validate_cart(items)`** — estesa: usa `price_cart`; restituisce in più `subtotal_cents`, `discount_cents`, `offers`, `hints` e un nuovo stato di riga/avviso **`offer_changed`**. **Compatibile all'indietro**: `total_cents` resta il totale da pagare.
- **`create_cart_request(items)`** — accetta anche `seen_total_cents`: se il totale ricalcolato è diverso da quello che il cliente ha visto, **non crea la richiesta** e restituisce `ok: false, reason: 'offer_changed'` con il nuovo calcolo. È la stessa logica di `price_changed`, ma per le offerte. Il rate limit già progettato si applica senza modifiche.
- **`partial_refund(p_ref text, p_unit_ids …)`** — solo admin: restituisce l'importo da rimborsare dalle quote salvate e registra l'evento.

### 6.4 Struttura di `params` (contratto)
```json
{
  "letto-completo": {
    "pct": { "foam": 5, "pocket": 8 },
    "round_eur": 5
  },
  "letti-multipli": {
    "tiers": [ { "min_sets": 3, "pct": 10 }, { "min_sets": 5, "pct": 12 } ],
    "quote_from_sets": 10
  },
  "accessori": {
    "pct": { "topper": 10, "guanciale": 10 },
    "guanciali_per_letto": 2,
    "round_eur": 1
  },
  "per-due": { "pct": { "foam": 5, "pocket": 8 }, "round_eur": 5 },
  "cap_pct": 15
}
```
Validazione in scrittura (vincoli SQL e controllo in Admin): percentuali tra 0 e 30, scaglioni crescenti, `cap_pct` tra 0 e 30.

### 6.5 Codice
- `core/offers.ts` — funzione pura `priceCart(index, items, config)` con lo stesso algoritmo di `offers_reference.mjs` (che resta come specifica eseguibile).
- `core/whatsapp.ts` — `SummaryLine` guadagna lo sconto; `RequestSummary` guadagna `subtotal_cents`, `discount_cents`, `offers`.
- `core/cart.ts` — `validateCart` restituisce anche `discount_cents`, `offers`, `hints`.
- `preview/js/store.js` — `api.validateCart` e `createCartRequest` passano `seen_total_cents`; `remoteValidation` mappa i nuovi campi.
- `preview/js/app.js` — pannello nella scheda, carrello a gruppi, pagina Componi, ultimo passo del Sleep Match.
- `preview/js/admin.js` — pagina Offerte e strumento recesso parziale.
- Nuove pagine nel prerender e nella sitemap: `/componi-il-tuo-letto/`, `/offerte/`, `/offerte/singolo-completo/`, `/offerte/strutture/`.

### 6.6 Interruttore e modalità beta
| Ambiente | Comportamento |
| --- | --- |
| Preview/artifact | Offerte sempre attive, con etichetta «beta» visibile |
| Sito pubblico | Controllato da `offers_enabled` (spento al lancio) |
| Test su un solo visitatore | Parametro `?offerte=1` salva un'impostazione nel browser (solo per provare prima di accendere per tutti; il calcolo resta quello del database, quindi prezzi veri) |

L'accensione per tutti è una modifica in Admin, senza nuovo rilascio del sito.

---

## 7. Admin

**Pagina «Offerte»:**
- elenco delle regole con stato (attiva/in pausa), validità, percentuali modificabili con anteprima («5 % → su un Duo 160×190 + Flex: 25 €»);
- **simulatore**: si compone un carrello e si vedono sconto, ripartizione per pezzo, totale;
- **interruttore generale** con conferma;
- **avvisi automatici** prima di salvare: percentuale oltre il 12 %, scaglioni non crescenti, regola attiva senza prodotti idonei;
- storico delle modifiche (da `audit_log`).

**Nelle richieste:** colonna sconto, elenco delle offerte applicate, pulsante «Recesso parziale».

**Report minimo** (da `requests`, senza dati personali): richieste con almeno un letto completo / richieste con almeno un materasso, sconto medio per richiesta, valore medio carrello con e senza offerta, recessi parziali.

**Fase 2, facoltativa:** campo riservato «costo» per variante (tabella privata, come le note interne) per calcolare il margine reale del carrello scontato e bloccare le combinazioni sotto soglia. Richiede i costi dall'azienda.

---

## 8. Misure di successo e criteri di stop

Senza analytics (il consenso cookie non è ancora previsto) si misura dalle richieste:

| Indicatore | Come | Obiettivo beta (4 settimane o 30 richieste, vale il primo) |
| --- | --- | --- |
| Quota di richieste con letto completo | richieste con rete e materasso / richieste con materasso | da fissare con la quota attuale dell'azienda (domanda 1, §11) |
| Valore medio della richiesta | media di `total_cents` | non inferiore al valore senza offerta |
| Costo medio degli sconti | `discount_cents` / `subtotal_cents` delle richieste con offerta | **≤ 6 %** |
| Recessi parziali | eventi «Recesso parziale» / letti completi venduti | **≤ 10 %** |
| Richieste con avviso `offer_changed` | contatore | segnalare se sopra 5 % (indica configurazioni instabili) |

**Si spegne subito** (interruttore) se: lo sconto medio supera l'8 %; compare un totale scontato incoerente tra preview, riepilogo e messaggio WhatsApp; l'azienda lo chiede.

Le richieste diventano vendite solo quando l'azienda le conferma in Admin («Confermato su WhatsApp»): senza quel passaggio i numeri misurano interesse, non vendite. Va tenuto presente nella lettura.

---

## 9. Piano di lavoro per Opus

**Prerequisiti (non di codice)**
1. Applicare la migrazione anti-abuso (`…000008`).
2. Decidere sul listino le incoerenze già note: Pocket 1600 = Pocket 3000 a 90×200 H30 (310 €) e a 120×190 (390 €); due singoli 90×200 Duo (340) sotto il matrimoniale 180×200 (350). Un'offerta le amplifica.
3. Risposte dell'azienda alle domande del §11.

**Fasi**
| Fase | Contenuto | Consegna verificabile |
| --- | --- | --- |
| 1 — Nucleo | `core/offers.ts`, colonna `bundle_family`, test golden G1–G13, test di proprietà (§10) | Unitari verdi; i numeri coincidono con `offers_reference.mjs` |
| 2 — Database | Migrazione `…000009`, `price_cart`, `validate_cart`/`create_cart_request` estese, RLS, `partial_refund` | Test SQL su Postgres 16: golden + parità con il codice condiviso su carrelli casuali + `offer_changed` |
| 3 — Sito | Pannello scheda, carrello a gruppi, riepilogo e WhatsApp, Componi, Sleep Match, pagine di raccolta, prerender e sitemap | e2e nuovi (§10), verifica sul bundle e sul sito statico |
| 4 — Admin | Pagina Offerte, simulatore, recesso parziale, report | e2e Admin |
| 5 — Rilascio | Documenti (pending, changelog, `docs/OFFERTE.md`), testi legali, ripubblicazione artifact, interruttore spento di default | Elenco finale con **verificato / predisposto** |

**Regole di lavoro** (dal brief originale, valgono ancora): non toccare il sito attuale né il database di produzione; nessuna service role nel browser; non dichiarare completato ciò che non è stato verificato; distinguere sempre verificato e predisposto.

---

## 10. Test richiesti

**Unitari e SQL (stessi casi su entrambi)**
- Casi golden G1–G13 (§3.5).
- **Parità**: 500 carrelli casuali (modelli, misure, quantità, accessori) — codice condiviso e funzione SQL devono dare esattamente lo stesso totale, le stesse offerte e le stesse quote per pezzo.
- Proprietà: totale ≥ 0; sconto ≤ 15 % del listino; la somma delle quote per pezzo = sconto totale (centesimo per centesimo); `paid + discount = listino` per ogni pezzo; aggiungere un pezzo mai fa aumentare il totale dello sconto oltre il tetto; con offerte spente il totale è la somma dei listini.
- Offerta scaduta tra carrello e riepilogo → `offer_changed`, nessuna richiesta creata.
- `partial_refund`: restituire tutto = totale pagato; restituire una parte = somma delle quote pagate.
- Un utente anonimo non può scrivere in `offers`, né chiamare `price_cart` o `partial_refund`.

**End-to-end (preview e sito statico)**
- Scheda: il pannello compare solo se la rete della misura esiste; cambiando misura il prezzo si aggiorna.
- Carrello: un letto completo mostra la riga del vantaggio; togliere la rete la fa sparire con l'avviso.
- Messaggio WhatsApp contiene subtotale, vantaggio e totale; il messaggio breve resta sotto la soglia.
- Componi: non permette misure discordanti; il totale coincide con quello del carrello.
- Sleep Match: finisce con un letto completo acquistabile.
- Offerte spente: nessuna scritta sul vantaggio in nessuna pagina.
- Nessuno scroll orizzontale a 320, 375 e 430 px nelle pagine nuove; nessun errore JavaScript; nessuna scritta provvisoria.
- Le pagine nuove compaiono nella sitemap e superano i controlli SEO esistenti (titoli e descrizioni unici, canonical, H1).

---

## 11. Rischi e punti aperti

**Da chiedere all'azienda (un solo messaggio)**
1. Oggi, di tutti i materassi venduti, **quanti sono con rete**? (serve come riferimento per misurare l'effetto).
2. Ritiro dell'usato, montaggio della rete, consegna al piano: gratuiti o a pagamento? Solo a Napoli?
3. Conferma delle percentuali (5 % / 8 % / 10 % / 12 % / 10 % accessori) rispetto ai costi: sono una mia scelta prudente, non un calcolo sui margini.
4. Si accettano offerte per le strutture sopra i 10 letti solo su preventivo?
5. Offerte già in corso sul sito attuale: devono convivere?
6. Prezzi dei guanciali (sbloccano la regola dormiente).

**Rischi**
- **Prezzi di partenza incoerenti** amplificati dalle offerte (§9, prerequisito 2).
- **Prezzo «prima/dopo» e regole sulle riduzioni** (direttiva Omnibus, recepita in Italia nel 2023): il confronto è con la somma dei prezzi reali correnti, non con un prezzo precedente; da far verificare all'avvocato insieme ai testi.
- **Dati strutturati e prezzo scontato**: i dati per Google restano sui prezzi di listino; **non** si dichiarano offerte scontate nel markup finché non c'è un criterio condiviso con il legale.
- **Complessità percepita**: se il cliente non capisce da dove viene lo sconto, non compra. Per questo il vantaggio è uno solo e spiegato in una frase.
- **Il Trio non viene mai consigliato** dal Sleep Match: finché non si corregge, l'ultima schermata propone solo gli altri cinque.
- **Pocket 3000: numero di molle ancora da confermare**; le offerte non cambiano il nome del prodotto ma ne amplificano la visibilità.
- **Misurazione limitata** (§8): senza analytics si vede l'interesse, non la vendita.

---

## 12. Cosa è verificato e cosa è solo progettato

| | Stato |
| --- | --- |
| Le regole di calcolo e i numeri dei §3 e §1 | **Verificato** con l'implementazione di riferimento sui prezzi reali (casi G1–G13, ripartizione e rimborsi del §4) |
| Struttura dati, funzioni SQL, pagine, Admin | **Solo progettato** |
| Effetto sulle vendite | **Non misurabile oggi** |
| Legalità della clausola di recesso e della presentazione dei prezzi | **Da far rivedere a un avvocato** |
| Margini | **Sconosciuti**: le percentuali sono prudenti e modificabili |
