# Pending prima del lancio — Vesuvio Sleep (concept)

Stato al 12/11/2026. Ogni voce indica se è **verificato**, solo **predisposto** oppure **mancante**.

## Bloccanti

| Voce | Stato | Cosa serve |
| --- | --- | --- |
| Numero WhatsApp per il checkout | **Mancante** | Confermare il numero aziendale con prefisso internazionale. Finché manca, il sito non mostra link WhatsApp e offre solo «Copia il riepilogo». Nella preview si imposta da Admin › Impostazioni o con `VS_CONFIG.whatsappNumber` (in produzione `NEXT_PUBLIC_…`/setting Supabase). |
| Telefono ed email pubblici | **Mancante** | Dataset: `phone` e `contact_email` null. Il sito non li mostra. |
| Conflitto prezzo Memory Duo H25 160×190 | **Da decidere** | Usato €220 (listino più recente) invece di €250. Segnalato nell'admin. |
| Claim antiacaro, ipoallergenico, Free Humidity | **Da verificare** | Mostrati nelle schede (spegnibili da Admin › Impostazioni). Vanno confrontati con l'etichetta reale del rivestimento. |
| Made in Italy | **Da verificare** | Autorizzato dal titolare; confermare sui prodotti effettivamente venduti. |
| Condizioni di spedizione | **Da riconfermare** | Mostrate: gratuita in Italia isole comprese; a Napoli furgone, consegna al piano, ritiro usato, montaggio reti; produzione circa 2 giorni. Riconfermare prima del lancio. |
| Privacy, cookie, termini, resi | **Mancante** | iubenda non configurato; testi legali da far rivedere. La mappa Google è disattivata nella preview e va caricata solo dopo il consenso. |
| Dominio e DNS | **Mancante** | La preview è `noindex` e non ha canonical verso `vesuviosleep.it`. |

## Catalogo

| Voce | Stato |
| --- | --- |
| Foto definitive per prodotto | **Mancanti** per 9 prodotti pubblicati su 10. Solo il Pocket 2400 Elite ha immagini (render illustrativi, etichettati). Gli altri usano un'illustrazione sobria di categoria, sostituibile da admin senza toccare il codice. |
| Render «da assegnare» e foto di riferimento | **Non pubblicati**: serve indicare modello/SKU e autorizzazione per ciascuno. |
| Foto reale di fabbrica/showroom | **Mancante**: la scena «lavorazione» è generata ed è indicata come illustrativa. |
| Foto di Napoli per l'apertura | **Mancante**: ora c'è un panorama illustrato con l'etichetta «Illustrazione provvisoria». Serve una foto con diritti d'uso; si carica da Admin › Immagini del sito (spazio «Apertura: Napoli»). |
| Foto reali di fabbrica (cucito, taglio, materiali) e showroom | **Mancanti**: al loro posto ci sono segnaposto «Foto in arrivo». |
| Render dell'ombra del Vesuvio | Usata `hero-alternativa` (alternativa hero prevista dalla mappa asset), etichettata «Ambientazione illustrativa». Il materasso nella foto non è associato a nessun modello. Confermare i diritti d'uso. |
| Illustrazioni schematiche a strati | Generate dalla composizione pubblica del dataset, etichettate «non in scala». Da sostituire con le foto approvate dall'admin. |
| Pocket 2400 Elite H30 | Prezzi **mancanti**: variante visibile ma disabilitata. |
| Topper Memory Cloud 5 | Prezzi **mancanti**: in bozza, categoria nascosta dal menu. SKU `VS-TOP-MC5-…` è una proposta da confermare. |
| Pocket 1600, Bonnell Classic | Foto, prezzi e specifiche **mancanti**: in bozza. |
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
| Supabase | Migrazioni, RLS, storage e funzioni **verificate su Postgres 16 locale** con stub di `auth`/`storage` (39 controlli). **Non distribuite** su un progetto Supabase reale. |
| Stripe, PayPal Business, Klarna | **Predisposti e disattivati** (`core/payments.ts`). Nessun account, nessuna chiave, nessuna sessione. Requisiti elencati in Admin › Impostazioni. |
| Rate limiting delle funzioni pubbliche | **Mancante**: `create_cart_request` / `create_quote_request` vanno protette (edge function con limite per IP o captcha) prima del lancio. |
| GA4, Search Console, Meta/TikTok Pixel, newsletter, carrelli abbandonati | **Non installati**, come previsto: dipendono dal consenso cookie. |
| Versione inglese | **Non realizzata**: il prompt nuovo chiede italiano; il Master Spec chiede IT/EN. Da decidere. |
| Recensioni | **Non mostrate**: nessuna fonte verificata collegata. |
| Link social | **Mancanti**. |

## Cosa è verificato

- Build TypeScript di `core/` senza errori; 8 test unitari (`npm run test:unit`).
- 39 controlli SQL: seed idempotente, RLS per pubblico/utente/admin, storage, funzioni, storico prezzi, eliminazione solo di bozze non collegate (`npm run test:sql`).
- 68 controlli end-to-end sulla preview (`npm run test:e2e`): varianti disponibili e non, foto da admin visibile dopo la pubblicazione, carrello persistente, WhatsApp con numero mancante e presente, messaggio breve per carrelli lunghi, nessun pagamento, accesso admin negato senza login, movimento ridotto, immagini mancanti, abbinamenti senza duplicati, nessuno scroll orizzontale a 320, 375 e 430 px.
- **Non verificato**: Safari iOS reale (safe area e barra inferiore), lettori di schermo reali, misure Lighthouse su rete reale. I font Manrope e Inter non si caricano nell'ambiente di test, quindi gli screenshot usano un font di sistema.
