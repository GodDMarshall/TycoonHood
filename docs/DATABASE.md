# Database

PostgreSQL 16 through Prisma. There are 74 models in `packages/db/prisma/schema.prisma`.

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
- **Privacy:** no raw IP addresses are stored. Sessions keep an `ipHash`, and affiliate clicks keep a salted visitor hash (`AFFILIATE_HASH_SECRET`).

## Known schema follow-ups

- `CommunityCategory` and `CommunityGroup` have no `archivedAt`. Archiving is held in the SiteSetting `community.archived` for now.
- `CommunityPost` has no `editedAt`.
- `Order` has no `paidAt`. Paid time is read from the captured `Payment.createdAt`.
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
