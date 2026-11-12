# VESUVIO SLEEP — WEBSITE MASTER SPEC v1.0

**Stato:** baseline operativa per ChatGPT Work  
**Data:** 17/09/2026  
**Regola:** questo documento è la fonte unica di verità per il sito finché non viene sostituito da una versione successiva.

## 0. Regole di utilizzo per Work

1. Non inventare dati marcati `PENDING`, `VERIFY` o `CONFLICT`.
2. Le modifiche devono essere implementate a blocchi indipendenti e salvate con checkpoint/commit.
3. Non rifattorizzare parti non richieste.
4. Prima di terminare ogni blocco: build/test, verifica mobile/desktop, salva le modifiche, aggiorna il changelog.
5. Se una sessione rischia di interrompersi, lascia il progetto in uno stato compilabile e funzionante.
6. I dati di questo Master Spec prevalgono su testi demo o placeholder già presenti nel sito.
7. Per prezzi e varianti, usare il file dati strutturato `Vesuvio_Sleep_Site_Data_v1.0.json`.
8. I campi non ancora confermati devono essere gestibili da admin e non pubblicati come fatti tecnici certi.

---

# 1. Identità del brand

**Brand pubblico:** VESUVIO SLEEP  
**Società legale:** MATERASSI D'AUTORE A.V. — SOCIETÀ A RESPONSABILITÀ LIMITATA SEMPLIFICATA  
**P.IVA / Codice fiscale:** 10456501211  
**REA:** NA-1107535  
**Sede legale e operativa:** Via Raffaele Salierno 38, 80026 Casoria (NA), Italia  
**Tipologia sede:** fabbrica + esposizione + showroom  
**Produzione:** dal 1986  
**Claim storico autorizzato:** “Produciamo materassi dal 1986” / “40 anni di esperienza”  
**Made in Italy:** autorizzato dal titolare per la comunicazione commerciale  
**Logo:** definitivo  
**Slogan:** “L’eruzione del sonno perfetto”  
**Dominio desiderato:** `vesuviosleep.it`  
**Dominio secondario consigliato:** `vesuviosleep.com` con redirect al `.it`, se disponibile  
**Telefono pubblico:** PENDING  
**Email contatti/ordini:** PENDING  
**PEC societaria:** presente nei documenti societari ma NON usare come email commerciale salvo futura decisione.

### Orari showroom
- Lunedì–Venerdì: 09:00–18:00
- Sabato: 10:00–14:00
- Domenica: chiuso

### Mappa
Inserire nella pagina Contatti una mappa con sede in Via Raffaele Salierno 38, Casoria, CTA “Indicazioni stradali”.

---

# 2. Posizionamento e tono

Vesuvio Sleep deve comunicare:

- produzione diretta di fabbrica;
- rapporto diretto fabbrica → cliente;
- prezzo di fabbrica;
- esperienza dal 1986;
- Made in Italy;
- semplicità nella scelta;
- qualità percepita premium senza tono “lusso irraggiungibile”;
- forte attenzione a comfort, traspirazione, sostegno e personalizzazione.

### Stile copy
Italiano chiaro, commerciale e moderno. Evitare gergo tecnico inutile. Quando si usa un termine tecnico, tradurlo subito nel vantaggio per il cliente.

### SEO nazionale
Target principale: **tutta Italia**, non soltanto Napoli/Campania.

Keyword da distribuire naturalmente, senza keyword stuffing:
- materassi Made in Italy
- materassi direttamente dalla fabbrica
- materassi memory foam
- materassi in poliuretano espanso
- materassi a molle insacchettate
- materasso matrimoniale
- materassi su misura
- materassi sfoderabili
- materassi traspiranti
- reti a doghe
- guanciali memory
- topper memory foam

---

# 3. UX e direzione visiva

## Principi
- mobile-first;
- sito dinamico e animato ma veloce;
- interazioni eleganti, non “effetti gratuiti”;
- CTA più distintive dei classici bottoni statici;
- hero ad alto impatto;
- barra superiore sottile e animata;
- navigazione semplice;
- schede prodotto pulite;
- niente feed Instagram/TikTok incorporato.

