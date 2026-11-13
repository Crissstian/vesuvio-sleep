// Livello dati della PREVIEW.
// Simula il backend Supabase nel browser di chi la usa: localStorage per i dati,
// IndexedDB per le foto caricate. Le funzioni `api.*` corrispondono alle funzioni
// SQL in supabase/migrations/0003_functions.sql (validate_cart, create_request…).

import { SEED } from './seed.js';
import { SITE_SLOTS } from './slots.js';
import { CatalogIndex, validateCart, makeRef, customSku, normalizeWhatsAppNumber } from './core/index.js';

const DB_KEY = 'vs-preview-db-v1';
const CART_KEY = 'vs-cart-v1';
const clone = (o) => JSON.parse(JSON.stringify(o));
const nowIso = () => new Date().toISOString();
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));

let storageOk = true;
function readLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    storageOk = false;
    return null;
  }
}
function writeLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    storageOk = false;
    return false;
  }
}

function freshDb() {
  return { seed_version: SEED.version, ...clone(SEED), requests: [], audit: [], price_history: [], site_media: [] };
}

let db = readLS(DB_KEY);
if (!db?.seed_version) {
  db = freshDb();
  writeLS(DB_KEY, db);
}
db.site_media ??= [];
// Aggiornamento del seed senza perdere le modifiche fatte dall'admin:
// si aggiungono solo gli elementi nuovi (per id), quelli esistenti non si toccano.
if (db.seed_version !== SEED.version) {
  for (const key of ['categories', 'products', 'variants', 'media']) {
    const have = new Set(db[key].map((x) => x.id));
    for (const item of SEED[key]) if (!have.has(item.id)) db[key].push(clone(item));
  }
  // una sola copertina per prodotto: se il seed nuovo ne porta una, prevale sulla vecchia del seed
  for (const m of SEED.media.filter((x) => x.is_cover)) {
    const others = db.media.filter((x) => x.product_id === m.product_id && x.is_cover && x.id !== m.id && !x.src.startsWith('idb:'));
    if (others.length) others.forEach((x) => (x.is_cover = false));
  }
  db.seed_version = SEED.version;
  writeLS(DB_KEY, db);
}
const listeners = new Set();

