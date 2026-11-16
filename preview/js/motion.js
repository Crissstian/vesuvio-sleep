// Movimento e micro-interazioni. Tutto rispetta prefers-reduced-motion e il
// contenuto resta leggibile anche se nessuna animazione parte.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.documentElement.classList.add('js');

let io;
function revealObserver() {
  if (io) return io;
  if (!('IntersectionObserver' in window)) return null;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        if (e.target.dataset.count) countUp(e.target);
        if (e.target.hasAttribute('data-autoexplode')) e.target.dispatchEvent(new CustomEvent('vs:visible'));
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  return io;
}

function countUp(el) {
  const to = Number(el.dataset.count);
  const from = Number(el.dataset.from ?? 0);
  if (reduced() || !Number.isFinite(to)) {
    el.textContent = el.dataset.final ?? String(to);
    return;
  }
  const dur = 1300;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = String(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = el.dataset.final ?? String(to);
  };
  requestAnimationFrame(step);
}

// ------------------------------------------------------------------ scorrimento
// Una sola funzione, una volta per fotogramma: cucitura di avanzamento in cima,
// hero che si allontana, foto che scorrono più lente della pagina.
let ticking = false;
const PAR = '.page-hero__bg img, .factory-band__img img, .statement__img img';
export function scrollUpdate() {
  ticking = false;
  const y = window.scrollY;
  // stato dell'header durante lo scorrimento
  document.body.classList.toggle('is-scrolled', y > 12);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  document.querySelector('.seam-progress')?.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
  if (reduced()) return;
  const hero = document.querySelector('#app > .hero');
  if (hero) hero.style.setProperty('--hs', Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight))).toFixed(3));
  const vh = window.innerHeight;
  // fascia cinetica: le due righe scorrono in versi opposti con la pagina
  const kin = document.querySelector('.kinetic');
  if (kin) {
    const r = kin.getBoundingClientRect();
    if (r.bottom > -100 && r.top < vh + 100) kin.style.setProperty('--kx', `${((vh - r.top) * 0.22).toFixed(1)}px`);
  }
  // anatomia del materasso: la foto si apre mentre entra nello schermo
  const an = document.querySelector('[data-anatomy]');
  if (an) {
    const r = an.getBoundingClientRect();
    an.style.setProperty('--ap', Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.75))).toFixed(3));
  }
  const gm = document.querySelector('.pdp .gallery__main');
  if (gm) gm.style.setProperty('--gs', Math.min(1, Math.max(0, y / Math.max(1, gm.offsetHeight * 1.2))).toFixed(3));
  document.querySelectorAll(PAR).forEach((img) => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const c = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
    img.style.setProperty('--py', `${(-c * r.height * 0.05).toFixed(1)}px`);
  });
}
window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(scrollUpdate);
    }
  },
  { passive: true },
);
window.addEventListener('resize', () => requestAnimationFrame(scrollUpdate));
requestAnimationFrame(scrollUpdate);

/** Da chiamare dopo ogni render di pagina. */
export function enhance(root = document) {
  requestAnimationFrame(scrollUpdate);
  enhanceTouch(root);
  const obs = revealObserver();
  root.querySelectorAll('.rv, .kb, [data-count], [data-autoexplode]').forEach((el) => {
    if (obs) obs.observe(el);
    else {
      el.classList.add('in');
      if (el.dataset.count) el.textContent = el.dataset.final ?? el.dataset.count;
    }
  });
  // parallasse leggero della hero sul puntatore (solo desktop, breve, transform)
  const hero = root.querySelector('.hero');
  const par = hero?.querySelector('.hero__par');
  if (hero && par && fine() && !reduced()) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      par.style.setProperty('--px', `${(-x * 12).toFixed(1)}px`);
      par.style.setProperty('--py', `${(-y * 8).toFixed(1)}px`);
    });
    hero.addEventListener('pointerleave', () => {
      par.style.setProperty('--px', '0px');
      par.style.setProperty('--py', '0px');
    });
  }
}

// alone che segue il puntatore sui bottoni principali
document.addEventListener(
  'pointermove',
  (e) => {
    const b = e.target.closest?.('.btn--primary');
    if (!b || !fine()) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`);
    b.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
  { passive: true },
);


export function bump(el) {
  if (!el || reduced()) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

/** Apre gradualmente gli strati di un'illustrazione (0 → target). */
export function explode(el, target = 0.75, dur = 1100) {
  if (!el) return;
  if (reduced()) {
    el.style.setProperty('--ex', String(target));
    return;
  }
  const from = Number(getComputedStyle(el).getPropertyValue('--ex')) || 0;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.style.setProperty('--ex', (from + (target - from) * e).toFixed(3));
    const input = el.querySelector('input[type=range]');
    if (input) input.value = String(Math.round((from + (target - from) * e) * 100));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}


// ------------------------------------------------------------------ vetrina della home
// Il modello sotto il puntatore (o col focus) va in scena. Sul telefono è un carosello a scorrimento.
function showItem(row) {
  const item = row.closest('.showcase__item');
  if (!item || item.classList.contains('is-active')) return;
  item.parentElement.querySelectorAll('.showcase__item').forEach((x) => x.classList.toggle('is-active', x === item));
}
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;
  const row = e.target.closest?.('.showcase__row');
  if (row) showItem(row);
});
document.addEventListener('focusin', (e) => {
  const row = e.target.closest?.('.showcase__row');
  if (row) showItem(row);
});

// ------------------------------------------------------------------ il prodotto segue il puntatore
// Scena della galleria e della vetrina: la foto si inclina di pochi gradi.
document.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType === 'touch' || reduced()) return;
    const el = e.target.closest?.('[data-tilt], .showcase');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  },
  { passive: true },
);
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest?.('[data-tilt], .showcase');
  if (el && !el.contains(e.relatedTarget)) {
    el.style.setProperty('--tx', 0);
    el.style.setProperty('--ty', 0);
  }
});

// ------------------------------------------------------------------ pulsanti: una luce segue il puntatore
document.addEventListener(
  'pointermove',
  (e) => {
    const b = e.target.closest?.('.btn--primary, .btn--wa');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`);
    b.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
  { passive: true },
);

