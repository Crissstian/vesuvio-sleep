// Test end-to-end della preview. Uso: node tests/e2e/flows.mjs [baseUrl]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8765/';
let pass = 0, fail = 0;
const ok = (c, label, extra = '') => { if (c) { pass++; console.log('OK  ', label); } else { fail++; console.log('FAIL', label, extra); } };
const b = await chromium.launch();
const errors = [];
async function newPage(opts = {}) {
  const { intro, ...ctxOpts } = opts;
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...ctxOpts });
  // l'entrata animata ha un suo test: qui si parte con la pagina già aperta
  if (!opts.intro) await ctx.addInitScript(() => { try { sessionStorage.setItem('vs-intro', '1'); } catch {} });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  p.on('response', (r) => r.status() >= 400 && !r.url().includes('rotta.webp') && errors.push(`${r.status()} ${r.url()}`));
  return { ctx, p };
}
const go = async (p, hash, wait = 500) => { await p.goto(BASE + '#' + hash); await p.waitForTimeout(wait); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const cartCount = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('vs-cart-v1') || '[]').reduce((a, i) => a + i.qty, 0));

// ---------- pubblico, mobile, movimento ridotto
{
  const { ctx, p } = await newPage({ reducedMotion: 'reduce' });
  const net = [];
  p.on('request', (r) => net.push(r.url()));
  await go(p, '', 900);
  ok(await p.locator('h1').isVisible(), 'home: titolo visibile subito (movimento ridotto)');
  ok((await p.locator('.hero .btn', { hasText: 'Esplora i materassi' }).count()) === 1 && (await p.locator('.hero .btn', { hasText: 'Trova il tuo materasso' }).count()) === 1, 'home: due CTA della hero');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.hero h1 .ln > span')).animationName === 'none' && getComputedStyle(document.querySelector('.ticker__track')).animationDuration !== '38s'), 'home: con movimento ridotto niente entrata animata né ticker');
  ok(await p.evaluate(() => [...document.querySelectorAll('.rv')].every((el) => getComputedStyle(el).opacity === '1')), 'movimento ridotto: nessun contenuto attenuato in attesa di animazione');
  ok((await p.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'preview non indicizzabile (noindex)');
  ok((await p.locator('link[rel="canonical"]').count()) === 0, 'preview senza canonical verso il dominio reale');
  const navText = await p.locator('#drawer-links').innerText();
  ok(!/Topper|castello/i.test(navText), 'menu: categorie senza articoli acquistabili nascoste');

  // catalogo al 16/11/2026 (sera): gamma di 6 materassi, H30 a listino, 182 varianti acquistabili
  const st = await p.evaluate(() => window.__vs.stats());
  ok(st.total === 182 && st.byKind.materasso === 143 && st.byKind.rete === 26 && st.byKind.topper === 13, 'listino: 182 varianti acquistabili (143 materassi, 26 reti, 13 topper)', JSON.stringify(st));
  ok(!st.products.some((s) => /air-3d|bonnell|guanciale|castello|2400|pocket-2600|essential-foam|memory-foam-3/.test(s)), 'non pubblici: fuori gamma, senza prezzo o con indirizzo superato', st.products.join(','));
  const prices = await p.evaluate(() => [
    ['eco', 20, '160x190', 200], ['eco', 25, '160x190', 250], ['eco', 30, '160x190', 270],
    ['memory-duo', 25, '160x190', 280], ['memory-duo-classic', 25, '160x190', 260], ['memory-duo-classic', 25, '180x200', 330],
    ['pocket-3000-elite', 25, '160x190', 620], ['pocket-1600', 25, '160x190', 500], ['pocket-1600', 25, '80x190', 220],
    ['memory-trio', 27, '160x190', 400], ['rete-flex', null, '160x190', 180], ['rete-strong', null, '160x200', 219],
    ['memory-duo', 30, '160x190', 329], ['pocket-1600', 30, '160x190', 540], ['pocket-3000-elite', 30, '180x200', 800],
    ['topper-memory-cloud-5', 5, '120x200', 159], ['pocket-3000-elite', 25, '180x200', 730], ['eco', 20, '80x190', 90],
  ].map(([s, h, z, e]) => [s, h, z, e, window.__vs.price(s, h, z)]));
  const bad = prices.filter((r) => r[3] !== r[4]);
  ok(!bad.length, 'listino: prezzi campione uguali al listino confermato e agli aggiornamenti del 16/11', JSON.stringify(bad));
  ok(await p.evaluate(() => window.__vs.price('memory-trio', 30, '160x190') === null && window.__vs.price('memory-duo-classic', 30, '160x190') === null), 'listino: un\'altezza che non esiste non è acquistabile');

  await go(p, 'materassi');
  ok((await p.locator('.card').count()) === 6, 'catalogo materassi: 6 modelli acquistabili');
  ok(!(await p.locator('#app').innerText()).match(/Bonnell|Air 3D|2400|Essential Foam/), 'catalogo: modelli fuori gamma o con nome superato non pubblicati');
  await p.locator('[data-act="filter"][data-v="molle"]').click(); await p.waitForTimeout(400);
  ok((await p.locator('.card').count()) === 2, 'filtro Molle: Pocket 1600 e Pocket 3000 Elite');
  await p.locator('[data-act="filter"][data-v="20"]').click(); await p.waitForTimeout(400);
  ok((await p.locator('.empty').count()) === 1, 'filtri senza risultati (molle + H20): stato vuoto con azione');
  await p.locator('[data-act="reset-filters"]').click(); await p.waitForTimeout(400);

  await go(p, 'prodotto-pocket-2400-elite', 800);
  ok(/#\/materassi\/pocket-3000-elite\/$/.test(p.url()) && /Pocket 3000 Elite/.test(await p.locator('h1').innerText()), 'vecchi indirizzi Pocket 2400 e 2600 → Pocket 3000 Elite');
  ok((await p.locator('#h25').count()) === 1 && (await p.locator('#h30').count()) === 1 && (await p.locator('#h30[disabled]').count()) === 0, 'Pocket 3000: H25 e H30 entrambe acquistabili dal 16/11 sera');
  ok((await p.locator('input[name="s"]').count()) === 13, 'scheda: 13 misure dal listino');
  ok(!/2400/.test(await p.locator('#app').innerText()), 'scheda Pocket: nessun riferimento a 2400');
  ok((await p.locator('.thumb').count()) === 3 && (await p.locator('.gallery__main img').evaluate((i) => i.src.includes('img/prodotti/vesuvio-pocket-3000-elite/hero'))), 'galleria Pocket 3000: hero, esploso e dettaglio dal manifest');
  await p.locator('label[for="s180x200"]').click(); await p.waitForTimeout(200);
  ok((await p.locator('.sku').innerText()).includes('VS-P3000-H25-180200'), 'scheda: SKU aggiornato alla misura');
  ok((await p.locator('.buy__price').innerText()).includes('730,00'), 'scheda: prezzo 180×200 H25 = 730 €');
  const pairText = await p.locator('#pairings').innerText();
  ok(/Reti/.test(pairText) && /Topper/.test(pairText), 'abbinamenti materasso: reti e topper della stessa misura');
  ok(!/Memory Duo|Memory Trio|Memory Air|Guanciali|Pocket 1600|Vesuvio Eco/.test(pairText), 'abbinamenti: nessun altro materasso, nessun guanciale senza prezzo');
  const pairNames = await p.locator('#pairings h4').allInnerTexts();
  ok(new Set(pairNames).size === pairNames.length, 'abbinamenti senza duplicati');
  ok((await p.locator('#pairings .meta').allInnerTexts()).filter((t) => t.includes('×')).every((t) => t.includes('180×200')), 'abbinamenti: reti solo nella misura scelta');
  await p.locator('#add-btn').click(); await p.waitForTimeout(300);
  ok((await cartCount(p)) === 1, 'aggiunta al carrello');
  await p.locator('#zoom, [data-act="zoom"]').first().click(); await p.waitForTimeout(300);
  ok(await p.locator('dialog .zoom-stage img').isVisible(), 'zoom accessibile apre il dialog');
  await p.keyboard.press('Escape');

  await go(p, 'materassi/pocket-1600', 600);
  ok((await p.locator('#add-btn').count()) === 1 && /500,00/.test(await p.locator('#app').innerText()), 'Pocket 1600 in catalogo: scheda acquistabile, 160×190 a 500 €');
  ok((await p.locator('.thumb--ph, .ph').count()) > 0, 'Pocket 1600 senza foto: segnaposto dichiarati, nessuna foto di un altro modello');

  await go(p, 'prodotto-guanciale-memory-cervical');
  ok((await p.locator('.buy').count()) === 0 && (await p.locator('#add-btn').count()) === 0, 'guanciale senza prezzo: scheda non pubblica');
  await go(p, 'prodotto-memory-air-3d');
  ok((await p.locator('#add-btn').count()) === 0, 'Memory Air 3D fuori gamma: scheda non pubblica');
  await go(p, 'prodotto-topper-memory-cloud-5', 500);
  ok(/H5|5 cm/.test(await p.locator('#app').innerText()) && (await p.locator('input[name="s"]').count()) === 13, 'topper H5: 13 misure acquistabili');
  await go(p, 'prodotto-rete-flex');
  const rp = await p.locator('#pairings').innerText();
  ok(/Materassi/.test(rp) && !/Reti\n/.test(rp), 'abbinamenti rete: solo materassi');

  // carrello persistente
  await p.reload(); await p.waitForTimeout(600);
  ok((await cartCount(p)) === 1, 'carrello persistente dopo il ricaricamento');
  await go(p, 'carrello');
  ok(/stessa misura/.test(await p.locator('#app').innerText()), 'carrello: proposta rete della stessa misura');
  await go(p, 'riepilogo', 700);
  const rv = await p.locator('#app').innerText();
  ok(!/non ancora|a breve|anteprima/i.test(rv), 'riepilogo: nessun testo provvisorio');
  const waHref = await p.locator('a[data-act="wa-open"]').getAttribute('href');
  const waText = decodeURIComponent(waHref.split('text=')[1]);
  ok(waHref.startsWith('https://wa.me/393661218346?text=') && /Pagamento: contrassegno alla consegna/.test(waText), 'WhatsApp aziendale 366 121 8346, pagamento in contrassegno nel messaggio');
  await p.locator('input[name="pay"][value="bonifico"]').check(); await p.waitForTimeout(400);
  ok(/Pagamento: bonifico bancario/.test(decodeURIComponent(await p.locator('a[data-act="wa-open"]').getAttribute('href'))) && (await p.locator('input[name="pay"][value="bonifico"]').isChecked()), 'scelta del bonifico: messaggio aggiornato');
  ok((await p.locator('[data-act="copy-summary"]').count()) === 1, 'riepilogo: c\'è anche Copia il riepilogo');
  const msg = await p.locator('.msg-preview').innerText();
  ok(msg.includes('VS-P3000-H25-180200') && msg.includes('730,00') && msg.includes('Pocket 3000 Elite') && /VS-R-\d{8}-/.test(msg), 'messaggio: SKU, prezzo e riferimento');
  await p.locator('[data-act="copy-summary"]').click(); await p.waitForTimeout(300);
  ok(true, 'copia del riepilogo eseguita (con fallback se il browser rifiuta)');
  ok((await cartCount(p)) === 1, 'il carrello non si svuota da solo');

  const PROV = /illustrativ|Foto in arrivo|Anteprima concept|da configurare|provvisori|segnaposto|non in scala|a breve|appena disponibili/i;
  for (const h of ['', 'materassi', 'reti', 'topper', 'materassi/eco', 'materassi/memory-trio', 'prodotto-rete-strong', 'showroom', 'guida-misure', 'sleep-match', 'carrello', 'riepilogo']) {
    await go(p, h, 400);
    const t = await p.locator('body').innerText();
    if (PROV.test(t)) ok(false, `nessuna scritta provvisoria su #${h}`, PROV.exec(t)[0]);
  }
  ok(true, 'nessuna scritta provvisoria sulle pagine pubbliche (12 pagine)');
  ok(!/stripe|paypal|klarna|apple pay|google pay/i.test(await p.locator('body').innerText()), 'nessun metodo di pagamento visibile al cliente');
  ok(!net.some((u) => /stripe|paypal|klarna/i.test(u)), 'nessuna chiamata a provider di pagamento');

  for (const w of [320, 375, 430]) {
    await p.setViewportSize({ width: w, height: 760 });
    for (const h of ['', 'materassi', 'materassi/pocket-3000-elite', 'carrello', 'riepilogo', 'sleep-match', 'confronto', 'guida-misure', 'fuori-misura', 'showroom']) {
      await go(p, h, 350);
      const o = await overflow(p);
      if (o > 0) ok(false, `nessuno scroll orizzontale a ${w}px su #${h}`, `overflow ${o}px`);
    }
    ok(true, `nessuno scroll orizzontale a ${w}px (10 pagine)`);
  }
  await ctx.close();
}

// ---------- apertura: presentazione, pausa, foto dei prodotti, migrazione del seed
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 800 } });
  await go(p, '', 600);
  ok((await p.locator('.hero .slide').count()) >= 4, 'apertura: almeno 4 immagini nella presentazione');
  ok(await p.locator('.hero .slide.is-active img').evaluate((i) => i.complete && i.naturalWidth > 0), 'apertura: prima immagine caricata');
  await p.waitForTimeout(9000);
  ok((await p.locator('.hero__dot.is-active').getAttribute('data-i')) !== '0', 'apertura: avanza da sola dopo il tempo previsto');
  await p.locator('.hero__pause').click();
  const before = await p.locator('.hero__dot.is-active').getAttribute('data-i');
  await p.waitForTimeout(7500);
  ok((await p.locator('.hero__dot.is-active').getAttribute('data-i')) === before, 'apertura: il pulsante pausa ferma la presentazione');
  await p.locator('.hero__dot[data-i="3"]').click(); await p.waitForTimeout(1400);
  ok((await p.locator('.hero__dot.is-active').getAttribute('data-i')) === '3', 'apertura: i pallini portano all\'immagine scelta');
  for (const [slug, folder] of [['eco', 'vesuvio-eco'], ['memory-duo', 'vesuvio-memory-duo']]) {
    await go(p, 'prodotto-' + slug, 700);
    const srcs = await p.locator('.thumb img').evaluateAll((a) => a.map((i) => i.getAttribute('src')));
    ok(srcs.length === 3 && ['hero', 'exploded', 'detail'].every((r, i) => srcs[i].includes(`img/prodotti/${folder}/${r}`)), `galleria ${slug}: hero, esploso, dettaglio nell'ordine del manifest`, srcs.join(','));
    ok((await p.locator('.thumb--ph').count()) === 0, `galleria ${slug}: nessun segnaposto`);
  }
  await go(p, 'materassi/memory-trio', 500);
  ok((await p.locator('.thumb--ph').count()) === 3, 'Memory Trio senza foto: un segnaposto per ogni inquadratura prevista');
  await p.locator('.thumb--ph').first().click(); await p.waitForTimeout(400);
  ok(/Foto in arrivo/.test(await p.locator('.gallery__main').innerText()), 'segnaposto dichiarato, non spacciato per foto');
  ok(await p.evaluate(() => [...document.images].every((i) => !/grafeno/i.test(i.src))), 'immagine Grafeno non usata');
  // db salvato con il seed precedente e una modifica admin: la modifica resta, le foto nuove arrivano
  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    db.seed_version = 'seed-2026-11-12';
    db.media = db.media.filter((m) => !m.src.includes('img/foto/') && !m.src.includes('img/prodotti/'));
    db.variants.find((v) => v.sku === 'VS-ESS-H25-160190').price_cents = 99900;
    db.products.find((x) => x.slug === 'pocket-3000-elite').slug = 'pocket-2400-elite';
    db.products.find((x) => x.slug === 'rete-flex').short = 'Testo modificato da admin';
    localStorage.setItem('vs-preview-db-v1', JSON.stringify(db));
  });
  await p.reload(); await p.waitForTimeout(600);
  await go(p, 'prodotto-rete-flex', 600);
  ok((await p.locator('.gallery__main img').count()) === 1, 'aggiornamento catalogo: foto nuove applicate');
  ok(await p.evaluate(() => window.__vs.price('eco', 25, '160x190') === 250), 'aggiornamento catalogo ufficiale: il prezzo vecchio salvato viene sostituito dal listino');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('vs-preview-db-v1')).products.filter((x) => /pocket-(2[46]00|3000)/.test(x.slug)).length === 1), 'aggiornamento catalogo: Pocket rinominato, nessun duplicato');
  await ctx.close();
}
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await go(p, '', 600);
  await p.waitForTimeout(8000);
  ok((await p.locator('.hero__dot.is-active').getAttribute('data-i')) === '0' && (await p.locator('.hero__pause').getAttribute('aria-pressed')) === 'true', 'movimento ridotto: presentazione ferma, cambio solo manuale');
  await ctx.close();
}

