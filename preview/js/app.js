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
} from './core/index.js';
import { store, catalog, cart, api, media, mediaFor, coverFor, whatsappStatus } from './store.js';
import { esc, $, $$, swap, toast, copyText, openDialog, icon, reducedMotion } from './ui.js';

const CFG = window.VS_CONFIG ?? {};
const app = $('#app');
const state = {
  homeKind: 'materasso',
  compare: new Set(),
  filters: { tech: 'all', removable: false, height: 0, sort: 'reco' },
  sel: {}, // productId -> {size, height, qty}
  sm: null, // Sleep Match: risposte solo in memoria
  sizes: ['160x190', '180x200'],
  lastRoute: '',
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
  return `<img src="${esc(src)}" ${m.srcset ? `srcset="${esc(m.srcset)}" sizes="${esc(sizes)}"` : ''} alt="${esc(m.alt)}" ${m.width ? `width="${m.width}" height="${m.height}"` : ''} loading="${eager ? 'eager' : 'lazy'}" decoding="async" class="${cls}" style="${focal}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fallback',innerHTML:window.__fb||''}))">`;
}
window.__fb = FALLBACK.materasso;
function coverHtml(idx, p, opts = {}) {
  const m = coverFor(idx, p);
  return (m && imgTag(m, { ...opts, cls: m.illustrative ? '' : 'is-cover' })) || fallbackHtml(idx.kind(p));
}

// ---------------------------------------------------------------- helpers
const href = {
  product: (p) => `#prodotto-${p.slug}`,
  category: (c) => `#${c.slug}`,
};
function priceFrom(idx, p) {
  const min = idx.minPrice(p);
  const max = idx.maxPrice(p);
  if (min === null) return '';
  return min === max ? `<span class="price">${formatCents(min)}</span>` : `<span class="price"><small>da</small>${formatCents(min)}</span>`;
}
function setMeta(title, desc, ld = []) {
  document.title = title ? `${title} | Vesuvio Sleep` : 'Vesuvio Sleep | Materassi di fabbrica a Napoli, dal 1986';
  $('meta[name="description"]').setAttribute('content', desc || 'Materassi prodotti a Casoria (Napoli) dal 1986 e venduti a prezzo di fabbrica: Memory Foam, poliuretano e molle insacchettate, reti e guanciali. Misure su richiesta.');
  $('#ld').textContent = JSON.stringify(ld.length === 1 ? ld[0] : ld);
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
  const idx = catalog();
  const cats = idx.commercialCategories();
  const route = location.hash.slice(1);
  const wa = whatsappStatus();
  const nav = [
    ...cats.map((c) => ({ href: `#${c.slug}`, label: c.name, on: route === c.slug })),
    { href: '#sleep-match', label: 'Sleep Match', on: route === 'sleep-match' },
    { href: '#showroom', label: 'Showroom', on: route === 'showroom' },
  ];
  $('#topbar').innerHTML = `<div class="wrap">
      <span class="topbar__msg">Spedizione ${esc(store.db.settings.shipping_note || '')}</span>
      <span class="topbar__preview"><span class="topbar__label">Anteprima concept</span>${!wa.check.ok ? ' <span class="topbar__flag">WhatsApp da configurare</span>' : ''}${previewDrafts() ? ' <span class="topbar__flag">Bozze visibili</span>' : ''}<a href="#admin">Admin</a></span>
    </div>`;
  $('#nav').innerHTML = nav.map((n) => `<a href="${n.href}" ${n.on ? 'aria-current="page"' : ''}>${esc(n.label)}</a>`).join('');
  $('#drawer-links').innerHTML = `<a href="#">Home</a>` + nav.map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('') + `<a href="#confronto">Confronta i materassi</a><a href="#guida-misure">Guida alle misure</a><a href="#fuori-misura">Fuori misura</a><a href="#carrello">Carrello (${cart.count()})</a>`;
  const n = cart.count();
  $('#cart-link').innerHTML = `${icon('cart')}<span class="sr-only">Carrello, ${n} articoli</span>${n ? `<span class="badge-count" aria-hidden="true">${n}</span>` : ''}`;
  $('#foot-cats').innerHTML = cats.map((c) => `<li><a href="#${c.slug}">${esc(c.name)}</a></li>`).join('');
}

// ---------------------------------------------------------------- router
const routes = [
  [/^$/, viewHome],
  [/^prodotto-(.+)$/, (m) => viewProduct(m[1])],
  [/^sleep-match$/, viewSleepMatch],
  [/^confronto$/, viewCompare],
  [/^guida-misure$/, viewSizes],
  [/^fuori-misura$/, viewQuote],
  [/^showroom$/, viewShowroom],
  [/^carrello$/, viewCart],
  [/^riepilogo$/, viewReview],
  [/^admin.*$/, async () => (await import('./admin.js')).render(app)],
];
async function route() {
  const r = decodeURIComponent(location.hash.slice(1));
  closeDrawer();
  document.body.classList.remove('has-sticky');
  $('.compare-bar')?.remove();
  const isAdmin = r.startsWith('admin');
  document.body.classList.toggle('is-admin', isAdmin);
  let done = false;
  for (const [re, fn] of routes) {
    const m = re.exec(r);
    if (m) {
      await fn(m);
      done = true;
      break;
    }
  }
  if (!done) {
    const idx = pub();
    const c = idx.snap.categories.find((x) => x.slug === r);
    if (c) viewCategory(c);
    else viewNotFound();
  }
  renderChrome();
  if (state.lastRoute !== r) {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    const h1 = $('#app h1');
    if (h1 && state.lastRoute !== '' && !r.startsWith('admin')) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }
  state.lastRoute = r;
  // la barra di confronto compare solo dove si selezionano i modelli
  if (!isAdmin && state.compare.size && (r === '' || r === 'materassi')) showCompareBar();
}

