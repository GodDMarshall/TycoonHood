import { devProvider } from "./dev";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./provider";

/** Stripe when configured; the loudly-labeled dev provider otherwise. */
export function activeFiatProvider(): PaymentProvider | null {
  if (stripeProvider.available) return stripeProvider;
  if (devProvider.available) return devProvider;
  return null;
}
export { devProvider, stripeProvider };
export type { PaymentProvider } from "./provider";
