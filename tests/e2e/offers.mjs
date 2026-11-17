// Test end-to-end delle offerte abbinate (letto completo). Uso: node tests/e2e/offers.mjs [baseUrl]
// I prezzi attesi sono quelli reali del listino con le regole del catalogo (5 % schiuma, 8 % Pocket,
// 10/12 % più letti, 10 % topper, tetto 15 %): gli stessi dei casi golden in tests/unit/offers.test.mjs.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://localhost:8765/';
let pass = 0, fail = 0;
const ok = (c, label, extra = '') => { if (c) { pass++; console.log('OK  ', label); } else { fail++; console.log('FAIL', label, extra); } };
const b = await chromium.launch();
const errors = [];
async function newPage(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...opts });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('vs-intro', '1'); } catch {} });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  p.on('response', (r) => r.status() >= 400 && !/supabase|fonts/.test(r.url()) && errors.push(`${r.status()} ${r.url()}`));
  return { ctx, p };
}
const go = async (p, hash, wait = 700) => { await p.goto(BASE + '#' + hash); await p.waitForTimeout(wait); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const cart = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('vs-cart-v1') || '[]'));
const text = (p, sel = '#app') => p.locator(sel).first().innerText();

// ---------- calcolo in pagina = casi golden
{
  const { ctx, p } = await newPage();
  await go(p, '/');
  const g = (lines) => p.evaluate((l) => window.__vs.offer(l), lines);
  const g1 = await g([['memory-duo', '160x190', 25], ['rete-flex', '160x190', null]]);
  ok(g1.subtotal === 460 && g1.discount === 25 && g1.total === 435, 'G1 in pagina: Duo + Flex 460 → 435 €', JSON.stringify(g1));
  const g3 = await g([['pocket-3000-elite', '160x190', 25], ['rete-strong', '160x190', null]]);
  ok(g3.total === 755, 'G3 in pagina: Pocket 3000 + Strong → 755 €', JSON.stringify(g3));
  const g8 = await g([['pocket-1600', '90x200', 25, 5], ['rete-flex', '90x200', null, 5]]);
  ok(g8.discount === 225, 'G8 in pagina: 5 letti Pocket 1600 → −225 € (12 %)', JSON.stringify(g8));
  const g11 = await g([['memory-duo', '160x190', 25], ['rete-flex', '160x200', null]]);
  ok(g11.discount === 0, 'G11 in pagina: misure diverse, nessun vantaggio');

  // home: sezione letti completi con le schede speciali
  ok((await p.locator('.bundles .bcard').count()) === 1, 'home: una sola scheda "letto completo", in evidenza');
  ok((await p.locator('.bcard--elite.bcard--wide').count()) === 1, 'home: la scheda in evidenza è il Letto Elite');
  ok((await p.locator('.bundles a', { hasText: 'Tutti i letti completi' }).count()) === 1, 'home: collegamento a tutti i letti completi');

  // vista esplosa: tutti i materassi in catalogo, ciascuno con il suo rivestimento
  const models = await p.$$eval('[data-act="lab-model"]', (bs) => bs.map((x) => x.textContent.trim()));
  ok(['Eco', 'Memory Duo Classic', 'Memory Duo', 'Memory Trio', 'Pocket 1600', 'Pocket 3000 Elite'].every((m) => models.includes(m)), 'vista esplosa: tutti e sei i materassi, Trio e Pocket 1600 compresi', models.join(', '));
  const covers = [];
  for (const m of models) {
    await p.locator('[data-act="lab-model"]', { hasText: new RegExp('^' + m + '$') }).click(); await p.waitForTimeout(250);
    covers.push(await p.$eval('#lab-stage svg .ly:last-of-type polygon', (el) => el.getAttribute('fill')));
  }
  ok(new Set(covers).size === models.length, 'vista esplosa: rivestimento diverso per ogni modello', covers.join(' '));
  await p.locator('[data-act="lab-model"]', { hasText: 'Memory Trio' }).click(); await p.waitForTimeout(250);
  ok((await p.locator('.lab__legend li').count()) === 4 && (await p.locator('#lab-stage svg .ly').count()) === 4, 'Memory Trio: rivestimento e tre strati di Memory Foam');
  await p.locator('[data-act="lab-model"]', { hasText: 'Pocket 1600' }).click(); await p.waitForTimeout(250);
  ok(/1600 molle indipendenti/.test(await text(p, '.lab__legend')), 'Pocket 1600: strati con le molle');
  ok(/Letti completi/.test(await text(p, '#nav')), 'menu: voce Letti completi');
  ok((await overflow(p)) <= 0, 'home: nessuno scroll orizzontale a 390px con le schede offerta');
  await ctx.close();
}

