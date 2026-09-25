/** STRIPE ADAPTER. Fully coded, activates only when STRIPE_SECRET_KEY is
 *  set. Untested against live Stripe from this environment (no keys) —
 *  the webhook + session flow follows Stripe's documented contract and
 *  converges on the same settleFiatOrder path as every provider. */
import type { PaymentProvider } from "./provider";

function stripeKey() {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",
  get available() {
    return !!stripeKey();
  },
  async createCheckout(order, urls) {
    const key = stripeKey();
    if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
    const body = new URLSearchParams({
      mode: "payment",
      success_url: urls.success,
      cancel_url: urls.cancel,
      "metadata[orderId]": order.id,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": order.fiatCurrency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(order.totalFiatCents),
      "line_items[0][price_data][product_data][name]": order.productName,
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Stripe checkout failed: ${res.status} ${await res.text()}`);
    const session = (await res.json()) as { url: string };
    return { kind: "redirect", url: session.url };
  },
};