// ================================================================== TELEFONO
// Sul telefono non c'è il puntatore: gli effetti seguono il dito e lo scorrimento.
const coarse = () => window.matchMedia('(hover: none), (max-width: 900px)').matches;

// ---- tocco: un'onda parte dal punto premuto (pulsanti, misure, schede, righe del menu)
const RIPPLE = '.btn, .seg label, .chip, .tab, .thumb, .showcase__row, .drawer__panel a, .qty button, .pay, .faq__item summary';
document.addEventListener(
  'pointerdown',
  (e) => {
    if (reduced()) return;
    const el = e.target.closest?.(RIPPLE);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const w = document.createElement('span');
    w.className = 'tap-wave';
    w.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('has-wave');
    el.appendChild(w);
    w.addEventListener('animationend', () => w.remove(), { once: true });
  },
  { passive: true },
);

// ---- vibrazione breve quando si aggiunge al carrello (dove il telefono la supporta)
document.addEventListener('click', (e) => {
  if (e.target.closest?.('[data-act="add"], [data-act="add-variant"]')) navigator.vibrate?.(12);
});

// ---- carosello della vetrina: la scheda al centro è in primo piano, i puntini seguono
function carouselUpdate(list) {
  const items = [...list.children];
  if (!items.length || list.scrollWidth <= list.clientWidth + 4) return;
  const mid = list.scrollLeft + list.clientWidth / 2;
  let best = 0;
  let bestD = Infinity;
  items.forEach((it, i) => {
    const c = it.offsetLeft + it.offsetWidth / 2;
    const d = (c - mid) / list.clientWidth;
    it.style.setProperty('--off', Math.max(-1, Math.min(1, d)).toFixed(3));
    if (Math.abs(d) < bestD) {
      bestD = Math.abs(d);
      best = i;
    }
  });
  items.forEach((it, i) => it.classList.toggle('is-center', i === best));
  const dots = list.parentElement.querySelector('.car-dots');
  dots?.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === best));
}
function setupCarousels(root) {
  root.querySelectorAll('.showcase__list').forEach((list) => {
    if (list.dataset.car) return;
    list.dataset.car = '1';
    const dots = document.createElement('div');
    dots.className = 'car-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = [...list.children].map(() => '<i></i>').join('');
    list.after(dots);
    let raf = 0;
    list.addEventListener('scroll', () => (raf ||= requestAnimationFrame(() => ((raf = 0), carouselUpdate(list)))), { passive: true });
    requestAnimationFrame(() => carouselUpdate(list));
  });
}

// ---- galleria della scheda: si sfoglia col dito
let swipe = null;
document.addEventListener(
  'touchstart',
  (e) => {
    const g = e.target.closest?.('.gallery__main');
    swipe = g && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, g } : null;
  },
  { passive: true },
);
document.addEventListener(
  'touchmove',
  (e) => {
    if (!swipe) return;
    const dx = e.touches[0].clientX - swipe.x;
    const dy = e.touches[0].clientY - swipe.y;
    if (Math.abs(dy) > Math.abs(dx) + 6) return (swipe = null);
    swipe.dx = dx;
    if (!reduced()) swipe.g.style.setProperty('--drag', `${(dx * 0.35).toFixed(1)}px`);
  },
  { passive: true },
);
document.addEventListener('touchend', () => {
  if (!swipe) return;
  const { dx = 0, g } = swipe;
  swipe = null;
  g.style.removeProperty('--drag');
  if (Math.abs(dx) < 44) return;
  const thumbs = [...document.querySelectorAll('.thumbs .thumb')];
  if (thumbs.length < 2) return;
  const cur = thumbs.findIndex((t) => t.getAttribute('aria-current') === 'true');
  const next = (cur + (dx < 0 ? 1 : -1) + thumbs.length) % thumbs.length;
  document.documentElement.style.setProperty('--swipe-dir', dx < 0 ? 1 : -1);
  thumbs[next].click();
  document.activeElement?.blur?.();
});

// ---- al centro dello schermo: sul telefono fa le veci del passaggio del mouse
let centerIO = null;
function setupCenter(root) {
  if (!coarse() || !('IntersectionObserver' in window)) return;
  centerIO ||= new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-center', e.isIntersecting)), { rootMargin: '-38% 0px -38% 0px' });
  root.querySelectorAll('.card, .pair, .promise li, .anatomy__list li, .tiles li, .ship__card, .guide-card, .contact-card').forEach((el) => centerIO.observe(el));
}

// ---- il pulsante WhatsApp si fa da parte mentre scendi e torna quando risali
let lastY = 0;
window.addEventListener(
  'scroll',
  () => {
    const y = window.scrollY;
    if (Math.abs(y - lastY) < 14) return;
    document.body.classList.toggle('is-down', y > lastY && y > 240);
    lastY = y;
  },
  { passive: true },
);

/** Da chiamare dopo ogni render (lo fa enhance). */
export function enhanceTouch(root = document) {
  setupCarousels(root);
  setupCenter(root);
}
