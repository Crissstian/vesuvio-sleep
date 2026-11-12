export const STANDARD_SIZES = ['80x190', '90x200', '120x190', '140x190', '160x190', '165x190', '170x200', '180x200'];
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
export function formatCents(cents) {
    return eur.format(cents / 100);
}
/** "1.234,50" / "220" / "220.5" -> centesimi; null se non valido. */
export function parseEuroToCents(input) {
    const s = String(input).trim().replace(/\s|€/g, '');
    if (!s)
        return null;
    const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    if (!/^\d+(\.\d{1,2})?$/.test(norm))
        return null;
    return Math.round(parseFloat(norm) * 100);
}
export function formatSize(size) {
    return size ? size.replace('x', '×') : '';
}
export function parseSize(size) {
    const m = /^(\d{2,3})x(\d{3})$/.exec(size);
    return m ? { w: Number(m[1]), l: Number(m[2]) } : null;
}
// --- SKU (Master Spec §13) ---
export function mattressSku(line, height, size) {
    return `VS-${line}-H${height}-${size.replace('x', '')}`;
}
export function baseSku(line, size) {
    return `VS-RETE-${line}-${size.replace('x', '')}`;
}
export function pillowSku(line) {
    return `VS-GUA-${line}`;
}
/** Proposta per i topper: non definita nel Master Spec, da confermare. */
export function topperSku(line, size) {
    return `VS-TOP-${line}-${size.replace('x', '')}`;
}
export function customSku(date, id) {
    const d = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `VS-CUSTOM-${d}-${id}`;
}
export function skuFor(kind, line, size, height) {
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
export const AVAILABILITY_LABEL = {
    available: 'Disponibile',
    in_production: 'In produzione',
    made_to_order: 'Realizzato su ordinazione',
    unavailable: 'Non acquistabile online',
};
// --- Regole di acquistabilità ---
export function isVariantPurchasable(v, p, c) {
    return (v.active &&
        v.price_cents !== null &&
        v.price_cents > 0 &&
        v.availability !== 'unavailable' &&
        p.status === 'published' &&
        !!c &&
        c.status === 'published');
}
export class CatalogIndex {
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
