// Piccoli helper DOM senza dipendenze.

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Transizione tra viste: View Transitions se disponibile, altrimenti classe CSS breve. */
export function swap(el, html, { animate = true } = {}) {
  const apply = () => {
    el.innerHTML = html;
  };
  if (!animate || reducedMotion()) return apply();
  if (document.startViewTransition) {
    try {
      document.startViewTransition(apply);
      return;
    } catch {
      /* fallback sotto */
    }
  }
  apply();
  el.classList.remove('is-entering');
  void el.offsetWidth;
  el.classList.add('is-entering');
}

let toastTimer;
export function toast(msg, kind = 'info') {
  let t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.dataset.kind = kind;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 3200);
}

/** Copia negli appunti; se il browser rifiuta, seleziona il testo di una textarea di riserva. */
export async function copyText(text, fallbackTextarea) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Riepilogo copiato negli appunti');
    return true;
  } catch {
    if (fallbackTextarea) {
      fallbackTextarea.hidden = false;
      fallbackTextarea.value = text;
      fallbackTextarea.focus();
      fallbackTextarea.select();
      toast('Il testo è selezionato: copialo con Ctrl+C o tieni premuto e scegli Copia');
    } else toast('Copia non consentita da questo browser');
    return false;
  }
}

/** Dialog modale accessibile basato su <dialog>; niente alert/confirm (bloccati nel frame). */
export function openDialog({ title, body, actions = [], wide = false, onClose }) {
  const d = document.createElement('dialog');
  d.className = 'dlg' + (wide ? ' dlg--wide' : '');
  d.setAttribute('aria-labelledby', 'dlg-title');
  d.innerHTML = `
    <div class="dlg__head"><h2 id="dlg-title">${esc(title)}</h2>
      <button class="icon-btn" data-close aria-label="Chiudi">${icon('close')}</button></div>
    <div class="dlg__body">${body}</div>
    ${actions.length ? `<div class="dlg__actions">${actions.map((a, i) => `<button class="btn ${a.kind === 'danger' ? 'btn--danger' : a.primary ? 'btn--primary' : 'btn--ghost'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}`;
  document.body.append(d);
  const prev = document.activeElement;
  const close = (v) => {
    d.close();
    d.remove();
    onClose?.(v);
    prev?.focus?.();
  };
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-close]')) close(null);
    const b = e.target.closest('[data-i]');
    if (b) {
      const a = actions[Number(b.dataset.i)];
      const r = a.onClick?.(d);
      if (r !== false) close(a.value ?? a.label);
    }
  });
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    close(null);
  });
  d.showModal();
  return { el: d, close };
}

export function confirmDialog(title, message, confirmLabel, danger = false) {
  return new Promise((res) => {
    openDialog({
      title,
      body: `<p>${esc(message)}</p>`,
      actions: [
        { label: 'Annulla', value: false },
        { label: confirmLabel, value: true, primary: !danger, kind: danger ? 'danger' : undefined },
      ],
      onClose: (v) => res(v === true),
    });
  });
}

export function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function fmtDate(iso) {
  try {
    return new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const ICONS = {
  cart: '<path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.1"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  pin: '<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  wa: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.5z"/><path d="M9 8.6c.2 2.9 2.6 5.4 5.6 5.8l1.1-1.2-1.7-.9-.8.8c-1.1-.4-2-1.3-2.4-2.4l.8-.8-.9-1.7z"/>',
  copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  arrowUp: '<path d="M12 18V6M7 11l5-5 5 5"/>',
  arrowDown: '<path d="M12 6v12M7 13l5 5 5-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  ruler: '<path d="M3 15.5L15.5 3l5.5 5.5L8.5 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  phone: '<path d="M6.6 3.5h2.7l1.4 4-2 1.4a11 11 0 0 0 6.4 6.4l1.4-2 4 1.4v2.7a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8"/>',
};
export function icon(name, size = 22) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] ?? ''}</svg>`;
}