// ---------- pagina offerte, vetrina e Componi il tuo letto
{
  const { ctx, p } = await newPage();
  await go(p, '/offerte/');
  ok((await p.locator('h1').innerText()) === 'Letti completi', 'offerte: titolo');
  ok((await p.locator('.bcard').count()) === 7, 'offerte: 7 vetrine (due con i guanciali in testa)');
  ok((await p.locator('.bcard').first().getAttribute('data-bundle')) === 'notte-memory', 'offerte: Notte Memory per prima');
  const elite = await text(p, '[data-bundle="letto-elite"]');
  ok(/Separati 820,00/.test(elite) && /755,00/.test(elite) && /65,00/.test(elite), 'scheda Elite: separati 820 €, insieme 755 €, risparmi 65 €', elite);
  ok(!/<s>|line-through/.test(await p.locator('.bcard').first().innerHTML()), 'nessun prezzo barrato: il confronto è con la somma dei pezzi');
  const singolo = await text(p, '[data-bundle="singolo-completo"]');
  ok(/160,00/.test(singolo) && /80×190/.test(singolo), 'Singolo completo: 160 € in 80×190', singolo);
  ok(/da 3 letti completi −10 %/.test(await text(p)) && /−8 % con un materasso a molle/.test(await text(p)), 'regole spiegate con i numeri della configurazione');
  ok(/rimborsiamo quanto hai pagato per quel pezzo/.test(await text(p)), 'regola del recesso parziale spiegata');

  // Componi il tuo letto: Memory Duo 160×190 + Flex di partenza
  const sum = () => text(p, '.builder__sum');
  ok(/435,00/.test(await sum()), 'Componi: Duo + Flex 160×190 = 435 €', await sum());
  await p.locator('label[for^="bd-m"]', { hasText: 'Pocket 3000 Elite' }).click(); await p.waitForTimeout(250);
  ok(/735,00/.test(await sum()), 'Componi: Pocket 3000 + Flex 160×190 = 735 €', await sum());
  await p.locator('label[for="bd-rnone"]').click(); await p.waitForTimeout(250);
  ok(/620,00/.test(await sum()) && !/Insieme/.test(await sum()), 'Componi: senza rete nessun vantaggio');
  await p.locator('label[for^="bd-r"]', { hasText: 'Rete Flex' }).click(); await p.waitForTimeout(250);
  await p.click('[data-act="bd-beds"][data-d="1"]'); await p.waitForTimeout(150);
  await p.click('[data-act="bd-beds"][data-d="1"]'); await p.waitForTimeout(250);
  ok(/3 × Pocket 3000/.test(await sum()) && /Vantaggio più letti/.test(await sum()), 'Componi: 3 letti → scaglione più letti', await sum());
  ok(await p.evaluate(() => document.activeElement?.dataset?.act === 'bd-beds'), 'Componi: il fuoco resta sul pulsante dopo l\'aggiornamento');
  await p.click('[data-act="bd-add"]'); await p.waitForTimeout(300);
  const c1 = await cart(p);
  ok(c1.length === 2 && c1.every((i) => i.qty === 3), 'Componi: 3 materassi e 3 reti nel carrello', JSON.stringify(c1));
  ok((await overflow(p)) <= 0, 'offerte: nessuno scroll orizzontale a 390px');

  // vetrina Letto Elite: misura, altezza, topper facoltativo
  await p.evaluate(() => localStorage.setItem('vs-cart-v1', '[]'));
  await go(p, '/offerte/letto-elite/'); await p.reload(); await p.waitForTimeout(800);
  ok((await p.locator('h1').innerText()) === 'Letto Elite', 'vetrina: titolo');
  const buy = () => text(p, '#bbuy');
  ok(/755,00/.test(await buy()), 'vetrina Elite 160×190: 755 €');
  await p.check('[data-act="b-opt"]'); await p.waitForTimeout(250);
  ok(/935,00/.test(await buy()) && /Vantaggio accessori/.test(await buy()), 'vetrina: con il topper 1020 − 85 = 935 €', await buy());
  await p.locator('label[for="b-h30"]').click(); await p.waitForTimeout(250);
  ok(/Pocket 3000 Elite[\s\S]*H30/.test(await buy()), 'vetrina: altezza H30 selezionabile');
  await p.locator('label[for="b-s90x200"]').click(); await p.waitForTimeout(250);
  ok(/90×200/.test(await buy()), 'vetrina: cambio misura');
  await p.click('#b-add'); await p.waitForTimeout(300);
  const c2 = await cart(p);
  ok(c2.length === 3, 'vetrina: materasso, rete e topper nel carrello', JSON.stringify(c2));
  ok(/nel carrello/.test(await text(p, '#b-feedback')), 'vetrina: conferma dell\'aggiunta');
  ok((await overflow(p)) <= 0, 'vetrina: nessuno scroll orizzontale a 390px');
  await go(p, '/offerte/non-esiste/');
  ok(/non trovata|Pagina non/i.test(await text(p)), 'vetrina inesistente: pagina non trovata');
  await ctx.close();
}

