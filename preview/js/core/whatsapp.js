import { formatCents, formatSize } from './catalog.js';
/** Oltre questa lunghezza di URL alcuni client troncano: si passa al messaggio breve. */
export const WA_MAX_URL = 1900;
/** Accetta solo numeri in formato internazionale (prefisso paese obbligatorio), senza indovinarlo. */
export function normalizeWhatsAppNumber(raw) {
    if (!raw || !String(raw).trim())
        return { ok: false, reason: 'Numero non configurato.' };
    let s = String(raw).trim().replace(/[\s().-]/g, '');
    if (s.startsWith('+'))
        s = s.slice(1);
    else if (s.startsWith('00'))
        s = s.slice(2);
    else
        return { ok: false, reason: 'Inserisci il numero con il prefisso internazionale, per esempio +39…' };
    if (!/^\d{8,15}$/.test(s))
        return { ok: false, reason: 'Il numero deve contenere da 8 a 15 cifre dopo il prefisso.' };
    if (s.startsWith('0'))
        return { ok: false, reason: 'Il prefisso internazionale non può iniziare con 0.' };
    return { ok: true, digits: s };
}
function lineText(l, i) {
    const spec = [l.size ? formatSize(l.size) : null, l.height_cm ? `H${l.height_cm}` : null].filter(Boolean).join(', ');
    return `${i + 1}) ${l.name}${spec ? ' – ' + spec : ''}\n   SKU ${l.sku} · ${l.qty} × ${formatCents(l.unit_cents)} = ${formatCents(l.unit_cents * l.qty)}`;
}
/** "Vantaggio letto completo 160×190: −25,00 €" (× 3 se si applica più volte). */
export function offerText(o) {
    const where = o.size ? ` ${formatSize(o.size)}` : '';
    const times = o.count > 1 ? ` (× ${o.count})` : '';
    return `${o.label}${where}${times}: −${formatCents(o.amount_cents)}`;
}
/** Riepilogo completo: è anche il testo del pulsante "Copia il riepilogo". Nessun dato personale. */
export function buildFullMessage(s) {
    const disc = s.discount_cents ?? 0;
    return [
        'Ciao Vesuvio Sleep, vorrei confermare questa richiesta dal sito.',
        `Riferimento: ${s.ref}`,
        '',
        ...s.lines.map(lineText),
        '',
        ...(disc > 0
            ? [`Subtotale: ${formatCents(s.subtotal_cents ?? s.total_cents + disc)}`, ...(s.offers ?? []).map(offerText)]
            : []),
        `Totale: ${formatCents(s.total_cents)} (IVA inclusa)`,
        ...(s.shipping_note ? [`Spedizione: ${s.shipping_note}`] : []),
        ...(s.payment ? [`Pagamento: ${s.payment}`] : []),
        '',
        'Attendo la vostra conferma su disponibilità e consegna.',
    ].join('\n');
}
export function buildShortMessage(s) {
    const n = s.lines.reduce((a, l) => a + l.qty, 0);
    return [
        'Ciao Vesuvio Sleep, vorrei confermare una richiesta dal sito.',
        `Riferimento: ${s.ref}`,
        `${n} articoli, totale ${formatCents(s.total_cents)} (IVA inclusa${(s.discount_cents ?? 0) > 0 ? `, vantaggio di ${formatCents(s.discount_cents)} già applicato` : ''}).`,
        ...(s.payment ? [`Pagamento: ${s.payment}`] : []),
        'Incollo qui sotto il riepilogo completo copiato dal sito.',
    ].join('\n');
}
export function waLink(digits, text) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
export function planWhatsApp(rawNumber, s) {
    const full = buildFullMessage(s);
    const num = normalizeWhatsAppNumber(rawNumber);
    if (!num.ok)
        return { url: null, text: full, short: false, fullText: full, numberError: num.reason };
    const fullUrl = waLink(num.digits, full);
    if (fullUrl.length <= WA_MAX_URL)
        return { url: fullUrl, text: full, short: false, fullText: full, numberError: null };
    const short = buildShortMessage(s);
    return { url: waLink(num.digits, short), text: short, short: true, fullText: full, numberError: null };
}
export function buildQuoteMessage(q) {
    return [
        'Ciao Vesuvio Sleep, vorrei un preventivo per un fuori misura.',
        `Riferimento: ${q.ref}`,
        `Prodotto: ${q.product}`,
        `Misura: ${q.width_cm}×${q.length_cm} cm${q.height_cm ? `, altezza ${q.height_cm} cm` : ''}`,
        ...(q.notes.trim() ? [`Note: ${q.notes.trim()}`] : []),
    ].join('\n');
}
/** Riferimento leggibile e univoco: VS-R-20261112-7KQ4 (richiesta) o VS-Q-… (preventivo). */
export function makeRef(prefix, date, rand = Math.random) {
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++)
        code += alphabet[Math.floor(rand() * alphabet.length)];
    const d = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `VS-${prefix}-${d}-${code}`;
}
