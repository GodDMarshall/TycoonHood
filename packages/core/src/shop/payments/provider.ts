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
 *
 * Razorpay TEST keys (rzp_test_…) in production are staff-only: a test
 * payment moves no money, so a member who could use one would get real goods
 * for free. The rail is offered only to staff who hold admin.commerce, so the
 * owner can test checkout end to end before the live keys arrive. Outside
 * production, test keys stay open to everyone.
 */
import { can, type HasRole } from "../../auth/permissions";
import { razorpayKeyMode } from "./razorpay";

export type PaymentMode = "LIVE" | "TEST";

export interface CreatedProviderOrder {
  providerOrderId: string;
  raw?: unknown;
}

export interface ProviderRefund {
  refundId: string;
  raw?: unknown;
}

/** One refund of a payment, as the provider records it. Amount in paise. */
export interface ProviderRefundRecord {
  refundId: string;
  amountCents: number;
  /** Razorpay's refund statuses: pending, processed (final) or failed. */
  status: string;
}

/** What the provider says about one of its orders. Razorpay's order statuses. */
export interface ProviderOrderCheck {
  /** created: no attempt yet. attempted: at least one attempt, none captured. paid: a payment was captured. */
  status: "created" | "attempted" | "paid";
  /** The captured payment on the order, if there is one. Amount in paise. */
  captured: { providerPaymentId: string; amountCents: number; currency: string } | null;
}

export interface ShopPaymentProvider {
  readonly name: "razorpay" | "sandbox";
  readonly mode: PaymentMode;
  /** Creates the provider-side order the browser will pay against. Amount in paise. */
  createOrder(input: { amountCents: number; currency: string; receipt: string; notes?: Record<string, string> }): Promise<CreatedProviderOrder>;
  /** Refunds a captured payment in full (or `amountCents`). */
  refund(input: { providerPaymentId: string; amountCents: number; notes?: Record<string, string> }): Promise<ProviderRefund>;
  /**
   * Looks one of the provider's orders up, so the expiry sweep never cancels an
   * order that was paid or is being paid. Null when the provider does not know
   * the order; throws when it cannot be asked. The sandbox has nobody to ask.
   */
  checkOrder?(providerOrderId: string): Promise<ProviderOrderCheck | null>;
  /** The refunds of one captured payment, so refunds counted before amounts were kept can be counted again. Throws when it cannot be asked. */
  listRefunds?(providerPaymentId: string): Promise<ProviderRefundRecord[]>;
}

type Env = Record<string, string | undefined>;

export function razorpayConfigured(env: Env = process.env) {
  return !!(env.RAZORPAY_KEY_ID?.trim() && env.RAZORPAY_KEY_SECRET?.trim());
}

/** Mirrors isDevMode() from @tycoonhood/config, but over an explicit env so it can be tested. */
export function sandboxAllowed(env: Env = process.env) {
  return env.DEV_MODE === "true" && env.NODE_ENV !== "production";
}

/** Razorpay test keys on a production deployment: the rupee rail is for staff with admin.commerce only. */
export function razorpayStaffOnly(env: Env = process.env) {
  return razorpayConfigured(env) && env.NODE_ENV === "production" && razorpayKeyMode(env.RAZORPAY_KEY_ID) === "TEST";
}

/** Whether this viewer may pay through Razorpay now. Checked on the server, never only in the UI. */
export function razorpayOpenTo(viewer: HasRole, env: Env = process.env) {
  return razorpayConfigured(env) && (!razorpayStaffOnly(env) || can(viewer, "admin.commerce"));
}

/**
 * Whether a test-mode payment by this buyer may complete an order. It moves no
 * money, so in production only staff with admin.commerce may get goods for one,
 * whichever keys are set now: a member can still pay in a Razorpay window opened
 * before the rail was fenced, and capture() refuses that payment.
 */
export function testPaymentAllowed(buyer: HasRole, env: Env = process.env) {
  return env.NODE_ENV !== "production" || can(buyer, "admin.commerce");
}

