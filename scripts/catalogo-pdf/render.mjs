import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file:///home/claude/catalogo/catalogo.html', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
// controllo: contenuti che escono dalla pagina
const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => {
  const pr = pg.getBoundingClientRect(); const pf = pg.querySelector('.pf')?.getBoundingClientRect();
  let worst = 0, who = '';
  for (const el of pg.querySelectorAll('*')) { if (el.closest('.pf') || getComputedStyle(el).position === 'absolute') continue;
    const r = el.getBoundingClientRect(); const lim = (pf ? pf.top - 2 : pr.bottom); if (r.bottom - lim > worst) { worst = r.bottom - lim; who = el.className || el.tagName; } }
  return worst > 0 ? `pagina ${i + 1}: ${Math.round(worst)}px oltre (${who})` : null; }).filter(Boolean));
console.log(over.length ? over.join('\n') : 'nessuno sbordo');
const fams = await p.evaluate(() => [...new Set([...document.querySelectorAll('h1,h2,p')].map(e => getComputedStyle(e).fontFamily))]);
console.log(fams);
await p.pdf({ path: '/home/claude/catalogo/Vesuvio_Sleep_Catalogo_2026.pdf', preferCSSPageSize: true, printBackground: true });
await b.close();
