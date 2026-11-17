// Illustrazioni SCHEMATICHE dei prodotti (SVG generato), usate dove non ci sono
// foto confermate. Gli strati vengono dalla composizione pubblica del dataset;
// spessori e proporzioni NON sono in scala e non vanno letti come dati tecnici.

let uid = 0;
const C = 0.866;
const S = 0.5;

// Strati dall'alto verso il basso
const LAYERS = {
  eco: [
    { k: 'cover', label: 'Rivestimento', note: 'Antiacaro e ipoallergenico, non sfoderabile' },
    { k: 'foam', h: 16, label: 'Anima monoblocco', note: 'Poliuretano ad alta densità e alta portanza' },
  ],
  'memory-duo': [
    { k: 'cover', zip: true, label: 'Rivestimento sfoderabile', note: 'Lato invernale e lato estivo' },
    { k: 'memory', label: 'Memory Foam premium', note: 'Lo strato di comfort, ad alta densità' },
    { k: 'foam', h: 10, label: 'Base portante', note: 'Poliuretano ad alta densità' },
  ],
  // Stessa costruzione del Memory Duo, dichiarata dall'azienda; cambia il rivestimento.
  'memory-duo-classic': [
    { k: 'cover', label: 'Rivestimento fisso', note: 'Non sfoderabile' },
    { k: 'memory', label: 'Memory Foam premium', note: 'Lo strato di comfort, ad alta densità' },
    { k: 'foam', h: 10, label: 'Base portante', note: 'Poliuretano ad alta densità' },
  ],
  'memory-air-3d': [
    { k: 'cover', zip: true, mesh: true, label: 'Fascia perimetrale 3D', note: 'Traspirante, per la ventilazione laterale' },
    { k: 'memory', label: 'Memory Foam premium', note: 'Lo strato di comfort' },
    { k: 'foam', h: 10, label: 'Base portante', note: 'Poliuretano ad alta densità' },
  ],
  // 17/11/2026: strati ricavati dalle foto «esploso» consegnate dall'azienda, coerenti con la
  // composizione pubblicata (tre strati di Memory Foam). DA CONFERMARE i materiali di dettaglio.
  'memory-trio': [
    { k: 'cover', h: 8, label: 'Rivestimento', note: 'Trapuntato, con fascia laterale chiara' },
    { k: 'memory', label: 'Memory Foam', note: 'Primo dei tre strati, quello su cui ti sdrai' },
    { k: 'memory', c: 'cream', label: 'Memory Foam', note: 'Secondo strato' },
    { k: 'memory', c: 'sand', label: 'Memory Foam', note: 'Terzo strato: 27 cm in tutto' },
  ],
  // 17/11/2026: dalla foto «esploso» del Pocket 1600. DA CONFERMARE i materiali di dettaglio.
  'pocket-1600': [
    { k: 'cover', h: 8, label: 'Rivestimento', note: 'Trapuntato, con fascia laterale imbottita' },
    { k: 'memory', c: 'cream', label: 'Memory Foam', note: 'Lo strato di comfort' },
    { k: 'foam', c: 'white', h: 6, label: 'Poliuretano ad alta densità', note: 'Supporto e stabilizzazione' },
    { k: 'springs', label: 'Molle insacchettate', note: '1600 molle indipendenti' },
    { k: 'base', label: 'Base di stabilizzazione', note: 'Contiene il molleggio' },
  ],
  'pocket-3000-elite': [
    { k: 'cover', h: 8, zip: true, label: 'Rivestimento sfoderabile', note: 'Si apre con la cerniera' },
    { k: 'memory', label: 'Memory Foam', note: 'Lo strato di comfort' },
    { k: 'foam', h: 6, label: 'Poliuretano ad alta densità', note: 'Supporto e stabilizzazione' },
    { k: 'springs', label: 'Molle insacchettate', note: '3000 molle indipendenti' },
    { k: 'base', label: 'Base di stabilizzazione', note: 'Contiene il molleggio' },
  ],
};
// Rivestimento di ogni modello, preso dalle sue foto: colore del piano, fascia laterale,
// bordino, disegno della trapuntatura. Serve a riconoscere il modello anche nello schema.
const COVERS = {
  eco: { top: '#fbfbf8', side: '#efefea', sideR: '#e5e5df', piping: '#dcdcd5', stitch: '#bdb9ae', quilt: 'wave', band: 'plain' },
  'memory-duo-classic': { top: '#faf8f3', side: '#70402d', sideR: '#5c3324', piping: '#f3ede3', stitch: '#b8a48c', quilt: 'wave', band: 'diamond', handle: true },
  'memory-duo': { top: '#f8f8f6', side: '#454a51', sideR: '#383c42', piping: '#f2f2ef', stitch: '#a8acb2', quilt: 'ornate', band: 'diamond' },
  'memory-trio': { top: '#f1f2f3', side: '#e6e9eb', sideR: '#d9dde0', piping: '#ffffff', stitch: '#8b9298', quilt: 'hex', band: 'dots' },
  'pocket-1600': { top: '#f9f7f3', side: '#4d2c22', sideR: '#3f241b', piping: '#f2ece2', stitch: '#5f4136', quilt: 'puzzle', band: 'diamond', handle: true },
  'pocket-3000-elite': { top: '#fcfbf8', side: '#ab8464', sideR: '#957152', piping: '#c9ced2', stitch: '#b3ab9f', quilt: 'tuft', band: 'vertical', handle: true },
  'memory-air-3d': { top: '#fbf9f4', side: '#eef4f7', sideR: '#e2ebf0', piping: '#206786', stitch: '#c8785b', quilt: 'grid', band: 'plain' },
};
const DEFAULT_COVER = { top: '#fbf9f4', side: '#efe9dd', sideR: '#e4dccc', piping: '#206786', stitch: '#c8785b', quilt: 'grid', band: 'plain' };
export const coverFor = (slug) => COVERS[slug] ?? DEFAULT_COVER;

