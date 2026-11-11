/**
 * Razorpay webhook → shopCheckout.handleRazorpayWebhook. The signature
 * (X-Razorpay-Signature) is an HMAC-SHA256 of the RAW body with
 * RAZORPAY_WEBHOOK_SECRET, so the body is read as text and never re-serialised.
 * Idempotent on the payment: Razorpay retries, and the browser callback may
 * already have settled the order.
 *
 * Subscribe in the Razorpay dashboard to: payment.captured, order.paid,
 * payment.failed, refund.processed. payment.failed only records the attempt:
 * the member can retry on the same Razorpay order, so the order stays open.
 */
import { NextResponse } from "next/server";
import { shopCheckout } from "@tycoonhood/core";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  const raw = await req.text();
  const result = await shopCheckout.handleRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"), secret);
  return NextResponse.json(result.body, { status: result.status });
}
