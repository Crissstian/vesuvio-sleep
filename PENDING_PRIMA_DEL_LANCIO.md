# Pending prima del lancio — Vesuvio Sleep (concept)

Stato al 16/11/2026, sera (gamma rifatta su indicazione dell'azienda: 6 materassi, Pocket 1600 rientrato, Memory Air 3D e Bonnell fuori gamma). Ogni voce indica se è **verificato**, solo **predisposto** oppure **mancante**.

## Bloccanti

| Voce | Stato | Cosa serve |
| --- | --- | --- |
| Numero WhatsApp, telefono, email | **Inseriti** | +39 366 121 8346 (WhatsApp e telefono), fdimaterassi@gmail.com. Modificabili da Admin › Impostazioni. Un indirizzo email sul dominio (es. info@vesuviosleep.it) darebbe un'immagine più professionale. |
| Pagamenti | **Inseriti** | contrassegno o bonifico. **Da confermare**: eventuale costo aggiuntivo del contrassegno (il sito non ne indica); che con il bonifico la merce parta dopo il pagamento (così è scritto nelle condizioni). |
| Testi legali | **Scritti** | (condizioni di vendita, recesso con modulo, garanzia, privacy, cookie) sul Codice del Consumo e sul GDPR. **Da far rivedere a un avvocato** prima del lancio: non sono un parere legale. Scelta mia da confermare: richieste non concluse conservate 12 mesi. |
| Capitale sociale e PEC | **Mancanti** | per una S.R.L.S. il capitale sociale va indicato sul sito insieme a sede e REA (art. 2250 c.c.). Servono il capitale e, se vuoi mostrarla, la PEC. |
| Claim antiacaro, ipoallergenico, Free Humidity | **Da verificare** | Mostrati nelle schede (spegnibili da Admin › Impostazioni). Vanno confrontati con l'etichetta reale del rivestimento. |
| Made in Italy | **Da verificare** | Autorizzato dal titolare; confermare sui prodotti effettivamente venduti. |
| Condizioni di spedizione | **Da riconfermare** | Mostrate: gratuita in Italia isole comprese; a Napoli furgone, consegna al piano, ritiro usato, montaggio reti; produzione circa 2 giorni. Riconfermare prima del lancio. |
| Google Fonts | **Da sistemare al lancio** | I caratteri arrivano dai server di Google, che ricevono l'IP dei visitatori (dichiarato nella privacy). Meglio ospitarli sul sito: in questa sessione non si potevano scaricare. |
| Dominio, hosting e DNS | **Mancante** | Il sito pubblico è pronto in `dist/` (Netlify o Cloudflare Pages): serve collegare `vesuviosleep.it`, poi inviare la sitemap a Search Console e creare la scheda Google Business. |

## Catalogo

| Voce | Stato |
| --- | --- |
| Prezzi | **Verificati** contro il listino confermato del 15/11/2026 per Eco, Memory Duo, Memory Trio, reti e topper. **Ricostruiti** il 16/11/2026 per Pocket 3000 (ancora 160×190 = 620 €, fattore 1,1273) e Pocket 1600 (160×190 = 500 €, fattore 1,1111), arrotondati a 10 €. **Indicati dall'azienda** per il Memory Duo Classic (Duo meno 20 € a misura). In tutto 143 varianti (104/26/13), controllate dai test e2e, SQL e unitari. |
| **Scale dei prezzi ricostruite** | **Da confermare dall'azienda misura per misura**: ho mantenuto le proporzioni del listino, non sono prezzi dettati. Due punti da guardare: il 120×190 viene 390 € sia sul Pocket 1600 sia sul Pocket 3000, e il Memory Duo Classic a 160×200 viene 280 € come l'Eco H25. |
| Foto prodotto | **Approvate dal manifest** per Eco, Memory Duo, Pocket 3000 Elite (hero, esploso, dettaglio; le foto del Pocket sono quelle scattate il 15/11 con il nome precedente). **Mancanti** per Memory Trio, Memory Duo Classic, Pocket 1600 e Topper: la scheda mostra il disegno del modello e un segnaposto dichiarato «Foto in arrivo» per ogni inquadratura prevista. Non ho cercato foto su internet: dalla sessione la rete è bloccata e foto di terzi richiederebbero diritti e potrebbero non rappresentare il prodotto reale. Reti: foto generate del 13/11. |
| Etichette «illustrativo» | **Tolte dal sito pubblico** su richiesta. Le foto di fabbrica, showroom, camera, consegna e reti sono generate con AI: valutare se va dichiarato (pubblicità ingannevole) o sostituirle con foto reali prima del lancio. |
| **Pocket 3000 Elite** | Rinominato il 16/11/2026 (era Pocket 2600, prima ancora 2400). **Da confermare prima del lancio**: che le molle siano davvero 3000 e a quale misura si riferisce il numero, perché compare nel nome, nel titolo della pagina, nei dati strutturati e nel confronto. Le foto sono quelle del materasso fotografato il 15/11. Altezza H30 senza prezzo: non mostrata. |
| Memory Duo Classic | **Pubblicato** il 16/11/2026 con i prezzi indicati dall'azienda (Duo meno 20 €). Da confermare se è reversibile estate/inverno come lo sfoderabile e quali claim valgono per il suo tessuto: per ora non ne pubblica nessuno. Nessuna foto propria. |
| **Memory Trio** | Rinominato il 16/11/2026 da «Memory Foam 3 strati» (nome di listino). **Mancano** la composizione di dettaglio dei tre strati, se è sfoderabile, la rigidità e le foto, annunciate dall'azienda. Il vecchio indirizzo reindirizza al nuovo. |
| Pocket 1600 | **Rientrato in catalogo** il 16/11/2026 con i prezzi ricostruiti. **Mancano** la composizione di dettaglio, la conferma del numero di molle e le foto, annunciate dall'azienda. |
| **Eco** | Rinominato il 16/11/2026 da «Vesuvio Essential Foam». Il nome «Eco» è una denominazione commerciale: sul sito non è accompagnato da nessuna dichiarazione ambientale, perché non ne abbiamo di documentate. **Da valutare con l'azienda** se il nome regge senza una certificazione alle spalle. Il vecchio indirizzo reindirizza al nuovo. |
| Fuori gamma dal 16/11/2026 | Memory Air 3D e Bonnell Classic: archiviati, non compaiono sul sito, si ripubblicano da Admin. |
| Topper Memory Cloud 5 | Pubblicato, H5. SKU `VS-TOP-MC5-…` proposto, da confermare. |
| Sospesi (senza prezzo) | Quattro guanciali, Castello Steel, Rete a tavole (non creata), H30 di Memory Duo / Pocket 3000 / Pocket 1600. Si pubblicano da Admin quando arriva il prezzo. |
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
| Supabase | Migrazioni, RLS, storage e funzioni **verificate su Postgres 16 locale** con stub di `auth`/`storage` (46 controlli, incluso lo script di aggiornamento del catalogo eseguito due volte). **Non distribuite** su un progetto Supabase reale. |
| Stripe, PayPal Business, Klarna | **Predisposti e disattivati** (`core/payments.ts`). Nessun account, nessuna chiave, nessuna sessione. Requisiti elencati in Admin › Impostazioni. |
| Rate limiting delle funzioni pubbliche | **Mancante**: `create_cart_request` / `create_quote_request` vanno protette (edge function con limite per IP o captcha) prima del lancio. |
| GA4, Search Console, Meta/TikTok Pixel, newsletter, carrelli abbandonati | **Non installati**, come previsto: dipendono dal consenso cookie. |
| Versione inglese | **Non realizzata**: il prompt nuovo chiede italiano; il Master Spec chiede IT/EN. Da decidere. |
| Recensioni | **Non mostrate**: nessuna fonte verificata collegata. |
| Link social | **Mancanti**. |

## Cosa è verificato

- Build TypeScript di `core/` senza errori; 10 test unitari (`npm run test:unit`).
- 46 controlli SQL (130 varianti con prezzo, un solo Pocket, nessuno SKU 2400, una copertina per prodotto, nessuna immagine Grafeno, redirect leggibile dal pubblico): seed idempotente, RLS per pubblico/utente/admin, storage, funzioni, storico prezzi, eliminazione solo di bozze non collegate (`npm run test:sql`).
- 134 controlli end-to-end sulla preview (`npm run test:e2e`): 143 varianti e 15 prezzi campione contro il listino, prodotti sospesi non pubblici, redirect 2400 e 2600 → 3000, gallerie nell'ordine del manifest, nessuna scritta provvisoria su 12 pagine, varianti disponibili e non, foto da admin visibile dopo la pubblicazione, carrello persistente, WhatsApp con numero mancante e presente, messaggio breve per carrelli lunghi, nessun pagamento, accesso admin negato senza login, movimento ridotto, immagini mancanti, abbinamenti senza duplicati, nessuno scroll orizzontale a 320, 375 e 430 px.
- **Non verificato**: Safari iOS reale (safe area e barra inferiore), lettori di schermo reali, misure Lighthouse su rete reale. I font Manrope e Inter non si caricano nell'ambiente di test, quindi gli screenshot usano un font di sistema.
