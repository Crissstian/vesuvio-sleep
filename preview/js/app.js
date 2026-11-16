import {
  formatCents,
  formatSize,
  AVAILABILITY_LABEL,
  STANDARD_SIZES,
  parseSize,
  pairingsFor,
  sleepMatch,
  addToCart,
  toSummaryLines,
  planWhatsApp,
  buildQuoteMessage,
  normalizeWhatsAppNumber,
  productJsonLd,
  localBusinessJsonLd,
  breadcrumbJsonLd,
  MAX_QTY,
  resolveRedirect,
  faqJsonLd,
  websiteJsonLd,
} from './core/index.js';
import { MODE, P, u, abs, absAsset, current, go, isAt, legacyToPath, setNavigator, interceptLinks, IS_PREVIEW } from './nav.js';
import { PAGES, CATEGORY_SEO, VIEW_SEO, FAQ, faqForLd, CONTACT, waHref, PAYMENT_METHODS, applySettings } from './pages.js';
import { store, catalog, cart, api, media, mediaFor, coverFor, whatsappStatus, siteImage } from './store.js';
import { esc, $, $$, swap, toast, copyText, openDialog, icon, reducedMotion } from './ui.js';
import { productIllustration, layersFor } from './illustrations.js';
import { heroHtml } from './hero.js';
import { SITE_SLOTS, PRODUCT_SLOTS, HERO_SLIDES, HERO_CAPTIONS } from './slots.js';
import { initHero, tiltCards } from './heroctl.js';
import { enhance, bump, explode } from './motion.js';

const CFG = window.VS_CONFIG ?? {};
const app = $('#app');
const state = {
  homeKind: 'materasso',
  compare: new Set(),
  filters: { tech: 'all', removable: false, height: 0, sort: 'reco' },
  sel: {}, // productId -> {size, height, qty}
  sm: null, // Sleep Match: risposte solo in memoria
  sizes: ['160x190', '180x200'],
  lastRoute: undefined,
  pay: 'contrassegno',
  labModel: null,
};
const KIND_PLURAL = { materasso: 'Materassi', rete: 'Reti', guanciale: 'Guanciali', topper: 'Topper', letto: 'Letti a castello' };
const KIND_SING = { materasso: 'materasso', rete: 'rete', guanciale: 'guanciale', topper: 'topper', letto: 'letto' };
const TECH_LABEL = { foam: 'Poliuretano', memory: 'Memory Foam', molle: 'Molle insacchettate' };

// ---------------------------------------------------------------- immagini
const FALLBACK = {
  materasso: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M30 62 L120 36 L212 58 L122 88 Z" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M30 62 V92 L122 120 V88 M212 58 V88 L122 120" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M30 74 L122 101 L212 70" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".45"/><path d="M36 64 L120 40 L205 59" fill="none" stroke="#c8785b" stroke-width="1.6" stroke-dasharray="5 5"/></svg>`,
  rete: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M28 66 L120 40 L214 62 L122 92 Z" fill="none" stroke="currentColor" stroke-width="2.2"/>${Array.from({ length: 9 }, (_, i) => { const t = (i + 1) / 10; return `<path d="M${28 + 94 * t} ${66 + 26 * t} L${120 + 94 * t} ${40 + 22 * t}" stroke="currentColor" stroke-width="3" opacity=".75"/>`; }).join('')}<path d="M40 70v26M118 95v24M206 66v24" stroke="currentColor" stroke-width="2.4"/></svg>`,
  guanciale: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M44 48 Q120 30 196 48 Q210 70 196 94 Q120 112 44 94 Q30 70 44 48 Z" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M54 54 Q120 40 186 54 Q197 70 186 88 Q120 102 54 88 Q43 70 54 54 Z" fill="none" stroke="#c8785b" stroke-width="1.5" stroke-dasharray="5 5"/></svg>`,
  topper: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M30 70 L120 46 L212 66 L122 92 Z" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M30 70 V80 L122 104 V92 M212 66 V76 L122 104" fill="none" stroke="currentColor" stroke-width="2"/><path d="M38 72 L120 50 L204 67" fill="none" stroke="#c8785b" stroke-width="1.5" stroke-dasharray="5 5"/></svg>`,
  letto: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M60 20v110M180 20v110M60 50h120M60 100h120" stroke="currentColor" stroke-width="3" fill="none"/></svg>`,
};
function fallbackHtml(kind) {
  return `<div class="fallback">${FALLBACK[kind] ?? FALLBACK.materasso}</div>`;
}
function imgTag(m, { sizes = '(max-width: 700px) 92vw, 33vw', eager = false, cls = '' } = {}) {
  const src = media.resolve(m);
  if (!src) return null;
  const focal = `object-position:${m.focal_x ?? 50}% ${m.focal_y ?? 50}%`;
  if (m.bg === 'white') cls += ' blend';
  return `<img src="${esc(src)}" ${m.srcset ? `srcset="${esc(m.srcset)}" sizes="${esc(sizes)}"` : ''} alt="${esc(m.alt)}" ${m.width ? `width="${m.width}" height="${m.height}"` : ''} loading="${eager ? 'eager' : 'lazy'}" decoding="async" class="${cls}" style="${focal}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fallback',innerHTML:window.__fb||''}))">`;
}
window.__fb = FALLBACK.materasso;
/** Le foto con sfondo pieno riempiono il riquadro; i render scontornati restano "contenuti". */
// "fit" dichiarato sulla foto prevale: le foto su fondo bianco restano intere e centrate
const fitCls = (m) => ((m.fit ? m.fit === 'cover' : !m.illustrative) ? 'is-cover' : '');
function coverHtml(idx, p, opts = {}) {
  const m = coverFor(idx, p);
  return (m && imgTag(m, { ...opts, cls: fitCls(m) })) || productIllustration(p, idx.kind(p));
}

