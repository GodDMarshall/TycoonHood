-- Floor the finite distribution pools (TYCOONHOOD_DECISIONS.md DR-6).
--
-- The original check only stopped USER wallets going negative, so REWARDS_POOL
-- and MINING_POOL could overdraw without limit — the "fixed, finite pool" that
-- the whole economy is sold on was not actually enforced, and the
-- EpochExhaustedError guarding it was unreachable. Widen the constraint to the
-- pools. SYSTEM_MINT still goes negative by design (it is the genesis
-- counter-account); TREASURY / REVENUE / ESCROW are sources and sinks and are
-- left unconstrained here.
ALTER TABLE "LedgerAccount" DROP CONSTRAINT "user_balance_non_negative";
ALTER TABLE "LedgerAccount"
  ADD CONSTRAINT "user_balance_non_negative"
  CHECK ("type" NOT IN ('USER', 'REWARDS_POOL', 'MINING_POOL') OR "balance" >= 0);
