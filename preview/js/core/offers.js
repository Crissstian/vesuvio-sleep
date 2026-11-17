// Offerte abbinate (bundle): il calcolo dello sconto.
//
// Questo file e la funzione SQL public.price_cart applicano LE STESSE regole, nello stesso
// ordine, con la stessa aritmetica intera: un test lo verifica su centinaia di carrelli.
// Il database è l'autorità (è lui a creare la richiesta); qui si calcola per mostrare
// l'anteprima e per la preview che gira senza database.
//
// Regole (docs/OFFERTE.md, §3):
//  1. letto completo: un materasso con famiglia + una rete della stessa misura.
//     Si abbinano prima i materassi più cari, ciascuno alla rete più cara libera della sua misura;
//  2. percentuale del letto = max(percentuale di famiglia, scaglione per numero di letti);
//  3. accessori: un topper per letto completo della stessa misura; guanciali fino a N per
//     materasso, anche senza rete (i guanciali si comprano più spesso della rete);
//  4. per due: due materassi uguali rimasti senza rete;
//  5. coppia di guanciali: due guanciali uguali rimasti fuori dalle regole precedenti;
//  6. tetto: lo sconto totale non supera cap_pct del totale a listino;
//  7. lo sconto di ogni offerta si divide sui pezzi in proporzione al prezzo (resto maggiore):
//     è la base dei rimborsi in caso di recesso parziale.
// Solo numeri interi (centesimi e percentuali intere): niente virgola mobile, niente sorprese.
/** Tetto usato se la regola "tetto" manca o è in pausa: lo sconto non resta mai senza limite. */
export const DEFAULT_CAP_PCT = 15;
export const MAX_RULE_PCT = 30;
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : d);
const clampPct = (v) => Math.min(MAX_RULE_PCT, Math.max(0, num(v)));
const famPct = (o) => {
    const x = (o ?? {});
    return { foam: clampPct(x.foam), pocket: clampPct(x.pocket) };
};
export function isRuleLive(r, now) {
    if (r.status !== 'active')
        return false;
    if (r.starts_at && new Date(r.starts_at) > now)
        return false;
    if (r.ends_at && new Date(r.ends_at) <= now)
        return false;
    return true;
}
/** Dalle regole salvate alla configurazione di calcolo. Con le offerte spente: null. */
export function offerConfig(rules, enabled, now = new Date()) {
    if (!enabled || !rules?.length)
        return null;
    const live = new Map(rules.filter((r) => isRuleLive(r, now)).map((r) => [r.code, r]));
    const p = (code) => (live.get(code)?.params ?? null);
    const set = p('letto-completo');
    const tiers = p('letti-multipli');
    const addon = p('accessori');
    const pair = p('per-due');
    const pillowPair = p('coppia-guanciali');
    const cap = p('tetto');
    const labels = {};
    for (const r of rules)
        labels[r.code] = r.label;
    return {
        set: set ? { pct: famPct(set.pct), round_eur: Math.max(1, num(set.round_eur, 5)) } : null,
        tiers: tiers && Array.isArray(tiers.tiers)
            ? tiers.tiers.map((t) => ({ min_sets: Math.max(2, num(t.min_sets)), pct: clampPct(t.pct) })).sort((a, b) => a.min_sets - b.min_sets)
            : [],
        addon: addon
            ? {
                pct: { topper: clampPct(addon.pct?.topper), guanciale: clampPct(addon.pct?.guanciale) },
                guanciali_per_materasso: Math.max(0, num(addon.guanciali_per_materasso, 2)),
                round_eur: Math.max(1, num(addon.round_eur, 1)),
                consigliati: Array.isArray(addon.consigliati) ? addon.consigliati.filter((x) => typeof x === 'string') : [],
            }
            : null,
        pair: pair ? { pct: famPct(pair.pct), round_eur: Math.max(1, num(pair.round_eur, 5)) } : null,
        pillowPair: pillowPair ? { pct: clampPct(pillowPair.pct), round_eur: Math.max(1, num(pillowPair.round_eur, 1)) } : null,
        cap_pct: cap ? clampPct(cap.pct) : DEFAULT_CAP_PCT,
        labels,
    };
}
/** Configurazione dal catalogo in pagina. */
export function catalogOfferConfig(idx, now = new Date()) {
    return offerConfig(idx.snap.offers, idx.snap.offers_enabled, now);
}
// ------------------------------------------------------------------ aritmetica
/** round(n / d) per n ≥ 0, d > 0, con le metà verso l'alto (uguale a SQL). */
export function roundDiv(n, d) {
    return Math.floor((2 * n + d) / (2 * d));
}
/** cents × pct %, arrotondato al multiplo di step euro più vicino. */
export function pctRounded(cents, pct, stepEur) {
    const step = stepEur * 100;
    return roundDiv(cents * pct, 100 * step) * step;
}
/** Ripartisce amount su weights (proporzionale, resto maggiore, parità all'indice più basso). */
export function spread(amount, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0)
        return weights.map((_, i) => (i === 0 ? amount : 0));
    const base = weights.map((w) => Math.floor((amount * w) / total));
    const rem = weights.map((w, i) => amount * w - base[i] * total);
    let left = amount - base.reduce((a, b) => a + b, 0);
    const order = weights.map((_, i) => i).sort((a, b) => rem[b] - rem[a] || a - b);
    for (const i of order) {
        if (left <= 0)
            break;
        base[i]++;
        left--;
    }
    return base;
}
const DEFAULT_LABELS = {
    'letto-completo': 'Vantaggio letto completo',
    'letti-multipli': 'Vantaggio più letti',
    accessori: 'Vantaggio accessori',
    'per-due': 'Vantaggio per due',
    'coppia-guanciali': 'Vantaggio coppia di guanciali',
};
/**
 * Sconto di un carrello. `lines` sono righe GIÀ VALIDE (variante acquistabile, prezzo attuale).
 * Con cfg null le offerte sono spente: totale = somma dei prezzi.
 */
