# Database

PostgreSQL 16 through Prisma. There are 141 models and 106 enums in `packages/db/prisma/schema.prisma`. The living-ecosystem part (67 models, 83 enums and the changes to existing models) is specified in [`ecosystem/data-model.md`](ecosystem/data-model.md).

## Migrations

Migrations are hand-written SQL under `packages/db/prisma/migrations/`. They are applied in order by `pnpm db:migrate:sql`, which records each one it applies. The production equivalent is `pnpm db:deploy`.

| Migration | Adds |
|---|---|
| `20260817000000_init` | Users, sessions, LMS, gamification, ledger, products, orders |
| `20260817090000_blog` | Blog posts |
| `20260817100000_miner` | Miner state |
| `20260817110000_product_content` | Product content fields |
| `20260915000000_pool_floor` | Pool floor constraint |
| `20260924000000_launch_foundation` | Variants, addresses, referrals, watch-to-earn |
| `20260924010000_watch_xp_source` | XP source for watch tasks |
| `20261001000000_academy_community` | Chat channels, messages, reports, mutes, daily standard |
| `20261111000000_full_platform` | Everything below |
| `20261111180000_payment_refunded_cents` | `Payment.refundedCents` and `Payment.refundIds`: partial and dashboard refunds are counted once per provider refund id, and an order is unwound only when fully refunded. A CHECK keeps the amount between 0 and the payment. Payments already marked REFUNDED are backfilled as fully refunded |
| `20261111190000_pending_email` | `User.pendingEmail`: an email change waiting for its link to be used. Nullable and not unique; additive only |
| `20261111200000_email_hold` | `EmailHold`: the address an email change replaced, held for its account for 7 days, with the hash of the single-use link that undoes the change. One new table; additive only |
| `20261112000000_contact_message_user` | `ContactMessage.userId`: the account a deletion request is for, so it stays the account's after an email change. Nullable, indexed, SET NULL when the account is deleted. Requests already filed are backfilled from the account id their text names; additive only |
| `20261112100000_email_hold_notice_sent` | `EmailHold.noticeSentAt`: when the mail provider accepted the notice carrying the hold's undo link. A change whose notice is still not recorded a few minutes after it took effect is put back (`platform/email-notice.ts`). Nullable; holds already made are backfilled as told; additive only |
| `20261112110000_pending_email_at` | `User.pendingEmailAt`: when the waiting email change was asked for, set and cleared with `pendingEmail`. A change away from an address never confirmed can be confirmed only a day after it (`UNCONFIRMED_CHANGE_WAIT_MS`, `platform/email-verification.ts`). Nullable; a change already waiting counts as asked for when the migration ran; additive only |
| `20261113000000_ecosystem_enum_values` | Nine enum values and nothing else: `NotificationType` gains LEARNING, MENTORSHIP, EVENT, OPPORTUNITY, CONTRIBUTOR, PROJECT, GOAL and ANNOUNCEMENT, and `ProductKind` gains LIVE_EVENT. PostgreSQL cannot use an enum value in the transaction that added it, so they come before every migration that uses them |
| `20261113000100_platform_foundation` | The four academies, inserted here because the backfills need them, with academy links on courses, challenges, groups, categories, posts and XP events, all backfilled; members already enrolled join their courses' academies (dropped enrolments do not count). The notification centre, the activity feed and analytics tables, profile fields, staff-confirmed stock, and `Order.paidAt` (below), backfilled where the paid time was recorded. Two privacy clean-ups empty `Referral.signupIp` and `Session.ipHash` (see Privacy) |
| `20261113000200_progression` | Skills, member skills, projects, rank awards, achievement kinds and learning paths. Each member's current rank is recorded as a GRANDFATHERED award |
| `20261113000300_mentors_events` | Expert profiles, mentors, contributors, revenue terms and earnings, cohorts, the content review queue, calendar feeds and live events. A payout has exactly one payee, an affiliate or a contributor (`PayoutRequest_one_payee`); the affiliate programme reads only affiliate payouts. A user with a `ContributorAccount` cannot be deleted (RESTRICT): deleting a contributor's account must anonymise it instead, so the financial records stay. Existing instructors get the contributor kind INSTRUCTOR, and `harsha` is marked as the founder |
| `20261113000400_daily_engine` | Mission cadences and schedules, challenge kinds and scopes, evidence submissions, daily plans and goals. `MissionCompletion.occurrence` is filled from each completion's idempotency key, then made NOT NULL; a payout now writes it (`rewards/rewards.ts`) |
| `20261113000500_community` | Post kinds, edits, last activity, replies and accepted answers; group topics, review, join policy, roles and member counts; follows, blocks and saved posts. `CommunityPost.groupId` becomes RESTRICT: a group with posts is archived, never deleted. The archive list in the SiteSetting `community.archived` is copied to `archivedAt` |
| `20261113000600_opportunities` | Partners, opportunities and applications |
| `20261113000700_editorial_guide` | The blog workflow (`Post.status`, backfilled from `publishedAt`), categories, tags, revisions, testimonial consent, help articles and the Guide tables. A live or queued post must have a time (`Post_live_has_time`), so the essay editor (`savePostAction`) and the content seed write `status` with `publishedAt`, by the backfill's rule. Full-text search columns on lessons, posts and help articles (instructors got theirs in 000300, opportunities in 000600) |
| `20261113000800_live_event_overlap_guard` | The `btree_gist` extension and an exclusion constraint: a mentor cannot hold two submitted or scheduled events whose times overlap. Kept alone so it can be left out of a release if the production database refuses the extension; the booking code's row lock still prevents double booking without it |

