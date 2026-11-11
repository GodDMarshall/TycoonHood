// SHOP workstream barrel — cart, wishlist, coupons, checkout, payments, refunds.
// Names are shop-prefixed where they could collide with commerce's exports.
export { ShopError, CartError, CouponError, CheckoutError, PaymentVerificationError, RefundError } from "./errors";
export { setEarnHooks, getEarnHooks } from "./earn-registry";
export { SHOP_CATEGORIES, categoryLabel, isShopCategory, LOW_STOCK_AT } from "./categories";
export type { ShopCategory } from "./categories";
export { SHOP_CURRENCY, MAX_LINE_QTY, MIN_INR_CHARGE_PAISE, unitPrices, lineKeyOf, parseLineKey, formatInr } from "./pricing";
export { CartService, cart, cartTotals } from "./cart";
export type { CartLineView, CartTotals, RailTotal } from "./cart";
export { WishlistService, wishlist } from "./wishlist";
export {
  CouponService, coupons, discountFor, checkCouponRules, validateCouponInput, normaliseCode, COUPON_CODE_RE,
} from "./coupons";
export type { CouponCheck, CouponInput } from "./coupons";
export { ShopCheckoutService, shopCheckout, PENDING_TTL_MINUTES, PAYING_GRACE_MINUTES, SWEEP_EVERY_MS } from "./checkout";
export type { ShopCheckoutOptions, CaptureOutcome } from "./checkout";
export { RefundService, refunds, refundBlocker, REFUND_WINDOW_DAYS, REFUND_REASON_MIN, REFUND_REASON_MAX } from "./refunds";
export { orderTimeline, isTestOrder, paidAfterCancel, ShopStatsService, shopStats } from "./tracking";
export type { TimelineStep, TimelineState, TimelineOrder } from "./tracking";
export {
  activeShopProvider, paymentsStatus, paymentsStatusFor, razorpayConfigured, razorpayOpenTo, razorpayPreflight, razorpayStaffOnly, sandboxAllowed,
  RazorpayProvider, razorpayFromEnv, verifyCheckoutSignature, verifyWebhookSignature,
  SandboxProvider, sandboxProvider,
} from "./payments";
export type { ShopPaymentProvider, PaymentMode, PaymentsStatus, ProviderOrderCheck, RailCheck, RazorpayWebhookEvent } from "./payments";
