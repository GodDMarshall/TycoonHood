# Pending migrations

A migration in this folder is written and reviewed, but it is not yet in `packages/db/prisma/migrations/`, because the code that needs it has not landed. `pnpm db:migrate:sql` and `pnpm db:deploy` never read this folder, so no database applies it by accident.

## 20261113000900_challenge_evidence_move

It copies the challenge submissions kept as JSON in `ChallengeParticipation.progress.submissions` into `EvidenceSubmission` rows, then removes the `submissions` key. The table comes from `20261113000400_daily_engine`. It changes data only: no table, column or constraint.

**It lands with DAILY-B.** The lead moves this folder, unchanged, into `packages/db/prisma/migrations/` in the same merge as DAILY-B's change that makes `packages/core/src/gamification/challenges.ts` read and write `EvidenceSubmission`. Every database built before then, the stream databases and the lead's, applies it when that merge arrives.

**Why it must not be applied earlier.** Until DAILY-B, `gamification/challenges.ts` reads and writes `progress.submissions`: the member's challenge page, the staff review queue, and the count of approved submissions that completes a gated challenge all come from that key. Applied before DAILY-B:

- Every submission already made disappears from those pages, and members lose the approvals that count towards completing a challenge. The code still reads the key this migration removes, and nothing reads the new rows yet.
- Submissions made afterwards go back into the JSON key. A migration runs once per database, so when DAILY-B ships this one does not run again, and those submissions stay behind in the JSON, which the new code no longer reads.

**Why it must not be applied later.** DAILY-B's code reads only `EvidenceSubmission`. Without this migration in the same merge, the submissions already made would be invisible to it.

**Safe on a live database.** It only inserts rows and removes a JSON key. Ids are deterministic (`'ev' || md5(participationId || ':' || submissionId)`) and conflicts are skipped, so a second run inserts nothing. A reviewer whose account is gone is kept as null, and the original submission id is kept in `legacyId`. Members can go on making submissions until it runs; all of them are moved.

**Move it byte for byte.** `migrate-sql.ts` records a checksum of every file it applies, comments included, and refuses to run on a database where an applied file has since changed. Do not apply it by hand to a database that runs code from before DAILY-B, for the reasons above; try it on a throwaway database instead. `pnpm db:rehearse --with-pending` does that on fixture rows, and `pnpm db:rehearse --from <database> --with-pending` on a copy of a local database; both check that every submission became one row (docs/DATABASE.md, "Drift check").
