// Collegamento al database Supabase.
//
// Il sito funziona anche senza: il catalogo compilato nel bundle resta la riserva, e tutto
// quello che c'è qui dentro degrada in silenzio se la rete non risponde o se la configurazione
// è vuota. Quando invece il collegamento c'è, il database diventa la fonte di verità:
// il catalogo mostrato è quello letto da Supabase, non quello compilato.
//
// Sicurezza: qui si usa SOLO la chiave pubblicabile, quella che Supabase prevede per il browser.
// La service role non compare in nessun file del sito. Chi non ha fatto l'accesso vede quello
// che le policy RLS concedono al ruolo anonimo: prodotti pubblicati, foto pubblicate,
// impostazioni pubbliche. Prezzi, bozze e note interne restano protetti dal database, non dal
// JavaScript.

const ENV = window.VS_CONFIG ?? {};
export const SB = { url: (ENV.supabaseUrl ?? '').replace(/\/$/, ''), key: ENV.supabaseKey ?? '', bucket: ENV.supabaseBucket ?? 'product-media' };

/** C'è una configurazione? Senza, il sito resta sul catalogo compilato e non chiama nulla. */
export const configured = () => !!(SB.url && SB.key);

const SESSION_KEY = 'vs-sb-session-v1';
const readSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return s && s.expires_at * 1000 > Date.now() ? s : null;
  } catch {
    return null;
  }
};
let session = configured() ? readSession() : null;

export const currentUser = () => session?.user ?? null;

function authHeader() {
  return { apikey: SB.key, Authorization: `Bearer ${session?.access_token || SB.key}` };
}

/** Una chiamata a PostgREST. Restituisce i dati, oppure solleva con il messaggio del database. */
async function rest(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${SB.url}/rest/v1/${path}`, {
    method,
    headers: {
      ...authHeader(),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `${res.status} ${res.statusText}`);
  return data;
}

/** Una funzione del database (validate_cart, create_cart_request, create_quote_request). */
export async function rpc(fn, args) {
  return rest(`rpc/${fn}`, { method: 'POST', body: args });
}

// ------------------------------------------------------------------ accesso
/** Accesso con email e password. La password viaggia solo verso Supabase e non viene salvata. */
export async function signIn(email, password) {
  const res = await fetch(`${SB.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SB.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || data?.msg || 'Accesso non riuscito');
  session = { ...data, expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600) };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
  return session.user;
}

