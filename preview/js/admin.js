// Admin della PREVIEW. Stessa struttura dell'admin Supabase previsto:
// CRUD categorie/prodotti/varianti, media, richieste, impostazioni, storico.
// L'accesso qui è locale al browser (PBKDF2 + sessione); in produzione è Supabase Auth + RLS.

import { adminKey, go, P, legacyToPath, u as navHref } from './nav.js';
import { formatCents, formatSize, parseEuroToCents, skuFor, STANDARD_SIZES, buildSitemap, normalizeWhatsAppNumber, PROVIDERS, AVAILABILITY_LABEL, CatalogIndex, offerConfig, priceCart, refundForLine, MAX_RULE_PCT } from './core/index.js';
import { store, catalog, media, processUpload, whatsappStatus, REQUEST_STATUS, REQUEST_TYPE, api, applyRemoteCatalog, catalogSource } from './store.js';
import { configured as sbConfigured, currentUser as sbUser, signIn as sbSignIn, signOut as sbSignOut, sendRecovery as sbRecovery, isAdmin as sbIsAdmin, loadCatalog as sbLoad, pushCatalog as sbPush, SB } from './supabase.js';
import { SITE_SLOTS } from './slots.js';
import { esc, $, $$, toast, copyText, confirmDialog, openDialog, icon, slugify, fmtDate } from './ui.js';

const CRED = 'vs-admin-cred';
const SESSION = 'vs-admin-session';
const SESSION_MS = 8 * 3600 * 1000;
let root;
const db = () => store.db;

// ------------------------------------------------------------- accesso
function getCred() {
  try {
    return JSON.parse(localStorage.getItem(CRED) || 'null');
  } catch {
    return null;
  }
}
function isLogged() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION) || 'null');
    return s && s.exp > Date.now();
  } catch {
    return false;
  }
}
async function derive(pass, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256);
  const b64 = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8)));
  return { salt: b64(salt), hash: b64(bits) };
}
function startSession() {
  sessionStorage.setItem(SESSION, JSON.stringify({ exp: Date.now() + SESSION_MS }));
}

function viewLogin() {
  const cred = getCred();
  const noCrypto = !window.crypto?.subtle;
  root.innerHTML = `<div class="adm-login wrap section">
    <h1>${cred ? 'Accedi all\'admin' : 'Crea l\'accesso admin'}</h1>
    <p class="lead">${cred ? 'Inserisci la password che hai creato per questa anteprima.' : 'Prima volta: scegli una password per l\'admin di questa anteprima. Non esistono password predefinite.'}</p>
    <p class="note small">Accesso locale di anteprima: protegge l'admin in questo browser, non sostituisce l'autenticazione Supabase prevista per il sito reale.</p>
    ${noCrypto ? '<p class="note note--err">Questo browser non supporta la cifratura necessaria: apri l\'anteprima in un browser aggiornato.</p>' : ''}
    <form class="form" id="adm-login" novalidate>
      <div class="field"><label for="pw">Password</label><input class="input" type="password" id="pw" autocomplete="${cred ? 'current-password' : 'new-password'}" minlength="10" required></div>
      ${cred ? '' : '<div class="field"><label for="pw2">Ripeti la password</label><input class="input" type="password" id="pw2" autocomplete="new-password" required><span class="hint">Almeno 10 caratteri.</span></div>'}
      <p class="err-msg" id="login-err" role="alert"></p>
      <div><button class="btn btn--primary" ${noCrypto ? 'disabled' : ''}>${cred ? 'Accedi' : 'Crea accesso'}</button></div>
    </form>
    <p class="small muted" style="margin-top:24px"><a href="#">Torna al sito</a></p></div>`;
}

// ------------------------------------------------------------- layout
const SECTIONS = [
  ['admin', 'Panoramica'],
  ['admin-catalogo', 'Prodotti'],
  ['admin-categorie', 'Categorie'],
  ['admin-immagini', 'Immagini del sito'],
  ['admin-richieste', 'Richieste'],
  ['admin-offerte', 'Offerte'],
  ['admin-impostazioni', 'Impostazioni'],
  ['admin-storico', 'Storico'],
];
function shell(active, title, body, actions = '') {
  const waiting = db().requests.filter((r) => r.status === 'in_attesa_contatto').length;
  root.innerHTML = `<div class="adm">
    <nav class="adm__nav" aria-label="Admin">${SECTIONS.map(([h, l]) => `<a href="#${h}" ${h === active ? 'aria-current="page"' : ''}>${l}${h === 'admin-richieste' && waiting ? ` <span class="adm__pill">${waiting}</span>` : ''}</a>`).join('')}
      <button class="link-btn small" data-adm="logout">Esci</button></nav>
    <div class="adm__main"><div class="adm__head"><h1>${esc(title)}</h1><div class="btn-row">${actions}</div></div>${body}</div></div>`;
}

// ------------------------------------------------------------- panoramica
function blockers() {
  const out = [];
  const wa = whatsappStatus();
  if (!wa.check.ok) out.push(['err', 'Numero WhatsApp per le richieste non configurato: il sito permette solo di copiare il riepilogo.', '#admin-impostazioni', 'Configura']);
  for (const p of db().products) if (/CONFLICT/.test(p.internal_notes || '')) out.push(['warn', `${p.name}: prezzo in conflitto da confermare.`, `#admin-prodotto-${p.id}`, 'Apri']);
  const idx = catalog();
  const noPhoto = idx.publicProducts().filter((p) => !db().media.some((m) => m.product_id === p.id && m.published));
  if (noPhoto.length) out.push(['info', `${noPhoto.length} prodotti pubblicati senza foto confermate (si vede l'illustrazione di categoria): ${noPhoto.map((p) => p.name.replace('Vesuvio ', '')).join(', ')}.`, `#admin-prodotto-${noPhoto[0].id}`, 'Carica foto']);
  for (const p of db().products.filter((x) => x.status === 'published' && !idx.isProductPurchasable(x))) out.push(['warn', `${p.name}: pubblicato ma senza varianti acquistabili, quindi nascosto.`, `#admin-prodotto-${p.id}`, 'Apri']);
  if (db().settings.offers_enabled === true)
    out.push(['info', 'Offerte abbinate attive (beta): le percentuali sono una scelta prudente da confermare con i costi.', '#admin-offerte', 'Rivedi']);
  if (!media.available()) out.push(['warn', 'IndexedDB non disponibile: le foto caricate non resteranno dopo il ricaricamento.', null, null]);
  return out;
}
function viewOverview() {
  const d = db();
  const counts = {
    pub: d.products.filter((p) => p.status === 'published').length,
    draft: d.products.filter((p) => p.status === 'draft').length,
    waiting: d.requests.filter((r) => r.status === 'in_attesa_contatto').length,
    quotes: d.requests.filter((r) => r.type !== 'cart' && !['chiuso', 'annullato'].includes(r.status)).length,
  };
  const b = blockers();
  shell('admin', 'Panoramica', `
    <div class="adm-stats">
      <a href="#admin-catalogo"><strong>${counts.pub}</strong> prodotti pubblicati</a>
      <a href="#admin-catalogo"><strong>${counts.draft}</strong> bozze</a>
      <a href="#admin-richieste"><strong>${counts.waiting}</strong> richieste in attesa di contatto</a>
      <a href="#admin-richieste"><strong>${counts.quotes}</strong> preventivi aperti</a>
    </div>
    <h2 class="adm-h2">Da sistemare prima del lancio</h2>
    ${b.length ? `<ul class="adm-list">${b.map(([k, t, h, l]) => `<li class="adm-row adm-row--${k}"><span>${esc(t)}</span>${h ? `<a class="btn btn--ghost btn--sm" href="${h}">${l}</a>` : ''}</li>`).join('')}</ul>` : '<p class="note note--ok">Nessun blocco rilevato.</p>'}
    <h2 class="adm-h2">Bozze in attesa di dati</h2>
    <ul class="adm-list">${d.products.filter((p) => p.status === 'draft').map((p) => `<li class="adm-row"><span><strong>${esc(p.name)}</strong><br><span class="small muted">${esc(p.internal_notes || '')}</span></span><a class="btn btn--ghost btn--sm" href="#admin-prodotto-${p.id}">Modifica</a></li>`).join('') || '<li class="adm-row">Nessuna bozza</li>'}</ul>`);
}

