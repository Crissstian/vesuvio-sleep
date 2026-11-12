// Tipi di dominio condivisi tra preview statica e futura app Next.js.
// Rispecchiano le tabelle in supabase/migrations.

export type PublishStatus = 'draft' | 'published' | 'archived';
export type Availability = 'available' | 'in_production' | 'made_to_order' | 'unavailable';
export type CategoryKind = 'materasso' | 'rete' | 'guanciale' | 'topper' | 'letto';
export type MediaSlot = 'hero' | 'exploded' | 'fabric' | 'extra';

export interface Category {
  id: string;
  slug: string;
  kind: CategoryKind;
  name: string;
  description: string;
  sort: number;
  status: PublishStatus;
  seo_title?: string;
  seo_description?: string;
}

/** Tratti usati da Sleep Match e dal confronto: solo dati documentati. */
export interface MatchTraits {
  tech: 'foam' | 'memory' | 'molle';
  /** 0 = più sostenuto, 2 = più accogliente (scala interna, mai pubblicata). */
  welcome: number;
  ventilation: boolean;
  independent_springs: boolean;
}

export interface Product {
  id: string;
  slug: string;
  category_id: string;
  name: string;
  technical_name: string;
  short: string;
  description: string;
  composition: string;
  highlights: string[];
  claims: string[];
  removable_cover: boolean | null;
  reversible: boolean | null;
  summer_winter: boolean | null;
  hybrid: boolean;
  firmness_display: string | null;
  line_code: string;
  status: PublishStatus;
  sort: number;
  lead_time: string | null;
  seo_title?: string;
  seo_description?: string;
  match?: MatchTraits | null;
  /** Note interne admin (conflitti, campi da verificare). Mai pubbliche. */
  internal_notes?: string;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  /** "160x190" oppure null per articoli senza misura (guanciali). */
  size: string | null;
  height_cm: number | null;
  /** Prezzo IVA inclusa in centesimi. null = non acquistabile. */
  price_cents: number | null;
  availability: Availability;
  active: boolean;
  sort: number;
}

export interface Media {
  id: string;
  product_id: string;
  slot: MediaSlot;
  src: string;
  srcset?: string;
  alt: string;
  caption?: string;
  illustrative: boolean;
  is_cover: boolean;
  published: boolean;
  sort: number;
  focal_x: number;
  focal_y: number;
  width?: number;
  height?: number;
}

export interface CatalogSnapshot {
  categories: Category[];
  products: Product[];
  variants: Variant[];
  media: Media[];
}

export interface CartItem {
  variant_id: string;
  qty: number;
  /** Prezzo visto al momento dell'aggiunta, per segnalare variazioni. */
  seen_price_cents: number | null;
}
