import type { CartItem, Product, Variant } from './types.js';
import { isVariantPurchasable, type CatalogIndex } from './catalog.js';
import type { SummaryLine } from './whatsapp.js';
import { priceCart, type AppliedOffer, type OfferConfig } from './offers.js';

export type LineStatus = 'ok' | 'price_changed' | 'unavailable' | 'missing';

export interface ValidatedLine {
  item: CartItem;
  status: LineStatus;
  product?: Product;
  variant?: Variant;
  unit_cents: number | null;
  /** quota di sconto delle offerte abbinate su questa riga (tutta la quantità) */
  discount_cents: number;
  message: string | null;
}

export interface CartValidation {
  lines: ValidatedLine[];
  /** somma dei prezzi di listino delle righe valide */
  subtotal_cents: number;
  discount_cents: number;
  /** quanto si paga: subtotale meno sconto */
  total_cents: number;
  offers: AppliedOffer[];
  canSubmit: boolean;
  issues: number;
}

export const MAX_QTY = 20;

/**
 * Ricontrolla prezzo, pubblicazione e disponibilità. In produzione la stessa
 * logica gira lato server (funzione SQL validate_cart / route handler).
 */
export function validateCart(idx: CatalogIndex, items: CartItem[], cfg: OfferConfig | null = null): CartValidation {
  const lines: ValidatedLine[] = items.map((item) => {
    const variant = idx.variants.get(item.variant_id);
    const product = variant ? idx.products.get(variant.product_id) : undefined;
    if (!variant || !product)
      return { item, status: 'missing', unit_cents: null, discount_cents: 0, message: 'Questo articolo non è più nel catalogo.' };
    if (!isVariantPurchasable(variant, product, idx.category(product)))
      return { item, status: 'unavailable', product, variant, unit_cents: null, discount_cents: 0, message: 'Questa configurazione non è più acquistabile online.' };
    const unit = variant.price_cents as number;
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

export function toSummaryLines(v: CartValidation): SummaryLine[] {
  return v.lines
    .filter((l) => l.status === 'ok')
    .map((l) => ({
      name: l.product!.name,
      size: l.variant!.size,
      height_cm: l.variant!.height_cm,
      sku: l.variant!.sku,
      qty: l.item.qty,
      unit_cents: l.unit_cents as number,
      discount_cents: l.discount_cents,
    }));
}

export function addToCart(items: CartItem[], variant: Variant, qty = 1): CartItem[] {
  const out = items.map((i) => ({ ...i }));
  const ex = out.find((i) => i.variant_id === variant.id);
  if (ex) {
    ex.qty = Math.min(MAX_QTY, ex.qty + qty);
    ex.seen_price_cents = variant.price_cents;
  } else out.push({ variant_id: variant.id, qty: Math.min(MAX_QTY, qty), seen_price_cents: variant.price_cents });
  return out;
}