// Toni alternativi degli strati, per gli strati che nelle foto hanno colori diversi
const TONES = {
  cream: { top: '#f3ead7', l: '#e7dbc1', r: '#dacdae', dot: '#c9b48a' },
  sand: { top: '#e9d8c3', l: '#dbc6aa', r: '#ccb595', dot: '#b49674' },
  white: { top: '#f7f8f9', l: '#e9ecef', r: '#dde1e5', dot: '#c5ccd3' },
};
/** Colore di un riquadro della legenda: quello dello strato disegnato. */
export function swatchFor(p, l) {
  if (l.k === 'cover') return coverFor(p.slug).side === coverFor(p.slug).top ? coverFor(p.slug).top : `linear-gradient(180deg, ${coverFor(p.slug).top} 55%, ${coverFor(p.slug).side} 55%)`;
  return (l.c && TONES[l.c]?.top) || STYLE[l.k]?.top || '#ccc';
}

/** Strati dei modelli con composizione nota; il rivestimento porta il disegno del modello. */
export function layersFor(p) {
  const ls = LAYERS[p.slug];
  // fascia un po' più alta del minimo, così si legge il colore laterale del modello
  return ls ? ls.map((l) => (l.k === 'cover' ? { ...l, h: l.h ?? 8, cs: coverFor(p.slug) } : l)) : null;
}

const STYLE = {
  cover: { h: 6, top: '#fbf9f4', l: '#efe9dd', r: '#e4dccc' },
  memory: { h: 7, top: '#a9d0ea', l: '#85b8dc', r: '#6ea6cf' },
  foam: { h: 9, top: '#f3ead6', l: '#e6d9bb', r: '#d9c9a4' },
  springs: { h: 10, top: '#e9eef2', l: '#dfe6ec', r: '#cfd9e1' },
  base: { h: 5, top: '#2a6f8f', l: '#1d5873', r: '#164a61' },
  topper: { h: 5, top: '#a9d0ea', l: '#85b8dc', r: '#6ea6cf' },
};

