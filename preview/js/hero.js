// Markup della hero, senza dipendenze dal DOM: usato dall'app e da
// scripts/static_hero.mjs per scriverlo direttamente in index.html.
import { naplesSvg } from './naples.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** photo: { src, alt } caricata dall'admin nello spazio "hero_napoli"; senza, illustrazione. */
export function heroHtml(photo = null) {
  const art = photo
    ? `<img class="hero__photo" src="${esc(photo.src)}" alt="${esc(photo.alt)}" fetchpriority="high">`
    : naplesSvg({ id: 'hn' });
  return `<section class="hero hero--naples" aria-labelledby="hero-title">
    <div class="hero__visual">
      <div class="hero__par"><div class="hero__scene">${art}</div></div>
      <div class="hero__scrim"></div>
      <div class="hero__sheets" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <span class="hero__badge">${photo ? 'Napoli' : 'Illustrazione provvisoria: qui andrà la foto di Napoli'}</span>
    </div>
    <div class="hero__content">
      <p class="hero__kicker">Fabbrica di materassi a Casoria, Napoli</p>
      <h1 id="hero-title"><span class="ln"><span>Materassi di</span></span><span class="ln"><span>fabbrica, cuciti</span></span><span class="ln"><span>sotto il <em>Vesuvio</em>.</span></span></h1>
      <p class="lead">Dal 1986 li produciamo noi, alle porte di Napoli, e li vendiamo senza intermediari: prezzo di fabbrica, misure standard e, su richiesta, misure e altezze personalizzate.</p>
      <div class="btn-row">
        <a class="btn btn--primary" href="#materassi">Esplora i materassi</a>
        <a class="btn btn--glass" href="#sleep-match">Trova il tuo materasso</a>
      </div>
    </div>
    <ul class="hero__strip" aria-label="In breve">
      <li><strong>Dal 1986</strong>Produzione a Casoria</li>
      <li><strong>Prezzo di fabbrica</strong>Senza intermediari</li>
      <li><strong>Su misura</strong>Misure e altezze a richiesta</li>
      <li><strong>Spedizione gratuita</strong>In Italia, isole comprese</li>
    </ul>
  </section>`;
}
