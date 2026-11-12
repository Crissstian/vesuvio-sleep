/** Regole del prompt: mai un altro materasso come complemento di un materasso. */
export const PAIRING_RULES = {
    materasso: ['rete', 'guanciale', 'topper'],
    rete: ['materasso'],
    guanciale: ['materasso', 'topper'],
    topper: ['materasso', 'guanciale'],
    letto: [],
};
const SIZED = ['materasso', 'rete', 'topper'];
export function pairingsFor(idx, product, selectedSize, excludeVariantIds = []) {
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
