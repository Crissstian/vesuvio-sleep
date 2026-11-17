// Offerte abbinate: casi golden sui prezzi reali (docs/OFFERTE.md §3.5) e proprietà.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const core = await import('../../preview/js/core/index.js');
const { SEED } = await import('../../preview/js/seed.js');

const idx = new core.CatalogIndex({ ...SEED, offers_enabled: true });
const cfg = core.catalogOfferConfig(idx);
const prod = (slug) => SEED.products.find((p) => p.slug === slug);
const V = (slug, size, h = null) => {
  const p = prod(slug);
  const v = SEED.variants.find((x) => x.product_id === p.id && x.size === size && (h == null || x.height_cm === h));
  assert.ok(v, `variante ${slug} ${size} ${h}`);
  return v.id;
};
const price = (lines) => core.priceCart(idx, lines.map(([slug, size, h, qty = 1]) => ({ variant_id: V(slug, size, h), qty })), cfg);
const eur = (c) => c / 100;

test('configurazione: regole del catalogo, tetto 15 %', () => {
  assert.deepEqual(cfg.set.pct, { foam: 5, pocket: 8 });
  assert.equal(cfg.cap_pct, 15);
  assert.deepEqual(cfg.tiers.map((t) => [t.min_sets, t.pct]), [[3, 10], [5, 12]]);
  assert.equal(core.offerConfig(SEED.offers, false), null, 'interruttore spento: nessuna offerta');
});

const GOLDEN = [
  ['G1 Duo 160×190 + Flex', [['memory-duo', '160x190', 25], ['rete-flex', '160x190']], 460, 25],
  ['G2 Eco H20 80×190 + Flex', [['eco', '80x190', 20], ['rete-flex', '80x190']], 170, 10],
  ['G3 Pocket 3000 + Strong', [['pocket-3000-elite', '160x190', 25], ['rete-strong', '160x190']], 820, 65],
  ['G4 Pocket 1600 H30 180×200 + Flex', [['pocket-1600', '180x200', 30], ['rete-flex', '180x200']], 840, 65],
  ['G5 Trio + Flex', [['memory-trio', '160x190', 27], ['rete-flex', '160x190']], 580, 30],
  ['G6 G1 + Topper', [['memory-duo', '160x190', 25], ['rete-flex', '160x190'], ['topper-memory-cloud-5', '160x190', 5]], 660, 45],
  ['G7 3 letti Duo 90×200', [['memory-duo', '90x200', 25, 3], ['rete-flex', '90x200', null, 3]], 840, 90],
  ['G8 5 letti Pocket 1600 90×200', [['pocket-1600', '90x200', 25, 5], ['rete-flex', '90x200', null, 5]], 1950, 225],
  ['G9 due Duo 90×200 senza rete', [['memory-duo', '90x200', 25, 2]], 340, 15],
  ['G10 Pocket 3000 da solo', [['pocket-3000-elite', '160x190', 25]], 620, 0],
  ['G11 misure diverse', [['memory-duo', '160x190', 25], ['rete-flex', '160x200']], 470, 0],
  ['G12 topper da solo', [['topper-memory-cloud-5', '160x190', 5]], 200, 0],
  ['G13 topper di altra misura', [['memory-duo', '160x190', 25], ['rete-flex', '160x190'], ['topper-memory-cloud-5', '140x190', 5]], 620, 25],
];
for (const [label, lines, list, disc] of GOLDEN) {
  test(`golden ${label}: ${list} € − ${disc} €`, () => {
    const r = price(lines);
    assert.equal(eur(r.subtotal_cents), list);
    assert.equal(eur(r.discount_cents), disc);
    assert.equal(r.total_cents, r.subtotal_cents - r.discount_cents);
    assert.equal(r.line_discounts.reduce((a, b) => a + b, 0), r.discount_cents);
  });
}

test('G7 e G8: scaglioni dei letti multipli', () => {
  const g7 = price([['memory-duo', '90x200', 25, 3], ['rete-flex', '90x200', null, 3]]);
  assert.deepEqual(g7.offers.map((o) => [o.code, o.pct, o.count, eur(o.amount_cents)]), [['letti-multipli', 10, 3, 90]]);
  const g8 = price([['pocket-1600', '90x200', 25, 5], ['rete-flex', '90x200', null, 5]]);
  assert.deepEqual(g8.offers.map((o) => [o.code, o.pct, o.count]), [['letti-multipli', 12, 5]]);
});

