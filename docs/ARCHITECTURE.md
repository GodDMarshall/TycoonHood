# Architecture

Last updated 11 November 2026 (full-platform build, DR-29; the optional 3D campus, DR-30).

## Shape

A pnpm monorepo with one product app.

| Package | What it is |
|---|---|
| `apps/web` | Next.js 15 App Router. The public site, the member app and the admin centre. Server components and server actions; no separate API server. |
| `apps/miner` | Now only redirects to `/mining` in the web app (DR-27). |
| `packages/core` | Every domain rule: auth, permissions, LMS, gamification, ledger, shop, earn, discussions, platform. Pure TypeScript over Prisma, tested with vitest against a real Postgres. |
| `packages/db` | Prisma schema, hand-written SQL migrations, the generated engine-free client (committed under `src/generated`), seeds and the curriculum source (`src/curriculum/*.ts`). |
| `packages/ui` | Design tokens and shared components. |
| `packages/config` | Economy and programme constants (XP curve, THC rewards, affiliate rate, hold days, minimum payout). |

## Route groups in `apps/web/app`

- `(public)`: the marketing site, open to guests. It covers Home, About (the founder), Learning, Programmes, Earn and its terms, Marketplace, Community (`/connect`), Blog, Success stories, Contact, FAQ, Terms, Privacy and Refund policy.
- `(auth)`: login, register, reset password and email verification.
- `(app)`: everything that needs a session.
  - Today, Courses, Certificates, Community (chat, discussions, groups), Leaderboard, Achievements, Mining, Store, Cart, Wishlist, Checkout, Orders, Earnings, Wallet, Profile, Notifications, Settings.
  - Admin lives under `/admin`.
  - `/world` is the optional 3D campus (DR-30). Its 2D page is the first paint, and the whole page on phones, tablets and software GPUs.
- `api/webhooks/razorpay`: the payment webhook. The signature is checked before anything is read.
- `/r/[code]`: the affiliate link. It records a hashed click (raw IPs are never stored), sets a 30-day cookie and redirects.

## Security model

- **Sessions** are resolved on the server from an httpOnly cookie (`packages/core/src/auth/session.ts`). A suspended user resolves to no session.
- **Authorisation** is enforced in the data-access layer, `apps/web/lib/guard.ts`, never in a layout. `requireUser()`, `requirePermission(p)` and `actorWith(p)` run at the top of every protected page and server action.
- **Permissions** are one table, `packages/core/src/auth/permissions.ts`. Code asks `can(user, "admin.commerce")` and never compares role strings. The admin navigation (`apps/web/lib/admin-nav.ts`) shows only the sections a role can open, and each admin page checks again on its own.
- **Money** has two separate rails:
  - **THC** is internal, non-monetary credit kept in a double-entry ledger (`ledger/ledger.ts`). Every grant, spend and reversal is a balanced transaction with an idempotency key.
  - **INR** is real money through Razorpay (`shop/payments/*`). It is stored in integer paise.
  - The payment mode comes from the provider: sandbox and `rzp_test_` keys are TEST, and only `rzp_live_` keys are LIVE. Revenue counts LIVE captured payments only.
- **Audit:** every admin action that changes a user, money, content or settings writes an `AuditLog` row (`platform/audit.ts`).
- **CSP** is in `apps/web/next.config.mjs`. It allows Razorpay's checkout script and frames, and YouTube for lesson video.
- **The 3D campus** (`/world`, DR-30) calls `requireUser()` in the page. Its loader, `packages/core/src/world/load.ts`, only reads: the member's own figures and house-wide counts, never another member's name or email. The CSP did not change for it.
  - **Bundle rule:** three.js reaches the browser only through `components/world/world-host.tsx`, by `import()` once the device and GPU gates pass. An ESLint rule (`eslint.config.mjs`) rejects any other import of `three`, `postprocessing`, `n8ao` or the engine folders, and `node scripts/world/check-bundle.mjs`, run after `pnpm build:web`, fails if any route's chunks carry three.

## How the pieces talk

- **Event bus** (`events/bus.ts`): domain actions emit typed events, such as LESSON_COMPLETED, COURSE_COMPLETED, DAILY_ACTIVE and DISCUSSION_POSTED.
  - The rules engine (`rules/`) matches events against Missions and Achievements stored as data, and pays XP and THC through the ledger.
  - Weekly missions bucket by ISO week.
- **Earn hooks** (`earn/hooks.ts`, `shop/earn-registry.ts`): the shop calls `onOrderPaid` and `onOrderRefunded`. The affiliate service creates or reverses commissions. The shop does not depend on the Earn code directly.
- **Notifications** (`platform/notify.ts`) are in-app rows. Email goes through `apps/web/lib/mail/*`: Resend when `RESEND_API_KEY` is set; in dev mode it is logged to the server console.

## Feature map

| Area | Core | Web |
|---|---|---|
| Auth, verification, suspension | `auth/*`, `platform/email-verification.ts` | `(auth)/*`, `verify-email/[token]` |
| Roles and permissions | `auth/permissions.ts` | `lib/guard.ts`, `lib/admin-nav.ts` |
| LMS | `lms/lms.ts`, `lms/gating.ts`, `lms/authoring.ts`, `lms/learner.ts` | `courses/**`, `certificates/**`, `verify/[serial]`, `admin/courses/**` |
| Gamification | `gamification/*`, `rules/*`, `discussions/leaderboard.ts` | `leaderboard`, `achievements`, `today` |
| Community | `community/community.ts` (chat), `discussions/discussions.ts` (forum) | `community/**`, `admin/moderation`, `admin/community` |
| Shop | `shop/*`, `commerce/commerce.ts` | `store/**`, `cart`, `wishlist`, `checkout/**`, `orders/**`, `admin/products`, `admin/orders`, `admin/coupons`, `admin/refunds` |
| Earn | `earn/affiliates.ts` | `(public)/earn`, `earnings`, `admin/earn`, `r/[code]` |
| Platform | `platform/*` (settings, CMS, members, analytics, audit) | `admin/members/**`, `admin/site`, `admin/analytics`, `admin/audit` |
| Mining (THC) | `mining/*`, `growth/*` | `mining/**` |
| 3D campus (optional, DR-30) | `world/*` (gate, state contract, loader) | `world`, `components/world/**`, `lib/world-state.ts`, `public/world/tex`, `scripts/world/*` |