export const store = {
  get db() {
    return db;
  },
  get storageOk() {
    return storageOk;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  commit(reason) {
    writeLS(DB_KEY, db);
    if (reason) listeners.forEach((fn) => fn(reason));
  },
  audit(action, entity, detail) {
    db.audit.unshift({ id: rid(), at: nowIso(), action, entity, detail });
    db.audit = db.audit.slice(0, 400);
  },
  reset() {
    db = freshDb();
    this.commit('reset');
  },
  rid,
};

// ---------- Impostazioni ----------
const ENV = window.VS_CONFIG ?? {};
export function whatsappNumber() {
  // la variabile d'ambiente (config.js) prevale sull'impostazione admin, come in produzione
  if (ENV.whatsappNumber) return { raw: ENV.whatsappNumber, source: 'env' };
  return { raw: db.settings.whatsapp_number || '', source: 'admin' };
}
export function whatsappStatus() {
  const n = whatsappNumber();
  return { ...n, check: normalizeWhatsAppNumber(n.raw) };
}

// ---------- Media (IndexedDB) ----------
const blobUrls = new Map();
let idb = null;
function openIdb() {
  return new Promise((res) => {
    setTimeout(() => res(null), 1200);
    try {
      const r = indexedDB.open('vs-preview-media', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}
function idbReq(mode, fn) {
  return new Promise((res, rej) => {
    if (!idb) return rej(new Error('IndexedDB non disponibile'));
    const tx = idb.transaction('blobs', mode);
    const r = fn(tx.objectStore('blobs'));
    tx.oncomplete = () => res(r?.result);
    tx.onerror = () => rej(tx.error);
  });
}
export const media = {
  async init() {
    idb = await openIdb();
    const keys = [...db.media, ...(db.site_media ?? [])].filter((m) => m.src.startsWith('idb:')).map((m) => m.src.slice(4));
    for (const k of keys) {
      try {
        const b = await idbReq('readonly', (s) => s.get(k));
        if (b) blobUrls.set(k, URL.createObjectURL(b));
      } catch {
        /* foto non recuperabile: verrà mostrato il fallback */
      }
    }
  },
  available: () => !!idb,
  resolve(m) {
    if (!m) return null;
    if (m.src.startsWith('idb:')) return blobUrls.get(m.src.slice(4)) ?? null;
    return m.src;
  },
  async putBlob(blob) {
    const key = rid();
    if (idb) await idbReq('readwrite', (s) => s.put(blob, key));
    blobUrls.set(key, URL.createObjectURL(blob));
    return 'idb:' + key;
  },
  async deleteBlob(src) {
    if (!src?.startsWith('idb:')) return;
    const k = src.slice(4);
    if (idb) await idbReq('readwrite', (s) => s.delete(k)).catch(() => {});
    const u = blobUrls.get(k);
    if (u) URL.revokeObjectURL(u);
    blobUrls.delete(k);
  },
};

/** Valida e ricomprime un'immagine caricata: JPEG/PNG/WebP, max 8 MB, lato lungo max 1800 px. */
export async function processUpload(file) {
  const okTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!okTypes.includes(file.type)) throw new Error('Formato non supportato: usa JPEG, PNG o WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('File troppo grande: il limite è 8 MB.');
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('Il file non è un\'immagine leggibile.');
  });
  if (bmp.width < 400 || bmp.height < 300) throw new Error('Immagine troppo piccola: servono almeno 400×300 px.');
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.85));
  return { blob: blob ?? file, width: w, height: h };
}

/** Foto pubblicata in uno spazio del sito, oppure null (si mostra il segnaposto). */
export function siteImage(key, { drafts = false } = {}) {
  const m = (db.site_media ?? []).find((x) => x.slot === key && (drafts || x.published));
  const src = m && media.resolve(m);
  if (src) return { ...m, src, uploaded: true };
  const def = SITE_SLOTS.find((x) => x.key === key)?.default;
  return def ? { ...def, focal_x: 50, focal_y: 50 } : null;
}

// ---------- Catalogo ----------
/** Vista pubblica: media non pubblicati esclusi. Con drafts=true (solo admin) include le bozze. */
export function catalog({ drafts = false } = {}) {
  const snap = {
    categories: db.categories,
    products: drafts
      ? db.products.map((p) => (p.status === 'draft' ? { ...p, status: 'published' } : p)).filter((p) => p.status !== 'archived')
      : db.products,
    variants: db.variants,
    media: drafts ? db.media : db.media.filter((m) => m.published),
  };
  return new CatalogIndex(snap);
}
export function mediaFor(idx, p) {
  return idx.snap.media.filter((m) => m.product_id === p.id).sort((a, b) => a.sort - b.sort);
}
export function coverFor(idx, p) {
  const ms = mediaFor(idx, p).filter((m) => m.slot !== 'exploded');
  return ms.find((m) => m.is_cover) ?? ms[0] ?? null;
}

// ---------- Carrello ----------
let cartItems = readLS(CART_KEY) ?? [];
export const cart = {
  get items() {
    return cartItems;
  },
  set(items) {
    cartItems = items.filter((i) => i.qty > 0);
    writeLS(CART_KEY, cartItems);
    listeners.forEach((fn) => fn('cart'));
  },
  count() {
    return cartItems.reduce((a, i) => a + i.qty, 0);
  },
  clear() {
    this.set([]);
  },
};

// ---------- "Server" simulato ----------
export const api = {
  /** Ricontrollo come farebbe il server: legge sempre lo stato salvato, non quello della pagina. */
  validateCart(items) {
    return validateCart(catalog(), items);
  },
  createCartRequest(validation) {
    const ref = makeRef('R', new Date());
    const items = validation.lines
      .filter((l) => l.status === 'ok')
      .map((l) => ({
        variant_id: l.variant.id,
        product_id: l.product.id,
        name: l.product.name,
        sku: l.variant.sku,
        size: l.variant.size,
        height_cm: l.variant.height_cm,
        qty: l.item.qty,
        unit_cents: l.unit_cents,
      }));
    const r = {
      id: rid(),
      ref,
      type: 'cart',
      status: 'bozza',
      items,
      total_cents: validation.total_cents,
      quote: null,
      internal_notes: '',
      tracking: '',
      created_at: nowIso(),
      updated_at: nowIso(),
      history: [{ at: nowIso(), status: 'bozza', by: 'sito', note: 'Riepilogo generato dal carrello' }],
    };
    db.requests.unshift(r);
    store.commit('requests');
    return r;
  },
  createQuoteRequest(q) {
    const ref = makeRef('Q', new Date());
    const r = {
      id: rid(),
      ref,
      type: q.b2b ? 'b2b' : 'quote',
      status: 'bozza',
      items: [],
      total_cents: null,
      quote: { ...q, price_cents: null, reply: '', custom_sku: null },
      internal_notes: '',
      tracking: '',
      created_at: nowIso(),
      updated_at: nowIso(),
      history: [{ at: nowIso(), status: 'bozza', by: 'sito', note: 'Richiesta di preventivo fuori misura' }],
    };
    db.requests.unshift(r);
    store.commit('requests');
    return r;
  },
  /** Il click su WhatsApp NON prova l'invio: diventa solo "in attesa di contatto". */
  markWaiting(ref) {
    const r = db.requests.find((x) => x.ref === ref);
    if (!r || r.status !== 'bozza') return;
    r.status = 'in_attesa_contatto';
    r.updated_at = nowIso();
    r.history.push({ at: nowIso(), status: r.status, by: 'sito', note: 'Il cliente ha aperto WhatsApp (invio non verificabile)' });
    store.commit('requests');
  },
  customSku: (id) => customSku(new Date(), id),
};

export const REQUEST_STATUS = {
  bozza: 'Bozza',
  in_attesa_contatto: 'In attesa di contatto',
  in_trattativa: 'In trattativa',
  confermato_manualmente: 'Confermato su WhatsApp',
  in_preparazione: 'In preparazione',
  spedito: 'Spedito',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
  chiuso: 'Chiuso',
};
export const REQUEST_TYPE = { cart: 'Carrello', quote: 'Fuori misura', b2b: 'Strutture ricettive' };
