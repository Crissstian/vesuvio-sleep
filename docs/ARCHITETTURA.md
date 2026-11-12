# Architettura e passaggio a Next.js + Supabase

La preview statica e l'app finale condividono la stessa logica (`core/`) e lo stesso modello dati (`supabase/migrations`). Cambia solo dove vivono i dati.

| Preview (`preview/js/store.js`) | Produzione |
| --- | --- |
| `catalog()` legge localStorage | Server Components: `select` sulle tabelle con RLS (il pubblico vede solo il pubblicato) |
| `api.validateCart` | `rpc('validate_cart')` da Route Handler `POST /api/cart/validate` |
| `api.createCartRequest` | `rpc('create_cart_request')` |
| `api.markWaiting` | `rpc('mark_request_waiting')` |
| `api.createQuoteRequest` | `rpc('create_quote_request')` |
| `media.putBlob` (IndexedDB) | Storage bucket privato `product-media` + riga `media` (bozza finché non pubblicata) |
| Accesso admin PBKDF2 locale | Supabase Auth (email + magic link o password) + tabella `admins` + RLS |
| `VS_CONFIG.whatsappNumber` | Setting `whatsapp_number` (pubblico) o `NEXT_PUBLIC_WHATSAPP_NUMBER` |

## Rotte previste (App Router)

```
app/
  page.tsx                         home
  [categoria]/page.tsx             materassi, reti, guanciali… (generateStaticParams + revalidate on-demand)
  [categoria]/[slug]/page.tsx      scheda prodotto + JSON-LD Product/BreadcrumbList
  sleep-match/ confronto/ guida-misure/ fuori-misura/ showroom/ carrello/ riepilogo/
  admin/(protected)/…              layout con verifica sessione + is_admin() lato server
  api/cart/validate/route.ts       chiama validate_cart con chiave anon (mai service role nel browser)
  api/revalidate/route.ts          invocata dopo le modifiche admin: aggiornamento senza ricompilare
  sitemap.ts                       core/seo.buildSitemap (solo sul dominio reale)
  robots.ts                        Disallow totale sulle preview (VERCEL_ENV !== 'production')
```

Le pagine pubbliche usano ISR con `revalidateTag('catalog')`, chiamato dalle azioni admin. Le modifiche approvate si vedono quindi senza ricompilare.

## Pagamenti (disattivati)

`core/payments.ts` definisce `PaymentProvider` con `createSession` e `handleWebhook`, oltre ai flag `DEFAULT_PAYMENT_FLAGS` tutti `false`. Per attivare un provider servono:

1. account e autorizzazione del titolare;
2. segreti solo lato server;
3. una rotta webhook con verifica della firma e idempotenza sull'id evento (tabella `payment_events` con vincolo unique);
4. test in sandbox;
5. l'abilitazione del flag lato server.

Finché i flag sono `false`, `visibleMethods()` restituisce una lista vuota e nessun logo compare.

## Sicurezza

- RLS su tutte le tabelle. Il pubblico non può inserire richieste direttamente: passa da funzioni `security definer` con validazione e limiti (30 righe, quantità 1–20, misure plausibili, note fino a 500 caratteri).
- Le note interne ai prodotti stanno in `product_private`, leggibile solo dagli admin.
- Le foto in bozza non si possono scaricare: la policy dello storage richiede una riga `media` pubblicata di un prodotto pubblicato.
- Nessun dato personale è richiesto né salvato dal sito. I link WhatsApp contengono solo articoli, prezzi e riferimento.