// ---------------------------------------------------------------- helpers
const catOf = (p) => catalog().snap.categories.find((c) => c.id === p.category_id);
const catPath = (c) => `/${c.slug}/`;
const prodPath = (p, c = catOf(p)) => (c ? `/${c.slug}/${p.slug}/` : `/prodotto/${p.slug}/`);
const href = {
  product: (p) => u(prodPath(p)),
  category: (c) => u(catPath(c)),
};
/** Percorso canonico di un prodotto (anche da un vecchio slug rinominato). */
function resolveProductPath(slug) {
  const idx = catalog();
  let p = idx.snap.products.find((x) => x.slug === slug);
  if (!p) {
    const to = resolveRedirect(store.db.redirects ?? [], slug);
    if (to) p = idx.snap.products.find((x) => x.slug === to);
  }
  return p ? prodPath(p) : null;
}
function priceFrom(idx, p, height = null) {
  // con un'altezza indicata il "da" è quello di quell'altezza: altrimenti si mostrerebbe
  // il prezzo di una configurazione diversa da quella proposta
  const prices = height === null ? null : idx.purchasableVariants(p).filter((v) => v.height_cm === height).map((v) => v.price_cents);
  const min = prices?.length ? Math.min(...prices) : idx.minPrice(p);
  const max = prices?.length ? Math.max(...prices) : idx.maxPrice(p);
  if (min === null || min === undefined) return '';
  return min === max ? `<span class="price">${formatCents(min)}</span>` : `<span class="price"><small>da</small>${formatCents(min)}</span>`;
}
const DEFAULT_DESC = VIEW_SEO.home.description;
const SHARE_IMG = 'img/social/vesuvio-sleep-condividi.jpg';
function metaTag(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
/**
 * Titolo, descrizione, robots, canonical, Open Graph e dati strutturati della pagina.
 * opts: { noindex, image, type, path }
 */
function setMeta(title, desc, ld = [], opts = {}) {
  const full = title ? `${title} | Vesuvio Sleep` : `${VIEW_SEO.home.metaTitle} | Vesuvio Sleep`;
  const description = desc || DEFAULT_DESC;
  document.title = full.length <= 70 || !title ? full : title;
  metaTag('name', 'description', description);
  const path = opts.path ?? current().path;
  metaTag('name', 'robots', IS_PREVIEW ? 'noindex, nofollow, noarchive' : opts.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  let canon = document.head.querySelector('link[rel="canonical"]');
  if (MODE === 'path' && !opts.noindex) {
    if (!canon) {
      canon = Object.assign(document.createElement('link'), { rel: 'canonical' });
      document.head.appendChild(canon);
    }
    canon.setAttribute('href', abs(path));
  } else canon?.remove();
  const og = {
    'og:type': opts.type || 'website',
    'og:site_name': 'Vesuvio Sleep',
    'og:locale': 'it_IT',
    'og:title': title || VIEW_SEO.home.metaTitle,
    'og:description': description,
    'og:url': abs(path),
    'og:image': absAsset(opts.image || SHARE_IMG),
  };
  for (const [k, v] of Object.entries(og)) metaTag('property', k, v);
  metaTag('name', 'twitter:card', 'summary_large_image');
  const list = ld.filter(Boolean);
  $('#ld').textContent = JSON.stringify(list.length === 1 ? list[0] : list);
}
/** Briciole: link per la pagina e dati strutturati con URL assoluti. items: [{name, path}] */
function trail(items) {
  return {
    ui: items.map((it, i) => ({ name: it.name, href: i < items.length - 1 && it.path ? u(it.path) : undefined })),
    ld: breadcrumbJsonLd(items.map((it) => ({ name: it.name, url: abs(it.path ?? current().path) }))),
  };
}
function crumbs(items) {
  return `<nav class="crumbs wrap" aria-label="Percorso"><ol>${items
    .map((it, i) => `<li>${it.href && i < items.length - 1 ? `<a href="${it.href}">${esc(it.name)}</a>` : `<span aria-current="page">${esc(it.name)}</span>`}</li>`)
    .join('')}</ol></nav>`;
}
function availabilityHtml(v) {
  if (!v) return '';
  return `<span class="avail ${v.availability === 'unavailable' ? 'avail--off' : ''}">${esc(AVAILABILITY_LABEL[v.availability])}</span>`;
}
function previewDrafts() {
  try {
    return sessionStorage.getItem('vs-admin-session') && sessionStorage.getItem('vs-preview-drafts') === '1';
  } catch {
    return false;
  }
}
const pub = () => catalog({ drafts: previewDrafts() });

// ---------------------------------------------------------------- layout
function renderChrome() {
  applySettings(store.db.settings);
  const idx = catalog();
  const cats = idx.commercialCategories();
  const here = current().path;
  const on = (p) => (here === p || (p !== '/' && here.startsWith(p)) ? 'aria-current="page"' : '');
  const nav = [
    ...cats.map((c) => ({ path: catPath(c), label: c.name })),
    { path: P.sleepMatch, label: 'Sleep Match' },
    { path: P.showroom, label: 'Showroom' },
  ];
  const msgs = [
    `Spedizione ${store.db.settings.shipping_note || ''}`,
    CONTACT.waShort === CONTACT.phoneShort ? `WhatsApp e telefono ${CONTACT.phoneShort}` : `WhatsApp ${CONTACT.waShort}`,
    'Produciamo materassi a Casoria dal 1986',
    'Paghi alla consegna o con bonifico',
    'A Napoli consegna al piano gratuita',
    'Fuori misura e altezze personalizzate su richiesta',
  ];
  const run = msgs.map((m) => `<span>${esc(m)}</span>`).join('');
  $('#topbar').innerHTML = `<div class="wrap">
      <div class="ticker" aria-hidden="true"><div class="ticker__track">${run}${run}</div></div><span class="sr-only">${esc(msgs[0])}</span>
      <span class="topbar__preview">${previewDrafts() ? '<span class="topbar__flag">Anteprima admin: bozze visibili</span>' : ''}</span>
    </div>`;
  $('#nav').innerHTML = nav.map((n) => `<a href="${u(n.path)}" ${on(n.path)}>${esc(n.label)}</a>`).join('');
  $('#drawer-links').innerHTML =
    `<a href="${u(P.home)}">Home</a>` +
    nav.map((n) => `<a href="${u(n.path)}">${esc(n.label)}</a>`).join('') +
    `<a href="${u(P.compare)}">Confronta i materassi</a><a href="${u(P.sizes)}">Misure dei materassi</a><a href="${u(P.quote)}">Materassi su misura</a><a href="${u(P.faq)}">Domande frequenti</a><a href="${u(P.contacts)}">Contatti</a><a href="${u(P.search)}">Cerca</a><a href="${u(P.cart)}">Carrello (${cart.count()})</a>`;
  const n = cart.count();
  $('#cart-link').setAttribute('href', u(P.cart));
  $('#cart-link').innerHTML = `${icon('cart')}<span class="sr-only">Carrello, ${n} articoli</span>${n ? `<span class="badge-count" aria-hidden="true">${n}</span>` : ''}`;
  $('#search-link')?.setAttribute('href', u(P.search));
  $('.brand')?.setAttribute('href', u(P.home));
  $('#footer-main').innerHTML = footerHtml(cats);
  let fl = $('#wa-float');
  if (!fl) {
    fl = document.createElement('a');
    fl.id = 'wa-float';
    fl.className = 'wa-float';
    fl.target = '_blank';
    fl.rel = 'noopener';
    fl.setAttribute('aria-label', 'Scrivici su WhatsApp');
    fl.innerHTML = `${icon('wa', 24)}<span>Scrivici</span>`;
    document.body.appendChild(fl);
  }
  fl.href = waHref();
}
function footerHtml(cats) {
  const li = (path, t) => `<li><a href="${u(path)}">${esc(t)}</a></li>`;
  return `<div class="footer__grid footer__grid--5">
      <div>
        <span class="footer__logo"><img src="img/logo.webp" width="240" height="229" alt="Vesuvio Sleep" loading="lazy"></span>
        <p style="margin-top:14px">Materassi di fabbrica dal 1986, prodotti a Casoria (Napoli).</p>
        <ul class="footer__contacts">
          <li><a href="${waHref()}" target="_blank" rel="noopener">${icon('wa', 18)} WhatsApp ${CONTACT.waShort}</a></li>
          <li><a href="${CONTACT.phoneHref}">${icon('phone', 18)} ${CONTACT.phoneShort}</a></li>
          <li><a href="mailto:${CONTACT.email}">${icon('mail', 18)} ${CONTACT.email}</a></li>
        </ul>
      </div>
      <div><h2>Catalogo</h2><ul>${cats.map((c) => li(catPath(c), c.name)).join('')}${li(P.quote, 'Materassi su misura')}${li(P.b2b, 'Hotel e B&B')}</ul></div>
      <div><h2>Scegliere</h2><ul>${li(P.sleepMatch, 'Sleep Match')}${li(P.compare, 'Confronta i materassi')}${li(P.sizes, 'Misure dei materassi')}${li(P.guides, 'Guide')}${li(P.naples, 'Materassi a Napoli')}</ul></div>
      <div><h2>Assistenza</h2><ul>${li(P.contacts, 'Contatti')}${li(P.faq, 'Domande frequenti')}${li(P.shipping, 'Spedizioni e consegna')}${li(P.payments, 'Pagamenti')}${li(P.returns, 'Resi e recesso')}${li(P.warranty, 'Garanzia')}</ul></div>
      <div><h2>Showroom</h2><p style="margin:0">Via Raffaele Salierno 38<br>80026 Casoria (NA)</p><p>Lun–ven 09:00–18:00<br>Sab 10:00–14:00</p><ul>${li(P.showroom, 'Come arrivare')}${li(P.about, 'Chi siamo')}</ul></div>
    </div>
    <div class="footer__legal"><span>${esc(CONTACT.legalName)} · P.IVA ${CONTACT.vat} · REA ${CONTACT.rea} · ${esc(CONTACT.address)}</span>
      <span class="footer__legal-links"><a href="${u(P.terms)}">Condizioni di vendita</a> · <a href="${u(P.privacy)}">Privacy</a> · <a href="${u(P.cookies)}">Cookie</a>${IS_PREVIEW ? ' · ' : ''}${IS_PREVIEW ? `<a href="${u(P.admin)}" rel="nofollow">Area riservata</a>` : ''}</span></div>`;
}

// ---------------------------------------------------------------- router
async function dispatch(cur) {
  const { path, query } = cur;
  if (path.startsWith(P.admin)) return (await import('./admin.js')).render(app);
  const fixed = {
    [P.home]: viewHome,
    [P.sleepMatch]: viewSleepMatch,
    [P.compare]: viewCompare,
    [P.sizes]: viewSizes,
    [P.quote]: () => viewQuote(query),
    [P.showroom]: viewShowroom,
    [P.cart]: viewCart,
    [P.review]: viewReview,
    [P.search]: () => viewSearch(query.q || ''),
  };
  if (fixed[path]) return fixed[path]();
  if (PAGES[path]) return viewPage(path, PAGES[path]);
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 1) {
    const c = pub().snap.categories.find((x) => x.slug === seg[0]);
    if (c && (c.status === 'published' || previewDrafts())) return viewCategory(c);
  }
  if (seg.length === 2) return viewProduct(seg[1], seg[0]);
  return viewNotFound();
}
async function route() {
  // dopo la prima pagina l'entrata è finita: niente più ritardi sulle animazioni
  if (state.lastRoute !== undefined) document.documentElement.classList.remove('vs-intro');
  const cur = current();
  if (cur.legacy !== undefined) {
    // vecchio indirizzo (#materassi, #prodotto-xxx ...): si passa a quello nuovo
    return go(legacyToPath(cur.legacy, resolveProductPath), { replace: true });
  }
  const r = cur.path + (Object.keys(cur.query).length ? '?' + new URLSearchParams(cur.query) : '');
  const render = async () => {
    closeDrawer();
    document.body.classList.remove('has-sticky');
    $('.compare-bar')?.remove();
    const isAdmin = cur.path.startsWith(P.admin);
    document.body.classList.toggle('is-admin', isAdmin);
    await dispatch(cur);
    document.body.classList.toggle('on-hero', !!$('#app > .hero'));
    document.body.classList.toggle('on-dark', !!$('#app > .page-hero'));
    renderChrome();
    if (MODE === 'path') $$('a[href^="#/"]').forEach((el) => el.setAttribute('href', el.getAttribute('href').slice(1)));
    if (state.lastRoute !== r) {
      window.scrollTo(0, 0);
      const h1 = $('#app h1');
      if (h1 && state.lastRoute !== undefined && !isAdmin) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    }
    enhance(app);
    tiltCards(app);
    // la barra di confronto compare solo dove si selezionano i modelli
    if (!isAdmin && state.compare.size && (cur.path === P.home || cur.path === '/materassi/')) showCompareBar();
  };
  const first = state.lastRoute === undefined;
  if (!first && document.startViewTransition && !reducedMotion() && state.lastRoute !== r) {
    try {
      const vt = document.startViewTransition(render);
      // una transizione interrotta da una navigazione successiva non è un errore
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
      await vt.updateCallbackDone;
    } catch {
      await render();
    }
  } else await render();
  $$('[style*="view-transition-name"]').forEach((el) => {
    if (!el.classList.contains('gallery__main')) el.style.viewTransitionName = '';
  });
  state.lastRoute = r;
}

// ---------------------------------------------------------------- HOME
function productCard(idx, p, { compare = false, d = 0 } = {}) {
  const kind = idx.kind(p);
  const vs = idx.purchasableVariants(p);
  const heights = idx.purchasableHeights(p);
  const feats = [
    ...(kind === 'materasso' && heights.length ? [heights.map((h) => 'H' + h).join(' · ')] : []),
    ...(p.removable_cover ? ['Sfoderabile'] : []),
    ...(p.summer_winter ? ['Estate e inverno'] : []),
    ...(kind !== 'materasso' ? (p.highlights || []).slice(0, 2) : []),
  ].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
  const cover = coverFor(idx, p);
  return `<article class="card rv" style="--d:${d}" data-pid="${esc(p.id)}">
    <div class="card__media">${coverHtml(idx, p)}${p.hybrid ? '<span class="card__flag">Hybrid</span>' : ''}</div>
    <div class="card__body">
      <span class="card__tech">${esc(p.technical_name)}</span>
      <h3><a href="${href.product(p)}" data-act="to-product">${esc(p.name)}</a></h3>
      <ul class="card__feats">${feats.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      ${availabilityHtml(vs[0])}
      <div class="card__foot">
        <div>${priceFrom(idx, p)}</div>
        ${compare ? `<label class="compare-toggle"><input type="checkbox" data-act="compare" value="${esc(p.id)}" ${state.compare.has(p.id) ? 'checked' : ''}> Confronta</label>` : `<span class="small muted">IVA inclusa</span>`}
      </div>
    </div>
  </article>`;
}

// Profilo dell'ombra del Vesuvio nella foto della hero (coordinate dell'immagine 1536×1024)
const RIDGE = 'M 420 318 C 480 296, 530 276, 590 252 C 640 248, 690 250, 712 242 C 735 232, 752 226, 768 227 C 790 228, 805 242, 828 256 C 900 294, 1000 340, 1160 390';

/** Segnaposto dichiarato per una foto ancora da fornire. */
function placeholderHtml(def, { cls = '' } = {}) {
  return `<figure class="ph ${cls}" style="--ratio:${def.ratio ?? '4 / 3'}" role="img" aria-label="Spazio per foto: ${esc(def.label)}">
    <div class="ph__inner">${icon('image', 30)}<strong>${esc(def.label)}</strong><span>${esc(def.hint ?? '')}</span><em>Foto in arrivo</em></div></figure>`;
}
function slotHtml(key, opts = {}) {
  const def = SITE_SLOTS.find((x) => x.key === key);
  const img = siteImage(key);
  if (img)
    return `<figure class="ph ph--photo ${opts.cls ?? ''}" style="--ratio:${opts.ratio ?? def.ratio}"><img src="${esc(img.src)}" ${img.srcset ? `srcset="${esc(img.srcset)}" sizes="${opts.sizes ?? '(max-width: 860px) 90vw, 33vw'}"` : ''} alt="${esc(img.alt)}" loading="lazy" decoding="async" style="object-position:${img.focal_x ?? 50}% ${img.focal_y ?? 50}%">${!img.uploaded && img.caption ? `<figcaption class="ph__cap">${esc(img.caption)}</figcaption>` : ''}${opts.label ? `<span class="ph__label">${esc(opts.label)}</span>` : ''}</figure>`;
  return placeholderHtml(def, opts);
}

function statementHtml() {
  return `<section class="statement" aria-labelledby="st-title"><div class="wrap statement__grid">
    <figure class="statement__img rv">
      <div class="statement__art">
        <img src="img/hero-vesuvio-1024.webp" srcset="img/hero-vesuvio-640.webp 640w, img/hero-vesuvio-1024.webp 1024w, img/hero-vesuvio-1536.webp 1536w" sizes="(max-width: 860px) 94vw, 60vw" width="1536" height="1024" loading="lazy" alt="Materasso trapuntato su una base blu, con l'ombra del Vesuvio proiettata sul muro">
        <svg class="stitch-svg stitch-svg--inview" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs><mask id="sew2"><path class="reveal" pathLength="1" d="${RIDGE}"/></mask></defs>
          <path class="thread" d="${RIDGE}" mask="url(#sew2)"/></svg>
      </div>
    </figure>
    <div class="statement__text rv" style="--d:1">
      <h2 id="st-title">Il Vesuvio ce l'abbiamo davanti ogni mattina.</h2>
      <p>Per questo il nostro marchio ha il suo profilo, e per questo cuciamo ogni materasso come si faceva in bottega: a mano dove serve, con materiali scelti e controllati in fabbrica.</p>
      <a class="btn btn--primary" href="${u('/materassi/')}">Scegli il tuo materasso</a>
    </div>
  </div></section>`;
}

function layersHtml(idx, p) {
  const m = mediaFor(idx, p).find((x) => x.slot === 'exploded' && x.hotspots?.length);
  if (!m) return '';
  const src = imgTag(m, { sizes: '(max-width: 860px) 94vw, 58vw' });
  if (!src) return '';
  return `<div class="layers" data-layers>
    <figure class="layers__fig">${src}
      ${m.hotspots.map((h, i) => `<button class="hot" style="left:${h.x}%;top:${h.y}%" data-act="layer" data-i="${i}" aria-pressed="${i === 0}" aria-label="${esc(h.title)}">${i + 1}</button>`).join('')}
    </figure>
    <ol class="layers__list">${m.hotspots
      .map((h, i) => `<li><button data-act="layer" data-i="${i}" aria-pressed="${i === 0}"><span class="n" aria-hidden="true">${i + 1}</span><span><strong>${esc(h.title)}</strong><span class="d">${esc(h.text)}</span></span></button></li>`)
      .join('')}</ol>
  </div>`;
}

const SW = { cover: '#fbf9f4', memory: '#a9d0ea', foam: '#f3ead6', springs: '#e9eef2', base: '#2a6f8f' };
function labHtml(idx) {
  const models = idx.publicProducts('materasso').filter((p) => layersFor(p));
  if (!models.length) return '';
  const cur = models.find((p) => p.id === state.labModel) ?? models[models.length - 1];
  state.labModel = cur.id;
  const ls = layersFor(cur);
  return `<div class="lab">
    <div class="lab__stage" id="lab-stage" data-autoexplode style="--ex:0">
      ${productIllustration(cur, 'materasso', { gap: 34 })}
      <label class="lab__slider">Chiuso <input type="range" min="0" max="100" value="0" data-act="lab-ex" aria-label="Apri gli strati"> Aperto</label>
    </div>
    <div>
      <h2 id="lab-title">Apri il materasso, strato per strato</h2>
      <p class="muted">Scegli un modello e trascina il cursore: vedi come è composto, dal rivestimento alla base.</p>
      <div class="lab__models chips" role="group" aria-label="Modello">${models
        .map((p) => `<button class="chip" data-act="lab-model" data-id="${esc(p.id)}" aria-pressed="${p.id === cur.id}">${esc(p.name.replace('Vesuvio ', ''))}</button>`)
        .join('')}</div>
      <ol class="lab__legend">${ls
        .map((l, i) => `<li><button data-act="lab-layer" data-i="${ls.length - 1 - i}" aria-pressed="false"><span class="sw" style="background:${SW[l.k]}" aria-hidden="true"></span><span><strong>${esc(l.label)}</strong><span class="d">${esc(l.note)}</span></span></button></li>`)
        .join('')}</ol>
      <div class="btn-row"><a class="btn btn--primary" href="${href.product(cur)}" data-act="to-product">Scopri ${esc(cur.name.replace('Vesuvio ', ''))}</a><span class="price" style="align-self:center">${priceFrom(idx, cur)}</span></div>
    </div>
  </div>`;
}

function openStatus() {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const wd = parts.find((x) => x.type === 'weekday').value;
    const mins = Number(parts.find((x) => x.type === 'hour').value) * 60 + Number(parts.find((x) => x.type === 'minute').value);
    const open = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(wd) ? mins >= 540 && mins < 1080 : wd === 'Sat' ? mins >= 600 && mins < 840 : false;
    return open ? '<span class="open-now is-open">Aperto ora</span>' : '<span class="open-now is-closed">Ora chiuso: controlla gli orari</span>';
  } catch {
    return '';
  }
}

function showroomHtml(compact = false) {
  const dest = encodeURIComponent('Via Raffaele Salierno 38, 80026 Casoria NA');
  return `<div class="showroom">
    <div class="rv">
      ${compact ? '<h2>Vieni a provarli in fabbrica</h2>' : ''}
      ${openStatus()}
      <p class="lead">Fabbrica, esposizione e showroom sono nello stesso posto: puoi provare i materassi e parlare con chi li produce.</p>
      <address style="font-style:normal;margin-bottom:16px"><strong>Vesuvio Sleep</strong><br>Via Raffaele Salierno 38<br>80026 Casoria (NA)</address>
      <dl class="hours"><dt>Lunedì–venerdì</dt><dd>09:00–18:00</dd><dt>Sabato</dt><dd>10:00–14:00</dd><dt>Domenica</dt><dd>Chiuso</dd></dl>
      <div class="btn-row">
        <a class="btn btn--primary" href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener">${icon('pin', 20)} Indicazioni stradali</a>
        <a class="btn btn--ghost" href="https://maps.apple.com/?daddr=${dest}" target="_blank" rel="noopener">Apri in Mappe</a>
      </div>
    </div>
    <div class="showroom__media rv" style="--d:1">${slotHtml('showroom')}<div class="map-card">
      <svg class="mapbg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="400" height="300" fill="#e3eef3"/>
        <g fill="none" stroke="#fffcf7" stroke-width="12" stroke-linecap="round"><path d="M-10 210 C80 190 160 200 240 160 S360 90 420 80"/><path d="M120 -10 C130 80 150 160 140 320"/></g>
        <g fill="none" stroke="#f6f1e8" stroke-width="5"><path d="M-10 90 L420 130"/><path d="M260 -10 L300 320"/><path d="M40 320 L200 -10"/><path d="M-10 260 L420 250"/></g>
        <path d="M250 300 C270 230 300 215 330 170 C350 150 370 160 400 140" fill="none" stroke="#c8785b" stroke-width="2" stroke-dasharray="6 6" opacity=".6"/>
      </svg>
      <span class="pin-dot" aria-hidden="true"></span>
      <div class="pin" style="margin-top:110px">${icon('pin', 24)}<p style="margin:6px 0 0"><strong>Via Raffaele Salierno 38, Casoria</strong></p></div>
    </div></div>
  </div>`;
}