// ---------- scheda materasso, carrello, riepilogo, WhatsApp
{
  const { ctx, p } = await newPage();
  await go(p, '/materassi/memory-duo/');
  ok((await p.locator('.bedpanel').count()) === 1, 'scheda: pannello Completa il letto');
  ok(/−25,00/.test(await text(p, '.bedpanel')) && /435,00/.test(await text(p, '.bedpanel')), 'scheda: risparmio e totale con la rete', await text(p, '.bedpanel'));
  ok(/−25,00\s€ con questo materasso/.test(await text(p, '#pairings')), 'abbinamenti: risparmio mostrato sulle reti');
  await p.click('[data-act="add-bed"]'); await p.waitForTimeout(300);
  ok((await cart(p)).length === 2, 'scheda: "Aggiungi materasso e rete" mette due articoli');

  await go(p, '/carrello/', 900);
  const summ = await text(p, '.summary');
  ok(/Subtotale[\s\S]*460,00/.test(summ) && /Vantaggio letto completo/.test(summ) && /435,00/.test(summ), 'carrello: subtotale, vantaggio, totale', summ);
  ok(/−[\d,]+\s€ di vantaggio/.test(await text(p, '.line')), 'carrello: quota di vantaggio sulla riga');
  ok(/Aggiungi il Topper/.test(await text(p, '.hints')), 'carrello: suggerimento topper sul letto completo');
  ok(/Aggiungi 2 guanciali/.test(await text(p, '.hints .hint')), 'carrello: i guanciali proposti per primi');
  await p.locator('.hints .hint', { hasText: 'Topper' }).locator('[data-act="add-variant"]').click(); await p.waitForTimeout(900);
  ok(/615,00/.test(await text(p, '.summary')), 'carrello: con il topper 660 − 45 = 615 €', await text(p, '.summary'));
  ok(/Sali al/.test(await text(p, '.hints')), 'carrello: proposta di salire di gamma con la differenza netta');

  // togliere la rete: il vantaggio sparisce e torna il suggerimento
  const reteId = await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    const r = db.products.find((x) => x.slug === 'rete-flex');
    return db.variants.find((v) => v.product_id === r.id && v.size === '160x190').id;
  });
  await p.click(`[data-act="cart-remove"][data-id="${reteId}"]`); await p.waitForTimeout(900);
  ok(!/Vantaggio letto completo/.test(await text(p, '.summary')) && /Aggiungi la Rete Flex 160×190/.test(await text(p, '.hints')), 'carrello: senza rete niente vantaggio, torna il suggerimento');
  await p.locator('.hints .hint', { hasText: 'Rete Flex' }).locator('[data-act="add-variant"]').click(); await p.waitForTimeout(900);

  await go(p, '/carrello/riepilogo/', 1000);
  const msg = await text(p, '.msg-preview');
  ok(/Subtotale: 660,00/.test(msg) && /Vantaggio letto completo 160×190: −25,00/.test(msg) && /Vantaggio accessori 160×190: −20,00/.test(msg) && /Totale: 615,00/.test(msg), 'WhatsApp: subtotale, vantaggi e totale nel messaggio', msg);
  ok(!/@|\b\d{16}\b/.test(msg), 'WhatsApp: nessun dato personale');
  ok((await p.locator('tr.tr-save').count()) === 2, 'riepilogo: righe dei vantaggi nella tabella');
  const req = await p.evaluate(() => JSON.parse(localStorage.getItem('vs-preview-db-v1')).requests[0]);
  ok(req.discount_cents === 4500 && req.subtotal_cents === 66000 && req.items.some((i) => i.discount_cents > 0), 'richiesta salvata con sconto, subtotale e quote per riga', JSON.stringify({ d: req.discount_cents, s: req.subtotal_cents }));
  ok((await overflow(p)) <= 0, 'riepilogo: nessuno scroll orizzontale a 390px');
  await ctx.close();
}

