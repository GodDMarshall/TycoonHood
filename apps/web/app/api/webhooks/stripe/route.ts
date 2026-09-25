/** Stripe webhook → the single settlement path. Signature verification per
 *  Stripe's HMAC scheme; requires STRIPE_WEBHOOK_SECRET. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { commerce } from "@tycoonhood/core";

function verify(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });

  const payload = await req.text();
  if (!verify(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: { id: string; metadata?: { orderId?: string } } };
  };

  if (event.type === "checkout.session.completed") {
    const orderId = event.data.object.metadata?.orderId;
    if (orderId) await commerce.settleFiatOrder(orderId, event.data.object.id);
  }
  if (event.type === "checkout.session.expired") {
    const orderId = event.data.object.metadata?.orderId;
    if (orderId) await commerce.cancelFiatOrder(orderId);
  }
  return NextResponse.json({ received: true });
}
