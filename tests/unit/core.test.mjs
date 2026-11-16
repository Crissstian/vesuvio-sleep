import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsAppNumber, planWhatsApp, buildFullMessage, parseEuroToCents, mattressSku, baseSku, pillowSku, customSku, visibleMethods, PROVIDERS, makeRef, WA_MAX_URL } from '../../preview/js/core/index.js';

test('numero WhatsApp: solo formato internazionale', () => {
  assert.equal(normalizeWhatsAppNumber('').ok, false);
  assert.equal(normalizeWhatsAppNumber('333 1234567').ok, false);
  assert.deepEqual(normalizeWhatsAppNumber('+39 333 123 4567'), { ok: true, digits: '393331234567' });
  assert.deepEqual(normalizeWhatsAppNumber('0039 333 1234567'), { ok: true, digits: '393331234567' });
  assert.equal(normalizeWhatsAppNumber('+39 abc').ok, false);
});

test('prezzi in centesimi', () => {
  assert.equal(parseEuroToCents('220'), 22000);
  assert.equal(parseEuroToCents('220,50'), 22050);
  assert.equal(parseEuroToCents('1.234,5'), 123450);
  assert.equal(parseEuroToCents('abc'), null);
  assert.equal(parseEuroToCents('-3'), null);
});

test('SKU secondo il Master Spec', () => {
  assert.equal(mattressSku('ESS', 20, '80x190'), 'VS-ESS-H20-80190');
  assert.equal(mattressSku('MA3D', 30, '180x200'), 'VS-MA3D-H30-180200');
  assert.equal(baseSku('FLEX', '160x190'), 'VS-RETE-FLEX-160190');
  assert.equal(pillowSku('PIUMA'), 'VS-GUA-PIUMA');
  assert.equal(customSku(new Date('2026-11-12T10:00:00Z'), 'A1'), 'VS-CUSTOM-20261112-A1');
});

const summary = (n) => ({
  ref: 'VS-R-20261112-ABCD',
  lines: Array.from({ length: n }, (_, i) => ({ name: 'Vesuvio Memory Duo', size: '160x190', height_cm: 25, sku: `VS-MD-H25-${i}`, qty: 1, unit_cents: 22000 })),
  total_cents: 22000 * n,
  shipping_note: 'gratuita in tutta Italia, isole comprese',
});

test('WhatsApp: senza numero niente link, testo completo copiabile', () => {
  const p = planWhatsApp('', summary(1));
  assert.equal(p.url, null);
  assert.match(p.fullText, /VS-MD-H25-0/);
});
test('WhatsApp: link wa.me con testo codificato', () => {
  const p = planWhatsApp('+39 333 1234567', summary(2));
  assert.ok(p.url.startsWith('https://wa.me/393331234567?text='));
  assert.equal(decodeURIComponent(p.url.split('text=')[1]), buildFullMessage(summary(2)));
  assert.match(p.text, /440,00/);
});
test('WhatsApp: carrello lungo -> messaggio breve, testo completo intatto', () => {
  const p = planWhatsApp('+39 333 1234567', summary(40));
  assert.equal(p.short, true);
  assert.ok(p.url.length <= WA_MAX_URL);
  assert.equal((p.fullText.match(/SKU/g) || []).length, 40);
});
test('pagamenti: nessun metodo visibile di default, nessuna sessione creabile', async () => {
  assert.equal(visibleMethods().length, 0);
  await assert.rejects(PROVIDERS.stripe.createSession({ requestRef: 'x', amount_cents: 1, currency: 'EUR', idempotencyKey: 'k' }), /non è attivo/);
});
test('riferimento richiesta', () => {
  assert.match(makeRef('R', new Date('2026-11-12T10:00:00Z')), /^VS-R-20261112-[2-9A-Z]{4}$/);
});