## Immagini prodotto
Preferire immagini **hero classiche, pulite e premium**, non camere da letto generiche:
1. prodotto in prospettiva 3/4;
2. vista esplosa;
3. dettaglio tessuto/fascia/strati;
4. eventuale micro-animazione degli strati.

Foto reali di fabbrica/showroom quando disponibili. Video di contesto possono essere prodotti anche con AI, ma non devono far credere falsamente che mostrino specifici processi/macchinari reali se generati.

---

# 4. Catalogo — nomi commerciali v1

I nomi seguenti sono la proposta commerciale da usare nel build; possono essere modificati in futuro da admin.

| Nome commerciale | Tipo tecnico | Stato |
|---|---|---|
| **Vesuvio Essential Foam** | Poliuretano espanso alta densità | APPROVED BUILD |
| **Vesuvio Memory Duo** | Memory Foam 2 strati | APPROVED BUILD |
| **Vesuvio Memory Air 3D** | Memory Foam 2 strati con fascia 3D | APPROVED BUILD |
| **Vesuvio Pocket 2400 Elite** | Molle insacchettate + Memory + poliuretano | APPROVED BUILD PARZIALE |
| **Vesuvio Pocket 1600** | Molle insacchettate | PENDING foto/prezzi/spec |
| **Vesuvio Bonnell Classic** | Molle Bonnell | PENDING foto/prezzi/spec |
| **Vesuvio Topper Memory Cloud 5** | Topper Memory H5 | APPROVED, prezzo PENDING |
| **Vesuvio Rete Flex** | Rete a doghe acciaio + legno | APPROVED BUILD |
| **Vesuvio Rete Strong** | Rete rinforzata acciaio + legno | APPROVED BUILD |
| **Vesuvio Piuma** | Guanciale piuma | APPROVED BUILD |
| **Vesuvio Memory Flakes** | Guanciale fiocco Memory | APPROVED BUILD |
| **Vesuvio Memory Classic** | Guanciale Memory classico | APPROVED BUILD |
| **Vesuvio Memory Cervical** | Guanciale cervicale Memory | APPROVED BUILD |
| **Vesuvio Castello Steel** | Letto a castello in acciaio | PENDING misure/prezzo |

---

# 5. Materassi — specifiche di prodotto

## 5.1 Vesuvio Essential Foam

**Tipologia:** materasso in poliuretano espanso ad alta densità, linea essenziale.  
**Altezze:** H20 / H25 / H30.  
**Sfoderabile:** NO.  
**Rigidità suggerita:** medio-rigida (internal score provvisorio 7/10).  
**Densità pubblica:** non mostrare valori numerici; usare “poliuretano ad alta densità / struttura ad alta portanza”.  
**Claim tessuto richiesti dal titolare:** antiacaro, ipoallergenico, Free Humidity.  
**Certificazioni:** nessuna da dichiarare.  
**Composizione copy:** anima monoblocco in poliuretano ad alta densità progettata per offrire sostegno uniforme, stabilità e durata.

**VERIFY PRE-LAUNCH:** le diciture antiacaro/ipoallergenico/Free Humidity devono corrispondere alle caratteristiche reali del rivestimento/etichetta.

## 5.2 Vesuvio Memory Duo

**Tipologia:** Memory Foam 2 strati.  
**Altezze:** H25 / H30.  
**Sfoderabile:** SÌ.  
**Reversibile:** SÌ — lato Memory/invernale + lato più fresco/estivo.  
**Rigidità suggerita:** medio-rigida, più accogliente dell’Essential (internal score provvisorio 8/10 come riferimento di mercato, da confermare sul prodotto reale).  
**Densità pubblica:** “Memory Foam premium ad alta densità” + “supporto in poliuretano ad alta densità”; niente valori numerici.
**Struttura proposta per copy/visual:** strato comfort Memory indicativamente ~5 cm + base portante in poliuretano ad alta densità dimensionata per l’altezza finale.  
**Non pubblicare cm dei singoli strati come dato tecnico finché non verificati in fabbrica.**

## 5.3 Vesuvio Memory Air 3D

