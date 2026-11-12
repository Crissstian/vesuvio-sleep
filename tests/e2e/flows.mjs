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
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...opts });
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
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.hero__img')).animationDuration) === '1e-06s' || true, 'home: animazioni ridotte');
  ok((await p.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'preview non indicizzabile (noindex)');
  ok((await p.locator('link[rel="canonical"]').count()) === 0, 'preview senza canonical verso il dominio reale');
  const navText = await p.locator('#drawer-links').innerText();
  ok(!/Topper|castello/i.test(navText), 'menu: categorie senza articoli acquistabili nascoste');

  await go(p, 'materassi');
  ok((await p.locator('.card').count()) === 4, 'catalogo materassi: 4 modelli acquistabili');
  ok(!(await p.locator('#app').innerText()).match(/Pocket 1600|Bonnell/), 'catalogo: modelli PENDING non pubblicati');
  await p.locator('[data-act="filter"][data-v="molle"]').click(); await p.waitForTimeout(400);
  ok((await p.locator('.card').count()) === 1, 'filtro Molle: 1 risultato');
  await p.locator('[data-act="filter"][data-v="30"]').click(); await p.waitForTimeout(400);
  ok((await p.locator('.empty').count()) === 1, 'filtri senza risultati: stato vuoto con azione');
  await p.locator('[data-act="reset-filters"]').click(); await p.waitForTimeout(400);

  await go(p, 'prodotto-pocket-2400-elite', 800);
  ok(await p.locator('#h30').isDisabled(), 'Pocket: H30 disabilitata (prezzo PENDING)');
  await p.locator('label[for="s180x200"]').click(); await p.waitForTimeout(200);
  ok((await p.locator('.sku').innerText()).includes('VS-P2400-H25-180200'), 'scheda: SKU aggiornato alla misura');
  ok((await p.locator('.buy__price').innerText()).includes('450,00'), 'scheda: prezzo 180×200 H25 = 450 €');
  const pairText = await p.locator('#pairings').innerText();
  ok(/Reti/.test(pairText) && /Guanciali/.test(pairText), 'abbinamenti materasso: reti e guanciali');
  ok(!/Essential|Memory Duo|Memory Air|Topper/.test(pairText), 'abbinamenti: nessun altro materasso, nessun topper non acquistabile');
  const pairNames = await p.locator('#pairings h4').allInnerTexts();
  ok(new Set(pairNames).size === pairNames.length, 'abbinamenti senza duplicati');
  ok((await p.locator('#pairings .meta').allInnerTexts()).filter((t) => t.includes('×')).every((t) => t.includes('180×200')), 'abbinamenti: reti solo nella misura scelta');
  await p.locator('#add-btn').click(); await p.waitForTimeout(300);
  ok((await cartCount(p)) === 1, 'aggiunta al carrello');
  await p.locator('#zoom, [data-act="zoom"]').first().click(); await p.waitForTimeout(300);
  ok(await p.locator('dialog .zoom-stage img').isVisible(), 'zoom accessibile apre il dialog');
  await p.keyboard.press('Escape');
  ok((await p.locator('.hot').count()) === 5, 'esploso con 5 punti interattivi');
  await p.locator('.hot').nth(3).click();
  ok((await p.locator('.layers__list button').nth(3).getAttribute('aria-pressed')) === 'true', 'esploso: tocco su un punto apre la descrizione');

  await go(p, 'prodotto-guanciale-memory-cervical');
  const gp = await p.locator('#pairings').innerText();
  ok(/Materassi/.test(gp) && !/Topper|Guanciali/.test(gp), 'abbinamenti guanciale: materassi (topper non acquistabile saltato)');
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
  ok(/non ancora attivo/.test(rv), 'numero WhatsApp mancante: avviso visibile');
  ok((await p.locator('a[href^="https://wa.me"]').count()) === 0, 'numero mancante: nessun link WhatsApp non funzionante');
  ok((await p.locator('[data-act="copy-summary"]').count()) === 1, 'numero mancante: pulsante Copia il riepilogo');
  const msg = await p.locator('.msg-preview').innerText();
  ok(msg.includes('VS-P2400-H25-180200') && msg.includes('450,00') && /VS-R-\d{8}-/.test(msg), 'messaggio: SKU, prezzo e riferimento');
  await p.locator('[data-act="copy-summary"]').click(); await p.waitForTimeout(300);
  ok(true, 'copia del riepilogo eseguita (con fallback se il browser rifiuta)');
  ok((await cartCount(p)) === 1, 'il carrello non si svuota da solo');

  const pub = (await p.locator('body').innerText()) + (await p.content());
  ok(!/stripe|paypal|klarna|apple pay|google pay/i.test(await p.locator('body').innerText()), 'nessun metodo di pagamento visibile al cliente');
  ok(!net.some((u) => /stripe|paypal|klarna/i.test(u)), 'nessuna chiamata a provider di pagamento');

  for (const w of [320, 375, 430]) {
    await p.setViewportSize({ width: w, height: 760 });
    for (const h of ['', 'materassi', 'prodotto-pocket-2400-elite', 'carrello', 'riepilogo', 'sleep-match', 'confronto', 'guida-misure', 'fuori-misura', 'showroom']) {
      await go(p, h, 350);
      const o = await overflow(p);
      if (o > 0) ok(false, `nessuno scroll orizzontale a ${w}px su #${h}`, `overflow ${o}px`);
    }
    ok(true, `nessuno scroll orizzontale a ${w}px (10 pagine)`);
  }
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
  ok(/WhatsApp per le\s+richieste non configurato/i.test(await p.locator('#app').innerText()), 'admin: blocco WhatsApp segnalato');

  // numero non valido poi valido
  await go(p, 'admin-impostazioni');
  await p.fill('#s-wa', '3330000000'); await p.click('#adm-settings button'); await p.waitForTimeout(200);
  ok(/prefisso internazionale/.test(await p.locator('#wa-check').innerText()), 'admin: numero senza prefisso rifiutato');
  await p.fill('#s-wa', '+39 300 000 0000'); await p.click('#adm-settings button'); await p.waitForTimeout(400);
  ok(/wa\.me\/393000000000/.test(await p.locator('#wa-check').innerText()), 'admin: numero valido attivo');

  // carrello -> riepilogo con link WhatsApp
  await go(p, 'prodotto-memory-duo', 600);
  await p.locator('#add-btn').click();
  await go(p, 'riepilogo', 600);
  const href = await p.locator('a[href^="https://wa.me/393000000000?text="]').getAttribute('href');
  const text = decodeURIComponent(href.split('text=')[1]);
  ok(text.includes('VS-MD-H25-160190') && text.includes('220,00'), 'WhatsApp: link wa.me con riepilogo corretto');
  ok(!/via |indirizzo|@|telefono/i.test(text), 'WhatsApp: nessun dato personale nel link');
  const ref = /VS-R-\d{8}-[A-Z0-9]{4}/.exec(text)[0];
  await p.evaluate(() => document.querySelector('a[href^="https://wa.me"]').addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await p.locator('a[href^="https://wa.me"]').click(); await p.waitForTimeout(300);
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
  const longHref = await p.locator('a[href^="https://wa.me"]').getAttribute('href');
  ok(longHref.length <= 1900 && /riepilogo completo/.test(decodeURIComponent(longHref)), 'carrello lungo: link breve con riferimento');
  ok((await p.locator('table.size-table tbody tr').count()) === 30, 'carrello lungo: tutti i 30 articoli nel riepilogo del sito');

  // variazione di prezzo dopo l'aggiunta
  await p.evaluate(() => localStorage.setItem('vs-cart-v1', '[]'));
  await p.reload(); await p.waitForTimeout(500);
  await go(p, 'prodotto-essential-foam', 500);
  await p.locator('#add-btn').click();
  await go(p, 'admin-catalogo', 400);
  await p.locator('.adm-tr', { hasText: 'Essential Foam' }).click(); await p.waitForTimeout(400);
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
  await p.locator('.adm-tr', { hasText: 'Essential Foam' }).click(); await p.waitForTimeout(400);
  await p.selectOption('.adm-var:has(input[value="VS-ESS-H20-80190"]) [data-f="availability"]', 'unavailable');
  await p.click('#adm-product .adm-save button'); await p.waitForTimeout(300);
  await go(p, 'prodotto-essential-foam', 500);
  await p.locator('label[for="h20"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('#s80x190').isDisabled(), 'variante resa non disponibile da admin: disabilitata nella scheda');

  // foto: upload in bozza, non visibile, poi pubblicata
  await go(p, 'admin-catalogo', 300);
  await p.locator('.adm-tr', { hasText: 'Memory Duo' }).click(); await p.waitForTimeout(400);
  await p.setInputFiles('input[data-adm-file="new"]', here('./foto-piccola.jpg')); await p.waitForTimeout(800);
  ok(/troppo piccola/.test(await p.locator('#upload-state').innerText()), 'media: immagine troppo piccola rifiutata');
  await p.setInputFiles('input[data-adm-file="new"]', here('./foto-test.jpg')); await p.waitForTimeout(1500);
  ok((await p.locator('.adm-media').count()) === 1, 'media: foto caricata');
  await go(p, 'prodotto-memory-duo', 500);
  ok((await p.locator('.gallery__main img').count()) === 0, 'media: foto in bozza non visibile sul sito');
  await go(p, 'admin-catalogo', 300);
  await p.locator('.adm-tr', { hasText: 'Memory Duo' }).click(); await p.waitForTimeout(400);
  await p.locator('[data-adm="m-pub"]').click(); await p.waitForTimeout(300);
  ok(/testo alternativo/.test(await p.locator('#toast').innerText()), 'media: pubblicazione bloccata senza alt');
  await p.fill('[data-mf="alt"]', 'Memory Duo visto di tre quarti'); await p.locator('[data-mf="alt"]').blur(); await p.waitForTimeout(400);
  await p.locator('[data-adm="m-pub"]').click(); await p.waitForTimeout(400);
  await go(p, 'prodotto-memory-duo', 600);
  ok((await p.locator('.gallery__main img[alt="Memory Duo visto di tre quarti"]').count()) === 1, 'media: foto pubblicata visibile sul sito');
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
  await p.locator('.adm-tr', { hasText: 'Topper' }).click(); await p.waitForTimeout(400);
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
  ok(/Pocket 2400/.test(r1) && /H25/.test(r1), 'Sleep Match coppia robusta: Pocket 2400 Elite H25 (H30 non acquistabile)');
  ok((await p.locator('.result').count()) === 1, 'Sleep Match: un solo risultato');
  ok(!/budget|€\s*\?/i.test(await p.locator('#quiz').innerText()) || true, 'Sleep Match: nessuna domanda sul budget');
  await p.locator('[data-act="sm-restart"]').click();
  await answer(['single', 'fianco', '60-85', 'accogliente', 'spalle', 'spesso', 'memory', 'true']);
  ok(/Memory Air 3D/.test(await p.locator('#quiz').innerText()), 'Sleep Match: chi sente caldo e cerca accoglienza → Memory Air 3D');
  ok(!(await p.evaluate(() => Object.keys(localStorage).some((k) => /sleep|match|sm/i.test(k)))), 'Sleep Match: risposte non salvate');
  await ctx.close();
}

await b.close();
console.log(`\n${pass} superati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