function P(x, y, z, o) {
  return [o.cx + (x - y) * C, o.cy + (x + y) * S - z];
}
const pts = (arr) => arr.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');

function slab(o, z0, h, st, extra = '') {
  const { w, d } = o;
  const z1 = z0 + h;
  const top = [P(0, 0, z1, o), P(w, 0, z1, o), P(w, d, z1, o), P(0, d, z1, o)];
  const left = [P(0, d, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(0, d, z1, o)];
  const right = [P(w, 0, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(w, 0, z1, o)];
  return `<polygon points="${pts(left)}" fill="${st.l}"/><polygon points="${pts(right)}" fill="${st.r}"/><polygon points="${pts(top)}" fill="${st.top}"/>${extra}
    <polyline points="${pts([P(0, d, z1, o), P(w, d, z1, o), P(w, 0, z1, o)])}" fill="none" stroke="rgba(14,52,68,.18)" stroke-width=".8"/>`;
}

/** Una linea sul piano del materasso: punti (u, v) in [0,1] → coordinate proiettate. */
const onTop = (o, z, list) => pts(list.map(([u, v]) => P(o.w * u, o.d * v, z, o)));

function quiltTop(o, z1, cs) {
  const st = `stroke="${cs.stitch}" stroke-width=".9" fill="none"`;
  let s = '';
  const wave = (v, amp, n = 4, opacity = 0.6) => {
    const ps = [];
    for (let k = 0; k <= 48; k++) {
      const u = 0.04 + (0.92 * k) / 48;
      ps.push([u, v + amp * Math.sin(u * Math.PI * 2 * n)]);
    }
    return `<polyline points="${onTop(o, z1, ps)}" ${st} stroke-dasharray="2.2 2" opacity="${opacity}"/>`;
  };
  if (cs.quilt === 'wave') for (let j = 1; j < 7; j++) s += wave(j / 7, 0.035);
  else if (cs.quilt === 'ornate') {
    for (let j = 1; j < 6; j++) s += wave(j / 6, 0.04, 3, 0.5);
    for (let i = 0; i < 10; i++) {
      const [x, y] = P(o.w * (0.1 + ((i * 37) % 80) / 100), o.d * (0.12 + ((i * 53) % 76) / 100), z1, o);
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4" ry="2.2" ${st} opacity=".45"/>`;
    }
  } else if (cs.quilt === 'hex') {
    // catene di esagoni, come sul tessuto delle foto
    for (const [v0, v1] of [[0.2, 0.75], [0.55, 1.1]]) {
      for (let k = 0; k < 9; k++) {
        const u = 0.08 + k * 0.105;
        const v = v0 + (v1 - v0) * (k / 9) - 0.12;
        const r = 0.035;
        const hex = Array.from({ length: 7 }, (_, a) => [u + r * Math.cos((a * Math.PI) / 3), v + r * 1.3 * Math.sin((a * Math.PI) / 3)]);
        if (v > 0.03 && v < 0.97) s += `<polyline points="${onTop(o, z1, hex)}" ${st} opacity=".6"/>`;
      }
    }
    for (let j = 1; j < 5; j++) s += wave(j / 5, 0.03, 2, 0.35);
  } else if (cs.quilt === 'puzzle') {
    // trapuntatura a incastro: onde in entrambe le direzioni
    for (let j = 1; j < 6; j++) s += wave(j / 6, 0.03, 5, 0.6);
    for (let i = 1; i < 8; i++) {
      const ps = [];
      for (let k = 0; k <= 36; k++) {
        const v = 0.04 + (0.92 * k) / 36;
        ps.push([i / 8 + 0.025 * Math.sin(v * Math.PI * 8), v]);
      }
      s += `<polyline points="${onTop(o, z1, ps)}" ${st} opacity=".55"/>`;
    }
  } else if (cs.quilt === 'tuft') {
    // capitonné: bottoni con le pieghe che partono a raggiera
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 5; j++) {
        const u = (i + 0.5 + (j % 2) * 0.5) / 6.5;
        const v = (j + 0.5) / 5;
        const [x, y] = P(o.w * u, o.d * v, z1, o);
        s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.7" ry="1" fill="${cs.stitch}" opacity=".9"/>`;
        for (const [du, dv] of [[0.045, 0], [-0.045, 0], [0, 0.06], [0, -0.06]]) s += `<polyline points="${onTop(o, z1, [[u, v], [u + du, v + dv]])}" ${st} stroke-width=".6" opacity=".5"/>`;
      }
  } else {
    for (let i = 1; i < 7; i++) s += `<polyline points="${onTop(o, z1, [[i / 7, 0], [i / 7, 1]])}" ${st} stroke-dasharray="2.4 2.6" opacity=".55"/>`;
    for (let j = 1; j < 5; j++) s += `<polyline points="${onTop(o, z1, [[0, j / 5], [1, j / 5]])}" ${st} stroke-dasharray="2.4 2.6" opacity=".45"/>`;
  }
  return s;
}

/** Fascia laterale del rivestimento: colore e disegno del modello. */
function band(o, z0, h, cs, id) {
  const { w, d } = o;
  const z1 = z0 + h;
  const left = pts([P(0, d, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(0, d, z1, o)]);
  const right = pts([P(w, 0, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(w, 0, z1, o)]);
  let s = `<polygon points="${left}" fill="${cs.side}"/><polygon points="${right}" fill="${cs.sideR}"/>`;
  const line = (a, b, extra = '') => `<polyline points="${pts([a, b])}" stroke="${cs.stitch}" stroke-width=".7" fill="none" ${extra}/>`;
  if (cs.band === 'diamond') {
    const n = 22;
    for (let i = -2; i < n + 2; i++) {
      const x0 = (w * i) / n;
      const x1 = (w * (i + 2)) / n;
      if (x0 >= 0 && x1 <= w) {
        s += line(P(x0, d, z0 + 1, o), P(x1, d, z1 - 1, o), 'opacity=".55"');
        s += line(P(x1, d, z0 + 1, o), P(x0, d, z1 - 1, o), 'opacity=".55"');
      }
    }
    for (let j = 0; j < 14; j += 2) {
      const y0 = (d * j) / 16;
      const y1 = (d * (j + 2)) / 16;
      s += line(P(w, y0, z0 + 1, o), P(w, y1, z1 - 1, o), 'opacity=".45"');
      s += line(P(w, y1, z0 + 1, o), P(w, y0, z1 - 1, o), 'opacity=".45"');
    }
  } else if (cs.band === 'vertical') {
    for (let i = 1; i < 40; i++) s += line(P((w * i) / 40, d, z0 + 1, o), P((w * i) / 40, d, z1 - 1, o), 'opacity=".55"');
    for (let j = 1; j < 26; j++) s += line(P(w, (d * j) / 26, z0 + 1, o), P(w, (d * j) / 26, z1 - 1, o), 'opacity=".45"');
  } else if (cs.band === 'dots') {
    for (let i = 1; i < 30; i++) {
      const [x, y] = P((w * i) / 30, d, z0 + h * (i % 2 ? 0.35 : 0.65), o);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r=".9" fill="${cs.stitch}" opacity=".5"/>`;
    }
  } else {
    for (let i = 1; i < 26; i++) s += line(P((w * i) / 26, d, z0 + 1, o), P((w * i) / 26, d, z1 - 1, o), 'stroke-opacity=".25"');
  }
  if (cs.handle) {
    const a = P(w * 0.8, d, z0 + h * 0.3, o);
    const b = P(w * 0.9, d, z0 + h * 0.3, o);
    const c = P(w * 0.9, d, z0 + h * 0.72, o);
    const e = P(w * 0.8, d, z0 + h * 0.72, o);
    s += `<polygon points="${pts([a, b, c, e])}" fill="none" stroke="${cs.piping}" stroke-width=".9" opacity=".8"/>`;
  }
  return s;
}

function coverDetails(o, z0, h, ly, id) {
  const { w, d } = o;
  const z1 = z0 + h;
  const cs = ly.cs ?? DEFAULT_COVER;
  let s = '';
  if (ly.mesh) {
    s += `<polygon points="${pts([P(0, d, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(0, d, z1, o)])}" fill="url(#mesh${id})"/>`;
    s += `<polygon points="${pts([P(w, 0, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(w, 0, z1, o)])}" fill="url(#mesh${id})" opacity=".8"/>`;
  } else s += band(o, z0, h, cs, id);
  s += quiltTop(o, z1, cs);
  // bordino: sul piano e alla base della fascia
  s += `<polyline points="${pts([P(0, d, z1, o), P(w, d, z1, o), P(w, 0, z1, o)])}" fill="none" stroke="${cs.piping}" stroke-width="2.2" stroke-linejoin="round"/>`;
  s += `<polyline points="${pts([P(0, d, z0, o), P(w, d, z0, o), P(w, 0, z0, o)])}" fill="none" stroke="${cs.piping}" stroke-width="1.6" stroke-linejoin="round"/>`;
  if (ly.zip) s += `<polyline points="${pts([P(w * 0.08, d, z0 + h * 0.18, o), P(w * 0.92, d, z0 + h * 0.18, o)])}" stroke="#8a97a0" stroke-width=".9" stroke-dasharray="1.2 1.2" fill="none"/>`;
  return s;
}

function memoryDots(o, z0, h, color = '#6ea6cf') {
  let s = '';
  const z1 = z0 + h;
  for (let i = 0; i < 26; i++) {
    const x = ((i * 37) % 97) / 97;
    const y = ((i * 53) % 89) / 89;
    const [px, py] = P(o.w * (0.05 + 0.9 * x), o.d * (0.05 + 0.9 * y), z1, o);
    s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="1.1" ry=".6" fill="${color}" opacity=".55"/>`;
  }
  return s;
}

function springs(o, z0, h) {
  const { w, d } = o;
  let s = '';
  const n = 14;
  // file sulla faccia sinistra (anteriore)
  for (let i = 0; i < n; i++) {
    const x = (w * (i + 0.5)) / n;
    const [bx, by] = P(x, d, z0, o);
    const tone = i % 3 === 1 ? '#8fbadb' : '#f4f6f8';
    s += `<rect x="${(bx - 4.6).toFixed(1)}" y="${(by - h).toFixed(1)}" width="9.2" height="${h}" rx="3.5" fill="${tone}" stroke="rgba(14,52,68,.22)" stroke-width=".6"/>`;
    s += `<line x1="${(bx - 4).toFixed(1)}" x2="${(bx + 4).toFixed(1)}" y1="${(by - h / 2).toFixed(1)}" y2="${(by - h / 2).toFixed(1)}" stroke="rgba(14,52,68,.15)" stroke-width=".6"/>`;
  }
  // file sulla faccia destra
  const m = 11;
  for (let j = 0; j < m; j++) {
    const y = (d * (j + 0.5)) / m;
    const [bx, by] = P(w, y, z0, o);
    const tone = j % 3 === 2 ? '#7fb0d4' : '#e4eaef';
    s += `<rect x="${(bx - 4.2).toFixed(1)}" y="${(by - h).toFixed(1)}" width="8.4" height="${h}" rx="3.3" fill="${tone}" stroke="rgba(14,52,68,.2)" stroke-width=".6"/>`;
  }
  // tappi sul piano
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 7; j++) {
      const [px, py] = P((w * (i + 0.5)) / 9, (d * (j + 0.5)) / 7, z0 + h, o);
      s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="5" ry="2.6" fill="${(i + j) % 4 === 0 ? '#a9cbe4' : '#fff'}" stroke="rgba(14,52,68,.15)" stroke-width=".5"/>`;
    }
  return s;
}

/**
 * Materasso a strati. `ex` (0–1) apre gli strati: in CSS ogni strato usa
 * translateY(calc(var(--ex) * var(--i) * -1 * var(--gap))).
 */
export function mattressSvg(layers, { title = '', gap = 30, compact = false } = {}) {
  const id = ++uid;
  const o = { w: 200, d: 150, cx: 0, cy: 0 };
  const list = layers.map((l) => ({ ...l, h: (l.h ?? STYLE[l.k].h) * 2.2 }));
  const total = list.reduce((a, l) => a + l.h, 0);
  const maxLift = gap * (list.length - 1);
  // limiti della proiezione
  const minX = -o.d * C;
  const maxX = o.w * C;
  const pad = 14;
  o.cx = -minX + pad;
  o.cy = pad + total + (compact ? gap * 0.6 : maxLift) + 2;
  const vbW = maxX - minX + pad * 2;
  const vbH = o.cy + (o.w + o.d) * S + pad;
  let z = 0;
  const groups = [];
  // dal basso verso l'alto: l'ultimo disegnato copre quelli sotto
  [...list].reverse().forEach((ly, i) => {
    const tone = ly.c && TONES[ly.c];
    const st = ly.k === 'cover' && ly.cs ? { top: ly.cs.top, l: ly.cs.side, r: ly.cs.sideR } : tone ? { ...STYLE[ly.k], ...tone } : STYLE[ly.k];
    let inner = slab(o, z, ly.h, st);
    if (ly.k === 'cover') inner += coverDetails(o, z, ly.h, ly, id);
    if (ly.k === 'memory') inner += memoryDots(o, z, ly.h, tone?.dot);
    if (ly.k === 'springs') inner += springs(o, z, ly.h);
    groups.push(`<g class="ly" style="--i:${i}">${inner}</g>`);
    z += ly.h;
  });
  // ombra a terra
  const shadow = `<polygon points="${pts([P(-6, -6, 0, o), P(o.w + 6, -6, 0, o), P(o.w + 10, o.d + 10, 0, o), P(-6, o.d + 6, 0, o)])}" fill="rgba(14,52,68,.16)" filter="url(#blur${id})"/>`;
  return `<svg class="mx" viewBox="0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}" style="--gap:${gap}px" role="img" aria-label="${title ? title + ': ' : ''}schema illustrativo degli strati, non in scala">
    <defs><filter id="blur${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
    <pattern id="mesh${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="5" height="5" fill="#eef4f7"/><circle cx="2.5" cy="2.5" r="1.25" fill="#9fc2d6"/></pattern></defs>
    ${shadow}${groups.join('')}</svg>`;
}

export function baseSvg(strong = false) {
  const o = { w: 210, d: 150, cx: 0, cy: 0 };
  const pad = 14;
  o.cx = o.d * C + pad;
  o.cy = pad + 30;
  const vbW = (o.w + o.d) * C + pad * 2;
  const vbH = o.cy + (o.w + o.d) * S + pad + 20;
  const frame = '#1d5873';
  let s = `<polygon points="${pts([P(-4, -4, 0, o), P(o.w + 4, -4, 0, o), P(o.w + 8, o.d + 8, 0, o), P(-4, o.d + 4, 0, o)])}" fill="rgba(14,52,68,.14)"/>`;
  // piedi
  for (const [x, y] of [[4, o.d - 4], [o.w - 4, o.d - 4], [o.w - 4, 4]]) {
    const [a, b] = P(x, y, 0, o);
    s += `<rect x="${(a - 2.5).toFixed(1)}" y="${(b - 18).toFixed(1)}" width="5" height="18" rx="1.5" fill="${frame}"/>`;
  }
  // telaio
  s += slab(o, 18, strong ? 7 : 5, { top: '#2a6f8f', l: frame, r: '#164a61' });
  // doghe in legno
  const n = strong ? 16 : 13;
  for (let i = 0; i < n; i++) {
    const x = (o.w * (i + 0.5)) / n;
    const a = P(x - 4, 6, 24 + (strong ? 2 : 0), o);
    const b = P(x + 4, 6, 24 + (strong ? 2 : 0), o);
    const c = P(x + 4, o.d - 6, 24 + (strong ? 2 : 0), o);
    const d = P(x - 4, o.d - 6, 24 + (strong ? 2 : 0), o);
    s += `<polygon points="${pts([a, b, c, d])}" fill="${i % 2 ? '#dcbf91' : '#e6cda3'}" stroke="#b8975f" stroke-width=".5"/>`;
  }
  return `<svg class="mx" viewBox="0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}" role="img" aria-label="Schema illustrativo della rete a doghe">${s}</svg>`;
}

export function pillowSvg(variant = 'classic') {
  const id = ++uid;
  const cervical = variant === 'cervical';
  const body = cervical
    ? 'M40 92 C40 60 70 52 120 56 C150 58 160 70 180 70 C200 70 210 58 240 56 C280 54 300 66 300 92 C300 120 270 128 170 128 C70 128 40 122 40 92 Z'
    : 'M46 70 C40 50 70 40 170 40 C270 40 300 50 294 70 C300 92 300 106 294 124 C300 142 270 152 170 152 C70 152 40 142 46 124 C40 106 40 92 46 70 Z';
  const fill = variant === 'piuma' ? '#fbf9f4' : variant === 'flakes' ? '#eef5fa' : '#e3eff8';
  return `<svg class="mx mx--pillow" viewBox="0 0 340 190" role="img" aria-label="Schema illustrativo del guanciale">
    <defs><radialGradient id="pg${id}" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${fill}"/></radialGradient>
    <filter id="pb${id}"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <ellipse cx="170" cy="${cervical ? 146 : 166}" rx="130" ry="12" fill="rgba(14,52,68,.16)" filter="url(#pb${id})"/>
    <path d="${body}" fill="url(#pg${id})" stroke="rgba(14,52,68,.25)" stroke-width="1.4"/>
    <path d="${body}" fill="none" stroke="#c8785b" stroke-width="1.3" stroke-dasharray="4 4" transform="translate(170 ${cervical ? 92 : 96}) scale(.9) translate(-170 -${cervical ? 92 : 96})" opacity=".7"/>
    ${variant === 'flakes' ? Array.from({ length: 18 }, (_, i) => `<circle cx="${80 + ((i * 47) % 180)}" cy="${70 + ((i * 29) % 60)}" r="2.2" fill="#9fc2d6" opacity=".6"/>`).join('') : ''}
  </svg>`;
}

/** Illustrazione per un prodotto, in base a categoria e slug. */
export function productIllustration(p, kind, opts = {}) {
  if (kind === 'rete') return baseSvg(/strong/.test(p.slug));
  if (kind === 'guanciale') return pillowSvg(/cerv/.test(p.slug) ? 'cervical' : /piuma/.test(p.slug) ? 'piuma' : /flakes/.test(p.slug) ? 'flakes' : 'classic');
  if (kind === 'topper') return mattressSvg([{ k: 'cover', zip: true, h: 4, label: '' }, { k: 'topper', label: '' }], { title: p.name, ...opts });
  const ls = layersFor(p);
  // composizione non confermata: materasso chiuso, senza strati
  if (!ls) return mattressSvg([{ k: 'cover', h: 20, label: '', cs: coverFor(p.slug) }], { title: p.name, ...opts, gap: 0 });
  return mattressSvg(ls, { title: p.name, ...opts });
}
