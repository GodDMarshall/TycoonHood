# Architecture

Last updated 11 November 2026 (full-platform build, DR-29; the optional 3D campus, DR-31).

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
- `(auth)`: login, register, reset password, email verification and undoing an email change.
- `(app)`: everything that needs a session.
  - Today, Courses, Certificates, Community (chat, discussions, groups), Leaderboard, Achievements, Mining, Store, Cart, Wishlist, Checkout, Orders, Earnings, Wallet, Profile, Notifications, Settings.
  - Admin lives under `/admin`.
  - `/world` is the optional 3D campus (DR-31). Its 2D page is the first paint, and the whole page on phones, tablets and software GPUs.
- `api/webhooks/razorpay`: the payment webhook. The signature is checked before anything is read.
- `/r/[code]`: the affiliate link. It records a hashed click (raw IPs are never stored), sets a 30-day cookie and redirects.

## Security model

- **Sessions** are resolved on the server from an httpOnly cookie (`packages/core/src/auth/session.ts`). A suspended user resolves to no session.
- **Account changes** (DR-32):
  - An email change waits in `User.pendingEmail` until the link sent to the new address is used. Using it moves the account, kills every link for the old address and every reset link, and signs out other sessions.
  - An old address the member had confirmed is then held for the account for 7 days (`EmailHold`, `platform/email-hold.ts`): no one can register with it and no other account can move to it. Its notice carries a single-use undo link, and only the latest change's link works. Undoing (`platform/email-undo.ts`) puts the address back, verified, replaces the password with one nobody knows, signs out every session and kills every link, all in one transaction; the browser that used the link goes straight to the new-password page.
  - The hold records when that notice went out. A change whose notice was not sent is put back: at once by the request, or, if the request died first, by a sweep once the change is 10 minutes old (`platform/email-notice.ts`; a daily cron, a new change request, a reset request and the admin page).
  - An old address the member never confirmed is not held and gets no undo link, so a change away from it waits a day instead: its link works only from a day after the request (`User.pendingEmailAt`, `UNCONFIRMED_CHANGE_WAIT_MS` in `platform/email-verification.ts`). The notice to that address says when, and a new password before then cancels the change.
  - A password change or reset cancels a waiting email change and spends every reset link.
  - Staff with `admin.users` see a waiting change and held addresses on the member's admin page, and can cancel the waiting change. There is no tool to set an email.
  - The account's address is told about each of these (`apps/web/lib/mail/account.ts`; the words are in `platform/account-mail.ts`). The current address hears about a requested change no later than the new address gets its link.
  - Confirmation resends are limited to three an hour per member. The count and the new link are written under one database lock, so parallel requests cannot pass it.
- **Authorisation** is enforced in the data-access layer, `apps/web/lib/guard.ts`, never in a layout. `requireUser()`, `requirePermission(p)` and `actorWith(p)` run at the top of every protected page and server action.
- **Permissions** are one table, `packages/core/src/auth/permissions.ts`. Code asks `can(user, "admin.commerce")` and never compares role strings. The admin navigation (`apps/web/lib/admin-nav.ts`) shows only the sections a role can open, and each admin page checks again on its own.
  - Some permissions are scoped by ownership as well (DR-34). `courses.author` edits only the programmes taught by the instructor profile linked to the account, and only while they are drafts unless the account may publish; core checks it on every authoring write (`assertCanEditCourse` in `lms/authoring.ts`), finding the programme from the target's own id. `courses.manage` (Admin) reaches every programme, the instructor profiles and their links to accounts.
- **Money** has two separate rails:
  - **THC** is internal, non-monetary credit kept in a double-entry ledger (`ledger/ledger.ts`). Every grant, spend and reversal is a balanced transaction with an idempotency key.
  - **INR** is real money through Razorpay (`shop/payments/*`). It is stored in integer paise.
  - The payment mode comes from the provider: sandbox and `rzp_test_` keys are TEST, and only `rzp_live_` keys are LIVE. Revenue counts LIVE captured payments only.
- **Audit:** every admin action that changes a user, money, content or settings writes an `AuditLog` row (`platform/audit.ts`). An edit records the fields it changed, from and to (`auditChanges`). Settling a legacy rupee order by hand (`commerce/manual-settlement.ts`) is audited, and refused for an order with a Payment row.
- **CSP** is in `apps/web/next.config.mjs`. It allows Razorpay's checkout script and frames, and YouTube for lesson video.
- **The 3D campus** (`/world`, DR-31) calls `requireUser()` in the page. Its loader, `packages/core/src/world/load.ts`, only reads: the member's own figures and house-wide counts, never another member's name or email. The CSP did not change for it.
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
| Auth, verification, suspension | `auth/*`, `platform/email-verification.ts`, `platform/email-hold.ts`, `platform/email-undo.ts` | `(auth)/*`, `verify-email/[token]`, `undo-email/[token]` |
| Roles and permissions | `auth/permissions.ts` | `lib/guard.ts`, `lib/admin-nav.ts` |
| LMS | `lms/lms.ts`, `lms/gating.ts`, `lms/authoring.ts`, `lms/learner.ts` | `courses/**`, `certificates/**`, `verify/[serial]`, `admin/courses/**` |
| Gamification | `gamification/*`, `rules/*`, `discussions/leaderboard.ts` | `leaderboard`, `achievements`, `today` |
| Community | `community/community.ts` (chat), `discussions/{posts,groups,reports,moderation}.ts` (forum, behind `discussions/service.ts`) | `community/**`, `admin/moderation`, `admin/community` |
| Shop | `shop/*`, `commerce/commerce.ts` | `store/**`, `cart`, `wishlist`, `checkout/**`, `orders/**`, `admin/products`, `admin/orders`, `admin/coupons`, `admin/refunds` |
| Earn | `earn/affiliates.ts` | `(public)/earn`, `earnings`, `admin/earn`, `r/[code]` |
| Platform | `platform/*` (settings, CMS, members, analytics, audit) | `admin/members/**`, `admin/site`, `admin/analytics`, `admin/audit` |
| Mining (THC) | `mining/*`, `growth/*` | `mining/**` |
| 3D campus (optional, DR-31) | `world/*` (gate, state contract, loader) | `world`, `components/world/**`, `lib/world-state.ts`, `public/world/tex`, `scripts/world/*` |
