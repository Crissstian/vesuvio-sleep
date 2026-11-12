import type { Availability, CatalogSnapshot, Category, CategoryKind, Product, Variant } from './types.js';

export const STANDARD_SIZES = ['80x190', '90x200', '120x190', '140x190', '160x190', '165x190', '170x200', '180x200'];

const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
export function formatCents(cents: number): string {
  return eur.format(cents / 100);
}
/** "1.234,50" / "220" / "220.5" -> centesimi; null se non valido. */
export function parseEuroToCents(input: string): number | null {
  const s = String(input).trim().replace(/\s|€/g, '');
  if (!s) return null;
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  if (!/^\d+(\.\d{1,2})?$/.test(norm)) return null;
  return Math.round(parseFloat(norm) * 100);
}

export function formatSize(size: string | null): string {
  return size ? size.replace('x', '×') : '';
}
export function parseSize(size: string): { w: number; l: number } | null {
  const m = /^(\d{2,3})x(\d{3})$/.exec(size);
  return m ? { w: Number(m[1]), l: Number(m[2]) } : null;
}

// --- SKU (Master Spec §13) ---
export function mattressSku(line: string, height: number, size: string): string {
  return `VS-${line}-H${height}-${size.replace('x', '')}`;
}
export function baseSku(line: string, size: string): string {
  return `VS-RETE-${line}-${size.replace('x', '')}`;
}
export function pillowSku(line: string): string {
  return `VS-GUA-${line}`;
}
/** Proposta per i topper: non definita nel Master Spec, da confermare. */
export function topperSku(line: string, size: string): string {
  return `VS-TOP-${line}-${size.replace('x', '')}`;
}
export function customSku(date: Date, id: string): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `VS-CUSTOM-${d}-${id}`;
}
export function skuFor(kind: CategoryKind, line: string, size: string | null, height: number | null): string {
  if (kind === 'materasso' && size && height) return mattressSku(line, height, size);
  if (kind === 'rete' && size) return baseSku(line, size);
  if (kind === 'topper' && size) return topperSku(line, size);
  if (kind === 'guanciale') return pillowSku(line);
  return `VS-${line}${size ? '-' + size.replace('x', '') : ''}${height ? '-H' + height : ''}`;
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Disponibile',
  in_production: 'In produzione',
  made_to_order: 'Realizzato su ordinazione',
  unavailable: 'Non acquistabile online',
};

// --- Regole di acquistabilità ---
export function isVariantPurchasable(v: Variant, p: Product, c: Category | undefined): boolean {
  return (
    v.active &&
    v.price_cents !== null &&
    v.price_cents > 0 &&
    v.availability !== 'unavailable' &&
    p.status === 'published' &&
    !!c &&
    c.status === 'published'
  );
}

export class CatalogIndex {
  readonly byProduct = new Map<string, Variant[]>();
  readonly products = new Map<string, Product>();
  readonly categories = new Map<string, Category>();
  readonly variants = new Map<string, Variant>();
  constructor(public snap: CatalogSnapshot) {
    for (const c of snap.categories) this.categories.set(c.id, c);
    for (const p of snap.products) this.products.set(p.id, p);
    for (const v of snap.variants) {
      this.variants.set(v.id, v);
      const arr = this.byProduct.get(v.product_id) ?? [];
      arr.push(v);
      this.byProduct.set(v.product_id, arr);
    }
    for (const arr of this.byProduct.values()) arr.sort((a, b) => a.sort - b.sort);
  }
  category(p: Product) {
    return this.categories.get(p.category_id);
  }
  kind(p: Product): CategoryKind | undefined {
    return this.category(p)?.kind;
  }
  variantsOf(p: Product, onlyActive = true): Variant[] {
    const all = this.byProduct.get(p.id) ?? [];
    return onlyActive ? all.filter((v) => v.active) : all;
  }
  purchasableVariants(p: Product): Variant[] {
    const c = this.category(p);
    return this.variantsOf(p).filter((v) => isVariantPurchasable(v, p, c));
  }
  isProductPurchasable(p: Product): boolean {
    return this.purchasableVariants(p).length > 0;
  }
  minPrice(p: Product): number | null {
    const prices = this.purchasableVariants(p).map((v) => v.price_cents as number);
    return prices.length ? Math.min(...prices) : null;
  }
  maxPrice(p: Product): number | null {
    const prices = this.purchasableVariants(p).map((v) => v.price_cents as number);
    return prices.length ? Math.max(...prices) : null;
  }
  /** Prodotti pubblici: pubblicati, in categoria pubblicata, con almeno una variante acquistabile. */
  publicProducts(kind?: CategoryKind): Product[] {
    return this.snap.products
      .filter((p) => p.status === 'published' && this.category(p)?.status === 'published')
      .filter((p) => !kind || this.kind(p) === kind)
      .filter((p) => this.isProductPurchasable(p))
      .sort((a, b) => a.sort - b.sort);
  }
  /** Categorie da mostrare nel menu commerciale: solo con articoli acquistabili. */
  commercialCategories(): Category[] {
    return this.snap.categories
      .filter((c) => c.status === 'published')
      .filter((c) => this.publicProducts(c.kind).length > 0)
      .sort((a, b) => a.sort - b.sort);
  }
  sizesOf(p: Product): string[] {
    const s = new Set<string>();
    for (const v of this.variantsOf(p)) if (v.size) s.add(v.size);
    return STANDARD_SIZES.filter((x) => s.has(x)).concat([...s].filter((x) => !STANDARD_SIZES.includes(x)));
  }
  heightsOf(p: Product): number[] {
    const s = new Set<number>();
    for (const v of this.variantsOf(p)) if (v.height_cm) s.add(v.height_cm);
    return [...s].sort((a, b) => a - b);
  }
  findVariant(p: Product, size: string | null, height: number | null): Variant | undefined {
    return this.variantsOf(p).find((v) => (v.size ?? null) === (size ?? null) && (v.height_cm ?? null) === (height ?? null));
  }
  purchasableHeights(p: Product): number[] {
    const s = new Set<number>();
    for (const v of this.purchasableVariants(p)) if (v.height_cm) s.add(v.height_cm);
    return [...s].sort((a, b) => a - b);
  }
  /** Variante acquistabile più economica per una misura (es. abbinamenti). */
  cheapestAtSize(p: Product, size: string | null): Variant | undefined {
    return this.purchasableVariants(p)
      .filter((v) => (size ? v.size === size : true))
      .sort((a, b) => (a.price_cents as number) - (b.price_cents as number))[0];
  }
}