function viewHome() {
  const idx = pub();
  const cats = idx.commercialCategories();
  if (!cats.some((c) => c.kind === state.homeKind) && cats[0]) state.homeKind = cats[0].kind;
  const pocket = idx.publicProducts('materasso').find((p) => mediaFor(idx, p).some((m) => m.slot === 'exploded' && m.hotspots));
  setMeta(VIEW_SEO.home.metaTitle, VIEW_SEO.home.description, [websiteJsonLd(abs('')), localBusinessJsonLd(abs('/'), { image: absAsset(SHARE_IMG), logo: absAsset('img/logo.png') })], { path: P.home });
  const slides = heroSlides();
  const staticHero = state.lastRoute === undefined && slides.every((x) => !x.uploaded) ? $('#app > .hero') : null;
  app.innerHTML = `${staticHero ? '' : heroHtml(slides)}

  <section class="quilt" aria-labelledby="num-title"><div class="wrap numbers">
    <h2 id="num-title" class="rv">Una fabbrica vera, con numeri veri.</h2>
    <div class="num rv" style="--d:1"><b data-count="1986" data-from="1950">1986</b><span>l'anno in cui abbiamo iniziato</span></div>
    <div class="num rv" style="--d:2"><b data-count="40" data-from="0">40</b><span>anni di produzione a Casoria</span></div>
    <div class="num rv" style="--d:3"><b data-count="13" data-from="0">13</b><span>misure standard, più il su misura</span></div>
  </div></section>

  ${statementHtml()}

  <div class="kinetic" aria-hidden="true">
    <div class="kinetic__row"><span>Memory Foam</span><i></i><span>Molle insacchettate</span><i></i><span>Poliuretano espanso</span><i></i><span>Memory Foam</span><i></i><span>Molle insacchettate</span><i></i><span>Poliuretano espanso</span><i></i></div>
    <div class="kinetic__row kinetic__row--rev"><span>Cuciti a Casoria</span><i></i><span>Dal 1986</span><i></i><span>Su misura</span><i></i><span>Prezzo di fabbrica</span><i></i><span>Cuciti a Casoria</span><i></i><span>Dal 1986</span><i></i><span>Su misura</span><i></i></div>
  </div>

  <section class="section" aria-labelledby="cat-title">
    <div class="wrap">
      <div class="sec-head rv"><div><h2 id="cat-title">Il catalogo, direttamente dalla fabbrica</h2><p>Prezzi di fabbrica, IVA inclusa. Scorri i modelli e apri la scheda per scegliere misura e altezza.</p></div>
        <a class="btn btn--ghost btn--sm" href="${u(P.compare)}">Confronta i materassi</a></div>
      <div class="seg-tabs" role="tablist" aria-label="Categorie">${cats
        .map((c) => `<button class="tab" role="tab" id="tab-${c.kind}" aria-selected="${c.kind === state.homeKind}" aria-controls="home-grid" data-act="home-tab" data-kind="${c.kind}" tabindex="${c.kind === state.homeKind ? 0 : -1}">${esc(c.name)}<small>${idx.publicProducts(c.kind).length}</small></button>`)
        .join('')}<span class="seg-tabs__thumb" aria-hidden="true"></span></div>
      <div id="home-grid" role="tabpanel" aria-labelledby="tab-${state.homeKind}">${homeGrid(idx)}</div>
    </div>
  </section>

  <section class="section factory" aria-labelledby="lab-title"><div class="wrap">${labHtml(idx)}</div></section>

  <section class="factory-band" aria-labelledby="fab-title">
    ${(() => {
      const fbi = siteImage('fabbrica_panoramica');
      return fbi
        ? `<div class="factory-band__img kb"><img src="${esc(fbi.src)}" ${fbi.srcset ? `srcset="${esc(fbi.srcset)}" sizes="100vw"` : ''} loading="lazy" decoding="async" alt="${esc(fbi.alt)}"></div>`
        : `<div class="factory-band__img"><img src="img/lavorazione-1600.webp" loading="lazy" alt="Scena illustrativa di un laboratorio di materassi"></div>`;
    })()}
    <span class="factory-band__year" aria-hidden="true">1986</span>
    <div class="wrap factory-band__body">
      <h2 id="fab-title" class="rv">Siamo una fabbrica, non un rivenditore.</h2>
      <p class="rv" style="--d:1">Tagliamo, assembliamo e cuciamo i materassi nel nostro stabilimento di Casoria, poi li vendiamo direttamente a te. Made in Italy.</p>
      <dl>
        <div class="rv" style="--d:2"><dt>Produzione diretta</dt><dd>Circa 2 giorni di lavorazione prima della spedizione.</dd></div>
        <div class="rv" style="--d:3"><dt>Su misura, se serve</dt><dd>Fuori misura e altezze personalizzate, su preventivo.</dd></div>
        <div class="rv" style="--d:4"><dt>Hotel e B&amp;B</dt><dd>Forniture anche in grandi quantità. <a href="${u(P.quote)}">Richiedi un preventivo</a>.</dd></div>
      </dl>
    </div>
  </section>
  ${filmstripHtml()}

  ${pocket ? `<section class="section" aria-labelledby="inside-title"><div class="wrap">
      <div class="sec-head rv"><div><h2 id="inside-title">Dentro il ${esc(pocket.name.replace('Vesuvio ', ''))}</h2><p>Il nostro Hybrid: tocca i numeri per vedere i componenti.</p></div>
      <a class="btn btn--ghost btn--sm" href="${href.product(pocket)}">Vai alla scheda</a></div>
      <div class="rv">${layersHtml(idx, pocket)}</div>
  </div></section>` : ''}

  <section class="section--tight"><div class="wrap">
    <div class="match2 rv">
      <div class="match2__text">
        <h2>Non sai quale scegliere?</h2>
        <p>Sleep Match ti fa qualche domanda su come dormi e ti propone un solo materasso del nostro catalogo, con il perché. Non chiediamo il budget e non salviamo le risposte.</p>
        <p class="match2__q" id="mq">Iniziamo: come dormi di solito?</p>
        <div class="chips" role="group" aria-labelledby="mq">${[['fianco', 'Sul fianco'], ['schiena', 'Sulla schiena'], ['pancia', 'A pancia in giù'], ['mista', 'Cambio spesso']]
          .map(([v, l]) => `<button class="chip" data-act="sm-start" data-v="${v}">${l}</button>`)
          .join('')}</div>
      </div>
      <div class="match2__img kb">${(() => {
        const g = siteImage('testata_materasso');
        return g ? `<img src="${esc(g.src)}" ${g.srcset ? `srcset="${esc(g.srcset)}" sizes="(max-width: 860px) 100vw, 45vw"` : ''} loading="lazy" decoding="async" alt="${esc(g.alt)}">` : '';
      })()}</div>
    </div>
  </div></section>

  <section class="section" aria-labelledby="ship-title"><div class="wrap">
    <div class="sec-head rv"><div><h2 id="ship-title">Dalla fabbrica a casa tua</h2></div></div>
    <div class="ship">
      <div class="ship__card rv"><svg class="ship__route" viewBox="0 0 180 90" aria-hidden="true"><path d="M10 70 C50 20 110 80 170 20"/></svg>
        <div class="ship__big">0 €</div><h3>Spedizione in tutta Italia</h3><p class="muted">Isole comprese, con corriere e tracking.</p>
        <ul><li>${icon('check', 20)}Nessun supplemento per le isole</li><li>${icon('check', 20)}Tracking del corriere</li><li>${icon('check', 20)}Circa 2 giorni di produzione per i materassi</li></ul></div>
      <div class="ship__card ship__card--deep ship__card--photo rv" style="--d:1">${slotHtml('consegna', { cls: 'ship__photo kb', ratio: '16 / 9', sizes: '(max-width: 860px) 92vw, 45vw' })}
        <div class="ship__big">Napoli</div><h3>Con il nostro furgone</h3><p class="muted">Consegniamo noi, con qualche servizio in più.</p>
        <ul><li>${icon('check', 20)}Consegna al piano gratuita</li><li>${icon('check', 20)}Ritiro del vecchio materasso</li><li>${icon('check', 20)}Montaggio delle reti</li></ul></div>
    </div>
  </div></section>

  <section class="section factory" aria-labelledby="show-title"><div class="wrap"><h2 id="show-title" class="sr-only">Showroom</h2>${showroomHtml(true)}</div></section>`;
  if (staticHero) app.prepend(staticHero);
  else $('#app > .hero')?.classList.remove('is-intro');
  initHero($('#app > .hero'));
  tiltCards(app);
  requestAnimationFrame(moveThumb);
  bindLab();
}
function heroSlides() {
  return HERO_SLIDES.map((key) => {
    const img = siteImage(key);
    return img ? { key, ...img, caption: HERO_CAPTIONS[key], illustrative: !img.uploaded } : null;
  }).filter(Boolean);
}
/** Vetrina della home: l'elenco dei modelli a sinistra, il prodotto in scena a destra. */
function homeGrid(idx) {
  const items = idx.publicProducts(state.homeKind);
  const cat = idx.snap.categories.find((c) => c.kind === state.homeKind);
  return `<div class="showcase" data-showcase>
    <ol class="showcase__list">${items
      .map((p, i) => {
        const min = idx.minPrice(p);
        const hs = state.homeKind === 'materasso' ? idx.purchasableHeights(p) : [];
        return `<li class="showcase__item${i === 0 ? ' is-active' : ''}" style="--i:${i}">
          <a class="showcase__row" href="${href.product(p)}" data-show="${i}">
            <span class="showcase__name">${esc(p.name.replace(/^Vesuvio /, ''))}</span>
            <span class="showcase__tech">${esc(p.technical_name)}${hs.length ? ' · ' + hs.map((h) => 'H' + h).join(' ') : ''}</span>
            <span class="showcase__price">${min !== null ? `<small>da</small> ${formatCents(min)}` : ''}</span>
            <span class="showcase__go" aria-hidden="true">${icon('arrow', 22)}</span>
          </a>
          <figure class="showcase__fig" aria-hidden="true">${coverHtml(idx, p, { sizes: '(max-width: 900px) 80vw, 46vw' })}${p.hybrid ? '<span class="card__flag">Hybrid</span>' : ''}</figure>
        </li>`;
      })
      .join('')}</ol>
    <div class="showcase__floor" aria-hidden="true"></div>
  </div>
  <p class="showcase__all"><a class="btn btn--ghost btn--sm" href="${u('/' + cat?.slug + '/')}">Tutti i ${esc(KIND_PLURAL[state.homeKind].toLowerCase())}, con filtri</a></p>`;
}
function moveThumb() {
  const th = $('.seg-tabs__thumb');
  const t = $('.seg-tabs .tab[aria-selected="true"]');
  if (!th || !t) return;
  th.style.width = t.offsetWidth + 'px';
  th.style.transform = `translateX(${t.offsetLeft}px)`;
}
function bindLab() {
  const st = $('#lab-stage');
  if (!st) return;
  st.addEventListener('vs:visible', () => explode(st, 0.8, 1400), { once: true });
}

/** Nastro fotografico che scorre: la fabbrica in movimento. */
function filmstripHtml() {
  const items = [
    ['fabbrica_cucito', 'Il cucito della fascia'],
    ['fabbrica_taglio', 'Il taglio delle lastre'],
    ['testata_materasso', 'La trapuntatura'],
    ['fabbrica_materiali', 'I materiali'],
    ['showroom', 'Lo showroom'],
    ['testata_rete', 'Le reti a doghe'],
  ];
  const tiles = items.map(([k, l]) => `<li class="film__item">${slotHtml(k, { ratio: '4 / 5', label: l, sizes: '300px' })}</li>`).join('');
  return `<section class="film" aria-labelledby="film-title">
    <div class="wrap sec-head rv"><div><h2 id="film-title">Dentro la fabbrica</h2><p>Dal taglio delle lastre al bordino cucito a mano: ogni materasso passa da queste mani.</p></div></div>
    <div class="film__viewport"><ul class="film__track">${tiles}</ul><ul class="film__track" aria-hidden="true">${tiles}</ul></div>
  </section>`;
}

/** Testata scura e trapuntata per le pagine interne, con foto quando c'è. */
function pageHero(items, title, lead = '', art = '', photo = null) {
  return `<header class="page-hero${photo ? ' page-hero--photo' : ''}">${photo ? `<div class="page-hero__bg kb"><img src="${esc(photo.src)}" ${photo.srcset ? `srcset="${esc(photo.srcset)}" sizes="100vw"` : ''} alt="" decoding="async"></div>` : ''}${crumbs(items)}<div class="wrap"><h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>${art && !photo ? `<div class="page-hero__art" aria-hidden="true">${art}</div>` : ''}</header>`;
}

