import type { CategoryKind, Product, Variant } from './types.js';
import type { CatalogIndex } from './catalog.js';

/** Regole del prompt: mai un altro materasso come complemento di un materasso. */
export const PAIRING_RULES: Record<CategoryKind, CategoryKind[]> = {
  materasso: ['rete', 'guanciale', 'topper'],
  rete: ['materasso'],
  guanciale: ['materasso', 'topper'],
  topper: ['materasso', 'guanciale'],
  letto: [],
};

const SIZED: CategoryKind[] = ['materasso', 'rete', 'topper'];

export interface PairingItem {
  product: Product;
  /** Variante esatta da aggiungere (stessa misura) oppure undefined: si mostra "da" e si apre la scheda. */
  variant?: Variant;
  fromPrice: number;
}
export interface PairingGroup {
  kind: CategoryKind;
  items: PairingItem[];
}

export function pairingsFor(idx: CatalogIndex, product: Product, selectedSize: string | null, excludeVariantIds: string[] = []): PairingGroup[] {
  const kind = idx.kind(product);
  if (!kind) return [];
  const groups: PairingGroup[] = [];
  const seen = new Set<string>([product.id]);
  for (const target of PAIRING_RULES[kind]) {
    const items: PairingItem[] = [];
    for (const p of idx.publicProducts(target)) {
      if (seen.has(p.id)) continue;
      let variant: Variant | undefined;
      if (SIZED.includes(target) && SIZED.includes(kind) && selectedSize) {
        // compatibilità dimensionale: solo la stessa misura, altrimenti si salta
        variant = idx.cheapestAtSize(p, selectedSize);
        if (!variant) continue;
      } else if (!SIZED.includes(target)) {
        const vs = idx.purchasableVariants(p);
        variant = vs.length === 1 ? vs[0] : undefined;
      }
      if (variant && excludeVariantIds.includes(variant.id)) continue;
      const fromPrice = variant ? (variant.price_cents as number) : (idx.minPrice(p) as number);
      seen.add(p.id);
      items.push({ product: p, variant, fromPrice });
    }
    if (items.length) groups.push({ kind: target, items });
  }
  return groups;
}