export function priceCart(idx, lines, cfg) {
    const units = [];
    lines.forEach((l, line) => {
        const v = idx.variants.get(l.variant_id);
        const p = v ? idx.products.get(v.product_id) : undefined;
        if (!v || !p || v.price_cents == null)
            return;
        for (let k = 0; k < l.qty; k++) {
            units.push({ i: units.length, line, kind: idx.kind(p), family: p.bundle_family ?? null, size: v.size, variant_id: v.id, price: v.price_cents, used: false, disc: 0 });
        }
    });
    const subtotal = units.reduce((a, u) => a + u.price, 0);
    const raw = [];
    let sets = 0;
    if (cfg) {
        const byPrice = (a, b) => b.price - a.price || a.i - b.i;
        // 1. letti completi
        const mats = units.filter((u) => u.kind === 'materasso' && u.family).sort(byPrice);
        const reti = units.filter((u) => u.kind === 'rete').sort(byPrice);
        const pairs = [];
        for (const m of mats) {
            const r = reti.find((x) => !x.used && x.size === m.size);
            if (!r)
                continue;
            m.used = r.used = true;
            pairs.push([m, r]);
        }
        sets = pairs.length;
        const tier = cfg.tiers.filter((t) => sets >= t.min_sets).reduce((a, t) => Math.max(a, t.pct), 0);
        for (const [m, r] of pairs) {
            const base = cfg.set ? cfg.set.pct[m.family] : 0;
            const pct = Math.max(base, tier);
            if (pct <= 0)
                continue;
            const step = cfg.set?.round_eur ?? 5;
            raw.push({ code: tier > base ? 'letti-multipli' : 'letto-completo', pct, size: m.size, amount: pctRounded(m.price + r.price, pct, step), units: [m, r] });
        }
        // 2. accessori: un topper per letto completo della stessa misura; guanciali fino a N per
        //    materasso, con o senza rete
        if (cfg.addon) {
            const a = cfg.addon;
            const perSize = new Map();
            for (const [m] of pairs)
                perSize.set(m.size, (perSize.get(m.size) ?? 0) + 1);
            for (const u of units.filter((x) => x.kind === 'topper').sort(byPrice)) {
                const left = perSize.get(u.size) ?? 0;
                if (left <= 0 || a.pct.topper <= 0)
                    continue;
                perSize.set(u.size, left - 1);
                u.used = true;
                raw.push({ code: 'accessori', pct: a.pct.topper, size: u.size, amount: pctRounded(u.price, a.pct.topper, a.round_eur), units: [u] });
            }
            let pillows = units.filter((x) => x.kind === 'materasso' && x.family).length * a.guanciali_per_materasso;
            for (const u of units.filter((x) => x.kind === 'guanciale').sort(byPrice)) {
                if (pillows <= 0 || a.pct.guanciale <= 0)
                    break;
                pillows--;
                u.used = true;
                raw.push({ code: 'accessori', pct: a.pct.guanciale, size: null, amount: pctRounded(u.price, a.pct.guanciale, a.round_eur), units: [u] });
            }
        }
        // 3. per due: materassi uguali senza rete, a coppie, nell'ordine del carrello
        if (cfg.pair) {
            const groups = new Map();
            for (const u of units) {
                if (u.kind !== 'materasso' || !u.family || u.used)
                    continue;
                const g = groups.get(u.variant_id) ?? [];
                g.push(u);
                groups.set(u.variant_id, g);
            }
            for (const g of groups.values()) {
                for (let k = 0; k + 1 < g.length; k += 2) {
                    const pct = cfg.pair.pct[g[k].family];
                    if (pct <= 0)
                        continue;
                    g[k].used = g[k + 1].used = true;
                    raw.push({ code: 'per-due', pct, size: g[k].size, amount: pctRounded(g[k].price + g[k + 1].price, pct, cfg.pair.round_eur), units: [g[k], g[k + 1]] });
                }
            }
        }
        // 4. coppia di guanciali: guanciali uguali rimasti liberi, a coppie, nell'ordine del carrello
        if (cfg.pillowPair && cfg.pillowPair.pct > 0) {
            const pp = cfg.pillowPair;
            const groups = new Map();
            for (const u of units) {
                if (u.kind !== 'guanciale' || u.used)
                    continue;
                const g = groups.get(u.variant_id) ?? [];
                g.push(u);
                groups.set(u.variant_id, g);
            }
            for (const g of groups.values()) {
                for (let k = 0; k + 1 < g.length; k += 2) {
                    g[k].used = g[k + 1].used = true;
                    raw.push({ code: 'coppia-guanciali', pct: pp.pct, size: null, amount: pctRounded(g[k].price + g[k + 1].price, pp.pct, pp.round_eur), units: [g[k], g[k + 1]] });
                }
            }
        }
        // 5. tetto
        let discount = raw.reduce((a, o) => a + o.amount, 0);
        const cap = Math.floor((subtotal * cfg.cap_pct) / 100);
        if (discount > cap) {
            for (const o of raw)
                o.amount = Math.floor((o.amount * cap) / discount);
        }
        // 6. ripartizione sui pezzi
        for (const o of raw) {
            const parts = spread(o.amount, o.units.map((u) => u.price));
            o.units.forEach((u, k) => (u.disc += parts[k]));
        }
    }
    const line_discounts = lines.map(() => 0);
    for (const u of units)
        line_discounts[u.line] += u.disc;
    const discount = line_discounts.reduce((a, b) => a + b, 0);
    return {
        subtotal_cents: subtotal,
        discount_cents: discount,
        total_cents: subtotal - discount,
        line_discounts,
        offers: summarize(raw.filter((o) => o.amount > 0), cfg?.labels ?? {}),
        sets,
    };
}
/** Offerte raggruppate per tipo, percentuale e misura: è quello che si mostra e si salva. */
function summarize(raw, labels) {
    const out = [];
    for (const o of raw) {
        const hit = out.find((x) => x.code === o.code && x.pct === o.pct && x.size === o.size);
        if (hit) {
            hit.amount_cents += o.amount;
            hit.count++;
        }
        else {
            out.push({ code: o.code, label: labels[o.code] || DEFAULT_LABELS[o.code], pct: o.pct, size: o.size, amount_cents: o.amount, count: 1 });
        }
    }
    return out;
}
/**
 * Che cosa conviene aggiungere: per ogni materasso senza rete, la rete della sua misura;
 * per ogni letto completo senza topper, il topper della stessa misura. Il risparmio non è
 * stimato: si ricalcola il carrello con il pezzo aggiunto e si guarda la differenza.
 */