// ---------- Sleep Match: chiude con il letto completo
{
  const { ctx, p } = await newPage();
  await go(p, '/sleep-match/');
  for (let k = 0; k < 14; k++) {
    if (await p.locator('.result').count()) break;
    const r = p.locator('#quiz input[type="radio"]').first();
    if (!(await r.count())) break;
    await p.locator('#quiz label').first().click();
    await p.click('[data-act="sm-next"]'); await p.waitForTimeout(250);
  }
  ok((await p.locator('#sm-bed .smbed').count()) === 1, 'Sleep Match: blocco "Il tuo letto completo"');
  await p.click('#sm-bed [data-act="sm-size"][data-v="90x200"]'); await p.waitForTimeout(200);
  ok(/90×200/.test(await text(p, '#sm-bed')), 'Sleep Match: cambio misura del letto');
  await p.click('#sm-bed [data-act="add-bed"]'); await p.waitForTimeout(300);
  ok((await cart(p)).length === 2, 'Sleep Match: materasso e rete nel carrello');
  await ctx.close();
}

// ---------- interruttore spento: tutto come prima
{
  const { ctx, p } = await newPage();
  await go(p, '/');
  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    db.settings.offers_enabled = false;
    localStorage.setItem('vs-preview-db-v1', JSON.stringify(db));
  });
  await go(p, '/'); await p.reload(); await p.waitForTimeout(900);
  ok((await p.locator('.bcard').count()) === 0 && !/Letti completi/.test(await text(p, '#nav')), 'offerte spente: nessuna scheda né voce di menu');
  const g = await p.evaluate(() => window.__vs.offer([['memory-duo', '160x190', 25], ['rete-flex', '160x190', null]]));
  ok(g.discount === 0, 'offerte spente: nessuno sconto');
  await go(p, '/materassi/memory-duo/');
  ok((await p.locator('.bedpanel').count()) === 0, 'offerte spente: nessun pannello nella scheda');
  await go(p, '/offerte/');
  ok(/non trovata|Pagina non/i.test(await text(p)), 'offerte spente: la pagina offerte non esiste');
  await ctx.close();
}

