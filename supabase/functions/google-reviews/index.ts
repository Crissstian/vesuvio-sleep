// Recensioni Google della sede (Places API, versione nuova), per la sezione «Cosa dicono di noi».
//
// Perché una funzione e non una chiamata dal browser:
//  - la chiave API di Google non deve stare nel sito: qui è un segreto della funzione;
//  - il browser del visitatore non si collega a Google (nessun dato personale a Google).
//
// Segreti da impostare su Supabase (Edge Functions › Secrets), PRIMA del deploy:
//   GOOGLE_PLACES_KEY   chiave API con la sola "Places API (New)" abilitata, ristretta a questa API
//   GOOGLE_PLACE_ID     ID del luogo (es. "ChIJ..."): si trova con il Place ID Finder di Google
//   ALLOWED_ORIGINS     domini che possono chiamarla, separati da virgola (es. https://vesuviosleep.it)
// Senza chiave o ID risponde { configured: false } e il sito non mostra la sezione.
//
// Regole che il sito rispetta (termini di Google Maps Platform e Codice del Consumo):
//  - si mostrano le recensioni come Google le restituisce, nel suo ordine, senza filtrarle per voto;
//  - insieme al voto medio, al numero totale e al collegamento alla scheda su Google Maps;
//  - con il nome dell'autore e il collegamento al suo profilo, come chiede Google;
//  - nessuna copia salvata nel database: solo una cache HTTP di un'ora.
// DA VERIFICARE prima di accendere: i termini aggiornati di Google sulla visualizzazione.
//
// Stato: SCRITTA, NON PROVATA (la sessione che l'ha scritta non raggiungeva Google né Supabase).

const KEY = Deno.env.get('GOOGLE_PLACES_KEY') ?? '';
const PLACE = Deno.env.get('GOOGLE_PLACE_ID') ?? '';
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://vesuviosleep.it').split(',').map((s) => s.trim()).filter(Boolean);

type GoogleReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; uri?: string };
};

function headers(origin: string, extra: Record<string, string> = {}): Headers {
  return new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0] ?? '',
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
    ...extra,
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  if (req.method === 'OPTIONS') return new Response(null, { headers: headers(origin) });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'metodo' }), { status: 405, headers: headers(origin) });
  if (!KEY || !PLACE) return new Response(JSON.stringify({ configured: false }), { headers: headers(origin) });

  let res: Response;
  try {
    res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE)}?languageCode=it`, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews' },
    });
  } catch {
    return new Response(JSON.stringify({ configured: true, error: 'rete' }), { status: 502, headers: headers(origin) });
  }
  if (!res.ok) return new Response(JSON.stringify({ configured: true, error: 'google', status: res.status }), { status: 502, headers: headers(origin) });

  const d = await res.json();
  const reviews = ((d.reviews ?? []) as GoogleReview[]).map((r) => ({
    rating: r.rating ?? 0,
    text: (r.originalText?.text ?? r.text?.text ?? '').slice(0, 1200),
    when: r.relativePublishTimeDescription ?? '',
    author: r.authorAttribution?.displayName ?? '',
    authorUri: r.authorAttribution?.uri ?? '',
  }));
  const body = { configured: true, rating: d.rating ?? null, count: d.userRatingCount ?? 0, url: d.googleMapsUri ?? '', reviews };
  return new Response(JSON.stringify(body), { headers: headers(origin, { 'Cache-Control': 'public, max-age=3600' }) });
});