/** Link per reimpostare la password: serve al primo accesso, che nasce senza password. */
export async function sendRecovery(email) {
  const res = await fetch(`${SB.url}/auth/v1/recover`, {
    method: 'POST',
    headers: { apikey: SB.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Non è stato possibile inviare il link');
}

export function signOut() {
  session = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** L'utente collegato è un amministratore? Lo decide il database, non il browser. */
export async function isAdmin() {
  if (!session) return false;
  try {
    return (await rpc('is_admin', {})) === true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ catalogo
/** `seed/img/...` è una foto compilata nel sito; tutto il resto sta nel bucket. */
function srcOf(storage_path) {
  if (!storage_path) return '';
  if (storage_path.startsWith('seed/')) return storage_path.slice(5);
  if (/^(https?:|idb:)/.test(storage_path)) return storage_path;
  return `${SB.url}/storage/v1/object/public/${SB.bucket}/${storage_path}`;
}
/** Le foto del catalogo esistono a due larghezze: la piccola si ricava dal nome della grande. */
function srcsetOf(src, width) {
  const small = src.replace(/-1200\.webp$/, '-720.webp');
  return small !== src ? `${small} 720w, ${src} ${width || 1200}w` : '';
}

/**
 * Legge il catalogo dal database e lo restituisce nella stessa forma del catalogo compilato,
 * così il resto del sito non sa nemmeno da dove arriva.
 */
export async function loadCatalog() {
  const [categories, products, variants, mediaRows, settingsRows, redirects] = await Promise.all([
    rest('categories?select=*&order=sort'),
    rest('products?select=*&order=sort'),
    rest('variants?select=*&order=sort'),
    rest('media?select=*&order=sort'),
    rest('settings?select=key,value'),
    rest('slug_redirects?select=old_slug,new_slug'),
  ]);
  const media = mediaRows.map((m) => {
    const src = srcOf(m.storage_path);
    return { ...m, src, srcset: srcsetOf(src, m.width), width: m.width ?? null, height: m.height ?? null };
  });
  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
  // offerte abbinate: tabelle della migrazione 000009. Se mancano (database non ancora
  // aggiornato) il catalogo si legge lo stesso e le offerte restano quelle compilate.
  let offers, bundles, bundle_items;
  try {
    [offers, bundles, bundle_items] = await Promise.all([
      rest('offers?select=*&order=sort'),
      rest('bundles?select=*&order=sort'),
      rest('bundle_items?select=*&order=sort'),
    ]);
  } catch {
    offers = bundles = bundle_items = undefined;
  }
  return { categories, products, variants, media, settings, redirects, offers, bundles, bundle_items, source: 'supabase' };
}

/**
 * Manda al database il catalogo così com'è nell'admin. Solo per un amministratore collegato:
 * per chiunque altro le policy RLS rifiutano la scrittura, e va bene così.
 */
export async function pushCatalog(db) {
  const keep = (o, ks) => Object.fromEntries(ks.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  const P = ['id', 'slug', 'category_id', 'name', 'technical_name', 'short', 'description', 'composition', 'highlights',
    'claims', 'removable_cover', 'reversible', 'summer_winter', 'hybrid', 'firmness_display', 'line_code', 'status', 'sort', 'lead_time', 'match',
    'bundle_family'];
  const V = ['id', 'product_id', 'sku', 'size', 'height_cm', 'price_cents', 'availability', 'active', 'sort'];
  const C = ['id', 'slug', 'kind', 'name', 'description', 'sort', 'status'];
  const up = (t, rows) => (rows.length ? rest(`${t}?on_conflict=id`, { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' }) : null);
  await up('categories', db.categories.map((c) => keep(c, C)));
  await up('products', db.products.map((p) => keep(p, P)));
  await up('variants', db.variants.map((v) => keep(v, V)));
  // le foto caricate nel browser (idb:) restano dove sono: non esiste un file da collegare
  const media = db.media
    .filter((m) => !String(m.src).startsWith('idb:'))
    .map((m) => ({
      ...keep(m, ['id', 'product_id', 'slot', 'alt', 'caption', 'illustrative', 'is_cover', 'published', 'sort', 'focal_x', 'focal_y', 'width', 'height', 'fit', 'bg']),
      storage_path: m.storage_path ?? (String(m.src).startsWith('http') ? m.src : `seed/${m.src}`),
    }));
  await up('media', media);
  // offerte abbinate: regole, vetrine e pezzi (le vetrine prima dei pezzi, per le chiavi esterne)
  const O = ['id', 'code', 'label', 'description', 'params', 'status', 'starts_at', 'ends_at', 'sort'];
  const B = ['id', 'slug', 'name', 'tagline', 'description', 'badge', 'theme', 'sizes', 'default_size', 'status', 'sort', 'seo_title', 'seo_description'];
  const I = ['id', 'bundle_id', 'product_id', 'height_cm', 'qty', 'optional', 'sort'];
  await up('offers', (db.offers ?? []).map((o) => keep(o, O)));
  await up('bundles', (db.bundles ?? []).map((b) => keep(b, B)));
  await up('bundle_items', (db.bundle_items ?? []).map((i) => keep(i, I)));
  const settings = Object.entries(db.settings ?? {}).map(([key, value]) => ({ key, value }));
  if (settings.length) await rest('settings?on_conflict=key', { method: 'POST', body: settings, prefer: 'resolution=merge-duplicates,return=minimal' });
  return { prodotti: db.products.length, varianti: db.variants.length, foto: media.length };
}
