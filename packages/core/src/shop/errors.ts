/** Errors the shop raises on purpose. Each message is written for the member. */
export class ShopError extends Error {}
export class CartError extends ShopError {}
export class CouponError extends ShopError {}
export class CheckoutError extends ShopError {}
export class PaymentVerificationError extends ShopError {}
export class RefundError extends ShopError {}
