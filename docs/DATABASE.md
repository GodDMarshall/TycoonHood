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
| `20261111190000_pending_email` | `User.pendingEmail`: an email change waiting for its link to be used. Nullable and not unique; additive only |
| `20261111200000_email_hold` | `EmailHold`: the address an email change replaced, held for its account for 7 days, with the hash of the single-use link that undoes the change. One new table; additive only |

`20261111000000_full_platform` is **additive only**: no column is dropped or renamed. CHECK constraints guard the money columns (amounts ≥ 0, rate between 0 and 10 000 bps, coupon percent 1–100).

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

`seed:academy` refuses to overwrite a curriculum that members have already progressed through unless you set `SEED_ACADEMY_FORCE=1`.
