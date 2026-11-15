// Genera il sito pubblico statico e indicizzabile in dist/.
//
//   node scripts/build_site.mjs [--site https://vesuviosleep.it]
//
// Ogni pagina indicizzabile diventa un file HTML vero (/materassi/essential-foam/index.html)
// con contenuto già scritto, titolo, descrizione, canonical, Open Graph e dati strutturati:
// i motori di ricerca leggono tutto anche senza eseguire JavaScript. Nel browser lo stesso
// JavaScript della preview prende il controllo (carrello, Sleep Match, WhatsApp...).
//
// Output pronto per Netlify o Cloudflare Pages: sitemap.xml, robots.txt, 404.html,
// _redirects (301 del vecchio Pocket 2400, riscritture per admin e carrello), _headers.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { buildSitemap } from '../preview/js/core/seo.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'preview');
const OUT = path.join(ROOT, 'dist');
const argSite = process.argv.indexOf('--site');
const SITE = (argSite > 0 ? process.argv[argSite + 1] : process.env.SITE_URL || 'https://vesuviosleep.it').replace(/\/$/, '');
const TODAY = new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ file statici
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'js'), { recursive: true });
fs.cpSync(path.join(SRC, 'css'), path.join(OUT, 'css'), { recursive: true });
fs.cpSync(path.join(SRC, 'img'), path.join(OUT, 'img'), { recursive: true });
fs.copyFileSync(path.join(SRC, 'js/bundle.js'), path.join(OUT, 'js/bundle.js'));
fs.writeFileSync(
  path.join(OUT, 'js/config.js'),
  `// Sito pubblico: indirizzi veri e indicizzazione attiva.\nwindow.VS_CONFIG = ${JSON.stringify({ preview: false, routing: 'path', siteUrl: SITE, whatsappNumber: '', mapEmbed: false }, null, 1)};\n`,
);
// le immagini del vecchio Pocket 2400 restano solo in archivio, non sul sito pubblico
for (const f of fs.readdirSync(path.join(OUT, 'img'))) if (f.startsWith('pocket-2400-')) fs.rmSync(path.join(OUT, 'img', f));

// versione nei link di CSS e JS: si possono mettere in cache a lungo
const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 10);
const VERSIONED = ['css/app.css', 'css/home.css', 'css/pages.css', 'css/motion.css', 'css/admin.css', 'js/config.js', 'js/bundle.js'];
const ver = Object.fromEntries(VERSIONED.map((f) => [f, hash(f)]));

let template = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
template = template
  .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <base href="/">')
  .replace(/<!-- Anteprima:[^>]*-->\n\s*/, '')
  .replace('<meta name="robots" content="noindex, nofollow, noarchive">', '<meta name="robots" content="index, follow, max-image-preview:large">');