// ---------------------------------------------------------------- HOME
function productCard(idx, p, { compare = false } = {}) {
  const kind = idx.kind(p);
  const vs = idx.purchasableVariants(p);
  const heights = idx.purchasableHeights(p);
  const feats = [
    ...(kind === 'materasso' && heights.length ? [`Altezze ${heights.map((h) => 'H' + h).join(', ')}`] : []),
    ...(p.removable_cover ? ['Sfoderabile'] : []),
    ...(p.highlights || []).slice(0, kind === 'materasso' ? 1 : 2),
  ].slice(0, 3);
  const cover = coverFor(idx, p);
  return `<article class="card">
    <div class="card__media">${coverHtml(idx, p)}${p.hybrid ? '<span class="card__flag">Hybrid</span>' : ''}${cover?.illustrative ? '<span class="card__note">Render illustrativo</span>' : ''}</div>
    <div class="card__body">
      <span class="card__tech">${esc(p.technical_name)}</span>
      <h3><a href="${href.product(p)}">${esc(p.name)}</a></h3>
      <ul class="card__feats">${feats.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      ${availabilityHtml(vs[0])}
      <div class="card__foot">
        <div>${priceFrom(idx, p)}</div>
        ${compare ? `<label class="compare-toggle"><input type="checkbox" data-act="compare" value="${esc(p.id)}" ${state.compare.has(p.id) ? 'checked' : ''}> Confronta</label>` : `<span class="small muted">IVA inclusa</span>`}
      </div>
    </div>
  </article>`;
}

function volcanoSvg() {
  // profilo stilizzato Somma–Vesuvio, cucito come un bordino
  const d = 'M0 78 C120 76 220 74 330 66 C420 58 470 40 520 30 C548 24 566 26 586 34 C604 22 626 14 650 16 C690 20 740 46 800 58 C900 70 1040 74 1200 76';
  return `<svg class="volcano" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true"><path class="ghost" d="${d}"/><path class="stitch" d="${d}"/></svg>`;
}

function layersHtml(idx, p) {
  const m = mediaFor(idx, p).find((x) => x.slot === 'exploded' && x.hotspots?.length);
  if (!m) return '';
  const src = imgTag(m, { sizes: '(max-width: 860px) 94vw, 58vw' });
  if (!src) return '';
  return `<div class="layers" data-layers>
    <figure class="layers__fig">${src}
      ${m.hotspots.map((h, i) => `<button class="hot" style="left:${h.x}%;top:${h.y}%" data-act="layer" data-i="${i}" aria-pressed="${i === 0}" aria-label="${esc(h.title)}">${i + 1}</button>`).join('')}
      <figcaption class="small muted" style="margin-top:8px">${esc(m.caption || 'Vista illustrativa')}: numero e spessore degli strati possono differire dal prodotto.</figcaption>
    </figure>
    <ol class="layers__list">${m.hotspots
      .map((h, i) => `<li><button data-act="layer" data-i="${i}" aria-pressed="${i === 0}"><span class="n" aria-hidden="true">${i + 1}</span><span><strong>${esc(h.title)}</strong><span class="d">${esc(h.text)}</span></span></button></li>`)
      .join('')}</ol>
  </div>`;
}

function showroomHtml(compact = false) {
  const dest = encodeURIComponent('Via Raffaele Salierno 38, 80026 Casoria NA');
  return `<div class="showroom">
    <div>
      ${compact ? '<h2>Vieni a provarli in fabbrica</h2>' : ''}
      <p class="lead">Fabbrica, esposizione e showroom sono nello stesso posto: puoi provare i materassi e parlare con chi li produce.</p>
      <address style="font-style:normal;margin-bottom:16px"><strong>Vesuvio Sleep</strong><br>Via Raffaele Salierno 38<br>80026 Casoria (NA)</address>
      <dl class="hours"><dt>Lunedì–venerdì</dt><dd>09:00–18:00</dd><dt>Sabato</dt><dd>10:00–14:00</dd><dt>Domenica</dt><dd>Chiuso</dd></dl>
      <div class="btn-row">
        <a class="btn btn--primary" href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener">${icon('pin', 20)} Indicazioni stradali</a>
        <a class="btn btn--ghost" href="https://maps.apple.com/?daddr=${dest}" target="_blank" rel="noopener">Apri in Mappe</a>
      </div>
    </div>
    <div class="map-card">
      <svg class="mapbg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="#c9dde5" stroke-width="10"><path d="M-10 210 C80 190 160 200 240 160 S360 90 420 80"/><path d="M120 -10 C130 80 150 160 140 320"/></g>
        <g fill="none" stroke="#d9e7ec" stroke-width="5"><path d="M-10 90 L420 130"/><path d="M260 -10 L300 320"/><path d="M40 320 L200 -10"/></g>
      </svg>
      <div class="pin">${icon('pin', 26)}<p style="margin:6px 0 4px"><strong>Via Raffaele Salierno 38, Casoria</strong></p>
        <p class="small muted" style="margin:0">${CFG.mapEmbed ? '' : 'La mappa interattiva si attiva sul sito pubblicato, dopo il consenso ai cookie. Usa i pulsanti per le indicazioni.'}</p></div>
    </div>
  </div>`;
}