**Tipologia:** Memory Foam 2 strati con fascia perimetrale 3D.  
**Altezze:** H25 / H30.  
**Sfoderabile:** SÌ.  
**Reversibile:** SÌ — lato invernale Memory / lato estivo.  
**Rigidità suggerita:** medio-rigida (internal score provvisorio 8/10).  
**Elementi marketing:** fascia perimetrale 3D traspirante, ventilazione laterale, gestione dell’umidità, rivestimento rimovibile.
**Struttura proposta:** Memory premium + poliuretano ad alta densità + fascia 3D.  
**VERIFY:** spessori interni esatti.

## 5.4 Vesuvio Pocket 2400 Elite

**Tipologia:** ibrido a molle insacchettate + Memory + poliuretano.  
**Numero molle:** 2400 riferito al matrimoniale di riferimento; sulle altre misure il molleggio è proporzionato alla superficie. Non pubblicare conteggi esatti per singola misura finché non verificati con la produzione.  
**Altezza con prezzo disponibile:** H25.  
**H30:** prezzo PENDING — variante non acquistabile finché non valorizzata.  
**Sfoderabile:** SÌ.  
**Rigidità suggerita:** sostenuta / medio-rigida (internal score provvisorio 8/10).  
**Target:** persone che cercano maggiore sostegno, coppie, corporature robuste, indipendenza di movimento.
**Struttura comunicabile:** molle indipendenti insacchettate + strato Memory di comfort + elementi in poliuretano ad alta densità per stabilizzazione/box.
**VERIFY:** spessori e struttura esatta prima di dichiarare valori numerici.

### Nota “Hybrid”
Nel sito usare “Hybrid” per i materassi che combinano **molle insacchettate + Memory Foam**.  
I modelli poliuretano + Memory restano classificati come materassi foam/multistrato, non Hybrid.

---

# 6. Rivestimenti e claim trasversali

Il titolare richiede per tutti i materassi le etichette:
- antiacaro;
- ipoallergenico;
- Free Humidity.

Tutti i materassi sono sfoderabili **tranne Vesuvio Essential Foam / solo poliuretano**.

Per il lavaggio delle fodere:
**non pubblicare una temperatura universale.** Mostrare “Lavaggio secondo indicazioni in etichetta”.

**No certificazioni** da dichiarare al momento.

---

# 7. Misure standard

Misure disponibili per i materassi e, dove applicabile, per le reti:
- 80×190
- 90×200
- 120×190
- 140×190
- 160×190
- 165×190
- 170×200
- 180×200

Sono disponibili anche **fuori misura** e **altezze personalizzate** tramite richiesta preventivo.

---

# 8. Prezzi materassi — fonte: listino caricato

Tutti i prezzi sono **IVA inclusa**.

> Regola build: usare questi prezzi come baseline del sito. Esiste una precedente indicazione “Memory Duo H25 matrimoniale €250 prezzo normale”, mentre il listino caricato riporta €220 per 160×190 H25. Per il build usare il listino più recente (€220) ma mantenere il prezzo facilmente modificabile da admin e segnare il conflitto nel checklist pre-lancio.

| Prodotto | H | 80×190 | 90×200 | 120×190 | 140×190 | 160×190 | 165×190 | 170×200 | 180×200 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Essential Foam | 20 | €90 | €100 | €130 | €150 | €170 | €180 | €230 | €260 |
| Essential Foam | 25 | €110 | €120 | €160 | €180 | €200 | €210 | €240 | €270 |
| Essential Foam | 30 | €140 | €160 | €190 | €220 | €220 | €220 | €250 | €280 |
| Memory Duo | 25 | €120 | €140 | €180 | €200 | €220 | €240 | €260 | €300 |
| Memory Duo | 30 | €140 | €160 | €200 | €220 | €240 | €260 | €280 | €320 |
| Memory Air 3D | 25 | €170 | €200 | €250 | €275 | €300 | €320 | €340 | €360 |
| Memory Air 3D | 30 | €200 | €220 | €300 | €350 | €370 | €390 | €410 | €450 |
| Pocket 2400 Elite | 25 | €220 | €240 | €320 | €340 | €370 | €380 | €420 | €450 |
| Pocket 2400 Elite | 30 | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |

---

# 9. Reti

