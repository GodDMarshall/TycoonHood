/**
 * The rupee rail's provider seam. Two implementations:
 *
 *   razorpay — LIVE. Active only when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 *              are both set. Real money.
 *   sandbox  — TEST. Active only when there are no Razorpay keys AND the
 *              dev-mode boundary is open (DEV_MODE="true" and NODE_ENV is not
 *              "production" — the same fail-closed rule as isDevMode(), DR-2).
 *              Nothing is charged; every Payment it creates has mode "TEST"
 *              and is excluded from revenue.
 *
 * In production without keys there is no provider at all: the card rail is
 * hidden and THC checkout carries on.
 */
export type PaymentMode = "LIVE" | "TEST";

export interface CreatedProviderOrder {
  providerOrderId: string;
  raw?: unknown;
}

export interface ProviderRefund {
  refundId: string;
  raw?: unknown;
}

export interface ShopPaymentProvider {
  readonly name: "razorpay" | "sandbox";
  readonly mode: PaymentMode;
  /** Creates the provider-side order the browser will pay against. Amount in paise. */
  createOrder(input: { amountCents: number; currency: string; receipt: string; notes?: Record<string, string> }): Promise<CreatedProviderOrder>;
  /** Refunds a captured payment in full (or `amountCents`). */
  refund(input: { providerPaymentId: string; amountCents: number; notes?: Record<string, string> }): Promise<ProviderRefund>;
}

type Env = Record<string, string | undefined>;

export function razorpayConfigured(env: Env = process.env) {
  return !!(env.RAZORPAY_KEY_ID?.trim() && env.RAZORPAY_KEY_SECRET?.trim());
}

/** Mirrors isDevMode() from @tycoonhood/config, but over an explicit env so it can be tested. */
export function sandboxAllowed(env: Env = process.env) {
  return env.DEV_MODE === "true" && env.NODE_ENV !== "production";
}

export interface PaymentsStatus {
  provider: "razorpay" | "sandbox" | null;
  mode: PaymentMode | null;
  webhookConfigured: boolean;
  /** Plain-language explanation for the admin and the checkout page. */
  summary: string;
}

export function paymentsStatus(env: Env = process.env): PaymentsStatus {
  if (razorpayConfigured(env)) {
    const webhook = !!env.RAZORPAY_WEBHOOK_SECRET?.trim();
    return {
      provider: "razorpay",
      mode: "LIVE",
      webhookConfigured: webhook,
      summary: webhook
        ? "Razorpay is live. Payments are verified in the browser callback and again by the webhook."
        : "Razorpay is live, but RAZORPAY_WEBHOOK_SECRET is not set — payments are confirmed only by the browser callback.",
    };
  }
  if (sandboxAllowed(env)) {
    return {
      provider: "sandbox",
      mode: "TEST",
      webhookConfigured: false,
      summary: "Test mode — no Razorpay keys are set, so card checkout runs a sandbox. No real money is charged.",
    };
  }
  return {
    provider: null,
    mode: null,
    webhookConfigured: false,
    summary: "Card payments are not configured on this deployment. THC checkout still works.",
  };
}