// ---------- admin: percentuali, vetrine, recesso parziale
{
  const { ctx, p } = await newPage({ viewport: { width: 1280, height: 900 } });
  await go(p, '/admin/');
  await p.fill('#pw', 'anteprima-test-2026'); await p.fill('#pw2', 'anteprima-test-2026'); await p.click('#adm-login button'); await p.waitForTimeout(1200);
  await go(p, '/admin/offerte/', 900);
  ok((await p.locator('#adm-offers').count()) === 1, 'admin: sezione Offerte');
  ok(/435,00/.test(await text(p)), 'admin: esempi calcolati con le regole salvate');
  await p.fill('#o-lc-pocket', '45'); await p.click('#adm-offers .adm-save button'); await p.waitForTimeout(400);
  ok((await p.locator('#o-lc-pocket[aria-invalid="true"]').count()) === 1, 'admin: percentuale oltre il 30 % rifiutata');
  await p.fill('#o-lc-pocket', '10'); await p.selectOption('select[aria-label="Stato di Letto Trio"]', 'draft'); await p.click('#adm-offers .adm-save button'); await p.waitForTimeout(600);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('vs-preview-db-v1')));
  ok(saved.offers.find((o) => o.code === 'letto-completo').params.pct.pocket === 10, 'admin: percentuale Pocket salvata');
  ok(saved.audit.some((a) => a.action === 'offerte'), 'admin: modifica registrata nello storico');
  await go(p, '/offerte/');
  ok((await p.locator('.bcard').count()) === 6, 'vetrina messa in bozza: non più visibile');
  ok(/820,00[\s\S]*740,00/.test(await text(p, '[data-bundle="letto-elite"]')), 'nuova percentuale applicata subito: Elite 820 → 740 €', await text(p, '[data-bundle="letto-elite"]'));

  // recesso parziale su una richiesta con letto completo
  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    const pv = (slug, size, h) => { const pr = db.products.find((x) => x.slug === slug); return db.variants.find((v) => v.product_id === pr.id && v.size === size && (h == null || v.height_cm === h)); };
    const items = [pv('pocket-3000-elite', '160x190', 25), pv('rete-strong', '160x190')].map((v) => ({ variant_id: v.id, qty: 1, seen_price_cents: v.price_cents }));
    db.offers.find((o) => o.code === 'letto-completo').params.pct.pocket = 8;
    localStorage.setItem('vs-preview-db-v1', JSON.stringify(db));
    localStorage.setItem('vs-cart-v1', JSON.stringify(items));
  });
  await p.reload(); await p.waitForTimeout(600);
  await go(p, '/carrello/riepilogo/', 1200);
  const ref = await p.evaluate(() => JSON.parse(localStorage.getItem('vs-preview-db-v1')).requests[0].ref);
  await go(p, '/admin/richiesta-' + ref, 900);
  ok(/Vantaggio letto completo/.test(await text(p, '#adm-request')), 'admin: vantaggi nella richiesta');
  await p.locator('summary', { hasText: 'Recesso parziale' }).click();
  await p.fill('[data-refund="0"]', '1'); await p.click('[data-adm="refund-calc"]'); await p.waitForTimeout(200);
  ok(/570,85/.test(await text(p, '#refund-out')), 'admin: recesso del solo materasso → 570,85 €', await text(p, '#refund-out'));
  await p.click('[data-adm="refund-log"]'); await p.waitForTimeout(400);
  ok(/Recesso parziale: rimborsati 570,85/.test(await text(p, '.adm-history')), 'admin: recesso registrato nello storico');
  await ctx.close();
}

// ---------- guanciali in vendita (prezzi di PROVA iniettati nel browser, solo per il test)
{
  const { ctx, p } = await newPage();
  await go(p, '/');
  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    const price = { 'guanciale-memory-classic': 4000, 'guanciale-memory-flakes': 3500 };
    for (const pr of db.products) if (price[pr.slug]) {
      pr.status = 'published';
      for (const v of db.variants) if (v.product_id === pr.id) Object.assign(v, { price_cents: price[pr.slug], availability: 'made_to_order' });
    }
    db.categories.find((c) => c.kind === 'guanciale').status = 'published';
    localStorage.setItem('vs-preview-db-v1', JSON.stringify(db));
  });
  await p.reload(); await p.waitForTimeout(900);
  ok(/Notte Memory/.test(await text(p, '.bundles')), 'guanciali in vendita: in home la scheda in evidenza diventa Notte Memory');
  await go(p, '/offerte/');
  const first = await p.locator('.bcard').first().innerText();
  ok(/Notte Memory/.test(first) && /2 × guanciali Memory Classic/.test(first), 'offerte: le vetrine con i guanciali vengono prima', first);
  ok(/Guanciali[\s\S]*15 %/.test(await text(p, '.rules')) && /Coppia di guanciali/.test(await text(p, '.rules')), 'regole: guanciali con il materasso e coppia');
  ok((await p.locator('input[name="bd-pil"]').count()) === 3, 'Componi: passo guanciali (Flakes, Classic, niente)');
  await go(p, '/materassi/memory-duo/');
  ok(/2 × Memory Flakes/.test(await text(p, '.bedpanel')) && /2 × Memory Classic/.test(await text(p, '.bedpanel')), 'scheda materasso: due guanciali proposti prima della rete');
  await p.evaluate(() => localStorage.setItem('vs-cart-v1', '[]')); await p.reload(); await p.waitForTimeout(800);
  await p.click('.bedpanel [data-act="add-variant"]'); await p.waitForTimeout(300);
  ok((await cart(p)).some((i) => i.qty === 2), 'scheda materasso: aggiunta la coppia di guanciali');
  await p.click('#add-btn'); await p.waitForTimeout(300);
  await go(p, '/carrello/', 900);
  ok(/Vantaggio accessori/.test(await text(p, '.summary')), 'carrello: vantaggio sui guanciali con il materasso, senza rete');
  const h = await p.locator('.hint').first().innerText();
  ok(/Aggiungi 2 guanciali Memory Classic|Aggiungi la Rete Flex/.test(h), 'carrello: suggerimenti con i guanciali per primi', h);
  await go(p, '/guanciali/guanciale-memory-flakes/');
  ok(/Prendine due/.test(await text(p, '#buy')) && /Risparmi\s*7,00/.test(await text(p, '#buy')) && /63,00/.test(await text(p, '#buy')), 'scheda guanciale: la coppia con il vantaggio (70 € × 10 %)', await text(p, '#buy'));
  ok((await overflow(p)) <= 0, 'scheda guanciale: nessuno scroll orizzontale');
  await ctx.close();
}