// ---------------------------------------------------------------- CATEGORIA
function viewCategory(c) {
  const idx = pub();
  const all = idx.publicProducts(c.kind);
  const f = state.filters;
  const isM = c.kind === 'materasso';
  const seo = CATEGORY_SEO[c.kind];
  const minAll = all.map((p) => idx.minPrice(p)).filter((x) => x !== null);
  const from = minAll.length ? formatCents(Math.min(...minAll)) : '';
  const tr = trail([{ name: 'Home', path: P.home }, { name: c.name, path: catPath(c) }]);
  const firstImg = all.map((p) => coverFor(idx, p)).find(Boolean);
  setMeta(c.seo_title || seo?.metaTitle || `${c.name} di fabbrica`, c.seo_description || seo?.description(from) || c.description, [
    tr.ld,
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: c.name,
      itemListElement: all.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(prodPath(p, c)), name: p.name })),
    },
  ], { image: firstImg ? media.resolve(firstImg) : undefined });
  const body = () => {
    let list = all.slice();
    if (isM) {
      if (f.tech !== 'all') list = list.filter((p) => p.match?.tech === f.tech);
      if (f.removable) list = list.filter((p) => p.removable_cover);
      if (f.height) list = list.filter((p) => idx.purchasableHeights(p).includes(f.height));
    }
    if (f.sort === 'asc') list.sort((a, b) => idx.minPrice(a) - idx.minPrice(b));
    if (f.sort === 'desc') list.sort((a, b) => idx.minPrice(b) - idx.minPrice(a));
    if (!all.length)
      return `<div class="empty"><h3>Nessun articolo acquistabile in questa categoria</h3><p>Stiamo completando prezzi e schede. Nel frattempo puoi chiederci informazioni.</p><a class="btn btn--ghost" href="${u(P.quote)}">Chiedi un preventivo</a></div>`;
    if (!list.length)
      return `<div class="empty"><h3>Nessun materasso con questi filtri</h3><p>Prova a togliere un filtro: la gamma è piccola e ogni modello ha caratteristiche diverse.</p><button class="btn btn--ghost" data-act="reset-filters">Azzera i filtri</button></div>`;
    return `<h2 class="sr-only">${esc(c.name)}: i modelli</h2><p class="small muted" aria-live="polite">${list.length} ${list.length === 1 ? 'modello' : 'modelli'}</p><div class="grid${list.length >= 4 && list.length % 3 !== 0 ? ' grid--feat' : ''}">${list.map((p) => productCard(idx, p, { compare: isM })).join('')}</div>`;
  };
  const chip = (key, val, label) => `<button class="chip" data-act="filter" data-k="${key}" data-v="${val}" aria-pressed="${String(f[key]) === String(val)}">${label}</button>`;
  const artP = all[all.length - 1];
  const head = siteImage({ materasso: 'testata_materasso', rete: 'testata_rete', guanciale: 'testata_guanciale' }[c.kind]);
  app.innerHTML = `${pageHero(tr.ui, c.name, c.description, artP ? productIllustration(artP, c.kind) : '', head)}
  <div class="wrap" style="padding-top:28px">
    <div class="toolbar">
      ${isM ? `<div class="chips" role="group" aria-label="Tecnologia">${chip('tech', 'all', 'Tutti')}${chip('tech', 'foam', 'Poliuretano')}${chip('tech', 'memory', 'Memory Foam')}${chip('tech', 'molle', 'Molle')}</div>
      <div class="chips" role="group" aria-label="Altezza e rivestimento">${[20, 25, 30].map((h) => chip('height', h, 'H' + h)).join('')}<button class="chip" data-act="filter" data-k="removable" data-v="toggle" aria-pressed="${f.removable}">Sfoderabile</button></div>` : '<span></span>'}
      <label><span class="sr-only">Ordina</span><select class="select" data-act="sort">
        <option value="reco" ${f.sort === 'reco' ? 'selected' : ''}>Ordine consigliato</option>
        <option value="asc" ${f.sort === 'asc' ? 'selected' : ''}>Prezzo crescente</option>
        <option value="desc" ${f.sort === 'desc' ? 'selected' : ''}>Prezzo decrescente</option></select></label>
    </div>
    <div id="cat-body">${body()}</div>
    ${isM ? `<p style="margin-top:28px" class="muted">Cerchi una misura o un'altezza diversa? <a href="${u(P.quote)}">Chiedi un preventivo fuori misura</a>.</p>` : ''}
    ${seo ? `<section class="seo-text prose">${seo.html()}</section>` : ''}
  </div>`;
  state.catBody = body;
}

// ---------------------------------------------------------------- SCHEDA
function getSel(idx, p) {
  const s = state.sel[p.id] ?? {};
  // sul sito pubblico esistono solo le combinazioni con prezzo
  const pv = idx.purchasableVariants(p);
  const sizes = idx.purchasableSizes(p);
  const heights = idx.purchasableHeights(p);
  let size = s.size && sizes.includes(s.size) ? s.size : sizes.includes('160x190') ? '160x190' : sizes[0] ?? null;
  let height = s.height && heights.includes(s.height) ? s.height : null;
  if (height === null || (size && !pv.some((v) => v.size === size && v.height_cm === height))) {
    height = pv.some((v) => v.height_cm === 25 && v.size === size) ? 25 : pv.find((v) => v.size === size)?.height_cm ?? heights[0] ?? null;
  }
  if (!heights.length) height = pv[0]?.height_cm ?? null;
  return (state.sel[p.id] = { size, height, qty: s.qty ?? 1 });
}

const PRODUCT_PHRASE = {
  rete: () => 'rete a doghe in legno',
  topper: () => 'topper in Memory Foam',
  guanciale: () => 'guanciale',
  letto: () => 'letto a castello',
  materasso: (p) =>
    p.match?.tech === 'molle' ? (p.hybrid ? 'materasso a molle insacchettate e Memory' : 'materasso a molle insacchettate') : p.match?.tech === 'memory' ? 'materasso in Memory Foam' : 'materasso in poliuretano espanso',
};
function productSeo(idx, p, kind) {
  const min = idx.minPrice(p);
  const sizes = idx.purchasableSizes(p).length;
  const hs = kind === 'materasso' ? idx.purchasableHeights(p) : [];
  const title = `${p.name}, ${PRODUCT_PHRASE[kind]?.(p) ?? kind}`;
  const parts = [
    p.short,
    min !== null ? `Da ${formatCents(min)} IVA inclusa.` : '',
    sizes ? `${sizes} ${sizes === 1 ? 'misura' : 'misure'}${hs.length ? ', H' + hs.join('/H') : ''}.` : '',
    'Spedizione gratuita.',
  ].filter(Boolean);
  // massimo circa 160 caratteri: si tolgono prima le informazioni meno importanti
  while (parts.join(' ').length > 160 && parts.length > 2) parts.splice(parts.length - 2, 1);
  return { title, desc: parts.join(' ') };
}
function viewProduct(slug, catSlug) {
  const idx = pub();
  const p = idx.snap.products.find((x) => x.slug === slug && (x.status === 'published' || previewDrafts()));
  if (!p) {
    // vecchi indirizzi (es. pocket-2400-elite -> pocket-2600-elite): redirect permanente
    const to = resolveProductPath(slug);
    if (to && to !== current().path) return go(to, { replace: true });
  }
  const c = p && idx.category(p);
  if (!p || !c || (c.status !== 'published' && !previewDrafts())) return viewNotFound();
  if (catSlug !== c.slug) return go(prodPath(p, c), { replace: true });
  const kind = c.kind;
  const ms = mediaFor(idx, p);
  const gallery = ms.length ? ms : [];
  const urlImgs = gallery.map((m) => media.resolve(m)).filter((u) => u && !u.startsWith('blob:'));
  const tr = trail([{ name: 'Home', path: P.home }, { name: c.name, path: catPath(c) }, { name: p.name, path: prodPath(p, c) }]);
  const seo = productSeo(idx, p, kind);
  setMeta(p.seo_title || seo.title, p.seo_description || seo.desc, [
    productJsonLd(idx, p, { images: urlImgs.map(absAsset), url: abs(prodPath(p, c)), site: abs('') }),
    tr.ld,
  ], { image: urlImgs[0], type: 'product' });
  const purchasable = idx.isProductPurchasable(p);
  const showClaims = store.db.settings.show_claims && p.claims?.length;
  const factsRows = [
    ['Tecnologia', p.technical_name],
    ['Composizione', p.composition],
    kind === 'materasso' ? ['Altezze', idx.heightsOf(p).map((h) => `H${h}`).join(', ')] : null,
    kind === 'guanciale' ? ['Altezza', idx.variantsOf(p)[0]?.height_cm ? idx.variantsOf(p)[0].height_cm + ' cm' : null] : null,
    p.removable_cover !== null && kind !== 'rete' ? ['Rivestimento', p.removable_cover ? 'Sfoderabile, lavaggio secondo le indicazioni in etichetta' : 'Non sfoderabile'] : null,
    p.summer_winter ? ['Lati', 'Reversibile: lato invernale e lato estivo'] : null,
    p.firmness_display ? ['Rigidità indicativa', p.firmness_display] : null,
    showClaims ? ['Tessuto', p.claims.join(', ')] : null,
    p.lead_time ? ['Produzione', p.lead_time] : null,
  ].filter((r) => r && r[1]);

  const layers = kind === 'materasso' || kind === 'topper' ? layersFor(p) : null;
  const exploded = gallery.find((m) => m.slot === 'exploded');
  const fabric = gallery.find((m) => m.slot === 'fabric');
  const tiles = [
    kind === 'materasso' && idx.purchasableHeights(p).length ? [idx.purchasableHeights(p).map((h) => h).join(' · '), 'cm di altezza'] : null,
    idx.purchasableSizes(p).length ? [String(idx.purchasableSizes(p).length), 'misure standard'] : null,
    p.firmness_display ? [p.firmness_display, 'rigidità indicativa'] : null,
    p.removable_cover !== null && kind !== 'rete' ? [p.removable_cover ? 'Sfoderabile' : 'Fisso', 'rivestimento'] : null,
    kind === 'rete' ? ['Inclusi', 'piedi'] : null,
  ].filter(Boolean).slice(0, 4);

  app.innerHTML = `${crumbs(tr.ui)}
  <div class="wrap pdp-top">
    <div class="pdp">
      <div class="gallery" data-gallery>${galleryHtml(idx, p, gallery, 0)}</div>
      <div class="buy" id="buy"></div>
    </div>
  </div>

  <section class="pdp-story"><div class="wrap pdp-story__in">
    <div class="pdp-story__text">
      <h2 class="pdp-h2 rv">Com'è fatto</h2>
      ${p.description ? `<p class="pdp-story__lead rv" style="--d:1">${esc(p.description)}</p>` : ''}
      ${p.hybrid ? '<p class="small muted rv" style="--d:2">Chiamiamo Hybrid i materassi che uniscono molle insacchettate e Memory Foam.</p>' : ''}
      ${tiles.length ? `<ul class="tiles">${tiles.map(([v, k], i) => `<li class="rv" style="--d:${i + 1}"><strong>${esc(v)}</strong><span>${esc(k)}</span></li>`).join('')}</ul>` : ''}
    </div>
    <div class="pdp-story__facts rv" style="--d:1"><h2 class="sr-only">Caratteristiche</h2><dl class="facts-list">${factsRows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
  </div></section>

  ${layers && exploded ? `<section class="anatomy" aria-labelledby="anat-t"><div class="wrap anatomy__in">
      <figure class="anatomy__fig" data-anatomy>${imgTag(exploded, { sizes: '(max-width: 900px) 92vw, 52vw' })}</figure>
      <div class="anatomy__text">
        <h2 id="anat-t" class="rv">Strato per strato</h2>
        <p class="anatomy__sub rv" style="--d:1">Dall'alto verso il basso, ecco cosa c'è dentro.</p>
        <ol class="anatomy__list">${layers.map((l, i) => `<li class="rv" style="--d:${i + 1}"><span class="anatomy__sw" style="--c:${SW[l.k] ?? '#ccc'}"></span><div><strong>${esc(l.label)}</strong><span>${esc(l.note)}</span></div></li>`).join('')}</ol>
      </div>
  </div></section>` : ''}

  ${fabric ? `<section class="fabric"><div class="wrap fabric__in">
      <div class="fabric__text">
        <h2 class="pdp-h2 rv">Il rivestimento, da vicino</h2>
        <ul class="ticks rv" style="--d:1">
          ${p.removable_cover === true ? '<li>Sfoderabile: si apre con la cerniera</li>' : p.removable_cover === false ? '<li>Rivestimento fisso, non sfoderabile</li>' : ''}
          ${p.summer_winter ? '<li>Reversibile: un lato invernale e un lato estivo</li>' : ''}
          ${showClaims ? `<li>Tessuto ${esc(p.claims.slice(0, 3).join(', '))}</li>` : ''}
          <li>Trapuntato e cucito nella nostra fabbrica di Casoria</li>
        </ul>
      </div>
      <figure class="fabric__fig kb">${imgTag(fabric, { sizes: '(max-width: 900px) 92vw, 46vw', cls: 'is-cover' })}</figure>
  </div></section>` : ''}

  <div class="wrap">
    <section class="section--tight" id="pairings" aria-labelledby="pair-t"></section>
    <section class="section--tight"><ul class="promise">
      <li class="rv">${icon('truck', 26)}<h3>Consegna gratuita</h3><p>Spedizione ${esc(store.db.settings.shipping_note)}. A Napoli consegna al piano e ritiro dell'usato${kind === 'rete' ? ', con montaggio' : ''}.</p><a href="${u(P.shipping)}">Spedizioni e consegna</a></li>
      <li class="rv" style="--d:1">${icon('check', 26)}<h3>Paghi alla consegna</h3><p>In contrassegno oppure con bonifico. Sul sito non si paga e non si inseriscono carte.</p><a href="${u(P.payments)}">Come si paga</a></li>
      <li class="rv" style="--d:2">${icon('ruler', 26)}<h3>Anche su misura</h3><p>Fuori misura e altezze personalizzate: ti mandiamo un preventivo su WhatsApp.</p><a href="${u(P.quote)}" data-act="quote-for" data-id="${esc(p.id)}">Chiedi un preventivo</a></li>
    </ul></section>
  </div>
  ${purchasable ? `<div class="sticky-buy" id="sticky-buy" aria-hidden="true"></div>` : ''}`;
  renderBuy(idx, p);
  $('#gal-stage')?.addEventListener('vs:visible', (e) => explode(e.currentTarget, 0.6, 1300), { once: true });
  if (purchasable) {
    document.body.classList.add('has-sticky');
    // controllo sulla posizione (non IntersectionObserver: uno scroll veloce può saltare l'incrocio)
    const sb = $('#sticky-buy');
    let raf = 0;
    const update = () => {
      raf = 0;
      const btn = $('#add-btn');
      if (!btn || !sb.isConnected) return window.removeEventListener('scroll', onScroll);
      const show = btn.getBoundingClientRect().bottom < 0;
      if (sb.classList.contains('is-visible') === show) return;
      sb.classList.toggle('is-visible', show);
      sb.setAttribute('aria-hidden', String(!show));
      $$('button,a', sb).forEach((b) => (b.tabIndex = show ? 0 : -1));
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }
}

function galleryItems(idx, p, gallery) {
  const kind = idx.kind(p);
  const items = gallery.map((m) => ({ type: 'media', m }));
  // Senza nemmeno una foto si mostra il disegno del modello: è dichiarato come illustrazione.
  if (!items.length) items.push({ type: 'illus' });
  // Per ogni inquadratura prevista e non ancora fornita resta un segnaposto dichiarato:
  // meglio uno spazio vuoto e onesto che una foto di un altro materasso.
  const taken = new Set(gallery.map((m) => m.slot));
  for (const def of PRODUCT_SLOTS[kind] ?? []) if (!taken.has(def.slot)) items.push({ type: 'ph', def });
  return items;
}
function galleryHtml(idx, p, gallery, i) {
  const kind = idx.kind(p);
  const items = galleryItems(idx, p, gallery);
  const it = items[i] ?? items[0];
  let main;
  if (it.type === 'illus') {
    // le "aperture" degli strati solo dove la composizione è confermata
    const layered = (kind === 'materasso' || kind === 'topper') && !!layersFor(p);
    main = `<div class="gallery__main" id="gal-stage" ${layered ? 'data-autoexplode' : ''} style="--ex:0">${productIllustration(p, kind, { gap: 34 })}
      ${layered ? `<label class="gallery__ctrl">Chiuso <input type="range" min="0" max="100" value="0" data-act="gal-ex" aria-label="Apri gli strati"> Aperto</label>` : ''}</div>`;
  } else if (it.type === 'ph') {
    main = `<div class="gallery__main gallery__main--ph">${placeholderHtml({ ...it.def, ratio: '3 / 2' }, { cls: 'ph--fill' })}</div>`;
  } else {
    const m = it.m;
    const tag = imgTag(m, { sizes: '(max-width: 860px) 94vw, 58vw', eager: true, cls: fitCls(m) });
    main = `<div class="gallery__main${m.bg === 'white' ? ' gallery__main--stage' : ''}" data-tilt>${m.bg === 'white' ? '<span class="gallery__floor" aria-hidden="true"></span>' : ''}${tag || fallbackHtml(kind)}
      ${tag ? `<button class="icon-btn gallery__zoom" data-act="zoom" data-i="${gallery.indexOf(m)}" aria-label="Ingrandisci l'immagine">${icon('zoom')}</button>` : ''}
      ${m.caption ? `<span class="gallery__label">${esc(m.caption)}</span>` : ''}</div>`;
  }
  const thumb = (t, j) => {
    const inner = t.type === 'media' ? imgTag(t.m, { sizes: '80px' }) || '' : t.type === 'illus' ? productIllustration(p, kind) : `<span class="thumb__ph">${icon('image', 18)}</span>`;
    const label = t.type === 'media' ? t.m.alt : `Illustrazione di ${p.name}`;
    return `<button class="thumb ${t.type === 'ph' ? 'thumb--ph' : ''}" data-act="thumb" data-i="${j}" aria-current="${j === i}" aria-label="${esc(label)}">${inner}</button>`;
  };
  return `${main}${items.length > 1 ? `<div class="gal-dots" aria-hidden="true">${items.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div><div class="thumbs" role="group" aria-label="Immagini">${items.map(thumb).join('')}</div>` : ''}
`;
}

function renderBuy(idx, p) {
  const kind = idx.kind(p);
  const sel = getSel(idx, p);
  const sizes = idx.purchasableSizes(p);
  const heights = idx.purchasableHeights(p);
  const pv = idx.purchasableVariants(p);
  const v = pv.find((x) => (x.size ?? null) === (sel.size ?? null) && (kind === 'materasso' || kind === 'topper' ? x.height_cm === sel.height : true));
  const ok = v && pv.includes(v);
  const sizeOk = (s) => pv.some((x) => x.size === s && (!heights.length || kind !== 'materasso' || x.height_cm === sel.height));
  const heightOk = (h) => pv.some((x) => x.height_cm === h);
  const selectable = kind === 'materasso' && heights.length > 1;
  $('#buy').innerHTML = `
    <span class="buy__tech">${esc(p.technical_name)}</span>
    <h1>${esc(p.name)}</h1>
    <p>${esc(p.short)}</p>
    <div class="buy__price" aria-live="polite">${ok ? `<span class="price"><span class="price-flip ${state.lastPrice?.[p.id] !== undefined && state.lastPrice[p.id] !== v.price_cents ? 'is-new' : ''}">${formatCents(v.price_cents)}</span></span><span class="small muted">IVA inclusa${sel.size ? `, ${formatSize(sel.size)}` : ''}${v.height_cm && kind === 'materasso' ? ` H${v.height_cm}` : ''}</span>` : `<span class="small">Questa configurazione non è acquistabile online.</span>`}</div>
    ${ok ? availabilityHtml(v) : ''}
    ${selectable ? `<fieldset class="opt"><legend>Altezza</legend><div class="seg seg--h">${heights
      .map((h) => `<input type="radio" name="h" id="h${h}" value="${h}" data-act="pick-h" ${sel.height === h ? 'checked' : ''} ${heightOk(h) ? '' : 'disabled'}><label for="h${h}">H${h}</label>`)
      .join('')}</div></fieldset>` : ''}
    ${sizes.length ? `<fieldset class="opt"><legend>Misura${SIZE_NAMES[sel.size] ? ` <span class="opt__hint">${esc(SIZE_NAMES[sel.size])}</span>` : ''} <button type="button" class="link-btn" data-act="size-guide">Confronta due misure</button></legend><div class="seg">${sizes
      .map((s) => `<input type="radio" name="s" id="s${s}" value="${s}" data-act="pick-s" ${sel.size === s ? 'checked' : ''} ${sizeOk(s) ? '' : 'disabled'}><label for="s${s}">${formatSize(s)}</label>`)
      .join('')}</div>${footprint(sel.size)}</fieldset>` : ''}
    ${v ? `<p class="sku">SKU <span>${esc(v.sku)}</span></p>` : ''}
    <div class="buy__actions">
      <div class="qty" role="group" aria-label="Quantità"><button type="button" data-act="qty" data-d="-1" aria-label="Diminuisci">${icon('minus', 18)}</button><output aria-live="polite">${sel.qty}</output><button type="button" data-act="qty" data-d="1" aria-label="Aumenta">${icon('plus', 18)}</button></div>
      <button class="btn btn--primary" id="add-btn" data-act="add" ${ok ? '' : 'disabled'}>Aggiungi al carrello</button>
    </div>
    <div class="buy__extra" id="add-feedback" aria-live="polite"></div>
    <ul class="buy__trust"><li>${icon('truck', 18)} Spedizione gratuita in Italia</li><li>${icon('check', 18)} Paghi alla consegna o con bonifico</li><li>${icon('clock', 18)} Produzione in circa 2 giorni</li></ul>
    <div class="buy__extra">
      <a href="${u(P.quote)}" data-act="quote-for" data-id="${esc(p.id)}">Ti serve un'altra misura o un'altra altezza?</a>
      ${kind === 'materasso' ? `<a href="${u(P.compare)}" data-act="compare-with" data-id="${esc(p.id)}">Confronta con gli altri materassi</a>` : ''}
    </div>`;
  state.lastPrice = { ...(state.lastPrice ?? {}), [p.id]: ok ? v.price_cents : null };
  setTimeout(() => $('#buy')?.classList.add('is-live'), 1300);
  const fp = $('.footprint__box span');
  if (fp && state.prevFoot) {
    const [w, h] = [fp.style.width, fp.style.height];
    fp.style.width = state.prevFoot[0];
    fp.style.height = state.prevFoot[1];
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fp.style.width = w;
      fp.style.height = h;
    }));
  }
  if (fp) state.prevFoot = [fp.style.width, fp.style.height];
  const sb = $('#sticky-buy');
  if (sb)
    sb.innerHTML = ok
      ? `<div><div class="price">${formatCents(v.price_cents)}</div><div class="meta">${sel.size ? formatSize(sel.size) : ''}${v.height_cm && kind === 'materasso' ? ` · H${v.height_cm}` : ''}</div></div><button class="btn btn--primary" data-act="add">Aggiungi al carrello</button>`
      : `<div class="meta">Configurazione non acquistabile online</div><a class="btn btn--ghost btn--sm" href="#buy">Cambia</a>`;
  renderPairings(idx, p, sel.size);
}

function footprint(size) {
  const d = size && parseSize(size);
  if (!d) return '';
  const k = 64 / 220;
  return `<div class="footprint" aria-hidden="true"><div class="footprint__box"><span style="width:${(d.w * k).toFixed(1)}px;height:${(d.l * k).toFixed(1)}px"></span></div><span>Ingombro ${d.w} × ${d.l} cm, in scala con le altre misure</span></div>`;
}

function renderPairings(idx, p, size) {
  const el = $('#pairings');
  if (!el) return;
  const kind = idx.kind(p);
  const groups = pairingsFor(idx, p, kind === 'guanciale' ? null : size);
  if (!groups.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<h2 id="pair-t" class="pdp-h2">${kind === 'materasso' ? 'Completa il letto' : kind === 'rete' ? 'Il materasso per questa rete' : 'Si abbina bene con'}</h2>
    ${size && kind !== 'guanciale' ? `<p class="muted small">Ti proponiamo solo articoli nella misura ${formatSize(size)}.</p>` : ''}
    ${groups.map((g) => `<h3 class="pair-kind">${esc(KIND_PLURAL[g.kind])}</h3><div class="pair-row">${g.items.map((it) => pairHtml(idx, it)).join('')}</div>`).join('')}`;
}
function pairHtml(idx, it) {
  const p = it.product;
  const v = it.variant;
  const spec = v ? [v.size ? formatSize(v.size) : '', v.height_cm && idx.kind(p) === 'materasso' ? `H${v.height_cm}` : ''].filter(Boolean).join(' · ') : '';
  return `<div class="pair"><div class="pair__img">${coverHtml(idx, p, { sizes: '(max-width: 700px) 40vw, 220px' })}</div>
    <div><h4><a href="${href.product(p)}">${esc(p.name)}</a></h4><div class="meta">${esc(spec || p.technical_name)}</div>
      <div class="row"><strong>${v ? '' : '<small class="muted">da </small>'}${formatCents(it.fromPrice)}</strong>
      ${v ? `<button class="btn btn--ghost btn--sm" data-act="add-variant" data-id="${esc(v.id)}">Aggiungi</button>` : `<a class="btn btn--ghost btn--sm" href="${href.product(p)}">Scegli</a>`}</div></div></div>`;
}

