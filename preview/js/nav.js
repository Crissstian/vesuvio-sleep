// Indirizzi del sito.
// Sul dominio reale (VS_CONFIG.routing = 'path') le pagine hanno URL veri, indicizzabili:
//   /materassi/  /materassi/essential-foam/  /contatti/ ...
// Nell'anteprima dentro l'artifact (frame isolato) gli stessi indirizzi vivono dopo il cancelletto:
//   #/materassi/  #/materassi/essential-foam/ ...
// I vecchi indirizzi (#materassi, #prodotto-xxx, #fuori-misura ...) restano validi e portano al nuovo.

const CFG = window.VS_CONFIG ?? {};
export const MODE = CFG.routing === 'path' ? 'path' : 'hash';
export const SITE_URL = String(CFG.siteUrl || 'https://vesuviosleep.it').replace(/\/$/, '');
export const IS_PREVIEW = CFG.preview !== false;

export const P = {
  home: '/',
  sleepMatch: '/sleep-match/',
  compare: '/confronta-materassi/',
  sizes: '/guida-misure-materassi/',
  quote: '/materassi-su-misura/',
  showroom: '/showroom/',
  cart: '/carrello/',
  review: '/carrello/riepilogo/',
  search: '/cerca/',
  admin: '/admin/',
  contacts: '/contatti/',
  faq: '/domande-frequenti/',
  about: '/chi-siamo/',
  b2b: '/hotel-e-bb/',
  naples: '/materassi-napoli/',
  shipping: '/spedizioni-e-consegna/',
  payments: '/pagamenti/',
  returns: '/resi-e-recesso/',
  warranty: '/garanzia/',
  terms: '/condizioni-di-vendita/',
  privacy: '/privacy/',
  cookies: '/cookie/',
  guides: '/guide/',
};

/** href per un percorso canonico ("/materassi/") nella modalità corrente. */
export const u = (path) => (MODE === 'path' ? path : '#' + path);
/** URL assoluto (canonical, Open Graph, dati strutturati). */
export const abs = (path) => SITE_URL + path;
/** URL assoluto di un file del sito (img/..., anche già assoluto). */
export const absAsset = (src) => (!src ? '' : /^https?:/.test(src) ? src : SITE_URL + '/' + src.replace(/^\.?\//, ''));

const LEGACY = {
  '': P.home,
  'sleep-match': P.sleepMatch,
  confronto: P.compare,
  'guida-misure': P.sizes,
  'fuori-misura': P.quote,
  showroom: P.showroom,
  carrello: P.cart,
  riepilogo: P.review,
};
/** Vecchio indirizzo a cancelletto -> percorso canonico. */
export function legacyToPath(key, resolveProduct) {
  key = decodeURIComponent(key || '');
  if (key in LEGACY) return LEGACY[key];
  if (key === 'admin') return P.admin;
  if (key.startsWith('admin-')) return `/admin/${key.slice(6)}/`;
  const m = /^prodotto-(.+)$/.exec(key);
  if (m) return (resolveProduct && resolveProduct(m[1])) || `/prodotto/${m[1]}/`;
  return `/${key}/`;
}
/** Percorso admin -> chiave usata dal pannello ("admin-catalogo"). */
export function adminKey(path = current().path) {
  const rest = path.replace(/^\/admin\/?/, '').replace(/\/$/, '');
  return rest ? 'admin-' + rest : 'admin';
}

/** Pagina corrente: percorso canonico e parametri. legacy = vecchio indirizzo da reindirizzare. */
export function current() {
  let raw;
  if (MODE === 'path') {
    raw = location.pathname + location.search;
    const h = location.hash.slice(1);
    if (h && !h.startsWith('/') && !document.getElementById(h)) return { legacy: h, path: '/', query: {} };
  } else {
    raw = location.hash.slice(1);
    if (!raw.startsWith('/')) return raw === '' ? { path: '/', query: {} } : { legacy: raw, path: '/', query: {} };
  }
  const [p, qs = ''] = raw.split('?');
  let path = decodeURIComponent(p || '/');
  if (!path.endsWith('/')) path += '/';
  path = path.replace(/\/{2,}/g, '/');
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}

let onNavigate = () => {};
export function setNavigator(fn) {
  onNavigate = fn;
}
/** Vai a un percorso canonico. */
export function go(path, { replace = false } = {}) {
  if (MODE === 'path') {
    if (replace) history.replaceState(null, '', path);
    else history.pushState(null, '', path);
    onNavigate();
  } else if (replace) {
    location.replace('#' + path);
  } else {
    location.hash = path;
  }
}
export const isAt = (path) => current().path === path;

/** Link interni: niente ricaricamento sul dominio reale, vecchi #indirizzi tradotti ovunque. */
export function interceptLinks(resolveProduct) {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      const key = href.slice(1);
      if (key.startsWith('/')) return; // anteprima: già canonico
      const el = key && document.getElementById(key);
      if (el) {
        // ancora nella pagina
        e.preventDefault();
        el.scrollIntoView({ block: 'start' });
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        return;
      }
      e.preventDefault();
      go(legacyToPath(key, resolveProduct));
      return;
    }
    if (MODE === 'path' && href.startsWith('/') && !href.startsWith('//') && !/\.(xml|txt|pdf|webp|png|jpg)$/i.test(href.split('?')[0])) {
      e.preventDefault();
      if (href !== location.pathname + location.search) go(href);
    }
  });
}