// ---------- mappa su richiesta e recensioni Google (risposta simulata della funzione)
{
  const { ctx, p } = await newPage();
  const google = [];
  p.on('request', (r) => /google\.com\/maps|maps\.google/.test(r.url()) && google.push(r.url()));
  await p.route('**/js/config.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('reviews: false', 'reviews: true');
    route.fulfill({ response: res, body });
  });
  await p.route('**/functions/v1/google-reviews', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, rating: 4.7, count: 38, url: 'https://maps.google.com/?cid=1', reviews: [
      { rating: 5, text: 'Materasso arrivato in due giorni, montaggio della rete compreso.', when: 'un mese fa', author: 'Recensore di prova', authorUri: 'https://www.google.com/maps/contrib/1' },
      { rating: 3, text: 'Buon prodotto, consegna da migliorare.', when: '2 mesi fa', author: 'Secondo recensore', authorUri: '' },
    ] }) }));
  await p.route('**/rest/v1/**', (route) => route.abort());
  await go(p, '/showroom/', 1200);
  ok(google.length === 0, 'mappa: nessuna connessione a Google prima del clic');
  ok((await p.locator('[data-act="map-load"]').count()) === 1 && /Google riceve il tuo indirizzo IP/.test(await text(p, '.map-card')), 'mappa: pulsante e avviso privacy');
  await p.click('[data-act="map-load"]'); await p.waitForTimeout(600);
  ok((await p.locator('.map-card iframe[src*="output=embed"]').count()) === 1, 'mappa: al clic si carica Google Maps');
  ok(/Salierno/.test(decodeURIComponent(await p.locator('.map-card iframe').getAttribute('src'))), 'mappa: centrata sull\'indirizzo della fabbrica');
  await go(p, '/', 1200);
  ok((await p.locator('.map-card iframe').count()) === 1, 'mappa: chiesta una volta, resta caricata per la visita');
  const rev = await text(p, '#g-reviews');
  ok(/4,7/.test(rev) && /38 recensioni/.test(rev) && /Buon prodotto/.test(rev), 'recensioni: voto medio, totale e testi (anche quelle non a 5 stelle)', rev);
  ok(/senza selezionarle/.test(rev) && (await p.locator('#g-reviews a[href*="maps.google.com"]').count()) === 1, 'recensioni: dichiarazione e collegamento a Google Maps');
  await go(p, '/privacy/', 600);
  ok(/si carica solo se premi/.test(await text(p)) && /Supabase/.test(await text(p)), 'privacy: mappa su richiesta, recensioni e database dichiarati');
  await ctx.close();
}
{
  const { ctx, p } = await newPage();
  await go(p, '/showroom/', 1000);
  ok((await p.locator('#g-reviews').count()) === 0, 'recensioni spente in configurazione: nessuna sezione');
  await ctx.close();
}

