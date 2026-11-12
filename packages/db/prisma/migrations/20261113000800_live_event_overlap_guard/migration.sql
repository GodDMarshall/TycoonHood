-- ============================================================================
-- LIVING ECOSYSTEM 8/8: MENTOR DOUBLE-BOOKING GUARD
--
-- A mentor cannot hold two submitted or scheduled events whose times
-- overlap (back-to-back is allowed: ranges are [start, end)). The booking
-- code also locks the MentorProfile row (SELECT ... FOR UPDATE) and checks
-- buffers; this constraint is the last line. Kept in its own migration so
-- it can be dropped from the release if the production database refuses
-- the btree_gist extension, without touching anything else.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_mentor_no_overlap" EXCLUDE USING gist (
  "mentorId" WITH =,
  tsrange("startsAt", "endsAt") WITH &&
) WHERE ("mentorId" IS NOT NULL AND "status" IN ('SUBMITTED', 'SCHEDULED'));
