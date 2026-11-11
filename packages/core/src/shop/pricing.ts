/**
 * Price resolution shared by cart, checkout and the storefront, so a price is
 * worked out in exactly one place. The card rail is INR only: a product whose
 * fiatCurrency is anything else is simply not payable on it (and says so).
 */
export const SHOP_CURRENCY = "INR";
export const MAX_LINE_QTY = 20;
/** Razorpay's floor for an order is ₹1. A coupon can never take a total below it. */
export const MIN_INR_CHARGE_PAISE = 100;

export interface PriceSource {
  priceThc: bigint | null;
  priceFiatCents: number | null;
  fiatCurrency: string;
}
export interface VariantPriceSource {
  priceThc: bigint | null;
  priceFiatCents: number | null;
}

export function unitPrices(product: PriceSource, variant?: VariantPriceSource | null) {
  const thc = variant?.priceThc ?? product.priceThc;
  const fiat = variant?.priceFiatCents ?? product.priceFiatCents;
  return {
    thc: thc ?? null,
    inrPaise: product.fiatCurrency === SHOP_CURRENCY && fiat != null ? fiat : null,
  };
}

export function lineKeyOf(productId: string, variantId: string | null | undefined) {
  return `${productId}:${variantId ?? "-"}`;
}

export function parseLineKey(lineKey: string): { productId: string; variantId: string | null } {
  const i = lineKey.lastIndexOf(":");
  if (i <= 0) throw new Error("Bad line key");
  const v = lineKey.slice(i + 1);
  return { productId: lineKey.slice(0, i), variantId: v === "-" ? null : v };
}

/** ₹1,234.50 — paise in, rupees out. */
export function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}