test('ripartizione e recesso parziale (G3)', () => {
  const r = price([['pocket-3000-elite', '160x190', 25], ['rete-strong', '160x190']]);
  assert.deepEqual(r.line_discounts, [4915, 1585]);
  const lines = [
    { qty: 1, unit_cents: 62000, discount_cents: r.line_discounts[0] },
    { qty: 1, unit_cents: 20000, discount_cents: r.line_discounts[1] },
  ];
  assert.equal(core.refundForLine(lines[0], 1), 57085, 'si rimborsa quanto pagato per il materasso');
  assert.equal(core.refundForLine(lines[1], 1), 18415);
  assert.equal(core.refundForLine(lines[0], 1) + core.refundForLine(lines[1], 1), r.total_cents, 'reso totale = totale pagato');
  assert.equal(core.refundForLine({ qty: 3, unit_cents: 1000, discount_cents: 100 }, 2), 2000 - 67);
});

test('suggerimenti "Aggiungi": rete della misura e topper, con il risparmio ricalcolato', () => {
  const lines = [{ variant_id: V('pocket-3000-elite', '160x190', 25), qty: 1 }];
  const h = core.offerHints(idx, lines, cfg);
  assert.equal(h[0].type, 'add_rete');
  assert.equal(h[0].size, '160x190');
  assert.equal(h[0].product.slug, 'rete-flex', 'la rete più economica della misura');
  assert.equal(eur(h[0].save_cents), 65);
  const full = [...lines, { variant_id: h[0].variant.id, qty: 1 }];
  const h2 = core.offerHints(idx, full, cfg);
  assert.equal(h2[0]?.type, 'add_topper');
  assert.equal(eur(h2[0].save_cents), 20);
  assert.deepEqual(core.offerHints(idx, full, null), [], 'offerte spente: nessun suggerimento');
});

test('vetrine: pubblicate, acquistabili, prezzo "da" coerente con il calcolo', () => {
  const pub = core.publicBundles(idx).map((b) => b.slug);
  assert.deepEqual(pub, ['letto-elite', 'letto-pocket', 'letto-trio', 'letto-memory', 'singolo-completo']);
  const singolo = SEED.bundles.find((b) => b.slug === 'singolo-completo');
  assert.deepEqual(core.bundleSizes(idx, singolo), ['80x190', '80x200', '90x190', '90x200']);
  const from = core.bundleFrom(idx, singolo);
  assert.equal(from.size, '80x190');
  assert.equal(eur(from.price.total_cents), 160);
  const elite = SEED.bundles.find((b) => b.slug === 'letto-elite');
  const q = core.quoteBundle(idx, elite, '160x190', { optional: new Set([prod('topper-memory-cloud-5').id]) });
  assert.equal(q.available, true);
  assert.equal(q.height, 25);
  assert.equal(eur(q.price.subtotal_cents), 1020);
  assert.equal(eur(q.price.discount_cents), 85, 'letto completo 65 € + topper 20 €');
  const h30 = core.quoteBundle(idx, elite, '160x190', { height: 30 });
  assert.equal(h30.height, 30);
  assert.equal(core.quoteBundle(idx, elite, '160x190', { height: 99 }).available, false, 'altezza inesistente: non acquistabile');
});

test('proprietà su 400 carrelli casuali', () => {
  const buy = SEED.variants.filter((v) => {
    const p = SEED.products.find((x) => x.id === v.product_id);
    return v.price_cents && p.status === 'published';
  });
  let seed = 7;
  const rnd = (n) => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) % n;
  };
  for (let k = 0; k < 400; k++) {
    const lines = [];
    const n = 1 + rnd(6);
    for (let j = 0; j < n; j++) lines.push({ variant_id: buy[rnd(buy.length)].id, qty: 1 + rnd(3) });
    const r = core.priceCart(idx, lines, cfg);
    assert.ok(r.discount_cents >= 0 && r.total_cents >= 0);
    assert.ok(r.discount_cents <= Math.floor((r.subtotal_cents * 15) / 100), 'mai oltre il tetto');
    assert.equal(r.line_discounts.reduce((a, b) => a + b, 0), r.discount_cents);
    assert.equal(r.offers.reduce((a, o) => a + o.amount_cents, 0), r.discount_cents);
    const off = core.priceCart(idx, lines, null);
    assert.equal(off.discount_cents, 0);
    assert.equal(off.subtotal_cents, r.subtotal_cents);
  }
});

test('regole in pausa o scadute non contano', () => {
  const rules = SEED.offers.map((o) => (o.code === 'letto-completo' ? { ...o, status: 'paused' } : o));
  const c = core.offerConfig(rules, true);
  assert.equal(c.set, null);
  const expired = SEED.offers.map((o) => (o.code === 'letto-completo' ? { ...o, ends_at: '2020-01-01T00:00:00Z' } : o));
  assert.equal(core.offerConfig(expired, true).set, null);
  const r = core.priceCart(idx, [{ variant_id: V('memory-duo', '160x190', 25), qty: 1 }, { variant_id: V('rete-flex', '160x190'), qty: 1 }], c);
  assert.equal(r.discount_cents, 0);
});