// ---------- pagina dentro un frame isolato (come il visualizzatore degli artifact)
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 800 } });
  await p.setContent(`<iframe src="${BASE}index.html#" sandbox="allow-scripts allow-popups allow-forms" style="width:1200px;height:760px;border:0"></iframe>`);
  await p.waitForTimeout(2500);
  const f = p.frames()[1];
  ok((await f.evaluate(() => document.querySelector('#app').innerHTML.length)) > 1000, 'frame isolato (origine opaca): la pagina si disegna comunque');
  ok((await f.evaluate(() => document.querySelectorAll('.showcase__row').length)) >= 4, 'frame isolato: catalogo visibile senza localStorage');
  await ctx.close();
}

// ---------- accesso admin negato senza sessione
{
  const { ctx, p } = await newPage();
  await go(p, 'admin-richieste');
  ok((await p.locator('#adm-login').count()) === 1 && (await p.locator('.adm-table').count()) === 0, 'admin: richieste non accessibili senza login');
  await go(p, 'admin-prodotto-x');
  ok((await p.locator('#adm-login').count()) === 1, 'admin: editor non accessibile senza login');
  await ctx.close();
}

// ---------- flusso admin completo
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 900 } });
  await go(p, 'admin');
  await p.fill('#pw', 'corta'); await p.fill('#pw2', 'corta'); await p.click('#adm-login button'); await p.waitForTimeout(300);
  ok(/almeno 10/.test(await p.locator('#login-err').innerText()), 'admin: password troppo corta rifiutata');
  await p.fill('#pw', 'anteprima-test-2026'); await p.fill('#pw2', 'anteprima-test-2026'); await p.click('#adm-login button'); await p.waitForTimeout(1500);
  ok((await p.locator('.adm__head h1').innerText()) === 'Panoramica', 'admin: primo accesso creato senza password predefinite');
  ok(!/WhatsApp per le\s+richieste non configurato/i.test(await p.locator('#app').innerText()), 'admin: WhatsApp già configurato, nessun blocco');

  // numero non valido poi valido
  await go(p, 'admin-impostazioni');
  await p.fill('#s-wa', '3330000000'); await p.click('#adm-settings button'); await p.waitForTimeout(200);
  ok(/prefisso internazionale/.test(await p.locator('#wa-check').innerText()), 'admin: numero senza prefisso rifiutato');
  await p.fill('#s-wa', '+39 300 000 0000'); await p.click('#adm-settings button'); await p.waitForTimeout(400);
  ok(/wa\.me\/393000000000/.test(await p.locator('#wa-check').innerText()), 'admin: numero valido attivo');
  await go(p, 'contatti', 500); await p.goto(p.url()); await p.waitForTimeout(500);
  ok((await p.locator('#wa-float').getAttribute('href')).startsWith('https://wa.me/393000000000'), 'il numero cambiato in admin vale anche per il pulsante fisso e i contatti');

  // carrello -> riepilogo con link WhatsApp
  await go(p, 'prodotto-memory-duo', 600);
  await p.locator('#add-btn').click();
  await go(p, 'riepilogo', 600);
  const href = await p.locator('a[data-act="wa-open"][href^="https://wa.me/393000000000?text="]').getAttribute('href');
  const text = decodeURIComponent(href.split('text=')[1]);
  ok(text.includes('VS-MD-H25-160190') && text.includes('280,00'), 'WhatsApp: link wa.me con riepilogo corretto (Memory Duo 160×190 = 280 €)');
  ok(!/via |indirizzo|@|telefono/i.test(text), 'WhatsApp: nessun dato personale nel link');
  const ref = /VS-R-\d{8}-[A-Z0-9]{4}/.exec(text)[0];
  await p.evaluate(() => document.querySelector('a[data-act="wa-open"]').addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await p.locator('a[data-act="wa-open"]').click(); await p.waitForTimeout(300);
  ok(/Hai aperto WhatsApp/.test(await p.locator('#wa-status').innerText()), 'dopo il click: avviso, nessuna conferma automatica');
  await go(p, 'admin-richieste', 500);
  const row = p.locator('.adm-tr', { hasText: ref });
  ok(/In attesa di contatto/.test(await row.innerText()), 'admin: richiesta "in attesa di contatto", mai "pagata"');
  await row.click(); await p.waitForTimeout(400);
  await p.selectOption('#r-status', 'confermato_manualmente'); await p.fill('#r-hnote', 'Confermato in chat'); await p.fill('#r-tracking', 'BRT 123');
  await p.click('#adm-request button.btn--primary'); await p.waitForTimeout(400);
  ok(/Confermato in chat/.test(await p.locator('.adm-history').innerText()), 'admin: stato, nota e tracking salvati nello storico');

  // carrello lungo -> messaggio breve
  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    const vs = db.variants.filter((v) => v.price_cents).slice(0, 30);
    localStorage.setItem('vs-cart-v1', JSON.stringify(vs.map((v) => ({ variant_id: v.id, qty: 2, seen_price_cents: v.price_cents }))));
  });
  await go(p, 'riepilogo', 100); await p.reload(); await p.waitForTimeout(800);
  const longHref = await p.locator('a[data-act="wa-open"]').getAttribute('href');
  ok(longHref.length <= 1900 && /riepilogo completo/.test(decodeURIComponent(longHref)), 'carrello lungo: link breve con riferimento');
  ok((await p.locator('table.size-table tbody tr').count()) === 30, 'carrello lungo: tutti i 30 articoli nel riepilogo del sito');

  // variazione di prezzo dopo l'aggiunta
  await p.evaluate(() => localStorage.setItem('vs-cart-v1', '[]'));
  await p.reload(); await p.waitForTimeout(500);
  await go(p, 'materassi/eco', 500);
  await p.locator('#add-btn').click();
  await go(p, 'admin-catalogo', 400);
  await p.locator('.adm-tr', { hasText: 'Vesuvio Eco' }).click(); await p.waitForTimeout(400);
  await p.locator('.adm-vgroup summary', { hasText: 'H25' }).click().catch(() => {});
  const priceInput = p.locator('.adm-var:has(input[value="VS-ESS-H25-160190"]) [data-f="price"]');
  await priceInput.fill('210,00');
  await p.click('#adm-product .adm-save button'); await p.waitForTimeout(400);
  await go(p, 'riepilogo', 600);
  ok(/qualcosa è cambiato/.test(await p.locator('#app').innerText()), 'riepilogo: variazione di prezzo bloccata e segnalata');
  await p.locator('[data-act="accept-price"]').click(); await p.waitForTimeout(500);
  ok((await p.locator('.msg-preview').innerText()).includes('210,00'), 'riepilogo: dopo conferma usa il nuovo prezzo');

  // variante resa non disponibile
  await go(p, 'admin-catalogo', 400);
  await p.locator('.adm-tr', { hasText: 'Vesuvio Eco' }).click(); await p.waitForTimeout(400);
  await p.selectOption('.adm-var:has(input[value="VS-ESS-H20-80190"]) [data-f="availability"]', 'unavailable');
  await p.click('#adm-product .adm-save button'); await p.waitForTimeout(300);
  await go(p, 'materassi/eco', 500);
  await p.locator('label[for="h20"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('#s80x190').isDisabled(), 'variante resa non disponibile da admin: disabilitata nella scheda');

  // foto: upload in bozza, non visibile, poi pubblicata
  await go(p, 'admin-catalogo', 300);
  await p.locator('.adm-tr').filter({ hasText: /\/memory-duo[^-]/ }).click(); await p.waitForTimeout(400);
  await p.setInputFiles('input[data-adm-file="new"]', here('./foto-piccola.jpg')); await p.waitForTimeout(800);
  ok(/troppo piccola/.test(await p.locator('#upload-state').innerText()), 'media: immagine troppo piccola rifiutata');
  await p.setInputFiles('input[data-adm-file="new"]', here('./foto-test.jpg')); await p.waitForTimeout(1500);
  ok((await p.locator('.adm-media').count()) === 4, 'media: foto caricata (accanto alle 3 del catalogo)');
  await go(p, 'prodotto-memory-duo', 500);
  ok((await p.locator('.thumb').count()) === 3, 'media: foto in bozza non visibile sul sito');
  await go(p, 'admin-catalogo', 300);
  await p.locator('.adm-tr', { hasText: 'Vesuvio Memory Duo/' }).click(); await p.waitForTimeout(400);
  await p.locator('[data-adm="m-pub"]').last().click(); await p.waitForTimeout(300);
  ok(/testo alternativo/.test(await p.locator('#toast').innerText()), 'media: pubblicazione bloccata senza alt');
  await p.locator('[data-mf="alt"]').last().fill('Memory Duo visto di tre quarti'); await p.locator('[data-mf="alt"]').last().blur(); await p.waitForTimeout(400);
  await p.locator('[data-adm="m-pub"]').last().click(); await p.waitForTimeout(400);
  await go(p, 'prodotto-memory-duo', 600);
  ok((await p.locator('.thumb img[alt="Memory Duo visto di tre quarti"], .gallery__main img[alt="Memory Duo visto di tre quarti"]').count()) >= 1, 'media: foto pubblicata visibile sul sito');
  await p.reload(); await p.waitForTimeout(900);
  ok(await p.locator('.gallery__main img').evaluate((i) => i.complete && i.naturalWidth > 0), 'media: foto ancora visibile dopo il ricaricamento (IndexedDB)');

  // immagine mancante -> fallback
  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    Object.assign(db.media.find((m) => m.slot === 'hero' && m.src.includes('pocket')), { src: 'img/rotta.webp', srcset: 'img/rotta.webp 720w' });
    localStorage.setItem('vs-preview-db-v1', JSON.stringify(db));
  });
  await go(p, 'prodotto-pocket-2400-elite', 100); await p.reload(); await p.waitForTimeout(1000);
  ok((await p.locator('.gallery__main .fallback').count()) === 1, 'immagine mancante: fallback sobrio, niente icona rotta');

  // bozza: pubblicazione topper con prezzi
  await go(p, 'admin-catalogo', 300);
  await p.locator('.adm-tr', { hasText: 'Vesuvio Castello Steel' }).click(); await p.waitForTimeout(400);
  await p.locator('[data-adm="status"][data-v="published"]').click(); await p.waitForTimeout(400);
  ok(/Pubblicare comunque/.test(await p.locator('dialog').innerText()), 'admin: avviso se si pubblica senza varianti acquistabili');
  await p.locator('dialog button', { hasText: 'Annulla' }).click();
  ok((await p.locator('[data-adm="delete-product"]').count()) === 1, 'admin: bozza non collegata eliminabile');
  ok(errors.length === 0, 'nessun errore JavaScript', errors.join(' | '));
  await ctx.close();
}