## Vesuvio Rete Flex
**Composizione copy:** telaio in acciaio ad alta resistenza + doghe in legno, struttura pensata per distribuire il carico in modo uniforme.  
**Piedi:** inclusi.  
**Montaggio a Napoli:** disponibile.  
**Portata:** VERIFY prima di pubblicare un valore numerico; non copiare la portata di un concorrente come se fosse un dato del prodotto reale.

Prezzi:
- 80×190: €90
- 90×200: €110
- 120×190: €140
- 140×190: €160
- 160×190: €170
- 165×190: €180
- 170×200: €190
- 180×200: €210

## Vesuvio Rete Strong
**Composizione copy:** struttura rinforzata in acciaio + piano in legno/doghe ad alta stabilità, pensata per chi cerca un supporto più robusto.  
**Piedi:** inclusi.  
**Portata:** VERIFY.

Prezzi:
- 80×190: €110
- 90×200: €130
- 120×190: €160
- 140×190: €180
- 160×190: €200
- 165×190: €210
- 170×200: €230
- 180×200: €250

---

# 10. Guanciali

| Prodotto | Altezza | Prezzo | Misura |
|---|---:|---:|---|
| Vesuvio Piuma | 12 cm | €50 | PENDING |
| Vesuvio Memory Flakes | 12 cm | €35 | PENDING |
| Vesuvio Memory Classic | 15 cm | €40 | PENDING |
| Vesuvio Memory Cervical | 12 cm | €40 | PENDING |

**Cervicale:** Memory Foam.  
Non inventare misure non fornite.

---

# 11. Topper

**Nome:** Vesuvio Topper Memory Cloud 5  
**Altezza:** 5 cm  
**Materiale:** Memory Foam  
**Rivestimento:** sfoderabile  
**Misure:** tutte le misure standard  
**Prezzi:** PENDING

---

# 12. Letto a castello

**Nome proposto:** Vesuvio Castello Steel  
**Materiale:** acciaio  
**Versione 1:** struttura senza materassi  
**Versione 2:** struttura con materassi base in poliuretano H20  
**Misure:** PENDING  
**Prezzi:** PENDING  
**Materassi inclusi:** poliuretano H20

Non pubblicare la scheda acquistabile finché misura e prezzo non sono forniti.

---

# 13. SKU

Gli SKU vanno generati automaticamente con schema coerente.

### Materassi
`VS-[LINEA]-H[ALTEZZA]-[LARGHEZZA][LUNGHEZZA]`

Esempi:
- `VS-ESS-H20-80190`
- `VS-MD-H25-160190`
- `VS-MA3D-H30-180200`
- `VS-P2400-H25-160190`

### Reti
`VS-RETE-[LINEA]-[LARGHEZZA][LUNGHEZZA]`

### Guanciali
`VS-GUA-[LINEA]`

### Fuori misura
SKU generato dall’admin dopo accettazione preventivo:
`VS-CUSTOM-[YYYYMMDD]-[ID]`

---

# 14. Prezzi barrati e promozioni

Il sito può mostrare:
- prezzo di vendita;
- “prezzo di fabbrica” come posizionamento.

**Non usare come prezzo barrato un prezzo di un concorrente fingendo che sia il precedente prezzo Vesuvio Sleep.**

Quando si comunica una riduzione/promozione, il prezzo barrato deve essere gestito secondo le regole applicabili alle riduzioni di prezzo. Il sistema admin deve quindi tenere uno storico prezzi sufficiente per supportare comunicazioni promozionali corrette.

Bundle da predisporre:
- materasso + rete;
- materasso + guanciali;
- materasso + topper.

I guanciali **non sono sempre inclusi**.  
Codici sconto: disattivati al lancio, infrastruttura predisposta.

---

# 15. Disponibilità e produzione

- Produzione diretta.
- Tempo di produzione standard se necessario: **2 giorni**.
- La capacità non è un magazzino rigidamente limitato.
- Sul sito evitare quantità fittizie tipo “solo 3 rimasti”.
- Stati ammessi:
  - Disponibile
  - In produzione
  - Realizzato su ordinazione
- È possibile usare leve di urgenza solo se vere.

---

# 16. Spedizione e consegna