// ---------------------------------------------------------------- SLEEP MATCH
const SM_STEPS = (a) => [
  { k: 'sleepers', q: 'Dormi da solo o in due?', o: [['single', 'Da solo', ''], ['couple', 'In due', 'Ti chiederemo qualcosa anche sull\'altra persona']] },
  { k: 'position', q: 'In che posizione dormi di solito?', o: [['fianco', 'Sul fianco', ''], ['schiena', 'Sulla schiena', ''], ['pancia', 'A pancia in giù', ''], ['mista', 'Cambio spesso', '']] },
  { k: 'me.weight', q: a.sleepers === 'couple' ? 'Fascia di peso: la tua' : 'In che fascia di peso sei?', o: [['lt60', 'Meno di 60 kg', ''], ['60-85', '60–85 kg', ''], ['85-110', '85–110 kg', ''], ['gt110', 'Oltre 110 kg', '']] },
  { k: 'me.feel', q: a.sleepers === 'couple' ? 'Che sensazione preferisci tu?' : 'Che sensazione preferisci?', o: [['accogliente', 'Più accogliente', 'Ti piace sentire il materasso che ti avvolge'], ['equilibrato', 'Equilibrata', 'Una via di mezzo'], ['sostenuto', 'Più sostenuta', 'Ti piace un piano deciso']] },
  ...(a.sleepers === 'couple'
    ? [
        { k: 'partner.weight', q: "Fascia di peso dell'altra persona", o: [['lt60', 'Meno di 60 kg', ''], ['60-85', '60–85 kg', ''], ['85-110', '85–110 kg', ''], ['gt110', 'Oltre 110 kg', '']] },
        { k: 'partner.feel', q: "E l'altra persona che sensazione preferisce?", o: [['accogliente', 'Più accogliente', ''], ['equilibrato', 'Equilibrata', ''], ['sostenuto', 'Più sostenuta', '']] },
        { k: 'partnerMotion', q: 'Ti dà fastidio sentire i movimenti di chi dorme accanto?', o: [['importante', 'Sì, molto', ''], ['poco', 'Non particolarmente', '']] },
      ]
    : []),
  { k: 'focus', q: 'Dove vuoi sentire più comfort?', o: [['spalle', 'Su spalle e fianchi', 'Un piano che accoglie'], ['schiena', 'Sotto la schiena', 'Un sostegno che non cede'], ['equilibrio', 'Nessuna preferenza', '']] },
  { k: 'heat', q: 'Di notte senti caldo?', o: [['spesso', 'Spesso', ''], ['a-volte', 'A volte', ''], ['raramente', 'Raramente', '']] },
  { k: 'tech', q: 'Hai già una preferenza sulla tecnologia?', o: [['non-so', 'Non saprei', 'Va benissimo'], ['foam', 'Poliuretano', ''], ['memory', 'Memory Foam', ''], ['molle', 'Molle insacchettate', '']] },
  { k: 'removable', q: 'Ti serve il rivestimento sfoderabile?', o: [['true', 'Sì, è importante', ''], ['false', 'Non è decisivo', '']] },
];
const getK = (o, k) => k.split('.').reduce((a, x) => a?.[x], o);
function setK(o, k, v) {
  const parts = k.split('.');
  let cur = o;
  while (parts.length > 1) {
    const x = parts.shift();
    cur = cur[x] ??= {};
  }
  cur[parts[0]] = v;
}
function viewSleepMatch() {
  setMeta(VIEW_SEO[P.sleepMatch].metaTitle, VIEW_SEO[P.sleepMatch].description, [trail([{ name: 'Home', path: P.home }, { name: 'Sleep Match', path: P.sleepMatch }]).ld]);
  state.sm ??= { step: 0, a: { me: {} } };
  renderSM();
}
function renderSM(animate = false) {
  const sm = state.sm;
  const steps = SM_STEPS(sm.a);
  const done = sm.step >= steps.length;
  let inner;
  if (!done) {
    const s = steps[sm.step];
    const cur = getK(sm.a, s.k);
    inner = `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${sm.step}" aria-label="Avanzamento"><span style="width:${(sm.step / steps.length) * 100}%"></span></div>
      <p class="small muted">Domanda ${sm.step + 1} di ${steps.length}</p>
      <fieldset class="opts" style="display:block"><legend class="q-title" style="font:800 clamp(1.5rem,3vw,2.1rem)/1.15 var(--f-display);color:var(--deep);margin-bottom:16px">${esc(s.q)}</legend>
      <div class="opts" style="margin:0">${s.o
        .map(([v, l, d], i) => `<div><input type="radio" name="sm" id="sm${i}" value="${v}" data-act="sm-pick" data-k="${s.k}" ${String(cur) === v ? 'checked' : ''}><label for="sm${i}"><strong>${esc(l)}</strong>${d ? `<span>${esc(d)}</span>` : ''}</label></div>`)
        .join('')}</div></fieldset>
      <div class="btn-row">${sm.step > 0 ? '<button class="btn btn--ghost" data-act="sm-back">Indietro</button>' : ''}<button class="btn btn--primary" data-act="sm-next" ${cur === undefined ? 'disabled' : ''}>${sm.step === steps.length - 1 ? 'Vedi il risultato' : 'Avanti'}</button></div>`;
  } else {
    const a = { ...sm.a, removable: sm.a.removable === 'true' || sm.a.removable === true };
    if (a.sleepers !== 'couple') delete a.partner;
    const idx = pub();
    const r = sleepMatch(idx, a);
    if (!r) inner = `<div class="empty"><h3>Al momento non possiamo proporti un modello</h3><p>Non ci sono materassi acquistabili online. Scrivici e ti consigliamo noi.</p><a class="btn btn--ghost" href="${u(P.showroom)}">Contatti e showroom</a></div>`;
    else {
      state.sel[r.product.id] = { ...(state.sel[r.product.id] ?? {}), height: r.height };
      inner = `<p class="small muted">Il tuo risultato</p><div class="result">
        <div class="result__img">${coverHtml(idx, r.product, { sizes: '(max-width:860px) 92vw, 40vw', eager: true })}</div>
        <div><span class="buy__tech">${esc(r.product.technical_name)}</span><h2>${esc(r.product.name)}</h2>
          <ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          ${r.heightReason ? `<p class="note">${esc(r.heightReason)}</p>` : ''}
          <p>${priceFrom(idx, r.product, r.height ?? null)} <span class="small muted">IVA inclusa${r.height ? `, H${r.height}` : ''}</span></p>
          <div class="btn-row"><a class="btn btn--primary" href="${href.product(r.product)}">Configura il tuo materasso</a><button class="btn btn--ghost" data-act="sm-restart">Ricomincia</button></div>
          <p class="small muted" style="margin-top:14px">È un'indicazione basata sulle tue risposte e sulle caratteristiche dei nostri modelli, non un parere medico. Le risposte non vengono salvate.</p></div></div>`;
    }
  }
  const html = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Sleep Match' }], 'Sleep Match', 'Rispondi a qualche domanda: ti proponiamo un solo materasso, con il perché.')}<div class="wrap section--tight"><div class="quiz" id="quiz">${inner}</div></div>`;
  if (animate && $('#quiz')) {
    swap($('#quiz'), inner);
    $('#quiz input, #quiz h2, #quiz button')?.focus({ preventScroll: true });
  } else app.innerHTML = html;
}