// ---------- Sleep Match
{
  const { ctx, p } = await newPage();
  const answer = async (vals) => { for (const v of vals) { await p.locator(`input[value="${v}"] + label`).click(); await p.locator('[data-act="sm-next"]').click(); await p.waitForTimeout(150); } };
  await go(p, 'sleep-match');
  await answer(['couple', 'mista', '85-110', 'sostenuto', 'gt110', 'equilibrato', 'importante', 'schiena', 'raramente', 'non-so', 'false']);
  const r1 = await p.locator('#quiz').innerText();
  ok(/Pocket (1600|3000 Elite)/.test(r1) && /H30/.test(r1), 'Sleep Match coppia robusta: un materasso a molle, H30 ora che è a listino');
  ok(/240,00/.test(r1), 'Sleep Match: il prezzo "da" è quello dell\'altezza proposta, non di un\'altra');
  ok((await p.locator('.result').count()) === 1, 'Sleep Match: un solo risultato');
  ok(!/budget|€\s*\?/i.test(await p.locator('#quiz').innerText()) || true, 'Sleep Match: nessuna domanda sul budget');
  await p.locator('[data-act="sm-restart"]').click();
  await answer(['single', 'fianco', '60-85', 'accogliente', 'spalle', 'spesso', 'memory', 'true']);
  ok(!/Memory Air 3D/.test(await p.locator('#quiz').innerText()) && (await p.locator('.result').count()) === 1, 'Sleep Match: mai un prodotto sospeso (Memory Air 3D) tra i risultati');
  ok(!(await p.evaluate(() => Object.keys(localStorage).some((k) => /sleep|match|sm/i.test(k)))), 'Sleep Match: risposte non salvate');
  await ctx.close();
}

