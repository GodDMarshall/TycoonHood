-- ============================================================================
-- WHEN A WAITING EMAIL CHANGE WAS ASKED FOR
--
-- Additive only: one nullable column on "User", set with "pendingEmail" and
-- cleared with it. A change away from an address the member never confirmed
-- gets no undo link (that address may not be theirs), so nothing could put
-- it back once it happened. It waits a day instead: its link works only from
-- "pendingEmailAt" plus a day (UNCONFIRMED_CHANGE_WAIT_MS in
-- packages/core/src/platform/email-verification.ts). The owner of the
-- address was told of the request, and a new password cancels it.
--
-- Backfill: a change already waiting counts as asked for when this ran. If
-- its address was never confirmed, it waits a day from then, and its link,
-- issued earlier, runs out first: the member sends a new one once the day is
-- over.
-- ============================================================================

-- AlterTable
ALTER TABLE "User" ADD COLUMN "pendingEmailAt" TIMESTAMP(3);

-- Backfill
UPDATE "User" SET "pendingEmailAt" = CURRENT_TIMESTAMP WHERE "pendingEmail" IS NOT NULL AND "pendingEmailAt" IS NULL;
