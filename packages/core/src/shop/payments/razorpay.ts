/**
 * RAZORPAY — server half. Pure server logic: REST over fetch with HTTP basic
 * auth (key id : key secret), and the two HMAC-SHA256 checks Razorpay
 * documents:
 *
 *   checkout callback   HMAC(key_secret,     `${razorpay_order_id}|${razorpay_payment_id}`)
 *   webhook             HMAC(webhook_secret, raw request body)  → X-Razorpay-Signature
 *
 * Both compared with timingSafeEqual. Untested against live Razorpay from
 * this environment (no keys yet); the request shapes follow Razorpay's
 * published API (POST /v1/orders, POST /v1/payments/:id/refund).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ShopPaymentProvider } from "./provider";

const API = "https://api.razorpay.com/v1";

export function hmacSha256Hex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Constant-time hex comparison; false on any length or encoding mismatch. */
export function safeEqualHex(expected: string, given: string | null | undefined) {
  if (!given) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyCheckoutSignature(
  args: { razorpayOrderId: string; razorpayPaymentId: string; signature: string },
  keySecret: string
) {
  if (!keySecret) return false;
  const expected = hmacSha256Hex(keySecret, `${args.razorpayOrderId}|${args.razorpayPaymentId}`);
  return safeEqualHex(expected, args.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, webhookSecret: string) {
  if (!webhookSecret) return false;
  return safeEqualHex(hmacSha256Hex(webhookSecret, rawBody), signature);
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export class RazorpayProvider implements ShopPaymentProvider {
  readonly name = "razorpay" as const;
  readonly mode = "LIVE" as const;
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    fetchImpl?: FetchLike
  ) {
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
    this.fetchImpl = fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  }

  get publicKeyId() {
    return this.keyId;
  }

  private headers() {
    const basic = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    return { Authorization: `Basic ${basic}`, "Content-Type": "application/json" };
  }

  async createOrder(input: { amountCents: number; currency: string; receipt: string; notes?: Record<string, string> }) {
    const res = await this.fetchImpl(`${API}/orders`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        amount: input.amountCents,
        currency: input.currency,
        // Razorpay caps receipt at 40 characters.
        receipt: input.receipt.slice(0, 40),
        notes: input.notes ?? {},
      }),
    });
    if (!res.ok) throw new Error(`Razorpay order creation failed: ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { id: string };
    if (!body?.id) throw new Error("Razorpay order creation returned no id.");
    return { providerOrderId: body.id, raw: body };
  }

  async refund(input: { providerPaymentId: string; amountCents: number; notes?: Record<string, string> }) {
    const res = await this.fetchImpl(`${API}/payments/${encodeURIComponent(input.providerPaymentId)}/refund`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ amount: input.amountCents, notes: input.notes ?? {} }),
    });
    if (!res.ok) throw new Error(`Razorpay refund failed: ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { id: string };
    return { refundId: body.id, raw: body };
  }

  verifyCheckout(args: { razorpayOrderId: string; razorpayPaymentId: string; signature: string }) {
    return verifyCheckoutSignature(args, this.keySecret);
  }
}

export function razorpayFromEnv(env: Record<string, string | undefined> = process.env, fetchImpl?: FetchLike) {
  const id = env.RAZORPAY_KEY_ID?.trim();
  const secret = env.RAZORPAY_KEY_SECRET?.trim();
  if (!id || !secret) return null;
  return new RazorpayProvider(id, secret, fetchImpl);
}

/** The subset of a Razorpay webhook body the shop reads. */
export interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string | null; amount: number; currency: string; status: string; error_description?: string | null } };
    order?: { entity: { id: string; amount: number; currency: string; status: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
}