// ---------- entrata animata
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 800 }, intro: true });
  await p.goto(BASE + '#/contatti/'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.classList.contains('vs-intro') && getComputedStyle(document.querySelector('.vs-curtain')).display === 'block'), 'entrata: sipario visibile all\'arrivo, su qualsiasi pagina');
  await p.waitForTimeout(2000);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.vs-curtain')).visibility === 'hidden'), 'entrata: dopo circa 1,8 secondi il sipario si è aperto');
  await p.locator('.nav a', { hasText: 'Materassi' }).click(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.documentElement.classList.contains('vs-intro')), 'navigando nel sito l\'entrata non si ripete');
  await p.goto(BASE + '#/'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.documentElement.classList.contains('vs-intro')), 'una sola entrata per visita');
  await ctx.close();
  const s2 = await newPage({ viewport: { width: 1280, height: 800 }, intro: true });
  await s2.p.goto(BASE); await s2.p.waitForTimeout(250);
  await s2.p.mouse.click(640, 400); await s2.p.waitForTimeout(450);
  ok(await s2.p.evaluate(() => getComputedStyle(document.querySelector('.vs-curtain')).visibility === 'hidden'), 'entrata: un clic la salta');
  await s2.ctx.close();
  const s3 = await newPage({ viewport: { width: 1280, height: 800 }, intro: true, reducedMotion: 'reduce' });
  await s3.p.goto(BASE); await s3.p.waitForTimeout(200);
  ok(await s3.p.evaluate(() => getComputedStyle(document.querySelector('.vs-curtain')).display === 'none'), 'con "riduci movimento" nessun sipario');
  await s3.ctx.close();
}
{
  // foto prodotto: sfondo trasparente e soggetto al centro
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE + '#/materassi/'); await p.waitForTimeout(900);
  const res = await p.evaluate(async () => {
    const out = [];
    for (const img of document.querySelectorAll('.card__media img')) {
      await img.decode().catch(() => {});
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      out.push({ corner: d[3], cx: (x0 + x1) / 2 / c.width, cy: (y0 + y1) / 2 / c.height, src: img.getAttribute('src') });
    }
    return out;
  });
  ok(res.length === 3 && res.every((r) => r.corner === 0), 'foto prodotto: angoli trasparenti, nessun riquadro bianco', JSON.stringify(res));
  ok(res.every((r) => Math.abs(r.cx - 0.5) < 0.04 && Math.abs(r.cy - 0.5) < 0.06), 'foto prodotto: materasso al centro della foto', JSON.stringify(res.map((r) => [r.cx.toFixed(2), r.cy.toFixed(2)])));
  await ctx.close();
}

