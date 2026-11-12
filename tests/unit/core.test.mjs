import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsAppNumber, planWhatsApp, buildFullMessage, parseEuroToCents, mattressSku, baseSku, pillowSku, customSku, visibleMethods, PROVIDERS, makeRef, WA_MAX_URL } from '../../preview/js/core/index.js';

test('numero WhatsApp: solo formato internazionale', () => {
  assert.equal(normalizeWhatsAppNumber('').ok, false);
  assert.equal(normalizeWhatsAppNumber('333 1234567').ok, false);
  assert.deepEqual(normalizeWhatsAppNumber('+39 333 123 4567'), { ok: true, digits: '393331234567' });
  assert.deepEqual(normalizeWhatsAppNumber('0039 333 1234567'), { ok: true, digits: '393331234567' });
  assert.equal(normalizeWhatsAppNumber('+39 abc').ok, false);
});

test('prezzi in centesimi', () => {
  assert.equal(parseEuroToCents('220'), 22000);
  assert.equal(parseEuroToCents('220,50'), 22050);
  assert.equal(parseEuroToCents('1.234,5'), 123450);
  assert.equal(parseEuroToCents('abc'), null);
  assert.equal(parseEuroToCents('-3'), null);
});

test('SKU secondo il Master Spec', () => {
  assert.equal(mattressSku('ESS', 20, '80x190'), 'VS-ESS-H20-80190');
  assert.equal(mattressSku('MA3D', 30, '180x200'), 'VS-MA3D-H30-180200');
  assert.equal(baseSku('FLEX', '160x190'), 'VS-RETE-FLEX-160190');
  assert.equal(pillowSku('PIUMA'), 'VS-GUA-PIUMA');
  assert.equal(customSku(new Date('2026-11-12T10:00:00Z'), 'A1'), 'VS-CUSTOM-20261112-A1');
});

const summary = (n) => ({
  ref: 'VS-R-20261112-ABCD',
  lines: Array.from({ length: n }, (_, i) => ({ name: 'Vesuvio Memory Duo', size: '160x190', height_cm: 25, sku: `VS-MD-H25-${i}`, qty: 1, unit_cents: 22000 })),
  total_cents: 22000 * n,
  shipping_note: 'gratuita in tutta Italia, isole comprese',
});

test('WhatsApp: senza numero niente link, testo completo copiabile', () => {
  const p = planWhatsApp('', summary(1));
  assert.equal(p.url, null);
  assert.match(p.fullText, /VS-MD-H25-0/);
});
test('WhatsApp: link wa.me con testo codificato', () => {
  const p = planWhatsApp('+39 333 1234567', summary(2));
  assert.ok(p.url.startsWith('https://wa.me/393331234567?text='));
  assert.equal(decodeURIComponent(p.url.split('text=')[1]), buildFullMessage(summary(2)));
  assert.match(p.text, /440,00/);
});
test('WhatsApp: carrello lungo -> messaggio breve, testo completo intatto', () => {
  const p = planWhatsApp('+39 333 1234567', summary(40));
  assert.equal(p.short, true);
  assert.ok(p.url.length <= WA_MAX_URL);
  assert.equal((p.fullText.match(/SKU/g) || []).length, 40);
});
test('pagamenti: nessun metodo visibile di default, nessuna sessione creabile', async () => {
  assert.equal(visibleMethods().length, 0);
  await assert.rejects(PROVIDERS.stripe.createSession({ requestRef: 'x', amount_cents: 1, currency: 'EUR', idempotencyKey: 'k' }), /non è attivo/);
});
test('riferimento richiesta', () => {
  assert.match(makeRef('R', new Date('2026-11-12T10:00:00Z')), /^VS-R-20261112-[2-9A-Z]{4}$/);
});
