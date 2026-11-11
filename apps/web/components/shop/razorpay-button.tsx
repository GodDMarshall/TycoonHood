"use client";
import { useEffect, useState, useTransition } from "react";
import { Button, Notice } from "@tycoonhood/ui";
import type { PayState } from "../../app/(app)/checkout/actions";

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpInstance = { open(): void; on(event: string, cb: (r: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RzpInstance;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Razorpay Checkout.js — loaded only on this page and only when live keys
 * exist (the server decides; this component is never rendered otherwise).
 * The success response goes to the server, which verifies the HMAC signature
 * before anything is marked paid.
 */
export function RazorpayButton({
  keyId,
  providerOrderId,
  amountPaise,
  orderRef,
  prefill,
  verify,
}: {
  keyId: string;
  providerOrderId: string;
  amountPaise: number;
  orderRef: string;
  prefill: { name?: string; email?: string };
  verify: (r: RzpResponse) => Promise<PayState>;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (window.Razorpay) return setReady(true);
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => setError("Could not load Razorpay. Check your connection and reload the page.");
    document.body.appendChild(s);
  }, []);

  function open() {
    if (!window.Razorpay) return;
    setError(null);
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: providerOrderId,
      amount: amountPaise,
      currency: "INR",
      name: "Tycoonhood",
      description: `Order ${orderRef}`,
      prefill,
      theme: { color: "#cfa95e" },
      handler: (r: RzpResponse) =>
        start(async () => {
          const res = await verify(r);
          if (res?.error) setError(res.error);
        }),
    });
    // A failed attempt leaves the order open, so the member can try again here.
    rzp.on("payment.failed", (r) => setError(`${r.error?.description ?? "The payment did not go through."} You can try again.`));
    rzp.open();
  }

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" onClick={open} disabled={!ready} loading={pending}>
        {ready ? "Pay with Razorpay" : "Loading Razorpay…"}
      </Button>
      {error && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
