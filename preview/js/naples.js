// Panorama ILLUSTRATO del Golfo di Napoli: segnaposto dell'apertura finché non
// viene caricata una foto reale dall'admin (slot "hero_napoli"). Nessun elemento
// esterno: tutto SVG, animazioni solo CSS e rispettose di prefers-reduced-motion.

// Profilo Somma–Vesuvio (coordinate del viewBox 1600×1000), usato anche dalla cucitura
export const NAPLES_RIDGE = 'M 610 640 C 700 600, 760 560, 840 520 C 880 500, 905 470, 930 462 C 960 452, 990 458, 1010 470 C 1030 452, 1052 418, 1078 414 C 1104 410, 1126 440, 1150 470 C 1210 520, 1300 572, 1420 620 C 1480 640, 1540 648, 1600 650';

function windows(x, y, w, h, seed) {
  let s = '';
  const cols = Math.max(1, Math.floor(w / 9));
  const rows = Math.max(1, Math.floor(h / 12));
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 13 + seed) % 5 === 0) continue;
      s += `<rect x="${x + 3 + i * 9}" y="${y + 4 + j * 12}" width="3.4" height="5" fill="${(i + j + seed) % 4 === 0 ? '#ffe2a8' : 'rgba(14,52,68,.3)'}"/>`;
    }
  return s;
}

function city() {
  // case affacciate sul lungomare, colori dei palazzi napoletani
  const palette = ['#e8c49a', '#d99d7c', '#f1dfc4', '#e3b28f', '#cfa58a', '#efd2a9', '#d7b8a0', '#e9cbb2'];
  let s = '';
  let x = 0;
  let k = 0;
  while (x < 640) {
    const w = 26 + ((k * 37) % 30);
    const h = 26 + ((k * 53) % 46) + (x < 260 ? 18 : 0);
    const y = 664 - h;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h + 8}" fill="${palette[k % palette.length]}"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="3" fill="rgba(255,255,255,.35)"/>`;
    s += windows(x, y, w, h, k);
    x += w - 2;
    k++;
  }
  // collina del Vomero con Castel Sant'Elmo stilizzato
  s = `<path d="M0 600 C 80 560, 170 548, 250 566 C 300 576, 330 590, 380 612 L 380 664 L 0 664 Z" fill="#7d8f7a" opacity=".55"/>
    <path d="M150 556 h60 v-14 h-10 v-8 h-40 v8 h-10 Z" fill="#c9b79b"/>` + s;
  // Castel dell'Ovo sul suo isolotto
  s += `<g transform="translate(560 640)">
      <path d="M-40 26 C -20 14, 60 12, 120 26 Z" fill="#6f7f72"/>
      <path d="M0 22 V-6 h16 v-8 h10 v8 h22 v-12 h12 v12 h26 v28 Z" fill="#d6c3a2"/>
      <path d="M0 -6 h86 v4 H0 Z" fill="#b9a585"/>
      ${[6, 30, 54, 74].map((xx) => `<rect x="${xx}" y="4" width="4" height="7" fill="rgba(14,52,68,.35)"/>`).join('')}
    </g>`;
  return s;
}

function pine() {
  // pino marittimo in controluce, primo piano a sinistra (Posillipo)
  return `<g class="np-pine" fill="#0b2a37">
    <path d="M118 1000 C 126 880, 150 790, 214 700 C 236 670, 262 650, 290 640 L 298 650 C 270 664, 248 684, 230 712 C 176 794, 152 884, 150 1000 Z"/>
    <path d="M214 700 C 200 680, 186 668, 170 662 L 174 654 C 194 660, 212 674, 226 692 Z"/>
    <ellipse cx="300" cy="610" rx="190" ry="54"/>
    <ellipse cx="200" cy="636" rx="120" ry="40"/>
    <ellipse cx="410" cy="628" rx="110" ry="34"/>
    <ellipse cx="300" cy="580" rx="120" ry="34"/>
    <ellipse cx="120" cy="660" rx="80" ry="26"/>
  </g>`;
}

function boat(x, y, s, cls) {
  return `<g class="np-boat ${cls}" transform="translate(${x} ${y}) scale(${s})">
    <path d="M-20 0 H22 L16 8 H-14 Z" fill="#f7f1e8"/>
    <path d="M0 -2 V-44 L22 -4 Z" fill="#fffcf7"/><path d="M-2 -4 V-36 L-18 -4 Z" fill="#f2e6d6"/>
  </g>`;
}