export interface PaymentsStatus {
  provider: "razorpay" | "sandbox" | null;
  mode: PaymentMode | null;
  webhookConfigured: boolean;
  /** Razorpay test keys in production: only staff with admin.commerce get the rail. */
  staffOnly: boolean;
  /** Plain-language explanation for the admin and the checkout page. */
  summary: string;
}

/** The deployment's rupee rail, as staff see it. Member pages use paymentsStatusFor. */
export function paymentsStatus(env: Env = process.env): PaymentsStatus {
  if (razorpayConfigured(env)) {
    const webhook = !!env.RAZORPAY_WEBHOOK_SECRET?.trim();
    const test = razorpayKeyMode(env.RAZORPAY_KEY_ID) === "TEST";
    const staffOnly = razorpayStaffOnly(env);
    const label = staffOnly
      ? "Razorpay test keys are set in production, so only staff with commerce access see card checkout. No real money moves"
      : test
        ? "Razorpay test mode is on (test keys) — no real money moves"
        : "Razorpay is live";
    return {
      provider: "razorpay",
      mode: test ? "TEST" : "LIVE",
      webhookConfigured: webhook,
      staffOnly,
      summary: webhook
        ? `${label}. Payments are verified in the browser callback and again by the webhook.`
        : `${label}, but RAZORPAY_WEBHOOK_SECRET is not set — payments are confirmed only by the browser callback.`,
    };
  }
  if (sandboxAllowed(env)) {
    return {
      provider: "sandbox",
      mode: "TEST",
      webhookConfigured: false,
      staffOnly: false,
      summary: "Test mode — no Razorpay keys are set, so card checkout runs a sandbox. No real money is charged.",
    };
  }
  return {
    provider: null,
    mode: null,
    webhookConfigured: false,
    staffOnly: false,
    summary: "Card payments are not configured on this deployment. THC checkout still works.",
  };
}

export interface RailCheck {
  level: "FAIL" | "WARN" | "OK";
  label: string;
  detail: string;
}

/** What `pnpm preflight` reports about the Razorpay keys. Empty when no Razorpay key is set. */
export function razorpayPreflight(env: Env = process.env): RailCheck[] {
  const id = env.RAZORPAY_KEY_ID?.trim();
  const secret = env.RAZORPAY_KEY_SECRET?.trim();
  if (!id && !secret) return [];
  if (!id || !secret) {
    return [{ level: "FAIL", label: "Razorpay has both keys", detail: `${id ? "RAZORPAY_KEY_SECRET" : "RAZORPAY_KEY_ID"} is missing, so card checkout is off` }];
  }
  const keys: RailCheck = razorpayStaffOnly(env)
    ? {
        level: "WARN",
        label: "Razorpay uses live keys",
        detail: "rzp_test_ keys in production: only staff with commerce access see card checkout, and no real money moves. Set live keys before members pay by card.",
      }
    : razorpayKeyMode(id) === "TEST"
      ? { level: "OK", label: "Razorpay test keys", detail: "fine outside production" }
      : { level: "OK", label: "Razorpay uses live keys", detail: "" };
  const webhook: RailCheck = env.RAZORPAY_WEBHOOK_SECRET?.trim()
    ? { level: "OK", label: "the Razorpay webhook is configured", detail: "" }
    : { level: "WARN", label: "the Razorpay webhook is configured", detail: "no RAZORPAY_WEBHOOK_SECRET: payments are confirmed only by the browser callback" };
  return [keys, webhook];
}

/** The rupee rail as this viewer sees it: with test keys in production, members have none. */
export function paymentsStatusFor(viewer: HasRole, env: Env = process.env): PaymentsStatus {
  const status = paymentsStatus(env);
  if (status.provider !== "razorpay" || razorpayOpenTo(viewer, env)) return status;
  return {
    provider: null,
    mode: null,
    webhookConfigured: status.webhookConfigured,
    staffOnly: true,
    summary: "Card payments are not available yet. You can still pay with THC.",
  };
}
