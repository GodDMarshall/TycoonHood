/**
 * SANDBOX — the test provider. Nothing leaves the server and nothing is
 * charged. It exists so the whole rupee flow (order → payment → capture →
 * fulfilment → refund) can be walked before Razorpay keys arrive. Every row it
 * touches has Payment.mode = "TEST", and the UI says "Test mode — no real money
 * is charged" wherever such an order appears.
 */
import { randomBytes } from "node:crypto";
import type { ShopPaymentProvider } from "./provider";

export class SandboxProvider implements ShopPaymentProvider {
  readonly name = "sandbox" as const;
  readonly mode = "TEST" as const;

  async createOrder(input: { amountCents: number; currency: string; receipt: string }) {
    return {
      providerOrderId: `sandbox_order_${randomBytes(9).toString("hex")}`,
      raw: { sandbox: true, amount: input.amountCents, currency: input.currency, receipt: input.receipt },
    };
  }

  async refund(input: { providerPaymentId: string; amountCents: number }) {
    return {
      refundId: `sandbox_refund_${randomBytes(9).toString("hex")}`,
      raw: { sandbox: true, payment: input.providerPaymentId, amount: input.amountCents },
    };
  }

  /** A fake payment id for a simulated capture. */
  newPaymentId() {
    return `sandbox_pay_${randomBytes(9).toString("hex")}`;
  }
}

export const sandboxProvider = new SandboxProvider();
