/** Provider-agnostic fiat payments (Blueprint D10). Every provider ends at
 *  commerce.settleFiatOrder — the one settlement path. */
export interface CheckoutResult {
  kind: "redirect" | "settled";
  url?: string; // redirect flows (Stripe)
}

export interface PaymentProvider {
  readonly name: string;
  readonly available: boolean;
  createCheckout(order: { id: string; totalFiatCents: number; fiatCurrency: string; productName: string }, urls: { success: string; cancel: string }): Promise<CheckoutResult>;
}
