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

/** Da chiamare dopo ogni render di pagina. */
export function enhance(root = document) {
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

// stato dell'header durante lo scorrimento
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    document.body.classList.toggle('is-scrolled', window.scrollY > 12);
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

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