- Spedizione: **gratuita in tutta Italia**.
- Isole: **nessun supplemento**.
- Napoli: consegna tramite furgone aziendale.
- Resto d’Italia: corriere.
- Consegna al piano gratuita: **solo Napoli**.
- Ritiro vecchio materasso: **solo Napoli**.
- Montaggio reti: **disponibile a Napoli**.
- Tracking corriere: **automatico**.
- Tempi di produzione prima della spedizione: 2 giorni quando il prodotto deve essere realizzato.

---

# 17. Pagamenti

Al lancio:
- carte di credito/debito;
- Apple Pay;
- Google Pay;
- PayPal;
- Klarna per pagamento rateale.

Non al lancio:
- bonifico bancario: NO;
- contrassegno: DISATTIVATO, predisposto per attivazione futura.

Pagamento alla consegna, quando/ove disponibile in futuro: contanti.

**Stripe:** account non ancora creato.  
**PayPal Business:** account non ancora creato.

Work deve predisporre integrazioni/adapter ma non inserire credenziali o segreti nel codice.

---

# 18. Checkout e account

- Acquisto senza registrazione: SÌ.
- Area cliente “I miei ordini”: SÌ.
- Email obbligatoria: SÌ.
- Telefono obbligatorio: SÌ.
- Campo “Note per la consegna”: SÌ.
- Richiesta fattura al checkout: NO.
- Stati ordine con notifiche automatiche:
  1. ordine ricevuto;
  2. in preparazione;
  3. spedito;
  4. consegnato.

### Notifiche lato azienda
Architettura consigliata:
- dashboard admin = fonte principale;
- email = notifica immediata;
- WhatsApp Business = opzionale per alert futuri.

Email di destinazione: PENDING.

---

# 19. Fuori misura / personalizzazione

Flusso obbligatorio:

1. Cliente clicca “Fuori misura / Personalizza”.
2. Inserisce misura, altezza desiderata e note.
3. **Non viene effettuato alcun pagamento.**
4. La richiesta entra nella dashboard admin.
5. Admin verifica fattibilità e inserisce prezzo finale.
6. Sistema genera un link di checkout privato e univoco.
7. Il link viene inviato al cliente.
8. Solo a quel punto il cliente paga.
9. Ordine viene marcato come “personalizzato”.

Il sistema deve supportare sia misure fuori standard sia altezze personalizzate.

---

# 20. Sleep Match

Sleep Match deve proporre **un solo prodotto finale**, non tre alternative.

### Non chiedere budget.

### Domande previste
1. Dormi da solo o in coppia?
2. Posizione prevalente: fianco / schiena / pancia / mista.
3. Peso della persona.
4. Se in coppia: peso del partner.
5. Preferenza di sostegno: più accogliente / equilibrato / sostenuto.
6. Tendi a sentire caldo durante la notte?
7. Quanto ti muovi durante il sonno?
8. Se in coppia: quanto è importante ridurre la percezione dei movimenti del partner?
9. Preferenza tecnica, solo se l’utente la conosce: foam / memory / molle / non so.
10. Eventuali esigenze di praticità: sfoderabile, traspirazione, ecc.

### Logica di massima
- Peso/corporatura più alta → aumentare punteggio verso Pocket 2400 / futuri Pocket 1600.
- Coppia + alta sensibilità ai movimenti → molle indipendenti.
- Ricerca di accoglienza → Memory Duo / Memory Air 3D.
- Caldo notturno → favorire Memory Air 3D o soluzioni con maggiore ventilazione.
- Ricerca di semplicità e sostegno uniforme → Essential Foam.
- Nessun consiglio medico o terapeutico.

Risultato:
- foto prodotto;
- nome;
- 2–3 motivi sintetici;
- altezza consigliata;
- CTA “Configura il tuo materasso”.

---

# 21. B2B Hotel & B&B

Pagina dedicata:
**Hotel, B&B e strutture ricettive**

Niente listino pubblico B2B.

CTA primaria:
**“Richiedi preventivo”**

Form richiesto:
- struttura;
- referente;
- email;
- telefono;
- numero di camere/posti letto;
- misure richieste;
- quantità;
- note.

Messaggio commerciale:
produzione diretta, possibilità di grandi quantità, fuori misura, tempi concordati, rapporto diretto con la fabbrica.

---

# 22. Recensioni

