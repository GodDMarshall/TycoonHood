-- ============================================================================
-- WHEN THE UNDO NOTICE WENT OUT
--
-- Additive only: one nullable column on "EmailHold". An email change commits
-- before the notice carrying its undo link is sent, and the link exists only
-- in the request that confirmed the change. If that request died before it
-- could send the notice or put the change back, nothing recorded it, and the
-- change stood with an undo link nobody received.
-- "noticeSentAt" is set when the mail provider accepts the notice. A hold
-- with an undo link, no "noticeSentAt" and a "createdAt" more than a few
-- minutes old is a change its old address was never told of: the app puts
-- it back (packages/core/src/platform/email-notice.ts).
--
-- Backfill: holds made before this column are counted as told. The code
-- that made them sent the notice in the same request, and put the change
-- back at once when it could not.
-- ============================================================================

-- AlterTable
ALTER TABLE "EmailHold" ADD COLUMN "noticeSentAt" TIMESTAMP(3);

-- Backfill
UPDATE "EmailHold" SET "noticeSentAt" = "createdAt" WHERE "noticeSentAt" IS NULL;