// ---------------------------------------------------------------- CONFRONTO
function viewCompare() {
  const idx = pub();
  const all = idx.publicProducts('materasso');
  if (state.compare.size === 0) all.slice(0, 3).forEach((p) => state.compare.add(p.id));
  const chosen = all.filter((p) => state.compare.has(p.id)).slice(0, 3);
  setMeta(VIEW_SEO[P.compare].metaTitle, VIEW_SEO[P.compare].description, [trail([{ name: 'Home', path: P.home }, { name: 'Confronta i materassi', path: P.compare }]).ld]);
  const yes = (b) => (b === true ? 'Sì' : b === false ? 'No' : '—');
  const rows = [
    ['Tecnologia', (p) => esc(p.technical_name)],
    ['Composizione', (p) => esc(p.composition)],
    ['Prezzo', (p) => `da <strong>${formatCents(idx.minPrice(p))}</strong>`],
    ['Altezze acquistabili', (p) => idx.purchasableHeights(p).map((h) => 'H' + h).join(', ')],
    ['Sfoderabile', (p) => yes(p.removable_cover)],
    ['Lato estivo e invernale', (p) => yes(!!p.summer_winter)],
    ['Fascia 3D traspirante', (p) => yes(!!p.match?.ventilation)],
    ['Molle indipendenti', (p) => yes(!!p.match?.independent_springs)],
    ['Rigidità indicativa', (p) => esc(p.firmness_display ?? '—')],
    ['', (p) => `<a class="btn btn--ghost btn--sm" href="${href.product(p)}">Vai alla scheda</a>`],
  ];
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Confronto' }], 'Confronta i materassi', 'Solo dati confermati dalla fabbrica, senza punteggi. Scegli fino a tre modelli.')}
  <div class="wrap" style="padding-top:28px">
    <div class="chips" role="group" aria-label="Modelli da confrontare" style="margin-bottom:20px">${all
      .map((p) => `<button class="chip" data-act="cmp-toggle" data-id="${esc(p.id)}" aria-pressed="${state.compare.has(p.id)}">${esc(p.name.replace('Vesuvio ', ''))}</button>`)
      .join('')}</div>
    ${chosen.length < 2 ? '<div class="empty"><p>Seleziona almeno due modelli per vedere il confronto.</p></div>' : `<div class="cmp" style="--n:${chosen.length}" role="table" aria-label="Confronto materassi">
      <div class="cmp__row cmp__row--head" role="row"><div class="k" role="columnheader"><span class="sr-only">Caratteristica</span></div>${chosen.map((p) => `<div role="columnheader">${esc(p.name.replace('Vesuvio ', ''))}</div>`).join('')}</div>
      ${rows.map(([k, f]) => `<div class="cmp__row" role="row">${k ? `<div class="k" role="rowheader">${esc(k)}</div>` : '<div class="k" role="rowheader"><span class="sr-only">Scheda</span></div>'}${chosen.map((p) => `<div role="cell">${f(p)}</div>`).join('')}</div>`).join('')}
    </div>`}
    <p class="small muted" style="margin-top:14px">La rigidità è un'indicazione da verificare provando il materasso in showroom.</p>
  </div>`;
}
function showCompareBar() {
  const n = state.compare.size;
  const bar = document.createElement('div');
  bar.className = 'compare-bar';
  bar.innerHTML = `<span>${n} ${n === 1 ? 'modello' : 'modelli'} da confrontare</span><a class="btn btn--sm" href="${u(P.compare)}">Confronta</a><button class="icon-btn" style="color:#fff" data-act="cmp-clear" aria-label="Svuota il confronto">${icon('close', 18)}</button>`;
  document.body.append(bar);
}

// ---------------------------------------------------------------- MISURE
const SIZE_NAMES = {
  '80x190': 'Singolo',
  '80x200': 'Singolo lungo',
  '90x190': 'Singolo largo',
  '90x200': 'Singolo largo, lungo',
  '120x190': 'Una piazza e mezza',
  '120x200': 'Una piazza e mezza, lungo',
  '140x190': 'Francese',
  '140x200': 'Francese lungo',
  '160x190': 'Matrimoniale',
  '160x200': 'Matrimoniale lungo',
  '165x190': 'Matrimoniale',
  '170x200': 'Matrimoniale grande',
  '180x200': 'King Size',
};
function sizesSvg(a, b) {
  const A = parseSize(a);
  const B = parseSize(b);
  const W = Math.max(A.w, B.w);
  const L = Math.max(A.l, B.l);
  const pad = 46;
  const vw = W + pad * 2;
  const vh = L + pad * 2;
  const rect = (s, c, stroke, dash) =>
    `<rect x="${pad}" y="${pad + (L - s.l)}" width="${s.w}" height="${s.l}" rx="6" fill="${c}" stroke="${stroke}" stroke-width="2.5" ${dash ? 'stroke-dasharray="8 6"' : ''}/>`;
  const big = A.w * A.l >= B.w * B.l ? [A, B, a, b] : [B, A, b, a];
  return `<svg viewBox="0 0 ${vw} ${vh}" role="img" aria-label="Confronto in scala tra ${formatSize(a)} e ${formatSize(b)} centimetri">
    ${rect(big[0], 'rgba(32,103,134,.12)', '#206786')}${rect(big[1], 'rgba(200,120,91,.16)', '#9a4f33', true)}
    <g font-family="Manrope, sans-serif" font-weight="700" fill="#0e3444" font-size="22">
      <text x="${pad + W / 2}" y="${pad - 14}" text-anchor="middle">${W} cm</text>
      <text x="${pad - 14}" y="${pad + L / 2}" text-anchor="middle" transform="rotate(-90 ${pad - 14} ${pad + L / 2})">${L} cm</text>
    </g></svg>`;
}
function viewSizes() {
  setMeta(VIEW_SEO[P.sizes].metaTitle, VIEW_SEO[P.sizes].description, [trail([{ name: 'Home', path: P.home }, { name: 'Misure dei materassi', path: P.sizes }]).ld]);
  const [a, b] = state.sizes;
  const opt = (sel) => STANDARD_SIZES.map((s) => `<option value="${s}" ${s === sel ? 'selected' : ''}>${formatSize(s)} – ${SIZE_NAMES[s]}</option>`).join('');
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Guida alle misure' }], 'Misure dei materassi', "Le 13 misure standard e il confronto in scala, vista dall'alto. La selezione resta quando torni alla scheda.")}
  <div class="wrap two-col" style="padding-top:28px">
    <div class="sizes-fig">
      <div class="row-2" style="margin-bottom:12px">
        <div class="field"><label for="sz-a">Prima misura</label><select id="sz-a" data-act="size-a">${opt(a)}</select></div>
        <div class="field"><label for="sz-b">Seconda misura</label><select id="sz-b" data-act="size-b">${opt(b)}</select></div>
      </div>
      <div id="sizes-svg">${sizesSvg(a, b)}</div>
      <div class="size-legend"><span style="--c:rgba(32,103,134,.12);--b:#206786">${formatSize(parseSize(a).w * parseSize(a).l >= parseSize(b).w * parseSize(b).l ? a : b)}</span><span style="--c:rgba(200,120,91,.16);--b:#9a4f33">${formatSize(parseSize(a).w * parseSize(a).l >= parseSize(b).w * parseSize(b).l ? b : a)}</span></div>
      <p class="small muted" style="margin:10px 0 0">Differenza: ${Math.abs(parseSize(a).w - parseSize(b).w)} cm in larghezza, ${Math.abs(parseSize(a).l - parseSize(b).l)} cm in lunghezza.</p>
    </div>
    <div><table class="size-table"><thead><tr><th>Misura (cm)</th><th>Formato</th></tr></thead><tbody>${STANDARD_SIZES.map((s) => `<tr><td><strong>${formatSize(s)}</strong></td><td>${SIZE_NAMES[s]}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:18px">Il materasso va scelto sulla misura interna del letto o della rete. Se non corrisponde a una misura standard, <a href="${u(P.quote)}">chiedi un preventivo fuori misura</a>.</p></div>
  </div>
  <div class="wrap"><section class="seo-text prose">
    <h2>Come misurare il letto</h2>
    <p>Misura <strong>l'interno</strong> del letto o della rete, da sponda a sponda, in larghezza e in lunghezza: è lì che va il materasso. Le misure esterne della struttura non contano. Se le due misure non coincidono con una misura standard, il materasso si fa su misura.</p>
    <h2>Singolo, piazza e mezza, francese, matrimoniale</h2>
    <p>Il <strong>singolo</strong> è largo 80 o 90 cm; la <strong>piazza e mezza</strong> 120 cm; il <strong>francese</strong> 140 cm, comodo per una persona e possibile per due; il <strong>matrimoniale</strong> 160 o 165 cm; il <strong>170×200</strong> e il <strong>King Size 180×200</strong> danno più spazio a chi dorme in due. Ogni larghezza esiste in lunghezza 190 o 200 cm: per chi supera 1,80 m conviene la lunghezza 200.</p>
    <h2>Rete e topper della stessa misura</h2>
    <p>Le nostre <a href="${u('/reti/')}">reti a doghe</a> e il <a href="${u('/topper/')}">topper in Memory Foam</a> esistono nelle stesse 13 misure dei materassi. Per scegliere il modello, leggi la guida <a href="${u('/guide/come-scegliere-il-materasso/')}">Come scegliere il materasso</a>.</p>
  </section></div>`;
}

// ---------------------------------------------------------------- FUORI MISURA
function viewQuote(query = {}) {
  const idx = pub();
  const hotel = query.hotel === '1';
  setMeta(VIEW_SEO[P.quote].metaTitle, VIEW_SEO[P.quote].description, [trail([{ name: 'Home', path: P.home }, { name: 'Materassi su misura', path: P.quote }]).ld]);
  const prods = [...idx.publicProducts('materasso'), ...idx.publicProducts('rete'), ...idx.publicProducts('topper')];
  const pre = state.quoteFor && prods.find((p) => p.id === state.quoteFor);
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Materassi su misura' }], 'Materassi su misura e altezze personalizzate', 'Indica prodotto e misure. Ti mandiamo il prezzo su WhatsApp: niente pagamento online, la conferma avviene con noi.')}
  <div class="wrap two-col" style="padding-top:28px">
    <form class="form" id="quote-form" novalidate>
      <div class="field"><label for="q-prod">Prodotto</label><select id="q-prod" name="product" required>${prods.map((p) => `<option value="${esc(p.id)}" ${pre?.id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="altro">Altro / non so ancora</option></select></div>
      <div class="row-2">
        <div class="field"><label for="q-w">Larghezza (cm)</label><input class="input" id="q-w" name="w" inputmode="numeric" required></div>
        <div class="field"><label for="q-l">Lunghezza (cm)</label><input class="input" id="q-l" name="l" inputmode="numeric" required></div>
        <div class="field"><label for="q-h">Altezza (cm)</label><input class="input" id="q-h" name="h" inputmode="numeric" placeholder="Facoltativa"></div>
      </div>
      <label class="check"><input type="checkbox" name="b2b" id="q-b2b" ${hotel ? 'checked' : ''}> È per un hotel, un B&amp;B o una struttura ricettiva</label>
      <div class="row-2" id="b2b-fields" ${hotel ? '' : 'hidden'}>
        <div class="field"><label for="q-rooms">Camere o posti letto</label><input class="input" id="q-rooms" name="rooms" inputmode="numeric"></div>
        <div class="field"><label for="q-qty">Quantità di materassi</label><input class="input" id="q-qty" name="qty" inputmode="numeric"></div>
      </div>
      <div class="field"><label for="q-notes">Note</label><textarea class="textarea" id="q-notes" name="notes" maxlength="500" aria-describedby="q-notes-h"></textarea><span class="hint" id="q-notes-h">Forma particolare, angoli smussati, scadenze. Non inserire indirizzi o altri dati personali: li concorderemo su WhatsApp.</span></div>
      <div id="q-err" class="err-msg" role="alert"></div>
      <div><button class="btn btn--primary" type="submit">Prepara la richiesta</button></div>
    </form>
    <div id="quote-out"><div class="note"><strong>Come funziona</strong><ol style="margin:8px 0 0;padding-left:18px"><li>Prepari la richiesta qui.</li><li>La invii su WhatsApp, oppure copi il testo.</li><li>Ti rispondiamo con prezzo e tempi.</li><li>Confermi con noi su WhatsApp.</li></ol></div></div>
  </div>`;
  state.quoteFor = null;
}

function waBlock(plan, ref, kind) {
  const wa = whatsappStatus();
  return `<div class="form">
    ${plan.url
      ? `<a class="btn btn--wa" href="${esc(plan.url)}" target="_blank" rel="noopener" data-act="wa-open" data-ref="${esc(ref)}">${icon('wa', 20)} Invia la richiesta su WhatsApp</a>`
      : `<div class="note" role="status">Copia il riepilogo e invialo a Vesuvio Sleep: ti confermiamo disponibilità e consegna.</div>`}
    <button class="btn btn--ghost" data-act="copy-summary" data-ref="${esc(ref)}">${icon('copy', 20)} Copia il riepilogo</button>
    <textarea class="textarea" id="copy-fallback" hidden readonly aria-label="Riepilogo da copiare"></textarea>
    ${plan.short ? `<p class="small muted">Il carrello è lungo: su WhatsApp si apre un messaggio breve con il riferimento ${esc(ref)}. Incolla sotto il riepilogo completo che hai copiato.</p>` : ''}
    <p class="small muted">${kind === 'quote' ? 'Ti risponderemo con prezzo e tempi.' : 'Aprire WhatsApp non conferma l\'ordine: la conferma arriva da Vesuvio Sleep su WhatsApp, dopo aver verificato disponibilità e consegna.'} Puoi modificare il messaggio prima di inviarlo.</p>
  </div>`;
}

// ---------------------------------------------------------------- CARRELLO
function viewCart() {
  const v = api.validateCart(cart.items);
  const idx = catalog();
  setMeta('Carrello', 'Il tuo carrello Vesuvio Sleep: verifica gli articoli e invia il riepilogo su WhatsApp.', [], { noindex: true });
  if (!cart.items.length) {
    app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Carrello' }], 'Carrello')}
    <div class="wrap section--tight"><div class="empty"><h2>Il carrello è vuoto</h2><p>Scegli un materasso e la misura: troverai qui il riepilogo da inviare su WhatsApp.</p><div class="btn-row" style="justify-content:center"><a class="btn btn--primary" href="${u('/materassi/')}">Esplora i materassi</a><a class="btn btn--ghost" href="${u(P.sleepMatch)}">Trova il tuo materasso</a></div></div></div>`;
    return;
  }
  // funzione extra: rete della stessa misura se nel carrello c'è un materasso senza rete
  const cartSizes = new Set(v.lines.filter((l) => l.product && idx.kind(l.product) === 'materasso').map((l) => l.variant.size));
  const reteSizes = new Set(v.lines.filter((l) => l.product && idx.kind(l.product) === 'rete').map((l) => l.variant.size));
  const missing = [...cartSizes].filter((s) => !reteSizes.has(s));
  const reteSugg = missing.length
    ? idx.publicProducts('rete').map((p) => ({ p, v: idx.cheapestAtSize(p, missing[0]) })).filter((x) => x.v)
    : [];
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Carrello' }], 'Carrello')}
  <div class="wrap" style="padding-top:22px"><ol class="steps-mini" aria-label="Passaggi"><li aria-current="step">Carrello</li><li>Verifica</li><li>WhatsApp</li></ol></div>
  <div class="wrap cart">
    <div>
      ${v.lines.map((l) => cartLine(idx, l)).join('')}
      ${reteSugg.length ? `<section class="section--tight"><h2 style="font-size:1.3rem">Una rete della stessa misura</h2><p class="small muted">Hai un materasso ${formatSize(missing[0])}: queste reti sono nella stessa misura.</p><div class="pair-row">${reteSugg.map(({ p, v: rv }) => pairHtml(idx, { product: p, variant: rv, fromPrice: rv.price_cents })).join('')}</div></section>` : ''}
    </div>
    <aside class="summary" aria-label="Totale">
      <dl><dt>Articoli</dt><dd>${cart.count()}</dd><dt>Spedizione</dt><dd>Gratuita in Italia</dd><div class="tot" style="display:contents"><dt>Totale</dt><dd>${formatCents(v.total_cents)}</dd></div></dl>
      <p class="small muted">IVA inclusa. Paghi alla consegna in contrassegno oppure con bonifico: nessun pagamento online. <a href="${u(P.payments)}">Come funziona</a></p>
      ${v.issues ? `<p class="note note--warn">${v.issues === 1 ? 'Un articolo va controllato' : v.issues + ' articoli vanno controllati'} prima di continuare.</p>` : ''}
      <a class="btn btn--primary" style="width:100%" href="${u(P.review)}" ${v.issues ? 'aria-disabled="true" data-act="blocked"' : ''}>Verifica il riepilogo</a>
      <p style="margin:12px 0 0;text-align:center"><a href="${u('/materassi/')}" class="small">Continua a scegliere</a></p>
    </aside>
  </div>`;
}
function cartLine(idx, l) {
  const p = l.product;
  const v = l.variant;
  const name = p ? p.name : 'Articolo non disponibile';
  const spec = v ? [v.size ? formatSize(v.size) : '', v.height_cm && idx.kind(p) === 'materasso' ? `H${v.height_cm}` : ''].filter(Boolean).join(' · ') : '';
  return `<div class="line">
    <div class="line__img">${p ? coverHtml(idx, p, { sizes: '92px' }) : fallbackHtml('materasso')}</div>
    <div><h3>${p ? `<a href="${href.product(p)}">${esc(name)}</a>` : esc(name)}</h3>
      <div class="meta">${esc(spec)}${v ? ` · SKU ${esc(v.sku)}` : ''}</div>
      ${l.message ? `<p class="note ${l.status === 'price_changed' ? 'note--warn' : 'note--err'}" style="margin:8px 0 0">${esc(l.message)}${l.status === 'price_changed' ? ` Nuovo prezzo: <strong>${formatCents(l.unit_cents)}</strong> <button class="link-btn" data-act="accept-price" data-id="${esc(l.item.variant_id)}">Accetta il nuovo prezzo</button>` : ''}</p>` : ''}
      <div class="line__row">
        <div class="qty" role="group" aria-label="Quantità di ${esc(name)}"><button data-act="cart-qty" data-id="${esc(l.item.variant_id)}" data-d="-1" aria-label="Diminuisci">${icon('minus', 18)}</button><output>${l.item.qty}</output><button data-act="cart-qty" data-id="${esc(l.item.variant_id)}" data-d="1" aria-label="Aumenta" ${l.item.qty >= MAX_QTY || l.status !== 'ok' ? 'disabled' : ''}>${icon('plus', 18)}</button></div>
        <strong>${l.status === 'ok' ? formatCents(l.unit_cents * l.item.qty) : ''}</strong>
        <button class="link-btn small" data-act="cart-remove" data-id="${esc(l.item.variant_id)}">Rimuovi</button>
      </div></div></div>`;
}

// ---------------------------------------------------------------- RIEPILOGO + WHATSAPP
function cartSignature(items) {
  return items.map((i) => `${i.variant_id}:${i.qty}:${i.seen_price_cents}`).sort().join('|');
}
function viewReview() {
  setMeta('Verifica il riepilogo', 'Controlla il riepilogo, scegli come pagare e invialo a Vesuvio Sleep su WhatsApp.', [], { noindex: true });
  if (!cart.items.length) {
    go(P.cart, { replace: true });
    return;
  }
  const v = api.validateCart(cart.items); // ricontrollo "lato server"
  const head = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Carrello', href: u(P.cart) }, { name: 'Verifica' }], 'Verifica il riepilogo')}
    <div class="wrap" style="padding-top:22px"><ol class="steps-mini" aria-label="Passaggi"><li>Carrello</li><li aria-current="step">Verifica</li><li>WhatsApp</li></ol></div>`;
  if (!v.canSubmit) {
    app.innerHTML = `${head}<div class="wrap"><div class="note note--warn" role="alert"><strong>Abbiamo ricontrollato il carrello e qualcosa è cambiato.</strong> Correggi gli articoli segnalati e riprova.</div>
      <div>${v.lines.map((l) => cartLine(catalog(), l)).join('')}</div><p style="margin-top:20px"><a class="btn btn--ghost" href="${u(P.cart)}">Torna al carrello</a></p></div>`;
    return;
  }
  const sig = cartSignature(cart.items);
  let ref;
  try {
    const saved = JSON.parse(sessionStorage.getItem('vs-review') || 'null');
    if (saved?.sig === sig && store.db.requests.some((r) => r.ref === saved.ref)) ref = saved.ref;
  } catch {
    /* sessionStorage non disponibile */
  }
  const req = ref ? store.db.requests.find((r) => r.ref === ref) : api.createCartRequest(v);
  try {
    sessionStorage.setItem('vs-review', JSON.stringify({ sig, ref: req.ref }));
  } catch {
    /* ignora */
  }
  const pay = PAYMENT_METHODS.find((m) => m.id === state.pay) ?? PAYMENT_METHODS[0];
  const summary = { ref: req.ref, lines: toSummaryLines(v), total_cents: v.total_cents, shipping_note: store.db.settings.shipping_note, payment: pay.msg };
  const plan = planWhatsApp(whatsappStatus().raw, summary);
  state.lastSummary = plan.fullText;
  app.innerHTML = `${head}<div class="wrap cart">
    <div>
      <table class="size-table" aria-label="Articoli"><thead><tr><th>Articolo</th><th>Q.tà</th><th style="text-align:right">Prezzo</th></tr></thead><tbody>
      ${summary.lines.map((l) => `<tr><td><strong>${esc(l.name)}</strong><br><span class="small muted">${[l.size ? formatSize(l.size) : '', l.height_cm && l.size ? 'H' + l.height_cm : ''].filter(Boolean).join(' · ')}${l.size ? ' · ' : ''}SKU ${esc(l.sku)}</span></td><td>${l.qty}</td><td style="text-align:right">${formatCents(l.unit_cents * l.qty)}</td></tr>`).join('')}
      </tbody></table>
      <dl class="facts-list" style="margin-top:16px"><dt>Totale</dt><dd><strong>${formatCents(v.total_cents)}</strong> IVA inclusa</dd><dt>Spedizione</dt><dd>${esc(store.db.settings.shipping_note)}</dd><dt>Pagamento</dt><dd>${esc(pay.label)}</dd><dt>Riferimento</dt><dd>${esc(req.ref)}</dd></dl>
      <h2 style="font-size:1.2rem;margin-top:28px">Il messaggio che invierai</h2>
      <pre class="msg-preview" aria-label="Testo del messaggio">${esc(plan.text)}</pre>
      <p class="small muted">Il messaggio contiene solo articoli, prezzi e riferimento: nessun dato personale.</p>
    </div>
    <aside class="summary" aria-label="Invio">
      <h2 style="font-size:1.2rem">Invia la richiesta</h2>
      <fieldset class="pay-opt"><legend>Come preferisci pagare?</legend>
        ${PAYMENT_METHODS.map((m) => `<label class="pay"><input type="radio" name="pay" value="${m.id}" ${m.id === pay.id ? 'checked' : ''}><span><strong>${esc(m.label)}</strong><small>${esc(m.text)}</small></span></label>`).join('')}
      </fieldset>
      <div id="wa-status" aria-live="polite">${req.status === 'in_attesa_contatto' ? sentNote() : ''}</div>
      ${waBlock(plan, req.ref, 'cart')}
      <p class="small" style="margin-top:14px"><a href="${u(P.cart)}">Modifica il carrello</a></p>
    </aside></div>`;
}
function sentNote() {
  return `<div class="note note--ok" style="margin-bottom:12px">Hai aperto WhatsApp. Se hai inviato il messaggio, Vesuvio Sleep ti risponderà lì per confermare. Il carrello resta salvato finché non lo svuoti. <button class="link-btn" data-act="cart-clear">Svuota il carrello</button></div>`;
}