**Pending: `20261113000900_challenge_evidence_move`.** It is kept in [`ecosystem/pending-migrations/`](ecosystem/pending-migrations/README.md), not in `packages/db/prisma/migrations/`, so no database applies it yet. It moves the challenge submissions kept as JSON in `ChallengeParticipation.progress` into `EvidenceSubmission` rows. It lands in the same merge as DAILY-B's change that makes `gamification/challenges.ts` read and write `EvidenceSubmission`. Applied earlier, it would empty the store today's challenge code reads, and submissions made after it ran would stay behind in the JSON, because a migration runs only once. The README there has the details.

The ten living-ecosystem migrations, how they were checked and their deploy notes are in sections c.1 to c.5 of [`ecosystem/data-model.md`](ecosystem/data-model.md). They assume no build from before them writes to the database after they run, and nothing in the deploy makes sure of it. `scripts/vercel-build.sh` migrates before it builds, so the previous production deployment keeps writing while the new one builds, and after that if a later step fails. Older previews use the production database too. A build from before these migrations that writes after them:

- inserts mission completions without `occurrence`, which the NOT NULL refuses, so the mission pays nothing and the fail-soft event bus hides the error;
- writes the raw signup IP to `Referral.signupIp`, which 000100 emptied;
- stores an unkeyed SHA-256 of the IP in `Session.ipHash`, which 000100 emptied because such a hash can be reversed;
- marks orders PAID without `Order.paidAt`.

Section c.5 ("Live production") lists these with the community and blog effects, the ways to close the gap, and the clean-up to run once the current code is live. A short maintenance window first needs a way to stop older builds writing, which the deploy does not have. The choice is the lead's (g.18).

`20261111000000_full_platform` is **additive only**: no column is dropped or renamed. CHECK constraints guard the money columns (amounts ≥ 0, rate between 0 and 10 000 bps, coupon percent 1–100).

A backfill covers only the rows that exist when its migration runs. The three migrations of 12 November leave the new column empty in rows that code from before them writes afterwards, and the current code reads it as meaningful: see "Rows older code writes after a migration" in [`DEPLOYMENT.md`](DEPLOYMENT.md), which has the three backfills to run again.

`20261112100000_email_hold_notice_sent` justifies its backfill wrongly. Its comment says the code that made the existing holds sent the notice in the same request and put the change back when it could not. That is the code that came with the migration (`d9e91e9`), so it made none of them. The code before it (`ca788c8`) sent the notice after the reply, in `after()`, and never read whether it went out, so a hold it made may belong to a change whose old address was never told. The backfill counts those as told all the same. It changes nothing on a database the current code builds from nothing, as the first production deploy does, because that database has no holds yet. The file is left as it is: the migration has been applied, and `pnpm db:migrate:sql` refuses to run on any database where an applied migration's file has changed.