export function naplesSvg({ id = 'np', stitch = true } = {}) {
  const shimmer = Array.from({ length: 16 }, (_, i) => {
    const y = 672 + i * 18 + (i * i) / 2;
    const w = 40 + i * 14;
    return `<line class="np-glint" style="--k:${i % 4}" x1="${1150 - w}" x2="${1150 + w}" y1="${y}" y2="${y}" stroke="#ffd9a8" stroke-width="${2 + i * 0.25}" stroke-linecap="round" stroke-dasharray="${8 + i} ${14 + i * 2}" opacity="${0.95 - i * 0.03}"/>`;
  }).join('');
  return `<svg class="naples" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrazione del Golfo di Napoli al tramonto, con il Vesuvio, il lungomare e Castel dell'Ovo">
  <defs>
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0e3444"/><stop offset=".38" stop-color="#2b6a85"/>
      <stop offset=".62" stop-color="#d9a98a"/><stop offset=".8" stop-color="#f4cfa4"/><stop offset="1" stop-color="#f7e2c4"/>
    </linearGradient>
    <radialGradient id="${id}-sun" cx="1150" cy="590" r="420" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff2d6" stop-opacity=".95"/><stop offset=".18" stop-color="#ffd59c" stop-opacity=".55"/><stop offset="1" stop-color="#ffd59c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5c8ea3"/><stop offset=".25" stop-color="#2e6f8b"/><stop offset="1" stop-color="#0e3444"/>
    </linearGradient>
    <linearGradient id="${id}-vol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a5c70"/><stop offset=".7" stop-color="#6d8796"/><stop offset="1" stop-color="#8ea3ab"/>
    </linearGradient>
    <linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7e2c4" stop-opacity="0"/><stop offset="1" stop-color="#f7e2c4" stop-opacity=".55"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#${id}-sky)"/>
  <g class="np-stars" fill="#f7f1e8">${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 233) % 1600}" cy="${30 + ((i * 97) % 240)}" r="${i % 3 === 0 ? 1.6 : 1}" opacity="${0.35 + (i % 4) * 0.12}"/>`).join('')}</g>
  <circle cx="1150" cy="590" r="420" fill="url(#${id}-sun)" class="np-sunglow"/>
  <g class="np-clouds" fill="#f7e2c4" opacity=".45">
    <path class="np-cloud a" d="M120 300 q40 -26 90 -8 q30 -24 70 -4 q40 -6 52 18 H120 Z"/>
    <path class="np-cloud b" d="M980 230 q50 -30 110 -10 q40 -22 84 2 q36 0 46 22 H980 Z"/>
    <path class="np-cloud c" d="M560 360 q30 -18 70 -6 q30 -16 60 2 H560 Z"/>
  </g>
  <path d="M1360 640 C 1420 626, 1500 612, 1600 618 L1600 650 L1340 650 Z" fill="#7f97a3" opacity=".6"/>
  <path d="M0 640 C 40 632, 90 630, 130 640 Z" fill="#7f97a3" opacity=".5"/>
  <path class="np-vesuvio" d="${NAPLES_RIDGE} L1600 660 L600 660 Z" fill="url(#${id}-vol)"/>
  <path d="${NAPLES_RIDGE}" fill="none" stroke="#ffd9b0" stroke-width="2" opacity=".55"/>
  <path d="${NAPLES_RIDGE} L1600 660 L600 660 Z" fill="url(#${id}-haze)"/>
  <rect x="0" y="652" width="1600" height="348" fill="url(#${id}-sea)"/>
  <g class="np-glints">${shimmer}</g>
  <g transform="translate(250 0)">${city()}</g>
  ${boat(860, 760, 1.1, 'b1')}${boat(1320, 720, 0.75, 'b2')}${boat(420, 820, 1.4, 'b3')}
  <g transform="translate(-150 40) scale(.92)">${pine()}</g>
  <path d="M0 930 C 300 905, 700 912, 1000 930 C 1240 944, 1450 936, 1600 924 L1600 1000 L0 1000 Z" fill="#0b2a37" opacity=".9"/>
  ${stitch ? `<g class="stitch-svg" transform="translate(0 -10)"><mask id="${id}-sew"><path class="reveal" pathLength="1" d="${NAPLES_RIDGE}" fill="none"/></mask>
    <path class="thread" d="${NAPLES_RIDGE}" mask="url(#${id}-sew)"/>
    <circle class="needle" r="7" style="offset-path: path('${NAPLES_RIDGE}')"/></g>` : ''}
  </svg>`;
}