function viewHome() {
  const idx = pub();
  const cats = idx.commercialCategories();
  if (!cats.some((c) => c.kind === state.homeKind) && cats[0]) state.homeKind = cats[0].kind;
  const pocket = idx.publicProducts('materasso').find((p) => mediaFor(idx, p).some((m) => m.slot === 'exploded' && m.hotspots));
  setMeta('', '', [localBusinessJsonLd()]);
  app.innerHTML = `
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__grid">
      <div class="hero__text">
        <p class="hero__kicker">Fabbrica di materassi a Casoria, Napoli</p>
        <h1 id="hero-title"><span>Materassi di fabbrica,</span> <span>cuciti a Casoria</span> <span>dal 1986.</span></h1>
        <p class="lead">Li produciamo noi, alle porte di Napoli, e li vendiamo senza intermediari: prezzo di fabbrica, misure standard e, su richiesta, misure e altezze personalizzate.</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="#materassi">Esplora i materassi</a>
          <a class="btn btn--ghost" href="#sleep-match">Trova il tuo materasso</a>
        </div>
      </div>
      <div class="hero__media">
        <div class="hero__layer" aria-hidden="true"></div>
        <div class="hero__img">
          <img src="img/hero-1672.webp" srcset="img/hero-960.webp 960w, img/hero-1672.webp 1672w" sizes="(max-width: 860px) 100vw, 58vw" width="1672" height="941" alt="Camera luminosa in stile mediterraneo con un materasso trapuntato bianco su una base imbottita e vista sul mare" fetchpriority="high">
          <span class="hero__credit">Ambientazione illustrativa</span>
        </div>
      </div>
    </div>
  </section>
  <div class="piping">${volcanoSvg()}
    <div class="wrap"><ul class="facts" aria-label="In breve">
      <li><strong>Dal 1986</strong><span>40 anni di produzione</span></li>
      <li><strong>Prezzo di fabbrica</strong><span>Dal produttore a casa tua</span></li>
      <li><strong>Misure su richiesta</strong><span>Fuori misura e altezze personalizzate</span></li>
      <li><strong>Spedizione gratuita</strong><span>In tutta Italia, isole comprese</span></li>
    </ul></div>
  </div>

  <section class="section" aria-labelledby="cat-title">
    <div class="wrap">
      <div class="sec-head"><div><h2 id="cat-title">Il catalogo, direttamente dalla fabbrica</h2><p>Prezzi IVA inclusa, per la misura e l'altezza che scegli nella scheda.</p></div>
        <div class="btn-row"><a class="btn btn--ghost btn--sm" href="#confronto">Confronta i materassi</a></div></div>
      <div class="tabs" role="tablist" aria-label="Categorie">${cats
        .map((c) => `<button class="tab" role="tab" id="tab-${c.kind}" aria-selected="${c.kind === state.homeKind}" aria-controls="home-grid" data-act="home-tab" data-kind="${c.kind}" tabindex="${c.kind === state.homeKind ? 0 : -1}">${esc(c.name)}</button>`)
        .join('')}<span class="tabs__ink" aria-hidden="true"></span></div>
      <div id="home-grid" role="tabpanel" aria-labelledby="tab-${state.homeKind}">${homeGrid(idx)}</div>
    </div>
  </section>

  ${pocket ? `<section class="section factory" aria-labelledby="inside-title"><div class="wrap">
      <div class="sec-head"><div><h2 id="inside-title">Dentro il ${esc(pocket.name.replace('Vesuvio ', ''))}</h2><p>Tocca i numeri per vedere i componenti, dal rivestimento alla base.</p></div>
      <a class="btn btn--ghost btn--sm" href="${href.product(pocket)}">Vai alla scheda</a></div>
      ${layersHtml(idx, pocket)}
  </div></section>` : ''}

  <section class="section" aria-labelledby="fab-title"><div class="wrap">
    <div class="sec-head"><div><h2 id="fab-title">Dal 1986 a Casoria</h2><p>Siamo una fabbrica, non un rivenditore. Tagliamo, assembliamo e cuciamo i materassi nel nostro stabilimento, poi li vendiamo direttamente a te.</p></div></div>
    <figure class="factory__img" style="margin:0"><img src="img/lavorazione-1600.webp" srcset="img/lavorazione-900.webp 900w, img/lavorazione-1600.webp 1600w" sizes="(max-width: 1240px) 94vw, 1180px" width="1600" height="631" loading="lazy" alt="Scena illustrativa di un laboratorio di materassi con il Vesuvio sullo sfondo">
      <figcaption class="hero__credit">Scena illustrativa, non una foto della fabbrica</figcaption></figure>
    <dl class="dl-plain">
      <div><dt>Produzione diretta</dt><dd>Ogni materasso nasce nel nostro stabilimento di Via Raffaele Salierno. Made in Italy.</dd></div>
      <div><dt>Su misura, se serve</dt><dd>Oltre alle misure standard realizziamo fuori misura e altezze personalizzate, su preventivo.</dd></div>
      <div><dt>Hotel e B&amp;B</dt><dd>Forniture per strutture ricettive, anche in grandi quantità. <a href="#fuori-misura">Richiedi un preventivo</a>.</dd></div>
    </dl>
  </div></section>

  <section class="section--tight"><div class="wrap">
    <div class="match-band">
      <div><h2>Non sai quale scegliere?</h2><p>Sleep Match ti fa qualche domanda su come dormi e ti propone un solo materasso del nostro catalogo, con il perché. Non chiediamo il budget e non salviamo le risposte.</p>
        <a class="btn btn--primary" href="#sleep-match">Trova il tuo materasso</a></div>
      <ul><li>Posizione in cui dormi</li><li>Corporatura e sostegno che preferisci</li><li>Se dormi in due, anche le esigenze dell'altra persona</li><li>Se senti caldo di notte</li></ul>
    </div>
  </div></section>

  <section class="section" aria-labelledby="ship-title"><div class="wrap">
    <div class="sec-head"><div><h2 id="ship-title">Consegna</h2></div></div>
    <div class="delivery">
      <div><h3>In tutta Italia</h3><ul><li>Spedizione gratuita, isole comprese</li><li>Corriere con tracking</li><li>Prima della spedizione, circa 2 giorni di produzione per i materassi</li></ul></div>
      <div><h3>A Napoli</h3><ul><li>Consegna con il nostro furgone</li><li>Consegna al piano gratuita</li><li>Ritiro del vecchio materasso</li><li>Montaggio delle reti</li></ul></div>
    </div>
  </div></section>

  <section class="section factory" aria-labelledby="show-title"><div class="wrap"><h2 id="show-title" class="sr-only">Showroom</h2>${showroomHtml(true)}</div></section>`;
  requestAnimationFrame(moveInk);
}
function homeGrid(idx) {
  const items = idx.publicProducts(state.homeKind);
  return `<div class="grid">${items.map((p) => productCard(idx, p, { compare: state.homeKind === 'materasso' })).join('')}</div>
    <p style="margin-top:22px"><a href="#${idx.snap.categories.find((c) => c.kind === state.homeKind)?.slug}">Vedi tutti: ${esc(KIND_PLURAL[state.homeKind].toLowerCase())}</a></p>`;
}
function moveInk() {
  const ink = $('.tabs__ink');
  const t = $('.tab[aria-selected="true"]');
  if (!ink || !t) return;
  ink.style.width = t.offsetWidth - 24 + 'px';
  ink.style.transform = `translateX(${t.offsetLeft + 12}px)`;
}

