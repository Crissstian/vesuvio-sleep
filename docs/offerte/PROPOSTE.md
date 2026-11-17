# Vesuvio Sleep — proposte di bundle (17/11/2026)

Solo analisi. Tutti i prezzi sono quelli reali del listino confermato; le **percentuali di sconto sono segnaposto illustrativi**: non conosco i margini, quindi il livello di sconto lo decide l'azienda.

---

## 1. Da dove si parte (verificato nel codice)

| Cosa esiste | Cosa manca |
| --- | --- |
| Scheda prodotto con «Completa il letto»: propone rete, guanciale, topper **della stessa misura** | Nessun vantaggio di prezzo per chi li compra insieme |
| Nel carrello: se c'è un materasso senza rete, suggerisce «Una rete della stessa misura» | Nessun concetto di sconto, offerta o kit nel carrello |
| Regole di abbinamento (mai due materassi insieme) | Il database somma solo prezzi di riga: `validate_cart` non sa calcolare uno sconto |
| Riepilogo WhatsApp con le righe del carrello | Il riepilogo non può mostrare «risparmio» né righe di offerta |

Quindi oggi il sito **suggerisce** l'acquisto combinato ma non lo **premia**.

## 2. Che cosa dicono i prezzi (e perché condizionano i bundle)

Misura 160×190, altezza standard:

| Materasso | Prezzo | Con Rete Flex (180) | Con Rete Strong (200) |
| --- | --- | --- | --- |
| Eco H25 | 250 | 430 | 450 |
| Memory Duo Classic H25 | 260 | 440 | 460 |
| Memory Duo H25 | 280 | 460 | 480 |
| Memory Trio H27 | 400 | 580 | 600 |
| Pocket 1600 H25 | 500 | 680 | 700 |
| Pocket 3000 Elite H25 | 620 | 800 | 820 |

Quattro osservazioni che cambiano le scelte:

1. **Topper + Eco non è un bundle sensato.** Eco 250 + topper 200 = 450 €, cioè più del Trio (400) e molto più del Duo (280), che ha già il memory. Il topper si vende bene a chi **ha già un materasso**, non come abbinamento a un materasso nuovo.
2. **Il salto Duo → Trio è +120 € (280 → 400)**, poi Trio → Pocket 1600 +100. Un kit «upgrade» ha spazio proprio in quei salti.
3. **Due singoli costano meno di un matrimoniale**: 2 × 90×200 Duo H25 = 340 contro 180×200 = 350; 2 × 80×190 = 260 contro 160×190 = 280. Un bundle «coppia» sui singoli peggiorerebbe la differenza. Da decidere prima di costruirlo.
4. **Pocket 1600 e Pocket 3000 costano uguale a 90×200 H30 (310 €)**, e a 120×190 sono 390 su entrambi. Un kit che premia il Pocket 1600 con quelle misure spingerebbe verso il modello sbagliato: i prezzi vanno ripuliti prima.

Numero di combinazioni: 143 varianti di materasso × 2 reti = **286 abbinamenti** (senza contare altezze e topper). Costruire kit uno per uno è impraticabile: servono **regole**, non prodotti-kit.

---

## 3. Le proposte

### A. «Letto completo» — materasso + rete, stessa misura *(la base)*
Chi mette nel carrello un materasso e una rete della stessa misura ottiene il vantaggio. È il bundle più naturale (la rete serve quasi sempre) e il sito ha già i suggerimenti.

Tre modi di dare il vantaggio, da scegliere:

| Meccanica | Esempio Duo + Flex 160×190 (460 €) | Pro | Contro |
| --- | --- | --- | --- |
| Percentuale sul totale | −5 % = −23 €; −10 % = −46 € | Semplice da dire | Scala col prezzo: sui Pocket pesa molto |
| Sconto fisso in euro | «Risparmi 20 €» | Prevedibile, ancorato ai multipli di 10 già usati nel listino | Meno proporzionato |
| **Sconto solo sulla rete** | Flex −20 % = −36 € | Protegge il margine del materasso, messaggio chiaro («la rete costa meno se la prendi con il materasso») | Il risparmio sembra piccolo sui materassi cari |

*Consiglio:* sconto solo sulla rete, in euro arrotondati a 5 o 10. Si legge bene e non intacca il prezzo del materasso, che l'azienda ha appena confermato.

### B. «Letto singolo da 170 €» — kit d'ingresso
Eco H20 80×190 (90 €) + Rete Flex 80×190 (80 €) = **170 €**. In 90×200: Eco H25 140 + Flex 110 = **250 €**. Serve come richiamo: cameretta, studente, ospiti, seconda casa. Il «da 170 €» è un titolo di pagina e di annuncio. Va confrontato con quello che l'azienda già pubblica altrove.

### C. «Sali di gamma» — kit upgrade sui salti di prezzo
Nel carrello, sul materasso scelto: «Con +120 € passi dal Duo al Trio (27 cm, tre strati)». Non è uno sconto ma un'offerta di salto, utile perché il Trio non viene mai consigliato dal Sleep Match (vedi analisi precedente) e quel +120 è il punto debole del listino. Eventuale incentivo: rete scontata solo se si sale di gamma.

### D. «Rinnova» — topper + guanciale per chi ha già il materasso
Topper 160×190 = 200 €; guanciali **sospesi finché non hanno prezzi**. Rivolto a chi non cambia il materasso. È l'unico caso in cui il topper ha senso in kit.

