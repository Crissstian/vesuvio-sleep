/* Generato da scripts/bundle.py: non modificare a mano. */
(function () {
'use strict';
const __defs = {}, __cache = {};
function __def(n, f) { __defs[n] = f; }
function __req(n) { if (!__cache[n]) { __cache[n] = {}; __defs[n](__cache[n]); } return __cache[n]; }
__def("core/types.js", function (__exp) {
// Tipi di dominio condivisi tra preview statica e futura app Next.js.
// Rispecchiano le tabelle in supabase/migrations.



});
__def("core/catalog.js", function (__exp) {
/** Le 13 misure del listino confermato (15/11/2026), dal singolo 80×190 alla King Size 180×200. */
const STANDARD_SIZES = ['80x190', '80x200', '90x190', '90x200', '120x190', '120x200', '140x190', '140x200', '160x190', '160x200', '165x190', '170x200', '180x200'];
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
function formatCents(cents) {
    return eur.format(cents / 100);
}
/** "1.234,50" / "220" / "220.5" -> centesimi; null se non valido. */
function parseEuroToCents(input) {
    const s = String(input).trim().replace(/\s|€/g, '');
    if (!s)
        return null;
    const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    if (!/^\d+(\.\d{1,2})?$/.test(norm))
        return null;
    return Math.round(parseFloat(norm) * 100);
}
function formatSize(size) {
    return size ? size.replace('x', '×') : '';
}
function parseSize(size) {
    const m = /^(\d{2,3})x(\d{3})$/.exec(size);
    return m ? { w: Number(m[1]), l: Number(m[2]) } : null;
}
// --- SKU (Master Spec §13) ---
function mattressSku(line, height, size) {
    return `VS-${line}-H${height}-${size.replace('x', '')}`;
}
function baseSku(line, size) {
    return `VS-RETE-${line}-${size.replace('x', '')}`;
}
function pillowSku(line) {
    return `VS-GUA-${line}`;
}
/** Codice articolo dei topper. */
function topperSku(line, size) {
    return `VS-TOP-${line}-${size.replace('x', '')}`;
}
function customSku(date, id) {
    const d = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `VS-CUSTOM-${d}-${id}`;
}
function skuFor(kind, line, size, height) {
    if (kind === 'materasso' && size && height)
        return mattressSku(line, height, size);
    if (kind === 'rete' && size)
        return baseSku(line, size);
    if (kind === 'topper' && size)
        return topperSku(line, size);
    if (kind === 'guanciale')
        return pillowSku(line);
    return `VS-${line}${size ? '-' + size.replace('x', '') : ''}${height ? '-H' + height : ''}`;
}
const AVAILABILITY_LABEL = {
    available: 'Disponibile',
    in_production: 'In produzione',
    made_to_order: 'Realizzato su ordinazione',
    unavailable: 'Non acquistabile online',
};
// --- Regole di acquistabilità ---
function isVariantPurchasable(v, p, c) {
    return (v.active &&
        v.price_cents !== null &&
        v.price_cents > 0 &&
        v.availability !== 'unavailable' &&
        p.status === 'published' &&
        !!c &&
        c.status === 'published');
}
class CatalogIndex {
    constructor(snap) {
        this.snap = snap;
        this.byProduct = new Map();
        this.products = new Map();
        this.categories = new Map();
        this.variants = new Map();
        for (const c of snap.categories)
            this.categories.set(c.id, c);
        for (const p of snap.products)
            this.products.set(p.id, p);
        for (const v of snap.variants) {
            this.variants.set(v.id, v);
            const arr = this.byProduct.get(v.product_id) ?? [];
            arr.push(v);
            this.byProduct.set(v.product_id, arr);
        }
        for (const arr of this.byProduct.values())
            arr.sort((a, b) => a.sort - b.sort);
    }
    category(p) {
        return this.categories.get(p.category_id);
    }
    kind(p) {
        return this.category(p)?.kind;
    }
    variantsOf(p, onlyActive = true) {
        const all = this.byProduct.get(p.id) ?? [];
        return onlyActive ? all.filter((v) => v.active) : all;
    }
    purchasableVariants(p) {
        const c = this.category(p);
        return this.variantsOf(p).filter((v) => isVariantPurchasable(v, p, c));
    }
    isProductPurchasable(p) {
        return this.purchasableVariants(p).length > 0;
    }
    minPrice(p) {
        const prices = this.purchasableVariants(p).map((v) => v.price_cents);
        return prices.length ? Math.min(...prices) : null;
    }
    maxPrice(p) {
        const prices = this.purchasableVariants(p).map((v) => v.price_cents);
        return prices.length ? Math.max(...prices) : null;
    }
    /** Prodotti pubblici: pubblicati, in categoria pubblicata, con almeno una variante acquistabile. */
    publicProducts(kind) {
        return this.snap.products
            .filter((p) => p.status === 'published' && this.category(p)?.status === 'published')
            .filter((p) => !kind || this.kind(p) === kind)
            .filter((p) => this.isProductPurchasable(p))
            .sort((a, b) => a.sort - b.sort);
    }
    /** Categorie da mostrare nel menu commerciale: solo con articoli acquistabili. */
    commercialCategories() {
        return this.snap.categories
            .filter((c) => c.status === 'published')
            .filter((c) => this.publicProducts(c.kind).length > 0)
            .sort((a, b) => a.sort - b.sort);
    }
    sizesOf(p) {
        const s = new Set();
        for (const v of this.variantsOf(p))
            if (v.size)
                s.add(v.size);
        return STANDARD_SIZES.filter((x) => s.has(x)).concat([...s].filter((x) => !STANDARD_SIZES.includes(x)));
    }
    heightsOf(p) {
        const s = new Set();
        for (const v of this.variantsOf(p))
            if (v.height_cm)
                s.add(v.height_cm);
        return [...s].sort((a, b) => a - b);
    }
    findVariant(p, size, height) {
        return this.variantsOf(p).find((v) => (v.size ?? null) === (size ?? null) && (v.height_cm ?? null) === (height ?? null));
    }
    /** Misure vendibili, nell'ordine del listino: sul sito pubblico si mostrano solo queste. */
    purchasableSizes(p) {
        const s = new Set();
        for (const v of this.purchasableVariants(p))
            if (v.size)
                s.add(v.size);
        return STANDARD_SIZES.filter((x) => s.has(x)).concat([...s].filter((x) => !STANDARD_SIZES.includes(x)));
    }
    purchasableHeights(p) {
        const s = new Set();
        for (const v of this.purchasableVariants(p))
            if (v.height_cm)
                s.add(v.height_cm);
        return [...s].sort((a, b) => a - b);
    }
    /** Variante acquistabile più economica per una misura (es. abbinamenti). */
    cheapestAtSize(p, size) {
        return this.purchasableVariants(p)
            .filter((v) => (size ? v.size === size : true))
            .sort((a, b) => a.price_cents - b.price_cents)[0];
    }
}

__exp.STANDARD_SIZES = STANDARD_SIZES;
__exp.formatCents = formatCents;
__exp.parseEuroToCents = parseEuroToCents;
__exp.formatSize = formatSize;
__exp.parseSize = parseSize;
__exp.mattressSku = mattressSku;
__exp.baseSku = baseSku;
__exp.pillowSku = pillowSku;
__exp.topperSku = topperSku;
__exp.customSku = customSku;
__exp.skuFor = skuFor;
__exp.AVAILABILITY_LABEL = AVAILABILITY_LABEL;
__exp.isVariantPurchasable = isVariantPurchasable;
__exp.CatalogIndex = CatalogIndex;
});
__def("core/pairings.js", function (__exp) {
/** Regole del prompt: mai un altro materasso come complemento di un materasso. */
const PAIRING_RULES = {
    materasso: ['rete', 'guanciale', 'topper'],
    rete: ['materasso'],
    guanciale: ['materasso', 'topper'],
    topper: ['materasso', 'guanciale'],
    letto: [],
};
const SIZED = ['materasso', 'rete', 'topper'];
function pairingsFor(idx, product, selectedSize, excludeVariantIds = []) {
    const kind = idx.kind(product);
    if (!kind)
        return [];
    const groups = [];
    const seen = new Set([product.id]);
    for (const target of PAIRING_RULES[kind]) {
        const items = [];
        for (const p of idx.publicProducts(target)) {
            if (seen.has(p.id))
                continue;
            let variant;
            if (SIZED.includes(target) && SIZED.includes(kind) && selectedSize) {
                // compatibilità dimensionale: solo la stessa misura, altrimenti si salta
                variant = idx.cheapestAtSize(p, selectedSize);
                if (!variant)
                    continue;
            }
            else if (!SIZED.includes(target)) {
                const vs = idx.purchasableVariants(p);
                variant = vs.length === 1 ? vs[0] : undefined;
            }
            if (variant && excludeVariantIds.includes(variant.id))
                continue;
            const fromPrice = variant ? variant.price_cents : idx.minPrice(p);
            seen.add(p.id);
            items.push({ product: p, variant, fromPrice });
        }
        if (items.length)
            groups.push({ kind: target, items });
    }
    return groups;
}

__exp.PAIRING_RULES = PAIRING_RULES;
__exp.pairingsFor = pairingsFor;
});
__def("core/sleepMatch.js", function (__exp) {
const W = { lt60: 0, '60-85': 1, '85-110': 2, gt110: 3 };
/**
 * Restituisce UN solo materasso reale e acquistabile. Nessun budget, nessuna diagnosi.
 * Le motivazioni citano solo caratteristiche documentate del prodotto.
 */
function sleepMatch(idx, a) {
    const candidates = idx.publicProducts('materasso').filter((p) => p.match);
    if (!candidates.length)
        return null;
    const sleepers = [a.me, ...(a.sleepers === 'couple' && a.partner ? [a.partner] : [])];
    const maxW = Math.max(...sleepers.map((s) => W[s.weight]));
    const feels = sleepers.map((s) => s.feel);
    const wantsWelcome = feels.includes('accogliente') && !feels.includes('sostenuto');
    const wantsSupport = feels.includes('sostenuto') && !feels.includes('accogliente');
    const mixedFeel = feels.includes('accogliente') && feels.includes('sostenuto');
    let best = null;
    for (const p of candidates) {
        const t = p.match;
        let s = 0;
        const r = [];
        const add = (pts, reason) => {
            s += pts;
            if (reason && pts > 0)
                r.push([pts, reason]);
        };
        if (t.independent_springs) {
            if (maxW >= 2)
                add(3, 'Le molle indipendenti insacchettate offrono un sostegno pensato anche per corporature più robuste.');
            if (a.sleepers === 'couple' && a.partnerMotion === 'importante')
                add(4, 'Le molle insacchettate lavorano in modo indipendente: aiuta a percepire meno i movimenti di chi dorme accanto.');
            else if (a.sleepers === 'couple')
                add(1);
            if (wantsSupport)
                add(2, 'Ha una risposta sostenuta, come preferisci.');
            if (mixedFeel)
                add(1);
        }
        if (t.tech === 'memory') {
            if (wantsWelcome)
                add(3, 'Lo strato in Memory Foam rende il piano più accogliente, come preferisci.');
            if (a.position === 'fianco' || a.focus === 'spalle')
                add(2, 'Chi dorme sul fianco di solito apprezza un piano accogliente in corrispondenza delle spalle.');
        }
        if (t.ventilation) {
            if (a.heat === 'spesso')
                add(4, 'La fascia perimetrale 3D traspirante favorisce il ricambio d\'aria lungo i lati.');
            if (a.heat === 'a-volte')
                add(2, 'La fascia perimetrale 3D traspirante aiuta il ricambio d\'aria.');
        }
        if (p.summer_winter && a.heat !== 'raramente')
            add(1, 'È reversibile, con un lato invernale e uno estivo.');
        if (t.tech === 'foam') {
            if (!wantsWelcome && maxW <= 1)
                add(2, 'L\'anima monoblocco in poliuretano ad alta densità dà un sostegno uniforme.');
            if (a.focus === 'schiena' && maxW <= 1)
                add(1);
            if (a.position === 'pancia')
                add(1);
        }
        if (a.position === 'pancia' && t.welcome <= 1)
            add(1);
        if (a.focus === 'schiena' && t.welcome <= 1 && maxW >= 2)
            add(1);
        if (a.tech !== 'non-so' && a.tech === t.tech)
            add(2, 'Corrisponde alla tecnologia che preferisci.');
        if (a.removable) {
            if (p.removable_cover)
                add(1, 'Ha il rivestimento sfoderabile.');
            else
                add(-6);
        }
        // a parità di punteggio vince l'ordine di catalogo (candidates è già ordinato)
        if (!best || s > best.s)
            best = { p, s, r };
    }
    if (!best)
        return null;
    const reasons = best.r.sort((x, y) => y[0] - x[0]).map((x) => x[1]);
    const uniq = [...new Set(reasons)].slice(0, 3);
    if (uniq.length < 2 && best.p.composition)
        uniq.push(best.p.composition);
    const heights = idx.purchasableHeights(best.p);
    let height = null;
    let heightReason = null;
    if (heights.length) {
        const max = heights[heights.length - 1];
        if ((maxW >= 2 || a.sleepers === 'couple') && heights.length > 1) {
            height = max;
            heightReason = `Ti proponiamo H${max}, la più alta disponibile per questo modello: è la scelta che suggeriamo per ${a.sleepers === 'couple' ? 'chi dorme in due' : 'corporature più robuste'}.`;
        }
        else {
            height = heights.includes(25) ? 25 : heights[0];
            heightReason = heights.length > 1 ? `H${height} è un buon punto di partenza; nella scheda puoi scegliere le altre altezze.` : null;
        }
        if (heights.length === 1) {
            heightReason = `Online è disponibile in H${height}; per altre altezze puoi chiedere un preventivo.`;
        }
    }
    return { product: best.p, height, reasons: uniq.slice(0, 3), heightReason };
}

__exp.sleepMatch = sleepMatch;
});
__def("core/whatsapp.js", function (__exp) {
const {formatCents, formatSize} = __req("core/catalog.js");
/** Oltre questa lunghezza di URL alcuni client troncano: si passa al messaggio breve. */
const WA_MAX_URL = 1900;
/** Accetta solo numeri in formato internazionale (prefisso paese obbligatorio), senza indovinarlo. */
function normalizeWhatsAppNumber(raw) {
    if (!raw || !String(raw).trim())
        return { ok: false, reason: 'Numero non configurato.' };
    let s = String(raw).trim().replace(/[\s().-]/g, '');
    if (s.startsWith('+'))
        s = s.slice(1);
    else if (s.startsWith('00'))
        s = s.slice(2);
    else
        return { ok: false, reason: 'Inserisci il numero con il prefisso internazionale, per esempio +39…' };
    if (!/^\d{8,15}$/.test(s))
        return { ok: false, reason: 'Il numero deve contenere da 8 a 15 cifre dopo il prefisso.' };
    if (s.startsWith('0'))
        return { ok: false, reason: 'Il prefisso internazionale non può iniziare con 0.' };
    return { ok: true, digits: s };
}
function lineText(l, i) {
    const spec = [l.size ? formatSize(l.size) : null, l.height_cm ? `H${l.height_cm}` : null].filter(Boolean).join(', ');
    return `${i + 1}) ${l.name}${spec ? ' – ' + spec : ''}\n   SKU ${l.sku} · ${l.qty} × ${formatCents(l.unit_cents)} = ${formatCents(l.unit_cents * l.qty)}`;
}
/** "Vantaggio letto completo 160×190: −25,00 €" (× 3 se si applica più volte). */
function offerText(o) {
    const where = o.size ? ` ${formatSize(o.size)}` : '';
    const times = o.count > 1 ? ` (× ${o.count})` : '';
    return `${o.label}${where}${times}: −${formatCents(o.amount_cents)}`;
}
/** Riepilogo completo: è anche il testo del pulsante "Copia il riepilogo". Nessun dato personale. */
function buildFullMessage(s) {
    const disc = s.discount_cents ?? 0;
    return [
        'Ciao Vesuvio Sleep, vorrei confermare questa richiesta dal sito.',
        `Riferimento: ${s.ref}`,
        '',
        ...s.lines.map(lineText),
        '',
        ...(disc > 0
            ? [`Subtotale: ${formatCents(s.subtotal_cents ?? s.total_cents + disc)}`, ...(s.offers ?? []).map(offerText)]
            : []),
        `Totale: ${formatCents(s.total_cents)} (IVA inclusa)`,
        ...(s.shipping_note ? [`Spedizione: ${s.shipping_note}`] : []),
        ...(s.payment ? [`Pagamento: ${s.payment}`] : []),
        '',
        'Attendo la vostra conferma su disponibilità e consegna.',
    ].join('\n');
}
function buildShortMessage(s) {
    const n = s.lines.reduce((a, l) => a + l.qty, 0);
    return [
        'Ciao Vesuvio Sleep, vorrei confermare una richiesta dal sito.',
        `Riferimento: ${s.ref}`,
        `${n} articoli, totale ${formatCents(s.total_cents)} (IVA inclusa${(s.discount_cents ?? 0) > 0 ? `, vantaggio di ${formatCents(s.discount_cents)} già applicato` : ''}).`,
        ...(s.payment ? [`Pagamento: ${s.payment}`] : []),
        'Incollo qui sotto il riepilogo completo copiato dal sito.',
    ].join('\n');
}
function waLink(digits, text) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
function planWhatsApp(rawNumber, s) {
    const full = buildFullMessage(s);
    const num = normalizeWhatsAppNumber(rawNumber);
    if (!num.ok)
        return { url: null, text: full, short: false, fullText: full, numberError: num.reason };
    const fullUrl = waLink(num.digits, full);
    if (fullUrl.length <= WA_MAX_URL)
        return { url: fullUrl, text: full, short: false, fullText: full, numberError: null };
    const short = buildShortMessage(s);
    return { url: waLink(num.digits, short), text: short, short: true, fullText: full, numberError: null };
}
function buildQuoteMessage(q) {
    return [
        'Ciao Vesuvio Sleep, vorrei un preventivo per un fuori misura.',
        `Riferimento: ${q.ref}`,
        `Prodotto: ${q.product}`,
        `Misura: ${q.width_cm}×${q.length_cm} cm${q.height_cm ? `, altezza ${q.height_cm} cm` : ''}`,
        ...(q.notes.trim() ? [`Note: ${q.notes.trim()}`] : []),
    ].join('\n');
}
/** Riferimento leggibile e univoco: VS-R-20261112-7KQ4 (richiesta) o VS-Q-… (preventivo). */
function makeRef(prefix, date, rand = Math.random) {
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++)
        code += alphabet[Math.floor(rand() * alphabet.length)];
    const d = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `VS-${prefix}-${d}-${code}`;
}

__exp.WA_MAX_URL = WA_MAX_URL;
__exp.normalizeWhatsAppNumber = normalizeWhatsAppNumber;
__exp.offerText = offerText;
__exp.buildFullMessage = buildFullMessage;
__exp.buildShortMessage = buildShortMessage;
__exp.waLink = waLink;
__exp.planWhatsApp = planWhatsApp;
__exp.buildQuoteMessage = buildQuoteMessage;
__exp.makeRef = makeRef;
});
__def("core/offers.js", function (__exp) {
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
const DEFAULT_CAP_PCT = 15;
const MAX_RULE_PCT = 30;
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : d);
const clampPct = (v) => Math.min(MAX_RULE_PCT, Math.max(0, num(v)));
const famPct = (o) => {
    const x = (o ?? {});
    return { foam: clampPct(x.foam), pocket: clampPct(x.pocket) };
};
function isRuleLive(r, now) {
    if (r.status !== 'active')
        return false;
    if (r.starts_at && new Date(r.starts_at) > now)
        return false;
    if (r.ends_at && new Date(r.ends_at) <= now)
        return false;
    return true;
}
/** Dalle regole salvate alla configurazione di calcolo. Con le offerte spente: null. */
function offerConfig(rules, enabled, now = new Date()) {
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
function catalogOfferConfig(idx, now = new Date()) {
    return offerConfig(idx.snap.offers, idx.snap.offers_enabled, now);
}
// ------------------------------------------------------------------ aritmetica
/** round(n / d) per n ≥ 0, d > 0, con le metà verso l'alto (uguale a SQL). */
function roundDiv(n, d) {
    return Math.floor((2 * n + d) / (2 * d));
}
/** cents × pct %, arrotondato al multiplo di step euro più vicino. */
function pctRounded(cents, pct, stepEur) {
    const step = stepEur * 100;
    return roundDiv(cents * pct, 100 * step) * step;
}
/** Ripartisce amount su weights (proporzionale, resto maggiore, parità all'indice più basso). */
function spread(amount, weights) {
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
function priceCart(idx, lines, cfg) {
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
function offerHints(idx, lines, cfg, max = 3) {
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
function bundleItemsOf(idx, b) {
    return (idx.snap.bundle_items ?? []).filter((i) => i.bundle_id === b.id).sort((a, x) => a.sort - x.sort);
}
/** Il materasso dell'offerta (decide altezze e famiglia). */
function bundleMattress(idx, b) {
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
function quoteBundle(idx, b, size, opts = {}, cfg = catalogOfferConfig(idx)) {
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
function bundleSizes(idx, b) {
    const mat = bundleMattress(idx, b);
    const all = mat ? idx.purchasableSizes(mat) : [];
    const allowed = b.sizes?.length ? all.filter((s) => b.sizes.includes(s)) : all;
    return allowed.filter((s) => quoteBundle(idx, b, s, {}, null).available);
}
/** Offerte da mostrare: pubblicate, con almeno una misura acquistabile. */
function publicBundles(idx) {
    return (idx.snap.bundles ?? [])
        .filter((b) => b.status === 'published')
        .filter((b) => bundleSizes(idx, b).length > 0)
        .sort((a, b) => a.sort - b.sort);
}
/** Prezzo "da": la misura in cui l'offerta (solo pezzi obbligatori) costa meno. */
function bundleFrom(idx, b, cfg = catalogOfferConfig(idx)) {
    let best = null;
    for (const s of bundleSizes(idx, b)) {
        const q = quoteBundle(idx, b, s, {}, cfg);
        if (!best || q.price.total_cents < best.price.total_cents)
            best = q;
    }
    return best;
}
/** Recesso parziale: quanto rimborsare restituendo `qty` pezzi di una riga già salvata. */
function refundForLine(line, qty) {
    const q = Math.max(0, Math.min(line.qty, Math.trunc(qty)));
    const shares = spread(line.discount_cents ?? 0, Array(line.qty).fill(1));
    let disc = 0;
    for (let k = 0; k < q; k++)
        disc += shares[k];
    return q * line.unit_cents - disc;
}

__exp.DEFAULT_CAP_PCT = DEFAULT_CAP_PCT;
__exp.MAX_RULE_PCT = MAX_RULE_PCT;
__exp.isRuleLive = isRuleLive;
__exp.offerConfig = offerConfig;
__exp.catalogOfferConfig = catalogOfferConfig;
__exp.roundDiv = roundDiv;
__exp.pctRounded = pctRounded;
__exp.spread = spread;
__exp.priceCart = priceCart;
__exp.offerHints = offerHints;
__exp.bundleItemsOf = bundleItemsOf;
__exp.bundleMattress = bundleMattress;
__exp.quoteBundle = quoteBundle;
__exp.bundleSizes = bundleSizes;
__exp.publicBundles = publicBundles;
__exp.bundleFrom = bundleFrom;
__exp.refundForLine = refundForLine;
});
__def("core/cart.js", function (__exp) {
const {isVariantPurchasable} = __req("core/catalog.js");
const {priceCart} = __req("core/offers.js");
const MAX_QTY = 20;
/**
 * Ricontrolla prezzo, pubblicazione e disponibilità. In produzione la stessa
 * logica gira lato server (funzione SQL validate_cart / route handler).
 */
function validateCart(idx, items, cfg = null) {
    const lines = items.map((item) => {
        const variant = idx.variants.get(item.variant_id);
        const product = variant ? idx.products.get(variant.product_id) : undefined;
        if (!variant || !product)
            return { item, status: 'missing', unit_cents: null, discount_cents: 0, message: 'Questo articolo non è più nel catalogo.' };
        if (!isVariantPurchasable(variant, product, idx.category(product)))
            return { item, status: 'unavailable', product, variant, unit_cents: null, discount_cents: 0, message: 'Questa configurazione non è più acquistabile online.' };
        const unit = variant.price_cents;
        if (item.seen_price_cents !== null && item.seen_price_cents !== unit)
            return { item, status: 'price_changed', product, variant, unit_cents: unit, discount_cents: 0, message: 'Il prezzo è cambiato da quando lo hai aggiunto. Controlla e conferma.' };
        return { item, status: 'ok', product, variant, unit_cents: unit, discount_cents: 0, message: null };
    });
    // le offerte si calcolano solo sulle righe valide, come fa validate_cart nel database
    const ok = lines.filter((l) => l.status === 'ok');
    const priced = priceCart(idx, ok.map((l) => ({ variant_id: l.item.variant_id, qty: l.item.qty })), cfg);
    ok.forEach((l, k) => (l.discount_cents = priced.line_discounts[k]));
    const issues = lines.filter((l) => l.status !== 'ok').length;
    return {
        lines,
        subtotal_cents: priced.subtotal_cents,
        discount_cents: priced.discount_cents,
        total_cents: priced.total_cents,
        offers: priced.offers,
        canSubmit: lines.length > 0 && issues === 0,
        issues,
    };
}
function toSummaryLines(v) {
    return v.lines
        .filter((l) => l.status === 'ok')
        .map((l) => ({
        name: l.product.name,
        size: l.variant.size,
        height_cm: l.variant.height_cm,
        sku: l.variant.sku,
        qty: l.item.qty,
        unit_cents: l.unit_cents,
        discount_cents: l.discount_cents,
    }));
}
function addToCart(items, variant, qty = 1) {
    const out = items.map((i) => ({ ...i }));
    const ex = out.find((i) => i.variant_id === variant.id);
    if (ex) {
        ex.qty = Math.min(MAX_QTY, ex.qty + qty);
        ex.seen_price_cents = variant.price_cents;
    }
    else
        out.push({ variant_id: variant.id, qty: Math.min(MAX_QTY, qty), seen_price_cents: variant.price_cents });
    return out;
}

__exp.MAX_QTY = MAX_QTY;
__exp.validateCart = validateCart;
__exp.toSummaryLines = toSummaryLines;
__exp.addToCart = addToCart;
});
__def("core/seo.js", function (__exp) {
const BUSINESS = {
    name: 'Vesuvio Sleep',
    legalName: "MATERASSI D'AUTORE A.V. S.R.L.S.",
    vat: '10456501211',
    street: 'Via Raffaele Salierno 38',
    postalCode: '80026',
    locality: 'Casoria',
    region: 'NA',
    country: 'IT',
    since: 1986,
    telephone: '+39 366 121 8346',
    email: 'fdimaterassi@gmail.com',
    whatsapp: '+393661218346',
    hours: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
        { days: ['Saturday'], opens: '10:00', closes: '14:00' },
    ],
};
const AV = {
    available: 'https://schema.org/InStock',
    in_production: 'https://schema.org/MadeToOrder',
    made_to_order: 'https://schema.org/MadeToOrder',
};
/** Spedizione gratuita in Italia e reso entro 14 giorni: le due informazioni che Google mostra nei risultati prodotto. */
function offerExtras(site) {
    return {
        seller: { '@type': 'Organization', name: BUSINESS.name },
        shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'EUR' },
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IT' },
        },
        hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'IT',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 14,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
            merchantReturnLink: site ? `${site}/resi-e-recesso/` : undefined,
        },
    };
}
/** Dati strutturati prodotto: solo prezzi e stati reali, nessuna recensione inventata. */
function productJsonLd(idx, p, opts = {}) {
    const vs = idx.purchasableVariants(p);
    if (!vs.length)
        return null;
    const low = idx.minPrice(p);
    const high = idx.maxPrice(p);
    const avail = AV[vs[0].availability] ?? 'https://schema.org/MadeToOrder';
    const extras = offerExtras(opts.site);
    const ld = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: [p.short, p.description].filter(Boolean).join(' '),
        brand: { '@type': 'Brand', name: BUSINESS.name },
        manufacturer: { '@type': 'Organization', name: BUSINESS.legalName },
        category: p.technical_name || undefined,
        sku: vs.length === 1 ? vs[0].sku : undefined,
        offers: vs.length === 1
            ? { '@type': 'Offer', priceCurrency: 'EUR', price: (low / 100).toFixed(2), availability: avail, url: opts.url, itemCondition: 'https://schema.org/NewCondition', ...extras }
            : {
                '@type': 'AggregateOffer',
                priceCurrency: 'EUR',
                lowPrice: (low / 100).toFixed(2),
                highPrice: (high / 100).toFixed(2),
                offerCount: vs.length,
                availability: avail,
                url: opts.url,
                offers: vs.map((v) => ({
                    '@type': 'Offer',
                    sku: v.sku,
                    name: [p.name, v.size ? v.size.replace('x', '×') : '', v.height_cm && vs.some((x) => x.height_cm !== v.height_cm) ? `H${v.height_cm}` : ''].filter(Boolean).join(' '),
                    priceCurrency: 'EUR',
                    price: (v.price_cents / 100).toFixed(2),
                    availability: AV[v.availability] ?? avail,
                    itemCondition: 'https://schema.org/NewCondition',
                    ...extras,
                })),
            },
    };
    if (opts.images?.length)
        ld.image = opts.images;
    if (opts.url)
        ld.url = opts.url;
    return JSON.parse(JSON.stringify(ld));
}
function localBusinessJsonLd(url, opts = {}) {
    return JSON.parse(JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FurnitureStore',
        '@id': url ? `${url.replace(/\/$/, '')}/#azienda` : undefined,
        name: BUSINESS.name,
        legalName: BUSINESS.legalName,
        vatID: 'IT' + BUSINESS.vat,
        foundingDate: String(BUSINESS.since),
        url,
        image: opts.image,
        logo: opts.logo,
        telephone: BUSINESS.telephone,
        email: BUSINESS.email,
        paymentAccepted: 'Contrassegno, bonifico bancario',
        currenciesAccepted: 'EUR',
        areaServed: { '@type': 'Country', name: 'Italia' },
        address: {
            '@type': 'PostalAddress',
            streetAddress: BUSINESS.street,
            postalCode: BUSINESS.postalCode,
            addressLocality: BUSINESS.locality,
            addressRegion: BUSINESS.region,
            addressCountry: BUSINESS.country,
        },
        openingHoursSpecification: BUSINESS.hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            telephone: BUSINESS.telephone,
            email: BUSINESS.email,
            availableLanguage: 'Italian',
        },
    }));
}
function breadcrumbJsonLd(items) {
    return JSON.parse(JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
    }));
}
function faqJsonLd(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
    };
}
function websiteJsonLd(site) {
    return { '@context': 'https://schema.org', '@type': 'WebSite', name: BUSINESS.name, url: site + '/', inLanguage: 'it-IT' };
}
/** Sitemap con le sole pagine indicizzabili (anche immagini). Si pubblica solo sul dominio reale. */
function buildSitemap(baseUrl, entries) {
    const base = baseUrl.replace(/\/$/, '');
    const x = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...entries.map((e) => `  <url><loc>${x(base + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}${(e.images ?? [])
            .map((i) => `<image:image><image:loc>${x(i)}</image:loc></image:image>`)
            .join('')}</url>`),
        '</urlset>',
    ].join('\n');
}
/** Redirect degli slug cambiati (301 nell'app Next.js, cambio di hash nella preview). */
function resolveRedirect(redirects, slug) {
    let cur = slug;
    for (let i = 0; i < 5; i++) {
        const r = redirects.find((x) => x.old_slug === cur);
        if (!r)
            break;
        cur = r.new_slug;
    }
    return cur === slug ? null : cur;
}

__exp.BUSINESS = BUSINESS;
__exp.productJsonLd = productJsonLd;
__exp.localBusinessJsonLd = localBusinessJsonLd;
__exp.breadcrumbJsonLd = breadcrumbJsonLd;
__exp.faqJsonLd = faqJsonLd;
__exp.websiteJsonLd = websiteJsonLd;
__exp.buildSitemap = buildSitemap;
__exp.resolveRedirect = resolveRedirect;
});
__def("core/payments.js", function (__exp) {
/**
 * Interfaccia pagamenti PREDISPOSTA E DISATTIVATA.
 * Al lancio l'unico percorso è la richiesta su WhatsApp. Nessun provider crea
 * sessioni, chiede carte o mostra loghi finché il flag non viene abilitato lato
 * server, con segreti server-side, webhook verificati e test in sandbox.
 */
const DEFAULT_PAYMENT_FLAGS = Object.freeze({ stripe: false, paypal: false, klarna: false });
class PaymentDisabledError extends Error {
    constructor(id) {
        super(`Il pagamento ${id} non è attivo: al lancio le richieste si confermano su WhatsApp.`);
        this.name = 'PaymentDisabledError';
    }
}
function disabledProvider(id, label, requirements) {
    return {
        id,
        label,
        requirements,
        async createSession() {
            throw new PaymentDisabledError(id);
        },
        async handleWebhook() {
            throw new PaymentDisabledError(id);
        },
    };
}
const PROVIDERS = {
    stripe: disabledProvider('stripe', 'Carte, Apple Pay, Google Pay (Stripe)', [
        'Account Stripe verificato intestato alla società',
        'STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET solo lato server',
        'Dominio verificato per Apple Pay',
        'Webhook checkout.session.completed con verifica firma e idempotenza',
        'Test completi in modalità test prima del live',
    ]),
    paypal: disabledProvider('paypal', 'PayPal', [
        'Account PayPal Business',
        'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET solo lato server',
        'Webhook con verifica firma e idempotenza',
        'Test in sandbox',
    ]),
    klarna: disabledProvider('klarna', 'Klarna', [
        'Contratto Klarna e requisiti del mercato italiano',
        'Credenziali solo lato server',
        'Informativa sul pagamento rateale',
        'Test in playground',
    ]),
};
/** Metodi da mostrare al cliente: con i flag di default la lista è vuota. */
function visibleMethods(flags = DEFAULT_PAYMENT_FLAGS) {
    return Object.keys(PROVIDERS).filter((k) => flags[k] === true).map((k) => PROVIDERS[k]);
}

__exp.DEFAULT_PAYMENT_FLAGS = DEFAULT_PAYMENT_FLAGS;
__exp.PaymentDisabledError = PaymentDisabledError;
__exp.PROVIDERS = PROVIDERS;
__exp.visibleMethods = visibleMethods;
});
__def("core/index.js", function (__exp) {
Object.assign(__exp, __req("core/types.js"));
Object.assign(__exp, __req("core/catalog.js"));
Object.assign(__exp, __req("core/pairings.js"));
Object.assign(__exp, __req("core/sleepMatch.js"));
Object.assign(__exp, __req("core/whatsapp.js"));
Object.assign(__exp, __req("core/cart.js"));
Object.assign(__exp, __req("core/seo.js"));
Object.assign(__exp, __req("core/payments.js"));
Object.assign(__exp, __req("core/offers.js"));


});
__def("nav.js", function (__exp) {
// Indirizzi del sito.
// Sul dominio reale (VS_CONFIG.routing = 'path') le pagine hanno URL veri, indicizzabili:
//   /materassi/  /materassi/essential-foam/  /contatti/ ...
// Nell'anteprima dentro l'artifact (frame isolato) gli stessi indirizzi vivono dopo il cancelletto:
//   #/materassi/  #/materassi/essential-foam/ ...
// I vecchi indirizzi (#materassi, #prodotto-xxx, #fuori-misura ...) restano validi e portano al nuovo.

const CFG = window.VS_CONFIG ?? {};
const MODE = CFG.routing === 'path' ? 'path' : 'hash';
const SITE_URL = String(CFG.siteUrl || 'https://vesuviosleep.it').replace(/\/$/, '');
const IS_PREVIEW = CFG.preview !== false;

const P = {
  home: '/',
  sleepMatch: '/sleep-match/',
  compare: '/confronta-materassi/',
  sizes: '/guida-misure-materassi/',
  quote: '/materassi-su-misura/',
  showroom: '/showroom/',
  cart: '/carrello/',
  review: '/carrello/riepilogo/',
  search: '/cerca/',
  admin: '/admin/',
  contacts: '/contatti/',
  faq: '/domande-frequenti/',
  about: '/chi-siamo/',
  b2b: '/hotel-e-bb/',
  naples: '/materassi-napoli/',
  shipping: '/spedizioni-e-consegna/',
  payments: '/pagamenti/',
  returns: '/resi-e-recesso/',
  warranty: '/garanzia/',
  terms: '/condizioni-di-vendita/',
  privacy: '/privacy/',
  cookies: '/cookie/',
  guides: '/guide/',
  offers: '/offerte/',
};

/** href per un percorso canonico ("/materassi/") nella modalità corrente. */
const u = (path) => (MODE === 'path' ? path : '#' + path);
/** URL assoluto (canonical, Open Graph, dati strutturati). */
const abs = (path) => SITE_URL + path;
/** URL assoluto di un file del sito (img/..., anche già assoluto). */
const absAsset = (src) => (!src ? '' : /^https?:/.test(src) ? src : SITE_URL + '/' + src.replace(/^\.?\//, ''));

const LEGACY = {
  '': P.home,
  'sleep-match': P.sleepMatch,
  confronto: P.compare,
  'guida-misure': P.sizes,
  'fuori-misura': P.quote,
  showroom: P.showroom,
  carrello: P.cart,
  riepilogo: P.review,
};
/** Vecchio indirizzo a cancelletto -> percorso canonico. */
function legacyToPath(key, resolveProduct) {
  key = decodeURIComponent(key || '');
  if (key in LEGACY) return LEGACY[key];
  if (key === 'admin') return P.admin;
  if (key.startsWith('admin-')) return `/admin/${key.slice(6)}/`;
  const m = /^prodotto-(.+)$/.exec(key);
  if (m) return (resolveProduct && resolveProduct(m[1])) || `/prodotto/${m[1]}/`;
  return `/${key}/`;
}
/** Percorso admin -> chiave usata dal pannello ("admin-catalogo"). */
function adminKey(path = current().path) {
  const rest = path.replace(/^\/admin\/?/, '').replace(/\/$/, '');
  return rest ? 'admin-' + rest : 'admin';
}

/** Pagina corrente: percorso canonico e parametri. legacy = vecchio indirizzo da reindirizzare. */
function current() {
  let raw;
  if (MODE === 'path') {
    raw = location.pathname + location.search;
    const h = location.hash.slice(1);
    if (h && !h.startsWith('/') && !document.getElementById(h)) return { legacy: h, path: '/', query: {} };
  } else {
    raw = location.hash.slice(1);
    if (!raw.startsWith('/')) return raw === '' ? { path: '/', query: {} } : { legacy: raw, path: '/', query: {} };
  }
  const [p, qs = ''] = raw.split('?');
  let path = decodeURIComponent(p || '/');
  if (!path.endsWith('/')) path += '/';
  path = path.replace(/\/{2,}/g, '/');
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}

let onNavigate = () => {};
function setNavigator(fn) {
  onNavigate = fn;
}
/** Vai a un percorso canonico. */
function go(path, { replace = false } = {}) {
  if (MODE === 'path') {
    if (replace) history.replaceState(null, '', path);
    else history.pushState(null, '', path);
    onNavigate();
  } else if (replace) {
    location.replace('#' + path);
  } else {
    location.hash = path;
  }
}
const isAt = (path) => current().path === path;

/** Link interni: niente ricaricamento sul dominio reale, vecchi #indirizzi tradotti ovunque. */
function interceptLinks(resolveProduct) {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      const key = href.slice(1);
      if (key.startsWith('/')) return; // anteprima: già canonico
      const el = key && document.getElementById(key);
      if (el) {
        // ancora nella pagina
        e.preventDefault();
        el.scrollIntoView({ block: 'start' });
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        return;
      }
      e.preventDefault();
      go(legacyToPath(key, resolveProduct));
      return;
    }
    if (MODE === 'path' && href.startsWith('/') && !href.startsWith('//') && !/\.(xml|txt|pdf|webp|png|jpg)$/i.test(href.split('?')[0])) {
      e.preventDefault();
      if (href !== location.pathname + location.search) go(href);
    }
  });
}

__exp.MODE = MODE;
__exp.SITE_URL = SITE_URL;
__exp.IS_PREVIEW = IS_PREVIEW;
__exp.P = P;
__exp.u = u;
__exp.abs = abs;
__exp.absAsset = absAsset;
__exp.legacyToPath = legacyToPath;
__exp.adminKey = adminKey;
__exp.current = current;
__exp.setNavigator = setNavigator;
__exp.go = go;
__exp.isAt = isAt;
__exp.interceptLinks = interceptLinks;
});
__def("pages.js", function (__exp) {
// Pagine informative, legali e guide. Ogni pagina ha un URL canonico, titolo e descrizione
// per i motori di ricerca, un H1 e il testo. I fatti vengono solo dai dati confermati
// (listino, dataset aziendale, indicazioni del titolare del 15/11/2026): niente tempi di
// consegna, certificazioni o garanzie aggiuntive non dichiarate.
const {P, u} = __req("nav.js");
const {normalizeWhatsAppNumber} = __req("core/index.js");

const CONTACT = {
  phone: '+39 366 121 8346',
  phoneHref: 'tel:+393661218346',
  phoneShort: '366 121 8346',
  waDigits: '393661218346',
  waShort: '366 121 8346',
  email: 'fdimaterassi@gmail.com',
  address: 'Via Raffaele Salierno 38, 80026 Casoria (NA)',
  legalName: "MATERASSI D'AUTORE A.V. S.R.L.S.",
  vat: '10456501211',
  rea: 'NA-1107535',
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Via Raffaele Salierno 38, 80026 Casoria NA'),
};
const shortNum = (digits) => (digits.startsWith('39') && digits.length === 12 ? `${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : '+' + digits);
/** I contatti modificati in Admin › Impostazioni prevalgono sui valori di partenza. */
function applySettings(st = {}) {
  const w = normalizeWhatsAppNumber(st.whatsapp_number || '');
  if (w.ok) {
    CONTACT.waDigits = w.digits;
    CONTACT.waShort = shortNum(w.digits);
  }
  const ph = normalizeWhatsAppNumber(st.public_phone || '');
  if (ph.ok) {
    CONTACT.phone = st.public_phone;
    CONTACT.phoneHref = 'tel:+' + ph.digits;
    CONTACT.phoneShort = shortNum(ph.digits);
  }
  if (st.contact_email && /@/.test(st.contact_email)) CONTACT.email = st.contact_email;
}
const waHref = (text = 'Ciao Vesuvio Sleep, vorrei qualche informazione.') => `https://wa.me/${CONTACT.waDigits}?text=${encodeURIComponent(text)}`;

const PAYMENT_METHODS = [
  {
    id: 'contrassegno',
    label: 'Contrassegno',
    msg: 'contrassegno alla consegna',
    text: 'Paghi alla consegna, direttamente a chi ti porta il materasso.',
  },
  {
    id: 'bonifico',
    label: 'Bonifico bancario',
    msg: 'bonifico bancario',
    text: 'Ti inviamo gli estremi su WhatsApp; dopo il bonifico ricevi poco dopo la bolla di spedizione.',
  },
];

const LEGAL_UPDATED = '15 novembre 2026';

const L = {
  eco: '/materassi/eco/',
  duo: '/materassi/memory-duo/',
  duoClassic: '/materassi/memory-duo-classic/',
  trio: '/materassi/memory-trio/',
  p1600: '/materassi/pocket-1600/',
  pocket: '/materassi/pocket-3000-elite/',
  flex: '/reti/rete-flex/',
  strong: '/reti/rete-strong/',
  topper: '/topper/topper-memory-cloud-5/',
};
const a = (path, text) => `<a href="${u(path)}">${text}</a>`;
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const mail = () => `<a href="mailto:${CONTACT.email}">${CONTACT.email}</a>`;
const tel = () => `<a href="${CONTACT.phoneHref}">${CONTACT.phoneShort}</a>`;
const wa = (t = 'WhatsApp') => ext(waHref(), t);
const toc = (items) => `<nav class="toc" aria-label="In questa pagina"><p>In questa pagina</p><ol>${items.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></nav>`;
const sec = (id, title, body) => `<section id="${id}"><h2>${title}</h2>${body}</section>`;

// ------------------------------------------------------------------ FAQ
const FAQ = [
  {
    q: 'Come si ordina un materasso Vesuvio Sleep?',
    a: () => `Scegli il modello, l'altezza e la misura e aggiungilo al carrello. Nel riepilogo scegli come pagare e invii la richiesta su WhatsApp con un clic: il messaggio contiene articoli, prezzi e un numero di riferimento. Ti rispondiamo noi per confermare disponibilità, consegna e pagamento. Aprire WhatsApp non è ancora un ordine: l'ordine è confermato solo quando te lo confermiamo per iscritto.`,
  },
  {
    q: 'Come si paga?',
    a: () => `In due modi: in <strong>contrassegno</strong>, pagando alla consegna, oppure con <strong>bonifico bancario</strong>: ti mandiamo gli estremi su WhatsApp e, dopo il bonifico, ricevi poco dopo la bolla di spedizione. Sul sito non si paga e non si inseriscono carte. Dettagli nella pagina ${a(P.payments, 'Pagamenti')}.`,
  },
  {
    q: 'Quanto costa la spedizione?',
    a: () => `Niente: la spedizione è gratuita in tutta Italia, isole comprese. Fuori Napoli consegna il corriere, con il tracciamento della spedizione. Tutti i dettagli in ${a(P.shipping, 'Spedizioni e consegna')}.`,
  },
  {
    q: 'Quanto tempo ci vuole?',
    a: () => `I materassi sono prodotti su ordinazione nella nostra fabbrica di Casoria: servono circa 2 giorni di lavorazione prima della spedizione. I tempi del corriere te li indichiamo con la conferma dell'ordine.`,
  },
  {
    q: 'Consegnate a Napoli?',
    a: () => `Sì, a Napoli consegniamo con il nostro furgone: consegna al piano gratuita, ritiro del vecchio materasso e montaggio delle reti. Vedi ${a(P.naples, 'Materassi a Napoli')}.`,
  },
  {
    q: 'Posso provare i materassi prima di comprarli?',
    a: () => `Sì. Fabbrica, esposizione e showroom sono nello stesso posto, in Via Raffaele Salierno 38 a Casoria: lunedì–venerdì 9:00–18:00, sabato 10:00–14:00. ${a(P.showroom, 'Come arrivare')}.`,
  },
  {
    q: 'Fate materassi su misura?',
    a: () => `Sì, fuori misura e altezze personalizzate. Indica prodotto e misure nella pagina ${a(P.quote, 'Materassi su misura')}: ti mandiamo il preventivo su WhatsApp, senza pagamenti anticipati.`,
  },
  {
    q: 'Quali misure sono disponibili?',
    a: () => `Tredici misure standard, dal singolo 80×190 al King Size 180×200, passando per piazza e mezza, francese e matrimoniale. La ${a(P.sizes, 'guida alle misure')} le confronta in scala.`,
  },
  {
    q: 'Il rivestimento è sfoderabile?',
    a: () => `Dipende dal modello: Memory Duo, Pocket 3000 Elite e il Topper Memory Cloud 5 hanno il rivestimento sfoderabile; l'Eco e il Memory Duo Classic no. Lo trovi indicato in ogni scheda prodotto, alla voce Rivestimento.`,
  },
  {
    q: 'Posso restituire il materasso?',
    a: () => `Per le misure standard hai 14 giorni dalla consegna per recedere, senza dover dare una motivazione; le spese di restituzione sono a tuo carico. Il recesso non vale per i prodotti fatti su misura, salvo difetti. Come fare: ${a(P.returns, 'Resi e recesso')}.`,
  },
  {
    q: 'Che garanzia hanno i prodotti?',
    a: () => `Tutti i prodotti hanno la garanzia legale di conformità di 2 anni dalla consegna, prevista dal Codice del Consumo. Come funziona: ${a(P.warranty, 'Garanzia')}.`,
  },
  {
    q: 'Fornite hotel e B&B?',
    a: () => `Sì, anche in grandi quantità e fuori misura, con prezzi su preventivo. Vedi ${a(P.b2b, 'Hotel e B&B')}.`,
  },
  {
    q: 'Come vi contatto?',
    a: () => `Su WhatsApp e al telefono al ${CONTACT.phoneShort}, per email a ${CONTACT.email}, oppure in showroom a Casoria. Tutti i recapiti in ${a(P.contacts, 'Contatti')}.`,
  },
];
const stripTags = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const faqForLd = () => FAQ.map((f) => ({ q: f.q, a: stripTags(f.a()) }));

// ------------------------------------------------------------------ testi delle categorie
const CATEGORY_SEO = {
  materasso: {
    metaTitle: 'Materassi Memory Foam, a molle e in poliuretano',
    description: (from) => `Materassi di fabbrica${from ? ` da ${from}` : ''}: Memory Foam, molle insacchettate e poliuretano in 13 misure, prodotti a Casoria (Napoli). Spedizione gratuita.`,
    html: () => `<h2>Come scegliere tra i nostri materassi</h2>
      <p>La gamma è piccola di proposito: ogni modello ha un carattere preciso. Il ${a(L.eco, 'Vesuvio Eco')} in poliuretano espanso ad alta densità dà un sostegno uniforme e stabile ed è l'unico disponibile in tre altezze, H20, H25 e H30. Il ${a(L.duoClassic, 'Vesuvio Memory Duo Classic')} introduce il Memory Foam con il rivestimento fisso; il ${a(L.duo, 'Vesuvio Memory Duo')} è lo stesso materasso sfoderabile e reversibile, con un lato invernale e uno estivo. Il ${a(L.trio, 'Vesuvio Memory Trio')} porta gli strati di Memory a tre, per 27 cm di altezza.</p>
      <p>Chi cerca un sostegno più deciso, o dorme in due, guarda alle molle insacchettate: il ${a(L.p1600, 'Vesuvio Pocket 1600')} è l'ingresso nella gamma, il ${a(L.pocket, 'Vesuvio Pocket 3000 Elite')} ne ha 3000 e aggiunge uno strato di Memory Foam.</p>
      <p>Se non sai da dove partire, il ${a(P.sleepMatch, 'Sleep Match')} ti propone un modello in poche domande, e la guida ${a('/guide/materasso-memory-molle-o-poliuretano/', 'Memory, molle o poliuretano')} spiega le differenze. Tutti i prezzi sono IVA inclusa e la spedizione è gratuita in Italia. Per letti con misure non standard c'è il ${a(P.quote, 'materasso su misura')}.</p>`,
  },
  rete: {
    metaTitle: 'Reti a doghe in legno con telaio in acciaio',
    description: (from) => `Reti a doghe in legno con telaio in acciaio, piedi inclusi${from ? `, da ${from}` : ''}. Nelle stesse 13 misure dei nostri materassi, spedizione gratuita in Italia e montaggio a Napoli.`,
    html: () => `<h2>Quale rete scegliere</h2>
      <p>Le nostre reti hanno telaio in acciaio e doghe in legno, con i piedi già inclusi. La ${a(L.flex, 'Vesuvio Rete Flex')} distribuisce il carico in modo uniforme; la ${a(L.strong, 'Vesuvio Rete Strong')} ha una struttura rinforzata, per chi cerca un supporto più robusto.</p>
      <p>Sono disponibili nelle stesse misure dei materassi: scegli la rete della stessa misura del materasso. A Napoli la montiamo noi alla consegna.</p>`,
  },
  topper: {
    metaTitle: 'Topper in Memory Foam alto 5 cm',
    description: (from) => `Topper in Memory Foam alto 5 cm, sfoderabile${from ? `, da ${from}` : ''}. In tutte le 13 misure dei nostri materassi, prodotto a Casoria e spedito gratis in Italia.`,
    html: () => `<h2>A cosa serve un topper</h2>
      <p>Il topper si appoggia sopra il materasso e ne cambia l'accoglienza senza sostituirlo. Il ${a(L.topper, 'Vesuvio Topper Memory Cloud 5')} è in Memory Foam, alto 5 cm, con rivestimento sfoderabile, nelle stesse misure dei nostri materassi: scegli la misura del materasso su cui lo appoggerai.</p>`,
  },
};

// ------------------------------------------------------------------ pagine
// photo: chiave di un'immagine del sito (slots.js) per la testata
const PAGES = {
  [P.contacts]: {
    nav: 'Contatti',
    h1: 'Contatti',
    metaTitle: 'Contatti: WhatsApp, telefono e showroom a Casoria',
    description: `Scrivi a Vesuvio Sleep su WhatsApp o chiama il ${CONTACT.phoneShort}, email ${CONTACT.email}. Showroom e fabbrica in Via Raffaele Salierno 38, Casoria (Napoli).`,
    lead: 'Per ordini, preventivi su misura, hotel e B&B: rispondiamo noi, dalla fabbrica.',
    photo: 'showroom',
    type: 'contact',
    body: () => `<div class="contact-cards">
        <a class="contact-card" href="${waHref()}" target="_blank" rel="noopener"><span class="contact-card__k">WhatsApp</span><strong>${CONTACT.waShort}</strong><span>Il modo più veloce: ordini, preventivi, informazioni</span></a>
        <a class="contact-card" href="${CONTACT.phoneHref}"><span class="contact-card__k">Telefono</span><strong>${CONTACT.phoneShort}</strong><span>Negli orari dello showroom</span></a>
        <a class="contact-card contact-card--mail" href="mailto:${CONTACT.email}"><span class="contact-card__k">Email</span><strong>${CONTACT.email}</strong><span>Per documenti, fatture e richieste scritte</span></a>
      </div>
      ${sec('showroom-c', 'Showroom e fabbrica', `<p>Fabbrica, esposizione e showroom sono nello stesso posto: puoi provare i materassi e parlare con chi li produce.</p>
        <p><strong>Vesuvio Sleep</strong><br>Via Raffaele Salierno 38<br>80026 Casoria (NA)</p>
        <dl class="hours"><dt>Lunedì–venerdì</dt><dd>09:00–18:00</dd><dt>Sabato</dt><dd>10:00–14:00</dd><dt>Domenica</dt><dd>Chiuso</dd></dl>
        <p class="btn-row"><a class="btn btn--primary" href="${CONTACT.mapsUrl}" target="_blank" rel="noopener">Indicazioni stradali</a></p>`)}
      ${sec('dati', 'Dati aziendali', `<p>${CONTACT.legalName}<br>Sede: ${CONTACT.address}<br>Partita IVA ${CONTACT.vat} · REA ${CONTACT.rea}</p>`)}`,
  },

  [P.faq]: {
    nav: 'Domande frequenti',
    h1: 'Domande frequenti',
    metaTitle: 'Domande frequenti: ordini, pagamenti, consegna e resi',
    description: 'Come si ordina, come si paga (contrassegno o bonifico), spedizione gratuita, consegna a Napoli, misure, resi e garanzia: le risposte di Vesuvio Sleep.',
    lead: 'Ordini, pagamenti, consegna, resi. Se non trovi la risposta, scrivici su WhatsApp.',
    type: 'faq',
    body: () => `<div class="faq">${FAQ.map((f, i) => `<details class="faq__item" ${i === 0 ? 'open' : ''}><summary><h2>${f.q}</h2></summary><div class="faq__a"><p>${f.a()}</p></div></details>`).join('')}</div>`,
  },

  [P.about]: {
    nav: 'Chi siamo',
    h1: 'Una fabbrica di materassi a Casoria, dal 1986',
    metaTitle: 'Chi siamo: fabbrica di materassi a Casoria dal 1986',
    description: 'Vesuvio Sleep produce materassi a Casoria, alle porte di Napoli, dal 1986 e li vende direttamente, senza intermediari: fabbrica, esposizione e showroom nello stesso posto.',
    lead: 'Produciamo materassi alle porte di Napoli e li vendiamo direttamente, a prezzo di fabbrica.',
    photo: 'fabbrica_panoramica',
    body: () => `${sec('fabbrica', 'Fabbrica, esposizione e showroom nello stesso posto', `<p>Vesuvio Sleep è il marchio di ${CONTACT.legalName}. Dal 1986 produciamo materassi a Casoria, in Via Raffaele Salierno 38: qui tagliamo, assembliamo e cuciamo, e qui c'è lo showroom dove puoi provarli.</p>
        <p>Vendiamo direttamente, senza intermediari. Per questo il prezzo che vedi è il prezzo di fabbrica, IVA inclusa, e la spedizione in Italia è gratuita.</p>`)}
      ${sec('cosa', 'Cosa produciamo', `<p>${a('/materassi/', 'Materassi')} in poliuretano espanso, Memory Foam e molle insacchettate, ${a('/reti/', 'reti a doghe')} con telaio in acciaio e ${a('/topper/', 'topper in Memory Foam')}. Ogni materasso è prodotto su ordinazione, in 13 misure standard; su richiesta realizziamo ${a(P.quote, 'fuori misura e altezze personalizzate')}.</p>`)}
      ${sec('come', 'Come lavoriamo', `<p>Gli ordini arrivano su WhatsApp e li confermiamo noi, uno per uno. Paghi in contrassegno o con bonifico, mai online. A Napoli consegniamo con il nostro furgone, al piano e con il ritiro del vecchio materasso; nel resto d'Italia spediamo con corriere.</p>
        <p>Lavoriamo anche per ${a(P.b2b, 'hotel, B&B e strutture ricettive')}.</p>`)}`,
  },

  [P.b2b]: {
    nav: 'Hotel e B&B',
    h1: 'Materassi per hotel, B&B e strutture ricettive',
    metaTitle: 'Materassi per hotel e B&B dalla fabbrica',
    description: 'Forniture di materassi, reti e topper per hotel, B&B e strutture ricettive, anche fuori misura e in grandi quantità, direttamente dalla fabbrica di Casoria (Napoli).',
    lead: 'Forniture dirette dalla fabbrica, anche in grandi quantità e fuori misura.',
    photo: 'camera',
    body: () => `${sec('fornitura', 'Una fornitura senza intermediari', `<p>Produciamo noi i materassi, a Casoria: per una struttura ricettiva vuol dire trattare direttamente con chi li fa, su quantità, misure e tempi.</p>
        <ul class="ticks"><li>Materassi, reti e topper della nostra gamma, nelle 13 misure standard</li><li>Fuori misura e altezze personalizzate per letti particolari</li><li>Grandi quantità, con un unico referente</li><li>A Napoli consegna con il nostro furgone e ritiro dei materassi usati</li></ul>`)}
      ${sec('preventivo', 'Come chiedere un preventivo', `<p>Per le strutture i prezzi sono su preventivo. Indica il numero di camere, le misure dei letti e i modelli che ti interessano: puoi farlo dal modulo ${a(P.quote + '?hotel=1', 'Materassi su misura')} (spunta "È per un hotel, un B&B o una struttura ricettiva") oppure scriverci direttamente.</p>
        <p>Se la struttura ha requisiti specifici sui materiali, indicali nella richiesta: ti diciamo con precisione cosa possiamo fornire.</p>
        <p class="btn-row"><a class="btn btn--primary" href="${u(P.quote + '?hotel=1')}">Richiedi un preventivo</a><a class="btn btn--ghost" href="${waHref('Ciao Vesuvio Sleep, vorrei un preventivo per una struttura ricettiva.')}" target="_blank" rel="noopener">Scrivici su WhatsApp</a></p>`)}`,
  },

  [P.naples]: {
    nav: 'Materassi a Napoli',
    h1: 'Materassi a Napoli, dalla fabbrica di Casoria',
    metaTitle: 'Materassi a Napoli: fabbrica e showroom a Casoria',
    description: 'Materassi di fabbrica a Napoli: showroom a Casoria, consegna con il nostro furgone, al piano gratuita, ritiro del vecchio materasso e montaggio delle reti.',
    lead: 'Li produciamo a Casoria, alle porte di Napoli, e te li portiamo noi.',
    photo: 'consegna',
    type: 'local',
    body: () => `${sec('consegna-na', 'A Napoli consegniamo noi', `<p>A Napoli non usiamo il corriere: consegniamo con il nostro furgone. Il servizio comprende:</p>
        <ul class="ticks"><li>consegna al piano gratuita</li><li>ritiro del vecchio materasso</li><li>montaggio delle reti</li></ul>
        <p>Come nel resto d'Italia, la spedizione è gratuita. Paghi alla consegna in contrassegno oppure con bonifico.</p>`)}
      ${sec('showroom-na', 'Provali in showroom', `<p>Lo showroom è nella fabbrica, in Via Raffaele Salierno 38 a Casoria: aperto dal lunedì al venerdì 9:00–18:00 e il sabato 10:00–14:00. Puoi provare i materassi e scegliere con chi li produce. ${a(P.showroom, 'Come arrivare')}.</p>`)}
      ${sec('gamma-na', 'I materassi più richiesti', `<p>Il ${a(L.eco, 'Vesuvio Eco')} in poliuretano, in tre altezze; il ${a(L.duo, 'Vesuvio Memory Duo')}, reversibile estate-inverno; il ${a(L.pocket, 'Vesuvio Pocket 3000 Elite')} con 3000 molle insacchettate e Memory Foam. Completa il letto con una ${a('/reti/', 'rete a doghe')}: a Napoli la montiamo noi.</p>`)}`,
  },

  [P.shipping]: {
    nav: 'Spedizioni e consegna',
    h1: 'Spedizioni e consegna',
    metaTitle: 'Spedizioni e consegna gratuite in tutta Italia',
    description: 'Spedizione gratuita in tutta Italia, isole comprese, con tracciamento. A Napoli consegna al piano, ritiro dell’usato e montaggio reti.',
    lead: 'Gratuita in tutta Italia, isole comprese.',
    photo: 'consegna',
    body: () => `${sec('costi', 'Quanto costa', `<p>La spedizione è <strong>gratuita in tutta Italia, isole comprese</strong>. Non ci sono supplementi per le isole. Al momento spediamo solo in Italia.</p>`)}
      ${sec('tempi', 'Tempi', `<p>I materassi sono prodotti su ordinazione: servono circa <strong>2 giorni di lavorazione</strong> prima della spedizione. Con la conferma dell'ordine ti indichiamo i tempi di consegna.</p>`)}
      ${sec('italia', 'Nel resto d’Italia: corriere', `<p>Fuori Napoli consegna il corriere, con il <strong>tracciamento</strong> della spedizione. Se paghi con bonifico, poco dopo il pagamento ricevi la bolla di spedizione.</p>`)}
      ${sec('napoli', 'A Napoli: il nostro furgone', `<p>A Napoli consegniamo noi, con il nostro furgone: <strong>consegna al piano gratuita</strong>, <strong>ritiro del vecchio materasso</strong> e <strong>montaggio delle reti</strong>. ${a(P.naples, 'Materassi a Napoli')}.</p>`)}
      ${sec('ricevere', 'Al momento della consegna', `<p>Controlla che l'imballo sia integro e che i colli corrispondano. Se l'imballo è danneggiato, accetta la merce con riserva specifica sul documento del corriere e scrivici subito su ${wa()} o a ${mail()} con qualche foto.</p>`)}`,
  },

  [P.payments]: {
    nav: 'Pagamenti',
    h1: 'Pagamenti',
    metaTitle: 'Pagamenti: contrassegno o bonifico bancario',
    description: 'Da Vesuvio Sleep paghi in contrassegno alla consegna oppure con bonifico bancario. Nessun pagamento sul sito: confermi l’ordine con noi su WhatsApp.',
    lead: 'Contrassegno o bonifico. Sul sito non si paga e non si inseriscono carte.',
    body: () => `${sec('come', 'Come funziona', `<p>Invii il riepilogo del carrello su WhatsApp, indicando come preferisci pagare. Ti rispondiamo per confermare disponibilità e consegna: l'ordine è confermato solo con la nostra conferma scritta. Tutti i prezzi sono in euro, IVA inclusa.</p>`)}
      ${sec('contrassegno', 'Contrassegno', `<p>Paghi al momento della consegna, a chi ti porta la merce: il corriere nel resto d'Italia, il nostro incaricato a Napoli. Non paghi nulla in anticipo.</p>`)}
      ${sec('bonifico', 'Bonifico bancario', `<p>Ti inviamo gli estremi per il bonifico su WhatsApp, insieme alla conferma dell'ordine. Dopo il bonifico ricevi poco dopo la bolla di spedizione.</p>`)}
      ${sec('online', 'Pagamenti online', `<p>Sul sito non ci sono pagamenti online: non ti chiediamo mai numeri di carta, né sul sito né su WhatsApp. Se qualcuno te li chiede a nome di Vesuvio Sleep, non è un nostro messaggio: chiamaci al ${tel()}.</p>`)}`,
  },

  [P.returns]: {
    nav: 'Resi e recesso',
    h1: 'Resi e diritto di recesso',
    metaTitle: 'Resi e diritto di recesso entro 14 giorni',
    description: 'Hai 14 giorni dalla consegna per recedere dall’acquisto delle misure standard. Come comunicarlo, come restituire il prodotto e quando arriva il rimborso. Modulo di recesso.',
    lead: 'Per le misure standard hai 14 giorni dalla consegna per ripensarci.',
    legal: true,
    body: () => `${toc([['chi', 'Chi può recedere'], ['esclusioni', 'Quando non si applica'], ['come', 'Come comunicarlo'], ['restituzione', 'Come restituire il prodotto'], ['rimborso', 'Rimborso'], ['modulo', 'Modulo di recesso']])}
      ${sec('chi', 'Chi può recedere', `<p>Se hai acquistato come consumatore (per uso personale, non per un'attività), hai diritto di recedere dal contratto entro <strong>14 giorni</strong> senza dover dare alcuna motivazione, come previsto dagli articoli 52 e seguenti del Codice del Consumo (D.lgs. 206/2005). Il termine decorre dal giorno in cui tu, o una persona da te indicata diversa dal corriere, ricevi il prodotto. Se un ordine comprende più prodotti consegnati separatamente, decorre dalla consegna dell'ultimo.</p>`)}
      ${sec('esclusioni', 'Quando non si applica', `<p>Il diritto di recesso è escluso per i beni <strong>confezionati su misura o chiaramente personalizzati</strong> (art. 59, lettera c, del Codice del Consumo): materassi fuori misura, altezze personalizzate e ogni prodotto realizzato su tue specifiche. Restano comunque la ${a(P.warranty, 'garanzia legale')} e i diritti per i difetti.</p>
        <p>I prodotti nelle misure standard del catalogo, anche se prodotti su ordinazione, si possono restituire.</p>
        <p>Il diritto di recesso non spetta a chi acquista per la propria attività (ad esempio hotel e B&B con partita IVA).</p>`)}
      ${sec('come', 'Come comunicarlo', `<p>Prima della scadenza dei 14 giorni inviaci una dichiarazione esplicita della tua decisione di recedere, indicando il riferimento dell'ordine: per email a ${mail()} oppure su ${wa()}. Puoi usare il modulo qui sotto, ma non è obbligatorio. Ti confermiamo la ricezione senza ritardo.</p>`)}
      ${sec('restituzione', 'Come restituire il prodotto', `<p>Devi restituire il prodotto entro 14 giorni dalla comunicazione del recesso, all'indirizzo: ${CONTACT.legalName}, ${CONTACT.address}. <strong>Le spese di restituzione sono a tuo carico.</strong> Ti indichiamo noi come imballarlo e, se ti è utile, come organizzare il ritiro.</p>
        <p>Il prodotto va restituito integro e protetto. Rispondi della diminuzione di valore dovuta a un uso diverso da quello necessario per verificarne natura e caratteristiche: puoi provarlo come faresti in negozio, non usarlo.</p>`)}
      ${sec('rimborso', 'Rimborso', `<p>Ti rimborsiamo l'importo pagato, compresi gli eventuali costi di consegna standard, entro 14 giorni dal giorno in cui riceviamo la tua comunicazione di recesso. Possiamo sospendere il rimborso finché non riceviamo il prodotto o la prova della spedizione.</p>
        <p>Rimborsiamo con lo stesso mezzo di pagamento usato: con bonifico, sullo stesso conto. Se hai pagato in contrassegno, ti rimborsiamo con bonifico sull'IBAN che ci indichi. Il rimborso non ha costi per te.</p>`)}
      ${sec('modulo', 'Modulo di recesso', `<p>Compila e inviaci questo modulo solo se vuoi recedere dal contratto.</p>
        <div class="legal-form"><p>Destinatario: ${CONTACT.legalName}, ${CONTACT.address}, ${CONTACT.email}</p>
        <p>Con la presente io/noi (*) notifico/notifichiamo (*) il recesso dal mio/nostro (*) contratto di vendita dei seguenti beni:</p>
        <p>Riferimento dell'ordine: ____________________</p>
        <p>Ordinato il (*) / ricevuto il (*): ____________________</p>
        <p>Nome del/dei consumatore/i: ____________________</p>
        <p>Indirizzo del/dei consumatore/i: ____________________</p>
        <p>Firma del/dei consumatore/i (solo se il modulo è inviato su carta): ____________________</p>
        <p>Data: ____________________</p>
        <p class="small">(*) Cancellare la dicitura inutile.</p></div>
        <p><button class="btn btn--ghost btn--sm" type="button" data-act="print">Stampa il modulo</button></p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.warranty]: {
    nav: 'Garanzia',
    h1: 'Garanzia legale di conformità',
    metaTitle: 'Garanzia legale di 2 anni sui materassi',
    description: 'Tutti i prodotti Vesuvio Sleep hanno la garanzia legale di conformità di 2 anni prevista dal Codice del Consumo. Cosa copre e come segnalare un difetto.',
    lead: 'Due anni dalla consegna, come prevede il Codice del Consumo.',
    legal: true,
    body: () => `${toc([['cosa', 'Cosa copre'], ['durata', 'Durata e termini'], ['rimedi', 'Cosa ti spetta'], ['segnalare', 'Come segnalare un difetto']])}
      ${sec('cosa', 'Cosa copre', `<p>Se hai acquistato come consumatore, tutti i prodotti godono della garanzia legale di conformità prevista dagli articoli 128 e seguenti del Codice del Consumo (D.lgs. 206/2005). Copre i difetti di conformità: il prodotto deve corrispondere alla descrizione, avere le qualità dichiarate ed essere idoneo all'uso.</p>
        <p>Non copre i danni dovuti a uso improprio, incidenti, mancato rispetto delle indicazioni di cura riportate in etichetta, né la normale usura.</p>`)}
      ${sec('durata', 'Durata e termini', `<p>La garanzia dura <strong>2 anni dalla consegna</strong>. Si presume, salvo prova contraria, che i difetti che si manifestano entro un anno dalla consegna esistessero già al momento della consegna. Il difetto va segnalato entro due mesi da quando lo scopri.</p>`)}
      ${sec('rimedi', 'Cosa ti spetta', `<p>In caso di difetto hai diritto, senza spese, alla riparazione o alla sostituzione del prodotto. Se non sono possibili o non avvengono in tempi ragionevoli, puoi chiedere una riduzione del prezzo o la risoluzione del contratto. Le spese di spedizione per i prodotti difettosi sono a nostro carico.</p>`)}
      ${sec('segnalare', 'Come segnalare un difetto', `<p>Scrivici su ${wa()} o a ${mail()} con il riferimento dell'ordine, una breve descrizione e qualche foto. Ti rispondiamo con la soluzione.</p>
        <p>Chi acquista per la propria attività è soggetto alla garanzia prevista dal Codice civile, secondo le condizioni concordate.</p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.terms]: {
    nav: 'Condizioni di vendita',
    h1: 'Condizioni generali di vendita',
    metaTitle: 'Condizioni generali di vendita',
    description: 'Condizioni generali di vendita di Vesuvio Sleep (Materassi d’Autore A.V. S.R.L.S.): ordini via WhatsApp, prezzi, pagamenti, consegna, recesso, garanzia e controversie.',
    lead: 'Le regole delle vendite a distanza di Vesuvio Sleep.',
    legal: true,
    body: () => `${toc([['venditore', 'Venditore'], ['ambito', 'Ambito'], ['prodotti', 'Prodotti e prezzi'], ['contratto', 'Come si conclude il contratto'], ['pagamento', 'Pagamento'], ['consegna', 'Consegna'], ['misura', 'Prodotti su misura'], ['recesso', 'Recesso'], ['garanzia', 'Garanzia'], ['dati', 'Dati personali'], ['controversie', 'Reclami e controversie'], ['legge', 'Legge applicabile']])}
      ${sec('venditore', '1. Venditore', `<p>I prodotti presentati sul sito sono venduti da ${CONTACT.legalName}, con sede in ${CONTACT.address}, Partita IVA ${CONTACT.vat}, REA ${CONTACT.rea}, che opera con il marchio Vesuvio Sleep (di seguito "Vesuvio Sleep"). Contatti: telefono e WhatsApp ${CONTACT.phoneShort}, email ${CONTACT.email}.</p>`)}
      ${sec('ambito', '2. Ambito', `<p>Queste condizioni regolano le vendite a distanza concluse a partire dal sito. Se acquisti come consumatore si applicano anche le norme del Codice del Consumo (D.lgs. 206/2005), che prevalgono su qualsiasi clausola meno favorevole. Le forniture a imprese, hotel e strutture ricettive seguono le condizioni del preventivo accettato.</p>`)}
      ${sec('prodotti', '3. Prodotti e prezzi', `<p>Le caratteristiche dei prodotti sono descritte nelle schede. Le immagini servono a rappresentare il prodotto; colori e resa possono variare leggermente a seconda dello schermo. I prezzi sono in euro e comprendono l'IVA. La spedizione in Italia è gratuita. Il prezzo applicato è quello indicato nella nostra conferma d'ordine.</p>`)}
      ${sec('contratto', '4. Come si conclude il contratto', `<p>Il riepilogo che invii su WhatsApp dal sito è una richiesta d'ordine, non un ordine concluso. Il contratto si conclude quando Vesuvio Sleep ti invia la conferma scritta (su WhatsApp o per email) con prodotti, prezzo totale, modalità di pagamento e di consegna. Fino ad allora nessuna delle due parti è vincolata. Conserva la conferma: è il riepilogo del contratto.</p>`)}
      ${sec('pagamento', '5. Pagamento', `<p>Puoi pagare in contrassegno, al momento della consegna, oppure con bonifico bancario sugli estremi indicati nella conferma d'ordine. Nel caso del bonifico, la merce viene spedita dopo il pagamento e ricevi la bolla di spedizione. Sul sito non si effettuano pagamenti. ${a(P.payments, 'Dettagli sui pagamenti')}.</p>`)}
      ${sec('consegna', '6. Consegna', `<p>Consegniamo in Italia, isole comprese, senza costi di spedizione. I materassi sono prodotti su ordinazione; i tempi indicativi sono comunicati con la conferma d'ordine. A Napoli consegniamo con il nostro furgone, con consegna al piano, ritiro dell'usato e montaggio delle reti. Il rischio di perdita o danneggiamento passa a te quando ricevi il prodotto. ${a(P.shipping, 'Spedizioni e consegna')}.</p>`)}
      ${sec('misura', '7. Prodotti su misura', `<p>I prodotti fuori misura o con altezze personalizzate sono realizzati su tue specifiche, in base a un preventivo che accetti espressamente. Controlla con attenzione le misure prima della conferma: per questi prodotti il diritto di recesso è escluso, salvo difetti.</p>`)}
      ${sec('recesso', '8. Recesso', `<p>Il consumatore ha 14 giorni dalla consegna per recedere dall'acquisto dei prodotti in misura standard. Le spese di restituzione sono a carico del consumatore. Condizioni, esclusioni e modulo: ${a(P.returns, 'Resi e recesso')}.</p>`)}
      ${sec('garanzia', '9. Garanzia', `<p>Si applica la garanzia legale di conformità di 2 anni prevista dal Codice del Consumo. ${a(P.warranty, 'Come funziona')}.</p>`)}
      ${sec('dati', '10. Dati personali', `<p>I dati personali sono trattati come descritto nell'${a(P.privacy, 'informativa sulla privacy')}.</p>`)}
      ${sec('controversie', '11. Reclami e controversie', `<p>Per qualsiasi reclamo scrivici a ${CONTACT.email} o su WhatsApp: rispondiamo nel più breve tempo possibile.</p>
        <p>Il consumatore può ricorrere alle procedure di risoluzione extragiudiziale delle controversie (ADR) presso gli organismi iscritti nell'elenco tenuto dal Ministero delle Imprese e del Made in Italy, consultabile sul sito del Ministero. Resta fermo il diritto di rivolgersi al giudice ordinario.</p>
        <p>Per le controversie con un consumatore è competente il giudice del luogo di residenza o domicilio del consumatore.</p>`)}
      ${sec('legge', '12. Legge applicabile', `<p>Il contratto è regolato dalla legge italiana, fatte salve le norme più favorevoli al consumatore. Il contratto è concluso in lingua italiana.</p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.privacy]: {
    nav: 'Privacy',
    h1: 'Informativa sulla privacy',
    metaTitle: 'Informativa sulla privacy',
    description: 'Come Vesuvio Sleep tratta i dati di chi visita il sito, chiede un preventivo o ordina: finalità, basi giuridiche, conservazione e diritti.',
    lead: 'Raccogliamo solo i dati che servono a risponderti e a consegnare.',
    legal: true,
    body: () => `${toc([['titolare', 'Titolare'], ['quali', 'Quali dati trattiamo'], ['perche', 'Finalità e basi giuridiche'], ['terzi', 'Servizi di terzi'], ['destinatari', 'A chi li comunichiamo'], ['conservazione', 'Per quanto tempo'], ['diritti', 'I tuoi diritti']])}
      ${sec('titolare', 'Titolare del trattamento', `<p>${CONTACT.legalName}, ${CONTACT.address}, Partita IVA ${CONTACT.vat}. Per ogni richiesta sulla privacy: ${mail()}, telefono ${tel()}.</p>`)}
      ${sec('quali', 'Quali dati trattiamo', `<p><strong>Navigazione.</strong> Come ogni sito, i server che ospitano il sito registrano dati tecnici delle visite (indirizzo IP, data e ora, pagina richiesta, tipo di browser), usati per far funzionare il sito e per la sua sicurezza.</p>
        <p><strong>Carrello e preferenze.</strong> Il carrello e alcune impostazioni sono salvati solo nel tuo browser (memoria locale): non ci vengono inviati finché non li mandi tu. Le risposte allo Sleep Match restano nella pagina e non vengono salvate.</p>
        <p><strong>Richieste dal sito.</strong> Quando invii un riepilogo o una richiesta di preventivo, registriamo prodotti, misure, prezzi, note che scrivi e un numero di riferimento. Il sito non ti chiede nome, telefono o indirizzo.</p>
        <p><strong>Comunicazioni e ordini.</strong> Se ci scrivi su WhatsApp, per email o ci chiami, trattiamo i dati che ci fornisci: nome, numero di telefono, indirizzo di consegna, eventuali dati per la fattura e il contenuto dei messaggi.</p>`)}
      ${sec('perche', 'Finalità e basi giuridiche', `<ul><li>Rispondere alle tue richieste, preparare preventivi, gestire ordini, consegne, resi e garanzia: esecuzione di un contratto o di misure precontrattuali (art. 6.1.b GDPR).</li><li>Adempiere agli obblighi fiscali e contabili: obbligo di legge (art. 6.1.c).</li><li>Proteggere il sito da abusi e difendere i nostri diritti: legittimo interesse (art. 6.1.f).</li></ul>
        <p>Non usiamo i tuoi dati per pubblicità, non li vendiamo e non facciamo profilazione. Non prendiamo decisioni basate unicamente su trattamenti automatizzati.</p>`)}
      ${sec('terzi', 'Servizi di terzi', `<p><strong>WhatsApp.</strong> Se scegli di inviare la richiesta su WhatsApp, lasci il nostro sito e usi il servizio di WhatsApp (Meta), che tratta i dati secondo la propria informativa. Puoi sempre scegliere email o telefono.</p>
        <p><strong>Caratteri tipografici.</strong> Il sito carica i caratteri dal servizio Google Fonts: il tuo browser si collega ai server di Google, che ricevono il tuo indirizzo IP.</p>
        <p><strong>Mappe.</strong> La mappa di Google Maps nella pagina dello showroom si carica solo se premi «Mostra la mappa interattiva»: da quel momento, e per la visita in corso, Google riceve il tuo indirizzo IP e può usare cookie secondo la propria informativa. Prima del clic nessun dato arriva a Google. I pulsanti "Indicazioni stradali" aprono Google Maps o Apple Mappe in una nuova pagina.</p>
        <p><strong>Recensioni.</strong> Se mostriamo le recensioni di Google, le legge il nostro server: il tuo browser non si collega a Google per vederle.</p>
        <p><strong>Database del sito.</strong> Catalogo, prezzi e richieste stanno su Supabase (Supabase Inc.), che ospita il nostro database: il tuo browser vi si collega per leggere il catalogo e ricontrollare il carrello, e Supabase riceve il tuo indirizzo IP. Agisce come responsabile del trattamento.</p>
        <p>Questi servizi possono trasferire dati fuori dall'Unione Europea, in particolare negli Stati Uniti, sulla base del Data Privacy Framework UE-USA o di clausole contrattuali standard.</p>`)}
      ${sec('destinatari', 'A chi li comunichiamo', `<p>Solo a chi ci serve per fornirti il servizio: corrieri per la consegna, banca per i pagamenti, consulenti fiscali, fornitori tecnici del sito (hosting). Agiscono come responsabili del trattamento o come titolari autonomi. Non diffondiamo i tuoi dati.</p>`)}
      ${sec('conservazione', 'Per quanto tempo', `<p>I dati di ordini e fatture sono conservati per 10 anni, come prevede la legge. Le richieste e i preventivi che non diventano ordini sono conservati per 12 mesi. I dati di navigazione sono conservati per il tempo strettamente necessario alla sicurezza del sito.</p>`)}
      ${sec('diritti', 'I tuoi diritti', `<p>Puoi chiedere in qualsiasi momento l'accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e opporti al trattamento basato sul legittimo interesse (artt. 15–22 GDPR), scrivendo a ${mail()}. Hai il diritto di proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>`)}
      <p>Per gli strumenti di memorizzazione usati dal sito vedi la ${a(P.cookies, 'cookie policy')}.</p>
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.cookies]: {
    nav: 'Cookie',
    h1: 'Cookie policy',
    metaTitle: 'Cookie policy',
    description: 'Il sito Vesuvio Sleep usa solo strumenti tecnici necessari (carrello e preferenze salvati nel browser): nessun cookie di profilazione o di statistica di terze parti.',
    lead: 'Solo strumenti tecnici: nessuna profilazione, nessuna pubblicità.',
    legal: true,
    body: () => `${sec('cosa', 'Cosa usa il sito', `<p>Il sito non usa cookie di profilazione, pubblicitari o di statistica. Usa solo strumenti tecnici, necessari a farlo funzionare, che salvano dati nel tuo browser:</p>
        <div class="table-scroll"><table class="size-table"><thead><tr><th>Nome</th><th>Tipo</th><th>A cosa serve</th><th>Durata</th></tr></thead><tbody>
        <tr><td>vs-cart-v1</td><td>Memoria locale</td><td>Ricorda gli articoli nel carrello</td><td>Finché non svuoti il carrello o i dati del browser</td></tr>
        <tr><td>vs-preview-db-v1</td><td>Memoria locale</td><td>Copia del catalogo per caricare le pagine più velocemente</td><td>Finché non cancelli i dati del browser</td></tr>
        <tr><td>vs-review</td><td>Memoria di sessione</td><td>Collega il riepilogo al suo numero di riferimento</td><td>Fino alla chiusura della scheda</td></tr>
        </tbody></table></div>
        <p>Per gli strumenti tecnici non serve il consenso, per questo il sito non mostra un banner. Se in futuro aggiungeremo strumenti di statistica o di marketing, ti chiederemo prima il consenso.</p>`)}
      ${sec('terzi', 'Servizi esterni', `<p>Il sito carica i caratteri tipografici da Google Fonts, che riceve l'indirizzo IP del tuo browser. La mappa di Google Maps si carica solo se la chiedi con il pulsante, e da quel momento Google può usare i suoi cookie. I collegamenti a WhatsApp, Google Maps e Apple Mappe aprono servizi esterni, con le loro regole sui cookie. Vedi l'${a(P.privacy, 'informativa sulla privacy')}.</p>`)}
      ${sec('gestire', 'Come cancellarli', `<p>Puoi cancellare in qualsiasi momento i dati salvati dal sito dalle impostazioni del browser (cronologia o dati dei siti). In quel caso il carrello si svuota.</p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.guides]: {
    nav: 'Guide',
    h1: 'Guide per scegliere il materasso',
    metaTitle: 'Guide: come scegliere materasso, misura e tecnologia',
    description: 'Come scegliere il materasso giusto, le differenze tra Memory Foam, molle insacchettate e poliuretano, e le misure dei materassi spiegate dalla fabbrica Vesuvio Sleep.',
    lead: 'Quello che diciamo ai clienti in showroom, scritto.',
    type: 'guides',
    body: () => `<div class="guide-list">
      <a class="guide-card" href="${u('/guide/come-scegliere-il-materasso/')}"><h2>Come scegliere il materasso</h2><p>Posizione nel sonno, corporatura, chi dorme in due, caldo e freddo: i criteri che contano davvero.</p><span>Leggi la guida</span></a>
      <a class="guide-card" href="${u('/guide/materasso-memory-molle-o-poliuretano/')}"><h2>Memory, molle o poliuretano?</h2><p>Le tre tecnologie a confronto, con pregi e limiti di ciascuna.</p><span>Leggi la guida</span></a>
      <a class="guide-card" href="${u(P.sizes)}"><h2>Le misure dei materassi</h2><p>Singolo, piazza e mezza, francese, matrimoniale, King Size: le 13 misure in scala.</p><span>Apri la guida</span></a>
    </div>`,
  },

  '/guide/come-scegliere-il-materasso/': {
    nav: 'Come scegliere il materasso',
    parent: [P.guides, 'Guide'],
    h1: 'Come scegliere il materasso',
    metaTitle: 'Come scegliere il materasso: la guida della fabbrica',
    description: 'Come scegliere il materasso giusto: posizione nel sonno, corporatura, rigidità, chi dorme in due, caldo e freddo, misura e altezza. La guida di Vesuvio Sleep.',
    lead: 'I criteri che usiamo in showroom, in ordine di importanza.',
    type: 'article',
    body: () => `${toc([['posizione', 'Come dormi'], ['corporatura', 'Corporatura e sostegno'], ['coppia', 'Se dormite in due'], ['temperatura', 'Caldo o freddo'], ['misura', 'Misura e altezza'], ['provare', 'Provarlo'], ['rete', 'Non dimenticare la rete']])}
      <p>Non esiste il materasso migliore in assoluto: esiste quello giusto per come dormi tu. Questi sono i criteri da considerare, nell'ordine in cui li valutiamo con i clienti in showroom.</p>
      ${sec('posizione', '1. Come dormi', `<p>Chi dorme <strong>sul fianco</strong> carica spalle e fianchi: in genere sta meglio con una superficie che accoglie, come il Memory Foam, che si adatta alla forma del corpo. Chi dorme <strong>sulla schiena</strong> cerca un equilibrio tra sostegno e comfort. Chi dorme <strong>a pancia in giù</strong> di solito preferisce un materasso più sostenuto, che non lasci affondare il bacino.</p>`)}
      ${sec('corporatura', '2. Corporatura e sostegno', `<p>Più il peso è elevato, più conta il sostegno: un materasso troppo morbido cede e la schiena non resta allineata. Per corporature robuste valuta un modello sostenuto o un'altezza maggiore. Una corporatura leggera può invece apprezzare un materasso più accogliente.</p>`)}
      ${sec('coppia', '3. Se dormite in due', `<p>Se uno dei due si muove molto, contano l'indipendenza delle zone e la stabilità. Le <strong>molle insacchettate</strong> lavorano una per una e trasmettono meno movimento; anche le schiume ad alta densità sono stabili. Se avete esigenze diverse, scegliete un modello di compromesso e una misura generosa: un matrimoniale da 160 o un 180×200.</p>`)}
      ${sec('temperatura', '4. Caldo o freddo', `<p>Il Memory Foam avvolge e tende a trattenere più calore; le molle lasciano circolare più aria. Un materasso reversibile, con un lato invernale e uno estivo, come il ${a(L.duo, 'Vesuvio Memory Duo')}, aiuta a gestire le stagioni.</p>`)}
      ${sec('misura', '5. Misura e altezza', `<p>Il materasso va scelto sulla misura <strong>interna</strong> del letto o della rete, non su quella esterna della struttura. Per la lunghezza, conta almeno 15–20 cm in più della tua altezza: per chi è alto, meglio un 200 cm. Le ${a(P.sizes, '13 misure standard')} si confrontano in scala; se il letto non è standard, c'è il ${a(P.quote, 'materasso su misura')}.</p>
        <p>L'altezza del materasso incide sul comfort percepito e sul sostegno; verifica anche che il letto la possa contenere.</p>`)}
      ${sec('provare', '6. Provarlo', `<p>La prova resta il metodo migliore: sdraiati qualche minuto nella posizione in cui dormi davvero. Nel nostro ${a(P.showroom, 'showroom di Casoria')} puoi provare tutti i modelli. Se non puoi venire, il ${a(P.sleepMatch, 'Sleep Match')} ti propone un modello in poche domande.</p>`)}
      ${sec('rete', '7. Non dimenticare la rete', `<p>Un buon materasso su una rete stanca o deformata lavora male. Una ${a('/reti/', 'rete a doghe')} della stessa misura completa il letto.</p>`)}
      <p class="small muted">Questa guida dà indicazioni generali di comfort. In caso di dolori o problemi alla schiena, chiedi consiglio al tuo medico.</p>`,
  },

  '/guide/materasso-memory-molle-o-poliuretano/': {
    nav: 'Memory, molle o poliuretano',
    parent: [P.guides, 'Guide'],
    h1: 'Materasso in Memory Foam, a molle o in poliuretano?',
    metaTitle: 'Memory Foam, molle o poliuretano: differenze',
    description: 'Le differenze tra materassi in Memory Foam, a molle insacchettate e in poliuretano espanso: sostegno, accoglienza, calore e per chi è adatto ciascuno.',
    lead: 'Tre tecnologie, tre caratteri diversi.',
    type: 'article',
    body: () => `${toc([['poliuretano', 'Poliuretano espanso'], ['memory', 'Memory Foam'], ['molle', 'Molle insacchettate'], ['confronto', 'In sintesi']])}
      ${sec('poliuretano', 'Poliuretano espanso', `<p>È una schiuma che, ad alta densità, offre un sostegno uniforme e stabile. Non si modella sul corpo come il Memory: risponde in modo più diretto. È la scelta più essenziale e conveniente, adatta a chi cerca un letto solido e a chi preferisce non "affondare".</p>
        <p>Il nostro modello: ${a(L.eco, 'Vesuvio Eco')}, anima monoblocco in poliuretano ad alta densità, in tre altezze (H20, H25, H30).</p>`)}
      ${sec('memory', 'Memory Foam', `<p>Il Memory Foam reagisce al calore e al peso del corpo e ne segue la forma, distribuendo la pressione: per questo è <strong>accogliente</strong> e piace a chi dorme sul fianco. Tende a trattenere più calore delle molle. Nei materassi è di solito uno strato di comfort sopra una base portante più rigida.</p>
        <p>I nostri modelli: ${a(L.duoClassic, 'Vesuvio Memory Duo Classic')}, Memory su base in poliuretano con rivestimento fisso; ${a(L.duo, 'Vesuvio Memory Duo')}, lo stesso sfoderabile e reversibile estate-inverno; ${a(L.trio, 'Vesuvio Memory Trio')}, tre strati di Memory per 27 cm.</p>`)}
      ${sec('molle', 'Molle insacchettate', `<p>Ogni molla è chiusa nel suo sacchetto e lavora in modo indipendente: il materasso si adatta per zone e trasmette poco il movimento a chi dorme accanto. Tra le molle circola aria, quindi resta più fresco. Spesso le molle si uniscono a uno strato di Memory: è quello che chiamiamo Hybrid.</p>
        <p>I nostri modelli: ${a(L.p1600, 'Vesuvio Pocket 1600')}, 1600 molle insacchettate alto 25 cm; ${a(L.pocket, 'Vesuvio Pocket 3000 Elite')}, 3000 molle con uno strato di comfort in Memory Foam.</p>`)}
      ${sec('confronto', 'In sintesi', `<div class="table-scroll"><table class="size-table"><thead><tr><th></th><th>Poliuretano</th><th>Memory Foam</th><th>Molle insacchettate</th></tr></thead><tbody>
        <tr><th scope="row">Sensazione</th><td>Stabile, diretta</td><td>Accogliente, avvolgente</td><td>Elastica, per zone</td></tr>
        <tr><th scope="row">Calore</th><td>Neutro</td><td>Trattiene di più</td><td>Più fresco</td></tr>
        <tr><th scope="row">In due</th><td>Stabile</td><td>Stabile</td><td>Movimento poco trasmesso</td></tr>
        <tr><th scope="row">Da noi</th><td>${a(L.eco, 'Eco')}</td><td>${a(L.duoClassic, 'Memory Duo Classic')}, ${a(L.duo, 'Memory Duo')}, ${a(L.trio, 'Memory Trio')}</td><td>${a(L.p1600, 'Pocket 1600')}, ${a(L.pocket, 'Pocket 3000 Elite')}</td></tr>
        </tbody></table></div>
        <p>Per affiancare i modelli caratteristica per caratteristica c'è il ${a(P.compare, 'confronto')}; per una proposta su misura, lo ${a(P.sleepMatch, 'Sleep Match')}.</p>`)}`,
  },
};

/** Testo aggiuntivo per pagine già esistenti (guida misure, su misura, showroom, sleep match, confronto). */
const VIEW_SEO = {
  home: {
    metaTitle: 'Materassi di fabbrica a Napoli, dal 1986',
    description: 'Materassi prodotti a Casoria (Napoli) e venduti a prezzo di fabbrica: Memory Foam, molle e poliuretano. Spedizione gratuita, paghi alla consegna.',
  },
  [P.sleepMatch]: {
    metaTitle: 'Sleep Match: trova il materasso adatto a te',
    description: 'Rispondi a qualche domanda su come dormi: Sleep Match ti propone un solo materasso Vesuvio Sleep, con il perché. Le risposte non vengono salvate.',
  },
  [P.compare]: {
    metaTitle: 'Confronta i materassi: caratteristiche e prezzi',
    description: 'Confronta i materassi Vesuvio Sleep fianco a fianco: tecnologia, composizione, altezze, rivestimento, rigidità indicativa e prezzi di fabbrica.',
  },
  [P.sizes]: {
    metaTitle: 'Misure dei materassi: guida e confronto in scala',
    description: 'Le 13 misure dei materassi, dal singolo 80×190 al King Size 180×200: nomi, dimensioni e confronto in scala vista dall’alto. Come misurare il letto.',
  },
  [P.quote]: {
    metaTitle: 'Materassi su misura e fuori misura: preventivo',
    description: 'Materassi su misura e con altezze personalizzate, prodotti nella fabbrica di Casoria (Napoli). Indica misure e modello: ti mandiamo il preventivo su WhatsApp.',
  },
  [P.offers]: {
    metaTitle: 'Letto completo: materasso e rete insieme costano meno',
    description: 'Materasso e rete della stessa misura, prodotti nella fabbrica di Casoria: insieme costano meno che separati. Letti già composti e Componi il tuo letto.',
  },
  [P.showroom]: {
    metaTitle: 'Showroom e fabbrica di materassi a Casoria (Napoli)',
    description: 'Prova i materassi nello showroom della fabbrica Vesuvio Sleep, Via Raffaele Salierno 38, Casoria (NA). Aperto lun–ven 9–18 e sabato 10–14.',
  },
};

__exp.CONTACT = CONTACT;
__exp.applySettings = applySettings;
__exp.waHref = waHref;
__exp.PAYMENT_METHODS = PAYMENT_METHODS;
__exp.LEGAL_UPDATED = LEGAL_UPDATED;
__exp.FAQ = FAQ;
__exp.faqForLd = faqForLd;
__exp.CATEGORY_SEO = CATEGORY_SEO;
__exp.PAGES = PAGES;
__exp.VIEW_SEO = VIEW_SEO;
});
__def("seed.js", function (__exp) {
// Generato da scripts/build_seed.py dal listino confermato del 15/11/2026. Non modificare a mano.
const SEED = {
 "version": "seed-2026-11-17a",
 "catalog_version": "catalogo-2026-11-17a",
 "authoritative": true,
 "categories": [
  {
   "slug": "materassi",
   "kind": "materasso",
   "name": "Materassi",
   "sort": 1,
   "status": "published",
   "description": "Poliuretano, Memory Foam e molle insacchettate, prodotti nella nostra fabbrica di Casoria.",
   "id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7"
  },
  {
   "slug": "reti",
   "kind": "rete",
   "name": "Reti",
   "sort": 2,
   "status": "published",
   "description": "Reti a doghe in acciaio e legno, con piedi inclusi.",
   "id": "081007a7-5196-569c-97e5-d95d486d696c"
  },
  {
   "slug": "topper",
   "kind": "topper",
   "name": "Topper",
   "sort": 3,
   "status": "published",
   "description": "Topper in Memory Foam alto 5 cm, in tutte le misure dei nostri materassi.",
   "id": "8d155eb6-483a-5b06-93c4-d5c96794fa0d"
  },
  {
   "slug": "guanciali",
   "kind": "guanciale",
   "name": "Guanciali",
   "sort": 4,
   "status": "published",
   "description": "Guanciali in piuma e in Memory.",
   "id": "d13d67b4-9aa1-5b1d-b636-53db094666e6"
  },
  {
   "slug": "letti-a-castello",
   "kind": "letto",
   "name": "Letti a castello",
   "sort": 5,
   "status": "draft",
   "description": "Letti a castello in acciaio.",
   "id": "f2317874-21e7-594e-982e-5154d66caf0a"
  }
 ],
 "products": [
  {
   "id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "slug": "eco",
   "technical_name": "Poliuretano espanso",
   "short": "Poliuretano espanso ad alta densità: sostegno uniforme e stabile, in tre altezze.",
   "description": "L'anima monoblocco in poliuretano ad alta densità e alta portanza dà un sostegno uniforme, stabile e duraturo. È il modello più essenziale della gamma, disponibile in H20, H25 e H30. Il rivestimento non è sfoderabile.",
   "composition": "Anima monoblocco in poliuretano ad alta densità e alta portanza.",
   "highlights": [
    "Anima monoblocco ad alta densità",
    "Tre altezze: H20, H25, H30",
    "Sostegno uniforme"
   ],
   "claims": [
    "antiacaro",
    "ipoallergenico",
    "Free Humidity"
   ],
   "removable_cover": false,
   "reversible": false,
   "summer_winter": false,
   "hybrid": false,
   "firmness_display": "Medio-rigido",
   "line_code": "ESS",
   "status": "published",
   "sort": 1,
   "lead_time": "Produzione in circa 2 giorni prima della spedizione",
   "match": {
    "tech": "foam",
    "welcome": 0,
    "ventilation": false,
    "independent_springs": false
   },
   "internal_notes": "Rinominato da \"Vesuvio Essential Foam\" il 16/11/2026 su indicazione dell'azienda. Il vecchio indirizzo /materassi/essential-foam/ reindirizza qui. Da verificare: il nome \"Eco\" e' una denominazione commerciale, sul sito non e' accompagnato da alcuna dichiarazione ambientale perche' non ne abbiamo di documentate.",
   "bundle_family": "foam",
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Eco"
  },
  {
   "id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "slug": "memory-duo",
   "technical_name": "Memory Foam 2 strati",
   "short": "Memory Foam su base in poliuretano ad alta densità. Sfoderabile e reversibile.",
   "description": "Uno strato di comfort in Memory Foam poggia su una base portante in poliuretano ad alta densità. È più accogliente dell'Eco ed è reversibile: un lato invernale in Memory e un lato più fresco per l'estate. Il rivestimento è sfoderabile.",
   "composition": "Memory Foam premium ad alta densità + base di supporto in poliuretano ad alta densità.",
   "highlights": [
    "Memory Foam 2 strati",
    "Lato invernale e lato estivo",
    "Sfoderabile"
   ],
   "claims": [
    "antiacaro",
    "ipoallergenico",
    "Free Humidity"
   ],
   "removable_cover": true,
   "reversible": true,
   "summer_winter": true,
   "hybrid": false,
   "firmness_display": "Medio-rigido e accogliente",
   "line_code": "MD",
   "status": "published",
   "sort": 3,
   "lead_time": "Produzione in circa 2 giorni prima della spedizione",
   "match": {
    "tech": "memory",
    "welcome": 2,
    "ventilation": false,
    "independent_springs": false
   },
   "internal_notes": "H30 indicata dall'azienda la sera del 16/11/2026. Un solo valore corretto su autorizzazione: il 160x190 in H30 era scritto 329 euro, unico prezzo dei materassi non multiplo di 10, tra un 290 e un 340: portato a 330. Da ricontrollare al prossimo listino.",
   "bundle_family": "foam",
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Memory Duo"
  },
  {
   "id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "slug": "memory-duo-classic",
   "technical_name": "Memory Foam 2 strati",
   "short": "La costruzione del Memory Duo, con il rivestimento fisso.",
   "description": "Stessa costruzione del Vesuvio Memory Duo: uno strato di comfort in Memory Foam su una base portante in poliuretano ad alta densità. Qui il rivestimento è fisso, non sfoderabile, ed è diverso da quello del Memory Duo: lo vedi nelle foto.",
   "composition": "Memory Foam premium ad alta densità + base di supporto in poliuretano ad alta densità.",
   "highlights": [
    "Memory Foam 2 strati",
    "Rivestimento fisso"
   ],
   "claims": [],
   "removable_cover": false,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "MDC",
   "status": "published",
   "sort": 2,
   "lead_time": "Produzione in circa 2 giorni prima della spedizione",
   "match": {
    "tech": "memory",
    "welcome": 2,
    "ventilation": false,
    "independent_springs": false
   },
   "internal_notes": "Aggiunto il 16/11/2026 su indicazione dell'azienda. Foto consegnate la sera del 16/11/2026: il tessuto porta la scritta \"Bamboo\", che la scheda non riprende perche' non e' una caratteristica verificata. DA CONFERMARE: che sia il tessuto di questo modello. Prezzi: Memory Duo sfoderabile meno 20 euro per ogni misura, confermati dall'azienda la sera del 16/11/2026 rimandando indietro il listino. Da confermare: se è reversibile estate/inverno come lo sfoderabile e quali claim valgono per questo tessuto.",
   "bundle_family": "foam",
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Memory Duo Classic"
  },
  {
   "id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "slug": "pocket-3000-elite",
   "technical_name": "3000 molle insacchettate + Memory",
   "short": "3000 molle insacchettate e Memory Foam: il nostro Hybrid più sostenuto.",
   "description": "Molle indipendenti insacchettate, uno strato di comfort in Memory Foam ed elementi in poliuretano ad alta densità per stabilizzazione e supporto. Pensato per chi cerca più sostegno e per chi dorme in due. Rivestimento sfoderabile.",
   "composition": "3000 molle insacchettate, Memory Foam ed elementi in poliuretano ad alta densità.",
   "highlights": [
    "3000 molle insacchettate",
    "Strato di comfort in Memory",
    "Sfoderabile"
   ],
   "claims": [
    "antiacaro",
    "ipoallergenico",
    "Free Humidity"
   ],
   "removable_cover": true,
   "reversible": false,
   "summer_winter": false,
   "hybrid": true,
   "firmness_display": "Sostenuto / medio-rigido",
   "line_code": "P3000",
   "status": "published",
   "sort": 6,
   "lead_time": "Produzione in circa 2 giorni prima della spedizione",
   "match": {
    "tech": "molle",
    "welcome": 1,
    "ventilation": false,
    "independent_springs": true
   },
   "internal_notes": "Storico del nome: \"Pocket 2400 Elite\" fino al 15/11/2026, \"Pocket 2600 Elite\" fino al 16/11/2026, poi \"Pocket 3000 Elite\" su indicazione dell'azienda. DA VERIFICARE PRIMA DEL LANCIO: il numero di molle pubblicato e a quale misura si riferisce; le foto in scheda sono quelle scattate il 15/11/2026. Prezzi H25 del 16/11/2026: ricostruiti in proporzione dal listino portando il 160x190 a 620 euro (fattore 1,1273) e CONFERMATI dall'azienda la sera del 16/11 rimandando indietro il listino. H30 indicata dall'azienda la sera del 16/11.",
   "bundle_family": "pocket",
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Pocket 3000 Elite"
  },
  {
   "id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "slug": "pocket-1600",
   "technical_name": "1600 molle insacchettate",
   "short": "1600 molle insacchettate, alto 25 cm: l'ingresso nella gamma a molle.",
   "description": "Materasso a molle indipendenti insacchettate alto 25 cm, prodotto nella nostra fabbrica di Casoria. È il modello a molle più essenziale della gamma: stesso principio del Pocket 3000 Elite, con un numero di molle inferiore.",
   "composition": "Molle insacchettate.",
   "highlights": [
    "1600 molle insacchettate",
    "Altezza 25 cm"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "P1600",
   "status": "published",
   "sort": 5,
   "lead_time": "Produzione in circa 2 giorni prima della spedizione",
   "match": {
    "tech": "molle",
    "welcome": 1,
    "ventilation": false,
    "independent_springs": true
   },
   "internal_notes": "Rientrato in catalogo il 16/11/2026 (era archiviato dalla mattina dello stesso giorno). Prezzi H25 del 16/11/2026: ricostruiti in proporzione dal listino portando il 160x190 a 500 euro (fattore 1,1111) e CONFERMATI dall'azienda la sera del 16/11. H30 indicata la stessa sera. Un solo valore corretto su autorizzazione: in H30 il 160x190 era scritto 540 euro, piu del 160x200 e del 165x190 (530), cioe il prezzo scendeva al crescere della misura. Portato a 520, cioe H25 (500) piu 20 euro, lo scarto H25->H30 di 9 misure su 13 di questo modello: ristabilisce anche l'ordine 520 < 530 = 530, come in H25 (500 < 510 = 510). Da ricontrollare al prossimo listino. DA VERIFICARE PRIMA DEL LANCIO: il numero di molle pubblicato e la composizione di dettaglio. Foto consegnate la sera del 16/11/2026: il tessuto porta la scritta \"Antibatterico\", che la scheda non riprende perche' non e' una caratteristica verificata. DA CONFERMARE: che sia il tessuto di questo modello.",
   "bundle_family": "pocket",
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Pocket 1600"
  },
  {
   "id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "slug": "memory-trio",
   "technical_name": "Memory Foam 3 strati",
   "short": "Tre strati di Memory Foam, alto 27 cm: il più accogliente della gamma in schiuma.",
   "description": "Tre strati di Memory Foam per un totale di 27 cm di altezza, prodotto nella nostra fabbrica di Casoria. Dove il Memory Duo ha un solo strato di comfort sopra la base, qui gli strati sono tre: l'accoglienza è più progressiva e il materasso è più alto.",
   "composition": "Memory Foam, 3 strati.",
   "highlights": [
    "Memory Foam a 3 strati",
    "Altezza 27 cm"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "MF3",
   "status": "published",
   "sort": 4,
   "lead_time": "Produzione in circa 2 giorni prima della spedizione",
   "match": {
    "tech": "memory",
    "welcome": 1.5,
    "ventilation": false,
    "independent_springs": false
   },
   "internal_notes": "Rinominato da \"Memory Foam 3 strati\" (nome di listino) a \"Vesuvio Memory Trio\" il 16/11/2026: il nome richiama il Memory Duo e dichiara i tre strati. Il vecchio indirizzo reindirizza qui. DA VERIFICARE PRIMA DEL LANCIO: la composizione di dettaglio dei tre strati e se è sfoderabile. Foto consegnate la sera del 16/11/2026: il tessuto porta la scritta \"Grafeno\", ripetuta sul piano. L'immagine era marcata \"non associare ad alcun prodotto\" nel MEDIA_MANIFEST del 15/11, con riserva \"fino a istruzioni successive\": l'azienda le ha assegnate a questo modello la sera del 16/11. La scheda non riprende la scritta, perche' il grafene non e' una caratteristica verificata. DA CONFERMARE: che sia il tessuto di questo modello.",
   "bundle_family": "foam",
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Memory Trio"
  },
  {
   "id": "df39f46d-9932-5856-ab3a-43855690494c",
   "slug": "memory-air-3d",
   "technical_name": "Memory + fascia 3D",
   "short": "Memory Foam e poliuretano ad alta densità con fascia perimetrale 3D traspirante.",
   "description": "Memory Foam e poliuretano ad alta densità, con una fascia perimetrale 3D traspirante che favorisce la ventilazione laterale. Reversibile con lato invernale e lato estivo, rivestimento sfoderabile.",
   "composition": "Memory Foam premium + poliuretano ad alta densità + fascia perimetrale 3D traspirante.",
   "highlights": [
    "Fascia perimetrale 3D traspirante",
    "Lato invernale e lato estivo",
    "Sfoderabile"
   ],
   "claims": [
    "antiacaro",
    "ipoallergenico",
    "Free Humidity",
    "fascia 3D traspirante"
   ],
   "removable_cover": true,
   "reversible": true,
   "summer_winter": true,
   "hybrid": false,
   "firmness_display": "Medio-rigido",
   "line_code": "MA3D",
   "status": "archived",
   "sort": 6,
   "lead_time": null,
   "match": {
    "tech": "memory",
    "welcome": 1.5,
    "ventilation": true,
    "independent_springs": false
   },
   "internal_notes": "Fuori gamma dal 16/11/2026: non compare nell'elenco dei prodotti indicato dall'azienda. Archiviato, non compare sul sito. Si ripubblica da Admin se rientra in gamma.",
   "bundle_family": "foam",
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Memory Air 3D"
  },
  {
   "id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "slug": "bonnell-classic",
   "technical_name": "Molle Bonnell",
   "short": "Molle Bonnell.",
   "description": "",
   "composition": "Molle Bonnell.",
   "highlights": [],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "BON",
   "status": "archived",
   "sort": 7,
   "lead_time": null,
   "match": null,
   "internal_notes": "Fuori gamma dal 16/11/2026: non compare nell'elenco dei prodotti indicato dall'azienda. Archiviato, non compare sul sito. Si ripubblica da Admin se rientra in gamma.",
   "bundle_family": null,
   "category_id": "9cd67f1e-437e-55f2-a4f8-4ebf83864bd7",
   "name": "Vesuvio Bonnell Classic"
  },
  {
   "id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "slug": "rete-flex",
   "technical_name": "Rete a doghe",
   "short": "Acciaio e doghe in legno, piedi inclusi.",
   "description": "Telaio in acciaio ad alta resistenza e doghe in legno, pensato per distribuire il carico in modo uniforme. Piedi inclusi.",
   "composition": "Acciaio e doghe in legno, piedi inclusi.",
   "highlights": [
    "Portata alta",
    "Piedi inclusi",
    "Telaio in acciaio",
    "Doghe in legno"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "FLEX",
   "status": "published",
   "sort": 10,
   "lead_time": null,
   "match": null,
   "internal_notes": "Portata \"alta\" indicata dal titolare il 17/11/2026; il valore in kg non e' verificato: non pubblicarlo.",
   "bundle_family": null,
   "category_id": "081007a7-5196-569c-97e5-d95d486d696c",
   "name": "Vesuvio Rete Flex"
  },
  {
   "id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "slug": "rete-strong",
   "technical_name": "Rete rinforzata",
   "short": "Acciaio rinforzato e doghe in legno, piedi inclusi.",
   "description": "Struttura rinforzata in acciaio e piano a doghe in legno ad alta stabilità, per chi cerca un supporto più robusto. Piedi inclusi.",
   "composition": "Acciaio rinforzato e doghe in legno, piedi inclusi.",
   "highlights": [
    "Portata alta",
    "Piedi inclusi",
    "Telaio in acciaio",
    "Doghe in legno"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "STRONG",
   "status": "published",
   "sort": 11,
   "lead_time": null,
   "match": null,
   "internal_notes": "Portata \"alta\" indicata dal titolare il 17/11/2026; il valore in kg non e' verificato: non pubblicarlo.",
   "bundle_family": null,
   "category_id": "081007a7-5196-569c-97e5-d95d486d696c",
   "name": "Vesuvio Rete Strong"
  },
  {
   "id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "slug": "topper-memory-cloud-5",
   "technical_name": "Topper Memory Foam H5",
   "short": "Topper in Memory Foam alto 5 cm, sfoderabile.",
   "description": "Topper in Memory Foam alto 5 cm con rivestimento sfoderabile, nelle stesse misure dei nostri materassi.",
   "composition": "Memory Foam, altezza 5 cm.",
   "highlights": [
    "Altezza 5 cm",
    "Sfoderabile"
   ],
   "claims": [],
   "removable_cover": true,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "MC5",
   "status": "published",
   "sort": 20,
   "lead_time": "Produzione in circa 2 giorni prima della spedizione",
   "match": null,
   "internal_notes": "Altezza 5 cm confermata (il valore 80 del file originario era un errore). SKU VS-TOP-MC5-… proposto. Foto consegnate la sera del 16/11/2026: il tessuto porta la scritta \"Aloe Vera\", che la scheda non riprende perche' non e' una caratteristica verificata. Nessuna delle due e' un primo piano del tessuto: la seconda mostra la cerniera sul bordo ed e' usata nello spazio \"dettaglio\". DA CONFERMARE il tessuto.",
   "bundle_family": null,
   "category_id": "8d155eb6-483a-5b06-93c4-d5c96794fa0d",
   "name": "Vesuvio Topper Memory Cloud 5"
  },
  {
   "id": "f9a95603-b52f-5fc2-ab32-a49cc2918f34",
   "slug": "guanciale-piuma",
   "technical_name": "Guanciale in piuma",
   "short": "Guanciale imbottito in piuma, morbido e leggero.",
   "description": "Il guanciale tradizionale: imbottitura in piuma, soffice e leggero. Alto 12 cm.",
   "composition": "Piuma.",
   "highlights": [
    "Alto 12 cm",
    "Piuma"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "PIUMA",
   "status": "published",
   "sort": 30,
   "lead_time": null,
   "match": null,
   "internal_notes": "Prezzo PROVVISORIO dal 17/11/2026: media dei concorrenti meno 10 %, da confermare o correggere da Admin. Misure (larghezza x lunghezza) da confermare. Foto generata con AI.",
   "bundle_family": null,
   "category_id": "d13d67b4-9aa1-5b1d-b636-53db094666e6",
   "name": "Vesuvio Piuma"
  },
  {
   "id": "f18a729c-0e68-54f0-b748-72904165b275",
   "slug": "guanciale-memory-flakes",
   "technical_name": "Guanciale in fiocchi di memory foam",
   "short": "Fiocchi di Memory Foam che si modellano sotto la testa.",
   "description": "Imbottito con fiocchi di Memory Foam: si lascia modellare e si adatta alla posizione della testa. Alto 12 cm.",
   "composition": "Fiocchi di Memory Foam.",
   "highlights": [
    "Alto 12 cm",
    "Fiocchi di Memory Foam"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "MFLAKES",
   "status": "published",
   "sort": 31,
   "lead_time": null,
   "match": null,
   "internal_notes": "Prezzo PROVVISORIO dal 17/11/2026: media dei concorrenti meno 10 %, da confermare o correggere da Admin. Misure (larghezza x lunghezza) da confermare. Foto generata con AI.",
   "bundle_family": null,
   "category_id": "d13d67b4-9aa1-5b1d-b636-53db094666e6",
   "name": "Vesuvio Memory Flakes"
  },
  {
   "id": "85473b6c-22b0-51a4-9f3d-34b9bb1dd6c6",
   "slug": "guanciale-memory-classic",
   "technical_name": "Guanciale in memory foam",
   "short": "Memory Foam a forma rettangolare, sostegno uniforme.",
   "description": "Guanciale in Memory Foam a forma rettangolare: accoglie la testa e la sostiene in modo uniforme. Alto 12 cm.",
   "composition": "Memory Foam.",
   "highlights": [
    "Alto 12 cm",
    "Memory Foam"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "MCLASSIC",
   "status": "published",
   "sort": 32,
   "lead_time": null,
   "match": null,
   "internal_notes": "Prezzo PROVVISORIO dal 17/11/2026: media dei concorrenti meno 10 %, da confermare o correggere da Admin. Misure (larghezza x lunghezza) da confermare. Foto generata con AI.",
   "bundle_family": null,
   "category_id": "d13d67b4-9aa1-5b1d-b636-53db094666e6",
   "name": "Vesuvio Memory Classic"
  },
  {
   "id": "97116d49-df22-5e8e-8419-28d3b7acee61",
   "slug": "guanciale-memory-cervical",
   "technical_name": "Guanciale in memory foam",
   "short": "Memory Foam con profilo a onda per il collo.",
   "description": "Guanciale in Memory Foam con profilo a onda, che segue la curva del collo. Alto 12 cm.",
   "composition": "Memory Foam.",
   "highlights": [
    "Alto 12 cm",
    "Memory Foam"
   ],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "MCERV",
   "status": "published",
   "sort": 33,
   "lead_time": null,
   "match": null,
   "internal_notes": "Prezzo PROVVISORIO dal 17/11/2026: media dei concorrenti meno 10 %, da confermare o correggere da Admin. Misure (larghezza x lunghezza) da confermare. Foto generata con AI.",
   "bundle_family": null,
   "category_id": "d13d67b4-9aa1-5b1d-b636-53db094666e6",
   "name": "Vesuvio Memory Cervical"
  },
  {
   "id": "776e1cc9-7936-5184-8e16-a64dafe637fc",
   "slug": "castello-steel",
   "technical_name": "Letto a castello in acciaio",
   "short": "",
   "description": "",
   "composition": "",
   "highlights": [],
   "claims": [],
   "removable_cover": null,
   "reversible": null,
   "summer_winter": null,
   "hybrid": false,
   "firmness_display": null,
   "line_code": "CAST",
   "status": "draft",
   "sort": 50,
   "lead_time": null,
   "match": null,
   "internal_notes": "Sospeso: misure e prezzi non presenti nel listino.",
   "bundle_family": null,
   "category_id": "f2317874-21e7-594e-982e-5154d66caf0a",
   "name": "Vesuvio Castello Steel"
  }
 ],
 "variants": [
  {
   "id": "967ac953-0a53-5ea1-842a-87457ad13631",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-80190",
   "size": "80x190",
   "height_cm": 20,
   "price_cents": 9000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2000
  },
  {
   "id": "4bda343f-7a8d-50d8-a1e6-da83a5573bbc",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-80200",
   "size": "80x200",
   "height_cm": 20,
   "price_cents": 10000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2001
  },
  {
   "id": "f166d8dd-af00-5b0d-a691-54cc69193e18",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-90190",
   "size": "90x190",
   "height_cm": 20,
   "price_cents": 12000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2002
  },
  {
   "id": "86593d8a-85f3-5cfa-814e-67bcd38c59bb",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-90200",
   "size": "90x200",
   "height_cm": 20,
   "price_cents": 12000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2003
  },
  {
   "id": "dc177db7-99c3-5981-aa02-90392ef21579",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-120190",
   "size": "120x190",
   "height_cm": 20,
   "price_cents": 15000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2004
  },
  {
   "id": "12138515-1e55-58ef-9fc6-ddd0233b014b",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-120200",
   "size": "120x200",
   "height_cm": 20,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2005
  },
  {
   "id": "00995cda-3a8e-5bd8-bd1d-6748a34358e1",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-140190",
   "size": "140x190",
   "height_cm": 20,
   "price_cents": 18000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2006
  },
  {
   "id": "2c6e9b61-1842-5f68-8aca-2f09eb3896ee",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-140200",
   "size": "140x200",
   "height_cm": 20,
   "price_cents": 19000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2007
  },
  {
   "id": "e1f4457e-1833-585f-8391-b04aee3c90fa",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-160190",
   "size": "160x190",
   "height_cm": 20,
   "price_cents": 20000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2008
  },
  {
   "id": "47efbaa1-90e3-5bd6-92ea-054124448fd3",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-160200",
   "size": "160x200",
   "height_cm": 20,
   "price_cents": 21000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2009
  },
  {
   "id": "281d2fa5-b5d6-5771-9b32-d1777eb2bc2b",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-165190",
   "size": "165x190",
   "height_cm": 20,
   "price_cents": 21000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2010
  },
  {
   "id": "6fb21ecc-da10-5a0e-8e7e-8c1997800e41",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-170200",
   "size": "170x200",
   "height_cm": 20,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2011
  },
  {
   "id": "7fdeedb3-ed4e-52b7-8bba-12c14ca8e15e",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H20-180200",
   "size": "180x200",
   "height_cm": 20,
   "price_cents": 24000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2012
  },
  {
   "id": "8f22d685-b565-57c0-b79b-847d1691110f",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-80190",
   "size": "80x190",
   "height_cm": 25,
   "price_cents": 10000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2500
  },
  {
   "id": "88261464-5140-546e-b89f-9cd614959665",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-80200",
   "size": "80x200",
   "height_cm": 25,
   "price_cents": 11000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2501
  },
  {
   "id": "61292c63-b611-5918-add2-de689ce83e9b",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-90190",
   "size": "90x190",
   "height_cm": 25,
   "price_cents": 13000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2502
  },
  {
   "id": "7ffc23fc-d981-5978-86ad-c7ec31b571ec",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-90200",
   "size": "90x200",
   "height_cm": 25,
   "price_cents": 14000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2503
  },
  {
   "id": "5649b20e-6d40-5ddb-8975-97432b06dd34",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-120190",
   "size": "120x190",
   "height_cm": 25,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2504
  },
  {
   "id": "48e13675-fd61-5339-88d9-69cbd91a2b76",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-120200",
   "size": "120x200",
   "height_cm": 25,
   "price_cents": 17000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2505
  },
  {
   "id": "c3892485-0c58-5992-ba44-01c1f026262f",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-140190",
   "size": "140x190",
   "height_cm": 25,
   "price_cents": 21000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2506
  },
  {
   "id": "628b70cc-c3bf-5227-94bf-28c956a6567f",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-140200",
   "size": "140x200",
   "height_cm": 25,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2507
  },
  {
   "id": "7ed042bd-4890-5b06-a64f-cab9a98d57bd",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-160190",
   "size": "160x190",
   "height_cm": 25,
   "price_cents": 25000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2508
  },
  {
   "id": "bffa01b8-2aec-5865-90b9-39ac5d43f9c8",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-160200",
   "size": "160x200",
   "height_cm": 25,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2509
  },
  {
   "id": "298eb18a-9b4a-51f3-a5a4-a10709706a82",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-165190",
   "size": "165x190",
   "height_cm": 25,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2510
  },
  {
   "id": "f68c1efc-c58f-5a0a-86f5-e698b0ac6d12",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-170200",
   "size": "170x200",
   "height_cm": 25,
   "price_cents": 29000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2511
  },
  {
   "id": "eebae259-0c6f-566b-9968-baa103e8b0fa",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H25-180200",
   "size": "180x200",
   "height_cm": 25,
   "price_cents": 32000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2512
  },
  {
   "id": "93a39ffe-dbdf-555a-81fc-66c33bf0e842",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-80190",
   "size": "80x190",
   "height_cm": 30,
   "price_cents": 12000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3000
  },
  {
   "id": "4a0cd80f-5d03-521d-89a4-069b84b01cd7",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-80200",
   "size": "80x200",
   "height_cm": 30,
   "price_cents": 13000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3001
  },
  {
   "id": "3d62be22-9b6e-5e0c-acd5-d1eec3c7c067",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-90190",
   "size": "90x190",
   "height_cm": 30,
   "price_cents": 15000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3002
  },
  {
   "id": "8460dec7-9a2d-54f3-9e16-a5413184c2de",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-90200",
   "size": "90x200",
   "height_cm": 30,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3003
  },
  {
   "id": "17910dc0-b163-5522-90eb-b11e880d6099",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-120190",
   "size": "120x190",
   "height_cm": 30,
   "price_cents": 20000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3004
  },
  {
   "id": "cc1d0947-90aa-5675-bf62-4d59e9d0da8c",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-120200",
   "size": "120x200",
   "height_cm": 30,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3005
  },
  {
   "id": "e37be91f-073e-547a-9b74-b3ffea3a3906",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-140190",
   "size": "140x190",
   "height_cm": 30,
   "price_cents": 25000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3006
  },
  {
   "id": "103727f2-ff08-5ab7-8159-97b8a13a1758",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-140200",
   "size": "140x200",
   "height_cm": 30,
   "price_cents": 27000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3007
  },
  {
   "id": "7a334ab9-0540-5041-9719-1c91189cef27",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-160190",
   "size": "160x190",
   "height_cm": 30,
   "price_cents": 27000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3008
  },
  {
   "id": "62d8aa28-5e0a-5d53-b51c-68b59fdd0b5a",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-160200",
   "size": "160x200",
   "height_cm": 30,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3009
  },
  {
   "id": "0334ab51-93ac-53c8-bfdd-575e4ec51c9f",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-165190",
   "size": "165x190",
   "height_cm": 30,
   "price_cents": 29000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3010
  },
  {
   "id": "85306b32-53e5-58ab-a8d8-9367f60b65c2",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-170200",
   "size": "170x200",
   "height_cm": 30,
   "price_cents": 32000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3011
  },
  {
   "id": "09dad827-458b-55d9-9edd-219735dcb4fd",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "sku": "VS-ESS-H30-180200",
   "size": "180x200",
   "height_cm": 30,
   "price_cents": 34000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3012
  },
  {
   "id": "8a07ccf3-5cd6-58d0-bc48-1257490fc198",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-80190",
   "size": "80x190",
   "height_cm": 25,
   "price_cents": 13000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2500
  },
  {
   "id": "1aa4442f-fc03-51c9-b108-0bd535d53f81",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-80200",
   "size": "80x200",
   "height_cm": 25,
   "price_cents": 14000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2501
  },
  {
   "id": "d5c06986-dca2-513a-b225-0a52e49e0624",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-90190",
   "size": "90x190",
   "height_cm": 25,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2502
  },
  {
   "id": "d60ca066-91a7-54ad-9e7e-ae82281f6ba0",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-90200",
   "size": "90x200",
   "height_cm": 25,
   "price_cents": 17000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2503
  },
  {
   "id": "71f5694c-3599-5043-85a4-ac11fdfdf21d",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-120190",
   "size": "120x190",
   "height_cm": 25,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2504
  },
  {
   "id": "869f7b89-0091-5129-baea-8948d97f9b58",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-120200",
   "size": "120x200",
   "height_cm": 25,
   "price_cents": 23000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2505
  },
  {
   "id": "d6e4ba31-b18f-5982-8c5a-d513657494ad",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-140190",
   "size": "140x190",
   "height_cm": 25,
   "price_cents": 25000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2506
  },
  {
   "id": "102ff4ac-7532-541b-a9df-e9e9e8c1efeb",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-140200",
   "size": "140x200",
   "height_cm": 25,
   "price_cents": 26000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2507
  },
  {
   "id": "7c8cca5e-98c7-572d-a0ae-aa1945ee7ee3",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-160190",
   "size": "160x190",
   "height_cm": 25,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2508
  },
  {
   "id": "5590a36b-5b66-5f0b-b7bd-d34a3ccb5979",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-160200",
   "size": "160x200",
   "height_cm": 25,
   "price_cents": 30000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2509
  },
  {
   "id": "3bdb5528-b3ba-5f3e-8dae-29a508421e0b",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-165190",
   "size": "165x190",
   "height_cm": 25,
   "price_cents": 31000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2510
  },
  {
   "id": "5a5ec3d2-ed2a-5f0e-82e7-1ae8ce4f0934",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-170200",
   "size": "170x200",
   "height_cm": 25,
   "price_cents": 33000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2511
  },
  {
   "id": "72a56946-5058-5490-8699-d7a144b932f7",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H25-180200",
   "size": "180x200",
   "height_cm": 25,
   "price_cents": 35000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2512
  },
  {
   "id": "21d34678-1dd3-53d5-ab78-881279b038ca",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-80190",
   "size": "80x190",
   "height_cm": 30,
   "price_cents": 15000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3000
  },
  {
   "id": "3489d6ac-cedf-5285-97c9-2262cb78b842",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-80200",
   "size": "80x200",
   "height_cm": 30,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3001
  },
  {
   "id": "36b021a1-313e-5506-a2c4-8074a6740706",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-90190",
   "size": "90x190",
   "height_cm": 30,
   "price_cents": 18000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3002
  },
  {
   "id": "43e04bcf-bfc3-5b64-b6f8-2bc323ab6f81",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-90200",
   "size": "90x200",
   "height_cm": 30,
   "price_cents": 19000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3003
  },
  {
   "id": "08c23783-b9ca-55b2-ae77-6b2c9482d548",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-120190",
   "size": "120x190",
   "height_cm": 30,
   "price_cents": 25000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3004
  },
  {
   "id": "b6c41eab-4d8d-5d29-b8fe-29afd0151384",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-120200",
   "size": "120x200",
   "height_cm": 30,
   "price_cents": 26000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3005
  },
  {
   "id": "4c1c1ea5-475e-5f8f-8ff6-a71d39bb094b",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-140190",
   "size": "140x190",
   "height_cm": 30,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3006
  },
  {
   "id": "44c2a81c-ed84-553d-a8d4-c6ed74bbda79",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-140200",
   "size": "140x200",
   "height_cm": 30,
   "price_cents": 29000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3007
  },
  {
   "id": "ebc7977a-0c23-5fd7-8c18-9f4662aba37d",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-160190",
   "size": "160x190",
   "height_cm": 30,
   "price_cents": 33000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3008
  },
  {
   "id": "1b6e06e9-8bd1-563e-9d0e-1f5f6c284383",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-160200",
   "size": "160x200",
   "height_cm": 30,
   "price_cents": 34000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3009
  },
  {
   "id": "30d018fd-e567-5e03-ba8a-278bd2ed08ea",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-165190",
   "size": "165x190",
   "height_cm": 30,
   "price_cents": 34000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3010
  },
  {
   "id": "e624e310-22d3-5c69-9b3f-0def88b27fa7",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-170200",
   "size": "170x200",
   "height_cm": 30,
   "price_cents": 36000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3011
  },
  {
   "id": "c8fd204f-ee7f-5ccc-8cd8-be87fa029bad",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "sku": "VS-MD-H30-180200",
   "size": "180x200",
   "height_cm": 30,
   "price_cents": 39000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3012
  },
  {
   "id": "d6530707-1d4f-5cb7-8dbd-d0446136e0ff",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-80190",
   "size": "80x190",
   "height_cm": 25,
   "price_cents": 11000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2500
  },
  {
   "id": "b08afda4-ac33-5362-83f8-0630cdf6ed61",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-80200",
   "size": "80x200",
   "height_cm": 25,
   "price_cents": 12000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2501
  },
  {
   "id": "c13170ca-60e3-5b6b-bd6d-16a924e3885b",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-90190",
   "size": "90x190",
   "height_cm": 25,
   "price_cents": 14000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2502
  },
  {
   "id": "9e238e4f-d889-5e6d-9bf5-56a8939da0fd",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-90200",
   "size": "90x200",
   "height_cm": 25,
   "price_cents": 15000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2503
  },
  {
   "id": "cf380a68-c459-5570-a1d2-be8a60d1959d",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-120190",
   "size": "120x190",
   "height_cm": 25,
   "price_cents": 20000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2504
  },
  {
   "id": "e3780998-635d-58ca-b71d-82ab1e837282",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-120200",
   "size": "120x200",
   "height_cm": 25,
   "price_cents": 21000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2505
  },
  {
   "id": "5bbfb28f-3678-5afd-ba9a-1eb94e7672f6",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-140190",
   "size": "140x190",
   "height_cm": 25,
   "price_cents": 23000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2506
  },
  {
   "id": "c6e5766e-0aac-5a83-858e-10ecc213d5ed",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-140200",
   "size": "140x200",
   "height_cm": 25,
   "price_cents": 24000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2507
  },
  {
   "id": "8950dbb4-7f1e-5c3b-b091-3ba9b577a2eb",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-160190",
   "size": "160x190",
   "height_cm": 25,
   "price_cents": 26000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2508
  },
  {
   "id": "e0d86319-fe5f-54cb-ba8b-a08bec346668",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-160200",
   "size": "160x200",
   "height_cm": 25,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2509
  },
  {
   "id": "dcc35ffb-a7c2-5d9b-96af-8520cf48ea0d",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-165190",
   "size": "165x190",
   "height_cm": 25,
   "price_cents": 29000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2510
  },
  {
   "id": "346212dd-5ff4-540f-915c-3277e56dfa3e",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-170200",
   "size": "170x200",
   "height_cm": 25,
   "price_cents": 31000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2511
  },
  {
   "id": "5f16949d-30ec-539e-9ce9-f19eaa52bcaa",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "sku": "VS-MDC-H25-180200",
   "size": "180x200",
   "height_cm": 25,
   "price_cents": 33000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2512
  },
  {
   "id": "1635c6ff-6e59-55aa-9755-efdef865c4af",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-80190",
   "size": "80x190",
   "height_cm": 25,
   "price_cents": 23000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2500
  },
  {
   "id": "b3c69c9d-3050-512b-918a-cf112126038a",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-80200",
   "size": "80x200",
   "height_cm": 25,
   "price_cents": 25000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2501
  },
  {
   "id": "493f6329-4356-54b6-aee2-f3cfa42af332",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-90190",
   "size": "90x190",
   "height_cm": 25,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2502
  },
  {
   "id": "ebeae128-c635-5af6-b718-bf9943d6dd09",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-90200",
   "size": "90x200",
   "height_cm": 25,
   "price_cents": 29000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2503
  },
  {
   "id": "365033c4-e02e-5a78-aaac-889c1fa15fab",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-120190",
   "size": "120x190",
   "height_cm": 25,
   "price_cents": 39000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2504
  },
  {
   "id": "99870793-5975-5943-bbc2-1c9a2e838394",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-120200",
   "size": "120x200",
   "height_cm": 25,
   "price_cents": 41000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2505
  },
  {
   "id": "be76be28-9784-586a-8cf8-88b8d84bd4c3",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-140190",
   "size": "140x190",
   "height_cm": 25,
   "price_cents": 47000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2506
  },
  {
   "id": "b74c2958-3113-5303-9bd5-ff2850b3e84d",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-140200",
   "size": "140x200",
   "height_cm": 25,
   "price_cents": 48000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2507
  },
  {
   "id": "b94d3907-7679-5648-8a7d-ae1767aa2f38",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-160190",
   "size": "160x190",
   "height_cm": 25,
   "price_cents": 62000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2508
  },
  {
   "id": "484140db-74e3-5357-af10-f03025525941",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-160200",
   "size": "160x200",
   "height_cm": 25,
   "price_cents": 63000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2509
  },
  {
   "id": "9ca88932-2563-53df-bc6d-8a00d1c8f239",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-165190",
   "size": "165x190",
   "height_cm": 25,
   "price_cents": 63000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2510
  },
  {
   "id": "d3c4d2fd-319e-5a1f-be14-0898fe6bbf20",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-170200",
   "size": "170x200",
   "height_cm": 25,
   "price_cents": 68000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2511
  },
  {
   "id": "d9c74290-5732-5513-85a4-a1f7a09dd6a2",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H25-180200",
   "size": "180x200",
   "height_cm": 25,
   "price_cents": 73000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2512
  },
  {
   "id": "7286e0b5-2edc-5ae0-bcf7-8be1b5d53632",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-80190",
   "size": "80x190",
   "height_cm": 30,
   "price_cents": 26000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3000
  },
  {
   "id": "51376a20-0d3d-55ce-a0b0-7527e492100e",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-80200",
   "size": "80x200",
   "height_cm": 30,
   "price_cents": 27000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3001
  },
  {
   "id": "67bc4c5e-5427-5a4f-8596-c3b7e2e6210d",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-90190",
   "size": "90x190",
   "height_cm": 30,
   "price_cents": 30000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3002
  },
  {
   "id": "a52c256d-f083-5609-854c-f9984f69d22b",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-90200",
   "size": "90x200",
   "height_cm": 30,
   "price_cents": 31000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3003
  },
  {
   "id": "d437f8d7-77d6-5276-ad19-fc9c5ac00321",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-120190",
   "size": "120x190",
   "height_cm": 30,
   "price_cents": 42000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3004
  },
  {
   "id": "6d3fefbd-16b0-5032-b34e-bf94f9154700",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-120200",
   "size": "120x200",
   "height_cm": 30,
   "price_cents": 44000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3005
  },
  {
   "id": "a658f207-4fe6-5de5-b70d-fa66cf816adc",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-140190",
   "size": "140x190",
   "height_cm": 30,
   "price_cents": 50000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3006
  },
  {
   "id": "c756ba68-5e6a-59e8-94d2-003418853c6f",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-140200",
   "size": "140x200",
   "height_cm": 30,
   "price_cents": 52000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3007
  },
  {
   "id": "ea8206d8-905a-50fc-8fbe-22195cda7704",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-160190",
   "size": "160x190",
   "height_cm": 30,
   "price_cents": 65000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3008
  },
  {
   "id": "f40e62b8-d446-550d-9914-2361947fed6d",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-160200",
   "size": "160x200",
   "height_cm": 30,
   "price_cents": 66000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3009
  },
  {
   "id": "8ec3a81a-05e5-573f-8d53-eafa93158568",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-165190",
   "size": "165x190",
   "height_cm": 30,
   "price_cents": 66000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3010
  },
  {
   "id": "118000ae-9fe7-57b7-8ba3-769a02acd488",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-170200",
   "size": "170x200",
   "height_cm": 30,
   "price_cents": 72000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3011
  },
  {
   "id": "e35e9379-4a29-57af-aaa6-b0d794d54de3",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "sku": "VS-P3000-H30-180200",
   "size": "180x200",
   "height_cm": 30,
   "price_cents": 80000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3012
  },
  {
   "id": "a5b3abfc-9968-57d2-9d7d-6999c941c581",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-80190",
   "size": "80x190",
   "height_cm": 25,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2500
  },
  {
   "id": "fa586bbf-6536-5250-828a-ce413197d6a9",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-80200",
   "size": "80x200",
   "height_cm": 25,
   "price_cents": 24000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2501
  },
  {
   "id": "06d92d1f-0a6e-5e4a-80ee-990f4e93ef98",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-90190",
   "size": "90x190",
   "height_cm": 25,
   "price_cents": 27000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2502
  },
  {
   "id": "691b9046-9401-591b-bbd3-012dcd30f233",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-90200",
   "size": "90x200",
   "height_cm": 25,
   "price_cents": 28000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2503
  },
  {
   "id": "1b16ed89-2f4e-58d1-a571-bae714410524",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-120190",
   "size": "120x190",
   "height_cm": 25,
   "price_cents": 39000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2504
  },
  {
   "id": "29b846f4-d529-5bf0-ad74-9b0ea97af288",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-120200",
   "size": "120x200",
   "height_cm": 25,
   "price_cents": 40000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2505
  },
  {
   "id": "9a59d6f3-1fdd-555a-b0a7-6c2bc200e709",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-140190",
   "size": "140x190",
   "height_cm": 25,
   "price_cents": 42000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2506
  },
  {
   "id": "e2ee03b9-da11-55d6-a730-b795d6959645",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-140200",
   "size": "140x200",
   "height_cm": 25,
   "price_cents": 44000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2507
  },
  {
   "id": "ab57b3ce-1cc5-58dc-a2e1-612614d9cebf",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-160190",
   "size": "160x190",
   "height_cm": 25,
   "price_cents": 50000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2508
  },
  {
   "id": "736ec404-b9a6-5896-a08d-528c0a9739c0",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-160200",
   "size": "160x200",
   "height_cm": 25,
   "price_cents": 51000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2509
  },
  {
   "id": "d0756e61-1bf9-5c84-a2f5-e528299f8c97",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-165190",
   "size": "165x190",
   "height_cm": 25,
   "price_cents": 51000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2510
  },
  {
   "id": "ad3ae3ea-a037-5782-9a5e-e3eb35cbd6d8",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-170200",
   "size": "170x200",
   "height_cm": 25,
   "price_cents": 53000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2511
  },
  {
   "id": "6f9ef276-6be3-5c4d-a328-c6e3d6ed6c9d",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H25-180200",
   "size": "180x200",
   "height_cm": 25,
   "price_cents": 58000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2512
  },
  {
   "id": "7ba990fc-3a86-53bc-82d4-5b22b9b7f149",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-80190",
   "size": "80x190",
   "height_cm": 30,
   "price_cents": 24000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3000
  },
  {
   "id": "86652a03-f4a9-5b0f-948a-84b75d748384",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-80200",
   "size": "80x200",
   "height_cm": 30,
   "price_cents": 26000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3001
  },
  {
   "id": "15ea634e-ef9e-5a43-9cbf-c92ba1c4c619",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-90190",
   "size": "90x190",
   "height_cm": 30,
   "price_cents": 29000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3002
  },
  {
   "id": "73b1d071-9059-5610-9a9e-a21356e21a6c",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-90200",
   "size": "90x200",
   "height_cm": 30,
   "price_cents": 31000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3003
  },
  {
   "id": "b5642e1b-8349-5e90-9420-19c1ff56a7f7",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-120190",
   "size": "120x190",
   "height_cm": 30,
   "price_cents": 42000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3004
  },
  {
   "id": "657fbb0a-3689-59ff-9e16-5abc31ec31cd",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-120200",
   "size": "120x200",
   "height_cm": 30,
   "price_cents": 42000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3005
  },
  {
   "id": "ba5c1c10-6086-5ea8-8d17-32b7526ed41a",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-140190",
   "size": "140x190",
   "height_cm": 30,
   "price_cents": 44000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3006
  },
  {
   "id": "3a9f558b-a10e-5ef2-8827-86595005ea78",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-140200",
   "size": "140x200",
   "height_cm": 30,
   "price_cents": 45000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3007
  },
  {
   "id": "18d25f34-e226-5de6-b314-fdb0b451d639",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-160190",
   "size": "160x190",
   "height_cm": 30,
   "price_cents": 52000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3008
  },
  {
   "id": "918a2681-c27f-52fd-a721-5637a9774c6c",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-160200",
   "size": "160x200",
   "height_cm": 30,
   "price_cents": 53000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3009
  },
  {
   "id": "c1a4834a-3333-5953-89d6-a0f787480288",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-165190",
   "size": "165x190",
   "height_cm": 30,
   "price_cents": 53000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3010
  },
  {
   "id": "cf81b548-7c68-5a7e-8b33-f0d85e16f26b",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-170200",
   "size": "170x200",
   "height_cm": 30,
   "price_cents": 55000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3011
  },
  {
   "id": "f35faa70-ca85-54b1-a160-c35a76ea2033",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "sku": "VS-P1600-H30-180200",
   "size": "180x200",
   "height_cm": 30,
   "price_cents": 60000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3012
  },
  {
   "id": "73a2a46a-0abd-57dd-970e-63c14de13324",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-80190",
   "size": "80x190",
   "height_cm": 27,
   "price_cents": 17000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2700
  },
  {
   "id": "1340ba9f-bb3d-5a61-a3d1-a5a1369713fd",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-80200",
   "size": "80x200",
   "height_cm": 27,
   "price_cents": 18000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2701
  },
  {
   "id": "03a47485-d4d2-5746-98fb-e16ddb48b094",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-90190",
   "size": "90x190",
   "height_cm": 27,
   "price_cents": 20000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2702
  },
  {
   "id": "312b4110-8a2a-5461-87e5-273b9d3852aa",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-90200",
   "size": "90x200",
   "height_cm": 27,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2703
  },
  {
   "id": "abc49987-504d-59f6-9938-e675ccf6f1f8",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-120190",
   "size": "120x190",
   "height_cm": 27,
   "price_cents": 26000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2704
  },
  {
   "id": "02fcc7c9-ab50-52bd-9a05-b5f35c28d9c6",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-120200",
   "size": "120x200",
   "height_cm": 27,
   "price_cents": 30000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2705
  },
  {
   "id": "210cfaba-358a-5303-b98a-97b0d93449c4",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-140190",
   "size": "140x190",
   "height_cm": 27,
   "price_cents": 34000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2706
  },
  {
   "id": "a6fd524b-b377-5079-8032-b91955dd97e7",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-140200",
   "size": "140x200",
   "height_cm": 27,
   "price_cents": 35000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2707
  },
  {
   "id": "aa57d316-cf9f-5bb8-9a17-59720839c465",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-160190",
   "size": "160x190",
   "height_cm": 27,
   "price_cents": 40000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2708
  },
  {
   "id": "1128f8cc-65c6-5eca-898a-8e9d06ea706e",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-160200",
   "size": "160x200",
   "height_cm": 27,
   "price_cents": 42000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2709
  },
  {
   "id": "9d594b5b-555c-507e-a11b-153ad0b6c75d",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-165190",
   "size": "165x190",
   "height_cm": 27,
   "price_cents": 42000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2710
  },
  {
   "id": "74a3e781-85e3-50a7-9ae9-925a64351743",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-170200",
   "size": "170x200",
   "height_cm": 27,
   "price_cents": 45000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2711
  },
  {
   "id": "d863c23e-be57-5769-b11e-3f2180d7749b",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "sku": "VS-MF3-H27-180200",
   "size": "180x200",
   "height_cm": 27,
   "price_cents": 48000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2712
  },
  {
   "id": "6b7223c1-96db-51d4-aaf4-af12634d0509",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-80190",
   "size": "80x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2500
  },
  {
   "id": "74deb536-261a-532e-b83f-84372c9d7a72",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-80200",
   "size": "80x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2501
  },
  {
   "id": "fdba6b31-40ea-5226-80b3-085eec79dd6b",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-90190",
   "size": "90x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2502
  },
  {
   "id": "43db3f73-2e99-5f0b-8f18-31d2af08a9b0",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-90200",
   "size": "90x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2503
  },
  {
   "id": "9461b4eb-b4da-5aa8-a3b8-473feccf663c",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-120190",
   "size": "120x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2504
  },
  {
   "id": "a181d895-1d6d-53be-91e6-7b37ccc48f52",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-120200",
   "size": "120x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2505
  },
  {
   "id": "3e224857-bced-5d13-8397-d5cff4615458",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-140190",
   "size": "140x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2506
  },
  {
   "id": "b2148e7f-23bd-5661-8337-3512e9d0f9c0",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-140200",
   "size": "140x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2507
  },
  {
   "id": "724992db-f61d-5611-9730-2fa77ddbabb7",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-160190",
   "size": "160x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2508
  },
  {
   "id": "efd57e0a-d972-507b-ae05-9089f686153f",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-160200",
   "size": "160x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2509
  },
  {
   "id": "c34c6f7b-888a-5424-b605-cb1a3978ed6f",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-165190",
   "size": "165x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2510
  },
  {
   "id": "e55ddb0b-6170-5556-bf7d-a7a8215a5943",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-170200",
   "size": "170x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2511
  },
  {
   "id": "0843a6e8-6981-5039-bd3e-ab44168b3481",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H25-180200",
   "size": "180x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2512
  },
  {
   "id": "d03ed27d-b429-5b8d-a6a6-46577a32976a",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-80190",
   "size": "80x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3000
  },
  {
   "id": "2f2193a4-ed86-54cf-ae63-016151a0c458",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-80200",
   "size": "80x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3001
  },
  {
   "id": "814aafc8-c2d7-5c31-a811-7e45dc7d7ab2",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-90190",
   "size": "90x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3002
  },
  {
   "id": "eb03c6f3-1196-5ce4-8115-81f1cbe153af",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-90200",
   "size": "90x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3003
  },
  {
   "id": "bda7a485-a5a9-5575-8307-5172afe7b6a9",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-120190",
   "size": "120x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3004
  },
  {
   "id": "ab852f29-6bde-529d-b346-b19500c71379",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-120200",
   "size": "120x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3005
  },
  {
   "id": "632c1af7-1497-501a-b06b-3f90a5536b99",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-140190",
   "size": "140x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3006
  },
  {
   "id": "12efe86f-00ca-581b-962f-442d075c5f92",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-140200",
   "size": "140x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3007
  },
  {
   "id": "b4e05f7d-f087-5903-92e8-36da3c2a0901",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-160190",
   "size": "160x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3008
  },
  {
   "id": "c3e43ec6-f691-5e9c-8e6a-05755a5f49e3",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-160200",
   "size": "160x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3009
  },
  {
   "id": "02071f19-67b9-5cd9-9b62-d26920a42878",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-165190",
   "size": "165x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3010
  },
  {
   "id": "922d59bf-3f78-5396-8c3c-254f4d6f1995",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-170200",
   "size": "170x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3011
  },
  {
   "id": "d18f949e-d37d-58ba-8d73-7c37f376d6af",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "sku": "VS-MA3D-H30-180200",
   "size": "180x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3012
  },
  {
   "id": "7b41e396-6976-52f7-b61d-fc7a1e9bb19e",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-80190",
   "size": "80x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2500
  },
  {
   "id": "bad112cd-f6ad-5346-8a0a-9186a593665d",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-80200",
   "size": "80x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2501
  },
  {
   "id": "7c424257-80b6-5c93-9078-ca8232ab8b4d",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-90190",
   "size": "90x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2502
  },
  {
   "id": "ecb9858c-f967-5357-93af-70bac7e2f3bf",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-90200",
   "size": "90x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2503
  },
  {
   "id": "009f55e6-5d06-52a7-a433-023ec12a43af",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-120190",
   "size": "120x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2504
  },
  {
   "id": "4340ee8d-6780-5f61-87e4-d8ae8a18f825",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-120200",
   "size": "120x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2505
  },
  {
   "id": "5e9350d5-5f69-5d9a-9b9c-5061ac3f3a32",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-140190",
   "size": "140x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2506
  },
  {
   "id": "ce6e7519-fdb7-5971-b884-dfeba926b2bd",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-140200",
   "size": "140x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2507
  },
  {
   "id": "2f5fc7ea-3b78-5b94-a498-dcd712f1841d",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-160190",
   "size": "160x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2508
  },
  {
   "id": "b4e262e0-003e-59e4-a449-9cc515ad8954",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-160200",
   "size": "160x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2509
  },
  {
   "id": "33227573-8729-5a01-a434-0e8a368d38d9",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-165190",
   "size": "165x190",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2510
  },
  {
   "id": "123de0d7-5bd9-5801-8874-e75f0f0ec0e6",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-170200",
   "size": "170x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2511
  },
  {
   "id": "20f33aea-e800-5c6f-ae7c-7f333d191099",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H25-180200",
   "size": "180x200",
   "height_cm": 25,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 2512
  },
  {
   "id": "f69a0dfd-b530-5e27-af0e-72835edb649e",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-80190",
   "size": "80x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3000
  },
  {
   "id": "03b22514-db8b-5ffd-833d-a3ab560f7b76",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-80200",
   "size": "80x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3001
  },
  {
   "id": "d92fe97d-ba68-5e36-a88a-7ec6aa1d4ca7",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-90190",
   "size": "90x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3002
  },
  {
   "id": "dd33a136-c838-5a9c-8a61-6ffe2234f7b9",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-90200",
   "size": "90x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3003
  },
  {
   "id": "d5aa1b90-acdc-5f70-ac9d-36db0e4f755c",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-120190",
   "size": "120x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3004
  },
  {
   "id": "ed53e96f-9d7f-5d57-aa69-96aa219376c6",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-120200",
   "size": "120x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3005
  },
  {
   "id": "94e5b2d4-3eb8-5527-a8cf-55c3b2969fa8",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-140190",
   "size": "140x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3006
  },
  {
   "id": "19e5e851-2f94-5e64-bbc1-c1aad8b2bebf",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-140200",
   "size": "140x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3007
  },
  {
   "id": "3e94bb4d-43c5-5834-99c0-bd7a53df14e5",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-160190",
   "size": "160x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3008
  },
  {
   "id": "9b54e22e-640c-5fb3-a304-a9f51d32d891",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-160200",
   "size": "160x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3009
  },
  {
   "id": "daeb0a3a-1733-5e89-b5b5-136c39f2d492",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-165190",
   "size": "165x190",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3010
  },
  {
   "id": "a48101bc-e187-5e8e-b292-231aad5268fa",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-170200",
   "size": "170x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3011
  },
  {
   "id": "6ea861e5-7952-5310-96fc-265355da1cc9",
   "product_id": "c27b80ff-9d0f-5bf0-9da5-a9417ad389a3",
   "sku": "VS-BON-H30-180200",
   "size": "180x200",
   "height_cm": 30,
   "price_cents": null,
   "availability": "unavailable",
   "active": true,
   "sort": 3012
  },
  {
   "id": "f1bfae31-2ae0-5ee3-b676-d17b379279f8",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-80190",
   "size": "80x190",
   "height_cm": null,
   "price_cents": 8000,
   "availability": "made_to_order",
   "active": true,
   "sort": 0
  },
  {
   "id": "8231ca2b-8b7a-5f66-8c1d-d7bc51918190",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-80200",
   "size": "80x200",
   "height_cm": null,
   "price_cents": 9000,
   "availability": "made_to_order",
   "active": true,
   "sort": 1
  },
  {
   "id": "78a37f89-cc7a-5de5-a91b-9f6fddc72668",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-90190",
   "size": "90x190",
   "height_cm": null,
   "price_cents": 10000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2
  },
  {
   "id": "2d6a1d0d-77b2-52bf-92b7-9af43e9a0067",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-90200",
   "size": "90x200",
   "height_cm": null,
   "price_cents": 11000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3
  },
  {
   "id": "bfc2a3c6-e670-5a84-abf2-8eacb1493502",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-120190",
   "size": "120x190",
   "height_cm": null,
   "price_cents": 14000,
   "availability": "made_to_order",
   "active": true,
   "sort": 4
  },
  {
   "id": "c2e81072-4ad4-51f5-8656-7426664febf4",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-120200",
   "size": "120x200",
   "height_cm": null,
   "price_cents": 15000,
   "availability": "made_to_order",
   "active": true,
   "sort": 5
  },
  {
   "id": "603907db-0844-5e2a-bd0d-3ab7e58b9416",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-140190",
   "size": "140x190",
   "height_cm": null,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 6
  },
  {
   "id": "e6fa35d0-7c6c-5e68-be83-43615db5b4dd",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-140200",
   "size": "140x200",
   "height_cm": null,
   "price_cents": 17000,
   "availability": "made_to_order",
   "active": true,
   "sort": 7
  },
  {
   "id": "ea787ffc-0f5b-5263-bb49-417c5d41cf15",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-160190",
   "size": "160x190",
   "height_cm": null,
   "price_cents": 18000,
   "availability": "made_to_order",
   "active": true,
   "sort": 8
  },
  {
   "id": "7fc24250-be8f-5f06-8ad7-62044e2f8a25",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-160200",
   "size": "160x200",
   "height_cm": null,
   "price_cents": 19000,
   "availability": "made_to_order",
   "active": true,
   "sort": 9
  },
  {
   "id": "cc11caed-88ee-5072-8eb0-89ccc2283122",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-165190",
   "size": "165x190",
   "height_cm": null,
   "price_cents": 20000,
   "availability": "made_to_order",
   "active": true,
   "sort": 10
  },
  {
   "id": "2581788b-70dd-5e83-9818-73f3efae7ba6",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-170200",
   "size": "170x200",
   "height_cm": null,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 11
  },
  {
   "id": "3d87dc55-a71d-5ecc-a1d8-ccdb30a78354",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "sku": "VS-RETE-FLEX-180200",
   "size": "180x200",
   "height_cm": null,
   "price_cents": 24000,
   "availability": "made_to_order",
   "active": true,
   "sort": 12
  },
  {
   "id": "67cec49a-e4f6-5394-bb07-cb4d544de389",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-80190",
   "size": "80x190",
   "height_cm": null,
   "price_cents": 10000,
   "availability": "made_to_order",
   "active": true,
   "sort": 0
  },
  {
   "id": "abbf3d3d-121c-5bb9-ae80-822db930612e",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-80200",
   "size": "80x200",
   "height_cm": null,
   "price_cents": 11000,
   "availability": "made_to_order",
   "active": true,
   "sort": 1
  },
  {
   "id": "50ca1d1a-17b6-5b2e-b749-ea023e780220",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-90190",
   "size": "90x190",
   "height_cm": null,
   "price_cents": 12000,
   "availability": "made_to_order",
   "active": true,
   "sort": 2
  },
  {
   "id": "fe6151ec-0043-555e-add1-9a9298e6cbb2",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-90200",
   "size": "90x200",
   "height_cm": null,
   "price_cents": 13000,
   "availability": "made_to_order",
   "active": true,
   "sort": 3
  },
  {
   "id": "4fc27aec-26fc-5de8-adcc-0760f084ac19",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-120190",
   "size": "120x190",
   "height_cm": null,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 4
  },
  {
   "id": "50534961-7acc-5705-9008-853473d77158",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-120200",
   "size": "120x200",
   "height_cm": null,
   "price_cents": 17000,
   "availability": "made_to_order",
   "active": true,
   "sort": 5
  },
  {
   "id": "efd10e96-f648-50d1-a3c4-4f0d44a38b80",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-140190",
   "size": "140x190",
   "height_cm": null,
   "price_cents": 18000,
   "availability": "made_to_order",
   "active": true,
   "sort": 6
  },
  {
   "id": "25eaf596-b24d-5fe3-945d-485609f5f964",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-140200",
   "size": "140x200",
   "height_cm": null,
   "price_cents": 19000,
   "availability": "made_to_order",
   "active": true,
   "sort": 7
  },
  {
   "id": "fd01628c-7ec6-50c0-811c-de764a6b313d",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-160190",
   "size": "160x190",
   "height_cm": null,
   "price_cents": 20000,
   "availability": "made_to_order",
   "active": true,
   "sort": 8
  },
  {
   "id": "a1f9b14a-2047-55fb-8851-4845c036d71b",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-160200",
   "size": "160x200",
   "height_cm": null,
   "price_cents": 21900,
   "availability": "made_to_order",
   "active": true,
   "sort": 9
  },
  {
   "id": "7ef9a2e3-b3ea-581a-bc0c-32e6aabb790b",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-165190",
   "size": "165x190",
   "height_cm": null,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 10
  },
  {
   "id": "f50477fd-68b5-5a00-a380-37468523b7f7",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-170200",
   "size": "170x200",
   "height_cm": null,
   "price_cents": 24000,
   "availability": "made_to_order",
   "active": true,
   "sort": 11
  },
  {
   "id": "8b8cd4ad-cfe9-5b79-8eb1-435eb76958a0",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "sku": "VS-RETE-STRONG-180200",
   "size": "180x200",
   "height_cm": null,
   "price_cents": 26000,
   "availability": "made_to_order",
   "active": true,
   "sort": 12
  },
  {
   "id": "6093b019-f4b0-503b-904f-492f4f9b5d7f",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-80190",
   "size": "80x190",
   "height_cm": 5,
   "price_cents": 8000,
   "availability": "made_to_order",
   "active": true,
   "sort": 500
  },
  {
   "id": "f437c0be-c538-5e0a-8161-2e0ed036c94d",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-80200",
   "size": "80x200",
   "height_cm": 5,
   "price_cents": 9000,
   "availability": "made_to_order",
   "active": true,
   "sort": 501
  },
  {
   "id": "78d528d8-1c36-5e5f-8a80-29e47c52a49e",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-90190",
   "size": "90x190",
   "height_cm": 5,
   "price_cents": 11000,
   "availability": "made_to_order",
   "active": true,
   "sort": 502
  },
  {
   "id": "736e01f3-c154-5c9b-9cca-bc7f2e695079",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-90200",
   "size": "90x200",
   "height_cm": 5,
   "price_cents": 12000,
   "availability": "made_to_order",
   "active": true,
   "sort": 503
  },
  {
   "id": "9a47b101-ab93-5271-87ec-fcd1fab25f04",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-120190",
   "size": "120x190",
   "height_cm": 5,
   "price_cents": 14000,
   "availability": "made_to_order",
   "active": true,
   "sort": 504
  },
  {
   "id": "199714c6-6cea-59f3-890d-f1c5463b0d9f",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-120200",
   "size": "120x200",
   "height_cm": 5,
   "price_cents": 15900,
   "availability": "made_to_order",
   "active": true,
   "sort": 505
  },
  {
   "id": "ede0e53d-1fcd-5594-898f-9763616a71a4",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-140190",
   "size": "140x190",
   "height_cm": 5,
   "price_cents": 16000,
   "availability": "made_to_order",
   "active": true,
   "sort": 506
  },
  {
   "id": "18b2a85b-a57b-5698-ae62-19a6a2b5490c",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-140200",
   "size": "140x200",
   "height_cm": 5,
   "price_cents": 17000,
   "availability": "made_to_order",
   "active": true,
   "sort": 507
  },
  {
   "id": "109cf7ea-5312-51cf-88e9-976ca6110dda",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-160190",
   "size": "160x190",
   "height_cm": 5,
   "price_cents": 20000,
   "availability": "made_to_order",
   "active": true,
   "sort": 508
  },
  {
   "id": "bb820515-892e-500b-878c-b40955a737c3",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-160200",
   "size": "160x200",
   "height_cm": 5,
   "price_cents": 21000,
   "availability": "made_to_order",
   "active": true,
   "sort": 509
  },
  {
   "id": "f57ebd61-b403-590e-800c-fda96174a68f",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-165190",
   "size": "165x190",
   "height_cm": 5,
   "price_cents": 22000,
   "availability": "made_to_order",
   "active": true,
   "sort": 510
  },
  {
   "id": "e19963d5-6f92-580a-8494-ad06c1f056f3",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-170200",
   "size": "170x200",
   "height_cm": 5,
   "price_cents": 23000,
   "availability": "made_to_order",
   "active": true,
   "sort": 511
  },
  {
   "id": "712f5c9e-cc0e-517c-a3ef-149fe5a3327d",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "sku": "VS-TOP-MC5-180200",
   "size": "180x200",
   "height_cm": 5,
   "price_cents": 25000,
   "availability": "made_to_order",
   "active": true,
   "sort": 512
  },
  {
   "id": "be829365-9775-566e-93a2-0789c732b598",
   "product_id": "f9a95603-b52f-5fc2-ab32-a49cc2918f34",
   "sku": "VS-GUA-PIUMA",
   "size": null,
   "height_cm": 12,
   "price_cents": 4500,
   "availability": "made_to_order",
   "active": true,
   "sort": 0
  },
  {
   "id": "c1cfd111-fb03-5b25-a8a3-db39a2a54688",
   "product_id": "f18a729c-0e68-54f0-b748-72904165b275",
   "sku": "VS-GUA-MFLAKES",
   "size": null,
   "height_cm": 12,
   "price_cents": 3300,
   "availability": "made_to_order",
   "active": true,
   "sort": 0
  },
  {
   "id": "ad021a28-454c-5012-a35a-760491eb7c16",
   "product_id": "85473b6c-22b0-51a4-9f3d-34b9bb1dd6c6",
   "sku": "VS-GUA-MCLASSIC",
   "size": null,
   "height_cm": 12,
   "price_cents": 3700,
   "availability": "made_to_order",
   "active": true,
   "sort": 0
  },
  {
   "id": "86475a77-f08f-5f9c-9027-bcb8829cff64",
   "product_id": "97116d49-df22-5e8e-8419-28d3b7acee61",
   "sku": "VS-GUA-MCERV",
   "size": null,
   "height_cm": 12,
   "price_cents": 3400,
   "availability": "made_to_order",
   "active": true,
   "sort": 0
  }
 ],
 "media": [
  {
   "id": "e23ffbdd-373d-55d7-af87-74592337274e",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "slot": "hero",
   "src": "img/prodotti/vesuvio-eco/hero-1200.webp",
   "srcset": "img/prodotti/vesuvio-eco/hero-720.webp 720w, img/prodotti/vesuvio-eco/hero-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vesuvio Eco, materasso con rivestimento bianco trapuntato",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": true,
   "published": true,
   "sort": 1,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "4ceb66b1-9ea3-5f99-a743-e14d11b51554",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "slot": "exploded",
   "src": "img/prodotti/vesuvio-eco/exploded-1200.webp",
   "srcset": "img/prodotti/vesuvio-eco/exploded-720.webp 720w, img/prodotti/vesuvio-eco/exploded-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vista esplosa del Vesuvio Eco: rivestimento e anima in poliuretano espanso",
   "caption": "",
   "illustrative": true,
   "fit": "contain",
   "bg": "white",
   "is_cover": false,
   "published": true,
   "sort": 2,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "68244225-5eea-5a18-a485-217f14318ceb",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "slot": "fabric",
   "src": "img/prodotti/vesuvio-eco/detail-1200.webp",
   "srcset": "img/prodotti/vesuvio-eco/detail-720.webp 720w, img/prodotti/vesuvio-eco/detail-1200.webp 1200w",
   "width": 1200,
   "height": 1200,
   "alt": "Dettaglio del rivestimento trapuntato del Vesuvio Eco",
   "caption": "",
   "illustrative": false,
   "fit": "cover",
   "bg": null,
   "is_cover": false,
   "published": true,
   "sort": 3,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "a5c29bbd-033a-53dd-a710-5f863c8cd639",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "slot": "hero",
   "src": "img/prodotti/vesuvio-memory-duo/hero-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-duo/hero-720.webp 720w, img/prodotti/vesuvio-memory-duo/hero-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vesuvio Memory Duo con piano trapuntato bianco e fascia laterale grigio scuro",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": true,
   "published": true,
   "sort": 1,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "6842d8ff-4146-5dda-935d-1efb20e130ab",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "slot": "exploded",
   "src": "img/prodotti/vesuvio-memory-duo/exploded-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-duo/exploded-720.webp 720w, img/prodotti/vesuvio-memory-duo/exploded-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vista esplosa del Vesuvio Memory Duo: rivestimento, strato in Memory Foam e base in poliuretano",
   "caption": "",
   "illustrative": true,
   "fit": "contain",
   "bg": "white",
   "is_cover": false,
   "published": true,
   "sort": 2,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "ac2dd276-65cd-5980-9aef-ea13612596b0",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "slot": "fabric",
   "src": "img/prodotti/vesuvio-memory-duo/detail-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-duo/detail-720.webp 720w, img/prodotti/vesuvio-memory-duo/detail-1200.webp 1200w",
   "width": 1200,
   "height": 1200,
   "alt": "Dettaglio del tessuto e della fascia grigio scuro del Vesuvio Memory Duo",
   "caption": "",
   "illustrative": false,
   "fit": "cover",
   "bg": null,
   "is_cover": false,
   "published": true,
   "sort": 3,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "416304ef-ea1a-51d5-9f3a-a879fb5d44c2",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "slot": "hero",
   "src": "img/prodotti/vesuvio-memory-duo-classic/hero-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-duo-classic/hero-720.webp 720w, img/prodotti/vesuvio-memory-duo-classic/hero-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vesuvio Memory Duo Classic in prospettiva, piano trapuntato chiaro e fascia laterale marrone con maniglie",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": true,
   "published": true,
   "sort": 1,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "c86e0e07-2382-54e5-a05f-e95e661b1a46",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "slot": "exploded",
   "src": "img/prodotti/vesuvio-memory-duo-classic/exploded-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-duo-classic/exploded-720.webp 720w, img/prodotti/vesuvio-memory-duo-classic/exploded-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vista esplosa del Vesuvio Memory Duo Classic: rivestimento, strato di Memory Foam e base portante",
   "caption": "",
   "illustrative": true,
   "fit": "contain",
   "bg": "white",
   "is_cover": false,
   "published": true,
   "sort": 2,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "b388f7ae-6dc8-5dff-b65c-849dc77d2fc8",
   "product_id": "27b81c88-21b7-5d06-b2c3-a250d43768a5",
   "slot": "fabric",
   "src": "img/prodotti/vesuvio-memory-duo-classic/detail-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-duo-classic/detail-720.webp 720w, img/prodotti/vesuvio-memory-duo-classic/detail-1200.webp 1200w",
   "width": 1200,
   "height": 800,
   "alt": "Dettaglio del bordo, della maniglia e della trapuntatura del Vesuvio Memory Duo Classic",
   "caption": "",
   "illustrative": false,
   "fit": "cover",
   "bg": null,
   "is_cover": false,
   "published": true,
   "sort": 3,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "59a3c75d-4ba7-554f-a5d0-33698763c28f",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "slot": "hero",
   "src": "img/prodotti/vesuvio-memory-trio/hero-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-trio/hero-720.webp 720w, img/prodotti/vesuvio-memory-trio/hero-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vesuvio Memory Trio in prospettiva, con il piano trapuntato bianco e la fascia perimetrale chiara",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": true,
   "published": true,
   "sort": 1,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "66e4aab1-d954-57d9-8c9d-cf2bc2f36de6",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "slot": "exploded",
   "src": "img/prodotti/vesuvio-memory-trio/exploded-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-trio/exploded-720.webp 720w, img/prodotti/vesuvio-memory-trio/exploded-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vista esplosa del Vesuvio Memory Trio: rivestimento e i tre strati di Memory Foam sopra la base",
   "caption": "",
   "illustrative": true,
   "fit": "contain",
   "bg": "white",
   "is_cover": false,
   "published": true,
   "sort": 2,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "d136ffbf-4e0d-54a9-8146-c2d979266bdf",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "slot": "fabric",
   "src": "img/prodotti/vesuvio-memory-trio/detail-1200.webp",
   "srcset": "img/prodotti/vesuvio-memory-trio/detail-720.webp 720w, img/prodotti/vesuvio-memory-trio/detail-1200.webp 1200w",
   "width": 1200,
   "height": 1200,
   "alt": "Dettaglio ravvicinato della trapuntatura e del bordo del Vesuvio Memory Trio",
   "caption": "",
   "illustrative": false,
   "fit": "cover",
   "bg": null,
   "is_cover": false,
   "published": true,
   "sort": 3,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "31391401-b075-537f-b024-66ceb2ec5eef",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "slot": "hero",
   "src": "img/prodotti/vesuvio-pocket-1600/hero-1200.webp",
   "srcset": "img/prodotti/vesuvio-pocket-1600/hero-720.webp 720w, img/prodotti/vesuvio-pocket-1600/hero-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vesuvio Pocket 1600 in prospettiva, piano trapuntato chiaro e fascia laterale marrone con maniglie",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": true,
   "published": true,
   "sort": 1,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "7458e37b-68b1-5dfb-bcc1-d8f6db6c4544",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "slot": "exploded",
   "src": "img/prodotti/vesuvio-pocket-1600/exploded-1200.webp",
   "srcset": "img/prodotti/vesuvio-pocket-1600/exploded-720.webp 720w, img/prodotti/vesuvio-pocket-1600/exploded-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vista esplosa del Vesuvio Pocket 1600: rivestimento, due strati in schiuma, le molle insacchettate e la base",
   "caption": "",
   "illustrative": true,
   "fit": "contain",
   "bg": "white",
   "is_cover": false,
   "published": true,
   "sort": 2,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "d25bec2d-2288-56e8-b10c-b9a88751cf58",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "slot": "fabric",
   "src": "img/prodotti/vesuvio-pocket-1600/detail-1200.webp",
   "srcset": "img/prodotti/vesuvio-pocket-1600/detail-720.webp 720w, img/prodotti/vesuvio-pocket-1600/detail-1200.webp 1200w",
   "width": 1200,
   "height": 1200,
   "alt": "Dettaglio dell'angolo, della maniglia e della trapuntatura del Vesuvio Pocket 1600",
   "caption": "",
   "illustrative": false,
   "fit": "cover",
   "bg": null,
   "is_cover": false,
   "published": true,
   "sort": 3,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "5afbdd62-6147-5395-9b0e-9ecf6c6cc9f5",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "slot": "hero",
   "src": "img/prodotti/vesuvio-pocket-3000-elite/hero-1200.webp",
   "srcset": "img/prodotti/vesuvio-pocket-3000-elite/hero-720.webp 720w, img/prodotti/vesuvio-pocket-3000-elite/hero-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vesuvio Pocket 3000 Elite con piano trapuntato e fascia laterale marrone chiaro",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": true,
   "published": true,
   "sort": 1,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "26da096a-0bfc-537e-bc5e-1957c88c3343",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "slot": "exploded",
   "src": "img/prodotti/vesuvio-pocket-3000-elite/exploded-1200.webp",
   "srcset": "img/prodotti/vesuvio-pocket-3000-elite/exploded-720.webp 720w, img/prodotti/vesuvio-pocket-3000-elite/exploded-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vista esplosa del Vesuvio Pocket 3000 Elite: rivestimento, Memory Foam, poliuretano e molle insacchettate",
   "caption": "",
   "illustrative": true,
   "fit": "contain",
   "bg": "white",
   "is_cover": false,
   "published": true,
   "sort": 2,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "8dc95f54-c316-5dcf-aa46-75da7b045d64",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "slot": "fabric",
   "src": "img/prodotti/vesuvio-pocket-3000-elite/detail-1200.webp",
   "srcset": "img/prodotti/vesuvio-pocket-3000-elite/detail-720.webp 720w, img/prodotti/vesuvio-pocket-3000-elite/detail-1200.webp 1200w",
   "width": 1200,
   "height": 1200,
   "alt": "Dettaglio del rivestimento trapuntato e della cerniera del Vesuvio Pocket 3000 Elite",
   "caption": "",
   "illustrative": false,
   "fit": "cover",
   "bg": null,
   "is_cover": false,
   "published": true,
   "sort": 3,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "1a6641df-3699-54ee-8c17-f0fa218c5e78",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "slot": "hero",
   "src": "img/prodotti/vesuvio-topper-memory-cloud-5/hero-1200.webp",
   "srcset": "img/prodotti/vesuvio-topper-memory-cloud-5/hero-720.webp 720w, img/prodotti/vesuvio-topper-memory-cloud-5/hero-1200.webp 1200w",
   "width": 1200,
   "height": 900,
   "alt": "Vesuvio Topper Memory Cloud 5 in prospettiva, piano trapuntato bianco con cerniera perimetrale",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": true,
   "published": true,
   "sort": 1,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "a61f8acc-c7d7-59bb-87f2-184e4bef9016",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "slot": "fabric",
   "src": "img/prodotti/vesuvio-topper-memory-cloud-5/fabric-1200.webp",
   "srcset": "img/prodotti/vesuvio-topper-memory-cloud-5/fabric-720.webp 720w, img/prodotti/vesuvio-topper-memory-cloud-5/fabric-1200.webp 1200w",
   "width": 1200,
   "height": 800,
   "alt": "Il rivestimento sfoderabile del Topper Memory Cloud 5 con la cerniera che corre lungo il bordo",
   "caption": "",
   "illustrative": false,
   "fit": "contain",
   "bg": "white",
   "is_cover": false,
   "published": true,
   "sort": 3,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "5a315093-9295-5417-9948-b1e6b6141bd6",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "slot": "extra",
   "src": "img/pocket-2400-cutaway-1200.webp",
   "srcset": "img/pocket-2400-cutaway-720.webp 720w, img/pocket-2400-cutaway-1200.webp 1200w",
   "width": 1200,
   "height": 800,
   "alt": "Render precedente del Pocket Elite in sezione",
   "caption": "",
   "illustrative": true,
   "is_cover": false,
   "published": false,
   "sort": 90,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "a16eb03a-d85c-5c0b-8643-dfba4c5f72d9",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "slot": "extra",
   "src": "img/pocket-2400-esploso-1200.webp",
   "srcset": "img/pocket-2400-esploso-720.webp 720w, img/pocket-2400-esploso-1200.webp 1200w",
   "width": 1200,
   "height": 800,
   "alt": "Vista esplosa precedente del Pocket Elite",
   "caption": "",
   "illustrative": true,
   "is_cover": false,
   "published": false,
   "sort": 91,
   "focal_x": 50,
   "focal_y": 50
  },
  {
   "id": "d5d97404-eec6-5ea0-9a23-fec5b4dc703c",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "slot": "hero",
   "alt": "Vesuvio Memory Air 3D in prospettiva, con la fascia perimetrale 3D traspirante sul lato",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": true,
   "published": true,
   "sort": 10,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/memory-air-3d-34-1600.webp",
   "srcset": "img/foto/memory-air-3d-34-900.webp 900w, img/foto/memory-air-3d-34-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "888cb0f9-0832-50b4-9ab8-4f10286d86fe",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "slot": "exploded",
   "alt": "Vesuvio Memory Air 3D con un angolo aperto: Memory Foam sopra la base in poliuretano",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": false,
   "published": true,
   "sort": 11,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/memory-air-3d-sezione-1600.webp",
   "srcset": "img/foto/memory-air-3d-sezione-900.webp 900w, img/foto/memory-air-3d-sezione-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "45af4665-59dd-55ac-bef3-36d418f4ec6b",
   "product_id": "df39f46d-9932-5856-ab3a-43855690494c",
   "slot": "fabric",
   "alt": "Dettaglio della fascia 3D a rete traspirante",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": false,
   "published": true,
   "sort": 12,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/memory-air-3d-tessuto-1600.webp",
   "srcset": "img/foto/memory-air-3d-tessuto-900.webp 900w, img/foto/memory-air-3d-tessuto-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "5326e85c-b441-5578-8d5f-af0cd91a5cfb",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "slot": "extra",
   "alt": "Dettaglio precedente del rivestimento del Pocket Elite",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": false,
   "published": false,
   "sort": 13,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/pocket-2400-elite-tessuto-1600.webp",
   "srcset": "img/foto/pocket-2400-elite-tessuto-900.webp 900w, img/foto/pocket-2400-elite-tessuto-1600.webp 1254w",
   "width": 1254,
   "height": 1254
  },
  {
   "id": "a0a75bd2-ab56-569f-a5c1-3f67039a9033",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "slot": "hero",
   "alt": "Vesuvio Rete Flex con telaio in acciaio scuro, doghe in legno chiaro e piedi",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": true,
   "published": true,
   "sort": 14,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/rete-flex-34-1600.webp",
   "srcset": "img/foto/rete-flex-34-900.webp 900w, img/foto/rete-flex-34-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "fc454eb4-1f4b-5508-a1eb-5b9e02e5ad1f",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "slot": "extra",
   "alt": "Dettaglio dell'angolo della Rete Flex: doghe fissate al telaio e piede",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": false,
   "published": true,
   "sort": 15,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/rete-flex-dettaglio-1600.webp",
   "srcset": "img/foto/rete-flex-dettaglio-900.webp 900w, img/foto/rete-flex-dettaglio-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "0865576d-fb74-5aae-b876-b7342a54f3fe",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "slot": "hero",
   "alt": "Vesuvio Rete Strong con telaio rinforzato in acciaio e doghe in legno",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": true,
   "published": true,
   "sort": 16,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/rete-strong-34-1600.webp",
   "srcset": "img/foto/rete-strong-34-900.webp 900w, img/foto/rete-strong-34-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "37df2d56-21ed-5fe7-99d6-9770fe1e200c",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "slot": "extra",
   "alt": "Dettaglio del telaio rinforzato della Rete Strong",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": false,
   "published": true,
   "sort": 17,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/rete-strong-dettaglio-1600.webp",
   "srcset": "img/foto/rete-strong-dettaglio-900.webp 900w, img/foto/rete-strong-dettaglio-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "fe586ae1-bdc8-5bb0-bad0-0e7224cd66d2",
   "product_id": "f9a95603-b52f-5fc2-ab32-a49cc2918f34",
   "slot": "hero",
   "alt": "Guanciale in piuma con fodera bianca",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": true,
   "published": true,
   "sort": 18,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/guanciale-piuma-1600.webp",
   "srcset": "img/foto/guanciale-piuma-900.webp 900w, img/foto/guanciale-piuma-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "599584e8-0018-50de-ae44-121deef9a264",
   "product_id": "f18a729c-0e68-54f0-b748-72904165b275",
   "slot": "hero",
   "alt": "Guanciale Memory Flakes con fodera trapuntata",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": true,
   "published": true,
   "sort": 19,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/guanciale-memory-flakes-1600.webp",
   "srcset": "img/foto/guanciale-memory-flakes-900.webp 900w, img/foto/guanciale-memory-flakes-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "aa3b9e01-d012-5886-9fb0-9dd35a29dee4",
   "product_id": "85473b6c-22b0-51a4-9f3d-34b9bb1dd6c6",
   "slot": "hero",
   "alt": "Guanciale Memory Classic rettangolare con fodera trapuntata",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": true,
   "published": true,
   "sort": 20,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/guanciale-memory-classic-1600.webp",
   "srcset": "img/foto/guanciale-memory-classic-900.webp 900w, img/foto/guanciale-memory-classic-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  },
  {
   "id": "8fdbe388-b19b-572f-bb22-f4b5022e443e",
   "product_id": "97116d49-df22-5e8e-8419-28d3b7acee61",
   "slot": "hero",
   "alt": "Guanciale cervicale in Memory con profilo a onda",
   "caption": "",
   "illustrative": true,
   "fit": "cover",
   "is_cover": true,
   "published": true,
   "sort": 21,
   "focal_x": 50,
   "focal_y": 50,
   "src": "img/foto/guanciale-memory-cervical-1600.webp",
   "srcset": "img/foto/guanciale-memory-cervical-900.webp 900w, img/foto/guanciale-memory-cervical-1600.webp 1536w",
   "width": 1536,
   "height": 1024
  }
 ],
 "redirects": [
  {
   "old_slug": "pocket-2400-elite",
   "new_slug": "pocket-3000-elite"
  },
  {
   "old_slug": "pocket-2600-elite",
   "new_slug": "pocket-3000-elite"
  },
  {
   "old_slug": "essential-foam",
   "new_slug": "eco"
  },
  {
   "old_slug": "memory-foam-3-strati",
   "new_slug": "memory-trio"
  }
 ],
 "settings": {
  "whatsapp_number": "+39 366 121 8346",
  "public_phone": "+39 366 121 8346",
  "contact_email": "fdimaterassi@gmail.com",
  "payment_methods": [
   "contrassegno",
   "bonifico"
  ],
  "shipping_note": "gratuita in tutta Italia, isole comprese",
  "show_claims": true,
  "payments": {
   "stripe": false,
   "paypal": false,
   "klarna": false
  },
  "offers_enabled": true
 },
 "offers": [
  {
   "id": "89c9f8d7-5645-533f-8487-0243c9a90a53",
   "code": "letto-completo",
   "label": "Vantaggio letto completo",
   "sort": 1,
   "status": "active",
   "description": "Materasso e rete della stessa misura nello stesso ordine.",
   "params": {
    "pct": {
     "foam": 5,
     "pocket": 8
    },
    "round_eur": 5
   },
   "starts_at": null,
   "ends_at": null
  },
  {
   "id": "23a39193-2476-596a-acd9-55a2f36762c5",
   "code": "letti-multipli",
   "label": "Vantaggio più letti",
   "sort": 2,
   "status": "active",
   "description": "Tre o più letti completi nello stesso ordine: camere, case vacanza, strutture.",
   "params": {
    "tiers": [
     {
      "min_sets": 3,
      "pct": 10
     },
     {
      "min_sets": 5,
      "pct": 12
     }
    ],
    "quote_from_sets": 10
   },
   "starts_at": null,
   "ends_at": null
  },
  {
   "id": "e0609a58-b9f8-5d4f-80bd-4660b496c5a5",
   "code": "accessori",
   "label": "Vantaggio accessori",
   "sort": 3,
   "status": "active",
   "description": "Guanciali insieme a un materasso; topper della stessa misura di un letto completo.",
   "params": {
    "pct": {
     "topper": 10,
     "guanciale": 15
    },
    "guanciali_per_materasso": 2,
    "round_eur": 1,
    "consigliati": [
     "guanciale-memory-flakes",
     "guanciale-memory-classic"
    ]
   },
   "starts_at": null,
   "ends_at": null
  },
  {
   "id": "d8d851c5-9fea-54a6-a6fe-849a939b0c65",
   "code": "per-due",
   "label": "Vantaggio per due",
   "sort": 4,
   "status": "active",
   "description": "Due materassi uguali nello stesso ordine, anche senza rete.",
   "params": {
    "pct": {
     "foam": 5,
     "pocket": 8
    },
    "round_eur": 5
   },
   "starts_at": null,
   "ends_at": null
  },
  {
   "id": "b1977561-5e18-5859-a153-9f006adad759",
   "code": "coppia-guanciali",
   "label": "Vantaggio coppia di guanciali",
   "sort": 5,
   "status": "active",
   "description": "Due guanciali uguali nello stesso ordine, anche senza materasso.",
   "params": {
    "pct": 10,
    "round_eur": 1
   },
   "starts_at": null,
   "ends_at": null
  },
  {
   "id": "1fab243c-5571-545d-a607-a6cb3f7da462",
   "code": "tetto",
   "label": "Tetto di sicurezza",
   "sort": 5,
   "status": "active",
   "description": "Lo sconto complessivo di un carrello non supera questa percentuale.",
   "params": {
    "pct": 15
   },
   "starts_at": null,
   "ends_at": null
  }
 ],
 "bundles": [
  {
   "id": "76e4ae67-5a0c-5e2c-a92a-9710a7845fc7",
   "slug": "notte-memory",
   "name": "Notte Memory",
   "tagline": "Il Memory Duo con due guanciali Memory Classic: tutto quello che serve per dormire, insieme.",
   "description": "Il Memory Duo con due guanciali Memory Classic. Se cambi anche la rete, aggiungi la Rete Flex della stessa misura.",
   "badge": "Materasso e due guanciali",
   "theme": "elite",
   "sizes": null,
   "default_size": "160x190",
   "status": "published",
   "sort": 1
  },
  {
   "id": "2201fd23-3dbb-514f-a8ba-249bebca4e52",
   "slug": "notte-flakes",
   "name": "Notte Flakes",
   "tagline": "Il Memory Trio con due guanciali Memory Flakes, che si modellano sotto la testa.",
   "description": "Il Memory Trio con due guanciali Memory Flakes. Se cambi anche la rete, aggiungi la Rete Flex della stessa misura.",
   "badge": "Materasso e due guanciali",
   "theme": "classic",
   "sizes": null,
   "default_size": "160x190",
   "status": "published",
   "sort": 2
  },
  {
   "id": "7f92b69c-f50d-5d9c-b382-a71f6aa46933",
   "slug": "letto-elite",
   "name": "Letto Elite",
   "tagline": "Il nostro materasso a molle più ricco, sulla rete rinforzata della stessa misura.",
   "description": "Il Pocket 3000 Elite con la Rete Strong, nella stessa misura. Scegli la misura e l'altezza; se vuoi, aggiungi il topper. Il vantaggio del letto completo è già nel prezzo.",
   "badge": "Il più completo",
   "theme": "elite",
   "sizes": null,
   "default_size": "160x190",
   "status": "published",
   "sort": 3
  },
  {
   "id": "35f250db-e566-53ae-9383-fb2ad0883489",
   "slug": "letto-pocket",
   "name": "Letto Pocket",
   "tagline": "Le molle indipendenti insacchettate, con la rete a doghe della stessa misura.",
   "description": "Il Pocket 1600 con la Rete Flex, nella stessa misura. È il modo più diretto per passare a un materasso a molle.",
   "badge": "Molle insacchettate",
   "theme": "classic",
   "sizes": null,
   "default_size": "160x190",
   "status": "published",
   "sort": 4
  },
  {
   "id": "734b3556-03ae-5d6a-a771-4812d31353bc",
   "slug": "letto-trio",
   "name": "Letto Trio",
   "tagline": "Tre strati di Memory Foam, 27 cm, sulla rete a doghe della stessa misura.",
   "description": "Il Memory Trio con la Rete Flex, nella stessa misura. Il più alto della gamma in schiuma.",
   "badge": "27 cm di Memory Foam",
   "theme": "classic",
   "sizes": null,
   "default_size": "160x190",
   "status": "published",
   "sort": 5
  },
  {
   "id": "3c2acc74-a439-5c34-a85b-b7e64af5fd21",
   "slug": "letto-memory",
   "name": "Letto Memory",
   "tagline": "Memory Foam con rivestimento sfoderabile, sulla rete a doghe della stessa misura.",
   "description": "Il Memory Duo con la Rete Flex, nella stessa misura. Si aggiunge il topper se si vuole un piano ancora più accogliente.",
   "badge": "Sfoderabile",
   "theme": "classic",
   "sizes": null,
   "default_size": "160x190",
   "status": "published",
   "sort": 6
  },
  {
   "id": "c77837ef-4bb2-5842-9f74-89b48bf99689",
   "slug": "singolo-completo",
   "name": "Singolo completo",
   "tagline": "Materasso e rete per un letto singolo: cameretta, ospiti, seconda casa.",
   "description": "Il Vesuvio Eco alto 20 cm con la Rete Flex, nelle misure da una piazza. Si può scegliere anche un'altra altezza.",
   "badge": "Letto singolo",
   "theme": "start",
   "sizes": [
    "80x190",
    "80x200",
    "90x190",
    "90x200"
   ],
   "default_size": "80x190",
   "status": "published",
   "sort": 7
  }
 ],
 "bundle_items": [
  {
   "id": "4605b9a7-ef6e-5c74-b22a-5ddfd6631581",
   "bundle_id": "76e4ae67-5a0c-5e2c-a92a-9710a7845fc7",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "height_cm": 25,
   "qty": 1,
   "optional": false,
   "sort": 1
  },
  {
   "id": "8ff55f36-8c37-5438-8a2c-350d463a270a",
   "bundle_id": "76e4ae67-5a0c-5e2c-a92a-9710a7845fc7",
   "product_id": "85473b6c-22b0-51a4-9f3d-34b9bb1dd6c6",
   "height_cm": null,
   "qty": 2,
   "optional": false,
   "sort": 2
  },
  {
   "id": "59a018a3-47b2-50cf-befd-5096726b65bc",
   "bundle_id": "76e4ae67-5a0c-5e2c-a92a-9710a7845fc7",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "height_cm": null,
   "qty": 1,
   "optional": true,
   "sort": 3
  },
  {
   "id": "ca41e322-3527-59f4-a46f-d0c86f6c84e9",
   "bundle_id": "2201fd23-3dbb-514f-a8ba-249bebca4e52",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "height_cm": 27,
   "qty": 1,
   "optional": false,
   "sort": 1
  },
  {
   "id": "e8f054f4-dce8-5b82-b94f-441cf49d1a5a",
   "bundle_id": "2201fd23-3dbb-514f-a8ba-249bebca4e52",
   "product_id": "f18a729c-0e68-54f0-b748-72904165b275",
   "height_cm": null,
   "qty": 2,
   "optional": false,
   "sort": 2
  },
  {
   "id": "f69b33a8-b3fa-5bc6-847f-cba58fcdc24c",
   "bundle_id": "2201fd23-3dbb-514f-a8ba-249bebca4e52",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "height_cm": null,
   "qty": 1,
   "optional": true,
   "sort": 3
  },
  {
   "id": "b33523bc-2ffe-5f38-b05b-d05543d6d4b1",
   "bundle_id": "7f92b69c-f50d-5d9c-b382-a71f6aa46933",
   "product_id": "0eedacdc-4815-5c09-b7d4-2cce6820b44d",
   "height_cm": 25,
   "qty": 1,
   "optional": false,
   "sort": 1
  },
  {
   "id": "5b8f63c7-a87f-545d-9263-4097ac5d314c",
   "bundle_id": "7f92b69c-f50d-5d9c-b382-a71f6aa46933",
   "product_id": "c9e5b52e-2898-51a0-ab16-a8ddf1e7442e",
   "height_cm": null,
   "qty": 1,
   "optional": false,
   "sort": 2
  },
  {
   "id": "8ad71cf5-5aa2-5b01-b610-2d8e3d4a476c",
   "bundle_id": "7f92b69c-f50d-5d9c-b382-a71f6aa46933",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "height_cm": null,
   "qty": 1,
   "optional": true,
   "sort": 3
  },
  {
   "id": "87cb7d87-82b5-5d61-83ec-caf44705173c",
   "bundle_id": "35f250db-e566-53ae-9383-fb2ad0883489",
   "product_id": "b0919e50-0d2d-5c21-ab4e-c06ecb1c8735",
   "height_cm": 25,
   "qty": 1,
   "optional": false,
   "sort": 1
  },
  {
   "id": "5b6ec7d6-cd59-5d10-8bc2-b31769ce93cd",
   "bundle_id": "35f250db-e566-53ae-9383-fb2ad0883489",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "height_cm": null,
   "qty": 1,
   "optional": false,
   "sort": 2
  },
  {
   "id": "4f01d365-3733-50c7-aef6-b6a2c80f6a56",
   "bundle_id": "35f250db-e566-53ae-9383-fb2ad0883489",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "height_cm": null,
   "qty": 1,
   "optional": true,
   "sort": 3
  },
  {
   "id": "f7db75b2-1bfa-5d28-b9f8-a1fec0f1bbc3",
   "bundle_id": "734b3556-03ae-5d6a-a771-4812d31353bc",
   "product_id": "7e3a44cc-14d7-5af3-b0dd-21efdf0a9f3c",
   "height_cm": 27,
   "qty": 1,
   "optional": false,
   "sort": 1
  },
  {
   "id": "e0ce34fe-1180-56a0-b04e-d43acbd3e853",
   "bundle_id": "734b3556-03ae-5d6a-a771-4812d31353bc",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "height_cm": null,
   "qty": 1,
   "optional": false,
   "sort": 2
  },
  {
   "id": "47acbb41-d31b-5aac-8806-8a2e442ca7a4",
   "bundle_id": "734b3556-03ae-5d6a-a771-4812d31353bc",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "height_cm": null,
   "qty": 1,
   "optional": true,
   "sort": 3
  },
  {
   "id": "47498161-aeca-5ddf-950a-469f17220f27",
   "bundle_id": "3c2acc74-a439-5c34-a85b-b7e64af5fd21",
   "product_id": "71f76b5b-1cdd-5adb-baa5-614ec6ad9552",
   "height_cm": 25,
   "qty": 1,
   "optional": false,
   "sort": 1
  },
  {
   "id": "763b4f3f-9203-56f3-a09f-ff6059b3c678",
   "bundle_id": "3c2acc74-a439-5c34-a85b-b7e64af5fd21",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "height_cm": null,
   "qty": 1,
   "optional": false,
   "sort": 2
  },
  {
   "id": "ba516350-4a2e-5cb2-8e36-c6bd0d32634a",
   "bundle_id": "3c2acc74-a439-5c34-a85b-b7e64af5fd21",
   "product_id": "9f788966-fb6f-5b8d-bb03-3f717ca03395",
   "height_cm": null,
   "qty": 1,
   "optional": true,
   "sort": 3
  },
  {
   "id": "696526d6-9755-5bd2-b71f-ba5008ed5e0d",
   "bundle_id": "c77837ef-4bb2-5842-9f74-89b48bf99689",
   "product_id": "4e3ab029-d797-558f-8017-b4b2566294f0",
   "height_cm": 20,
   "qty": 1,
   "optional": false,
   "sort": 1
  },
  {
   "id": "9d24d2d9-b99e-52b1-af80-64c7ea93ed3b",
   "bundle_id": "c77837ef-4bb2-5842-9f74-89b48bf99689",
   "product_id": "0bb8a3e7-acf6-587e-8bb3-6d6cbcdfb47f",
   "height_cm": null,
   "qty": 1,
   "optional": false,
   "sort": 2
  }
 ]
};

__exp.SEED = SEED;
});
__def("supabase.js", function (__exp) {
// Collegamento al database Supabase.
//
// Il sito funziona anche senza: il catalogo compilato nel bundle resta la riserva, e tutto
// quello che c'è qui dentro degrada in silenzio se la rete non risponde o se la configurazione
// è vuota. Quando invece il collegamento c'è, il database diventa la fonte di verità:
// il catalogo mostrato è quello letto da Supabase, non quello compilato.
//
// Sicurezza: qui si usa SOLO la chiave pubblicabile, quella che Supabase prevede per il browser.
// La service role non compare in nessun file del sito. Chi non ha fatto l'accesso vede quello
// che le policy RLS concedono al ruolo anonimo: prodotti pubblicati, foto pubblicate,
// impostazioni pubbliche. Prezzi, bozze e note interne restano protetti dal database, non dal
// JavaScript.

const ENV = window.VS_CONFIG ?? {};
const SB = { url: (ENV.supabaseUrl ?? '').replace(/\/$/, ''), key: ENV.supabaseKey ?? '', bucket: ENV.supabaseBucket ?? 'product-media' };

/** C'è una configurazione? Senza, il sito resta sul catalogo compilato e non chiama nulla. */
const configured = () => !!(SB.url && SB.key);

const SESSION_KEY = 'vs-sb-session-v1';
const readSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return s && s.expires_at * 1000 > Date.now() ? s : null;
  } catch {
    return null;
  }
};
let session = configured() ? readSession() : null;

const currentUser = () => session?.user ?? null;

function authHeader() {
  return { apikey: SB.key, Authorization: `Bearer ${session?.access_token || SB.key}` };
}

/** Una chiamata a PostgREST. Restituisce i dati, oppure solleva con il messaggio del database. */
async function rest(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${SB.url}/rest/v1/${path}`, {
    method,
    headers: {
      ...authHeader(),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `${res.status} ${res.statusText}`);
  return data;
}

/** Una funzione del database (validate_cart, create_cart_request, create_quote_request). */
async function rpc(fn, args) {
  return rest(`rpc/${fn}`, { method: 'POST', body: args });
}

// ------------------------------------------------------------------ accesso
/** Accesso con email e password. La password viaggia solo verso Supabase e non viene salvata. */
async function signIn(email, password) {
  const res = await fetch(`${SB.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SB.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || data?.msg || 'Accesso non riuscito');
  session = { ...data, expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600) };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
  return session.user;
}

/** Link per reimpostare la password: serve al primo accesso, che nasce senza password. */
async function sendRecovery(email) {
  const res = await fetch(`${SB.url}/auth/v1/recover`, {
    method: 'POST',
    headers: { apikey: SB.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Non è stato possibile inviare il link');
}

function signOut() {
  session = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** L'utente collegato è un amministratore? Lo decide il database, non il browser. */
async function isAdmin() {
  if (!session) return false;
  try {
    return (await rpc('is_admin', {})) === true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ catalogo
/** `seed/img/...` è una foto compilata nel sito; tutto il resto sta nel bucket. */
function srcOf(storage_path) {
  if (!storage_path) return '';
  if (storage_path.startsWith('seed/')) return storage_path.slice(5);
  if (/^(https?:|idb:)/.test(storage_path)) return storage_path;
  return `${SB.url}/storage/v1/object/public/${SB.bucket}/${storage_path}`;
}
/** Le foto del catalogo esistono a due larghezze: la piccola si ricava dal nome della grande. */
function srcsetOf(src, width) {
  const small = src.replace(/-1200\.webp$/, '-720.webp');
  return small !== src ? `${small} 720w, ${src} ${width || 1200}w` : '';
}

/**
 * Legge il catalogo dal database e lo restituisce nella stessa forma del catalogo compilato,
 * così il resto del sito non sa nemmeno da dove arriva.
 */
async function loadCatalog() {
  const [categories, products, variants, mediaRows, settingsRows, redirects] = await Promise.all([
    rest('categories?select=*&order=sort'),
    rest('products?select=*&order=sort'),
    rest('variants?select=*&order=sort'),
    rest('media?select=*&order=sort'),
    rest('settings?select=key,value'),
    rest('slug_redirects?select=old_slug,new_slug'),
  ]);
  const media = mediaRows.map((m) => {
    const src = srcOf(m.storage_path);
    return { ...m, src, srcset: srcsetOf(src, m.width), width: m.width ?? null, height: m.height ?? null };
  });
  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
  // offerte abbinate: tabelle della migrazione 000009. Se mancano (database non ancora
  // aggiornato) il catalogo si legge lo stesso e le offerte restano quelle compilate.
  let offers, bundles, bundle_items;
  try {
    [offers, bundles, bundle_items] = await Promise.all([
      rest('offers?select=*&order=sort'),
      rest('bundles?select=*&order=sort'),
      rest('bundle_items?select=*&order=sort'),
    ]);
  } catch {
    offers = bundles = bundle_items = undefined;
  }
  return { categories, products, variants, media, settings, redirects, offers, bundles, bundle_items, source: 'supabase' };
}

/**
 * Manda al database il catalogo così com'è nell'admin. Solo per un amministratore collegato:
 * per chiunque altro le policy RLS rifiutano la scrittura, e va bene così.
 */
async function pushCatalog(db) {
  const keep = (o, ks) => Object.fromEntries(ks.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  const P = ['id', 'slug', 'category_id', 'name', 'technical_name', 'short', 'description', 'composition', 'highlights',
    'claims', 'removable_cover', 'reversible', 'summer_winter', 'hybrid', 'firmness_display', 'line_code', 'status', 'sort', 'lead_time', 'match',
    'bundle_family'];
  const V = ['id', 'product_id', 'sku', 'size', 'height_cm', 'price_cents', 'availability', 'active', 'sort'];
  const C = ['id', 'slug', 'kind', 'name', 'description', 'sort', 'status'];
  const up = (t, rows) => (rows.length ? rest(`${t}?on_conflict=id`, { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' }) : null);
  await up('categories', db.categories.map((c) => keep(c, C)));
  await up('products', db.products.map((p) => keep(p, P)));
  await up('variants', db.variants.map((v) => keep(v, V)));
  // le foto caricate nel browser (idb:) restano dove sono: non esiste un file da collegare
  const media = db.media
    .filter((m) => !String(m.src).startsWith('idb:'))
    .map((m) => ({
      ...keep(m, ['id', 'product_id', 'slot', 'alt', 'caption', 'illustrative', 'is_cover', 'published', 'sort', 'focal_x', 'focal_y', 'width', 'height', 'fit', 'bg']),
      storage_path: m.storage_path ?? (String(m.src).startsWith('http') ? m.src : `seed/${m.src}`),
    }));
  await up('media', media);
  // offerte abbinate: regole, vetrine e pezzi (le vetrine prima dei pezzi, per le chiavi esterne)
  const O = ['id', 'code', 'label', 'description', 'params', 'status', 'starts_at', 'ends_at', 'sort'];
  const B = ['id', 'slug', 'name', 'tagline', 'description', 'badge', 'theme', 'sizes', 'default_size', 'status', 'sort', 'seo_title', 'seo_description'];
  const I = ['id', 'bundle_id', 'product_id', 'height_cm', 'qty', 'optional', 'sort'];
  await up('offers', (db.offers ?? []).map((o) => keep(o, O)));
  await up('bundles', (db.bundles ?? []).map((b) => keep(b, B)));
  await up('bundle_items', (db.bundle_items ?? []).map((i) => keep(i, I)));
  const settings = Object.entries(db.settings ?? {}).map(([key, value]) => ({ key, value }));
  if (settings.length) await rest('settings?on_conflict=key', { method: 'POST', body: settings, prefer: 'resolution=merge-duplicates,return=minimal' });
  return { prodotti: db.products.length, varianti: db.variants.length, foto: media.length };
}

__exp.SB = SB;
__exp.configured = configured;
__exp.currentUser = currentUser;
__exp.rpc = rpc;
__exp.signIn = signIn;
__exp.sendRecovery = sendRecovery;
__exp.signOut = signOut;
__exp.isAdmin = isAdmin;
__exp.loadCatalog = loadCatalog;
__exp.pushCatalog = pushCatalog;
});
__def("slots.js", function (__exp) {
// Spazi immagine del sito (non legati a un prodotto). Ogni spazio mostra, in
// ordine: la foto caricata e pubblicata dall'admin, l'immagine predefinita
// (render illustrativo consegnato il 13/11/2026), oppure un segnaposto dichiarato.
const f = (name, alt, { portrait = false } = {}) => ({
  src: `img/foto/${name}-${portrait ? 900 : 1600}.webp`,
  srcset: portrait ? `img/foto/${name}-600.webp 600w, img/foto/${name}-900.webp 900w` : `img/foto/${name}-900.webp 900w, img/foto/${name}-1600.webp 1536w`,
  alt,
  caption: '',
});

const SITE_SLOTS = [
  { key: 'hero_napoli', label: 'Apertura: Napoli', hint: 'Foto orizzontale del Golfo di Napoli con il Vesuvio, almeno 2400 px di larghezza', ratio: '16 / 9' },
  { key: 'fabbrica_panoramica', label: 'Fabbrica: panoramica', hint: 'Il reparto visto d’insieme', ratio: '5 / 2', default: f('fabbrica-panoramica', 'Reparto di produzione con materassi impilati, rotoli di tessuto e macchine per la trapuntatura') },
  { key: 'fabbrica_cucito', label: 'Fabbrica: reparto cucito', hint: 'Foto reale del reparto di Casoria, persone solo con consenso', ratio: '4 / 5', default: f('fabbrica-cucito', 'Mani che guidano la fascia di un materasso sotto una macchina da cucire industriale', { portrait: true }) },
  { key: 'fabbrica_taglio', label: 'Fabbrica: taglio delle lastre', hint: 'Foto reale di lavorazione', ratio: '4 / 5', default: f('fabbrica-taglio', 'Taglio di una lastra di espanso con una lama verticale', { portrait: true }) },
  { key: 'fabbrica_materiali', label: 'Fabbrica: materiali', hint: 'Dettaglio di Memory Foam, molle o tessuti', ratio: '4 / 5', default: f('fabbrica-materiali', 'Campioni di Memory Foam, poliuretano, molle insacchettate e tessuto trapuntato', { portrait: true }) },
  { key: 'showroom', label: 'Showroom di Casoria', hint: 'Foto dell’esposizione o dell’ingresso', ratio: '4 / 3', default: f('showroom', 'Showroom luminoso con materassi esposti su basi imbottite') },
  { key: 'camera', label: 'Camera ambientata', hint: 'Camera luminosa con un materasso', ratio: '3 / 2', default: f('camera-ambientata', 'Camera mediterranea con un materasso trapuntato e il Vesuvio sul mare oltre la finestra ad arco') },
  { key: 'consegna', label: 'Consegna', hint: 'Furgone o consegna al piano', ratio: '3 / 2', default: f('consegna-furgone', 'Furgone bianco con le porte aperte e un materasso imballato, in una strada di Napoli con il Vesuvio sullo sfondo') },
  { key: 'guanciali_ambiente', label: 'Guanciali sul letto', hint: 'Guanciali su un letto rifatto', ratio: '3 / 2', default: f('guanciali-gruppo', 'Quattro guanciali bianchi su un letto rifatto con lenzuola color avorio') },
  { key: 'testata_materasso', label: 'Testata: materassi', hint: 'Dettaglio d’atmosfera, formato molto largo', ratio: '21 / 9', default: f('testata-materassi', 'Dettaglio della trapuntatura di un materasso con bordino blu') },
  { key: 'testata_rete', label: 'Testata: reti', hint: 'Dettaglio d’atmosfera, formato molto largo', ratio: '21 / 9', default: f('testata-reti', 'Rete a doghe in legno con telaio scuro su un parquet') },
  { key: 'testata_guanciale', label: 'Testata: guanciali', hint: 'Dettaglio d’atmosfera, formato molto largo', ratio: '21 / 9', default: f('testata-guanciali', 'Due guanciali trapuntati con bordino blu su un letto') },
];

/** Diapositive dell'apertura, in ordine. "hero_napoli" entra per prima quando viene caricata. */
const HERO_SLIDES = ['hero_napoli', 'camera', 'consegna', 'fabbrica_panoramica', 'showroom'];
const HERO_CAPTIONS = {
  hero_napoli: 'Napoli e il suo golfo',
  camera: 'Una camera con vista sul Vesuvio',
  consegna: 'Dalla fabbrica a casa tua, anche a Napoli',
  fabbrica_panoramica: 'Prodotti a Casoria dal 1986',
  showroom: 'Vieni a provarli nel nostro showroom',
};

/** Spazi immagine dei prodotti, per categoria: cosa fotografare per ogni scheda. */
const PRODUCT_SLOTS = {
  materasso: [
    { slot: 'hero', label: 'Prodotto in prospettiva 3/4', hint: 'Sfondo neutro, luce morbida' },
    { slot: 'exploded', label: 'Vista esplosa o sezione', hint: 'Strati reali del modello' },
    { slot: 'fabric', label: 'Dettaglio del tessuto', hint: 'Fascia, cuciture, cerniera' },
  ],
  rete: [
    { slot: 'hero', label: 'Rete in prospettiva 3/4', hint: 'Sfondo neutro' },
    { slot: 'extra', label: 'Dettaglio di doghe e piedi', hint: 'Angolo del telaio' },
  ],
  guanciale: [
    { slot: 'hero', label: 'Guanciale in prospettiva', hint: 'Sfondo neutro' },
    { slot: 'fabric', label: 'Dettaglio della fodera', hint: 'Tessuto e cuciture' },
  ],
  topper: [
    { slot: 'hero', label: 'Topper in prospettiva', hint: 'Sfondo neutro' },
    { slot: 'fabric', label: 'Dettaglio del rivestimento', hint: 'Cerniera e tessuto' },
  ],
};

__exp.SITE_SLOTS = SITE_SLOTS;
__exp.HERO_SLIDES = HERO_SLIDES;
__exp.HERO_CAPTIONS = HERO_CAPTIONS;
__exp.PRODUCT_SLOTS = PRODUCT_SLOTS;
});
__def("store.js", function (__exp) {
// Livello dati del sito.
// Due modi, decisi dalla configurazione:
//  - senza Supabase: localStorage per i dati e IndexedDB per le foto caricate, e le funzioni
//    `api.*` rifanno nel browser quello che farebbe il database;
//  - con Supabase collegato: il catalogo arriva dal database, e carrello e richieste passano
//    dalle funzioni SQL vere (validate_cart, create_cart_request, create_quote_request).
// In entrambi i casi il prezzo non viene mai creduto sulla parola del browser: si ricontrolla.

const {SEED} = __req("seed.js");
const {configured: sbConfigured, rpc: sbRpc} = __req("supabase.js");
const {SITE_SLOTS} = __req("slots.js");
const {CatalogIndex, validateCart, makeRef, customSku, normalizeWhatsAppNumber, catalogOfferConfig} = __req("core/index.js");

const DB_KEY = 'vs-preview-db-v1';
const CART_KEY = 'vs-cart-v1';
const clone = (o) => JSON.parse(JSON.stringify(o));
const nowIso = () => new Date().toISOString();
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));

let storageOk = true;
function readLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    storageOk = false;
    return null;
  }
}
function writeLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    storageOk = false;
    return false;
  }
}

function freshDb() {
  return { seed_version: SEED.version, ...clone(SEED), requests: [], audit: [], price_history: [], site_media: [] };
}
const rid0 = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));

let db = readLS(DB_KEY);
if (!db?.seed_version) {
  db = freshDb();
  writeLS(DB_KEY, db);
}
db.site_media ??= [];
db.redirects ??= clone(SEED.redirects ?? []);
// offerte abbinate (17/11/2026): regole e vetrine, assenti nei salvataggi precedenti
db.offers ??= clone(SEED.offers ?? []);
db.bundles ??= clone(SEED.bundles ?? []);
db.bundle_items ??= clone(SEED.bundle_items ?? []);
// Aggiornamento del seed. Con un catalogo UFFICIALE (SEED.authoritative) gli elementi
// del seed vengono aggiornati per ID (upsert: prezzi, varianti, stati, foto) senza
// duplicarli; restano intatti prodotti e foto creati dall'admin, richieste, impostazioni.
// Con un seed normale si aggiungono solo gli elementi nuovi.
if (db.seed_version !== SEED.version) {
  for (const key of ['categories', 'products', 'variants', 'media']) {
    const byId = new Map(db[key].map((x, i) => [x.id, i]));
    for (const item of SEED[key]) {
      if (!byId.has(item.id)) db[key].push(clone(item));
      else if (SEED.authoritative) {
        const cur = db[key][byId.get(item.id)];
        // una foto sostituita dall'admin (IndexedDB) non viene sovrascritta
        if (key === 'media' && cur.src?.startsWith('idb:')) continue;
        db[key][byId.get(item.id)] = clone(item);
      }
    }
  }
  if (SEED.authoritative) {
    // copertine: una per prodotto, prevale quella del catalogo ufficiale
    for (const m of SEED.media.filter((x) => x.is_cover)) {
      db.media.filter((x) => x.product_id === m.product_id && x.id !== m.id).forEach((x) => (x.is_cover = false));
    }
    db.audit?.unshift({ id: rid0(), at: nowIso(), action: 'catalogo', entity: SEED.catalog_version, detail: 'Catalogo ufficiale applicato (prezzi, varianti, stati, foto)' });
  }
  db.redirects = clone(SEED.redirects ?? []);
  // offerte: le regole nuove si aggiungono, quelle esistenti restano come le ha lasciate l'admin
  // (le percentuali sono sue); le vetrine si aggiornano nei testi ma conservano lo stato scelto.
  for (const o of SEED.offers ?? []) if (!db.offers.some((x) => x.id === o.id)) db.offers.push(clone(o));
  for (const b of SEED.bundles ?? []) {
    const k = db.bundles.findIndex((x) => x.id === b.id);
    if (k < 0) db.bundles.push(clone(b));
    else db.bundles[k] = { ...clone(b), status: db.bundles[k].status };
  }
  for (const it of SEED.bundle_items ?? []) {
    const k = db.bundle_items.findIndex((x) => x.id === it.id);
    if (k < 0) db.bundle_items.push(clone(it));
    else db.bundle_items[k] = clone(it);
  }
  // impostazioni nuove (contatti, pagamenti): si aggiungono, quelle già scelte dall'admin restano
  for (const [k, v] of Object.entries(SEED.settings ?? {})) {
    if (db.settings[k] === undefined || db.settings[k] === '' || db.settings[k] === null) db.settings[k] = clone(v);
  }
  db.seed_version = SEED.version;
  writeLS(DB_KEY, db);
}
const listeners = new Set();

const store = {
  get db() {
    return db;
  },
  get storageOk() {
    return storageOk;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  commit(reason) {
    writeLS(DB_KEY, db);
    if (reason) listeners.forEach((fn) => fn(reason));
  },
  audit(action, entity, detail) {
    db.audit.unshift({ id: rid(), at: nowIso(), action, entity, detail });
    db.audit = db.audit.slice(0, 400);
  },
  reset() {
    db = freshDb();
    this.commit('reset');
  },
  rid,
};

// ---------- Impostazioni ----------
const ENV = window.VS_CONFIG ?? {};
function whatsappNumber() {
  // la variabile d'ambiente (config.js) prevale sull'impostazione admin, come in produzione
  if (ENV.whatsappNumber) return { raw: ENV.whatsappNumber, source: 'env' };
  return { raw: db.settings.whatsapp_number || '', source: 'admin' };
}
function whatsappStatus() {
  const n = whatsappNumber();
  return { ...n, check: normalizeWhatsAppNumber(n.raw) };
}

// ---------- Media (IndexedDB) ----------
const blobUrls = new Map();
let idb = null;
function openIdb() {
  return new Promise((res) => {
    setTimeout(() => res(null), 1200);
    try {
      const r = indexedDB.open('vs-preview-media', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}
function idbReq(mode, fn) {
  return new Promise((res, rej) => {
    if (!idb) return rej(new Error('IndexedDB non disponibile'));
    const tx = idb.transaction('blobs', mode);
    const r = fn(tx.objectStore('blobs'));
    tx.oncomplete = () => res(r?.result);
    tx.onerror = () => rej(tx.error);
  });
}
const media = {
  async init() {
    idb = await openIdb();
    const keys = [...db.media, ...(db.site_media ?? [])].filter((m) => m.src.startsWith('idb:')).map((m) => m.src.slice(4));
    for (const k of keys) {
      try {
        const b = await idbReq('readonly', (s) => s.get(k));
        if (b) blobUrls.set(k, URL.createObjectURL(b));
      } catch {
        /* foto non recuperabile: verrà mostrato il fallback */
      }
    }
  },
  available: () => !!idb,
  resolve(m) {
    if (!m) return null;
    if (m.src.startsWith('idb:')) return blobUrls.get(m.src.slice(4)) ?? null;
    return m.src;
  },
  async putBlob(blob) {
    const key = rid();
    if (idb) await idbReq('readwrite', (s) => s.put(blob, key));
    blobUrls.set(key, URL.createObjectURL(blob));
    return 'idb:' + key;
  },
  async deleteBlob(src) {
    if (!src?.startsWith('idb:')) return;
    const k = src.slice(4);
    if (idb) await idbReq('readwrite', (s) => s.delete(k)).catch(() => {});
    const u = blobUrls.get(k);
    if (u) URL.revokeObjectURL(u);
    blobUrls.delete(k);
  },
};

/** Valida e ricomprime un'immagine caricata: JPEG/PNG/WebP, max 8 MB, lato lungo max 1800 px. */
async function processUpload(file) {
  const okTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!okTypes.includes(file.type)) throw new Error('Formato non supportato: usa JPEG, PNG o WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('File troppo grande: il limite è 8 MB.');
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('Il file non è un\'immagine leggibile.');
  });
  if (bmp.width < 400 || bmp.height < 300) throw new Error('Immagine troppo piccola: servono almeno 400×300 px.');
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.85));
  return { blob: blob ?? file, width: w, height: h };
}

/** Foto pubblicata in uno spazio del sito, oppure null (si mostra il segnaposto). */
function siteImage(key, { drafts = false } = {}) {
  const m = (db.site_media ?? []).find((x) => x.slot === key && (drafts || x.published));
  const src = m && media.resolve(m);
  if (src) return { ...m, src, uploaded: true };
  const def = SITE_SLOTS.find((x) => x.key === key)?.default;
  return def ? { ...def, focal_x: 50, focal_y: 50 } : null;
}

// ---------- Catalogo ----------
/** Vista pubblica: media non pubblicati esclusi. Con drafts=true (solo admin) include le bozze. */
function catalog({ drafts = false } = {}) {
  const snap = {
    categories: db.categories,
    products: drafts
      ? db.products.map((p) => (p.status === 'draft' ? { ...p, status: 'published' } : p)).filter((p) => p.status !== 'archived')
      : db.products,
    variants: db.variants,
    media: drafts ? db.media : db.media.filter((m) => m.published),
    offers: db.offers ?? [],
    bundles: db.bundles ?? [],
    bundle_items: db.bundle_items ?? [],
    offers_enabled: db.settings?.offers_enabled === true,
  };
  return new CatalogIndex(snap);
}
function mediaFor(idx, p) {
  return idx.snap.media.filter((m) => m.product_id === p.id).sort((a, b) => a.sort - b.sort);
}
function coverFor(idx, p) {
  const ms = mediaFor(idx, p).filter((m) => m.slot !== 'exploded');
  return ms.find((m) => m.is_cover) ?? ms[0] ?? null;
}

// ---------- Carrello ----------
let cartItems = readLS(CART_KEY) ?? [];
const cart = {
  get items() {
    return cartItems;
  },
  set(items) {
    cartItems = items.filter((i) => i.qty > 0);
    writeLS(CART_KEY, cartItems);
    listeners.forEach((fn) => fn('cart'));
  },
  count() {
    return cartItems.reduce((a, i) => a + i.qty, 0);
  },
  clear() {
    this.set([]);
  },
};

// ---------- "Server" simulato ----------
/**
 * Sostituisce il catalogo con quello letto dal database: da quel momento il sito mostra
 * quello che c'è su Supabase, non quello compilato nel bundle. Restano le foto caricate
 * nel browser, le richieste, lo storico e le impostazioni scelte a mano nell'admin.
 */
function applyRemoteCatalog(cat) {
  const locali = db.media.filter((m) => String(m.src).startsWith('idb:'));
  const remoti = new Set(cat.media.map((m) => m.id));
  db.categories = clone(cat.categories);
  db.products = clone(cat.products);
  db.variants = clone(cat.variants);
  db.media = [...clone(cat.media), ...locali.filter((m) => !remoti.has(m.id))];
  db.redirects = clone(cat.redirects ?? []);
  // un database senza le tabelle delle offerte (migrazione non ancora applicata) non le cancella
  if (Array.isArray(cat.offers)) db.offers = clone(cat.offers);
  if (Array.isArray(cat.bundles)) db.bundles = clone(cat.bundles);
  if (Array.isArray(cat.bundle_items)) db.bundle_items = clone(cat.bundle_items);
  for (const [k, v] of Object.entries(cat.settings ?? {})) db.settings[k] = clone(v);
  db.catalog_source = 'supabase';
  db.catalog_at = nowIso();
  store.commit('catalog');
  return { prodotti: db.products.length, varianti: db.variants.length, foto: cat.media.length };
}

/** Da dove arriva il catalogo che si sta guardando. Serve all'admin per dirlo a chiaro. */
const catalogSource = () => (db.catalog_source === 'supabase' ? 'supabase' : 'bundle');

// Il database non deve mai far aspettare chi sta comprando: ogni chiamata ha un tempo
// massimo, e dopo un errore si smette di provarci per mezzo minuto invece di rallentare
// ogni singola azione. Nel frattempo il controllo lo fa il catalogo che abbiamo in pagina.
let remoteDownUntil = 0;
// Il database ha già la migrazione delle offerte (000009)? Lo dice validate_cart: senza
// discount_cents nella risposta è la versione precedente. In quel caso lo sconto si calcola
// in pagina sui prezzi letti dal database, e una richiesta con sconto non si salva nel
// database (vi finirebbe con il totale di listino, diverso da quello visto dal cliente).
let remoteOffers = null;
const remoteUsable = () => sbConfigured() && Date.now() > remoteDownUntil;
async function remote(fn, args, ms = 2500) {
  try {
    return await Promise.race([sbRpc(fn, args), new Promise((_, rej) => setTimeout(() => rej(new Error('tempo scaduto')), ms))]);
  } catch (e) {
    remoteDownUntil = Date.now() + 30000;
    console.warn(`${fn} dal database non riuscita (${e.message}): si continua con il catalogo in pagina`);
    return null;
  }
}

const api = {
  /**
   * Ricontrollo come farebbe il server: legge sempre lo stato salvato, non quello della pagina.
   * Con il database collegato il ricontrollo lo fa il database, che è l'unico a sapere
   * davvero quanto costa una variante adesso.
   */
  async validateCart(items) {
    if (remoteUsable()) {
      const r = await remote('validate_cart', { items: items.map((i) => ({ variant_id: i.variant_id, qty: i.qty, seen_price_cents: i.seen_price_cents ?? null })) });
      if (r && Array.isArray(r.lines)) {
        remoteOffers = 'discount_cents' in r;
        const mapped = remoteOffers ? remoteValidation(r, items) : null;
        if (mapped) return mapped;
      }
    }
    const idx = catalog();
    return validateCart(idx, items, catalogOfferConfig(idx));
  },
  /**
   * Crea la richiesta. Si manda anche il totale che il cliente ha visto: se nel frattempo
   * un'offerta è cambiata il database non crea nulla e risponde offer_changed, e la pagina
   * mostra il nuovo totale da confermare. Restituisce la richiesta, oppure
   * { offerChanged: true, validation } in quel caso.
   */
  async createCartRequest(validation) {
    if (remoteUsable()) {
      const okLines = validation.lines.filter((l) => l.status === 'ok');
      const items = okLines.map((l) => ({ variant_id: l.variant.id, qty: l.item.qty, seen_price_cents: l.unit_cents }));
      if (remoteOffers === false && (validation.discount_cents ?? 0) > 0) return localCartRequest(validation, makeRef('R', new Date()), false);
      const r = await remote('create_cart_request', remoteOffers === false ? { items } : { items, seen_total_cents: validation.total_cents });
      if (r?.ok && r.ref) return localCartRequest(validation, r.ref, true);
      if (r && r.ok === false && r.reason === 'offer_changed' && r.validation) {
        const mapped = remoteValidation(r.validation, okLines.map((l) => l.item));
        if (mapped) return { offerChanged: true, validation: mapped };
      }
    }
    return localCartRequest(validation, makeRef('R', new Date()), false);
  },
  createQuoteRequestRemoteFirst: null,
};

/** Il riepilogo resta anche nel browser: serve all'admin della preview e al tasto "copia". */
function localCartRequest(validation, ref, remota) {
    const items = validation.lines
      .filter((l) => l.status === 'ok')
      .map((l) => ({
        variant_id: l.variant.id,
        product_id: l.product.id,
        name: l.product.name,
        sku: l.variant.sku,
        size: l.variant.size,
        height_cm: l.variant.height_cm,
        qty: l.item.qty,
        unit_cents: l.unit_cents,
        discount_cents: l.discount_cents ?? 0,
      }));
    const r = {
      id: rid(),
      ref,
      type: 'cart',
      status: 'bozza',
      items,
      subtotal_cents: validation.subtotal_cents ?? validation.total_cents,
      discount_cents: validation.discount_cents ?? 0,
      offers: validation.offers ?? [],
      total_cents: validation.total_cents,
      quote: null,
      internal_notes: '',
      tracking: '',
      created_at: nowIso(),
      updated_at: nowIso(),
      history: [{ at: nowIso(), status: 'bozza', by: 'sito', note: (validation.discount_cents ?? 0) > 0 ? 'Riepilogo generato dal carrello, con offerta abbinata' : 'Riepilogo generato dal carrello' }],
    };
  db.requests.unshift(r);
  store.commit('requests');
  return r;
}

/**
 * Le righe tornate dal database si riallineano al catalogo in pagina, così la scheda si
 * disegna come al solito. I nomi dei campi sono quelli di validate_cart: `can_submit`,
 * non `canSubmit`, e la riga porta variant_id invece dell'oggetto variante.
 */
function remoteValidation(r, items) {
  const idx = catalog();
  const lines = r.lines.map((l) => {
    // idx.variants e idx.products sono Map indicizzate per id
    const variant = idx.variants.get(l.variant_id) ?? null;
    const product = variant ? idx.products.get(variant.product_id) : null;
    return {
      status: l.status,
      item: items.find((i) => i.variant_id === l.variant_id) ?? { variant_id: l.variant_id, qty: l.qty },
      variant,
      product,
      unit_cents: l.unit_cents ?? null,
      // un database senza la migrazione delle offerte non manda discount_cents: vale 0
      discount_cents: l.discount_cents ?? 0,
      qty: l.qty,
    };
  });
  // una riga che il database conosce ma il catalogo in pagina no: si rinuncia e si
  // ricontrolla in locale, meglio che disegnare una riga senza nome né prezzo
  if (lines.some((l) => l.status !== 'missing' && !l.variant)) return null;
  const discount = r.discount_cents ?? 0;
  return {
    lines,
    subtotal_cents: r.subtotal_cents ?? r.total_cents + discount,
    discount_cents: discount,
    total_cents: r.total_cents,
    offers: Array.isArray(r.offers) ? r.offers : [],
    issues: r.issues,
    canSubmit: r.can_submit === true,
  };
}

Object.assign(api, {
  async createQuoteRequest(q) {
    const ref = makeRef('Q', new Date());
    const r = {
      id: rid(),
      ref,
      type: q.b2b ? 'b2b' : 'quote',
      status: 'bozza',
      items: [],
      total_cents: null,
      quote: { ...q, price_cents: null, reply: '', custom_sku: null },
      internal_notes: '',
      tracking: '',
      created_at: nowIso(),
      updated_at: nowIso(),
      history: [{ at: nowIso(), status: 'bozza', by: 'sito', note: 'Richiesta di preventivo fuori misura' }],
    };
    db.requests.unshift(r);
    store.commit('requests');
    if (remoteUsable()) {
      // la funzione SQL ha i parametri separati, non un oggetto unico
      const res = await remote('create_quote_request', {
        p_product_id: q.product_id ?? null,
        p_width_cm: q.width_cm ?? null,
        p_length_cm: q.length_cm ?? null,
        p_height_cm: q.height_cm ?? null,
        p_notes: q.notes ?? '',
        p_b2b: !!q.b2b,
      });
      if (res?.ok && res.ref) {
        r.ref = res.ref;
        store.commit('requests');
      }
    }
    return r;
  },
  /** Il click su WhatsApp NON prova l'invio: diventa solo "in attesa di contatto". */
  markWaiting(ref) {
    const r = db.requests.find((x) => x.ref === ref);
    if (!r || r.status !== 'bozza') return;
    r.status = 'in_attesa_contatto';
    r.updated_at = nowIso();
    r.history.push({ at: nowIso(), status: r.status, by: 'sito', note: 'Il cliente ha aperto WhatsApp (invio non verificabile)' });
    store.commit('requests');
  },
  customSku: (id) => customSku(new Date(), id),
});

const REQUEST_STATUS = {
  bozza: 'Bozza',
  in_attesa_contatto: 'In attesa di contatto',
  in_trattativa: 'In trattativa',
  confermato_manualmente: 'Confermato su WhatsApp',
  in_preparazione: 'In preparazione',
  spedito: 'Spedito',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
  chiuso: 'Chiuso',
};
const REQUEST_TYPE = { cart: 'Carrello', quote: 'Fuori misura', b2b: 'Strutture ricettive' };

__exp.store = store;
__exp.whatsappNumber = whatsappNumber;
__exp.whatsappStatus = whatsappStatus;
__exp.media = media;
__exp.processUpload = processUpload;
__exp.siteImage = siteImage;
__exp.catalog = catalog;
__exp.mediaFor = mediaFor;
__exp.coverFor = coverFor;
__exp.cart = cart;
__exp.applyRemoteCatalog = applyRemoteCatalog;
__exp.catalogSource = catalogSource;
__exp.api = api;
__exp.REQUEST_STATUS = REQUEST_STATUS;
__exp.REQUEST_TYPE = REQUEST_TYPE;
});
__def("ui.js", function (__exp) {
// Piccoli helper DOM senza dipendenze.

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Transizione tra viste: View Transitions se disponibile, altrimenti classe CSS breve. */
function swap(el, html, { animate = true } = {}) {
  const apply = () => {
    el.innerHTML = html;
  };
  if (!animate || reducedMotion()) return apply();
  if (document.startViewTransition) {
    try {
      document.startViewTransition(apply);
      return;
    } catch {
      /* fallback sotto */
    }
  }
  apply();
  el.classList.remove('is-entering');
  void el.offsetWidth;
  el.classList.add('is-entering');
}

let toastTimer;
function toast(msg, kind = 'info') {
  let t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.dataset.kind = kind;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 3200);
}

/** Copia negli appunti; se il browser rifiuta, seleziona il testo di una textarea di riserva. */
async function copyText(text, fallbackTextarea) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Riepilogo copiato negli appunti');
    return true;
  } catch {
    if (fallbackTextarea) {
      fallbackTextarea.hidden = false;
      fallbackTextarea.value = text;
      fallbackTextarea.focus();
      fallbackTextarea.select();
      toast('Il testo è selezionato: copialo con Ctrl+C o tieni premuto e scegli Copia');
    } else toast('Copia non consentita da questo browser');
    return false;
  }
}

/** Dialog modale accessibile basato su <dialog>; niente alert/confirm (bloccati nel frame). */
function openDialog({ title, body, actions = [], wide = false, onClose }) {
  const d = document.createElement('dialog');
  d.className = 'dlg' + (wide ? ' dlg--wide' : '');
  d.setAttribute('aria-labelledby', 'dlg-title');
  d.innerHTML = `
    <div class="dlg__head"><h2 id="dlg-title">${esc(title)}</h2>
      <button class="icon-btn" data-close aria-label="Chiudi">${icon('close')}</button></div>
    <div class="dlg__body">${body}</div>
    ${actions.length ? `<div class="dlg__actions">${actions.map((a, i) => `<button class="btn ${a.kind === 'danger' ? 'btn--danger' : a.primary ? 'btn--primary' : 'btn--ghost'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}`;
  document.body.append(d);
  const prev = document.activeElement;
  const close = (v) => {
    d.close();
    d.remove();
    onClose?.(v);
    prev?.focus?.();
  };
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-close]')) close(null);
    const b = e.target.closest('[data-i]');
    if (b) {
      const a = actions[Number(b.dataset.i)];
      const r = a.onClick?.(d);
      if (r !== false) close(a.value ?? a.label);
    }
  });
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    close(null);
  });
  d.showModal();
  return { el: d, close };
}

function confirmDialog(title, message, confirmLabel, danger = false) {
  return new Promise((res) => {
    openDialog({
      title,
      body: `<p>${esc(message)}</p>`,
      actions: [
        { label: 'Annulla', value: false },
        { label: confirmLabel, value: true, primary: !danger, kind: danger ? 'danger' : undefined },
      ],
      onClose: (v) => res(v === true),
    });
  });
}

function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function fmtDate(iso) {
  try {
    return new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const ICONS = {
  cart: '<path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.1"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  pin: '<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  wa: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.5z"/><path d="M9 8.6c.2 2.9 2.6 5.4 5.6 5.8l1.1-1.2-1.7-.9-.8.8c-1.1-.4-2-1.3-2.4-2.4l.8-.8-.9-1.7z"/>',
  copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  arrowUp: '<path d="M12 18V6M7 11l5-5 5 5"/>',
  arrowDown: '<path d="M12 6v12M7 13l5 5 5-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  ruler: '<path d="M3 15.5L15.5 3l5.5 5.5L8.5 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  phone: '<path d="M6.6 3.5h2.7l1.4 4-2 1.4a11 11 0 0 0 6.4 6.4l1.4-2 4 1.4v2.7a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8"/>',
};
function icon(name, size = 22) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] ?? ''}</svg>`;
}

__exp.esc = esc;
__exp.$ = $;
__exp.$$ = $$;
__exp.reducedMotion = reducedMotion;
__exp.swap = swap;
__exp.toast = toast;
__exp.copyText = copyText;
__exp.openDialog = openDialog;
__exp.confirmDialog = confirmDialog;
__exp.slugify = slugify;
__exp.fmtDate = fmtDate;
__exp.icon = icon;
});
__def("illustrations.js", function (__exp) {
// Illustrazioni SCHEMATICHE dei prodotti (SVG generato), usate dove non ci sono
// foto confermate. Gli strati vengono dalla composizione pubblica del dataset;
// spessori e proporzioni NON sono in scala e non vanno letti come dati tecnici.

let uid = 0;
const C = 0.866;
const S = 0.5;

// Strati dall'alto verso il basso
const LAYERS = {
  eco: [
    { k: 'cover', label: 'Rivestimento', note: 'Antiacaro e ipoallergenico, non sfoderabile' },
    { k: 'foam', h: 16, label: 'Anima monoblocco', note: 'Poliuretano ad alta densità e alta portanza' },
  ],
  'memory-duo': [
    { k: 'cover', zip: true, label: 'Rivestimento sfoderabile', note: 'Lato invernale e lato estivo' },
    { k: 'memory', label: 'Memory Foam premium', note: 'Lo strato di comfort, ad alta densità' },
    { k: 'foam', h: 10, label: 'Base portante', note: 'Poliuretano ad alta densità' },
  ],
  // Stessa costruzione del Memory Duo, dichiarata dall'azienda; cambia il rivestimento.
  'memory-duo-classic': [
    { k: 'cover', label: 'Rivestimento fisso', note: 'Non sfoderabile' },
    { k: 'memory', label: 'Memory Foam premium', note: 'Lo strato di comfort, ad alta densità' },
    { k: 'foam', h: 10, label: 'Base portante', note: 'Poliuretano ad alta densità' },
  ],
  'memory-air-3d': [
    { k: 'cover', zip: true, mesh: true, label: 'Fascia perimetrale 3D', note: 'Traspirante, per la ventilazione laterale' },
    { k: 'memory', label: 'Memory Foam premium', note: 'Lo strato di comfort' },
    { k: 'foam', h: 10, label: 'Base portante', note: 'Poliuretano ad alta densità' },
  ],
  // 17/11/2026: strati ricavati dalle foto «esploso» consegnate dall'azienda, coerenti con la
  // composizione pubblicata (tre strati di Memory Foam). DA CONFERMARE i materiali di dettaglio.
  'memory-trio': [
    { k: 'cover', h: 8, label: 'Rivestimento', note: 'Trapuntato, con fascia laterale chiara' },
    { k: 'memory', label: 'Memory Foam', note: 'Primo dei tre strati, quello su cui ti sdrai' },
    { k: 'memory', c: 'cream', label: 'Memory Foam', note: 'Secondo strato' },
    { k: 'memory', c: 'sand', label: 'Memory Foam', note: 'Terzo strato: 27 cm in tutto' },
  ],
  // 17/11/2026: dalla foto «esploso» del Pocket 1600. DA CONFERMARE i materiali di dettaglio.
  'pocket-1600': [
    { k: 'cover', h: 8, label: 'Rivestimento', note: 'Trapuntato, con fascia laterale imbottita' },
    { k: 'memory', c: 'cream', label: 'Memory Foam', note: 'Lo strato di comfort' },
    { k: 'foam', c: 'white', h: 6, label: 'Poliuretano ad alta densità', note: 'Supporto e stabilizzazione' },
    { k: 'springs', label: 'Molle insacchettate', note: '1600 molle indipendenti' },
    { k: 'base', label: 'Base di stabilizzazione', note: 'Contiene il molleggio' },
  ],
  'pocket-3000-elite': [
    { k: 'cover', h: 8, zip: true, label: 'Rivestimento sfoderabile', note: 'Si apre con la cerniera' },
    { k: 'memory', label: 'Memory Foam', note: 'Lo strato di comfort' },
    { k: 'foam', h: 6, label: 'Poliuretano ad alta densità', note: 'Supporto e stabilizzazione' },
    { k: 'springs', label: 'Molle insacchettate', note: '3000 molle indipendenti' },
    { k: 'base', label: 'Base di stabilizzazione', note: 'Contiene il molleggio' },
  ],
};
// Rivestimento di ogni modello, preso dalle sue foto: colore del piano, fascia laterale,
// bordino, disegno della trapuntatura. Serve a riconoscere il modello anche nello schema.
const COVERS = {
  eco: { top: '#fbfbf8', side: '#efefea', sideR: '#e5e5df', piping: '#dcdcd5', stitch: '#bdb9ae', quilt: 'wave', band: 'plain' },
  'memory-duo-classic': { top: '#faf8f3', side: '#70402d', sideR: '#5c3324', piping: '#f3ede3', stitch: '#b8a48c', quilt: 'wave', band: 'diamond', handle: true },
  'memory-duo': { top: '#f8f8f6', side: '#454a51', sideR: '#383c42', piping: '#f2f2ef', stitch: '#a8acb2', quilt: 'ornate', band: 'diamond' },
  'memory-trio': { top: '#f1f2f3', side: '#e6e9eb', sideR: '#d9dde0', piping: '#ffffff', stitch: '#8b9298', quilt: 'hex', band: 'dots' },
  'pocket-1600': { top: '#f9f7f3', side: '#4d2c22', sideR: '#3f241b', piping: '#f2ece2', stitch: '#5f4136', quilt: 'puzzle', band: 'diamond', handle: true },
  'pocket-3000-elite': { top: '#fcfbf8', side: '#ab8464', sideR: '#957152', piping: '#c9ced2', stitch: '#b3ab9f', quilt: 'tuft', band: 'vertical', handle: true },
  'memory-air-3d': { top: '#fbf9f4', side: '#eef4f7', sideR: '#e2ebf0', piping: '#206786', stitch: '#c8785b', quilt: 'grid', band: 'plain' },
};
const DEFAULT_COVER = { top: '#fbf9f4', side: '#efe9dd', sideR: '#e4dccc', piping: '#206786', stitch: '#c8785b', quilt: 'grid', band: 'plain' };
const coverFor = (slug) => COVERS[slug] ?? DEFAULT_COVER;

// Toni alternativi degli strati, per gli strati che nelle foto hanno colori diversi
const TONES = {
  cream: { top: '#f3ead7', l: '#e7dbc1', r: '#dacdae', dot: '#c9b48a' },
  sand: { top: '#e9d8c3', l: '#dbc6aa', r: '#ccb595', dot: '#b49674' },
  white: { top: '#f7f8f9', l: '#e9ecef', r: '#dde1e5', dot: '#c5ccd3' },
};
/** Colore di un riquadro della legenda: quello dello strato disegnato. */
function swatchFor(p, l) {
  if (l.k === 'cover') return coverFor(p.slug).side === coverFor(p.slug).top ? coverFor(p.slug).top : `linear-gradient(180deg, ${coverFor(p.slug).top} 55%, ${coverFor(p.slug).side} 55%)`;
  return (l.c && TONES[l.c]?.top) || STYLE[l.k]?.top || '#ccc';
}

/** Strati dei modelli con composizione nota; il rivestimento porta il disegno del modello. */
function layersFor(p) {
  const ls = LAYERS[p.slug];
  // fascia un po' più alta del minimo, così si legge il colore laterale del modello
  return ls ? ls.map((l) => (l.k === 'cover' ? { ...l, h: l.h ?? 8, cs: coverFor(p.slug) } : l)) : null;
}

const STYLE = {
  cover: { h: 6, top: '#fbf9f4', l: '#efe9dd', r: '#e4dccc' },
  memory: { h: 7, top: '#a9d0ea', l: '#85b8dc', r: '#6ea6cf' },
  foam: { h: 9, top: '#f3ead6', l: '#e6d9bb', r: '#d9c9a4' },
  springs: { h: 10, top: '#e9eef2', l: '#dfe6ec', r: '#cfd9e1' },
  base: { h: 5, top: '#2a6f8f', l: '#1d5873', r: '#164a61' },
  topper: { h: 5, top: '#a9d0ea', l: '#85b8dc', r: '#6ea6cf' },
};

function P(x, y, z, o) {
  return [o.cx + (x - y) * C, o.cy + (x + y) * S - z];
}
const pts = (arr) => arr.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');

function slab(o, z0, h, st, extra = '') {
  const { w, d } = o;
  const z1 = z0 + h;
  const top = [P(0, 0, z1, o), P(w, 0, z1, o), P(w, d, z1, o), P(0, d, z1, o)];
  const left = [P(0, d, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(0, d, z1, o)];
  const right = [P(w, 0, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(w, 0, z1, o)];
  return `<polygon points="${pts(left)}" fill="${st.l}"/><polygon points="${pts(right)}" fill="${st.r}"/><polygon points="${pts(top)}" fill="${st.top}"/>${extra}
    <polyline points="${pts([P(0, d, z1, o), P(w, d, z1, o), P(w, 0, z1, o)])}" fill="none" stroke="rgba(14,52,68,.18)" stroke-width=".8"/>`;
}

/** Una linea sul piano del materasso: punti (u, v) in [0,1] → coordinate proiettate. */
const onTop = (o, z, list) => pts(list.map(([u, v]) => P(o.w * u, o.d * v, z, o)));

function quiltTop(o, z1, cs) {
  const st = `stroke="${cs.stitch}" stroke-width=".9" fill="none"`;
  let s = '';
  const wave = (v, amp, n = 4, opacity = 0.6) => {
    const ps = [];
    for (let k = 0; k <= 48; k++) {
      const u = 0.04 + (0.92 * k) / 48;
      ps.push([u, v + amp * Math.sin(u * Math.PI * 2 * n)]);
    }
    return `<polyline points="${onTop(o, z1, ps)}" ${st} stroke-dasharray="2.2 2" opacity="${opacity}"/>`;
  };
  if (cs.quilt === 'wave') for (let j = 1; j < 7; j++) s += wave(j / 7, 0.035);
  else if (cs.quilt === 'ornate') {
    for (let j = 1; j < 6; j++) s += wave(j / 6, 0.04, 3, 0.5);
    for (let i = 0; i < 10; i++) {
      const [x, y] = P(o.w * (0.1 + ((i * 37) % 80) / 100), o.d * (0.12 + ((i * 53) % 76) / 100), z1, o);
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4" ry="2.2" ${st} opacity=".45"/>`;
    }
  } else if (cs.quilt === 'hex') {
    // catene di esagoni, come sul tessuto delle foto
    for (const [v0, v1] of [[0.2, 0.75], [0.55, 1.1]]) {
      for (let k = 0; k < 9; k++) {
        const u = 0.08 + k * 0.105;
        const v = v0 + (v1 - v0) * (k / 9) - 0.12;
        const r = 0.035;
        const hex = Array.from({ length: 7 }, (_, a) => [u + r * Math.cos((a * Math.PI) / 3), v + r * 1.3 * Math.sin((a * Math.PI) / 3)]);
        if (v > 0.03 && v < 0.97) s += `<polyline points="${onTop(o, z1, hex)}" ${st} opacity=".6"/>`;
      }
    }
    for (let j = 1; j < 5; j++) s += wave(j / 5, 0.03, 2, 0.35);
  } else if (cs.quilt === 'puzzle') {
    // trapuntatura a incastro: onde in entrambe le direzioni
    for (let j = 1; j < 6; j++) s += wave(j / 6, 0.03, 5, 0.6);
    for (let i = 1; i < 8; i++) {
      const ps = [];
      for (let k = 0; k <= 36; k++) {
        const v = 0.04 + (0.92 * k) / 36;
        ps.push([i / 8 + 0.025 * Math.sin(v * Math.PI * 8), v]);
      }
      s += `<polyline points="${onTop(o, z1, ps)}" ${st} opacity=".55"/>`;
    }
  } else if (cs.quilt === 'tuft') {
    // capitonné: bottoni con le pieghe che partono a raggiera
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 5; j++) {
        const u = (i + 0.5 + (j % 2) * 0.5) / 6.5;
        const v = (j + 0.5) / 5;
        const [x, y] = P(o.w * u, o.d * v, z1, o);
        s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.7" ry="1" fill="${cs.stitch}" opacity=".9"/>`;
        for (const [du, dv] of [[0.045, 0], [-0.045, 0], [0, 0.06], [0, -0.06]]) s += `<polyline points="${onTop(o, z1, [[u, v], [u + du, v + dv]])}" ${st} stroke-width=".6" opacity=".5"/>`;
      }
  } else {
    for (let i = 1; i < 7; i++) s += `<polyline points="${onTop(o, z1, [[i / 7, 0], [i / 7, 1]])}" ${st} stroke-dasharray="2.4 2.6" opacity=".55"/>`;
    for (let j = 1; j < 5; j++) s += `<polyline points="${onTop(o, z1, [[0, j / 5], [1, j / 5]])}" ${st} stroke-dasharray="2.4 2.6" opacity=".45"/>`;
  }
  return s;
}

/** Fascia laterale del rivestimento: colore e disegno del modello. */
function band(o, z0, h, cs, id) {
  const { w, d } = o;
  const z1 = z0 + h;
  const left = pts([P(0, d, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(0, d, z1, o)]);
  const right = pts([P(w, 0, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(w, 0, z1, o)]);
  let s = `<polygon points="${left}" fill="${cs.side}"/><polygon points="${right}" fill="${cs.sideR}"/>`;
  const line = (a, b, extra = '') => `<polyline points="${pts([a, b])}" stroke="${cs.stitch}" stroke-width=".7" fill="none" ${extra}/>`;
  if (cs.band === 'diamond') {
    const n = 22;
    for (let i = -2; i < n + 2; i++) {
      const x0 = (w * i) / n;
      const x1 = (w * (i + 2)) / n;
      if (x0 >= 0 && x1 <= w) {
        s += line(P(x0, d, z0 + 1, o), P(x1, d, z1 - 1, o), 'opacity=".55"');
        s += line(P(x1, d, z0 + 1, o), P(x0, d, z1 - 1, o), 'opacity=".55"');
      }
    }
    for (let j = 0; j < 14; j += 2) {
      const y0 = (d * j) / 16;
      const y1 = (d * (j + 2)) / 16;
      s += line(P(w, y0, z0 + 1, o), P(w, y1, z1 - 1, o), 'opacity=".45"');
      s += line(P(w, y1, z0 + 1, o), P(w, y0, z1 - 1, o), 'opacity=".45"');
    }
  } else if (cs.band === 'vertical') {
    for (let i = 1; i < 40; i++) s += line(P((w * i) / 40, d, z0 + 1, o), P((w * i) / 40, d, z1 - 1, o), 'opacity=".55"');
    for (let j = 1; j < 26; j++) s += line(P(w, (d * j) / 26, z0 + 1, o), P(w, (d * j) / 26, z1 - 1, o), 'opacity=".45"');
  } else if (cs.band === 'dots') {
    for (let i = 1; i < 30; i++) {
      const [x, y] = P((w * i) / 30, d, z0 + h * (i % 2 ? 0.35 : 0.65), o);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r=".9" fill="${cs.stitch}" opacity=".5"/>`;
    }
  } else {
    for (let i = 1; i < 26; i++) s += line(P((w * i) / 26, d, z0 + 1, o), P((w * i) / 26, d, z1 - 1, o), 'stroke-opacity=".25"');
  }
  if (cs.handle) {
    const a = P(w * 0.8, d, z0 + h * 0.3, o);
    const b = P(w * 0.9, d, z0 + h * 0.3, o);
    const c = P(w * 0.9, d, z0 + h * 0.72, o);
    const e = P(w * 0.8, d, z0 + h * 0.72, o);
    s += `<polygon points="${pts([a, b, c, e])}" fill="none" stroke="${cs.piping}" stroke-width=".9" opacity=".8"/>`;
  }
  return s;
}

function coverDetails(o, z0, h, ly, id) {
  const { w, d } = o;
  const z1 = z0 + h;
  const cs = ly.cs ?? DEFAULT_COVER;
  let s = '';
  if (ly.mesh) {
    s += `<polygon points="${pts([P(0, d, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(0, d, z1, o)])}" fill="url(#mesh${id})"/>`;
    s += `<polygon points="${pts([P(w, 0, z0, o), P(w, d, z0, o), P(w, d, z1, o), P(w, 0, z1, o)])}" fill="url(#mesh${id})" opacity=".8"/>`;
  } else s += band(o, z0, h, cs, id);
  s += quiltTop(o, z1, cs);
  // bordino: sul piano e alla base della fascia
  s += `<polyline points="${pts([P(0, d, z1, o), P(w, d, z1, o), P(w, 0, z1, o)])}" fill="none" stroke="${cs.piping}" stroke-width="2.2" stroke-linejoin="round"/>`;
  s += `<polyline points="${pts([P(0, d, z0, o), P(w, d, z0, o), P(w, 0, z0, o)])}" fill="none" stroke="${cs.piping}" stroke-width="1.6" stroke-linejoin="round"/>`;
  if (ly.zip) s += `<polyline points="${pts([P(w * 0.08, d, z0 + h * 0.18, o), P(w * 0.92, d, z0 + h * 0.18, o)])}" stroke="#8a97a0" stroke-width=".9" stroke-dasharray="1.2 1.2" fill="none"/>`;
  return s;
}

function memoryDots(o, z0, h, color = '#6ea6cf') {
  let s = '';
  const z1 = z0 + h;
  for (let i = 0; i < 26; i++) {
    const x = ((i * 37) % 97) / 97;
    const y = ((i * 53) % 89) / 89;
    const [px, py] = P(o.w * (0.05 + 0.9 * x), o.d * (0.05 + 0.9 * y), z1, o);
    s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="1.1" ry=".6" fill="${color}" opacity=".55"/>`;
  }
  return s;
}

function springs(o, z0, h) {
  const { w, d } = o;
  let s = '';
  const n = 14;
  // file sulla faccia sinistra (anteriore)
  for (let i = 0; i < n; i++) {
    const x = (w * (i + 0.5)) / n;
    const [bx, by] = P(x, d, z0, o);
    const tone = i % 3 === 1 ? '#8fbadb' : '#f4f6f8';
    s += `<rect x="${(bx - 4.6).toFixed(1)}" y="${(by - h).toFixed(1)}" width="9.2" height="${h}" rx="3.5" fill="${tone}" stroke="rgba(14,52,68,.22)" stroke-width=".6"/>`;
    s += `<line x1="${(bx - 4).toFixed(1)}" x2="${(bx + 4).toFixed(1)}" y1="${(by - h / 2).toFixed(1)}" y2="${(by - h / 2).toFixed(1)}" stroke="rgba(14,52,68,.15)" stroke-width=".6"/>`;
  }
  // file sulla faccia destra
  const m = 11;
  for (let j = 0; j < m; j++) {
    const y = (d * (j + 0.5)) / m;
    const [bx, by] = P(w, y, z0, o);
    const tone = j % 3 === 2 ? '#7fb0d4' : '#e4eaef';
    s += `<rect x="${(bx - 4.2).toFixed(1)}" y="${(by - h).toFixed(1)}" width="8.4" height="${h}" rx="3.3" fill="${tone}" stroke="rgba(14,52,68,.2)" stroke-width=".6"/>`;
  }
  // tappi sul piano
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 7; j++) {
      const [px, py] = P((w * (i + 0.5)) / 9, (d * (j + 0.5)) / 7, z0 + h, o);
      s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="5" ry="2.6" fill="${(i + j) % 4 === 0 ? '#a9cbe4' : '#fff'}" stroke="rgba(14,52,68,.15)" stroke-width=".5"/>`;
    }
  return s;
}

/**
 * Materasso a strati. `ex` (0–1) apre gli strati: in CSS ogni strato usa
 * translateY(calc(var(--ex) * var(--i) * -1 * var(--gap))).
 */
function mattressSvg(layers, { title = '', gap = 30, compact = false } = {}) {
  const id = ++uid;
  const o = { w: 200, d: 150, cx: 0, cy: 0 };
  const list = layers.map((l) => ({ ...l, h: (l.h ?? STYLE[l.k].h) * 2.2 }));
  const total = list.reduce((a, l) => a + l.h, 0);
  const maxLift = gap * (list.length - 1);
  // limiti della proiezione
  const minX = -o.d * C;
  const maxX = o.w * C;
  const pad = 14;
  o.cx = -minX + pad;
  o.cy = pad + total + (compact ? gap * 0.6 : maxLift) + 2;
  const vbW = maxX - minX + pad * 2;
  const vbH = o.cy + (o.w + o.d) * S + pad;
  let z = 0;
  const groups = [];
  // dal basso verso l'alto: l'ultimo disegnato copre quelli sotto
  [...list].reverse().forEach((ly, i) => {
    const tone = ly.c && TONES[ly.c];
    const st = ly.k === 'cover' && ly.cs ? { top: ly.cs.top, l: ly.cs.side, r: ly.cs.sideR } : tone ? { ...STYLE[ly.k], ...tone } : STYLE[ly.k];
    let inner = slab(o, z, ly.h, st);
    if (ly.k === 'cover') inner += coverDetails(o, z, ly.h, ly, id);
    if (ly.k === 'memory') inner += memoryDots(o, z, ly.h, tone?.dot);
    if (ly.k === 'springs') inner += springs(o, z, ly.h);
    groups.push(`<g class="ly" style="--i:${i}">${inner}</g>`);
    z += ly.h;
  });
  // ombra a terra
  const shadow = `<polygon points="${pts([P(-6, -6, 0, o), P(o.w + 6, -6, 0, o), P(o.w + 10, o.d + 10, 0, o), P(-6, o.d + 6, 0, o)])}" fill="rgba(14,52,68,.16)" filter="url(#blur${id})"/>`;
  return `<svg class="mx" viewBox="0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}" style="--gap:${gap}px" role="img" aria-label="${title ? title + ': ' : ''}schema illustrativo degli strati, non in scala">
    <defs><filter id="blur${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
    <pattern id="mesh${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="5" height="5" fill="#eef4f7"/><circle cx="2.5" cy="2.5" r="1.25" fill="#9fc2d6"/></pattern></defs>
    ${shadow}${groups.join('')}</svg>`;
}

function baseSvg(strong = false) {
  const o = { w: 210, d: 150, cx: 0, cy: 0 };
  const pad = 14;
  o.cx = o.d * C + pad;
  o.cy = pad + 30;
  const vbW = (o.w + o.d) * C + pad * 2;
  const vbH = o.cy + (o.w + o.d) * S + pad + 20;
  const frame = '#1d5873';
  let s = `<polygon points="${pts([P(-4, -4, 0, o), P(o.w + 4, -4, 0, o), P(o.w + 8, o.d + 8, 0, o), P(-4, o.d + 4, 0, o)])}" fill="rgba(14,52,68,.14)"/>`;
  // piedi
  for (const [x, y] of [[4, o.d - 4], [o.w - 4, o.d - 4], [o.w - 4, 4]]) {
    const [a, b] = P(x, y, 0, o);
    s += `<rect x="${(a - 2.5).toFixed(1)}" y="${(b - 18).toFixed(1)}" width="5" height="18" rx="1.5" fill="${frame}"/>`;
  }
  // telaio
  s += slab(o, 18, strong ? 7 : 5, { top: '#2a6f8f', l: frame, r: '#164a61' });
  // doghe in legno
  const n = strong ? 16 : 13;
  for (let i = 0; i < n; i++) {
    const x = (o.w * (i + 0.5)) / n;
    const a = P(x - 4, 6, 24 + (strong ? 2 : 0), o);
    const b = P(x + 4, 6, 24 + (strong ? 2 : 0), o);
    const c = P(x + 4, o.d - 6, 24 + (strong ? 2 : 0), o);
    const d = P(x - 4, o.d - 6, 24 + (strong ? 2 : 0), o);
    s += `<polygon points="${pts([a, b, c, d])}" fill="${i % 2 ? '#dcbf91' : '#e6cda3'}" stroke="#b8975f" stroke-width=".5"/>`;
  }
  return `<svg class="mx" viewBox="0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}" role="img" aria-label="Schema illustrativo della rete a doghe">${s}</svg>`;
}

function pillowSvg(variant = 'classic') {
  const id = ++uid;
  const cervical = variant === 'cervical';
  const body = cervical
    ? 'M40 92 C40 60 70 52 120 56 C150 58 160 70 180 70 C200 70 210 58 240 56 C280 54 300 66 300 92 C300 120 270 128 170 128 C70 128 40 122 40 92 Z'
    : 'M46 70 C40 50 70 40 170 40 C270 40 300 50 294 70 C300 92 300 106 294 124 C300 142 270 152 170 152 C70 152 40 142 46 124 C40 106 40 92 46 70 Z';
  const fill = variant === 'piuma' ? '#fbf9f4' : variant === 'flakes' ? '#eef5fa' : '#e3eff8';
  return `<svg class="mx mx--pillow" viewBox="0 0 340 190" role="img" aria-label="Schema illustrativo del guanciale">
    <defs><radialGradient id="pg${id}" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${fill}"/></radialGradient>
    <filter id="pb${id}"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <ellipse cx="170" cy="${cervical ? 146 : 166}" rx="130" ry="12" fill="rgba(14,52,68,.16)" filter="url(#pb${id})"/>
    <path d="${body}" fill="url(#pg${id})" stroke="rgba(14,52,68,.25)" stroke-width="1.4"/>
    <path d="${body}" fill="none" stroke="#c8785b" stroke-width="1.3" stroke-dasharray="4 4" transform="translate(170 ${cervical ? 92 : 96}) scale(.9) translate(-170 -${cervical ? 92 : 96})" opacity=".7"/>
    ${variant === 'flakes' ? Array.from({ length: 18 }, (_, i) => `<circle cx="${80 + ((i * 47) % 180)}" cy="${70 + ((i * 29) % 60)}" r="2.2" fill="#9fc2d6" opacity=".6"/>`).join('') : ''}
  </svg>`;
}

/** Illustrazione per un prodotto, in base a categoria e slug. */
function productIllustration(p, kind, opts = {}) {
  if (kind === 'rete') return baseSvg(/strong/.test(p.slug));
  if (kind === 'guanciale') return pillowSvg(/cerv/.test(p.slug) ? 'cervical' : /piuma/.test(p.slug) ? 'piuma' : /flakes/.test(p.slug) ? 'flakes' : 'classic');
  if (kind === 'topper') return mattressSvg([{ k: 'cover', zip: true, h: 4, label: '' }, { k: 'topper', label: '' }], { title: p.name, ...opts });
  const ls = layersFor(p);
  // composizione non confermata: materasso chiuso, senza strati
  if (!ls) return mattressSvg([{ k: 'cover', h: 20, label: '', cs: coverFor(p.slug) }], { title: p.name, ...opts, gap: 0 });
  return mattressSvg(ls, { title: p.name, ...opts });
}

__exp.coverFor = coverFor;
__exp.swatchFor = swatchFor;
__exp.layersFor = layersFor;
__exp.mattressSvg = mattressSvg;
__exp.baseSvg = baseSvg;
__exp.pillowSvg = pillowSvg;
__exp.productIllustration = productIllustration;
});
__def("naples.js", function (__exp) {
// Panorama ILLUSTRATO del Golfo di Napoli: segnaposto dell'apertura finché non
// viene caricata una foto reale dall'admin (slot "hero_napoli"). Nessun elemento
// esterno: tutto SVG, animazioni solo CSS e rispettose di prefers-reduced-motion.

// Profilo Somma–Vesuvio (coordinate del viewBox 1600×1000), usato anche dalla cucitura
const NAPLES_RIDGE = 'M 610 640 C 700 600, 760 560, 840 520 C 880 500, 905 470, 930 462 C 960 452, 990 458, 1010 470 C 1030 452, 1052 418, 1078 414 C 1104 410, 1126 440, 1150 470 C 1210 520, 1300 572, 1420 620 C 1480 640, 1540 648, 1600 650';

function windows(x, y, w, h, seed) {
  let s = '';
  const cols = Math.max(1, Math.floor(w / 9));
  const rows = Math.max(1, Math.floor(h / 12));
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 13 + seed) % 5 === 0) continue;
      s += `<rect x="${x + 3 + i * 9}" y="${y + 4 + j * 12}" width="3.4" height="5" fill="${(i + j + seed) % 4 === 0 ? '#ffe2a8' : 'rgba(14,52,68,.3)'}"/>`;
    }
  return s;
}

function city() {
  // case affacciate sul lungomare, colori dei palazzi napoletani
  const palette = ['#e8c49a', '#d99d7c', '#f1dfc4', '#e3b28f', '#cfa58a', '#efd2a9', '#d7b8a0', '#e9cbb2'];
  let s = '';
  let x = 0;
  let k = 0;
  while (x < 640) {
    const w = 26 + ((k * 37) % 30);
    const h = 26 + ((k * 53) % 46) + (x < 260 ? 18 : 0);
    const y = 664 - h;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h + 8}" fill="${palette[k % palette.length]}"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="3" fill="rgba(255,255,255,.35)"/>`;
    s += windows(x, y, w, h, k);
    x += w - 2;
    k++;
  }
  // collina del Vomero con Castel Sant'Elmo stilizzato
  s = `<path d="M0 600 C 80 560, 170 548, 250 566 C 300 576, 330 590, 380 612 L 380 664 L 0 664 Z" fill="#7d8f7a" opacity=".55"/>
    <path d="M150 556 h60 v-14 h-10 v-8 h-40 v8 h-10 Z" fill="#c9b79b"/>` + s;
  // Castel dell'Ovo sul suo isolotto
  s += `<g transform="translate(560 640)">
      <path d="M-40 26 C -20 14, 60 12, 120 26 Z" fill="#6f7f72"/>
      <path d="M0 22 V-6 h16 v-8 h10 v8 h22 v-12 h12 v12 h26 v28 Z" fill="#d6c3a2"/>
      <path d="M0 -6 h86 v4 H0 Z" fill="#b9a585"/>
      ${[6, 30, 54, 74].map((xx) => `<rect x="${xx}" y="4" width="4" height="7" fill="rgba(14,52,68,.35)"/>`).join('')}
    </g>`;
  return s;
}

function pine() {
  // pino marittimo in controluce, primo piano a sinistra (Posillipo)
  return `<g class="np-pine" fill="#0b2a37">
    <path d="M118 1000 C 126 880, 150 790, 214 700 C 236 670, 262 650, 290 640 L 298 650 C 270 664, 248 684, 230 712 C 176 794, 152 884, 150 1000 Z"/>
    <path d="M214 700 C 200 680, 186 668, 170 662 L 174 654 C 194 660, 212 674, 226 692 Z"/>
    <ellipse cx="300" cy="610" rx="190" ry="54"/>
    <ellipse cx="200" cy="636" rx="120" ry="40"/>
    <ellipse cx="410" cy="628" rx="110" ry="34"/>
    <ellipse cx="300" cy="580" rx="120" ry="34"/>
    <ellipse cx="120" cy="660" rx="80" ry="26"/>
  </g>`;
}

function boat(x, y, s, cls) {
  return `<g class="np-boat ${cls}" transform="translate(${x} ${y}) scale(${s})">
    <path d="M-20 0 H22 L16 8 H-14 Z" fill="#f7f1e8"/>
    <path d="M0 -2 V-44 L22 -4 Z" fill="#fffcf7"/><path d="M-2 -4 V-36 L-18 -4 Z" fill="#f2e6d6"/>
  </g>`;
}

function naplesSvg({ id = 'np', stitch = true } = {}) {
  const shimmer = Array.from({ length: 16 }, (_, i) => {
    const y = 672 + i * 18 + (i * i) / 2;
    const w = 40 + i * 14;
    return `<line class="np-glint" style="--k:${i % 4}" x1="${1150 - w}" x2="${1150 + w}" y1="${y}" y2="${y}" stroke="#ffd9a8" stroke-width="${2 + i * 0.25}" stroke-linecap="round" stroke-dasharray="${8 + i} ${14 + i * 2}" opacity="${0.95 - i * 0.03}"/>`;
  }).join('');
  return `<svg class="naples" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrazione del Golfo di Napoli al tramonto, con il Vesuvio, il lungomare e Castel dell'Ovo">
  <defs>
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0e3444"/><stop offset=".38" stop-color="#2b6a85"/>
      <stop offset=".62" stop-color="#d9a98a"/><stop offset=".8" stop-color="#f4cfa4"/><stop offset="1" stop-color="#f7e2c4"/>
    </linearGradient>
    <radialGradient id="${id}-sun" cx="1150" cy="590" r="420" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff2d6" stop-opacity=".95"/><stop offset=".18" stop-color="#ffd59c" stop-opacity=".55"/><stop offset="1" stop-color="#ffd59c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5c8ea3"/><stop offset=".25" stop-color="#2e6f8b"/><stop offset="1" stop-color="#0e3444"/>
    </linearGradient>
    <linearGradient id="${id}-vol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a5c70"/><stop offset=".7" stop-color="#6d8796"/><stop offset="1" stop-color="#8ea3ab"/>
    </linearGradient>
    <linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7e2c4" stop-opacity="0"/><stop offset="1" stop-color="#f7e2c4" stop-opacity=".55"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#${id}-sky)"/>
  <g class="np-stars" fill="#f7f1e8">${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 233) % 1600}" cy="${30 + ((i * 97) % 240)}" r="${i % 3 === 0 ? 1.6 : 1}" opacity="${0.35 + (i % 4) * 0.12}"/>`).join('')}</g>
  <circle cx="1150" cy="590" r="420" fill="url(#${id}-sun)" class="np-sunglow"/>
  <g class="np-clouds" fill="#f7e2c4" opacity=".45">
    <path class="np-cloud a" d="M120 300 q40 -26 90 -8 q30 -24 70 -4 q40 -6 52 18 H120 Z"/>
    <path class="np-cloud b" d="M980 230 q50 -30 110 -10 q40 -22 84 2 q36 0 46 22 H980 Z"/>
    <path class="np-cloud c" d="M560 360 q30 -18 70 -6 q30 -16 60 2 H560 Z"/>
  </g>
  <path d="M1360 640 C 1420 626, 1500 612, 1600 618 L1600 650 L1340 650 Z" fill="#7f97a3" opacity=".6"/>
  <path d="M0 640 C 40 632, 90 630, 130 640 Z" fill="#7f97a3" opacity=".5"/>
  <path class="np-vesuvio" d="${NAPLES_RIDGE} L1600 660 L600 660 Z" fill="url(#${id}-vol)"/>
  <path d="${NAPLES_RIDGE}" fill="none" stroke="#ffd9b0" stroke-width="2" opacity=".55"/>
  <path d="${NAPLES_RIDGE} L1600 660 L600 660 Z" fill="url(#${id}-haze)"/>
  <rect x="0" y="652" width="1600" height="348" fill="url(#${id}-sea)"/>
  <g class="np-glints">${shimmer}</g>
  <g transform="translate(250 0)">${city()}</g>
  ${boat(860, 760, 1.1, 'b1')}${boat(1320, 720, 0.75, 'b2')}${boat(420, 820, 1.4, 'b3')}
  <g transform="translate(-150 40) scale(.92)">${pine()}</g>
  <path d="M0 930 C 300 905, 700 912, 1000 930 C 1240 944, 1450 936, 1600 924 L1600 1000 L0 1000 Z" fill="#0b2a37" opacity=".9"/>
  ${stitch ? `<g class="stitch-svg" transform="translate(0 -10)"><mask id="${id}-sew"><path class="reveal" pathLength="1" d="${NAPLES_RIDGE}" fill="none"/></mask>
    <path class="thread" d="${NAPLES_RIDGE}" mask="url(#${id}-sew)"/>
    <circle class="needle" r="7" style="offset-path: path('${NAPLES_RIDGE}')"/></g>` : ''}
  </svg>`;
}

__exp.NAPLES_RIDGE = NAPLES_RIDGE;
__exp.naplesSvg = naplesSvg;
});
__def("hero.js", function (__exp) {
// Markup dell'apertura, senza dipendenze dal DOM: usato dall'app e da
// scripts/static_hero.mjs, che lo scrive direttamente in index.html.
const {naplesSvg} = __req("naples.js");
const {SITE_SLOTS, HERO_SLIDES, HERO_CAPTIONS} = __req("slots.js");

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Diapositive predefinite (senza foto caricate dall'admin). */
function defaultSlides() {
  return HERO_SLIDES.map((key) => {
    const d = SITE_SLOTS.find((x) => x.key === key)?.default;
    return d ? { key, ...d, caption: HERO_CAPTIONS[key], illustrative: true } : null;
  }).filter(Boolean);
}

// Marchio cucito: profilo del Vesuvio che si disegna durante l'ingresso
const MARK = 'M10 74 C 30 66, 44 56, 58 44 C 64 38, 68 34, 74 34 C 79 34, 82 38, 86 40 C 90 30, 96 22, 104 22 C 112 22, 118 32, 124 42 C 138 56, 152 66, 170 74';

function heroHtml(slides = defaultSlides()) {
  const visual = slides.length
    ? `<div class="hero__slides" data-slides="${slides.length}">${slides
        .map(
          (s, i) => `<figure class="slide${i === 0 ? ' is-active' : ''}" data-i="${i}" data-caption="${esc(s.caption)}" data-illustrative="${s.illustrative ? 1 : 0}" ${i === 0 ? '' : 'aria-hidden="true"'}>
          <img src="${esc(s.src)}" ${s.srcset ? `srcset="${esc(s.srcset)}" sizes="100vw"` : ''} alt="${esc(s.alt)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`,
        )
        .join('')}</div>`
    : `<div class="hero__slides"><figure class="slide is-active">${naplesSvg({ id: 'hn' })}</figure></div>`;
  const dots =
    slides.length > 1
      ? `<div class="hero__ctrl" role="group" aria-label="Immagini dell'apertura">
        ${slides.map((s, i) => `<button class="hero__dot${i === 0 ? ' is-active' : ''}" data-act="hero-go" data-i="${i}" aria-label="Immagine ${i + 1}: ${esc(s.caption)}" aria-current="${i === 0}"><span></span></button>`).join('')}
        <button class="hero__pause" data-act="hero-pause" aria-pressed="false" aria-label="Metti in pausa le immagini"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path class="i-pause" d="M3 2h3v10H3zM8 2h3v10H8z"/><path class="i-play" d="M3 2l9 5-9 5z"/></svg></button>
      </div>`
      : '';
  return `<section class="hero hero--slides is-intro" aria-labelledby="hero-title" aria-roledescription="presentazione">
    <div class="hero__visual">
      ${visual}
      <div class="hero__scrim"></div>
      <div class="hero__intro" aria-hidden="true"><i></i><i></i><i></i><i></i>
        <svg class="hero__mark" viewBox="0 0 180 90"><path pathLength="1" d="${MARK}"/></svg>
      </div>
      ${dots}
      <span class="hero__badge" id="hero-badge"></span>
    </div>
    <div class="hero__content">
      <p class="hero__kicker">Fabbrica di materassi a Casoria, Napoli</p>
      <h1 id="hero-title"><span class="ln"><span>Materassi di</span></span><span class="ln"><span>fabbrica, cuciti</span></span><span class="ln"><span>sotto il <em>Vesuvio</em>.</span></span></h1>
      <p class="lead">Dal 1986 li produciamo noi, alle porte di Napoli, e li vendiamo senza intermediari: prezzo di fabbrica, misure standard e, su richiesta, misure e altezze personalizzate.</p>
      <div class="btn-row">
        <a class="btn btn--primary" href="#/materassi/">Esplora i materassi</a>
        <a class="btn btn--glass" href="#/sleep-match/">Trova il tuo materasso</a>
      </div>
      ${slides.length ? `<p class="hero__caption" id="hero-caption"><span>${esc(slides[0].caption)}</span></p>` : ''}
    </div>
    <ul class="hero__strip" aria-label="In breve">
      <li><strong>Dal 1986</strong>Produzione a Casoria</li>
      <li><strong>Prezzo di fabbrica</strong>Senza intermediari</li>
      <li><strong>Su misura</strong>Misure e altezze a richiesta</li>
      <li><strong>Spedizione gratuita</strong>In Italia, isole comprese</li>
    </ul>
  </section>`;
}

__exp.defaultSlides = defaultSlides;
__exp.heroHtml = heroHtml;
});
__def("heroctl.js", function (__exp) {
// Regia dell'apertura: ingresso a strati, cambio immagine con "telo" che scorre,
// zoom lento, avanzamento cucito sui pallini, pausa, swipe.
// Il tempo di ogni immagine lo scandisce l'animazione CSS del pallino attivo:
// in pausa (o con movimento ridotto) l'animazione si ferma e la presentazione pure.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHero(hero) {
  if (!hero || hero.dataset.ready) return;
  hero.dataset.ready = '1';
  const slides = [...hero.querySelectorAll('.slide')];
  const dots = [...hero.querySelectorAll('.hero__dot')];
  const caption = hero.querySelector('#hero-caption span');
  const badge = hero.querySelector('#hero-badge');
  const pauseBtn = hero.querySelector('.hero__pause');
  // l'ingresso dura poco: dopo si toglie la classe, così non si ripete
  setTimeout(() => hero.classList.remove('is-intro'), reduced() ? 0 : 2300);
  if (slides.length < 2) return;

  let i = 0;
  let busy = false;
  let userPaused = reduced();
  const setPaused = () => {
    const auto = hero.dataset.offscreen === '1' || document.hidden;
    hero.classList.toggle('is-paused', userPaused || auto);
    pauseBtn?.setAttribute('aria-pressed', String(userPaused));
    pauseBtn?.setAttribute('aria-label', userPaused ? 'Riprendi le immagini' : 'Metti in pausa le immagini');
  };
  setPaused();

  function go(n, dir = 1) {
    if (busy || n === i) return;
    busy = true;
    const prev = slides[i];
    const next = slides[(n + slides.length) % slides.length];
    i = (n + slides.length) % slides.length;
    next.classList.remove('dir-back');
    if (dir < 0) next.classList.add('dir-back');
    prev.classList.add('is-leaving');
    next.classList.add('is-active', 'is-entering');
    next.removeAttribute('aria-hidden');
    const done = () => {
      prev.classList.remove('is-active', 'is-leaving');
      prev.setAttribute('aria-hidden', 'true');
      next.classList.remove('is-entering');
      busy = false;
    };
    setTimeout(done, reduced() ? 0 : 1250);
    dots.forEach((d, k) => {
      const on = k === i;
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-current', String(on));
    });
    // riavvia l'avanzamento del pallino attivo
    const bar = dots[i]?.querySelector('span');
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
    }
    if (caption) {
      caption.classList.remove('is-in');
      void caption.offsetWidth;
      caption.textContent = next.dataset.caption || '';
      caption.classList.add('is-in');
    }

  }

  dots.forEach((d) => {
    d.addEventListener('click', () => go(Number(d.dataset.i), Number(d.dataset.i) > i ? 1 : -1));
    d.querySelector('span')?.addEventListener('animationend', () => {
      if (d.classList.contains('is-active') && !hero.classList.contains('is-paused')) go(i + 1);
    });
  });
  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    setPaused();
  });

  // swipe orizzontale sull'immagine (mobile)
  let x0 = null;
  const vis = hero.querySelector('.hero__visual');
  vis.addEventListener('pointerdown', (e) => (x0 = e.clientX), { passive: true });
  vis.addEventListener(
    'pointerup',
    (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1, dx < 0 ? 1 : -1);
    },
    { passive: true },
  );

  // pausa automatica quando l'apertura non si vede o la scheda è nascosta
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      hero.dataset.offscreen = e.isIntersecting ? '0' : '1';
      setPaused();
    }).observe(hero);
  }
  const onVis = () => (hero.isConnected ? setPaused() : document.removeEventListener('visibilitychange', onVis));
  document.addEventListener('visibilitychange', onVis);
}

/** Leggera inclinazione 3D delle card al passaggio del puntatore (solo desktop). */
function tiltCards(root) {
  if (reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  root.querySelectorAll('.card').forEach((c) => {
    if (c.dataset.tilt) return;
    c.dataset.tilt = '1';
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      c.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
    });
    c.addEventListener('pointerleave', () => {
      c.style.setProperty('--rx', '0deg');
      c.style.setProperty('--ry', '0deg');
    });
  });
}

__exp.initHero = initHero;
__exp.tiltCards = tiltCards;
});
__def("motion.js", function (__exp) {
// Movimento e micro-interazioni. Tutto rispetta prefers-reduced-motion e il
// contenuto resta leggibile anche se nessuna animazione parte.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.documentElement.classList.add('js');

let io;
function revealObserver() {
  if (io) return io;
  if (!('IntersectionObserver' in window)) return null;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        if (e.target.dataset.count) countUp(e.target);
        if (e.target.hasAttribute('data-autoexplode')) e.target.dispatchEvent(new CustomEvent('vs:visible'));
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  return io;
}

function countUp(el) {
  const to = Number(el.dataset.count);
  const from = Number(el.dataset.from ?? 0);
  if (reduced() || !Number.isFinite(to)) {
    el.textContent = el.dataset.final ?? String(to);
    return;
  }
  const dur = 1300;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = String(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = el.dataset.final ?? String(to);
  };
  requestAnimationFrame(step);
}

// ------------------------------------------------------------------ scorrimento
// Una sola funzione, una volta per fotogramma: cucitura di avanzamento in cima,
// hero che si allontana, foto che scorrono più lente della pagina.
let ticking = false;
const PAR = '.page-hero__bg img, .factory-band__img img, .statement__img img';
function scrollUpdate() {
  ticking = false;
  const y = window.scrollY;
  // stato dell'header durante lo scorrimento
  document.body.classList.toggle('is-scrolled', y > 12);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  document.querySelector('.seam-progress')?.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
  if (reduced()) return;
  const hero = document.querySelector('#app > .hero');
  if (hero) hero.style.setProperty('--hs', Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight))).toFixed(3));
  const vh = window.innerHeight;
  // fascia cinetica: le due righe scorrono in versi opposti con la pagina
  const kin = document.querySelector('.kinetic');
  if (kin) {
    const r = kin.getBoundingClientRect();
    if (r.bottom > -100 && r.top < vh + 100) kin.style.setProperty('--kx', `${((vh - r.top) * 0.22).toFixed(1)}px`);
  }
  // anatomia del materasso: la foto si apre mentre entra nello schermo
  const an = document.querySelector('[data-anatomy]');
  if (an) {
    const r = an.getBoundingClientRect();
    an.style.setProperty('--ap', Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.75))).toFixed(3));
  }
  const gm = document.querySelector('.pdp .gallery__main');
  if (gm) gm.style.setProperty('--gs', Math.min(1, Math.max(0, y / Math.max(1, gm.offsetHeight * 1.2))).toFixed(3));
  document.querySelectorAll(PAR).forEach((img) => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const c = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
    img.style.setProperty('--py', `${(-c * r.height * 0.05).toFixed(1)}px`);
  });
}
window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(scrollUpdate);
    }
  },
  { passive: true },
);
window.addEventListener('resize', () => requestAnimationFrame(scrollUpdate));
requestAnimationFrame(scrollUpdate);

/** Da chiamare dopo ogni render di pagina. */
function enhance(root = document) {
  requestAnimationFrame(scrollUpdate);
  enhanceTouch(root);
  const obs = revealObserver();
  root.querySelectorAll('.rv, .kb, [data-count], [data-autoexplode]').forEach((el) => {
    if (obs) obs.observe(el);
    else {
      el.classList.add('in');
      if (el.dataset.count) el.textContent = el.dataset.final ?? el.dataset.count;
    }
  });
  // parallasse leggero della hero sul puntatore (solo desktop, breve, transform)
  const hero = root.querySelector('.hero');
  const par = hero?.querySelector('.hero__par');
  if (hero && par && fine() && !reduced()) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      par.style.setProperty('--px', `${(-x * 12).toFixed(1)}px`);
      par.style.setProperty('--py', `${(-y * 8).toFixed(1)}px`);
    });
    hero.addEventListener('pointerleave', () => {
      par.style.setProperty('--px', '0px');
      par.style.setProperty('--py', '0px');
    });
  }
}

// alone che segue il puntatore sui bottoni principali
document.addEventListener(
  'pointermove',
  (e) => {
    const b = e.target.closest?.('.btn--primary');
    if (!b || !fine()) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`);
    b.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
  { passive: true },
);


function bump(el) {
  if (!el || reduced()) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

/** Apre gradualmente gli strati di un'illustrazione (0 → target). */
function explode(el, target = 0.75, dur = 1100) {
  if (!el) return;
  if (reduced()) {
    el.style.setProperty('--ex', String(target));
    return;
  }
  const from = Number(getComputedStyle(el).getPropertyValue('--ex')) || 0;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.style.setProperty('--ex', (from + (target - from) * e).toFixed(3));
    const input = el.querySelector('input[type=range]');
    if (input) input.value = String(Math.round((from + (target - from) * e) * 100));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}


// ------------------------------------------------------------------ vetrina della home
// Il modello sotto il puntatore (o col focus) va in scena. Sul telefono è un carosello a scorrimento.
function showItem(row) {
  const item = row.closest('.showcase__item');
  if (!item || item.classList.contains('is-active')) return;
  item.parentElement.querySelectorAll('.showcase__item').forEach((x) => x.classList.toggle('is-active', x === item));
}
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;
  const row = e.target.closest?.('.showcase__row');
  if (row) showItem(row);
});
document.addEventListener('focusin', (e) => {
  const row = e.target.closest?.('.showcase__row');
  if (row) showItem(row);
});

// ------------------------------------------------------------------ il prodotto segue il puntatore
// Scena della galleria e della vetrina: la foto si inclina di pochi gradi.
document.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType === 'touch' || reduced()) return;
    const el = e.target.closest?.('[data-tilt], .showcase');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  },
  { passive: true },
);
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest?.('[data-tilt], .showcase');
  if (el && !el.contains(e.relatedTarget)) {
    el.style.setProperty('--tx', 0);
    el.style.setProperty('--ty', 0);
  }
});

// ------------------------------------------------------------------ pulsanti: una luce segue il puntatore
document.addEventListener(
  'pointermove',
  (e) => {
    const b = e.target.closest?.('.btn--primary, .btn--wa');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`);
    b.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
  { passive: true },
);

// ================================================================== TELEFONO
// Sul telefono non c'è il puntatore: gli effetti seguono il dito e lo scorrimento.
const coarse = () => window.matchMedia('(hover: none), (max-width: 900px)').matches;

// ---- tocco: un'onda parte dal punto premuto (pulsanti, misure, schede, righe del menu)
const RIPPLE = '.btn, .seg label, .chip, .tab, .thumb, .showcase__row, .drawer__panel a, .qty button, .pay, .faq__item summary';
document.addEventListener(
  'pointerdown',
  (e) => {
    if (reduced()) return;
    const el = e.target.closest?.(RIPPLE);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const w = document.createElement('span');
    w.className = 'tap-wave';
    w.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('has-wave');
    el.appendChild(w);
    w.addEventListener('animationend', () => w.remove(), { once: true });
  },
  { passive: true },
);

// ---- vibrazione breve quando si aggiunge al carrello (dove il telefono la supporta)
document.addEventListener('click', (e) => {
  if (e.target.closest?.('[data-act="add"], [data-act="add-variant"]')) navigator.vibrate?.(12);
});

// ---- carosello della vetrina: la scheda al centro è in primo piano, i puntini seguono
function carouselUpdate(list) {
  const items = [...list.children];
  if (!items.length || list.scrollWidth <= list.clientWidth + 4) return;
  const mid = list.scrollLeft + list.clientWidth / 2;
  let best = 0;
  let bestD = Infinity;
  items.forEach((it, i) => {
    const c = it.offsetLeft + it.offsetWidth / 2;
    const d = (c - mid) / list.clientWidth;
    it.style.setProperty('--off', Math.max(-1, Math.min(1, d)).toFixed(3));
    if (Math.abs(d) < bestD) {
      bestD = Math.abs(d);
      best = i;
    }
  });
  items.forEach((it, i) => it.classList.toggle('is-center', i === best));
  const dots = list.parentElement.querySelector('.car-dots');
  dots?.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === best));
}
function setupCarousels(root) {
  root.querySelectorAll('.showcase__list').forEach((list) => {
    if (list.dataset.car) return;
    list.dataset.car = '1';
    const dots = document.createElement('div');
    dots.className = 'car-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = [...list.children].map(() => '<i></i>').join('');
    list.after(dots);
    let raf = 0;
    list.addEventListener('scroll', () => (raf ||= requestAnimationFrame(() => ((raf = 0), carouselUpdate(list)))), { passive: true });
    requestAnimationFrame(() => carouselUpdate(list));
  });
}

// ---- galleria della scheda: si sfoglia col dito
let swipe = null;
document.addEventListener(
  'touchstart',
  (e) => {
    const g = e.target.closest?.('.gallery__main');
    swipe = g && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, g } : null;
  },
  { passive: true },
);
document.addEventListener(
  'touchmove',
  (e) => {
    if (!swipe) return;
    const dx = e.touches[0].clientX - swipe.x;
    const dy = e.touches[0].clientY - swipe.y;
    if (Math.abs(dy) > Math.abs(dx) + 6) return (swipe = null);
    swipe.dx = dx;
    if (!reduced()) swipe.g.style.setProperty('--drag', `${(dx * 0.35).toFixed(1)}px`);
  },
  { passive: true },
);
document.addEventListener('touchend', () => {
  if (!swipe) return;
  const { dx = 0, g } = swipe;
  swipe = null;
  g.style.removeProperty('--drag');
  if (Math.abs(dx) < 44) return;
  const thumbs = [...document.querySelectorAll('.thumbs .thumb')];
  if (thumbs.length < 2) return;
  const cur = thumbs.findIndex((t) => t.getAttribute('aria-current') === 'true');
  const next = (cur + (dx < 0 ? 1 : -1) + thumbs.length) % thumbs.length;
  document.documentElement.style.setProperty('--swipe-dir', dx < 0 ? 1 : -1);
  thumbs[next].click();
  document.activeElement?.blur?.();
});

// ---- al centro dello schermo: sul telefono fa le veci del passaggio del mouse
let centerIO = null;
function setupCenter(root) {
  if (!coarse() || !('IntersectionObserver' in window)) return;
  centerIO ||= new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-center', e.isIntersecting)), { rootMargin: '-38% 0px -38% 0px' });
  root.querySelectorAll('.card, .pair, .promise li, .anatomy__list li, .tiles li, .ship__card, .guide-card, .contact-card').forEach((el) => centerIO.observe(el));
}

// ---- il pulsante WhatsApp si fa da parte mentre scendi e torna quando risali
let lastY = 0;
window.addEventListener(
  'scroll',
  () => {
    const y = window.scrollY;
    if (Math.abs(y - lastY) < 14) return;
    document.body.classList.toggle('is-down', y > lastY && y > 240);
    lastY = y;
  },
  { passive: true },
);

/** Da chiamare dopo ogni render (lo fa enhance). */
function enhanceTouch(root = document) {
  setupCarousels(root);
  setupCenter(root);
}

__exp.scrollUpdate = scrollUpdate;
__exp.enhance = enhance;
__exp.bump = bump;
__exp.explode = explode;
__exp.enhanceTouch = enhanceTouch;
});
__def("admin.js", function (__exp) {
// Admin della PREVIEW. Stessa struttura dell'admin Supabase previsto:
// CRUD categorie/prodotti/varianti, media, richieste, impostazioni, storico.
// L'accesso qui è locale al browser (PBKDF2 + sessione); in produzione è Supabase Auth + RLS.

const {adminKey, go, P, legacyToPath, u: navHref} = __req("nav.js");
const {formatCents, formatSize, parseEuroToCents, skuFor, STANDARD_SIZES, buildSitemap, normalizeWhatsAppNumber, PROVIDERS, AVAILABILITY_LABEL, CatalogIndex, offerConfig, priceCart, refundForLine, MAX_RULE_PCT} = __req("core/index.js");
const {store, catalog, media, processUpload, whatsappStatus, REQUEST_STATUS, REQUEST_TYPE, api, applyRemoteCatalog, catalogSource} = __req("store.js");
const {configured: sbConfigured, currentUser: sbUser, signIn: sbSignIn, signOut: sbSignOut, sendRecovery: sbRecovery, isAdmin: sbIsAdmin, loadCatalog: sbLoad, pushCatalog: sbPush, SB} = __req("supabase.js");
const {SITE_SLOTS} = __req("slots.js");
const {esc, $, $$, toast, copyText, confirmDialog, openDialog, icon, slugify, fmtDate} = __req("ui.js");

const CRED = 'vs-admin-cred';
const SESSION = 'vs-admin-session';
const SESSION_MS = 8 * 3600 * 1000;
let root;
const db = () => store.db;

// ------------------------------------------------------------- accesso
function getCred() {
  try {
    return JSON.parse(localStorage.getItem(CRED) || 'null');
  } catch {
    return null;
  }
}
function isLogged() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION) || 'null');
    return s && s.exp > Date.now();
  } catch {
    return false;
  }
}
async function derive(pass, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256);
  const b64 = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8)));
  return { salt: b64(salt), hash: b64(bits) };
}
function startSession() {
  sessionStorage.setItem(SESSION, JSON.stringify({ exp: Date.now() + SESSION_MS }));
}

function viewLogin() {
  const cred = getCred();
  const noCrypto = !window.crypto?.subtle;
  root.innerHTML = `<div class="adm-login wrap section">
    <h1>${cred ? 'Accedi all\'admin' : 'Crea l\'accesso admin'}</h1>
    <p class="lead">${cred ? 'Inserisci la password che hai creato per questa anteprima.' : 'Prima volta: scegli una password per l\'admin di questa anteprima. Non esistono password predefinite.'}</p>
    <p class="note small">Accesso locale di anteprima: protegge l'admin in questo browser, non sostituisce l'autenticazione Supabase prevista per il sito reale.</p>
    ${noCrypto ? '<p class="note note--err">Questo browser non supporta la cifratura necessaria: apri l\'anteprima in un browser aggiornato.</p>' : ''}
    <form class="form" id="adm-login" novalidate>
      <div class="field"><label for="pw">Password</label><input class="input" type="password" id="pw" autocomplete="${cred ? 'current-password' : 'new-password'}" minlength="10" required></div>
      ${cred ? '' : '<div class="field"><label for="pw2">Ripeti la password</label><input class="input" type="password" id="pw2" autocomplete="new-password" required><span class="hint">Almeno 10 caratteri.</span></div>'}
      <p class="err-msg" id="login-err" role="alert"></p>
      <div><button class="btn btn--primary" ${noCrypto ? 'disabled' : ''}>${cred ? 'Accedi' : 'Crea accesso'}</button></div>
    </form>
    <p class="small muted" style="margin-top:24px"><a href="#">Torna al sito</a></p></div>`;
}

// ------------------------------------------------------------- layout
const SECTIONS = [
  ['admin', 'Panoramica'],
  ['admin-catalogo', 'Prodotti'],
  ['admin-categorie', 'Categorie'],
  ['admin-immagini', 'Immagini del sito'],
  ['admin-richieste', 'Richieste'],
  ['admin-offerte', 'Offerte'],
  ['admin-impostazioni', 'Impostazioni'],
  ['admin-storico', 'Storico'],
];
function shell(active, title, body, actions = '') {
  const waiting = db().requests.filter((r) => r.status === 'in_attesa_contatto').length;
  root.innerHTML = `<div class="adm">
    <nav class="adm__nav" aria-label="Admin">${SECTIONS.map(([h, l]) => `<a href="#${h}" ${h === active ? 'aria-current="page"' : ''}>${l}${h === 'admin-richieste' && waiting ? ` <span class="adm__pill">${waiting}</span>` : ''}</a>`).join('')}
      <button class="link-btn small" data-adm="logout">Esci</button></nav>
    <div class="adm__main"><div class="adm__head"><h1>${esc(title)}</h1><div class="btn-row">${actions}</div></div>${body}</div></div>`;
}

// ------------------------------------------------------------- panoramica
function blockers() {
  const out = [];
  const wa = whatsappStatus();
  if (!wa.check.ok) out.push(['err', 'Numero WhatsApp per le richieste non configurato: il sito permette solo di copiare il riepilogo.', '#admin-impostazioni', 'Configura']);
  for (const p of db().products) if (/CONFLICT/.test(p.internal_notes || '')) out.push(['warn', `${p.name}: prezzo in conflitto da confermare.`, `#admin-prodotto-${p.id}`, 'Apri']);
  const idx = catalog();
  const noPhoto = idx.publicProducts().filter((p) => !db().media.some((m) => m.product_id === p.id && m.published));
  if (noPhoto.length) out.push(['info', `${noPhoto.length} prodotti pubblicati senza foto confermate (si vede l'illustrazione di categoria): ${noPhoto.map((p) => p.name.replace('Vesuvio ', '')).join(', ')}.`, `#admin-prodotto-${noPhoto[0].id}`, 'Carica foto']);
  for (const p of db().products.filter((x) => x.status === 'published' && !idx.isProductPurchasable(x))) out.push(['warn', `${p.name}: pubblicato ma senza varianti acquistabili, quindi nascosto.`, `#admin-prodotto-${p.id}`, 'Apri']);
  if (db().settings.offers_enabled === true)
    out.push(['info', 'Offerte abbinate attive (beta): le percentuali sono una scelta prudente da confermare con i costi.', '#admin-offerte', 'Rivedi']);
  if (!media.available()) out.push(['warn', 'IndexedDB non disponibile: le foto caricate non resteranno dopo il ricaricamento.', null, null]);
  return out;
}
function viewOverview() {
  const d = db();
  const counts = {
    pub: d.products.filter((p) => p.status === 'published').length,
    draft: d.products.filter((p) => p.status === 'draft').length,
    waiting: d.requests.filter((r) => r.status === 'in_attesa_contatto').length,
    quotes: d.requests.filter((r) => r.type !== 'cart' && !['chiuso', 'annullato'].includes(r.status)).length,
  };
  const b = blockers();
  shell('admin', 'Panoramica', `
    <div class="adm-stats">
      <a href="#admin-catalogo"><strong>${counts.pub}</strong> prodotti pubblicati</a>
      <a href="#admin-catalogo"><strong>${counts.draft}</strong> bozze</a>
      <a href="#admin-richieste"><strong>${counts.waiting}</strong> richieste in attesa di contatto</a>
      <a href="#admin-richieste"><strong>${counts.quotes}</strong> preventivi aperti</a>
    </div>
    <h2 class="adm-h2">Da sistemare prima del lancio</h2>
    ${b.length ? `<ul class="adm-list">${b.map(([k, t, h, l]) => `<li class="adm-row adm-row--${k}"><span>${esc(t)}</span>${h ? `<a class="btn btn--ghost btn--sm" href="${h}">${l}</a>` : ''}</li>`).join('')}</ul>` : '<p class="note note--ok">Nessun blocco rilevato.</p>'}
    <h2 class="adm-h2">Bozze in attesa di dati</h2>
    <ul class="adm-list">${d.products.filter((p) => p.status === 'draft').map((p) => `<li class="adm-row"><span><strong>${esc(p.name)}</strong><br><span class="small muted">${esc(p.internal_notes || '')}</span></span><a class="btn btn--ghost btn--sm" href="#admin-prodotto-${p.id}">Modifica</a></li>`).join('') || '<li class="adm-row">Nessuna bozza</li>'}</ul>`);
}

// ------------------------------------------------------------- prodotti
const STATUS_LABEL = { draft: 'Bozza', published: 'Pubblicato', archived: 'Archiviato' };
function viewCatalog() {
  const d = db();
  const idx = catalog();
  const q = (sessionStorage.getItem('adm-q') || '').toLowerCase();
  const st = sessionStorage.getItem('adm-st') || 'all';
  const list = d.products
    .filter((p) => (st === 'all' ? true : p.status === st))
    .filter((p) => !q || (p.name + ' ' + p.slug + ' ' + p.technical_name).toLowerCase().includes(q))
    .sort((a, b) => (d.categories.find((c) => c.id === a.category_id)?.sort ?? 0) - (d.categories.find((c) => c.id === b.category_id)?.sort ?? 0) || a.sort - b.sort);
  shell('admin-catalogo', 'Prodotti', `
    <div class="adm-filters"><input class="input" type="search" placeholder="Cerca per nome o slug" value="${esc(q)}" data-adm-input="q" aria-label="Cerca prodotti">
      <select class="input" data-adm-change="st" aria-label="Stato">${[['all', 'Tutti gli stati'], ...Object.entries(STATUS_LABEL)].map(([v, l]) => `<option value="${v}" ${st === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="adm-table" role="table" aria-label="Prodotti">
      <div class="adm-tr adm-tr--h" role="row"><span role="columnheader">Prodotto</span><span role="columnheader">Categoria</span><span role="columnheader">Varianti</span><span role="columnheader">Prezzo</span><span role="columnheader">Stato</span></div>
      ${list.map((p) => {
        const c = d.categories.find((x) => x.id === p.category_id);
        const all = idx.variantsOf(p, false);
        const ok = idx.purchasableVariants(p).length;
        const min = idx.minPrice(p);
        return `<a class="adm-tr" role="row" href="#admin-prodotto-${p.id}"><span role="cell"><strong>${esc(p.name)}</strong><br><span class="small muted">/${esc(p.slug)}</span></span><span role="cell">${esc(c?.name ?? '—')}</span><span role="cell">${ok}/${all.length} acquistabili</span><span role="cell">${min !== null ? 'da ' + formatCents(min) : '—'}</span><span role="cell"><span class="st st--${p.status}">${STATUS_LABEL[p.status]}</span></span></a>`;
      }).join('') || '<p class="muted" style="padding:16px">Nessun prodotto trovato.</p>'}
    </div>`, `<button class="btn btn--primary btn--sm" data-adm="new-product">Nuovo prodotto</button>`);
}

function variantRow(p, v, kind) {
  return `<div class="adm-var" data-vid="${esc(v.id)}">
    <label><span>Misura</span><input class="input" data-f="size" value="${esc(v.size ?? '')}" placeholder="160x190" ${kind === 'guanciale' ? 'disabled' : ''}></label>
    <label><span>Altezza cm</span><input class="input" data-f="height_cm" inputmode="numeric" value="${esc(v.height_cm ?? '')}"></label>
    <label class="adm-var__sku"><span>SKU</span><input class="input" data-f="sku" value="${esc(v.sku)}"></label>
    <label><span>Prezzo €</span><input class="input" data-f="price" inputmode="decimal" value="${v.price_cents !== null ? (v.price_cents / 100).toFixed(2).replace('.', ',') : ''}" placeholder="vuoto = non acquistabile"></label>
    <label><span>Disponibilità</span><select class="input" data-f="availability">${Object.entries(AVAILABILITY_LABEL).map(([k, l]) => `<option value="${k}" ${v.availability === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" data-f="active" ${v.active ? 'checked' : ''}> Attiva</label>
    <button type="button" class="icon-btn" data-adm="var-del" data-id="${esc(v.id)}" aria-label="Elimina variante ${esc(v.sku)}">${icon('trash', 20)}</button>
  </div>`;
}

function groupVariants(vs) {
  const map = new Map();
  for (const v of vs) {
    const k = v.height_cm ?? null;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  }
  return [...map.entries()];
}

function mediaCard(m, i, n) {
  const src = media.resolve(m);
  return `<div class="adm-media" data-mid="${esc(m.id)}">
    <div class="adm-media__img" data-adm="focal" data-id="${esc(m.id)}" title="Tocca per impostare il punto focale">
      ${src ? `<img src="${esc(src)}" alt="" style="object-position:${m.focal_x}% ${m.focal_y}%">` : `<div class="fallback">${icon('image', 40)}<span class="small">File non disponibile in questo browser</span></div>`}
      <span class="adm-focal" style="left:${m.focal_x}%;top:${m.focal_y}%" aria-hidden="true"></span>
      <span class="st ${m.published ? 'st--published' : 'st--draft'}">${m.published ? 'Pubblicata' : 'Bozza'}</span>
    </div>
    <div class="adm-media__crops" aria-label="Anteprima ritagli">${src ? `<figure><img src="${esc(src)}" alt="" style="aspect-ratio:4/3;object-fit:${m.illustrative ? 'contain' : 'cover'};object-position:${m.focal_x}% ${m.focal_y}%"><figcaption>Card 4:3</figcaption></figure><figure><img src="${esc(src)}" alt="" style="aspect-ratio:1;object-fit:${m.illustrative ? 'contain' : 'cover'};object-position:${m.focal_x}% ${m.focal_y}%"><figcaption>Carrello 1:1</figcaption></figure>` : ''}</div>
    <div class="adm-media__fields">
      <label><span>Slot</span><select class="input" data-mf="slot">${['hero', 'exploded', 'fabric', 'extra'].map((s) => `<option ${m.slot === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label><span>Testo alternativo</span><input class="input" data-mf="alt" value="${esc(m.alt)}" placeholder="Descrivi cosa si vede"></label>
      <label><span>Didascalia</span><input class="input" data-mf="caption" value="${esc(m.caption ?? '')}" placeholder="Es. Render illustrativo"></label>
      <label class="check"><input type="checkbox" data-mf="illustrative" ${m.illustrative ? 'checked' : ''}> Render o immagine illustrativa</label>
      <label class="check"><input type="radio" name="cover" data-mf="is_cover" ${m.is_cover ? 'checked' : ''}> Copertina</label>
    </div>
    <div class="adm-media__actions">
      <button type="button" class="icon-btn" data-adm="m-up" data-id="${esc(m.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Sposta prima">${icon('arrowUp', 20)}</button>
      <button type="button" class="icon-btn" data-adm="m-down" data-id="${esc(m.id)}" ${i === n - 1 ? 'disabled' : ''} aria-label="Sposta dopo">${icon('arrowDown', 20)}</button>
      <label class="btn btn--ghost btn--sm">Sostituisci<input type="file" accept="image/jpeg,image/png,image/webp" data-adm-file="replace" data-id="${esc(m.id)}" hidden></label>
      <button type="button" class="btn btn--sm ${m.published ? 'btn--ghost' : 'btn--primary'}" data-adm="m-pub" data-id="${esc(m.id)}">${m.published ? 'Nascondi' : 'Pubblica foto'}</button>
      <button type="button" class="btn btn--danger btn--sm" data-adm="m-del" data-id="${esc(m.id)}">Elimina</button>
    </div>
  </div>`;
}

function referencedProduct(id) {
  return db().requests.some((r) => r.items.some((i) => i.product_id === id) || r.quote?.product_id === id);
}
function referencedVariant(id) {
  return db().requests.some((r) => r.items.some((i) => i.variant_id === id));
}

function viewProductEdit(id) {
  const d = db();
  const p = d.products.find((x) => x.id === id);
  if (!p) return shell('admin-catalogo', 'Prodotto non trovato', '<p><a href="#admin-catalogo">Torna ai prodotti</a></p>');
  const c = d.categories.find((x) => x.id === p.category_id);
  const kind = c?.kind ?? 'materasso';
  const vs = d.variants.filter((v) => v.product_id === p.id).sort((a, b) => a.sort - b.sort);
  const ms = d.media.filter((m) => m.product_id === p.id).sort((a, b) => a.sort - b.sort);
  const idx = catalog();
  const purch = idx.purchasableVariants({ ...p, status: 'published' }).length;
  const canDelete = p.status === 'draft' && !referencedProduct(p.id);
  const actions = `${p.status !== 'published' ? `<button class="btn btn--primary btn--sm" data-adm="status" data-v="published">Pubblica</button>` : ''}
    ${p.status === 'published' ? `<button class="btn btn--ghost btn--sm" data-adm="status" data-v="draft">Riporta in bozza</button>` : ''}
    ${p.status !== 'archived' ? `<button class="btn btn--ghost btn--sm" data-adm="status" data-v="archived">Archivia</button>` : ''}
    ${canDelete ? `<button class="btn btn--danger btn--sm" data-adm="delete-product">Elimina bozza</button>` : ''}`;
  shell('admin-catalogo', p.name, `
    <p class="small"><a href="#admin-catalogo">← Prodotti</a> · Stato: <span class="st st--${p.status}">${STATUS_LABEL[p.status]}</span> · ${purch} varianti acquistabili
      ${p.status === 'published' && c?.status === 'published' ? ` · <a href="#prodotto-${esc(p.slug)}">Vedi sul sito</a>` : ''}
      · <button class="link-btn" data-adm="preview">Anteprima con bozze</button></p>
    ${p.internal_notes ? `<p class="note note--warn small"><strong>Note interne:</strong> ${esc(p.internal_notes)}</p>` : ''}
    <form id="adm-product" class="form adm-form" novalidate data-id="${esc(p.id)}">
      <section class="adm-card"><h2 class="adm-h2">Dati principali</h2>
        <div class="adm-grid">
          <div class="field"><label for="f-name">Nome</label><input class="input" id="f-name" name="name" value="${esc(p.name)}" required></div>
          <div class="field"><label for="f-slug">Slug</label><input class="input" id="f-slug" name="slug" value="${esc(p.slug)}" pattern="[a-z0-9-]+" required><span class="hint">Indirizzo della scheda: lettere minuscole, numeri e trattini.</span></div>
          <div class="field"><label for="f-cat">Categoria</label><select class="input" id="f-cat" name="category_id">${d.categories.map((x) => `<option value="${x.id}" ${x.id === p.category_id ? 'selected' : ''}>${esc(x.name)}${x.status !== 'published' ? ' (non pubblicata)' : ''}</option>`).join('')}</select></div>
          <div class="field"><label for="f-tech">Nome tecnico</label><input class="input" id="f-tech" name="technical_name" value="${esc(p.technical_name)}"></div>
          <div class="field"><label for="f-line">Codice linea (SKU)</label><input class="input" id="f-line" name="line_code" value="${esc(p.line_code)}"></div>
          <div class="field"><label for="f-sort">Ordinamento</label><input class="input" id="f-sort" name="sort" inputmode="numeric" value="${esc(p.sort)}"></div>
        </div>
        <div class="field"><label for="f-short">Descrizione breve</label><input class="input" id="f-short" name="short" value="${esc(p.short)}" maxlength="180"></div>
        <div class="field"><label for="f-desc">Descrizione</label><textarea class="textarea" id="f-desc" name="description">${esc(p.description)}</textarea></div>
        <div class="field"><label for="f-comp">Composizione</label><input class="input" id="f-comp" name="composition" value="${esc(p.composition)}"></div>
        <div class="adm-grid">
          <div class="field"><label for="f-hl">Punti chiave (uno per riga)</label><textarea class="textarea" id="f-hl" name="highlights">${esc((p.highlights || []).join('\n'))}</textarea></div>
          <div class="field"><label for="f-cl">Claim tessuto (uno per riga)</label><textarea class="textarea" id="f-cl" name="claims">${esc((p.claims || []).join('\n'))}</textarea><span class="hint">Pubblica solo claim verificati sull'etichetta.</span></div>
        </div>
        <div class="adm-grid">
          <div class="field"><label for="f-firm">Rigidità indicativa</label><input class="input" id="f-firm" name="firmness_display" value="${esc(p.firmness_display ?? '')}"></div>
          <div class="field"><label for="f-lead">Tempi</label><input class="input" id="f-lead" name="lead_time" value="${esc(p.lead_time ?? '')}" placeholder="Es. Produzione in circa 2 giorni"></div>
        </div>
        <div class="adm-checks">
          <label class="check"><input type="checkbox" name="removable_cover" ${p.removable_cover ? 'checked' : ''}> Sfoderabile</label>
          <label class="check"><input type="checkbox" name="summer_winter" ${p.summer_winter ? 'checked' : ''}> Lato estivo/invernale</label>
          <label class="check"><input type="checkbox" name="hybrid" ${p.hybrid ? 'checked' : ''}> Hybrid (molle + Memory)</label>
        </div>
        <div class="field"><label for="f-notes">Note interne (mai pubbliche)</label><textarea class="textarea" id="f-notes" name="internal_notes">${esc(p.internal_notes ?? '')}</textarea></div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">SEO</h2>
        <div class="field"><label for="f-st">Titolo SEO</label><input class="input" id="f-st" name="seo_title" value="${esc(p.seo_title ?? '')}" maxlength="70" placeholder="${esc(p.name)}"><span class="hint">Lascia vuoto per usare il nome. Max 70 caratteri.</span></div>
        <div class="field"><label for="f-sd">Descrizione SEO</label><textarea class="textarea" id="f-sd" name="seo_description" maxlength="160" placeholder="${esc(p.short)}">${esc(p.seo_description ?? '')}</textarea><span class="hint">Max 160 caratteri.</span></div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Varianti e prezzi</h2>
        <p class="small muted">Prezzi IVA inclusa. Una variante senza prezzo, disattivata o "non acquistabile" resta visibile ma disabilitata nella scheda.</p>
        <div id="adm-vars">${groupVariants(vs).map(([h, list], gi) => `<details class="adm-vgroup" ${gi === 0 || vs.length <= 8 ? 'open' : ''}><summary>${h === null ? 'Senza altezza' : 'H' + h} · ${list.length} varianti · ${list.filter((v) => v.price_cents !== null && v.active && v.availability !== 'unavailable').length} acquistabili</summary>${list.map((v) => variantRow(p, v, kind)).join('')}</details>`).join('') || '<p class="muted">Nessuna variante.</p>'}</div>
        <div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn--ghost btn--sm" data-adm="var-add">Aggiungi variante</button><button type="button" class="btn btn--ghost btn--sm" data-adm="var-grid">Genera griglia misure × altezze</button><button type="button" class="btn btn--ghost btn--sm" data-adm="var-sku">Rigenera SKU</button></div>
      </section>
      <div class="adm-save"><button class="btn btn--primary">Salva modifiche</button><span class="small muted" id="save-state"></span></div>
    </form>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Foto</h2>
      <p class="small muted">JPEG, PNG o WebP fino a 8 MB, almeno 400×300 px. Le foto nuove restano in bozza finché non le pubblichi; il testo alternativo è obbligatorio per pubblicare. Tocca un'immagine per scegliere il punto da tenere al centro nei ritagli.</p>
      <div id="adm-media">${ms.map((m, i) => mediaCard(m, i, ms.length)).join('') || '<p class="muted">Nessuna foto: sul sito si vede l\'illustrazione della categoria.</p>'}</div>
      <label class="btn btn--primary btn--sm" style="margin-top:12px">Carica foto<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-adm-file="new" hidden></label>
      <span class="small muted" id="upload-state" aria-live="polite"></span>
    </section>`, actions);
}

function readProductForm(form) {
  const p = db().products.find((x) => x.id === form.dataset.id);
  const fd = new FormData(form);
  const lines = (k) => String(fd.get(k) || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const errors = [];
  const name = String(fd.get('name')).trim();
  const slug = slugify(String(fd.get('slug')) || name);
  if (!name) errors.push('Il nome è obbligatorio.');
  if (db().products.some((x) => x.slug === slug && x.id !== p.id)) errors.push(`Lo slug "${slug}" è già usato.`);
  const next = {
    ...p,
    name,
    slug,
    category_id: String(fd.get('category_id')),
    technical_name: String(fd.get('technical_name')).trim(),
    line_code: String(fd.get('line_code')).trim().toUpperCase(),
    sort: Number(fd.get('sort')) || 0,
    short: String(fd.get('short')).trim(),
    description: String(fd.get('description')).trim(),
    composition: String(fd.get('composition')).trim(),
    highlights: lines('highlights'),
    claims: lines('claims'),
    firmness_display: String(fd.get('firmness_display')).trim() || null,
    lead_time: String(fd.get('lead_time')).trim() || null,
    removable_cover: fd.get('removable_cover') === 'on',
    summer_winter: fd.get('summer_winter') === 'on',
    hybrid: fd.get('hybrid') === 'on',
    internal_notes: String(fd.get('internal_notes')).trim(),
    seo_title: String(fd.get('seo_title')).trim(),
    seo_description: String(fd.get('seo_description')).trim(),
  };
  // varianti
  const vars = [];
  $$('.adm-var', form).forEach((row, i) => {
    const g = (f) => $(`[data-f="${f}"]`, row);
    const old = db().variants.find((v) => v.id === row.dataset.vid);
    const size = g('size').value.trim().toLowerCase().replace('×', 'x') || null;
    const h = g('height_cm').value.trim() ? Number(g('height_cm').value) : null;
    const priceRaw = g('price').value.trim();
    const price = priceRaw ? parseEuroToCents(priceRaw) : null;
    if (size && !/^\d{2,3}x\d{2,3}$/.test(size)) errors.push(`Riga ${i + 1}: misura non valida (usa 160x190).`);
    if (priceRaw && price === null) errors.push(`Riga ${i + 1}: prezzo non valido.`);
    if (h !== null && (!Number.isInteger(h) || h < 1 || h > 60)) errors.push(`Riga ${i + 1}: altezza non valida.`);
    vars.push({ ...(old ?? { id: row.dataset.vid, product_id: p.id }), size, height_cm: h, sku: g('sku').value.trim(), price_cents: price, availability: g('availability').value, active: g('active').checked, sort: i });
  });
  const skus = vars.map((v) => v.sku);
  if (skus.some((s) => !s)) errors.push('Ogni variante deve avere uno SKU.');
  const dup = skus.find((s, i) => s && skus.indexOf(s) !== i);
  if (dup) errors.push(`SKU duplicato: ${dup}.`);
  const others = db().variants.filter((v) => v.product_id !== p.id).map((v) => v.sku);
  const clash = skus.find((s) => others.includes(s));
  if (clash) errors.push(`Lo SKU ${clash} è già usato da un altro prodotto.`);
  return { p, next, vars, errors };
}

function saveProduct(form, { silent = false } = {}) {
  const { p, next, vars, errors } = readProductForm(form);
  if (errors.length) {
    openDialog({ title: 'Controlla i dati', body: `<ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`, actions: [{ label: 'Ho capito', primary: true }] });
    return false;
  }
  const d = db();
  // storico prezzi, utile per le future comunicazioni di riduzione prezzo
  for (const v of vars) {
    const old = d.variants.find((x) => x.id === v.id);
    if (old && old.price_cents !== v.price_cents) {
      d.price_history.unshift({ at: new Date().toISOString(), variant_id: v.id, sku: v.sku, old: old.price_cents, new: v.price_cents });
      store.audit('prezzo', v.sku, `${old.price_cents === null ? '—' : formatCents(old.price_cents)} → ${v.price_cents === null ? '—' : formatCents(v.price_cents)}`);
    }
  }
  d.variants = d.variants.filter((v) => v.product_id !== p.id).concat(vars);
  Object.assign(p, next);
  store.audit('modifica prodotto', p.name, 'Dati e varianti salvati');
  store.commit('catalog');
  if (!silent) toast('Modifiche salvate');
  return true;
}

// ------------------------------------------------------------- immagini del sito
function viewSiteImages() {
  const list = db().site_media;
  shell('admin-immagini', 'Immagini del sito', `
    <p class="small muted">Ogni spazio mostra un segnaposto finché non carichi e pubblichi una foto. Le foto restano in bozza fino alla pubblicazione; il testo alternativo è obbligatorio.</p>
    <div class="adm-slots">${SITE_SLOTS.map((def) => {
      const m = list.find((x) => x.slot === def.key);
      const src = (m && media.resolve(m)) || def.default?.src;
      return `<section class="adm-card adm-slot" data-slot="${def.key}">
        <h2 class="adm-h2" style="margin:0">${esc(def.label)}</h2>
        <figure class="ph ${src ? 'ph--photo' : ''}" style="--ratio:${def.ratio}">${src ? `<img src="${esc(src)}" alt="">` : `<div class="ph__inner">${icon('image', 26)}<span>${esc(def.hint)}</span></div>`}</figure>
        <p class="small" style="margin:0">${m ? `<span class="st ${m.published ? 'st--published' : 'st--draft'}">${m.published ? 'Pubblicata' : 'Bozza'}</span>` : def.default ? '<span class="st">Predefinita: immagine illustrativa</span>' : '<span class="st st--archived">Segnaposto</span>'}</p>
        ${m ? `<label class="field"><span class="lbl small">Testo alternativo</span><input class="input" data-sf="alt" value="${esc(m.alt)}" placeholder="Descrivi cosa si vede"></label>` : ''}
        <div class="btn-row">
          <label class="btn btn--ghost btn--sm">${m ? 'Sostituisci' : 'Carica foto'}<input type="file" accept="image/jpeg,image/png,image/webp" data-adm-sitefile="${def.key}" hidden></label>
          ${m ? `<button class="btn btn--sm ${m.published ? 'btn--ghost' : 'btn--primary'}" data-adm="s-pub" data-slot="${def.key}">${m.published ? 'Nascondi' : 'Pubblica'}</button><button class="btn btn--danger btn--sm" data-adm="s-del" data-slot="${def.key}">Rimuovi</button>` : ''}
        </div>
      </section>`;
    }).join('')}</div>`);
}

// ------------------------------------------------------------- categorie
function viewCategories() {
  const d = db();
  const idx = catalog();
  shell('admin-categorie', 'Categorie', `
    <p class="small muted">Una categoria pubblicata compare nel menu solo se contiene almeno un articolo acquistabile.</p>
    <form id="adm-cats" class="form" novalidate>
      ${d.categories.sort((a, b) => a.sort - b.sort).map((c) => `<div class="adm-card adm-cat" data-cid="${c.id}">
        <div class="adm-grid">
          <div class="field"><label>Nome</label><input class="input" data-c="name" value="${esc(c.name)}"></div>
          <div class="field"><label>Slug</label><input class="input" data-c="slug" value="${esc(c.slug)}"></div>
          <div class="field"><label>Tipo</label><select class="input" data-c="kind">${['materasso', 'rete', 'guanciale', 'topper', 'letto'].map((k) => `<option ${c.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
          <div class="field"><label>Ordine</label><input class="input" data-c="sort" inputmode="numeric" value="${c.sort}"></div>
          <div class="field"><label>Stato</label><select class="input" data-c="status">${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Descrizione</label><input class="input" data-c="description" value="${esc(c.description)}"></div>
        <p class="small muted" style="margin:0">${d.products.filter((p) => p.category_id === c.id).length} prodotti · ${idx.publicProducts(c.kind).length} acquistabili · ${idx.commercialCategories().some((x) => x.id === c.id) ? 'visibile nel menu' : 'nascosta dal menu'}
        ${d.products.some((p) => p.category_id === c.id) ? '' : ` · <button type="button" class="link-btn" data-adm="cat-del" data-id="${c.id}">Elimina</button>`}</p>
      </div>`).join('')}
      <div class="adm-save"><button class="btn btn--primary">Salva categorie</button></div>
    </form>`, `<button class="btn btn--ghost btn--sm" data-adm="cat-add">Nuova categoria</button>`);
}

// ------------------------------------------------------------- richieste
function viewRequests() {
  const d = db();
  const q = (sessionStorage.getItem('adm-rq') || '').toLowerCase();
  const st = sessionStorage.getItem('adm-rst') || 'all';
  const ty = sessionStorage.getItem('adm-rty') || 'all';
  const list = d.requests
    .filter((r) => (st === 'all' ? true : r.status === st))
    .filter((r) => (ty === 'all' ? true : r.type === ty))
    .filter((r) => !q || JSON.stringify([r.ref, r.items, r.quote, r.internal_notes, r.tracking]).toLowerCase().includes(q));
  shell('admin-richieste', 'Richieste e preventivi', `
    <p class="note small">Le richieste nascono quando un cliente genera il riepilogo. Aprire WhatsApp non prova che il messaggio sia arrivato: lo stato si cambia a mano dopo il contatto.</p>
    <div class="adm-filters">
      <input class="input" type="search" placeholder="Cerca per riferimento, SKU, note" value="${esc(q)}" data-adm-input="rq" aria-label="Cerca richieste">
      <select class="input" data-adm-change="rst" aria-label="Stato">${[['all', 'Tutti gli stati'], ...Object.entries(REQUEST_STATUS)].map(([v, l]) => `<option value="${v}" ${st === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="input" data-adm-change="rty" aria-label="Tipo">${[['all', 'Tutti i tipi'], ...Object.entries(REQUEST_TYPE)].map(([v, l]) => `<option value="${v}" ${ty === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="adm-table" role="table" aria-label="Richieste">
      <div class="adm-tr adm-tr--h" role="row"><span role="columnheader">Riferimento</span><span role="columnheader">Tipo</span><span role="columnheader">Contenuto</span><span role="columnheader">Totale</span><span role="columnheader">Stato</span></div>
      ${list.map((r) => `<a class="adm-tr" role="row" href="#admin-richiesta-${esc(r.ref)}"><span role="cell"><strong>${esc(r.ref)}</strong><br><span class="small muted">${fmtDate(r.created_at)}</span></span><span role="cell">${REQUEST_TYPE[r.type]}</span>
        <span role="cell" class="small">${r.items.length ? r.items.map((i) => `${i.qty}× ${esc(i.name.replace('Vesuvio ', ''))}${i.size ? ' ' + formatSize(i.size) : ''}`).join(', ') : esc(`${r.quote?.product ?? ''} ${r.quote?.width_cm}×${r.quote?.length_cm}${r.quote?.height_cm ? ' H' + r.quote.height_cm : ''}`)}</span>
        <span role="cell">${r.total_cents ? formatCents(r.total_cents) : r.quote?.price_cents ? formatCents(r.quote.price_cents) : '—'}</span><span role="cell"><span class="st st--req-${r.status}">${REQUEST_STATUS[r.status]}</span></span></a>`).join('') || '<div class="empty" style="margin:12px"><p>Nessuna richiesta. Le richieste compaiono quando un cliente arriva al riepilogo dal carrello o prepara un preventivo fuori misura.</p></div>'}
    </div>`);
}

function quoteReply(r) {
  const q = r.quote;
  return [
    `Ciao, grazie per la richiesta ${r.ref}.`,
    `${q.product}, misura ${q.width_cm}×${q.length_cm} cm${q.height_cm ? `, altezza ${q.height_cm} cm` : ''}.`,
    q.price_cents ? `Prezzo: ${formatCents(q.price_cents)} IVA inclusa.` : '',
    q.reply || '',
    'Se ti va bene, rispondi a questo messaggio e ti confermiamo l\'ordine.',
  ].filter(Boolean).join('\n');
}

function viewRequest(ref) {
  const r = db().requests.find((x) => x.ref === ref);
  if (!r) return shell('admin-richieste', 'Richiesta non trovata', '<p><a href="#admin-richieste">Torna alle richieste</a></p>');
  const q = r.quote;
  shell('admin-richieste', r.ref, `
    <p class="small"><a href="#admin-richieste">← Richieste</a> · ${REQUEST_TYPE[r.type]} · creata ${fmtDate(r.created_at)}</p>
    <form id="adm-request" class="form" data-ref="${esc(r.ref)}" novalidate>
      <div class="adm-grid2">
        <section class="adm-card">
          ${r.items.length ? `<h2 class="adm-h2">Articoli</h2><table class="size-table"><tbody>${r.items.map((i) => `<tr><td>${esc(i.name)}<br><span class="small muted">${i.size ? formatSize(i.size) : ''}${i.height_cm && i.size ? ' H' + i.height_cm : ''} · ${esc(i.sku)}</span></td><td>${i.qty}×</td><td style="text-align:right">${formatCents(i.unit_cents * i.qty)}${i.discount_cents ? `<br><span class="small" style="color:var(--lava-ink)">−${formatCents(i.discount_cents)} vantaggio</span>` : ''}</td></tr>`).join('')}
            ${r.discount_cents ? `<tr><td colspan="2">Subtotale</td><td style="text-align:right">${formatCents(r.subtotal_cents)}</td></tr>${(r.offers ?? []).map((o) => `<tr><td colspan="2" style="color:var(--lava-ink)">${esc(o.label)}${o.size ? ' ' + formatSize(o.size) : ''}${o.count > 1 ? ` × ${o.count}` : ''} (${o.pct} %)</td><td style="text-align:right;color:var(--lava-ink)">−${formatCents(o.amount_cents)}</td></tr>`).join('')}` : ''}
            <tr><td colspan="2"><strong>Totale</strong></td><td style="text-align:right"><strong>${formatCents(r.total_cents)}</strong></td></tr></tbody></table>
            <details class="adm-pay" style="margin-top:14px"><summary><strong>Recesso parziale</strong> <span class="small muted">quanto rimborsare</span></summary>
              <p class="small">Indica quanti pezzi restituisce il cliente: si rimborsa quanto ha pagato per quei pezzi, compresa la loro quota di vantaggio. Sui pezzi che tiene il vantaggio resta suo.</p>
              ${r.items.map((i, k) => `<div class="field" style="display:flex;gap:10px;align-items:center"><input class="input" style="max-width:80px" type="number" min="0" max="${i.qty}" value="0" data-refund="${k}" aria-label="Pezzi restituiti: ${esc(i.name)}"><span class="small">${esc(i.name)} ${i.size ? formatSize(i.size) : ''} (su ${i.qty})</span></div>`).join('')}
              <p class="note small" id="refund-out" aria-live="polite">Rimborso: ${formatCents(0)}</p>
              <div class="btn-row"><button type="button" class="btn btn--ghost btn--sm" data-adm="refund-calc">Calcola</button><button type="button" class="btn btn--ghost btn--sm" data-adm="refund-log">Registra nello storico</button></div>
            </details>` : ''}
          ${q ? `<h2 class="adm-h2">Preventivo fuori misura</h2>
            <dl class="facts-list"><dt>Prodotto</dt><dd>${esc(q.product)}</dd><dt>Misura</dt><dd>${q.width_cm}×${q.length_cm} cm${q.height_cm ? `, H${q.height_cm}` : ''}</dd><dt>Note cliente</dt><dd>${esc(q.notes || '—')}</dd>${q.custom_sku ? `<dt>SKU personalizzato</dt><dd>${esc(q.custom_sku)}</dd>` : ''}</dl>
            <div class="adm-grid" style="margin-top:14px"><div class="field"><label for="r-price">Prezzo proposto €</label><input class="input" id="r-price" name="price" inputmode="decimal" value="${q.price_cents ? (q.price_cents / 100).toFixed(2).replace('.', ',') : ''}"></div>
              <div class="field"><label for="r-reply">Testo aggiuntivo (tempi, condizioni)</label><input class="input" id="r-reply" name="reply" value="${esc(q.reply)}"></div></div>
            <div class="btn-row"><button type="button" class="btn btn--ghost btn--sm" data-adm="copy-reply">${icon('copy', 18)} Copia la risposta per WhatsApp</button>${q.custom_sku ? '' : '<button type="button" class="btn btn--ghost btn--sm" data-adm="custom-sku">Genera SKU personalizzato</button>'}</div>
            <textarea class="textarea" id="copy-fallback" hidden readonly></textarea>
            <p class="small muted">Al lancio la conferma avviene su WhatsApp: nessun link di pagamento viene generato.</p>` : ''}
        </section>
        <section class="adm-card">
          <h2 class="adm-h2">Gestione</h2>
          <div class="field"><label for="r-status">Stato</label><select class="input" id="r-status" name="status">${Object.entries(REQUEST_STATUS).map(([k, l]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="r-tracking">Tracking spedizione</label><input class="input" id="r-tracking" name="tracking" value="${esc(r.tracking)}" placeholder="Corriere e codice"></div>
          <div class="field"><label for="r-notes">Note interne</label><textarea class="textarea" id="r-notes" name="internal_notes">${esc(r.internal_notes)}</textarea><span class="hint">Non salvare qui dati sanitari o di pagamento.</span></div>
          <div class="field"><label for="r-hnote">Nota per lo storico (facoltativa)</label><input class="input" id="r-hnote" name="hnote" placeholder="Es. Confermato su WhatsApp, consegna giovedì"></div>
          <button class="btn btn--primary">Salva</button>
          <h3 style="margin-top:22px;font-size:1rem">Storico</h3>
          <ol class="adm-history">${r.history.slice().reverse().map((h) => `<li><strong>${REQUEST_STATUS[h.status] ?? h.status}</strong> · ${fmtDate(h.at)} · ${esc(h.by)}${h.note ? `<br><span class="small muted">${esc(h.note)}</span>` : ''}</li>`).join('')}</ol>
        </section>
      </div>
    </form>`);
}

// ------------------------------------------------------------- offerte abbinate
const RULE_STATUS = { active: 'Attiva', paused: 'In pausa', draft: 'Bozza' };
function viewOfferAdmin() {
  const d = db();
  const rule = (c) => (d.offers ?? []).find((o) => o.code === c);
  const num = (name, val, label, hint = '%') =>
    `<div class="field" style="max-width:150px"><label for="o-${name}">${esc(label)}</label><div style="display:flex;align-items:center;gap:6px"><input class="input" id="o-${name}" name="${name}" inputmode="numeric" value="${val ?? ''}"><span class="small">${hint}</span></div></div>`;
  const st = (c) => `<div class="field" style="max-width:160px"><label for="o-st-${c}">Stato</label><select class="input" id="o-st-${c}" name="st-${c}">${['active', 'paused'].map((k) => `<option value="${k}" ${rule(c)?.status === k ? 'selected' : ''}>${RULE_STATUS[k]}</option>`).join('')}</select></div>`;
  const lc = rule('letto-completo')?.params ?? {};
  const lm = rule('letti-multipli')?.params ?? {};
  const ac = rule('accessori')?.params ?? {};
  const pd = rule('per-due')?.params ?? {};
  const cg = rule('coppia-guanciali')?.params ?? {};
  const tt = rule('tetto')?.params ?? {};
  const t = lm.tiers ?? [];
  // esempi con le regole salvate (anche a interruttore spento: servono a decidere)
  const idx = catalog();
  const cfg = offerConfig(d.offers, true);
  const V = (slug, size, h) => {
    const p = idx.snap.products.find((x) => x.slug === slug);
    return p && idx.purchasableVariants(p).find((v) => v.size === size && (h == null || v.height_cm === h));
  };
  const EX = [
    ['Memory Duo H25 + Rete Flex, 160×190', [['memory-duo', '160x190', 25, 1], ['rete-flex', '160x190', null, 1]]],
    ['Pocket 3000 Elite H25 + Rete Strong, 160×190', [['pocket-3000-elite', '160x190', 25, 1], ['rete-strong', '160x190', null, 1]]],
    ['Come sopra + Topper', [['pocket-3000-elite', '160x190', 25, 1], ['rete-strong', '160x190', null, 1], ['topper-memory-cloud-5', '160x190', 5, 1]]],
    ['Eco H20 + Rete Flex, 80×190', [['eco', '80x190', 20, 1], ['rete-flex', '80x190', null, 1]]],
    ['3 letti Memory Duo 90×200 + Rete Flex', [['memory-duo', '90x200', 25, 3], ['rete-flex', '90x200', null, 3]]],
    ['5 letti Pocket 1600 90×200 + Rete Flex', [['pocket-1600', '90x200', 25, 5], ['rete-flex', '90x200', null, 5]]],
  ];
  const exRows = EX.map(([label, lines]) => {
    const vs = lines.map(([slug, size, h, qty]) => ({ v: V(slug, size, h), qty }));
    if (vs.some((x) => !x.v)) return '';
    const r = priceCart(idx, vs.map((x) => ({ variant_id: x.v.id, qty: x.qty })), cfg);
    return `<tr><td>${esc(label)}</td><td style="text-align:right">${formatCents(r.subtotal_cents)}</td><td style="text-align:right;color:var(--lava-ink)">−${formatCents(r.discount_cents)}</td><td style="text-align:right"><strong>${formatCents(r.total_cents)}</strong></td><td style="text-align:right">${r.subtotal_cents ? ((100 * r.discount_cents) / r.subtotal_cents).toFixed(1).replace('.', ',') : 0} %</td></tr>`;
  }).join('');
  shell('admin-offerte', 'Offerte abbinate', `
    <form id="adm-offers" class="form" novalidate>
      <section class="adm-card"><h2 class="adm-h2">Interruttore</h2>
        <label class="check"><input type="checkbox" name="offers_enabled" ${d.settings.offers_enabled === true ? 'checked' : ''}> Offerte attive sul sito (schede «Letti completi», sconti nel carrello e nel riepilogo)</label>
        <p class="small muted">Spento: nessuno sconto, nessuna scheda offerta, prezzi come da listino. Il database applica la stessa scelta quando ricalcola il carrello.</p>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Letto completo</h2>
        <p class="small muted">Materasso e rete della stessa misura. Percentuale sul totale dei due, arrotondata ai 5 €.</p>
        <div class="adm-filters">${st('letto-completo')}${num('lc-foam', lc.pct?.foam, 'Schiuma (Eco, Memory)')}${num('lc-pocket', lc.pct?.pocket, 'Molle (Pocket)')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Più letti nello stesso ordine</h2>
        <p class="small muted">Vale la percentuale più alta tra questa e quella del letto completo, su ogni letto dell'ordine.</p>
        <div class="adm-filters">${st('letti-multipli')}${num('t1-min', t[0]?.min_sets, 'Da letti', 'letti')}${num('t1-pct', t[0]?.pct, 'Sconto')}${num('t2-min', t[1]?.min_sets, 'Da letti', 'letti')}${num('t2-pct', t[1]?.pct, 'Sconto')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Guanciali e topper</h2>
        <p class="small muted">Guanciali: fino a ${ac.guanciali_per_materasso ?? 2} per materasso, anche senza rete. Proposti per primi: ${esc((ac.consigliati ?? []).map((x) => x.replace('guanciale-', '').replace(/-/g, ' ')).join(', ') || '—')}. Si vedono sul sito solo quando i guanciali hanno un prezzo. Topper: con un letto completo della stessa misura.</p>
        <div class="adm-filters">${st('accessori')}${num('ac-guanciale', ac.pct?.guanciale, 'Guanciali con materasso')}${num('ac-topper', ac.pct?.topper, 'Topper')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Coppia di guanciali</h2>
        <p class="small muted">Due guanciali uguali, anche senza materasso.</p>
        <div class="adm-filters">${st('coppia-guanciali')}${num('cg-pct', cg.pct, 'Sconto sulla coppia')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Per due</h2>
        <p class="small muted">Due materassi uguali nello stesso ordine, senza rete.</p>
        <div class="adm-filters">${st('per-due')}${num('pd-foam', pd.pct?.foam, 'Schiuma')}${num('pd-pocket', pd.pct?.pocket, 'Molle')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Tetto di sicurezza</h2>
        <p class="small muted">Nessun carrello va oltre questa percentuale di sconto complessivo, qualunque cosa si scriva sopra.</p>
        <div class="adm-filters">${num('tt-pct', tt.pct, 'Tetto')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Vetrine</h2>
        <table class="size-table"><thead><tr><th>Offerta</th><th>Stato</th><th></th></tr></thead><tbody>${(d.bundles ?? [])
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((b) => `<tr><td><strong>${esc(b.name)}</strong><br><span class="small muted">${esc(b.tagline)}</span></td><td><select class="input" name="b-${esc(b.id)}" aria-label="Stato di ${esc(b.name)}">${['published', 'draft', 'archived'].map((k) => `<option value="${k}" ${b.status === k ? 'selected' : ''}>${STATUS_LABEL[k]}</option>`).join('')}</select></td><td><a class="small" href="${navHref('/offerte/' + b.slug + '/')}" target="_blank" rel="noopener">Apri</a></td></tr>`)
          .join('')}</tbody></table>
      </section>
      <div class="adm-save"><button class="btn btn--primary">Salva le offerte</button></div>
    </form>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Esempi con le regole salvate</h2>
      <p class="small muted">Prezzi reali del listino. Ogni punto percentuale sul Pocket 3000 con rete vale circa 8 €.</p>
      <table class="size-table"><thead><tr><th>Carrello</th><th style="text-align:right">Listino</th><th style="text-align:right">Sconto</th><th style="text-align:right">Totale</th><th style="text-align:right">%</th></tr></thead><tbody>${exRows}</tbody></table>
      <p class="small muted">Le percentuali sono una scelta prudente fatta senza conoscere i margini: da confermare con l'azienda.</p>
    </section>`);
}
function readOfferForm(f) {
  const fd = new FormData(f);
  const errs = [];
  const n = (k, label, { min = 0, max = MAX_RULE_PCT } = {}) => {
    const raw = String(fd.get(k) ?? '').trim();
    const v = Number(raw);
    if (!/^\d+$/.test(raw) || v < min || v > max) {
      errs.push(`${label}: un numero intero tra ${min} e ${max}`);
      $('#o-' + k)?.setAttribute('aria-invalid', 'true');
    }
    return v;
  };
  $$('#adm-offers [aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
  const out = {
    'letto-completo': { pct: { foam: n('lc-foam', 'Letto completo, schiuma'), pocket: n('lc-pocket', 'Letto completo, molle') }, round_eur: 5 },
    'letti-multipli': {
      tiers: [
        { min_sets: n('t1-min', 'Primo scaglione, letti', { min: 2, max: 50 }), pct: n('t1-pct', 'Primo scaglione, sconto') },
        { min_sets: n('t2-min', 'Secondo scaglione, letti', { min: 2, max: 50 }), pct: n('t2-pct', 'Secondo scaglione, sconto') },
      ],
      quote_from_sets: 10,
    },
    // numero per materasso e guanciali consigliati restano quelli salvati: qui si cambiano solo le percentuali
    accessori: { ...(db().offers?.find((o) => o.code === 'accessori')?.params ?? {}), pct: { topper: n('ac-topper', 'Topper'), guanciale: n('ac-guanciale', 'Guanciali') } },
    'coppia-guanciali': { pct: n('cg-pct', 'Coppia di guanciali'), round_eur: 1 },
    'per-due': { pct: { foam: n('pd-foam', 'Per due, schiuma'), pocket: n('pd-pocket', 'Per due, molle') }, round_eur: 5 },
    tetto: { pct: n('tt-pct', 'Tetto') },
  };
  const [a, b] = out['letti-multipli'].tiers;
  if (!errs.length && b.min_sets <= a.min_sets) errs.push('Il secondo scaglione deve partire da più letti del primo');
  return { errs, params: out, fd };
}
const OFFER_FIELDS = { 'letto-completo': ['lc-foam', 'lc-pocket'], 'letti-multipli': ['t1-min', 't1-pct', 't2-min', 't2-pct'], accessori: ['ac-topper', 'ac-guanciale'], 'per-due': ['pd-foam', 'pd-pocket'], 'coppia-guanciali': ['cg-pct'], tetto: ['tt-pct'] };

// ------------------------------------------------------------- impostazioni
function viewSettings() {
  const s = db().settings;
  const wa = whatsappStatus();
  shell('admin-impostazioni', 'Impostazioni', `
    <form id="adm-settings" class="form" novalidate>
      <section class="adm-card"><h2 class="adm-h2">WhatsApp per le richieste</h2>
        ${wa.source === 'env' ? `<p class="note">Il numero è impostato dalla configurazione d'ambiente e prevale su questo campo.</p>` : ''}
        <div class="field"><label for="s-wa">Numero WhatsApp aziendale</label><input class="input" id="s-wa" name="whatsapp_number" value="${esc(s.whatsapp_number)}" placeholder="+39 …" inputmode="tel" aria-describedby="s-wa-h"><span class="hint" id="s-wa-h">Con prefisso internazionale. Se è vuoto il sito offre solo "Copia il riepilogo".</span></div>
        <p class="${wa.check.ok ? 'note note--ok' : 'note note--warn'} small" id="wa-check">${wa.check.ok ? `Attivo: i link si aprono su wa.me/${esc(wa.check.digits)}` : esc(wa.check.reason)}</p>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Contatti pubblici</h2>
        <div class="field"><label for="s-phone">Telefono</label><input class="input" id="s-phone" name="public_phone" value="${esc(s.public_phone || '')}" placeholder="+39 …" inputmode="tel"></div>
        <div class="field"><label for="s-mail">Email</label><input class="input" id="s-mail" name="contact_email" type="email" value="${esc(s.contact_email || '')}"></div>
        <p class="small muted">Compaiono nel footer, nella pagina Contatti, nelle condizioni di vendita e nell'informativa privacy.</p>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Testi e condizioni</h2>
        <div class="field"><label for="s-ship">Spedizione (testo pubblico)</label><input class="input" id="s-ship" name="shipping_note" value="${esc(s.shipping_note)}"></div>
        <label class="check"><input type="checkbox" name="show_claims" ${s.show_claims ? 'checked' : ''}> Mostra i claim del tessuto nelle schede (antiacaro, ipoallergenico, Free Humidity)</label>
      </section>
      <div class="adm-save"><button class="btn btn--primary">Salva impostazioni</button></div>
    </form>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Pagamenti online</h2>
      <p class="small">Predisposti e disattivati. Al lancio le richieste si confermano solo su WhatsApp: nessun metodo è visibile al cliente e nessuna sessione di pagamento può essere creata.</p>
      ${Object.values(PROVIDERS).map((pv) => `<details class="adm-pay"><summary><strong>${esc(pv.label)}</strong> <span class="st st--archived">Disattivato</span></summary><ul class="small">${pv.requirements.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}
    </section>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Sitemap del sito reale</h2>
      <p class="small muted">Generata solo con le pagine pubblicabili. Non viene servita da questa anteprima, che resta non indicizzata.</p>
      <div class="adm-filters"><input class="input" id="sm-base" value="https://vesuviosleep.it" aria-label="Dominio"><button class="btn btn--ghost btn--sm" data-adm="sitemap">Genera</button></div>
      <textarea class="textarea" id="sm-out" readonly rows="6" aria-label="Sitemap" hidden></textarea>
    </section>
    ${databaseCard()}
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Dati dell'anteprima</h2>
      <p class="small muted">Catalogo, richieste e foto sono salvati solo in questo browser.</p>
      <div class="btn-row"><button class="btn btn--ghost btn--sm" data-adm="export">Esporta i dati in JSON</button><button class="btn btn--danger btn--sm" data-adm="reset">Ripristina i dati iniziali</button></div>
      <textarea class="textarea" id="export-out" readonly rows="6" hidden aria-label="Esportazione"></textarea>
    </section>`);
}

/** Stato del collegamento a Supabase: da dove arriva il catalogo e che cosa si può fare. */
function databaseCard() {
  if (!sbConfigured())
    return `<section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Database</h2>
      <p class="small muted">Nessun collegamento configurato: il sito usa il catalogo compilato nel bundle.
      Si attiva mettendo <code>supabaseUrl</code> e <code>supabaseKey</code> in <code>js/config.js</code>.</p></section>`;
  const da = catalogSource() === 'supabase';
  const u = sbUser();
  return `<section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Database</h2>
    <p class="note ${da ? 'note--ok' : 'note--warn'} small" id="db-state">${da
      ? `Il catalogo che stai guardando arriva dal <strong>database</strong>${db().catalog_at ? ` (letto ${esc(fmtDate(db().catalog_at))})` : ''}.`
      : 'Il catalogo che stai guardando è quello <strong>compilato nel sito</strong>: il database non ha risposto, oppure non è stato ancora letto.'}</p>
    <p class="small muted">Progetto: <code>${esc(SB.url.replace('https://', ''))}</code>. La chiave in pagina è quella pubblicabile: che cosa si legge e si scrive lo decidono le policy del database.</p>
    <div class="btn-row"><button class="btn btn--ghost btn--sm" data-adm="db-pull">Rileggi dal database</button></div>
    <hr class="adm-hr">
    ${u
      ? `<p class="small">Collegato come <strong>${esc(u.email)}</strong>. <span id="db-admin"></span></p>
         <div class="btn-row"><button class="btn btn--primary btn--sm" data-adm="db-push">Pubblica il catalogo sul database</button><button class="btn btn--ghost btn--sm" data-adm="db-signout">Esci</button></div>
         <p class="small muted">«Pubblica» manda al database prodotti, varianti, foto, offerte e impostazioni come li vedi qui. Le foto caricate in questo browser non partono: non esiste ancora un file da collegare.</p>`
      : `<div class="field"><label for="db-mail">Email</label><input class="input" id="db-mail" type="email" autocomplete="username"></div>
         <div class="field"><label for="db-pw">Password</label><input class="input" id="db-pw" type="password" autocomplete="current-password"></div>
         <p class="err-msg" id="db-err" role="alert"></p>
         <div class="btn-row"><button class="btn btn--primary btn--sm" data-adm="db-signin">Accedi al database</button><button class="btn btn--ghost btn--sm" data-adm="db-recover">Non ho una password</button></div>
         <p class="small muted">Il primo amministratore nasce senza password: usa «Non ho una password» e la imposti dal link che ricevi per email.</p>`}
  </section>`;
}

function viewAudit() {
  const a = db().audit;
  shell('admin-storico', 'Storico delle modifiche', `<ol class="adm-history">${a.map((x) => `<li><strong>${esc(x.action)}</strong> · ${esc(x.entity)} · ${fmtDate(x.at)}<br><span class="small muted">${esc(x.detail ?? '')}</span></li>`).join('') || '<li class="muted">Ancora nessuna modifica.</li>'}</ol>
    ${db().price_history.length ? `<h2 class="adm-h2" style="margin-top:24px">Storico prezzi</h2><ol class="adm-history">${db().price_history.map((h) => `<li>${esc(h.sku)}: ${h.old === null ? '—' : formatCents(h.old)} → ${h.new === null ? '—' : formatCents(h.new)} · ${fmtDate(h.at)}</li>`).join('')}</ol>` : ''}`);
}

// ------------------------------------------------------------- router admin
async function render(app) {
  root = app;
  bind();
  const r = adminKey();
  if (!isLogged()) return viewLogin();
  let m;
  if (r === 'admin') viewOverview();
  else if (r === 'admin-catalogo') viewCatalog();
  else if ((m = /^admin-prodotto-(.+)$/.exec(r))) viewProductEdit(m[1]);
  else if (r === 'admin-categorie') viewCategories();
  else if (r === 'admin-immagini') viewSiteImages();
  else if (r === 'admin-richieste') viewRequests();
  else if ((m = /^admin-richiesta-(.+)$/.exec(r))) viewRequest(m[1]);
  else if (r === 'admin-impostazioni') viewSettings();
  else if (r === 'admin-offerte') viewOfferAdmin();
  else if (r === 'admin-storico') viewAudit();
  else viewOverview();
  document.title = 'Admin | Vesuvio Sleep (anteprima)';
}
const rerender = () => render(root);
const currentProductId = () => $('#adm-product')?.dataset.id;

// ------------------------------------------------------------- eventi
let bound = false;
function bind() {
  if (bound) return;
  bound = true;
  const inAdmin = () => document.body.classList.contains('is-admin');

  document.addEventListener('submit', async (e) => {
    if (!inAdmin()) return;
    const f = e.target;
    e.preventDefault();
    if (f.id === 'adm-login') {
      const pw = $('#pw').value;
      const err = $('#login-err');
      const cred = getCred();
      try {
        if (!cred) {
          if (pw.length < 10) return (err.textContent = 'La password deve avere almeno 10 caratteri.');
          if (pw !== $('#pw2').value) return (err.textContent = 'Le due password non coincidono.');
          const d = await derive(pw);
          localStorage.setItem(CRED, JSON.stringify(d));
          store.audit('accesso', 'admin', 'Creato l\'accesso admin dell\'anteprima');
          store.commit();
        } else {
          const d = await derive(pw, cred.salt);
          if (d.hash !== cred.hash) return (err.textContent = 'Password non corretta.');
        }
        startSession();
        rerender();
      } catch {
        err.textContent = 'Impossibile salvare l\'accesso: il browser blocca l\'archiviazione locale.';
      }
    }
    if (f.id === 'adm-product') {
      if (saveProduct(f)) rerender();
    }
    if (f.id === 'adm-cats') {
      const d = db();
      const errs = [];
      $$('.adm-cat', f).forEach((row) => {
        const c = d.categories.find((x) => x.id === row.dataset.cid);
        const g = (k) => $(`[data-c="${k}"]`, row).value.trim();
        const slug = slugify(g('slug') || g('name'));
        if (!g('name')) errs.push('Ogni categoria deve avere un nome.');
        if (d.categories.some((x) => x.slug === slug && x.id !== c.id)) errs.push(`Slug duplicato: ${slug}`);
        if (['admin', 'carrello', 'riepilogo', 'confronto', 'showroom', 'sleep-match', 'guida-misure', 'fuori-misura'].includes(slug) || slug.startsWith('prodotto-')) errs.push(`Lo slug "${slug}" è riservato.`);
        Object.assign(c, { name: g('name'), slug, kind: g('kind'), sort: Number(g('sort')) || 0, status: g('status'), description: g('description') });
      });
      if (errs.length) return toast(errs[0]);
      store.audit('modifica categorie', 'catalogo', 'Categorie aggiornate');
      store.commit('catalog');
      toast('Categorie salvate');
      rerender();
    }
    if (f.id === 'adm-request') {
      const r = db().requests.find((x) => x.ref === f.dataset.ref);
      const fd = new FormData(f);
      const status = String(fd.get('status'));
      const hnote = String(fd.get('hnote') || '').trim();
      if (r.quote) {
        const raw = String(fd.get('price') || '').trim();
        const c = raw ? parseEuroToCents(raw) : null;
        if (raw && c === null) return toast('Prezzo non valido');
        r.quote.price_cents = c;
        r.quote.reply = String(fd.get('reply') || '').trim();
      }
      if (status !== r.status || hnote) r.history.push({ at: new Date().toISOString(), status, by: 'admin', note: hnote });
      r.status = status;
      r.tracking = String(fd.get('tracking') || '').trim();
      r.internal_notes = String(fd.get('internal_notes') || '').trim();
      r.updated_at = new Date().toISOString();
      store.audit('richiesta', r.ref, `Stato: ${REQUEST_STATUS[status]}`);
      store.commit('requests');
      toast('Richiesta aggiornata');
      rerender();
    }
    if (f.id === 'adm-offers') {
      const { errs, params, fd } = readOfferForm(f);
      if (errs.length) {
        toast(errs[0]);
        return $('#adm-offers [aria-invalid="true"]')?.focus();
      }
      const d = db();
      const changed = [];
      for (const o of d.offers ?? []) {
        const next = params[o.code];
        const st = fd.get('st-' + o.code);
        if (next && JSON.stringify(next) !== JSON.stringify(o.params)) {
          changed.push(`${o.label}: ${JSON.stringify(o.params)} → ${JSON.stringify(next)}`);
          o.params = next;
        }
        if (st && st !== o.status) {
          changed.push(`${o.label}: ${RULE_STATUS[o.status]} → ${RULE_STATUS[st]}`);
          o.status = st;
        }
      }
      for (const b of d.bundles ?? []) {
        const st = fd.get('b-' + b.id);
        if (st && st !== b.status) {
          changed.push(`${b.name}: ${STATUS_LABEL[b.status]} → ${STATUS_LABEL[st]}`);
          b.status = st;
        }
      }
      const on = fd.get('offers_enabled') === 'on';
      if (on !== (d.settings.offers_enabled === true)) changed.push(on ? 'Offerte accese' : 'Offerte spente');
      d.settings.offers_enabled = on;
      changed.forEach((c) => store.audit('offerte', 'offerte', c));
      store.commit('catalog');
      toast(changed.length ? 'Offerte salvate' : 'Nessuna modifica');
      rerender();
      return;
    }
    if (f.id === 'adm-settings') {
      const fd = new FormData(f);
      const raw = String(fd.get('whatsapp_number') || '').trim();
      if (raw) {
        const ch = normalizeWhatsAppNumber(raw);
        if (!ch.ok) {
          $('#s-wa').setAttribute('aria-invalid', 'true');
          $('#wa-check').className = 'note note--err small';
          $('#wa-check').textContent = ch.reason;
          return $('#s-wa').focus();
        }
      }
      const s = db().settings;
      if (s.whatsapp_number !== raw) store.audit('impostazioni', 'WhatsApp', raw ? 'Numero aggiornato' : 'Numero rimosso');
      s.whatsapp_number = raw;
      s.shipping_note = String(fd.get('shipping_note') || '').trim() || s.shipping_note;
      const phone = String(fd.get('public_phone') || '').trim();
      if (phone && !normalizeWhatsAppNumber(phone).ok) {
        $('#s-phone').setAttribute('aria-invalid', 'true');
        toast('Telefono: usa il prefisso internazionale, es. +39 …');
        return $('#s-phone').focus();
      }
      const mail = String(fd.get('contact_email') || '').trim();
      if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
        $('#s-mail').setAttribute('aria-invalid', 'true');
        toast('Email non valida');
        return $('#s-mail').focus();
      }
      s.public_phone = phone;
      s.contact_email = mail;
      s.show_claims = fd.get('show_claims') === 'on';
      store.commit('settings');
      toast('Impostazioni salvate');
      rerender();
    }
  });

  document.addEventListener('input', (e) => {
    if (!inAdmin()) return;
    const k = e.target.dataset.admInput;
    if (k) {
      sessionStorage.setItem('adm-' + k, e.target.value);
      clearTimeout(bind.t);
      bind.t = setTimeout(() => {
        const pos = e.target.selectionStart;
        rerender();
        const el = $(`[data-adm-input="${k}"]`);
        el?.focus();
        el?.setSelectionRange(pos, pos);
      }, 250);
    }
    if (e.target.id === 'f-name' && $('#adm-product')) {
      const p = db().products.find((x) => x.id === currentProductId());
      if (p && p.status === 'draft' && (p.slug === slugify(p.name) || p.slug.startsWith('nuovo-prodotto'))) $('#f-slug').value = slugify(e.target.value);
    }
  });

  document.addEventListener('change', async (e) => {
    if (!inAdmin()) return;
    const t = e.target;
    if (t.dataset.admChange) {
      sessionStorage.setItem('adm-' + t.dataset.admChange, t.value);
      return rerender();
    }
    const mf = t.dataset.mf;
    if (mf) {
      const m = db().media.find((x) => x.id === t.closest('[data-mid]').dataset.mid);
      if (mf === 'is_cover') db().media.filter((x) => x.product_id === m.product_id).forEach((x) => (x.is_cover = x.id === m.id));
      else if (mf === 'illustrative') m.illustrative = t.checked;
      else m[mf] = t.value.trim();
      if (mf === 'alt' && !m.alt && m.published) {
        m.published = false;
        toast('Senza testo alternativo la foto torna in bozza');
      }
      store.audit('foto', m.id.slice(0, 8), `Campo ${mf} aggiornato`);
      store.commit('catalog');
      if (mf === 'is_cover' || mf === 'illustrative' || mf === 'alt') {
        const y = scrollY;
        rerender();
        scrollTo(0, y);
      }
    }
    if (t.dataset.sf === 'alt') {
      const key = t.closest('[data-slot]').dataset.slot;
      const m = db().site_media.find((x) => x.slot === key);
      m.alt = t.value.trim();
      if (!m.alt && m.published) m.published = false;
      store.commit('catalog');
      return;
    }
    const siteKey = t.dataset.admSitefile;
    if (siteKey && t.files?.length) {
      try {
        const { blob, width, height } = await processUpload(t.files[0]);
        const src = await media.putBlob(blob);
        const list = db().site_media;
        const old = list.find((x) => x.slot === siteKey);
        if (old) {
          await media.deleteBlob(old.src);
          Object.assign(old, { src, width, height, published: false });
        } else list.push({ id: store.rid(), slot: siteKey, src, alt: '', published: false, focal_x: 50, focal_y: 50, width, height });
        store.audit('immagine del sito', siteKey, 'Foto caricata in bozza');
        store.commit('catalog');
        toast('Foto caricata in bozza: aggiungi il testo alternativo e pubblicala');
      } catch (err) {
        toast(err.message || 'Caricamento non riuscito');
      }
      return rerender();
    }
    const fileMode = t.dataset.admFile;
    if (fileMode && t.files?.length) {
      const pid = currentProductId();
      if ($('#adm-product') && !saveProduct($('#adm-product'), { silent: true })) return;
      const state = $('#upload-state');
      for (const file of t.files) {
        try {
          state.textContent = `Elaboro ${file.name}…`;
          const { blob, width, height } = await processUpload(file);
          const src = await media.putBlob(blob);
          if (fileMode === 'replace') {
            const m = db().media.find((x) => x.id === t.dataset.id);
            const old = m.src;
            Object.assign(m, { src, srcset: undefined, width, height, published: false });
            if (old.startsWith('idb:')) await media.deleteBlob(old);
            store.audit('foto', m.id.slice(0, 8), 'Foto sostituita, torna in bozza');
          } else {
            const ms = db().media.filter((x) => x.product_id === pid);
            db().media.push({ id: store.rid(), product_id: pid, slot: ms.some((x) => x.slot === 'hero') ? 'extra' : 'hero', src, alt: '', caption: '', illustrative: false, is_cover: !ms.length, published: false, sort: ms.length + 1, focal_x: 50, focal_y: 50, width, height });
            store.audit('foto', file.name, 'Foto caricata in bozza');
          }
          store.commit('catalog');
        } catch (err) {
          toast(err.message || 'Caricamento non riuscito');
          state.textContent = `${file.name}: ${err.message}`;
          return;
        }
      }
      toast(fileMode === 'replace' ? 'Foto sostituita: è in bozza finché non la pubblichi' : 'Foto caricata in bozza');
      rerender();
    }
  });

  document.addEventListener('click', async (e) => {
    if (!inAdmin()) return;
    const t = e.target.closest('[data-adm]');
    if (!t) return;
    const act = t.dataset.adm;
    const d = db();
    const pid = currentProductId();
    const p = pid && d.products.find((x) => x.id === pid);
    switch (act) {
      case 'logout':
        sessionStorage.removeItem(SESSION);
        sessionStorage.removeItem('vs-preview-drafts');
        go(P.home);
        break;
      case 'new-product': {
        const cat = d.categories[0];
        const np = { id: store.rid(), slug: 'nuovo-prodotto-' + Date.now().toString(36), category_id: cat.id, name: 'Nuovo prodotto', technical_name: '', short: '', description: '', composition: '', highlights: [], claims: [], removable_cover: null, reversible: null, summer_winter: null, hybrid: false, firmness_display: null, line_code: 'NEW', status: 'draft', sort: 99, lead_time: null, match: null, internal_notes: '' };
        d.products.push(np);
        store.audit('nuovo prodotto', np.name, 'Creato in bozza');
        store.commit('catalog');
        go(`/admin/prodotto-${np.id}/`);
        break;
      }
      case 'status': {
        const form = $('#adm-product');
        if (!saveProduct(form, { silent: true })) return;
        const v = t.dataset.v;
        if (v === 'published') {
          const idx = new CatalogIndex({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, status: 'published' } : x)) });
          const cat = d.categories.find((c) => c.id === p.category_id);
          const warn = [];
          if (!idx.isProductPurchasable({ ...p, status: 'published' })) warn.push('nessuna variante è acquistabile (prezzo, disponibilità o stato): il prodotto resterà nascosto dal catalogo');
          if (cat?.status !== 'published') warn.push('la categoria non è pubblicata');
          if (!p.short) warn.push('manca la descrizione breve');
          if (warn.length && !(await confirmDialog('Pubblicare comunque?', `Attenzione: ${warn.join('; ')}.`, 'Pubblica comunque'))) return;
        }
        if (v === 'archived' && !(await confirmDialog('Archiviare il prodotto?', 'Sparirà dal sito ma resterà nello storico delle richieste. Puoi riportarlo in bozza in qualsiasi momento.', 'Archivia'))) return;
        p.status = v;
        store.audit('stato prodotto', p.name, STATUS_LABEL[v]);
        store.commit('catalog');
        toast(v === 'published' ? 'Pubblicato: il sito è già aggiornato' : `Stato: ${STATUS_LABEL[v]}`);
        rerender();
        break;
      }
      case 'delete-product': {
        if (p.status !== 'draft' || referencedProduct(p.id)) return toast('Si possono eliminare solo bozze non collegate a richieste: archivia invece');
        if (!(await confirmDialog('Eliminare definitivamente la bozza?', `${p.name}, con varianti e foto, verrà eliminato. L'operazione non si può annullare.`, 'Elimina definitivamente', true))) return;
        for (const m of d.media.filter((x) => x.product_id === p.id)) await media.deleteBlob(m.src);
        d.media = d.media.filter((x) => x.product_id !== p.id);
        d.variants = d.variants.filter((x) => x.product_id !== p.id);
        d.products = d.products.filter((x) => x.id !== p.id);
        store.audit('eliminazione', p.name, 'Bozza eliminata definitivamente');
        store.commit('catalog');
        toast('Bozza eliminata');
        go('/admin/catalogo/');
        break;
      }
      case 'preview':
        if ($('#adm-product') && !saveProduct($('#adm-product'), { silent: true })) return;
        sessionStorage.setItem('vs-preview-drafts', '1');
        go(legacyToPath('prodotto-' + p.slug));
        break;
      case 'var-add': {
        if (!saveProduct($('#adm-product'), { silent: true })) return;
        const kind = d.categories.find((c) => c.id === p.category_id)?.kind;
        d.variants.push({ id: store.rid(), product_id: p.id, sku: skuFor(kind, p.line_code, null, null) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(), size: null, height_cm: null, price_cents: null, availability: 'unavailable', active: true, sort: 999 });
        store.commit('catalog');
        rerender();
        break;
      }
      case 'var-del': {
        const id = t.dataset.id;
        if (referencedVariant(id)) {
          toast('Variante presente in richieste: disattivala invece di eliminarla');
          const row = t.closest('.adm-var');
          $('[data-f="active"]', row).checked = false;
          return;
        }
        if (!(await confirmDialog('Eliminare la variante?', 'La variante verrà rimossa dopo il salvataggio.', 'Elimina', true))) return;
        t.closest('.adm-var').remove();
        saveProduct($('#adm-product'));
        rerender();
        break;
      }
      case 'var-grid': {
        const kind = d.categories.find((c) => c.id === p.category_id)?.kind;
        openDialog({
          title: 'Genera varianti',
          body: `<p class="small muted">Crea le combinazioni mancanti, senza prezzo e non acquistabili. Le esistenti non vengono toccate.</p>
            <fieldset class="adm-checks" style="border:0;padding:0"><legend class="lbl">Misure</legend>${STANDARD_SIZES.map((s) => `<label class="check"><input type="checkbox" value="${s}" data-g="size" checked> ${formatSize(s)}</label>`).join('')}</fieldset>
            <div class="field"><label for="g-h">Altezze in cm, separate da virgola</label><input class="input" id="g-h" value="${kind === 'materasso' ? '20, 25, 30' : kind === 'topper' ? '5' : ''}"></div>`,
          actions: [
            { label: 'Annulla' },
            {
              label: 'Genera',
              primary: true,
              onClick: (dlg) => {
                if (!saveProduct($('#adm-product'), { silent: true })) return false;
                const sizes = $$('[data-g="size"]:checked', dlg).map((x) => x.value);
                const hs = $('#g-h', dlg).value.split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0);
                let n = 0;
                for (const h of hs.length ? hs : [null])
                  for (const s of sizes) {
                    if (d.variants.some((v) => v.product_id === p.id && v.size === s && v.height_cm === h)) continue;
                    d.variants.push({ id: store.rid(), product_id: p.id, sku: skuFor(kind, p.line_code, s, h), size: s, height_cm: h, price_cents: null, availability: 'unavailable', active: true, sort: (h ?? 0) * 100 + STANDARD_SIZES.indexOf(s) });
                    n++;
                  }
                store.audit('varianti', p.name, `${n} varianti generate`);
                store.commit('catalog');
                toast(`${n} varianti create`);
                setTimeout(rerender);
              },
            },
          ],
        });
        break;
      }
      case 'var-sku': {
        const kind = d.categories.find((c) => c.id === p.category_id)?.kind;
        const line = $('#f-line').value.trim().toUpperCase();
        $$('.adm-var').forEach((row) => {
          const size = $('[data-f="size"]', row).value.trim() || null;
          const h = $('[data-f="height_cm"]', row).value.trim() ? Number($('[data-f="height_cm"]', row).value) : null;
          $('[data-f="sku"]', row).value = skuFor(kind, line, size, h);
        });
        toast('SKU rigenerati: salva per confermare');
        break;
      }
      case 'focal': {
        const m = d.media.find((x) => x.id === t.dataset.id);
        const r = t.getBoundingClientRect();
        m.focal_x = Math.round(((e.clientX - r.left) / r.width) * 100);
        m.focal_y = Math.round(((e.clientY - r.top) / r.height) * 100);
        store.commit('catalog');
        const y = scrollY;
        rerender();
        scrollTo(0, y);
        break;
      }
      case 'm-up':
      case 'm-down': {
        const ms = d.media.filter((x) => x.product_id === pid).sort((a, b) => a.sort - b.sort);
        const i = ms.findIndex((x) => x.id === t.dataset.id);
        const j = act === 'm-up' ? i - 1 : i + 1;
        if (j < 0 || j >= ms.length) return;
        [ms[i], ms[j]] = [ms[j], ms[i]];
        ms.forEach((x, k) => (x.sort = k + 1));
        store.commit('catalog');
        rerender();
        $(`[data-adm="${act}"][data-id="${CSS.escape(t.dataset.id)}"]`)?.focus();
        break;
      }
      case 'm-pub': {
        const m = d.media.find((x) => x.id === t.dataset.id);
        if (!m.published && !m.alt.trim()) {
          toast('Scrivi il testo alternativo prima di pubblicare la foto');
          return $(`[data-mid="${CSS.escape(m.id)}"] [data-mf="alt"]`)?.focus();
        }
        m.published = !m.published;
        store.audit('foto', m.alt.slice(0, 40) || m.id.slice(0, 8), m.published ? 'Pubblicata' : 'Nascosta');
        store.commit('catalog');
        toast(m.published ? 'Foto pubblicata' : 'Foto nascosta dal sito');
        const y = scrollY;
        rerender();
        scrollTo(0, y);
        break;
      }
      case 'm-del': {
        const m = d.media.find((x) => x.id === t.dataset.id);
        if (!(await confirmDialog('Eliminare la foto?', 'La foto verrà rimossa dal prodotto e dal sito.', 'Elimina', true))) return;
        await media.deleteBlob(m.src);
        d.media = d.media.filter((x) => x.id !== m.id);
        if (m.is_cover) {
          const first = d.media.filter((x) => x.product_id === m.product_id).sort((a, b) => a.sort - b.sort)[0];
          if (first) first.is_cover = true;
        }
        store.audit('foto', m.id.slice(0, 8), 'Eliminata');
        store.commit('catalog');
        rerender();
        break;
      }
      case 's-pub': {
        const m = d.site_media.find((x) => x.slot === t.dataset.slot);
        if (!m.published && !m.alt.trim()) {
          toast('Scrivi il testo alternativo prima di pubblicare');
          return $(`[data-slot="${t.dataset.slot}"] [data-sf="alt"]`)?.focus();
        }
        m.published = !m.published;
        store.audit('immagine del sito', m.slot, m.published ? 'Pubblicata' : 'Nascosta');
        store.commit('catalog');
        toast(m.published ? 'Pubblicata: il sito è già aggiornato' : 'Nascosta: torna il segnaposto');
        rerender();
        break;
      }
      case 's-del': {
        if (!(await confirmDialog('Rimuovere la foto?', 'Nello spazio tornerà il segnaposto.', 'Rimuovi', true))) return;
        const m = d.site_media.find((x) => x.slot === t.dataset.slot);
        await media.deleteBlob(m.src);
        d.site_media = d.site_media.filter((x) => x !== m);
        store.commit('catalog');
        rerender();
        break;
      }
      case 'cat-add': {
        const c = { id: store.rid(), slug: 'nuova-categoria-' + Date.now().toString(36), kind: 'materasso', name: 'Nuova categoria', description: '', sort: 99, status: 'draft' };
        d.categories.push(c);
        store.audit('categoria', c.name, 'Creata in bozza');
        store.commit('catalog');
        rerender();
        break;
      }
      case 'cat-del': {
        if (d.products.some((x) => x.category_id === t.dataset.id)) return toast('La categoria contiene prodotti');
        if (!(await confirmDialog('Eliminare la categoria?', 'La categoria è vuota e verrà eliminata.', 'Elimina', true))) return;
        d.categories = d.categories.filter((c) => c.id !== t.dataset.id);
        store.commit('catalog');
        rerender();
        break;
      }
      case 'refund-calc':
      case 'refund-log': {
        const ref = $('#adm-request')?.dataset.ref;
        const r = db().requests.find((x) => x.ref === ref);
        if (!r) break;
        let total = 0;
        const parts = [];
        $$('[data-refund]').forEach((inp) => {
          const it = r.items[Number(inp.dataset.refund)];
          const q = Math.max(0, Math.min(it.qty, Math.trunc(Number(inp.value) || 0)));
          inp.value = q;
          if (!q) return;
          const amt = refundForLine(it, q);
          total += amt;
          parts.push(`${q} × ${it.name}${it.size ? ' ' + formatSize(it.size) : ''}: ${formatCents(amt)}`);
        });
        $('#refund-out').textContent = `Rimborso: ${formatCents(total)}${parts.length ? ' (' + parts.join('; ') + ')' : ''}`;
        if (act === 'refund-log') {
          if (!parts.length) return toast('Indica almeno un pezzo restituito');
          r.history.push({ at: new Date().toISOString(), status: r.status, by: 'admin', note: `Recesso parziale: rimborsati ${formatCents(total)} su ${formatCents(r.total_cents)} (${parts.join('; ')})` });
          store.audit('richiesta', r.ref, `Recesso parziale: ${formatCents(total)}`);
          store.commit('requests');
          toast('Recesso registrato nello storico');
          rerender();
        }
        break;
      }
      case 'copy-reply': {
        const r = d.requests.find((x) => x.ref === $('#adm-request').dataset.ref);
        const raw = $('#r-price').value.trim();
        r.quote.price_cents = raw ? parseEuroToCents(raw) : null;
        r.quote.reply = $('#r-reply').value.trim();
        store.commit('requests');
        await copyText(quoteReply(r), $('#copy-fallback'));
        break;
      }
      case 'custom-sku': {
        const r = d.requests.find((x) => x.ref === $('#adm-request').dataset.ref);
        r.quote.custom_sku = api.customSku(r.ref.slice(-4));
        store.audit('preventivo', r.ref, `SKU ${r.quote.custom_sku}`);
        store.commit('requests');
        rerender();
        break;
      }
      case 'sitemap': {
        const out = $('#sm-out');
        out.hidden = false;
        // stessa sitemap che scripts/build_site.mjs pubblica con il sito
        out.value = buildSitemap($('#sm-base').value.trim() || 'https://vesuviosleep.it', window.__vs.routes().map((r) => ({ path: r.path, images: r.images })));
        break;
      }
      case 'db-pull': {
        try {
          const cat = await sbLoad();
          const n = applyRemoteCatalog(cat);
          toast(`Catalogo letto dal database: ${n.prodotti} prodotti, ${n.varianti} varianti`);
          rerender();
        } catch (err) {
          toast('Il database non risponde: ' + err.message);
        }
        break;
      }
      case 'db-signin': {
        const err = $('#db-err');
        err.textContent = '';
        try {
          await sbSignIn($('#db-mail').value.trim(), $('#db-pw').value);
          if (!(await sbIsAdmin())) {
            sbSignOut();
            err.textContent = 'Questo utente non è un amministratore del database.';
            return;
          }
          toast('Collegato al database');
          rerender();
        } catch (e2) {
          err.textContent = e2.message;
        }
        break;
      }
      case 'db-recover': {
        const mail = $('#db-mail').value.trim();
        if (!mail) return ($('#db-err').textContent = 'Scrivi prima la tua email.');
        try {
          await sbRecovery(mail);
          toast('Se l\'indirizzo esiste, arriva un link per impostare la password');
        } catch (e3) {
          $('#db-err').textContent = e3.message;
        }
        break;
      }
      case 'db-signout':
        sbSignOut();
        toast('Uscito dal database');
        rerender();
        break;
      case 'db-push': {
        if (!(await confirmDialog('Pubblicare il catalogo sul database?', 'Prodotti, varianti, foto e impostazioni di questa anteprima sostituiranno quelli sul database. Le richieste e lo storico non vengono toccati.', 'Pubblica'))) return;
        try {
          const n = await sbPush(d);
          store.audit('database', 'catalogo', `Pubblicati ${n.prodotti} prodotti, ${n.varianti} varianti, ${n.foto} foto`);
          store.commit('audit');
          toast(`Pubblicato: ${n.prodotti} prodotti, ${n.varianti} varianti`);
        } catch (err2) {
          toast('Pubblicazione rifiutata: ' + err2.message);
        }
        break;
      }
      case 'export': {
        const out = $('#export-out');
        out.hidden = false;
        out.value = JSON.stringify({ ...d, exported_at: new Date().toISOString() }, null, 1);
        await copyText(out.value, out);
        break;
      }
      case 'reset':
        if (!(await confirmDialog('Ripristinare i dati iniziali?', 'Catalogo, richieste e impostazioni torneranno al dataset di partenza. Le foto caricate verranno scollegate. L\'accesso admin resta.', 'Ripristina', true))) return;
        store.reset();
        toast('Dati ripristinati');
        rerender();
        break;
    }
  });
}

__exp.render = render;
});
__def("app.js", function (__exp) {
const {formatCents,
  formatSize,
  AVAILABILITY_LABEL,
  STANDARD_SIZES,
  parseSize,
  pairingsFor,
  sleepMatch,
  addToCart,
  toSummaryLines,
  planWhatsApp,
  buildQuoteMessage,
  normalizeWhatsAppNumber,
  productJsonLd,
  localBusinessJsonLd,
  breadcrumbJsonLd,
  MAX_QTY,
  resolveRedirect,
  faqJsonLd,
  websiteJsonLd,
  catalogOfferConfig,
  priceCart,
  offerHints,
  publicBundles,
  quoteBundle,
  bundleSizes,
  bundleMattress,
  bundleItemsOf,} = __req("core/index.js");
const {MODE, P, u, abs, absAsset, current, go, isAt, legacyToPath, setNavigator, interceptLinks, IS_PREVIEW} = __req("nav.js");
const {PAGES, CATEGORY_SEO, VIEW_SEO, FAQ, faqForLd, CONTACT, waHref, PAYMENT_METHODS, applySettings} = __req("pages.js");
const {store, catalog, cart, api, media, mediaFor, coverFor, whatsappStatus, siteImage, applyRemoteCatalog} = __req("store.js");
const {configured: sbConfigured, loadCatalog: sbLoadCatalog} = __req("supabase.js");
const {esc, $, $$, swap, toast, copyText, openDialog, icon, reducedMotion} = __req("ui.js");
const {productIllustration, layersFor, swatchFor} = __req("illustrations.js");
const {heroHtml} = __req("hero.js");
const {SITE_SLOTS, PRODUCT_SLOTS, HERO_SLIDES, HERO_CAPTIONS} = __req("slots.js");
const {initHero, tiltCards} = __req("heroctl.js");
const {enhance, bump, explode} = __req("motion.js");

const CFG = window.VS_CONFIG ?? {};
const app = $('#app');
const state = {
  homeKind: 'materasso',
  compare: new Set(),
  filters: { tech: 'all', removable: false, height: 0, sort: 'reco' },
  sel: {}, // productId -> {size, height, qty}
  sm: null, // Sleep Match: risposte solo in memoria
  sizes: ['160x190', '180x200'],
  lastRoute: undefined,
  pay: 'contrassegno',
  labModel: null,
};
const KIND_PLURAL = { materasso: 'Materassi', rete: 'Reti', guanciale: 'Guanciali', topper: 'Topper', letto: 'Letti a castello' };
const KIND_SING = { materasso: 'materasso', rete: 'rete', guanciale: 'guanciale', topper: 'topper', letto: 'letto' };
const TECH_LABEL = { foam: 'Poliuretano', memory: 'Memory Foam', molle: 'Molle insacchettate' };

// ---------------------------------------------------------------- immagini
const FALLBACK = {
  materasso: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M30 62 L120 36 L212 58 L122 88 Z" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M30 62 V92 L122 120 V88 M212 58 V88 L122 120" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M30 74 L122 101 L212 70" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".45"/><path d="M36 64 L120 40 L205 59" fill="none" stroke="#c8785b" stroke-width="1.6" stroke-dasharray="5 5"/></svg>`,
  rete: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M28 66 L120 40 L214 62 L122 92 Z" fill="none" stroke="currentColor" stroke-width="2.2"/>${Array.from({ length: 9 }, (_, i) => { const t = (i + 1) / 10; return `<path d="M${28 + 94 * t} ${66 + 26 * t} L${120 + 94 * t} ${40 + 22 * t}" stroke="currentColor" stroke-width="3" opacity=".75"/>`; }).join('')}<path d="M40 70v26M118 95v24M206 66v24" stroke="currentColor" stroke-width="2.4"/></svg>`,
  guanciale: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M44 48 Q120 30 196 48 Q210 70 196 94 Q120 112 44 94 Q30 70 44 48 Z" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M54 54 Q120 40 186 54 Q197 70 186 88 Q120 102 54 88 Q43 70 54 54 Z" fill="none" stroke="#c8785b" stroke-width="1.5" stroke-dasharray="5 5"/></svg>`,
  topper: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M30 70 L120 46 L212 66 L122 92 Z" fill="#fffcf7" stroke="currentColor" stroke-width="2"/><path d="M30 70 V80 L122 104 V92 M212 66 V76 L122 104" fill="none" stroke="currentColor" stroke-width="2"/><path d="M38 72 L120 50 L204 67" fill="none" stroke="#c8785b" stroke-width="1.5" stroke-dasharray="5 5"/></svg>`,
  letto: `<svg viewBox="0 0 240 140" aria-hidden="true"><path d="M60 20v110M180 20v110M60 50h120M60 100h120" stroke="currentColor" stroke-width="3" fill="none"/></svg>`,
};
function fallbackHtml(kind) {
  return `<div class="fallback">${FALLBACK[kind] ?? FALLBACK.materasso}</div>`;
}
function imgTag(m, { sizes = '(max-width: 700px) 92vw, 33vw', eager = false, cls = '' } = {}) {
  const src = media.resolve(m);
  if (!src) return null;
  const focal = `object-position:${m.focal_x ?? 50}% ${m.focal_y ?? 50}%`;
  if (m.bg === 'white') cls += ' blend';
  return `<img src="${esc(src)}" ${m.srcset ? `srcset="${esc(m.srcset)}" sizes="${esc(sizes)}"` : ''} alt="${esc(m.alt)}" ${m.width ? `width="${m.width}" height="${m.height}"` : ''} loading="${eager ? 'eager' : 'lazy'}" decoding="async" class="${cls}" style="${focal}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fallback',innerHTML:window.__fb||''}))">`;
}
window.__fb = FALLBACK.materasso;
/** Le foto con sfondo pieno riempiono il riquadro; i render scontornati restano "contenuti". */
// "fit" dichiarato sulla foto prevale: le foto su fondo bianco restano intere e centrate
const fitCls = (m) => ((m.fit ? m.fit === 'cover' : !m.illustrative) ? 'is-cover' : '');
function coverHtml(idx, p, opts = {}) {
  const m = coverFor(idx, p);
  return (m && imgTag(m, { ...opts, cls: fitCls(m) })) || productIllustration(p, idx.kind(p));
}

// ---------------------------------------------------------------- helpers
const catOf = (p) => catalog().snap.categories.find((c) => c.id === p.category_id);
const catPath = (c) => `/${c.slug}/`;
const prodPath = (p, c = catOf(p)) => (c ? `/${c.slug}/${p.slug}/` : `/prodotto/${p.slug}/`);
const href = {
  product: (p) => u(prodPath(p)),
  category: (c) => u(catPath(c)),
};
/** Percorso canonico di un prodotto (anche da un vecchio slug rinominato). */
function resolveProductPath(slug) {
  const idx = catalog();
  let p = idx.snap.products.find((x) => x.slug === slug);
  if (!p) {
    const to = resolveRedirect(store.db.redirects ?? [], slug);
    if (to) p = idx.snap.products.find((x) => x.slug === to);
  }
  return p ? prodPath(p) : null;
}
function priceFrom(idx, p, height = null) {
  // con un'altezza indicata il "da" è quello di quell'altezza: altrimenti si mostrerebbe
  // il prezzo di una configurazione diversa da quella proposta
  const prices = height === null ? null : idx.purchasableVariants(p).filter((v) => v.height_cm === height).map((v) => v.price_cents);
  const min = prices?.length ? Math.min(...prices) : idx.minPrice(p);
  const max = prices?.length ? Math.max(...prices) : idx.maxPrice(p);
  if (min === null || min === undefined) return '';
  return min === max ? `<span class="price">${formatCents(min)}</span>` : `<span class="price"><small>da</small>${formatCents(min)}</span>`;
}
const DEFAULT_DESC = VIEW_SEO.home.description;
const SHARE_IMG = 'img/social/vesuvio-sleep-condividi.jpg';
function metaTag(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
/**
 * Titolo, descrizione, robots, canonical, Open Graph e dati strutturati della pagina.
 * opts: { noindex, image, type, path }
 */
function setMeta(title, desc, ld = [], opts = {}) {
  const full = title ? `${title} | Vesuvio Sleep` : `${VIEW_SEO.home.metaTitle} | Vesuvio Sleep`;
  const description = desc || DEFAULT_DESC;
  document.title = full.length <= 70 || !title ? full : title;
  metaTag('name', 'description', description);
  const path = opts.path ?? current().path;
  metaTag('name', 'robots', IS_PREVIEW ? 'noindex, nofollow, noarchive' : opts.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  let canon = document.head.querySelector('link[rel="canonical"]');
  if (MODE === 'path' && !opts.noindex) {
    if (!canon) {
      canon = Object.assign(document.createElement('link'), { rel: 'canonical' });
      document.head.appendChild(canon);
    }
    canon.setAttribute('href', abs(path));
  } else canon?.remove();
  const og = {
    'og:type': opts.type || 'website',
    'og:site_name': 'Vesuvio Sleep',
    'og:locale': 'it_IT',
    'og:title': title || VIEW_SEO.home.metaTitle,
    'og:description': description,
    'og:url': abs(path),
    'og:image': absAsset(opts.image || SHARE_IMG),
  };
  for (const [k, v] of Object.entries(og)) metaTag('property', k, v);
  metaTag('name', 'twitter:card', 'summary_large_image');
  const list = ld.filter(Boolean);
  $('#ld').textContent = JSON.stringify(list.length === 1 ? list[0] : list);
}
/** Briciole: link per la pagina e dati strutturati con URL assoluti. items: [{name, path}] */
function trail(items) {
  return {
    ui: items.map((it, i) => ({ name: it.name, href: i < items.length - 1 && it.path ? u(it.path) : undefined })),
    ld: breadcrumbJsonLd(items.map((it) => ({ name: it.name, url: abs(it.path ?? current().path) }))),
  };
}
function crumbs(items) {
  return `<nav class="crumbs wrap" aria-label="Percorso"><ol>${items
    .map((it, i) => `<li>${it.href && i < items.length - 1 ? `<a href="${it.href}">${esc(it.name)}</a>` : `<span aria-current="page">${esc(it.name)}</span>`}</li>`)
    .join('')}</ol></nav>`;
}
function availabilityHtml(v) {
  if (!v) return '';
  return `<span class="avail ${v.availability === 'unavailable' ? 'avail--off' : ''}">${esc(AVAILABILITY_LABEL[v.availability])}</span>`;
}
function previewDrafts() {
  try {
    return sessionStorage.getItem('vs-admin-session') && sessionStorage.getItem('vs-preview-drafts') === '1';
  } catch {
    return false;
  }
}
const pub = () => catalog({ drafts: previewDrafts() });

// ---------------------------------------------------------------- layout
function renderChrome() {
  applySettings(store.db.settings);
  const idx = catalog();
  const cats = idx.commercialCategories();
  const here = current().path;
  const on = (p) => (here === p || (p !== '/' && here.startsWith(p)) ? 'aria-current="page"' : '');
  const nav = [
    ...cats.map((c) => ({ path: catPath(c), label: c.name })),
    ...(offersOn(idx) ? [{ path: P.offers, label: 'Letti completi' }] : []),
    { path: P.sleepMatch, label: 'Sleep Match' },
    { path: P.showroom, label: 'Showroom' },
  ];
  const msgs = [
    `Spedizione ${store.db.settings.shipping_note || ''}`,
    CONTACT.waShort === CONTACT.phoneShort ? `WhatsApp e telefono ${CONTACT.phoneShort}` : `WhatsApp ${CONTACT.waShort}`,
    'Produciamo materassi a Casoria dal 1986',
    'Paghi alla consegna o con bonifico',
    ...(offersOn(idx) ? ['Letto completo: materasso e rete insieme costano meno'] : []),
    'A Napoli consegna al piano gratuita',
    'Fuori misura e altezze personalizzate su richiesta',
  ];
  const run = msgs.map((m) => `<span>${esc(m)}</span>`).join('');
  $('#topbar').innerHTML = `<div class="wrap">
      <div class="ticker" aria-hidden="true"><div class="ticker__track">${run}${run}</div></div><span class="sr-only">${esc(msgs[0])}</span>
      <span class="topbar__preview">${previewDrafts() ? '<span class="topbar__flag">Anteprima admin: bozze visibili</span>' : ''}</span>
    </div>`;
  $('#nav').innerHTML = nav.map((n) => `<a href="${u(n.path)}" ${on(n.path)}>${esc(n.label)}</a>`).join('');
  $('#drawer-links').innerHTML =
    `<a href="${u(P.home)}">Home</a>` +
    nav.map((n) => `<a href="${u(n.path)}">${esc(n.label)}</a>`).join('') +
    `<a href="${u(P.compare)}">Confronta i materassi</a><a href="${u(P.sizes)}">Misure dei materassi</a><a href="${u(P.quote)}">Materassi su misura</a><a href="${u(P.faq)}">Domande frequenti</a><a href="${u(P.contacts)}">Contatti</a><a href="${u(P.search)}">Cerca</a><a href="${u(P.cart)}">Carrello (${cart.count()})</a>`;
  const n = cart.count();
  $('#cart-link').setAttribute('href', u(P.cart));
  $('#cart-link').innerHTML = `${icon('cart')}<span class="sr-only">Carrello, ${n} articoli</span>${n ? `<span class="badge-count" aria-hidden="true">${n}</span>` : ''}`;
  $('#search-link')?.setAttribute('href', u(P.search));
  $('.brand')?.setAttribute('href', u(P.home));
  $('#footer-main').innerHTML = footerHtml(cats);
  let fl = $('#wa-float');
  if (!fl) {
    fl = document.createElement('a');
    fl.id = 'wa-float';
    fl.className = 'wa-float';
    fl.target = '_blank';
    fl.rel = 'noopener';
    fl.setAttribute('aria-label', 'Scrivici su WhatsApp');
    fl.innerHTML = `${icon('wa', 24)}<span>Scrivici</span>`;
    document.body.appendChild(fl);
  }
  fl.href = waHref();
}
function footerHtml(cats) {
  const li = (path, t) => `<li><a href="${u(path)}">${esc(t)}</a></li>`;
  return `<div class="footer__grid footer__grid--5">
      <div>
        <span class="footer__logo"><img src="img/logo.webp" width="240" height="229" alt="Vesuvio Sleep" loading="lazy"></span>
        <p style="margin-top:14px">Materassi di fabbrica dal 1986, prodotti a Casoria (Napoli).</p>
        <ul class="footer__contacts">
          <li><a href="${waHref()}" target="_blank" rel="noopener">${icon('wa', 18)} WhatsApp ${CONTACT.waShort}</a></li>
          <li><a href="${CONTACT.phoneHref}">${icon('phone', 18)} ${CONTACT.phoneShort}</a></li>
          <li><a href="mailto:${CONTACT.email}">${icon('mail', 18)} ${CONTACT.email}</a></li>
        </ul>
      </div>
      <div><h2>Catalogo</h2><ul>${cats.map((c) => li(catPath(c), c.name)).join('')}${li(P.quote, 'Materassi su misura')}${li(P.b2b, 'Hotel e B&B')}</ul></div>
      <div><h2>Scegliere</h2><ul>${li(P.sleepMatch, 'Sleep Match')}${li(P.compare, 'Confronta i materassi')}${li(P.sizes, 'Misure dei materassi')}${li(P.guides, 'Guide')}${li(P.naples, 'Materassi a Napoli')}</ul></div>
      <div><h2>Assistenza</h2><ul>${li(P.contacts, 'Contatti')}${li(P.faq, 'Domande frequenti')}${li(P.shipping, 'Spedizioni e consegna')}${li(P.payments, 'Pagamenti')}${li(P.returns, 'Resi e recesso')}${li(P.warranty, 'Garanzia')}</ul></div>
      <div><h2>Showroom</h2><p style="margin:0">Via Raffaele Salierno 38<br>80026 Casoria (NA)</p><p>Lun–ven 09:00–18:00<br>Sab 10:00–14:00</p><ul>${li(P.showroom, 'Come arrivare')}${li(P.about, 'Chi siamo')}</ul></div>
    </div>
    <div class="footer__legal"><span>${esc(CONTACT.legalName)} · P.IVA ${CONTACT.vat} · REA ${CONTACT.rea} · ${esc(CONTACT.address)}</span>
      <span class="footer__legal-links"><a href="${u(P.terms)}">Condizioni di vendita</a> · <a href="${u(P.privacy)}">Privacy</a> · <a href="${u(P.cookies)}">Cookie</a>${IS_PREVIEW ? ' · ' : ''}${IS_PREVIEW ? `<a href="${u(P.admin)}" rel="nofollow">Area riservata</a>` : ''}</span></div>`;
}

// ---------------------------------------------------------------- router
async function dispatch(cur) {
  const { path, query } = cur;
  if (path.startsWith(P.admin)) return (await Promise.resolve(__req("admin.js"))).render(app);
  const fixed = {
    [P.home]: viewHome,
    [P.sleepMatch]: viewSleepMatch,
    [P.compare]: viewCompare,
    [P.sizes]: viewSizes,
    [P.quote]: () => viewQuote(query),
    [P.showroom]: viewShowroom,
    [P.cart]: () => viewCart(query),
    [P.review]: viewReview,
    [P.search]: () => viewSearch(query.q || ''),
    [P.offers]: viewOffers,
  };
  if (fixed[path]) return fixed[path]();
  if (PAGES[path]) return viewPage(path, PAGES[path]);
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 1) {
    const c = pub().snap.categories.find((x) => x.slug === seg[0]);
    if (c && (c.status === 'published' || previewDrafts())) return viewCategory(c);
  }
  if (seg.length === 2 && `/${seg[0]}/` === P.offers) return viewBundle(seg[1]);
  if (seg.length === 2) return viewProduct(seg[1], seg[0]);
  return viewNotFound();
}
// Carrello e riepilogo aspettano il ricontrollo dei prezzi, che con il database collegato
// è una chiamata di rete. Se nel frattempo si cambia pagina, quella risposta non deve più
// disegnare niente: ogni navigazione alza il contatore e la vista vecchia si accorge di
// essere stata superata.
let renderSeq = 0;
const freshRender = () => {
  const mine = ++renderSeq;
  return () => mine === renderSeq;
};

async function route() {
  // dopo la prima pagina l'entrata è finita: niente più ritardi sulle animazioni
  if (state.lastRoute !== undefined) document.documentElement.classList.remove('vs-intro');
  const cur = current();
  if (cur.legacy !== undefined) {
    // vecchio indirizzo (#materassi, #prodotto-xxx ...): si passa a quello nuovo
    return go(legacyToPath(cur.legacy, resolveProductPath), { replace: true });
  }
  const r = cur.path + (Object.keys(cur.query).length ? '?' + new URLSearchParams(cur.query) : '');
  const render = async () => {
    closeDrawer();
    document.body.classList.remove('has-sticky');
    $('.compare-bar')?.remove();
    const isAdmin = cur.path.startsWith(P.admin);
    document.body.classList.toggle('is-admin', isAdmin);
    await dispatch(cur);
    document.body.classList.toggle('on-hero', !!$('#app > .hero'));
    document.body.classList.toggle('on-dark', !!$('#app > .page-hero'));
    renderChrome();
    if (MODE === 'path') $$('a[href^="#/"]').forEach((el) => el.setAttribute('href', el.getAttribute('href').slice(1)));
    if (state.lastRoute !== r) {
      window.scrollTo(0, 0);
      const h1 = $('#app h1');
      if (h1 && state.lastRoute !== undefined && !isAdmin) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    }
    enhance(app);
    tiltCards(app);
    // la barra di confronto compare solo dove si selezionano i modelli
    if (!isAdmin && state.compare.size && (cur.path === P.home || cur.path === '/materassi/')) showCompareBar();
  };
  const first = state.lastRoute === undefined;
  if (!first && document.startViewTransition && !reducedMotion() && state.lastRoute !== r) {
    try {
      const vt = document.startViewTransition(render);
      // una transizione interrotta da una navigazione successiva non è un errore
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
      await vt.updateCallbackDone;
    } catch {
      await render();
    }
  } else await render();
  $$('[style*="view-transition-name"]').forEach((el) => {
    if (!el.classList.contains('gallery__main')) el.style.viewTransitionName = '';
  });
  state.lastRoute = r;
}

// ---------------------------------------------------------------- HOME
function productCard(idx, p, { compare = false, d = 0 } = {}) {
  const kind = idx.kind(p);
  const vs = idx.purchasableVariants(p);
  const heights = idx.purchasableHeights(p);
  const feats = [
    ...(kind === 'materasso' && heights.length ? [heights.map((h) => 'H' + h).join(' · ')] : []),
    ...(p.removable_cover ? ['Sfoderabile'] : []),
    ...(p.summer_winter ? ['Estate e inverno'] : []),
    ...(kind !== 'materasso' ? (p.highlights || []).slice(0, 2) : []),
  ].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
  const cover = coverFor(idx, p);
  return `<article class="card rv" style="--d:${d}" data-pid="${esc(p.id)}">
    <div class="card__media">${coverHtml(idx, p)}${p.hybrid ? '<span class="card__flag">Hybrid</span>' : ''}</div>
    <div class="card__body">
      <span class="card__tech">${esc(p.technical_name)}</span>
      <h3><a href="${href.product(p)}" data-act="to-product">${esc(p.name)}</a></h3>
      <ul class="card__feats">${feats.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      ${availabilityHtml(vs[0])}
      <div class="card__foot">
        <div>${priceFrom(idx, p)}</div>
        ${compare ? `<label class="compare-toggle"><input type="checkbox" data-act="compare" value="${esc(p.id)}" ${state.compare.has(p.id) ? 'checked' : ''}> Confronta</label>` : `<span class="small muted">IVA inclusa</span>`}
      </div>
    </div>
  </article>`;
}

// Profilo dell'ombra del Vesuvio nella foto della hero (coordinate dell'immagine 1536×1024)
const RIDGE = 'M 420 318 C 480 296, 530 276, 590 252 C 640 248, 690 250, 712 242 C 735 232, 752 226, 768 227 C 790 228, 805 242, 828 256 C 900 294, 1000 340, 1160 390';

/** Segnaposto dichiarato per una foto ancora da fornire. */
function placeholderHtml(def, { cls = '' } = {}) {
  return `<figure class="ph ${cls}" style="--ratio:${def.ratio ?? '4 / 3'}" role="img" aria-label="Spazio per foto: ${esc(def.label)}">
    <div class="ph__inner">${icon('image', 30)}<strong>${esc(def.label)}</strong><span>${esc(def.hint ?? '')}</span><em>Foto in arrivo</em></div></figure>`;
}
function slotHtml(key, opts = {}) {
  const def = SITE_SLOTS.find((x) => x.key === key);
  const img = siteImage(key);
  if (img)
    return `<figure class="ph ph--photo ${opts.cls ?? ''}" style="--ratio:${opts.ratio ?? def.ratio}"><img src="${esc(img.src)}" ${img.srcset ? `srcset="${esc(img.srcset)}" sizes="${opts.sizes ?? '(max-width: 860px) 90vw, 33vw'}"` : ''} alt="${esc(img.alt)}" loading="lazy" decoding="async" style="object-position:${img.focal_x ?? 50}% ${img.focal_y ?? 50}%">${!img.uploaded && img.caption ? `<figcaption class="ph__cap">${esc(img.caption)}</figcaption>` : ''}${opts.label ? `<span class="ph__label">${esc(opts.label)}</span>` : ''}</figure>`;
  return placeholderHtml(def, opts);
}

function statementHtml() {
  return `<section class="statement" aria-labelledby="st-title"><div class="wrap statement__grid">
    <figure class="statement__img rv">
      <div class="statement__art">
        <img src="img/hero-vesuvio-1024.webp" srcset="img/hero-vesuvio-640.webp 640w, img/hero-vesuvio-1024.webp 1024w, img/hero-vesuvio-1536.webp 1536w" sizes="(max-width: 860px) 94vw, 60vw" width="1536" height="1024" loading="lazy" alt="Materasso trapuntato su una base blu, con l'ombra del Vesuvio proiettata sul muro">
        <svg class="stitch-svg stitch-svg--inview" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs><mask id="sew2"><path class="reveal" pathLength="1" d="${RIDGE}"/></mask></defs>
          <path class="thread" d="${RIDGE}" mask="url(#sew2)"/></svg>
      </div>
    </figure>
    <div class="statement__text rv" style="--d:1">
      <h2 id="st-title">Il Vesuvio ce l'abbiamo davanti ogni mattina.</h2>
      <p>Per questo il nostro marchio ha il suo profilo, e per questo cuciamo ogni materasso come si faceva in bottega: a mano dove serve, con materiali scelti e controllati in fabbrica.</p>
      <a class="btn btn--primary" href="${u('/materassi/')}">Scegli il tuo materasso</a>
    </div>
  </div></section>`;
}

function layersHtml(idx, p) {
  const m = mediaFor(idx, p).find((x) => x.slot === 'exploded' && x.hotspots?.length);
  if (!m) return '';
  const src = imgTag(m, { sizes: '(max-width: 860px) 94vw, 58vw' });
  if (!src) return '';
  return `<div class="layers" data-layers>
    <figure class="layers__fig">${src}
      ${m.hotspots.map((h, i) => `<button class="hot" style="left:${h.x}%;top:${h.y}%" data-act="layer" data-i="${i}" aria-pressed="${i === 0}" aria-label="${esc(h.title)}">${i + 1}</button>`).join('')}
    </figure>
    <ol class="layers__list">${m.hotspots
      .map((h, i) => `<li><button data-act="layer" data-i="${i}" aria-pressed="${i === 0}"><span class="n" aria-hidden="true">${i + 1}</span><span><strong>${esc(h.title)}</strong><span class="d">${esc(h.text)}</span></span></button></li>`)
      .join('')}</ol>
  </div>`;
}

const SW = { cover: '#fbf9f4', memory: '#a9d0ea', foam: '#f3ead6', springs: '#e9eef2', base: '#2a6f8f' };
function labHtml(idx) {
  const models = idx.publicProducts('materasso').filter((p) => layersFor(p));
  if (!models.length) return '';
  const cur = models.find((p) => p.id === state.labModel) ?? models[models.length - 1];
  state.labModel = cur.id;
  const ls = layersFor(cur);
  return `<div class="lab">
    <div class="lab__stage" id="lab-stage" data-autoexplode style="--ex:0">
      ${productIllustration(cur, 'materasso', { gap: 34 })}
      <label class="lab__slider">Chiuso <input type="range" min="0" max="100" value="0" data-act="lab-ex" aria-label="Apri gli strati"> Aperto</label>
    </div>
    <div>
      <h2 id="lab-title">Apri il materasso, strato per strato</h2>
      <p class="muted">Scegli un modello e trascina il cursore: vedi come è composto, dal rivestimento alla base.</p>
      <div class="lab__models chips" role="group" aria-label="Modello">${models
        .map((p) => `<button class="chip" data-act="lab-model" data-id="${esc(p.id)}" aria-pressed="${p.id === cur.id}">${esc(p.name.replace('Vesuvio ', ''))}</button>`)
        .join('')}</div>
      <ol class="lab__legend">${ls
        .map((l, i) => `<li><button data-act="lab-layer" data-i="${ls.length - 1 - i}" aria-pressed="false"><span class="sw" style="background:${swatchFor(cur, l)}" aria-hidden="true"></span><span><strong>${esc(l.label)}</strong><span class="d">${esc(l.note)}</span></span></button></li>`)
        .join('')}</ol>
      <div class="btn-row"><a class="btn btn--primary" href="${href.product(cur)}" data-act="to-product">Scopri ${esc(cur.name.replace('Vesuvio ', ''))}</a><span class="price" style="align-self:center">${priceFrom(idx, cur)}</span></div>
    </div>
  </div>`;
}

function openStatus() {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const wd = parts.find((x) => x.type === 'weekday').value;
    const mins = Number(parts.find((x) => x.type === 'hour').value) * 60 + Number(parts.find((x) => x.type === 'minute').value);
    const open = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(wd) ? mins >= 540 && mins < 1080 : wd === 'Sat' ? mins >= 600 && mins < 840 : false;
    return open ? '<span class="open-now is-open">Aperto ora</span>' : '<span class="open-now is-closed">Ora chiuso: controlla gli orari</span>';
  } catch {
    return '';
  }
}

function showroomHtml(compact = false) {
  const dest = encodeURIComponent('Via Raffaele Salierno 38, 80026 Casoria NA');
  return `<div class="showroom">
    <div class="rv">
      ${compact ? '<h2>Vieni a provarli in fabbrica</h2>' : ''}
      ${openStatus()}
      <p class="lead">Fabbrica, esposizione e showroom sono nello stesso posto: puoi provare i materassi e parlare con chi li produce.</p>
      <address style="font-style:normal;margin-bottom:16px"><strong>Vesuvio Sleep</strong><br>Via Raffaele Salierno 38<br>80026 Casoria (NA)</address>
      <dl class="hours"><dt>Lunedì–venerdì</dt><dd>09:00–18:00</dd><dt>Sabato</dt><dd>10:00–14:00</dd><dt>Domenica</dt><dd>Chiuso</dd></dl>
      <div class="btn-row">
        <a class="btn btn--primary" href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener">${icon('pin', 20)} Indicazioni stradali</a>
        <a class="btn btn--ghost" href="https://maps.apple.com/?daddr=${dest}" target="_blank" rel="noopener">Apri in Mappe</a>
      </div>
    </div>
    <div class="showroom__media rv" style="--d:1">${slotHtml('showroom')}<div class="map-card">
      <svg class="mapbg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="400" height="300" fill="#e3eef3"/>
        <g fill="none" stroke="#fffcf7" stroke-width="12" stroke-linecap="round"><path d="M-10 210 C80 190 160 200 240 160 S360 90 420 80"/><path d="M120 -10 C130 80 150 160 140 320"/></g>
        <g fill="none" stroke="#f6f1e8" stroke-width="5"><path d="M-10 90 L420 130"/><path d="M260 -10 L300 320"/><path d="M40 320 L200 -10"/><path d="M-10 260 L420 250"/></g>
        <path d="M250 300 C270 230 300 215 330 170 C350 150 370 160 400 140" fill="none" stroke="#c8785b" stroke-width="2" stroke-dasharray="6 6" opacity=".6"/>
      </svg>
      <span class="pin-dot" aria-hidden="true"></span>
      <div class="pin" style="margin-top:110px">${icon('pin', 24)}<p style="margin:6px 0 0"><strong>Via Raffaele Salierno 38, Casoria</strong></p>
        <button class="btn btn--ghost btn--sm map-load" data-act="map-load">Mostra la mappa interattiva</button>
        <p class="small muted map-note">Si carica Google Maps: Google riceve il tuo indirizzo IP e può usare cookie.</p></div>
    </div></div>
  </div>
  ${reviewsSlot()}`;
}

// ---------------------------------------------------------------- MAPPA E RECENSIONI
// La mappa di Google si carica solo quando la chiedi (prima nessuna connessione a Google):
// è il modo per mostrarla senza banner dei cookie. Vale per la visita in corso.
const MAP_QUERY = CFG.mapsQuery || 'Via Raffaele Salierno 38, 80026 Casoria NA';
function mapIframe() {
  return `<iframe class="map-frame" title="Mappa: Vesuvio Sleep, Via Raffaele Salierno 38, Casoria" src="https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&hl=it&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
}
function loadMap(card) {
  if (!card) return;
  card.classList.add('is-live');
  card.innerHTML = mapIframe() + `<a class="map-open small" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}" target="_blank" rel="noopener">Apri in Google Maps</a>`;
  try {
    sessionStorage.setItem('vs-map-ok', '1');
  } catch {
    /* ignora */
  }
}
/** Dopo il disegno: se in questa visita la mappa è già stata chiesta, si carica da sola. */
function afterShowroom() {
  let ok = false;
  try {
    ok = sessionStorage.getItem('vs-map-ok') === '1';
  } catch {
    /* ignora */
  }
  if (ok) $$('.map-card').forEach(loadMap);
  loadReviews();
}

// Recensioni di Google. Le legge una funzione del nostro database (supabase/functions/google-reviews)
// con la chiave API, che non sta mai nel browser; il browser non si collega a Google. Si mostrano
// tutte quelle che Google restituisce, nel suo ordine, con voto medio e numero totale: nessuna scelta
// nostra. Finché la funzione non è configurata la sezione non compare.
let reviewsCache = null;
function reviewsSlot() {
  return CFG.reviews ? '<section class="reviews" id="g-reviews" aria-labelledby="rev-t" hidden></section>' : '';
}
async function loadReviews() {
  const el = $('#g-reviews');
  if (!el || !CFG.reviews || !CFG.supabaseUrl) return;
  try {
    reviewsCache ??= await Promise.race([
      fetch(`${String(CFG.supabaseUrl).replace(/\/$/, '')}/functions/v1/google-reviews`, { headers: { apikey: CFG.supabaseKey, Authorization: `Bearer ${CFG.supabaseKey}` } }).then((r) => (r.ok ? r.json() : null)),
      new Promise((res) => setTimeout(() => res(null), 4000)),
    ]);
  } catch {
    reviewsCache = null;
  }
  const d = reviewsCache;
  if (!d?.configured || !d.count || !$('#g-reviews')) return;
  const stars = (n) => `<span class="stars" aria-label="${n} su 5">${'★'.repeat(Math.round(n))}${'☆'.repeat(5 - Math.round(n))}</span>`;
  el.innerHTML = `<div class="reviews__head"><h2 id="rev-t">Cosa dicono di noi su Google</h2>
      <p class="reviews__score"><strong>${String(d.rating ?? '').replace('.', ',')}</strong> ${stars(d.rating ?? 0)} <span class="muted">${d.count} recensioni</span></p></div>
    <ul class="reviews__list">${(d.reviews ?? [])
      .map((r) => `<li class="review"><p class="review__meta">${stars(r.rating)} <span class="muted small">${esc(r.when)}</span></p><p class="review__text">${esc(r.text)}</p><p class="small"><strong>${r.authorUri ? `<a href="${esc(r.authorUri)}" target="_blank" rel="noopener">${esc(r.author)}</a>` : esc(r.author)}</strong></p></li>`)
      .join('')}</ul>
    <p class="small muted">Recensioni pubblicate su Google: le mostriamo come le restituisce Google, senza selezionarle. ${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">Leggile tutte su Google Maps</a>` : ''}</p>`;
  el.hidden = false;
}

function viewHome() {
  const idx = pub();
  const cats = idx.commercialCategories();
  if (!cats.some((c) => c.kind === state.homeKind) && cats[0]) state.homeKind = cats[0].kind;
  const pocket = idx.publicProducts('materasso').find((p) => mediaFor(idx, p).some((m) => m.slot === 'exploded' && m.hotspots));
  setMeta(VIEW_SEO.home.metaTitle, VIEW_SEO.home.description, [websiteJsonLd(abs('')), localBusinessJsonLd(abs('/'), { image: absAsset(SHARE_IMG), logo: absAsset('img/logo.png') })], { path: P.home });
  const slides = heroSlides();
  const staticHero = state.lastRoute === undefined && slides.every((x) => !x.uploaded) ? $('#app > .hero') : null;
  app.innerHTML = `${staticHero ? '' : heroHtml(slides)}
  <div class="home-flow">
  <section class="quilt" aria-labelledby="num-title"><div class="wrap numbers">
    <h2 id="num-title" class="rv">Una fabbrica vera, con numeri veri.</h2>
    <div class="num rv" style="--d:1"><b data-count="1986" data-from="1950">1986</b><span>l'anno in cui abbiamo iniziato</span></div>
    <div class="num num--extra rv" style="--d:2"><b data-count="40" data-from="0">40</b><span>anni di produzione a Casoria</span></div>
    <div class="num rv" style="--d:3"><b data-count="13" data-from="0">13</b><span>misure standard, più il su misura</span></div>
  </div></section>

  ${statementHtml()}

  <div class="kinetic" aria-hidden="true">
    <div class="kinetic__row"><span>Memory Foam</span><i></i><span>Molle insacchettate</span><i></i><span>Poliuretano espanso</span><i></i><span>Memory Foam</span><i></i><span>Molle insacchettate</span><i></i><span>Poliuretano espanso</span><i></i></div>
    <div class="kinetic__row kinetic__row--rev"><span>Cuciti a Casoria</span><i></i><span>Dal 1986</span><i></i><span>Su misura</span><i></i><span>Prezzo di fabbrica</span><i></i><span>Cuciti a Casoria</span><i></i><span>Dal 1986</span><i></i><span>Su misura</span><i></i></div>
  </div>

  <section class="section hf-cat" aria-labelledby="cat-title">
    <div class="wrap">
      <div class="sec-head rv"><div><h2 id="cat-title">Il catalogo, direttamente dalla fabbrica</h2><p>Prezzi di fabbrica, IVA inclusa. Scorri i modelli e apri la scheda per scegliere misura e altezza.</p></div>
        <a class="btn btn--ghost btn--sm" href="${u(P.compare)}">Confronta i materassi</a></div>
      <div class="seg-tabs" role="tablist" aria-label="Categorie">${cats
        .map((c) => `<button class="tab" role="tab" id="tab-${c.kind}" aria-selected="${c.kind === state.homeKind}" aria-controls="home-grid" data-act="home-tab" data-kind="${c.kind}" tabindex="${c.kind === state.homeKind ? 0 : -1}">${esc(c.name)}<small>${idx.publicProducts(c.kind).length}</small></button>`)
        .join('')}<span class="seg-tabs__thumb" aria-hidden="true"></span></div>
      <div id="home-grid" role="tabpanel" aria-labelledby="tab-${state.homeKind}">${homeGrid(idx)}</div>
    </div>
  </section>

  <div class="hf-bundles">${bundlesSectionHtml(idx, { title: 'Letto completo, a prezzo di fabbrica', lead: 'Materasso e due guanciali, o materasso e rete: insieme costano meno che separati.', id: 'home-bundles-t', limit: 1 })}</div>

  <section class="section factory" aria-labelledby="lab-title"><div class="wrap">${labHtml(idx)}</div></section>

  <section class="factory-band" aria-labelledby="fab-title">
    ${(() => {
      const fbi = siteImage('fabbrica_panoramica');
      return fbi
        ? `<div class="factory-band__img kb"><img src="${esc(fbi.src)}" ${fbi.srcset ? `srcset="${esc(fbi.srcset)}" sizes="100vw"` : ''} loading="lazy" decoding="async" alt="${esc(fbi.alt)}"></div>`
        : `<div class="factory-band__img"><img src="img/lavorazione-1600.webp" loading="lazy" alt="Scena illustrativa di un laboratorio di materassi"></div>`;
    })()}
    <span class="factory-band__year" aria-hidden="true">1986</span>
    <div class="wrap factory-band__body">
      <h2 id="fab-title" class="rv">Siamo una fabbrica, non un rivenditore.</h2>
      <p class="rv" style="--d:1">Tagliamo, assembliamo e cuciamo i materassi nel nostro stabilimento di Casoria, poi li vendiamo direttamente a te. Made in Italy.</p>
      <dl>
        <div class="rv" style="--d:2"><dt>Produzione diretta</dt><dd>Circa 2 giorni di lavorazione prima della spedizione.</dd></div>
        <div class="rv" style="--d:3"><dt>Su misura, se serve</dt><dd>Fuori misura e altezze personalizzate, su preventivo.</dd></div>
        <div class="rv" style="--d:4"><dt>Hotel e B&amp;B</dt><dd>Forniture anche in grandi quantità. <a href="${u(P.quote)}">Richiedi un preventivo</a>.</dd></div>
      </dl>
    </div>
  </section>
  ${filmstripHtml()}

  ${pocket ? `<section class="section" aria-labelledby="inside-title"><div class="wrap">
      <div class="sec-head rv"><div><h2 id="inside-title">Dentro il ${esc(pocket.name.replace('Vesuvio ', ''))}</h2><p>Il nostro Hybrid: tocca i numeri per vedere i componenti.</p></div>
      <a class="btn btn--ghost btn--sm" href="${href.product(pocket)}">Vai alla scheda</a></div>
      <div class="rv">${layersHtml(idx, pocket)}</div>
  </div></section>` : ''}

  <section class="section--tight"><div class="wrap">
    <div class="match2 rv">
      <div class="match2__text">
        <h2>Non sai quale scegliere?</h2>
        <p>Sleep Match ti fa qualche domanda su come dormi e ti propone un solo materasso del nostro catalogo, con il perché. Non chiediamo il budget e non salviamo le risposte.</p>
        <p class="match2__q" id="mq">Iniziamo: come dormi di solito?</p>
        <div class="chips" role="group" aria-labelledby="mq">${[['fianco', 'Sul fianco'], ['schiena', 'Sulla schiena'], ['pancia', 'A pancia in giù'], ['mista', 'Cambio spesso']]
          .map(([v, l]) => `<button class="chip" data-act="sm-start" data-v="${v}">${l}</button>`)
          .join('')}</div>
      </div>
      <div class="match2__img kb">${(() => {
        const g = siteImage('testata_materasso');
        return g ? `<img src="${esc(g.src)}" ${g.srcset ? `srcset="${esc(g.srcset)}" sizes="(max-width: 860px) 100vw, 45vw"` : ''} loading="lazy" decoding="async" alt="${esc(g.alt)}">` : '';
      })()}</div>
    </div>
  </div></section>

  <section class="section" aria-labelledby="ship-title"><div class="wrap">
    <div class="sec-head rv"><div><h2 id="ship-title">Dalla fabbrica a casa tua</h2></div></div>
    <div class="ship">
      <div class="ship__card rv"><svg class="ship__route" viewBox="0 0 180 90" aria-hidden="true"><path d="M10 70 C50 20 110 80 170 20"/></svg>
        <div class="ship__big">0 €</div><h3>Spedizione in tutta Italia</h3><p class="muted">Isole comprese, con corriere e tracking.</p>
        <ul><li>${icon('check', 20)}Nessun supplemento per le isole</li><li>${icon('check', 20)}Tracking del corriere</li><li>${icon('check', 20)}Circa 2 giorni di produzione per i materassi</li></ul></div>
      <div class="ship__card ship__card--deep ship__card--photo rv" style="--d:1">${slotHtml('consegna', { cls: 'ship__photo kb', ratio: '16 / 9', sizes: '(max-width: 860px) 92vw, 45vw' })}
        <div class="ship__big">Napoli</div><h3>Con il nostro furgone</h3><p class="muted">Consegniamo noi, con qualche servizio in più.</p>
        <ul><li>${icon('check', 20)}Consegna al piano gratuita</li><li>${icon('check', 20)}Ritiro del vecchio materasso</li><li>${icon('check', 20)}Montaggio delle reti</li></ul></div>
    </div>
  </div></section>

  <section class="section factory" aria-labelledby="show-title"><div class="wrap"><h2 id="show-title" class="sr-only">Showroom</h2>${showroomHtml(true)}</div></section>
  </div>`;
  if (staticHero) app.prepend(staticHero);
  else $('#app > .hero')?.classList.remove('is-intro');
  initHero($('#app > .hero'));
  tiltCards(app);
  requestAnimationFrame(moveThumb);
  bindLab();
  afterShowroom();
}
function heroSlides() {
  return HERO_SLIDES.map((key) => {
    const img = siteImage(key);
    return img ? { key, ...img, caption: HERO_CAPTIONS[key], illustrative: !img.uploaded } : null;
  }).filter(Boolean);
}
/** Vetrina della home: l'elenco dei modelli a sinistra, il prodotto in scena a destra. */
function homeGrid(idx) {
  const items = idx.publicProducts(state.homeKind);
  const cat = idx.snap.categories.find((c) => c.kind === state.homeKind);
  return `<div class="showcase" data-showcase>
    <ol class="showcase__list">${items
      .map((p, i) => {
        const min = idx.minPrice(p);
        const hs = state.homeKind === 'materasso' ? idx.purchasableHeights(p) : [];
        return `<li class="showcase__item${i === 0 ? ' is-active' : ''}" style="--i:${i}">
          <a class="showcase__row" href="${href.product(p)}" data-show="${i}">
            <span class="showcase__name">${esc(p.name.replace(/^Vesuvio /, ''))}</span>
            <span class="showcase__tech">${esc(p.technical_name)}${hs.length ? ' · ' + hs.map((h) => 'H' + h).join(' ') : ''}</span>
            <span class="showcase__price">${min !== null ? `<small>da</small> ${formatCents(min)}` : ''}</span>
            <span class="showcase__go" aria-hidden="true">${icon('arrow', 22)}</span>
          </a>
          <figure class="showcase__fig" aria-hidden="true">${coverHtml(idx, p, { sizes: '(max-width: 900px) 80vw, 46vw' })}${p.hybrid ? '<span class="card__flag">Hybrid</span>' : ''}</figure>
        </li>`;
      })
      .join('')}</ol>
    <div class="showcase__floor" aria-hidden="true"></div>
  </div>
  <p class="showcase__all"><a class="btn btn--ghost btn--sm" href="${u('/' + cat?.slug + '/')}">Tutti i ${esc(KIND_PLURAL[state.homeKind].toLowerCase())}, con filtri</a></p>`;
}
function moveThumb() {
  const th = $('.seg-tabs__thumb');
  const t = $('.seg-tabs .tab[aria-selected="true"]');
  if (!th || !t) return;
  th.style.width = t.offsetWidth + 'px';
  th.style.transform = `translateX(${t.offsetLeft}px)`;
}
function bindLab() {
  const st = $('#lab-stage');
  if (!st) return;
  st.addEventListener('vs:visible', () => explode(st, 0.8, 1400), { once: true });
}

/** Nastro fotografico che scorre: la fabbrica in movimento. */
function filmstripHtml() {
  const items = [
    ['fabbrica_cucito', 'Il cucito della fascia'],
    ['fabbrica_taglio', 'Il taglio delle lastre'],
    ['testata_materasso', 'La trapuntatura'],
    ['fabbrica_materiali', 'I materiali'],
    ['showroom', 'Lo showroom'],
    ['testata_rete', 'Le reti a doghe'],
  ];
  const tiles = items.map(([k, l]) => `<li class="film__item">${slotHtml(k, { ratio: '4 / 5', label: l, sizes: '300px' })}</li>`).join('');
  return `<section class="film" aria-labelledby="film-title">
    <div class="wrap sec-head rv"><div><h2 id="film-title">Dentro la fabbrica</h2><p>Dal taglio delle lastre al bordino cucito a mano: ogni materasso passa da queste mani.</p></div></div>
    <div class="film__viewport"><ul class="film__track">${tiles}</ul><ul class="film__track" aria-hidden="true">${tiles}</ul></div>
  </section>`;
}

/** Testata scura e trapuntata per le pagine interne, con foto quando c'è. */
function pageHero(items, title, lead = '', art = '', photo = null) {
  return `<header class="page-hero${photo ? ' page-hero--photo' : ''}">${photo ? `<div class="page-hero__bg kb"><img src="${esc(photo.src)}" ${photo.srcset ? `srcset="${esc(photo.srcset)}" sizes="100vw"` : ''} alt="" decoding="async"></div>` : ''}${crumbs(items)}<div class="wrap"><h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>${art && !photo ? `<div class="page-hero__art" aria-hidden="true">${art}</div>` : ''}</header>`;
}

// ---------------------------------------------------------------- CATEGORIA
function viewCategory(c) {
  const idx = pub();
  const all = idx.publicProducts(c.kind);
  const f = state.filters;
  const isM = c.kind === 'materasso';
  const seo = CATEGORY_SEO[c.kind];
  const minAll = all.map((p) => idx.minPrice(p)).filter((x) => x !== null);
  const from = minAll.length ? formatCents(Math.min(...minAll)) : '';
  const tr = trail([{ name: 'Home', path: P.home }, { name: c.name, path: catPath(c) }]);
  const firstImg = all.map((p) => coverFor(idx, p)).find(Boolean);
  setMeta(c.seo_title || seo?.metaTitle || `${c.name} di fabbrica`, c.seo_description || seo?.description(from) || c.description, [
    tr.ld,
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: c.name,
      itemListElement: all.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(prodPath(p, c)), name: p.name })),
    },
  ], { image: firstImg ? media.resolve(firstImg) : undefined });
  const body = () => {
    let list = all.slice();
    if (isM) {
      if (f.tech !== 'all') list = list.filter((p) => p.match?.tech === f.tech);
      if (f.removable) list = list.filter((p) => p.removable_cover);
      if (f.height) list = list.filter((p) => idx.purchasableHeights(p).includes(f.height));
    }
    if (f.sort === 'asc') list.sort((a, b) => idx.minPrice(a) - idx.minPrice(b));
    if (f.sort === 'desc') list.sort((a, b) => idx.minPrice(b) - idx.minPrice(a));
    if (!all.length)
      return `<div class="empty"><h3>Nessun articolo acquistabile in questa categoria</h3><p>Stiamo completando prezzi e schede. Nel frattempo puoi chiederci informazioni.</p><a class="btn btn--ghost" href="${u(P.quote)}">Chiedi un preventivo</a></div>`;
    if (!list.length)
      return `<div class="empty"><h3>Nessun materasso con questi filtri</h3><p>Prova a togliere un filtro: la gamma è piccola e ogni modello ha caratteristiche diverse.</p><button class="btn btn--ghost" data-act="reset-filters">Azzera i filtri</button></div>`;
    // una scheda speciale tra i prodotti: l'offerta più vicina al filtro scelto
    const bundle = (isM || c.kind === 'rete') && offersOn(idx) ? bundleForTech(idx, isM ? f.tech : 'all') : null;
    const cards = list.map((p) => productCard(idx, p, { compare: isM }));
    if (bundle) cards.splice(Math.min(3, cards.length), 0, bundleCard(idx, bundle, { wide: true }));
    return `<h2 class="sr-only">${esc(c.name)}: i modelli</h2><p class="small muted" aria-live="polite">${list.length} ${list.length === 1 ? 'modello' : 'modelli'}</p><div class="grid${list.length >= 4 && list.length % 3 !== 0 ? ' grid--feat' : ''}">${cards.join('')}</div>`;
  };
  const chip = (key, val, label) => `<button class="chip" data-act="filter" data-k="${key}" data-v="${val}" aria-pressed="${String(f[key]) === String(val)}">${label}</button>`;
  const artP = all[all.length - 1];
  const head = siteImage({ materasso: 'testata_materasso', rete: 'testata_rete', guanciale: 'testata_guanciale' }[c.kind]);
  app.innerHTML = `${pageHero(tr.ui, c.name, c.description, artP ? productIllustration(artP, c.kind) : '', head)}
  <div class="wrap" style="padding-top:28px">
    <div class="toolbar">
      ${isM ? `<div class="chips" role="group" aria-label="Tecnologia">${chip('tech', 'all', 'Tutti')}${chip('tech', 'foam', 'Poliuretano')}${chip('tech', 'memory', 'Memory Foam')}${chip('tech', 'molle', 'Molle')}</div>
      <div class="chips" role="group" aria-label="Altezza e rivestimento">${[20, 25, 30].map((h) => chip('height', h, 'H' + h)).join('')}<button class="chip" data-act="filter" data-k="removable" data-v="toggle" aria-pressed="${f.removable}">Sfoderabile</button></div>` : '<span></span>'}
      <label><span class="sr-only">Ordina</span><select class="select" data-act="sort">
        <option value="reco" ${f.sort === 'reco' ? 'selected' : ''}>Ordine consigliato</option>
        <option value="asc" ${f.sort === 'asc' ? 'selected' : ''}>Prezzo crescente</option>
        <option value="desc" ${f.sort === 'desc' ? 'selected' : ''}>Prezzo decrescente</option></select></label>
    </div>
    <div id="cat-body">${body()}</div>
    ${isM ? `<p style="margin-top:28px" class="muted">Cerchi una misura o un'altezza diversa? <a href="${u(P.quote)}">Chiedi un preventivo fuori misura</a>.</p>` : ''}
    ${seo ? `<section class="seo-text prose">${seo.html()}</section>` : ''}
  </div>`;
  state.catBody = body;
}

// ---------------------------------------------------------------- SCHEDA
function getSel(idx, p) {
  const s = state.sel[p.id] ?? {};
  // sul sito pubblico esistono solo le combinazioni con prezzo
  const pv = idx.purchasableVariants(p);
  const sizes = idx.purchasableSizes(p);
  const heights = idx.purchasableHeights(p);
  let size = s.size && sizes.includes(s.size) ? s.size : sizes.includes('160x190') ? '160x190' : sizes[0] ?? null;
  let height = s.height && heights.includes(s.height) ? s.height : null;
  if (height === null || (size && !pv.some((v) => v.size === size && v.height_cm === height))) {
    height = pv.some((v) => v.height_cm === 25 && v.size === size) ? 25 : pv.find((v) => v.size === size)?.height_cm ?? heights[0] ?? null;
  }
  if (!heights.length) height = pv[0]?.height_cm ?? null;
  return (state.sel[p.id] = { size, height, qty: s.qty ?? 1 });
}

const PRODUCT_PHRASE = {
  rete: () => 'rete a doghe in legno',
  topper: () => 'topper in Memory Foam',
  guanciale: () => 'guanciale',
  letto: () => 'letto a castello',
  materasso: (p) =>
    p.match?.tech === 'molle' ? (p.hybrid ? 'materasso a molle insacchettate e Memory' : 'materasso a molle insacchettate') : p.match?.tech === 'memory' ? 'materasso in Memory Foam' : 'materasso in poliuretano espanso',
};
function productSeo(idx, p, kind) {
  const min = idx.minPrice(p);
  const sizes = idx.purchasableSizes(p).length;
  const hs = kind === 'materasso' ? idx.purchasableHeights(p) : [];
  const title = `${p.name}, ${PRODUCT_PHRASE[kind]?.(p) ?? kind}`;
  const parts = [
    p.short,
    min !== null ? `Da ${formatCents(min)} IVA inclusa.` : '',
    sizes ? `${sizes} ${sizes === 1 ? 'misura' : 'misure'}${hs.length ? ', H' + hs.join('/H') : ''}.` : '',
    'Spedizione gratuita.',
  ].filter(Boolean);
  // massimo circa 160 caratteri: si tolgono prima le informazioni meno importanti
  while (parts.join(' ').length > 160 && parts.length > 2) parts.splice(parts.length - 2, 1);
  return { title, desc: parts.join(' ') };
}
function viewProduct(slug, catSlug) {
  const idx = pub();
  const p = idx.snap.products.find((x) => x.slug === slug && (x.status === 'published' || previewDrafts()));
  if (!p) {
    // vecchi indirizzi (es. pocket-2400-elite -> pocket-2600-elite): redirect permanente
    const to = resolveProductPath(slug);
    if (to && to !== current().path) return go(to, { replace: true });
  }
  const c = p && idx.category(p);
  if (!p || !c || (c.status !== 'published' && !previewDrafts())) return viewNotFound();
  if (catSlug !== c.slug) return go(prodPath(p, c), { replace: true });
  const kind = c.kind;
  const ms = mediaFor(idx, p);
  const gallery = ms.length ? ms : [];
  const urlImgs = gallery.map((m) => media.resolve(m)).filter((u) => u && !u.startsWith('blob:'));
  const tr = trail([{ name: 'Home', path: P.home }, { name: c.name, path: catPath(c) }, { name: p.name, path: prodPath(p, c) }]);
  const seo = productSeo(idx, p, kind);
  setMeta(p.seo_title || seo.title, p.seo_description || seo.desc, [
    productJsonLd(idx, p, { images: urlImgs.map(absAsset), url: abs(prodPath(p, c)), site: abs('') }),
    tr.ld,
  ], { image: urlImgs[0], type: 'product' });
  const purchasable = idx.isProductPurchasable(p);
  const showClaims = store.db.settings.show_claims && p.claims?.length;
  // portata delle reti: solo il livello indicato dall'azienda («Portata alta»), mai un valore in kg non verificato
  const portata = kind === 'rete' ? (p.highlights || []).find((h) => /^Portata /i.test(h))?.replace(/^Portata /i, '') : null;
  const pillowH = kind === 'guanciale' ? idx.variantsOf(p)[0]?.height_cm : null;
  const factsRows = [
    ['Tecnologia', p.technical_name],
    ['Composizione', p.composition],
    kind === 'materasso' ? ['Altezze', idx.heightsOf(p).map((h) => `H${h}`).join(', ')] : null,
    kind === 'guanciale' ? ['Altezza', pillowH ? pillowH + ' cm' : null] : null,
    portata ? ['Portata', portata[0].toUpperCase() + portata.slice(1)] : null,
    p.removable_cover !== null && kind !== 'rete' ? ['Rivestimento', p.removable_cover ? 'Sfoderabile, lavaggio secondo le indicazioni in etichetta' : 'Non sfoderabile'] : null,
    p.summer_winter ? ['Lati', 'Reversibile: lato invernale e lato estivo'] : null,
    p.firmness_display ? ['Rigidità indicativa', p.firmness_display] : null,
    showClaims ? ['Tessuto', p.claims.join(', ')] : null,
    p.lead_time ? ['Produzione', p.lead_time] : null,
  ].filter((r) => r && r[1]);

  const layers = kind === 'materasso' || kind === 'topper' ? layersFor(p) : null;
  const exploded = gallery.find((m) => m.slot === 'exploded');
  const fabric = gallery.find((m) => m.slot === 'fabric');
  const tiles = [
    kind === 'materasso' && idx.purchasableHeights(p).length ? [idx.purchasableHeights(p).map((h) => h).join(' · '), 'cm di altezza'] : null,
    idx.purchasableSizes(p).length ? [String(idx.purchasableSizes(p).length), 'misure standard'] : null,
    p.firmness_display ? [p.firmness_display, 'rigidità indicativa'] : null,
    p.removable_cover !== null && kind !== 'rete' ? [p.removable_cover ? 'Sfoderabile' : 'Fisso', 'rivestimento'] : null,
    portata ? [portata[0].toUpperCase() + portata.slice(1), 'portata'] : null,
    pillowH ? [String(pillowH), 'cm di altezza'] : null,
    kind === 'rete' ? ['Inclusi', 'piedi'] : null,
  ].filter(Boolean).slice(0, 4);

  app.innerHTML = `${crumbs(tr.ui)}
  <div class="wrap pdp-top">
    <div class="pdp">
      <div class="gallery" data-gallery>${galleryHtml(idx, p, gallery, 0)}</div>
      <div class="buy" id="buy"></div>
    </div>
  </div>

  <section class="pdp-story"><div class="wrap pdp-story__in">
    <div class="pdp-story__text">
      <h2 class="pdp-h2 rv">Com'è fatto</h2>
      ${p.description ? `<p class="pdp-story__lead rv" style="--d:1">${esc(p.description)}</p>` : ''}
      ${p.hybrid ? '<p class="small muted rv" style="--d:2">Chiamiamo Hybrid i materassi che uniscono molle insacchettate e Memory Foam.</p>' : ''}
      ${tiles.length ? `<ul class="tiles">${tiles.map(([v, k], i) => `<li class="rv" style="--d:${i + 1}"><strong>${esc(v)}</strong><span>${esc(k)}</span></li>`).join('')}</ul>` : ''}
    </div>
    <div class="pdp-story__facts rv" style="--d:1"><h2 class="sr-only">Caratteristiche</h2><dl class="facts-list">${factsRows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
  </div></section>

  ${layers && exploded ? `<section class="anatomy" aria-labelledby="anat-t"><div class="wrap anatomy__in">
      <figure class="anatomy__fig" data-anatomy>${imgTag(exploded, { sizes: '(max-width: 900px) 92vw, 52vw' })}</figure>
      <div class="anatomy__text">
        <h2 id="anat-t" class="rv">Strato per strato</h2>
        <p class="anatomy__sub rv" style="--d:1">Dall'alto verso il basso, ecco cosa c'è dentro.</p>
        <ol class="anatomy__list">${layers.map((l, i) => `<li class="rv" style="--d:${i + 1}"><span class="anatomy__sw" style="--c:${swatchFor(p, l)}"></span><div><strong>${esc(l.label)}</strong><span>${esc(l.note)}</span></div></li>`).join('')}</ol>
      </div>
  </div></section>` : ''}

  ${fabric ? `<section class="fabric"><div class="wrap fabric__in">
      <div class="fabric__text">
        <h2 class="pdp-h2 rv">Il rivestimento, da vicino</h2>
        <ul class="ticks rv" style="--d:1">
          ${p.removable_cover === true ? '<li>Sfoderabile: si apre con la cerniera</li>' : p.removable_cover === false ? '<li>Rivestimento fisso, non sfoderabile</li>' : ''}
          ${p.summer_winter ? '<li>Reversibile: un lato invernale e un lato estivo</li>' : ''}
          ${showClaims ? `<li>Tessuto ${esc(p.claims.slice(0, 3).join(', '))}</li>` : ''}
          <li>Trapuntato e cucito nella nostra fabbrica di Casoria</li>
        </ul>
      </div>
      <figure class="fabric__fig kb">${imgTag(fabric, { sizes: '(max-width: 900px) 92vw, 46vw', cls: 'is-cover' })}</figure>
  </div></section>` : ''}

  <div class="wrap">
    <section class="section--tight" id="pairings" aria-labelledby="pair-t"></section>
    <section class="section--tight"><ul class="promise">
      <li class="rv">${icon('truck', 26)}<h3>Consegna gratuita</h3><p>Spedizione ${esc(store.db.settings.shipping_note)}. A Napoli consegna al piano e ritiro dell'usato${kind === 'rete' ? ', con montaggio' : ''}.</p><a href="${u(P.shipping)}">Spedizioni e consegna</a></li>
      <li class="rv" style="--d:1">${icon('check', 26)}<h3>Paghi alla consegna</h3><p>In contrassegno oppure con bonifico. Sul sito non si paga e non si inseriscono carte.</p><a href="${u(P.payments)}">Come si paga</a></li>
      <li class="rv" style="--d:2">${icon('ruler', 26)}<h3>Anche su misura</h3><p>Fuori misura e altezze personalizzate: ti mandiamo un preventivo su WhatsApp.</p><a href="${u(P.quote)}" data-act="quote-for" data-id="${esc(p.id)}">Chiedi un preventivo</a></li>
    </ul></section>
  </div>
  ${purchasable ? `<div class="sticky-buy" id="sticky-buy" aria-hidden="true"></div>` : ''}`;
  renderBuy(idx, p);
  $('#gal-stage')?.addEventListener('vs:visible', (e) => explode(e.currentTarget, 0.6, 1300), { once: true });
  if (purchasable) {
    document.body.classList.add('has-sticky');
    // controllo sulla posizione (non IntersectionObserver: uno scroll veloce può saltare l'incrocio)
    const sb = $('#sticky-buy');
    let raf = 0;
    const update = () => {
      raf = 0;
      const btn = $('#add-btn');
      if (!btn || !sb.isConnected) return window.removeEventListener('scroll', onScroll);
      const show = btn.getBoundingClientRect().bottom < 0;
      if (sb.classList.contains('is-visible') === show) return;
      sb.classList.toggle('is-visible', show);
      sb.setAttribute('aria-hidden', String(!show));
      $$('button,a', sb).forEach((b) => (b.tabIndex = show ? 0 : -1));
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }
}

function galleryItems(idx, p, gallery) {
  const kind = idx.kind(p);
  const items = gallery.map((m) => ({ type: 'media', m }));
  // Senza nemmeno una foto si mostra il disegno del modello: è dichiarato come illustrazione.
  if (!items.length) items.push({ type: 'illus' });
  // Per ogni inquadratura prevista e non ancora fornita resta un segnaposto dichiarato:
  // meglio uno spazio vuoto e onesto che una foto di un altro materasso.
  const taken = new Set(gallery.map((m) => m.slot));
  for (const def of PRODUCT_SLOTS[kind] ?? []) if (!taken.has(def.slot)) items.push({ type: 'ph', def });
  return items;
}
function galleryHtml(idx, p, gallery, i) {
  const kind = idx.kind(p);
  const items = galleryItems(idx, p, gallery);
  const it = items[i] ?? items[0];
  let main;
  if (it.type === 'illus') {
    // le "aperture" degli strati solo dove la composizione è confermata
    const layered = (kind === 'materasso' || kind === 'topper') && !!layersFor(p);
    main = `<div class="gallery__main" id="gal-stage" ${layered ? 'data-autoexplode' : ''} style="--ex:0">${productIllustration(p, kind, { gap: 34 })}
      ${layered ? `<label class="gallery__ctrl">Chiuso <input type="range" min="0" max="100" value="0" data-act="gal-ex" aria-label="Apri gli strati"> Aperto</label>` : ''}</div>`;
  } else if (it.type === 'ph') {
    main = `<div class="gallery__main gallery__main--ph">${placeholderHtml({ ...it.def, ratio: '3 / 2' }, { cls: 'ph--fill' })}</div>`;
  } else {
    const m = it.m;
    const tag = imgTag(m, { sizes: '(max-width: 860px) 94vw, 58vw', eager: true, cls: fitCls(m) });
    main = `<div class="gallery__main${m.bg === 'white' ? ' gallery__main--stage' : ''}" data-tilt>${m.bg === 'white' ? '<span class="gallery__floor" aria-hidden="true"></span>' : ''}${tag || fallbackHtml(kind)}
      ${tag ? `<button class="icon-btn gallery__zoom" data-act="zoom" data-i="${gallery.indexOf(m)}" aria-label="Ingrandisci l'immagine">${icon('zoom')}</button>` : ''}
      ${m.caption ? `<span class="gallery__label">${esc(m.caption)}</span>` : ''}</div>`;
  }
  const thumb = (t, j) => {
    const inner = t.type === 'media' ? imgTag(t.m, { sizes: '80px' }) || '' : t.type === 'illus' ? productIllustration(p, kind) : `<span class="thumb__ph">${icon('image', 18)}</span>`;
    const label = t.type === 'media' ? t.m.alt : `Illustrazione di ${p.name}`;
    return `<button class="thumb ${t.type === 'ph' ? 'thumb--ph' : ''}" data-act="thumb" data-i="${j}" aria-current="${j === i}" aria-label="${esc(label)}">${inner}</button>`;
  };
  return `${main}${items.length > 1 ? `<div class="gal-dots" aria-hidden="true">${items.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div><div class="thumbs" role="group" aria-label="Immagini">${items.map(thumb).join('')}</div>` : ''}
`;
}

function renderBuy(idx, p) {
  const kind = idx.kind(p);
  const sel = getSel(idx, p);
  const sizes = idx.purchasableSizes(p);
  const heights = idx.purchasableHeights(p);
  const pv = idx.purchasableVariants(p);
  const v = pv.find((x) => (x.size ?? null) === (sel.size ?? null) && (kind === 'materasso' || kind === 'topper' ? x.height_cm === sel.height : true));
  const ok = v && pv.includes(v);
  const sizeOk = (s) => pv.some((x) => x.size === s && (!heights.length || kind !== 'materasso' || x.height_cm === sel.height));
  const heightOk = (h) => pv.some((x) => x.height_cm === h);
  const selectable = kind === 'materasso' && heights.length > 1;
  $('#buy').innerHTML = `
    <span class="buy__tech">${esc(p.technical_name)}</span>
    <h1>${esc(p.name)}</h1>
    <p>${esc(p.short)}</p>
    <div class="buy__price" aria-live="polite">${ok ? `<span class="price"><span class="price-flip ${state.lastPrice?.[p.id] !== undefined && state.lastPrice[p.id] !== v.price_cents ? 'is-new' : ''}">${formatCents(v.price_cents)}</span></span><span class="small muted">IVA inclusa${sel.size ? `, ${formatSize(sel.size)}` : ''}${v.height_cm && kind === 'materasso' ? ` H${v.height_cm}` : ''}</span>` : `<span class="small">Questa configurazione non è acquistabile online.</span>`}</div>
    ${ok ? availabilityHtml(v) : ''}
    ${selectable ? `<fieldset class="opt"><legend>Altezza</legend><div class="seg seg--h">${heights
      .map((h) => `<input type="radio" name="h" id="h${h}" value="${h}" data-act="pick-h" ${sel.height === h ? 'checked' : ''} ${heightOk(h) ? '' : 'disabled'}><label for="h${h}">H${h}</label>`)
      .join('')}</div></fieldset>` : ''}
    ${sizes.length ? `<fieldset class="opt"><legend>Misura${SIZE_NAMES[sel.size] ? ` <span class="opt__hint">${esc(SIZE_NAMES[sel.size])}</span>` : ''} <button type="button" class="link-btn" data-act="size-guide">Confronta due misure</button></legend><div class="seg">${sizes
      .map((s) => `<input type="radio" name="s" id="s${s}" value="${s}" data-act="pick-s" ${sel.size === s ? 'checked' : ''} ${sizeOk(s) ? '' : 'disabled'}><label for="s${s}">${formatSize(s)}</label>`)
      .join('')}</div>${footprint(sel.size)}</fieldset>` : ''}
    ${v ? `<p class="sku">SKU <span>${esc(v.sku)}</span></p>` : ''}
    <div class="buy__actions">
      <div class="qty" role="group" aria-label="Quantità"><button type="button" data-act="qty" data-d="-1" aria-label="Diminuisci">${icon('minus', 18)}</button><output aria-live="polite">${sel.qty}</output><button type="button" data-act="qty" data-d="1" aria-label="Aumenta">${icon('plus', 18)}</button></div>
      <button class="btn btn--primary" id="add-btn" data-act="add" ${ok ? '' : 'disabled'}>Aggiungi al carrello</button>
    </div>
    <div class="buy__extra" id="add-feedback" aria-live="polite"></div>
    ${ok && kind === 'materasso' ? bedPanelHtml(idx, p, v, sel.qty) : ''}
    ${ok && kind === 'guanciale' ? pairPanelHtml(idx, v) : ''}
    <ul class="buy__trust"><li>${icon('truck', 18)} Spedizione gratuita in Italia</li><li>${icon('check', 18)} Paghi alla consegna o con bonifico</li><li>${icon('clock', 18)} Produzione in circa 2 giorni</li></ul>
    <div class="buy__extra">
      <a href="${u(P.quote)}" data-act="quote-for" data-id="${esc(p.id)}">Ti serve un'altra misura o un'altra altezza?</a>
      ${kind === 'materasso' ? `<a href="${u(P.compare)}" data-act="compare-with" data-id="${esc(p.id)}">Confronta con gli altri materassi</a>` : ''}
    </div>`;
  state.lastPrice = { ...(state.lastPrice ?? {}), [p.id]: ok ? v.price_cents : null };
  setTimeout(() => $('#buy')?.classList.add('is-live'), 1300);
  const fp = $('.footprint__box span');
  if (fp && state.prevFoot) {
    const [w, h] = [fp.style.width, fp.style.height];
    fp.style.width = state.prevFoot[0];
    fp.style.height = state.prevFoot[1];
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fp.style.width = w;
      fp.style.height = h;
    }));
  }
  if (fp) state.prevFoot = [fp.style.width, fp.style.height];
  const sb = $('#sticky-buy');
  if (sb)
    sb.innerHTML = ok
      ? `<div><div class="price">${formatCents(v.price_cents)}</div><div class="meta">${sel.size ? formatSize(sel.size) : ''}${v.height_cm && kind === 'materasso' ? ` · H${v.height_cm}` : ''}</div></div><button class="btn btn--primary" data-act="add">Aggiungi al carrello</button>`
      : `<div class="meta">Configurazione non acquistabile online</div><a class="btn btn--ghost btn--sm" href="#buy">Cambia</a>`;
  renderPairings(idx, p, sel.size);
}

function footprint(size) {
  const d = size && parseSize(size);
  if (!d) return '';
  const k = 64 / 220;
  return `<div class="footprint" aria-hidden="true"><div class="footprint__box"><span style="width:${(d.w * k).toFixed(1)}px;height:${(d.l * k).toFixed(1)}px"></span></div><span>Ingombro ${d.w} × ${d.l} cm, in scala con le altre misure</span></div>`;
}

function renderPairings(idx, p, size) {
  const el = $('#pairings');
  if (!el) return;
  const kind = idx.kind(p);
  const groups = pairingsFor(idx, p, kind === 'guanciale' ? null : size);
  // con le offerte attive si mostra quanto si risparmia aggiungendo il pezzo
  const cfg = offerCfg(idx);
  const sel = state.sel[p.id];
  const mv = kind === 'materasso' && cfg ? idx.purchasableVariants(p).find((x) => x.size === size && x.height_cm === sel?.height) : null;
  if (mv) {
    const rete = idx.publicProducts('rete').map((r) => idx.cheapestAtSize(r, size)).filter(Boolean).sort((a, b) => a.price_cents - b.price_cents)[0];
    const base = rete ? priceCart(idx, [{ variant_id: mv.id, qty: 1 }, { variant_id: rete.id, qty: 1 }], cfg).discount_cents : 0;
    for (const g of groups)
      for (const it of g.items) {
        if (!it.variant) continue;
        if (g.kind === 'rete') it.save_cents = priceCart(idx, [{ variant_id: mv.id, qty: 1 }, { variant_id: it.variant.id, qty: 1 }], cfg).discount_cents;
        if (g.kind === 'topper' && rete)
          it.save_cents = priceCart(idx, [{ variant_id: mv.id, qty: 1 }, { variant_id: rete.id, qty: 1 }, { variant_id: it.variant.id, qty: 1 }], cfg).discount_cents - base;
      }
  }
  if (!groups.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<h2 id="pair-t" class="pdp-h2">${kind === 'materasso' ? 'Completa il letto' : kind === 'rete' ? 'Il materasso per questa rete' : 'Si abbina bene con'}</h2>
    ${size && kind !== 'guanciale' ? `<p class="muted small">Ti proponiamo solo articoli nella misura ${formatSize(size)}.</p>` : ''}
    ${groups.map((g) => `<h3 class="pair-kind">${esc(KIND_PLURAL[g.kind])}</h3><div class="pair-row">${g.items.map((it) => pairHtml(idx, it)).join('')}</div>`).join('')}`;
}
function pairHtml(idx, it) {
  const p = it.product;
  const v = it.variant;
  const spec = v ? [v.size ? formatSize(v.size) : '', v.height_cm && idx.kind(p) === 'materasso' ? `H${v.height_cm}` : ''].filter(Boolean).join(' · ') : '';
  return `<div class="pair"><div class="pair__img">${coverHtml(idx, p, { sizes: '(max-width: 700px) 40vw, 220px' })}</div>
    <div><h4><a href="${href.product(p)}">${esc(p.name)}</a></h4><div class="meta">${esc(spec || p.technical_name)}</div>
      ${it.save_cents ? `<span class="pair__save">−${formatCents(it.save_cents)} ${idx.kind(p) === 'rete' ? 'con questo materasso' : 'con il letto completo'}</span>` : ''}
      <div class="row"><strong>${v ? '' : '<small class="muted">da </small>'}${formatCents(it.fromPrice)}</strong>
      ${v ? `<button class="btn btn--ghost btn--sm" data-act="add-variant" data-id="${esc(v.id)}">Aggiungi</button>` : `<a class="btn btn--ghost btn--sm" href="${href.product(p)}">Scegli</a>`}</div></div></div>`;
}

// ---------------------------------------------------------------- SLEEP MATCH
const SM_STEPS = (a) => [
  { k: 'sleepers', q: 'Dormi da solo o in due?', o: [['single', 'Da solo', ''], ['couple', 'In due', 'Ti chiederemo qualcosa anche sull\'altra persona']] },
  { k: 'position', q: 'In che posizione dormi di solito?', o: [['fianco', 'Sul fianco', ''], ['schiena', 'Sulla schiena', ''], ['pancia', 'A pancia in giù', ''], ['mista', 'Cambio spesso', '']] },
  { k: 'me.weight', q: a.sleepers === 'couple' ? 'Fascia di peso: la tua' : 'In che fascia di peso sei?', o: [['lt60', 'Meno di 60 kg', ''], ['60-85', '60–85 kg', ''], ['85-110', '85–110 kg', ''], ['gt110', 'Oltre 110 kg', '']] },
  { k: 'me.feel', q: a.sleepers === 'couple' ? 'Che sensazione preferisci tu?' : 'Che sensazione preferisci?', o: [['accogliente', 'Più accogliente', 'Ti piace sentire il materasso che ti avvolge'], ['equilibrato', 'Equilibrata', 'Una via di mezzo'], ['sostenuto', 'Più sostenuta', 'Ti piace un piano deciso']] },
  ...(a.sleepers === 'couple'
    ? [
        { k: 'partner.weight', q: "Fascia di peso dell'altra persona", o: [['lt60', 'Meno di 60 kg', ''], ['60-85', '60–85 kg', ''], ['85-110', '85–110 kg', ''], ['gt110', 'Oltre 110 kg', '']] },
        { k: 'partner.feel', q: "E l'altra persona che sensazione preferisce?", o: [['accogliente', 'Più accogliente', ''], ['equilibrato', 'Equilibrata', ''], ['sostenuto', 'Più sostenuta', '']] },
        { k: 'partnerMotion', q: 'Ti dà fastidio sentire i movimenti di chi dorme accanto?', o: [['importante', 'Sì, molto', ''], ['poco', 'Non particolarmente', '']] },
      ]
    : []),
  { k: 'focus', q: 'Dove vuoi sentire più comfort?', o: [['spalle', 'Su spalle e fianchi', 'Un piano che accoglie'], ['schiena', 'Sotto la schiena', 'Un sostegno che non cede'], ['equilibrio', 'Nessuna preferenza', '']] },
  { k: 'heat', q: 'Di notte senti caldo?', o: [['spesso', 'Spesso', ''], ['a-volte', 'A volte', ''], ['raramente', 'Raramente', '']] },
  { k: 'tech', q: 'Hai già una preferenza sulla tecnologia?', o: [['non-so', 'Non saprei', 'Va benissimo'], ['foam', 'Poliuretano', ''], ['memory', 'Memory Foam', ''], ['molle', 'Molle insacchettate', '']] },
  { k: 'removable', q: 'Ti serve il rivestimento sfoderabile?', o: [['true', 'Sì, è importante', ''], ['false', 'Non è decisivo', '']] },
];
const getK = (o, k) => k.split('.').reduce((a, x) => a?.[x], o);
function setK(o, k, v) {
  const parts = k.split('.');
  let cur = o;
  while (parts.length > 1) {
    const x = parts.shift();
    cur = cur[x] ??= {};
  }
  cur[parts[0]] = v;
}
function viewSleepMatch() {
  setMeta(VIEW_SEO[P.sleepMatch].metaTitle, VIEW_SEO[P.sleepMatch].description, [trail([{ name: 'Home', path: P.home }, { name: 'Sleep Match', path: P.sleepMatch }]).ld]);
  state.sm ??= { step: 0, a: { me: {} } };
  renderSM();
}
function renderSM(animate = false) {
  const sm = state.sm;
  const steps = SM_STEPS(sm.a);
  const done = sm.step >= steps.length;
  let inner;
  if (!done) {
    const s = steps[sm.step];
    const cur = getK(sm.a, s.k);
    inner = `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${sm.step}" aria-label="Avanzamento"><span style="width:${(sm.step / steps.length) * 100}%"></span></div>
      <p class="small muted">Domanda ${sm.step + 1} di ${steps.length}</p>
      <fieldset class="opts" style="display:block"><legend class="q-title" style="font:800 clamp(1.5rem,3vw,2.1rem)/1.15 var(--f-display);color:var(--deep);margin-bottom:16px">${esc(s.q)}</legend>
      <div class="opts" style="margin:0">${s.o
        .map(([v, l, d], i) => `<div><input type="radio" name="sm" id="sm${i}" value="${v}" data-act="sm-pick" data-k="${s.k}" ${String(cur) === v ? 'checked' : ''}><label for="sm${i}"><strong>${esc(l)}</strong>${d ? `<span>${esc(d)}</span>` : ''}</label></div>`)
        .join('')}</div></fieldset>
      <div class="btn-row">${sm.step > 0 ? '<button class="btn btn--ghost" data-act="sm-back">Indietro</button>' : ''}<button class="btn btn--primary" data-act="sm-next" ${cur === undefined ? 'disabled' : ''}>${sm.step === steps.length - 1 ? 'Vedi il risultato' : 'Avanti'}</button></div>`;
  } else {
    const a = { ...sm.a, removable: sm.a.removable === 'true' || sm.a.removable === true };
    if (a.sleepers !== 'couple') delete a.partner;
    const idx = pub();
    const r = sleepMatch(idx, a);
    if (!r) inner = `<div class="empty"><h3>Al momento non possiamo proporti un modello</h3><p>Non ci sono materassi acquistabili online. Scrivici e ti consigliamo noi.</p><a class="btn btn--ghost" href="${u(P.showroom)}">Contatti e showroom</a></div>`;
    else {
      state.sel[r.product.id] = { ...(state.sel[r.product.id] ?? {}), height: r.height };
      state.smProduct = r.product.id;
      inner = `<p class="small muted">Il tuo risultato</p><div class="result">
        <div class="result__img">${coverHtml(idx, r.product, { sizes: '(max-width:860px) 92vw, 40vw', eager: true })}</div>
        <div><span class="buy__tech">${esc(r.product.technical_name)}</span><h2>${esc(r.product.name)}</h2>
          <ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          ${r.heightReason ? `<p class="note">${esc(r.heightReason)}</p>` : ''}
          <p>${priceFrom(idx, r.product, r.height ?? null)} <span class="small muted">IVA inclusa${r.height ? `, H${r.height}` : ''}</span></p>
          <div class="btn-row"><a class="btn btn--primary" href="${href.product(r.product)}">Configura il tuo materasso</a><button class="btn btn--ghost" data-act="sm-restart">Ricomincia</button></div>
          <div id="sm-bed">${smBedHtml(idx, r.product, r.height)}</div>
          <p class="small muted" style="margin-top:14px">È un'indicazione basata sulle tue risposte e sulle caratteristiche dei nostri modelli, non un parere medico. Le risposte non vengono salvate.</p></div></div>`;
    }
  }
  const html = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Sleep Match' }], 'Sleep Match', 'Rispondi a qualche domanda: ti proponiamo un solo materasso, con il perché.')}<div class="wrap section--tight"><div class="quiz" id="quiz">${inner}</div></div>`;
  if (animate && $('#quiz')) {
    swap($('#quiz'), inner);
    $('#quiz input, #quiz h2, #quiz button')?.focus({ preventScroll: true });
  } else app.innerHTML = html;
}

// ---------------------------------------------------------------- CONFRONTO
function viewCompare() {
  const idx = pub();
  const all = idx.publicProducts('materasso');
  if (state.compare.size === 0) all.slice(0, 3).forEach((p) => state.compare.add(p.id));
  const chosen = all.filter((p) => state.compare.has(p.id)).slice(0, 3);
  setMeta(VIEW_SEO[P.compare].metaTitle, VIEW_SEO[P.compare].description, [trail([{ name: 'Home', path: P.home }, { name: 'Confronta i materassi', path: P.compare }]).ld]);
  const yes = (b) => (b === true ? 'Sì' : b === false ? 'No' : '—');
  const rows = [
    ['Tecnologia', (p) => esc(p.technical_name)],
    ['Composizione', (p) => esc(p.composition)],
    ['Prezzo', (p) => `da <strong>${formatCents(idx.minPrice(p))}</strong>`],
    ['Altezze acquistabili', (p) => idx.purchasableHeights(p).map((h) => 'H' + h).join(', ')],
    ['Sfoderabile', (p) => yes(p.removable_cover)],
    ['Lato estivo e invernale', (p) => yes(!!p.summer_winter)],
    ['Fascia 3D traspirante', (p) => yes(!!p.match?.ventilation)],
    ['Molle indipendenti', (p) => yes(!!p.match?.independent_springs)],
    ['Rigidità indicativa', (p) => esc(p.firmness_display ?? '—')],
    ['', (p) => `<a class="btn btn--ghost btn--sm" href="${href.product(p)}">Vai alla scheda</a>`],
  ];
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Confronto' }], 'Confronta i materassi', 'Solo dati confermati dalla fabbrica, senza punteggi. Scegli fino a tre modelli.')}
  <div class="wrap" style="padding-top:28px">
    <div class="chips" role="group" aria-label="Modelli da confrontare" style="margin-bottom:20px">${all
      .map((p) => `<button class="chip" data-act="cmp-toggle" data-id="${esc(p.id)}" aria-pressed="${state.compare.has(p.id)}">${esc(p.name.replace('Vesuvio ', ''))}</button>`)
      .join('')}</div>
    ${chosen.length < 2 ? '<div class="empty"><p>Seleziona almeno due modelli per vedere il confronto.</p></div>' : `<div class="cmp" style="--n:${chosen.length}" role="table" aria-label="Confronto materassi">
      <div class="cmp__row cmp__row--head" role="row"><div class="k" role="columnheader"><span class="sr-only">Caratteristica</span></div>${chosen.map((p) => `<div role="columnheader">${esc(p.name.replace('Vesuvio ', ''))}</div>`).join('')}</div>
      ${rows.map(([k, f]) => `<div class="cmp__row" role="row">${k ? `<div class="k" role="rowheader">${esc(k)}</div>` : '<div class="k" role="rowheader"><span class="sr-only">Scheda</span></div>'}${chosen.map((p) => `<div role="cell">${f(p)}</div>`).join('')}</div>`).join('')}
    </div>`}
    <p class="small muted" style="margin-top:14px">La rigidità è un'indicazione da verificare provando il materasso in showroom.</p>
  </div>`;
}
function showCompareBar() {
  const n = state.compare.size;
  const bar = document.createElement('div');
  bar.className = 'compare-bar';
  bar.innerHTML = `<span>${n} ${n === 1 ? 'modello' : 'modelli'} da confrontare</span><a class="btn btn--sm" href="${u(P.compare)}">Confronta</a><button class="icon-btn" style="color:#fff" data-act="cmp-clear" aria-label="Svuota il confronto">${icon('close', 18)}</button>`;
  document.body.append(bar);
}

// ---------------------------------------------------------------- MISURE
const SIZE_NAMES = {
  '80x190': 'Singolo',
  '80x200': 'Singolo lungo',
  '90x190': 'Singolo largo',
  '90x200': 'Singolo largo, lungo',
  '120x190': 'Una piazza e mezza',
  '120x200': 'Una piazza e mezza, lungo',
  '140x190': 'Francese',
  '140x200': 'Francese lungo',
  '160x190': 'Matrimoniale',
  '160x200': 'Matrimoniale lungo',
  '165x190': 'Matrimoniale',
  '170x200': 'Matrimoniale grande',
  '180x200': 'King Size',
};
function sizesSvg(a, b) {
  const A = parseSize(a);
  const B = parseSize(b);
  const W = Math.max(A.w, B.w);
  const L = Math.max(A.l, B.l);
  const pad = 46;
  const vw = W + pad * 2;
  const vh = L + pad * 2;
  const rect = (s, c, stroke, dash) =>
    `<rect x="${pad}" y="${pad + (L - s.l)}" width="${s.w}" height="${s.l}" rx="6" fill="${c}" stroke="${stroke}" stroke-width="2.5" ${dash ? 'stroke-dasharray="8 6"' : ''}/>`;
  const big = A.w * A.l >= B.w * B.l ? [A, B, a, b] : [B, A, b, a];
  return `<svg viewBox="0 0 ${vw} ${vh}" role="img" aria-label="Confronto in scala tra ${formatSize(a)} e ${formatSize(b)} centimetri">
    ${rect(big[0], 'rgba(32,103,134,.12)', '#206786')}${rect(big[1], 'rgba(200,120,91,.16)', '#9a4f33', true)}
    <g font-family="Manrope, sans-serif" font-weight="700" fill="#0e3444" font-size="22">
      <text x="${pad + W / 2}" y="${pad - 14}" text-anchor="middle">${W} cm</text>
      <text x="${pad - 14}" y="${pad + L / 2}" text-anchor="middle" transform="rotate(-90 ${pad - 14} ${pad + L / 2})">${L} cm</text>
    </g></svg>`;
}
function viewSizes() {
  setMeta(VIEW_SEO[P.sizes].metaTitle, VIEW_SEO[P.sizes].description, [trail([{ name: 'Home', path: P.home }, { name: 'Misure dei materassi', path: P.sizes }]).ld]);
  const [a, b] = state.sizes;
  const opt = (sel) => STANDARD_SIZES.map((s) => `<option value="${s}" ${s === sel ? 'selected' : ''}>${formatSize(s)} – ${SIZE_NAMES[s]}</option>`).join('');
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Guida alle misure' }], 'Misure dei materassi', "Le 13 misure standard e il confronto in scala, vista dall'alto. La selezione resta quando torni alla scheda.")}
  <div class="wrap two-col" style="padding-top:28px">
    <div class="sizes-fig">
      <div class="row-2" style="margin-bottom:12px">
        <div class="field"><label for="sz-a">Prima misura</label><select id="sz-a" data-act="size-a">${opt(a)}</select></div>
        <div class="field"><label for="sz-b">Seconda misura</label><select id="sz-b" data-act="size-b">${opt(b)}</select></div>
      </div>
      <div id="sizes-svg">${sizesSvg(a, b)}</div>
      <div class="size-legend"><span style="--c:rgba(32,103,134,.12);--b:#206786">${formatSize(parseSize(a).w * parseSize(a).l >= parseSize(b).w * parseSize(b).l ? a : b)}</span><span style="--c:rgba(200,120,91,.16);--b:#9a4f33">${formatSize(parseSize(a).w * parseSize(a).l >= parseSize(b).w * parseSize(b).l ? b : a)}</span></div>
      <p class="small muted" style="margin:10px 0 0">Differenza: ${Math.abs(parseSize(a).w - parseSize(b).w)} cm in larghezza, ${Math.abs(parseSize(a).l - parseSize(b).l)} cm in lunghezza.</p>
    </div>
    <div><table class="size-table"><thead><tr><th>Misura (cm)</th><th>Formato</th></tr></thead><tbody>${STANDARD_SIZES.map((s) => `<tr><td><strong>${formatSize(s)}</strong></td><td>${SIZE_NAMES[s]}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:18px">Il materasso va scelto sulla misura interna del letto o della rete. Se non corrisponde a una misura standard, <a href="${u(P.quote)}">chiedi un preventivo fuori misura</a>.</p></div>
  </div>
  <div class="wrap"><section class="seo-text prose">
    <h2>Come misurare il letto</h2>
    <p>Misura <strong>l'interno</strong> del letto o della rete, da sponda a sponda, in larghezza e in lunghezza: è lì che va il materasso. Le misure esterne della struttura non contano. Se le due misure non coincidono con una misura standard, il materasso si fa su misura.</p>
    <h2>Singolo, piazza e mezza, francese, matrimoniale</h2>
    <p>Il <strong>singolo</strong> è largo 80 o 90 cm; la <strong>piazza e mezza</strong> 120 cm; il <strong>francese</strong> 140 cm, comodo per una persona e possibile per due; il <strong>matrimoniale</strong> 160 o 165 cm; il <strong>170×200</strong> e il <strong>King Size 180×200</strong> danno più spazio a chi dorme in due. Ogni larghezza esiste in lunghezza 190 o 200 cm: per chi supera 1,80 m conviene la lunghezza 200.</p>
    <h2>Rete e topper della stessa misura</h2>
    <p>Le nostre <a href="${u('/reti/')}">reti a doghe</a> e il <a href="${u('/topper/')}">topper in Memory Foam</a> esistono nelle stesse 13 misure dei materassi. Per scegliere il modello, leggi la guida <a href="${u('/guide/come-scegliere-il-materasso/')}">Come scegliere il materasso</a>.</p>
  </section></div>`;
}

// ---------------------------------------------------------------- FUORI MISURA
function viewQuote(query = {}) {
  const idx = pub();
  const hotel = query.hotel === '1';
  setMeta(VIEW_SEO[P.quote].metaTitle, VIEW_SEO[P.quote].description, [trail([{ name: 'Home', path: P.home }, { name: 'Materassi su misura', path: P.quote }]).ld]);
  const prods = [...idx.publicProducts('materasso'), ...idx.publicProducts('rete'), ...idx.publicProducts('topper')];
  const pre = state.quoteFor && prods.find((p) => p.id === state.quoteFor);
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Materassi su misura' }], 'Materassi su misura e altezze personalizzate', 'Indica prodotto e misure. Ti mandiamo il prezzo su WhatsApp: niente pagamento online, la conferma avviene con noi.')}
  <div class="wrap two-col" style="padding-top:28px">
    <form class="form" id="quote-form" novalidate>
      <div class="field"><label for="q-prod">Prodotto</label><select id="q-prod" name="product" required>${prods.map((p) => `<option value="${esc(p.id)}" ${pre?.id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="altro">Altro / non so ancora</option></select></div>
      <div class="row-2">
        <div class="field"><label for="q-w">Larghezza (cm)</label><input class="input" id="q-w" name="w" inputmode="numeric" required></div>
        <div class="field"><label for="q-l">Lunghezza (cm)</label><input class="input" id="q-l" name="l" inputmode="numeric" required></div>
        <div class="field"><label for="q-h">Altezza (cm)</label><input class="input" id="q-h" name="h" inputmode="numeric" placeholder="Facoltativa"></div>
      </div>
      <label class="check"><input type="checkbox" name="b2b" id="q-b2b" ${hotel ? 'checked' : ''}> È per un hotel, un B&amp;B o una struttura ricettiva</label>
      <div class="row-2" id="b2b-fields" ${hotel ? '' : 'hidden'}>
        <div class="field"><label for="q-rooms">Camere o posti letto</label><input class="input" id="q-rooms" name="rooms" inputmode="numeric"></div>
        <div class="field"><label for="q-qty">Quantità di materassi</label><input class="input" id="q-qty" name="qty" inputmode="numeric"></div>
      </div>
      <div class="field"><label for="q-notes">Note</label><textarea class="textarea" id="q-notes" name="notes" maxlength="500" aria-describedby="q-notes-h"></textarea><span class="hint" id="q-notes-h">Forma particolare, angoli smussati, scadenze. Non inserire indirizzi o altri dati personali: li concorderemo su WhatsApp.</span></div>
      <div id="q-err" class="err-msg" role="alert"></div>
      <div><button class="btn btn--primary" type="submit">Prepara la richiesta</button></div>
    </form>
    <div id="quote-out"><div class="note"><strong>Come funziona</strong><ol style="margin:8px 0 0;padding-left:18px"><li>Prepari la richiesta qui.</li><li>La invii su WhatsApp, oppure copi il testo.</li><li>Ti rispondiamo con prezzo e tempi.</li><li>Confermi con noi su WhatsApp.</li></ol></div></div>
  </div>`;
  state.quoteFor = null;
}

/** Chiusura del Sleep Match: il materasso consigliato con la rete, nella misura scelta. */
function smBedHtml(idx, p, height) {
  const cfg = offerCfg(idx);
  if (!cfg || !p.bundle_family) return '';
  const sizes = idx.purchasableVariants(p).filter((v) => height == null || v.height_cm === height).map((v) => v.size);
  const common = ['80x190', '90x200', '160x190', '180x200'].filter((z) => sizes.includes(z));
  state.smSize = sizes.includes(state.smSize) ? state.smSize : sizes.includes('160x190') ? '160x190' : sizes[0];
  const size = state.smSize;
  const mv = idx.purchasableVariants(p).find((v) => v.size === size && (height == null || v.height_cm === height));
  const rete = idx.publicProducts('rete').map((x) => ({ p: x, v: idx.cheapestAtSize(x, size) })).filter((x) => x.v).sort((a, b) => a.v.price_cents - b.v.price_cents)[0];
  if (!mv || !rete) return '';
  const pr = priceCart(idx, [{ variant_id: mv.id, qty: 1 }, { variant_id: rete.v.id, qty: 1 }], cfg);
  const opts = common.includes(size) ? common : [size, ...common];
  return `<div class="smbed">
    <div class="smbed__head"><h3>Il tuo letto completo</h3>${saveTag(pr.discount_cents)}</div>
    <p class="small">${esc(shortName(p))}${mv.height_cm ? ' H' + mv.height_cm : ''} con la ${esc(shortName(rete.p))}, nella stessa misura.</p>
    <div class="chips" role="group" aria-label="Misura">${opts.map((z) => `<button type="button" class="chip" data-act="sm-size" data-v="${z}" aria-pressed="${z === size}">${formatSize(z)}</button>`).join('')}</div>
    ${togetherHtml(pr, { size })}
    <button class="btn btn--accent" data-act="add-bed" data-m="${esc(mv.id)}" data-r="${esc(rete.v.id)}" data-q="1">Aggiungi il letto completo</button>
  </div>`;
}

function waBlock(plan, ref, kind) {
  const wa = whatsappStatus();
  return `<div class="form">
    ${plan.url
      ? `<a class="btn btn--wa" href="${esc(plan.url)}" target="_blank" rel="noopener" data-act="wa-open" data-ref="${esc(ref)}">${icon('wa', 20)} Invia la richiesta su WhatsApp</a>`
      : `<div class="note" role="status">Copia il riepilogo e invialo a Vesuvio Sleep: ti confermiamo disponibilità e consegna.</div>`}
    <button class="btn btn--ghost" data-act="copy-summary" data-ref="${esc(ref)}">${icon('copy', 20)} Copia il riepilogo</button>
    <textarea class="textarea" id="copy-fallback" hidden readonly aria-label="Riepilogo da copiare"></textarea>
    ${plan.short ? `<p class="small muted">Il carrello è lungo: su WhatsApp si apre un messaggio breve con il riferimento ${esc(ref)}. Incolla sotto il riepilogo completo che hai copiato.</p>` : ''}
    <p class="small muted">${kind === 'quote' ? 'Ti risponderemo con prezzo e tempi.' : 'Aprire WhatsApp non conferma l\'ordine: la conferma arriva da Vesuvio Sleep su WhatsApp, dopo aver verificato disponibilità e consegna.'} Puoi modificare il messaggio prima di inviarlo.</p>
  </div>`;
}

// ---------------------------------------------------------------- OFFERTE ABBINATE
// Letto completo e vetrine (bundle). Il calcolo è in core/offers.ts, identico alla funzione
// SQL price_cart: qui si mostra soltanto. Il prezzo vero lo ricalcola il database quando la
// richiesta viene creata. Nessun prezzo barrato: il confronto è sempre con la somma dei
// prezzi correnti dei singoli pezzi ("separati"), mai con un prezzo precedente.
const offerCfg = (idx) => catalogOfferConfig(idx);
const offersOn = (idx) => !!offerCfg(idx) && publicBundles(idx).length > 0;
const bundlePath = (b) => `${P.offers}${b.slug}/`;
const bundleBySlug = (idx, slug) => (idx.snap.bundles ?? []).find((b) => b.slug === slug && (b.status === 'published' || previewDrafts()));
const shortName = (p) => p.name.replace(/^Vesuvio /, '');

/** L'etichetta del risparmio: un'etichetta cucita, come quella sul bordo del materasso. */
function saveTag(cents, { lg = false, label = 'Risparmi' } = {}) {
  if (!cents) return '';
  return `<span class="stitch-tag${lg ? ' stitch-tag--lg' : ''}"><small>${esc(label)}</small><b>${formatCents(cents)}</b></span>`;
}
/** Separati / insieme: il confronto con la somma dei prezzi correnti dei pezzi. */
function togetherHtml(pr, { size = '', big = false } = {}) {
  if (!pr || !pr.subtotal_cents) return '';
  return `<div class="together${big ? ' together--big' : ''}">
    ${pr.discount_cents ? `<span class="together__sep">Separati <span>${formatCents(pr.subtotal_cents)}</span></span>` : ''}
    <span class="together__tot"><small>${pr.discount_cents ? 'Insieme' : 'Totale'}${size ? ', ' + formatSize(size) : ''}</small>${formatCents(pr.total_cents)}</span>
  </div>`;
}
/** Il letto composto: la rete sotto, il materasso appoggiato sopra, il topper come etichetta. */
function bedVisual(idx, lines, { sizes = '(max-width: 700px) 80vw, 30vw', eager = false } = {}) {
  const pick = (k) => lines.find((l) => l.kind === k && l.included !== false);
  const mat = pick('materasso')?.product;
  const pil = pick('guanciale');
  const rete = pick('rete')?.product;
  const top = pick('topper')?.product;
  // nel riquadro piccolo va il pezzo che conta di più: i guanciali, se ci sono, altrimenti la rete
  const inset = pil?.product ?? rete;
  const qty = (l) => l?.qty ?? l?.item?.qty ?? 1;
  const chips = [pil && rete ? shortName(rete) : null, top ? shortName(top) : null].filter(Boolean);
  return `<div class="bedvis${inset ? '' : ' bedvis--solo'}" aria-hidden="true">
    ${inset ? `<div class="bedvis__rete${pil ? ' bedvis__rete--pillow' : ''}">${coverHtml(idx, inset, { sizes, eager })}${pil && qty(pil) > 1 ? `<span class="bedvis__qty">× ${qty(pil)}</span>` : ''}</div>` : ''}
    ${mat ? `<div class="bedvis__mat">${coverHtml(idx, mat, { sizes, eager })}</div>` : ''}
    ${chips.length ? `<span class="bedvis__plus">+ ${chips.map(esc).join(' + ')}</span>` : ''}
  </div>`;
}
function bundleQuoteFor(idx, b) {
  const sizes = bundleSizes(idx, b);
  const size = sizes.includes(b.default_size) ? b.default_size : sizes[0];
  return size ? quoteBundle(idx, b, size, {}, offerCfg(idx)) : null;
}
/** Scheda speciale di un'offerta: si distingue dalle schede prodotto di proposito. */
function bundleCard(idx, b, { wide = false, d = 0 } = {}) {
  const q = bundleQuoteFor(idx, b);
  if (!q) return '';
  const inc = q.lines.filter((l) => l.included);
  const opt = q.lines.filter((l) => !l.included);
  const parts = inc.map((l) => `${l.item.qty > 1 ? l.item.qty + ' × ' : ''}${l.kind === 'guanciale' ? 'guanciali ' : ''}${shortName(l.product)}${l.kind === 'materasso' && l.variant?.height_cm ? ' H' + l.variant.height_cm : ''}`);
  return `<article class="bcard bcard--${esc(b.theme)}${wide ? ' bcard--wide' : ''} rv" style="--d:${d}" data-bundle="${esc(b.slug)}">
    <div class="bcard__vis">${bedVisual(idx, q.lines, { sizes: wide ? '(max-width: 860px) 92vw, 50vw' : '(max-width: 700px) 92vw, 30vw' })}${saveTag(q.price.discount_cents)}</div>
    <div class="bcard__body">
      ${b.badge ? `<span class="bcard__badge">${esc(b.badge)}</span>` : ''}
      <h3><a href="${u(bundlePath(b))}">${esc(b.name)}</a></h3>
      <p class="bcard__line">${esc(b.tagline)}</p>
      <p class="bcard__parts">${parts.map(esc).join(' <i>+</i> ')}${opt.length ? ` <span>· ${opt.map((l) => esc(shortName(l.product))).join(', ')} a scelta</span>` : ''}</p>
      <div class="bcard__foot">${togetherHtml(q.price, { size: q.size })}<span class="bcard__go">Componi ${icon('arrow', 18)}</span></div>
    </div>
  </article>`;
}
/** L'offerta più vicina a un filtro della categoria materassi (molle, memory, poliuretano). */
function bundleForTech(idx, tech) {
  const list = publicBundles(idx);
  if (tech && tech !== 'all') {
    const hit = list.find((b) => bundleMattress(idx, b)?.match?.tech === tech);
    if (hit) return hit;
  }
  return list[0];
}
/** Le regole spiegate a parole, con i numeri veri della configurazione. */
function rulesHtml(cfg) {
  if (!cfg) return '';
  const rows = [];
  if (cfg.set)
    rows.push(['Letto completo', `Materasso e rete della stessa misura nello stesso ordine: −${cfg.set.pct.foam} % con un materasso in schiuma (Eco, Memory), −${cfg.set.pct.pocket} % con un materasso a molle (Pocket), sul totale dei due. Arrotondato ai ${cfg.set.round_eur} €.`]);
  if (cfg.tiers.length)
    rows.push(['Più letti', cfg.tiers.map((t) => `da ${t.min_sets} letti completi −${t.pct} %`).join(', ') + ' su tutti i letti dell\'ordine. Dieci o più? Ti facciamo un preventivo.']);
  if (cfg.addon && cfg.addon.pct.guanciale) rows.push(['Guanciali', `Con ogni materasso, fino a ${cfg.addon.guanciali_per_materasso} guanciali costano il ${cfg.addon.pct.guanciale} % in meno, anche se non cambi la rete.`]);
  if (cfg.pillowPair?.pct) rows.push(['Coppia di guanciali', `Due guanciali uguali nello stesso ordine, anche senza materasso: −${cfg.pillowPair.pct} % sulla coppia.`]);
  if (cfg.addon && cfg.addon.pct.topper) rows.push(['Topper', `Il topper della stessa misura di un letto completo costa il ${cfg.addon.pct.topper} % in meno.`]);
  if (cfg.pair) rows.push(['Per due', `Due materassi uguali nello stesso ordine, anche senza rete: −${cfg.pair.pct.foam} % (schiuma) o −${cfg.pair.pct.pocket} % (molle) sui due.`]);
  rows.push(['Regole', `Su ogni articolo vale un solo vantaggio. Lo sconto complessivo di un carrello non supera il ${cfg.cap_pct} %. Il vantaggio si vede nel carrello e nel riepilogo, e viene ricontrollato quando invii la richiesta.`]);
  rows.push(['Se restituisci una parte', 'Il vantaggio è diviso tra i pezzi in proporzione al prezzo. Se eserciti il recesso su un pezzo ti rimborsiamo quanto hai pagato per quel pezzo; sui pezzi che tieni il vantaggio resta tuo.']);
  return `<dl class="rules">${rows.map(([k, v]) => `<div class="rv"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}
function bundlesSectionHtml(idx, { title = 'Letti completi', lead = '', id = 'bundles-t', limit = 0 } = {}) {
  if (!offersOn(idx)) return '';
  let list = publicBundles(idx);
  if (limit) list = list.slice(0, limit);
  return `<section class="section bundles" aria-labelledby="${id}"><div class="wrap">
    <div class="sec-head rv"><div><h2 id="${id}">${esc(title)}</h2>${lead ? `<p>${esc(lead)}</p>` : ''}</div>
      <a class="btn btn--ghost btn--sm" href="${u(P.offers)}">Tutti i letti completi</a></div>
    <div class="bgrid">${list.map((b, i) => bundleCard(idx, b, { wide: i === 0, d: i })).join('')}</div>
  </div></section>`;
}

// ---------- pagina /offerte/: vetrine, Componi il tuo letto, regole
function builderState(idx) {
  const mats = idx.publicProducts('materasso').filter((p) => p.bundle_family);
  const b = (state.builder ??= { size: '160x190', model: null, height: null, rete: null, topper: false, beds: 1, pillow: null });
  if (!mats.some((p) => p.id === b.model)) b.model = mats.find((p) => p.slug === 'memory-duo')?.id ?? mats[0]?.id ?? null;
  const mat = b.model && idx.products.get(b.model);
  if (mat) {
    const sizes = idx.purchasableSizes(mat);
    if (!sizes.includes(b.size)) b.size = sizes.includes('160x190') ? '160x190' : sizes[0];
    const hs = idx.purchasableVariants(mat).filter((v) => v.size === b.size).map((v) => v.height_cm);
    if (!hs.includes(b.height)) b.height = hs.includes(25) ? 25 : hs[0] ?? null;
  }
  const reti = idx.publicProducts('rete').map((p) => ({ p, v: idx.cheapestAtSize(p, b.size) })).filter((x) => x.v);
  if (b.rete !== 'none' && !reti.some((r) => r.p.id === b.rete)) b.rete = reti[0]?.p.id ?? 'none';
  b.beds = Math.max(1, Math.min(9, b.beds));
  return { b, mats, mat, reti };
}
function builderLines(idx) {
  const { b, mat, reti } = builderState(idx);
  const lines = [];
  const mv = mat && idx.purchasableVariants(mat).find((v) => v.size === b.size && v.height_cm === b.height);
  if (mv) lines.push({ kind: 'materasso', product: mat, variant: mv, qty: b.beds });
  const r = reti.find((x) => x.p.id === b.rete);
  if (r) lines.push({ kind: 'rete', product: r.p, variant: r.v, qty: b.beds });
  if (b.topper) {
    const tp = idx.publicProducts('topper')[0];
    const tv = tp && idx.cheapestAtSize(tp, b.size);
    if (tv) lines.push({ kind: 'topper', product: tp, variant: tv, qty: b.beds });
  }
  const pil = pillowOptions(idx, offerCfg(idx)).find((x) => x.p.id === b.pillow);
  if (pil) lines.push({ kind: 'guanciale', product: pil.p, variant: pil.v, qty: 2 * b.beds });
  return lines;
}
function builderHtml(idx) {
  const { b, mats, mat, reti } = builderState(idx);
  if (!mat) return '';
  const sizes = idx.purchasableSizes(mat);
  const heights = idx.purchasableVariants(mat).filter((v) => v.size === b.size).map((v) => v.height_cm).sort((x, y) => x - y);
  const lines = builderLines(idx);
  const pr = priceCart(idx, lines.map((l) => ({ variant_id: l.variant.id, qty: l.qty })), offerCfg(idx));
  const tp = idx.publicProducts('topper')[0];
  const tv = tp && idx.cheapestAtSize(tp, b.size);
  const quoteFrom = offerCfg(idx)?.tiers.length ? 10 : 0;
  const hasPil = pillowOptions(idx, offerCfg(idx)).length > 0;
  return `<div class="builder__grid">
    <div class="builder__steps">
      <fieldset class="opt"><legend><span class="builder__n">1</span> Misura</legend><div class="seg">${sizes
        .map((s) => `<input type="radio" name="bd-size" id="bd-s${s}" value="${s}" data-act="bd" data-k="size" ${b.size === s ? 'checked' : ''}><label for="bd-s${s}">${formatSize(s)}</label>`)
        .join('')}</div></fieldset>
      <fieldset class="opt"><legend><span class="builder__n">2</span> Materasso</legend><div class="bd-models">${mats
        .map((p) => {
          const v = idx.purchasableVariants(p).filter((x) => x.size === b.size).sort((x, y) => x.price_cents - y.price_cents)[0];
          return `<div><input type="radio" name="bd-model" id="bd-m${p.id}" value="${p.id}" data-act="bd" data-k="model" ${b.model === p.id ? 'checked' : ''} ${v ? '' : 'disabled'}><label for="bd-m${p.id}"><strong>${esc(shortName(p))}</strong><span>${esc(p.technical_name)}</span><em>${v ? `da ${formatCents(v.price_cents)}` : 'non in questa misura'}</em></label></div>`;
        })
        .join('')}</div>
        ${heights.length > 1 ? `<div class="seg seg--h" role="group" aria-label="Altezza">${heights.map((h) => `<input type="radio" name="bd-h" id="bd-h${h}" value="${h}" data-act="bd" data-k="height" ${b.height === h ? 'checked' : ''}><label for="bd-h${h}">H${h}</label>`).join('')}</div>` : ''}
      </fieldset>
      ${(() => {
        const pills = pillowOptions(idx, offerCfg(idx));
        if (!pills.length) return '';
        return `<fieldset class="opt"><legend><span class="builder__n">3</span> Guanciali</legend><div class="bd-models bd-models--row">
          ${pills.map((x) => `<div><input type="radio" name="bd-pil" id="bd-p${x.p.id}" value="${x.p.id}" data-act="bd" data-k="pillow" ${b.pillow === x.p.id ? 'checked' : ''}><label for="bd-p${x.p.id}"><strong>2 × ${esc(shortName(x.p))}</strong><em>${formatCents(x.v.price_cents)} l'uno</em></label></div>`).join('')}
          <div><input type="radio" name="bd-pil" id="bd-pnone" value="none" data-act="bd" data-k="pillow" ${!pills.some((x) => x.p.id === b.pillow) ? 'checked' : ''}><label for="bd-pnone"><strong>Niente guanciali</strong><em>li ho già</em></label></div>
        </div></fieldset>`;
      })()}
      <fieldset class="opt"><legend><span class="builder__n">${hasPil ? 4 : 3}</span> Rete</legend><div class="bd-models bd-models--row">
        ${reti.map((r) => `<div><input type="radio" name="bd-rete" id="bd-r${r.p.id}" value="${r.p.id}" data-act="bd" data-k="rete" ${b.rete === r.p.id ? 'checked' : ''}><label for="bd-r${r.p.id}"><strong>${esc(shortName(r.p))}</strong><em>${formatCents(r.v.price_cents)}</em></label></div>`).join('')}
        <div><input type="radio" name="bd-rete" id="bd-rnone" value="none" data-act="bd" data-k="rete" ${b.rete === 'none' ? 'checked' : ''}><label for="bd-rnone"><strong>Ho già la rete</strong><em>solo materasso</em></label></div>
      </div></fieldset>
      <fieldset class="opt"><legend><span class="builder__n">${hasPil ? 5 : 4}</span> Completa</legend>
        ${tv ? `<label class="check-row"><input type="checkbox" data-act="bd" data-k="topper" ${b.topper ? 'checked' : ''}> <span><strong>${esc(tp.name)}</strong> ${formatSize(b.size)}, ${formatCents(tv.price_cents)}${offerCfg(idx)?.addon ? ` <small>· −${offerCfg(idx).addon.pct.topper} % con il letto completo</small>` : ''}</span></label>` : ''}
        <div class="bd-beds"><span>Quanti letti?</span><div class="qty" role="group" aria-label="Numero di letti"><button type="button" data-act="bd-beds" data-d="-1" aria-label="Un letto in meno">${icon('minus', 18)}</button><output aria-live="polite">${b.beds}</output><button type="button" data-act="bd-beds" data-d="1" aria-label="Un letto in più" ${b.beds >= 9 ? 'disabled' : ''}>${icon('plus', 18)}</button></div>
        ${quoteFrom ? `<small>Da ${quoteFrom} letti in su: <a href="${u(P.quote)}">preventivo per strutture</a></small>` : ''}</div>
      </fieldset>
    </div>
    <aside class="builder__sum" aria-live="polite">
      ${bedVisual(idx, lines)}
      <ul class="builder__lines">${lines.map((l) => `<li><span>${l.qty > 1 ? l.qty + ' × ' : ''}${esc(shortName(l.product))}${l.kind === 'materasso' ? ' H' + l.variant.height_cm : ''}</span><span>${formatCents(l.variant.price_cents * l.qty)}</span></li>`).join('')}
        ${pr.offers.map((o) => `<li class="is-save"><span>${esc(o.label)}${o.count > 1 ? ` × ${o.count}` : ''} (${o.pct} %)</span><span>−${formatCents(o.amount_cents)}</span></li>`).join('')}</ul>
      ${togetherHtml(pr, { size: b.size, big: true })}
      ${saveTag(pr.discount_cents, { lg: true })}
      ${!pr.discount_cents && b.rete === 'none' ? '<p class="small muted">Aggiungi la rete della stessa misura per il vantaggio del letto completo.</p>' : ''}
      <button class="btn btn--primary" style="width:100%" data-act="bd-add" ${lines.length ? '' : 'disabled'}>Aggiungi ${b.beds > 1 ? `i ${b.beds} letti` : lines.length > 1 ? 'il letto completo' : 'il materasso'} al carrello</button>
      <p class="small muted">Prezzi IVA inclusa. Il vantaggio viene ricontrollato quando invii la richiesta su WhatsApp.</p>
    </aside>
  </div>`;
}
function viewOffers() {
  const idx = pub();
  if (!offersOn(idx)) return viewNotFound();
  const tr = trail([{ name: 'Home', path: P.home }, { name: 'Letti completi', path: P.offers }]);
  setMeta(VIEW_SEO[P.offers].metaTitle, VIEW_SEO[P.offers].description, [tr.ld], { path: P.offers });
  const list = publicBundles(idx);
  app.innerHTML = `${pageHero(tr.ui, 'Letti completi', 'Materasso e rete della stessa misura, prodotti nella stessa fabbrica: insieme costano meno. Scegli un letto già composto o componi il tuo.')}
  <section class="section"><div class="wrap">
    <div class="bgrid">${list.map((b, i) => bundleCard(idx, b, { wide: i === 0, d: i })).join('')}</div>
  </div></section>
  <section class="section builder" id="componi" aria-labelledby="bd-t"><div class="wrap">
    <div class="sec-head rv"><div><h2 id="bd-t">Componi il tuo letto</h2><p>Scegli la misura una volta sola: materasso, rete e topper si adeguano, e il vantaggio si calcola mentre scegli.</p></div></div>
    <div id="builder">${builderHtml(idx)}</div>
  </div></section>
  <section class="section--tight"><div class="wrap narrow">
    <h2 class="rv">Come funzionano i vantaggi</h2>
    ${rulesHtml(offerCfg(idx))}
    <p class="small muted">Condizioni complete nelle <a href="${u(P.terms)}">condizioni di vendita</a>. Per hotel, B&amp;B e case vacanza: <a href="${u(P.b2b)}">forniture per strutture</a>.</p>
  </div></section>`;
}

// ---------- pagina di una vetrina /offerte/<slug>/
function bundleSel(idx, b) {
  const s = (state.bsel ??= {})[b.id] ?? (state.bsel[b.id] = { size: null, height: null, optional: new Set() });
  const sizes = bundleSizes(idx, b);
  if (!sizes.includes(s.size)) s.size = sizes.includes(b.default_size) ? b.default_size : sizes[0];
  return s;
}
function viewBundle(slug) {
  const idx = pub();
  const b = bundleBySlug(idx, slug);
  if (!b || !offerCfg(idx) || !bundleSizes(idx, b).length) return viewNotFound();
  const mat = bundleMattress(idx, b);
  const tr = trail([{ name: 'Home', path: P.home }, { name: 'Letti completi', path: P.offers }, { name: b.name, path: bundlePath(b) }]);
  const q = bundleQuoteFor(idx, b);
  const parts = q.lines.filter((l) => l.included).map((l) => shortName(l.product)).join(' + ');
  // descrizione entro i 160 caratteri: i pezzi, il vantaggio, la fabbrica
  setMeta(b.seo_title || `${b.name}: ${parts}`, b.seo_description || `${parts} nella stessa misura: insieme costano meno che separati. Prodotti a Casoria, spedizione gratuita, paghi alla consegna.`, [tr.ld], {
    image: (() => {
      const m = mat && coverFor(idx, mat);
      return m ? media.resolve(m) : undefined;
    })(),
    path: bundlePath(b),
  });
  const others = publicBundles(idx).filter((x) => x.id !== b.id);
  app.innerHTML = `${crumbs(tr.ui)}
  <div class="wrap bpage bpage--${esc(b.theme)}">
    <div class="bpage__vis" id="bvis"></div>
    <div class="bpage__buy" id="bbuy"></div>
  </div>
  <section class="section--tight"><div class="wrap">
    <h2 class="pdp-h2 rv">Che cosa c'è nel ${esc(b.name)}</h2>
    <div class="bparts">${bundleItemsOf(idx, b).map((it, i) => {
      const p = idx.products.get(it.product_id);
      if (!p) return '';
      return `<article class="bpart rv" style="--d:${i}"><div class="bpart__img">${coverHtml(idx, p, { sizes: '(max-width: 700px) 40vw, 260px' })}</div><div><span class="card__tech">${esc(p.technical_name)}</span><h3><a href="${href.product(p)}">${esc(p.name)}</a>${it.optional ? ' <small>a scelta</small>' : ''}</h3><p class="small">${esc(p.short)}</p></div></article>`;
    }).join('')}</div>
  </div></section>
  <section class="section--tight"><div class="wrap narrow"><h2 class="rv">Come funziona il vantaggio</h2>${rulesHtml(offerCfg(idx))}</div></section>
  ${others.length ? `<section class="section bundles" aria-labelledby="oth-t"><div class="wrap"><div class="sec-head rv"><div><h2 id="oth-t">Altri letti completi</h2></div><a class="btn btn--ghost btn--sm" href="${u(P.offers + '#componi')}">Componi il tuo letto</a></div><div class="bgrid bgrid--row">${others.map((x, i) => bundleCard(idx, x, { d: i })).join('')}</div></div></section>` : ''}`;
  renderBundleBuy(idx, b);
}
function renderBundleBuy(idx, b) {
  const s = bundleSel(idx, b);
  const mat = bundleMattress(idx, b);
  const heights = mat ? idx.purchasableVariants(mat).filter((v) => v.size === s.size).map((v) => v.height_cm).sort((x, y) => x - y) : [];
  const q = quoteBundle(idx, b, s.size, { height: s.height, optional: s.optional }, offerCfg(idx));
  if (!q.available && s.height != null) {
    s.height = null;
    return renderBundleBuy(idx, b);
  }
  const vis = $('#bvis');
  if (vis) vis.innerHTML = `${bedVisual(idx, q.lines, { sizes: '(max-width: 900px) 92vw, 52vw', eager: true })}${saveTag(q.price.discount_cents, { lg: true })}`;
  $('#bbuy').innerHTML = `
    ${b.badge ? `<span class="bcard__badge">${esc(b.badge)}</span>` : ''}
    <h1>${esc(b.name)}</h1>
    <p class="bpage__lead">${esc(b.tagline)}</p>
    <fieldset class="opt"><legend>Misura${SIZE_NAMES[s.size] ? ` <span class="opt__hint">${esc(SIZE_NAMES[s.size])}</span>` : ''}</legend><div class="seg">${bundleSizes(idx, b)
      .map((z) => `<input type="radio" name="b-size" id="b-s${z}" value="${z}" data-act="b-size" ${s.size === z ? 'checked' : ''}><label for="b-s${z}">${formatSize(z)}</label>`)
      .join('')}</div></fieldset>
    ${heights.length > 1 ? `<fieldset class="opt"><legend>Altezza del materasso</legend><div class="seg seg--h">${heights
      .map((h) => `<input type="radio" name="b-h" id="b-h${h}" value="${h}" data-act="b-height" ${q.height === h ? 'checked' : ''}><label for="b-h${h}">H${h}</label>`)
      .join('')}</div></fieldset>` : ''}
    <ul class="bline-list">${q.lines
      .map((l) => {
        const spec = [l.variant?.size ? formatSize(l.variant.size) : '', l.kind === 'materasso' && l.variant?.height_cm ? 'H' + l.variant.height_cm : ''].filter(Boolean).join(' · ');
        const price = l.variant ? formatCents(l.variant.price_cents * l.item.qty) : 'non disponibile';
        return l.item.optional
          ? `<li class="is-opt"><label><input type="checkbox" data-act="b-opt" value="${esc(l.product.id)}" ${l.included ? 'checked' : ''} ${l.variant ? '' : 'disabled'}><span><strong>${esc(l.product.name)}</strong><small>${esc(spec)} · a scelta</small></span></label><span>${price}</span></li>`
          : `<li><span><strong>${esc(l.product.name)}</strong><small>${esc(spec)}</small></span><span>${price}</span></li>`;
      })
      .join('')}
      ${q.price.offers.map((o) => `<li class="is-save"><span>${esc(o.label)} (${o.pct} %)</span><span>−${formatCents(o.amount_cents)}</span></li>`).join('')}</ul>
    ${togetherHtml(q.price, { size: q.size, big: true })}
    <div class="buy__actions"><button class="btn btn--primary" id="b-add" data-act="add-bundle" data-id="${esc(b.id)}" ${q.available ? '' : 'disabled'}>Aggiungi il ${esc(b.name)} al carrello</button></div>
    <div class="buy__extra" id="b-feedback" aria-live="polite"></div>
    <ul class="buy__trust"><li>${icon('truck', 18)} Spedizione gratuita in Italia</li><li>${icon('check', 18)} Paghi alla consegna o con bonifico</li><li>${icon('clock', 18)} Produzione in circa 2 giorni</li></ul>
    <p class="small muted">Prezzi IVA inclusa. ${esc(b.description)}</p>`;
}

// ---------- scheda materasso: "Completa il letto"
function bedPanelHtml(idx, p, v, qty) {
  const cfg = offerCfg(idx);
  if (!cfg || !p.bundle_family || !v?.size) return '';
  const reti = idx.publicProducts('rete').map((r) => ({ p: r, v: idx.cheapestAtSize(r, v.size) })).filter((x) => x.v);
  if (!reti.length) return '';
  const opts = reti.map((r) => ({ ...r, pr: priceCart(idx, [{ variant_id: v.id, qty }, { variant_id: r.v.id, qty }], cfg) }));
  const pick = (state.bedRete ??= {})[p.id];
  const cur = opts.find((o) => o.p.id === pick) ?? opts[0];
  const bundle = publicBundles(idx).find((b) => bundleMattress(idx, b)?.id === p.id);
  const pills = pillowOptions(idx, cfg).map((x) => ({ ...x, save: priceCart(idx, [{ variant_id: v.id, qty }, { variant_id: x.v.id, qty: 2 * qty }], cfg).discount_cents }));
  return `<section class="bedpanel" aria-labelledby="bed-t">
    <div class="bedpanel__head"><h2 id="bed-t">Completa il letto</h2>${saveTag(Math.max(cur.pr.discount_cents, ...pills.map((x) => x.save)))}</div>
    ${pills.length ? `<p class="small"><strong>Due guanciali</strong>, uno per lato: con il materasso costano meno, anche se non cambi la rete.</p>
    <div class="bedpanel__opts">${pills
      .map((x) => `<div class="bedopt bedopt--btn"><span class="bedopt__img">${coverHtml(idx, x.p, { sizes: '72px' })}</span><span class="bedopt__txt"><strong>${2 * qty} × ${esc(shortName(x.p))}</strong><small>${formatCents(x.v.price_cents)} l'uno</small></span>${x.save ? `<span class="bedopt__save">−${formatCents(x.save)}</span>` : '<span></span>'}<button class="btn btn--accent btn--sm" data-act="add-variant" data-id="${esc(x.v.id)}" data-q="${2 * qty}">Aggiungi</button></div>`)
      .join('')}</div>
    <p class="small"><strong>Cambi anche la rete?</strong></p>` : ''}
    <p class="small">Con la rete ${formatSize(v.size)} il materasso e la rete costano meno insieme che separati.</p>
    <div class="bedpanel__opts" role="radiogroup" aria-label="Rete">${opts
      .map((o) => `<label class="bedopt"><input type="radio" name="bed-rete" value="${esc(o.p.id)}" data-act="bed-rete" ${o === cur ? 'checked' : ''}><span class="bedopt__img">${coverHtml(idx, o.p, { sizes: '72px' })}</span><span class="bedopt__txt"><strong>${esc(shortName(o.p))}</strong><small>${formatCents(o.v.price_cents)}</small></span>${o.pr.discount_cents ? `<span class="bedopt__save">−${formatCents(o.pr.discount_cents)}</span>` : ''}</label>`)
      .join('')}</div>
    ${togetherHtml(cur.pr, { size: v.size })}
    <button class="btn btn--accent" style="width:100%" data-act="add-bed" data-m="${esc(v.id)}" data-r="${esc(cur.v.id)}" data-q="${qty}">Aggiungi materasso e rete${qty > 1 ? ` (${qty} letti)` : ''}</button>
    ${bundle ? `<a class="small" href="${u(bundlePath(bundle))}">Vedi il ${esc(bundle.name)}</a>` : `<a class="small" href="${u(P.offers + '#componi')}">Componi il letto con il topper</a>`}
  </section>`;
}

/** Scheda guanciale: la coppia, con il vantaggio calcolato. */
function pairPanelHtml(idx, v) {
  const cfg = offerCfg(idx);
  if (!cfg?.pillowPair?.pct) return '';
  const pr = priceCart(idx, [{ variant_id: v.id, qty: 2 }], cfg);
  if (!pr.discount_cents) return '';
  return `<section class="bedpanel" aria-labelledby="pair-t2">
    <div class="bedpanel__head"><h2 id="pair-t2">Prendine due</h2>${saveTag(pr.discount_cents)}</div>
    <p class="small">Uno per lato del letto: due guanciali uguali costano meno. Con un materasso nello stesso ordine il vantaggio è più alto.</p>
    ${togetherHtml(pr)}
    <button class="btn btn--accent" style="width:100%" data-act="add-variant" data-id="${esc(v.id)}" data-q="2">Aggiungi la coppia</button>
  </section>`;
}
/** Guanciali consigliati in vendita (Memory Flakes e Memory Classic per primi). */
function pillowOptions(idx, cfg) {
  if (!cfg?.addon?.pct.guanciale) return [];
  const pub = idx.publicProducts('guanciale');
  const order = cfg.addon.consigliati.map((slug) => pub.find((p) => p.slug === slug)).filter(Boolean);
  return order.map((p) => ({ p, v: idx.purchasableVariants(p)[0] })).filter((x) => x.v);
}

// ---------- carrello e riepilogo: vantaggi, "Aggiungi" e "Sali di gamma"
/** Il materasso appena sopra nella stessa misura: quanto costa in più, al netto dei vantaggi. */
function upgradeHint(idx, okLines, cfg) {
  const base = okLines.map((l) => ({ variant_id: l.item.variant_id, qty: l.item.qty }));
  const now = priceCart(idx, base, cfg).total_cents;
  for (const l of okLines) {
    if (!l.product || idx.kind(l.product) !== 'materasso' || !l.product.bundle_family) continue;
    const cands = idx
      .publicProducts('materasso')
      .filter((p) => p.id !== l.product.id && p.bundle_family)
      .map((p) => {
        const vs = idx.purchasableVariants(p).filter((x) => x.size === l.variant.size);
        const nv = vs.find((x) => x.height_cm === l.variant.height_cm) ?? vs.sort((a, b2) => a.price_cents - b2.price_cents)[0];
        return nv && { p, nv };
      })
      .filter((x) => x && x.nv.price_cents > l.variant.price_cents)
      .sort((a, b2) => a.nv.price_cents - b2.nv.price_cents);
    const up = cands[0];
    if (!up) continue;
    const swapped = base.map((x) => (x.variant_id === l.item.variant_id ? { ...x, variant_id: up.nv.id } : x));
    const diff = priceCart(idx, swapped, cfg).total_cents - now;
    if (diff > 0) return { from: l, p: up.p, v: up.nv, diff };
  }
  return null;
}
function cartOffersHtml(idx, v, { where = 'cart' } = {}) {
  const cfg = offerCfg(idx);
  if (!cfg) return '';
  const ok = v.lines.filter((l) => l.status === 'ok');
  const hints = offerHints(idx, ok.map((l) => ({ variant_id: l.item.variant_id, qty: l.item.qty })), cfg);
  const up = where === 'cart' ? upgradeHint(idx, ok, cfg) : null;
  if (!hints.length && !up) return '';
  return `<section class="hints" aria-labelledby="hints-t-${where}">
    <h2 id="hints-t-${where}">${where === 'review' ? 'Prima di inviare' : 'Completa e risparmia'}</h2>
    ${hints
      .map((h) => `<div class="hint">
        <div class="hint__img">${coverHtml(idx, h.product, { sizes: '72px' })}</div>
        <div class="hint__txt"><strong>${h.type === 'add_guanciali' ? `Aggiungi ${h.qty} guanciali ${esc(shortName(h.product))}` : h.type === 'add_rete' ? `Aggiungi la ${esc(shortName(h.product))} ${formatSize(h.size)}` : `Aggiungi il ${esc(shortName(h.product))} ${formatSize(h.size)}`}</strong>
          <small>${h.qty > 1 ? `${h.qty} × ` : ''}${formatCents(h.variant.price_cents)} · ${h.type === 'add_guanciali' ? 'uno per lato del letto, con il vantaggio del materasso' : h.type === 'add_rete' ? 'stessa misura del materasso: insieme diventano un letto completo' : 'stessa misura del tuo letto completo'}</small></div>
        ${saveTag(h.save_cents)}
        <button class="btn btn--accent btn--sm" data-act="add-variant" data-id="${esc(h.variant.id)}" data-q="${h.qty}">Aggiungi</button>
      </div>`)
      .join('')}
    ${up ? `<div class="hint hint--up">
        <div class="hint__img">${coverHtml(idx, up.p, { sizes: '72px' })}</div>
        <div class="hint__txt"><strong>Sali al ${esc(shortName(up.p))}</strong><small>Con ${formatCents(up.diff)} in più${up.v.height_cm ? ` (H${up.v.height_cm})` : ''}, vantaggi compresi. ${esc(up.p.short)}</small></div>
        <button class="btn btn--ghost btn--sm" data-act="swap-variant" data-from="${esc(up.from.item.variant_id)}" data-to="${esc(up.v.id)}">Scambia</button>
      </div>` : ''}
  </section>`;
}
function totalsHtml(v) {
  const rows = [
    ...(v.discount_cents ? [['Subtotale', formatCents(v.subtotal_cents), '']] : []),
    ...(v.offers ?? []).map((o) => [`${o.label}${o.size ? ' ' + formatSize(o.size) : ''}${o.count > 1 ? ` × ${o.count}` : ''}`, '−' + formatCents(o.amount_cents), 'is-save']),
  ];
  return rows.map(([k, val, cls]) => `<dt class="${cls}">${esc(k)}</dt><dd class="${cls}">${val}</dd>`).join('');
}

// ---------------------------------------------------------------- CARRELLO
// Carrello condivisibile: un link con SKU e quantità (nessun prezzo, nessun dato personale),
// da mandare a chi decide insieme a te. I prezzi si ricalcolano all'apertura.
function shareLink() {
  const idx = catalog();
  const c = cart.items
    .map((i) => {
      const v = idx.variants.get(i.variant_id);
      return v ? `${v.sku}*${i.qty}` : null;
    })
    .filter(Boolean)
    .join(',');
  const base = MODE === 'path' ? location.origin : location.href.split('#')[0];
  return `${base}${u(P.cart)}?c=${encodeURIComponent(c)}`;
}
function sharedItems(code) {
  const idx = catalog();
  const bySku = new Map([...idx.variants.values()].map((v) => [v.sku, v]));
  return String(code || '')
    .split(',')
    .slice(0, 30)
    .map((x) => {
      const [sku, q] = x.split('*');
      const v = bySku.get(sku);
      const p = v && idx.products.get(v.product_id);
      const qty = Math.max(1, Math.min(MAX_QTY, Number(q) || 1));
      return v && p && idx.purchasableVariants(p).includes(v) ? { variant_id: v.id, qty, seen_price_cents: v.price_cents } : null;
    })
    .filter(Boolean);
}
async function viewCart(query = {}) {
  if (query.c) {
    // si arriva da un carrello condiviso: si chiede che cosa farne, senza toccare il proprio
    const items = sharedItems(query.c);
    state.shared = items;
    const idx0 = catalog();
    const v0 = await api.validateCart(items.length ? items : []).catch(() => null);
    setMeta('Carrello condiviso', 'Un carrello Vesuvio Sleep condiviso con te.', [], { noindex: true });
    app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Carrello condiviso' }], 'Un carrello condiviso con te')}
      <div class="wrap section--tight">${items.length
        ? `<p class="lead">Ecco cosa ti hanno mandato. I prezzi sono quelli di oggi${v0?.discount_cents ? `, con i vantaggi già calcolati: <strong>${formatCents(v0.total_cents)}</strong> invece di ${formatCents(v0.subtotal_cents)}` : `: <strong>${formatCents(v0?.total_cents ?? 0)}</strong>`}.</p>
          <ul class="builder__lines" style="max-width:640px">${(v0?.lines ?? []).filter((l) => l.status === 'ok').map((l) => `<li><span>${l.item.qty > 1 ? l.item.qty + ' × ' : ''}<a href="${href.product(l.product)}">${esc(l.product.name)}</a> <span class="small muted">${[l.variant.size ? formatSize(l.variant.size) : '', l.variant.height_cm && idx0.kind(l.product) === 'materasso' ? 'H' + l.variant.height_cm : ''].filter(Boolean).join(' · ')}</span></span><span>${formatCents(l.unit_cents * l.item.qty)}</span></li>`).join('')}
            ${(v0?.offers ?? []).map((o) => `<li class="is-save"><span>${esc(o.label)}</span><span>−${formatCents(o.amount_cents)}</span></li>`).join('')}</ul>
          <div class="btn-row" style="margin-top:20px"><button class="btn btn--primary" data-act="shared-use">Usa questo carrello</button>${cart.items.length ? '<button class="btn btn--ghost" data-act="shared-add">Aggiungilo al mio</button>' : ''}</div>
          ${cart.items.length ? `<p class="small muted">Nel tuo carrello ci sono già ${cart.count()} articoli: «Usa questo carrello» li sostituisce.</p>` : ''}`
        : `<div class="empty"><h2>Il link non contiene articoli in vendita</h2><p>Forse un prodotto non è più disponibile. <a href="${u('/materassi/')}">Guarda i materassi</a>.</p></div>`}</div>`;
    return;
  }
  const current = freshRender();
  const v = await api.validateCart(cart.items);
  if (!current()) return;
  const idx = catalog();
  setMeta('Carrello', 'Il tuo carrello Vesuvio Sleep: verifica gli articoli e invia il riepilogo su WhatsApp.', [], { noindex: true });
  if (!cart.items.length) {
    app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Carrello' }], 'Carrello')}
    <div class="wrap section--tight"><div class="empty"><h2>Il carrello è vuoto</h2><p>Scegli un materasso e la misura: troverai qui il riepilogo da inviare su WhatsApp.</p><div class="btn-row" style="justify-content:center"><a class="btn btn--primary" href="${u('/materassi/')}">Esplora i materassi</a><a class="btn btn--ghost" href="${u(P.sleepMatch)}">Trova il tuo materasso</a></div></div></div>`;
    return;
  }
  // funzione extra: rete della stessa misura se nel carrello c'è un materasso senza rete
  const cartSizes = new Set(v.lines.filter((l) => l.product && idx.kind(l.product) === 'materasso').map((l) => l.variant.size));
  const reteSizes = new Set(v.lines.filter((l) => l.product && idx.kind(l.product) === 'rete').map((l) => l.variant.size));
  const missing = [...cartSizes].filter((s) => !reteSizes.has(s));
  const reteSugg = missing.length
    ? idx.publicProducts('rete').map((p) => ({ p, v: idx.cheapestAtSize(p, missing[0]) })).filter((x) => x.v)
    : [];
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Carrello' }], 'Carrello')}
  <div class="wrap" style="padding-top:22px"><ol class="steps-mini" aria-label="Passaggi"><li aria-current="step">Carrello</li><li>Verifica</li><li>WhatsApp</li></ol></div>
  <div class="wrap cart">
    <div>
      ${v.lines.map((l) => cartLine(idx, l)).join('')}
      ${offerCfg(idx) ? cartOffersHtml(idx, v) : reteSugg.length ? `<section class="section--tight"><h2 style="font-size:1.3rem">Una rete della stessa misura</h2><p class="small muted">Hai un materasso ${formatSize(missing[0])}: queste reti sono nella stessa misura.</p><div class="pair-row">${reteSugg.map(({ p, v: rv }) => pairHtml(idx, { product: p, variant: rv, fromPrice: rv.price_cents })).join('')}</div></section>` : ''}
    </div>
    <aside class="summary" aria-label="Totale">
      <dl><dt>Articoli</dt><dd>${cart.count()}</dd><dt>Spedizione</dt><dd>Gratuita in Italia</dd>${totalsHtml(v)}<div class="tot" style="display:contents"><dt>Totale</dt><dd>${formatCents(v.total_cents)}</dd></div></dl>
      ${v.discount_cents ? saveTag(v.discount_cents, { label: 'Risparmi in tutto' }) : ''}
      <p class="small muted">IVA inclusa. Paghi alla consegna in contrassegno oppure con bonifico: nessun pagamento online. <a href="${u(P.payments)}">Come funziona</a></p>
      ${v.issues ? `<p class="note note--warn">${v.issues === 1 ? 'Un articolo va controllato' : v.issues + ' articoli vanno controllati'} prima di continuare.</p>` : ''}
      <a class="btn btn--primary" style="width:100%" href="${u(P.review)}" ${v.issues ? 'aria-disabled="true" data-act="blocked"' : ''}>Verifica il riepilogo</a>
      <p style="margin:12px 0 0;text-align:center"><a href="${u('/materassi/')}" class="small">Continua a scegliere</a></p>
      <div class="share-cart"><button class="link-btn small" data-act="share-cart">${icon('copy', 16)} Condividi il carrello</button><span class="small muted">con chi sceglie insieme a te</span></div>
      <div id="share-out" aria-live="polite"></div>
    </aside>
  </div>`;
}
function cartLine(idx, l) {
  const p = l.product;
  const v = l.variant;
  const name = p ? p.name : 'Articolo non disponibile';
  const spec = v ? [v.size ? formatSize(v.size) : '', v.height_cm && idx.kind(p) === 'materasso' ? `H${v.height_cm}` : ''].filter(Boolean).join(' · ') : '';
  return `<div class="line">
    <div class="line__img">${p ? coverHtml(idx, p, { sizes: '92px' }) : fallbackHtml('materasso')}</div>
    <div><h3>${p ? `<a href="${href.product(p)}">${esc(name)}</a>` : esc(name)}</h3>
      <div class="meta">${esc(spec)}${v ? ` · SKU ${esc(v.sku)}` : ''}</div>
      ${l.message ? `<p class="note ${l.status === 'price_changed' ? 'note--warn' : 'note--err'}" style="margin:8px 0 0">${esc(l.message)}${l.status === 'price_changed' ? ` Nuovo prezzo: <strong>${formatCents(l.unit_cents)}</strong> <button class="link-btn" data-act="accept-price" data-id="${esc(l.item.variant_id)}">Accetta il nuovo prezzo</button>` : ''}</p>` : ''}
      <div class="line__row">
        <div class="qty" role="group" aria-label="Quantità di ${esc(name)}"><button data-act="cart-qty" data-id="${esc(l.item.variant_id)}" data-d="-1" aria-label="Diminuisci">${icon('minus', 18)}</button><output>${l.item.qty}</output><button data-act="cart-qty" data-id="${esc(l.item.variant_id)}" data-d="1" aria-label="Aumenta" ${l.item.qty >= MAX_QTY || l.status !== 'ok' ? 'disabled' : ''}>${icon('plus', 18)}</button></div>
        <span class="line__price"><strong>${l.status === 'ok' ? formatCents(l.unit_cents * l.item.qty) : ''}</strong>${l.status === 'ok' && l.discount_cents ? `<small class="line__save">−${formatCents(l.discount_cents)} di vantaggio</small>` : ''}</span>
        <button class="link-btn small" data-act="cart-remove" data-id="${esc(l.item.variant_id)}">Rimuovi</button>
      </div></div></div>`;
}

// ---------------------------------------------------------------- RIEPILOGO + WHATSAPP
function cartSignature(items) {
  return items.map((i) => `${i.variant_id}:${i.qty}:${i.seen_price_cents}`).sort().join('|');
}
async function viewReview() {
  setMeta('Verifica il riepilogo', 'Controlla il riepilogo, scegli come pagare e invialo a Vesuvio Sleep su WhatsApp.', [], { noindex: true });
  if (!cart.items.length) {
    go(P.cart, { replace: true });
    return;
  }
  const current = freshRender();
  const v = await api.validateCart(cart.items); // ricontrollo lato server: con Supabase collegato lo fa il database
  if (!current()) return;
  const head = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Carrello', href: u(P.cart) }, { name: 'Verifica' }], 'Verifica il riepilogo')}
    <div class="wrap" style="padding-top:22px"><ol class="steps-mini" aria-label="Passaggi"><li>Carrello</li><li aria-current="step">Verifica</li><li>WhatsApp</li></ol></div>`;
  if (!v.canSubmit) {
    app.innerHTML = `${head}<div class="wrap"><div class="note note--warn" role="alert"><strong>Abbiamo ricontrollato il carrello e qualcosa è cambiato.</strong> Correggi gli articoli segnalati e riprova.</div>
      <div>${v.lines.map((l) => cartLine(catalog(), l)).join('')}</div><p style="margin-top:20px"><a class="btn btn--ghost" href="${u(P.cart)}">Torna al carrello</a></p></div>`;
    return;
  }
  const sig = cartSignature(cart.items);
  let ref;
  try {
    const saved = JSON.parse(sessionStorage.getItem('vs-review') || 'null');
    if (saved?.sig === sig && store.db.requests.some((r) => r.ref === saved.ref)) ref = saved.ref;
  } catch {
    /* sessionStorage non disponibile */
  }
  const req = ref ? store.db.requests.find((r) => r.ref === ref) : await api.createCartRequest(v);
  if (!current()) return;
  if (req?.offerChanged) {
    // un'offerta è cambiata tra il carrello e il riepilogo: il database non ha creato nulla
    const nv = req.validation;
    app.innerHTML = `${head}<div class="wrap"><div class="note note--warn" role="alert"><strong>Il totale è cambiato mentre controllavi.</strong> Ora è ${formatCents(nv.total_cents)} (prima ${formatCents(v.total_cents)}): un'offerta è stata aggiornata. Controlla e conferma.</div>
      <p style="margin-top:16px"><button class="btn btn--primary" data-act="review-refresh">Aggiorna il riepilogo</button> <a class="btn btn--ghost" href="${u(P.cart)}">Torna al carrello</a></p></div>`;
    return;
  }
  try {
    sessionStorage.setItem('vs-review', JSON.stringify({ sig, ref: req.ref }));
  } catch {
    /* ignora */
  }
  const pay = PAYMENT_METHODS.find((m) => m.id === state.pay) ?? PAYMENT_METHODS[0];
  const summary = { ref: req.ref, lines: toSummaryLines(v), total_cents: v.total_cents, subtotal_cents: v.subtotal_cents, discount_cents: v.discount_cents, offers: v.offers, shipping_note: store.db.settings.shipping_note, payment: pay.msg };
  const plan = planWhatsApp(whatsappStatus().raw, summary);
  state.lastSummary = plan.fullText;
  app.innerHTML = `${head}<div class="wrap cart">
    <div>
      <table class="size-table" aria-label="Articoli"><thead><tr><th>Articolo</th><th>Q.tà</th><th style="text-align:right">Prezzo</th></tr></thead><tbody>
      ${summary.lines.map((l) => `<tr><td><strong>${esc(l.name)}</strong><br><span class="small muted">${[l.size ? formatSize(l.size) : '', l.height_cm && l.size ? 'H' + l.height_cm : ''].filter(Boolean).join(' · ')}${l.size ? ' · ' : ''}SKU ${esc(l.sku)}</span></td><td>${l.qty}</td><td style="text-align:right">${formatCents(l.unit_cents * l.qty)}</td></tr>`).join('')}
      ${v.discount_cents ? `<tr class="tr-sub"><td colspan="2">Subtotale</td><td style="text-align:right">${formatCents(v.subtotal_cents)}</td></tr>${v.offers.map((o) => `<tr class="tr-save"><td colspan="2">${esc(o.label)}${o.size ? ' ' + formatSize(o.size) : ''}${o.count > 1 ? ` × ${o.count}` : ''}</td><td style="text-align:right">−${formatCents(o.amount_cents)}</td></tr>`).join('')}` : ''}
      </tbody></table>
      ${cartOffersHtml(catalog(), v, { where: 'review' })}
      <dl class="facts-list" style="margin-top:16px"><dt>Totale</dt><dd><strong>${formatCents(v.total_cents)}</strong> IVA inclusa${v.discount_cents ? ` · risparmi ${formatCents(v.discount_cents)}` : ''}</dd><dt>Spedizione</dt><dd>${esc(store.db.settings.shipping_note)}</dd><dt>Pagamento</dt><dd>${esc(pay.label)}</dd><dt>Riferimento</dt><dd>${esc(req.ref)}</dd></dl>
      <h2 style="font-size:1.2rem;margin-top:28px">Il messaggio che invierai</h2>
      <pre class="msg-preview" aria-label="Testo del messaggio">${esc(plan.text)}</pre>
      <p class="small muted">Il messaggio contiene solo articoli, prezzi e riferimento: nessun dato personale.</p>
    </div>
    <aside class="summary" aria-label="Invio">
      <h2 style="font-size:1.2rem">Invia la richiesta</h2>
      <fieldset class="pay-opt"><legend>Come preferisci pagare?</legend>
        ${PAYMENT_METHODS.map((m) => `<label class="pay"><input type="radio" name="pay" value="${m.id}" ${m.id === pay.id ? 'checked' : ''}><span><strong>${esc(m.label)}</strong><small>${esc(m.text)}</small></span></label>`).join('')}
      </fieldset>
      <div id="wa-status" aria-live="polite">${req.status === 'in_attesa_contatto' ? sentNote() : ''}</div>
      ${waBlock(plan, req.ref, 'cart')}
      <p class="small" style="margin-top:14px"><a href="${u(P.cart)}">Modifica il carrello</a></p>
    </aside></div>`;
}
function sentNote() {
  return `<div class="note note--ok" style="margin-bottom:12px">Hai aperto WhatsApp. Se hai inviato il messaggio, Vesuvio Sleep ti risponderà lì per confermare. Il carrello resta salvato finché non lo svuoti. <button class="link-btn" data-act="cart-clear">Svuota il carrello</button></div>`;
}

// ---------------------------------------------------------------- ALTRE
function viewShowroom() {
  setMeta(VIEW_SEO[P.showroom].metaTitle, VIEW_SEO[P.showroom].description, [localBusinessJsonLd(abs('/'), { image: absAsset(siteImage('showroom')?.src), logo: absAsset('img/logo.png') }), trail([{ name: 'Home', path: P.home }, { name: 'Showroom', path: P.showroom }]).ld], { image: siteImage('showroom')?.src });
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Showroom' }], 'Showroom e fabbrica', 'Via Raffaele Salierno 38, Casoria (Napoli)')}<div class="wrap section--tight">${showroomHtml()}</div>`;
  afterShowroom();
}
function viewNotFound() {
  setMeta('Pagina non trovata', 'La pagina che cerchi non esiste o è stata spostata.', [], { noindex: true });
  app.innerHTML = `<div class="wrap section"><h1>Questa pagina non c'è</h1><p class="lead">Il prodotto potrebbe non essere più in catalogo o il link è incompleto. Prova a cercarlo: <a href="${u(P.search)}">cerca nel sito</a>.</p><div class="btn-row"><a class="btn btn--primary" href="${u('/materassi/')}">Vai ai materassi</a><a class="btn btn--ghost" href="${u(P.home)}">Torna alla home</a></div></div>`;
}

// ---------------------------------------------------------------- PAGINE INFORMATIVE
function asideHtml(path, def) {
  const links = def.legal
    ? [[P.terms, 'Condizioni di vendita'], [P.returns, 'Resi e recesso'], [P.warranty, 'Garanzia'], [P.privacy, 'Privacy'], [P.cookies, 'Cookie']]
    : [[P.faq, 'Domande frequenti'], [P.shipping, 'Spedizioni e consegna'], [P.payments, 'Pagamenti'], [P.returns, 'Resi e recesso'], [P.guides, 'Guide']];
  return `<aside class="page-aside" aria-label="Assistenza">
    <div class="help-card"><h2>Hai una domanda?</h2><p>Ti rispondiamo noi, dalla fabbrica.</p>
      <a class="btn btn--wa btn--sm" href="${waHref()}" target="_blank" rel="noopener">${icon('wa', 18)} WhatsApp</a>
      <p class="help-card__line">${icon('phone', 16)} <a href="${CONTACT.phoneHref}">${CONTACT.phoneShort}</a></p>
      <p class="help-card__line">${icon('mail', 16)} <a href="mailto:${CONTACT.email}">${CONTACT.email}</a></p></div>
    <nav class="side-links" aria-label="Pagine correlate"><ul>${links.filter(([p]) => p !== path).map(([p, t]) => `<li><a href="${u(p)}">${t}</a></li>`).join('')}</ul></nav>
  </aside>`;
}
function viewPage(path, def) {
  const items = [{ name: 'Home', path: P.home }, ...(def.parent ? [{ name: def.parent[1], path: def.parent[0] }] : []), { name: def.nav, path }];
  const tr = trail(items);
  const photo = def.photo ? siteImage(def.photo) : null;
  const ld = [tr.ld];
  if (def.type === 'faq') ld.push(faqJsonLd(faqForLd()));
  if (def.type === 'contact' || def.type === 'local')
    ld.push({ ...localBusinessJsonLd(abs('/'), { image: absAsset(photo?.src || SHARE_IMG), logo: absAsset('img/logo.png') }), ...(def.type === 'local' ? { areaServed: [{ '@type': 'City', name: 'Napoli' }, { '@type': 'Country', name: 'Italia' }] } : {}) });
  if (def.type === 'article')
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: def.h1,
      description: def.description,
      inLanguage: 'it-IT',
      datePublished: '2026-11-15',
      dateModified: '2026-11-15',
      mainEntityOfPage: abs(path),
      author: { '@type': 'Organization', name: 'Vesuvio Sleep', url: abs('/') },
      publisher: { '@type': 'Organization', name: 'Vesuvio Sleep', logo: { '@type': 'ImageObject', url: absAsset('img/logo.png') } },
    });
  setMeta(def.metaTitle, def.description, ld, { type: def.type === 'article' ? 'article' : 'website', image: photo?.src });
  app.innerHTML = `${pageHero(tr.ui, def.h1, def.lead, '', photo)}
  <div class="wrap page-layout${def.legal ? ' page-layout--legal' : ''}"><article class="prose">${def.body()}</article>${asideHtml(path, def)}</div>`;
}

// ---------------------------------------------------------------- RICERCA
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/×/g, 'x');
function viewSearch(q) {
  const idx = pub();
  const terms = norm(q).split(/[^a-z0-9]+/).filter((x) => x.length > 1);
  const match = (hay) => terms.length && terms.every((t) => norm(hay).includes(t));
  const prods = terms.length
    ? idx.publicProducts().filter((p) => match([p.name, p.technical_name, p.short, p.description, p.composition, (p.highlights || []).join(' '), idx.category(p)?.name, idx.purchasableSizes(p).join(' '), idx.purchasableHeights(p).map((h) => 'h' + h).join(' ')].join(' ')))
    : [];
  const pages = terms.length
    ? Object.entries({ ...PAGES }).filter(([, d]) => match([d.h1, d.nav, d.description, d.lead].join(' '))).slice(0, 8)
    : [];
  setMeta(q ? `Risultati per "${q}"` : 'Cerca nel sito', 'Cerca materassi, reti, topper e informazioni su Vesuvio Sleep.', [], { noindex: true });
  const n = prods.length + pages.length;
  app.innerHTML = `${pageHero([{ name: 'Home', href: u(P.home) }, { name: 'Cerca' }], 'Cerca nel sito')}
  <div class="wrap section--tight">
    <form class="search-form" id="search-form" role="search"><label class="sr-only" for="q">Cerca</label>
      <input class="input" type="search" id="q" name="q" value="${esc(q)}" placeholder="Es. memory, molle, 160x190, spedizione" autocomplete="off">
      <button class="btn btn--primary" type="submit">${icon('search', 18)} Cerca</button></form>
    ${q ? `<p class="small muted" aria-live="polite">${n ? `${n} ${n === 1 ? 'risultato' : 'risultati'} per "${esc(q)}"` : `Nessun risultato per "${esc(q)}".`}</p>` : ''}
    ${prods.length ? `<h2 class="sr-only">Prodotti</h2><div class="grid">${prods.map((p) => productCard(idx, p)).join('')}</div>` : ''}
    ${pages.length ? `<h2 style="font-size:1.3rem;margin-top:32px">Pagine</h2><ul class="search-pages">${pages.map(([p, d]) => `<li><a href="${u(p)}"><strong>${esc(d.h1)}</strong><span>${esc(d.description)}</span></a></li>`).join('')}</ul>` : ''}
    ${q && !n ? `<div class="empty"><p>Prova con un'altra parola, oppure scrivici: ti aiutiamo noi.</p><div class="btn-row" style="justify-content:center"><a class="btn btn--primary" href="${u('/materassi/')}">Vedi i materassi</a><a class="btn btn--ghost" href="${waHref()}" target="_blank" rel="noopener">Scrivici su WhatsApp</a></div></div>` : ''}
    ${!q ? `<p class="muted">Più cercati: <a href="${u(P.search + '?q=memory')}">memory</a> · <a href="${u(P.search + '?q=molle')}">molle</a> · <a href="${u(P.search + '?q=160x190')}">160×190</a> · <a href="${u(P.search + '?q=rete')}">rete</a> · <a href="${u(P.search + '?q=spedizione')}">spedizione</a></p>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- EVENTI
function closeDrawer() {
  $('#drawer')?.classList.remove('is-open');
  $('#menu-btn')?.setAttribute('aria-expanded', 'false');
}
function currentProduct() {
  const seg = current().path.split('/').filter(Boolean);
  if (seg.length !== 2) return null;
  const idx = pub();
  const p = idx.snap.products.find((x) => x.slug === seg[1]);
  return p ? { idx, p } : null;
}
function addVariant(v, qty = 1) {
  cart.set(addToCart(cart.items, v, qty));
  bump($('#cart-link'));
  toast('Aggiunto al carrello');
}
/** Più pezzi insieme (letto completo): un solo aggiornamento del carrello. */
function addMany(list) {
  let items = cart.items;
  for (const { v, qty } of list) items = addToCart(items, v, qty);
  cart.set(items);
  bump($('#cart-link'));
}
function swapBuilder(idx, focusAct, focusVal) {
  const el = $('#builder');
  if (!el) return;
  const y = window.scrollY;
  el.innerHTML = builderHtml(idx);
  window.scrollTo(0, y);
  const f = focusVal != null ? $(`#builder [data-act="${focusAct}"][value="${CSS.escape(String(focusVal))}"]`) : $(`#builder [data-act="${focusAct}"]`);
  f?.focus({ preventScroll: true });
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (document.body.classList.contains('is-admin') && !['wa-open'].includes(act)) return; // gli eventi admin li gestisce admin.js
  switch (act) {
    case 'home-tab': {
      state.homeKind = t.dataset.kind;
      $$('.seg-tabs .tab').forEach((b) => {
        const on = b === t;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
      });
      $('#home-grid').setAttribute('aria-labelledby', t.id);
      moveThumb();
      const hg = $('#home-grid');
      hg.innerHTML = homeGrid(pub());
      $('.showcase', hg).classList.add('is-entering');
      enhance(hg);
      break;
    }
    case 'lab-model': {
      state.labModel = t.dataset.id;
      const sec = $('#lab-stage').closest('.wrap');
      sec.innerHTML = labHtml(pub());
      $$('.rv', sec).forEach((x) => x.classList.add('in'));
      const st = $('#lab-stage');
      st.style.setProperty('--ex', '0');
      explode(st, 0.8, 1000);
      $(`[data-act="lab-model"][data-id="${CSS.escape(t.dataset.id)}"]`)?.focus();
      break;
    }
    case 'lab-layer': {
      const st = $('#lab-stage');
      const on = t.getAttribute('aria-pressed') !== 'true';
      $$('[data-act="lab-layer"]').forEach((b) => b.setAttribute('aria-pressed', String(on && b === t)));
      $$('.mx .ly', st).forEach((g) => g.classList.toggle('is-focus', on && g.style.getPropertyValue('--i') === t.dataset.i));
      if (on) {
        st.dataset.focus = t.dataset.i;
        if ((Number(st.style.getPropertyValue('--ex')) || 0) < 0.5) explode(st, 0.8, 700);
      } else delete st.dataset.focus;
      break;
    }
    case 'print':
      window.print();
      break;
    case 'sm-start':
      state.sm = { step: 0, a: { me: {}, position: t.dataset.v } };
      go(P.sleepMatch);
      break;
    case 'to-product': {
      // morph della card nella galleria della scheda (View Transitions)
      const card = t.closest('.card, .lab');
      const mediaEl = card?.querySelector('.card__media, .lab__stage');
      if (mediaEl && document.startViewTransition && !reducedMotion()) mediaEl.style.viewTransitionName = 'prod-media';
      break;
    }
    case 'filter': {
      const k = t.dataset.k;
      const f = state.filters;
      if (k === 'removable') f.removable = !f.removable;
      else if (k === 'height') f.height = f.height === Number(t.dataset.v) ? 0 : Number(t.dataset.v);
      else f[k] = t.dataset.v;
      $$('[data-act="filter"]').forEach((b) =>
        b.setAttribute('aria-pressed', b.dataset.k === 'removable' ? String(f.removable) : String(String(f[b.dataset.k]) === b.dataset.v)),
      );
      swap($('#cat-body'), state.catBody());
      break;
    }
    case 'reset-filters':
      Object.assign(state.filters, { tech: 'all', removable: false, height: 0 });
      route();
      break;
    case 'compare': {
      t.checked ? state.compare.add(t.value) : state.compare.delete(t.value);
      if (state.compare.size > 3) {
        state.compare.delete(t.value);
        t.checked = false;
        toast('Puoi confrontare al massimo tre modelli');
      }
      $('.compare-bar')?.remove();
      if (state.compare.size) showCompareBar();
      break;
    }
    case 'cmp-toggle': {
      const id = t.dataset.id;
      if (state.compare.has(id)) state.compare.delete(id);
      else if (state.compare.size >= 3) return toast('Puoi confrontare al massimo tre modelli');
      else state.compare.add(id);
      const y = window.scrollY;
      viewCompare();
      window.scrollTo(0, y);
      $(`[data-act="cmp-toggle"][data-id="${CSS.escape(id)}"]`)?.focus();
      break;
    }
    case 'cmp-clear':
      state.compare.clear();
      $('.compare-bar')?.remove();
      $$('[data-act="compare"]').forEach((c) => (c.checked = false));
      break;
    case 'compare-with': {
      const cp = currentProduct();
      if (cp?.p) state.compare.add(cp.p.id);
      break;
    }
    case 'quote-for':
      state.quoteFor = t.dataset.id;
      if (isAt(P.quote)) viewQuote(current().query);
      break;
    case 'layer': {
      const box = t.closest('[data-layers]');
      const i = t.dataset.i;
      $$('[data-act="layer"]', box).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.i === i)));
      break;
    }
    case 'thumb': {
      const cp = currentProduct();
      const g = mediaFor(cp.idx, cp.p);
      $('[data-gallery]').innerHTML = galleryHtml(cp.idx, cp.p, g, Number(t.dataset.i));
      $('[data-gallery] .gallery__main')?.classList.add('is-fade');
      if ($('#gal-stage')) explode($('#gal-stage'), 0.6, 700);
      $(`[data-act="thumb"][data-i="${t.dataset.i}"]`)?.focus();
      break;
    }
    case 'zoom': {
      const cp = currentProduct();
      const m = mediaFor(cp.idx, cp.p)[Number(t.dataset.i)];
      const src = media.resolve(m);
      const big = m.srcset ? m.srcset.split(',').pop().trim().split(' ')[0] : src;
      const d = openDialog({
        title: cp.p.name,
        wide: true,
        body: `<div class="btn-row" style="margin-bottom:10px" role="group" aria-label="Livello di zoom">${[1, 2, 3].map((z) => `<button class="chip" data-z="${z}" aria-pressed="${z === 1}">${z === 1 ? 'Adatta' : z + '×'}</button>`).join('')}</div>
          <div class="zoom-stage" tabindex="0" aria-label="Immagine ingrandita: scorri per spostarti"><img src="${esc(big)}" alt="${esc(m.alt)}"></div>${m.caption ? `<p class="small muted" style="margin:8px 0 0">${esc(m.caption)}</p>` : ''}`,
      });
      d.el.addEventListener('click', (ev) => {
        const z = ev.target.closest('[data-z]');
        if (!z) return;
        $$('[data-z]', d.el).forEach((b) => b.setAttribute('aria-pressed', String(b === z)));
        $('.zoom-stage', d.el).style.setProperty('--z', z.dataset.z);
      });
      break;
    }
    case 'size-guide': {
      const cp = currentProduct();
      const s = state.sel[cp.p.id]?.size;
      if (s) state.sizes = [s, s === '180x200' ? '160x190' : '180x200'];
      go(P.sizes);
      break;
    }
    case 'qty': {
      const cp = currentProduct();
      const sel = state.sel[cp.p.id];
      sel.qty = Math.max(1, Math.min(MAX_QTY, sel.qty + Number(t.dataset.d)));
      $('.buy .qty output').textContent = sel.qty;
      break;
    }
    case 'add': {
      const cp = currentProduct();
      const sel = getSel(cp.idx, cp.p);
      const kind = cp.idx.kind(cp.p);
      const v = cp.idx.purchasableVariants(cp.p).find((x) => (x.size ?? null) === (sel.size ?? null) && (kind === 'materasso' || kind === 'topper' ? x.height_cm === sel.height : true));
      if (!v) return toast('Questa configurazione non è acquistabile online');
      addVariant(v, sel.qty);
      $('#add-feedback').innerHTML = `<p class="note note--ok" style="margin:0">Aggiunto: ${esc(cp.p.name)}${v.size ? ' ' + formatSize(v.size) : ''}${kind === 'materasso' ? ' H' + v.height_cm : ''}. <a href="${u(P.cart)}">Vai al carrello</a></p>`;
      break;
    }
    case 'add-variant': {
      const idx = catalog();
      const v = idx.variants.get(t.dataset.id);
      const p = v && idx.products.get(v.product_id);
      if (!v || !p || !idx.purchasableVariants(p).includes(v)) return toast('Articolo non disponibile');
      addVariant(v, Math.max(1, Math.min(MAX_QTY, Number(t.dataset.q) || 1)));
      if (isAt(P.cart)) viewCart();
      if (isAt(P.review)) viewReview();
      break;
    }
    // ---- offerte abbinate
    case 'add-bed': {
      // materasso e rete insieme (scheda prodotto, Sleep Match)
      const idx = catalog();
      const q = Math.max(1, Math.min(MAX_QTY, Number(t.dataset.q) || 1));
      const vs = [t.dataset.m, t.dataset.r].map((id) => idx.variants.get(id));
      if (vs.some((v) => !v || !idx.purchasableVariants(idx.products.get(v.product_id)).includes(v))) return toast('Configurazione non disponibile');
      addMany(vs.map((v) => ({ v, qty: q })));
      toast('Letto completo nel carrello');
      const fb = $('#add-feedback');
      if (fb) fb.innerHTML = `<p class="note note--ok" style="margin:0">Letto completo nel carrello. <a href="${u(P.cart)}">Vai al carrello</a></p>`;
      break;
    }
    case 'add-bundle': {
      const idx = pub();
      const b = (idx.snap.bundles ?? []).find((x) => x.id === t.dataset.id);
      if (!b) return;
      const s = bundleSel(idx, b);
      const qb = quoteBundle(idx, b, s.size, { height: s.height, optional: s.optional }, offerCfg(idx));
      if (!qb.available) return toast('Questa configurazione non è acquistabile online');
      addMany(qb.lines.filter((l) => l.included).map((l) => ({ v: l.variant, qty: l.item.qty })));
      toast(`${b.name} nel carrello`);
      $('#b-feedback').innerHTML = `<p class="note note--ok" style="margin:0">${esc(b.name)} nel carrello${qb.price.discount_cents ? `: risparmi ${formatCents(qb.price.discount_cents)}` : ''}. <a href="${u(P.cart)}">Vai al carrello</a></p>`;
      break;
    }
    case 'bd-beds': {
      const idx = pub();
      builderState(idx).b.beds += Number(t.dataset.d);
      swapBuilder(idx, 'bd-beds');
      break;
    }
    case 'bd-add': {
      const idx = pub();
      const lines = builderLines(idx);
      if (!lines.length) return;
      addMany(lines.map((l) => ({ v: l.variant, qty: l.qty })));
      toast(lines.length > 1 ? 'Letto completo nel carrello' : 'Materasso nel carrello');
      break;
    }
    case 'swap-variant': {
      // "Sali di gamma": il materasso si sostituisce con quello sopra, stessa quantità
      const idx = catalog();
      const to = idx.variants.get(t.dataset.to);
      if (!to || !idx.purchasableVariants(idx.products.get(to.product_id)).includes(to)) return toast('Articolo non disponibile');
      const from = cart.items.find((i) => i.variant_id === t.dataset.from);
      if (!from) return;
      cart.set([...cart.items.filter((i) => i !== from), { variant_id: to.id, qty: from.qty, seen_price_cents: to.price_cents }]);
      toast('Materasso cambiato');
      viewCart();
      break;
    }
    case 'share-cart': {
      const link = shareLink();
      const msg = `Guarda cosa ho scelto su Vesuvio Sleep: ${link}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Il mio carrello Vesuvio Sleep', url: link });
          break;
        } catch {
          /* annullato: si offrono le alternative */
        }
      }
      const copied = await (navigator.clipboard ? navigator.clipboard.writeText(link).then(() => true, () => false) : Promise.resolve(false));
      $('#share-out').innerHTML = `<p class="note note--ok small" style="margin-top:10px">${copied ? 'Link copiato.' : 'Copia il link qui sotto.'} <a href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Mandalo su WhatsApp</a></p>${copied ? '' : `<input class="input" readonly value="${esc(link)}" aria-label="Link del carrello">`}`;
      break;
    }
    case 'shared-use':
    case 'shared-add': {
      const items = state.shared ?? [];
      let next = act === 'shared-use' ? [] : cart.items;
      const idx = catalog();
      for (const i of items) next = addToCart(next, idx.variants.get(i.variant_id), i.qty);
      cart.set(next);
      state.shared = null;
      toast(act === 'shared-use' ? 'Carrello aggiornato' : 'Articoli aggiunti al tuo carrello');
      go(P.cart, { replace: true });
      break;
    }
    case 'map-load':
      loadMap(t.closest('.map-card'));
      $('.map-card iframe')?.focus();
      break;
    case 'review-refresh':
      try {
        sessionStorage.removeItem('vs-review');
      } catch {
        /* ignora */
      }
      viewReview();
      break;
    case 'sm-size': {
      state.smSize = t.dataset.v;
      const idx = pub();
      const p = state.smProduct && idx.products.get(state.smProduct);
      if (p && $('#sm-bed')) $('#sm-bed').innerHTML = smBedHtml(idx, p, state.sel[p.id]?.height ?? null);
      $(`#sm-bed [data-v="${CSS.escape(t.dataset.v)}"]`)?.focus();
      break;
    }
    case 'sm-next':
      state.sm.step++;
      renderSM(true);
      break;
    case 'sm-back':
      state.sm.step = Math.max(0, state.sm.step - 1);
      renderSM(true);
      break;
    case 'sm-restart':
      state.sm = { step: 0, a: { me: {} } };
      renderSM(true);
      break;
    case 'cart-qty': {
      const items = cart.items.map((i) => (i.variant_id === t.dataset.id ? { ...i, qty: Math.max(0, Math.min(MAX_QTY, i.qty + Number(t.dataset.d))) } : i));
      cart.set(items);
      viewCart();
      $(`[data-act="cart-qty"][data-id="${CSS.escape(t.dataset.id)}"][data-d="${t.dataset.d}"]`)?.focus();
      break;
    }
    case 'cart-remove':
      cart.set(cart.items.filter((i) => i.variant_id !== t.dataset.id));
      isAt(P.review) ? viewReview() : viewCart();
      toast('Articolo rimosso');
      break;
    case 'accept-price': {
      const v = catalog().variants.get(t.dataset.id);
      cart.set(cart.items.map((i) => (i.variant_id === t.dataset.id ? { ...i, seen_price_cents: v.price_cents } : i)));
      isAt(P.review) ? viewReview() : viewCart();
      break;
    }
    case 'blocked':
      e.preventDefault();
      toast('Correggi prima gli articoli segnalati');
      break;
    case 'wa-open':
      api.markWaiting(t.dataset.ref);
      if ($('#wa-status')) $('#wa-status').innerHTML = sentNote();
      break;
    case 'copy-summary':
      await copyText(state.lastSummary || '', $('#copy-fallback'));
      break;
    case 'cart-clear':
      cart.clear();
      try {
        sessionStorage.removeItem('vs-review');
      } catch {
        /* ignora */
      }
      toast('Carrello svuotato');
      go(P.home);
      break;
  }
});

document.addEventListener('change', (e) => {
  if (document.body.classList.contains('is-admin')) return;
  const t = e.target;
  const act = t.dataset?.act;
  if (act === 'pick-s' || act === 'pick-h') {
    const cp = currentProduct();
    const sel = getSel(cp.idx, cp.p);
    if (act === 'pick-s') sel.size = t.value;
    else {
      sel.height = Number(t.value);
      const pv = cp.idx.purchasableVariants(cp.p);
      if (!pv.some((v) => v.size === sel.size && v.height_cm === sel.height)) sel.size = pv.find((v) => v.height_cm === sel.height)?.size ?? sel.size;
    }
    renderBuy(cp.idx, cp.p);
    $(`#${act === 'pick-s' ? 's' : 'h'}${CSS.escape(t.value)}`)?.focus();
  }
  if (act === 'bed-rete') {
    const cp = currentProduct();
    (state.bedRete ??= {})[cp.p.id] = t.value;
    renderBuy(cp.idx, cp.p);
    $(`input[name="bed-rete"][value="${CSS.escape(t.value)}"]`)?.focus();
  }
  if (act === 'b-size' || act === 'b-height' || act === 'b-opt') {
    const idx = pub();
    const slug = current().path.split('/').filter(Boolean)[1];
    const b = bundleBySlug(idx, slug);
    if (!b) return;
    const s = bundleSel(idx, b);
    if (act === 'b-size') s.size = t.value;
    if (act === 'b-height') s.height = Number(t.value);
    if (act === 'b-opt') t.checked ? s.optional.add(t.value) : s.optional.delete(t.value);
    renderBundleBuy(idx, b);
    $(`[data-act="${act}"][value="${CSS.escape(t.value)}"]`)?.focus();
  }
  if (act === 'bd') {
    const idx = pub();
    const { b } = builderState(idx);
    const k = t.dataset.k;
    if (k === 'topper') b.topper = t.checked;
    else if (k === 'height') b.height = Number(t.value);
    else b[k] = t.value;
    swapBuilder(idx, 'bd', k === 'topper' ? null : t.value);
  }
  if (act === 'sort') {
    state.filters.sort = t.value;
    swap($('#cat-body'), state.catBody());
  }
  if (act === 'sm-pick') {
    setK(state.sm.a, t.dataset.k, t.value);
    $('[data-act="sm-next"]').disabled = false;
  }
  if (act === 'size-a' || act === 'size-b') {
    state.sizes[act === 'size-a' ? 0 : 1] = t.value;
    const y = window.scrollY;
    viewSizes();
    window.scrollTo(0, y);
    $('#' + (act === 'size-a' ? 'sz-a' : 'sz-b')).focus();
  }
  if (t.id === 'q-b2b') $('#b2b-fields').hidden = !t.checked;
  if (t.name === 'pay') {
    state.pay = t.value;
    const y = window.scrollY;
    viewReview();
    window.scrollTo(0, y);
    $(`input[name="pay"][value="${CSS.escape(t.value)}"]`)?.focus();
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset?.act === 'lab-ex' || t.dataset?.act === 'gal-ex') {
    t.closest('#lab-stage, #gal-stage')?.style.setProperty('--ex', String(Number(t.value) / 100));
  }
});

document.addEventListener('keydown', (e) => {
  // frecce tra le tab categorie
  const tab = e.target.closest?.('.seg-tabs .tab');
  if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const tabs = $$('.seg-tabs .tab');
    const i = tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
    const n = tabs[(i + tabs.length) % tabs.length];
    n.focus();
    n.click();
  }
  if (e.key === 'Escape') closeDrawer();
});

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'search-form') {
    e.preventDefault();
    const q = String(new FormData(e.target).get('q') || '').trim();
    go(P.search + (q ? '?q=' + encodeURIComponent(q) : ''));
    return;
  }
  if (e.target.id !== 'quote-form') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const num = (k) => (String(fd.get(k) || '').trim() === '' ? null : Number(String(fd.get(k)).replace(',', '.')));
  const w = num('w');
  const l = num('l');
  const h = num('h');
  const errs = [];
  $$('#quote-form .input').forEach((i) => i.removeAttribute('aria-invalid'));
  const bad = (id, msg) => {
    errs.push(msg);
    $('#' + id).setAttribute('aria-invalid', 'true');
  };
  if (!w || w < 40 || w > 250) bad('q-w', 'Larghezza: inserisci un valore tra 40 e 250 cm.');
  if (!l || l < 100 || l > 250) bad('q-l', 'Lunghezza: inserisci un valore tra 100 e 250 cm.');
  if (h !== null && (h < 5 || h > 45)) bad('q-h', 'Altezza: inserisci un valore tra 5 e 45 cm, oppure lascia vuoto.');
  $('#q-err').textContent = errs.join(' ');
  if (errs.length) return $('[aria-invalid="true"]')?.focus();
  const idx = pub();
  const pid = fd.get('product');
  const p = idx.products.get(pid);
  const b2b = fd.get('b2b') === 'on';
  const notesExtra = b2b ? [num('rooms') ? `Camere/posti letto: ${num('rooms')}` : '', num('qty') ? `Quantità: ${num('qty')}` : ''].filter(Boolean).join('. ') : '';
  const notes = [notesExtra, String(fd.get('notes') || '').slice(0, 500)].filter(Boolean).join('. ');
  const r = await api.createQuoteRequest({ product_id: p?.id ?? null, product: p?.name ?? 'Da definire con il cliente', width_cm: w, length_cm: l, height_cm: h, notes, b2b });
  const text = buildQuoteMessage({ ref: r.ref, product: (b2b ? '[Struttura ricettiva] ' : '') + (p?.name ?? 'Da definire'), width_cm: w, length_cm: l, height_cm: h, notes });
  state.lastSummary = text;
  const n = normalizeWhatsAppNumber(whatsappStatus().raw);
  const plan = { url: n.ok ? `https://wa.me/${n.digits}?text=${encodeURIComponent(text)}` : null, text, short: false };
  $('#quote-out').innerHTML = `<h2 style="font-size:1.3rem">Richiesta pronta: ${esc(r.ref)}</h2><pre class="msg-preview">${esc(text)}</pre><div id="wa-status" aria-live="polite"></div>${waBlock(plan, r.ref, 'quote')}`;
  $('#quote-out h2').setAttribute('tabindex', '-1');
  $('#quote-out h2').focus();
});

// Strumento di verifica (sola lettura) usato dai test: conteggi e prezzi del catalogo pubblico
window.__vs = {
  stats() {
    const idx = catalog();
    const byKind = {};
    let total = 0;
    for (const p of idx.publicProducts()) {
      const n = idx.purchasableVariants(p).length;
      byKind[idx.kind(p)] = (byKind[idx.kind(p)] ?? 0) + n;
      total += n;
    }
    return { total, byKind, products: idx.publicProducts().map((p) => p.slug) };
  },
  /** Pagine indicizzabili e relative immagini: usato da scripts/build_site.mjs per generare il sito e la sitemap. */
  routes() {
    const idx = catalog();
    const imgs = (p) => mediaFor(idx, p).map((m) => media.resolve(m)).filter((x) => x && !/^(blob|idb):/.test(x)).map(absAsset);
    return [
      { path: P.home, images: [absAsset(SHARE_IMG)] },
      ...idx.commercialCategories().map((c) => ({ path: catPath(c) })),
      ...idx.publicProducts().map((p) => ({ path: prodPath(p), images: imgs(p) })),
      ...[P.sleepMatch, P.compare, P.sizes, P.quote, P.showroom].map((path) => ({ path })),
      ...(offersOn(idx) ? [{ path: P.offers }, ...publicBundles(idx).map((b) => ({ path: bundlePath(b), images: imgs(bundleMattress(idx, b)).slice(0, 1) }))] : []),
      ...Object.keys(PAGES).map((path) => ({ path })),
    ];
  },
  /** Offerte: prezzo di un carrello [[slug, size, height, qty]] con le regole in pagina (test). */
  offer(lines) {
    const idx = catalog();
    const vs = lines.map(([slug, size, h, qty = 1]) => {
      const p = idx.publicProducts().find((x) => x.slug === slug);
      const v = p && idx.purchasableVariants(p).find((x) => x.size === size && (h == null || x.height_cm === h));
      return { variant_id: v?.id, qty };
    });
    const r = priceCart(idx, vs.filter((x) => x.variant_id), offerCfg(idx));
    return { subtotal: r.subtotal_cents / 100, discount: r.discount_cents / 100, total: r.total_cents / 100 };
  },
  price(slug, height, size) {
    const idx = catalog();
    const p = idx.publicProducts().find((x) => x.slug === slug);
    const v = p && idx.purchasableVariants(p).find((x) => x.size === size && (height === null || x.height_cm === height));
    return v ? v.price_cents / 100 : null;
  },
};

// ---------------------------------------------------------------- AVVIO
$('#menu-btn').addEventListener('click', () => {
  const d = $('#drawer');
  d.classList.add('is-open');
  $('#menu-btn').setAttribute('aria-expanded', 'true');
  $('#drawer a')?.focus();
});
$('#drawer .drawer__scrim').addEventListener('click', closeDrawer);
$('#drawer-close').addEventListener('click', closeDrawer);
setNavigator(route);
interceptLinks(resolveProductPath);
window.addEventListener(MODE === 'path' ? 'popstate' : 'hashchange', route);
if (MODE === 'path') window.addEventListener('hashchange', () => current().legacy !== undefined && route());
window.addEventListener('resize', () => requestAnimationFrame(moveThumb));
store.subscribe((why) => {
  if (why === 'cart' || why === 'settings' || why === 'catalog') renderChrome();
});
window.addEventListener('vs:rerender', route);
// Avvio: si disegna SUBITO. Le foto caricate dall'admin (IndexedDB) arrivano dopo,
// con un tempo massimo: in alcuni frame isolati IndexedDB non risponde mai.
applySettings(store.db.settings);
// un tocco o un tasto saltano l'entrata
if (document.documentElement.classList.contains('vs-intro')) {
  const skip = () => document.documentElement.classList.add('vs-intro-skip');
  $('.vs-curtain')?.addEventListener('click', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });
}
route();
(async () => {
  const hasLocalPhotos = store.db.media.some((m) => m.src.startsWith('idb:'));
  await Promise.race([media.init(), new Promise((r) => setTimeout(r, 1500))]);
  if (hasLocalPhotos) route();
  if (!store.storageOk) toast('Il browser blocca il salvataggio locale: carrello e admin non verranno ricordati');
  // Catalogo dal database. La pagina è già disegnata con il catalogo compilato: se Supabase
  // risponde si ridisegna con i dati veri, se non risponde non succede niente e resta quello.
  if (sbConfigured()) {
    try {
      const cat = await Promise.race([sbLoadCatalog(), new Promise((_, rej) => setTimeout(() => rej(new Error('tempo scaduto')), 4000))]);
      if (cat?.products?.length) {
        applyRemoteCatalog(cat);
        route();
      }
    } catch (e) {
      console.warn('Catalogo dal database non disponibile, resta quello compilato:', e.message);
    }
  }
})();


__exp.route = route;
});
__req("app.js");
})();