// ---------------------------------------------------------------- CATEGORIA
function viewCategory(c) {
  const idx = pub();
  const all = idx.publicProducts(c.kind);
  const f = state.filters;
  const isM = c.kind === 'materasso';
  setMeta(c.seo_title || `${c.name} di fabbrica`, c.seo_description || c.description, [
    breadcrumbJsonLd([{ name: 'Home' }, { name: c.name }]),
  ]);
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
      return `<div class="empty"><h3>Nessun articolo acquistabile in questa categoria</h3><p>Stiamo completando prezzi e schede. Nel frattempo puoi chiederci informazioni.</p><a class="btn btn--ghost" href="#fuori-misura">Chiedi un preventivo</a></div>`;
    if (!list.length)
      return `<div class="empty"><h3>Nessun materasso con questi filtri</h3><p>Prova a togliere un filtro: la gamma è piccola e ogni modello ha caratteristiche diverse.</p><button class="btn btn--ghost" data-act="reset-filters">Azzera i filtri</button></div>`;
    return `<p class="small muted" aria-live="polite">${list.length} ${list.length === 1 ? 'modello' : 'modelli'}</p><div class="grid">${list.map((p) => productCard(idx, p, { compare: isM })).join('')}</div>`;
  };
  const chip = (key, val, label) => `<button class="chip" data-act="filter" data-k="${key}" data-v="${val}" aria-pressed="${String(f[key]) === String(val)}">${label}</button>`;
  app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: c.name }])}
  <header class="page-head wrap"><h1>${esc(c.name)}</h1><p class="lead">${esc(c.description)}</p></header>
  <div class="wrap">
    <div class="toolbar">
      ${isM ? `<div class="chips" role="group" aria-label="Tecnologia">${chip('tech', 'all', 'Tutti')}${chip('tech', 'foam', 'Poliuretano')}${chip('tech', 'memory', 'Memory Foam')}${chip('tech', 'molle', 'Molle')}</div>
      <div class="chips" role="group" aria-label="Altezza e rivestimento">${[20, 25, 30].map((h) => chip('height', h, 'H' + h)).join('')}<button class="chip" data-act="filter" data-k="removable" data-v="toggle" aria-pressed="${f.removable}">Sfoderabile</button></div>` : '<span></span>'}
      <label><span class="sr-only">Ordina</span><select class="select" data-act="sort">
        <option value="reco" ${f.sort === 'reco' ? 'selected' : ''}>Ordine consigliato</option>
        <option value="asc" ${f.sort === 'asc' ? 'selected' : ''}>Prezzo crescente</option>
        <option value="desc" ${f.sort === 'desc' ? 'selected' : ''}>Prezzo decrescente</option></select></label>
    </div>
    <div id="cat-body">${body()}</div>
    ${isM ? `<p style="margin-top:28px" class="muted">Cerchi una misura o un'altezza diversa? <a href="#fuori-misura">Chiedi un preventivo fuori misura</a>.</p>` : ''}
  </div>`;
  state.catBody = body;
}

// ---------------------------------------------------------------- SCHEDA
function getSel(idx, p) {
  const s = state.sel[p.id] ?? {};
  const pv = idx.purchasableVariants(p);
  const sizes = idx.sizesOf(p);
  const heights = idx.heightsOf(p);
  let size = s.size ?? (sizes.includes('160x190') && pv.some((v) => v.size === '160x190') ? '160x190' : pv[0]?.size ?? sizes[0] ?? null);
  let height = s.height ?? (pv.some((v) => v.height_cm === 25 && v.size === size) ? 25 : pv.find((v) => v.size === size)?.height_cm ?? heights[0] ?? null);
  if (!heights.length) height = idx.variantsOf(p)[0]?.height_cm ?? null;
  return (state.sel[p.id] = { size, height, qty: s.qty ?? 1 });
}

function viewProduct(slug) {
  const idx = pub();
  const p = idx.snap.products.find((x) => x.slug === slug && x.status === 'published');
  const c = p && idx.category(p);
  if (!p || !c || c.status !== 'published') return viewNotFound();
  const kind = c.kind;
  const ms = mediaFor(idx, p);
  const gallery = ms.length ? ms : [];
  const urlImgs = gallery.map((m) => media.resolve(m)).filter((u) => u && !u.startsWith('blob:'));
  setMeta(p.seo_title || p.name, p.seo_description || p.short, [
    productJsonLd(idx, p, { images: urlImgs }),
    breadcrumbJsonLd([{ name: 'Home' }, { name: c.name }, { name: p.name }]),
  ].filter(Boolean));
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

  app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: c.name, href: `#${c.slug}` }, { name: p.name }])}
  <div class="wrap" style="padding-top:22px">
    <div class="pdp">
      <div class="gallery" data-gallery>${galleryHtml(idx, p, gallery, 0)}</div>
      <div class="buy" id="buy"></div>
    </div>
    <div class="two-col section--tight" style="padding-top:8px">
      <div><h2 style="font-size:1.6rem">Com'è fatto</h2><p>${esc(p.description)}</p>
        ${p.hybrid ? '<p class="small muted">Chiamiamo Hybrid i materassi che uniscono molle insacchettate e Memory Foam.</p>' : ''}</div>
      <div><h2 class="sr-only">Caratteristiche</h2><dl class="facts-list">${factsRows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
    </div>
    ${layersHtml(idx, p) ? `<section class="section--tight" aria-labelledby="layers-t"><h2 id="layers-t" style="font-size:1.6rem">Strato per strato</h2>${layersHtml(idx, p)}</section>` : ''}
    <section class="section--tight" id="pairings" aria-labelledby="pair-t"></section>
    <section class="section--tight"><div class="delivery">
      <div><h3>${icon('truck')} Consegna</h3><ul><li>Spedizione ${esc(store.db.settings.shipping_note)}</li><li>A Napoli consegna al piano, ritiro dell'usato${kind === 'rete' ? ' e montaggio' : ''}</li></ul></div>
      <div><h3>${icon('ruler')} Misura speciale</h3><p class="small">Realizziamo fuori misura e altezze personalizzate: ti mandiamo un preventivo su WhatsApp, senza pagamenti anticipati.</p><a class="btn btn--ghost btn--sm" href="#fuori-misura" data-act="quote-for" data-id="${esc(p.id)}">Chiedi un preventivo</a></div>
    </div></section>
  </div>
  ${purchasable ? `<div class="sticky-buy" id="sticky-buy" aria-hidden="true"></div>` : ''}`;
  renderBuy(idx, p);
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

function galleryHtml(idx, p, gallery, i) {
  if (!gallery.length) return `<div class="gallery__main">${fallbackHtml(idx.kind(p))}</div><p class="small muted" style="margin-top:10px">Illustrazione di categoria: le foto del prodotto saranno pubblicate appena disponibili.</p>`;
  const m = gallery[i] ?? gallery[0];
  const tag = imgTag(m, { sizes: '(max-width: 860px) 94vw, 58vw', eager: true, cls: m.illustrative ? '' : 'is-cover' });
  return `<div class="gallery__main">${tag || fallbackHtml(idx.kind(p))}
      ${tag ? `<button class="icon-btn gallery__zoom" data-act="zoom" data-i="${i}" aria-label="Ingrandisci l'immagine">${icon('zoom')}</button>` : ''}
      ${m.caption ? `<span class="gallery__label">${esc(m.caption)}</span>` : ''}</div>
    ${gallery.length > 1 ? `<div class="thumbs" role="group" aria-label="Immagini">${gallery
      .map((g, j) => `<button class="thumb" data-act="thumb" data-i="${j}" aria-current="${j === i}" aria-label="Mostra immagine ${j + 1}: ${esc(g.alt)}">${imgTag(g, { sizes: '80px' }) || ''}</button>`)
      .join('')}</div>` : ''}`;
}

function renderBuy(idx, p) {
  const kind = idx.kind(p);
  const sel = getSel(idx, p);
  const sizes = idx.sizesOf(p);
  const heights = idx.heightsOf(p);
  const pv = idx.purchasableVariants(p);
  const v = idx.findVariant(p, sel.size, kind === 'materasso' || kind === 'topper' ? sel.height : idx.variantsOf(p)[0]?.height_cm ?? null) ?? (sizes.length ? undefined : idx.variantsOf(p)[0]);
  const ok = v && pv.includes(v);
  const sizeOk = (s) => pv.some((x) => x.size === s && (!heights.length || kind !== 'materasso' || x.height_cm === sel.height));
  const heightOk = (h) => pv.some((x) => x.height_cm === h);
  const blockedHeights = heights.filter((h) => !heightOk(h));
  const selectable = kind === 'materasso' && heights.length > 1;
  $('#buy').innerHTML = `
    <span class="buy__tech">${esc(p.technical_name)}</span>
    <h1>${esc(p.name)}</h1>
    <p>${esc(p.short)}</p>
    <div class="buy__price" aria-live="polite">${ok ? `<span class="price">${formatCents(v.price_cents)}</span><span class="small muted">IVA inclusa${sel.size ? `, ${formatSize(sel.size)}` : ''}${v.height_cm && kind === 'materasso' ? ` H${v.height_cm}` : ''}</span>` : `<span class="small">Questa configurazione non è acquistabile online.</span>`}</div>
    ${ok ? availabilityHtml(v) : ''}
    ${selectable ? `<fieldset class="opt"><legend>Altezza</legend><div class="seg seg--h">${heights
      .map((h) => `<input type="radio" name="h" id="h${h}" value="${h}" data-act="pick-h" ${sel.height === h ? 'checked' : ''} ${heightOk(h) ? '' : 'disabled'}><label for="h${h}">H${h}${heightOk(h) ? '' : '<small>non online</small>'}</label>`)
      .join('')}</div>${blockedHeights.length ? `<p class="small muted" style="margin:8px 0 0">H${blockedHeights.join(', H')}: non ancora acquistabile online. <a href="#fuori-misura" data-act="quote-for" data-id="${esc(p.id)}">Chiedi un preventivo</a>.</p>` : ''}</fieldset>` : ''}
    ${sizes.length ? `<fieldset class="opt"><legend>Misura <button type="button" class="link-btn" data-act="size-guide">Confronta due misure</button></legend><div class="seg">${sizes
      .map((s) => `<input type="radio" name="s" id="s${s}" value="${s}" data-act="pick-s" ${sel.size === s ? 'checked' : ''} ${sizeOk(s) ? '' : 'disabled'}><label for="s${s}">${formatSize(s)}</label>`)
      .join('')}</div></fieldset>` : ''}
    ${v ? `<p class="sku">SKU <span>${esc(v.sku)}</span></p>` : ''}
    <div class="buy__actions">
      <div class="qty" role="group" aria-label="Quantità"><button type="button" data-act="qty" data-d="-1" aria-label="Diminuisci">${icon('minus', 18)}</button><output aria-live="polite">${sel.qty}</output><button type="button" data-act="qty" data-d="1" aria-label="Aumenta">${icon('plus', 18)}</button></div>
      <button class="btn btn--primary" id="add-btn" data-act="add" ${ok ? '' : 'disabled'}>Aggiungi al carrello</button>
    </div>
    <div class="buy__extra" id="add-feedback" aria-live="polite"></div>
    <div class="buy__extra">
      <a href="#fuori-misura" data-act="quote-for" data-id="${esc(p.id)}">Ti serve un'altra misura o un'altra altezza?</a>
      ${kind === 'materasso' ? `<a href="#confronto" data-act="compare-with" data-id="${esc(p.id)}">Confronta con gli altri materassi</a>` : ''}
    </div>`;
  const sb = $('#sticky-buy');
  if (sb)
    sb.innerHTML = ok
      ? `<div><div class="price">${formatCents(v.price_cents)}</div><div class="meta">${sel.size ? formatSize(sel.size) : ''}${v.height_cm && kind === 'materasso' ? ` · H${v.height_cm}` : ''}</div></div><button class="btn btn--primary" data-act="add">Aggiungi al carrello</button>`
      : `<div class="meta">Configurazione non acquistabile online</div><a class="btn btn--ghost btn--sm" href="#buy">Cambia</a>`;
  renderPairings(idx, p, sel.size);
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
  el.innerHTML = `<h2 id="pair-t" style="font-size:1.6rem">${kind === 'materasso' ? 'Completa il letto' : kind === 'rete' ? 'Il materasso per questa rete' : 'Si abbina bene con'}</h2>
    ${size && kind !== 'guanciale' ? `<p class="muted small">Ti proponiamo solo articoli nella misura ${formatSize(size)}.</p>` : ''}
    ${groups.map((g) => `<h3 style="font-size:1rem;margin:18px 0 10px">${esc(KIND_PLURAL[g.kind])}</h3><div class="pair-row">${g.items.map((it) => pairHtml(idx, it)).join('')}</div>`).join('')}`;
}
function pairHtml(idx, it) {
  const p = it.product;
  const v = it.variant;
  const spec = v ? [v.size ? formatSize(v.size) : '', v.height_cm && idx.kind(p) === 'materasso' ? `H${v.height_cm}` : ''].filter(Boolean).join(' · ') : '';
  return `<div class="pair"><div class="pair__img">${coverHtml(idx, p, { sizes: '80px' })}</div>
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
  setMeta('Sleep Match: trova il tuo materasso', 'Qualche domanda su come dormi e ti proponiamo un solo materasso Vesuvio Sleep, con il perché. Senza budget e senza salvare le risposte.');
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
    if (!r) inner = `<div class="empty"><h3>Al momento non possiamo proporti un modello</h3><p>Non ci sono materassi acquistabili online. Scrivici e ti consigliamo noi.</p><a class="btn btn--ghost" href="#showroom">Contatti e showroom</a></div>`;
    else {
      state.sel[r.product.id] = { ...(state.sel[r.product.id] ?? {}), height: r.height };
      inner = `<p class="small muted">Il tuo risultato</p><div class="result">
        <div class="result__img">${coverHtml(idx, r.product, { sizes: '(max-width:860px) 92vw, 40vw', eager: true })}</div>
        <div><span class="buy__tech">${esc(r.product.technical_name)}</span><h2>${esc(r.product.name)}</h2>
          <ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          ${r.heightReason ? `<p class="note">${esc(r.heightReason)}</p>` : ''}
          <p>${priceFrom(idx, r.product)} <span class="small muted">IVA inclusa</span></p>
          <div class="btn-row"><a class="btn btn--primary" href="${href.product(r.product)}">Configura il tuo materasso</a><button class="btn btn--ghost" data-act="sm-restart">Ricomincia</button></div>
          <p class="small muted" style="margin-top:14px">È un'indicazione basata sulle tue risposte e sulle caratteristiche dei nostri modelli, non un parere medico. Le risposte non vengono salvate.</p></div></div>`;
    }
  }
  const html = `<header class="page-head wrap"><h1>Sleep Match</h1><p class="lead">Rispondi a qualche domanda: ti proponiamo un solo materasso, con il perché.</p></header><div class="wrap"><div class="quiz" id="quiz">${inner}</div></div>`;
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
  setMeta('Confronta i materassi', 'Confronto tra i materassi Vesuvio Sleep: tecnologia, composizione, altezze, prezzi e rivestimento.');
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
  app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: 'Confronto' }])}
  <header class="page-head wrap"><h1>Confronta i materassi</h1><p class="lead">Solo dati confermati dalla fabbrica, senza punteggi. Scegli fino a tre modelli.</p></header>
  <div class="wrap">
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
  bar.innerHTML = `<span>${n} ${n === 1 ? 'modello' : 'modelli'} da confrontare</span><a class="btn btn--sm" href="#confronto">Confronta</a><button class="icon-btn" style="color:#fff" data-act="cmp-clear" aria-label="Svuota il confronto">${icon('close', 18)}</button>`;
  document.body.append(bar);
}