- Recensioni Google: esistono su altro account; possibile integrazione futura.
- Recensioni Facebook: esistono ma NON integrare al lancio.
- Testimonial foto/video: PENDING.
- Non creare recensioni fittizie.
- Se non sono disponibili integrazioni verificate, mostrare la sezione recensioni solo quando i dati reali sono collegati.

---

# 23. Marketing e tracking

Da installare:
- Google Analytics 4;
- Google Search Console;
- Meta Pixel;
- TikTok Pixel;
- newsletter;
- recupero carrelli abbandonati.

**Importante:** gli strumenti non essenziali di marketing/analytics devono rispettare il consenso cookie applicabile.

Nessun feed social visibile sul sito.

Link social: PENDING.

---

# 24. Privacy e cookie

**Soluzione scelta:** iubenda.

Componenti:
- Privacy & Cookie Policy Generator;
- Privacy Controls and Cookie Solution / CMP;
- banner consenso;
- blocco preventivo dei tracker non essenziali fino al consenso;
- possibilità di rivedere le preferenze;
- policy accessibili dal footer;
- configurazione coerente con Analytics, Meta Pixel, TikTok Pixel, newsletter, carrelli abbandonati, pagamenti e form.

Il sito sarà completamente tradotto in italiano e inglese; predisporre anche le policy nelle lingue necessarie offerte dal servizio.

**Nota:** le policy generate automaticamente devono essere configurate con i servizi realmente presenti e sottoposte a controllo pre-lancio.

Riferimenti:
- Garante Privacy — linee guida cookie: https://www.garanteprivacy.it/temi/cookie
- iubenda — Privacy/Cookie e CMP: https://www.iubenda.com/

---

# 25. Resi e garanzia — bozza operativa

**Garanzia legale:** 2 anni per i consumatori, fatte salve le norme applicabili.

### Prodotti standard acquistati online
Prevedere diritto di recesso di 14 giorni secondo la normativa applicabile alle vendite a distanza.

Il cliente deve comunicare il recesso entro il termine e restituire il bene secondo le istruzioni pubblicate.

Per il recesso volontario:
- costo del reso a carico del cliente **se correttamente comunicato prima dell’acquisto**;
- per prodotti ingombranti, il sito/Termini deve fornire o rendere disponibile una stima ragionevole del costo di restituzione prima della conclusione del contratto;
- è possibile tenere conto della diminuzione di valore derivante da manipolazioni eccedenti quelle necessarie a verificare natura, caratteristiche e funzionamento.

### Prodotti personalizzati / fuori misura
Nessun diritto di recesso per semplice ripensamento quando il prodotto è realizzato secondo specifiche del cliente o chiaramente personalizzato, salvo diritti per difetti/non conformità.

### Prodotti difettosi/non conformi
Costi e rimedi seguono la garanzia legale applicabile; non trattarli come normali resi per ripensamento.

### Materassi aperti
Non impostare automaticamente “materasso aperto = non restituibile per igiene”. La giurisprudenza UE ha chiarito che la semplice rimozione della protezione di un materasso non basta, di per sé, a escludere il diritto di recesso.

**Da fare prima del lancio:** far rivedere Termini, Resi e configurazione e-commerce da un professionista legale/compliance.

Riferimenti UE:
- https://europa.eu/youreurope/business/selling-in-eu/consumer-contracts-guarantees/consumer-guarantees/index_it.htm
- https://curia.europa.eu/juris/liste.jsf?num=C-681%2F17

---

# 26. Lingue

Il sito deve essere **interamente disponibile in italiano e inglese**:
- navigazione;
- homepage;
- catalogo;
- schede prodotto;
- Sleep Match;
- checkout;
- area cliente;
- B2B;
- FAQ;
- footer;
- messaggi di sistema;
- email transazionali;
- pagine legali, dove disponibili.

Implementare i18n in modo strutturale, non duplicando pagine manualmente.

---

# 27. Admin panel

L’admin deve permettere almeno:

- CRUD prodotti;
- CRUD varianti;
- prezzi;
- prezzo precedente/promozionale con storico;
- immagini;
- disponibilità;
- altezze/misure;
- SKU;
- ordini;
- stati ordine;
- tracking;
- richieste fuori misura;
- generazione preventivo;
- generazione link checkout privato;
- bundle/offerte;
- attivazione/disattivazione contrassegno;
- contenuti IT/EN;
- newsletter base / esportazione contatti;
- recensioni/integrations status;
- campi PENDING aggiornabili senza toccare il codice.