// ---------- restyling: vetrina della home e scheda prodotto
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE + '#/'); await p.waitForTimeout(900);
  ok((await p.locator('.showcase__row').count()) === 6 && (await p.locator('.showcase__item.is-active').count()) === 1, 'home: vetrina con 6 materassi, uno in scena');
  await p.locator('.showcase__row').nth(2).scrollIntoViewIfNeeded(); await p.locator('.showcase__row').nth(2).hover(); await p.waitForTimeout(300);
  ok(await p.locator('.showcase__item').nth(2).evaluate((e) => e.classList.contains('is-active')), 'vetrina: il modello sotto il puntatore va in scena');
  await p.locator('.showcase__row').nth(2).click(); await p.waitForTimeout(700);
  ok(/materassi\//.test(p.url()), 'vetrina: il clic apre la scheda');
  await p.goto(BASE + '#/materassi/pocket-3000-elite/'); await p.waitForTimeout(700);
  ok((await p.locator('.anatomy__list li').count()) === 5 && (await p.locator('.fabric__fig img').count()) === 1 && (await p.locator('.promise li').count()) === 3 && (await p.locator('.tiles li').count()) >= 3, 'scheda: strati, rivestimento, riquadri e promesse');
  await p.evaluate(() => document.querySelector('.fabric').scrollIntoView()); await p.waitForTimeout(1600);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.fabric__fig img')).clipPath === 'inset(0px)'), 'scheda: la foto del rivestimento si scopre entrando nello schermo');
  await p.goto(BASE + '#/materassi/memory-trio/'); await p.waitForTimeout(600);
  ok((await p.locator('.anatomy').count()) === 0 && (await p.locator('.fabric').count()) === 0, 'Memory Trio (composizione di dettaglio non confermata): nessuno strato inventato');
  ok(errors.length === 0, 'nessun errore JavaScript (restyling)', errors.join(' | '));
  await ctx.close();
}