// ---------------------------------------------------------------- MISURE
const SIZE_NAMES = { '80x190': 'Singolo', '90x200': 'Singolo lungo', '120x190': 'Una piazza e mezza', '140x190': 'Francese', '160x190': 'Matrimoniale', '165x190': 'Matrimoniale', '170x200': 'Matrimoniale grande', '180x200': 'Matrimoniale grande' };
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
  setMeta('Guida alle misure dei materassi', 'Le misure standard dei materassi Vesuvio Sleep a confronto in scala: singolo, piazza e mezza, matrimoniale. Fuori misura su richiesta.');
  const [a, b] = state.sizes;
  const opt = (sel) => STANDARD_SIZES.map((s) => `<option value="${s}" ${s === sel ? 'selected' : ''}>${formatSize(s)} – ${SIZE_NAMES[s]}</option>`).join('');
  app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: 'Guida alle misure' }])}
  <header class="page-head wrap"><h1>Guida alle misure</h1><p class="lead">Metti a confronto due misure in scala, vista dall'alto. La selezione resta quando torni alla scheda.</p></header>
  <div class="wrap two-col">
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
      <p style="margin-top:18px">Il materasso va scelto sulla misura interna del letto o della rete. Se non corrisponde a una misura standard, <a href="#fuori-misura">chiedi un preventivo fuori misura</a>.</p></div>
  </div>`;
}

// ---------------------------------------------------------------- FUORI MISURA
function viewQuote() {
  const idx = pub();
  setMeta('Materassi su misura e fuori misura', 'Richiedi un preventivo per un materasso fuori misura o con altezza personalizzata: ti rispondiamo su WhatsApp, senza pagamenti anticipati.');
  const prods = [...idx.publicProducts('materasso'), ...idx.publicProducts('rete'), ...idx.publicProducts('topper')];
  const pre = state.quoteFor && prods.find((p) => p.id === state.quoteFor);
  app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: 'Fuori misura' }])}
  <header class="page-head wrap"><h1>Fuori misura e altezze personalizzate</h1><p class="lead">Indica prodotto e misure. Ti mandiamo il prezzo su WhatsApp: niente pagamento online, la conferma avviene con noi.</p></header>
  <div class="wrap two-col">
    <form class="form" id="quote-form" novalidate>
      <div class="field"><label for="q-prod">Prodotto</label><select id="q-prod" name="product" required>${prods.map((p) => `<option value="${esc(p.id)}" ${pre?.id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="altro">Altro / non so ancora</option></select></div>
      <div class="row-2">
        <div class="field"><label for="q-w">Larghezza (cm)</label><input class="input" id="q-w" name="w" inputmode="numeric" required></div>
        <div class="field"><label for="q-l">Lunghezza (cm)</label><input class="input" id="q-l" name="l" inputmode="numeric" required></div>
        <div class="field"><label for="q-h">Altezza (cm)</label><input class="input" id="q-h" name="h" inputmode="numeric" placeholder="Facoltativa"></div>
      </div>
      <label class="check"><input type="checkbox" name="b2b" id="q-b2b"> È per un hotel, un B&amp;B o una struttura ricettiva</label>
      <div class="row-2" id="b2b-fields" hidden>
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
      : `<div class="note note--warn" role="status"><strong>Invio su WhatsApp non ancora attivo.</strong> Copia il riepilogo e invialo a Vesuvio Sleep; il numero per le richieste sarà pubblicato a breve.${CFG.preview ? `<br><span class="small">Anteprima: configura il numero da Admin › Impostazioni (${esc(wa.check.ok ? '' : wa.check.reason)})</span>` : ''}</div>`}
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
  setMeta('Carrello', 'Il tuo carrello Vesuvio Sleep.');
  if (!cart.items.length) {
    app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: 'Carrello' }])}<header class="page-head wrap"><h1>Carrello</h1></header>
    <div class="wrap"><div class="empty"><h3>Il carrello è vuoto</h3><p>Scegli un materasso e la misura: troverai qui il riepilogo da inviare su WhatsApp.</p><div class="btn-row" style="justify-content:center"><a class="btn btn--primary" href="#materassi">Esplora i materassi</a><a class="btn btn--ghost" href="#sleep-match">Trova il tuo materasso</a></div></div></div>`;
    return;
  }
  // funzione extra: rete della stessa misura se nel carrello c'è un materasso senza rete
  const cartSizes = new Set(v.lines.filter((l) => l.product && idx.kind(l.product) === 'materasso').map((l) => l.variant.size));
  const reteSizes = new Set(v.lines.filter((l) => l.product && idx.kind(l.product) === 'rete').map((l) => l.variant.size));
  const missing = [...cartSizes].filter((s) => !reteSizes.has(s));
  const reteSugg = missing.length
    ? idx.publicProducts('rete').map((p) => ({ p, v: idx.cheapestAtSize(p, missing[0]) })).filter((x) => x.v)
    : [];
  app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: 'Carrello' }])}
  <header class="page-head wrap"><h1>Carrello</h1><ol class="steps-mini" aria-label="Passaggi"><li aria-current="step">Carrello</li><li>Verifica</li><li>WhatsApp</li></ol></header>
  <div class="wrap cart">
    <div>
      ${v.lines.map((l) => cartLine(idx, l)).join('')}
      ${reteSugg.length ? `<section class="section--tight"><h2 style="font-size:1.3rem">Una rete della stessa misura</h2><p class="small muted">Hai un materasso ${formatSize(missing[0])}: queste reti sono nella stessa misura.</p><div class="pair-row">${reteSugg.map(({ p, v: rv }) => pairHtml(idx, { product: p, variant: rv, fromPrice: rv.price_cents })).join('')}</div></section>` : ''}
    </div>
    <aside class="summary" aria-label="Totale">
      <dl><dt>Articoli</dt><dd>${cart.count()}</dd><dt>Spedizione</dt><dd>Gratuita in Italia</dd><div class="tot" style="display:contents"><dt>Totale</dt><dd>${formatCents(v.total_cents)}</dd></div></dl>
      <p class="small muted">IVA inclusa. Nessun pagamento online: invii il riepilogo su WhatsApp e confermi con noi.</p>
      ${v.issues ? `<p class="note note--warn">${v.issues === 1 ? 'Un articolo va controllato' : v.issues + ' articoli vanno controllati'} prima di continuare.</p>` : ''}
      <a class="btn btn--primary" style="width:100%" href="#riepilogo" ${v.issues ? 'aria-disabled="true" data-act="blocked"' : ''}>Verifica il riepilogo</a>
      <p style="margin:12px 0 0;text-align:center"><a href="#materassi" class="small">Continua a scegliere</a></p>
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
  setMeta('Verifica il riepilogo', 'Controlla il riepilogo e invialo a Vesuvio Sleep su WhatsApp.');
  if (!cart.items.length) {
    location.hash = 'carrello';
    return;
  }
  const v = api.validateCart(cart.items); // ricontrollo "lato server"
  const head = `${crumbs([{ name: 'Home', href: '#' }, { name: 'Carrello', href: '#carrello' }, { name: 'Verifica' }])}
    <header class="page-head wrap"><h1>Verifica il riepilogo</h1><ol class="steps-mini" aria-label="Passaggi"><li>Carrello</li><li aria-current="step">Verifica</li><li>WhatsApp</li></ol></header>`;
  if (!v.canSubmit) {
    app.innerHTML = `${head}<div class="wrap"><div class="note note--warn" role="alert"><strong>Abbiamo ricontrollato il carrello e qualcosa è cambiato.</strong> Correggi gli articoli segnalati e riprova.</div>
      <div>${v.lines.map((l) => cartLine(catalog(), l)).join('')}</div><p style="margin-top:20px"><a class="btn btn--ghost" href="#carrello">Torna al carrello</a></p></div>`;
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
  const summary = { ref: req.ref, lines: toSummaryLines(v), total_cents: v.total_cents, shipping_note: store.db.settings.shipping_note };
  const plan = planWhatsApp(whatsappStatus().raw, summary);
  state.lastSummary = plan.fullText;
  app.innerHTML = `${head}<div class="wrap cart">
    <div>
      <table class="size-table" aria-label="Articoli"><thead><tr><th>Articolo</th><th>Q.tà</th><th style="text-align:right">Prezzo</th></tr></thead><tbody>
      ${summary.lines.map((l) => `<tr><td><strong>${esc(l.name)}</strong><br><span class="small muted">${[l.size ? formatSize(l.size) : '', l.height_cm && l.size ? 'H' + l.height_cm : ''].filter(Boolean).join(' · ')}${l.size ? ' · ' : ''}SKU ${esc(l.sku)}</span></td><td>${l.qty}</td><td style="text-align:right">${formatCents(l.unit_cents * l.qty)}</td></tr>`).join('')}
      </tbody></table>
      <dl class="facts-list" style="margin-top:16px"><dt>Totale</dt><dd><strong>${formatCents(v.total_cents)}</strong> IVA inclusa</dd><dt>Spedizione</dt><dd>${esc(store.db.settings.shipping_note)}</dd><dt>Riferimento</dt><dd>${esc(req.ref)}</dd></dl>
      <h2 style="font-size:1.2rem;margin-top:28px">Il messaggio che invierai</h2>
      <pre class="msg-preview" aria-label="Anteprima del messaggio">${esc(plan.text)}</pre>
      <p class="small muted">Il messaggio contiene solo articoli, prezzi e riferimento: nessun dato personale.</p>
    </div>
    <aside class="summary" aria-label="Invio">
      <h2 style="font-size:1.2rem">Invia la richiesta</h2>
      <div id="wa-status" aria-live="polite">${req.status === 'in_attesa_contatto' ? sentNote() : ''}</div>
      ${waBlock(plan, req.ref, 'cart')}
      <p class="small" style="margin-top:14px"><a href="#carrello">Modifica il carrello</a></p>
    </aside></div>`;
}
function sentNote() {
  return `<div class="note note--ok" style="margin-bottom:12px">Hai aperto WhatsApp. Se hai inviato il messaggio, Vesuvio Sleep ti risponderà lì per confermare. Il carrello resta salvato finché non lo svuoti. <button class="link-btn" data-act="cart-clear">Svuota il carrello</button></div>`;
}

// ---------------------------------------------------------------- ALTRE
function viewShowroom() {
  setMeta('Showroom e fabbrica a Casoria', 'Vesuvio Sleep, Via Raffaele Salierno 38, Casoria (NA). Orari dello showroom e indicazioni stradali.', [localBusinessJsonLd()]);
  app.innerHTML = `${crumbs([{ name: 'Home', href: '#' }, { name: 'Showroom' }])}<header class="page-head wrap"><h1>Showroom e fabbrica</h1></header><div class="wrap">${showroomHtml()}</div>`;
}
function viewNotFound() {
  setMeta('Pagina non trovata', '');
  app.innerHTML = `<div class="wrap section"><h1>Questa pagina non c'è</h1><p class="lead">Il prodotto potrebbe non essere più in catalogo o il link è incompleto.</p><div class="btn-row"><a class="btn btn--primary" href="#materassi">Vai ai materassi</a><a class="btn btn--ghost" href="#">Torna alla home</a></div></div>`;
}

