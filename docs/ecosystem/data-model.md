# Living Ecosystem data model (directive §1 to §21)

Written 12 November 2026 for the lead, and revised the same day after the review in `plan/critique.md` (0.7 lists what the review changed).

**The base.** `build/living-ecosystem` at `1ace306` with `build/full-platform` merged into it. Full-platform is at `5d6d243` today; its schema and migrations have not changed since `42334c4`. The merge brings three migrations (`20261112000000_contact_message_user`, `20261112100000_email_hold_notice_sent`, `20261112110000_pending_email_at`, so 15 in all) and the `fix/seed-review` seeds, which full-platform merged at `dd5810e`. The merged schema is `final/base.prisma` in the scratchpad, and every file below was built and checked against it. On `build/living-ecosystem` itself the schema and migrations have not changed since `f7c8ff1`, the commit the directive arrived with. The DR-34 permission work that landed after that commit is taken into account in section e.

Nothing in the repository was changed. Everything below was produced and checked in the scratchpad:

| Artefact | Path |
|---|---|
| Merged schema, formatted, `prisma validate` passes (4757 lines; the same text is Appendix B of `docs/ECOSYSTEM_PLAN.md`) | `/tmp/claude-0/-home-user/c0053d10-843a-5172-a813-3a6059744062/scratchpad/final/dm/schema.prisma` |
| Ten draft migration files, applied and checked on the merged base | `/tmp/claude-0/-home-user/c0053d10-843a-5172-a813-3a6059744062/scratchpad/final/dm/mig/out/<name>/migration.sql` |
| The sources the two are built from | `final/dm/merge.py`, `final/dm/existing_edits.py`, `final/dm/frag_new_1.prisma` to `frag_new_3.prisma`, `final/dm/mig/split.py`, `final/dm/mig/head_*.sql`, `final/dm/mig/hand_*.sql`, and the merged base schema `final/base.prisma` (all under the same scratchpad folder) |
| The rehearsal on the merged base | `final/rehearse.sh` with `final/rehearse_fixtures.sql`. It creates a throwaway database, applies the 15 base migrations, the fixtures and the ten files, prints every check in 0.4, and drops the database |

