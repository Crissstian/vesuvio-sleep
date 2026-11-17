// Genera tests/sql/20_parity.sql: carrelli casuali calcolati con core/offers.ts (atteso)
// che la funzione SQL price_cart deve riprodurre al centesimo. Seme fisso: risultati ripetibili.
import { writeFileSync } from 'node:fs';
const core = await import('../../preview/js/core/index.js');
const { SEED } = await import('../../preview/js/seed.js');
const idx = new core.CatalogIndex({ ...SEED, offers_enabled: true });
const cfg = core.catalogOfferConfig(idx);
const pub = new Set(SEED.products.filter((p) => p.status === 'published').map((p) => p.id));
const buy = SEED.variants.filter((v) => v.price_cents && pub.has(v.product_id));
// carrelli "realistici": più materassi, reti e topper che altro, misure ripetute
const bySize = new Map();
for (const v of buy) if (v.size) (bySize.get(v.size) ?? bySize.set(v.size, []).get(v.size)).push(v);
const sizes = [...bySize.keys()];
// mulberry32: generatore a 32 bit con aritmetica intera esatta (Math.imul)
let s = 20261117;
const rnd = (n) => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (((t ^ (t >>> 14)) >>> 0) % n);
};
const out = ['-- Generato da tests/sql/gen_parity.mjs: non modificare a mano.', '\\set ON_ERROR_STOP 1',
  "create or replace function pg_temp.same(got jsonb, want jsonb, label text) returns void language plpgsql as $$",
  "begin",
  "  if got -> 'subtotal_cents' <> want -> 'subtotal_cents' or got -> 'discount_cents' <> want -> 'discount_cents'",
  "     or got -> 'line_discounts' <> want -> 'line_discounts' or got -> 'offers' <> want -> 'offers' then",
  "    raise exception 'FAIL parità % : sql=% atteso=%', label, got, want;",
  "  end if;",
  "end $$;"];
const kindOf = (v) => idx.kind(idx.products.get(v.product_id));
const lit = (o) => "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb";
function cartAt(k) {
  const size = sizes[rnd(sizes.length)];
  const lines = [];
  const add = (v, qty) => {
    if (!v || lines.some((l) => l.variant_id === v.id)) return;
    lines.push({ variant_id: v.id, qty });
  };
  if (k % 2 === 0) {
    // letti: materassi, reti e topper della stessa misura, quantità anche alte (scaglioni)
    const here = bySize.get(size);
    const pick = (kind) => { const xs = here.filter((v) => kindOf(v) === kind); return xs[rnd(xs.length)]; };
    const q = 1 + (rnd(3) === 0 ? rnd(7) : 0);
    add(pick('materasso'), q);
    if (rnd(4)) add(pick('rete'), q - (rnd(3) === 0 ? 1 : 0) || 1);
    if (rnd(2)) add(pick('topper'), 1 + rnd(2));
    if (rnd(3) === 0) add(pick('materasso'), 1 + rnd(2));
    if (rnd(3) === 0) add(pick('rete'), 1);
  } else {
    const pool = rnd(3) === 0 ? buy : bySize.get(size);
    const n = 1 + rnd(5);
    for (let j = 0; j < n; j++) add(pool[rnd(pool.length)], 1 + (rnd(3) === 0 ? rnd(6) : 0));
  }
  return lines;
}
function block(label, c, n) {
  for (let k = 0; k < n; k++) {
    const lines = cartAt(k);
    const r = core.priceCart(idx, lines, c);
    const want = { subtotal_cents: r.subtotal_cents, discount_cents: r.discount_cents, line_discounts: r.line_discounts, offers: r.offers };
    out.push(`select pg_temp.same(public.price_cart(${lit(lines)}, public.offer_config()), ${lit(want)}, '${label} ${k + 1}');`);
  }
}
const N = 300;
block('carrello', cfg, N);
// seconda serie con percentuali alte: il tetto del 15 % interviene spesso e va riprodotto uguale
const aggressive = SEED.offers.map((o) => ({ ...o, params:
  o.code === 'letto-completo' || o.code === 'per-due' ? { pct: { foam: 14, pocket: 30 }, round_eur: 5 }
  : o.code === 'accessori' ? { pct: { topper: 30, guanciale: 30 }, guanciali_per_letto: 2, round_eur: 1 }
  : o.params }));
out.push(...aggressive.map((o) => `update public.offers set params = ${lit(o.params)} where code = '${o.code}';`));
block('tetto', core.offerConfig(aggressive, true), 150);
out.push(...SEED.offers.map((o) => `update public.offers set params = ${lit(o.params)} where code = '${o.code}';`));
out.push(`\\echo PARITÀ core/offers.ts = price_cart su ${N + 150} carrelli (150 con il tetto sotto pressione)`);
writeFileSync(new URL('./20_parity.sql', import.meta.url), out.join('\n') + '\n');
console.log(`20_parity.sql: ${N} carrelli`);