test('una percentuale fuori scala viene limitata (30 %) e il tetto vale sempre', () => {
  const rules = SEED.offers.map((o) => (o.code === 'letto-completo' ? { ...o, params: { pct: { foam: 80, pocket: 80 }, round_eur: 5 } } : o));
  const c = core.offerConfig(rules, true);
  assert.equal(c.set.pct.foam, 30);
  const r = core.priceCart(idx, [{ variant_id: V('memory-duo', '160x190', 25), qty: 1 }, { variant_id: V('rete-flex', '160x190'), qty: 1 }], c);
  assert.equal(r.discount_cents, Math.floor((46000 * 15) / 100), 'il tetto del 15 % riduce lo sconto');
});

// ---------- guanciali (17/11/2026): prezzi di PROVA, solo per questi test
const PILLOW = { 'guanciale-memory-classic': 4000, 'guanciale-memory-flakes': 3500 };
const pillowIds = new Set(SEED.products.filter((p) => PILLOW[p.slug]).map((p) => p.id));
const snapP = {
  ...SEED,
  offers_enabled: true,
  categories: SEED.categories.map((c) => (c.kind === 'guanciale' ? { ...c, status: 'published' } : c)),
  products: SEED.products.map((p) => (PILLOW[p.slug] ? { ...p, status: 'published' } : p)),
  variants: SEED.variants.map((v) => (pillowIds.has(v.product_id) ? { ...v, price_cents: PILLOW[SEED.products.find((p) => p.id === v.product_id).slug], availability: 'made_to_order' } : v)),
};
const idxP = new core.CatalogIndex(snapP);
const cfgP = core.catalogOfferConfig(idxP);
const pv = (slug) => snapP.variants.find((v) => v.product_id === SEED.products.find((p) => p.slug === slug).id).id;

test('guanciali: −15 % con un materasso, anche senza rete', () => {
  const r = core.priceCart(idxP, [{ variant_id: V('memory-duo', '160x190', 25), qty: 1 }, { variant_id: pv('guanciale-memory-classic'), qty: 2 }], cfgP);
  assert.equal(eur(r.discount_cents), 12, '2 × 40 € × 15 % = 12 €');
  assert.deepEqual(r.offers.map((o) => o.code), ['accessori']);
});
test('guanciali: due per materasso, poi la coppia', () => {
  const r = core.priceCart(idxP, [{ variant_id: V('memory-duo', '160x190', 25), qty: 1 }, { variant_id: pv('guanciale-memory-flakes'), qty: 4 }], cfgP);
  // 2 con il materasso: 2 × 35 × 15 % = 5,25 → 5 € l'uno (arrotondato all'euro) = 10; gli altri 2 in coppia: 70 × 10 % = 7
  assert.equal(eur(r.discount_cents), 17);
  assert.deepEqual(r.offers.map((o) => [o.code, o.count]), [['accessori', 2], ['coppia-guanciali', 1]]);
});
test('coppia di guanciali da sola; un guanciale da solo no', () => {
  assert.equal(eur(core.priceCart(idxP, [{ variant_id: pv('guanciale-memory-classic'), qty: 2 }], cfgP).discount_cents), 8);
  assert.equal(core.priceCart(idxP, [{ variant_id: pv('guanciale-memory-classic'), qty: 1 }], cfgP).discount_cents, 0);
});
test('letto completo + guanciali: si sommano su pezzi diversi', () => {
  const r = core.priceCart(idxP, [{ variant_id: V('memory-duo', '160x190', 25), qty: 1 }, { variant_id: V('rete-flex', '160x190'), qty: 1 }, { variant_id: pv('guanciale-memory-classic'), qty: 2 }], cfgP);
  assert.equal(eur(r.discount_cents), 25 + 12);
});
test('suggerimenti: i guanciali consigliati vengono prima della rete, in coppia', () => {
  const h = core.offerHints(idxP, [{ variant_id: V('memory-duo', '160x190', 25), qty: 1 }], cfgP);
  assert.deepEqual(h.map((x) => [x.type, x.product.slug, x.qty]), [
    ['add_guanciali', 'guanciale-memory-flakes', 2],
    ['add_guanciali', 'guanciale-memory-classic', 2],
    ['add_rete', 'rete-flex', 1],
  ]);
});
test('vetrine Notte: nascoste senza guanciali in vendita, visibili quando ci sono', () => {
  assert.ok(!core.publicBundles(idx).some((b) => b.slug.startsWith('notte-')), 'catalogo reale: guanciali senza prezzo → niente vetrine Notte');
  const pub = core.publicBundles(idxP).map((b) => b.slug);
  assert.deepEqual(pub.slice(0, 2), ['notte-memory', 'notte-flakes'], 'con i guanciali in vendita le vetrine Notte sono le prime');
  const nm = snapP.bundles.find((b) => b.slug === 'notte-memory');
  const q = core.quoteBundle(idxP, nm, '160x190');
  assert.equal(eur(q.price.subtotal_cents), 280 + 80);
  assert.equal(eur(q.price.discount_cents), 12);
});