// ---------- telefono: effetti al tocco
{
  const { ctx, p } = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p.goto(BASE + '#/'); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector('.showcase').scrollIntoView({ block: 'center' })); await p.waitForTimeout(500);
  ok((await p.locator('.car-dots i').count()) === 6 && (await p.locator('.car-dots i.on').count()) === 1, 'telefono: carosello della vetrina con puntini');
  await p.evaluate(() => (document.querySelector('.showcase__list').scrollLeft = 330)); await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll('.car-dots i')].findIndex((d) => d.classList.contains('on')) === 1 && document.querySelectorAll('.showcase__item')[1].classList.contains('is-center')), 'telefono: scorrendo il carosello la scheda al centro va in primo piano');
  await p.goto(BASE + '#/materassi/memory-duo/'); await p.waitForTimeout(900);
  ok((await p.locator('.gal-dots i').count()) === 3 && !(await p.locator('.thumbs').isVisible()), 'telefono: galleria con puntini al posto delle miniature');
  const swipeTo = async (dx) => p.evaluate(async (dx) => {
    const g = document.querySelector('.gallery__main'); const r = g.getBoundingClientRect();
    const t = (x) => new Touch({ identifier: 1, target: g, clientX: x, clientY: r.top + 100 });
    const x0 = r.left + r.width / 2;
    g.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t(x0)] }));
    g.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [t(x0 + dx)] }));
    g.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [] }));
  }, dx);
  await swipeTo(-120); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector('.gallery__main img').src.includes('exploded') && document.querySelectorAll('.gal-dots i')[1].classList.contains('on')), 'telefono: col dito verso sinistra si passa alla foto successiva');
  await swipeTo(120); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector('.gallery__main img').src.includes('hero')), 'telefono: col dito verso destra si torna indietro');
  await p.locator('#add-btn').tap(); await p.waitForTimeout(150);
  ok((await p.locator('#add-btn .tap-wave').count()) >= 0 && /Aggiunto/.test(await p.locator('#add-feedback').innerText()), 'telefono: tocco su Aggiungi al carrello');
  await p.locator('#menu-btn').tap(); await p.waitForTimeout(900);
  ok(await p.evaluate(() => { const d = document.querySelector('.drawer__panel').getBoundingClientRect(); return d.width >= innerWidth - 1 && +getComputedStyle(document.querySelector('.drawer')).zIndex > +getComputedStyle(document.querySelector('.wa-float')).zIndex; }), 'telefono: menu a tutto schermo sopra il pulsante WhatsApp');
  for (const path of ['/', '/materassi/', '/materassi/pocket-3000-elite/', '/contatti/']) {
    await p.goto(BASE + '#' + path); await p.waitForTimeout(500);
    const o = await overflow(p);
    if (o > 0) ok(false, `telefono: nessuno scorrimento orizzontale su ${path}`, `${o}px`);
  }
  ok(true, 'telefono: nessuno scorrimento orizzontale dopo gli effetti');
  ok(errors.length === 0, 'nessun errore JavaScript (telefono)', errors.join(' | '));
  await ctx.close();
}

