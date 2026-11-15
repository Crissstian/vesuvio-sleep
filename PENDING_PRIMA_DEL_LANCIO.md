# Pending prima del lancio — Vesuvio Sleep (concept)

Stato al 15/11/2026 (catalogo ufficiale applicato). Ogni voce indica se è **verificato**, solo **predisposto** oppure **mancante**.

## Bloccanti

| Voce | Stato | Cosa serve |
| --- | --- | --- |
| Numero WhatsApp per il checkout | **Mancante** | Confermare il numero aziendale con prefisso internazionale. Finché manca, il sito non mostra link WhatsApp e offre solo «Copia il riepilogo». Nella preview si imposta da Admin › Impostazioni o con `VS_CONFIG.whatsappNumber` (in produzione `NEXT_PUBLIC_…`/setting Supabase). |
| Telefono ed email pubblici | **Mancante** | Dataset: `phone` e `contact_email` null. Il sito non li mostra. |
| Claim antiacaro, ipoallergenico, Free Humidity | **Da verificare** | Mostrati nelle schede (spegnibili da Admin › Impostazioni). Vanno confrontati con l'etichetta reale del rivestimento. |
| Made in Italy | **Da verificare** | Autorizzato dal titolare; confermare sui prodotti effettivamente venduti. |
| Condizioni di spedizione | **Da riconfermare** | Mostrate: gratuita in Italia isole comprese; a Napoli furgone, consegna al piano, ritiro usato, montaggio reti; produzione circa 2 giorni. Riconfermare prima del lancio. |
| Privacy, cookie, termini, resi | **Mancante** | iubenda non configurato; testi legali da far rivedere. La mappa Google è disattivata nella preview e va caricata solo dopo il consenso. |
| Dominio e DNS | **Mancante** | La preview è `noindex` e non ha canonical verso `vesuviosleep.it`. |

## Catalogo

| Voce | Stato |
| --- | --- |
| Prezzi | **Verificati** contro il listino confermato del 15/11/2026: 130 varianti (91/26/13), controllate dai test e2e, SQL e unitari. |
| Foto prodotto | **Approvate dal manifest** per Essential Foam, Memory Duo, Pocket 2600 Elite (hero, esploso, dettaglio). **Mancanti** per Pocket 1600, Memory Foam 3 strati e Topper: mostrano un disegno senza strati. Non ho cercato foto su internet: dalla sessione la rete è bloccata e foto di terzi richiederebbero diritti e potrebbero non rappresentare il prodotto reale. Reti: foto generate del 13/11. |
| Etichette «illustrativo» | **Tolte dal sito pubblico** su richiesta. Le foto di fabbrica, showroom, camera, consegna e reti sono generate con AI: valutare se va dichiarato (pubblicità ingannevole) o sostituirle con foto reali prima del lancio. |
| Pocket 2600 Elite | Rinominato. Da confermare a quale misura si riferisce il numero di 2600 molle. Altezza H30 senza prezzo: non mostrata. |
| Pocket 1600, Memory Foam 3 strati | Pubblicati con il solo nome, la tipologia e l'altezza del listino. **Mancano** composizione, rigidità e foto. |
| Topper Memory Cloud 5 | Pubblicato, H5. SKU `VS-TOP-MC5-…` proposto, da confermare. |
| Sospesi (senza prezzo) | Memory Air 3D, Bonnell Classic, quattro guanciali, Castello Steel, Rete a tavole (non creata), H30 di Memory Duo / Pocket 2600 / Pocket 1600. Si pubblicano da Admin quando arriva il prezzo. |
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
- 95 controlli end-to-end sulla preview (`npm run test:e2e`): 130 varianti e 12 prezzi campione contro l'Excel, prodotti sospesi non pubblici, redirect 2400 → 2600, gallerie nell'ordine del manifest, nessuna scritta provvisoria su 12 pagine, varianti disponibili e non, foto da admin visibile dopo la pubblicazione, carrello persistente, WhatsApp con numero mancante e presente, messaggio breve per carrelli lunghi, nessun pagamento, accesso admin negato senza login, movimento ridotto, immagini mancanti, abbinamenti senza duplicati, nessuno scroll orizzontale a 320, 375 e 430 px.
- **Non verificato**: Safari iOS reale (safe area e barra inferiore), lettori di schermo reali, misure Lighthouse su rete reale. I font Manrope e Inter non si caricano nell'ambiente di test, quindi gli screenshot usano un font di sistema.
