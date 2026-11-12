import { formatCents, formatSize } from './catalog.js';

/** Oltre questa lunghezza di URL alcuni client troncano: si passa al messaggio breve. */
export const WA_MAX_URL = 1900;

export type NumberCheck = { ok: true; digits: string } | { ok: false; reason: string };

/** Accetta solo numeri in formato internazionale (prefisso paese obbligatorio), senza indovinarlo. */
export function normalizeWhatsAppNumber(raw: string | null | undefined): NumberCheck {
  if (!raw || !String(raw).trim()) return { ok: false, reason: 'Numero non configurato.' };
  let s = String(raw).trim().replace(/[\s().-]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('00')) s = s.slice(2);
  else return { ok: false, reason: 'Inserisci il numero con il prefisso internazionale, per esempio +39…' };
  if (!/^\d{8,15}$/.test(s)) return { ok: false, reason: 'Il numero deve contenere da 8 a 15 cifre dopo il prefisso.' };
  if (s.startsWith('0')) return { ok: false, reason: 'Il prefisso internazionale non può iniziare con 0.' };
  return { ok: true, digits: s };
}

export interface SummaryLine {
  name: string;
  size: string | null;
  height_cm: number | null;
  sku: string;
  qty: number;
  unit_cents: number;
}
export interface RequestSummary {
  ref: string;
  lines: SummaryLine[];
  total_cents: number;
  shipping_note?: string | null;
}

function lineText(l: SummaryLine, i: number): string {
  const spec = [l.size ? formatSize(l.size) : null, l.height_cm ? `H${l.height_cm}` : null].filter(Boolean).join(', ');
  return `${i + 1}) ${l.name}${spec ? ' – ' + spec : ''}\n   SKU ${l.sku} · ${l.qty} × ${formatCents(l.unit_cents)} = ${formatCents(l.unit_cents * l.qty)}`;
}

/** Riepilogo completo: è anche il testo del pulsante "Copia il riepilogo". Nessun dato personale. */
export function buildFullMessage(s: RequestSummary): string {
  return [
    'Ciao Vesuvio Sleep, vorrei confermare questa richiesta dal sito.',
    `Riferimento: ${s.ref}`,
    '',
    ...s.lines.map(lineText),
    '',
    `Totale: ${formatCents(s.total_cents)} (IVA inclusa)`,
    ...(s.shipping_note ? [`Spedizione: ${s.shipping_note}`] : []),
    '',
    'Attendo la vostra conferma su disponibilità e consegna.',
  ].join('\n');
}

export function buildShortMessage(s: RequestSummary): string {
  const n = s.lines.reduce((a, l) => a + l.qty, 0);
  return [
    'Ciao Vesuvio Sleep, vorrei confermare una richiesta dal sito.',
    `Riferimento: ${s.ref}`,
    `${n} articoli, totale ${formatCents(s.total_cents)} (IVA inclusa).`,
    'Incollo qui sotto il riepilogo completo copiato dal sito.',
  ].join('\n');
}

export function waLink(digits: string, text: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export interface WaPlan {
  /** null se il numero non è valido: in quel caso si offre solo la copia. */
  url: string | null;
  text: string;
  short: boolean;
  fullText: string;
  numberError: string | null;
}

export function planWhatsApp(rawNumber: string | null | undefined, s: RequestSummary): WaPlan {
  const full = buildFullMessage(s);
  const num = normalizeWhatsAppNumber(rawNumber);
  if (!num.ok) return { url: null, text: full, short: false, fullText: full, numberError: num.reason };
  const fullUrl = waLink(num.digits, full);
  if (fullUrl.length <= WA_MAX_URL) return { url: fullUrl, text: full, short: false, fullText: full, numberError: null };
  const short = buildShortMessage(s);
  return { url: waLink(num.digits, short), text: short, short: true, fullText: full, numberError: null };
}

export interface QuoteSummary {
  ref: string;
  product: string;
  width_cm: number;
  length_cm: number;
  height_cm: number | null;
  notes: string;
}
export function buildQuoteMessage(q: QuoteSummary): string {
  return [
    'Ciao Vesuvio Sleep, vorrei un preventivo per un fuori misura.',
    `Riferimento: ${q.ref}`,
    `Prodotto: ${q.product}`,
    `Misura: ${q.width_cm}×${q.length_cm} cm${q.height_cm ? `, altezza ${q.height_cm} cm` : ''}`,
    ...(q.notes.trim() ? [`Note: ${q.notes.trim()}`] : []),
  ].join('\n');
}

/** Riferimento leggibile e univoco: VS-R-20261112-7KQ4 (richiesta) o VS-Q-… (preventivo). */
export function makeRef(prefix: 'R' | 'Q', date: Date, rand: () => number = Math.random): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(rand() * alphabet.length)];
  const d = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `VS-${prefix}-${d}-${code}`;
}
