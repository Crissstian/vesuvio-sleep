/**
 * Interfaccia pagamenti PREDISPOSTA E DISATTIVATA.
 * Al lancio l'unico percorso è la richiesta su WhatsApp. Nessun provider crea
 * sessioni, chiede carte o mostra loghi finché il flag non viene abilitato lato
 * server, con segreti server-side, webhook verificati e test in sandbox.
 */

export type PaymentProviderId = 'stripe' | 'paypal' | 'klarna';

export interface PaymentFlags {
  stripe: boolean; // carte, Apple Pay, Google Pay
  paypal: boolean;
  klarna: boolean;
}

export const DEFAULT_PAYMENT_FLAGS: Readonly<PaymentFlags> = Object.freeze({ stripe: false, paypal: false, klarna: false });

export interface CreateSessionInput {
  requestRef: string;
  amount_cents: number;
  currency: 'EUR';
  /** Chiave di idempotenza obbligatoria: un retry non deve creare due sessioni. */
  idempotencyKey: string;
}
export interface PaymentSession {
  provider: PaymentProviderId;
  redirectUrl: string;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  label: string;
  /** Requisiti da soddisfare prima dell'attivazione (documentazione per l'admin). */
  requirements: string[];
  createSession(input: CreateSessionInput): Promise<PaymentSession>;
  /** Deve verificare la firma del webhook e restare idempotente sull'evento. */
  handleWebhook(rawBody: string, signature: string): Promise<{ eventId: string; requestRef: string; paid: boolean }>;
}

export class PaymentDisabledError extends Error {
  constructor(id: PaymentProviderId) {
    super(`Il pagamento ${id} non è attivo: al lancio le richieste si confermano su WhatsApp.`);
    this.name = 'PaymentDisabledError';
  }
}

function disabledProvider(id: PaymentProviderId, label: string, requirements: string[]): PaymentProvider {
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

export const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
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
export function visibleMethods(flags: PaymentFlags = DEFAULT_PAYMENT_FLAGS): PaymentProvider[] {
  return (Object.keys(PROVIDERS) as PaymentProviderId[]).filter((k) => flags[k] === true).map((k) => PROVIDERS[k]);
}