**How to land it.**
1. Merge `build/full-platform` into `build/living-ecosystem` (the lead's merge task, which also settles the seed conflict between DR-33 and DR-34). Its schema is exactly `final/base.prisma`.
2. Copy `final/dm/schema.prisma` over `packages/db/prisma/schema.prisma`. If the repo schema has changed since, point `SRC` in `final/dm/merge.py` at it and run the script again instead; it stops with an error when one of its patterns no longer matches. Then run `prisma format`.
3. Copy nine of the ten folders under `final/dm/mig/out/` into `packages/db/prisma/migrations/`: `20261113000000` to `20261113000800`. The tenth, `20261113000900_challenge_evidence_move`, is committed later, with DAILY-B, the stream that moves the challenge code to `EvidenceSubmission` (c.1). Until then P0a keeps it at `docs/ecosystem/pending-migrations/20261113000900_challenge_evidence_move/migration.sql`, outside the migrations folder, and commits this file as `docs/ecosystem/data-model.md`.
4. Run `pnpm --filter @tycoonhood/db exec prisma generate` and commit the generated client. In the same commit, fix the code that the new client breaks (0.5, items 4 to 6), so typecheck and the full test suite stay green.
5. Update `docs/DATABASE.md`. It needs the model count (141), the new rows in the migration table, and a correction: paid time now comes from `Order.paidAt`, not from `Payment.createdAt` (see defect 3 below).
6. The seed work in section d is written against the seeds and the build script that `fix/seed-review` left: `SeedRecord`, the deploy lock and the throwaway-database tests. Step 1 brings them in.

## 0. Summary

### 0.1 What this file holds

- **a.** The new models and enums, as Prisma code, for directive §1 to §21, with an index of what each one is for.
- **b.** Every change to an existing model. Enum value additions are listed separately, followed by the data-only changes.
- **c.** The ten migrations: order, names, contents, backfills, the hand-written SQL in full, how they were checked, and deploy notes.
- **d.** The production-safe taxonomy seed, with exact rows. Then the changes the existing seeds need, and the dev-only demo seed.
- **e.** Foundation contracts, with TypeScript signatures and file paths. They cover:
  - permissions and grants, guards and ownership
  - authenticity helpers and zoned time
  - the notification gateway and outbox, and the activity feed
  - academies, admin navigation and audit actions
  - IP keys and privacy facets
  - the shared catalogues, and the existing files that change
- **f.** Every naming collision resolved, with the losing names. This includes the names where this model and `plan/workstreams.md` disagree.
- **g.** Open questions.

### 0.2 Counts

| What | Count |
|---|---|
| New models | 67 (sections 17 to 26 of the schema) |
| New enums | 83 |
| Existing models changed | 33. 28 change in the database; 5 change only in Prisma (relation names or doc comments): `Session`, `CourseModule`, `ChallengeParticipation`, `Referral`, `ContactMessage` |
| Existing enums gaining values | 2. `NotificationType` gains 8, `ProductKind` gains 1 |
| Migrations | 10, `20261113000000` to `20261113000900`. With the 15 on the merged base, 25 in all |
| Models after the change | 141 (74 + 67) |
| Enums after the change | 106 (23 + 83) |
| Columns added to or changed on existing tables | 196 |
| Indexes and foreign keys that Prisma generates | 173 indexes and 226 foreign keys. On existing tables: 45 indexes, 54 new foreign keys, and 1 foreign key replaced |
| Hand-written SQL | 58 CHECK constraints, 1 exclusion constraint, 11 partial unique indexes, 5 generated full-text columns, and the backfills |

### 0.3 Where each directive section lives

| § | Directive section | Models and fields |
|---|---|---|
| 1 | New product experience (Learn, Earn, Grow, Connect, Shop) | No tables of its own. It reads the models below. `Profile.dashboard` holds the member's card layout |
| 2 | Mentors | `Instructor` (extended into the one expert profile), `MentorProfile`, `MentorCategory`, `MentorCategoryLink`, `ExpertCredential`, `MentorOffering`, `MentorAvailabilityRule`, `MentorAvailabilityException`, `CourseCohort`, `CalendarFeedToken`. A booking is a `LiveEvent` of the one-to-one kind with one `EventRegistration`. A mentor review is an `EventFeedback` |
| 3 | Academies (the directive's "campuses"; never "campus" in code) | `Academy`, `AcademyMembership`. `academyId` is added to `Course`, `Challenge`, `CommunityGroup`, `CommunityCategory`, `CommunityPost` and `XpEvent`, and to new models where it applies |
| 4 | Live community | `ActivityEvent`, `Follow`, `MemberBlock`, `SavedPost`. Kinds, edits, highlights, replies and accepted answers on `CommunityPost` and `CommunityComment`. Topics, review, join policy, roles and bans on `CommunityGroup` and `GroupMembership`. Headline and opt-in location on `Profile` |
| 5 | Daily activity engine | `Mission` (cadence, verification, targeting), `MissionCompletion.occurrence`, `Challenge` (kinds, scopes, templates), `EvidenceSubmission`, `DailyPlan`, `DailyPlanItem`, `Goal`, `GoalCheckIn` |
| 6 | Live events and workshops | `EventKind`, `LiveEvent`, `LiveEventHost`, `EventRegistration`, `EventFeedback`, `LiveEventSeries`, `EventInterest`. Also `Resource.eventId`, `ProductKind.LIVE_EVENT`, `OrderItem.registrationId` and `Order.source` |
| 7 | Opportunity marketplace | `Partner`, `PartnerMember`, `Opportunity`, `OpportunitySkill`, `OpportunityApplication`, `OpportunityApplicationEvent`, `SavedOpportunity` |
| 8 | Progression and identity | `Skill`, `ModuleSkill`, `ChallengeSkill`, `MemberSkill`, `Project`, `ProjectSkill`, `RankAward`, `LearningPath`, `LearningPathStep`, `LearningPathFollow`. Also `RankDefinition.criteria`, `Achievement.kind`, the award fields on `UserAchievement`, and `Profile.pinnedItems` |
| 9 | Personal Tycoonhood Guide | `GuideConversation`, `GuideMessage`, `GuideUsage`, `Profile.aiGuideConsentAt` |
| 10 | Homepage | No tables of its own. It reads the `publicWhere` helpers (e.3). The founder section reads the `Instructor` row with `isFounder` |
| 11 | Member dashboard | `Profile.dashboard`, `DailyPlan`, `Goal`, `ActivityEvent` |
| 12 | Creator and instructor ecosystem | `ContributorApplication`, `ContributorAccount`, `RevenueShareAgreement`, `ContributorEarning`, `ContentSubmission`. Also `Resource.status` and `Resource.submittedById`, `PayoutRequest.contributorId`, `Course.deliveryMode` and `Enrollment.cohortId` |
| 13 | Notification system | `Notification` (extended), `NotificationTopic`, `NotificationPreference`, `NotificationSettings`, `PushSubscription`, `Announcement`, `ScheduledNotification`. `NotificationType` gains 8 values |
| 14 | Content and editorial engine | `Post` (status workflow, kinds, bylines, search), `PostRevision`, `PostCategory`, `Tag`, `PostTag`, `HelpArticle`. Also `Lesson.searchVector` |
| 15 | Founder presence | `Instructor.isFounder`. `FOUNDER_NOTE` posts with `Post.founderApprovedAt`. The `founder-session` event kind |
| 16 | Visual and interaction design | No tables |
| 17 | Trust and authenticity | `isDemo` on 13 models. Verification fields on `Instructor`, `ExpertCredential`, `Partner`, `Project`, `MemberSkill` and `Testimonial`. `Product.stockConfirmedAt` (no scarcity claims without confirmed stock) and `User.excludeFromMetrics`. Keyed `Session.ipHash`; `Referral.signupIp` is nulled |
| 18 | Admin control centre | No tables of its own. It uses the review queues: `ContributorApplication`, `ContentSubmission`, `EvidenceSubmission`, `Partner`, `Opportunity`, submitted `LiveEvent` rows and `Post` rows in review. Plus `Announcement`, `NotificationTopic`, the audit actions (e.9) and the grouped navigation (e.8) |
| 19 | Engagement analytics | `MemberActivityDay`, `AnalyticsDaily`, `EngagementCounterDay`, `Order.paidAt`, `User.excludeFromMetrics` |
| 20 | Execution instructions | Sections c and d: migration order and seeds |
| 21 | Definition of done | Members join academies (`AcademyMembership`). Section c.4 lists what was verified |

### 0.4 What was checked

- `prisma format` and `prisma validate` (Prisma 6.19.3) pass on the merged schema.
- **The first draft** was checked on a private PostgreSQL 16 cluster, outside the repository, on a Unix socket only, against the 12-migration base.
  - **A database with data.** It held the 12 existing migrations and the seeds of that time. It also holds fixture rows for the cases a backfill could get wrong:
    - an enrolment that was dropped
    - XP events of four sources
    - a mission completion with a legacy key
    - challenge submissions in JSON, one reviewed by an account that no longer exists
    - four orders: a THC order, a rupee order with two `order.paid` audit rows, a manually settled order now FULFILLED, and a pending order
    - a referral with `signupIp` and a session with `ipHash`
    - posts and comments, one of them hidden
    - the `community.archived` setting
    - a future-dated blog post and a draft one

    The nine draft migrations were applied in order, each in one transaction as `migrate-sql.ts` does. Every backfill was checked row by row (c.4).
  - **An empty database.** All 21 migrations (12 existing, 9 draft) applied, then the seeds of that time ran.
  - **Drift.** `prisma migrate diff` from the migrated database to the schema leaves only five lines of the form `ALTER TABLE "X" ALTER COLUMN "searchVector" DROP DEFAULT`. This is how Prisma 6 reports a generated column. Nothing else drifts.
  - **Behaviour tests.**
    - The notification coalescing insert works.
    - The mentor overlap exclusion works.
    - 15 constraint cases are refused as intended.
    - Full-text search finds the right posts.
    - Deleting a user cascades as designed. (The review changed one rule: a contributor's account now blocks the delete; see the rerun.)
- **The rerun after the review**, on the merged base. A throwaway database on the repo's PostgreSQL 16.15 server (`tycoonhood_plancheck_test`, dropped afterwards) took the 15 base migrations, the fixtures in `final/rehearse_fixtures.sql` and the ten files, in name order, each in one transaction. It checked what the review changed:
  - academy memberships: BACKFILL rows with `notify` false, and a dropped enrolment left out;
  - course academies, mission cadences (a 20-hour and a 72-hour cooldown both became DAILY and kept their cooldown) and the three kinds of occurrence key;
  - the evidence move in 000900: APPROVED with its reviewer, PENDING, and REJECTED with a deleted reviewer as null; `progress` kept only `checkins`;
  - the new defaults (`notify` false, `bookingMode` INSTANT, `sharedFields` empty, `cancellationHours` and `notAfter` nullable) and the plain index `OrderItem_registrationId_idx`;
  - the new CHECK constraints: a 200-hour cancellation window and a 400-day hold were refused, NULL and in-range terms accepted;
  - RESTRICT: deleting a user who has a `ContributorAccount` was refused, and allowed once that row was gone;
  - drift: exactly the five `searchVector` lines again.
- **Not checked.** The application and the vitest suite were not run against the new schema. The generated client and the code changes do not exist yet. The rerun did not repeat the empty-database seed run or the first draft's behaviour tests; the SQL those exercised is unchanged apart from what the rerun covered.

### 0.5 Defects found, and where this model departs from LEAD_DECISIONS

**Defects in the existing code and data.** Each comes with the smallest change that fixes it.

1. **Raw IP addresses are stored, which breaks a house rule.**
   - Where: `apps/web/app/(auth)/actions.ts:90-91` passes the raw IP from `deviceInfo()` to `referrals.attach(user.id, code, ip)`, and `growth/referrals.ts:75,91` writes it to `Referral.signupIp`. Nothing reads the column.
   - Smallest change: remove the `ip` parameter from `attach` and from its caller. Migration 000100 nulls the column, and a later migration drops it.
2. **`Session.ipHash` can be reversed.**
   - Where: `auth/session.ts:35` stores `sha256(ip).slice(0, 32)`. An unkeyed hash of an IPv4 address can be reversed by hashing all 2^32 addresses.
   - Smallest change: `ipKey()` becomes an HMAC with a server secret (e.10). Migration 000100 nulls the old values.
3. **`docs/DATABASE.md` gets the paid time wrong.** It says paid time is read from `Payment.createdAt`, but `checkout.ts` creates `Payment` rows when the order is started (status CREATED).
   - Smallest change: add `Order.paidAt`, set when an order becomes PAID. Migration 000100 backfills it from the ledger transaction (THC) and from the first `order.paid` or `order.settle_manual` audit row (rupees).

4. **`rewards.ts` writes mission completions without an occurrence.** `packages/core/src/rewards/rewards.ts:73` creates `MissionCompletion` with `userId`, `missionId` and `idempotencyKey` only. Migration 000400 makes `occurrence` NOT NULL, so every mission payout would fail.
   - Smallest change: pass `occurrence` (the value the function already computes for the key) in the same commit as the migration. It is the only production write site.
5. **Payout code assumes every payout has an affiliate.** `PayoutRequest.affiliateId` becomes nullable, because a payout now has an affiliate or a contributor (`PayoutRequest_one_payee`). Typecheck then fails where code reads it as a string.
   - Where: `earn/affiliates.ts:212-213`, `:824`, `:897` and `:981`; `apps/web/app/(app)/admin/earn/page.tsx:54` and `:256-269`.
   - Smallest change: affiliate queries filter `affiliateId: { not: null }`, and the code narrows the value before use. Contributor payouts get their own queries (MONEY).
6. **One test expects the UTC fallback.** `packages/core/test/rules-engine.test.ts:246-249` ("falls back to UTC on a garbage zone") expects UTC. After e.4 the fallback is India time; the test changes with `time/day.ts` (P0c).

**Departures from LEAD_DECISIONS.** Each one is deliberate and comes with its reason.

1. **The four `Academy` rows are inserted by migration 000100**, not only by a seed. The academy backfills in the same migration need the rows to exist. `seed-taxonomy.ts` holds the same rows, create-only, and a test checks the two are equal.
2. **Event kinds are a table (`EventKind`), not an enum, and its one-to-one row is inserted by migration 000300.** LEAD #4 says only "kind". As a table, staff can add a kind without a migration. Booking code needs the one-to-one row in every database built from migrations, and a partial unique index allows only one ONE_TO_ONE kind.
3. **The taxonomy seed runs on every production deploy, not once. This fixes a defect in LEAD_DECISIONS.** The LEAD rule is that production seeds run once, on the first production deploy, under SEED_ON_DEPLOY. With that rule, a skill or event kind added in a later release would never reach production (workstreams D5). The seed is create-only, so running it again changes nothing that staff edited. It also records what it made (`SeedRecord`, from the `fix/seed-review` branch), so a row that staff renamed or deleted is never made again.
4. **Opportunity kinds follow the directive's ten (§7)** instead of LEAD #6's examples. `FREELANCE_PROJECT` replaces `PROJECT`, as workstreams N5 recommends.
5. **Grants are derived from rows; there is no grant table.** LEAD #14's grant names (mentor, contributor, partner) are kept. Each grant is read from the expert and partner rows the member already has, so there is no separate grant table and no `CapabilityGrant` table as in the workstreams plan. This gives one source of truth: suspending a mentor or a partner removes the grant on the member's next request. Grants for staff areas would need a table; that is open question 6 (owner decision O37, default: not built).
6. **One product kind, `LIVE_EVENT`, covers paid sessions and paid events** (LEAD #15). There are not two kinds such as SESSION and EVENT. LEAD #4 rules out the word "session", and both are `LiveEvent` rows.
7. **There is no `CourseSkill` join table.** LEAD #8 lists "modules/courses". A course's skills are the union of its modules' skills (`ModuleSkill`), so a second join table could only drift from them.
8. **`isDemo` is on 13 models, not on every model that can show sample content.** `CommunityPost` and `CommunityComment` do not carry it, because a demo post always has a demo author and the filter goes through `author.isDemo`. `Post` does carry it, because a byline can be a plain name.

**The workstreams plan (`plan/workstreams.md`).**
- Its defects D1 to D6 are allowed for:
  - D1 (demo seed guard) in d.3.
  - D2 (a host could block a bad review by marking NO_SHOW): `EventRegistration` gains `memberConfirmedAt` and the `attendanceDispute*` fields, and `AttendanceSource` has `JOIN_LINK` and `MEMBER_CONFIRMED`.
  - D3 (the CREATOR label) in e.1.
  - D4 (no frequent dispatcher) in e.5.
  - D5 (taxonomy seeds that run only once) in d.1 and departure 3 above.
  - D6 (paid financial-literacy guidance) in d.1.2: `MentorCategory.paidAllowed` and `disclaimer`, with `EventRegistration.disclaimerAckAt` (owner decision O39).
- One gap in the plan is closed here. Its time-zone rule ("a change applies from the next local midnight") does not say which zone's midnight. The schema it assumes keeps only `Profile.timezone`, so once a member saves a new zone, nothing records the zone that must stay in force until the switch. `Profile.previousTimezone` and `Profile.timezoneEffectiveAt` record both. `nextZoneCutover` (e.4) picks a switch point at which the member's day key neither goes back nor skips a day.
- Section f lists every name on which this model and the plan differ.

### 0.6 Conventions

- **Tags.** Every new model and enum has a `/// §N` tag at the start of its doc comment. Every block of new fields on an existing model starts with `// ---- Living ecosystem (directive §...) ----`. The schema's numbered section headers continue from 17 to 26.
- **Types.** Ids are cuid strings. Money is in integer paise (`...Cents Int`) and THC amounts are `BigInt`. Long text is `@db.Text`. Calendar dates are `@db.Date`.
- **onDelete.**
  - `Cascade` for rows a member or a parent owns.
  - `SetNull` for references to an actor, reviewer or editor. History survives when a staff account is removed.
  - `Restrict` where a delete would move or orphan public content: a community post's group, an opportunity's partner, a live event's kind.
- **Soft states.** Anything with history is closed with a timestamp (`archivedAt`, `revokedAt`, `leftAt`, `hiddenAt`) instead of being deleted.
- **Review queues.** Every review queue has a status, `reviewedAt`, `reviewedById` and a reason field that the submitter sees.
- **Privacy.** No table stores a raw IP or a full user agent. Tokens are stored as sha256 hashes.
- **Hand-written SQL.** CHECK constraints, partial unique indexes and the exclusion constraint are hand-written, because Prisma does not model them. `prisma migrate diff` ignores them.
- **Full-text search.** Search columns are `Unsupported("tsvector")?` with `@@index([searchVector], type: Gin)` in the schema, and `GENERATED ALWAYS AS (...) STORED` in the SQL. The client never writes them.

### 0.7 What the review changed

The review (`plan/critique.md`) raised 36 issues. Every one was accepted except one part of issue 18 (below). These are the changes to this model; the plan changes are in `plan/workstreams.md`.

| Issue | Change |
|---|---|
| 1 (R007) | `Product.academyId` (SET NULL), so academy and programme pages can list products linked to the academy |
| 2 (SEBI) | `MentorCategory.disclaimer` and `paidAllowed`; `MentorOffering.categoryId`; `EventRegistration.disclaimerAckAt`. Financial-literacy offerings are free only until the owner decides (O39) |
| 3 (names) | Section f now lists the plan's names that this model replaced; they are binding. `GroupAction` gains `createEvent` and `createChallenge` (e.2) |
| 11 | `Course.academyId` is the source of truth; the authoring service sets `pillar` from it (e.7) |
| 15 | The migrations are renamed to `20261113...` and built against the merged base |
| 16 | The evidence move leaves 000400 for its own file, 000900, which lands with DAILY-B. The code the schema breaks is listed in 0.5 (items 4 to 6) and fixed in the commit that lands the schema |
| 17 | `MentorProfile.bookingMode` defaults to INSTANT. REQUEST is built too, with the hold and cap rules in the model's doc comment |
| 18 | `RevenueShareAgreement.holdDays`, `minPayoutCents` and `refundWindowHours`, and `MentorProfile.cancellationHours`, with range checks. **Rejected:** a separate `platformFeeBps`. The platform keeps exactly 10000 − `contributorShareBps`; a second field could disagree with it |
| 19 | `OrderItem.registrationId` is a plain index, not unique: a registration can have a cancelled order and then a paid one. One PENDING or PAID order per registration is enforced in code, under a row lock on the registration |
| 20 | `ScheduledNotification.notAfter`: a stale reminder is skipped, and quiet hours never push a row past it |
| 21 | `ProjectCollaborator` and `ProjectCollaboratorStatus` |
| 22 | `AcademyMembership.notify`, false for BACKFILL and ENROLMENT, true for SELF and ONBOARDING |
| 23 | The mission backfill keeps `cooldownHours`. DAILY-A honours a cooldown above 24 hours as a minimum gap; at 24 hours or less the day key decides |
| 24 | `GroupMemberStatus.INVITED` and `GroupMembership.invitedById` |
| 25 | `OpportunityApplication.sharedFields` (`ApplicantContactField[]`) replaces a single share-contact flag |
| 26 | Rows are cancelled by subject (`cancelForSubject`, index on `subjectType, subjectId`), never by a key prefix |
| 27 | `ContributorAccount.user` is RESTRICT. Account deletion anonymises a contributor instead, as the published privacy policy promises (O36) |
| 30 | Only an approved mentor (`MentorProfile` ACTIVE with `approvedAt`) holds `progression.verify` (e.1) |
| 31 | Event feedback is public only when the host or a check-in recorded attendance, or a member's own confirmation is over 7 days old with no dispute (e.3) |
| 32 | `Instructor.photoSha256`. Changing `photoUrl` clears `photoVerifiedAt` and the hash; a daily sweep re-fetches verified photos and clears verification when the bytes change |
| Feed | `ActivityEvent @@index([courseId, occurredAt])` for the course feed scope |

## a. New models and enums

The Prisma code in a.3 is copied unchanged from the validated `dm/schema.prisma`, from the section 17 header to the end of the file. It follows the existing schema's conventions:
- the numbered section headers;
- `///` doc comments on what is not obvious;
- `@db.Text` for long text;
- explicit `onDelete` on every relation;
- named relations wherever two models are joined more than once.

The new models also need back-relation fields on existing models, such as `User.academyMemberships`. Those fields are listed in section b.

### a.1 New models: index

The migration column says which migration creates the table. The text is the first line of the model's doc comment.

| Section | Model | Migration | Directive tag | What it holds |
|---|---|---|---|---|
| 17. Academies | `Academy` | 000100 | §3 | A learning academy (Warrior, Business, Wealth, Wellness). |
| 17. Academies | `AcademyMembership` | 000100 | §3/§21 | Members join any number of academies. Leaving is soft. |
| 18. Notification centre | `NotificationTopic` | 000100 | §13 | Staff-editable label and default channels for one topic of the code catalogue (packages/core/src/platform/notification-topics.ts). The catalogue decides which topics exist and which are locked; a missing row falls back to catalogue defaults. |
| 18. Notification centre | `NotificationPreference` | 000100 | §13 | A member's override for one topic on one channel. No row = the topic default. |
| 18. Notification centre | `NotificationSettings` | 000100 | §13 | Digest, quiet hours, pause and one-click unsubscribe. Created on first change or first email. |
| 18. Notification centre | `PushSubscription` | 000100 | §13 | A web push endpoint. Built but inert until VAPID keys exist (OQ-K). |
| 18. Notification centre | `Announcement` | 000100 | §13/§18 | A stored, scheduled, audience-targeted, retractable announcement. Replaces fire-and-forget cms.announce. |
| 18. Notification centre | `ScheduledNotification` | 000100 | §13 | The one outbox for timed and out-of-band delivery (LEAD #5). A row is either a scheduled notice (channel null: at runAt the gateway delivers it on every channel the member's preferences then allow) or one EMAIL/PUSH copy of a notice (channel set). Used by event and mentoring reminders, challenge deadlines, goal nudges, digests and the email/push copies of immediate notices. |
| 19. Activity feed and analytics | `ActivityEvent` | 000100 | §4/§10/§11 | One item of the member-facing feed. Privacy is applied on read, so turning a facet off hides past items too. |
| 19. Activity feed and analytics | `MemberActivityDay` | 000100 | §19 | One row per member per platform day (IST) on which they used the signed-in app. The source for DAU, WAU, MAU and retention. No IP, user agent, URL or device. |
| 19. Activity feed and analytics | `AnalyticsDaily` | 000100 | §19 | Immutable daily rollup. Counts use countableMemberWhere (no staff, suspended, excluded or demo accounts); money counts LIVE payments only. |
| 19. Activity feed and analytics | `EngagementCounterDay` | 000100 | §19 | Anonymous daily counters that give funnels a denominator. No user id. |
| 20. Progression and identity | `Skill` | 000200 | §8/§7 | A skill. academyId null = cross-academy. |
| 20. Progression and identity | `ModuleSkill` | 000200 | §8 | Curriculum modules teach skills. A course's skills are its modules' skills. seed-academy recreates these rows whenever it rebuilds modules. |
| 20. Progression and identity | `ChallengeSkill` | 000200 | §8/§5 |  |
| 20. Progression and identity | `MemberSkill` | 000200 | §8/§7 | A member's standing in one skill. DECLARED comes from the member; higher levels are recomputed from evidence; VERIFIED needs someone other than the member. |
| 20. Progression and identity | `Project` | 000200 | §8/§4/§12 | A member's project or portfolio piece (also a contributor's showcased work). The showcase is a view over published, VISIBLE, PUBLIC/MEMBERS projects. |
| 20. Progression and identity | `ProjectCollaborator` | 000200 | §12/§4 | A member the project owner invited. Shown only after they accept, and only where their own `projects` facet allows it. Declining or removal hides them again. |
| 20. Progression and identity | `ProjectSkill` | 000200 | §8 | Skills a project claims; they count only once the project is VERIFIED. |
| 20. Progression and identity | `RankAward` | 000200 | §8 | Why a member holds a rank. User.rankId stays the cache; ranks never demote. |
| 20. Progression and identity | `LearningPath` | 000200 | §3 | An ordered route through an academy's material. Duration is computed from the steps. |
| 20. Progression and identity | `LearningPathStep` | 000200 | §3 | One step of a path pointing at real content. A target that is deleted becomes null (SetNull) and the admin flags the step. |
| 20. Progression and identity | `LearningPathFollow` | 000200 | §3 | A member following a path. Progress is derived, never stored. |
| 21. Mentors and contributors | `MentorProfile` | 000300 | §2 | Mentor-specific settings and standing, 1:1 with the expert profile. |
| 21. Mentors and contributors | `MentorCategory` | 000300 | §2 | The directive's ten mentor categories, as data (seed-taxonomy.ts). |
| 21. Mentors and contributors | `MentorCategoryLink` | 000300 | §2 | One primary category per mentor (partial unique index). |
| 21. Mentors and contributors | `ExpertCredential` | 000300 | §2 | A qualification. Public only when VERIFIED ("qualifications where verified"). |
| 21. Mentors and contributors | `ContributorApplication` | 000300 | §2/§12 | One application flow for mentors, instructors and creators. |
| 21. Mentors and contributors | `ContributorAccount` | 000300 | §2/§12 | The private payee record of an approved contributor, kept apart from the public profile so payout data never leaks through profile queries. |
| 21. Mentors and contributors | `RevenueShareAgreement` | 000300 | §2/§12 | The contributor's share for a scope. contributorId null = platform default. No row is seeded: paid offerings stay unpublishable until staff set terms (LEAD #15). |
| 21. Mentors and contributors | `ContributorEarning` | 000300 | §2/§12 | Money a contributor earns from one paid order line, in INR paise. Held, then approved by staff, like Commission. Lines paid in TEST mode are never payable. |
| 21. Mentors and contributors | `MentorOffering` | 000300 | §2 | What a member can book or join: format, length, seats and an honest price. |
| 21. Mentors and contributors | `MentorAvailabilityRule` | 000300 | §2 | A mentor's recurring weekly availability in their own zone: the only source of bookable slots, so availability is never invented. |
| 21. Mentors and contributors | `MentorAvailabilityException` | 000300 | §2 | Dated changes to the weekly rules: time off, or extra one-off availability (UTC instants). |
| 21. Mentors and contributors | `CourseCohort` | 000300 | §2 | A dated, mentor-led run of a course with its own members, sessions and channel. |
| 21. Mentors and contributors | `ContentSubmission` | 000300 | §12 | One review queue: contributor course submissions, edits to published courses by authors without trustedAuthor, and contributor resources. Events, posts, projects, opportunities, applications and partners keep their own status and join the admin review inbox as a read model. |
| 21. Mentors and contributors | `CalendarFeedToken` | 000300 | §2/§6 | A private ICS feed of a member's registrations and a host's events. Only the hash is stored. |
| 22. Live events | `EventKind` | 000300 | §6 | Event kinds as data. Exactly one row has mode ONE_TO_ONE (slug "one-to-one", inserted by migration); the others are seeded by seed-taxonomy.ts. |
| 22. Live events | `LiveEvent` | 000300 | §6/§2 | Every scheduled live thing: mentor 1:1s, group mentoring, workshops, masterclasses, AMAs, live classes, meetups, founder sessions. Named LiveEvent because `events` is the EventBus. Times are UTC; `timezone` is the host's zone for display. |
| 22. Live events | `LiveEventHost` | 000300 | §6 | Who runs an event. Publishing needs at least one confirmed host; a guest speaker without an account is named only after staff confirm them. |
| 22. Live events | `EventRegistration` | 000300 | §6/§2 | A seat, a waitlist place or a 1:1 booking, and its attendance. |
| 22. Live events | `EventFeedback` | 000300 | §6/§2 | Feedback from a verified attendee only (registration ATTENDED). Also the mentor review. Public only when the host or check-in marked attendance, or memberConfirmedAt is over 7 days old with no dispute. |
| 22. Live events | `LiveEventSeries` | 000300 | §6 | A recurring programme on the open schedule. It never invents dates: each dated session is its own LiveEvent, and cadenceNote is the owner's own wording. |
| 22. Live events | `EventInterest` | 000300 | §6/§2 | "Tell me when": a member asks to hear when a matching real event or mentor slot is published. |
| 23. Daily activity engine | `DailyPlan` | 000400 | §5/§11 | The member's activities for one local day, generated once on first view. |
| 23. Daily activity engine | `DailyPlanItem` | 000400 | §5 | One chosen activity with an honest reason. Done-state is derived from real rows. |
| 23. Daily activity engine | `Goal` | 000400 | §5/§9/§11 | A personal goal, private by default; progress is derived from real rows. |
| 23. Daily activity engine | `GoalCheckIn` | 000400 | §5 | A manual check-in on the member's day. |
| 23. Daily activity engine | `EvidenceSubmission` | 000400 | §5 | One piece of evidence for a REVIEW mission or a SUBMISSION / GATED_SUBMISSIONS challenge. Replaces ChallengeParticipation.progress.submissions (moved by migration). |
| 24. Live community | `Follow` | 000500 | §4 | Following a member (mentors are members too). CHECK: no self-follow. |
| 24. Live community | `MemberBlock` | 000500 | §4/§17 | A block removes follows both ways, prevents re-following, and hides the blocked member's activity and notices from the blocker. CHECK: no self-block. |
| 24. Live community | `SavedPost` | 000500 | §4 | Saved posts (a project is saved through its discussion post). |
| 25. Opportunity marketplace | `Partner` | 000600 | §7 | An organisation or person that posts opportunities, with its own PENDING -> VERIFIED review. |
| 25. Opportunity marketplace | `PartnerMember` | 000600 | §7 | Rights scoped to one partner (the partner dashboard). Partners are not a UserRole. |
| 25. Opportunity marketplace | `Opportunity` | 000600 | §7 | One listing in the opportunity marketplace. |
| 25. Opportunity marketplace | `OpportunitySkill` | 000600 | §7 | Required and nice-to-have skills of a listing. |
| 25. Opportunity marketplace | `OpportunityApplication` | 000600 | §7 | A member's application, and its status. |
| 25. Opportunity marketplace | `OpportunityApplicationEvent` | 000600 | §7 | The status timeline an applicant sees, and the trail of partner decisions. |
| 25. Opportunity marketplace | `SavedOpportunity` | 000600 | §7 | Saved opportunities (like WishlistItem). |
| 26. Editorial engine and Guide | `PostRevision` | 000700 | §14 | Edit history, written on every save of a draft and before publishing. |
| 26. Editorial engine and Guide | `PostCategory` | 000700 | §14 | Editorial categories (seed-taxonomy.ts). |
| 26. Editorial engine and Guide | `Tag` | 000700 | §14 | Free-form tags. |
| 26. Editorial engine and Guide | `PostTag` | 000700 | §14 |  |
| 26. Editorial engine and Guide | `HelpArticle` | 000700 | §9/§14 | FAQ and feature explanations as data: one source for /faq, the Guide and search. |
| 26. Editorial engine and Guide | `GuideConversation` | 000700 | §9 | A member's own Guide thread. Only the member sees it; deletable. |
| 26. Editorial engine and Guide | `GuideMessage` | 000700 | §9 | Questions and answers with sources, labelling, usage and feedback. |
| 26. Editorial engine and Guide | `GuideUsage` | 000700 | §9 | The daily question quota per member day (memberDayKey), in the database because the in-memory limiter counts per instance. |

### a.2 New enums: index

| Section | Migration | Enums |
|---|---|---|
| 17. Academies | 000100 | `AcademyJoinSource` |
| 18. Notification centre | 000100 | `NotificationChannel`, `NotificationPriority`, `DigestFrequency`, `ScheduledNotificationStatus`, `AnnouncementPriority`, `AnnouncementAudience`, `AnnouncementStatus` |
| 19. Activity feed and analytics | 000100 | `ActivityEventKind`, `ActivityAudience` |
| 20. Progression and identity | 000200 | `SkillLevel`, `SkillVerifiedVia`, `ProjectKind`, `ProjectVisibility`, `ProjectVerificationStatus`, `ProjectCollaboratorStatus`, `RankAwardReason`, `AchievementKind`, `PathStepKind` |
| 21. Mentors and contributors | 000300 | `ExpertStatus`, `ContributorKind`, `ContributorApplicationStatus`, `ContributorAccountStatus`, `MentorStatus`, `BookingMode`, `CredentialKind`, `CredentialStatus`, `AvailabilityExceptionKind`, `RevenueScope`, `CourseDelivery`, `CohortStatus`, `ContentSubmissionType`, `ContentSubmissionStatus`, `ResourceAudience`, `OrderSource` |
| 22. Live events | 000300 | `EventMode`, `LiveEventFormat`, `LiveEventStatus`, `LiveEventVisibility`, `LiveEventHostRole`, `EventRegistrationStatus`, `AttendanceSource` |
| 23. Daily activity engine | 000400 | `MissionCadence`, `MissionVerification`, `MissionKind`, `PlanSlot`, `PlanItemKind`, `GoalMetric`, `GoalCadence`, `GoalStatus`, `GoalSource`, `ChallengeKind`, `ChallengeScope`, `ChallengeCadence`, `EvidenceStatus` |
| 24. Live community | 000500 | `CommunityPostKind`, `GroupTopic`, `GroupStatus`, `GroupJoinPolicy`, `GroupVisibility`, `GroupRole`, `GroupMemberStatus`, `GroupNotifyLevel` |
| 25. Opportunity marketplace | 000600 | `PartnerKind`, `PartnerStatus`, `PartnerVerificationMethod`, `PartnerMemberRole`, `OpportunityKind`, `WorkMode`, `CompensationType`, `OpportunityApplyMode`, `OpportunityStatus`, `OpportunityApplicationStatus`, `ApplicantContactField` |
| 26. Editorial engine and Guide | 000700 | `PostKind`, `PostStatus`, `ConsentSource`, `HelpTopic`, `HelpAudience`, `GuideMode`, `GuideRole`, `GuideMessageKind`, `GuideFeedback` |

The values of every new enum are in the code below. Where a value's meaning is not obvious it has a doc comment.

### a.3 Prisma code: schema sections 17 to 26

```prisma
// ============================================================
// 17. LIVING ECOSYSTEM — ACADEMIES  (directive §3, §1, §21)
// One Academy row per Pillar, inserted by migration. Names are
// editable data; the pillar is the stable key older rows map
// through. Never "campus" in code or URLs (that is the 3D world).
// ============================================================

/// §3 How a member came to belong to an academy.
enum AcademyJoinSource {
  SELF
  ENROLMENT
  ONBOARDING
  BACKFILL
}

/// §3 A learning academy (Warrior, Business, Wealth, Wellness).
model Academy {
  id               String        @id @default(cuid())
  /// warrior | business | wealth | wellness
  slug             String        @unique
  pillar           Pillar        @unique
  name             String
  shortName        String
  /// The directive's focus line.
  tagline          String
  description      String        @db.Text
  focusAreas       String[]      @default([])
  /// Design token key (warrior | builder | tycoon | mind), never a hex value.
  accent           String
  /// A PhotoName from apps/web/lib/photos.ts.
  heroPhoto        String?
  /// Wealth: education, not advice. Wellness: not medical treatment.
  disclaimer       String?       @db.Text
  welcomeMd        String?       @db.Text
  flagshipCourseId String?       @unique
  flagshipCourse   Course?       @relation("AcademyFlagship", fields: [flagshipCourseId], references: [id], onDelete: SetNull)
  status           ContentStatus @default(PUBLISHED)
  sortOrder        Int           @default(0)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  courses          Course[]            @relation("AcademyCourses")
  memberships      AcademyMembership[]
  challenges       Challenge[]
  groups           CommunityGroup[]
  categories       CommunityCategory[]
  communityPosts   CommunityPost[]
  xpEvents         XpEvent[]
  achievements     Achievement[]
  missions         Mission[]
  skills           Skill[]
  learningPaths    LearningPath[]
  projects         Project[]
  goals            Goal[]
  mentorCategories MentorCategory[]
  eventKinds       EventKind[]
  liveEvents       LiveEvent[]
  eventSeries      LiveEventSeries[]
  eventInterests   EventInterest[]
  activity         ActivityEvent[]
  announcements    Announcement[]
  opportunities    Opportunity[]
  posts            Post[]
  /// Shop products staff link to this academy (academy and programme pages list them when active).
  products         Product[]
}

/// §3/§21 Members join any number of academies. Leaving is soft.
model AcademyMembership {
  id        String            @id @default(cuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  academyId String
  academy   Academy           @relation(fields: [academyId], references: [id], onDelete: Cascade)
  source    AcademyJoinSource @default(SELF)
  joinedAt  DateTime          @default(now())
  /// Soft leave keeps history; rejoining clears it; automatic joins never override it.
  leftAt    DateTime?
  /// Academy updates and announcements reach this member. Opt-in: SELF and ONBOARDING joins set it
  /// true; BACKFILL and ENROLMENT joins leave it false, because enrolling is not a request for notices.
  notify    Boolean           @default(false)

  @@unique([userId, academyId])
  @@index([academyId, leftAt])
}

// ============================================================
// 18. NOTIFICATION CENTRE  (directive §13; LEAD #5, #10)
// In-app rows are written at once; email and push copies and
// every timed notice go through the one outbox,
// ScheduledNotification. Push is inert until VAPID keys exist.
// ============================================================

/// §13 Delivery channels.
enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
}

/// §13
enum NotificationPriority {
  LOW
  NORMAL
  HIGH
}

/// §13
enum DigestFrequency {
  OFF
  DAILY
  WEEKLY
}

/// §13
enum ScheduledNotificationStatus {
  PENDING
  SENT
  /// Dev mail mode: written to the server log, not emailed.
  LOGGED
  /// Not sent on purpose: preference off at dispatch, no mail provider, push not configured, subject gone.
  SKIPPED
  CANCELLED
  FAILED
}

/// §13/§18
enum AnnouncementPriority {
  NORMAL
  IMPORTANT
}

/// §13/§18
enum AnnouncementAudience {
  ALL
  ROLE
  ACADEMY
  GROUP
  COURSE
}

/// §13/§18
enum AnnouncementStatus {
  DRAFT
  SCHEDULED
  SENT
  RETRACTED
}

/// §13 Staff-editable label and default channels for one topic of the code catalogue
/// (packages/core/src/platform/notification-topics.ts). The catalogue decides which
/// topics exist and which are locked; a missing row falls back to catalogue defaults.
model NotificationTopic {
  key          String   @id
  label        String
  description  String?
  defaultInApp Boolean  @default(true)
  defaultEmail Boolean  @default(false)
  defaultPush  Boolean  @default(false)
  /// Staff can silence a noisy topic. Ignored for locked topics.
  active       Boolean  @default(true)
  updatedById  String?
  updatedBy    User?    @relation("NotificationTopicEditor", fields: [updatedById], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

/// §13 A member's override for one topic on one channel. No row = the topic default.
model NotificationPreference {
  userId    String
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic     String
  channel   NotificationChannel
  enabled   Boolean
  updatedAt DateTime            @updatedAt

  @@id([userId, topic, channel])
}

/// §13 Digest, quiet hours, pause and one-click unsubscribe. Created on first change or first email.
model NotificationSettings {
  userId               String          @id
  user                 User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  emailDigest          DigestFrequency @default(OFF)
  /// Hour of the member's own day (memberZone), 0-23.
  digestHour           Int             @default(8)
  /// Minutes of the member's local day, 0-1439. Both null = no quiet hours.
  quietStartMin        Int?
  quietEndMin          Int?
  pausedUntil          DateTime?
  /// Opted out of all non-essential email.
  emailOptOutAt        DateTime?
  /// sha256 of the member's unsubscribe token, HMAC(privacySecret(), "unsub|" + userId); the token is never stored.
  /// Links carry the token plus one topic key: they turn off that topic's email, and the page also offers
  /// "all non-essential email" (emailOptOutAt). Essential topics cannot be unsubscribed.
  unsubscribeTokenHash String          @unique
  updatedAt            DateTime        @updatedAt
}

/// §13 A web push endpoint. Built but inert until VAPID keys exist (OQ-K).
model PushSubscription {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint     String    @unique
  p256dh       String
  auth         String
  /// e.g. "Chrome on Android". No raw user agent, no IP.
  label        String?
  failureCount Int       @default(0)
  lastUsedAt   DateTime?
  revokedAt    DateTime?
  createdAt    DateTime  @default(now())

  @@index([userId])
}

/// §13/§18 A stored, scheduled, audience-targeted, retractable announcement.
/// Replaces fire-and-forget cms.announce.
model Announcement {
  id            String               @id @default(cuid())
  title         String
  body          String               @db.Text
  /// A site path, checked by safeSitePath.
  href          String?
  priority      AnnouncementPriority @default(NORMAL)
  audience      AnnouncementAudience
  role          UserRole?
  academyId     String?
  academy       Academy?             @relation(fields: [academyId], references: [id], onDelete: SetNull)
  groupId       String?
  group         CommunityGroup?      @relation(fields: [groupId], references: [id], onDelete: SetNull)
  courseId      String?
  course        Course?              @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// Allows email copies; each member's preference for the topic still decides.
  sendEmail     Boolean              @default(false)
  status        AnnouncementStatus   @default(DRAFT)
  scheduledFor  DateTime?
  sentAt        DateTime?
  /// Members it was delivered to, counted at send time.
  recipients    Int                  @default(0)
  retractedAt   DateTime?
  retractedById String?
  retractedBy   User?                @relation("AnnouncementRetractor", fields: [retractedById], references: [id], onDelete: SetNull)
  createdById   String?
  createdBy     User?                @relation("AnnouncementCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  notifications Notification[]

  @@index([status, scheduledFor])
}

/// §13 The one outbox for timed and out-of-band delivery (LEAD #5). A row is either a
/// scheduled notice (channel null: at runAt the gateway delivers it on every channel the
/// member's preferences then allow) or one EMAIL/PUSH copy of a notice (channel set).
/// Used by event and mentoring reminders, challenge deadlines, goal nudges, digests and
/// the email/push copies of immediate notices.
model ScheduledNotification {
  id                String                      @id @default(cuid())
  userId            String
  user              User                        @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// Catalogue key, e.g. "event.reminder".
  topic             String
  /// Null = a scheduled notice; EMAIL or PUSH = one delivery copy. Never IN_APP (CHECK).
  channel           NotificationChannel?
  /// The in-app notice an EMAIL/PUSH copy belongs to (null when in-app is off for the topic).
  notificationId    String?
  notification      Notification?               @relation(fields: [notificationId], references: [id], onDelete: SetNull)
  /// e.g. "live_event", "event_registration", "challenge", "goal", "digest".
  subjectType       String
  subjectId         String
  runAt             DateTime
  /// Past this moment the row is stale: dispatchDue marks it SKIPPED with lastError "stale". Set to the
  /// event start, the challenge end or the goal week's end. Quiet hours never defer a row past it.
  notAfter          DateTime?
  /// Render inputs only (offset, snapshot). Text is rendered at dispatch from topic + subject.
  payload           Json?
  /// e.g. "event:<eventId>:user:<userId>:s<icsSequence>:T-60". Scheduling the same key twice is a no-op.
  /// Rows are cancelled by subject (cancelForSubject on subjectType + subjectId), never by a LIKE prefix.
  dedupeKey         String                      @unique
  status            ScheduledNotificationStatus @default(PENDING)
  attempts          Int                         @default(0)
  /// Claimed by a dispatcher until then (FOR UPDATE SKIP LOCKED; sending happens outside the transaction).
  lockedUntil       DateTime?
  /// A short code with no personal data: no_mailer, push_unconfigured, pref_off, subject_gone, stale.
  lastError         String?
  provider          String?
  providerMessageId String?
  processedAt       DateTime?
  createdAt         DateTime                    @default(now())

  @@index([status, runAt])
  @@index([subjectType, subjectId])
  @@index([userId, status])
}

// ============================================================
// 19. ACTIVITY FEED AND ANALYTICS  (directive §4, §10, §11, §19; LEAD #9)
// ActivityEvent is the member-facing feed. Analytics uses its own
// private aggregate tables. They are never merged.
// ============================================================

/// §4 Kinds of genuine activity shown in the feed.
enum ActivityEventKind {
  ACADEMY_JOINED
  COURSE_COMPLETED
  PATH_COMPLETED
  ACHIEVEMENT_UNLOCKED
  RANK_REACHED
  CHALLENGE_JOINED
  CHALLENGE_COMPLETED
  PROJECT_PUBLISHED
  PROJECT_VERIFIED
  SKILL_VERIFIED
  INTRODUCTION_POSTED
  UPDATE_POSTED
  DISCUSSION_FEATURED
  GROUP_CREATED
  GROUP_ANNOUNCEMENT
  EVENT_PUBLISHED
  MENTOR_JOINED
  ARTICLE_PUBLISHED
  OPPORTUNITY_PUBLISHED
  COMMUNITY_MILESTONE
}

/// §4 Who may see a feed item, before the actor's privacy facet is applied on read.
enum ActivityAudience {
  MEMBERS
  ACADEMY
  GROUP
  COURSE
  STAFF
}

/// §4/§10/§11 One item of the member-facing feed. Privacy is applied on read, so
/// turning a facet off hides past items too.
model ActivityEvent {
  id           String            @id @default(cuid())
  kind         ActivityEventKind
  /// Null for milestones and staff items.
  actorId      String?
  actor        User?             @relation("ActivityActor", fields: [actorId], references: [id], onDelete: Cascade)
  audience     ActivityAudience  @default(MEMBERS)
  academyId    String?
  academy      Academy?          @relation(fields: [academyId], references: [id], onDelete: SetNull)
  groupId      String?
  group        CommunityGroup?   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  courseId     String?
  course       Course?           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  subjectType  String
  subjectId    String
  /// The actor's privacy facet checked on read, e.g. "achievements", "courses", "projects".
  facet        String?
  /// Render snapshot: title, safe href, counts. No email, no other member's free text.
  data         Json
  dedupeKey    String            @unique
  /// When the source event really happened.
  occurredAt   DateTime
  hiddenAt     DateTime?
  hiddenById   String?
  hiddenBy     User?             @relation("ActivityHider", fields: [hiddenById], references: [id], onDelete: SetNull)
  hiddenReason String?
  isDemo       Boolean           @default(false)
  createdAt    DateTime          @default(now())

  @@index([occurredAt(sort: Desc), id])
  @@index([actorId, occurredAt])
  @@index([groupId, occurredAt])
  @@index([academyId, occurredAt])
  @@index([subjectType, subjectId])
  @@index([courseId, occurredAt])
}

/// §19 One row per member per platform day (IST) on which they used the signed-in app.
/// The source for DAU, WAU, MAU and retention. No IP, user agent, URL or device.
model MemberActivityDay {
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// Platform day (IST) from analyticsDayKey().
  day         DateTime @db.Date
  firstSeenAt DateTime
  lastSeenAt  DateTime
  /// Coarse areas only: learn, grow, connect, shop, earn, mentor, event, opportunity.
  surfaces    String[] @default([])

  @@id([userId, day])
  @@index([day])
}

/// §19 Immutable daily rollup. Counts use countableMemberWhere (no staff, suspended,
/// excluded or demo accounts); money counts LIVE payments only.
model AnalyticsDaily {
  day                     DateTime @id @db.Date
  dau                     Int
  wau                     Int
  mau                     Int
  newMembers              Int
  returningMembers        Int
  enrolments              Int
  lessonsCompleted        Int
  courseCompletions       Int
  quizAttempts            Int
  quizPassed              Int
  certificates            Int
  missionCompletions      Int
  challengeCompletions    Int
  achievementsUnlocked    Int
  communityParticipants   Int
  posts                   Int
  comments                Int
  chatMessages            Int
  groupJoins              Int
  mentorBookings          Int
  mentorSessionsCompleted Int
  eventRegistrations      Int
  eventAttendances        Int
  opportunityApplications Int
  productViews            Int
  cartAdds                Int
  checkoutsStarted        Int
  ordersPaidLive          Int
  formulaVersion          Int
  computedAt              DateTime
}

/// §19 Anonymous daily counters that give funnels a denominator. No user id.
model EngagementCounterDay {
  day       DateTime @db.Date
  /// e.g. "product.view", "cart.add", "checkout.start", "event.view", "opportunity.view".
  metric    String
  /// Loose reference (no FK) to a Product, LiveEvent or Opportunity; "" when not applicable.
  subjectId String   @default("")
  count     Int      @default(0)

  @@id([day, metric, subjectId])
}

// ============================================================
// 20. PROGRESSION AND IDENTITY  (directive §8, §3; LEAD #6, #8)
// ============================================================

/// §8
enum SkillLevel {
  /// Self-declared by the member; always labelled "self-declared".
  DECLARED
  STARTED
  PRACTISED
  PROFICIENT
  VERIFIED
}

/// §8
enum SkillVerifiedVia {
  PROJECT_REVIEW
  STAFF_CHECK
  MENTOR_ASSESSMENT
}

/// §8/§12
enum ProjectKind {
  PROJECT
  ARTICLE
  VIDEO
  TEMPLATE
  TOOL
  OTHER
}

/// §8
enum ProjectVisibility {
  PRIVATE
  MEMBERS
  PUBLIC
}

/// §8
enum ProjectVerificationStatus {
  NOT_SUBMITTED
  SUBMITTED
  CHANGES_REQUESTED
  VERIFIED
  NOT_VERIFIED
}

/// §12 A collaborator invitation. Only ACCEPTED collaborators are ever shown.
enum ProjectCollaboratorStatus {
  INVITED
  ACCEPTED
  DECLINED
  REMOVED
}

/// §8
enum RankAwardReason {
  EARNED
  GRANDFATHERED
  ADMIN
}

/// §8
enum AchievementKind {
  ACHIEVEMENT
  MILESTONE
  BADGE
  RECOGNITION
}

/// §3
enum PathStepKind {
  COURSE
  MODULE
  CHALLENGE
  PROJECT_BRIEF
  RESOURCE
}

/// §8/§7 A skill. academyId null = cross-academy.
model Skill {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  academyId   String?
  academy     Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  modules       ModuleSkill[]
  challenges    ChallengeSkill[]
  projects      ProjectSkill[]
  opportunities OpportunitySkill[]
  members       MemberSkill[]

  @@index([academyId, active])
}

/// §8 Curriculum modules teach skills. A course's skills are its modules' skills.
/// seed-academy recreates these rows whenever it rebuilds modules.
model ModuleSkill {
  moduleId String
  module   CourseModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  skillId  String
  skill    Skill        @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([moduleId, skillId])
  @@index([skillId])
}

/// §8/§5
model ChallengeSkill {
  challengeId String
  challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  skillId     String
  skill       Skill     @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([challengeId, skillId])
  @@index([skillId])
}

/// §8/§7 A member's standing in one skill. DECLARED comes from the member; higher
/// levels are recomputed from evidence; VERIFIED needs someone other than the member.
model MemberSkill {
  id               String            @id @default(cuid())
  userId           String
  user             User              @relation("MemberSkillOwner", fields: [userId], references: [id], onDelete: Cascade)
  skillId          String
  skill            Skill             @relation(fields: [skillId], references: [id], onDelete: Cascade)
  level            SkillLevel
  /// When the member declared it (kept after evidence raises the level).
  declaredAt       DateTime?
  /// Ids of the modules, certificate, challenges and projects behind the level.
  evidence         Json              @default("{}")
  /// When the evidence-derived level was reached.
  reachedAt        DateTime?
  verifiedAt       DateTime?
  verifiedById     String?
  verifiedBy       User?             @relation("MemberSkillVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  verifiedVia      SkillVerifiedVia?
  verificationNote String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@unique([userId, skillId])
  @@index([skillId, level])
}

/// §8/§4/§12 A member's project or portfolio piece (also a contributor's showcased work).
/// The showcase is a view over published, VISIBLE, PUBLIC/MEMBERS projects.
model Project {
  id                 String                    @id @default(cuid())
  userId             String
  user               User                      @relation("ProjectOwner", fields: [userId], references: [id], onDelete: Cascade)
  slug               String
  kind               ProjectKind               @default(PROJECT)
  title              String
  summary            String
  bodyMd             String?                   @db.Text
  url                String?
  /// At most 5 {label, url}, https only.
  links              Json?
  coverImageUrl      String?
  academyId          String?
  academy            Academy?                  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// A capstone for this course.
  courseId           String?
  course             Course?                   @relation(fields: [courseId], references: [id], onDelete: SetNull)
  challengeId        String?
  challenge          Challenge?                @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  visibility         ProjectVisibility         @default(PRIVATE)
  /// Null = draft.
  publishedAt        DateTime?
  verificationStatus ProjectVerificationStatus @default(NOT_SUBMITTED)
  submittedAt        DateTime?
  verifiedAt         DateTime?
  /// Never the owner (CHECK).
  verifiedById       String?
  verifiedBy         User?                     @relation("ProjectVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  reviewNote         String?
  state              ModerationState           @default(VISIBLE)
  featuredAt         DateTime?
  featuredById       String?
  featuredBy         User?                     @relation("ProjectFeaturer", fields: [featuredById], references: [id], onDelete: SetNull)
  /// The community thread that carries comments, reactions and reports.
  postId             String?                   @unique
  post               CommunityPost?            @relation(fields: [postId], references: [id], onDelete: SetNull)
  isDemo             Boolean                   @default(false)
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  skills        ProjectSkill[]
  collaborators ProjectCollaborator[]

  @@unique([userId, slug])
  @@index([verificationStatus, submittedAt])
  @@index([academyId, verificationStatus])
  @@index([visibility, state, publishedAt])
  @@index([featuredAt])
}

/// §12/§4 A member the project owner invited. Shown only after they accept, and only where
/// their own `projects` facet allows it. Declining or removal hides them again.
model ProjectCollaborator {
  id          String                    @id @default(cuid())
  projectId   String
  project     Project                   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId      String
  user        User                      @relation("ProjectCollaborations", fields: [userId], references: [id], onDelete: Cascade)
  /// What they did, in their own words; at most 60 characters.
  role        String?                   @db.VarChar(60)
  status      ProjectCollaboratorStatus @default(INVITED)
  invitedById String?
  invitedBy   User?                     @relation("ProjectCollaboratorInviter", fields: [invitedById], references: [id], onDelete: SetNull)
  invitedAt   DateTime                  @default(now())
  /// Set when status becomes ACCEPTED.
  acceptedAt  DateTime?
  /// When they accepted or declined, or the owner removed them.
  respondedAt DateTime?

  @@unique([projectId, userId])
  @@index([userId, status])
}

/// §8 Skills a project claims; they count only once the project is VERIFIED.
model ProjectSkill {
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  skillId   String
  skill     Skill   @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([projectId, skillId])
  @@index([skillId])
}

/// §8 Why a member holds a rank. User.rankId stays the cache; ranks never demote.
model RankAward {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation("RankAwardMember", fields: [userId], references: [id], onDelete: Cascade)
  rankId      String
  rank        RankDefinition  @relation(fields: [rankId], references: [id], onDelete: Restrict)
  reason      RankAwardReason
  /// The counts that met the criteria.
  evidence    Json            @default("{}")
  awardedById String?
  awardedBy   User?           @relation("RankAwardGiver", fields: [awardedById], references: [id], onDelete: SetNull)
  note        String?
  awardedAt   DateTime        @default(now())

  @@index([userId, awardedAt])
}

/// §3 An ordered route through an academy's material. Duration is computed from the steps.
model LearningPath {
  id            String        @id @default(cuid())
  academyId     String
  academy       Academy       @relation(fields: [academyId], references: [id], onDelete: Restrict)
  slug          String        @unique
  title         String
  summary       String
  descriptionMd String?       @db.Text
  /// Plain "who it is for".
  audience      String?
  status        ContentStatus @default(DRAFT)
  sortOrder     Int           @default(0)
  createdById   String?
  createdBy     User?         @relation("LearningPathAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  steps   LearningPathStep[]
  follows LearningPathFollow[]

  @@index([academyId, status, sortOrder])
}

/// §3 One step of a path pointing at real content. A target that is deleted becomes
/// null (SetNull) and the admin flags the step.
model LearningPathStep {
  id          String        @id @default(cuid())
  pathId      String
  path        LearningPath  @relation(fields: [pathId], references: [id], onDelete: Cascade)
  sortOrder   Int
  kind        PathStepKind
  courseId    String?
  course      Course?       @relation(fields: [courseId], references: [id], onDelete: SetNull)
  moduleId    String?
  module      CourseModule? @relation(fields: [moduleId], references: [id], onDelete: SetNull)
  challengeId String?
  challenge   Challenge?    @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  /// PROJECT_BRIEF and RESOURCE steps.
  title       String?
  bodyMd      String?       @db.Text
  /// https only.
  url         String?
  required    Boolean       @default(true)

  @@unique([pathId, sortOrder])
}

/// §3 A member following a path. Progress is derived, never stored.
model LearningPathFollow {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  pathId      String
  path        LearningPath @relation(fields: [pathId], references: [id], onDelete: Cascade)
  startedAt   DateTime     @default(now())
  /// Stamped once, when every required step is done.
  completedAt DateTime?

  @@unique([userId, pathId])
  @@index([pathId])
}

// ============================================================
// 21. MENTORS AND CONTRIBUTORS  (directive §2, §12; LEAD #2, #3, #15)
// Instructor is the one public expert profile. Mentor data lives in
// MentorProfile. Applications, payee records, revenue terms and
// earnings are private and staff-reviewed. No revenue share is seeded.
// ============================================================

/// §2/§12
enum ExpertStatus {
  PENDING
  ACTIVE
  PAUSED
  SUSPENDED
  ARCHIVED
}

/// §2/§12
enum ContributorKind {
  MENTOR
  INSTRUCTOR
  CREATOR
}

/// §2/§12
enum ContributorApplicationStatus {
  SUBMITTED
  IN_REVIEW
  NEEDS_INFO
  APPROVED
  REJECTED
  WITHDRAWN
}

/// §2/§12
enum ContributorAccountStatus {
  ACTIVE
  SUSPENDED
}

/// §2
enum MentorStatus {
  DRAFT
  ACTIVE
  PAUSED
  SUSPENDED
}

/// §2
enum BookingMode {
  INSTANT
  REQUEST
}

/// §2
enum CredentialKind {
  DEGREE
  CERTIFICATION
  LICENCE
  EMPLOYMENT
  AWARD
  OTHER
}

/// §2
enum CredentialStatus {
  PENDING
  VERIFIED
  REJECTED
  EXPIRED
}

/// §2
enum AvailabilityExceptionKind {
  BLOCKED
  EXTRA
}

/// §2/§12 What a revenue share applies to.
enum RevenueScope {
  MENTORING
  EVENT
  COURSE
}

/// §2
enum CourseDelivery {
  SELF_PACED
  MENTOR_LED
}

/// §2
enum CohortStatus {
  DRAFT
  OPEN
  RUNNING
  COMPLETED
  CANCELLED
}

/// §12
enum ContentSubmissionType {
  COURSE
  COURSE_UPDATE
  RESOURCE
}

/// §12
enum ContentSubmissionStatus {
  SUBMITTED
  IN_REVIEW
  CHANGES_REQUESTED
  APPROVED
  REJECTED
  WITHDRAWN
}

/// §6/§12 Who may open an event or expert-profile resource.
enum ResourceAudience {
  PUBLIC
  MEMBERS
  REGISTERED
  ATTENDED
}

/// §2/§6 Keeps booking orders apart from cart orders.
enum OrderSource {
  CART
  BOOKING
}

/// §2 Mentor-specific settings and standing, 1:1 with the expert profile.
model MentorProfile {
  id                String       @id @default(cuid())
  instructorId      String       @unique
  instructor        Instructor   @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  status            MentorStatus @default(DRAFT)
  statusReason      String?
  acceptingBookings Boolean      @default(false)
  /// INSTANT books a published slot at once. REQUEST holds the slot until the mentor accepts or the
  /// hold expires (min(slot start - minNoticeHours, now + 48h)); a member has at most 3 open requests.
  bookingMode       BookingMode  @default(INSTANT)
  /// 0-720.
  minNoticeHours    Int          @default(24)
  /// 1-120.
  horizonDays       Int          @default(30)
  /// 0-120.
  bufferMinutes     Int          @default(15)
  maxSessionsPerDay Int?
  /// Notice a member must give for a cancellation not to count as late. Null = until the start (no
  /// invented policy). Refunds follow the agreement's refundWindowHours, never this field.
  cancellationHours Int?
  /// Self-reported; labelled so on the profile.
  priorHistoryMd    String?      @db.Text
  approvedAt        DateTime?
  approvedById      String?
  approvedBy        User?        @relation("MentorApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  categories             MentorCategoryLink[]
  offerings              MentorOffering[]
  availabilityRules      MentorAvailabilityRule[]
  availabilityExceptions MentorAvailabilityException[]
  events                 LiveEvent[]
  interests              EventInterest[]

  @@index([status, acceptingBookings])
}

/// §2 The directive's ten mentor categories, as data (seed-taxonomy.ts).
model MentorCategory {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  academyId   String?
  academy     Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Shown on every offering in this category, on the booking form and in the confirmation; the
  /// member's acknowledgement is stored (EventRegistration.disclaimerAckAt). Seeded for categories 5-8.
  disclaimer  String?  @db.Text
  /// False = offerings in this category are free only. Seeded false for financial-literacy until the owner
  /// confirms the regulatory position (B7); staff change it in /admin/mentors/categories, audited.
  paidAllowed Boolean  @default(true)
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  mentors   MentorCategoryLink[]
  offerings MentorOffering[]
}

/// §2 One primary category per mentor (partial unique index).
model MentorCategoryLink {
  mentorId   String
  mentor     MentorProfile  @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  categoryId String
  category   MentorCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  isPrimary  Boolean        @default(false)

  @@id([mentorId, categoryId])
  @@index([categoryId])
}

/// §2 A qualification. Public only when VERIFIED ("qualifications where verified").
model ExpertCredential {
  id              String                  @id @default(cuid())
  instructorId    String
  instructor      Instructor              @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  kind            CredentialKind
  title           String
  issuer          String
  year            Int?
  /// The issuer's own verification link, if any.
  publicUrl       String?
  /// Private: how staff verified it. Never selected by public queries. No ID images are stored.
  evidenceNote    String?                 @db.Text
  status          CredentialStatus        @default(PENDING)
  verifiedById    String?
  verifiedBy      User?                   @relation("CredentialVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  verifiedAt      DateTime?
  rejectionReason String?
  expiresAt       DateTime?
  applicationId   String?
  application     ContributorApplication? @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  @@index([instructorId, status])
}

/// §2/§12 One application flow for mentors, instructors and creators.
model ContributorApplication {
  id              String                       @id @default(cuid())
  userId          String
  user            User                         @relation("ContributorApplicant", fields: [userId], references: [id], onDelete: Cascade)
  kind            ContributorKind
  status          ContributorApplicationStatus @default(SUBMITTED)
  /// A zod schema per kind: display name, headline, bio, expertise, experience, languages,
  /// time zone, sample links, proposed offerings or outline, policy acknowledgements.
  answers         Json
  /// Checked against MentorCategory.slug.
  categorySlugs   String[]                     @default([])
  termsVersion    String
  termsAcceptedAt DateTime
  /// Shown to the applicant.
  statusReason    String?
  reviewerId      String?
  reviewer        User?                        @relation("ContributorReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)
  reviewedAt      DateTime?
  submittedAt     DateTime                     @default(now())
  updatedAt       DateTime                     @updatedAt

  credentials ExpertCredential[]

  @@index([status, kind, submittedAt])
  @@index([userId])
}

/// §2/§12 The private payee record of an approved contributor, kept apart from the public
/// profile so payout data never leaks through profile queries.
model ContributorAccount {
  id                    String                   @id @default(cuid())
  /// RESTRICT: an account with contributor money is anonymised, never deleted, as the privacy policy
  /// already says for orders and commissions (O36).
  userId                String                   @unique
  user                  User                     @relation(fields: [userId], references: [id], onDelete: Restrict)
  instructorId          String?                  @unique
  instructor            Instructor?              @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  status                ContributorAccountStatus @default(ACTIVE)
  statusReason          String?
  /// normalisePayoutMethod shape, with fingerprint. Shown only to admin.earn at payout.
  payoutMethod          Json?
  payoutMethodUpdatedAt DateTime?
  termsVersion          String
  termsAcceptedAt       DateTime
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  agreements RevenueShareAgreement[]
  earnings   ContributorEarning[]
  payouts    PayoutRequest[]
}

/// §2/§12 The contributor's share for a scope. contributorId null = platform default.
/// No row is seeded: paid offerings stay unpublishable until staff set terms (LEAD #15).
model RevenueShareAgreement {
  id                  String              @id @default(cuid())
  contributorId       String?
  contributor         ContributorAccount? @relation(fields: [contributorId], references: [id], onDelete: Cascade)
  scope               RevenueScope
  /// Basis points, 0-10000, of the line's net paid amount. The platform keeps the rest: that remainder is the
  /// platform fee, so there is no second fee field that could disagree with it.
  contributorShareBps Int
  /// Days an earning is held after the later of payment and the event's end. Null until staff set it.
  holdDays            Int?
  /// Smallest payout a contributor may request, in paise. Null until staff set it.
  minPayoutCents      Int?
  /// A member who cancels at least this many hours before the start is refunded in full. Null until set.
  /// A paid offering or event in this scope cannot be published while any term on its agreement is null.
  refundWindowHours   Int?
  version             Int
  /// The text shown when the contributor accepts.
  termsMd             String              @db.Text
  effectiveFrom       DateTime
  effectiveUntil      DateTime?
  createdById         String?
  createdBy           User?               @relation("AgreementAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  acceptedAt          DateTime?
  acceptedById        String?
  acceptedBy          User?               @relation("AgreementAcceptor", fields: [acceptedById], references: [id], onDelete: SetNull)
  createdAt           DateTime            @default(now())

  earnings ContributorEarning[]

  @@unique([contributorId, scope, version])
  @@index([contributorId, scope, effectiveFrom])
}

/// §2/§12 Money a contributor earns from one paid order line, in INR paise. Held, then
/// approved by staff, like Commission. Lines paid in TEST mode are never payable.
model ContributorEarning {
  id             String                @id @default(cuid())
  contributorId  String
  contributor    ContributorAccount    @relation(fields: [contributorId], references: [id], onDelete: Cascade)
  scope          RevenueScope
  orderId        String
  order          Order                 @relation(fields: [orderId], references: [id], onDelete: Cascade)
  /// One earning per paid line.
  orderItemId    String                @unique
  orderItem      OrderItem             @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  registrationId String?
  registration   EventRegistration?    @relation(fields: [registrationId], references: [id], onDelete: SetNull)
  /// Net paise paid for the line after any coupon.
  baseCents      Int
  /// Snapshot of the agreement's share.
  shareBps       Int
  /// floor(baseCents * shareBps / 10000).
  amountCents    Int
  currency       String                @default("INR")
  status         CommissionStatus      @default(PENDING)
  agreementId    String
  agreement      RevenueShareAgreement @relation(fields: [agreementId], references: [id], onDelete: Restrict)
  /// The later of payment and the event's end, plus the contributor hold days.
  holdUntil      DateTime
  reason         String?
  reviewedAt     DateTime?
  payoutId       String?
  payout         PayoutRequest?        @relation(fields: [payoutId], references: [id], onDelete: SetNull)
  createdAt      DateTime              @default(now())

  @@index([contributorId, status])
  @@index([payoutId])
}

/// §2 What a member can book or join: format, length, seats and an honest price.
model MentorOffering {
  id            String          @id @default(cuid())
  mentorId      String
  mentor        MentorProfile   @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  eventKindId   String
  eventKind     EventKind       @relation(fields: [eventKindId], references: [id], onDelete: Restrict)
  /// One of the mentor's own categories; decides the disclaimer and whether the offering may be paid.
  categoryId    String?
  category      MentorCategory? @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  title         String
  /// At most 200 characters.
  summary       String
  descriptionMd String          @db.Text
  /// 15-240 minutes.
  durationMin   Int
  /// Exactly 1 for the one-to-one kind (core rule).
  capacity      Int             @default(1)
  /// Paise; null = free. A paid offering cannot be activated until revenue terms exist.
  priceCents    Int?
  currency      String          @default("INR")
  /// System-managed LIVE_EVENT product behind a paid offering.
  productId     String?         @unique
  product       Product?        @relation(fields: [productId], references: [id], onDelete: SetNull)
  active        Boolean         @default(false)
  isDemo        Boolean         @default(false)
  sortOrder     Int             @default(0)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  availabilityRules MentorAvailabilityRule[]
  events            LiveEvent[]

  @@index([mentorId, active])
}

/// §2 A mentor's recurring weekly availability in their own zone: the only source of
/// bookable slots, so availability is never invented.
model MentorAvailabilityRule {
  id          String          @id @default(cuid())
  mentorId    String
  mentor      MentorProfile   @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  /// 0 = Sunday … 6 = Saturday, in `timezone`.
  weekday     Int
  /// Minutes of local wall time; 0 <= startMinute < endMinute <= 1440.
  startMinute Int
  endMinute   Int
  /// IANA zone the rule is written in.
  timezone    String
  /// Null = every offering.
  offeringId  String?
  offering    MentorOffering? @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  /// Local dates in `timezone`.
  validFrom   DateTime?       @db.Date
  validUntil  DateTime?       @db.Date
  createdAt   DateTime        @default(now())

  @@index([mentorId])
}

/// §2 Dated changes to the weekly rules: time off, or extra one-off availability (UTC instants).
model MentorAvailabilityException {
  id        String                    @id @default(cuid())
  mentorId  String
  mentor    MentorProfile             @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  kind      AvailabilityExceptionKind
  startsAt  DateTime
  endsAt    DateTime
  note      String?
  createdAt DateTime                  @default(now())

  @@index([mentorId, startsAt])
}

/// §2 A dated, mentor-led run of a course with its own members, sessions and channel.
model CourseCohort {
  id                 String       @id @default(cuid())
  courseId           String
  course             Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  mentorInstructorId String
  mentor             Instructor   @relation(fields: [mentorInstructorId], references: [id], onDelete: Restrict)
  title              String
  startsOn           DateTime     @db.Date
  endsOn             DateTime?    @db.Date
  capacity           Int?
  status             CohortStatus @default(DRAFT)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  enrollments Enrollment[]
  channel     Channel?
  events      LiveEvent[]

  @@index([courseId, status])
}

/// §12 One review queue: contributor course submissions, edits to published courses by
/// authors without trustedAuthor, and contributor resources. Events, posts, projects,
/// opportunities, applications and partners keep their own status and join the admin
/// review inbox as a read model.
model ContentSubmission {
  id           String                  @id @default(cuid())
  type         ContentSubmissionType
  status       ContentSubmissionStatus @default(SUBMITTED)
  submitterId  String
  submitter    User                    @relation("ContentSubmitter", fields: [submitterId], references: [id], onDelete: Cascade)
  instructorId String
  instructor   Instructor              @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  courseId     String?
  course       Course?                 @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessonId     String?
  lesson       Lesson?                 @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  resourceId   String?
  resource     Resource?               @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  /// "course:<id>" | "lesson:<id>" | "resource:<id>": one open submission per target.
  targetKey    String
  /// The proposed change for COURSE_UPDATE.
  payload      Json?
  /// Author confirmations: rights, no guaranteed income, no investment advice, health disclaimer.
  checklist    Json
  /// publishProblems output at submission.
  autoChecks   Json?
  reviewerId   String?
  reviewer     User?                   @relation("ContentReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)
  /// Shown to the submitter.
  reviewNote   String?
  submittedAt  DateTime                @default(now())
  decidedAt    DateTime?
  updatedAt    DateTime                @updatedAt

  @@index([status, type, submittedAt])
  @@index([instructorId, status])
}

/// §2/§6 A private ICS feed of a member's registrations and a host's events. Only the hash is stored.
model CalendarFeedToken {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String    @unique
  label      String?
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId])
}

// ============================================================
// 22. LIVE EVENTS  (directive §6, §2; LEAD #4)
// One family for everything scheduled and live. A mentor 1:1 is a
// LiveEvent of the one-to-one kind with one registration.
// Feedback is accepted only from an ATTENDED registration.
// ============================================================

/// §6
enum EventMode {
  ONE_TO_ONE
  GROUP
}

/// §6
enum LiveEventFormat {
  ONLINE
  IN_PERSON
  HYBRID
}

/// §6 "Live" and "ended" are derived from startsAt/endsAt, never stored.
enum LiveEventStatus {
  DRAFT
  /// Awaiting a decision: staff review of a public event, or the mentor's acceptance of a 1:1 request.
  SUBMITTED
  SCHEDULED
  COMPLETED
  CANCELLED
  ARCHIVED
}

/// §6
enum LiveEventVisibility {
  PUBLIC
  MEMBERS
  COURSE
  GROUP
  /// Mentor 1:1s: host, registrant and staff only. No slug.
  PRIVATE
}

/// §6
enum LiveEventHostRole {
  HOST
  CO_HOST
  GUEST_SPEAKER
}

/// §6/§2
enum EventRegistrationStatus {
  REQUESTED
  PENDING_PAYMENT
  REGISTERED
  WAITLISTED
  DECLINED
  CANCELLED
  ATTENDED
  NO_SHOW
  REFUNDED
}

/// §6
enum AttendanceSource {
  /// The member entered the event's check-in code.
  CODE
  /// The host or staff marked it.
  HOST
  /// The member opened the platform join link inside the join window.
  JOIN_LINK
  /// The member confirmed attendance after the event and the host did not dispute it within 7 days.
  MEMBER_CONFIRMED
  INTEGRATION
}

/// §6 Event kinds as data. Exactly one row has mode ONE_TO_ONE (slug "one-to-one",
/// inserted by migration); the others are seeded by seed-taxonomy.ts.
model EventKind {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  description String?
  /// Set at creation and never changed; LiveEvent.mode copies it.
  mode        EventMode @default(GROUP)
  academyId   String?
  academy     Academy?  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  sortOrder   Int       @default(0)
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  events    LiveEvent[]
  offerings MentorOffering[]
  series    LiveEventSeries[]
  interests EventInterest[]
}

/// §6/§2 Every scheduled live thing: mentor 1:1s, group mentoring, workshops, masterclasses,
/// AMAs, live classes, meetups, founder sessions. Named LiveEvent because `events` is the
/// EventBus. Times are UTC; `timezone` is the host's zone for display.
model LiveEvent {
  id                      String              @id @default(cuid())
  /// Null for PRIVATE (1:1) events; required otherwise (CHECK).
  slug                    String?             @unique
  kindId                  String
  kind                    EventKind           @relation(fields: [kindId], references: [id], onDelete: Restrict)
  /// Copied from the kind at creation.
  mode                    EventMode
  title                   String
  summary                 String?
  descriptionMd           String              @db.Text
  format                  LiveEventFormat     @default(ONLINE)
  status                  LiveEventStatus     @default(DRAFT)
  visibility              LiveEventVisibility @default(MEMBERS)
  academyId               String?
  academy                 Academy?            @relation(fields: [academyId], references: [id], onDelete: SetNull)
  offeringId              String?
  offering                MentorOffering?     @relation(fields: [offeringId], references: [id], onDelete: SetNull)
  /// The mentor whose calendar this occupies (1:1s and mentor-hosted group events).
  mentorId                String?
  mentor                  MentorProfile?      @relation(fields: [mentorId], references: [id], onDelete: SetNull)
  courseId                String?
  course                  Course?             @relation(fields: [courseId], references: [id], onDelete: SetNull)
  cohortId                String?
  cohort                  CourseCohort?       @relation(fields: [cohortId], references: [id], onDelete: SetNull)
  groupId                 String?
  group                   CommunityGroup?     @relation(fields: [groupId], references: [id], onDelete: SetNull)
  challengeId             String?
  challenge               Challenge?          @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  seriesId                String?
  series                  LiveEventSeries?    @relation(fields: [seriesId], references: [id], onDelete: SetNull)
  startsAt                DateTime
  endsAt                  DateTime
  /// IANA zone of the host, checked by isValidTimeZone.
  timezone                String
  registrationOpensAt     DateTime?
  registrationClosesAt    DateTime?
  /// Null = no limit.
  capacity                Int?
  /// Seats taken (REGISTERED, unexpired PENDING_PAYMENT, ATTENDED, NO_SHOW), kept in the registering transaction.
  registeredCount         Int                 @default(0)
  waitlistEnabled         Boolean             @default(true)
  /// Paise; null = free.
  priceCents              Int?
  currency                String              @default("INR")
  /// LIVE_EVENT product: one per paid group event; a 1:1 uses its offering's product.
  productId               String?
  product                 Product?            @relation(fields: [productId], references: [id], onDelete: SetNull)
  /// Derived label: zoom, meet, teams, youtube, jitsi, other.
  meetingProvider         String?
  /// Private: shown to confirmed registrants from linkRevealMinutes before the start.
  meetingUrl              String?
  /// Private, e.g. a passcode.
  meetingNote             String?
  linkRevealMinutes       Int                 @default(30)
  venueName               String?
  /// Registrants only.
  venueAddress            String?
  city                    String?
  country                 String?
  /// Short, rotatable check-in code.
  attendanceCode          String?
  attendanceCodeRotatedAt DateTime?
  coverImage              String?
  /// Shown to the host: why it was sent back or cancelled.
  statusReason            String?
  submittedAt             DateTime?
  reviewedAt              DateTime?
  reviewedById            String?
  reviewedBy              User?               @relation("LiveEventReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  publishedAt             DateTime?
  cancelledAt             DateTime?
  cancelReason            String?
  completedAt             DateTime?
  rescheduledAt           DateTime?
  /// ICS SEQUENCE, bumped on every time or status change.
  icsSequence             Int                 @default(0)
  isDemo                  Boolean             @default(false)
  createdById             String?
  createdBy               User?               @relation("LiveEventCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  hosts         LiveEventHost[]
  registrations EventRegistration[]
  feedback      EventFeedback[]
  resources     Resource[]
  posts         Post[]

  @@index([status, startsAt])
  @@index([academyId, startsAt])
  @@index([kindId, startsAt])
  @@index([mentorId, startsAt])
  @@index([groupId, startsAt])
  @@index([productId])
}

/// §6 Who runs an event. Publishing needs at least one confirmed host; a guest speaker
/// without an account is named only after staff confirm them.
model LiveEventHost {
  id            String            @id @default(cuid())
  eventId       String
  event         LiveEvent         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  role          LiveEventHostRole @default(HOST)
  userId        String?
  user          User?             @relation("LiveEventHostUser", fields: [userId], references: [id], onDelete: SetNull)
  instructorId  String?
  instructor    Instructor?       @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  /// Snapshot shown on the event.
  displayName   String
  headline      String?
  avatarUrl     String?
  /// Set by staff, or by the host accepting in-app.
  confirmedAt   DateTime?
  confirmedById String?
  confirmedBy   User?             @relation("LiveEventHostConfirmer", fields: [confirmedById], references: [id], onDelete: SetNull)
  sortOrder     Int               @default(0)

  @@unique([eventId, userId])
  @@unique([eventId, instructorId])
  @@index([userId])
  @@index([instructorId])
}

/// §6/§2 A seat, a waitlist place or a 1:1 booking, and its attendance.
model EventRegistration {
  id                            String                  @id @default(cuid())
  eventId                       String
  event                         LiveEvent               @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId                        String
  user                          User                    @relation("EventRegistrant", fields: [userId], references: [id], onDelete: Cascade)
  status                        EventRegistrationStatus @default(REGISTERED)
  /// REQUESTED and PENDING_PAYMENT holds stop blocking the seat or slot once expired.
  holdExpiresAt                 DateTime?
  /// The member's private note to the host (1:1 agenda).
  agendaMd                      String?                 @db.Text
  /// The member ticked the category disclaimer on the booking form (categories with a disclaimer only).
  disclaimerAckAt               DateTime?
  registeredAt                  DateTime                @default(now())
  waitlistedAt                  DateTime?
  promotedAt                    DateTime?
  /// When a request was accepted or declined.
  decidedAt                     DateTime?
  cancelledAt                   DateTime?
  cancelledById                 String?
  cancelledBy                   User?                   @relation("EventRegistrationCanceller", fields: [cancelledById], references: [id], onDelete: SetNull)
  cancelReason                  String?
  /// First use of the join link.
  joinedAt                      DateTime?
  attendedAt                    DateTime?
  attendanceSource              AttendanceSource?
  markedById                    String?
  markedBy                      User?                   @relation("EventAttendanceMarker", fields: [markedById], references: [id], onDelete: SetNull)
  /// The member says they attended. Counts as attended (MEMBER_CONFIRMED) unless the host disputes within 7 days.
  memberConfirmedAt             DateTime?
  /// A member disputing a host NO_SHOW, or a host disputing a member's confirmation. Staff decide in
  /// /admin/mentors; feedback stays off public pages while a dispute is open.
  attendanceDisputedAt          DateTime?
  attendanceDisputedById        String?
  attendanceDisputedBy          User?                   @relation("EventAttendanceDisputer", fields: [attendanceDisputedById], references: [id], onDelete: SetNull)
  attendanceDisputeNote         String?
  attendanceDisputeResolvedAt   DateTime?
  attendanceDisputeResolvedById String?
  attendanceDisputeResolvedBy   User?                   @relation("EventAttendanceDisputeResolver", fields: [attendanceDisputeResolvedById], references: [id], onDelete: SetNull)
  updatedAt                     DateTime                @updatedAt

  feedback   EventFeedback?
  /// One PENDING or PAID order per registration, enforced under this row's lock in checkout; an expired
  /// hold's order stays for the record and a new attempt adds a new item.
  orderItems OrderItem[]
  earnings   ContributorEarning[]

  @@unique([eventId, userId])
  @@index([eventId, status, waitlistedAt])
  @@index([userId, status])
  @@index([attendanceDisputedAt])
}

/// §6/§2 Feedback from a verified attendee only (registration ATTENDED). Also the mentor review. Public only
/// when the host or check-in marked attendance, or memberConfirmedAt is over 7 days old with no dispute.
model EventFeedback {
  id             String            @id @default(cuid())
  registrationId String            @unique
  registration   EventRegistration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  eventId        String
  event          LiveEvent         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId         String
  user           User              @relation("EventFeedbackAuthor", fields: [userId], references: [id], onDelete: Cascade)
  /// The host being reviewed (the mentor for a 1:1); feeds the expert profile's ratings.
  instructorId   String?
  instructor     Instructor?       @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  /// 1-5.
  rating         Int
  body           String?           @db.Text
  /// Host and staff only.
  privateNote    String?           @db.Text
  /// May be quoted publicly only with this consent.
  publicConsent  Boolean           @default(false)
  hostReply      String?           @db.Text
  hostRepliedAt  DateTime?
  hidden         Boolean           @default(false)
  hiddenById     String?
  hiddenBy       User?             @relation("EventFeedbackHider", fields: [hiddenById], references: [id], onDelete: SetNull)
  hiddenReason   String?
  isDemo         Boolean           @default(false)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([eventId, hidden])
  @@index([instructorId, hidden])
}

/// §6 A recurring programme on the open schedule. It never invents dates: each dated
/// session is its own LiveEvent, and cadenceNote is the owner's own wording.
model LiveEventSeries {
  id          String    @id @default(cuid())
  slug        String    @unique
  title       String
  description String    @db.Text
  academyId   String?
  academy     Academy?  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  kindId      String
  kind        EventKind @relation(fields: [kindId], references: [id], onDelete: Restrict)
  /// e.g. "Fortnightly; dates announced once the host confirms".
  cadenceNote String?
  active      Boolean   @default(true)
  isDemo      Boolean   @default(false)
  createdById String?
  createdBy   User?     @relation("LiveEventSeriesCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  events    LiveEvent[]
  interests EventInterest[]
}

/// §6/§2 "Tell me when": a member asks to hear when a matching real event or mentor slot is published.
model EventInterest {
  id         String           @id @default(cuid())
  userId     String
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  academyId  String?
  academy    Academy?         @relation(fields: [academyId], references: [id], onDelete: Cascade)
  kindId     String?
  kind       EventKind?       @relation(fields: [kindId], references: [id], onDelete: Cascade)
  seriesId   String?
  series     LiveEventSeries? @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  mentorId   String?
  mentor     MentorProfile?   @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  /// "a:<academyId|*>|k:<kindId|*>|s:<seriesId|*>|m:<mentorId|*>", so uniqueness needs no NULLS NOT DISTINCT.
  scopeKey   String
  notifiedAt DateTime?
  createdAt  DateTime         @default(now())

  @@unique([userId, scopeKey])
  @@index([academyId])
  @@index([mentorId])
}

// ============================================================
// 23. DAILY ACTIVITY ENGINE  (directive §5, §11; LEAD #7, #16)
// Day keys come from memberDayKey (time/zoned.ts).
// ============================================================

/// §5
enum MissionCadence {
  ONCE
  DAILY
  WEEKLY
  MONTHLY
}

/// §5
enum MissionVerification {
  AUTO
  SELF_REPORT
  REVIEW
}

/// §5 The kind of practice a mission is.
enum MissionKind {
  LEARNING
  DISCIPLINE
  BUSINESS_EXERCISE
  FINANCIAL_LITERACY
  FITNESS
  MINDFULNESS
  COMMUNITY
  MENTOR
  EVENT
  OPPORTUNITY
}

/// §5
enum PlanSlot {
  LEARN
  PRACTICE
  COMMUNITY
  WEEKLY
  EXPLORE
}

/// §5
enum PlanItemKind {
  MISSION
  LESSON
  CHALLENGE
  DISCUSSION
  GOAL_CHECKIN
  STANDARD
  EVENT
  OPPORTUNITY
}

/// §5/§11
enum GoalMetric {
  /// Reported by the member, and labelled so.
  MANUAL
  LESSONS_COMPLETED
  COURSE_COMPLETED
  STANDARD_DAYS
  MISSIONS_COMPLETED
  CHALLENGES_COMPLETED
}

/// §5
enum GoalCadence {
  DAILY
  WEEKLY
}

/// §5/§11
enum GoalStatus {
  ACTIVE
  ACHIEVED
  PAUSED
  ABANDONED
}

/// §5/§9
enum GoalSource {
  MEMBER
  GUIDE_SUGGESTION
  ONBOARDING
}

/// §5
enum ChallengeKind {
  RULE
  DAILY_CHECKIN
  SUBMISSION
  GATED_SUBMISSIONS
}

/// §5/§3/§4
enum ChallengeScope {
  HOUSE
  ACADEMY
  GROUP
}

/// §5
enum ChallengeCadence {
  ONE_OFF
  WEEKLY
  MONTHLY
}

/// §5
enum EvidenceStatus {
  PENDING
  APPROVED
  REJECTED
  WITHDRAWN
}

/// §5/§11 The member's activities for one local day, generated once on first view.
model DailyPlan {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// memberDayKey: YYYY-MM-DD in the member's zone.
  dayKey    String   @db.VarChar(10)
  /// The zone used to compute dayKey.
  timezone  String
  /// e.g. "v1".
  algorithm String   @db.VarChar(20)
  createdAt DateTime @default(now())

  items DailyPlanItem[]

  @@unique([userId, dayKey])
  @@index([dayKey])
}

/// §5 One chosen activity with an honest reason. Done-state is derived from real rows.
model DailyPlanItem {
  id          String       @id @default(cuid())
  planId      String
  plan        DailyPlan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  slot        PlanSlot
  kind        PlanItemKind
  /// Lesson, Challenge, CommunityPost, Goal, StandardItem, LiveEvent or Opportunity id; checked in core, no FK.
  refId       String
  missionId   String?
  mission     Mission?     @relation(fields: [missionId], references: [id], onDelete: SetNull)
  /// e.g. "Because you chose Marketing & sales".
  reason      String       @db.VarChar(160)
  position    Int
  swappedAt   DateTime?
  dismissedAt DateTime?

  @@unique([planId, slot, position])
  @@index([kind, refId])
}

/// §5/§9/§11 A personal goal, private by default; progress is derived from real rows.
model Goal {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String       @db.VarChar(120)
  why         String?      @db.VarChar(500)
  academyId   String?
  academy     Academy?     @relation(fields: [academyId], references: [id], onDelete: SetNull)
  metric      GoalMetric
  courseId    String?
  course      Course?      @relation(fields: [courseId], references: [id], onDelete: SetNull)
  challengeId String?
  challenge   Challenge?   @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  targetCount Int?
  /// For habits.
  cadence     GoalCadence?
  source      GoalSource   @default(MEMBER)
  startsOn    DateTime     @db.Date
  targetDate  DateTime?    @db.Date
  status      GoalStatus   @default(ACTIVE)
  achievedAt  DateTime?
  /// Shown on the profile only with this opt-in and when Profile.privacy allows "goals".
  isPublic    Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  checkIns GoalCheckIn[]

  @@index([userId, status])
}

/// §5 A manual check-in on the member's day.
model GoalCheckIn {
  id        String   @id @default(cuid())
  goalId    String
  goal      Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// memberDayKey of the check-in.
  dayKey    String   @db.VarChar(10)
  value     Int      @default(1)
  note      String?  @db.VarChar(500)
  createdAt DateTime @default(now())

  @@unique([goalId, dayKey])
  @@index([userId, dayKey])
}

/// §5 One piece of evidence for a REVIEW mission or a SUBMISSION / GATED_SUBMISSIONS
/// challenge. Replaces ChallengeParticipation.progress.submissions (moved by migration).
model EvidenceSubmission {
  id              String                  @id @default(cuid())
  userId          String
  user            User                    @relation("EvidenceAuthor", fields: [userId], references: [id], onDelete: Cascade)
  missionId       String?
  mission         Mission?                @relation(fields: [missionId], references: [id], onDelete: Cascade)
  challengeId     String?
  challenge       Challenge?              @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  participationId String?
  participation   ChallengeParticipation? @relation(fields: [participationId], references: [id], onDelete: Cascade)
  /// Mission occurrence ("once", day key or "week:YYYY-MM-DD").
  occurrence      String?
  text            String                  @db.Text
  /// https only.
  url             String?
  status          EvidenceStatus          @default(PENDING)
  feedback        String?                 @db.Text
  reviewedById    String?
  reviewedBy      User?                   @relation("EvidenceReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt      DateTime?
  /// The JSON submission id a migrated row came from.
  legacyId        String?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  completion MissionCompletion?

  @@index([status, createdAt])
  @@index([challengeId, userId])
  @@index([missionId, userId])
}

// ============================================================
// 24. LIVE COMMUNITY  (directive §4)
// ============================================================

/// §4
enum CommunityPostKind {
  DISCUSSION
  QUESTION
  UPDATE
  INTRODUCTION
  PROJECT
  ANNOUNCEMENT
}

/// §4
enum GroupTopic {
  PROGRAMME
  BUSINESS
  FITNESS
  ENTREPRENEURSHIP
  PERSONAL_DEVELOPMENT
  TECHNOLOGY
  LOCAL
  OTHER
}

/// §4
enum GroupStatus {
  PENDING_REVIEW
  ACTIVE
  REJECTED
  ARCHIVED
}

/// §4
enum GroupJoinPolicy {
  OPEN
  APPROVAL
}

/// §4
enum GroupVisibility {
  /// Every signed-in member can read the group's posts (today's behaviour).
  MEMBERS
  GROUP_ONLY
}

/// §4
enum GroupRole {
  OWNER
  MODERATOR
  MEMBER
}

/// §4
enum GroupMemberStatus {
  PENDING
  /// Invited by an owner or moderator; ACTIVE only when the member accepts.
  INVITED
  ACTIVE
  BANNED
}

/// §4/§13
enum GroupNotifyLevel {
  ALL_POSTS
  ANNOUNCEMENTS
  NONE
}

/// §4 Following a member (mentors are members too). CHECK: no self-follow.
model Follow {
  followerId  String
  follower    User     @relation("Following", fields: [followerId], references: [id], onDelete: Cascade)
  followingId String
  following   User     @relation("Followers", fields: [followingId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@id([followerId, followingId])
  @@index([followingId, createdAt])
}

/// §4/§17 A block removes follows both ways, prevents re-following, and hides the
/// blocked member's activity and notices from the blocker. CHECK: no self-block.
model MemberBlock {
  blockerId String
  blocker   User     @relation("Blocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blockedId String
  blocked   User     @relation("Blocked", fields: [blockedId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([blockerId, blockedId])
  @@index([blockedId])
}

/// §4 Saved posts (a project is saved through its discussion post).
model SavedPost {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId    String
  post      CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime      @default(now())

  @@unique([userId, postId])
  @@index([userId, createdAt])
}

// ============================================================
// 25. OPPORTUNITY MARKETPLACE  (directive §7; LEAD #3, #6)
// Organisations are Partners with their own review. Never promises
// income or employment.
// ============================================================

/// §7
enum PartnerKind {
  /// Tycoonhood itself (house opportunities, THC rewards). Created on first use, never seeded.
  HOUSE
  BUSINESS
  INDIVIDUAL
  NONPROFIT
  EDUCATION
}

/// §7
enum PartnerStatus {
  PENDING
  VERIFIED
  SUSPENDED
  REJECTED
}

/// §7
enum PartnerVerificationMethod {
  HOUSE
  DOMAIN_EMAIL
  BUSINESS_REGISTRATION
  GSTIN
  MANUAL
}

/// §7
enum PartnerMemberRole {
  OWNER
  EDITOR
}

/// §7 The directive's ten opportunity categories.
enum OpportunityKind {
  FREELANCE_PROJECT
  REMOTE_WORK
  INTERNSHIP
  CREATOR_COLLABORATION
  AFFILIATE_PROGRAMME
  BUSINESS_PARTNERSHIP
  DIGITAL_PRODUCT
  MARKETPLACE_SELLER
  SKILL_PROJECT
  COMMUNITY_COMPETITION
}

/// §7
enum WorkMode {
  REMOTE
  ONSITE
  HYBRID
}

/// §7
enum CompensationType {
  FIXED_FEE
  HOURLY
  STIPEND_MONTHLY
  SALARY_ANNUAL
  COMMISSION
  REVENUE_SHARE
  PRIZE
  THC_REWARD
  UNPAID
  TO_BE_DISCUSSED
}

/// §7
enum OpportunityApplyMode {
  IN_APP
  EXTERNAL_URL
  AFFILIATE_PROGRAMME
  CHALLENGE
}

/// §7
enum OpportunityStatus {
  DRAFT
  SUBMITTED
  OPEN
  PAUSED
  CLOSED
  FILLED
  REJECTED
  REMOVED
}

/// §7
enum OpportunityApplicationStatus {
  SUBMITTED
  VIEWED
  SHORTLISTED
  ACCEPTED
  DECLINED
  WITHDRAWN
  COMPLETED
}

/// §7 Contact details an applicant may share with a partner, one tick each.
enum ApplicantContactField {
  EMAIL
  PHONE
  PORTFOLIO
}

/// §7 An organisation or person that posts opportunities, with its own PENDING -> VERIFIED review.
model Partner {
  id                 String                     @id @default(cuid())
  slug               String                     @unique
  name               String
  kind               PartnerKind
  status             PartnerStatus              @default(PENDING)
  /// Shown to the partner.
  statusReason       String?
  reviewedAt         DateTime?
  reviewedById       String?
  reviewedBy         User?                      @relation("PartnerReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  verifiedAt         DateTime?
  verificationMethod PartnerVerificationMethod?
  /// Staff only.
  verificationNote   String?
  about              String                     @db.Text
  websiteUrl         String?
  logoUrl            String?
  city               String?
  country            String                     @default("IN")
  /// Private: staff only.
  contactEmail       String
  /// Private: staff only.
  registrationNumber String?
  termsVersion       String
  termsAcceptedAt    DateTime
  isDemo             Boolean                    @default(false)
  createdById        String?
  createdBy          User?                      @relation("PartnerCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  members       PartnerMember[]
  opportunities Opportunity[]

  @@index([status, kind])
}

/// §7 Rights scoped to one partner (the partner dashboard). Partners are not a UserRole.
model PartnerMember {
  id          String            @id @default(cuid())
  partnerId   String
  partner     Partner           @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  userId      String
  user        User              @relation("PartnerMemberUser", fields: [userId], references: [id], onDelete: Cascade)
  role        PartnerMemberRole @default(EDITOR)
  invitedById String?
  invitedBy   User?             @relation("PartnerMemberInviter", fields: [invitedById], references: [id], onDelete: SetNull)
  createdAt   DateTime          @default(now())

  @@unique([partnerId, userId])
  @@index([userId])
}

/// §7 One listing in the opportunity marketplace.
model Opportunity {
  id                 String                   @id @default(cuid())
  slug               String                   @unique
  partnerId          String
  partner            Partner                  @relation(fields: [partnerId], references: [id], onDelete: Restrict)
  createdById        String?
  createdBy          User?                    @relation("OpportunityCreator", fields: [createdById], references: [id], onDelete: SetNull)
  kind               OpportunityKind
  title              String
  summary            String
  descriptionMd      String                   @db.Text
  academyId          String?
  academy            Academy?                 @relation(fields: [academyId], references: [id], onDelete: SetNull)
  workMode           WorkMode?
  location           String?
  /// e.g. "10 hours a week for 6 weeks".
  commitment         String?
  startsOn           DateTime?                @db.Date
  endsOn             DateTime?                @db.Date
  eligibilityMd      String                   @db.Text
  minLevel           Int?
  /// 18 by default for paid work.
  minAge             Int?
  /// A certificate in this course is required to apply.
  requiredCourseId   String?
  requiredCourse     Course?                  @relation(fields: [requiredCourseId], references: [id], onDelete: SetNull)
  compensationType   CompensationType
  /// Integer paise.
  compMinCents       Int?
  compMaxCents       Int?
  compCurrency       String                   @default("INR")
  commissionBps      Int?
  /// HOUSE partner only; never shown as money.
  thcReward          BigInt?
  /// Required, in plain words.
  compensationTerms  String                   @db.Text
  /// Null = rolling.
  applyBy            DateTime?
  openings           Int?
  applyMode          OpportunityApplyMode     @default(IN_APP)
  externalApplyUrl   String?
  applicationStepsMd String?                  @db.Text
  /// At most 5 {id, label, required}.
  questions          Json                     @default("[]")
  requiresPortfolio  Boolean                  @default(false)
  challengeId        String?
  challenge          Challenge?               @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  status             OpportunityStatus        @default(DRAFT)
  statusReason       String?
  /// Fraud and income-promise checks that fired.
  riskFlags          String[]                 @default([])
  submittedAt        DateTime?
  reviewedAt         DateTime?
  reviewedById       String?
  reviewedBy         User?                    @relation("OpportunityReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  publishedAt        DateTime?
  closedAt           DateTime?
  featuredAt         DateTime?
  isDemo             Boolean                  @default(false)
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt
  /// GENERATED ALWAYS AS (title A, summary B, descriptionMd C) STORED (raw SQL in 20261113000600). Never written.
  searchVector       Unsupported("tsvector")?

  skills       OpportunitySkill[]
  applications OpportunityApplication[]
  saves        SavedOpportunity[]

  @@index([status, kind, applyBy])
  @@index([partnerId, status])
  @@index([academyId, status])
  @@index([searchVector], type: Gin)
}

/// §7 Required and nice-to-have skills of a listing.
model OpportunitySkill {
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  skillId       String
  skill         Skill       @relation(fields: [skillId], references: [id], onDelete: Cascade)
  required      Boolean     @default(true)

  @@id([opportunityId, skillId])
  @@index([skillId])
}

/// §7 A member's application, and its status.
model OpportunityApplication {
  id              String                       @id @default(cuid())
  opportunityId   String
  opportunity     Opportunity                  @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  applicantId     String
  applicant       User                         @relation("OpportunityApplicant", fields: [applicantId], references: [id], onDelete: Cascade)
  status          OpportunityApplicationStatus @default(SUBMITTED)
  coverNote       String                       @db.Text
  answers         Json                         @default("{}")
  portfolioUrl    String?
  /// The contact fields the applicant ticked on this application; partners see only these.
  sharedFields    ApplicantContactField[]      @default([])
  /// When sharedFields was last set to a non-empty list.
  contactSharedAt DateTime?
  attestedAdultAt DateTime?
  /// Shown to the applicant.
  statusNote      String?
  /// Private to the partner and staff.
  partnerNote     String?
  /// Verified skills, certificates and verified projects at apply time.
  skillSnapshot   Json                         @default("{}")
  riskFlags       String[]                     @default([])
  decidedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime                     @default(now())
  updatedAt       DateTime                     @updatedAt

  events OpportunityApplicationEvent[]

  @@unique([opportunityId, applicantId])
  @@index([applicantId, status])
  @@index([opportunityId, status])
}

/// §7 The status timeline an applicant sees, and the trail of partner decisions.
model OpportunityApplicationEvent {
  id            String                        @id @default(cuid())
  applicationId String
  application   OpportunityApplication        @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  fromStatus    OpportunityApplicationStatus?
  toStatus      OpportunityApplicationStatus
  actorId       String?
  actor         User?                         @relation("OpportunityApplicationActor", fields: [actorId], references: [id], onDelete: SetNull)
  note          String?
  createdAt     DateTime                      @default(now())

  @@index([applicationId, createdAt])
}

/// §7 Saved opportunities (like WishlistItem).
model SavedOpportunity {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@unique([userId, opportunityId])
  @@index([userId, createdAt])
}

// ============================================================
// 26. EDITORIAL ENGINE AND GUIDE  (directive §14, §15, §9; LEAD #11, #12)
// Post is the one editorial record. The Guide works without an LLM.
// ============================================================

/// §14
enum PostKind {
  ARTICLE
  LEARNING_INSIGHT
  FOUNDER_NOTE
  EXPERT_CONTRIBUTION
  ACADEMY_UPDATE
  SUCCESS_STORY
  BUSINESS_GUIDE
  WELLNESS_RESOURCE
  INTERVIEW
  EVENT_RECAP
  ANNOUNCEMENT
  PLATFORM_UPDATE
}

/// §14 A post is live when status is SCHEDULED or PUBLISHED and publishedAt <= now().
enum PostStatus {
  DRAFT
  IN_REVIEW
  CHANGES_REQUESTED
  SCHEDULED
  PUBLISHED
  ARCHIVED
}

/// §14/§17
enum ConsentSource {
  CONTACT_FORM
  WRITTEN
  IN_APP
}

/// §9/§14
enum HelpTopic {
  GETTING_STARTED
  LEARNING
  ACADEMIES
  MENTORS
  EVENTS
  OPPORTUNITIES
  THC
  EARN
  SHOP
  COMMUNITY
  ACCOUNT
  PRIVACY
}

/// §9/§14
enum HelpAudience {
  PUBLIC
  MEMBER
}

/// §9
enum GuideMode {
  /// Deterministic guide over real data; needs no LLM.
  GUIDED
  /// Optional LLM mode; only with an owner-supplied key and the member's consent.
  AI
}

/// §9
enum GuideRole {
  MEMBER
  /// The automated guide. Always labelled automated, never presented as a person.
  GUIDE
}

/// §9
enum GuideMessageKind {
  ANSWER
  NO_SOURCE
  REFUSAL
  INTENT_RESULT
  ERROR
}

/// §9
enum GuideFeedback {
  HELPFUL
  NOT_HELPFUL
  WRONG
}

/// §14 Edit history, written on every save of a draft and before publishing.
model PostRevision {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  title     String
  excerpt   String
  contentMd String   @db.Text
  editorId  String?
  editor    User?    @relation("PostRevisionEditor", fields: [editorId], references: [id], onDelete: SetNull)
  note      String?
  createdAt DateTime @default(now())

  @@index([postId, createdAt])
}

/// §14 Editorial categories (seed-taxonomy.ts).
model PostCategory {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  description String?
  sortOrder   Int       @default(0)
  archivedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  posts Post[]
}

/// §14 Free-form tags.
model Tag {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  createdAt DateTime @default(now())

  posts PostTag[]
}

/// §14
model PostTag {
  postId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tagId  String
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@index([tagId])
}

/// §9/§14 FAQ and feature explanations as data: one source for /faq, the Guide and search.
model HelpArticle {
  id           String                   @id @default(cuid())
  slug         String                   @unique
  question     String
  answerMd     String                   @db.Text
  topic        HelpTopic
  audience     HelpAudience             @default(PUBLIC)
  sortOrder    Int                      @default(0)
  published    Boolean                  @default(true)
  /// GENERATED ALWAYS AS (question A, answerMd B) STORED (raw SQL in 20261113000700). Never written.
  searchVector Unsupported("tsvector")?
  updatedById  String?
  updatedBy    User?                    @relation("HelpArticleEditor", fields: [updatedById], references: [id], onDelete: SetNull)
  createdAt    DateTime                 @default(now())
  updatedAt    DateTime                 @updatedAt

  @@index([topic, published, sortOrder])
  @@index([searchVector], type: Gin)
}

/// §9 A member's own Guide thread. Only the member sees it; deletable.
model GuideConversation {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// The first question, clipped.
  title     String
  mode      GuideMode @default(GUIDED)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  messages GuideMessage[]

  @@index([userId, updatedAt])
}

/// §9 Questions and answers with sources, labelling, usage and feedback.
model GuideMessage {
  id              String            @id @default(cuid())
  conversationId  String
  conversation    GuideConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role            GuideRole
  body            String            @db.Text
  kind            GuideMessageKind  @default(ANSWER)
  intent          String?
  /// [{type, id, title, href, quote?}]; type: lesson|course|post|help|mission|challenge|goal|event|mentor|opportunity.
  sources         Json              @default("[]")
  /// True only for LLM-written text.
  aiGenerated     Boolean           @default(false)
  model           String?
  inputTokens     Int?
  outputTokens    Int?
  cacheReadTokens Int?
  stopReason      String?
  feedback        GuideFeedback?
  feedbackNote    String?
  flaggedAt       DateTime?
  reviewedAt      DateTime?
  reviewedById    String?
  reviewedBy      User?             @relation("GuideMessageReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  createdAt       DateTime          @default(now())

  @@index([conversationId, createdAt])
  @@index([feedback, createdAt])
}

/// §9 The daily question quota per member day (memberDayKey), in the database because the
/// in-memory limiter counts per instance.
model GuideUsage {
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dayKey       String   @db.VarChar(10)
  questions    Int      @default(0)
  inputTokens  Int      @default(0)
  outputTokens Int      @default(0)
  updatedAt    DateTime @updatedAt

  @@id([userId, dayKey])
}
```

## b. Changes to existing models

### b.1 Rules that keep existing data intact

- **New columns.** Every new column on an existing table is nullable, or NOT NULL with a default. There is one exception: `MissionCompletion.occurrence`. It is added nullable, filled from the existing idempotency key, and then set NOT NULL in the same migration (000400).
- **Nothing is dropped or renamed.** `Referral.signupIp` is nulled and marked deprecated. Dropping it is left to a later migration, once no deployed build writes it.
- **Two constraints change on existing data.**
  - `PayoutRequest.affiliateId` drops NOT NULL, so that a payout can belong to a contributor instead. A CHECK (`PayoutRequest_one_payee`) requires exactly one payee. Every existing row has `affiliateId`, so every existing row passes.
  - The foreign key of `CommunityPost.groupId` changes from `ON DELETE SET NULL` to `ON DELETE RESTRICT`. Deleting a group used to move its posts into the main feed. Groups are now archived instead.
- **Relation names.** Some existing relations gain a name, for example `@relation("UserAchievementOwner")`. This changes nothing in the database. The name is needed because a new relation now joins the same two models a second time.
- **Generated columns.** These are added to `Lesson`, `Post` and `Instructor` with `GENERATED ALWAYS AS (...) STORED`, which rewrites each table once. All three tables are small.
- **Timing.** Every backfill runs in the same migration that adds the column, before any CHECK that depends on it.

### b.2 Summary

"New column" counts include generated columns. "changed" means a column whose type or nullability changes. Changes that only add a relation name or a doc comment are not counted.

| Model | Change |
|---|---|
| `User` | 2 new columns in 000100 |
| `Session` | no DDL (relation names and doc comments only) |
| `Profile` | 10 new columns in 000100 |
| `Course` | 1 new column in 000100; 1 new column in 000300 |
| `CourseModule` | no DDL (relation names and doc comments only) |
| `Lesson` | 1 new column in 000700 |
| `Resource` | 6 new columns in 000300 |
| `Enrollment` | 2 new columns in 000300 |
| `XpEvent` | 1 new column in 000100 |
| `RankDefinition` | 2 new columns in 000200 |
| `Achievement` | 6 new columns in 000200 |
| `UserAchievement` | 4 new columns in 000200 |
| `Challenge` | 1 new column in 000100; 16 new columns in 000400 |
| `ChallengeParticipation` | no DDL (relation names and doc comments only) |
| `Mission` | 21 new columns in 000400 |
| `MissionCompletion` | 4 new columns in 000400 |
| `Notification` | 10 new columns in 000100 |
| `Product` | 3 new columns in 000100 |
| `Order` | 1 new column in 000100; 1 new column in 000300 |
| `OrderItem` | 1 new column in 000300 |
| `Post` | 29 new columns in 000700 |
| `Referral` | no DDL (relation names and doc comments only) |
| `Channel` | 1 new column in 000300 |
| `Instructor` | 19 new columns in 000300 |
| `PayoutRequest` | 1 new column in 000300; changed: affiliateId |
| `CommunityCategory` | 1 new column in 000100; 1 new column in 000500 |
| `CommunityGroup` | 1 new column in 000100; 1 new column in 000300; 18 new columns in 000500 |
| `GroupMembership` | 9 new columns in 000500 |
| `CommunityPost` | 1 new column in 000100; 7 new columns in 000500 |
| `CommunityComment` | 2 new columns in 000500 |
| `ContentReport` | 1 new column in 000500 |
| `ContactMessage` | no DDL (relation names and doc comments only) |
| `Testimonial` | 9 new columns in 000700 |

### b.3 Changes per model

Each block shows only what is added or changed. Lines marked `// CHANGED, was:` give the line as it reads today, then the line that replaces it. Doc comments (`///`) are part of the change.

#### `User`: 2 new columns in 000100

```prisma
model User {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: achievements UserAchievement[]
  achievements       UserAchievement[]        @relation("UserAchievementOwner")
  // CHANGED, was: notifications Notification[]
  notifications      Notification[]           @relation("NotificationRecipient")
  // CHANGED, was: communityPosts CommunityPost[]
  communityPosts    CommunityPost[]    @relation("CommunityPostAuthor")
  // CHANGED, was: groupMemberships GroupMembership[]
  groupMemberships  GroupMembership[]  @relation("GroupMembershipUser")
  // CHANGED, was: instructorProfile Instructor?
  instructorProfile Instructor?        @relation("InstructorUser")

  // ---- Living ecosystem (directive §1, §17, §19; LEAD #8) ----
  /// Created by the dev-only demo seed (packages/db/src/seed-demo/). Never true in production.
  isDemo             Boolean @default(false)
  /// Staff test or internal account, left out of analytics (countableMemberWhere). Audited.
  excludeFromMetrics Boolean @default(false)
  // §3 academies
  academyMemberships AcademyMembership[]
  // §13 notifications
  notificationPreferences  NotificationPreference[]
  notificationSettings     NotificationSettings?
  pushSubscriptions        PushSubscription[]
  scheduledNotifications   ScheduledNotification[]
  notificationsActed       Notification[]           @relation("NotificationActor")
  notificationTopicsEdited NotificationTopic[]      @relation("NotificationTopicEditor")
  announcementsCreated     Announcement[]           @relation("AnnouncementCreator")
  announcementsRetracted   Announcement[]           @relation("AnnouncementRetractor")
  // §4 §19 activity and analytics
  activity       ActivityEvent[]     @relation("ActivityActor")
  activityHidden ActivityEvent[]     @relation("ActivityHider")
  activityDays   MemberActivityDay[]
  // §8 progression
  skills                MemberSkill[]         @relation("MemberSkillOwner")
  skillsVerified        MemberSkill[]         @relation("MemberSkillVerifier")
  projects              Project[]             @relation("ProjectOwner")
  projectCollaborations ProjectCollaborator[] @relation("ProjectCollaborations")
  collaboratorInvites   ProjectCollaborator[] @relation("ProjectCollaboratorInviter")
  groupInvitesSent      GroupMembership[]     @relation("GroupMembershipInviter")
  projectsVerified      Project[]             @relation("ProjectVerifier")
  projectsFeatured      Project[]             @relation("ProjectFeaturer")
  rankAwards            RankAward[]           @relation("RankAwardMember")
  rankAwardsGiven       RankAward[]           @relation("RankAwardGiver")
  achievementsAwarded   UserAchievement[]     @relation("UserAchievementAwarder")
  learningPathsAuthored LearningPath[]        @relation("LearningPathAuthor")
  pathFollows           LearningPathFollow[]
  // §2 §12 mentors and contributors
  contributorApplications         ContributorApplication[] @relation("ContributorApplicant")
  contributorApplicationsReviewed ContributorApplication[] @relation("ContributorReviewer")
  contributorAccount              ContributorAccount?
  agreementsAuthored              RevenueShareAgreement[]  @relation("AgreementAuthor")
  agreementsAccepted              RevenueShareAgreement[]  @relation("AgreementAcceptor")
  mentorsApproved                 MentorProfile[]          @relation("MentorApprover")
  credentialsVerified             ExpertCredential[]       @relation("CredentialVerifier")
  instructorsIdentityVerified     Instructor[]             @relation("InstructorIdentityVerifier")
  instructorsPhotoVerified        Instructor[]             @relation("InstructorPhotoVerifier")
  contentSubmissions              ContentSubmission[]      @relation("ContentSubmitter")
  contentReviews                  ContentSubmission[]      @relation("ContentReviewer")
  resourcesSubmitted              Resource[]               @relation("ResourceSubmitter")
  calendarFeedTokens              CalendarFeedToken[]
  // §6 live events
  eventHostings               LiveEventHost[]     @relation("LiveEventHostUser")
  eventHostsConfirmed         LiveEventHost[]     @relation("LiveEventHostConfirmer")
  eventRegistrations          EventRegistration[] @relation("EventRegistrant")
  eventRegistrationsCancelled EventRegistration[] @relation("EventRegistrationCanceller")
  attendanceMarked            EventRegistration[] @relation("EventAttendanceMarker")
  eventFeedback               EventFeedback[]     @relation("EventFeedbackAuthor")
  eventFeedbackHidden         EventFeedback[]     @relation("EventFeedbackHider")
  liveEventsCreated           LiveEvent[]         @relation("LiveEventCreator")
  liveEventsReviewed          LiveEvent[]         @relation("LiveEventReviewer")
  eventSeriesCreated          LiveEventSeries[]   @relation("LiveEventSeriesCreator")
  eventInterests              EventInterest[]
  attendanceDisputes          EventRegistration[] @relation("EventAttendanceDisputer")
  attendanceDisputesResolved  EventRegistration[] @relation("EventAttendanceDisputeResolver")
  // §5 daily engine
  dailyPlans          DailyPlan[]
  goals               Goal[]
  goalCheckIns        GoalCheckIn[]
  evidenceSubmissions EvidenceSubmission[] @relation("EvidenceAuthor")
  evidenceReviewed    EvidenceSubmission[] @relation("EvidenceReviewer")
  challengesAuthored  Challenge[]          @relation("ChallengeAuthor")
  missionsAuthored    Mission[]            @relation("MissionAuthor")
  // §4 community
  following                Follow[]          @relation("Following")
  followers                Follow[]          @relation("Followers")
  blocking                 MemberBlock[]     @relation("Blocker")
  blockedBy                MemberBlock[]     @relation("Blocked")
  savedPosts               SavedPost[]
  communityPostsFeatured   CommunityPost[]   @relation("CommunityPostFeaturer")
  groupsCreated            CommunityGroup[]  @relation("GroupCreator")
  groupsReviewed           CommunityGroup[]  @relation("GroupReviewer")
  groupMembershipsApproved GroupMembership[] @relation("GroupMembershipApprover")
  groupMembershipsBanned   GroupMembership[] @relation("GroupMembershipBanner")
  reportsResolved          ContentReport[]   @relation("ReportResolver")
  // §7 opportunities
  partnerMemberships           PartnerMember[]               @relation("PartnerMemberUser")
  partnerInvites               PartnerMember[]               @relation("PartnerMemberInviter")
  partnersReviewed             Partner[]                     @relation("PartnerReviewer")
  partnersCreated              Partner[]                     @relation("PartnerCreator")
  opportunitiesCreated         Opportunity[]                 @relation("OpportunityCreator")
  opportunitiesReviewed        Opportunity[]                 @relation("OpportunityReviewer")
  opportunityApplications      OpportunityApplication[]      @relation("OpportunityApplicant")
  opportunityApplicationEvents OpportunityApplicationEvent[] @relation("OpportunityApplicationActor")
  savedOpportunities           SavedOpportunity[]
  // §17 shop honesty
  stockConfirmations Product[] @relation("ProductStockConfirmer")
  // §14 §9 editorial and guide
  postsAuthored         Post[]              @relation("PostAuthorUser")
  postsCreated          Post[]              @relation("PostCreator")
  postsUpdated          Post[]              @relation("PostUpdater")
  postsReviewed         Post[]              @relation("PostReviewer")
  postRevisions         PostRevision[]      @relation("PostRevisionEditor")
  helpArticlesEdited    HelpArticle[]       @relation("HelpArticleEditor")
  testimonials          Testimonial[]       @relation("TestimonialMember")
  testimonialsVerified  Testimonial[]       @relation("TestimonialVerifier")
  guideConversations    GuideConversation[]
  guideMessagesReviewed GuideMessage[]      @relation("GuideMessageReviewer")
  guideUsage            GuideUsage[]
}
```

#### `Session`: no DDL (relation names and doc comments only)

```prisma
model Session {
  // ... every existing field and attribute stays as it is ...
  /// ipKey(ip): a keyed HMAC prefix (platform/ip-key.ts). Rows written before 20261113000100 were
  /// unkeyed SHA-256 and are nulled by that migration. Never the IP itself.
}
```

#### `Profile`: 10 new columns in 000100

```prisma
model Profile {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §10, §8, §9, §11) ----
  /// One line under the name on the profile.
  headline            String?
  /// Location is opt-in: shown only when privacy.location is true. City and region only.
  city                String?
  region              String?
  /// ISO 3166-1 alpha-2.
  country             String?
  /// At most 5 {label, url}, https only (cleanUrl).
  links               Json?
  /// Dashboard layout: hidden and ordered cards. Shape checked in core (dashboard.ts).
  dashboard           Json      @default("{}")
  /// At most 6 {kind: ACHIEVEMENT|CERTIFICATE|PROJECT|SKILL, refId}, each checked against the member's own rows.
  pinnedItems         Json      @default("[]")
  /// The member agreed that the Guide's optional AI mode may send their questions to the model provider.
  aiGuideConsentAt    DateTime?
  /// The zone in force before the last time-zone change. It stays in force until timezoneEffectiveAt
  /// (the start of the next member day in the new zone), so no member day is counted twice or skipped.
  previousTimezone    String?
  timezoneEffectiveAt DateTime?
}
```

#### `Course`: 1 new column in 000100; 1 new column in 000300

```prisma
model Course {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §3, §2, §12) ----
  /// The owning academy and the source of truth: the authoring service sets pillar from academy.pillar in
  /// the same write, and no other write path sets either. Backfilled from pillar by migration 000100.
  academyId    String?
  academy      Academy?       @relation("AcademyCourses", fields: [academyId], references: [id], onDelete: SetNull)
  /// Set when this course is an academy's flagship programme.
  flagshipOf   Academy?       @relation("AcademyFlagship")
  deliveryMode CourseDelivery @default(SELF_PACED)
  cohorts                CourseCohort[]
  liveEvents             LiveEvent[]
  announcements          Announcement[]
  activity               ActivityEvent[]
  projects               Project[]
  pathSteps              LearningPathStep[]
  missions               Mission[]
  challenges             Challenge[]
  goals                  Goal[]
  groups                 CommunityGroup[]
  posts                  Post[]
  submissions            ContentSubmission[]
  opportunitiesRequiring Opportunity[]

  @@index([academyId, status])
}
```

#### `CourseModule`: no DDL (relation names and doc comments only)

```prisma
model CourseModule {
  // ... every existing field and attribute stays as it is ...
  // §8 §3
  skills    ModuleSkill[]
  pathSteps LearningPathStep[]
}
```

#### `Lesson`: 1 new column in 000700

```prisma
model Lesson {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §9, §12) ----
  /// GENERATED ALWAYS AS (title weight A, contentMd weight C) STORED (raw SQL in 20261113000700). Never written.
  searchVector Unsupported("tsvector")?
  submissions  ContentSubmission[]

  @@index([searchVector], type: Gin)
}
```

#### `Resource`: 6 new columns in 000300

```prisma
model Resource {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: kind String @default("link") /// link | file | template
  kind     String  @default("link") /// link | file | template | recording | slides

  // ---- Living ecosystem (directive §6, §12) ----
  /// Event resource (recording, slides, worksheet). Exactly one of courseId, lessonId, eventId, instructorId is set (CHECK).
  eventId       String?
  event         LiveEvent?        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  /// Expert-profile resource.
  instructorId  String?
  instructor    Instructor?       @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  /// Contributor resources stay DRAFT until their ContentSubmission is approved.
  status        ContentStatus     @default(PUBLISHED)
  submittedById String?
  submittedBy   User?             @relation("ResourceSubmitter", fields: [submittedById], references: [id], onDelete: SetNull)
  /// Required for event and expert resources (CHECK). Course and lesson resources follow course access.
  audience      ResourceAudience?
  createdAt     DateTime          @default(now())
  submissions ContentSubmission[]

  @@index([eventId])
  @@index([instructorId, status])
}
```

#### `Enrollment`: 2 new columns in 000300

```prisma
model Enrollment {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §2, §12) ----
  /// The learner let this course's instructor or cohort mentor see their named progress. Null = aggregates only.
  progressSharedAt DateTime?
  /// Mentor-led run the learner joined.
  cohortId         String?
  cohort           CourseCohort? @relation(fields: [cohortId], references: [id], onDelete: SetNull)

  @@index([cohortId])
}
```

#### `XpEvent`: 1 new column in 000100

```prisma
model XpEvent {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §3, §8, §19) ----
  /// The academy the XP was earned in. Backfilled from lesson, course or challenge; null for house-wide XP.
  academyId String?
  academy   Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)

  @@index([academyId, createdAt])
  @@index([source, createdAt])
}
```

#### `RankDefinition`: 2 new columns in 000200

```prisma
model RankDefinition {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §8) ----
  /// Conditions beyond minLevel, e.g. {"verifiedSkills": 2, "verifiedProjects": 1}. Null = level only.
  criteria Json?
  /// One plain sentence on what the rank means, shown on the rank ladder.
  summary  String?
  awards RankAward[]
}
```

#### `Achievement`: 6 new columns in 000200

```prisma
model Achievement {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §8, §3) ----
  kind       AchievementKind @default(ACHIEVEMENT)
  academyId  String?
  academy    Academy?        @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Awarded by staff only (RECOGNITION); the rules engine skips it.
  manualOnly Boolean         @default(false)
  sortOrder  Int             @default(0)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @default(now()) @updatedAt
}
```

#### `UserAchievement`: 4 new columns in 000200

```prisma
model UserAchievement {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  user          User        @relation("UserAchievementOwner", fields: [userId], references: [id], onDelete: Cascade)

  // ---- Living ecosystem (directive §8) ----
  /// Staff member who awarded a manual achievement. Null = earned by rule.
  awardedById String?
  awardedBy   User?     @relation("UserAchievementAwarder", fields: [awardedById], references: [id], onDelete: SetNull)
  /// Shown to the member with a manual award.
  note        String?
  /// What earned it, e.g. "course:<id>" or "project:<id>".
  sourceRef   String?
  /// A revoked award stays for the record and is hidden everywhere.
  revokedAt   DateTime?
}
```

#### `Challenge`: 1 new column in 000100; 16 new columns in 000400

```prisma
model Challenge {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §5, §3, §4) ----
  /// Backfilled from criteria.event: DAILY_CHECKIN, SUBMISSION and GATED_SUBMISSIONS keep their name; anything else is RULE.
  kind            ChallengeKind    @default(RULE)
  scope           ChallengeScope   @default(HOUSE)
  /// Backfilled from pillar.
  academyId       String?
  academy         Academy?         @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// GROUP scope: the group that runs it. Groups are archived, never deleted.
  groupId         String?
  group           CommunityGroup?  @relation(fields: [groupId], references: [id], onDelete: Restrict)
  /// A programme challenge.
  courseId        String?
  course          Course?          @relation(fields: [courseId], references: [id], onDelete: SetNull)
  cadence         ChallengeCadence @default(ONE_OFF)
  /// A dated instance of a recurring challenge points at its template.
  templateId      String?
  template        Challenge?       @relation("ChallengeTemplate", fields: [templateId], references: [id], onDelete: SetNull)
  instances       Challenge[]      @relation("ChallengeTemplate")
  /// The period an instance covers, e.g. "2026-12" or "2026-W49". Unique per template.
  instanceKey     String?
  instructions    String?          @db.Text
  coverImage      String?
  /// A real limit, checked in the joining transaction. Null = no limit.
  maxParticipants Int?
  /// Staff opt-in for the challenge leaderboard. Off by default, and stays off for Wellness.
  showBoard       Boolean          @default(false)
  /// Null = never published. Backfilled for UPCOMING, ACTIVE and ENDED rows.
  publishedAt     DateTime?
  createdById     String?
  createdBy       User?            @relation("ChallengeAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  isDemo          Boolean          @default(false)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @default(now()) @updatedAt
  skills        ChallengeSkill[]
  submissions   EvidenceSubmission[]
  projects      Project[]
  pathSteps     LearningPathStep[]
  goals         Goal[]
  liveEvents    LiveEvent[]
  opportunities Opportunity[]

  @@unique([templateId, instanceKey])
  @@index([scope, lifecycle])
  @@index([academyId, lifecycle])
  @@index([groupId])
}
```

#### `ChallengeParticipation`: no DDL (relation names and doc comments only)

```prisma
model ChallengeParticipation {
  // ... every existing field and attribute stays as it is ...
  /// Rule progress and the "checkins" day list. Submissions move to EvidenceSubmission (20261113000900, with DAILY-B).
  // §5 evidence (was progress.submissions)
  submissions EvidenceSubmission[]
}
```

#### `Mission`: 21 new columns in 000400

```prisma
model Mission {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §5, §3, §9) ----
  /// Backfilled: repeatable with criteria.within = "week" -> WEEKLY; other repeatable -> DAILY; else ONCE.
  cadence          MissionCadence      @default(ONCE)
  verification     MissionVerification @default(AUTO)
  kind             MissionKind?
  /// Markdown. Required before publishing.
  instructions     String?             @db.Text
  ctaLabel         String?             @db.VarChar(40)
  /// An internal path only (safeSitePath).
  ctaHref          String?
  estimatedMinutes Int?
  academyId        String?
  academy          Academy?            @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Onboarding interest and goal values the mission suits. Empty = everyone.
  interestTags     String[]            @default([])
  minLevel         Int?
  maxLevel         Int?
  courseId         String?
  course           Course?             @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// Null = draft. Backfilled to the migration time for existing rows.
  publishedAt      DateTime?
  startsAt         DateTime?
  endsAt           DateTime?
  archivedAt       DateTime?
  /// Relative weight when the daily plan chooses between eligible missions.
  weight           Int                 @default(1)
  sortOrder        Int                 @default(0)
  createdById      String?
  createdBy        User?               @relation("MissionAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @default(now()) @updatedAt
  planItems   DailyPlanItem[]
  submissions EvidenceSubmission[]

  @@index([active, cadence])
  @@index([academyId])
}
```

#### `MissionCompletion`: 4 new columns in 000400

```prisma
model MissionCompletion {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §5) ----
  /// The period this completion fills: "once", a memberDayKey, "week:YYYY-MM-DD" or "month:YYYY-MM".
  /// Backfilled from idempotencyKey ("mission:<missionId>:<userId>:<occurrence>").
  occurrence   String
  verification MissionVerification @default(AUTO)
  /// SELF_REPORT: the member's short note.
  note         String?             @db.VarChar(500)
  /// REVIEW: the approved evidence.
  submissionId String?             @unique
  submission   EvidenceSubmission? @relation(fields: [submissionId], references: [id], onDelete: SetNull)

  @@unique([missionId, userId, occurrence])
  @@index([userId, completedAt])
}
```

#### `Notification`: 10 new columns in 000100

```prisma
model Notification {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  user      User             @relation("NotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)

  // ---- Living ecosystem (directive §13; LEAD #10) ----
  /// Catalogue key (platform/notification-topics.ts). Null on older rows; read derives it from type.
  topic          String?
  /// Writing the same key twice is a no-op, e.g. "follow:<followerId>:<userId>".
  dedupeKey      String?              @unique
  /// Unread notices with the same key coalesce into one row ("3 people replied").
  groupKey       String?
  groupCount     Int                  @default(1)
  /// The member whose action caused the notice, when there is one.
  actorId        String?
  actor          User?                @relation("NotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  priority       NotificationPriority @default(NORMAL)
  /// The notice was on screen in the centre; readAt is set when it is opened.
  seenAt         DateTime?
  archivedAt     DateTime?
  /// Time-bound notices leave the centre after this.
  expiresAt      DateTime?
  /// Retracting an announcement deletes its notices.
  announcementId String?
  announcement   Announcement?        @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  deliveries ScheduledNotification[]

  @@index([userId, archivedAt, createdAt])
  @@index([announcementId])
}
```

#### `Product`: 3 new columns in 000100

```prisma
model Product {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §17, §2, §6; LEAD #15) ----
  /// Staff confirmed the stock count is real. Scarcity copy ("Only N left") needs it (scarcityAllowed).
  stockConfirmedAt   DateTime?
  stockConfirmedById String?
  stockConfirmedBy   User?           @relation("ProductStockConfirmer", fields: [stockConfirmedById], references: [id], onDelete: SetNull)
  /// Optional academy link: academy and programme pages list active, priced products of their academy.
  academyId          String?
  academy            Academy?        @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// LIVE_EVENT product behind a paid mentor offering (system-managed).
  mentorOffering     MentorOffering?
  /// LIVE_EVENT product behind paid group events (system-managed).
  liveEvents         LiveEvent[]
}
```

#### `Order`: 1 new column in 000100; 1 new column in 000300

```prisma
model Order {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §2, §6, §19) ----
  /// BOOKING orders carry one LIVE_EVENT line and never touch the cart.
  source              OrderSource          @default(CART)
  /// When the order became PAID. Backfilled only where the time is exact.
  paidAt              DateTime?
  contributorEarnings ContributorEarning[]

  @@index([source, status])
}
```

#### `OrderItem`: 1 new column in 000300

```prisma
model OrderItem {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §6, §2) ----
  /// The seat or 1:1 booking this LIVE_EVENT line pays for.
  /// Not unique: a retry after an expired hold adds a new line. Checkout keeps one PENDING or PAID order
  /// per registration under the registration's row lock.
  registrationId String?
  registration   EventRegistration?  @relation(fields: [registrationId], references: [id], onDelete: SetNull)
  earning        ContributorEarning?

  @@index([registrationId])
}
```

#### `Post`: 29 new columns in 000700

```prisma
model Post {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §14, §15, §17; LEAD #11) ----
  kind                PostKind                 @default(ARTICLE)
  /// Live when SCHEDULED or PUBLISHED and publishedAt <= now(). Backfilled from publishedAt.
  status              PostStatus               @default(DRAFT)
  /// Byline: an expert profile or a staff member. authorName stays the display fallback.
  authorInstructorId  String?
  authorInstructor    Instructor?              @relation(fields: [authorInstructorId], references: [id], onDelete: SetNull)
  authorUserId        String?
  authorUser          User?                    @relation("PostAuthorUser", fields: [authorUserId], references: [id], onDelete: SetNull)
  categoryId          String?
  category            PostCategory?            @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  academyId           String?
  academy             Academy?                 @relation(fields: [academyId], references: [id], onDelete: SetNull)
  courseId            String?
  course              Course?                  @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// EVENT_RECAP posts.
  eventId             String?
  event               LiveEvent?               @relation(fields: [eventId], references: [id], onDelete: SetNull)
  /// SUCCESS_STORY posts need a consented Testimonial (CHECK while SCHEDULED or PUBLISHED).
  testimonialId       String?                  @unique
  testimonial         Testimonial?             @relation(fields: [testimonialId], references: [id], onDelete: SetNull)
  /// INTERVIEW posts: when and how the subject agreed.
  subjectConsentAt    DateTime?
  subjectConsentNote  String?
  featuredAt          DateTime?
  featuredRank        Int?
  /// Required when there is a cover image.
  coverAlt            String?
  seoTitle            String?
  seoDescription      String?
  readingMinutes      Int?
  submittedAt         DateTime?
  reviewedAt          DateTime?
  reviewedById        String?
  reviewedBy          User?                    @relation("PostReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  /// Shown to the author.
  reviewNote          String?
  /// FOUNDER_NOTE posts, and announcements signed by the founder, need the founder's recorded approval.
  founderApprovedAt   DateTime?
  founderApprovalNote String?
  createdById         String?
  createdBy           User?                    @relation("PostCreator", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById         String?
  updatedBy           User?                    @relation("PostUpdater", fields: [updatedById], references: [id], onDelete: SetNull)
  /// Members subscribed to editorial.post hear once, when it goes live.
  notifyOnPublish     Boolean                  @default(false)
  notifiedAt          DateTime?
  /// Created by the dev-only demo seed. Never true in production; publicWhere.post() leaves it out.
  isDemo              Boolean                  @default(false)
  /// GENERATED ALWAYS AS (title A, excerpt B, contentMd C) STORED (raw SQL in 20261113000700). Never written.
  searchVector        Unsupported("tsvector")?
  revisions PostRevision[]
  tags      PostTag[]

  @@index([status, publishedAt])
  @@index([kind, status, publishedAt])
  @@index([featuredAt])
  @@index([authorInstructorId])
  @@index([categoryId])
  @@index([academyId, status, publishedAt])
  @@index([searchVector], type: Gin)
}
```

#### `Referral`: no DDL (relation names and doc comments only)

```prisma
model Referral {
  // ... every existing field and attribute stays as it is ...
  /// Deprecated (house rule: no raw IPs). Nulled by 20261113000100 and never written again;
  /// dropped by a later migration once no deployed build writes it.
}
```

#### `Channel`: 1 new column in 000300

```prisma
model Channel {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §2) ----
  /// The members-only chat of a mentor-led cohort.
  cohortId String?       @unique
  cohort   CourseCohort? @relation(fields: [cohortId], references: [id], onDelete: Cascade)
}
```

#### `Instructor`: 19 new columns in 000300

```prisma
model Instructor {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  user      User?    @relation("InstructorUser", fields: [userId], references: [id], onDelete: SetNull)

  // ---- Living ecosystem (directive §2, §12, §15, §17; LEAD #2) ----
  /// The one public expert profile for mentors, instructors and creators.
  status               ExpertStatus             @default(ACTIVE)
  /// Shown to the expert when paused or suspended.
  statusReason         String?
  /// What this expert does here. Backfilled to {INSTRUCTOR}. Grants in can() come from it.
  contributorKinds     ContributorKind[]        @default([])
  /// Areas of expertise, plain labels (at most 8).
  expertise            String[]                 @default([])
  experienceMd         String?                  @db.Text
  yearsExperience      Int?
  /// ISO 639-1 codes from a fixed list.
  languages            String[]                 @default([])
  /// IANA zone, checked with isValidTimeZone.
  timezone             String?
  /// At most 5 {label, url}, https only.
  links                Json?
  /// Staff confirmed the person is who the profile says. No ID images are stored; the method goes in identityNote.
  identityVerifiedAt   DateTime?
  identityVerifiedById String?
  identityVerifiedBy   User?                    @relation("InstructorIdentityVerifier", fields: [identityVerifiedById], references: [id], onDelete: SetNull)
  /// Private to staff.
  identityNote         String?
  /// Staff confirmed the photo shows this person (verified mentor photos, §17). Changing photoUrl clears
  /// it and photoSha256; a daily sweep re-fetches the image and clears both when the hash changes.
  photoVerifiedAt      DateTime?
  /// sha256 of the image bytes fetched when staff verified the photo.
  photoSha256          String?
  photoVerifiedById    String?
  photoVerifiedBy      User?                    @relation("InstructorPhotoVerifier", fields: [photoVerifiedById], references: [id], onDelete: SetNull)
  /// The founder's own profile (§15). Backfilled for slug "harsha".
  isFounder            Boolean                  @default(false)
  /// Owner option (BLOCKED_ON_YOU item 12): once reviewed course revisions exist, this author's
  /// revisions skip review. Unused while DR-34's strict rule stands.
  trustedAuthor        Boolean                  @default(false)
  isDemo               Boolean                  @default(false)
  /// GENERATED ALWAYS AS (name A, headline B, bio C) STORED (raw SQL in 20261113000300). Never written.
  searchVector         Unsupported("tsvector")?
  mentorProfile      MentorProfile?
  credentials        ExpertCredential[]
  contributorAccount ContributorAccount?
  cohorts            CourseCohort[]
  hostedGroups       CommunityGroup[]
  resources          Resource[]
  submissions        ContentSubmission[]
  eventHosts         LiveEventHost[]
  feedback           EventFeedback[]
  posts              Post[]

  @@index([status, isDemo])
  @@index([searchVector], type: Gin)
}
```

#### `PayoutRequest`: 1 new column in 000300; changed: affiliateId

```prisma
model PayoutRequest {
  // ... every existing field and attribute stays as it is ...
  /// Exactly one of affiliateId and contributorId is set (CHECK).
  // CHANGED, was: affiliateId String
  affiliateId String?
  // CHANGED, was: affiliate AffiliateProfile @relation(fields: [affiliateId], references: [id], onDelete: Cascade)
  affiliate   AffiliateProfile? @relation(fields: [affiliateId], references: [id], onDelete: Cascade)

  // ---- Living ecosystem (directive §2, §12) ----
  /// A contributor payout (mentor, instructor or creator earnings).
  contributorId String?
  contributor   ContributorAccount?  @relation(fields: [contributorId], references: [id], onDelete: Cascade)
  earnings      ContributorEarning[]

  @@index([contributorId, status])
}
```

#### `CommunityCategory`: 1 new column in 000100; 1 new column in 000500

```prisma
model CommunityCategory {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §3, §4) ----
  /// Backfilled: warrior -> warrior, business -> business, money -> wealth, mind -> wellness.
  academyId  String?
  academy    Academy?  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Moved from the "community.archived" SiteSetting.
  archivedAt DateTime?

  @@index([academyId])
}
```

#### `CommunityGroup`: 1 new column in 000100; 1 new column in 000300; 18 new columns in 000500

```prisma
model CommunityGroup {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §4, §3, §2) ----
  /// Backfilled to PROGRAMME for the four "-program" groups.
  topic            GroupTopic      @default(OTHER)
  /// Member-created groups start PENDING_REVIEW. ARCHIVED is moved from the "community.archived" SiteSetting.
  status           GroupStatus     @default(ACTIVE)
  joinPolicy       GroupJoinPolicy @default(OPEN)
  visibility       GroupVisibility @default(MEMBERS)
  academyId        String?
  academy          Academy?        @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// A programme group belongs to its course (backfilled for the four "-program" groups).
  courseId         String?
  course           Course?         @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// A mentor-hosted group.
  hostInstructorId String?
  hostInstructor   Instructor?     @relation(fields: [hostInstructorId], references: [id], onDelete: SetNull)
  createdById      String?
  createdBy        User?           @relation("GroupCreator", fields: [createdById], references: [id], onDelete: SetNull)
  reviewedById     String?
  reviewedBy       User?           @relation("GroupReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt       DateTime?
  /// Shown to the member who proposed the group.
  rejectionReason  String?
  archivedAt       DateTime?
  /// LOCAL groups: city and region only, never an address.
  city             String?
  region           String?
  country          String?
  coverImageUrl    String?
  rules            String?         @db.Text
  /// ACTIVE memberships, kept in the joining transaction. Backfilled.
  memberCount      Int             @default(0)
  isDemo           Boolean         @default(false)
  updatedAt        DateTime        @default(now()) @updatedAt
  challenges    Challenge[]
  liveEvents    LiveEvent[]
  activity      ActivityEvent[]
  announcements Announcement[]

  @@index([status, topic])
  @@index([academyId, status])
}
```

#### `GroupMembership`: 9 new columns in 000500

```prisma
model GroupMembership {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  user      User           @relation("GroupMembershipUser", fields: [userId], references: [id], onDelete: Cascade)

  // ---- Living ecosystem (directive §4) ----
  role         GroupRole         @default(MEMBER)
  /// APPROVAL groups: PENDING until an owner or moderator approves.
  status       GroupMemberStatus @default(ACTIVE)
  notifyLevel  GroupNotifyLevel  @default(ANNOUNCEMENTS)
  approvedById String?
  approvedBy   User?             @relation("GroupMembershipApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  approvedAt   DateTime?
  bannedById   String?
  bannedBy     User?             @relation("GroupMembershipBanner", fields: [bannedById], references: [id], onDelete: SetNull)
  bannedAt     DateTime?
  banReason    String?
  /// Set for an INVITED membership: who invited the member.
  invitedById  String?
  invitedBy    User?             @relation("GroupMembershipInviter", fields: [invitedById], references: [id], onDelete: SetNull)

  @@index([groupId, status, role])
  @@index([userId, status])
}
```

#### `CommunityPost`: 1 new column in 000100; 7 new columns in 000500

```prisma
model CommunityPost {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: author User @relation(fields: [authorId], references: [id], onDelete: Cascade)
  author        User               @relation("CommunityPostAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  /// Restrict (was SetNull): deleting a group must never move its posts into the main feed.
  // CHANGED, was: group CommunityGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
  group         CommunityGroup?    @relation(fields: [groupId], references: [id], onDelete: Restrict)
  // CHANGED, was: comments CommunityComment[]
  comments  CommunityComment[] @relation("PostComments")

  // ---- Living ecosystem (directive §4, §3, §8, §10) ----
  kind                   CommunityPostKind @default(DISCUSSION)
  /// Set when the author edits after posting (the "edited" marker).
  editedAt               DateTime?
  /// Creation or the latest visible comment: the "active" sort. Backfilled from comments.
  lastActivityAt         DateTime          @default(now())
  /// Staff highlight. Cleared when the post is hidden, removed or its group archived.
  featuredAt             DateTime?
  featuredById           String?
  featuredBy             User?             @relation("CommunityPostFeaturer", fields: [featuredById], references: [id], onDelete: SetNull)
  /// The author agreed that a featured post's title and a short excerpt may show on the public homepage.
  publicPreviewConsentAt DateTime?
  /// QUESTION posts: the reply the author accepted.
  acceptedCommentId      String?           @unique
  acceptedComment        CommunityComment? @relation("AcceptedAnswer", fields: [acceptedCommentId], references: [id], onDelete: SetNull)
  academyId              String?
  academy                Academy?          @relation(fields: [academyId], references: [id], onDelete: SetNull)
  saves   SavedPost[]
  /// The project this post is the discussion thread of.
  project Project?

  @@index([kind, createdAt])
  @@index([featuredAt])
  @@index([state, lastActivityAt])
  @@index([academyId, state, createdAt])
}
```

#### `CommunityComment`: 2 new columns in 000500

```prisma
model CommunityComment {
  // ... every existing field and attribute stays as it is ...
  // CHANGED, was: post CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  post      CommunityPost   @relation("PostComments", fields: [postId], references: [id], onDelete: Cascade)

  // ---- Living ecosystem (directive §4) ----
  /// One level of replies.
  parentId    String?
  parent      CommunityComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies     CommunityComment[] @relation("CommentReplies")
  editedAt    DateTime?
  acceptedFor CommunityPost?     @relation("AcceptedAnswer")

  @@index([parentId])
}
```

#### `ContentReport`: 1 new column in 000500

```prisma
model ContentReport {
  // ... every existing field and attribute stays as it is ...
  /// "post" | "comment" | "user" | "group" | "project" | "event" | "event_feedback" | "opportunity" | "partner"

  // ---- Living ecosystem (directive §4, §18) ----
  resolvedById String?
  resolvedBy   User?   @relation("ReportResolver", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@index([targetType, targetId])
}
```

#### `ContactMessage`: no DDL (relation names and doc comments only)

```prisma
model ContactMessage {
  // ... every existing field and attribute stays as it is ...
  // §17 consent carried by a contact-form message
  testimonials Testimonial[]
}
```

#### `Testimonial`: 9 new columns in 000700

```prisma
model Testimonial {
  // ... every existing field and attribute stays as it is ...

  // ---- Living ecosystem (directive §14, §17) ----
  /// The member the story is about, when they have an account.
  userId             String?
  user               User?           @relation("TestimonialMember", fields: [userId], references: [id], onDelete: SetNull)
  /// How consent was given. Null on rows written before this column.
  consentSource      ConsentSource?
  /// CONTACT_FORM consent: the message that carried it.
  contactMessageId   String?
  contactMessage     ContactMessage? @relation(fields: [contactMessageId], references: [id], onDelete: SetNull)
  consentNote        String?
  /// Withdrawal unpublishes the testimonial and any story built on it.
  consentWithdrawnAt DateTime?
  publishedAt        DateTime?
  /// Staff checked the story against the member's real record.
  verifiedAt         DateTime?
  verifiedById       String?
  verifiedBy         User?           @relation("TestimonialVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  updatedAt          DateTime        @default(now()) @updatedAt
  story Post?
}
```

### b.4 Enum value additions (migration 000000, on their own)

PostgreSQL cannot use an enum value in the transaction that added it, and `migrate-sql.ts` runs each migration in one transaction. These values therefore go in their own migration, ahead of every migration and seed that uses them.

```sql
ALTER TYPE "NotificationType" ADD VALUE 'LEARNING';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT';
ALTER TYPE "NotificationType" ADD VALUE 'OPPORTUNITY';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRIBUTOR';
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT';
ALTER TYPE "NotificationType" ADD VALUE 'GOAL';
ALTER TYPE "NotificationType" ADD VALUE 'ANNOUNCEMENT';
ALTER TYPE "ProductKind" ADD VALUE 'LIVE_EVENT';
```

In the schema the values are appended to each enum under a tag:

```prisma
enum NotificationType {
  // ... existing values unchanged ...
  // ---- Living ecosystem (directive §13, §6; added by 20261113000000) ----
  LEARNING
  MENTORSHIP
  EVENT
  OPPORTUNITY
  CONTRIBUTOR
  PROJECT
  GOAL
  ANNOUNCEMENT
}

enum ProductKind {
  // ... existing values unchanged ...
  // ---- Living ecosystem (directive §13, §6; added by 20261113000000) ----
  LIVE_EVENT
}
```

`LIVE_EVENT` products are created and changed only by the events and mentoring services. Staff never create one by hand in /admin/products. A CHECK (`Product_live_event_no_thc`) keeps them out of THC pricing.

### b.5 Data-only changes to existing rows

| Migration | Table | Change |
|---|---|---|
| 000100 | `Referral` | `signupIp` set to NULL (raw IP addresses) |
| 000100 | `Session` | `ipHash` set to NULL (unkeyed hashes) |
| 000100 | `Course`, `Challenge`, `CommunityGroup` | `academyId` from `pillar` |
| 000100 | `CommunityCategory` | `academyId` by slug: warrior → warrior, business → business, money → wealth, mind → wellness. introductions, wins, questions and feedback stay without an academy |
| 000100 | `CommunityPost` | `academyId` from the post's group, else from its category |
| 000100 | `XpEvent` | `academyId` for LESSON_COMPLETED (lesson → module → course), COURSE_COMPLETED and CHALLENGE_COMPLETED events. Other sources stay null |
| 000100 | `AcademyMembership` (new rows) | One row per member and academy, from enrolments that are not DROPPED. Source BACKFILL, `notify` false; `joinedAt` is the earliest `enrolledAt` |
| 000100 | `Order` | `paidAt` from the ledger transaction (THC). For rupee orders, from the first `order.paid` or `order.settle_manual` audit row. Orders with no recorded payment stay null |
| 000200 | `RankAward` (new rows) | A GRANDFATHERED award for every member who already holds a rank, with `evidence = {"level": <level>}` |
| 000300 | `Instructor` | `contributorKinds = {INSTRUCTOR}` where empty. `isFounder = true` for slug `harsha`. Status defaults to ACTIVE |
| 000400 | `Mission` | `cadence`: repeatable missions with `criteria.within = "week"` become WEEKLY, other repeatable missions DAILY, the rest ONCE. `cooldownHours` is kept; a cooldown above 24 hours stays a minimum gap between completions (DAILY-A). `publishedAt` set, so every existing mission stays live |
| 000400 | `MissionCompletion` | `occurrence` is the part of `idempotencyKey` after `mission:<missionId>:<userId>:`. A key without that prefix is kept whole. Then the column is set NOT NULL |
| 000400 | `Challenge` | `kind` from `criteria.event`. `publishedAt` set for UPCOMING, ACTIVE and ENDED challenges |
| 000900 (with DAILY-B) | `ChallengeParticipation` | The `submissions` array moves out of `progress` into `EvidenceSubmission` rows. The `checkins` list stays in `progress` |
| 000500 | `CommunityPost` | `lastActivityAt` is the later of `createdAt` and the latest VISIBLE comment |
| 000500 | `CommunityGroup` | `memberCount` from memberships. The four programme groups get topic PROGRAMME and their `courseId`. Groups in the `community.archived` setting become ARCHIVED |
| 000500 | `CommunityCategory` | `archivedAt` for categories in the `community.archived` setting |
| 000700 | `Post` | `status`: no `publishedAt` → DRAFT; past → PUBLISHED; future → SCHEDULED. What the site shows does not change |

## c. Migration split

### c.1 Order, names and why

The names follow the existing pattern `YYYYMMDDHHMMSS_snake_name`. They sort after the last migration on the merged base, `20261112110000_pending_email_at` from `build/full-platform`. That matters: `migrate-sql.ts` applies folders in name order, and on a database that already has newer migrations it applies an older-named pending folder after them, out of order. Dating these 13 November keeps every database on one order.

| # | Folder | What it holds | Why it sits here |
|---|---|---|---|
| 0 | `20261113000000_ecosystem_enum_values` | 9 `ALTER TYPE ... ADD VALUE` statements and nothing else | A value added inside a transaction cannot be used in that transaction |
| 1 | `20261113000100_platform_foundation` | Academies (rows plus backfills); the notification centre; the activity feed and analytics tables; profile fields; `Order.paidAt`; confirmed stock; the two privacy clean-ups | Almost every later table references `Academy`, and every later feature sends notifications |
| 2 | `20261113000200_progression` | Skills, member skills, projects, rank awards, achievement kinds, learning paths | Mentors (300), challenges (400) and opportunities (600) link to `Skill` |
| 3 | `20261113000300_mentors_events` | The expert profile, mentors, contributors, revenue terms and earnings, cohorts, the content review queue, calendar feeds, and the whole `LiveEvent` family | These reference each other: a `LiveEvent` points at a `MentorProfile`, `MentorOffering` and `CourseCohort`; a `ContributorEarning` points at an `EventRegistration`; `Resource` and `OrderItem` point at events. Splitting them would create a cycle |
| 4 | `20261113000400_daily_engine` | Mission and challenge extensions, evidence, daily plans, goals | Plan items and evidence reference live events (300) and skills (200) |
| 5 | `20261113000500_community` | Post kinds and replies, group extensions, follows, blocks, saved posts | Group columns reference `Course` and `Instructor`. The changed group foreign key is kept away from the foundation migration |
| 6 | `20261113000600_opportunities` | Partners, opportunities, applications | References skills (200), challenges (400) and courses |
| 7 | `20261113000700_editorial_guide` | The post workflow, categories, tags, revisions, testimonial consent, help articles, the Guide tables, full-text search on lessons, posts and help | Posts reference live events (300) and instructors |
| 8 | `20261113000800_live_event_overlap_guard` | `btree_gist` and the mentor double-booking exclusion constraint | Kept alone, so it can be left out of a release if the production database refuses the extension, without touching anything else |
| 9 | `20261113000900_challenge_evidence_move` | Copies the JSON challenge submissions into `EvidenceSubmission` and removes them from `ChallengeParticipation.progress` | It lands in the same commit as the code that reads and writes `EvidenceSubmission` (DAILY-B). Until then `gamification/challenges.ts` reads `progress.submissions`; moving them in 000400 would break the existing challenge pages for all of Phases 1 and 2 |

No foreign key or enum column in any migration points at a table or type created by a later one. This was checked from the schema by script, then confirmed by applying the files in order to an empty database.

### c.2 How each file is built

Each draft file at `final/dm/mig/out/<name>/migration.sql` has three parts:
1. **A header comment**, in the style of the existing migrations. It holds any SQL that must run before the DDL: the privacy clean-up in 000100, and the whole of 000800.
2. **The generated DDL.** This is `prisma migrate diff --from-schema-datamodel final/base.prisma --to-schema-datamodel final/dm/schema.prisma --script`, split by `final/dm/mig/split.py` into the ten files, using the column-to-migration map in `final/dm/migcheck.py`. 000900 has no generated DDL. Within a file the order is: enum types, dropped foreign keys, altered tables, new tables, indexes, foreign keys. Two generated statements are rewritten:
   - `MissionCompletion.occurrence` is added nullable, so that it can be backfilled first.
   - The five `searchVector` columns become `GENERATED ALWAYS AS (...) STORED`.
3. **The hand-written SQL**: backfills, CHECK constraints and partial unique indexes. It is shown in full below.

### c.3 The ten migrations

#### 20261113000000_ecosystem_enum_values

The whole file:

```sql
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
```

#### 20261113000100_platform_foundation

Header and privacy clean-up, at the top of the file:

```sql
-- ============================================================================
-- LIVING ECOSYSTEM 1/8: PLATFORM FOUNDATION
--
-- Academies (one per Pillar, rows inserted here because the backfills below
-- need them), academy links on courses, challenges, groups, categories, posts
-- and XP, the notification centre, the activity feed and the analytics
-- aggregates, profile fields, Order.paidAt and staff-confirmed stock.
--
-- Additive except two privacy clean-ups (house rule: no raw IPs):
--   · Referral.signupIp held raw addresses. Nulled; the column is dropped by
--     a later migration once no deployed build writes it.
--   · Session.ipHash held an unkeyed SHA-256 of the address, which can be
--     reversed by trying every IPv4 address. Nulled; new rows use ipKey().
-- ============================================================================

UPDATE "Referral" SET "signupIp" = NULL WHERE "signupIp" IS NOT NULL;
UPDATE "Session" SET "ipHash" = NULL WHERE "ipHash" IS NOT NULL;
```

**Generated DDL (from `prisma migrate diff`, split by `dm/mig/split.py`):**

- 10 new enum types: `AcademyJoinSource`, `NotificationChannel`, `NotificationPriority`, `DigestFrequency`, `ScheduledNotificationStatus`, `AnnouncementPriority`, `AnnouncementAudience`, `AnnouncementStatus`, `ActivityEventKind`, `ActivityAudience`
- 12 new tables: `Academy`, `AcademyMembership`, `NotificationTopic`, `NotificationPreference`, `NotificationSettings`, `PushSubscription`, `Announcement`, `ScheduledNotification`, `ActivityEvent`, `MemberActivityDay`, `AnalyticsDaily`, `EngagementCounterDay`
- `User`: `excludeFromMetrics`, `isDemo`
- `Profile`: `aiGuideConsentAt`, `city`, `country`, `dashboard`, `headline`, `links`, `pinnedItems`, `previousTimezone`, `region`, `timezoneEffectiveAt`
- `Course`: `academyId`
- `XpEvent`: `academyId`
- `Challenge`: `academyId`
- `Notification`: `actorId`, `announcementId`, `archivedAt`, `dedupeKey`, `expiresAt`, `groupCount`, `groupKey`, `priority`, `seenAt`, `topic`
- `Product`: `academyId`, `stockConfirmedAt`, `stockConfirmedById`
- `Order`: `paidAt`
- `CommunityCategory`: `academyId`
- `CommunityGroup`: `academyId`
- `CommunityPost`: `academyId`
- 30 indexes and 30 foreign keys

Hand-written SQL, after the generated DDL:

```sql
-- ---- Academies: the four rows (names are editable data; slug and pillar are stable) ----
INSERT INTO "Academy" ("id", "slug", "pillar", "name", "shortName", "tagline", "description", "focusAreas", "accent", "disclaimer", "status", "sortOrder", "createdAt", "updatedAt") VALUES
  ('academy_warrior', 'warrior', 'WARRIOR', 'Warrior Academy', 'Warrior',
   'Physical discipline, mental resilience, fitness, habits and self-mastery.',
   'Courses, challenges and discussions on physical discipline, mental resilience, fitness, habits and self-mastery.',
   ARRAY['Physical discipline', 'Mental resilience', 'Fitness', 'Habits', 'Self-mastery'],
   'warrior', NULL, 'PUBLISHED', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('academy_business', 'business', 'BUILDER', 'Business Academy', 'Business',
   'Entrepreneurship, business strategy, marketing, sales, leadership and execution.',
   'Courses, challenges and discussions on entrepreneurship, business strategy, marketing, sales, leadership and execution.',
   ARRAY['Entrepreneurship', 'Business strategy', 'Marketing', 'Sales', 'Leadership', 'Execution'],
   'builder', NULL, 'PUBLISHED', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('academy_wealth', 'wealth', 'TYCOON', 'Wealth Academy', 'Wealth',
   'Financial literacy, investment education, budgeting, wealth creation and financial planning.',
   'Courses, challenges and discussions on financial literacy, investment education, budgeting, wealth creation and financial planning.',
   ARRAY['Financial literacy', 'Investment education', 'Budgeting', 'Wealth creation', 'Financial planning'],
   'tycoon', 'Educational content, not financial advice.', 'PUBLISHED', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('academy_wellness', 'wellness', 'MIND', 'Wellness Academy', 'Wellness',
   'Mindfulness, meditation, emotional awareness, sleep and sustainable wellness.',
   'Courses, challenges and discussions on mindfulness, meditation, emotional awareness, sleep and sustainable wellness.',
   ARRAY['Mindfulness', 'Meditation', 'Emotional awareness', 'Sleep', 'Sustainable wellness'],
   'mind', 'Educational content, not medical advice.', 'PUBLISHED', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Flagship programmes. On a fresh database the courses do not exist yet, and the
-- base seed (seed.ts) sets the flagship when it creates them (only where it is still null).
UPDATE "Academy" a SET "flagshipCourseId" = c."id"
FROM "Course" c
WHERE a."flagshipCourseId" IS NULL
  AND c."slug" = CASE a."slug"
    WHEN 'warrior'  THEN 'warrior'
    WHEN 'business' THEN 'business-mastery'
    WHEN 'wealth'   THEN 'financial-planning-investment-advisory'
    WHEN 'wellness' THEN 'mindfulness-wellness'
  END;

-- ---- academyId backfills ----
UPDATE "Course" c SET "academyId" = a."id" FROM "Academy" a WHERE a."pillar" = c."pillar" AND c."academyId" IS NULL;
UPDATE "Challenge" ch SET "academyId" = a."id" FROM "Academy" a WHERE a."pillar" = ch."pillar" AND ch."academyId" IS NULL;
UPDATE "CommunityGroup" g SET "academyId" = a."id" FROM "Academy" a WHERE a."pillar" = g."pillar" AND g."academyId" IS NULL;
UPDATE "CommunityCategory" cc SET "academyId" = a."id"
FROM "Academy" a
WHERE cc."academyId" IS NULL
  AND a."slug" = CASE cc."slug" WHEN 'warrior' THEN 'warrior' WHEN 'business' THEN 'business' WHEN 'money' THEN 'wealth' WHEN 'mind' THEN 'wellness' END;
UPDATE "CommunityPost" p SET "academyId" = s."academyId"
FROM (
  SELECT p2."id", COALESCE(g."academyId", cc."academyId") AS "academyId"
  FROM "CommunityPost" p2
  LEFT JOIN "CommunityGroup" g ON g."id" = p2."groupId"
  LEFT JOIN "CommunityCategory" cc ON cc."id" = p2."categoryId"
) s
WHERE s."id" = p."id" AND s."academyId" IS NOT NULL AND p."academyId" IS NULL;
UPDATE "XpEvent" x SET "academyId" = c."academyId"
FROM "Lesson" l JOIN "CourseModule" m ON m."id" = l."moduleId" JOIN "Course" c ON c."id" = m."courseId"
WHERE x."source" = 'LESSON_COMPLETED' AND x."sourceId" = l."id" AND x."academyId" IS NULL;
UPDATE "XpEvent" x SET "academyId" = c."academyId" FROM "Course" c
WHERE x."source" = 'COURSE_COMPLETED' AND x."sourceId" = c."id" AND x."academyId" IS NULL;
UPDATE "XpEvent" x SET "academyId" = ch."academyId" FROM "Challenge" ch
WHERE x."source" = 'CHALLENGE_COMPLETED' AND x."sourceId" = ch."id" AND x."academyId" IS NULL;

-- Members already enrolled belong to the course's academy (dropped enrolments do not count).
-- notify stays false: enrolling in a programme is not a request for academy notices.
INSERT INTO "AcademyMembership" ("id", "userId", "academyId", "source", "joinedAt", "notify")
SELECT 'am' || md5(e."userId" || ':' || c."academyId"), e."userId", c."academyId", 'BACKFILL', MIN(e."enrolledAt"), false
FROM "Enrollment" e JOIN "Course" c ON c."id" = e."courseId"
WHERE e."status" <> 'DROPPED' AND c."academyId" IS NOT NULL
GROUP BY e."userId", c."academyId"
ON CONFLICT ("userId", "academyId") DO NOTHING;

-- ---- Notification centre ----
-- One unread, unarchived row per (member, groupKey): notify() coalesces into it with
-- INSERT ... ON CONFLICT ("userId", "groupKey") WHERE <same predicate> DO UPDATE.
CREATE UNIQUE INDEX "Notification_unread_group_key" ON "Notification" ("userId", "groupKey")
  WHERE "groupKey" IS NOT NULL AND "readAt" IS NULL AND "archivedAt" IS NULL;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_group_count_pos" CHECK ("groupCount" >= 1);
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_digest_hour_range" CHECK ("digestHour" BETWEEN 0 AND 23);
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_quiet_hours" CHECK (
  ("quietStartMin" IS NULL AND "quietEndMin" IS NULL)
  OR ("quietStartMin" BETWEEN 0 AND 1439 AND "quietEndMin" BETWEEN 0 AND 1439 AND "quietStartMin" <> "quietEndMin"));
-- The outbox carries email and push copies and timed notices; in-app rows are written directly.
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_not_in_app" CHECK ("channel" IS NULL OR "channel" <> 'IN_APP');
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_attempts_nonneg" CHECK ("attempts" >= 0);

-- ---- Order.paidAt, only where the time is recorded ----
-- THC orders: the ledger transaction that paid them.
UPDATE "Order" o SET "paidAt" = t."createdAt"
FROM "LedgerTransaction" t
WHERE o."ledgerTxId" = t."id" AND o."paidAt" IS NULL;
-- Rupee orders: the first order.paid (provider capture) or order.settle_manual audit row.
-- settle_manual is written only after a successful settle; its meta.to may be FULFILLED.
UPDATE "Order" o SET "paidAt" = a."firstPaid"
FROM (
  SELECT "targetId", MIN("createdAt") AS "firstPaid"
  FROM "AuditLog"
  WHERE "targetType" = 'order' AND "action" IN ('order.paid', 'order.settle_manual')
  GROUP BY "targetId"
) a
WHERE a."targetId" = o."id" AND o."paidAt" IS NULL;
```

#### 20261113000200_progression

```sql
-- ============================================================================
-- LIVING ECOSYSTEM 2/8: PROGRESSION AND IDENTITY (directive §8)
--
-- Skills (linked to course modules, challenges, projects and opportunities),
-- member skills with self-declared vs verified levels, member projects with a
-- verification status, rank awards, achievement kinds and manual awards, and
-- learning paths. Additive only. Members who already hold a rank get a
-- GRANDFATHERED award so the rank page has a record of how they got it.
-- ============================================================================
```

**Generated DDL (from `prisma migrate diff`, split by `dm/mig/split.py`):**

- 9 new enum types: `SkillLevel`, `SkillVerifiedVia`, `ProjectKind`, `ProjectVisibility`, `ProjectVerificationStatus`, `ProjectCollaboratorStatus`, `RankAwardReason`, `AchievementKind`, `PathStepKind`
- 11 new tables: `Skill`, `ModuleSkill`, `ChallengeSkill`, `MemberSkill`, `Project`, `ProjectCollaborator`, `ProjectSkill`, `RankAward`, `LearningPath`, `LearningPathStep`, `LearningPathFollow`
- `RankDefinition`: `criteria`, `summary`
- `Achievement`: `academyId`, `createdAt`, `kind`, `manualOnly`, `sortOrder`, `updatedAt`
- `UserAchievement`: `awardedById`, `note`, `revokedAt`, `sourceRef`
- 21 indexes and 33 foreign keys

```sql
-- ---- Rank awards for ranks already held ----
INSERT INTO "RankAward" ("id", "userId", "rankId", "reason", "evidence", "awardedAt")
SELECT 'ra' || md5(u."id" || ':' || u."rankId"), u."id", u."rankId", 'GRANDFATHERED', jsonb_build_object('level', u."level"), CURRENT_TIMESTAMP
FROM "User" u
WHERE u."rankId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- ---- Verification rules ----
ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_not_self_verified" CHECK ("verifiedById" IS NULL OR "verifiedById" <> "userId");
ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_verified_has_time" CHECK ("level" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL);
ALTER TABLE "Project" ADD CONSTRAINT "Project_not_self_verified" CHECK ("verifiedById" IS NULL OR "verifiedById" <> "userId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_verified_has_time" CHECK ("verificationStatus" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL);
-- A step points at one kind of target. Target FKs are SET NULL on delete, so the
-- target itself may be null (the step then shows as unavailable).
ALTER TABLE "LearningPathStep" ADD CONSTRAINT "LearningPathStep_one_target" CHECK (CASE "kind"
  WHEN 'COURSE'    THEN "moduleId" IS NULL AND "challengeId" IS NULL
  WHEN 'MODULE'    THEN "courseId" IS NULL AND "challengeId" IS NULL
  WHEN 'CHALLENGE' THEN "courseId" IS NULL AND "moduleId" IS NULL
  ELSE "courseId" IS NULL AND "moduleId" IS NULL AND "challengeId" IS NULL AND "title" IS NOT NULL
END);
```

#### 20261113000300_mentors_events

```sql
-- ============================================================================
-- LIVING ECOSYSTEM 3/8: MENTORS, CONTRIBUTORS AND LIVE EVENTS (§2, §6, §12)
--
-- Instructor becomes the one expert profile (status, kinds, verification);
-- MentorProfile, categories, credentials, offerings and availability;
-- contributor applications, accounts, revenue-share agreements (no row is
-- inserted: paid offerings stay unpublishable until staff set terms) and
-- earnings; mentor-led cohorts; the content review queue; calendar feeds;
-- the LiveEvent family, with attendance confirmation and disputes;
-- Order.source BOOKING; contributor payouts on PayoutRequest (affiliateId
-- becomes nullable; exactly one payee is set); a generated full-text search
-- column on Instructor (never written by the client).
--
-- Additive except PayoutRequest.affiliateId DROP NOT NULL. Existing
-- instructors become ACTIVE INSTRUCTOR experts; slug "harsha" is the founder.
-- The one-to-one EventKind row is inserted here so booking code and test
-- databases built from migrations can rely on it.
-- ============================================================================
```

**Generated DDL (from `prisma migrate diff`, split by `dm/mig/split.py`):**

- 23 new enum types: `ExpertStatus`, `ContributorKind`, `ContributorApplicationStatus`, `ContributorAccountStatus`, `MentorStatus`, `BookingMode`, `CredentialKind`, `CredentialStatus`, `AvailabilityExceptionKind`, `RevenueScope`, `CourseDelivery`, `CohortStatus`, `ContentSubmissionType`, `ContentSubmissionStatus`, `ResourceAudience`, `OrderSource`, `EventMode`, `LiveEventFormat`, `LiveEventStatus`, `LiveEventVisibility`, `LiveEventHostRole`, `EventRegistrationStatus`, `AttendanceSource`
- 21 new tables: `MentorProfile`, `MentorCategory`, `MentorCategoryLink`, `ExpertCredential`, `ContributorApplication`, `ContributorAccount`, `RevenueShareAgreement`, `ContributorEarning`, `MentorOffering`, `MentorAvailabilityRule`, `MentorAvailabilityException`, `CourseCohort`, `ContentSubmission`, `CalendarFeedToken`, `EventKind`, `LiveEvent`, `LiveEventHost`, `EventRegistration`, `EventFeedback`, `LiveEventSeries`, `EventInterest`
- `Course`: `deliveryMode`
- `Resource`: `audience`, `createdAt`, `eventId`, `instructorId`, `status`, `submittedById`
- `Enrollment`: `cohortId`, `progressSharedAt`
- `Order`: `source`
- `OrderItem`: `registrationId`
- `Channel`: `cohortId`
- `Instructor`: `contributorKinds`, `experienceMd`, `expertise`, `identityNote`, `identityVerifiedAt`, `identityVerifiedById`, `isDemo`, `isFounder`, `languages`, `links`, `photoSha256`, `photoVerifiedAt`, `photoVerifiedById`, `searchVector`, `status`, `statusReason`, `timezone`, `trustedAuthor`, `yearsExperience`
- `PayoutRequest`: `contributorId`, `affiliateId`
- `CommunityGroup`: `hostInstructorId`
- 55 indexes and 83 foreign keys

```sql
-- ---- Existing instructors ----
UPDATE "Instructor" SET "contributorKinds" = ARRAY['INSTRUCTOR']::"ContributorKind"[] WHERE cardinality("contributorKinds") = 0;
UPDATE "Instructor" SET "isFounder" = true WHERE "slug" = 'harsha';
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_years_range" CHECK ("yearsExperience" IS NULL OR "yearsExperience" BETWEEN 0 AND 80);

-- ---- The one-to-one kind (exactly one; mentor bookings use it) ----
INSERT INTO "EventKind" ("id", "slug", "name", "mode", "sortOrder", "active", "createdAt", "updatedAt")
VALUES ('evk_one_to_one', 'one-to-one', 'One-to-one session', 'ONE_TO_ONE', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
CREATE UNIQUE INDEX "EventKind_one_to_one_key" ON "EventKind" ("mode") WHERE "mode" = 'ONE_TO_ONE';

-- ---- Mentors ----
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_booking_rules_range" CHECK (
  "minNoticeHours" BETWEEN 0 AND 720 AND "horizonDays" BETWEEN 1 AND 120 AND "bufferMinutes" BETWEEN 0 AND 120
  AND ("maxSessionsPerDay" IS NULL OR "maxSessionsPerDay" >= 1)
  AND ("cancellationHours" IS NULL OR "cancellationHours" BETWEEN 0 AND 168));
ALTER TABLE "MentorOffering" ADD CONSTRAINT "MentorOffering_shape" CHECK (
  "durationMin" BETWEEN 15 AND 240 AND "capacity" >= 1 AND ("priceCents" IS NULL OR "priceCents" >= 100));
ALTER TABLE "MentorAvailabilityRule" ADD CONSTRAINT "MentorAvailabilityRule_window" CHECK (
  "weekday" BETWEEN 0 AND 6 AND "startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440
  AND ("validFrom" IS NULL OR "validUntil" IS NULL OR "validUntil" >= "validFrom"));
ALTER TABLE "MentorAvailabilityException" ADD CONSTRAINT "MentorAvailabilityException_order" CHECK ("endsAt" > "startsAt");
CREATE UNIQUE INDEX "MentorCategoryLink_primary_key" ON "MentorCategoryLink" ("mentorId") WHERE "isPrimary";

-- ---- Contributors and money ----
CREATE UNIQUE INDEX "ContributorApplication_open_key" ON "ContributorApplication" ("userId", "kind")
  WHERE "status" IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO');
ALTER TABLE "RevenueShareAgreement" ADD CONSTRAINT "RevenueShareAgreement_terms_range" CHECK (
  "contributorShareBps" BETWEEN 0 AND 10000 AND "version" >= 1
  AND ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom")
  AND ("holdDays" IS NULL OR "holdDays" BETWEEN 0 AND 365)
  AND ("minPayoutCents" IS NULL OR "minPayoutCents" >= 0)
  AND ("refundWindowHours" IS NULL OR "refundWindowHours" BETWEEN 0 AND 720));
-- @@unique([contributorId, scope, version]) does not cover the platform defaults (contributorId null).
CREATE UNIQUE INDEX "RevenueShareAgreement_default_key" ON "RevenueShareAgreement" ("scope", "version") WHERE "contributorId" IS NULL;
ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_amount_range" CHECK (
  "baseCents" >= 0 AND "shareBps" BETWEEN 0 AND 10000 AND "amountCents" >= 0 AND "amountCents" <= "baseCents");
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_one_payee" CHECK (num_nonnulls("affiliateId", "contributorId") = 1);
CREATE UNIQUE INDEX "PayoutRequest_open_contributor_key" ON "PayoutRequest" ("contributorId")
  WHERE "contributorId" IS NOT NULL AND "status" IN ('REQUESTED', 'APPROVED');
-- A LIVE_EVENT product is bought in rupees only.
ALTER TABLE "Product" ADD CONSTRAINT "Product_live_event_no_thc" CHECK ("kind" <> 'LIVE_EVENT' OR "priceThc" IS NULL);

-- ---- Cohorts, review queue, resources ----
ALTER TABLE "CourseCohort" ADD CONSTRAINT "CourseCohort_shape" CHECK (
  ("endsOn" IS NULL OR "endsOn" >= "startsOn") AND ("capacity" IS NULL OR "capacity" > 0));
CREATE UNIQUE INDEX "ContentSubmission_open_target_key" ON "ContentSubmission" ("type", "targetKey")
  WHERE "status" IN ('SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED');
-- Every existing write path sets exactly one of courseId and lessonId (both CASCADE).
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_one_owner" CHECK (num_nonnulls("courseId", "lessonId", "eventId", "instructorId") = 1);
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_audience_required" CHECK (("eventId" IS NULL AND "instructorId" IS NULL) OR "audience" IS NOT NULL);

-- ---- Live events ----
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_time_order" CHECK ("endsAt" > "startsAt");
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_capacity" CHECK (
  "registeredCount" >= 0 AND ("capacity" IS NULL OR ("capacity" > 0 AND "registeredCount" <= "capacity")));
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_price_min" CHECK ("priceCents" IS NULL OR "priceCents" >= 100);
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_listed_has_slug" CHECK ("visibility" = 'PRIVATE' OR "slug" IS NOT NULL);
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_one_to_one_shape" CHECK ("mode" <> 'ONE_TO_ONE' OR ("capacity" = 1 AND "visibility" = 'PRIVATE'));
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_link_reveal_range" CHECK ("linkRevealMinutes" BETWEEN 0 AND 1440);
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_ics_sequence_nonneg" CHECK ("icsSequence" >= 0);
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_attended_has_time" CHECK ("status" <> 'ATTENDED' OR "attendedAt" IS NOT NULL);
-- A dispute is resolved only after it is opened (workstreams D2).
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_dispute_order" CHECK ("attendanceDisputeResolvedAt" IS NULL OR "attendanceDisputedAt" IS NOT NULL);
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
```

#### 20261113000400_daily_engine

```sql
-- ============================================================================
-- LIVING ECOSYSTEM 4/8: DAILY ACTIVITY ENGINE (directive §5, §11)
--
-- Mission cadence, verification and targeting; MissionCompletion.occurrence
-- (the period a completion fills, taken from the existing idempotency key);
-- challenge kinds, scopes, recurring templates and evidence; daily plans;
-- goals and check-ins. EvidenceSubmission is created here; the copy of
-- existing challenge evidence out of ChallengeParticipation.progress lands
-- later, with DAILY-B (20261113000900_challenge_evidence_move).
--
-- Existing missions keep working unchanged: repeatable weekly missions
-- become WEEKLY, other repeatable missions DAILY, the rest ONCE, all
-- published. cooldownHours is kept: DAILY-A enforces a cooldown above 24
-- hours as a minimum gap, so a 72-hour mission keeps its meaning. Existing occurrence strings ("once", "YYYY-MM-DD",
-- "week:YYYY-MM-DD") are exactly what the new code writes.
-- ============================================================================
```

**Generated DDL (from `prisma migrate diff`, split by `dm/mig/split.py`):**

- 13 new enum types: `MissionCadence`, `MissionVerification`, `MissionKind`, `PlanSlot`, `PlanItemKind`, `GoalMetric`, `GoalCadence`, `GoalStatus`, `GoalSource`, `ChallengeKind`, `ChallengeScope`, `ChallengeCadence`, `EvidenceStatus`
- 5 new tables: `DailyPlan`, `DailyPlanItem`, `Goal`, `GoalCheckIn`, `EvidenceSubmission`
- `Challenge`: `cadence`, `courseId`, `coverImage`, `createdAt`, `createdById`, `groupId`, `instanceKey`, `instructions`, `isDemo`, `kind`, `maxParticipants`, `publishedAt`, `scope`, `showBoard`, `templateId`, `updatedAt`
- `Mission`: `academyId`, `archivedAt`, `cadence`, `courseId`, `createdAt`, `createdById`, `ctaHref`, `ctaLabel`, `endsAt`, `estimatedMinutes`, `instructions`, `interestTags`, `kind`, `maxLevel`, `minLevel`, `publishedAt`, `sortOrder`, `startsAt`, `updatedAt`, `verification`, `weight`
- `MissionCompletion`: `note`, `occurrence`, `submissionId`, `verification`, `occurrence`
- 18 indexes and 22 foreign keys

```sql
-- ---- Missions ----
UPDATE "Mission" SET
  "cadence" = (CASE
    WHEN "repeatable" AND "criteria"->>'within' = 'week' THEN 'WEEKLY'
    WHEN "repeatable" THEN 'DAILY'
    ELSE 'ONCE' END)::"MissionCadence",
  "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP);
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_weight_nonneg" CHECK ("weight" >= 0);
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_level_range" CHECK ("minLevel" IS NULL OR "maxLevel" IS NULL OR "maxLevel" >= "minLevel");
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_window" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt");
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_minutes_pos" CHECK ("estimatedMinutes" IS NULL OR "estimatedMinutes" > 0);

-- idempotencyKey is "mission:<missionId>:<userId>:<occurrence>" (rewards.ts). A key
-- without that prefix keeps the whole key as its occurrence, so no row collides.
UPDATE "MissionCompletion" SET "occurrence" = CASE
  WHEN left("idempotencyKey", length('mission:' || "missionId" || ':' || "userId" || ':')) = 'mission:' || "missionId" || ':' || "userId" || ':'
  THEN substr("idempotencyKey", length('mission:' || "missionId" || ':' || "userId" || ':') + 1)
  ELSE "idempotencyKey" END
WHERE "occurrence" IS NULL;
ALTER TABLE "MissionCompletion" ALTER COLUMN "occurrence" SET NOT NULL;

-- ---- Challenges ----
UPDATE "Challenge" SET "kind" = (CASE "criteria"->>'event'
  WHEN 'DAILY_CHECKIN' THEN 'DAILY_CHECKIN'
  WHEN 'SUBMISSION' THEN 'SUBMISSION'
  WHEN 'GATED_SUBMISSIONS' THEN 'GATED_SUBMISSIONS'
  ELSE 'RULE' END)::"ChallengeKind";
UPDATE "Challenge" SET "publishedAt" = CURRENT_TIMESTAMP WHERE "lifecycle" IN ('UPCOMING', 'ACTIVE', 'ENDED') AND "publishedAt" IS NULL;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_max_participants_pos" CHECK ("maxParticipants" IS NULL OR "maxParticipants" > 0);
-- Groups are archived, never deleted (groupId is RESTRICT); academies are archived, never deleted.
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_scope_target" CHECK (
  ("scope" <> 'GROUP' OR "groupId" IS NOT NULL) AND ("scope" <> 'ACADEMY' OR "academyId" IS NOT NULL));

-- ---- Evidence ----
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_one_target" CHECK (num_nonnulls("missionId", "challengeId") = 1);
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_mission_occurrence" CHECK ("missionId" IS NULL OR "occurrence" IS NOT NULL);
CREATE UNIQUE INDEX "EvidenceSubmission_open_mission_key" ON "EvidenceSubmission" ("missionId", "userId", "occurrence")
  WHERE "missionId" IS NOT NULL AND "status" IN ('PENDING', 'APPROVED');

-- Existing evidence stays in ChallengeParticipation.progress until DAILY-B switches
-- gamification/challenges.ts to EvidenceSubmission; 20261113000900_challenge_evidence_move
-- copies it then.

-- ---- Goals ----
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_target_count_pos" CHECK ("targetCount" IS NULL OR "targetCount" > 0);
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_dates" CHECK ("targetDate" IS NULL OR "targetDate" >= "startsOn");
ALTER TABLE "GoalCheckIn" ADD CONSTRAINT "GoalCheckIn_value_pos" CHECK ("value" > 0);
```

#### 20261113000500_community

```sql
-- ============================================================================
-- LIVING ECOSYSTEM 5/8: LIVE COMMUNITY (directive §4)
--
-- Post kinds, edits, last activity, staff highlights, accepted answers and
-- one level of replies; group topics, review status, join policy, roles,
-- bans and member counts; follows, blocks and saved posts; who resolved a
-- report.
--
-- Changes behaviour in one place: CommunityPost.groupId becomes ON DELETE
-- RESTRICT (was SET NULL), so deleting a group can never move its posts
-- into the main feed. Groups are archived instead. The archive list moves
-- from the "community.archived" SiteSetting to archivedAt/status; the
-- setting row is left in place (ignored) and removed by a later release.
-- Posts in the introductions category stay DISCUSSION: an author may
-- already have two, which the one-introduction index would refuse.
-- ============================================================================
```

**Generated DDL (from `prisma migrate diff`, split by `dm/mig/split.py`):**

- 8 new enum types: `CommunityPostKind`, `GroupTopic`, `GroupStatus`, `GroupJoinPolicy`, `GroupVisibility`, `GroupRole`, `GroupMemberStatus`, `GroupNotifyLevel`
- 3 new tables: `Follow`, `MemberBlock`, `SavedPost`
- `CommunityCategory`: `archivedAt`
- `CommunityGroup`: `archivedAt`, `city`, `country`, `courseId`, `coverImageUrl`, `createdById`, `isDemo`, `joinPolicy`, `memberCount`, `region`, `rejectionReason`, `reviewedAt`, `reviewedById`, `rules`, `status`, `topic`, `updatedAt`, `visibility`
- `GroupMembership`: `approvedAt`, `approvedById`, `banReason`, `bannedAt`, `bannedById`, `invitedById`, `notifyLevel`, `role`, `status`
- `CommunityPost`: `acceptedCommentId`, `editedAt`, `featuredAt`, `featuredById`, `kind`, `lastActivityAt`, `publicPreviewConsentAt`
- `CommunityComment`: `editedAt`, `parentId`
- `ContentReport`: `resolvedById`
- 14 indexes and 17 foreign keys
- drops and re-adds `CommunityPost_groupId_fkey` on `CommunityPost` with the new ON DELETE rule

```sql
-- ---- Backfills ----
UPDATE "CommunityPost" p SET "lastActivityAt" = GREATEST(p."createdAt", COALESCE(
  (SELECT MAX(c."createdAt") FROM "CommunityComment" c WHERE c."postId" = p."id" AND c."state" = 'VISIBLE'),
  p."createdAt"));
UPDATE "CommunityGroup" g SET "memberCount" = (SELECT COUNT(*) FROM "GroupMembership" m WHERE m."groupId" = g."id");
UPDATE "CommunityGroup" g SET "topic" = 'PROGRAMME', "courseId" = c."id"
FROM "Course" c
WHERE (g."slug", c."slug") IN (
  ('warrior-program', 'warrior'),
  ('business-mastery-program', 'business-mastery'),
  ('financial-planning-program', 'financial-planning-investment-advisory'),
  ('mindfulness-wellness-program', 'mindfulness-wellness'));
UPDATE "CommunityCategory" c SET "archivedAt" = CURRENT_TIMESTAMP
FROM "SiteSetting" s
WHERE s."key" = 'community.archived' AND c."archivedAt" IS NULL
  AND jsonb_typeof(s."value"->'categories') = 'array' AND (s."value"->'categories') ? c."id";
UPDATE "CommunityGroup" g SET "status" = 'ARCHIVED', "archivedAt" = CURRENT_TIMESTAMP
FROM "SiteSetting" s
WHERE s."key" = 'community.archived' AND g."archivedAt" IS NULL
  AND jsonb_typeof(s."value"->'groups') = 'array' AND (s."value"->'groups') ? g."id";

-- ---- Rules ----
CREATE UNIQUE INDEX "GroupMembership_owner_key" ON "GroupMembership" ("groupId") WHERE "role" = 'OWNER';
CREATE UNIQUE INDEX "CommunityPost_introduction_key" ON "CommunityPost" ("authorId") WHERE "kind" = 'INTRODUCTION' AND "state" <> 'REMOVED';
ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_member_count_nonneg" CHECK ("memberCount" >= 0);
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_not_self" CHECK ("followerId" <> "followingId");
ALTER TABLE "MemberBlock" ADD CONSTRAINT "MemberBlock_not_self" CHECK ("blockerId" <> "blockedId");
```

#### 20261113000600_opportunities

```sql
-- ============================================================================
-- LIVING ECOSYSTEM 6/8: OPPORTUNITY MARKETPLACE (directive §7)
--
-- Partners (organisations, PENDING -> VERIFIED review) and their members,
-- opportunities with honest compensation fields and skills, applications
-- with an append-only event log, saved opportunities, and a generated
-- full-text search column on Opportunity (never written by the client). One
-- HOUSE partner at most (created on first use by ensureHousePartner()). New
-- tables only.
-- ============================================================================
```

**Generated DDL (from `prisma migrate diff`, split by `dm/mig/split.py`):**

- 11 new enum types: `PartnerKind`, `PartnerStatus`, `PartnerVerificationMethod`, `PartnerMemberRole`, `OpportunityKind`, `WorkMode`, `CompensationType`, `OpportunityApplyMode`, `OpportunityStatus`, `OpportunityApplicationStatus`, `ApplicantContactField`
- 7 new tables: `Partner`, `PartnerMember`, `Opportunity`, `OpportunitySkill`, `OpportunityApplication`, `OpportunityApplicationEvent`, `SavedOpportunity`
- 16 indexes and 19 foreign keys

```sql
CREATE UNIQUE INDEX "Partner_house_key" ON "Partner" ("kind") WHERE "kind" = 'HOUSE';
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_compensation_range" CHECK (
  ("compMinCents" IS NULL OR "compMinCents" >= 0) AND ("compMaxCents" IS NULL OR "compMaxCents" >= 0)
  AND ("compMinCents" IS NULL OR "compMaxCents" IS NULL OR "compMaxCents" >= "compMinCents"));
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_commission_range" CHECK ("commissionBps" IS NULL OR "commissionBps" BETWEEN 0 AND 10000);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_openings_pos" CHECK ("openings" IS NULL OR "openings" > 0);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_thc_reward_pos" CHECK ("thcReward" IS NULL OR "thcReward" > 0);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_external_url" CHECK ("applyMode" <> 'EXTERNAL_URL' OR "externalApplyUrl" IS NOT NULL);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_min_age_range" CHECK ("minAge" IS NULL OR "minAge" BETWEEN 13 AND 100);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_dates" CHECK ("startsOn" IS NULL OR "endsOn" IS NULL OR "endsOn" >= "startsOn");
```

#### 20261113000700_editorial_guide

```sql
-- ============================================================================
-- LIVING ECOSYSTEM 7/8: EDITORIAL ENGINE AND GUIDE (directive §14, §15, §9, §17)
--
-- Post status workflow, kinds, bylines (an expert profile or a staff user),
-- categories, tags and revisions; consent and verification fields on
-- Testimonial; help articles (the FAQ moves here); the Guide's
-- conversations, messages and daily usage; generated full-text search
-- columns on Lesson, Post and HelpArticle (never written by the client).
--
-- Existing posts: no publishedAt -> DRAFT, publishedAt in the past ->
-- PUBLISHED, in the future -> SCHEDULED, so nothing changes on the site.
-- ============================================================================
```

**Generated DDL (from `prisma migrate diff`, split by `dm/mig/split.py`):**

- 9 new enum types: `PostKind`, `PostStatus`, `ConsentSource`, `HelpTopic`, `HelpAudience`, `GuideMode`, `GuideRole`, `GuideMessageKind`, `GuideFeedback`
- 8 new tables: `PostRevision`, `PostCategory`, `Tag`, `PostTag`, `HelpArticle`, `GuideConversation`, `GuideMessage`, `GuideUsage`
- `Lesson`: `searchVector`
- `Post`: `academyId`, `authorInstructorId`, `authorUserId`, `categoryId`, `courseId`, `coverAlt`, `createdById`, `eventId`, `featuredAt`, `featuredRank`, `founderApprovalNote`, `founderApprovedAt`, `isDemo`, `kind`, `notifiedAt`, `notifyOnPublish`, `readingMinutes`, `reviewNote`, `reviewedAt`, `reviewedById`, `searchVector`, `seoDescription`, `seoTitle`, `status`, `subjectConsentAt`, `subjectConsentNote`, `submittedAt`, `testimonialId`, `updatedById`
- `Testimonial`: `consentNote`, `consentSource`, `consentWithdrawnAt`, `contactMessageId`, `publishedAt`, `updatedAt`, `userId`, `verifiedAt`, `verifiedById`
- 19 indexes and 22 foreign keys

The generated search columns, as written into the file:

```sql
-- Lesson (ALTER TABLE ... ADD COLUMN)
"searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("contentMd", '')), 'C')
  ) STORED
-- Post (ALTER TABLE ... ADD COLUMN): title A, excerpt B, contentMd C
-- HelpArticle (CREATE TABLE): question A, answerMd B
-- Instructor (000300, ALTER TABLE): name A, headline B, bio C
-- Opportunity (000600, CREATE TABLE): title A, summary B, descriptionMd C
```

```sql
-- ---- Posts ----
UPDATE "Post" SET "status" = (CASE
  WHEN "publishedAt" IS NULL THEN 'DRAFT'
  WHEN "publishedAt" <= CURRENT_TIMESTAMP THEN 'PUBLISHED'
  ELSE 'SCHEDULED' END)::"PostStatus";
-- Each rule applies while a post is live or queued to go live.
ALTER TABLE "Post" ADD CONSTRAINT "Post_live_has_time" CHECK ("status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "publishedAt" IS NOT NULL);
ALTER TABLE "Post" ADD CONSTRAINT "Post_story_has_testimonial" CHECK ("kind" <> 'SUCCESS_STORY' OR "status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "testimonialId" IS NOT NULL);
ALTER TABLE "Post" ADD CONSTRAINT "Post_interview_has_consent" CHECK ("kind" <> 'INTERVIEW' OR "status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "subjectConsentAt" IS NOT NULL);
ALTER TABLE "Post" ADD CONSTRAINT "Post_founder_note_approved" CHECK ("kind" <> 'FOUNDER_NOTE' OR "status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "founderApprovedAt" IS NOT NULL);

-- ---- Guide ----
ALTER TABLE "GuideUsage" ADD CONSTRAINT "GuideUsage_counts_nonneg" CHECK ("questions" >= 0 AND "inputTokens" >= 0 AND "outputTokens" >= 0);
```

#### 20261113000800_live_event_overlap_guard

The whole file:

```sql
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
```

#### 20261113000900_challenge_evidence_move

Committed with DAILY-B, not with the other nine. The whole file:

```sql
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
```

### c.4 How the migrations were checked, and what the backfills produced

These are the results on the database with fixture data (see 0.4). The first draft ran on the 12-migration base. Rows marked **rerun** were checked again after the review, on the merged base, with the ten files.

| Check | Result |
|---|---|
| All files apply in order, each in one transaction | Yes. First draft: nine files, 140 tables. **Rerun:** the 15 base migrations, then the ten files; the drift check shows the tables match the 141 models |
| Drift between the migrated database and the schema | Only the five `searchVector ... DROP DEFAULT` lines, which is how Prisma reports a generated column. **Rerun:** the same five lines |
| Academy flagships | All four linked to their programmes |
| Course, challenge, group and category academies | All set. money → wealth, mind → wellness. introductions, wins, questions and feedback have no academy, as intended |
| Community posts | A post in a group took the group's academy. A post in the money category took wealth. `lastActivityAt` ignored a later hidden comment |
| XP events | Lesson and course events took the course's academy. An ADMIN_GRANT event stayed null |
| Academy memberships | A member with a dropped enrolment was not added to that academy. A member with two programmes joined both. All rows are BACKFILL with the earliest `enrolledAt`. **Rerun:** the same, with `notify` false |
| Missions | daily-check-in became DAILY. The three weekly missions became WEEKLY. The rest became ONCE. All are published. **Rerun:** a 72-hour cooldown mission became DAILY and kept its cooldown, which DAILY-A honours as a minimum gap |
| Mission occurrences | `once`, `2026-11-10` and a legacy key with no prefix were each kept correctly |
| Challenge evidence (000900; **rerun**: the same) | Three JSON submissions became three rows. APPROVED kept its reviewer and URL. A review by a deleted account kept its status, with the reviewer null. `progress` kept only `checkins` |
| `Order.paidAt` | THC order: the ledger time. Rupee order with two `order.paid` rows: the first. Manually settled order now FULFILLED: the settle time. Pending order: null |
| Rank awards | The member with a rank got one GRANDFATHERED award with `{"level": 1}` |
| Founder profile | `harsha` is ACTIVE, `{INSTRUCTOR}`, and `isFounder` |
| Blog posts | One DRAFT, one SCHEDULED, three PUBLISHED. Search vectors filled |
| Privacy clean-up | No `signupIp` and no `ipHash` left |
| Groups | Programme groups have topic PROGRAMME and their course. Member counts are right. The archived category is archived |
| New defaults and constraints (**rerun**) | `MentorProfile.bookingMode` INSTANT; `cancellationHours` and `ScheduledNotification.notAfter` nullable; `OpportunityApplication.sharedFields` an empty array; `OrderItem_registrationId_idx` a plain index. A 200-hour cancellation window and a 400-day hold were refused; NULL and in-range terms were accepted |

**Behaviour tests** (`dm/mig/behaviour.sql`):
- **Coalescing.** The notification statement in e.5 inserted a row with count 1. Repeating it updated the same row to count 2. Once the row was read, a new row was inserted.
- **Overlaps.**
  - Two back-to-back mentor events are allowed.
  - An overlapping SUBMITTED event is refused.
  - An overlapping CANCELLED event is allowed.
- **Refusals.** Each of these was refused as intended:
  - a one-to-one event with capacity 2
  - a listed event with no slug
  - a second ONE_TO_ONE event kind
  - an earning above its base amount
  - a second default revenue agreement for the same scope and version
  - a payout with no payee
  - a member following themselves
  - a second introduction post
  - a second group owner
  - deleting a group that has posts
  - publishing a success story without a testimonial
  - a resource with no owner
  - a second open contributor application of the same kind
  - a dispute resolved before it was opened
- **Search.** A search for "pillars" found the two right posts.
- **Restrict (rerun).** Deleting a user who has a `ContributorAccount` is refused by `ContributorAccount_userId_fkey`; once that row is gone the delete succeeds. The first draft cascaded here and removed the earnings with the account. The published privacy policy promises anonymisation, so account deletion anonymises a contributor instead and keeps the financial records (O36).

**The empty-database path.**
- First draft: all 21 migrations apply (12 existing, 9 draft). The four academies and the one-to-one event kind exist straight after the migrations.
- The current seeds then run without errors. With the current seeds, though, academies have no flagship and courses no academy, because the seeds create the courses after the migration has run. That is why section d.2 changes the seeds.

### c.5 Deploy notes

- **Build order.** Since `fix/seed-review` (merged through full-platform), `scripts/vercel-build.sh` migrates and seeds inside `migrate_and_seed()`, which runs under the deploy lock (`node scripts/with-db-lock.mjs bash scripts/vercel-build.sh --migrate-and-seed`). The function changes to:
  1. `pnpm db:migrate:sql`
  2. `pnpm db:seed:taxonomy`, on every production build
  3. the existing `SEED_ON_DEPLOY` block, unchanged, still for the first deploy only

  The taxonomy seed therefore runs under the same lock as the migrations, so two builds at once cannot both create the same row. Preview builds still never touch the database. `scripts/deploy-db.mjs` gets the same step straight after "apply migrations", and `DEPLOY_SEEDS` in `packages/core/test/throwaway-db.ts` starts with it (d.1).
- **Live production.** These migrations assume that no older build writes to the database after they have run. That is true for the first production deploy, because production has never run; the parent task "watch production deploy" is still open. If a production build goes live before these migrations ship, deploy them in a short maintenance window. Otherwise split three changes into a second migration that ships with the code that writes the new columns:
  - `MissionCompletion.occurrence` SET NOT NULL. An older build inserts completions without it.
  - The RESTRICT on `CommunityPost.groupId`. An older build may delete groups.
  - The `Post.status` backfill. Posts an older build publishes would stay DRAFT under the new reading rule.
- **000900 lands later.** It is committed with DAILY-B. Every database built before then, the stream databases and the lead's, applies it when DAILY-B merges. It only copies rows and removes a JSON key, so it is safe on a database where members made challenge submissions in the meantime.
- **Schema changes after P0.** A later change is a new migration file named after the last one. No file that has been applied anywhere is edited: `migrate-sql.ts` checksums each file, comments included, and refuses one whose checksum changed. Stream databases are recreated with `scripts/db/create-stream-db.mjs`.
- **`btree_gist`.** Neon lists it among its supported extensions. Confirm it on the production branch before the first deploy. If it is refused, leave 000800 out: the booking code's row lock on `MentorProfile` still prevents double booking.
- **Drift checks.** Any script that runs `prisma migrate diff --exit-code` between the migrations and the schema must ignore the five `ALTER COLUMN "searchVector" DROP DEFAULT` lines. The smallest change is to filter exactly those lines before deciding.
- **Session hashes.** Nulling `Session.ipHash` empties the history that `earn/affiliates.ts:540-545` compares when it looks for self-dealing. New sessions refill it within the window. Before launch this has no effect.
- **Rollback.** Every migration is additive apart from the two constraint changes in b.1. Code that predates them keeps working against the new schema. The exceptions are the three changes listed under "Live production" above.

## d. Seeds

There are three kinds of seed:
- **d.1** A new taxonomy seed. It is production-safe and runs on every production deploy.
- **d.2** Changes to the existing seeds. They run once, on the first deploy.
- **d.3** A demo seed for development only. It can never reach production.

### d.1 The taxonomy seed: `packages/db/src/seed-taxonomy.ts` (new)

**What it creates.** The taxonomy rows that code expects to exist: academies, mentor categories, event kinds, editorial categories, notification topics and skills. It holds no people, events, opportunities, partners, reviews, prices or revenue terms.

**Base.** The seed is written against the seeds as the `fix/seed-review` branch left them ("Seed review 2"). `build/full-platform` merged that branch at `dd5810e`, and the lead's merge of full-platform before P0a brings it in. It adds `SeedRecord` (`packages/db/src/seed-record.ts`), the deploy lock (`scripts/with-db-lock.mjs`) and the throwaway-database tests (`packages/core/test/throwaway-db.ts`).

**Rules.**
- **Create-only.** Every row is written as `upsert({ where: { <unique key> }, create: { ... }, update: {} })`. The seed never updates or deletes a row, so a row that staff renamed, deactivated or archived stays as staff left it.
- **Made once.** The seed records what it made, through `SeedRecord`, as the other seeds do since `fix/seed-review`.
  - Each kind has its own record: `seed.created.mentor-categories`, `seed.created.event-kinds`, `seed.created.post-categories`, `seed.created.notification-topics` and `seed.created.skills`.
  - Each row is made through `record.once(slug, make)`. A key on the record is never made again, so a row that staff deleted does not come back. A key that a later release adds is not on the record yet, so it is made.
  - Every key is its own group in `SeedRecord.load(kind, groups, existing)`. No older seed made these rows together. With one group per kind, the one-to-one event kind that migration 000300 inserts would count as proof that all thirteen kinds had been made, and the other twelve would never be created.
- **Rows the migrations insert.** The four academies and the one-to-one event kind are found by id (`academy_*`, `evk_one_to_one`) and are not on any record. Admin cannot delete them, and cannot change an academy's slug or pillar or the kind's mode.
- **Every production deploy.** The seed runs on every production build (departure 3 in 0.5), so a taxonomy row added in a later release reaches production with that release.
- **What admin offers.**
  - Deactivate (`active = false`) or Archive (`PostCategory.archivedAt`). Delete only for a row that nothing references; the foreign keys refuse it otherwise.
  - Slugs and topic keys cannot be edited, because code finds rows by them.
- **One source for the seed and the code.**
  - The rows come from `packages/config/src/ecosystem.ts` (e.12), which core imports too.
  - `packages/db` depends only on `@tycoonhood/config`, so this keeps the existing dependency direction.
  - The skills come from `packages/db/src/curriculum/skills.ts` (d.1.6).
- **Order.** Academies, mentor categories, event kinds, editorial categories, notification topics, then skills. Rows that belong to an academy look it up by slug.
- **Output.** One line per table, for example `skills: 0 created, 31 made before`.
- **Shape.** Like the other seeds, it uses the shared client from `./client` (as `SeedRecord` does) and runs as its own process.

**Scripts and deploy paths.**
- `packages/db/package.json`: `"seed:taxonomy": "dotenv -e ../../.env -- tsx src/seed-taxonomy.ts"`
- Root `package.json`: `"db:seed:taxonomy": "pnpm --filter @tycoonhood/db seed:taxonomy"`
- `scripts/vercel-build.sh`: `pnpm db:seed:taxonomy` inside `migrate_and_seed()`, straight after `pnpm db:migrate:sql` and outside the SEED_ON_DEPLOY block. It therefore runs under the deploy lock on every production build (c.5).
- `scripts/deploy-db.mjs`: a step `seed taxonomy`, running `pnpm --filter @tycoonhood/db exec tsx src/seed-taxonomy.ts`, straight after `apply migrations`.
- `packages/core/test/throwaway-db.ts`: `src/seed-taxonomy.ts` first in `DEPLOY_SEEDS`. `seed-rerun.test.ts` then covers the taxonomy tables in its re-run comparison.

**Tests** (`packages/core/test/seed-taxonomy.test.ts`, on the throwaway databases of `throwaway-db.ts`, running the seed as a process the way `seed-rerun.test.ts` runs the deploy seeds):
1. On an empty, migrated database the seed creates exactly the rows below, and each key is on its record.
2. A second run creates nothing and changes no row.
3. A staff edit survives a second run. For example, a renamed category or a deactivated event kind stays as staff left it.
4. A row that staff deleted is not made again. A key taken off its record, as if a later release had added it, is made.
5. `ACADEMY_SEED` equals the four rows that migration 000100 inserts. The test compares id, slug, pillar, name, shortName, tagline, description, focusAreas, accent, disclaimer and sortOrder.
6. The one-to-one row of `EVENT_KIND_SEED` equals the row that migration 000300 inserts.

#### d.1.1 Academies (4)

Each row matches the row that migration 000100 inserts. A row that already exists is left alone. All four are PUBLISHED.

| id | slug | pillar | name | shortName | accent | sortOrder | Flagship course (set by `seed.ts`, d.2) | disclaimer |
|---|---|---|---|---|---|---|---|---|
| `academy_warrior` | warrior | WARRIOR | Warrior Academy | Warrior | warrior | 1 | warrior | none |
| `academy_business` | business | BUILDER | Business Academy | Business | builder | 2 | business-mastery | none |
| `academy_wealth` | wealth | TYCOON | Wealth Academy | Wealth | tycoon | 3 | financial-planning-investment-advisory | "Educational content, not financial advice." |
| `academy_wellness` | wellness | MIND | Wellness Academy | Wellness | mind | 4 | mindfulness-wellness | "Educational content, not medical advice." |

| slug | tagline (the directive's focus line) | focusAreas |
|---|---|---|
| warrior | Physical discipline, mental resilience, fitness, habits and self-mastery. | Physical discipline; Mental resilience; Fitness; Habits; Self-mastery |
| business | Entrepreneurship, business strategy, marketing, sales, leadership and execution. | Entrepreneurship; Business strategy; Marketing; Sales; Leadership; Execution |
| wealth | Financial literacy, investment education, budgeting, wealth creation and financial planning. | Financial literacy; Investment education; Budgeting; Wealth creation; Financial planning |
| wellness | Mindfulness, meditation, emotional awareness, sleep and sustainable wellness. | Mindfulness; Meditation; Emotional awareness; Sleep; Sustainable wellness |

`description` is "Courses, challenges and discussions on " followed by the tagline with its first letter in lower case, for example "Courses, challenges and discussions on physical discipline, mental resilience, fitness, habits and self-mastery."

The disclaimers reuse the wording the site already uses.

#### d.1.2 Mentor categories (10)

These are the directive's §2 names, in the directive's order. `description` is null.

| sortOrder | slug | name | academy | disclaimer | paidAllowed |
|---|---|---|---|---|---|
| 1 | business | Business Mentors | business | none | true |
| 2 | entrepreneurship | Entrepreneurship Mentors | business | none | true |
| 3 | marketing | Marketing Mentors | business | none | true |
| 4 | sales | Sales Mentors | business | none | true |
| 5 | financial-literacy | Financial Literacy Educators | wealth | "Educational content, not financial advice." | **false** |
| 6 | fitness | Fitness Coaches | warrior | "Educational content, not medical advice." | true |
| 7 | discipline-performance | Discipline and Performance Coaches | warrior | "Educational content, not medical advice." | true |
| 8 | mindfulness | Mindfulness Mentors | wellness | "Educational content, not medical advice." | true |
| 9 | career-development | Career Development Mentors | business | none | true |
| 10 | technology-ai | Technology and AI Mentors | business | none | true |

- **Disclaimers.** They reuse the Wealth and Wellness academies' wording (d.1.1), which the site already uses. Every offering, booking page and event in a category with a disclaimer shows it, and a member acknowledges it before registering (`EventRegistration.disclaimerAckAt`; the registration is refused without it).
- **Paid offerings in financial literacy.** `paidAllowed` is false for `financial-literacy` until the owner confirms the regulatory position (owner decision O39). While it is false, an offering or event in that category can only be free, and `MentorOffering` and `LiveEvent` saves refuse a price. Paid mentoring that could be read as investment advice may need SEBI registration; the default keeps the platform out of that until someone qualified says otherwise.
- **Create-only, as everything here.** A later change of mind is made in `/admin/mentors` (category settings), not by the seed.

#### d.1.3 Event kinds (13)

| sortOrder | slug | name | mode | academy |
|---|---|---|---|---|
| 0 | one-to-one | One-to-one session | ONE_TO_ONE | none. Id `evk_one_to_one`; migration 000300 already inserts it, so the seed finds it and changes nothing |
| 1 | group-mentoring | Group mentoring | GROUP | none |
| 2 | workshop | Workshop | GROUP | none |
| 3 | masterclass | Masterclass | GROUP | none |
| 4 | live-class | Live class | GROUP | none |
| 5 | group-learning | Group learning session | GROUP | none |
| 6 | business-discussion | Business discussion | GROUP | business |
| 7 | fitness-session | Fitness session | GROUP | warrior |
| 8 | wellness-session | Wellness session | GROUP | wellness |
| 9 | guest-lecture | Guest lecture | GROUP | none |
| 10 | ama | Ask me anything | GROUP | none |
| 11 | community-meetup | Community meetup | GROUP | none |
| 12 | founder-session | Founder session | GROUP | none |

How the directive's §6 list maps onto these kinds:

| Directive item | Where it lives |
|---|---|
| Upcoming workshops | `workshop` |
| Mentor sessions | `one-to-one` and `group-mentoring` |
| Group learning events | `group-learning` |
| Business discussions | `business-discussion` |
| Fitness challenges | `fitness-session` for the live session. The challenge itself is a `Challenge` row |
| Wellness sessions | `wellness-session` |
| Guest lectures | `guest-lecture` |
| Community meetups | `community-meetup` |
| Online events | Not a kind: `LiveEvent.format = ONLINE` |

`masterclass`, `live-class`, `ama` and `founder-session` come from LEAD #4.

#### d.1.4 Editorial categories (8)

| sortOrder | slug | name |
|---|---|---|
| 1 | discipline-fitness | Discipline and fitness |
| 2 | business | Business and entrepreneurship |
| 3 | marketing-sales | Marketing and sales |
| 4 | money | Money and financial literacy |
| 5 | wellness | Mindfulness and wellness |
| 6 | careers-skills | Careers and skills |
| 7 | technology-ai | Technology and AI |
| 8 | community | Community and Tycoonhood news |

#### d.1.5 Notification topics (42)

- **What the seed writes.** One `NotificationTopic` row per entry of `NOTIFICATION_TOPICS`, with `key`, `label`, `description`, `defaultInApp`, `defaultEmail` and `defaultPush` from the catalogue, and `active = true`. The full list is in e.5.
- **What stays in code.** The catalogue decides which topics exist, which channels are locked and which topics are essential. The rows only let staff relabel a topic, change its defaults or silence it.
- **Missing rows.** A topic with no row uses the catalogue's values, so code never depends on the seed having run.

#### d.1.6 Skills (31)

- **Where they come from.** There is one skill per teaching module of the four programmes. These are the 32 modules with sortOrder 0 to 7; the "Final Assessment" module gets none. The name is the module title in sentence case, and the slug is the title in kebab case. Deriving the skills from the existing curriculum avoids inventing a catalogue.
- **One merged pair.** "Recovery and Sleep" (Warrior) and "Sleep and Recovery" (Wellness) teach one skill. It becomes `sleep-and-recovery`, with no academy, linked to both modules. So 32 modules give 31 skills.
- **Owner review.** The list is a starter catalogue, flagged for owner review (open question 23).
- **Where they live.** `packages/db/src/curriculum/skills.ts` exports `SKILL_SEED`, the rows below, and `MODULE_SKILLS: Record<CourseSlug, readonly [string, string, string, string, string, string, string, string]>`, the skill slug of each teaching module by sortOrder.
- **sortOrder.** Warrior skills take 0 to 7, Business 10 to 17, Wealth 20 to 27 and Wellness 30 to 37: the module's sortOrder plus 10 for each academy before it. The merged skill takes 4.

| sortOrder | slug | name | academy | Module (course: sortOrder) |
|---|---|---|---|---|
| 0 | discipline-and-consistency | Discipline and consistency | warrior | warrior: 0 |
| 1 | physical-conditioning | Physical conditioning | warrior | warrior: 1 |
| 2 | strength-and-fitness-foundations | Strength and fitness foundations | warrior | warrior: 2 |
| 3 | nutrition-fundamentals | Nutrition fundamentals | warrior | warrior: 3 |
| 4 | sleep-and-recovery | Sleep and recovery | none | warrior: 4; mindfulness-wellness: 5 |
| 5 | mental-resilience | Mental resilience | warrior | warrior: 5 |
| 6 | habit-formation | Habit formation | warrior | warrior: 6 |
| 7 | personal-accountability | Personal accountability | warrior | warrior: 7 |
| 10 | entrepreneurial-thinking-and-finding-opportunities | Entrepreneurial thinking and finding opportunities | business | business-mastery: 0 |
| 11 | market-research | Market research | business | business-mastery: 1 |
| 12 | business-models-and-unit-economics | Business models and unit economics | business | business-mastery: 2 |
| 13 | branding-and-positioning | Branding and positioning | business | business-mastery: 3 |
| 14 | marketing-and-sales | Marketing and sales | business | business-mastery: 4 |
| 15 | digital-business-and-operations | Digital business and operations | business | business-mastery: 5 |
| 16 | financial-management-for-founders | Financial management for founders | business | business-mastery: 6 |
| 17 | team-leadership-scaling-and-strategy | Team, leadership, scaling and strategy | business | business-mastery: 7 |
| 20 | personal-finance-foundations | Personal finance foundations | wealth | financial-planning-investment-advisory: 0 |
| 21 | budgeting-and-saving | Budgeting and saving | wealth | financial-planning-investment-advisory: 1 |
| 22 | debt-management | Debt management | wealth | financial-planning-investment-advisory: 2 |
| 23 | emergency-funds-and-protection | Emergency funds and protection | wealth | financial-planning-investment-advisory: 3 |
| 24 | compounding-and-the-time-value-of-money | Compounding and the time value of money | wealth | financial-planning-investment-advisory: 4 |
| 25 | investment-fundamentals | Investment fundamentals | wealth | financial-planning-investment-advisory: 5 |
| 26 | risk-diversification-and-stock-market-basics | Risk, diversification and stock market basics | wealth | financial-planning-investment-advisory: 6 |
| 27 | long-term-planning-and-financial-decision-making | Long-term planning and financial decision-making | wealth | financial-planning-investment-advisory: 7 |
| 30 | mindfulness-foundations | Mindfulness foundations | wellness | mindfulness-wellness: 0 |
| 31 | meditation | Meditation | wellness | mindfulness-wellness: 1 |
| 32 | breath-awareness | Breath awareness | wellness | mindfulness-wellness: 2 |
| 33 | emotional-awareness | Emotional awareness | wellness | mindfulness-wellness: 3 |
| 34 | stress-management | Stress management | wellness | mindfulness-wellness: 4 |
| 36 | daily-routines-and-personal-reflection | Daily routines and personal reflection | wellness | mindfulness-wellness: 6 |
| 37 | sustainable-wellness-habits | Sustainable wellness habits | wellness | mindfulness-wellness: 7 |

**Module links.**
- **Who writes them.** The taxonomy seed does not write `ModuleSkill` rows. `seed-academy.ts` writes them in the transaction that builds a programme (d.2), through `linkModuleSkills(tx, courseSlug)` in `curriculum/skills.ts`. A forced rebuild (`SEED_ACADEMY_FORCE=1`) deletes and recreates the modules, so the links follow the modules.
- **Links staff removed.** Since `fix/seed-review`, seed-academy builds each programme once (SiteSetting `seed.academy.built`). `linkModuleSkills` never runs for a programme already built, so a link that staff removed is never put back.
- **Missing skills.** `linkModuleSkills` links to skills that exist and never makes one. The taxonomy seed runs before seed-academy on every path that runs both: `vercel-build.sh`, `deploy-db.mjs` and `DEPLOY_SEEDS`. A skill that is missing, because staff deleted it or the taxonomy seed has not run, is skipped with a warning, and its module gets no link.
- **Databases built earlier.** A programme built before this change gets no links from the seed. Production has never been deployed, so only development databases are affected. Staff can add the links in `/admin/skills`.

**Not seeded, on purpose.**
- **Revenue terms.** `RevenueShareAgreement` rows are the owner's to set (LEAD #15). Until a row exists, paid offerings cannot be published.
- **The HOUSE partner.** It needs a real contact email and about text, which are not in the repository. `ensureHousePartner(actor, input)` in the opportunities service creates it the first time staff post a house opportunity. It is created VERIFIED, with `verificationMethod = HOUSE`, and the partial unique index `Partner_house_key` allows only one.
- **Starter missions and challenges.** DAILY's "Import starter library (drafts)" admin action creates them as drafts (workstreams N2). Nothing goes live until staff publish it.
- **Real people and content.** Mentors, instructors other than the founder row, events, opportunities, partners, testimonials and success stories are never seeded.

### d.2 Changes to the existing seeds

**Scope.**
- These seeds run in the SEED_ON_DEPLOY block, on the first deploy. On a fresh database the migrations run first, while the course, category and group tables are still empty, so their backfills find nothing to change. The seeds must therefore set each new value themselves when they create a row.
- **The base is `fix/seed-review`**, merged through full-platform. That branch rewrote these seeds. Missions, essays, categories, groups and weekly missions are made through `SeedRecord` with `update: {}`, and seed-academy builds each programme once, in one transaction. The changes below go into the create data of those versions.
- **Create data only.** One upsert there still has an update branch: `seed-content.ts` challenges pass `update: copy`, the copy only the seed owns. The new challenge fields go into `create` only. In `copy` they would overwrite what staff set on every re-run.

**Academy lookups.** The seeds look an academy up by `pillar` (or by slug), never by a hard-coded id. A small helper in `packages/db/src/academy-ids.ts` reads the four rows once: `academyIdByPillar(db): Promise<Record<Pillar, string>>`. The rows always exist, because migration 000100 inserts them before any seed runs.

| File | Change |
|---|---|
| `packages/db/src/seed.ts` | **Courses** (the four shells it creates as DRAFT): `academyId` = the academy of the course's pillar. Straight after each course upsert, the academy whose `ACADEMY_SEED.flagshipCourseSlug` is this course gets it as flagship, only where none is set: `academy.updateMany({ where: { slug, flagshipCourseId: null }, data: { flagshipCourseId: course.id } })`. **Missions**: `daily-check-in` gets `cadence: "DAILY"`; `first-lesson` and `complete-onboarding` get `cadence: "ONCE"`; all three get `publishedAt: new Date()` |
| `packages/db/src/seed-academy.ts` | **The founder's `Instructor` row**, in the create data (`FOUNDER`) only: `isFounder: true`, `contributorKinds: ["INSTRUCTOR"]`, `status: "ACTIVE"`. The upsert keeps `update: {}`. **Skills**: in the transaction that builds a programme, after `buildCurriculum`, it calls `linkModuleSkills(tx, slug)` (d.1.6). `academyInstructorDecision` and `academyRebuildDecision` do not change |
| `packages/db/src/seed-content.ts` | **Challenges**: `academyId` from the pillar. `kind` from `criteria.event`: 30-days-of-iron DAILY_CHECKIN, launch-week GATED_SUBMISSIONS, the-one-percent-ledger SUBMISSION. `publishedAt: new Date()` for the two UPCOMING challenges and null for the DRAFT one. `scope` keeps its default, HOUSE. **Blog posts**: `kind: "ARTICLE"`. `status` is PUBLISHED when `publishedAt` is in the past, SCHEDULED when it is in the future, and DRAFT when it is null; the three current posts are PUBLISHED. **Help articles**: see below |
| `packages/db/src/seed-community.ts` | **Categories**: `academyId` warrior → warrior, business → business, money → wealth, mind → wellness. introductions, wins, questions and feedback stay null. **Groups**: `academyId` from the pillar; `topic: "PROGRAMME"`; `courseId` warrior-program → warrior, business-mastery-program → business-mastery, financial-planning-program → financial-planning-investment-advisory, mindfulness-wellness-program → mindfulness-wellness. `memberCount` starts at 0. **Weekly missions** (weekly-five-lessons, weekly-standard-five-days, weekly-quiz-pass): `cadence: "WEEKLY"`, `publishedAt: new Date()` |

**Help articles (19 rows, from the current FAQ).**
- **Where the text goes.** The questions and answers in `apps/web/app/(public)/faq/page.tsx` move, word for word, into `packages/db/src/content/help.ts` as `HELP_SEED`. Each `<Link href="/x">text</Link>` is written as `[text](/x)` and each `<strong>` as `**`. `seed-content.ts` creates the rows create-only, through a `SeedRecord` of kind `help-articles` with one group, as it does for essays.
- **Field values.**
  - `slug` is the question in kebab case, for example `what-is-tycoonhood` and `what-does-test-mode-mean-at-checkout`.
  - `sortOrder` is 100 × the group's position plus 10 × the question's position, both counted from 0.
  - `audience` is PUBLIC and `published` is true.
- **The page.** `/faq` then reads the rows (EDIT stream), grouped by topic, with the group names below as topic labels.

| FAQ group | `HelpTopic` | Questions |
|---|---|---|
| The basics | GETTING_STARTED | 4 |
| Learning and certificates | LEARNING | 4 |
| Earning | EARN | 3 |
| Shop and payments | SHOP | 3 |
| THC | THC | 2 |
| Community and your data | COMMUNITY | 3 |

**Test.** A new case in `packages/core/test/seed-rerun.test.ts` (or the migration rehearsal of workstreams P0a, `scripts/db/rehearse-migrations.mjs`, which can share it) does this on a throwaway database:
1. It applies every migration (`migrate`).
2. It runs `DEPLOY_SEEDS`, which now starts with the taxonomy seed, in build order.
3. It checks the results:
   - four academies, each with its flagship;
   - an academy on every course and challenge;
   - the four programme groups with topic PROGRAMME and their course;
   - the category mapping above;
   - the mission cadences, the challenge kinds and the post statuses;
   - 19 help articles;
   - 32 `ModuleSkill` rows;
   - 31 skills, 10 mentor categories (with the disclaimers and `paidAllowed` above), 13 event kinds, 8 editorial categories and 42 topics.
4. It runs the taxonomy seed a second time and checks that it creates nothing.

The empty-database run in c.4 showed that the current seeds leave academies without a flagship and courses without an academy; this test catches that.

### d.3 The demo seed (development only)

**Files.**
- The runner is `packages/db/src/seed-demo/index.ts` (lead-owned).
- One file per domain, owned by the stream that owns the domain (workstreams 1.5):

| File | Stream |
|---|---|
| `mentors.ts` | MENTOR |
| `offerings.ts` | BOOK |
| `events.ts` | LIVE |
| `posts.ts` | EDIT |
| `community.ts` | SOCIAL |
| `groups.ts` | GROUPS |
| `partners.ts`, `opportunities.ts` | OPPS |
| `projects.ts` | SKILLS |

Each domain file exports one object:

```ts
// packages/db/src/seed-demo/types.ts
export type DemoContext = { now: Date; users: { mentors: string[]; members: string[]; partners: string[] } };
export type DemoDomain = {
  name: string;
  /** Domains whose rows this one points at, e.g. offerings depends on mentors. */
  dependsOn: readonly string[];
  /** Creates this domain's demo rows and returns how many. Every row has isDemo = true. */
  seed(db: PrismaClient, ctx: DemoContext): Promise<number>;
  /** Deletes this domain's demo rows (isDemo = true only) and returns how many. */
  remove(db: PrismaClient): Promise<number>;
};
```

**Scripts.**
- `packages/db/package.json`: `"seed:demo": "dotenv -e ../../.env -- tsx src/seed-demo/index.ts"`
- Root `package.json`: `"db:seed:demo": "pnpm --filter @tycoonhood/db seed:demo"`
- Run it as `pnpm db:seed:demo --confirm-demo`. Remove the data again with `pnpm db:seed:demo --confirm-demo --remove`.

**The guard (workstreams D1).**
- The runner's first statement is `assertDemoSeedAllowed(process.env, process.argv)`, from `packages/config/src/demo.ts` (e.12).
- It throws `DemoSeedRefused`, with the reason, when any of these holds:
  1. `NODE_ENV` is `production`.
  2. `VERCEL` or `VERCEL_ENV` is set.
  3. `isDevMode()` is false.
  4. The host in `DATABASE_URL` is not local. Local means `localhost`, `127.0.0.1`, `::1`, or a Unix socket given as `?host=/path`.
  5. The database name does not end in `_dev`, `_test` or `_e2e`. `.env.example` already suggests `tycoonhood_dev`; a database with any other name is refused.
  6. `--confirm-demo` is not among the arguments.
- **Tests** (`packages/core/test/demo-guard.test.ts`): one per refusal, and one case that is allowed.

**What every demo row carries.**
- `isDemo = true`.
- A name that ends in " (Demo)" and is plainly not a real person or business, for example "Mentor A (Demo)", "Partner B (Demo)" or "Workshop C (Demo)".
- **Demo accounts.**
  - Email: `demo-<role>-<n>@example.test`. The `.test` domain never delivers.
  - No password, so a demo account cannot sign in.
  - `excludeFromMetrics = true`.
  - Journeys that need a signed-in mentor use the harness's fixture accounts.

**Never in demo data.**
- real people, real companies or real qualifications
- earnings, payouts or revenue terms
- testimonials or success stories
- online counts or scarcity claims

Feedback and ratings may exist, so the rating display can be exercised; they are demo rows themselves.

**Removal.** `--remove` deletes every demo row, domain by domain, in reverse dependency order, and then the demo accounts.

**Production.**
- The seed is never added to `scripts/vercel-build.sh`, or to any CI step that has production settings.
- `demoVisible()` is false whenever `VERCEL_ENV` is `production`, so a stray demo row is never shown there (e.3).
- The `/admin` overview shows "Demo data present: N rows" whenever any demo row exists.

## e. Foundation contracts

These are the shared pieces that every stream builds on. The lead owns `permissions.ts`, `guard.ts`, `admin-nav.ts`, `audit.ts` and `notify.ts`; the other files below are new and also belong to Phase 0. Each entry gives the path, the exact signature and the rule it enforces.

Notation used in the signatures:

```ts
import type { Prisma, PrismaClient } from "@tycoonhood/db";
type Db = PrismaClient | Prisma.TransactionClient; // every `db?: Db` defaults to the shared client
```

### e.1 Permissions and grants

**`packages/core/src/auth/permissions.ts`** (changed). The existing 13 permissions stay. Nine staff permissions and four member capabilities are added, 26 in all.

```ts
export type Permission =
  // existing (13)
  | "admin.access" | "admin.users" | "admin.economy" | "admin.commerce" | "admin.earn"
  | "admin.content" | "admin.analytics" | "admin.audit"
  | "courses.author" | "courses.manage" | "courses.publish"
  | "community.moderate" | "community.announce"
  // staff areas (9)
  | "academies.manage"     // academies, learning paths, the skill catalogue
  | "contributors.review"  // contributor applications, credentials, identity and photo checks
  | "mentors.manage"       // mentor profiles, mentor categories, offerings, bookings
  | "events.manage"        // every live event, event kinds, series, registrations, attendance disputes
  | "opportunities.manage" // partners, opportunities, applications
  | "content.write"        // write editorial posts and send them for review
  | "content.publish"      // approve, schedule, publish and archive editorial posts
  | "progression.verify"   // verify member skills and projects
  | "guide.review"         // read Guide conversations that a member flagged
  // member capabilities, reached through grants (4)
  | "studio.access"        // open /studio
  | "mentoring.host"       // keep a mentor profile, offerings and availability
  | "events.host"          // propose and host live events
  | "opportunities.post";  // post opportunities for a partner the member belongs to
```

| Role | Permissions |
|---|---|
| MEMBER, STUDENT, CREATOR | none (unchanged) |
| INSTRUCTOR | admin.access, courses.author, studio.access, events.host, content.write |
| MODERATOR | admin.access, community.moderate, community.announce, events.host |
| ADMIN | all 26 |

**Grants.** A grant is a capability that a member holds because of rows they already have, not because of their role (LEAD #14; departure 5).

```ts
export type Grant = "mentor" | "contributor" | "partner";

export const GRANT_TABLE: Record<Grant, readonly Permission[]> = {
  mentor: ["studio.access", "mentoring.host", "events.host", "content.write"],
  contributor: ["studio.access", "courses.author", "events.host", "content.write"],
  partner: ["opportunities.post"],
};
/** Held only by an approved mentor: the mentor grant, and MentorProfile ACTIVE with approvedAt set. */
export const APPROVED_MENTOR_PERMISSIONS: readonly Permission[] = ["progression.verify"];

export type HasRole = { role: UserRole; grants?: readonly Grant[]; mentorApproved?: boolean } | null | undefined;

/** Who is acting. Built from the session (getCurrentUser) or by actorFor() in scripts. */
export type Actor = {
  id: string;
  role: UserRole;
  grants?: readonly Grant[];
  mentorApproved?: boolean;
  instructorId?: string | null;
  mentorId?: string | null;
  partnerIds?: readonly string[];
};

/** The role table first, then each grant's list, then APPROVED_MENTOR_PERMISSIONS when mentorApproved. */
export function can(user: HasRole, permission: Permission): boolean;
export function hasGrant(user: HasRole, grant: Grant): boolean;
/** Every permission the user holds, role and grants together, for the admin overview and tests. */
export function permissionsOf(user: HasRole): Permission[];
```

- `assertCan`, `isStaff`, `promoteTo` and `ForbiddenError` do not change.
- `isAdmin` stays until `community/community.ts` (lines 148, 543-544, 554, 558, 583 and 603) asks `can(viewer, "admin.users")` instead. Then it is removed.
- `ROLE_LABEL.CREATOR` changes from "Creator / Affiliate" to "Affiliate" (workstreams D3; open question 5). A contributor is not a CREATOR. Approving a contributor or mentor application never changes `User.role`; a test checks this.
- `courses.author` held through the contributor grant is scoped exactly as DR-34 scopes it for INSTRUCTOR: `authoring.assertCanEditCourse` allows only courses whose `Instructor.userId` is the actor.

**`packages/core/src/auth/grants.ts`** (new):

```ts
export const GRANT_INCLUDE = {
  instructorProfile: {
    select: { id: true, status: true, contributorKinds: true, mentorProfile: { select: { id: true, status: true, approvedAt: true } } },
  },
  partnerMemberships: { select: { partnerId: true, role: true, partner: { select: { status: true } } } },
} satisfies Prisma.UserInclude;

export type ActorGrants = { grants: Grant[]; mentorApproved: boolean; instructorId: string | null; mentorId: string | null; partnerIds: string[] };

export function grantsFromUserRow(
  row: { suspendedAt: Date | null } & Prisma.UserGetPayload<{ include: typeof GRANT_INCLUDE }>
): ActorGrants;

/** For crons, scripts and tests: the same Actor that a request would see. Null for an unknown user. */
export async function actorFor(userId: string, db?: Db): Promise<(Actor & ActorGrants) | null>;
```

| Grant | Held when |
|---|---|
| `mentor` | `Instructor.status` is ACTIVE, `contributorKinds` contains MENTOR, and `MentorProfile.status` is DRAFT, ACTIVE or PAUSED |
| `contributor` | `Instructor.status` is ACTIVE and `contributorKinds` contains INSTRUCTOR or CREATOR |
| `partner` | the member has a `PartnerMember` row on a VERIFIED `Partner`. `partnerIds` lists those partners |

- A suspended user (`suspendedAt` set) holds no grants.
- `instructorId` is the linked `Instructor.id` while that profile is ACTIVE. `mentorId` is set only while the mentor grant holds.
- `mentorApproved` is true only while the mentor grant holds, `MentorProfile.status` is ACTIVE and `approvedAt` is set. A DRAFT or PAUSED mentor can prepare a profile and host, but cannot verify anyone's skills or projects.
- `ContributorAccount.status` governs payouts only. A suspended contributor account does not remove a grant.
- **Request path.** `sessions.resolve` (`auth/session.ts`) adds `GRANT_INCLUDE` to its `user` include, in the same query. `getCurrentUser()` (`apps/web/lib/auth.ts`) returns the user row merged with `grantsFromUserRow(user)`, so every existing `can(user, ...)` call sees grants without other changes.

**Replacing the remaining ADMIN-only checks.** These places still check for the ADMIN role instead of a permission. Each moves to the permission that matches its work:

| Where | Today | Becomes |
|---|---|---|
| `admin/actions.ts` `grantThcAction`, `grantXpAction`, `reverseTxAction` | local `requireAdmin()` | `actorWith("admin.economy")` |
| `admin/actions.ts` `setChallengeLifecycleAction`, `reviewSubmissionAction` | local `requireAdmin()` | `actorWith("admin.economy")` |
| `admin/actions.ts` `setCourseCoverAction` | local `requireAdmin()` | `actorWithAny("courses.author", "courses.manage")`, then `authoring.assertCanEditCourse(actor, courseId)` |
| `admin/actions.ts` `savePostAction` | local `requireAdmin()` | `actorWith("content.write")`, plus `content.publish` when the save publishes or schedules |
| `admin/actions.ts` `shipOrderAction` | local `requireAdmin()` | `actorWith("admin.commerce")` |
| `admin/missions/actions.ts` (2 actions) | local `requireAdmin()` | `actorWith("admin.economy")` |
| `admin/videos/actions.ts` (2 actions), `admin/videos/page.tsx`, `admin/economy/page.tsx`, `admin/missions/page.tsx`, `admin/challenges/page.tsx` | `requireAdmin()` | `requirePermission("admin.economy")` or `actorWith("admin.economy")` |
| `admin/content/page.tsx`, `admin/content/post/[postId]/page.tsx` | `requireAdmin()` | `requirePermission("content.write")` |
| `admin/standard/page.tsx`, `admin/standard/actions.ts` | `requireAdmin()`, and a `role !== "ADMIN"` test | `requirePermission("admin.content")` and `actorWith("admin.content")` |

After this, `requireAdmin` in `apps/web/lib/guard.ts` and the two local copies are deleted. `toggleCoursePublishAction` and `settlePendingFiatAction` already use `actorWith`.

### e.2 Guards and ownership

**`apps/web/lib/guard.ts`** (changed). Two functions are added; the existing ones stay.

```ts
/** Page gate: signed in, onboarded, and holding this grant. Otherwise redirect("/today"). Staff work in /admin instead. */
export async function requireGrant(grant: Grant): Promise<CurrentUser>;
/** Server-action gate: throws like actorWith instead of redirecting. */
export async function actorWithGrant(grant: Grant): Promise<CurrentUser>;
```

`CurrentUser` is the return type of `getCurrentUser()` without null. `/studio` pages call `requirePermission("studio.access")`; actions that change one row also call the scope check for that row.

**Scope checks** (core; each throws `ForbiddenError`):

```ts
// packages/core/src/live/access.ts
/** events.manage, or the actor is a LiveEventHost of the event (by userId, or by the actor's instructorId). */
export async function assertHostsEvent(actor: Actor, eventId: string, db?: Db): Promise<void>;

// packages/core/src/mentors/access.ts
/** mentors.manage, or mentorId is the actor's own mentor profile. */
export async function assertOwnsMentorProfile(actor: Actor, mentorId: string, db?: Db): Promise<void>;

// packages/core/src/opportunities/access.ts
/** opportunities.manage, or the actor's PartnerMember role on this VERIFIED partner is at least minRole (OWNER > EDITOR). */
export async function assertPartnerMember(actor: Actor, partnerId: string, minRole?: PartnerMemberRole, db?: Db): Promise<void>;

// packages/core/src/progression/access.ts
export async function assertCanVerify(
  actor: Actor,
  target: { userId: string; skillId?: string; projectId?: string },
  db?: Db
): Promise<void>;
```

`assertCanVerify` rules:
- Nobody verifies their own skill or project, staff included.
- `progression.verify` from the role table (ADMIN) passes for every academy.
- With `mentorApproved` (e.1), and only then, the skill's academy (or the project's academy) must be the academy of one of the mentor's categories (`MentorCategoryLink` to `MentorCategory.academyId`). A skill with no academy, such as `sleep-and-recovery`, is open to any mentor.
- A mentor's verification records `verifiedVia = MENTOR_ASSESSMENT` and must cite evidence in `MemberSkill.evidence`: a project, an evidence submission, or a mentoring event the member attended.

**Group roles** (`packages/core/src/community/group-roles.ts`, new):

```ts
export type GroupAction =
  | "post" | "announce" | "moderate" | "invite" | "approve" | "edit" | "archive" | "createEvent" | "createChallenge";
export const GROUP_ROLE_TABLE: Record<GroupRole, readonly GroupAction[]> = {
  OWNER: ["post", "announce", "moderate", "invite", "approve", "edit", "archive", "createEvent", "createChallenge"],
  MODERATOR: ["post", "announce", "moderate", "invite", "createEvent", "createChallenge"],
  MEMBER: ["post"],
};
/** False for a missing or non-ACTIVE membership, and for a group that is archived or not ACTIVE. */
export function groupCan(
  member: Pick<GroupMembership, "role" | "status"> | null,
  group: Pick<CommunityGroup, "status" | "archivedAt">,
  action: GroupAction
): boolean;
```

Staff with `community.moderate` act on any group through the community services, not through `groupCan`. `createEvent` and `createChallenge` let a group's owner and moderators create a group-only meetup (LIVE-A: visibility GROUP, published to the group without staff review; anything wider is SUBMITTED for `events.manage`) or a group challenge (DAILY-B: scope GROUP, with no THC reward and XP within the engagement limits). GROUPS calls them through those services.

**DR-34 is reused, not replaced.** `authoring.canEditCourse`, `authoring.assertCanEditCourse`, `editableCoursesWhere`, `liveCourseBlock` and `authoring.linkInstructorUser` stay as they are. Their actor types (`Editor`, `AuthoringActor` = `{ id, role }`) gain `grants?: readonly Grant[]`, so the contributor grant's `courses.author` reaches the existing `mayEdit` check.

### e.3 Authenticity

**`packages/core/src/platform/authenticity.ts`** (new). Every public page and every count shown to members reads through these helpers, so no demo row, unverified expert or unconfirmed claim reaches a visitor.

```ts
export { demoVisible } from "@tycoonhood/config"; // e.12

/** {} where demo rows may show; { isDemo: false } elsewhere. Always { isDemo: false } when VERCEL_ENV is production. */
export function realWhere(): { isDemo?: false };

export const publicWhere: {
  instructor(): Prisma.InstructorWhereInput;                        // status ACTIVE
  mentor(): Prisma.MentorProfileWhereInput;                         // status ACTIVE, approvedAt set, its Instructor passes instructor()
  liveEvent(opts?: { now?: Date; signedIn?: boolean }): Prisma.LiveEventWhereInput;
                                                                    // SCHEDULED or COMPLETED, publishedAt set, PUBLIC (and MEMBERS when signed in)
  opportunity(now?: Date): Prisma.OpportunityWhereInput;            // OPEN, publishedAt set, applyBy null or >= now, partner VERIFIED
  partner(): Prisma.PartnerWhereInput;                              // VERIFIED
  project(now?: Date): Prisma.ProjectWhereInput;                    // PUBLIC, publishedAt <= now, state VISIBLE, owner not suspended
  group(): Prisma.CommunityGroupWhereInput;                         // ACTIVE, archivedAt null, visibility MEMBERS
  feedback(now?: Date): Prisma.EventFeedbackWhereInput;             // hidden false, publicConsent, and attendance recorded by the host or a check-in, or member-confirmed over 7 days ago with no dispute
  credential(now?: Date): Prisma.ExpertCredentialWhereInput;       // VERIFIED, expiresAt null or > now
  testimonial(): Prisma.TestimonialWhereInput;                      // published, consentWithdrawnAt null
  post(now?: Date): Prisma.PostWhereInput;                          // SCHEDULED or PUBLISHED, publishedAt <= now
};

/** Members counted in public numbers: not demo, not excludeFromMetrics, not suspended. */
export function countableMemberWhere(): Prisma.UserWhereInput;

/** "Only N left" may show only when stock is below the threshold and staff confirmed it in the last 7 days. */
export function scarcityAllowed(
  product: { inventory: number | null; stockConfirmedAt: Date | null },
  opts?: { threshold?: number; now?: Date } // threshold defaults to 10
): boolean;

export const MIN_REVIEWS_FOR_RATING = 3;
export const MIN_COUNT_FOR_AGGREGATE = 5;
/** Average and count, or null below MIN_REVIEWS_FOR_RATING. */
export function ratingSummary(ratings: readonly number[]): { average: number; count: number } | null;
/** n, or null below MIN_COUNT_FOR_AGGREGATE, so the page shows no number rather than a small one. */
export function publicCount(n: number): number | null;

/** Phrases that promise outcomes or invent proof, e.g. "guaranteed income", "100% placement", "join 10,000+". */
export const BANNED_CLAIMS: readonly RegExp[];
/** The banned phrases found in text. Editorial, opportunity and offering forms refuse to publish while any remain. */
export function bannedClaims(text: string): string[];
```

- Every helper except `credential` and `testimonial` also applies `realWhere()`. Those two models have no `isDemo`, because demo data never holds credentials or testimonials (d.3).
- `publicWhere.post` fixes a leak the workstreams plan found: today a scheduled post shows once `publishedAt` is set, even before that time.
- **Feedback.** A review is public only when attendance was recorded by someone other than the reviewer (`attendanceSource` CODE, HOST, JOIN_LINK or INTEGRATION), or when the member confirmed it themselves (`MEMBER_CONFIRMED`, `memberConfirmedAt`) more than 7 days ago and no attendance dispute was opened. A host therefore cannot hide a bad review by marking NO_SHOW, and a member cannot publish a review for an event nobody saw them attend.
- **Founder text.** The founder's note on Home, Today and `/updates` is the `SiteSetting` `founder.note`, JSON `{ text, updatedAt, updatedById, approvedAt, approvedById }`. Saving the text clears `approvedAt` and `approvedById`. Approving needs `admin.content` and is audited (`founder.note.approve`). The three surfaces render the text only while `approvedAt` is set; `/about` keeps today's copy.
- **Expert photos.** Changing `Instructor.photoUrl` clears `photoVerifiedAt` and `photoSha256`. Verifying stores the sha256 of the fetched bytes; a daily sweep re-fetches verified photos and clears the verification when the bytes changed. Images load only from hosts listed in `IMAGE_REMOTE_HOSTS` (comma-separated), which feeds `next.config` `images.remotePatterns` and the `img-src` of the CSP, and are served through `next/image`. With the variable empty, which is the default (O38), profiles show initials.
- **Shared trust components** (P0, lead-owned): `apps/web/components/trust/DemoBadge.tsx`, `VerificationBadge.tsx` and `EmptyState.tsx`, and `ProgressRing` in `packages/ui`. Every stream uses them; POLISH only restyles them.
- **Test.** On an empty, migrated database, every public page renders with no invented name, count or rating: the honest empty states only.

### e.4 Zoned time

**`packages/core/src/time/zoned.ts`** (new). Pure functions on `Intl`, with no dependency.

```ts
export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number }; // weekday 0 = Sunday
export function utcToZonedParts(at: Date, zone: string): ZonedParts;
/** A wall-clock time in a zone, as an instant. A time in a DST gap moves forward; a time in an overlap takes the earlier instant. */
export function zonedWallTimeToUtc(parts: Omit<ZonedParts, "weekday" | "second"> & { second?: number }, zone: string): Date;
export function startOfDayInZone(dayKey: string, zone: string): Date;
export function addDaysInZone(at: Date, days: number, zone: string): Date;   // same wall time, n local days later
export function weekdayInZone(at: Date, zone: string): number;               // 0 = Sunday

export type ZoneSource = { timezone: string | null; previousTimezone?: string | null; timezoneEffectiveAt?: Date | null };
/** previousTimezone until timezoneEffectiveAt, timezone from then on; memberZone() of the result. */
export function effectiveZoneAt(source: ZoneSource, at: Date): string;
/** When a change of zone made at changedAt takes effect (rule below). */
export function nextZoneCutover(oldZone: string, newZone: string, changedAt: Date): Date;

export function memberDayKey(source: ZoneSource, at?: Date): string;   // "YYYY-MM-DD"
export function memberWeekKey(source: ZoneSource, at?: Date): string;  // "week:YYYY-MM-DD", the Monday
export function memberMonthKey(source: ZoneSource, at?: Date): string; // "month:YYYY-MM"
/** The platform's own day, India time, for analytics rows. */
export function analyticsDayKey(at?: Date): string;

export function parseZonedDateTime(value: string, zone: string): Date | null; // "YYYY-MM-DDTHH:mm" from a form
export function formatTimeRange(start: Date, end: Date, zone: string): string; // "14 Nov, 18:00 to 19:30"
export function utcOffsetLabel(zone: string, at?: Date): string;             // "GMT+5:30"
```

**The cutover rule.** Let K be the member's day key in the old zone at `changedAt`, and N the day key in the new zone at the same moment.
- If N equals K or K + 1, the new zone takes effect at `changedAt`. The day key stays or moves forward by one day, as it does at midnight.
- If N equals K − 1, and the old zone is still on day K at `startOfDayInZone(K, newZone)`, the old zone stays in force until that moment and the new zone takes over from then. The member's day key never goes back.
- Otherwise the move crosses the date line, by 24 hours or more. The switch happens at `changedAt`, and one date is repeated or skipped. The settings page says so before the member saves.

**`ProfileService.setTimezone(userId: string, zone: string, now?: Date): Promise<void>`** (`platform/profile.ts`). It validates the zone and does nothing when the zone is unchanged. Otherwise it stores the zone in force at `now` (`effectiveZoneAt`) as `previousTimezone` and sets `timezoneEffectiveAt = nextZoneCutover(previousTimezone, zone, now)`. A second change before the first cutover therefore starts from the zone the member is still on. Every day-keyed mechanic (streaks, check-ins, mission occurrences, plans, goals) reads `memberDayKey`.

**Existing time helpers.**
- `memberZone` (`time/format.ts`) is the single fallback: the profile's zone when valid, else India time.
- `localDayKey(at, timezone)` in `time/day.ts` keeps its signature and becomes `memberDayKey({ timezone }, at)`. Its fallback for a missing or invalid zone changes from UTC to India time, so a member's day key matches the dates the site shows them. The one test that expects the UTC fallback, `rules-engine.test.ts:246-249`, changes to expect India time (there is no `day.test.ts`). Production has never run, so no stored key changes meaning.
- `localDayKeyOffset`, `isSameLocalDay` and `localWeekStartKey` keep their signatures and use the same fallback.

### e.5 Notifications

**The topic catalogue.** `packages/config/src/ecosystem.ts` (e.12) holds it, so the taxonomy seed and core share one list:

```ts
export type NotificationChannelName = "IN_APP" | "EMAIL" | "PUSH";
export type TopicDef = {
  key: string;                 // "mentoring.booking"; the group is the first segment
  label: string;
  description: string;
  type: string;                // the NotificationType value stored on the row, e.g. "MENTORSHIP"
  defaults: { inApp: boolean; email: boolean; push: boolean };
  /** Channels the member cannot turn off. */
  locked?: readonly NotificationChannelName[];
  /** Transactional: ignores pause, opt-out and quiet hours. */
  essential?: boolean;
  /** May wait for the member's email digest. */
  digestible: boolean;
};
export const NOTIFICATION_TOPICS: readonly TopicDef[]; // the 42 below
```

Push is off by default for every topic. Labels and descriptions are plain sentences, written with the stream that sends the topic.

| Topic | Type | In-app | Email | Locked | Notes |
|---|---|---|---|---|---|
| learning.progress | LEARNING | on | off | | digestible |
| learning.course_update | LEARNING | on | off | | digestible |
| learning.feedback | LEARNING | on | on | | |
| learning.path | LEARNING | on | off | | digestible |
| progress.xp | XP_AWARDED | on | off | | digestible |
| progress.level | LEVEL_UP | on | off | | |
| progress.rank | RANK_UP | on | off | | |
| progress.achievement | ACHIEVEMENT | on | off | | |
| progress.mission | MISSION | on | off | | |
| progress.skill | PROJECT | on | on | | |
| progress.project | PROJECT | on | on | | |
| challenge.update | CHALLENGE | on | off | | |
| challenge.reminder | CHALLENGE | on | off | | scheduled |
| goal.achieved | GOAL | on | off | | |
| goal.reminder | GOAL | on | off | | scheduled |
| mentoring.booking | MENTORSHIP | on | on | in-app, email | essential |
| mentoring.request | MENTORSHIP | on | on | in-app, email | essential; a booking request to the mentor, and the answer to the member |
| mentoring.reminder | MENTORSHIP | on | on | | scheduled |
| mentoring.feedback | MENTORSHIP | on | off | | |
| mentoring.new_mentor | MENTORSHIP | on | off | | digestible |
| event.registration | EVENT | on | on | in-app, email | essential |
| event.reminder | EVENT | on | on | | scheduled |
| event.changed | EVENT | on | on | in-app, email | essential |
| event.announced | EVENT | on | off | | digestible |
| event.resources | EVENT | on | off | | |
| opportunity.application | OPPORTUNITY | on | on | in-app, email | essential |
| opportunity.match | OPPORTUNITY | on | off | | digestible |
| opportunity.partner | OPPORTUNITY | on | on | | |
| contributor.application | CONTRIBUTOR | on | on | in-app, email | essential |
| contributor.review | CONTRIBUTOR | on | on | | |
| earnings.update | EARNINGS | on | on | | |
| community.reply | COMMUNITY | on | off | | digestible |
| community.reaction | COMMUNITY | on | off | | digestible |
| community.follow | COMMUNITY | on | off | | digestible |
| community.following_post | COMMUNITY | off | off | | digestible |
| community.group | COMMUNITY | on | off | | digestible |
| community.moderation | COMMUNITY | on | off | in-app | |
| order.update | ORDER | on | on | in-app, email | essential |
| wallet.thc | THC | on | off | | |
| platform.announcement | ANNOUNCEMENT | on | off | | |
| platform.announcement.important | ANNOUNCEMENT | on | on | in-app | |
| editorial.post | SYSTEM | on | off | | |

Which topics are essential is open question 14.

**`packages/core/src/platform/notification-topics.ts`** (new):

```ts
export type TopicKey = (typeof NOTIFICATION_TOPICS)[number]["key"];
export function isTopicKey(v: unknown): v is TopicKey;
export function topicDef(key: TopicKey): TopicDef;
/** The topic a legacy notify(userId, type, ...) call is filed under. */
export function topicFor(type: NotificationType): TopicKey;
/** The catalogue merged with the NotificationTopic rows (label, defaults, active). A topic with no row uses the catalogue. */
export async function effectiveTopics(db?: Db): Promise<Map<TopicKey, TopicDef & { active: boolean }>>;
```

| Legacy type | `topicFor` |
|---|---|
| XP_AWARDED | progress.xp |
| LEVEL_UP | progress.level |
| RANK_UP | progress.rank |
| ACHIEVEMENT | progress.achievement |
| MISSION | progress.mission |
| CHALLENGE | challenge.update |
| THC | wallet.thc |
| SYSTEM | platform.announcement |
| ORDER | order.update |
| COMMUNITY | community.reply |
| EARNINGS | earnings.update |
| LEARNING | learning.progress |
| MENTORSHIP | mentoring.booking |
| EVENT | event.registration |
| OPPORTUNITY | opportunity.application |
| CONTRIBUTOR | contributor.application |
| PROJECT | progress.project |
| GOAL | goal.achieved |
| ANNOUNCEMENT | platform.announcement |

**The gateway: `packages/core/src/platform/notify.ts`** (changed). One function writes every notification. The positional form stays, so the 34 existing write sites keep working while they move over.

```ts
export type NotifyInput = {
  userId: string;
  topic: TopicKey;
  title: string;
  body?: string;
  href?: string;                     // a path on this site; checked with safeSitePath
  data?: Prisma.InputJsonObject;
  actorId?: string;                  // who caused it; used for blocks and self-action
  priority?: NotificationPriority;   // default NORMAL; HIGH skips quiet hours
  dedupeKey?: string;                // at most one notification ever with this key
  groupKey?: string;                 // coalesce into the member's unread notification with this key
  expiresAt?: Date;
  announcementId?: string;
  email?: { subject?: string; text?: string };
};

export type NotifyResult =
  | { status: "created"; notificationId: string; deliveries: NotificationChannel[] }
  | { status: "coalesced"; notificationId: string; groupCount: number }
  | { status: "duplicate"; notificationId: string }
  | { status: "suppressed"; reason: "recipient_suspended" | "self_action" | "blocked_actor" | "topic_inactive" | "all_channels_off" };

export async function notify(input: NotifyInput, db?: Db): Promise<NotifyResult>;
/** Legacy form: stores the given type, with topic = topicFor(type). Never coalesces. */
export async function notify(
  userId: string, type: NotificationType, title: string, body?: string,
  data?: Prisma.InputJsonValue & { href?: string }, db?: Db
): Promise<NotifyResult>;
/** One input for many recipients; checks run per recipient. Rows are written in batches of 1000. */
export async function notifyMany(userIds: readonly string[], input: Omit<NotifyInput, "userId">, db?: Db): Promise<NotifyResult[]>;

export function notificationLink(data: unknown): string | null; // unchanged
```

Rules, in the order they are checked:
1. **Recipient suspended:** suppressed.
2. **Self action** (`actorId === userId`): suppressed.
3. **Blocked:** either side has a `MemberBlock` with the actor: suppressed. Essential topics skip this check.
4. **Topic inactive** (`NotificationTopic.active = false`): suppressed, unless the topic is essential.
5. **Channels:** `effectiveChannels` for the member and topic. No channel left: suppressed.
6. **Dedupe:** a `dedupeKey` that already exists returns `duplicate`.

- An input carries a `dedupeKey` or a `groupKey`, never both; the gateway throws otherwise.
- **Coalescing** uses the partial unique index `Notification_unread_group_key` (migration 000100). The statement, as tested in c.4, with `id` from `randomUUID()` and `at` from the caller:

  ```sql
  INSERT INTO "Notification" ("id", "userId", "type", "topic", "title", "body", "data", "groupKey", "actorId", "priority", "createdAt")
  VALUES (${id}, ${userId}, ${type}::"NotificationType", ${topic}, ${title}, ${body}, ${data}, ${groupKey}, ${actorId}, ${priority}::"NotificationPriority", ${at})
  ON CONFLICT ("userId", "groupKey") WHERE "groupKey" IS NOT NULL AND "readAt" IS NULL AND "archivedAt" IS NULL
  DO UPDATE SET "groupCount" = "Notification"."groupCount" + 1, "title" = EXCLUDED."title",
                "body" = EXCLUDED."body", "createdAt" = EXCLUDED."createdAt", "seenAt" = NULL
  RETURNING "id", "groupCount", (xmax = 0) AS "inserted";
  ```

  Once the member reads the row, the next notice starts a new one.
- **Email and push.** In-app is the `Notification` row. For EMAIL and PUSH the gateway writes one `ScheduledNotification` per channel, in the same transaction, with `dedupeKey = "copy:<notificationId>:EMAIL"` or `":PUSH"`.
  - Mail mode `off` (`mailModeFromEnv()`): no EMAIL rows.
  - Mail mode `dev`: the rows are dispatched to the log and end LOGGED.
  - PUSH rows are written only when `pushConfigured()` is true.
- Legacy calls pass no `groupKey`, so they never coalesce. Code that finds notices by `data`, such as `community.ts:454`, which removes the notice for a hidden message, keeps working.

**Preferences: `packages/core/src/platform/notification-preferences.ts`** (new):

```ts
export type ChannelSet = { IN_APP: boolean; EMAIL: boolean; PUSH: boolean };
/** Catalogue defaults, then the topic row, then the member's NotificationPreference rows; locked channels always on. */
export async function effectiveChannels(userId: string, topic: TopicKey, db?: Db): Promise<ChannelSet>;
export async function preferencesFor(userId: string, db?: Db): Promise<{ topic: TopicDef; channels: ChannelSet; locked: NotificationChannelName[] }[]>;
/** Throws on a locked channel. */
export async function setPreference(userId: string, topic: TopicKey, channel: NotificationChannel, enabled: boolean, db?: Db): Promise<void>;
export async function updateSettings(
  userId: string,
  patch: Partial<Pick<NotificationSettings, "emailDigest" | "digestHour" | "quietStartMin" | "quietEndMin" | "pausedUntil">>,
  db?: Db
): Promise<NotificationSettings>;
/**
 * The one-click link in every non-essential email: /unsubscribe?t=<token>&topic=<key>.
 * With a topic, turns EMAIL off for that topic (a NotificationPreference row). With topic "all", sets
 * emailOptOutAt, which stops every non-essential email. An essential topic cannot be unsubscribed:
 * its emails link to /settings/notifications instead.
 */
export async function unsubscribeByToken(token: string, topic: TopicKey | "all", db?: Db): Promise<{ ok: boolean }>;
/** HMAC-SHA256(privacySecret(), "unsub|" + userId), hex. Only its sha256 is stored, in unsubscribeTokenHash. */
export function unsubscribeToken(userId: string): string;
```

**The outbox: `packages/core/src/platform/scheduled.ts`** (new):

```ts
export type ScheduleInput = {
  userId: string; topic: TopicKey; channel?: NotificationChannel; runAt: Date; dedupeKey: string;
  subject: { type: string; id: string }; payload?: Prisma.InputJsonObject;
  /** Past this the row is stale: SKIPPED with lastError "stale". The event start, challenge end or goal week end. */
  notAfter?: Date;
};
/** INSERT ... ON CONFLICT ("dedupeKey") DO NOTHING. Scheduling the same key twice is a no-op. */
export async function schedule(input: ScheduleInput, db?: Db): Promise<{ created: boolean }>;
/** Moves a PENDING row to a new time (an event moved). */
export async function reschedule(dedupeKey: string, runAt: Date, db?: Db): Promise<boolean>;
/**
 * Cancels PENDING rows for a subject, through the (subjectType, subjectId) index; for one member when userId
 * is given. Event reminders are filed under the event ("live_event"), so a reschedule or cancellation clears
 * every registrant's rows in one statement and a member's own cancellation clears only theirs.
 */
export async function cancelForSubject(subject: { type: string; id: string }, opts?: { userId?: string }, db?: Db): Promise<number>;

export type DispatchDeps = { mailer: MailerPort | null; push: PushPort; mailMode: MailMode; now?: () => Date };
export async function dispatchDue(
  opts: { limit?: number; userId?: string },
  deps: DispatchDeps,
  db?: PrismaClient
): Promise<{ sent: number; logged: number; skipped: number; failed: number }>;
```

`dispatchDue`:
1. In a short transaction it claims due rows with `FOR UPDATE SKIP LOCKED` and sets `lockedUntil = now + 2 minutes`, so two dispatchers never send the same row.
2. It sends outside the transaction.
3. A failed send returns to PENDING with `runAt = now + 10 minutes × attempts` while `attempts` is below 3. After that the row is FAILED, with `lastError`.
4. Before sending it applies the member's settings:
   - A row past its `notAfter` is SKIPPED with `lastError` "stale".
   - Quiet hours move EMAIL and PUSH to the end of the quiet window, unless the priority is HIGH or the topic is essential. They never move a row past its `notAfter`: when the quiet window ends after it, the row is SKIPPED as stale instead of arriving late.
   - Digestible topics wait for the digest when `emailDigest` is DAILY or WEEKLY. The digest goes at `digestHour`, member time, under `digest:<userId>:<memberDayKey>` (daily) or `digest:<userId>:<memberWeekKey>` (weekly). NOTIFY adds this step; until it lands every row sends on its own.
   - `pausedUntil` and `emailOptOutAt` skip the row (SKIPPED), except for essential topics. A per-topic EMAIL preference that is off skips it with `pref_off`.

**Who builds what.**
- **P0 (P0d, lead-owned `notify.ts`):** the catalogue and `notification-topics.ts`; the gateway (`notify`, `notifyMany`); preferences read and write (`notification-preferences.ts`, including `unsubscribeToken` and `unsubscribeByToken`); the outbox (`scheduled.ts`: `schedule`, `reschedule`, `cancelForSubject`, `dispatchDue` with claims, retries, stale rows, quiet hours, pause and opt-out); the ports (`MailerPort`, `PushPort`, `nullPush`, `pushConfigured`) and a plain-text `renderEmail`; the cron routes and `dispatchSoon`; and the move of the 34 write sites.
- **NOTIFY:** the designed email templates and the digest (rendering and the deferral step above); the `/unsubscribe` page; `notification-centre.ts` with its API, the bell and the centre; `/settings/notifications`; announcements (`Announcement`, `/admin/announcements`); and `/admin/notifications`. After P0 merges, NOTIFY owns `scheduled.ts` and `notification-delivery.ts`; their exported signatures above are frozen.

**Delivery and the notification centre.**
- `packages/core/src/platform/notification-delivery.ts`: `MailerPort` (`send(mail): Promise<{ id: string }>`), `PushPort`, `nullPush`, `pushConfigured(env?)` and `renderEmail(topic, notification, unsubscribeUrl)`.
- `packages/core/src/platform/mail-outcome.ts` gains `mailModeFromEnv(env?): MailMode`: RESEND_API_KEY set means live, `isDevMode()` means dev, otherwise off. `apps/web/lib/mail/index.ts` `mailMode()` calls it, so web and core agree.
- `packages/core/src/platform/notification-centre.ts`:
  - `list(userId, { cursor?, take?, unreadOnly? })`
  - `unreadCount(userId)`
  - `markSeen(userId, ids)`, `markRead(userId, id)`, `markAllRead(userId)`
  - `archive(userId, id)`

  Expired rows (`expiresAt` past) are left out.

**What triggers dispatch.** The workstreams plan's defect D4 is that nothing runs often enough on the current plan.
- `apps/web/lib/notifications.ts` (new): `dispatchDeps()` binds `activeMailer()`, and `dispatchSoon()` runs `dispatchDue` inside Next's `after()`, at most once a minute per server instance.
- Loading the bell runs `dispatchDue({ userId, limit: 20 })` for that member.
- `/api/cron/daily` replaces the `expire-orders` entry in `apps/web/vercel.json`, so the file keeps two once-a-day entries (`daily`, and the launch branch's `email-holds` at 00:30, which stays as it is); every Vercel plan allows that. It runs the expire-orders work first, then the sweeps, the analytics roll-up, the digests and a full dispatch. The `/api/cron/expire-orders` route stays for manual runs.
- `/api/cron/dispatch` (guarded by `cronAuth`, CRON_SECRET) is for an external scheduler that calls it every few minutes (open question 8).

**Dedupe keys** (one format each):

| Use | Key |
|---|---|
| Event reminders | `event:<eventId>:user:<userId>:s<icsSequence>:T-1440` and `:T-60`; subject `live_event`, `notAfter` the event start |
| Challenge reminder | `challenge:<challengeId>:user:<userId>:T-1d` |
| Goal reminder | `goal:<goalId>:<memberWeekKey>` |
| Email digest | `digest:<userId>:<memberDayKey or memberWeekKey>` |
| Email or push copy of a notification | `copy:<notificationId>:EMAIL` or `:PUSH` |
| Announcement | `announcement:<announcementId>:<userId>` |
| New follower | `follow:<followerId>:<userId>` |

A rescheduled event raises `icsSequence`; its PENDING reminders are cancelled with `cancelForSubject({ type: "live_event", id: eventId })` and new ones are scheduled under keys with the new sequence.

`groupKey` values: `reply:<postId>` and `reaction:<postId>`.

**The 34 existing write sites move to the gateway.** They keep their titles and types, so members see the same text. A test lists every site and checks that its title is unchanged.
- 18 `notify(...)` calls:
  - `earn/affiliates.ts`: 333, 373, 507, 600, 634, 636, 677, 696, 750, 824
  - `discussions/discussions.ts`: 622, 737, 857
  - `shop/refunds.ts`: 135, 228, 337, 475, 536
- 16 direct `notification.create` or `createMany` writes:
  - `community/community.ts`: 425, 478
  - `growth/referrals.ts`: 134
  - `platform/cms.ts`: 138, the staff broadcast. It becomes an `Announcement` row sent through `notifyMany`, so it can be retracted.
  - `gamification/challenges.ts`: 163, 261
  - `gamification/xp.ts`: 104, 115
  - `gamification/achievements.ts`: 72
  - `rewards/rewards.ts`: 109
  - `rules/engine.ts`: 146
  - `commerce/commerce.ts`: 376, 413
  - `lms/lms.ts`: 160, 305
  - `shop/checkout.ts`: 387

### e.6 Activity feed

**`packages/core/src/activity/record.ts`** (new):

```ts
export type ActivityInput = {
  kind: ActivityEventKind;
  actorId: string | null;
  audience?: ActivityAudience;            // default MEMBERS
  academyId?: string; groupId?: string; courseId?: string;
  subject: { type: string; id: string };
  facet: PrivacyFacet | null;             // the actor's facet checked on read (e.11)
  data: { title: string; href: string; count?: number };
  occurredAt?: Date;
  dedupeKey: string;                      // e.g. "COURSE_COMPLETED:<userId>:<courseId>"
};
/**
 * Idempotent on dedupeKey (ON CONFLICT DO NOTHING). Without tx it is fail-soft: an error is logged, never thrown.
 * With tx it writes in the caller's transaction, so the item commits or rolls back with the change.
 */
export async function record(input: ActivityInput, tx?: Prisma.TransactionClient): Promise<void>;
/** Maps a domain event to a feed item, or to nothing. */
export async function fromDomainEvent(event: DomainEvent, outcome: RuleOutcome): Promise<void>;
/** community.moderate; sets hiddenAt, hiddenById, hiddenReason; audit "activity.hide". */
export async function hide(actor: Actor, id: string, reason: string): Promise<void>;
```

`EventBus.emit` (`events/bus.ts`) calls `fromDomainEvent(event, outcome)` after the rules engine, in a try of its own, so a feed error neither undoes the event nor changes the rules outcome that `emit` returns.

**`packages/core/src/activity/feed.ts`** (new):

```ts
export type FeedScope =
  | { kind: "members" } | { kind: "academy"; academyId: string } | { kind: "group"; groupId: string }
  | { kind: "course"; courseId: string } | { kind: "following" } | { kind: "member"; userId: string };
export type FeedItem = {
  id: string;
  kind: ActivityEventKind;
  actor: { id: string; displayName: string | null; username: string | null } | null;
  data: { title: string; href: string; count?: number };
  occurredAt: Date;
};
export async function feed(
  viewer: Actor | null,
  opts: { scope: FeedScope; cursor?: string; take?: number } // take defaults to 20, at most 50
): Promise<{ items: FeedItem[]; nextCursor: string | null }>;
```

On read, `feed` drops:
- hidden items;
- items whose actor is suspended or demo (outside development);
- items where either side has blocked the other;
- items whose actor turned the `activity` facet off;
- items whose own facet is off for this viewer (`canView`, e.11).

**New domain events** (`events/types.ts`). They are added to `DOMAIN_EVENTS`, so staff can attach missions to them:

| Event | Payload (besides `userId`, `at`) |
|---|---|
| MODULE_COMPLETED | moduleId, courseId |
| CERTIFICATE_ISSUED | certificateId, courseId |
| PATH_COMPLETED | pathId |
| ACADEMY_JOINED | academyId, source |
| MENTOR_APPROVED | mentorId |
| MENTORING_BOOKED | eventId, registrationId, mentorId |
| MENTORING_COMPLETED | eventId, registrationId, mentorId |
| EVENT_REGISTERED | eventId, registrationId |
| EVENT_ATTENDED | eventId, registrationId, mode |
| GOAL_CHECKED_IN | goalId, value |
| GOAL_ACHIEVED | goalId |
| PRACTICE_LOGGED | kind, missionId? |
| PROJECT_PUBLISHED | projectId |
| PROJECT_VERIFIED | projectId |
| SKILL_VERIFIED | skillId, memberSkillId |
| OPPORTUNITY_APPLIED | opportunityId, applicationId |
| GROUP_JOINED | groupId |
| MEMBER_FOLLOWED | followingId |
| RANK_CHANGED | fromRankId, toRankId, direction ("up" or "down") |

**Facets per feed kind:**

| Facet | Kinds |
|---|---|
| academies | ACADEMY_JOINED |
| courses | COURSE_COMPLETED, PATH_COMPLETED |
| achievements | ACHIEVEMENT_UNLOCKED |
| rank | RANK_REACHED |
| challenges | CHALLENGE_JOINED, CHALLENGE_COMPLETED |
| projects | PROJECT_PUBLISHED, PROJECT_VERIFIED |
| skills | SKILL_VERIFIED |
| none: the subject's own visibility decides | INTRODUCTION_POSTED, UPDATE_POSTED, DISCUSSION_FEATURED, GROUP_CREATED, GROUP_ANNOUNCEMENT, EVENT_PUBLISHED, MENTOR_JOINED, ARTICLE_PUBLISHED, OPPORTUNITY_PUBLISHED, COMMUNITY_MILESTONE |

- ACADEMY_JOINED makes a feed item only for SELF and ONBOARDING joins, never for ENROLMENT or BACKFILL.
- RANK_REACHED is recorded only when the rank goes up.

### e.7 Academies

**`packages/core/src/academies/academies.ts`** (new):

```ts
export { ACADEMY_SLUG_BY_PILLAR } from "@tycoonhood/config"; // WARRIOR warrior, BUILDER business, TYCOON wealth, MIND wellness
export function academySlugForPillar(pillar: Pillar): AcademySlug;
/** Cached per process; the four rows are inserted by migration 000100 and never deleted. */
export async function academyForPillar(pillar: Pillar, db?: Db): Promise<{ id: string; slug: AcademySlug } | null>;
export async function academyIdForCourse(courseId: string, db?: Db): Promise<string | null>;

export class AcademyService {
  constructor(db?: PrismaClient);
  list(opts?: { includeDraft?: boolean }): Promise<Academy[]>;
  bySlug(slug: string): Promise<Academy | null>;
  join(userId: string, academyId: string, source?: "SELF" | "ONBOARDING"): Promise<AcademyMembership>;
  /** Sets leftAt. A later enrolment does not re-join a member who left. */
  leave(userId: string, academyId: string): Promise<void>;
  membershipsOf(userId: string): Promise<(AcademyMembership & { academy: Academy })[]>;
  /** Called from enrolment: joins with source ENROLMENT and notify false, unless a membership row exists (left or not). */
  ensureFromEnrolment(userId: string, courseId: string, tx?: Prisma.TransactionClient): Promise<void>;
}
export const academies: AcademyService;
```

`lms.ts` calls `ensureFromEnrolment` where it creates an `Enrollment`.

- **Notices.** `AcademyMembership.notify` is true for SELF and ONBOARDING joins and false for ENROLMENT and BACKFILL. Academy announcements and new-mentor notices go only to members with `notify` true; a member turns it on or off on the academy page.
- **A course's academy.** `Course.academyId` is the source of truth. The authoring service sets `Course.pillar` from the academy's pillar whenever it sets `academyId`, so the two never disagree; a test checks both are written together. ACAD owns the academy picker in the course editor and `academyIdForCourse`.

### e.8 Admin navigation

**`apps/web/lib/admin-nav.ts`** (changed). Sections gain a group, and `needs` may list several permissions, any of which opens the section.

```ts
export type AdminGroupKey =
  | "members" | "learning" | "experts" | "events" | "community" | "engagement"
  | "opportunities" | "commerce" | "content" | "insights" | "system";
export type AdminSection = AdminTab & {
  group: AdminGroupKey | null;              // null: Overview, shown first, outside any group
  needs: Permission | readonly Permission[]; // any of
  unless?: Permission;
};
export type AdminNavGroup = { key: AdminGroupKey; label: string; sections: AdminTab[] };
export function adminNavFor(user: HasRole): { overview: AdminTab[]; groups: AdminNavGroup[] };
/** Kept: the same sections as a flat list, for the existing tab bar. */
export function adminTabsFor(user: HasRole): AdminTab[];
```

| Group (label) | Section | Needs |
|---|---|---|
| (Overview) | /admin | admin.access |
| (Overview) | /admin/review: every review queue in one list | any of contributors.review, mentors.manage, events.manage, opportunities.manage, content.publish, progression.verify, community.moderate, courses.publish |
| Members | /admin/members | admin.users |
| Learning | /admin/academies, /admin/paths, /admin/skills | academies.manage |
| Learning | /admin/courses | courses.author |
| Learning | /admin/courses/reviews | community.moderate, unless courses.author (as today) |
| Learning | /admin/submissions | courses.publish |
| Mentors and contributors (`experts`) | /admin/applications | contributors.review |
| Mentors and contributors | /admin/mentors | mentors.manage |
| Mentors and contributors | /admin/experts | any of courses.manage, mentors.manage |
| Mentors and contributors | /admin/revenue-terms, /admin/contributor-earnings | admin.earn |
| Events | /admin/events, /admin/events/kinds | events.manage |
| Community | /admin/community, /admin/groups, /admin/moderation, /admin/activity | community.moderate |
| Engagement | /admin/missions, /admin/challenges, /admin/achievements, /admin/ranks, /admin/videos, /admin/economy, /admin/evidence | admin.economy |
| Engagement | /admin/projects | progression.verify |
| Engagement | /admin/standard | admin.content |
| Opportunities | /admin/opportunities, /admin/partners | opportunities.manage |
| Commerce | /admin/orders, /admin/products, /admin/coupons, /admin/refunds | admin.commerce |
| Commerce | /admin/earn | admin.earn |
| Content and site (`content`) | /admin/content | content.write |
| Content and site | /admin/help, /admin/testimonials, /admin/site | admin.content |
| Content and site | /admin/announcements | community.announce |
| Insights | /admin/analytics | admin.analytics |
| Insights | /admin/guide | guide.review |
| System | /admin/audit | admin.audit |
| System | /admin/notifications (topics and the outbox) | admin.content |

`components/admin-tabs.tsx` renders the groups. A group with no visible section is not shown.

### e.9 Audit actions

**`packages/core/src/platform/audit.ts`** (changed):

```ts
export const AUDIT_ACTIONS = [ /* the new actions below */ ] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
```

`AuditEntry.action` stays a `string`, so the existing literals and the template-built `community.*` actions keep working. A test scans the source for audit literals that start with one of the new prefixes and fails on any that is not in `AUDIT_ACTIONS`.

| Area | Actions |
|---|---|
| Academies, paths, skills | academy.create, academy.update, academy.publish, academy.archive, academy.flagship.set; path.create, path.update, path.publish, path.archive; skill.create, skill.update, skill.archive; memberskill.verify, memberskill.revoke |
| Projects, ranks, achievements | project.verify, project.request_changes, project.reject, project.feature, project.unfeature, project.hide; rank.award, rank.criteria.update; achievement.create, achievement.update, achievement.award, achievement.revoke |
| Contributors and money | contributor.application.approve, contributor.application.reject, contributor.application.request_info; contributor.account.suspend, contributor.account.restore; contributor.payout_method.view; revenue.terms.create, revenue.terms.accept; earning.approve, earning.reject, earning.reverse; payout.contributor.approve, payout.contributor.paid, payout.contributor.reject |
| Experts | expert.status.change, expert.identity.verify, expert.photo.verify; credential.verify, credential.reject; mentor.approve, mentor.status.change, mentor.category.save; offering.save, offering.activate |
| Events | event.create, event.submit, event.approve, event.reject, event.publish, event.reschedule, event.cancel, event.complete; event.host.confirm, event.attendance.mark, event.attendance.dispute_resolve, event.kind.save, event.series.save; registration.cancel_staff, registration.refund; feedback.hide, feedback.restore |
| Review and community | content_submission.approve, content_submission.reject, content_submission.request_changes; group.approve, group.reject, group.archive, group.restore, group.member.ban; activity.hide |
| Opportunities | partner.verify, partner.reject, partner.suspend; opportunity.approve, opportunity.reject, opportunity.remove, opportunity.feature |
| Notifications | announcement.create, announcement.send, announcement.retract; notification.topic.update |
| Editorial | post.submit, post.approve, post.request_changes, post.publish, post.schedule, post.archive, post.founder_approve; founder.note.save, founder.note.approve; help.save; testimonial.verify, testimonial.consent_withdraw |
| Other | guide.message.review; user.exclude_metrics; evidence.approve, evidence.reject; mission.publish (the existing mission.create, mission.update, mission.activate and mission.pause stay) |

- Linking an `Instructor` to an account keeps DR-34's `instructor.link` and `instructor.unlink`.
- The existing `notification.announce` stays for rows already written; new broadcasts log `announcement.send`.

### e.10 IP keys

**`packages/core/src/platform/ip-key.ts`** (new). It fixes defects 1 and 2 (0.5).

```ts
/** IP_HASH_KEY, else AFFILIATE_HASH_SECRET, else sha256("affiliate-visitor|" + DATABASE_URL), as affiliates.ts derives its secret today. */
export function privacySecret(env?: NodeJS.ProcessEnv): string;
/** HMAC-SHA256(privacySecret(), "ip|" + ip), hex, first 32 characters. "" for no IP. */
export function ipKey(ip: string | null | undefined): string;
```

- `ipKey` moves here from `earn/affiliates.ts:141`, where it is an unkeyed `sha256(ip).slice(0, 32)`. `earn/index.ts` keeps re-exporting it.
- `auth/session.ts:35` stores `ipHash: ipKey(device.ip) || null`.
- `affiliates.ts` keeps `visitorHash(ipKey, userAgent, day)` and its own `hashSecret()`. The input it receives is now keyed.
- `referrals.attach(userId, code)` loses its `ip` parameter, and `apps/web/app/(auth)/actions.ts:90-91` stops passing it. Nothing writes `Referral.signupIp` again.
- `.env.example` gains `IP_HASH_KEY` (a long random string in production) and `DEMO_DATA`.
- Switching the key changes the affiliate click dedupe once: a visitor who clicked before the switch can count once more on the day of the switch (open question 20).

### e.11 Privacy facets

**`packages/core/src/platform/privacy.ts`** (new). It takes over the facet rules from `platform/profile.ts`.

```ts
export const PRIVACY_FACETS = {
  // existing; their behaviour does not change
  level: { default: true }, rank: { default: true }, streak: { default: true },
  leaderboard: { default: true }, achievements: { default: true }, thc: { default: true },
  courses: { default: false },
  // new, on unless the member turns them off
  activity: { default: true, membersOnly: true }, skills: { default: true }, projects: { default: true },
  challenges: { default: true }, follows: { default: true }, directory: { default: true },
  // new, opt-in
  academies: { default: false }, xpHistory: { default: false }, celebrate: { default: false },
  interests: { default: false }, goals: { default: false }, location: { default: false },
} as const satisfies Record<string, { default: boolean; membersOnly?: boolean }>;
export type PrivacyFacet = keyof typeof PRIVACY_FACETS;

/** The stored value when it is a boolean, else the facet's default. */
export function facetOn(privacy: unknown, facet: PrivacyFacet): boolean;

export function canView(
  viewer: { id: string } | null,
  member: { id: string; suspendedAt: Date | null; privacy: unknown },
  facet: PrivacyFacet,
  ctx?: { blocked?: boolean } // true when either side blocks the other
): boolean;
```

- `canView` is true for the member themselves. Otherwise it is false when the member is suspended, when either side blocks the other, or when the facet is off. A members-only facet also needs a signed-in viewer.
- `privacyShows` and `showsCourses` (`platform/profile.ts`) stay, and call `facetOn`, so today's behaviour holds: courses is opt-in, and the other existing facets show unless turned off. `thc` already reads as hidden for new members, because the column default stores `thc: false`.
- `PRIVACY_FORM_KEYS` grows with the facets the settings page shows. `privacyFromForm` is unchanged.
- The defaults of the new facets need a DPDP review (open question 3).

### e.12 Shared catalogues in `packages/config`

**`packages/config/src/ecosystem.ts`** (new):

```ts
export type AcademySlug = "warrior" | "business" | "wealth" | "wellness";
export const ACADEMY_SLUG_BY_PILLAR: Record<"WARRIOR" | "BUILDER" | "TYCOON" | "MIND", AcademySlug>;
export const ACADEMY_SEED: readonly {
  id: string; slug: AcademySlug; pillar: "WARRIOR" | "BUILDER" | "TYCOON" | "MIND"; name: string; shortName: string;
  tagline: string; description: string; focusAreas: readonly string[]; accent: string; disclaimer: string | null;
  sortOrder: number; flagshipCourseSlug: string;
}[];
export const MENTOR_CATEGORY_SEED: readonly { slug: string; name: string; academy: AcademySlug | null; sortOrder: number }[];
export const EVENT_KIND_SEED: readonly { id?: string; slug: string; name: string; mode: "ONE_TO_ONE" | "GROUP"; academy: AcademySlug | null; sortOrder: number }[];
export const POST_CATEGORY_SEED: readonly { slug: string; name: string; sortOrder: number }[];
export const NOTIFICATION_TOPICS: readonly TopicDef[]; // e.5
export type { TopicDef, NotificationChannelName };
```

The rows are the tables in d.1. `packages/config` has no Prisma dependency, so enum-typed fields are string literal unions; core narrows them to the Prisma enums.

**`packages/config/src/demo.ts`** (new):

```ts
export type Env = Record<string, string | undefined>;
/** False when VERCEL_ENV is production. Otherwise true when NODE_ENV is not production, or DEMO_DATA is "show". */
export function demoVisible(env?: Env): boolean;
export class DemoSeedRefused extends Error {}
/** The six refusals of d.3; throws DemoSeedRefused with the reason. */
export function assertDemoSeedAllowed(env: Env, argv: readonly string[]): void;
```

Both files are re-exported from `packages/config/src/index.ts`.

### e.13 Existing files that change

| Area | Files |
|---|---|
| Core auth | `auth/permissions.ts`; `auth/grants.ts` (new); `auth/session.ts` (`GRANT_INCLUDE`, `ipKey`) |
| Core platform | `platform/notify.ts`; new: `notification-topics.ts`, `notification-preferences.ts`, `scheduled.ts`, `notification-delivery.ts`, `notification-centre.ts`, `authenticity.ts`, `privacy.ts`, `ip-key.ts`; changed: `audit.ts`, `mail-outcome.ts`, `profile.ts` (`setTimezone`, facets), `cms.ts` (announcements), `platform/index.ts` |
| Core courses | `lms/authoring.ts` (actor types gain `grants`); `lms/lms.ts` (`ensureFromEnrolment`, notices) |
| Core time | `time/zoned.ts` (new); `time/day.ts` (fallback); `test/rules-engine.test.ts` (the fallback case); `test/zoned.test.ts` (new) |
| Core events | `events/types.ts` (19 events); `events/bus.ts` (`fromDomainEvent`) |
| New core modules | `activity/record.ts`, `activity/feed.ts`, `academies/academies.ts`, `community/group-roles.ts`, `live/access.ts`, `mentors/access.ts`, `opportunities/access.ts`, `progression/access.ts`. Later streams add, among others, `mentors/mentoring.ts` (`MentoringService`, BOOK; member pages under `/bookings`, never `/sessions`) |
| Other core | `community/community.ts` (`isAdmin` calls, notices); `earn/affiliates.ts` (`ipKey` moves out, notices); `growth/referrals.ts` (no IP, notices); `discussions/discussions.ts`, `shop/refunds.ts` and the other write sites in e.5; `commerce/commerce.ts:254` and `:323`, `shop/checkout.ts:198` and `:362` (set `Order.paidAt` where an order becomes PAID); `rewards/rewards.ts:73` (passes `occurrence`); `earn/affiliates.ts:212-213`, `:824`, `:897`, `:981` and `apps/web/app/(app)/admin/earn/page.tsx:54`, `:256-269` (a payout's `affiliateId` is now nullable); `index.ts` exports |
| Config | `ecosystem.ts` (new), `demo.ts` (new), `index.ts` |
| Web | `lib/guard.ts`; `lib/admin-nav.ts`; `components/admin-tabs.tsx`; `lib/auth.ts` (grants on the current user); `lib/mail/index.ts` (`mailModeFromEnv`); `lib/notifications.ts` (new); `app/(auth)/actions.ts` (no IP to referrals); the admin pages and actions in e.1; `app/api/cron/daily/route.ts` and `app/api/cron/dispatch/route.ts` (new) |
| Deploy | `apps/web/vercel.json` (`daily` replaces `expire-orders`; `email-holds` is unchanged); `scripts/vercel-build.sh` and `scripts/deploy-db.mjs` (taxonomy seed); `packages/db/package.json` and the root `package.json` (scripts); `.env.example` |
| Seeds | as in d.2 |
| Docs | `docs/DATABASE.md` |

## f. Naming collisions resolved

Each row gives the name this model uses, then the names it replaces and where each losing name came from, then the reason. The review (critique issue 3) found 22 places where the workstreams plan used a losing name; the plan now uses the names here, and these rows bind every stream. Sources:
- **LEAD**: `plan/LEAD_DECISIONS.md`. Where a row only applies a lead decision, it says so.
- **WS**: `plan/workstreams.md`.
- **Maps**: the seven area maps in `/tmp/claude-0/-home-user/c0053d10-843a-5172-a813-3a6059744062/scratchpad/maps/` (academies, community, content, daily, events-opps, mentors, platform).
- **Repo**: names that exist in the code today.

### f.1 Models and tables

| This model | Losing names (source) | Why |
|---|---|---|
| `Academy`, `AcademyMembership` | "campus" (directive) | LEAD #1. "Campus" is the 3D world |
| `academyId` stored on `Course`, `Challenge`, `CommunityGroup`, `CommunityCategory`, `CommunityPost`, `XpEvent`, backfilled in 000100 | joining to an academy through `Course.pillar` (LEAD #1 interim rule; WS P0) | A stored column can be indexed and filtered, and lets a course move academy without changing its pillar |
| `Instructor` (extended) with `MentorProfile` | a separate Author model (content map); separate mentor and expert profiles | LEAD #2 |
| `ExpertCredential` | MentorCredential (mentors map) | Instructors have credentials too |
| `ContributorApplication` | RoleApplication (platform map) | LEAD #3 |
| `Partner`, `PartnerMember` | PartnerProfile (platform map) | LEAD #3 |
| `LiveEvent`, `LiveEventHost`, `EventRegistration`, `EventFeedback` | LiveSession, SessionRegistration, SessionReview (mentors map); MentorSession, MentorReview (platform map); Event (events-opps map) | LEAD #4. "Session" is the sign-in table |
| `MentorAvailabilityRule`, `MentorAvailabilityException` | MentorAvailability (platform map) | Weekly rules and dated exceptions are different rows |
| `EventKind` (a table) | LiveEventType (events-opps map); SessionKind, OfferingKind (mentors map) | Departure 2 in 0.5 |
| `ScheduledNotification` | NotificationDelivery (community map; WS P0), the events map's own outbox | LEAD #5: one outbox |
| `Announcement` | NotificationBroadcast (platform map) | LEAD #10 |
| `NotificationPreference`, one row per topic and channel | per-topic boolean columns and a category enum (community map) | LEAD #10 |
| `Project`, `ProjectSkill` | MemberProject (community map; WS); ShowcaseItem, ShowcaseKind (academies and mentors maps) | LEAD #6. The expert showcase reads public projects. A member's pinned items are `Profile.pinnedItems` |
| `Goal`, `GoalCheckIn` | MemberGoal (content map) | LEAD #7 |
| `ModuleSkill` | CourseSkill (events-opps map) | Departure 7 |
| `PostCategory` | EditorialCategory (platform map) | LEAD #11 |
| `Tag`, `PostTag` | `Post.tags String[]` (platform map) | LEAD #11; tags get pages and counts |
| `ContentSubmission` | `Course.reviewStatus` and CourseRevision (platform map) | One review queue for course submissions, course updates and resources |
| The founder's `Instructor` row, `isFounder = true` | the "founder setting" and a FOUNDER author (content map) | The founder's profile, photo and bio live where every expert's do. Copy for /about may still be a site setting |
| Grants derived from rows | `CapabilityGrant` table (WS P0) | Departure 5 |

### f.2 Enums and enum values

| This model | Losing names (source) | Why |
|---|---|---|
| `MissionKind` | ActivityKind (daily map) | `ActivityKind` would collide with the feed's kinds |
| `ActivityEventKind` | ActivityKind (community map) | Matches the model name `ActivityEvent` |
| `ActivityEventKind.MENTOR_JOINED`, `EVENT_PUBLISHED`, `DISCUSSION_FEATURED` | MENTOR_ANNOUNCEMENT, WORKSHOP_ANNOUNCED, DISCUSSION_HIGHLIGHTED (community map) | Named after what happened; an event is not always a workshop |
| `EvidenceStatus`, `ContentSubmissionStatus` | SubmissionStatus (daily and mentors maps) | Two queues with different states |
| `ContentSubmissionType` | SubmissionType | Same reason |
| `ContributorApplicationStatus`, `OpportunityApplicationStatus` | ApplicationStatus (events-opps and mentors maps) | Same reason |
| `Post.kind` of type `PostKind` | `Post.type` of type PostType (content map) | LEAD #11 says "kinds" |
| `PostKind.BUSINESS_GUIDE` | PRACTICAL_GUIDE (WS) | The directive's wording |
| `CommunityPostKind` | PostKind (community map) | `PostKind` belongs to editorial posts |
| `ProjectVerificationStatus` plus `Project.publishedAt` | ProjectStatus (academies and community maps) | Publishing and verification are separate questions |
| `LiveEventStatus.SUBMITTED` | PENDING_REVIEW (mentors map) | One word for "waiting for review" across queues |
| `LiveEventStatus.SCHEDULED` | PUBLISHED (events-opps map) | A published event is scheduled until it completes or is cancelled |
| `LiveEventStatus`, `LiveEventVisibility`, `EventRegistrationStatus`, `LiveEventHostRole` | SessionStatus, SessionVisibility (mentors map); RegistrationStatus (events-opps and mentors maps); HostRole (events-opps map) | LEAD #4 |
| The event kind `fitness-session` | FITNESS_CHALLENGE (events-opps map) | The challenge is a `Challenge` row; the live session is an event |
| `ContributorKind` | ContributorType (mentors map) | LEAD #3 says "kind" |
| `PartnerStatus.VERIFIED` | APPROVED (platform map) | LEAD #3: PENDING to VERIFIED |
| `OpportunityKind`, the directive's ten | OpportunityCategory (events-opps map); LEAD #6's PROJECT, GIG, JOB, COLLABORATION, AFFILIATE | Departure 4. `FREELANCE_PROJECT` replaces PROJECT (WS N5) |
| `OpportunityStatus.SUBMITTED` | PENDING_REVIEW (platform map) | Same word as the other queues |
| `ProductKind.LIVE_EVENT` | SESSION and EVENT (WS P0 and P4-MONEY) | Departure 6 |
| `RevenueScope` (MENTORING, EVENT, COURSE) | SESSION, WORKSHOP and EarningSource (mentors map) | No "session"; a workshop is an event |
| `GoalMetric.MANUAL` | CUSTOM (content map) | Says how progress is recorded |
| `GoalStatus.ACHIEVED` | DONE (content map) | Matches `achievedAt` and the GOAL_ACHIEVED event |
| `PlanItemKind.EVENT` | MENTOR_SESSION (daily map) | A mentoring session is an event |
| `ConsentSource` (CONTACT_FORM, WRITTEN, IN_APP) | `source` with MEMBER_SUBMITTED, STAFF_ENTERED (platform map) | Records how consent was given, which is what a later dispute needs |
| `AttendanceSource`, one field with CODE, HOST, JOIN_LINK, MEMBER_CONFIRMED, INTEGRATION | separate attendance flags (WS D2) | One field says how attendance was recorded |

### f.3 Fields and flags

| This model | Losing names (source) | Why |
|---|---|---|
| `featuredAt`, `featuredById` | highlightedAt, highlightedById (community map) | Same word on posts, projects and opportunities |
| `User.isDemo` | demoAt (community map) | LEAD ground rules say `isDemo=true` |
| `progress.checkins` (kept) | checkIns (daily map) | The key existing rows already use |
| A cap of 3 active goals | 5 (content map) | The dashboard shows three (daily map) |
| Demo names end in " (Demo)", e.g. "Mentor A (Demo)" | names that start with "Demo" (WS) | The label stays visible when a long name is cut |
| `Referral.signupIp` deprecated, then dropped later | dropped now | No deployed build may still write it (b.1) |

### f.4 Domain events and activity kinds

| This model | Losing names (source) | Why |
|---|---|---|
| MENTOR_APPROVED | MENTOR_VERIFIED (WS) | Approval is the event; verification is of credentials |
| MENTORING_BOOKED, MENTORING_COMPLETED | SESSION_BOOKED (WS; mentors map); SESSION_COMPLETED (WS; daily and platform maps) | No "session" (LEAD #4) |
| GOAL_ACHIEVED | GOAL_COMPLETED (WS) | Matches `GoalStatus.ACHIEVED` |
| PROJECT_PUBLISHED | PROJECT_SHARED (community map) | Matches `Project.publishedAt` |

The other 15 new events, PROJECT_PUBLISHED among them, keep the workstreams plan's names (e.6).

### f.5 Permissions, grants and guards

| This model | Losing names (source) | Why |
|---|---|---|
| `contributors.review` | mentors.review (WS) | It covers instructor and creator applications too |
| `courses.publish` for course and resource submissions; `events.manage` for submitted events | contributors.review for "course, resource and workshop submissions" (WS) | Each queue stays with the permission that publishes what it reviews (DR-34 for courses). In this model `contributors.review` decides contributor applications |
| `admin.economy` | admin.engagement and progression.manage (WS) | Missions, challenges, ranks and achievements already sit under `admin.economy` in the repo |
| `courses.author` and `content.write` | content.submit (WS) | Existing names cover it |
| `assertPartnerMember(actor, partnerId)` | partner.applications.read (WS) | A scope check, not a permission |
| Staff areas need ADMIN (or MODERATOR for moderation); a `StaffGrant` table is owner decision O37, default not built | grants for staff areas in `CapabilityGrant` (WS) | Departure 5 |
| `APPROVED_MENTOR_PERMISSIONS` (`progression.verify` for an approved mentor only) | `progression.verify` on every holder of the mentor grant (first draft of e.1) | A DRAFT mentor must not verify skills (critique issue 30) |
| `GroupAction` `createEvent` and `createChallenge` (OWNER, MODERATOR) | no group action for them (first draft of e.2) | WS P3-GROUPS lets group owners and moderators propose events and challenges |
| `authoring.canEditCourse`, `authoring.assertCanEditCourse`, `authoring.linkInstructorUser` (repo, DR-34) | linkInstructorToUser (WS); linkInstructorProfile (mentors map) | They exist and are tested |

### f.6 Functions, files and keys

| This model | Losing names (source) | Why |
|---|---|---|
| `publicWhere.mentor()`, `.liveEvent()`, `.opportunity()`, `.partner()`, `.post()`, `.feedback()` | visibleMentorWhere, visibleEventWhere, visibleOpportunityWhere, visiblePartnerWhere, livePostWhere, publicFeedbackWhere (WS) | One object, one import |
| `memberZone` (repo) | zoneOrDefault (WS) | It exists |
| `userId` in `NotifyInput` | memberId (WS) | Every table calls it `userId` |
| `groupKey` | coalesceKey (WS) | The column is `Notification.groupKey` |
| `schedule({ dedupeKey, runAt, ... })` | enqueue({ key, dueAt, ... }) (WS) | Column names of `ScheduledNotification` |
| `dispatchDue(opts, deps, db?)` | dispatchDue(now, limit) (WS) | It needs the mailer and push ports |
| `effectiveChannels`, `preferencesFor`, `setPreference` | resolve, get, set (WS) | Says what they return |
| `notificationLink` (repo) | notificationHref (WS) | It exists |
| Topic catalogue in code plus `NotificationTopic` rows | a catalogue in code only (WS, D5) | Staff can relabel or silence a topic without a release |
| `ensureHousePartner(actor, input)`, created on first use | ensureHouse() in the taxonomy seed (WS; events-opps map) | The house partner needs a real contact email, which is not in the repository |
| `ipKey` (repo name kept; now keyed, with a fallback secret) | "no key, no hash" (WS P0) | Sessions keep a usable key for the self-dealing check in every environment |
| `assertDemoSeedAllowed` in `packages/config/src/demo.ts` | the same function in `seed-demo/index.ts` (WS) | Testable without a database, and shared with `demoVisible` |
| `MentoringService` in `packages/core/src/mentors/mentoring.ts`; member pages under `/bookings` | SessionService, `/sessions` (WS P2-BOOK) | LEAD #4: "session" is the sign-in table |
| `cancelForSubject(subject, { userId? })` | cancelByPrefix (first draft of e.5) | A LIKE on the key cannot use the (subjectType, subjectId) index |
| `/admin/revenue-terms`, `/admin/contributor-earnings` | /admin/revenue-share (WS O4 to O7) | The two pages hold different things: terms and earnings |
| `OpportunityApplication.sharedFields` (`ApplicantContactField[]`) | shareContact (first draft) | The member chooses each field the partner sees |

### f.7 Notification topics

| This model | Losing names (source) | Why |
|---|---|---|
| `mentoring.new_mentor` | mentor.new (WS) | Groups with the other `mentoring.*` topics |
| `mentoring.request` | booking requests filed under `mentoring.booking` | A request and its answer are a separate notice from a confirmed booking |
| `opportunity.application`, `contributor.application` | application.status (WS) | Two different audiences and senders |

### f.8 Seeds and deploy

| This model | Losing names (source) | Why |
|---|---|---|
| The taxonomy seed runs on every production deploy, outside SEED_ON_DEPLOY | "added to the SEED_ON_DEPLOY list" (WS P0f) | WS contradicts itself (D5 says outside the block). Departure 3 |

## g. Open questions

Each item says who must answer it and what happens until then.

1. **The rank ladder (OQ-A).** `RankDefinition.criteria` and `RankAward` are in place, and members who hold a rank keep it as a GRANDFATHERED award. Which ranks exist and what each requires is the owner's decision. Until then the existing ranks and their XP rules stay.
2. **`btree_gist` on Neon.** Confirm the extension on the production branch before the first deploy. If it is refused, leave migration 000800 out; the row lock in the booking code still prevents double booking.
3. **Privacy defaults.** The new facets activity, skills, projects, challenges, follows and directory are on by default. They need a DPDP review before launch.
4. **Academy names (OQ-B).** The academies use the directive's names, while the pillar badges still say Builder, Tycoon and Mind. The owner should confirm the names, and whether "Investment Advisory" in the Wealth flagship's name is acceptable under SEBI rules.
5. **The CREATOR label.** It changes to "Affiliate" (e.1). Confirm.
6. **Staff grants (owner decision O37).** Delegating one staff area, such as `events.manage`, to someone who is not a moderator or administrator needs a small `StaffGrant` table. It is not in this model. Default: not built; staff areas need ADMIN, or MODERATOR for the moderation areas.
7. **Money terms.** Revenue share, payout terms and the cancellation and refund policy for paid sessions and events are the owner's to set (LEAD #15). Until a `RevenueShareAgreement` exists, paid offerings cannot be published. An agreement holds the share, `holdDays`, `minPayoutCents` and `refundWindowHours`; publishing is refused while any of them is null. There is no separate platform fee field: the platform keeps 10000 − `contributorShareBps` basis points. A mentor's cancellation window is `MentorProfile.cancellationHours` (null: until the start).
8. **A frequent dispatcher.** Vercel crons on the current plan run daily, so a reminder 60 minutes before an event needs Vercel Pro or an external scheduler calling `/api/cron/dispatch`. Until then dispatch runs when a member opens the bell and after requests (e.5), which may be late on a quiet site.
9. **Event kinds as a table** (departure 2). Confirm.
10. **The founder link (B10).** The founder's `Instructor` row is linked to an account with `authoring.linkInstructorUser` (DR-34) at `/admin/courses/instructors`, once that account exists and its email is verified.
11. **Editorial categories.** The eight in d.1.4 are a proposal. Confirm or replace before the first articles are filed.
12. **Rows inserted by migrations** (departure 1 and 2): the four academies and the one-to-one event kind. Confirm.
13. **Dropping `Referral.signupIp`.** Drop it in a later migration, once a release has shipped in which no build writes it.
14. **Essential topics.** The seven transactional topics in e.5 ignore pause, email opt-out and quiet hours. Confirm the list.
15. **Testimonials on account deletion.** `Testimonial.userId` is set to null when the account is deleted, so the quote survives. Proposed: deleting the account also sets `consentWithdrawnAt`, which unpublishes it. The owner should confirm.
16. **INSTRUCTOR and `/admin`.** Instructors keep `admin.access` for `/admin/courses`. Once `/studio` covers authoring, the owner may remove it.
17. **Deleting a contributor's account (owner decision O36).** `ContributorAccount.user` is RESTRICT, so deleting the user is refused while the account exists (c.4, rerun). The published privacy policy promises anonymisation, so the account-deletion flow anonymises a contributor: it clears the profile, payout method and contact fields and keeps the earnings, agreements and payouts for the books. Default: keep and anonymise.
18. **Deploy timing.** Three changes are safe only if these migrations ship before production first runs (c.5): `MissionCompletion.occurrence` SET NOT NULL, RESTRICT on `CommunityPost.groupId`, and the `Post.status` backfill. If a production build goes live first, split them into a second migration or use a maintenance window.
19. **The `fix/seed-review` branch.** Settled: `build/full-platform` merged it at `dd5810e`, and the merge of full-platform before P0a brings it in.
20. **The key switch for IP hashes.** Moving `ipKey` to HMAC changes the affiliate click dedupe once (e.10). Before launch this has no effect.
21. **`docs/DATABASE.md`.** It says paid time comes from `Payment.createdAt`, which is wrong (defect 3). Correct it when the migrations land.
22. **Reviewed course edits and DR-34 (owner decision O35).** DR-34 lets a published programme change only through an administrator. LEARN builds `ContentSubmission` (type COURSE_UPDATE) so an author can propose an edit to a published programme as a reviewed revision, and only an administrator can approve it, which keeps DR-34's rule. `Instructor.trustedAuthor` (BLOCKED_ON_YOU item 12) would let a named author skip that review; it stays unused until the owner decides.
23. **The skill catalogue.** The 31 skills in d.1.6 are derived from the module titles of the four programmes. The owner should review the list before members can declare skills.
24. **Photo hosts (owner decision O38).** Expert photos load only from hosts in `IMAGE_REMOTE_HOSTS`. Default: none, so profiles show initials until the owner names hosts or uploads ship.
25. **Paid financial-literacy offerings (owner decision O39).** `MentorCategory.paidAllowed` is false for `financial-literacy`. Default: free only, until the owner confirms the regulatory position.
26. **Booking mode.** Mentors book INSTANT by default. REQUEST holds the slot for `min(slot start − minNoticeHours, now + 48 hours)`, and a member may have at most three open requests. The owner may change either number.
