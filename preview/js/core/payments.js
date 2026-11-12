/**
 * Interfaccia pagamenti PREDISPOSTA E DISATTIVATA.
 * Al lancio l'unico percorso è la richiesta su WhatsApp. Nessun provider crea
 * sessioni, chiede carte o mostra loghi finché il flag non viene abilitato lato
 * server, con segreti server-side, webhook verificati e test in sandbox.
 */
export const DEFAULT_PAYMENT_FLAGS = Object.freeze({ stripe: false, paypal: false, klarna: false });
export class PaymentDisabledError extends Error {
    constructor(id) {
        super(`Il pagamento ${id} non è attivo: al lancio le richieste si confermano su WhatsApp.`);
        this.name = 'PaymentDisabledError';
    }
}
function disabledProvider(id, label, requirements) {
    return {
        id,
        label,
        requirements,
        async createSession() {
            throw new PaymentDisabledError(id);
        },
        async handleWebhook() {
            throw new PaymentDisabledError(id);
        },
    };
}
export const PROVIDERS = {
    stripe: disabledProvider('stripe', 'Carte, Apple Pay, Google Pay (Stripe)', [
        'Account Stripe verificato intestato alla società',
        'STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET solo lato server',
        'Dominio verificato per Apple Pay',
        'Webhook checkout.session.completed con verifica firma e idempotenza',
        'Test completi in modalità test prima del live',
    ]),
    paypal: disabledProvider('paypal', 'PayPal', [
        'Account PayPal Business',
        'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET solo lato server',
        'Webhook con verifica firma e idempotenza',
        'Test in sandbox',
    ]),
    klarna: disabledProvider('klarna', 'Klarna', [
        'Contratto Klarna e requisiti del mercato italiano',
        'Credenziali solo lato server',
        'Informativa sul pagamento rateale',
        'Test in playground',
    ]),
};
/** Metodi da mostrare al cliente: con i flag di default la lista è vuota. */
export function visibleMethods(flags = DEFAULT_PAYMENT_FLAGS) {
    return Object.keys(PROVIDERS).filter((k) => flags[k] === true).map((k) => PROVIDERS[k]);
}
