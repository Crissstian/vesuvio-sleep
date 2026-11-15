// Markup dell'apertura, senza dipendenze dal DOM: usato dall'app e da
// scripts/static_hero.mjs, che lo scrive direttamente in index.html.
import { naplesSvg } from './naples.js';
import { SITE_SLOTS, HERO_SLIDES, HERO_CAPTIONS } from './slots.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Diapositive predefinite (senza foto caricate dall'admin). */
export function defaultSlides() {
  return HERO_SLIDES.map((key) => {
    const d = SITE_SLOTS.find((x) => x.key === key)?.default;
    return d ? { key, ...d, caption: HERO_CAPTIONS[key], illustrative: true } : null;
  }).filter(Boolean);
}

// Marchio cucito: profilo del Vesuvio che si disegna durante l'ingresso
const MARK = 'M10 74 C 30 66, 44 56, 58 44 C 64 38, 68 34, 74 34 C 79 34, 82 38, 86 40 C 90 30, 96 22, 104 22 C 112 22, 118 32, 124 42 C 138 56, 152 66, 170 74';

export function heroHtml(slides = defaultSlides()) {
  const visual = slides.length
    ? `<div class="hero__slides" data-slides="${slides.length}">${slides
        .map(
          (s, i) => `<figure class="slide${i === 0 ? ' is-active' : ''}" data-i="${i}" data-caption="${esc(s.caption)}" data-illustrative="${s.illustrative ? 1 : 0}" ${i === 0 ? '' : 'aria-hidden="true"'}>
          <img src="${esc(s.src)}" ${s.srcset ? `srcset="${esc(s.srcset)}" sizes="100vw"` : ''} alt="${esc(s.alt)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`,
        )
        .join('')}</div>`
    : `<div class="hero__slides"><figure class="slide is-active">${naplesSvg({ id: 'hn' })}</figure></div>`;
  const dots =
    slides.length > 1
      ? `<div class="hero__ctrl" role="group" aria-label="Immagini dell'apertura">
        ${slides.map((s, i) => `<button class="hero__dot${i === 0 ? ' is-active' : ''}" data-act="hero-go" data-i="${i}" aria-label="Immagine ${i + 1}: ${esc(s.caption)}" aria-current="${i === 0}"><span></span></button>`).join('')}
        <button class="hero__pause" data-act="hero-pause" aria-pressed="false" aria-label="Metti in pausa le immagini"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path class="i-pause" d="M3 2h3v10H3zM8 2h3v10H8z"/><path class="i-play" d="M3 2l9 5-9 5z"/></svg></button>
      </div>`
      : '';
  return `<section class="hero hero--slides is-intro" aria-labelledby="hero-title" aria-roledescription="presentazione">
    <div class="hero__visual">
      ${visual}
      <div class="hero__scrim"></div>
      <div class="hero__intro" aria-hidden="true"><i></i><i></i><i></i><i></i>
        <svg class="hero__mark" viewBox="0 0 180 90"><path pathLength="1" d="${MARK}"/></svg>
      </div>
      ${dots}
      <span class="hero__badge" id="hero-badge"></span>
    </div>
    <div class="hero__content">
      <p class="hero__kicker">Fabbrica di materassi a Casoria, Napoli</p>
      <h1 id="hero-title"><span class="ln"><span>Materassi di</span></span><span class="ln"><span>fabbrica, cuciti</span></span><span class="ln"><span>sotto il <em>Vesuvio</em>.</span></span></h1>
      <p class="lead">Dal 1986 li produciamo noi, alle porte di Napoli, e li vendiamo senza intermediari: prezzo di fabbrica, misure standard e, su richiesta, misure e altezze personalizzate.</p>
      <div class="btn-row">
        <a class="btn btn--primary" href="#materassi">Esplora i materassi</a>
        <a class="btn btn--glass" href="#sleep-match">Trova il tuo materasso</a>
      </div>
      ${slides.length ? `<p class="hero__caption" id="hero-caption"><span>${esc(slides[0].caption)}</span></p>` : ''}
    </div>
    <ul class="hero__strip" aria-label="In breve">
      <li><strong>Dal 1986</strong>Produzione a Casoria</li>
      <li><strong>Prezzo di fabbrica</strong>Senza intermediari</li>
      <li><strong>Su misura</strong>Misure e altezze a richiesta</li>
      <li><strong>Spedizione gratuita</strong>In Italia, isole comprese</li>
    </ul>
  </section>`;
}