// ---------- carrello condivisibile
{
  const { ctx, p } = await newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await go(p, '/materassi/memory-duo/');
  await p.click('[data-act="add-bed"]'); await p.waitForTimeout(300);
  await go(p, '/carrello/', 900);
  await p.evaluate(() => { delete navigator.share; });
  await p.click('[data-act="share-cart"]'); await p.waitForTimeout(400);
  const link = await p.evaluate(() => navigator.clipboard.readText());
  ok(/#\/carrello\/\?c=VS-MD-H25-160190\*1%2CVS-RETE-FLEX-160190\*1$/.test(link), 'condividi: link con SKU e quantità, senza prezzi né dati personali', link);
  ok((await p.locator('#share-out a[href^="https://wa.me/?text="]').count()) === 1, 'condividi: invio su WhatsApp proposto');
  const { ctx: c2, p: p2 } = await newPage();
  await p2.goto(link); await p2.waitForTimeout(1200);
  ok(/Un carrello condiviso con te/.test(await text(p2)) && /435,00/.test(await text(p2)), 'link aperto: articoli e totale con i vantaggi di oggi', await text(p2));
  await p2.click('[data-act="shared-use"]'); await p2.waitForTimeout(900);
  ok((await cart(p2)).length === 2 && /Carrello/.test(await p2.locator('h1').innerText()), 'link aperto: «Usa questo carrello» riempie il carrello');
  await p2.goto(BASE + '#/carrello/?c=VS-NONESISTE*3'); await p2.waitForTimeout(900);
  ok(/non contiene articoli in vendita/.test(await text(p2)), 'link con articoli inesistenti: messaggio chiaro');
  await c2.close();
  await ctx.close();
}

// ---------- percorso verso il database, con risposte simulate (la sandbox non raggiunge Supabase)
for (const mode of ['vecchio', 'cambiato', 'nuovo']) {
  const { ctx, p } = await newPage();
  const calls = [];
  const ids = {};
  await p.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    const body = route.request().postDataJSON?.() ?? null;
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    const line = (id, unit, disc) => ({ variant_id: id, qty: 1, status: 'ok', unit_cents: unit, discount_cents: disc });
    if (url.includes('/rpc/validate_cart')) {
      calls.push('validate');
      const lines = [line(ids.duo, 28000, 1522), line(ids.flex, 18000, 978)];
      if (mode === 'vecchio') return json({ lines: lines.map(({ discount_cents, ...l }) => l), total_cents: 46000, issues: 0, can_submit: true });
      return json({ lines, subtotal_cents: 46000, discount_cents: 2500, total_cents: 43500, offers: [{ code: 'letto-completo', label: 'Vantaggio letto completo', pct: 5, size: '160x190', amount_cents: 2500, count: 1 }], issues: 0, can_submit: true });
    }
    if (url.includes('/rpc/create_cart_request')) {
      calls.push('create:' + JSON.stringify(body));
      if (mode === 'cambiato')
        return json({ ok: false, reason: 'offer_changed', validation: { lines: [line(ids.duo, 28000, 1217), line(ids.flex, 18000, 783)], subtotal_cents: 46000, discount_cents: 2000, total_cents: 44000, offers: [], issues: 0, can_submit: true } });
      return json({ ok: true, ref: 'VS-R-20261117-DBOK', validation: {} });
    }
    return route.abort();
  });
  await go(p, '/');
  Object.assign(ids, await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('vs-preview-db-v1'));
    const v = (slug, h) => { const pr = db.products.find((x) => x.slug === slug); return db.variants.find((x) => x.product_id === pr.id && x.size === '160x190' && (h == null || x.height_cm === h)); };
    const duo = v('memory-duo', 25), flex = v('rete-flex');
    localStorage.setItem('vs-cart-v1', JSON.stringify([duo, flex].map((x) => ({ variant_id: x.id, qty: 1, seen_price_cents: x.price_cents }))));
    return { duo: duo.id, flex: flex.id };
  }));
  await p.reload(); await p.waitForTimeout(500);
  await go(p, '/carrello/riepilogo/', 1500);
  const app = await text(p);
  if (mode === 'vecchio') {
    ok(/435,00/.test(app) && !calls.some((c) => c.startsWith('create')), 'database senza migrazione offerte: sconto calcolato in pagina, richiesta con sconto non salvata nel database', calls.join(' '));
  } else if (mode === 'cambiato') {
    ok(/Il totale è cambiato/.test(app) && /440,00/.test(app), 'database: offerta cambiata → avviso con il nuovo totale, nessuna richiesta', app.slice(0, 300));
    ok(calls.some((c) => c.includes('"seen_total_cents":43500')), 'database: si manda il totale visto dal cliente');
  } else {
    ok(/VS-R-20261117-DBOK/.test(app) && /435,00/.test(app), 'database aggiornato: riferimento del database e totale scontato', app.slice(0, 200));
    ok(/Vantaggio letto completo/.test(await text(p, '.msg-preview')), 'database aggiornato: vantaggio nel messaggio WhatsApp');
  }
  await ctx.close();
}

await b.close();
const errs = [...new Set(errors)].filter((e) => !/net::ERR_FAILED|Failed to fetch|supabase/i.test(e));
ok(!errs.length, 'nessun errore JavaScript o risorsa mancante', errs.join(' | '));
console.log(`\n${pass} superati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
