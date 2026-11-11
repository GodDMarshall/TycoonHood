-- ============================================================================
-- PAYMENT REFUNDED AMOUNT
--
-- A payment can be refunded in parts, for example from the Razorpay dashboard.
-- Payment now keeps the paise refunded so far and the provider refund ids
-- already counted, so:
--   · a retried refund.processed webhook is counted once;
--   · a partial refund leaves the payment CAPTURED and the order standing;
--   · only a full refund marks the payment REFUNDED and unwinds the order;
--   · a later refund sends only what is left.
--
-- Payments already REFUNDED were refunded in full by the code that wrote them.
-- ============================================================================

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "refundedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "refundIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Payment" SET "refundedCents" = "amountCents" WHERE "status" = 'REFUNDED';

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refunded_range" CHECK ("refundedCents" >= 0 AND "refundedCents" <= "amountCents");