// ---------------------------------------------------------------- EVENTI
function closeDrawer() {
  $('#drawer')?.classList.remove('is-open');
  $('#menu-btn')?.setAttribute('aria-expanded', 'false');
}
function currentProduct() {
  const m = /^prodotto-(.+)$/.exec(location.hash.slice(1));
  if (!m) return null;
  const idx = pub();
  return { idx, p: idx.snap.products.find((x) => x.slug === m[1]) };
}
function addVariant(v, qty = 1) {
  cart.set(addToCart(cart.items, v, qty));
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
      $$('.tab').forEach((b) => {
        const on = b === t;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
      });
      $('#home-grid').setAttribute('aria-labelledby', t.id);
      moveInk();
      swap($('#home-grid'), homeGrid(pub()));
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
      if (location.hash === '#fuori-misura') viewQuote();
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
      location.hash = 'guida-misure';
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
      const v = cp.idx.findVariant(cp.p, sel.size, kind === 'materasso' || kind === 'topper' ? sel.height : cp.idx.variantsOf(cp.p)[0]?.height_cm ?? null);
      if (!v || !cp.idx.purchasableVariants(cp.p).includes(v)) return toast('Questa configurazione non è acquistabile online');
      addVariant(v, sel.qty);
      $('#add-feedback').innerHTML = `<p class="note note--ok" style="margin:0">Aggiunto: ${esc(cp.p.name)}${v.size ? ' ' + formatSize(v.size) : ''}${kind === 'materasso' ? ' H' + v.height_cm : ''}. <a href="#carrello">Vai al carrello</a></p>`;
      break;
    }
    case 'add-variant': {
      const idx = catalog();
      const v = idx.variants.get(t.dataset.id);
      const p = v && idx.products.get(v.product_id);
      if (!v || !p || !idx.purchasableVariants(p).includes(v)) return toast('Articolo non disponibile');
      addVariant(v, 1);
      if (location.hash === '#carrello') viewCart();
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
      location.hash === '#riepilogo' ? viewReview() : viewCart();
      toast('Articolo rimosso');
      break;
    case 'accept-price': {
      const v = catalog().variants.get(t.dataset.id);
      cart.set(cart.items.map((i) => (i.variant_id === t.dataset.id ? { ...i, seen_price_cents: v.price_cents } : i)));
      location.hash === '#riepilogo' ? viewReview() : viewCart();
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
      location.hash = '';
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
});

document.addEventListener('keydown', (e) => {
  // frecce tra le tab categorie
  const tab = e.target.closest?.('.tab');
  if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const tabs = $$('.tab');
    const i = tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
    const n = tabs[(i + tabs.length) % tabs.length];
    n.focus();
    n.click();
  }
  if (e.key === 'Escape') closeDrawer();
});

document.addEventListener('submit', (e) => {
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

// ---------------------------------------------------------------- AVVIO
$('#menu-btn').addEventListener('click', () => {
  const d = $('#drawer');
  d.classList.add('is-open');
  $('#menu-btn').setAttribute('aria-expanded', 'true');
  $('#drawer a')?.focus();
});
$('#drawer .drawer__scrim').addEventListener('click', closeDrawer);
$('#drawer-close').addEventListener('click', closeDrawer);
window.addEventListener('hashchange', route);
window.addEventListener('resize', () => requestAnimationFrame(moveInk));
store.subscribe((why) => {
  if (why === 'cart' || why === 'settings' || why === 'catalog') renderChrome();
});
window.addEventListener('vs:rerender', route);
(async () => {
  await media.init();
  if (!store.storageOk) toast('Il browser blocca il salvataggio locale: carrello e admin non verranno ricordati');
  route();
})();
export { route };
