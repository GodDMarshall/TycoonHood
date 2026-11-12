-- ============================================================================
-- LIVING ECOSYSTEM, LANDS WITH DAILY-B: CHALLENGE EVIDENCE MOVE (directive §5)
--
-- Copies the submissions kept in ChallengeParticipation.progress into
-- EvidenceSubmission rows (created by 20261113000400_daily_engine), then
-- removes the JSON key. The lead commits this file in the same merge as the
-- DAILY-B change that makes gamification/challenges.ts read and write
-- EvidenceSubmission, so no code ever reads a store that is empty. Data
-- only; deterministic ids make a re-run insert nothing.
-- ============================================================================

-- Move progress.submissions (shape: challenges.ts Submission) into rows. Ids are
-- deterministic, so a re-run inserts nothing. A reviewer whose account is gone
-- is kept as null; the original submission id is kept in legacyId.
INSERT INTO "EvidenceSubmission" ("id", "userId", "challengeId", "participationId", "text", "url", "status", "feedback",
  "reviewedById", "reviewedAt", "legacyId", "createdAt", "updatedAt")
SELECT 'ev' || md5(p."id" || ':' || (s->>'id')),
       p."userId", p."challengeId", p."id",
       COALESCE(s->>'text', ''),
       NULLIF(s->>'url', ''),
       (CASE s->>'status' WHEN 'APPROVED' THEN 'APPROVED' WHEN 'REJECTED' THEN 'REJECTED' ELSE 'PENDING' END)::"EvidenceStatus",
       s->>'feedback',
       (SELECT u."id" FROM "User" u WHERE u."id" = s->>'reviewedBy'),
       (s->>'reviewedAt')::timestamptz AT TIME ZONE 'UTC',
       s->>'id',
       COALESCE((s->>'submittedAt')::timestamptz AT TIME ZONE 'UTC', p."joinedAt"),
       CURRENT_TIMESTAMP
FROM "ChallengeParticipation" p
CROSS JOIN LATERAL jsonb_array_elements(p."progress"->'submissions') AS s
WHERE jsonb_typeof(p."progress"->'submissions') = 'array'
ON CONFLICT ("id") DO NOTHING;
UPDATE "ChallengeParticipation" SET "progress" = "progress" - 'submissions' WHERE "progress" ? 'submissions';
