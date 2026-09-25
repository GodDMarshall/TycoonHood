-- Watch-to-earn pays XP as well as THC, and XP is a typed enum so the source
-- of every point stays auditable. Referral payouts reuse REWARD_MISSION on
-- the ledger but earn no XP, so they need no value here.
ALTER TYPE "XpSource" ADD VALUE IF NOT EXISTS 'WATCH_TASK';
ALTER TYPE "XpSource" ADD VALUE IF NOT EXISTS 'REFERRAL';
