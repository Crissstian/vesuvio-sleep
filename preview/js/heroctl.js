// Regia dell'apertura: ingresso a strati, cambio immagine con "telo" che scorre,
// zoom lento, avanzamento cucito sui pallini, pausa, swipe.
// Il tempo di ogni immagine lo scandisce l'animazione CSS del pallino attivo:
// in pausa (o con movimento ridotto) l'animazione si ferma e la presentazione pure.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHero(hero) {
  if (!hero || hero.dataset.ready) return;
  hero.dataset.ready = '1';
  const slides = [...hero.querySelectorAll('.slide')];
  const dots = [...hero.querySelectorAll('.hero__dot')];
  const caption = hero.querySelector('#hero-caption span');
  const badge = hero.querySelector('#hero-badge');
  const pauseBtn = hero.querySelector('.hero__pause');
  // l'ingresso dura poco: dopo si toglie la classe, così non si ripete
  setTimeout(() => hero.classList.remove('is-intro'), reduced() ? 0 : 2300);
  if (slides.length < 2) return;

  let i = 0;
  let busy = false;
  let userPaused = reduced();
  const setPaused = () => {
    const auto = hero.dataset.offscreen === '1' || document.hidden;
    hero.classList.toggle('is-paused', userPaused || auto);
    pauseBtn?.setAttribute('aria-pressed', String(userPaused));
    pauseBtn?.setAttribute('aria-label', userPaused ? 'Riprendi le immagini' : 'Metti in pausa le immagini');
  };
  setPaused();

  function go(n, dir = 1) {
    if (busy || n === i) return;
    busy = true;
    const prev = slides[i];
    const next = slides[(n + slides.length) % slides.length];
    i = (n + slides.length) % slides.length;
    next.classList.remove('dir-back');
    if (dir < 0) next.classList.add('dir-back');
    prev.classList.add('is-leaving');
    next.classList.add('is-active', 'is-entering');
    next.removeAttribute('aria-hidden');
    const done = () => {
      prev.classList.remove('is-active', 'is-leaving');
      prev.setAttribute('aria-hidden', 'true');
      next.classList.remove('is-entering');
      busy = false;
    };
    setTimeout(done, reduced() ? 0 : 1250);
    dots.forEach((d, k) => {
      const on = k === i;
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-current', String(on));
    });
    // riavvia l'avanzamento del pallino attivo
    const bar = dots[i]?.querySelector('span');
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
    }
    if (caption) {
      caption.classList.remove('is-in');
      void caption.offsetWidth;
      caption.textContent = next.dataset.caption || '';
      caption.classList.add('is-in');
    }

  }

  dots.forEach((d) => {
    d.addEventListener('click', () => go(Number(d.dataset.i), Number(d.dataset.i) > i ? 1 : -1));
    d.querySelector('span')?.addEventListener('animationend', () => {
      if (d.classList.contains('is-active') && !hero.classList.contains('is-paused')) go(i + 1);
    });
  });
  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    setPaused();
  });

  // swipe orizzontale sull'immagine (mobile)
  let x0 = null;
  const vis = hero.querySelector('.hero__visual');
  vis.addEventListener('pointerdown', (e) => (x0 = e.clientX), { passive: true });
  vis.addEventListener(
    'pointerup',
    (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1, dx < 0 ? 1 : -1);
    },
    { passive: true },
  );

  // pausa automatica quando l'apertura non si vede o la scheda è nascosta
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      hero.dataset.offscreen = e.isIntersecting ? '0' : '1';
      setPaused();
    }).observe(hero);
  }
  const onVis = () => (hero.isConnected ? setPaused() : document.removeEventListener('visibilitychange', onVis));
  document.addEventListener('visibilitychange', onVis);
}

/** Leggera inclinazione 3D delle card al passaggio del puntatore (solo desktop). */
export function tiltCards(root) {
  if (reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  root.querySelectorAll('.card').forEach((c) => {
    if (c.dataset.tilt) return;
    c.dataset.tilt = '1';
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      c.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
    });
    c.addEventListener('pointerleave', () => {
      c.style.setProperty('--rx', '0deg');
      c.style.setProperty('--ry', '0deg');
    });
  });
}