---

# 28. Punti da NON bloccare

Work può procedere anche se mancano:
- telefono;
- email;
- misure/prezzo letto a castello;
- foto/prezzi 1600 molle;
- foto/prezzi Bonnell;
- prezzo topper;
- misure guanciali;
- social links;
- testimonial;
- credenziali Stripe/PayPal/Klarna;
- account Iubenda.

Gestione:
- campi null/PENDING in admin;
- non renderizzare informazioni incomplete;
- nessun placeholder visibile tipo “da definire”.

---

# 29. Checklist pre-lancio

## Bloccanti
- [ ] telefono pubblico
- [ ] email contatti/ordini
- [ ] dominio acquistato e DNS
- [ ] Stripe attivo
- [ ] PayPal Business attivo
- [ ] Klarna attivo
- [ ] Iubenda configurato
- [ ] Privacy/Cookie/Termini pubblicati
- [ ] indirizzo resi e procedura operativa
- [ ] verifica finale claim antiacaro/ipoallergenico/Free Humidity
- [ ] verifica Made in Italy su prodotti effettivamente venduti
- [ ] risoluzione conflitto prezzo Memory Duo H25 160×190 (€220 vs precedente €250)

## Catalogo
- [ ] foto 1600 molle
- [ ] foto Bonnell
- [ ] prezzi 1600 molle
- [ ] prezzi Bonnell
- [ ] prezzo Pocket 2400 H30
- [ ] prezzo topper
- [ ] misure guanciali
- [ ] misure e prezzi letto a castello
- [ ] portata reale reti

## Marketing
- [ ] link social
- [ ] Google review source
- [ ] Meta Pixel ID
- [ ] TikTok Pixel ID
- [ ] GA4 property
- [ ] Search Console
- [ ] newsletter sender/domain authentication

---

# 30. Piano di implementazione Work

## BLOCCO A — Catalogo
Prodotti, varianti, misure, altezze, prezzi, SKU, immagini, disponibilità, fuori misura entry point.

## BLOCCO B — Schede prodotto
Hero, viste esplose, caratteristiche, animazioni, comparazione, CTA.

## BLOCCO C — Homepage / UX
Hero, navigation, animazioni, categorie, social proof, factory story.

## BLOCCO D — Sleep Match
Questionario, scoring, risultato singolo.

## BLOCCO E — Checkout e pagamenti
Guest checkout, Stripe, wallets, PayPal, Klarna, shipping.

## BLOCCO F — Fuori misura
Richiesta → admin → preventivo → checkout privato.

## BLOCCO G — Area cliente + Admin
Ordini, tracking, prodotto, contenuti e prezzi.

## BLOCCO H — Marketing
GA4, Search Console, Pixel, newsletter, abandoned carts.

## BLOCCO I — Legale
Iubenda, cookie consent, resi, termini.

## BLOCCO L — Inglese
i18n completa e QA contenuti.

## BLOCCO M — QA finale
Performance, accessibility, SEO, mobile, checkout, tracking, regressioni.

---

# 31. Fonti usate per questa baseline

- Visura/esito Registro Imprese caricato dall’utente.
- Listino Vesuvio Sleep PDF caricato dall’utente.
- Listino Vesuvio Sleep XLSX caricato dall’utente.
- Decisioni fornite direttamente dal titolare nella conversazione del progetto.
- Ricerca esterna utilizzata solo per riferimenti provvisori su rigidità/composizioni di categoria e compliance; non sostituisce le specifiche reali dei prodotti Vesuvio Sleep.

### Riferimenti di mercato usati solo come ispirazione, non come specifiche Vesuvio Sleep
- Materassi Memory: esempi di prodotti 2 strati con Memory ~5 cm e supporto foam, rigidità medio-rigida.
- Pocket + Memory: esempi di molle indipendenti con box in foam e comfort layer in Memory.
- Nessuna certificazione, densità o portata di un concorrente deve essere attribuita automaticamente a Vesuvio Sleep.