## What the full-platform migration added

- **Roles:** `UserRole` gained STUDENT, CREATOR, INSTRUCTOR and MODERATOR. `User.suspendedAt` was added.
- **LMS:**
  - `Instructor` and `CourseReview` (one review per member per course).
  - `Course.instructorId`.
  - `CourseModule.objectives` (JSON).
  - `Lesson.isFinal`, which marks the final assessment.
- **Earn:**
  - `AffiliateProfile`: one per user, with a unique code, a status, and the payout method with its fingerprint.
  - `AffiliateClick`: stores a visitor hash only, never a raw IP.
  - `Commission`: one per order; paise and bps; PENDING → APPROVED → PAID, or REJECTED / REVERSED; carries `holdUntil`.
  - `PayoutRequest`.
- **Shop:**
  - `CartItem` and `WishlistItem`.
  - `Coupon` and `CouponRedemption`.
  - `Payment`: provider, mode TEST/LIVE, status, amount in paise.
  - `RefundRequest`.
  - On `Order`: `couponCode`, `discountCents` and `affiliateCode`.
  - On `Product`: `category` and `sellerName`.
- **Community forum:**
  - `CommunityCategory`, `CommunityGroup` and `GroupMembership`.
  - `CommunityPost` and `CommunityComment`, with a moderation state.
  - `Reaction`, unique per user, target and kind.
  - `ContentReport`, unique per reporter and target.
- **Platform:** `AuditLog`, `SiteSetting` (key → JSON, used for the home CMS, maintenance mode and the community archive list), `ContactMessage` and `Testimonial`.
- **Enums:** `XpSource.COMMUNITY` and `NotificationType.EARNINGS`.

## Conventions

- **Money** is integer minor units: paise for INR in `*Cents` columns. THC is `BigInt`.
- **Idempotency:** ledger transactions, mission completions and commissions all have unique keys, so a retried event never pays twice.
- **Soft state:** moderation uses a `state` column (VISIBLE, HIDDEN, REMOVED) instead of deleting rows.
- **Privacy:** no raw IP addresses are stored. An IP is kept only as `ipKey(ip)` (`packages/core/src/platform/ip-key.ts`): the first 32 hex characters of HMAC-SHA256 under `IP_HASH_KEY`, else `AFFILIATE_HASH_SECRET`, else a secret derived from `DATABASE_URL`. A plain SHA-256 is not enough, because every IPv4 address can be tried. Sessions store it as `ipHash`, and affiliate clicks store a visitor hash of it with the user agent and the day, so the self-dealing check can still match a buyer's session to a click. `20261113000100` emptied the unkeyed session hashes and `Referral.signupIp`, which held raw addresses; nothing writes `signupIp` again, and a later migration drops the column. Changing `IP_HASH_KEY` changes every key from then on: an affiliate visitor can count once more on the day of the change.
- **Paid time:** `Order.paidAt` is the moment an order became PAID. It is written by the same write that makes the order PAID, on every path: `CommerceService.checkoutWithThc` and `ShopCheckoutService.checkoutThc` (THC), `CommerceService.settleFiatOrder` (the Stripe webhook, the dev provider and staff settling by hand), and `ShopCheckoutService.capture` (the Razorpay callback and webhook, the sandbox and the stale-order sweep). A second settle or capture does not move it. Read paid time from `paidAt`, never from `Payment.createdAt`: a Payment row is written when the order starts, and THC orders and legacy rupee orders have none. Orders paid before `20261113000100` got the ledger transaction's time (THC) or the first `order.paid` or `order.settle_manual` audit row (rupees); where neither was recorded, as for a rupee order settled through the Stripe webhook or the dev provider, `paidAt` stays null.

## Drift check

`prisma migrate diff` from a migrated database to `schema.prisma` always reports these five lines, because Prisma cannot express a generated column and the five `searchVector` columns are generated from their tables' text:

