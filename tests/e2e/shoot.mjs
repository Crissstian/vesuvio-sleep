// Uso: node tests/e2e/shoot.mjs <hash> <width> <out.png> [fullPage]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [hash = '', w = '1280', out = '/tmp/shot.png', full = '0'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(w), height: Number(w) < 600 ? 780 : 860 } });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text()));
await p.goto('http://localhost:8765/#' + hash);
await p.waitForTimeout(1600);
await p.screenshot({ path: out, fullPage: full === '1' });
const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log(JSON.stringify({ errs, horizontalOverflow: ov }));
await b.close();