test('listino 15/11/2026: 13 misure standard e redirect degli slug', async () => {
  const core = await import('../../preview/js/core/index.js');
  assert.equal(core.STANDARD_SIZES.length, 13);
  assert.deepEqual([core.STANDARD_SIZES[0], core.STANDARD_SIZES[12]], ['80x190', '180x200']);
  const r = [{ old_slug: 'pocket-2400-elite', new_slug: 'pocket-3000-elite' }];
  assert.equal(core.resolveRedirect(r, 'pocket-2400-elite'), 'pocket-3000-elite');
  assert.equal(core.resolveRedirect(r, 'memory-duo'), null);
});

test('seed: 143 varianti acquistabili, nessun prezzo zero o inventato', async () => {
  const { SEED } = await import('../../preview/js/seed.js');
  const pub = new Set(SEED.products.filter((p) => p.status === 'published').map((p) => p.id));
  const priced = SEED.variants.filter((v) => v.price_cents !== null);
  assert.equal(priced.filter((v) => pub.has(v.product_id)).length, 143);
  assert.ok(priced.every((v) => v.price_cents > 0));
  // un prodotto fuori gamma conserva i prezzi di listino ma non è pubblico
  const air = SEED.products.find((p) => p.slug === 'memory-air-3d');
  assert.equal(air.status, 'archived');
  assert.ok(!pub.has(air.id));
  // il Pocket 1600 è rientrato in catalogo il 16/11/2026 con i prezzi aggiornati
  const p1600 = SEED.products.find((p) => p.slug === 'pocket-1600');
  assert.equal(p1600.status, 'published');
  assert.equal(SEED.variants.find((v) => v.product_id === p1600.id && v.size === '160x190' && v.height_cm === 25).price_cents, 50000);
  // il Memory Duo Classic costa 20 euro meno dello sfoderabile, misura per misura
  const duo = SEED.products.find((p) => p.slug === 'memory-duo').id;
  const cls = SEED.products.find((p) => p.slug === 'memory-duo-classic').id;
  const byZ = (id) => Object.fromEntries(SEED.variants.filter((v) => v.product_id === id && v.height_cm === 25 && v.price_cents).map((v) => [v.size, v.price_cents]));
  const a = byZ(duo), b = byZ(cls);
  assert.equal(Object.keys(b).length, 13);
  assert.ok(Object.keys(b).every((z) => a[z] - b[z] === 2000));
  assert.ok(!SEED.media.some((m) => /grafeno/i.test(m.src)));
  assert.ok(!SEED.products.some((p) => p.status === 'published' && /2400|2600/.test(p.name + p.slug + p.description + p.highlights.join(' '))));
});

test('WhatsApp: la modalità di pagamento scelta finisce nel messaggio', async () => {
  const core = await import('../../preview/js/core/index.js');
  const s = { ref: 'VS-R-20261115-ABCD', lines: [{ name: 'Vesuvio Memory Duo', size: '160x190', height_cm: 25, sku: 'VS-MD-H25-160190', qty: 1, unit_cents: 28000 }], total_cents: 28000, payment: 'contrassegno alla consegna' };
  assert.match(core.buildFullMessage(s), /Pagamento: contrassegno alla consegna/);
  assert.match(core.buildShortMessage(s), /Pagamento: contrassegno alla consegna/);
  assert.match(core.planWhatsApp('+39 366 121 8346', s).url, /^https:\/\/wa\.me\/393661218346\?text=/);
});

test('sitemap: URL assoluti, immagini, caratteri speciali protetti', async () => {
  const core = await import('../../preview/js/core/index.js');
  const xml = core.buildSitemap('https://vesuviosleep.it/', [{ path: '/', lastmod: '2026-11-15' }, { path: '/materassi/a&b/', images: ['https://vesuviosleep.it/img/x.webp'] }]);
  assert.match(xml, /<loc>https:\/\/vesuviosleep\.it\/<\/loc><lastmod>2026-11-15<\/lastmod>/);
  assert.match(xml, /a&amp;b/);
  assert.match(xml, /<image:loc>https:\/\/vesuviosleep\.it\/img\/x\.webp<\/image:loc>/);
});