// ---------------------------------------------------------------- ALTRE
function viewShowroom() {
  setMeta(VIEW_SEO[P.showroom].metaTitle, VIEW_SEO[P.showroom].description, [localBusinessJsonLd(abs('/'), { image: absAsset(siteImage('showroom')?.src), logo: absAsset('img/logo.png') }), trail([{ name: 'Home', path: P.home }, { name: 'Showroom', path: P.showroom }]).ld], { image: siteImage('showroom')?.src });
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Showroom' }], 'Showroom e fabbrica', 'Via Raffaele Salierno 38, Casoria (Napoli)')}<div class="wrap section--tight">${showroomHtml()}</div>`;
}
function viewNotFound() {
  setMeta('Pagina non trovata', 'La pagina che cerchi non esiste o è stata spostata.', [], { noindex: true });
  app.innerHTML = `<div class="wrap section"><h1>Questa pagina non c'è</h1><p class="lead">Il prodotto potrebbe non essere più in catalogo o il link è incompleto. Prova a cercarlo: <a href="${u(P.search)}">cerca nel sito</a>.</p><div class="btn-row"><a class="btn btn--primary" href="${u('/materassi/')}">Vai ai materassi</a><a class="btn btn--ghost" href="${u(P.home)}">Torna alla home</a></div></div>`;
}

// ---------------------------------------------------------------- PAGINE INFORMATIVE
function asideHtml(path, def) {
  const links = def.legal
    ? [[P.terms, 'Condizioni di vendita'], [P.returns, 'Resi e recesso'], [P.warranty, 'Garanzia'], [P.privacy, 'Privacy'], [P.cookies, 'Cookie']]
    : [[P.faq, 'Domande frequenti'], [P.shipping, 'Spedizioni e consegna'], [P.payments, 'Pagamenti'], [P.returns, 'Resi e recesso'], [P.guides, 'Guide']];
  return `<aside class="page-aside" aria-label="Assistenza">
    <div class="help-card"><h2>Hai una domanda?</h2><p>Ti rispondiamo noi, dalla fabbrica.</p>
      <a class="btn btn--wa btn--sm" href="${waHref()}" target="_blank" rel="noopener">${icon('wa', 18)} WhatsApp</a>
      <p class="help-card__line">${icon('phone', 16)} <a href="${CONTACT.phoneHref}">${CONTACT.phoneShort}</a></p>
      <p class="help-card__line">${icon('mail', 16)} <a href="mailto:${CONTACT.email}">${CONTACT.email}</a></p></div>
    <nav class="side-links" aria-label="Pagine correlate"><ul>${links.filter(([p]) => p !== path).map(([p, t]) => `<li><a href="${u(p)}">${t}</a></li>`).join('')}</ul></nav>
  </aside>`;
}
function viewPage(path, def) {
  const items = [{ name: 'Home', path: P.home }, ...(def.parent ? [{ name: def.parent[1], path: def.parent[0] }] : []), { name: def.nav, path }];
  const tr = trail(items);
  const photo = def.photo ? siteImage(def.photo) : null;
  const ld = [tr.ld];
  if (def.type === 'faq') ld.push(faqJsonLd(faqForLd()));
  if (def.type === 'contact' || def.type === 'local')
    ld.push({ ...localBusinessJsonLd(abs('/'), { image: absAsset(photo?.src || SHARE_IMG), logo: absAsset('img/logo.png') }), ...(def.type === 'local' ? { areaServed: [{ '@type': 'City', name: 'Napoli' }, { '@type': 'Country', name: 'Italia' }] } : {}) });
  if (def.type === 'article')
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: def.h1,
      description: def.description,
      inLanguage: 'it-IT',
      datePublished: '2026-11-15',
      dateModified: '2026-11-15',
      mainEntityOfPage: abs(path),
      author: { '@type': 'Organization', name: 'Vesuvio Sleep', url: abs('/') },
      publisher: { '@type': 'Organization', name: 'Vesuvio Sleep', logo: { '@type': 'ImageObject', url: absAsset('img/logo.png') } },
    });
  setMeta(def.metaTitle, def.description, ld, { type: def.type === 'article' ? 'article' : 'website', image: photo?.src });
  app.innerHTML = `${pageHero(tr.ui, def.h1, def.lead, '', photo)}
  <div class="wrap page-layout${def.legal ? ' page-layout--legal' : ''}"><article class="prose">${def.body()}</article>${asideHtml(path, def)}</div>`;
}