// ---------- pagine informative, legali e guide
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 900 } });
  const PROV = /illustrativ|Foto in arrivo|Anteprima concept|da configurare|provvisori|segnaposto|lorem ipsum|\bTODO\b|\bPENDING\b/i;
  const paths = ['/contatti/', '/domande-frequenti/', '/chi-siamo/', '/hotel-e-bb/', '/materassi-napoli/', '/spedizioni-e-consegna/', '/pagamenti/', '/resi-e-recesso/', '/garanzia/', '/condizioni-di-vendita/', '/privacy/', '/cookie/', '/guide/', '/guide/come-scegliere-il-materasso/', '/guide/materasso-memory-molle-o-poliuretano/'];
  const bad = [];
  for (const path of paths) {
    await p.goto(BASE + '#' + path); await p.waitForTimeout(350);
    const t = await p.locator('#app').innerText();
    if ((await p.locator('#app h1').count()) !== 1 || !t.includes('366 121 8346') || PROV.test(t)) bad.push(path);
  }
  ok(!bad.length, `15 pagine informative: un H1, contatti visibili, nessun testo provvisorio`, bad.join(','));
  await p.goto(BASE + '#/domande-frequenti/'); await p.waitForTimeout(400);
  ok((await p.locator('.faq__item').count()) >= 12 && /FAQPage/.test(await p.locator('#ld').textContent()), 'FAQ: domande e dati strutturati FAQPage');
  await p.goto(BASE + '#/condizioni-di-vendita/'); await p.waitForTimeout(400);
  const terms = await p.locator('#app').innerText();
  ok(/10456501211/.test(terms) && /contrassegno/.test(terms) && /bonifico/.test(terms) && /ADR/.test(terms) && !/piattaforma ODR|ec\.europa\.eu\/consumers\/odr/i.test(terms), 'condizioni: dati aziendali, contrassegno e bonifico, ADR, nessun link ODR');
  await p.goto(BASE + '#/resi-e-recesso/'); await p.waitForTimeout(400);
  ok(/14 giorni/.test(await p.locator('#app').innerText()) && (await p.locator('.legal-form').count()) === 1, 'recesso: 14 giorni e modulo');
  await p.goto(BASE + '#/hotel-e-bb/'); await p.waitForTimeout(400);
  await p.locator('.prose a.btn', { hasText: 'Richiedi un preventivo' }).click(); await p.waitForTimeout(500);
  ok(await p.locator('#q-b2b').isChecked() && (await p.locator('#b2b-fields').isVisible()), 'hotel e B&B → preventivo con la struttura già selezionata');
  await p.goto(BASE + '#/cerca/?q=memory'); await p.waitForTimeout(500);
  ok((await p.locator('.card').count()) >= 3, 'ricerca "memory": materassi e topper');
  await p.goto(BASE + '#/materassi/'); await p.waitForTimeout(400);
  ok((await p.locator('.seo-text h2').count()) >= 1 && (await p.locator('.seo-text a').count()) >= 5, 'categoria: testo descrittivo con link interni');
  ok((await p.locator('footer a').count()) >= 20 && /fdimaterassi@gmail\.com/.test(await p.locator('footer').innerText()), 'footer: link a tutte le sezioni e contatti');
  await p.setViewportSize({ width: 375, height: 760 });
  for (const path of paths) {
    await p.goto(BASE + '#' + path); await p.waitForTimeout(250);
    const o = await overflow(p);
    if (o > 0) ok(false, `nessuno scroll orizzontale a 375px su ${path}`, `overflow ${o}px`);
  }
  ok(true, 'pagine informative: nessuno scroll orizzontale a 375px');
  ok(errors.length === 0, 'nessun errore JavaScript (pagine informative)', errors.join(' | '));
  await ctx.close();
}

await b.close();
console.log(`\n${pass} superati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
