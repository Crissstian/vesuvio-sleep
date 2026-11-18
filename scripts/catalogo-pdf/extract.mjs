import { SEED } from '/home/claude/vesuvio-sleep-concept/preview/js/seed.js';
import fs from 'fs';
const cats = SEED.categories.filter(c => c.status === 'published').sort((a,b)=>a.sort-b.sort);
const out = [];
for (const c of cats) {
  const prods = SEED.products.filter(p => p.category_id === c.id && p.status === 'published').sort((a,b)=>a.sort-b.sort);
  const items = prods.map(p => {
    const vs = SEED.variants.filter(v => v.product_id === p.id && v.active && v.price_cents != null).sort((a,b)=>a.sort-b.sort);
    const media = SEED.media.filter(m => m.product_id === p.id).sort((a,b)=>a.sort-b.sort).map(m => ({ src: m.src, role: m.role, alt: m.alt, status: m.status }));
    const { internal_notes, id, category_id, ...rest } = p;
    return { ...rest, variants: vs.map(v => ({ sku: v.sku, size: v.size, h: v.height_cm, eur: v.price_cents / 100, availability: v.availability })), media };
  }).filter(p => p.variants.length);
  out.push({ slug: c.slug, name: c.name, kind: c.kind, description: c.description, items });
}
fs.writeFileSync('/home/claude/catalogo/data.json', JSON.stringify(out, null, 1));
for (const c of out) { console.log('##', c.name, '-', c.description); for (const p of c.items) console.log('  ', p.slug, '|', p.name, '|', p.variants.length, 'var |', [...new Set(p.variants.map(v=>v.h))].join('/'), 'cm |', p.media.map(m=>m.role+':'+m.src.split('/').pop()).join(', ')); }
console.log(Object.keys(SEED.products[0]));
