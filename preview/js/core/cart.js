import { isVariantPurchasable } from './catalog.js';
export const MAX_QTY = 20;
/**
 * Ricontrolla prezzo, pubblicazione e disponibilità. In produzione la stessa
 * logica gira lato server (funzione SQL validate_cart / route handler).
 */
export function validateCart(idx, items) {
    const lines = items.map((item) => {
        const variant = idx.variants.get(item.variant_id);
        const product = variant ? idx.products.get(variant.product_id) : undefined;
        if (!variant || !product)
            return { item, status: 'missing', unit_cents: null, message: 'Questo articolo non è più nel catalogo.' };
        if (!isVariantPurchasable(variant, product, idx.category(product)))
            return { item, status: 'unavailable', product, variant, unit_cents: null, message: 'Questa configurazione non è più acquistabile online.' };
        const unit = variant.price_cents;
        if (item.seen_price_cents !== null && item.seen_price_cents !== unit)
            return { item, status: 'price_changed', product, variant, unit_cents: unit, message: 'Il prezzo è cambiato da quando lo hai aggiunto. Controlla e conferma.' };
        return { item, status: 'ok', product, variant, unit_cents: unit, message: null };
    });
    const total = lines.reduce((a, l) => a + (l.status === 'ok' ? l.unit_cents * l.item.qty : 0), 0);
    const issues = lines.filter((l) => l.status !== 'ok').length;
    return { lines, total_cents: total, canSubmit: lines.length > 0 && issues === 0, issues };
}
export function toSummaryLines(v) {
    return v.lines
        .filter((l) => l.status === 'ok')
        .map((l) => ({
        name: l.product.name,
        size: l.variant.size,
        height_cm: l.variant.height_cm,
        sku: l.variant.sku,
        qty: l.item.qty,
        unit_cents: l.unit_cents,
    }));
}
export function addToCart(items, variant, qty = 1) {
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