// ------------------------------------------------------------- prodotti
const STATUS_LABEL = { draft: 'Bozza', published: 'Pubblicato', archived: 'Archiviato' };
function viewCatalog() {
  const d = db();
  const idx = catalog();
  const q = (sessionStorage.getItem('adm-q') || '').toLowerCase();
  const st = sessionStorage.getItem('adm-st') || 'all';
  const list = d.products
    .filter((p) => (st === 'all' ? true : p.status === st))
    .filter((p) => !q || (p.name + ' ' + p.slug + ' ' + p.technical_name).toLowerCase().includes(q))
    .sort((a, b) => (d.categories.find((c) => c.id === a.category_id)?.sort ?? 0) - (d.categories.find((c) => c.id === b.category_id)?.sort ?? 0) || a.sort - b.sort);
  shell('admin-catalogo', 'Prodotti', `
    <div class="adm-filters"><input class="input" type="search" placeholder="Cerca per nome o slug" value="${esc(q)}" data-adm-input="q" aria-label="Cerca prodotti">
      <select class="input" data-adm-change="st" aria-label="Stato">${[['all', 'Tutti gli stati'], ...Object.entries(STATUS_LABEL)].map(([v, l]) => `<option value="${v}" ${st === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="adm-table" role="table" aria-label="Prodotti">
      <div class="adm-tr adm-tr--h" role="row"><span role="columnheader">Prodotto</span><span role="columnheader">Categoria</span><span role="columnheader">Varianti</span><span role="columnheader">Prezzo</span><span role="columnheader">Stato</span></div>
      ${list.map((p) => {
        const c = d.categories.find((x) => x.id === p.category_id);
        const all = idx.variantsOf(p, false);
        const ok = idx.purchasableVariants(p).length;
        const min = idx.minPrice(p);
        return `<a class="adm-tr" role="row" href="#admin-prodotto-${p.id}"><span role="cell"><strong>${esc(p.name)}</strong><br><span class="small muted">/${esc(p.slug)}</span></span><span role="cell">${esc(c?.name ?? '—')}</span><span role="cell">${ok}/${all.length} acquistabili</span><span role="cell">${min !== null ? 'da ' + formatCents(min) : '—'}</span><span role="cell"><span class="st st--${p.status}">${STATUS_LABEL[p.status]}</span></span></a>`;
      }).join('') || '<p class="muted" style="padding:16px">Nessun prodotto trovato.</p>'}
    </div>`, `<button class="btn btn--primary btn--sm" data-adm="new-product">Nuovo prodotto</button>`);
}

function variantRow(p, v, kind) {
  return `<div class="adm-var" data-vid="${esc(v.id)}">
    <label><span>Misura</span><input class="input" data-f="size" value="${esc(v.size ?? '')}" placeholder="160x190" ${kind === 'guanciale' ? 'disabled' : ''}></label>
    <label><span>Altezza cm</span><input class="input" data-f="height_cm" inputmode="numeric" value="${esc(v.height_cm ?? '')}"></label>
    <label class="adm-var__sku"><span>SKU</span><input class="input" data-f="sku" value="${esc(v.sku)}"></label>
    <label><span>Prezzo €</span><input class="input" data-f="price" inputmode="decimal" value="${v.price_cents !== null ? (v.price_cents / 100).toFixed(2).replace('.', ',') : ''}" placeholder="vuoto = non acquistabile"></label>
    <label><span>Disponibilità</span><select class="input" data-f="availability">${Object.entries(AVAILABILITY_LABEL).map(([k, l]) => `<option value="${k}" ${v.availability === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" data-f="active" ${v.active ? 'checked' : ''}> Attiva</label>
    <button type="button" class="icon-btn" data-adm="var-del" data-id="${esc(v.id)}" aria-label="Elimina variante ${esc(v.sku)}">${icon('trash', 20)}</button>
  </div>`;
}

function groupVariants(vs) {
  const map = new Map();
  for (const v of vs) {
    const k = v.height_cm ?? null;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  }
  return [...map.entries()];
}

function mediaCard(m, i, n) {
  const src = media.resolve(m);
  return `<div class="adm-media" data-mid="${esc(m.id)}">
    <div class="adm-media__img" data-adm="focal" data-id="${esc(m.id)}" title="Tocca per impostare il punto focale">
      ${src ? `<img src="${esc(src)}" alt="" style="object-position:${m.focal_x}% ${m.focal_y}%">` : `<div class="fallback">${icon('image', 40)}<span class="small">File non disponibile in questo browser</span></div>`}
      <span class="adm-focal" style="left:${m.focal_x}%;top:${m.focal_y}%" aria-hidden="true"></span>
      <span class="st ${m.published ? 'st--published' : 'st--draft'}">${m.published ? 'Pubblicata' : 'Bozza'}</span>
    </div>
    <div class="adm-media__crops" aria-label="Anteprima ritagli">${src ? `<figure><img src="${esc(src)}" alt="" style="aspect-ratio:4/3;object-fit:${m.illustrative ? 'contain' : 'cover'};object-position:${m.focal_x}% ${m.focal_y}%"><figcaption>Card 4:3</figcaption></figure><figure><img src="${esc(src)}" alt="" style="aspect-ratio:1;object-fit:${m.illustrative ? 'contain' : 'cover'};object-position:${m.focal_x}% ${m.focal_y}%"><figcaption>Carrello 1:1</figcaption></figure>` : ''}</div>
    <div class="adm-media__fields">
      <label><span>Slot</span><select class="input" data-mf="slot">${['hero', 'exploded', 'fabric', 'extra'].map((s) => `<option ${m.slot === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label><span>Testo alternativo</span><input class="input" data-mf="alt" value="${esc(m.alt)}" placeholder="Descrivi cosa si vede"></label>
      <label><span>Didascalia</span><input class="input" data-mf="caption" value="${esc(m.caption ?? '')}" placeholder="Es. Render illustrativo"></label>
      <label class="check"><input type="checkbox" data-mf="illustrative" ${m.illustrative ? 'checked' : ''}> Render o immagine illustrativa</label>
      <label class="check"><input type="radio" name="cover" data-mf="is_cover" ${m.is_cover ? 'checked' : ''}> Copertina</label>
    </div>
    <div class="adm-media__actions">
      <button type="button" class="icon-btn" data-adm="m-up" data-id="${esc(m.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Sposta prima">${icon('arrowUp', 20)}</button>
      <button type="button" class="icon-btn" data-adm="m-down" data-id="${esc(m.id)}" ${i === n - 1 ? 'disabled' : ''} aria-label="Sposta dopo">${icon('arrowDown', 20)}</button>
      <label class="btn btn--ghost btn--sm">Sostituisci<input type="file" accept="image/jpeg,image/png,image/webp" data-adm-file="replace" data-id="${esc(m.id)}" hidden></label>
      <button type="button" class="btn btn--sm ${m.published ? 'btn--ghost' : 'btn--primary'}" data-adm="m-pub" data-id="${esc(m.id)}">${m.published ? 'Nascondi' : 'Pubblica foto'}</button>
      <button type="button" class="btn btn--danger btn--sm" data-adm="m-del" data-id="${esc(m.id)}">Elimina</button>
    </div>
  </div>`;
}

function referencedProduct(id) {
  return db().requests.some((r) => r.items.some((i) => i.product_id === id) || r.quote?.product_id === id);
}
function referencedVariant(id) {
  return db().requests.some((r) => r.items.some((i) => i.variant_id === id));
}

function viewProductEdit(id) {
  const d = db();
  const p = d.products.find((x) => x.id === id);
  if (!p) return shell('admin-catalogo', 'Prodotto non trovato', '<p><a href="#admin-catalogo">Torna ai prodotti</a></p>');
  const c = d.categories.find((x) => x.id === p.category_id);
  const kind = c?.kind ?? 'materasso';
  const vs = d.variants.filter((v) => v.product_id === p.id).sort((a, b) => a.sort - b.sort);
  const ms = d.media.filter((m) => m.product_id === p.id).sort((a, b) => a.sort - b.sort);
  const idx = catalog();
  const purch = idx.purchasableVariants({ ...p, status: 'published' }).length;
  const canDelete = p.status === 'draft' && !referencedProduct(p.id);
  const actions = `${p.status !== 'published' ? `<button class="btn btn--primary btn--sm" data-adm="status" data-v="published">Pubblica</button>` : ''}
    ${p.status === 'published' ? `<button class="btn btn--ghost btn--sm" data-adm="status" data-v="draft">Riporta in bozza</button>` : ''}
    ${p.status !== 'archived' ? `<button class="btn btn--ghost btn--sm" data-adm="status" data-v="archived">Archivia</button>` : ''}
    ${canDelete ? `<button class="btn btn--danger btn--sm" data-adm="delete-product">Elimina bozza</button>` : ''}`;
  shell('admin-catalogo', p.name, `
    <p class="small"><a href="#admin-catalogo">← Prodotti</a> · Stato: <span class="st st--${p.status}">${STATUS_LABEL[p.status]}</span> · ${purch} varianti acquistabili
      ${p.status === 'published' && c?.status === 'published' ? ` · <a href="#prodotto-${esc(p.slug)}">Vedi sul sito</a>` : ''}
      · <button class="link-btn" data-adm="preview">Anteprima con bozze</button></p>
    ${p.internal_notes ? `<p class="note note--warn small"><strong>Note interne:</strong> ${esc(p.internal_notes)}</p>` : ''}
    <form id="adm-product" class="form adm-form" novalidate data-id="${esc(p.id)}">
      <section class="adm-card"><h2 class="adm-h2">Dati principali</h2>
        <div class="adm-grid">
          <div class="field"><label for="f-name">Nome</label><input class="input" id="f-name" name="name" value="${esc(p.name)}" required></div>
          <div class="field"><label for="f-slug">Slug</label><input class="input" id="f-slug" name="slug" value="${esc(p.slug)}" pattern="[a-z0-9-]+" required><span class="hint">Indirizzo della scheda: lettere minuscole, numeri e trattini.</span></div>
          <div class="field"><label for="f-cat">Categoria</label><select class="input" id="f-cat" name="category_id">${d.categories.map((x) => `<option value="${x.id}" ${x.id === p.category_id ? 'selected' : ''}>${esc(x.name)}${x.status !== 'published' ? ' (non pubblicata)' : ''}</option>`).join('')}</select></div>
          <div class="field"><label for="f-tech">Nome tecnico</label><input class="input" id="f-tech" name="technical_name" value="${esc(p.technical_name)}"></div>
          <div class="field"><label for="f-line">Codice linea (SKU)</label><input class="input" id="f-line" name="line_code" value="${esc(p.line_code)}"></div>
          <div class="field"><label for="f-sort">Ordinamento</label><input class="input" id="f-sort" name="sort" inputmode="numeric" value="${esc(p.sort)}"></div>
        </div>
        <div class="field"><label for="f-short">Descrizione breve</label><input class="input" id="f-short" name="short" value="${esc(p.short)}" maxlength="180"></div>
        <div class="field"><label for="f-desc">Descrizione</label><textarea class="textarea" id="f-desc" name="description">${esc(p.description)}</textarea></div>
        <div class="field"><label for="f-comp">Composizione</label><input class="input" id="f-comp" name="composition" value="${esc(p.composition)}"></div>
        <div class="adm-grid">
          <div class="field"><label for="f-hl">Punti chiave (uno per riga)</label><textarea class="textarea" id="f-hl" name="highlights">${esc((p.highlights || []).join('\n'))}</textarea></div>
          <div class="field"><label for="f-cl">Claim tessuto (uno per riga)</label><textarea class="textarea" id="f-cl" name="claims">${esc((p.claims || []).join('\n'))}</textarea><span class="hint">Pubblica solo claim verificati sull'etichetta.</span></div>
        </div>
        <div class="adm-grid">
          <div class="field"><label for="f-firm">Rigidità indicativa</label><input class="input" id="f-firm" name="firmness_display" value="${esc(p.firmness_display ?? '')}"></div>
          <div class="field"><label for="f-lead">Tempi</label><input class="input" id="f-lead" name="lead_time" value="${esc(p.lead_time ?? '')}" placeholder="Es. Produzione in circa 2 giorni"></div>
        </div>
        <div class="adm-checks">
          <label class="check"><input type="checkbox" name="removable_cover" ${p.removable_cover ? 'checked' : ''}> Sfoderabile</label>
          <label class="check"><input type="checkbox" name="summer_winter" ${p.summer_winter ? 'checked' : ''}> Lato estivo/invernale</label>
          <label class="check"><input type="checkbox" name="hybrid" ${p.hybrid ? 'checked' : ''}> Hybrid (molle + Memory)</label>
        </div>
        <div class="field"><label for="f-notes">Note interne (mai pubbliche)</label><textarea class="textarea" id="f-notes" name="internal_notes">${esc(p.internal_notes ?? '')}</textarea></div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">SEO</h2>
        <div class="field"><label for="f-st">Titolo SEO</label><input class="input" id="f-st" name="seo_title" value="${esc(p.seo_title ?? '')}" maxlength="70" placeholder="${esc(p.name)}"><span class="hint">Lascia vuoto per usare il nome. Max 70 caratteri.</span></div>
        <div class="field"><label for="f-sd">Descrizione SEO</label><textarea class="textarea" id="f-sd" name="seo_description" maxlength="160" placeholder="${esc(p.short)}">${esc(p.seo_description ?? '')}</textarea><span class="hint">Max 160 caratteri.</span></div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Varianti e prezzi</h2>
        <p class="small muted">Prezzi IVA inclusa. Una variante senza prezzo, disattivata o "non acquistabile" resta visibile ma disabilitata nella scheda.</p>
        <div id="adm-vars">${groupVariants(vs).map(([h, list], gi) => `<details class="adm-vgroup" ${gi === 0 || vs.length <= 8 ? 'open' : ''}><summary>${h === null ? 'Senza altezza' : 'H' + h} · ${list.length} varianti · ${list.filter((v) => v.price_cents !== null && v.active && v.availability !== 'unavailable').length} acquistabili</summary>${list.map((v) => variantRow(p, v, kind)).join('')}</details>`).join('') || '<p class="muted">Nessuna variante.</p>'}</div>
        <div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn--ghost btn--sm" data-adm="var-add">Aggiungi variante</button><button type="button" class="btn btn--ghost btn--sm" data-adm="var-grid">Genera griglia misure × altezze</button><button type="button" class="btn btn--ghost btn--sm" data-adm="var-sku">Rigenera SKU</button></div>
      </section>
      <div class="adm-save"><button class="btn btn--primary">Salva modifiche</button><span class="small muted" id="save-state"></span></div>
    </form>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Foto</h2>
      <p class="small muted">JPEG, PNG o WebP fino a 8 MB, almeno 400×300 px. Le foto nuove restano in bozza finché non le pubblichi; il testo alternativo è obbligatorio per pubblicare. Tocca un'immagine per scegliere il punto da tenere al centro nei ritagli.</p>
      <div id="adm-media">${ms.map((m, i) => mediaCard(m, i, ms.length)).join('') || '<p class="muted">Nessuna foto: sul sito si vede l\'illustrazione della categoria.</p>'}</div>
      <label class="btn btn--primary btn--sm" style="margin-top:12px">Carica foto<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-adm-file="new" hidden></label>
      <span class="small muted" id="upload-state" aria-live="polite"></span>
    </section>`, actions);
}

function readProductForm(form) {
  const p = db().products.find((x) => x.id === form.dataset.id);
  const fd = new FormData(form);
  const lines = (k) => String(fd.get(k) || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const errors = [];
  const name = String(fd.get('name')).trim();
  const slug = slugify(String(fd.get('slug')) || name);
  if (!name) errors.push('Il nome è obbligatorio.');
  if (db().products.some((x) => x.slug === slug && x.id !== p.id)) errors.push(`Lo slug "${slug}" è già usato.`);
  const next = {
    ...p,
    name,
    slug,
    category_id: String(fd.get('category_id')),
    technical_name: String(fd.get('technical_name')).trim(),
    line_code: String(fd.get('line_code')).trim().toUpperCase(),
    sort: Number(fd.get('sort')) || 0,
    short: String(fd.get('short')).trim(),
    description: String(fd.get('description')).trim(),
    composition: String(fd.get('composition')).trim(),
    highlights: lines('highlights'),
    claims: lines('claims'),
    firmness_display: String(fd.get('firmness_display')).trim() || null,
    lead_time: String(fd.get('lead_time')).trim() || null,
    removable_cover: fd.get('removable_cover') === 'on',
    summer_winter: fd.get('summer_winter') === 'on',
    hybrid: fd.get('hybrid') === 'on',
    internal_notes: String(fd.get('internal_notes')).trim(),
    seo_title: String(fd.get('seo_title')).trim(),
    seo_description: String(fd.get('seo_description')).trim(),
  };
  // varianti
  const vars = [];
  $$('.adm-var', form).forEach((row, i) => {
    const g = (f) => $(`[data-f="${f}"]`, row);
    const old = db().variants.find((v) => v.id === row.dataset.vid);
    const size = g('size').value.trim().toLowerCase().replace('×', 'x') || null;
    const h = g('height_cm').value.trim() ? Number(g('height_cm').value) : null;
    const priceRaw = g('price').value.trim();
    const price = priceRaw ? parseEuroToCents(priceRaw) : null;
    if (size && !/^\d{2,3}x\d{2,3}$/.test(size)) errors.push(`Riga ${i + 1}: misura non valida (usa 160x190).`);
    if (priceRaw && price === null) errors.push(`Riga ${i + 1}: prezzo non valido.`);
    if (h !== null && (!Number.isInteger(h) || h < 1 || h > 60)) errors.push(`Riga ${i + 1}: altezza non valida.`);
    vars.push({ ...(old ?? { id: row.dataset.vid, product_id: p.id }), size, height_cm: h, sku: g('sku').value.trim(), price_cents: price, availability: g('availability').value, active: g('active').checked, sort: i });
  });
  const skus = vars.map((v) => v.sku);
  if (skus.some((s) => !s)) errors.push('Ogni variante deve avere uno SKU.');
  const dup = skus.find((s, i) => s && skus.indexOf(s) !== i);
  if (dup) errors.push(`SKU duplicato: ${dup}.`);
  const others = db().variants.filter((v) => v.product_id !== p.id).map((v) => v.sku);
  const clash = skus.find((s) => others.includes(s));
  if (clash) errors.push(`Lo SKU ${clash} è già usato da un altro prodotto.`);
  return { p, next, vars, errors };
}

function saveProduct(form, { silent = false } = {}) {
  const { p, next, vars, errors } = readProductForm(form);
  if (errors.length) {
    openDialog({ title: 'Controlla i dati', body: `<ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`, actions: [{ label: 'Ho capito', primary: true }] });
    return false;
  }
  const d = db();
  // storico prezzi, utile per le future comunicazioni di riduzione prezzo
  for (const v of vars) {
    const old = d.variants.find((x) => x.id === v.id);
    if (old && old.price_cents !== v.price_cents) {
      d.price_history.unshift({ at: new Date().toISOString(), variant_id: v.id, sku: v.sku, old: old.price_cents, new: v.price_cents });
      store.audit('prezzo', v.sku, `${old.price_cents === null ? '—' : formatCents(old.price_cents)} → ${v.price_cents === null ? '—' : formatCents(v.price_cents)}`);
    }
  }
  d.variants = d.variants.filter((v) => v.product_id !== p.id).concat(vars);
  Object.assign(p, next);
  store.audit('modifica prodotto', p.name, 'Dati e varianti salvati');
  store.commit('catalog');
  if (!silent) toast('Modifiche salvate');
  return true;
}

// ------------------------------------------------------------- immagini del sito
function viewSiteImages() {
  const list = db().site_media;
  shell('admin-immagini', 'Immagini del sito', `
    <p class="small muted">Ogni spazio mostra un segnaposto finché non carichi e pubblichi una foto. Le foto restano in bozza fino alla pubblicazione; il testo alternativo è obbligatorio.</p>
    <div class="adm-slots">${SITE_SLOTS.map((def) => {
      const m = list.find((x) => x.slot === def.key);
      const src = (m && media.resolve(m)) || def.default?.src;
      return `<section class="adm-card adm-slot" data-slot="${def.key}">
        <h2 class="adm-h2" style="margin:0">${esc(def.label)}</h2>
        <figure class="ph ${src ? 'ph--photo' : ''}" style="--ratio:${def.ratio}">${src ? `<img src="${esc(src)}" alt="">` : `<div class="ph__inner">${icon('image', 26)}<span>${esc(def.hint)}</span></div>`}</figure>
        <p class="small" style="margin:0">${m ? `<span class="st ${m.published ? 'st--published' : 'st--draft'}">${m.published ? 'Pubblicata' : 'Bozza'}</span>` : def.default ? '<span class="st">Predefinita: immagine illustrativa</span>' : '<span class="st st--archived">Segnaposto</span>'}</p>
        ${m ? `<label class="field"><span class="lbl small">Testo alternativo</span><input class="input" data-sf="alt" value="${esc(m.alt)}" placeholder="Descrivi cosa si vede"></label>` : ''}
        <div class="btn-row">
          <label class="btn btn--ghost btn--sm">${m ? 'Sostituisci' : 'Carica foto'}<input type="file" accept="image/jpeg,image/png,image/webp" data-adm-sitefile="${def.key}" hidden></label>
          ${m ? `<button class="btn btn--sm ${m.published ? 'btn--ghost' : 'btn--primary'}" data-adm="s-pub" data-slot="${def.key}">${m.published ? 'Nascondi' : 'Pubblica'}</button><button class="btn btn--danger btn--sm" data-adm="s-del" data-slot="${def.key}">Rimuovi</button>` : ''}
        </div>
      </section>`;
    }).join('')}</div>`);
}

// ------------------------------------------------------------- categorie
function viewCategories() {
  const d = db();
  const idx = catalog();
  shell('admin-categorie', 'Categorie', `
    <p class="small muted">Una categoria pubblicata compare nel menu solo se contiene almeno un articolo acquistabile.</p>
    <form id="adm-cats" class="form" novalidate>
      ${d.categories.sort((a, b) => a.sort - b.sort).map((c) => `<div class="adm-card adm-cat" data-cid="${c.id}">
        <div class="adm-grid">
          <div class="field"><label>Nome</label><input class="input" data-c="name" value="${esc(c.name)}"></div>
          <div class="field"><label>Slug</label><input class="input" data-c="slug" value="${esc(c.slug)}"></div>
          <div class="field"><label>Tipo</label><select class="input" data-c="kind">${['materasso', 'rete', 'guanciale', 'topper', 'letto'].map((k) => `<option ${c.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
          <div class="field"><label>Ordine</label><input class="input" data-c="sort" inputmode="numeric" value="${c.sort}"></div>
          <div class="field"><label>Stato</label><select class="input" data-c="status">${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Descrizione</label><input class="input" data-c="description" value="${esc(c.description)}"></div>
        <p class="small muted" style="margin:0">${d.products.filter((p) => p.category_id === c.id).length} prodotti · ${idx.publicProducts(c.kind).length} acquistabili · ${idx.commercialCategories().some((x) => x.id === c.id) ? 'visibile nel menu' : 'nascosta dal menu'}
        ${d.products.some((p) => p.category_id === c.id) ? '' : ` · <button type="button" class="link-btn" data-adm="cat-del" data-id="${c.id}">Elimina</button>`}</p>
      </div>`).join('')}
      <div class="adm-save"><button class="btn btn--primary">Salva categorie</button></div>
    </form>`, `<button class="btn btn--ghost btn--sm" data-adm="cat-add">Nuova categoria</button>`);
}

// ------------------------------------------------------------- richieste
function viewRequests() {
  const d = db();
  const q = (sessionStorage.getItem('adm-rq') || '').toLowerCase();
  const st = sessionStorage.getItem('adm-rst') || 'all';
  const ty = sessionStorage.getItem('adm-rty') || 'all';
  const list = d.requests
    .filter((r) => (st === 'all' ? true : r.status === st))
    .filter((r) => (ty === 'all' ? true : r.type === ty))
    .filter((r) => !q || JSON.stringify([r.ref, r.items, r.quote, r.internal_notes, r.tracking]).toLowerCase().includes(q));
  shell('admin-richieste', 'Richieste e preventivi', `
    <p class="note small">Le richieste nascono quando un cliente genera il riepilogo. Aprire WhatsApp non prova che il messaggio sia arrivato: lo stato si cambia a mano dopo il contatto.</p>
    <div class="adm-filters">
      <input class="input" type="search" placeholder="Cerca per riferimento, SKU, note" value="${esc(q)}" data-adm-input="rq" aria-label="Cerca richieste">
      <select class="input" data-adm-change="rst" aria-label="Stato">${[['all', 'Tutti gli stati'], ...Object.entries(REQUEST_STATUS)].map(([v, l]) => `<option value="${v}" ${st === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="input" data-adm-change="rty" aria-label="Tipo">${[['all', 'Tutti i tipi'], ...Object.entries(REQUEST_TYPE)].map(([v, l]) => `<option value="${v}" ${ty === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="adm-table" role="table" aria-label="Richieste">
      <div class="adm-tr adm-tr--h" role="row"><span role="columnheader">Riferimento</span><span role="columnheader">Tipo</span><span role="columnheader">Contenuto</span><span role="columnheader">Totale</span><span role="columnheader">Stato</span></div>
      ${list.map((r) => `<a class="adm-tr" role="row" href="#admin-richiesta-${esc(r.ref)}"><span role="cell"><strong>${esc(r.ref)}</strong><br><span class="small muted">${fmtDate(r.created_at)}</span></span><span role="cell">${REQUEST_TYPE[r.type]}</span>
        <span role="cell" class="small">${r.items.length ? r.items.map((i) => `${i.qty}× ${esc(i.name.replace('Vesuvio ', ''))}${i.size ? ' ' + formatSize(i.size) : ''}`).join(', ') : esc(`${r.quote?.product ?? ''} ${r.quote?.width_cm}×${r.quote?.length_cm}${r.quote?.height_cm ? ' H' + r.quote.height_cm : ''}`)}</span>
        <span role="cell">${r.total_cents ? formatCents(r.total_cents) : r.quote?.price_cents ? formatCents(r.quote.price_cents) : '—'}</span><span role="cell"><span class="st st--req-${r.status}">${REQUEST_STATUS[r.status]}</span></span></a>`).join('') || '<div class="empty" style="margin:12px"><p>Nessuna richiesta. Le richieste compaiono quando un cliente arriva al riepilogo dal carrello o prepara un preventivo fuori misura.</p></div>'}
    </div>`);
}

function quoteReply(r) {
  const q = r.quote;
  return [
    `Ciao, grazie per la richiesta ${r.ref}.`,
    `${q.product}, misura ${q.width_cm}×${q.length_cm} cm${q.height_cm ? `, altezza ${q.height_cm} cm` : ''}.`,
    q.price_cents ? `Prezzo: ${formatCents(q.price_cents)} IVA inclusa.` : '',
    q.reply || '',
    'Se ti va bene, rispondi a questo messaggio e ti confermiamo l\'ordine.',
  ].filter(Boolean).join('\n');
}

function viewRequest(ref) {
  const r = db().requests.find((x) => x.ref === ref);
  if (!r) return shell('admin-richieste', 'Richiesta non trovata', '<p><a href="#admin-richieste">Torna alle richieste</a></p>');
  const q = r.quote;
  shell('admin-richieste', r.ref, `
    <p class="small"><a href="#admin-richieste">← Richieste</a> · ${REQUEST_TYPE[r.type]} · creata ${fmtDate(r.created_at)}</p>
    <form id="adm-request" class="form" data-ref="${esc(r.ref)}" novalidate>
      <div class="adm-grid2">
        <section class="adm-card">
          ${r.items.length ? `<h2 class="adm-h2">Articoli</h2><table class="size-table"><tbody>${r.items.map((i) => `<tr><td>${esc(i.name)}<br><span class="small muted">${i.size ? formatSize(i.size) : ''}${i.height_cm && i.size ? ' H' + i.height_cm : ''} · ${esc(i.sku)}</span></td><td>${i.qty}×</td><td style="text-align:right">${formatCents(i.unit_cents * i.qty)}${i.discount_cents ? `<br><span class="small" style="color:var(--lava-ink)">−${formatCents(i.discount_cents)} vantaggio</span>` : ''}</td></tr>`).join('')}
            ${r.discount_cents ? `<tr><td colspan="2">Subtotale</td><td style="text-align:right">${formatCents(r.subtotal_cents)}</td></tr>${(r.offers ?? []).map((o) => `<tr><td colspan="2" style="color:var(--lava-ink)">${esc(o.label)}${o.size ? ' ' + formatSize(o.size) : ''}${o.count > 1 ? ` × ${o.count}` : ''} (${o.pct} %)</td><td style="text-align:right;color:var(--lava-ink)">−${formatCents(o.amount_cents)}</td></tr>`).join('')}` : ''}
            <tr><td colspan="2"><strong>Totale</strong></td><td style="text-align:right"><strong>${formatCents(r.total_cents)}</strong></td></tr></tbody></table>
            <details class="adm-pay" style="margin-top:14px"><summary><strong>Recesso parziale</strong> <span class="small muted">quanto rimborsare</span></summary>
              <p class="small">Indica quanti pezzi restituisce il cliente: si rimborsa quanto ha pagato per quei pezzi, compresa la loro quota di vantaggio. Sui pezzi che tiene il vantaggio resta suo.</p>
              ${r.items.map((i, k) => `<div class="field" style="display:flex;gap:10px;align-items:center"><input class="input" style="max-width:80px" type="number" min="0" max="${i.qty}" value="0" data-refund="${k}" aria-label="Pezzi restituiti: ${esc(i.name)}"><span class="small">${esc(i.name)} ${i.size ? formatSize(i.size) : ''} (su ${i.qty})</span></div>`).join('')}
              <p class="note small" id="refund-out" aria-live="polite">Rimborso: ${formatCents(0)}</p>
              <div class="btn-row"><button type="button" class="btn btn--ghost btn--sm" data-adm="refund-calc">Calcola</button><button type="button" class="btn btn--ghost btn--sm" data-adm="refund-log">Registra nello storico</button></div>
            </details>` : ''}
          ${q ? `<h2 class="adm-h2">Preventivo fuori misura</h2>
            <dl class="facts-list"><dt>Prodotto</dt><dd>${esc(q.product)}</dd><dt>Misura</dt><dd>${q.width_cm}×${q.length_cm} cm${q.height_cm ? `, H${q.height_cm}` : ''}</dd><dt>Note cliente</dt><dd>${esc(q.notes || '—')}</dd>${q.custom_sku ? `<dt>SKU personalizzato</dt><dd>${esc(q.custom_sku)}</dd>` : ''}</dl>
            <div class="adm-grid" style="margin-top:14px"><div class="field"><label for="r-price">Prezzo proposto €</label><input class="input" id="r-price" name="price" inputmode="decimal" value="${q.price_cents ? (q.price_cents / 100).toFixed(2).replace('.', ',') : ''}"></div>
              <div class="field"><label for="r-reply">Testo aggiuntivo (tempi, condizioni)</label><input class="input" id="r-reply" name="reply" value="${esc(q.reply)}"></div></div>
            <div class="btn-row"><button type="button" class="btn btn--ghost btn--sm" data-adm="copy-reply">${icon('copy', 18)} Copia la risposta per WhatsApp</button>${q.custom_sku ? '' : '<button type="button" class="btn btn--ghost btn--sm" data-adm="custom-sku">Genera SKU personalizzato</button>'}</div>
            <textarea class="textarea" id="copy-fallback" hidden readonly></textarea>
            <p class="small muted">Al lancio la conferma avviene su WhatsApp: nessun link di pagamento viene generato.</p>` : ''}
        </section>
        <section class="adm-card">
          <h2 class="adm-h2">Gestione</h2>
          <div class="field"><label for="r-status">Stato</label><select class="input" id="r-status" name="status">${Object.entries(REQUEST_STATUS).map(([k, l]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="r-tracking">Tracking spedizione</label><input class="input" id="r-tracking" name="tracking" value="${esc(r.tracking)}" placeholder="Corriere e codice"></div>
          <div class="field"><label for="r-notes">Note interne</label><textarea class="textarea" id="r-notes" name="internal_notes">${esc(r.internal_notes)}</textarea><span class="hint">Non salvare qui dati sanitari o di pagamento.</span></div>
          <div class="field"><label for="r-hnote">Nota per lo storico (facoltativa)</label><input class="input" id="r-hnote" name="hnote" placeholder="Es. Confermato su WhatsApp, consegna giovedì"></div>
          <button class="btn btn--primary">Salva</button>
          <h3 style="margin-top:22px;font-size:1rem">Storico</h3>
          <ol class="adm-history">${r.history.slice().reverse().map((h) => `<li><strong>${REQUEST_STATUS[h.status] ?? h.status}</strong> · ${fmtDate(h.at)} · ${esc(h.by)}${h.note ? `<br><span class="small muted">${esc(h.note)}</span>` : ''}</li>`).join('')}</ol>
        </section>
      </div>
    </form>`);
}

// ------------------------------------------------------------- offerte abbinate
const RULE_STATUS = { active: 'Attiva', paused: 'In pausa', draft: 'Bozza' };
function viewOfferAdmin() {
  const d = db();
  const rule = (c) => (d.offers ?? []).find((o) => o.code === c);
  const num = (name, val, label, hint = '%') =>
    `<div class="field" style="max-width:150px"><label for="o-${name}">${esc(label)}</label><div style="display:flex;align-items:center;gap:6px"><input class="input" id="o-${name}" name="${name}" inputmode="numeric" value="${val ?? ''}"><span class="small">${hint}</span></div></div>`;
  const st = (c) => `<div class="field" style="max-width:160px"><label for="o-st-${c}">Stato</label><select class="input" id="o-st-${c}" name="st-${c}">${['active', 'paused'].map((k) => `<option value="${k}" ${rule(c)?.status === k ? 'selected' : ''}>${RULE_STATUS[k]}</option>`).join('')}</select></div>`;
  const lc = rule('letto-completo')?.params ?? {};
  const lm = rule('letti-multipli')?.params ?? {};
  const ac = rule('accessori')?.params ?? {};
  const pd = rule('per-due')?.params ?? {};
  const tt = rule('tetto')?.params ?? {};
  const t = lm.tiers ?? [];
  // esempi con le regole salvate (anche a interruttore spento: servono a decidere)
  const idx = catalog();
  const cfg = offerConfig(d.offers, true);
  const V = (slug, size, h) => {
    const p = idx.snap.products.find((x) => x.slug === slug);
    return p && idx.purchasableVariants(p).find((v) => v.size === size && (h == null || v.height_cm === h));
  };
  const EX = [
    ['Memory Duo H25 + Rete Flex, 160×190', [['memory-duo', '160x190', 25, 1], ['rete-flex', '160x190', null, 1]]],
    ['Pocket 3000 Elite H25 + Rete Strong, 160×190', [['pocket-3000-elite', '160x190', 25, 1], ['rete-strong', '160x190', null, 1]]],
    ['Come sopra + Topper', [['pocket-3000-elite', '160x190', 25, 1], ['rete-strong', '160x190', null, 1], ['topper-memory-cloud-5', '160x190', 5, 1]]],
    ['Eco H20 + Rete Flex, 80×190', [['eco', '80x190', 20, 1], ['rete-flex', '80x190', null, 1]]],
    ['3 letti Memory Duo 90×200 + Rete Flex', [['memory-duo', '90x200', 25, 3], ['rete-flex', '90x200', null, 3]]],
    ['5 letti Pocket 1600 90×200 + Rete Flex', [['pocket-1600', '90x200', 25, 5], ['rete-flex', '90x200', null, 5]]],
  ];
  const exRows = EX.map(([label, lines]) => {
    const vs = lines.map(([slug, size, h, qty]) => ({ v: V(slug, size, h), qty }));
    if (vs.some((x) => !x.v)) return '';
    const r = priceCart(idx, vs.map((x) => ({ variant_id: x.v.id, qty: x.qty })), cfg);
    return `<tr><td>${esc(label)}</td><td style="text-align:right">${formatCents(r.subtotal_cents)}</td><td style="text-align:right;color:var(--lava-ink)">−${formatCents(r.discount_cents)}</td><td style="text-align:right"><strong>${formatCents(r.total_cents)}</strong></td><td style="text-align:right">${r.subtotal_cents ? ((100 * r.discount_cents) / r.subtotal_cents).toFixed(1).replace('.', ',') : 0} %</td></tr>`;
  }).join('');
  shell('admin-offerte', 'Offerte abbinate', `
    <form id="adm-offers" class="form" novalidate>
      <section class="adm-card"><h2 class="adm-h2">Interruttore</h2>
        <label class="check"><input type="checkbox" name="offers_enabled" ${d.settings.offers_enabled === true ? 'checked' : ''}> Offerte attive sul sito (schede «Letti completi», sconti nel carrello e nel riepilogo)</label>
        <p class="small muted">Spento: nessuno sconto, nessuna scheda offerta, prezzi come da listino. Il database applica la stessa scelta quando ricalcola il carrello.</p>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Letto completo</h2>
        <p class="small muted">Materasso e rete della stessa misura. Percentuale sul totale dei due, arrotondata ai 5 €.</p>
        <div class="adm-filters">${st('letto-completo')}${num('lc-foam', lc.pct?.foam, 'Schiuma (Eco, Memory)')}${num('lc-pocket', lc.pct?.pocket, 'Molle (Pocket)')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Più letti nello stesso ordine</h2>
        <p class="small muted">Vale la percentuale più alta tra questa e quella del letto completo, su ogni letto dell'ordine.</p>
        <div class="adm-filters">${st('letti-multipli')}${num('t1-min', t[0]?.min_sets, 'Da letti', 'letti')}${num('t1-pct', t[0]?.pct, 'Sconto')}${num('t2-min', t[1]?.min_sets, 'Da letti', 'letti')}${num('t2-pct', t[1]?.pct, 'Sconto')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Accessori</h2>
        <p class="small muted">Il topper della stessa misura di un letto completo; i guanciali (fino a ${ac.guanciali_per_letto ?? 2} per letto) quando avranno un prezzo.</p>
        <div class="adm-filters">${st('accessori')}${num('ac-topper', ac.pct?.topper, 'Topper')}${num('ac-guanciale', ac.pct?.guanciale, 'Guanciali')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Per due</h2>
        <p class="small muted">Due materassi uguali nello stesso ordine, senza rete.</p>
        <div class="adm-filters">${st('per-due')}${num('pd-foam', pd.pct?.foam, 'Schiuma')}${num('pd-pocket', pd.pct?.pocket, 'Molle')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Tetto di sicurezza</h2>
        <p class="small muted">Nessun carrello va oltre questa percentuale di sconto complessivo, qualunque cosa si scriva sopra.</p>
        <div class="adm-filters">${num('tt-pct', tt.pct, 'Tetto')}</div>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Vetrine</h2>
        <table class="size-table"><thead><tr><th>Offerta</th><th>Stato</th><th></th></tr></thead><tbody>${(d.bundles ?? [])
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((b) => `<tr><td><strong>${esc(b.name)}</strong><br><span class="small muted">${esc(b.tagline)}</span></td><td><select class="input" name="b-${esc(b.id)}" aria-label="Stato di ${esc(b.name)}">${['published', 'draft', 'archived'].map((k) => `<option value="${k}" ${b.status === k ? 'selected' : ''}>${STATUS_LABEL[k]}</option>`).join('')}</select></td><td><a class="small" href="${navHref('/offerte/' + b.slug + '/')}" target="_blank" rel="noopener">Apri</a></td></tr>`)
          .join('')}</tbody></table>
      </section>
      <div class="adm-save"><button class="btn btn--primary">Salva le offerte</button></div>
    </form>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Esempi con le regole salvate</h2>
      <p class="small muted">Prezzi reali del listino. Ogni punto percentuale sul Pocket 3000 con rete vale circa 8 €.</p>
      <table class="size-table"><thead><tr><th>Carrello</th><th style="text-align:right">Listino</th><th style="text-align:right">Sconto</th><th style="text-align:right">Totale</th><th style="text-align:right">%</th></tr></thead><tbody>${exRows}</tbody></table>
      <p class="small muted">Le percentuali sono una scelta prudente fatta senza conoscere i margini: da confermare con l'azienda.</p>
    </section>`);
}
function readOfferForm(f) {
  const fd = new FormData(f);
  const errs = [];
  const n = (k, label, { min = 0, max = MAX_RULE_PCT } = {}) => {
    const raw = String(fd.get(k) ?? '').trim();
    const v = Number(raw);
    if (!/^\d+$/.test(raw) || v < min || v > max) {
      errs.push(`${label}: un numero intero tra ${min} e ${max}`);
      $('#o-' + k)?.setAttribute('aria-invalid', 'true');
    }
    return v;
  };
  $$('#adm-offers [aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
  const out = {
    'letto-completo': { pct: { foam: n('lc-foam', 'Letto completo, schiuma'), pocket: n('lc-pocket', 'Letto completo, molle') }, round_eur: 5 },
    'letti-multipli': {
      tiers: [
        { min_sets: n('t1-min', 'Primo scaglione, letti', { min: 2, max: 50 }), pct: n('t1-pct', 'Primo scaglione, sconto') },
        { min_sets: n('t2-min', 'Secondo scaglione, letti', { min: 2, max: 50 }), pct: n('t2-pct', 'Secondo scaglione, sconto') },
      ],
      quote_from_sets: 10,
    },
    accessori: { pct: { topper: n('ac-topper', 'Topper'), guanciale: n('ac-guanciale', 'Guanciali') }, guanciali_per_letto: 2, round_eur: 1 },
    'per-due': { pct: { foam: n('pd-foam', 'Per due, schiuma'), pocket: n('pd-pocket', 'Per due, molle') }, round_eur: 5 },
    tetto: { pct: n('tt-pct', 'Tetto') },
  };
  const [a, b] = out['letti-multipli'].tiers;
  if (!errs.length && b.min_sets <= a.min_sets) errs.push('Il secondo scaglione deve partire da più letti del primo');
  return { errs, params: out, fd };
}
const OFFER_FIELDS = { 'letto-completo': ['lc-foam', 'lc-pocket'], 'letti-multipli': ['t1-min', 't1-pct', 't2-min', 't2-pct'], accessori: ['ac-topper', 'ac-guanciale'], 'per-due': ['pd-foam', 'pd-pocket'], tetto: ['tt-pct'] };

// ------------------------------------------------------------- impostazioni
function viewSettings() {
  const s = db().settings;
  const wa = whatsappStatus();
  shell('admin-impostazioni', 'Impostazioni', `
    <form id="adm-settings" class="form" novalidate>
      <section class="adm-card"><h2 class="adm-h2">WhatsApp per le richieste</h2>
        ${wa.source === 'env' ? `<p class="note">Il numero è impostato dalla configurazione d'ambiente e prevale su questo campo.</p>` : ''}
        <div class="field"><label for="s-wa">Numero WhatsApp aziendale</label><input class="input" id="s-wa" name="whatsapp_number" value="${esc(s.whatsapp_number)}" placeholder="+39 …" inputmode="tel" aria-describedby="s-wa-h"><span class="hint" id="s-wa-h">Con prefisso internazionale. Se è vuoto il sito offre solo "Copia il riepilogo".</span></div>
        <p class="${wa.check.ok ? 'note note--ok' : 'note note--warn'} small" id="wa-check">${wa.check.ok ? `Attivo: i link si aprono su wa.me/${esc(wa.check.digits)}` : esc(wa.check.reason)}</p>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Contatti pubblici</h2>
        <div class="field"><label for="s-phone">Telefono</label><input class="input" id="s-phone" name="public_phone" value="${esc(s.public_phone || '')}" placeholder="+39 …" inputmode="tel"></div>
        <div class="field"><label for="s-mail">Email</label><input class="input" id="s-mail" name="contact_email" type="email" value="${esc(s.contact_email || '')}"></div>
        <p class="small muted">Compaiono nel footer, nella pagina Contatti, nelle condizioni di vendita e nell'informativa privacy.</p>
      </section>
      <section class="adm-card"><h2 class="adm-h2">Testi e condizioni</h2>
        <div class="field"><label for="s-ship">Spedizione (testo pubblico)</label><input class="input" id="s-ship" name="shipping_note" value="${esc(s.shipping_note)}"></div>
        <label class="check"><input type="checkbox" name="show_claims" ${s.show_claims ? 'checked' : ''}> Mostra i claim del tessuto nelle schede (antiacaro, ipoallergenico, Free Humidity)</label>
      </section>
      <div class="adm-save"><button class="btn btn--primary">Salva impostazioni</button></div>
    </form>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Pagamenti online</h2>
      <p class="small">Predisposti e disattivati. Al lancio le richieste si confermano solo su WhatsApp: nessun metodo è visibile al cliente e nessuna sessione di pagamento può essere creata.</p>
      ${Object.values(PROVIDERS).map((pv) => `<details class="adm-pay"><summary><strong>${esc(pv.label)}</strong> <span class="st st--archived">Disattivato</span></summary><ul class="small">${pv.requirements.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}
    </section>
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Sitemap del sito reale</h2>
      <p class="small muted">Generata solo con le pagine pubblicabili. Non viene servita da questa anteprima, che resta non indicizzata.</p>
      <div class="adm-filters"><input class="input" id="sm-base" value="https://vesuviosleep.it" aria-label="Dominio"><button class="btn btn--ghost btn--sm" data-adm="sitemap">Genera</button></div>
      <textarea class="textarea" id="sm-out" readonly rows="6" aria-label="Sitemap" hidden></textarea>
    </section>
    ${databaseCard()}
    <section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Dati dell'anteprima</h2>
      <p class="small muted">Catalogo, richieste e foto sono salvati solo in questo browser.</p>
      <div class="btn-row"><button class="btn btn--ghost btn--sm" data-adm="export">Esporta i dati in JSON</button><button class="btn btn--danger btn--sm" data-adm="reset">Ripristina i dati iniziali</button></div>
      <textarea class="textarea" id="export-out" readonly rows="6" hidden aria-label="Esportazione"></textarea>
    </section>`);
}

/** Stato del collegamento a Supabase: da dove arriva il catalogo e che cosa si può fare. */
function databaseCard() {
  if (!sbConfigured())
    return `<section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Database</h2>
      <p class="small muted">Nessun collegamento configurato: il sito usa il catalogo compilato nel bundle.
      Si attiva mettendo <code>supabaseUrl</code> e <code>supabaseKey</code> in <code>js/config.js</code>.</p></section>`;
  const da = catalogSource() === 'supabase';
  const u = sbUser();
  return `<section class="adm-card" style="margin-top:20px"><h2 class="adm-h2">Database</h2>
    <p class="note ${da ? 'note--ok' : 'note--warn'} small" id="db-state">${da
      ? `Il catalogo che stai guardando arriva dal <strong>database</strong>${db().catalog_at ? ` (letto ${esc(fmtDate(db().catalog_at))})` : ''}.`
      : 'Il catalogo che stai guardando è quello <strong>compilato nel sito</strong>: il database non ha risposto, oppure non è stato ancora letto.'}</p>
    <p class="small muted">Progetto: <code>${esc(SB.url.replace('https://', ''))}</code>. La chiave in pagina è quella pubblicabile: che cosa si legge e si scrive lo decidono le policy del database.</p>
    <div class="btn-row"><button class="btn btn--ghost btn--sm" data-adm="db-pull">Rileggi dal database</button></div>
    <hr class="adm-hr">
    ${u
      ? `<p class="small">Collegato come <strong>${esc(u.email)}</strong>. <span id="db-admin"></span></p>
         <div class="btn-row"><button class="btn btn--primary btn--sm" data-adm="db-push">Pubblica il catalogo sul database</button><button class="btn btn--ghost btn--sm" data-adm="db-signout">Esci</button></div>
         <p class="small muted">«Pubblica» manda al database prodotti, varianti, foto, offerte e impostazioni come li vedi qui. Le foto caricate in questo browser non partono: non esiste ancora un file da collegare.</p>`
      : `<div class="field"><label for="db-mail">Email</label><input class="input" id="db-mail" type="email" autocomplete="username"></div>
         <div class="field"><label for="db-pw">Password</label><input class="input" id="db-pw" type="password" autocomplete="current-password"></div>
         <p class="err-msg" id="db-err" role="alert"></p>
         <div class="btn-row"><button class="btn btn--primary btn--sm" data-adm="db-signin">Accedi al database</button><button class="btn btn--ghost btn--sm" data-adm="db-recover">Non ho una password</button></div>
         <p class="small muted">Il primo amministratore nasce senza password: usa «Non ho una password» e la imposti dal link che ricevi per email.</p>`}
  </section>`;
}

function viewAudit() {
  const a = db().audit;
  shell('admin-storico', 'Storico delle modifiche', `<ol class="adm-history">${a.map((x) => `<li><strong>${esc(x.action)}</strong> · ${esc(x.entity)} · ${fmtDate(x.at)}<br><span class="small muted">${esc(x.detail ?? '')}</span></li>`).join('') || '<li class="muted">Ancora nessuna modifica.</li>'}</ol>
    ${db().price_history.length ? `<h2 class="adm-h2" style="margin-top:24px">Storico prezzi</h2><ol class="adm-history">${db().price_history.map((h) => `<li>${esc(h.sku)}: ${h.old === null ? '—' : formatCents(h.old)} → ${h.new === null ? '—' : formatCents(h.new)} · ${fmtDate(h.at)}</li>`).join('')}</ol>` : ''}`);
}

// ------------------------------------------------------------- router admin
export async function render(app) {
  root = app;
  bind();
  const r = adminKey();
  if (!isLogged()) return viewLogin();
  let m;
  if (r === 'admin') viewOverview();
  else if (r === 'admin-catalogo') viewCatalog();
  else if ((m = /^admin-prodotto-(.+)$/.exec(r))) viewProductEdit(m[1]);
  else if (r === 'admin-categorie') viewCategories();
  else if (r === 'admin-immagini') viewSiteImages();
  else if (r === 'admin-richieste') viewRequests();
  else if ((m = /^admin-richiesta-(.+)$/.exec(r))) viewRequest(m[1]);
  else if (r === 'admin-impostazioni') viewSettings();
  else if (r === 'admin-offerte') viewOfferAdmin();
  else if (r === 'admin-storico') viewAudit();
  else viewOverview();
  document.title = 'Admin | Vesuvio Sleep (anteprima)';
}
const rerender = () => render(root);
const currentProductId = () => $('#adm-product')?.dataset.id;

// ------------------------------------------------------------- eventi
let bound = false;
function bind() {
  if (bound) return;
  bound = true;
  const inAdmin = () => document.body.classList.contains('is-admin');

  document.addEventListener('submit', async (e) => {
    if (!inAdmin()) return;
    const f = e.target;
    e.preventDefault();
    if (f.id === 'adm-login') {
      const pw = $('#pw').value;
      const err = $('#login-err');
      const cred = getCred();
      try {
        if (!cred) {
          if (pw.length < 10) return (err.textContent = 'La password deve avere almeno 10 caratteri.');
          if (pw !== $('#pw2').value) return (err.textContent = 'Le due password non coincidono.');
          const d = await derive(pw);
          localStorage.setItem(CRED, JSON.stringify(d));
          store.audit('accesso', 'admin', 'Creato l\'accesso admin dell\'anteprima');
          store.commit();
        } else {
          const d = await derive(pw, cred.salt);
          if (d.hash !== cred.hash) return (err.textContent = 'Password non corretta.');
        }
        startSession();
        rerender();
      } catch {
        err.textContent = 'Impossibile salvare l\'accesso: il browser blocca l\'archiviazione locale.';
      }
    }
    if (f.id === 'adm-product') {
      if (saveProduct(f)) rerender();
    }
    if (f.id === 'adm-cats') {
      const d = db();
      const errs = [];
      $$('.adm-cat', f).forEach((row) => {
        const c = d.categories.find((x) => x.id === row.dataset.cid);
        const g = (k) => $(`[data-c="${k}"]`, row).value.trim();
        const slug = slugify(g('slug') || g('name'));
        if (!g('name')) errs.push('Ogni categoria deve avere un nome.');
        if (d.categories.some((x) => x.slug === slug && x.id !== c.id)) errs.push(`Slug duplicato: ${slug}`);
        if (['admin', 'carrello', 'riepilogo', 'confronto', 'showroom', 'sleep-match', 'guida-misure', 'fuori-misura'].includes(slug) || slug.startsWith('prodotto-')) errs.push(`Lo slug "${slug}" è riservato.`);
        Object.assign(c, { name: g('name'), slug, kind: g('kind'), sort: Number(g('sort')) || 0, status: g('status'), description: g('description') });
      });
      if (errs.length) return toast(errs[0]);
      store.audit('modifica categorie', 'catalogo', 'Categorie aggiornate');
      store.commit('catalog');
      toast('Categorie salvate');
      rerender();
    }
    if (f.id === 'adm-request') {
      const r = db().requests.find((x) => x.ref === f.dataset.ref);
      const fd = new FormData(f);
      const status = String(fd.get('status'));
      const hnote = String(fd.get('hnote') || '').trim();
      if (r.quote) {
        const raw = String(fd.get('price') || '').trim();
        const c = raw ? parseEuroToCents(raw) : null;
        if (raw && c === null) return toast('Prezzo non valido');
        r.quote.price_cents = c;
        r.quote.reply = String(fd.get('reply') || '').trim();
      }
      if (status !== r.status || hnote) r.history.push({ at: new Date().toISOString(), status, by: 'admin', note: hnote });
      r.status = status;
      r.tracking = String(fd.get('tracking') || '').trim();
      r.internal_notes = String(fd.get('internal_notes') || '').trim();
      r.updated_at = new Date().toISOString();
      store.audit('richiesta', r.ref, `Stato: ${REQUEST_STATUS[status]}`);
      store.commit('requests');
      toast('Richiesta aggiornata');
      rerender();
    }
    if (f.id === 'adm-offers') {
      const { errs, params, fd } = readOfferForm(f);
      if (errs.length) {
        toast(errs[0]);
        return $('#adm-offers [aria-invalid="true"]')?.focus();
      }
      const d = db();
      const changed = [];
      for (const o of d.offers ?? []) {
        const next = params[o.code];
        const st = fd.get('st-' + o.code);
        if (next && JSON.stringify(next) !== JSON.stringify(o.params)) {
          changed.push(`${o.label}: ${JSON.stringify(o.params)} → ${JSON.stringify(next)}`);
          o.params = next;
        }
        if (st && st !== o.status) {
          changed.push(`${o.label}: ${RULE_STATUS[o.status]} → ${RULE_STATUS[st]}`);
          o.status = st;
        }
      }
      for (const b of d.bundles ?? []) {
        const st = fd.get('b-' + b.id);
        if (st && st !== b.status) {
          changed.push(`${b.name}: ${STATUS_LABEL[b.status]} → ${STATUS_LABEL[st]}`);
          b.status = st;
        }
      }
      const on = fd.get('offers_enabled') === 'on';
      if (on !== (d.settings.offers_enabled === true)) changed.push(on ? 'Offerte accese' : 'Offerte spente');
      d.settings.offers_enabled = on;
      changed.forEach((c) => store.audit('offerte', 'offerte', c));
      store.commit('catalog');
      toast(changed.length ? 'Offerte salvate' : 'Nessuna modifica');
      rerender();
      return;
    }
    if (f.id === 'adm-settings') {
      const fd = new FormData(f);
      const raw = String(fd.get('whatsapp_number') || '').trim();
      if (raw) {
        const ch = normalizeWhatsAppNumber(raw);
        if (!ch.ok) {
          $('#s-wa').setAttribute('aria-invalid', 'true');
          $('#wa-check').className = 'note note--err small';
          $('#wa-check').textContent = ch.reason;
          return $('#s-wa').focus();
        }
      }
      const s = db().settings;
      if (s.whatsapp_number !== raw) store.audit('impostazioni', 'WhatsApp', raw ? 'Numero aggiornato' : 'Numero rimosso');
      s.whatsapp_number = raw;
      s.shipping_note = String(fd.get('shipping_note') || '').trim() || s.shipping_note;
      const phone = String(fd.get('public_phone') || '').trim();
      if (phone && !normalizeWhatsAppNumber(phone).ok) {
        $('#s-phone').setAttribute('aria-invalid', 'true');
        toast('Telefono: usa il prefisso internazionale, es. +39 …');
        return $('#s-phone').focus();
      }
      const mail = String(fd.get('contact_email') || '').trim();
      if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
        $('#s-mail').setAttribute('aria-invalid', 'true');
        toast('Email non valida');
        return $('#s-mail').focus();
      }
      s.public_phone = phone;
      s.contact_email = mail;
      s.show_claims = fd.get('show_claims') === 'on';
      store.commit('settings');
      toast('Impostazioni salvate');
      rerender();
    }
  });

  document.addEventListener('input', (e) => {
    if (!inAdmin()) return;
    const k = e.target.dataset.admInput;
    if (k) {
      sessionStorage.setItem('adm-' + k, e.target.value);
      clearTimeout(bind.t);
      bind.t = setTimeout(() => {
        const pos = e.target.selectionStart;
        rerender();
        const el = $(`[data-adm-input="${k}"]`);
        el?.focus();
        el?.setSelectionRange(pos, pos);
      }, 250);
    }
    if (e.target.id === 'f-name' && $('#adm-product')) {
      const p = db().products.find((x) => x.id === currentProductId());
      if (p && p.status === 'draft' && (p.slug === slugify(p.name) || p.slug.startsWith('nuovo-prodotto'))) $('#f-slug').value = slugify(e.target.value);
    }
  });

  document.addEventListener('change', async (e) => {
    if (!inAdmin()) return;
    const t = e.target;
    if (t.dataset.admChange) {
      sessionStorage.setItem('adm-' + t.dataset.admChange, t.value);
      return rerender();
    }
    const mf = t.dataset.mf;
    if (mf) {
      const m = db().media.find((x) => x.id === t.closest('[data-mid]').dataset.mid);
      if (mf === 'is_cover') db().media.filter((x) => x.product_id === m.product_id).forEach((x) => (x.is_cover = x.id === m.id));
      else if (mf === 'illustrative') m.illustrative = t.checked;
      else m[mf] = t.value.trim();
      if (mf === 'alt' && !m.alt && m.published) {
        m.published = false;
        toast('Senza testo alternativo la foto torna in bozza');
      }
      store.audit('foto', m.id.slice(0, 8), `Campo ${mf} aggiornato`);
      store.commit('catalog');
      if (mf === 'is_cover' || mf === 'illustrative' || mf === 'alt') {
        const y = scrollY;
        rerender();
        scrollTo(0, y);
      }
    }
    if (t.dataset.sf === 'alt') {
      const key = t.closest('[data-slot]').dataset.slot;
      const m = db().site_media.find((x) => x.slot === key);
      m.alt = t.value.trim();
      if (!m.alt && m.published) m.published = false;
      store.commit('catalog');
      return;
    }
    const siteKey = t.dataset.admSitefile;
    if (siteKey && t.files?.length) {
      try {
        const { blob, width, height } = await processUpload(t.files[0]);
        const src = await media.putBlob(blob);
        const list = db().site_media;
        const old = list.find((x) => x.slot === siteKey);
        if (old) {
          await media.deleteBlob(old.src);
          Object.assign(old, { src, width, height, published: false });
        } else list.push({ id: store.rid(), slot: siteKey, src, alt: '', published: false, focal_x: 50, focal_y: 50, width, height });
        store.audit('immagine del sito', siteKey, 'Foto caricata in bozza');
        store.commit('catalog');
        toast('Foto caricata in bozza: aggiungi il testo alternativo e pubblicala');
      } catch (err) {
        toast(err.message || 'Caricamento non riuscito');
      }
      return rerender();
    }
    const fileMode = t.dataset.admFile;
    if (fileMode && t.files?.length) {
      const pid = currentProductId();
      if ($('#adm-product') && !saveProduct($('#adm-product'), { silent: true })) return;
      const state = $('#upload-state');
      for (const file of t.files) {
        try {
          state.textContent = `Elaboro ${file.name}…`;
          const { blob, width, height } = await processUpload(file);
          const src = await media.putBlob(blob);
          if (fileMode === 'replace') {
            const m = db().media.find((x) => x.id === t.dataset.id);
            const old = m.src;
            Object.assign(m, { src, srcset: undefined, width, height, published: false });
            if (old.startsWith('idb:')) await media.deleteBlob(old);
            store.audit('foto', m.id.slice(0, 8), 'Foto sostituita, torna in bozza');
          } else {
            const ms = db().media.filter((x) => x.product_id === pid);
            db().media.push({ id: store.rid(), product_id: pid, slot: ms.some((x) => x.slot === 'hero') ? 'extra' : 'hero', src, alt: '', caption: '', illustrative: false, is_cover: !ms.length, published: false, sort: ms.length + 1, focal_x: 50, focal_y: 50, width, height });
            store.audit('foto', file.name, 'Foto caricata in bozza');
          }
          store.commit('catalog');
        } catch (err) {
          toast(err.message || 'Caricamento non riuscito');
          state.textContent = `${file.name}: ${err.message}`;
          return;
        }
      }
      toast(fileMode === 'replace' ? 'Foto sostituita: è in bozza finché non la pubblichi' : 'Foto caricata in bozza');
      rerender();
    }
  });

  document.addEventListener('click', async (e) => {
    if (!inAdmin()) return;
    const t = e.target.closest('[data-adm]');
    if (!t) return;
    const act = t.dataset.adm;
    const d = db();
    const pid = currentProductId();
    const p = pid && d.products.find((x) => x.id === pid);
    switch (act) {
      case 'logout':
        sessionStorage.removeItem(SESSION);
        sessionStorage.removeItem('vs-preview-drafts');
        go(P.home);
        break;
      case 'new-product': {
        const cat = d.categories[0];
        const np = { id: store.rid(), slug: 'nuovo-prodotto-' + Date.now().toString(36), category_id: cat.id, name: 'Nuovo prodotto', technical_name: '', short: '', description: '', composition: '', highlights: [], claims: [], removable_cover: null, reversible: null, summer_winter: null, hybrid: false, firmness_display: null, line_code: 'NEW', status: 'draft', sort: 99, lead_time: null, match: null, internal_notes: '' };
        d.products.push(np);
        store.audit('nuovo prodotto', np.name, 'Creato in bozza');
        store.commit('catalog');
        go(`/admin/prodotto-${np.id}/`);
        break;
      }
      case 'status': {
        const form = $('#adm-product');
        if (!saveProduct(form, { silent: true })) return;
        const v = t.dataset.v;
        if (v === 'published') {
          const idx = new CatalogIndex({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, status: 'published' } : x)) });
          const cat = d.categories.find((c) => c.id === p.category_id);
          const warn = [];
          if (!idx.isProductPurchasable({ ...p, status: 'published' })) warn.push('nessuna variante è acquistabile (prezzo, disponibilità o stato): il prodotto resterà nascosto dal catalogo');
          if (cat?.status !== 'published') warn.push('la categoria non è pubblicata');
          if (!p.short) warn.push('manca la descrizione breve');
          if (warn.length && !(await confirmDialog('Pubblicare comunque?', `Attenzione: ${warn.join('; ')}.`, 'Pubblica comunque'))) return;
        }
        if (v === 'archived' && !(await confirmDialog('Archiviare il prodotto?', 'Sparirà dal sito ma resterà nello storico delle richieste. Puoi riportarlo in bozza in qualsiasi momento.', 'Archivia'))) return;
        p.status = v;
        store.audit('stato prodotto', p.name, STATUS_LABEL[v]);
        store.commit('catalog');
        toast(v === 'published' ? 'Pubblicato: il sito è già aggiornato' : `Stato: ${STATUS_LABEL[v]}`);
        rerender();
        break;
      }
      case 'delete-product': {
        if (p.status !== 'draft' || referencedProduct(p.id)) return toast('Si possono eliminare solo bozze non collegate a richieste: archivia invece');
        if (!(await confirmDialog('Eliminare definitivamente la bozza?', `${p.name}, con varianti e foto, verrà eliminato. L'operazione non si può annullare.`, 'Elimina definitivamente', true))) return;
        for (const m of d.media.filter((x) => x.product_id === p.id)) await media.deleteBlob(m.src);
        d.media = d.media.filter((x) => x.product_id !== p.id);
        d.variants = d.variants.filter((x) => x.product_id !== p.id);
        d.products = d.products.filter((x) => x.id !== p.id);
        store.audit('eliminazione', p.name, 'Bozza eliminata definitivamente');
        store.commit('catalog');
        toast('Bozza eliminata');
        go('/admin/catalogo/');
        break;
      }
      case 'preview':
        if ($('#adm-product') && !saveProduct($('#adm-product'), { silent: true })) return;
        sessionStorage.setItem('vs-preview-drafts', '1');
        go(legacyToPath('prodotto-' + p.slug));
        break;
      case 'var-add': {
        if (!saveProduct($('#adm-product'), { silent: true })) return;
        const kind = d.categories.find((c) => c.id === p.category_id)?.kind;
        d.variants.push({ id: store.rid(), product_id: p.id, sku: skuFor(kind, p.line_code, null, null) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(), size: null, height_cm: null, price_cents: null, availability: 'unavailable', active: true, sort: 999 });
        store.commit('catalog');
        rerender();
        break;
      }
      case 'var-del': {
        const id = t.dataset.id;
        if (referencedVariant(id)) {
          toast('Variante presente in richieste: disattivala invece di eliminarla');
          const row = t.closest('.adm-var');
          $('[data-f="active"]', row).checked = false;
          return;
        }
        if (!(await confirmDialog('Eliminare la variante?', 'La variante verrà rimossa dopo il salvataggio.', 'Elimina', true))) return;
        t.closest('.adm-var').remove();
        saveProduct($('#adm-product'));
        rerender();
        break;
      }
      case 'var-grid': {
        const kind = d.categories.find((c) => c.id === p.category_id)?.kind;
        openDialog({
          title: 'Genera varianti',
          body: `<p class="small muted">Crea le combinazioni mancanti, senza prezzo e non acquistabili. Le esistenti non vengono toccate.</p>
            <fieldset class="adm-checks" style="border:0;padding:0"><legend class="lbl">Misure</legend>${STANDARD_SIZES.map((s) => `<label class="check"><input type="checkbox" value="${s}" data-g="size" checked> ${formatSize(s)}</label>`).join('')}</fieldset>
            <div class="field"><label for="g-h">Altezze in cm, separate da virgola</label><input class="input" id="g-h" value="${kind === 'materasso' ? '20, 25, 30' : kind === 'topper' ? '5' : ''}"></div>`,
          actions: [
            { label: 'Annulla' },
            {
              label: 'Genera',
              primary: true,
              onClick: (dlg) => {
                if (!saveProduct($('#adm-product'), { silent: true })) return false;
                const sizes = $$('[data-g="size"]:checked', dlg).map((x) => x.value);
                const hs = $('#g-h', dlg).value.split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0);
                let n = 0;
                for (const h of hs.length ? hs : [null])
                  for (const s of sizes) {
                    if (d.variants.some((v) => v.product_id === p.id && v.size === s && v.height_cm === h)) continue;
                    d.variants.push({ id: store.rid(), product_id: p.id, sku: skuFor(kind, p.line_code, s, h), size: s, height_cm: h, price_cents: null, availability: 'unavailable', active: true, sort: (h ?? 0) * 100 + STANDARD_SIZES.indexOf(s) });
                    n++;
                  }
                store.audit('varianti', p.name, `${n} varianti generate`);
                store.commit('catalog');
                toast(`${n} varianti create`);
                setTimeout(rerender);
              },
            },
          ],
        });
        break;
      }
      case 'var-sku': {
        const kind = d.categories.find((c) => c.id === p.category_id)?.kind;
        const line = $('#f-line').value.trim().toUpperCase();
        $$('.adm-var').forEach((row) => {
          const size = $('[data-f="size"]', row).value.trim() || null;
          const h = $('[data-f="height_cm"]', row).value.trim() ? Number($('[data-f="height_cm"]', row).value) : null;
          $('[data-f="sku"]', row).value = skuFor(kind, line, size, h);
        });
        toast('SKU rigenerati: salva per confermare');
        break;
      }
      case 'focal': {
        const m = d.media.find((x) => x.id === t.dataset.id);
        const r = t.getBoundingClientRect();
        m.focal_x = Math.round(((e.clientX - r.left) / r.width) * 100);
        m.focal_y = Math.round(((e.clientY - r.top) / r.height) * 100);
        store.commit('catalog');
        const y = scrollY;
        rerender();
        scrollTo(0, y);
        break;
      }
      case 'm-up':
      case 'm-down': {
        const ms = d.media.filter((x) => x.product_id === pid).sort((a, b) => a.sort - b.sort);
        const i = ms.findIndex((x) => x.id === t.dataset.id);
        const j = act === 'm-up' ? i - 1 : i + 1;
        if (j < 0 || j >= ms.length) return;
        [ms[i], ms[j]] = [ms[j], ms[i]];
        ms.forEach((x, k) => (x.sort = k + 1));
        store.commit('catalog');
        rerender();
        $(`[data-adm="${act}"][data-id="${CSS.escape(t.dataset.id)}"]`)?.focus();
        break;
      }
      case 'm-pub': {
        const m = d.media.find((x) => x.id === t.dataset.id);
        if (!m.published && !m.alt.trim()) {
          toast('Scrivi il testo alternativo prima di pubblicare la foto');
          return $(`[data-mid="${CSS.escape(m.id)}"] [data-mf="alt"]`)?.focus();
        }
        m.published = !m.published;
        store.audit('foto', m.alt.slice(0, 40) || m.id.slice(0, 8), m.published ? 'Pubblicata' : 'Nascosta');
        store.commit('catalog');
        toast(m.published ? 'Foto pubblicata' : 'Foto nascosta dal sito');
        const y = scrollY;
        rerender();
        scrollTo(0, y);
        break;
      }
      case 'm-del': {
        const m = d.media.find((x) => x.id === t.dataset.id);
        if (!(await confirmDialog('Eliminare la foto?', 'La foto verrà rimossa dal prodotto e dal sito.', 'Elimina', true))) return;
        await media.deleteBlob(m.src);
        d.media = d.media.filter((x) => x.id !== m.id);
        if (m.is_cover) {
          const first = d.media.filter((x) => x.product_id === m.product_id).sort((a, b) => a.sort - b.sort)[0];
          if (first) first.is_cover = true;
        }
        store.audit('foto', m.id.slice(0, 8), 'Eliminata');
        store.commit('catalog');
        rerender();
        break;
      }
      case 's-pub': {
        const m = d.site_media.find((x) => x.slot === t.dataset.slot);
        if (!m.published && !m.alt.trim()) {
          toast('Scrivi il testo alternativo prima di pubblicare');
          return $(`[data-slot="${t.dataset.slot}"] [data-sf="alt"]`)?.focus();
        }
        m.published = !m.published;
        store.audit('immagine del sito', m.slot, m.published ? 'Pubblicata' : 'Nascosta');
        store.commit('catalog');
        toast(m.published ? 'Pubblicata: il sito è già aggiornato' : 'Nascosta: torna il segnaposto');
        rerender();
        break;
      }
      case 's-del': {
        if (!(await confirmDialog('Rimuovere la foto?', 'Nello spazio tornerà il segnaposto.', 'Rimuovi', true))) return;
        const m = d.site_media.find((x) => x.slot === t.dataset.slot);
        await media.deleteBlob(m.src);
        d.site_media = d.site_media.filter((x) => x !== m);
        store.commit('catalog');
        rerender();
        break;
      }
      case 'cat-add': {
        const c = { id: store.rid(), slug: 'nuova-categoria-' + Date.now().toString(36), kind: 'materasso', name: 'Nuova categoria', description: '', sort: 99, status: 'draft' };
        d.categories.push(c);
        store.audit('categoria', c.name, 'Creata in bozza');
        store.commit('catalog');
        rerender();
        break;
      }
      case 'cat-del': {
        if (d.products.some((x) => x.category_id === t.dataset.id)) return toast('La categoria contiene prodotti');
        if (!(await confirmDialog('Eliminare la categoria?', 'La categoria è vuota e verrà eliminata.', 'Elimina', true))) return;
        d.categories = d.categories.filter((c) => c.id !== t.dataset.id);
        store.commit('catalog');
        rerender();
        break;
      }
      case 'refund-calc':
      case 'refund-log': {
        const ref = $('#adm-request')?.dataset.ref;
        const r = db().requests.find((x) => x.ref === ref);
        if (!r) break;
        let total = 0;
        const parts = [];
        $$('[data-refund]').forEach((inp) => {
          const it = r.items[Number(inp.dataset.refund)];
          const q = Math.max(0, Math.min(it.qty, Math.trunc(Number(inp.value) || 0)));
          inp.value = q;
          if (!q) return;
          const amt = refundForLine(it, q);
          total += amt;
          parts.push(`${q} × ${it.name}${it.size ? ' ' + formatSize(it.size) : ''}: ${formatCents(amt)}`);
        });
        $('#refund-out').textContent = `Rimborso: ${formatCents(total)}${parts.length ? ' (' + parts.join('; ') + ')' : ''}`;
        if (act === 'refund-log') {
          if (!parts.length) return toast('Indica almeno un pezzo restituito');
          r.history.push({ at: new Date().toISOString(), status: r.status, by: 'admin', note: `Recesso parziale: rimborsati ${formatCents(total)} su ${formatCents(r.total_cents)} (${parts.join('; ')})` });
          store.audit('richiesta', r.ref, `Recesso parziale: ${formatCents(total)}`);
          store.commit('requests');
          toast('Recesso registrato nello storico');
          rerender();
        }
        break;
      }
      case 'copy-reply': {
        const r = d.requests.find((x) => x.ref === $('#adm-request').dataset.ref);
        const raw = $('#r-price').value.trim();
        r.quote.price_cents = raw ? parseEuroToCents(raw) : null;
        r.quote.reply = $('#r-reply').value.trim();
        store.commit('requests');
        await copyText(quoteReply(r), $('#copy-fallback'));
        break;
      }
      case 'custom-sku': {
        const r = d.requests.find((x) => x.ref === $('#adm-request').dataset.ref);
        r.quote.custom_sku = api.customSku(r.ref.slice(-4));
        store.audit('preventivo', r.ref, `SKU ${r.quote.custom_sku}`);
        store.commit('requests');
        rerender();
        break;
      }
      case 'sitemap': {
        const out = $('#sm-out');
        out.hidden = false;
        // stessa sitemap che scripts/build_site.mjs pubblica con il sito
        out.value = buildSitemap($('#sm-base').value.trim() || 'https://vesuviosleep.it', window.__vs.routes().map((r) => ({ path: r.path, images: r.images })));
        break;
      }
      case 'db-pull': {
        try {
          const cat = await sbLoad();
          const n = applyRemoteCatalog(cat);
          toast(`Catalogo letto dal database: ${n.prodotti} prodotti, ${n.varianti} varianti`);
          rerender();
        } catch (err) {
          toast('Il database non risponde: ' + err.message);
        }
        break;
      }
      case 'db-signin': {
        const err = $('#db-err');
        err.textContent = '';
        try {
          await sbSignIn($('#db-mail').value.trim(), $('#db-pw').value);
          if (!(await sbIsAdmin())) {
            sbSignOut();
            err.textContent = 'Questo utente non è un amministratore del database.';
            return;
          }
          toast('Collegato al database');
          rerender();
        } catch (e2) {
          err.textContent = e2.message;
        }
        break;
      }
      case 'db-recover': {
        const mail = $('#db-mail').value.trim();
        if (!mail) return ($('#db-err').textContent = 'Scrivi prima la tua email.');
        try {
          await sbRecovery(mail);
          toast('Se l\'indirizzo esiste, arriva un link per impostare la password');
        } catch (e3) {
          $('#db-err').textContent = e3.message;
        }
        break;
      }
      case 'db-signout':
        sbSignOut();
        toast('Uscito dal database');
        rerender();
        break;
      case 'db-push': {
        if (!(await confirmDialog('Pubblicare il catalogo sul database?', 'Prodotti, varianti, foto e impostazioni di questa anteprima sostituiranno quelli sul database. Le richieste e lo storico non vengono toccati.', 'Pubblica'))) return;
        try {
          const n = await sbPush(d);
          store.audit('database', 'catalogo', `Pubblicati ${n.prodotti} prodotti, ${n.varianti} varianti, ${n.foto} foto`);
          store.commit('audit');
          toast(`Pubblicato: ${n.prodotti} prodotti, ${n.varianti} varianti`);
        } catch (err2) {
          toast('Pubblicazione rifiutata: ' + err2.message);
        }
        break;
      }
      case 'export': {
        const out = $('#export-out');
        out.hidden = false;
        out.value = JSON.stringify({ ...d, exported_at: new Date().toISOString() }, null, 1);
        await copyText(out.value, out);
        break;
      }
      case 'reset':
        if (!(await confirmDialog('Ripristinare i dati iniziali?', 'Catalogo, richieste e impostazioni torneranno al dataset di partenza. Le foto caricate verranno scollegate. L\'accesso admin resta.', 'Ripristina', true))) return;
        store.reset();
        toast('Dati ripristinati');
        rerender();
        break;
    }
  });
}
