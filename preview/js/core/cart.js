import { isVariantPurchasable } from './catalog.js';
import { priceCart } from './offers.js';
export const MAX_QTY = 20;
/**
 * Ricontrolla prezzo, pubblicazione e disponibilità. In produzione la stessa
 * logica gira lato server (funzione SQL validate_cart / route handler).
 */
export function validateCart(idx, items, cfg = null) {
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
        discount_cents: l.discount_cents,
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
