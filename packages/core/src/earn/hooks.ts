/**
 * CONTRACT between the shop and the affiliate programme.
 *
 * The shop calls these after it changes an order's state; it never writes
 * Commission rows itself. Both are idempotent (Commission.orderId is unique)
 * and must never throw into the checkout path: an attribution failure is
 * logged, not surfaced to the buyer.
 *
 * Implemented by the EARN workstream in ./affiliates.ts.
 */
export interface EarnHooks {
  /** Order reached PAID with a real (LIVE) or sandbox (TEST) fiat payment. Creates a PENDING commission if attributable. */
  onOrderPaid(orderId: string): Promise<void>;
  /** Order refunded or cancelled after payment. Reverses or rejects its commission. */
  onOrderRefunded(orderId: string): Promise<void>;
}
