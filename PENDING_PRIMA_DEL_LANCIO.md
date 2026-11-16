# Pending prima del lancio — Vesuvio Sleep (concept)

Stato al 16/11/2026, sera (secondo audit in `AUDIT_2026-11-16.md`) (gamma di 6 materassi; listino rimandato indietro dall'azienda con i prezzi H30 e la conferma delle scale ricostruite). Ogni voce indica se è **verificato**, solo **predisposto** oppure **mancante**.

## Bloccanti

| Voce | Stato | Cosa serve |
| --- | --- | --- |
| Numero WhatsApp, telefono, email | **Inseriti** | +39 366 121 8346 (WhatsApp e telefono), fdimaterassi@gmail.com. Modificabili da Admin › Impostazioni. Un indirizzo email sul dominio (es. info@vesuviosleep.it) darebbe un'immagine più professionale. |
| Pagamenti | **Inseriti e confermati** | contrassegno o bonifico. **Confermato il 16/11/2026**: il contrassegno non ha sovrapprezzo, come già scritto sul sito. Resta da confermare che con il bonifico la merce parta dopo il pagamento (così è nelle condizioni). |
| Testi legali | **Scritti** | (condizioni di vendita, recesso con modulo, garanzia, privacy, cookie) sul Codice del Consumo e sul GDPR. **Da far rivedere a un avvocato** prima del lancio: non sono un parere legale. Scelta mia da confermare: richieste non concluse conservate 12 mesi. |
| Capitale sociale e PEC | **Mancanti** | per una S.R.L.S. il capitale sociale va indicato sul sito insieme a sede e REA (art. 2250 c.c.). Servono il capitale e, se vuoi mostrarla, la PEC. |
| Claim antiacaro, ipoallergenico, Free Humidity | **Confermati dall'azienda** | Restano come sono, su decisione del 16/11/2026. Si spengono da Admin › Impostazioni se l'etichetta del rivestimento dovesse smentirli. |
| Made in Italy | **Da verificare** | Autorizzato dal titolare; confermare sui prodotti effettivamente venduti. |
| Condizioni di spedizione | **Da riconfermare** | Mostrate: gratuita in Italia isole comprese; a Napoli furgone, consegna al piano, ritiro usato, montaggio reti; produzione circa 2 giorni. Riconfermare prima del lancio. |
| Google Fonts | **Da sistemare al lancio** | I caratteri arrivano dai server di Google, che ricevono l'IP dei visitatori (dichiarato nella privacy). Meglio ospitarli sul sito: in questa sessione non si potevano scaricare. |
| Repository GitHub pubblico | **Da chiudere subito** | `Crissstian/vesuvio-sleep` è pubblico e contiene il listino prezzi e i documenti aziendali. Va reso privato dalle impostazioni del repo. |
| Dominio, hosting e DNS | **Mancante** | Il sito pubblico è pronto in `dist/`, con la configurazione per **tutti e tre** gli hosting: `_redirects` e `_headers` per Netlify e Cloudflare Pages, `vercel.json` per Vercel. Serve collegare `vesuviosleep.it`, poi inviare la sitemap a Search Console e creare la scheda Google Business. |

## Catalogo

| Voce | Stato |
| --- | --- |
| Prezzi | **Tutti confermati dall'azienda**: il listino è stato rimandato indietro la sera del 16/11/2026 con le scale ricostruite lasciate invariate (quindi approvate) e le tre altezze H30 compilate. In tutto 182 varianti (143 materassi, 26 reti, 13 topper), controllate dai test e2e, SQL e unitari. |
| **Due prezzi corretti da noi** | Segnalati all'azienda e corretti su sua autorizzazione il 16/11/2026: Memory Duo H30 160×190 da 329 a **330 €**, Pocket 1600 H30 160×190 da 540 a **520 €**. **Da far ricontrollare al prossimo listino**: sono gli unici due valori del catalogo che non arrivano così come sono dall'azienda. |
| Foto prodotto | **Presenti per tutte le schede pubblicate**: Eco, Memory Duo e Pocket 3000 Elite dal manifest del 15/11 (quelle del Pocket sono state scattate con il nome precedente), Memory Trio, Memory Duo Classic, Pocket 1600 e Topper consegnate la sera del 16/11. **Da confermare i tessuti**: le foto portano le scritte «Grafeno», «Bamboo», «Antibatterico» e «Aloe Vera», che il sito non riprende perché non sono caratteristiche verificate. Nessun segnaposto resta visibile: la scheda mostra il disegno del modello e un segnaposto dichiarato «Foto in arrivo» per ogni inquadratura prevista. Non ho cercato foto su internet: dalla sessione la rete è bloccata e foto di terzi richiederebbero diritti e potrebbero non rappresentare il prodotto reale. Reti: foto generate del 13/11. |
| Foto generate con AI | **Decisione dell'azienda del 16/11/2026: restano senza alcuna dichiarazione.** Riguarda fabbrica, showroom, camera, consegna e le due reti. Segnalato che rappresentare come reali ambienti e prodotti che non lo sono espone a una contestazione per pratica commerciale ingannevole: la scelta è dell'azienda, la segnalazione resta agli atti. |
| **Pocket 3000 Elite** | Rinominato il 16/11/2026 (era Pocket 2600, prima ancora 2400). **Da confermare prima del lancio**: che le molle siano davvero 3000 e a quale misura si riferisce il numero, perché compare nel nome, nel titolo della pagina, nei dati strutturati e nel confronto. Le foto sono quelle del materasso fotografato il 15/11. |
| Memory Duo Classic | **Pubblicato** il 16/11/2026 con i prezzi indicati dall'azienda (Duo meno 20 €). **Foto ricevute** la sera del 16/11. **Da confermare**: sul tessuto c'è la scritta «Bamboo», che la scheda non riprende perché non è una caratteristica verificata; se è reversibile estate/inverno come lo sfoderabile; quali claim valgono per questo tessuto. Il rivestimento delle foto è visibilmente diverso da quello del Memory Duo: il testo della scheda lo dice. |
| **Memory Trio** | Rinominato il 16/11/2026 da «Memory Foam 3 strati» (nome di listino). **Foto ricevute** la sera del 16/11 (prospettiva, esploso, dettaglio). **Mancano** la composizione di dettaglio dei tre strati, se è sfoderabile e la rigidità. **Da confermare**: sul tessuto delle foto c'è la scritta «Grafeno», ripetuta sul piano; l'immagine era marcata «non associare ad alcun prodotto» nel manifest del 15/11, con riserva «fino a istruzioni successive», ed è stata assegnata a questo modello dall'azienda. La scheda non riprende la scritta: il grafene non è una caratteristica verificata. Il vecchio indirizzo reindirizza al nuovo. |
| Pocket 1600 | **Rientrato in catalogo** il 16/11/2026, H25 e H30 a listino. **Mancano** la composizione di dettaglio, la conferma del numero di molle e le foto, annunciate dall'azienda. |
| **Eco** | Rinominato il 16/11/2026 da «Vesuvio Essential Foam», **nome confermato dall'azienda** la sera del 16/11. Sul sito non è accompagnato da nessuna dichiarazione ambientale, perché non ne abbiamo di documentate: così resta una denominazione commerciale e non un claim. Il vecchio indirizzo reindirizza al nuovo. |
| Fuori gamma dal 16/11/2026 | Memory Air 3D e Bonnell Classic: archiviati, non compaiono sul sito, si ripubblicano da Admin. |
| Topper Memory Cloud 5 | Pubblicato, H5. SKU `VS-TOP-MC5-…` proposto, da confermare. |
| Sospesi (senza prezzo) | Quattro guanciali, Castello Steel, Rete a tavole (non creata). Si pubblicano da Admin quando arriva il prezzo. |
| Render «da assegnare» e foto di riferimento | **Non pubblicati**: serve indicare modello/SKU e autorizzazione per ciascuno. |
| Foto reale di fabbrica/showroom | **Mancante**: la scena «lavorazione» è generata ed è indicata come illustrativa. |
| Foto di Napoli per l'apertura | **Mancante**: l'apertura usa le foto generate (camera, consegna, fabbrica). Una foto reale con diritti d'uso si carica da Admin › Immagini del sito (spazio «Apertura: Napoli»). |
| Foto reali di fabbrica (cucito, taglio, materiali) e showroom | Al loro posto immagini generate con AI ed etichettate «illustrativa». Da sostituire con foto reali di Casoria. La nota di controllo segnala `guanciali-gruppo`, `fabbrica-materiali` e `camera-ambientata` come non pienamente aderenti al brief. |
| Render dell'ombra del Vesuvio | Usata `hero-alternativa` (alternativa hero prevista dalla mappa asset), etichettata «Ambientazione illustrativa». Il materasso nella foto non è associato a nessun modello. Confermare i diritti d'uso. |
| Illustrazioni schematiche a strati | Generate dalla composizione pubblica del dataset, etichettate «non in scala». Da sostituire con le foto approvate dall'admin. |
| Letto a castello Castello Steel | Misure e prezzi **mancanti**: in bozza, categoria in bozza. |
| Misure dei guanciali | **Mancanti**: non mostrate. |
| Portata delle reti | **Mancante**: non mostrata. |
| Rigidità indicativa | Valori del dataset marcati come ricerca provvisoria: mostrati come «indicativa», da verificare sul prodotto. Il punteggio interno non è mai pubblico. |
| Stato di disponibilità | Tutte le varianti con prezzo partono da «Realizzato su ordinazione». Confermare per reti e guanciali. |
| Spessori dei singoli strati | Non pubblicati (VERIFY). |

## Integrazioni

| Voce | Stato |
| --- | --- |
| Next.js App Router | **Non realizzato in questa sessione** (installazione pacchetti npm bloccata). La logica in `core/` è già TypeScript e va importata così com'è. Piano in `docs/ARCHITETTURA.md`. |
| Supabase | Migrazioni, RLS, storage e funzioni **verificate su Postgres 16 locale** e **applicate al progetto reale** «Vesuvio Sleep – nuovo sito», separato da quello di produzione: 182 varianti acquistabili, 9 prodotti pubblici. **Primo admin creato** il 16/11/2026 (`docs/PRIMO_ADMIN.md`): l'utente esiste ed è promosso, la password la imposta il titolare dell'indirizzo con «Password dimenticata». **Manca** il collegamento del sito al database — oggi il catalogo è letto dal codice, non da Supabase, quindi l'Admin non modifica ancora il sito vero. Le foto non sono caricate nel bucket `product-media`. |
| Stripe, PayPal Business, Klarna | **Predisposti e disattivati** (`core/payments.ts`). Nessun account, nessuna chiave, nessuna sessione. Requisiti elencati in Admin › Impostazioni. |
| Rate limiting delle funzioni pubbliche | **Mancante, bloccante**: `create_cart_request` / `create_quote_request` vanno protette (edge function con limite per IP o captcha) prima del lancio. |
| GA4, Search Console, Meta/TikTok Pixel, newsletter, carrelli abbandonati | **Non installati**, come previsto: dipendono dal consenso cookie. |
| Versione inglese | **Non realizzata**: il prompt nuovo chiede italiano; il Master Spec chiede IT/EN. Da decidere. |
| Recensioni | **Non mostrate**: nessuna fonte verificata collegata. |
| Link social | **Mancanti**. |

## Cosa è verificato

- Build TypeScript di `core/` senza errori; 12 test unitari (`npm run test:unit`).
- Controlli SQL (182 varianti con prezzo, nessun prezzo non multiplo di 10 €, un solo Pocket, nessuno SKU dei nomi precedenti, una copertina per prodotto, nessuna immagine Grafeno, redirect leggibile dal pubblico): seed idempotente, RLS per pubblico/utente/admin, storage, funzioni, storico prezzi, eliminazione solo di bozze non collegate (`npm run test:sql`).
- 145 controlli end-to-end sulla preview (`npm run test:e2e`): 182 varianti e 18 prezzi campione contro il listino, prodotti sospesi non pubblici, redirect 2400 e 2600 → 3000, gallerie nell'ordine del manifest, nessuna scritta provvisoria su 12 pagine, varianti disponibili e non, foto da admin visibile dopo la pubblicazione, carrello persistente, WhatsApp con numero mancante e presente, messaggio breve per carrelli lunghi, nessun pagamento, accesso admin negato senza login, movimento ridotto, immagini mancanti, abbinamenti senza duplicati, nessuno scroll orizzontale a 320, 375 e 430 px.
- **Non verificato**: Safari iOS reale (safe area e barra inferiore), lettori di schermo reali, misure Lighthouse su rete reale. I font Manrope e Inter non si caricano nell'ambiente di test, quindi gli screenshot usano un font di sistema.
