-- ============================================================================
-- LIVING ECOSYSTEM 0/8: ENUM VALUES
--
-- PostgreSQL cannot use an enum value in the transaction that added it, and
-- migrate-sql.ts runs each migration in one transaction. These values are
-- added here, alone, so every later migration (and the seeds) can use them.
-- NotificationType: the notification centre's new types (directive §13).
-- ProductKind.LIVE_EVENT: the system-managed product behind paid sessions
-- and events (LEAD #15). Additive only.
-- ============================================================================

-- ---- CreateEnum / AlterEnum ----
ALTER TYPE "NotificationType" ADD VALUE 'LEARNING';

ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP';

ALTER TYPE "NotificationType" ADD VALUE 'EVENT';

ALTER TYPE "NotificationType" ADD VALUE 'OPPORTUNITY';

ALTER TYPE "NotificationType" ADD VALUE 'CONTRIBUTOR';

ALTER TYPE "NotificationType" ADD VALUE 'PROJECT';

ALTER TYPE "NotificationType" ADD VALUE 'GOAL';

ALTER TYPE "NotificationType" ADD VALUE 'ANNOUNCEMENT';

ALTER TYPE "ProductKind" ADD VALUE 'LIVE_EVENT';