```
ALTER TABLE "HelpArticle" ALTER COLUMN "searchVector" DROP DEFAULT;
ALTER TABLE "Instructor" ALTER COLUMN "searchVector" DROP DEFAULT;
ALTER TABLE "Lesson" ALTER COLUMN "searchVector" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "searchVector" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "searchVector" DROP DEFAULT;
```

Any script that compares the migrations with the schema (for example with `--exit-code`) removes comment lines, blank lines and exactly these five lines, matched by their full text, and then treats anything left as drift. Never filter by pattern: a real change to a `searchVector` column, or to anything else on those tables, must still fail.

`pnpm db:rehearse` (`scripts/db/rehearse-migrations.mjs`) does this, together with the checks in data-model c.4, on a throwaway database it creates and drops itself (`tycoonhood_rehearse_<random>_test`, and only on a local server):

- `pnpm db:rehearse` starts from an empty database: the migrations before `20261113000000`, then `scripts/db/rehearse-fixtures.sql`, then the living-ecosystem migrations, each file in one transaction. It checks the constraints, what each backfill produced for the fixture rows, the rules the constraints enforce, and the drift.
- `--with-pending` also applies `docs/ecosystem/pending-migrations` and checks the challenge evidence move.
- `--from <database>` copies a local database (`CREATE DATABASE ... TEMPLATE`, which needs no other session connected to it), migrates the copy with `pnpm db:migrate:sql`, and checks rules every row must meet rather than fixture rows.

Every check prints what it expected and what it found; the command exits 1 when any check fails. A rule over a table with no rows proves nothing, so it is reported NOT EXERCISED, never PASS, and so is a group of checks that cannot run (a copy that already had these migrations). The summary lists them, and the command exits 1 unless `--allow-empty` is passed. A copy of a database that holds seed data only has no orders, sessions, referrals, enrolments or mission completions, so it leaves those backfills unexercised: before a release, rehearse from a copy of a populated database from before these migrations (the local development database with nothing connected to it, or a sanitized production snapshot).

A schema change after these migrations is a new migration file, named after the last one. Never edit a file that has been applied anywhere: `migrate-sql.ts` checksums each file, comments included, and refuses a database where an applied file has changed.

## Known schema follow-ups

- `CommunityCategory.archivedAt` and `CommunityGroup.archivedAt` exist since `20261113000500`, which filled them from the SiteSetting `community.archived`. The code still reads and writes the setting until the community work moves to the columns; the setting row is removed by a later release.
- `CommunityPost.editedAt` exists since `20261113000500`; nothing writes it yet.
- `Referral.signupIp` is empty and unused; a later migration drops it once no deployed build writes it.
- System ledger accounts (TREASURY, REWARDS_POOL, …) are singletons by type, but the schema does not enforce it. `db:seed` creates them one seed at a time, under a lock (DR-33). A partial unique index on `LedgerAccount(type) WHERE "userId" IS NULL` would make it a rule.

## Seeds (run in this order on a fresh database)

```
pnpm db:migrate:sql
pnpm db:seed              # ranks, levels, missions, achievements, base courses, admin (ALLOW_DEFAULT_ADMIN=1)
pnpm db:seed:academy      # the four programmes' full curriculum + founder instructor
pnpm db:seed:content      # blog posts, challenges, standard items
pnpm db:seed:merch        # physical merch with sizes
pnpm --filter @tycoonhood/db seed:shop        # categories, INR placeholder prices, WELCOME10 coupon (inactive)
pnpm --filter @tycoonhood/db seed:community   # forum categories, programme groups, weekly missions
```

Every seed is safe to run again on a live database: a re-run adds what is missing and never rewrites what staff edit in the admin (`docs/DEPLOYMENT.md`, "Running the seeds again"). `seed:academy` builds each programme once and records it in the SiteSetting `seed.academy.built`; after that the curriculum is staff's, in Admin → Courses. `SEED_ACADEMY_FORCE=1` rebuilds it from the curriculum files, which undoes every edit and erases members' progress in it. The other seeds record the missions, sizes, essays, community categories and groups they made in the SiteSettings `seed.created.<kind>` (`{ keys: [...] }`, `packages/db/src/seed-record.ts`) and never make a recorded one again, even after staff change its slug or SKU. Deleting one of those settings makes the next run count what is in the database as made.