for (const f of VERSIONED) template = template.replace(`"${f}"`, `"${f}?v=${ver[f]}"`);
const TEMPLATE_HERO = /<section class="hero hero--slides[\s\S]*?<\/section>/.exec(template)[0];
const shell = (robots) => template.replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`);

// ------------------------------------------------------------------ server locale con fallback
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(OUT, p);
  if (file.startsWith(OUT) && path.extname(p) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    return fs.createReadStream(file).pipe(res);
  }
  if (path.extname(p)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES['.html'] });
  res.end(template);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ------------------------------------------------------------------ rendering
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_TUNNEL|ERR_NAME|Failed to load resource/.test(m.text()) && errors.push(m.text()));

await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__vs?.routes);
const routes = await page.evaluate(() => window.__vs.routes());

async function render(p) {
  await page.goto(BASE + p, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#app h1') && document.title);
  await page.waitForTimeout(250);
  return page.evaluate(
    ({ hero }) => {
      // apertura della home com'è nel file sorgente: l'animazione d'ingresso riparte nel browser
      const h = document.querySelector('#app > .hero');
      if (h) h.outerHTML = hero;
      document.querySelectorAll('[data-ready]').forEach((el) => el.removeAttribute('data-ready'));
      document.querySelector('#vs-err')?.remove();
      document.querySelector('.compare-bar')?.remove();
      document.querySelector('#toast')?.replaceChildren();
      return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    },
    { hero: TEMPLATE_HERO },
  );
}
function finish(html, p) {
  // senza JavaScript il contenuto deve restare visibile: la classe "js" la rimette lo script
  html = html.replace(/<html lang="it" class="[^"]*">/, '<html lang="it">');
  // il link "Vai al contenuto" resta sulla pagina anche senza JavaScript (c'è <base href="/">)
  html = html.replace('href="#app"', `href="${p}#app"`);
  // fuori dalla home niente preload dell'immagine d'apertura
  if (p !== '/') html = html.replace(/<link rel="preload" as="image"[^>]*>\s*/, '');
  return html.replace(/href="#\/([^"]*)"/g, 'href="/$1"');
}
const write = (p, html) => {
  const dir = path.join(OUT, p);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
};

const report = [];
for (const r of routes) {
  const html = finish(await render(r.path), r.path);
  write(r.path, html);
  report.push({ path: r.path, html });
}
// 404 vera (Netlify e Cloudflare Pages la servono con stato 404)
fs.writeFileSync(path.join(OUT, '404.html'), finish(await render('/pagina-che-non-esiste/'), '/'));
// pagine funzionali: guscio non indicizzabile, il contenuto lo disegna il browser
for (const p of ['/carrello/', '/carrello/riepilogo/', '/cerca/', '/admin/']) write(p, finish(shell('noindex, nofollow'), p));
await browser.close();
server.close();

// ------------------------------------------------------------------ sitemap, robots, redirect, header
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), buildSitemap(SITE, routes.map((r) => ({ path: r.path, lastmod: TODAY, images: r.images }))) + '\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(
  path.join(OUT, '_redirects'),
  [
    '# Netlify / Cloudflare Pages',
    '/materassi/pocket-2400-elite/  /materassi/pocket-2600-elite/  301',
    '/materassi/pocket-2400-elite   /materassi/pocket-2600-elite/  301',
    '/prodotto/*                    /materassi/                    301',
    '/admin/*                       /admin/index.html              200',
    '/cerca/*                       /cerca/index.html              200',
    '',
  ].join('\n'),
);
fs.writeFileSync(
  path.join(OUT, '_headers'),
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  X-Frame-Options: SAMEORIGIN',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
    '/css/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/js/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/img/*',
    '  Cache-Control: public, max-age=2592000',
    '/admin/*',
    '  X-Robots-Tag: noindex, nofollow',
    '',
  ].join('\n'),
);

// ------------------------------------------------------------------ controlli
const problems = [];
const titles = new Map();
const descs = new Map();
const files = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.add('/' + path.relative(OUT, path.join(d, e.name)).split(path.sep).join('/'))));
walk(OUT);
const exists = (href) => {
  const p = href.split('#')[0].split('?')[0];
  if (!p || p === '/') return files.has('/index.html');
  if (p.endsWith('/')) return files.has(p + 'index.html');
  return files.has(p);
};
for (const { path: p, html } of report) {
  const get = (re) => (re.exec(html) || [])[1];
  const title = get(/<title>([^<]*)<\/title>/);
  const desc = get(/<meta name="description" content="([^"]*)"/);
  const canon = get(/<link rel="canonical" href="([^"]*)"/);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (!title || title.length > 70) problems.push(`${p}: titolo assente o lungo (${title?.length})`);
  if (!desc || desc.length < 70 || desc.length > 175) problems.push(`${p}: descrizione di ${desc?.length} caratteri`);
  if (canon !== SITE + p) problems.push(`${p}: canonical ${canon}`);
  if (h1 !== 1) problems.push(`${p}: ${h1} H1`);
  if (!/content="index, follow/.test(html)) problems.push(`${p}: non indicizzabile`);
  if (!/property="og:image" content="https:/.test(html)) problems.push(`${p}: og:image mancante`);
  try {
    JSON.parse(get(/<script type="application\/ld\+json" id="ld">([\s\S]*?)<\/script>/));
  } catch {
    problems.push(`${p}: dati strutturati non validi`);
  }
  if (titles.has(title)) problems.push(`${p}: titolo uguale a ${titles.get(title)}`);
  if (descs.has(desc)) problems.push(`${p}: descrizione uguale a ${descs.get(desc)}`);
  titles.set(title, p);
  descs.set(desc, p);
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|#)/.test(href) || href.startsWith('css/') || href.startsWith('img/') || href.startsWith('js/')) continue;
    if (href.startsWith('/') && !exists(href)) problems.push(`${p}: link interrotto ${href}`);
  }
  for (const [, src] of html.matchAll(/(?:src|href)="(img\/[^"?]+)"/g)) if (!files.has('/' + src)) problems.push(`${p}: immagine mancante ${src}`);
  if (/href="#[a-z]/.test(html.replace(/href="#app"/g, ''))) {
    for (const [, id] of html.matchAll(/href="#([a-z][^"]*)"/g)) if (!html.includes(`id="${id}"`)) problems.push(`${p}: vecchio link #${id}`);
  }
}
if (errors.length) problems.push(...errors.map((e) => 'errore JavaScript: ' + e));
const kb = (n) => Math.round(n / 1024);
const size = [...files].reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${report.length} pagine indicizzabili, ${files.size} file, ${kb(size)} KB in dist/ (${SITE})`);
if (problems.length) {
  console.log('PROBLEMI:\n- ' + [...new Set(problems)].join('\n- '));
  process.exit(1);
}
console.log('controlli SEO superati: titoli e descrizioni unici, canonical, H1, Open Graph, dati strutturati, link interni');