export function offerHints(idx, lines, cfg, max = 3) {
    if (!cfg)
        return [];
    const now = priceCart(idx, lines, cfg);
    const out = [];
    const inCart = new Set(lines.map((l) => l.variant_id));
    const seen = new Set();
    const kindsInCart = (k) => lines.flatMap((l) => {
        const v = idx.variants.get(l.variant_id);
        const p = v && idx.products.get(v.product_id);
        return v && p && idx.kind(p) === k ? Array(l.qty).fill(v) : [];
    });
    const mats = kindsInCart('materasso').filter((v) => idx.products.get(v.product_id)?.bundle_family);
    const reti = kindsInCart('rete');
    const toppers = kindsInCart('topper');
    const trial = (v, qty = 1) => priceCart(idx, [...lines, { variant_id: v.id, qty }], cfg).discount_cents - now.discount_cents;
    // guanciali per primi: due per materasso, i consigliati nell'ordine scelto dall'admin
    const pillows = kindsInCart('guanciale');
    if (cfg.addon && cfg.addon.pct.guanciale > 0 && mats.length && pillows.length < mats.length * cfg.addon.guanciali_per_materasso) {
        const pub = idx.publicProducts('guanciale');
        const order = cfg.addon.consigliati.map((slug) => pub.find((p) => p.slug === slug)).filter(Boolean);
        for (const p of [...order, ...pub.filter((x) => !order.includes(x))].slice(0, 2)) {
            const v = idx.purchasableVariants(p)[0];
            if (!v || inCart.has(v.id))
                continue;
            const save = trial(v, 2);
            if (save > 0)
                out.push({ type: 'add_guanciali', product: p, variant: v, size: null, qty: 2, save_cents: save });
        }
    }
    // materassi senza rete della loro misura
    const retiLeft = reti.map((r) => r.size);
    for (const m of mats) {
        const k = retiLeft.indexOf(m.size);
        if (k >= 0) {
            retiLeft.splice(k, 1);
            continue;
        }
        if (!m.size || seen.has('r' + m.size))
            continue;
        seen.add('r' + m.size);
        const cands = idx.publicProducts('rete').map((p) => ({ p, v: idx.cheapestAtSize(p, m.size) })).filter((x) => x.v);
        const best = cands.sort((a, b) => a.v.price_cents - b.v.price_cents)[0];
        if (!best)
            continue;
        const save = trial(best.v);
        if (save > 0)
            out.push({ type: 'add_rete', product: best.p, variant: best.v, size: m.size, qty: 1, save_cents: save });
    }
    // letti completi senza topper della stessa misura
    if (now.sets > 0 && cfg.addon && cfg.addon.pct.topper > 0) {
        const setSizes = mats.filter((m) => reti.some((r) => r.size === m.size)).map((m) => m.size);
        for (const size of [...new Set(setSizes)]) {
            if (toppers.some((t) => t.size === size) || seen.has('t' + size))
                continue;
            seen.add('t' + size);
            for (const p of idx.publicProducts('topper')) {
                const v = idx.cheapestAtSize(p, size);
                if (!v || inCart.has(v.id))
                    continue;
                const save = trial(v);
                if (save > 0)
                    out.push({ type: 'add_topper', product: p, variant: v, size, qty: 1, save_cents: save });
                break;
            }
        }
    }
    return out.slice(0, max);
}
export function bundleItemsOf(idx, b) {
    return (idx.snap.bundle_items ?? []).filter((i) => i.bundle_id === b.id).sort((a, x) => a.sort - x.sort);
}
/** Il materasso dell'offerta (decide altezze e famiglia). */
export function bundleMattress(idx, b) {
    const it = bundleItemsOf(idx, b).find((i) => {
        const p = idx.products.get(i.product_id);
        return p && idx.kind(p) === 'materasso';
    });
    return it ? idx.products.get(it.product_id) : undefined;
}
/** Variante di un pezzo nella misura scelta: per il materasso l'altezza chiesta, altrimenti la più economica. */
function pickVariant(idx, p, size, height, preferred) {
    const kind = idx.kind(p);
    const vs = idx.purchasableVariants(p).filter((v) => (kind === 'guanciale' ? true : v.size === size));
    if (kind === 'materasso') {
        const want = height ?? preferred;
        const exact = want != null ? vs.find((v) => v.height_cm === want) : undefined;
        if (exact)
            return exact;
        if (height != null)
            return undefined;
        return vs.sort((a, b) => (a.height_cm ?? 0) - (b.height_cm ?? 0))[0];
    }
    return vs.sort((a, b) => a.price_cents - b.price_cents)[0];
}
/** Composizione e prezzo di un'offerta in una misura, con i facoltativi scelti. */
export function quoteBundle(idx, b, size, opts = {}, cfg = catalogOfferConfig(idx)) {
    const lines = bundleItemsOf(idx, b).flatMap((item) => {
        const product = idx.products.get(item.product_id);
        if (!product)
            return [];
        const included = !item.optional || !!opts.optional?.has(item.product_id);
        const variant = pickVariant(idx, product, size, opts.height ?? null, item.height_cm);
        return [{ item, product, kind: idx.kind(product), variant, included }];
    });
    const inc = lines.filter((l) => l.included);
    // una vetrina è almeno due pezzi: se un pezzo obbligatorio manca dal catalogo (per esempio
    // un guanciale non ancora in vendita) la vetrina non si mostra, invece di diventare un pezzo solo
    const required = bundleItemsOf(idx, b).filter((i) => !i.optional);
    const reqOk = required.length >= 2 && required.every((i) => lines.some((l) => l.item.id === i.id));
    // un pezzo facoltativo non in vendita semplicemente non si propone
    const shown = lines.filter((l) => !l.item.optional || (l.variant && idx.isProductPurchasable(l.product)));
    lines.splice(0, lines.length, ...shown);
    const available = reqOk && inc.length > 0 && inc.every((l) => l.variant && idx.isProductPurchasable(l.product));
    const price = priceCart(idx, available ? inc.map((l) => ({ variant_id: l.variant.id, qty: l.item.qty })) : [], cfg);
    const mat = lines.find((l) => l.kind === 'materasso');
    return { size, height: mat?.variant?.height_cm ?? null, lines, available, price };
}
/** Misure in cui l'offerta si può comprare (pezzi obbligatori acquistabili), nell'ordine del listino. */
export function bundleSizes(idx, b) {
    const mat = bundleMattress(idx, b);
    const all = mat ? idx.purchasableSizes(mat) : [];
    const allowed = b.sizes?.length ? all.filter((s) => b.sizes.includes(s)) : all;
    return allowed.filter((s) => quoteBundle(idx, b, s, {}, null).available);
}
/** Offerte da mostrare: pubblicate, con almeno una misura acquistabile. */
export function publicBundles(idx) {
    return (idx.snap.bundles ?? [])
        .filter((b) => b.status === 'published')
        .filter((b) => bundleSizes(idx, b).length > 0)
        .sort((a, b) => a.sort - b.sort);
}
/** Prezzo "da": la misura in cui l'offerta (solo pezzi obbligatori) costa meno. */
export function bundleFrom(idx, b, cfg = catalogOfferConfig(idx)) {
    let best = null;
    for (const s of bundleSizes(idx, b)) {
        const q = quoteBundle(idx, b, s, {}, cfg);
        if (!best || q.price.total_cents < best.price.total_cents)
            best = q;
    }
    return best;
}
/** Recesso parziale: quanto rimborsare restituendo `qty` pezzi di una riga già salvata. */
export function refundForLine(line, qty) {
    const q = Math.max(0, Math.min(line.qty, Math.trunc(qty)));
    const shares = spread(line.discount_cents ?? 0, Array(line.qty).fill(1));
    let disc = 0;
    for (let k = 0; k < q; k++)
        disc += shares[k];
    return q * line.unit_cents - disc;
}
