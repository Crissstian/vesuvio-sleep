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
  /**
   * Famiglia commerciale per le offerte abbinate: decide la percentuale del letto completo.
   * null = il prodotto non partecipa alle offerte. È una scelta commerciale, non tecnica.
   */
  bundle_family?: BundleFamily | null;
  /** Note interne admin (conflitti, campi da verificare). Mai pubbliche. */
  internal_notes?: string;
}

export type BundleFamily = 'foam' | 'pocket';
export type OfferStatus = 'draft' | 'active' | 'paused';
/** Codici delle regole: uno per tipo di logica. */
export type OfferCode = 'letto-completo' | 'letti-multipli' | 'accessori' | 'per-due' | 'coppia-guanciali' | 'tetto';

/** Una regola di sconto. I numeri stanno in params e si cambiano da Admin. */
export interface OfferRule {
  id: string;
  code: OfferCode;
  label: string;
  description: string;
  params: Record<string, unknown>;
  status: OfferStatus;
  starts_at: string | null;
  ends_at: string | null;
  sort: number;
}

export type BundleTheme = 'elite' | 'classic' | 'start';

/** Un'offerta abbinata in vetrina (es. "Letto Elite"): i prodotti e la misura di partenza. */
export interface Bundle {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  theme: BundleTheme;
  /** Misure ammesse; null = tutte quelle in cui i pezzi obbligatori sono acquistabili. */
  sizes: string[] | null;
  default_size: string;
  status: PublishStatus;
  sort: number;
  seo_title?: string;
  seo_description?: string;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  /** Altezza proposta per il materasso; null = la più bassa acquistabile. */
  height_cm: number | null;
  qty: number;
  /** Pezzo facoltativo (es. topper): il cliente decide se includerlo. */
  optional: boolean;
  sort: number;
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
  /** Offerte abbinate: regole di calcolo e vetrine. Facoltative per compatibilità. */
  offers?: OfferRule[];
  bundles?: Bundle[];
  bundle_items?: BundleItem[];
  /** Interruttore generale (impostazione offers_enabled). */
  offers_enabled?: boolean;
}

export interface CartItem {
  variant_id: string;
  qty: number;
  /** Prezzo visto al momento dell'aggiunta, per segnalare variazioni. */
  seen_price_cents: number | null;
}