// ---------------------------------------------------------------- RICERCA
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/×/g, 'x');
function viewSearch(q) {
  const idx = pub();
  const terms = norm(q).split(/[^a-z0-9]+/).filter((x) => x.length > 1);
  const match = (hay) => terms.length && terms.every((t) => norm(hay).includes(t));
  const prods = terms.length
    ? idx.publicProducts().filter((p) => match([p.name, p.technical_name, p.short, p.description, p.composition, (p.highlights || []).join(' '), idx.category(p)?.name, idx.purchasableSizes(p).join(' '), idx.purchasableHeights(p).map((h) => 'h' + h).join(' ')].join(' ')))
    : [];
  const pages = terms.length
    ? Object.entries({ ...PAGES }).filter(([, d]) => match([d.h1, d.nav, d.description, d.lead].join(' '))).slice(0, 8)
    : [];
  setMeta(q ? `Risultati per "${q}"` : 'Cerca nel sito', 'Cerca materassi, reti, topper e informazioni su Vesuvio Sleep.', [], { noindex: true });
  const n = prods.length + pages.length;
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Cerca' }], 'Cerca nel sito')}
  <div class="wrap section--tight">
    <form class="search-form" id="search-form" role="search"><label class="sr-only" for="q">Cerca</label>
      <input class="input" type="search" id="q" name="q" value="${esc(q)}" placeholder="Es. memory, molle, 160x190, spedizione" autocomplete="off">
      <button class="btn btn--primary" type="submit">${icon('search', 18)} Cerca</button></form>
    ${q ? `<p class="small muted" aria-live="polite">${n ? `${n} ${n === 1 ? 'risultato' : 'risultati'} per "${esc(q)}"` : `Nessun risultato per "${esc(q)}".`}</p>` : ''}
    ${prods.length ? `<h2 class="sr-only">Prodotti</h2><div class="grid">${prods.map((p) => productCard(idx, p)).join('')}</div>` : ''}
    ${pages.length ? `<h2 style="font-size:1.3rem;margin-top:32px">Pagine</h2><ul class="search-pages">${pages.map(([p, d]) => `<li><a href="${u(p)}"><strong>${esc(d.h1)}</strong><span>${esc(d.description)}</span></a></li>`).join('')}</ul>` : ''}
    ${q && !n ? `<div class="empty"><p>Prova con un'altra parola, oppure scrivici: ti aiutiamo noi.</p><div class="btn-row" style="justify-content:center"><a class="btn btn--primary" href="${u('/materassi/')}">Vedi i materassi</a><a class="btn btn--ghost" href="${waHref()}" target="_blank" rel="noopener">Scrivici su WhatsApp</a></div></div>` : ''}
    ${!q ? `<p class="muted">Più cercati: <a href="${u(P.search + '?q=memory')}">memory</a> · <a href="${u(P.search + '?q=molle')}">molle</a> · <a href="${u(P.search + '?q=160x190')}">160×190</a> · <a href="${u(P.search + '?q=rete')}">rete</a> · <a href="${u(P.search + '?q=spedizione')}">spedizione</a></p>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- EVENTI
function closeDrawer() {
  $('#drawer')?.classList.remove('is-open');
  $('#menu-btn')?.setAttribute('aria-expanded', 'false');
}
function currentProduct() {
  const seg = current().path.split('/').filter(Boolean);
  if (seg.length !== 2) return null;
  const idx = pub();
  const p = idx.snap.products.find((x) => x.slug === seg[1]);
  return p ? { idx, p } : null;
}
function addVariant(v, qty = 1) {
  cart.set(addToCart(cart.items, v, qty));
  bump($('#cart-link'));
  toast('Aggiunto al carrello');
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (document.body.classList.contains('is-admin') && !['wa-open'].includes(act)) return; // gli eventi admin li gestisce admin.js
  switch (act) {
    case 'home-tab': {
      state.homeKind = t.dataset.kind;
      $$('.seg-tabs .tab').forEach((b) => {
        const on = b === t;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
      });
      $('#home-grid').setAttribute('aria-labelledby', t.id);
      moveThumb();
      const hg = $('#home-grid');
      hg.innerHTML = homeGrid(pub());
      $('.showcase', hg).classList.add('is-entering');
      enhance(hg);
      break;
    }
    case 'lab-model': {
      state.labModel = t.dataset.id;
      const sec = $('#lab-stage').closest('.wrap');
      sec.innerHTML = labHtml(pub());
      $$('.rv', sec).forEach((x) => x.classList.add('in'));
      const st = $('#lab-stage');
      st.style.setProperty('--ex', '0');
      explode(st, 0.8, 1000);
      $(`[data-act="lab-model"][data-id="${CSS.escape(t.dataset.id)}"]`)?.focus();
      break;
    }
    case 'lab-layer': {
      const st = $('#lab-stage');
      const on = t.getAttribute('aria-pressed') !== 'true';
      $$('[data-act="lab-layer"]').forEach((b) => b.setAttribute('aria-pressed', String(on && b === t)));
      $$('.mx .ly', st).forEach((g) => g.classList.toggle('is-focus', on && g.style.getPropertyValue('--i') === t.dataset.i));
      if (on) {
        st.dataset.focus = t.dataset.i;
        if ((Number(st.style.getPropertyValue('--ex')) || 0) < 0.5) explode(st, 0.8, 700);
      } else delete st.dataset.focus;
      break;
    }
    case 'print':
      window.print();
      break;
    case 'sm-start':
      state.sm = { step: 0, a: { me: {}, position: t.dataset.v } };
      go(P.sleepMatch);
      break;
    case 'to-product': {
      // morph della card nella galleria della scheda (View Transitions)
      const card = t.closest('.card, .lab');
      const mediaEl = card?.querySelector('.card__media, .lab__stage');
      if (mediaEl && document.startViewTransition && !reducedMotion()) mediaEl.style.viewTransitionName = 'prod-media';
      break;
    }
    case 'filter': {
      const k = t.dataset.k;
      const f = state.filters;
      if (k === 'removable') f.removable = !f.removable;
      else if (k === 'height') f.height = f.height === Number(t.dataset.v) ? 0 : Number(t.dataset.v);
      else f[k] = t.dataset.v;
      $$('[data-act="filter"]').forEach((b) =>
        b.setAttribute('aria-pressed', b.dataset.k === 'removable' ? String(f.removable) : String(String(f[b.dataset.k]) === b.dataset.v)),
      );
      swap($('#cat-body'), state.catBody());
      break;
    }
    case 'reset-filters':
      Object.assign(state.filters, { tech: 'all', removable: false, height: 0 });
      route();
      break;
    case 'compare': {
      t.checked ? state.compare.add(t.value) : state.compare.delete(t.value);
      if (state.compare.size > 3) {
        state.compare.delete(t.value);
        t.checked = false;
        toast('Puoi confrontare al massimo tre modelli');
      }
      $('.compare-bar')?.remove();
      if (state.compare.size) showCompareBar();
      break;
    }
    case 'cmp-toggle': {
      const id = t.dataset.id;
      if (state.compare.has(id)) state.compare.delete(id);
      else if (state.compare.size >= 3) return toast('Puoi confrontare al massimo tre modelli');
      else state.compare.add(id);
      const y = window.scrollY;
      viewCompare();
      window.scrollTo(0, y);
      $(`[data-act="cmp-toggle"][data-id="${CSS.escape(id)}"]`)?.focus();
      break;
    }
    case 'cmp-clear':
      state.compare.clear();
      $('.compare-bar')?.remove();
      $$('[data-act="compare"]').forEach((c) => (c.checked = false));
      break;
    case 'compare-with': {
      const cp = currentProduct();
      if (cp?.p) state.compare.add(cp.p.id);
      break;
    }
    case 'quote-for':
      state.quoteFor = t.dataset.id;
      if (isAt(P.quote)) viewQuote(current().query);
      break;
    case 'layer': {
      const box = t.closest('[data-layers]');
      const i = t.dataset.i;
      $$('[data-act="layer"]', box).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.i === i)));
      break;
    }
    case 'thumb': {
      const cp = currentProduct();
      const g = mediaFor(cp.idx, cp.p);
      $('[data-gallery]').innerHTML = galleryHtml(cp.idx, cp.p, g, Number(t.dataset.i));
      $('[data-gallery] .gallery__main')?.classList.add('is-fade');
      if ($('#gal-stage')) explode($('#gal-stage'), 0.6, 700);
      $(`[data-act="thumb"][data-i="${t.dataset.i}"]`)?.focus();
      break;
    }
    case 'zoom': {
      const cp = currentProduct();
      const m = mediaFor(cp.idx, cp.p)[Number(t.dataset.i)];
      const src = media.resolve(m);
      const big = m.srcset ? m.srcset.split(',').pop().trim().split(' ')[0] : src;
      const d = openDialog({
        title: cp.p.name,
        wide: true,
        body: `<div class="btn-row" style="margin-bottom:10px" role="group" aria-label="Livello di zoom">${[1, 2, 3].map((z) => `<button class="chip" data-z="${z}" aria-pressed="${z === 1}">${z === 1 ? 'Adatta' : z + '×'}</button>`).join('')}</div>
          <div class="zoom-stage" tabindex="0" aria-label="Immagine ingrandita: scorri per spostarti"><img src="${esc(big)}" alt="${esc(m.alt)}"></div>${m.caption ? `<p class="small muted" style="margin:8px 0 0">${esc(m.caption)}</p>` : ''}`,
      });
      d.el.addEventListener('click', (ev) => {
        const z = ev.target.closest('[data-z]');
        if (!z) return;
        $$('[data-z]', d.el).forEach((b) => b.setAttribute('aria-pressed', String(b === z)));
        $('.zoom-stage', d.el).style.setProperty('--z', z.dataset.z);
      });
      break;
    }
    case 'size-guide': {
      const cp = currentProduct();
      const s = state.sel[cp.p.id]?.size;
      if (s) state.sizes = [s, s === '180x200' ? '160x190' : '180x200'];
      go(P.sizes);
      break;
    }
    case 'qty': {
      const cp = currentProduct();
      const sel = state.sel[cp.p.id];
      sel.qty = Math.max(1, Math.min(MAX_QTY, sel.qty + Number(t.dataset.d)));
      $('.buy .qty output').textContent = sel.qty;
      break;
    }
    case 'add': {
      const cp = currentProduct();
      const sel = getSel(cp.idx, cp.p);
      const kind = cp.idx.kind(cp.p);
      const v = cp.idx.purchasableVariants(cp.p).find((x) => (x.size ?? null) === (sel.size ?? null) && (kind === 'materasso' || kind === 'topper' ? x.height_cm === sel.height : true));
      if (!v) return toast('Questa configurazione non è acquistabile online');
      addVariant(v, sel.qty);
      $('#add-feedback').innerHTML = `<p class="note note--ok" style="margin:0">Aggiunto: ${esc(cp.p.name)}${v.size ? ' ' + formatSize(v.size) : ''}${kind === 'materasso' ? ' H' + v.height_cm : ''}. <a href="${u(P.cart)}">Vai al carrello</a></p>`;
      break;
    }
    case 'add-variant': {
      const idx = catalog();
      const v = idx.variants.get(t.dataset.id);
      const p = v && idx.products.get(v.product_id);
      if (!v || !p || !idx.purchasableVariants(p).includes(v)) return toast('Articolo non disponibile');
      addVariant(v, 1);
      if (isAt(P.cart)) viewCart();
      break;
    }
    case 'sm-next':
      state.sm.step++;
      renderSM(true);
      break;
    case 'sm-back':
      state.sm.step = Math.max(0, state.sm.step - 1);
      renderSM(true);
      break;
    case 'sm-restart':
      state.sm = { step: 0, a: { me: {} } };
      renderSM(true);
      break;
    case 'cart-qty': {
      const items = cart.items.map((i) => (i.variant_id === t.dataset.id ? { ...i, qty: Math.max(0, Math.min(MAX_QTY, i.qty + Number(t.dataset.d))) } : i));
      cart.set(items);
      viewCart();
      $(`[data-act="cart-qty"][data-id="${CSS.escape(t.dataset.id)}"][data-d="${t.dataset.d}"]`)?.focus();
      break;
    }
    case 'cart-remove':
      cart.set(cart.items.filter((i) => i.variant_id !== t.dataset.id));
      isAt(P.review) ? viewReview() : viewCart();
      toast('Articolo rimosso');
      break;
    case 'accept-price': {
      const v = catalog().variants.get(t.dataset.id);
      cart.set(cart.items.map((i) => (i.variant_id === t.dataset.id ? { ...i, seen_price_cents: v.price_cents } : i)));
      isAt(P.review) ? viewReview() : viewCart();
      break;
    }
    case 'blocked':
      e.preventDefault();
      toast('Correggi prima gli articoli segnalati');
      break;
    case 'wa-open':
      api.markWaiting(t.dataset.ref);
      if ($('#wa-status')) $('#wa-status').innerHTML = sentNote();
      break;
    case 'copy-summary':
      await copyText(state.lastSummary || '', $('#copy-fallback'));
      break;
    case 'cart-clear':
      cart.clear();
      try {
        sessionStorage.removeItem('vs-review');
      } catch {
        /* ignora */
      }
      toast('Carrello svuotato');
      go(P.home);
      break;
  }
});

document.addEventListener('change', (e) => {
  if (document.body.classList.contains('is-admin')) return;
  const t = e.target;
  const act = t.dataset?.act;
  if (act === 'pick-s' || act === 'pick-h') {
    const cp = currentProduct();
    const sel = getSel(cp.idx, cp.p);
    if (act === 'pick-s') sel.size = t.value;
    else {
      sel.height = Number(t.value);
      const pv = cp.idx.purchasableVariants(cp.p);
      if (!pv.some((v) => v.size === sel.size && v.height_cm === sel.height)) sel.size = pv.find((v) => v.height_cm === sel.height)?.size ?? sel.size;
    }
    renderBuy(cp.idx, cp.p);
    $(`#${act === 'pick-s' ? 's' : 'h'}${CSS.escape(t.value)}`)?.focus();
  }
  if (act === 'sort') {
    state.filters.sort = t.value;
    swap($('#cat-body'), state.catBody());
  }
  if (act === 'sm-pick') {
    setK(state.sm.a, t.dataset.k, t.value);
    $('[data-act="sm-next"]').disabled = false;
  }
  if (act === 'size-a' || act === 'size-b') {
    state.sizes[act === 'size-a' ? 0 : 1] = t.value;
    const y = window.scrollY;
    viewSizes();
    window.scrollTo(0, y);
    $('#' + (act === 'size-a' ? 'sz-a' : 'sz-b')).focus();
  }
  if (t.id === 'q-b2b') $('#b2b-fields').hidden = !t.checked;
  if (t.name === 'pay') {
    state.pay = t.value;
    const y = window.scrollY;
    viewReview();
    window.scrollTo(0, y);
    $(`input[name="pay"][value="${CSS.escape(t.value)}"]`)?.focus();
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset?.act === 'lab-ex' || t.dataset?.act === 'gal-ex') {
    t.closest('#lab-stage, #gal-stage')?.style.setProperty('--ex', String(Number(t.value) / 100));
  }
});

document.addEventListener('keydown', (e) => {
  // frecce tra le tab categorie
  const tab = e.target.closest?.('.seg-tabs .tab');
  if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const tabs = $$('.seg-tabs .tab');
    const i = tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
    const n = tabs[(i + tabs.length) % tabs.length];
    n.focus();
    n.click();
  }
  if (e.key === 'Escape') closeDrawer();
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'search-form') {
    e.preventDefault();
    const q = String(new FormData(e.target).get('q') || '').trim();
    go(P.search + (q ? '?q=' + encodeURIComponent(q) : ''));
    return;
  }
  if (e.target.id !== 'quote-form') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const num = (k) => (String(fd.get(k) || '').trim() === '' ? null : Number(String(fd.get(k)).replace(',', '.')));
  const w = num('w');
  const l = num('l');
  const h = num('h');
  const errs = [];
  $$('#quote-form .input').forEach((i) => i.removeAttribute('aria-invalid'));
  const bad = (id, msg) => {
    errs.push(msg);
    $('#' + id).setAttribute('aria-invalid', 'true');
  };
  if (!w || w < 40 || w > 250) bad('q-w', 'Larghezza: inserisci un valore tra 40 e 250 cm.');
  if (!l || l < 100 || l > 250) bad('q-l', 'Lunghezza: inserisci un valore tra 100 e 250 cm.');
  if (h !== null && (h < 5 || h > 45)) bad('q-h', 'Altezza: inserisci un valore tra 5 e 45 cm, oppure lascia vuoto.');
  $('#q-err').textContent = errs.join(' ');
  if (errs.length) return $('[aria-invalid="true"]')?.focus();
  const idx = pub();
  const pid = fd.get('product');
  const p = idx.products.get(pid);
  const b2b = fd.get('b2b') === 'on';
  const notesExtra = b2b ? [num('rooms') ? `Camere/posti letto: ${num('rooms')}` : '', num('qty') ? `Quantità: ${num('qty')}` : ''].filter(Boolean).join('. ') : '';
  const notes = [notesExtra, String(fd.get('notes') || '').slice(0, 500)].filter(Boolean).join('. ');
  const r = api.createQuoteRequest({ product_id: p?.id ?? null, product: p?.name ?? 'Da definire con il cliente', width_cm: w, length_cm: l, height_cm: h, notes, b2b });
  const text = buildQuoteMessage({ ref: r.ref, product: (b2b ? '[Struttura ricettiva] ' : '') + (p?.name ?? 'Da definire'), width_cm: w, length_cm: l, height_cm: h, notes });
  state.lastSummary = text;
  const n = normalizeWhatsAppNumber(whatsappStatus().raw);
  const plan = { url: n.ok ? `https://wa.me/${n.digits}?text=${encodeURIComponent(text)}` : null, text, short: false };
  $('#quote-out').innerHTML = `<h2 style="font-size:1.3rem">Richiesta pronta: ${esc(r.ref)}</h2><pre class="msg-preview">${esc(text)}</pre><div id="wa-status" aria-live="polite"></div>${waBlock(plan, r.ref, 'quote')}`;
  $('#quote-out h2').setAttribute('tabindex', '-1');
  $('#quote-out h2').focus();
});

// Strumento di verifica (sola lettura) usato dai test: conteggi e prezzi del catalogo pubblico
window.__vs = {
  stats() {
    const idx = catalog();
    const byKind = {};
    let total = 0;
    for (const p of idx.publicProducts()) {
      const n = idx.purchasableVariants(p).length;
      byKind[idx.kind(p)] = (byKind[idx.kind(p)] ?? 0) + n;
      total += n;
    }
    return { total, byKind, products: idx.publicProducts().map((p) => p.slug) };
  },
  /** Pagine indicizzabili e relative immagini: usato da scripts/build_site.mjs per generare il sito e la sitemap. */
  routes() {
    const idx = catalog();
    const imgs = (p) => mediaFor(idx, p).map((m) => media.resolve(m)).filter((x) => x && !/^(blob|idb):/.test(x)).map(absAsset);
    return [
      { path: P.home, images: [absAsset(SHARE_IMG)] },
      ...idx.commercialCategories().map((c) => ({ path: catPath(c) })),
      ...idx.publicProducts().map((p) => ({ path: prodPath(p), images: imgs(p) })),
      ...[P.sleepMatch, P.compare, P.sizes, P.quote, P.showroom].map((path) => ({ path })),
      ...Object.keys(PAGES).map((path) => ({ path })),
    ];
  },
  price(slug, height, size) {
    const idx = catalog();
    const p = idx.publicProducts().find((x) => x.slug === slug);
    const v = p && idx.purchasableVariants(p).find((x) => x.size === size && (height === null || x.height_cm === height));
    return v ? v.price_cents / 100 : null;
  },
};

// ---------------------------------------------------------------- AVVIO
$('#menu-btn').addEventListener('click', () => {
  const d = $('#drawer');
  d.classList.add('is-open');
  $('#menu-btn').setAttribute('aria-expanded', 'true');
  $('#drawer a')?.focus();
});
$('#drawer .drawer__scrim').addEventListener('click', closeDrawer);
$('#drawer-close').addEventListener('click', closeDrawer);
setNavigator(route);
interceptLinks(resolveProductPath);
window.addEventListener(MODE === 'path' ? 'popstate' : 'hashchange', route);
if (MODE === 'path') window.addEventListener('hashchange', () => current().legacy !== undefined && route());
window.addEventListener('resize', () => requestAnimationFrame(moveThumb));
store.subscribe((why) => {
  if (why === 'cart' || why === 'settings' || why === 'catalog') renderChrome();
});
window.addEventListener('vs:rerender', route);
// Avvio: si disegna SUBITO. Le foto caricate dall'admin (IndexedDB) arrivano dopo,
// con un tempo massimo: in alcuni frame isolati IndexedDB non risponde mai.
applySettings(store.db.settings);
// un tocco o un tasto saltano l'entrata
if (document.documentElement.classList.contains('vs-intro')) {
  const skip = () => document.documentElement.classList.add('vs-intro-skip');
  $('.vs-curtain')?.addEventListener('click', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });
}
route();
(async () => {
  const hasLocalPhotos = store.db.media.some((m) => m.src.startsWith('idb:'));
  await Promise.race([media.init(), new Promise((r) => setTimeout(r, 1500))]);
  if (hasLocalPhotos) route();
  if (!store.storageOk) toast('Il browser blocca il salvataggio locale: carrello e admin non verranno ricordati');
})();
export { route };
