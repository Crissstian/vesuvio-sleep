// Test del sito pubblico generato (dist/), servito come lo servirebbe Netlify o Cloudflare Pages.
// Uso: node scripts/build_site.mjs && node tests/e2e/site.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain' };
// regole di _redirects: 301 e riscritture 200
const rules = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.trim().split(/\s+/));
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = decodeURIComponent(u.pathname);
  for (const [from, to, code] of rules) {
    const hit = from.endsWith('*') ? p.startsWith(from.slice(0, -1)) : p === from;
    if (!hit) continue;
    if (code === '301') {
      res.writeHead(301, { location: to });
      return res.end();
    }
    if (!fs.existsSync(path.join(DIST, p, 'index.html'))) p = to;
    break;
  }
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return res.end(fs.readFileSync(path.join(DIST, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const B = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (c, l, x = '') => (c ? (pass++, console.log('OK  ', l)) : (fail++, console.log('FAIL', l, x)));
const b = await chromium.launch();

// ---------- HTML grezzo: quello che legge un motore di ricerca senza JavaScript
{
  const get = async (p) => (await fetch(B + p)).text();
  const sm = await get('/sitemap.xml');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok(locs.length >= 30 && locs.every((l) => l.startsWith('https://vesuviosleep.it/')), `sitemap: ${locs.length} pagine con URL assoluti`);
  ok(/<image:loc>https:\/\/vesuviosleep\.it\/img\/prodotti\//.test(sm), 'sitemap: immagini dei prodotti');
  ok(!locs.some((l) => /admin|carrello|cerca|2400/.test(l)), 'sitemap: niente admin, carrello, ricerca o vecchio 2400');
  const robots = await get('/robots.txt');
  ok(/Disallow: \/admin\//.test(robots) && /Sitemap: https:\/\/vesuviosleep\.it\/sitemap\.xml/.test(robots), 'robots.txt: admin escluso, sitemap indicata');
  const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  let noText = [];
  for (const l of locs) {
    const p = l.replace('https://vesuviosleep.it', '');
    const h = await get(p);
    const words = text(h).split(' ').length;
    if (words < 150 || !/<h1[\s>]/.test(h) || !h.includes(`<link rel="canonical" href="${l}">`)) noText.push(`${p} (${words} parole)`);
  }
  ok(!noText.length, 'ogni pagina della sitemap ha testo, H1 e canonical già nell\'HTML', noText.join(', '));
  const prod = await get('/materassi/pocket-2600-elite/');
  const ld = JSON.parse(/<script type="application\/ld\+json" id="ld">([\s\S]*?)<\/script>/.exec(prod)[1]);
  const product = ld.find((x) => x['@type'] === 'Product');
  ok(product && product.offers.lowPrice === '200.00' && product.offers.highPrice === '650.00' && product.offers.offers.length === 13, 'dati strutturati Pocket 2600: 13 offerte, 200–650 €');
  ok(product.image.every((i) => i.startsWith('https://vesuviosleep.it/img/prodotti/vesuvio-pocket-2600-elite/')) && product.offers.offers[0].shippingDetails && product.offers.offers[0].hasMerchantReturnPolicy.merchantReturnDays === 14, 'dati strutturati: immagini assolute, spedizione gratuita, reso 14 giorni');
  ok(ld.find((x) => x['@type'] === 'BreadcrumbList').itemListElement.every((i) => i.item.startsWith('https://')), 'briciole con URL assoluti');
  ok(/property="og:image" content="https:\/\/vesuviosleep\.it\/img\/prodotti\//.test(prod), 'Open Graph: foto del prodotto per WhatsApp e social');
  const home = await get('/');
  ok(/"@type":"FurnitureStore"/.test(home) && /"telephone":"\+39 366 121 8346"/.test(home) && /"email":"fdimaterassi@gmail.com"/.test(home), 'home: attività locale con telefono ed email');
  const bundle = await get('/js/bundle.js');
  ok(!/Sospeso:|Fuori catalogo|non verificata: non pubblicare|Rinominato da|era un errore/i.test(bundle), 'nessuna nota interna nel JavaScript pubblico');
  ok(!/Pocket 1600|Memory Duo Classic|Bonnell Classic|Memory Air 3D|Castello Steel|Vesuvio Piuma/.test(bundle), 'nel JavaScript pubblico nessun prodotto ritirato, in bozza o sospeso');
  ok(!/"status":"draft"|"status":"archived"/.test(bundle), 'nel JavaScript pubblico solo prodotti pubblicati');
  ok(/Vesuvio Pocket 2600 Elite/.test(bundle) && /65000/.test(bundle), 'il catalogo pubblicato c\'è tutto');
  ok(!/<html lang="it" class="js">/.test(home) && !/vs-err/.test(home.replace(/getElementById\('vs-err'\)|b\.id = 'vs-err'/g, '')), 'HTML pulito: nessuna classe di runtime o errore salvato');
}

// ---------- redirect e 404 dal server
{
  const r1 = await fetch(B + '/materassi/pocket-2400-elite/', { redirect: 'manual' });
  ok(r1.status === 301 && r1.headers.get('location') === '/materassi/pocket-2600-elite/', '301 dal vecchio Pocket 2400 al 2600');
  const r2 = await fetch(B + '/pagina-che-non-esiste/');
  ok(r2.status === 404 && /noindex/.test(await r2.text()), '404 vera, non indicizzabile');
}

// ---------- nel browser
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForTimeout(1200);
  await p.evaluate(() => (window.__mark = 1));
  await p.click('.nav a:has-text("Materassi")'); await p.waitForTimeout(700);
  ok(p.url() === B + '/materassi/' && (await p.evaluate(() => window.__mark === 1)), 'link interni: URL vero senza ricaricare la pagina');
  ok((await p.locator('link[rel=canonical]').getAttribute('href')) === 'https://vesuviosleep.it/materassi/' && /Materassi Memory Foam/.test(await p.title()), 'titolo e canonical aggiornati in navigazione');
  await p.click('.card a >> nth=0'); await p.waitForTimeout(900);
  ok(/\/materassi\/[a-z0-9-]+\/$/.test(p.url()), 'card → URL della scheda');
  await p.goBack(); await p.waitForTimeout(700);
  ok(p.url() === B + '/materassi/', 'pulsante indietro');
  await p.goto(B + '/#prodotto-pocket-2400-elite'); await p.waitForTimeout(1200);
  ok(p.url() === B + '/materassi/pocket-2600-elite/', 'vecchio link #prodotto-… → nuovo indirizzo');
  await p.goto(B + '/materassi/memory-duo/'); await p.waitForTimeout(900);
  await p.click('#add-btn'); await p.waitForTimeout(300);
  await p.goto(B + '/carrello/riepilogo/'); await p.waitForTimeout(1000);
  const wa = await p.locator('a[data-act="wa-open"]').getAttribute('href');
  ok(wa.startsWith('https://wa.me/393661218346?text=') && /280,00/.test(decodeURIComponent(wa)), 'riepilogo → WhatsApp aziendale con prezzo');
  await p.goto(B + '/admin/catalogo/'); await p.waitForTimeout(900);
  ok((await p.locator('#adm-login').count()) === 1, 'admin raggiungibile solo con accesso');
  ok((await p.locator('text=Area riservata').count()) === 0, 'sito pubblico: nessun link "Area riservata"');
  ok(!errs.length, 'nessun errore JavaScript', errs.join(' | '));
  await ctx.close();
}
await b.close();
server.close();
console.log(`\n${pass} superati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