### E. «Letto completo + servizi» — vantaggi non in denaro
Invece dello sconto, l'acquisto combinato include: ritiro del materasso usato, montaggio della rete, consegna al piano. Sono servizi che l'azienda già offre a Napoli (dal pending: «furgone, consegna al piano, ritiro usato, montaggio reti»). Non erode il margine sul prodotto e valorizza il fatto di avere un furgone proprio. **Serve sapere oggi quali di questi sono gratuiti e quali a pagamento**: la proposta ha senso solo se almeno uno non lo è.

### F. «Per due» — secondo materasso / singoli gemelli
Due materassi uguali nello stesso ordine: il secondo con un vantaggio. Casi: due singoli per letti separati, camera ospiti. Condizionato al punto 3 del §2 (matrimoniale vs due singoli).

### G. Camere multiple e strutture ricettive — scaglioni di quantità
3+, 5+, 10+ letti completi nello stesso ordine, con scaglioni decisi dall'azienda. Si collega al tipo di richiesta «strutture» già presente. Per i grandi volumi non si compra su carrello: serve un **preventivo PDF**.

### H. «Componi il tuo letto» — l'interfaccia che li tiene insieme
Non un kit, ma un percorso: si sceglie la **misura una volta sola**, poi materasso, rete, eventuale topper; il totale e il risparmio si aggiornano mentre si sceglie, e finisce in **una sola richiesta WhatsApp**. Risolve le 286 combinazioni senza creare 286 prodotti, e ripara l'errore più costoso nel letto: ordinare rete e materasso di misure diverse.

### I. Chiusura del Sleep Match con un set completo
Oggi il Sleep Match propone **un materasso**. Dovrebbe concludere con «il letto completo che ti consigliamo»: materasso + rete (+ topper o guanciali se pertinenti), con il vantaggio già applicato. È il punto in cui il cliente è più convinto.

### J. Stagionali *(rinviare)*
Black Friday è il 27/11/2026, troppo a ridosso per un sito che non ha ancora dominio, capitale sociale e revisione legale. Sensato per Natale/gennaio o per il cambio di stagione. Lista nozze/regalo: possibile in seguito, richiede una gestione a parte.

---

## 4. Quale ordine

| Priorità | Proposta | Perché |
| --- | --- | --- |
| 1 | **A** (con sconto solo sulla rete) + **H** | È il caso che copre la maggior parte degli acquisti e usa già i suggerimenti esistenti |
| 2 | **I** | Costa poco: il Sleep Match già calcola altezza e modello |
| 3 | **B** come richiamo di ingresso | Dà un prezzo «da» da pubblicare |
| 4 | **E** | Solo dopo aver chiarito quali servizi sono gratuiti |
| 5 | **C** | Dopo la correzione del Sleep Match |
| 6 | **D, F, G** | Dopo che i guanciali hanno prezzo (D) e che si decide la questione singoli/matrimoniale (F); G con il preventivo PDF |

---

## 5. Cosa significa costruirli (per più avanti, con il modello più adatto)

- **Il prezzo lo decide il database, non la pagina.** Lo sconto va calcolato dentro `validate_cart` e `create_cart_request`: il browser mostra, non decide. Altrimenti chiunque con la chiave pubblica potrebbe forzare un totale.
- **Regole, non prodotti.** Una tabella di offerte (tipo di sconto, categorie richieste, stessa misura sì/no, quantità minima, date di validità, attiva/sospesa) e un editor in Admin. Nessuno SKU-kit per ogni combinazione.
- **Lo sconto compare come riga separata** («Vantaggio letto completo −36 €»), non cambiando il prezzo delle righe. Così si tracciano, si spiegano nel riepilogo WhatsApp e si gestiscono i resi.
- **Una sola offerta per carrello** all'inizio, senza cumuli: evita combinazioni imprevedibili.
- **La richiesta salva l'offerta applicata** (regola e importo) accanto ai prezzi visti, per avere uno storico leggibile.
- **Test:** nessun totale scontato inferiore a zero; stesso risultato nel codice locale e nella funzione SQL; l'offerta sparisce se manca uno dei prodotti.

---

## 6. Vincoli e rischi

- **Prezzi e sconti (direttiva Omnibus, recepita in Italia nel 2023):** se un vantaggio è presentato come riduzione di un prezzo precedente, valgono regole sul prezzo di riferimento (di norma il più basso dei 30 giorni prima). Va verificato con l'avvocato insieme ai testi legali; non è un mio parere.
- **Recesso su un bundle:** se il cliente restituisce solo la rete, lo sconto va ricalcolato? Serve una regola scritta nelle condizioni di vendita (proposta: lo sconto decade se non si restituisce l'intero set, oppure si ricalcola in proporzione).
- **Misure speciali:** i kit valgono solo per misure standard; il fuori misura esce dal carrello (preventivo).
- **Non promettere omaggi senza valore dichiarato** e non inventare «prezzi di listino» più alti: il confronto è sempre con la somma dei prezzi reali.
- **Prima di tutto, ripulire il listino** (Pocket 1600/3000 a prezzo uguale in alcune misure, 120×190 identico, Eco→Duo→Trio): un bundle amplifica le incoerenze.

---

## 7. Domande all'azienda (un solo messaggio)

1. Margine indicativo su materasso, rete, topper: serve per scegliere dove mettere lo sconto.
2. Preferisce sconto in euro, in percentuale o servizi inclusi?
3. Ritiro usato, montaggio rete, consegna al piano: oggi sono gratuiti o a pagamento, a Napoli e fuori?
4. Chi compra solo una rete o solo un topper: nessun cambiamento? (sì, per ora)
5. Resi: se restituisce un solo pezzo, lo sconto decade o si ricalcola?
6. Strutture: ha scaglioni di quantità già in uso?
7. Prezzi dei guanciali (sospesi): senza, non esistono bundle con i guanciali.
8. Può convivere un'offerta con le promozioni già attive sul sito attuale?
