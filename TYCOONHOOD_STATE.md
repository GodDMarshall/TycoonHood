# TYCOONHOOD — Current-State Report (`TYCOONHOOD_STATE.md`)

**First audited:** 15 September 2026 · **Last updated:** 24 September 2026
**Auditor / builder:** Claude (principal architect), under the Master Operating Directive
**Method:** full read of every source file, then a from-zero build in a Linux sandbox — PostgreSQL 16, `pnpm install --frozen-lockfile`, migrate, seed, typecheck, lint, `vitest`, both production builds, the deployment harness, both apps served under `NODE_ENV=production`, and a browser-driven end-to-end run against those servers.
**Traceability:** every claim is backed by a `file:line`, by a command whose output I recorded, or is explicitly marked **UNVERIFIED** / **ASSUMPTION**. Reality beats assumptions; nothing here is aspirational.

---

## 0. Build status, as of the last run on 24 September 2026

| Gate | Result |
|---|---|
| `pnpm typecheck` | clean across all six workspace projects |
| `pnpm lint` | clean |
| `pnpm test` | **95 passed / 95** |
| `pnpm build:web` | 30 routes |
| `pnpm build:miner` | 5 routes |
| Deployment harness | **28 / 28 checks passed** |
| Browser end-to-end (`pnpm e2e`) | **37 / 37 checks passed** |

The headline finding of the 15 September audit — that the repository did not
typecheck or build, because `admin/page.tsx` had been overwritten with a copy of
`admin/content/page.tsx` — **is resolved.** The three confirmed P0 exploits
(RSC authorization bypass, dev-mailer reset-link leak, dev-payment free
checkout) are closed and covered by tests.

### What shipped on 24 September

The merch economy, the growth loop, and the Miner as a real application.
Written up as decisions DR-10 to DR-16.

| Capability | State | Note |
|---|---|---|
| Product variants (sizes) | **COMPLETE** | `ProductVariant`; stock lives on the size; a variant may override the price |
| Atomic stock taking | **COMPLETE** | one guarded `UPDATE`; `CHECK (inventory >= 0)` behind it; raced 8 buyers for 3 units in a test, 3 for 1 in the deployment harness |
| Shipping addresses | **COMPLETE** | snapshotted per order, validated **before** stock is taken |
| Ship + tracking | **COMPLETE** | `markShipped` requires carrier and tracking, notifies the member, is the only route out of `PAID` |
| Product authoring | **COMPLETE** | `/admin/products` — sizes, prices, cost, stock; idempotent re-save |
| Price stated as mining time | **COMPLETE** | derived from the live `MINING` config, shown in the admin form, on the storefront, and in the Miner wallet |
| Referrals | **COMPLETE** | pays on the first finished lesson, never on signup; one referrer per member enforced by a unique key |
| Watch-to-earn | **COMPLETE** | server-timed, heartbeat-verified, daily cap in the member's own timezone |
| Video task authoring | **COMPLETE** | `/admin/videos` — accepts any YouTube URL shape, states the required watch time |
| Miner as a five-tab app | **COMPLETE** | Rig · Watch · Squad · Ranks · Wallet |
| Orders queue | **COMPLETE** | pack-and-send list with the address on screen; no order actionable twice |

### What is still missing, stated plainly

- **Course, module and lesson authoring** has no admin UI. Content is created by
  seed script only. This is the largest remaining gap in the admin console.
- **Challenge authoring** has no admin UI (the review queue exists).
- **Membership tiers and subscriptions** (spec §21) do not exist. This is the
  business model, and it is not built.
- **Analytics** (spec §23) beyond the economy overview does not exist.
- **The AI layer** (spec §30) does not exist and is not scheduled.
- **Telegram** remains cut (D18).
- **Mobile navigation** on the main site is still `hidden md:flex` with no menu.
  The Miner is mobile-first and unaffected.
- **`D:\TycoonHood` is not a git repository.** No history, no undo, no CI on
  push. See `TYCOONHOOD_BLOCKED_ON_YOU.md` item 6.

---

## 1. Product summary

TycoonHood is a gamified self-mastery and entrepreneurship platform — positioned as a free-to-join alternative to paid self-development academies — built as one TypeScript pnpm monorepo. It combines an LMS ("Academy"), a full gamification engine (XP, 50 levels, 5 ranks, achievements, challenges, missions, streaks, leaderboard), a double-entry internal token economy (THC — TycoonHood Coins, fixed supply of 1 quadrillion), a marketplace with dual THC/card rails, a serverless Discord integration, an admin console, and a separate mobile-first "Miner" PWA. The organizing idea, stated in its own brand doc, is **"the ledger" / "open books"**: every unit of THC is a provable database fact and the platform never fakes data (`docs/DECISIONS.md:157-161`, `README.md:38-47`). It is architected to production standards for its scope; it has **not** been deployed (`PROJECT_STATUS.md:6`), and — as of this audit — it does not build in its on-disk state.

The core product bet is **provable progress**: XP and THC only move through verified work, and the "open books" are the differentiator ("no one else can show you their supply as a database fact", `apps/web/app/(public)/page.tsx:2-4`).

## 2. Current user journey

Anonymous → `/` (text hero + live "open-books" band of four ledger figures + pillars + rank path + THC band) → `/register` (name/email/password) → `/onboarding` (username, display name, goal/interest chips, experience; silently pays a 250 THC + 75 XP mission) → `/dashboard` (streak, daily check-in button, wallet stat, XP bar, three mission cards, achievements, five notifications) → `/academy` (enroll free) → course → lesson (server-rendered markdown; "Mark complete") → quiz → certificate → `/challenges` (join, daily check-in, submit evidence to a review queue) → `/wallet` (balance + live audit line + transaction history) → `/marketplace` (buy with THC, or card in dev mode) → `/orders` / `/library/[slug]` → `/settings` (device list, Discord link code, 3 privacy toggles) → `/leaderboard` → public profile `/u/[username]` → `/verify/[serial]`. Separately, the Miner PWA (`:3001`) shares the login and offers idle accrual → claim → rig upgrade.

**Verified reachable and correct** (live HTTP, `NODE_ENV=production`): all public routes return 200; every member and admin route correctly 307-redirects an anonymous browser to `/login` on normal navigation. **Where the journey breaks** is catalogued in §3C and §13; the most damaging are that there is **no navigation on mobile** (member and public headers are `hidden md:flex` with no menu), that **success is rarely acknowledged** (onboarding payout, privacy save, card-order state all silent), and that **~10 public surfaces still show stale "arrives in Phase N" copy** for features that shipped.

## 3. Current feature inventory

Classification: **COMPLETE** (built and wired end-to-end) · **PARTIAL** (works but with a real gap) · **BROKEN** · **EXPERIMENTAL** (inert by design) · **DEAD** (schema/code present, no path). Evidence paths are relative to repo root.

### A. What exists — backend / domain (`packages/core`, `packages/db`)

| Feature | State | Evidence / note |
|---|---|---|
| Register / login / logout | COMPLETE | `core/src/auth/account.ts:24-56`; Argon2id `auth/password.ts:8-13`; dummy-hash timing equalisation `account.ts:50-54`. No email verification. |
| Sessions (shared web+miner) | COMPLETE | 256-bit CSPRNG token, SHA-256 at rest `auth/session.ts:31-35`; sliding renewal `:62-67`. |
| Password reset + mail layer | COMPLETE (code) / **unsafe default** | `auth/password-reset.ts:42-90`; hashed token, 30-min TTL, single-use, validate-before-consume, destroys all sessions. Dev mailer returns the link on-screen — see §11 P0-2. |
| Onboarding | COMPLETE | `account.ts:63-100`; pays `complete-onboarding` mission. |
| Ledger post / reward / spend | COMPLETE | `core/src/ledger/ledger.ts:101-180`; deferred zero-sum trigger + USER non-negative CHECK `migration.sql:798-826` (verified applied). |
| Ledger reversal | PARTIAL | `ledger.ts:261-293` runs as two DB transactions; no guard against reversing GENESIS / POOL_FUNDING / an already-reversed row; refund never sets `Order.status=REFUNDED`. |
| Ledger audit (cache = Σ entries) | COMPLETE | `ledger.ts:88-95`; surfaced on `/wallet`. |
| XP / levels / ranks | PARTIAL (cache race) | `gamification/xp.ts:49-142`; absolute-value write under Read-Committed → lost-update on `User.xp` cache under concurrency (§13 B6). Events are always correct. |
| Achievements | PARTIAL | `gamification/achievements.ts:21-82`; only `COURSE_COMPLETED` + `STREAK` rules evaluated; `COMMUNITY_CONTRIBUTION` hard-coded `met=false` (`:39`); `isSecret` never used. |
| Challenges — daily check-in | COMPLETE | `gamification/challenges.ts:87-129`. |
| Challenges — submission / gated | COMPLETE (JSON races) | `challenges.ts:179-266`; admin review `admin/actions.ts:139`. Concurrent reviews can lose writes (§13 B7). |
| Challenge lifecycle sweep | COMPLETE | `challenges.ts:39-56`, run on every public `/challenges` render (a write on a GET). `recurrence` field never read. |
| Missions | PARTIAL | `rewards/rewards.ts:31-110` is generic, but `Mission.criteria` is never evaluated; only 3 hard-coded slugs are ever called. |
| Streaks | PARTIAL (UTC only) | `gamification/streaks.ts:19-39`; `Profile.timezone` never read → day boundary is UTC for everyone (§13 B8). |
| LMS enroll / progress / quiz / certificate | PARTIAL | `lms/lms.ts:29-186`. No prerequisite enforcement; enroll accepts **any** slug incl. DRAFT and paid-COURSE products (§11 F6); `videoUrl`/`Resource` never rendered. |
| Commerce — THC rail | COMPLETE (oversell race) | `commerce/commerce.ts:46-85`; inventory guard is two statements → TOCTOU oversell (§13 B4). |
| Commerce — card rail + Stripe webhook | PARTIAL / **unsafe default** | Stripe adapter coded but author-untested (`lib/payments/stripe.ts`); webhook HMAC verified `api/webhooks/stripe/route.ts:7-19` but no timestamp tolerance / `payment_status` check. Dev provider settles free — §11 P0-3. |
| Mining accrue / claim / upgrade | COMPLETE (budget unenforced) | `mining/mining.ts:79-150`; claim is CAS + idempotent. Pool can overdraw → `EpochExhaustedError` is unreachable (§13 B2). |
| Discord link / interactions | COMPLETE | `integrations/discord.ts:81-134`, `discord-interactions.ts:25-119`; Ed25519 verified. |
| Discord role sync | PARTIAL | `discord.ts:54-59` only PUTs the new role; never removes prior rank roles; unlink removes nothing on Discord. |
| Chain adapter | EXPERIMENTAL (by design, D21) | `core/src/chain/adapter.ts`; only referenced by the verify script. |
| Admin actions (9) | COMPLETE | `admin/actions.ts:12-144`; every action re-checks `requireAdmin()` (D19 holds for writes). Grants are non-idempotent (§13 B9). |
| Notifications | PARTIAL | Written by 8 paths; read only on dashboard (top 5); `readAt` never set anywhere. |
| Rate limiter | PARTIAL | `lib/rate-limit.ts`; only web login/register/forgot; **miner login unthrottled** (§11 F4). |
| `migrate-sql` runner | COMPLETE | `db/scripts/migrate-sql.ts`; **verified** it built the schema from zero when Prisma's engine CDN returned 403. |
| Seeds (base / academy / content) | COMPLETE / not re-run-safe | Academy seed deletes+rebuilds modules; content seed forces `active:true`/stock and resets challenge dates on every run (§13 B14). |
| `verify-platform` harness | COMPLETE (side-effecting) | 26 checks; **none hit HTTP** despite `PROJECT_STATUS.md:62`; mutates its target DB (activates a DRAFT challenge for 24h, leaves audit users). |
| Smoke scripts (8) | DEAD (dev tooling) | Not in CI; print raw session tokens to stdout; no prod guard. |
| Telegram / OAuth `Account` / `Resource` / `ESCROW` / `TRANSFER` | DEAD (schema-only) | No code path. |

### B. What exists — frontend (`apps/web`, `apps/miner`, `packages/ui`)

37 web routes build; 20 UI components in `@tycoonhood/ui`; 16 app-local components; the Miner is 2 components. Design system is real (`packages/ui/src/tokens.css`: 5 surfaces, 3 inks, 3 golds, 4 pillar colors, 3 semantics, 3 font stacks, 3 radii, 2 shadows, global focus-visible + reduced-motion). Rendering is almost entirely server components (30 of 37 web pages are `export const dynamic = "force-dynamic"`), with thin `"use client"` islands via `useActionState`.

| Surface | State | Note |
|---|---|---|
| Public site (`/`, about, programs, challenges, thc, marketplace, roadmap, blog, faq, status, styleguide) | COMPLETE but STALE COPY | ~10 pages carry "arrives in Phase N" copy for shipped features. |
| Auth pages (login/register/forgot/reset) | PARTIAL | Register never renders its error state (`components/auth-forms.tsx`); no `h1` on any auth page. |
| Onboarding | COMPLETE | Heaviest client route (16.4 kB); payout never celebrated. |
| Member shell (dashboard, academy, lesson, wallet, orders, settings, leaderboard) | PARTIAL | **No mobile nav** (`app/(app)/layout.tsx:21`); no `loading.tsx`/Suspense anywhere; empty states are blank grids. |
| Admin console (6 surfaces) | PARTIAL / **1 BROKEN** | Overview page is corrupted (§13 B1); no surface creates courses/lessons/products/missions/challenges — "Content" is a publish toggle + blog editor. |
| Miner PWA | PARTIAL | Works; no service worker (no offline), `maximumScale:1` blocks zoom, dead-ends with no link back to the main site. |
| Public profile / verify | COMPLETE | Privacy-gated; but a Settings save exposes THC + certificates (§11 F5). |

### C. Product-experience failure points (ranked by user impact)

1. **No mobile navigation** — phone users cannot reach Academy/Wallet/Settings/Challenges except by typing URLs (`app/(app)/layout.tsx:21`, `components/site-nav.tsx:21`).
2. **Success is silent** — onboarding's 250 THC payout, privacy save, and card-order placement give no confirmation.
3. **Stale phase copy** — the product tells users features "arrive in Phase 6/7/8" that are already live, undermining the "no faking" brand from the opposite direction.
4. **Dashboard missions have no action** — three mission cards with no CTA or route; the user cannot tell how to do them.
5. **Quiz discards its review on a pass**; **answers wipe on a validation error** (React 19 uncontrolled-form reset).
6. **Unhandled server-action errors** crash whole pages to the root error boundary (stale "join" click, double admin action, `BigInt("abc")` grant).

## 4. Architecture (as it actually is)

Single Next.js 15 App Router web app with `(public)` / `(auth)` / `(app)` route groups, plus a second Next.js app (`apps/miner`). **No `middleware.ts`.** Request → server component/action → `getCurrentUser()` (`apps/web/lib/auth.ts:39-48`, React-`cache`d, does a DB read and can write a session renewal on every request) → a singleton core service (`packages/core/src/index.ts`) → Prisma (`@prisma/adapter-pg`, engine-free committed client at `packages/db/src/generated`). Only two HTTP route handlers exist (Stripe + Discord webhooks); everything else is server actions.

**Transaction boundaries:** only `LedgerService.post`, `XpService.awardXpInner`, seed `postOnce`, and the reversal-link step are real DB transactions. Every composite flow (lesson → XP → mission → streak → course → certificate → achievement; checkout → inventory → order → spend → fulfil) is a **sequence of independent statements** relying on unique idempotency keys for repair, not on atomicity.

**Invariant enforcement:** zero-sum at both the service layer (`ledger.ts:182-194`) and a deferred `CONSTRAINT TRIGGER` (`migration.sql:822-826`); USER-non-negative at both a guarded `updateMany` and a DB `CHECK`. Note the guard/CHECK **exempt all non-USER accounts**, so system pools (REWARDS_POOL, MINING_POOL) can go negative — the "finite pool" is not enforced (§13 B2).

**Config path:** a hand-rolled regex `.env` loader (`^([A-Z_]+)="?([^"\n]*)"?$`) is **copy-pasted 11×** (both `next.config.mjs`, `migrate-sql.ts`, test setup, 7 scripts). It silently mis-parses CRLF files — the documented platform is Windows with no `.gitattributes` — so a quoted value can fail to load and `DEV_MODE=false\r` stays truthy (§13 B10). `packages/db` scripts use `dotenv-cli` instead: two disagreeing loaders.

## 5. Repository map

```
D:\TycoonHood\                     pnpm workspace (apps/*, packages/*)
├─ apps/
│  ├─ web/    Next 15 app · (public)/(auth)/(app) groups · 2 api routes · lib/{auth,rate-limit,mail,payments}
│  └─ miner/  Next 15 PWA on :3001 · shared session · idle-rig UI
├─ packages/
│  ├─ core/   domain services (ledger, auth, lms, gamification, mining, commerce, integrations, chain) + 60 vitest tests + verify-platform.ts + 8 smoke scripts
│  ├─ db/     prisma/schema.prisma · 4 hand-written SQL migrations · migrate-sql.ts · seed{,-academy,-content}.ts · committed engine-free client in src/generated
│  ├─ ui/     tokens.css + 20 components  ("the ledger" design system)
│  └─ config/ economy + game constants (one file)
├─ docs/      BLUEPRINT.md · DECISIONS.md (D1–D26, A1–A19) · RUNBOOK.md
├─ scripts/deploy-db.mjs · setup-windows.ps1 · .github/workflows/verify.yml · vercel.json (+ per-app)
├─ PROJECT_STATUS.md · README.md · START-HERE.md · .env.example · docker-compose.yml
├─ files.zip   ← archived earlier snapshot; its admin/page.tsx is the CORRECT overview (used to recover B1)
└─ tycoonhood\ ← EMPTY nested skeleton (dirs only, zero files) — dead; see §12 / §13 B15
```

Counts: 247 source files in the working tree (excluding `node_modules`, `.next`); ~46 non-generated TS/TSX/SQL/CSS under `packages`; 428 pnpm packages install from the frozen lockfile in ~27 s.

## 6. Agent map (recommended ownership, per the Directive §13)

No agents operate in the codebase; this maps the Directive's roles onto TycoonHood's real surfaces so future work has clear owners. **PRODUCT** — user journeys, the phase-copy cleanup, feature-value calls. **UX** — mobile nav, empty/loading/error/success states, form-reset fixes. **UI/DESIGN** — the missing type/spacing/motion scale, killing the 8 re-styled buttons (D14). **FRONTEND** — the (app) shell, admin authoring surfaces, quiz/onboarding islands. **GRAPHICS/WEBGL** — *currently empty* (there is no WebGL/lattice; see §8, §14, §15). **BACKEND** — ledger/pools, idempotency, transaction boundaries, the dev-mode defaults. **QA** — concurrency tests (none today), the missing HTTP-level checks. **PERFORMANCE** — force-dynamic query counts, per-request session writes. **SECURITY** — owns the P0s in §11. **RELEASE** — the corrupted file, the vercel/migrate contradictions, the seed prod-guard.

## 7. Design system

Real and coherent for its size, defined once in `packages/ui/src/tokens.css` (Tailwind v4 `@theme`), consumed by every app. **Brand = "the ledger":** warm espresso-black surfaces (`--color-bg-0 #0d0b08` … `bg-2 #1b1712`, deliberately *not* blue-black), brass/gold as the house metal (`--color-gold #c9a227`, bright `#e3be4a`, deep `#8c6f1a`), four pillar colors (Warrior `#b5443a`, Builder `#5b87a6`, Tycoon `#c9a227`, Mind `#6fa08b`), three semantics, three system font stacks (Georgia display / Segoe UI / Consolas figures), three radii, two shadows, global gold `:focus-visible`, global reduced-motion clamp. A reeded-coin `CoinMark` SVG is the sole visual asset (logo, favicon, THC glyph, rank pips).

**What the system is missing** to be "coherent" per the Directive §7: a **type scale** (there are 328 arbitrary `text-[Npx]` values across 24 distinct sizes, not a scale), a spacing/sizing scale (containers chosen ad-hoc per page), motion tokens (only `duration-150/300` literals), a z-index scale, an icon system (currently Unicode `✓ ○ → ⛏` + emoji `🔥 🏅 🎓`), documented interaction/disabled/`aria-invalid` states, breakpoint discipline (sm/md/lg used inconsistently), and any light theme (`color-scheme: dark` only). **D14 is violated in 8 places** where primary-button styles are hand-re-implemented as `<Link>`/`<button>` instead of `<Button>`, and an error-banner block is copy-pasted 6×.

## 8. WebGL system

**There is none.** A full grep of both apps and the UI package for `webgl|canvas|three|gsap|framer|@keyframes|animate-` returns only: one `@keyframes rig-pulse` (the Miner coin, `apps/miner/app/globals.css:5-10`) and Tailwind `animate-spin` on the button spinner. The homepage hero is **text plus two links** — no SVG, canvas, 3D, or illustration exists anywhere. `PROJECT_STATUS.md:82`'s "Code-drawn 3D/SVG hero art" is a **stale/false claim** (verified). The Directive names "the runtime WebGL lattice" and an "exact red" as historical decisions to preserve; **neither exists in this repository, and there is no red in the palette.** This is the central conflict of the audit — see §14 and §15. Per the Directive's own rule ("never claim implemented unless verified"), I record them as **NOT PRESENT IN THIS REPOSITORY** rather than invent them, and I have asked you where that work lives.

## 9. Performance baseline (measured, this sandbox)

Measured under `NODE_ENV=production`, local Postgres, warm process. Numbers are directional (a single fast host), not a Vercel/Neon baseline.

| Metric | Value | Source |
|---|---|---|
| `pnpm install --frozen-lockfile` | 27.3 s, 428 pkgs | recorded |
| Web production build | ✓ after B1 fix; 14 static + rest dynamic | build log |
| Miner production build | ✓ 10.2 s compile | build log |
| Shared First-Load JS (web) | **102 kB** | build report |
| Heaviest client route | `/onboarding` 16.4 kB (119 kB first load) | build report |
| Typical route first-load JS | 104–109 kB | build report |
| Miner first-load JS | 107 kB | build report |
| TTFB `/` (anon, force-dynamic, 6 queries) | ~60 ms | curl |
| TTFB `/thc` / `/status` (5–8 queries) | 52 / 36 ms | curl |
| TTFB `/dashboard` (authed) | 31 ms | curl |
| TTFB `/admin/members` (authed) | 56 ms | curl |
| Frame rate / WebGL cost | n/a — no WebGL | §8 |

**Structural perf risks** (static): 30/37 pages `force-dynamic` with **no `loading.tsx`/Suspense anywhere**, so every navigation blocks on the slowest query (Neon cold-starts will read as hangs); `getCurrentUser` does a **write** (session renewal) on requests in the back half of the 30-day window; the lesson page loads the **entire course incl. every quiz's questions** to render one lesson; `generateMetadata` + page double-query the same record on `programs/[slug]` and `blog/[slug]`; `/wallet` runs a full `SUM` audit over all entries on every view.

## 10. Test status

**Verified by running them.** `vitest run` → **60/60 passing, 8 files** (auth 14, ledger 10, lms-gamification 12, gamification 6, mining 5, commerce 5, discord-interactions 5, integrations 3), 7.2 s, against a real seeded Postgres. This matches `PROJECT_STATUS.md` ("60/60") and contradicts `README.md:21` ("48 tests", stale). Lint: **clean.** Typecheck: **fails as-shipped** (B1), **clean once B1 is fixed.** The 26-check `verify-platform` harness: **26/26 passing** (recorded). Gaps: **zero concurrency tests** (the inventory-oversell, XP-cache, and pool-overdraw races are therefore invisible to the suite); tests are serial by config; `verify-platform` asserts a non-existent field in one check (`vp:97` reads `tokenHash`, which the model doesn't have — the scripts are outside the `tsconfig` include, so it never type-errors and the assertion can never fail); the "verified over HTTP" authorization matrix in `PROJECT_STATUS.md:62-68` has **no artifact in the repo** (I reproduced it myself instead — §11).

## 11. Security status

Full report is in the audit trail; here are the load-bearing results, **empirically reproduced against the running app** where marked ✔runtime.

| ID | Sev | Finding | Status |
|---|---|---|---|
| **P0-1** | **P0** | **Unauthenticated admin data exposure via RSC.** A crafted `RSC: 1` + `Next-Router-State-Tree` request to `/admin/members`, `/admin/economy`, `/admin/orders` renders the page **with no session cookie at all** — the only auth is in the layout, and Next's partial rendering skips the layout when the client-supplied tree matches. ✔runtime: I retrieved 30 member emails + roles and the ledger anonymously (200, `text/x-component`); the same URL by normal navigation correctly 307s to `/login`. `apps/web/app/(app)/admin/layout.tsx:7-8`; 7 admin pages + `leaderboard/page.tsx` have no in-page check. | CONFIRMED |
| **P0-2** | **P0** | **Password-reset link disclosed to the requester.** With `DEV_MODE` unset/≠"false" and no Resend key (the shipped default, `.env.example:63`), `forgotPasswordAction` returns the working reset link in the page. ✔runtime: I submitted the admin's email on a `NODE_ENV=production` server and received a valid `/reset-password/<token>` link on screen that loaded the reset form — **one-request admin takeover.** `(auth)/actions.ts:118`, `components/reset-forms.tsx:25-32`, `lib/mail/dev.ts:11`. | CONFIRMED |
| **P0-3** | **P0** | **Free products in production.** The dev fiat provider's `available` getter is a tautology `isDevMode() && NODE_ENV!=="production" ? true : isDevMode()` ≡ `isDevMode()`; it settles orders to PAID/FULFILLED with no charge. ✔runtime: on a `NODE_ENV=production` server the marketplace showed the live "card payments run in development mode — recorded but not charged" control. `lib/payments/dev.ts:11-14`, `commerce.ts:107-153`. | CONFIRMED |
| F4 | P1 | Miner login has **no rate limit** → credential stuffing + Argon2 CPU/memory amplification. `apps/miner/app/actions.ts:19-34`. | CONFIRMED |
| F5 | P2 | Saving Settings once **publishes THC balance + certificates** (the privacy write drops the `thc`/`courses` keys; profile treats missing as public). `settings/actions.ts:36-41`, `u/[username]/page.tsx:33`. | CONFIRMED |
| F6 | P2 | Free enroll bypasses the paid $49 COURSE product and lets any member read DRAFT courses. `lms.ts:29-36`. | CONFIRMED |
| F7 | P2 | Inventory decrement is TOCTOU → oversell of the last unit. `commerce.ts:25-36`. | CONFIRMED |
| F8 | P2 | Rate-limit keyed on first `x-forwarded-for` hop → spoofable behind an appending proxy (the RUNBOOK VPS path). | CONFIRMED |
| F9 | P2 | System pools may go negative → "finite" mining/rewards pool never exhausts; `EpochExhaustedError` is dead code. `ledger.ts:140`, `mining.ts:103`. | CONFIRMED |
| F10 | P2 | Seed prod-guard is a hostname regex (`neon\|supabase\|rds\|railway\|render`) → Docker/VPS/Fly/DO/Azure/GCP/Vercel-PG prod DBs get the **published admin password** `tycoon-admin-change-me`. `seed.ts:25-36`. | CONFIRMED |
| F11 | P2 | Stripe webhook settles on `completed` without `payment_status==="paid"` and has no timestamp tolerance / event-id dedupe. | SUSPECTED |
| F13–F17 | P3 | Quiz has no enrollment check + returns the answer key + unlimited attempts; markdown rendered unsanitised (admin-authored, D16); dead Stripe CSP + `unsafe-eval`; evidence URL scheme unvalidated; no email verification. | CONFIRMED |

**Verified-good (do not "fix"):** session design (256-bit CSPRNG, SHA-256 at rest, httpOnly/secure/lax); Argon2id at OWASP params + dummy-hash timing defence; reset lifecycle per D25; every admin **write** re-checks role; ledger zero-sum trigger + guarded decrement + CHECK + idempotency keys; Stripe HMAC via `timingSafeEqual` and Discord Ed25519, both fail-closed; no raw-SQL interpolation; no committed secrets; no `middleware.ts` (so CVE-2025-29927 is moot); Next 15.5.23 / React 19.2.8 are past the 2025 critical advisories; security headers present on both apps (I confirmed them on the wire).

## 12. Technical debt

- **Build-blocking:** the corrupted `admin/page.tsx` (B1).
- **Config:** 11 copies of a fragile regex `.env` loader; two disagreeing env strategies; no `.gitattributes` on a Windows-first, checksum-sensitive project.
- **Deploy contradictions:** root `vercel.json` vs `apps/web/vercel.json` (one runs `migrate:deploy` in the build, one doesn't) vs `PROJECT_STATUS.md:173` ("build deliberately does not run migrations") — three sources disagree, and `migrate:deploy` needs the Prisma engine that the environment's own docs say is blocked.
- **Duplication:** prod-heuristic (2×), `dayKey` (2×), `next.config.mjs` (2×, miner allows Stripe hosts it never uses), `lib/auth.ts` (2×), Argon2 params (2×), 8 hand-rolled buttons, 6 error banners, 14 ledger-row layouts.
- **Dead:** the empty `tycoonhood\` nested folder; 8 smoke scripts; Telegram/OAuth-Account/Resource/ESCROW/TRANSFER schema; several unused exports/enums.
- **Untyped surfaces:** scripts + seeds are outside `tsconfig` include (the `tokenHash` bug proves it); `Mission`/`Challenge`/`Achievement` `criteria` JSON is untyped and only partially interpreted.
- **Operational:** no pagination anywhere in admin; no orphaned-PENDING-order sweep; no user-deletion/GDPR path (FK `RESTRICT`); TLS verification disabled in operator scripts (`migrate-sql.ts:61`, `deploy-db.mjs:57`); grep for `TODO/FIXME/HACK/@ts-ignore/as any` → **0 hits** (debt is undocumented, not absent — one `eslint-disable` in `Avatar.tsx`).

## 13. Known bugs (ranked)

| # | Sev | Bug | Evidence |
|---|---|---|---|
| **B1** | **BLOCKER** | `admin/page.tsx` is a duplicate of `admin/content/page.tsx`; imports non-existent `../actions`; typecheck + web build FAIL. | verified `TS2307` + `next build` failure |
| B2 | P1 | System pools go negative; mining/rewards never exhaust; `EpochExhaustedError` unreachable. | `ledger.ts:140`, `mining.ts:103` |
| B3 | P1 | Privacy save publishes THC + certificates. | `settings/actions.ts:36` |
| B4 | P1 | Inventory oversell (TOCTOU). | `commerce.ts:25-36` |
| B5 | P1 | Free enroll bypasses paid course; DRAFT courses readable. | `lms.ts:29-36` |
| B6 | P2 | XP-cache lost update under concurrency (events stay correct). | `xp.ts:64-87` |
| B7 | P2 | Challenge JSON read-modify-write races (approvals can vanish). | `challenges.ts:100-250` |
| B8 | P2 | Streaks/check-ins are UTC-only; a UTC-8 member's streak breaks across an evening. | `streaks.ts:10` |
| B9 | P2 | Admin grants non-idempotent (`Date.now()` key); double-submit double-grants; `BigInt("abc")` → 500. | `admin/actions.ts:22-46` |
| B10 | P2 | CRLF `.env` mis-parse → `DATABASE_URL` "not set" or `DEV_MODE=false` ignored on Windows. | `next.config.mjs:8` |
| B11 | P2 | Reversal non-atomic; no guard against reversing genesis/pool/already-reversed; refund doesn't set `Order.REFUNDED` or revoke `/library`. | `ledger.ts:261-293` |
| B12 | P2 | Unhandled server-action errors crash pages to root error boundary (stale join, double admin action, bad grant). | multiple `actions.ts` |
| B13 | P2 | Register error state never rendered; quiz/onboarding forms wipe input on validation error (React 19). | `auth-forms.tsx`, `quiz-form.tsx` |
| B14 | P2 | Seeds not re-run-safe on a live DB (academy rebuild changes lesson IDs → XP re-earn; content forces stock/active + resets challenge dates). | `seed-academy.ts:715`, `seed-content.ts:175` |
| B15 | P3 | Empty `tycoonhood\` nested folder (zero files) — dead skeleton, confuses the tree. | `dir` listing |
| B16 | P3 | Docs/code drift (see §12 deploy + `README` 48-vs-60 tests + `verify-platform` "over HTTP" claim + FAQ still promises Telegram vs D18). | multiple |

## 14. Historical decisions

The recorded decision log (`docs/DECISIONS.md`) is strong and should be treated as binding constraints (D1–D26, A1–A19). The load-bearing ones: **D6/D7** double-entry ledger, BigInt, 1Q genesis mint provable as `-balance(SYSTEM_MINT)`; **D15** own-Session-table auth (not Auth.js) with hashed tokens; **D3/D12** engine-free committed Prisma client + hand-written SQL migration carrying the CHECK + deferred trigger; **D14** one token file, pages compose never restyle; **D17** Miner distributes from a finite pool, never mints; **D18** Telegram cut; **D21** chain is an inert adapter only; **D25** reset-token discipline; **D26** serverless Discord. **Brand decision (A9):** "the ledger" — espresso-black + brass/gold, reeded-coin mark, **no red anywhere.** These are preserved in `TYCOONHOOD_DECISIONS.md`.

**The three decisions the Master Directive told me to preserve — the headline, the runtime WebGL lattice, and the exact red — are not in this repository.** There is no WebGL, no lattice, no red, and the "headline" on disk is the plain text hero above. I did not silently choose an interpretation; §15 states the conflict and I have asked you where that work lives.

## 15. Conflicts (existing decision → current implementation → conflict → consequence → recommended resolution)

**C1 — "Build is green" vs reality.** *Decision/claim:* `PROJECT_STATUS.md:5` asserts typecheck ✅ and both apps build ✅. *Implementation:* `admin/page.tsx` is corrupted; typecheck + web build fail. *Conflict:* the status document is false for the on-disk tree. *Consequence:* any deploy from this tree fails at build; trust in the status doc is undermined. *Recommended:* restore the overview page from `files.zip` (I have the exact file), re-run `pnpm verify`, and re-date `PROJECT_STATUS.md` against a real run. **NOW-priority.**

**C2 — WebGL lattice / exact red / headline (Directive §4) vs the codebase.** *Decision:* the Directive names a "runtime WebGL lattice", an "exact red / visual red specification", and a "headline" as historical decisions to preserve. *Implementation:* none of the three exists in `D:\TycoonHood`; the brand is "the ledger" (espresso + brass/gold, no red), the hero is text, and there is zero WebGL. *Conflict:* either these decisions belong to a **different TycoonHood artifact** not in this repo, or they are intended future direction not yet built. *Consequence:* I cannot audit, preserve, or reconcile what is not present without inventing it — which the Directive forbids. *Recommended:* **you tell me where the lattice/red/Ascent-homepage work lives** (a chat-exported zip, another folder, or "not built yet"); until then these three are recorded as NOT PRESENT and the visual layer is audited as the shipped "ledger" system. **Blocking a full answer to Directive §4/§8.**

**C3 — Dev-mode default vs "no faking / production-safe."** *Decision:* D11 "every external dependency gets an honest dev boundary"; core value "nothing fake." *Implementation:* the dev boundaries are *on by default* and only off when `DEV_MODE="false"` — so a forgotten flag ships free products and on-screen admin reset links (P0-2, P0-3). *Conflict:* the honest-boundary decision, implemented as default-open, becomes a production security hole. *Consequence:* one missing env var = admin takeover + free store. *Recommended:* invert the default — dev boundaries require `DEV_MODE==="true"` **and** `NODE_ENV!=="production"`, and fail closed. **NOW-priority.**

**C4 — Deploy/migrate story disagrees with itself and with the environment.** *Decision:* `PROJECT_STATUS.md:173` "build deliberately does not run migrations." *Implementation:* `apps/web/vercel.json` runs `migrate:deploy` in the build; that command needs the Prisma engine the same doc says is blocked; the engine-free path is a different command. *Conflict:* three sources disagree and the wired one can't run in the stated environment. *Consequence:* first Vercel deploy likely fails at build. *Recommended:* pick one — migrations out-of-band via `db:migrate:sql`, and make `vercel.json` build-only. **NOW-priority.**

## 16. Missing product capabilities (required by the vision, absent today)

Email verification on signup; profile editing (display name, bio, avatar, username, email, change-password) — none exist though `/u/[username]` renders a bio with no write path and FAQ promises 6 privacy facets while Settings exposes 3; admin authoring for courses/lessons/products/missions/challenges (today admin can only publish-toggle and write blog posts, so the LMS cannot be filled without DB access); pagination/search across admin lists; mobile navigation; loading/empty/success states as a system; error tracking (Sentry), automated backups (Neon PITR), and a Redis-backed rate limiter for multi-instance serverless; an orphaned-order/inventory reconciliation job; a user-deletion path.

## 17. Highest-priority problems (ranked by user impact × product importance × technical risk × dependency × cost-of-delay — not by ease)

1. **P0-1 unauthenticated admin data exposure** — member PII + ledger readable with no login. Highest blast radius; blocks any launch.
2. **P0-2 password-reset link disclosure** — one-request admin takeover on the default config.
3. **P0-3 free products in production** — direct revenue/inventory loss on the default config.
4. **B1 the repo doesn't build** — nothing ships until this one file is restored.
5. **No mobile navigation** — a large share of real users is locked out of the product.
6. **System pools can overdraw (B2)** — breaks the "fixed, provable economy" that is the entire brand.
7. **Deploy/migrate contradictions (C4)** — first deploy likely fails.
8. **Privacy save leaks THC/certs (F5)** — contradicts D24 and the "you control your books" promise.
9. **Stale phase copy + silent success + no loading states** — the platform reads as unfinished even where it is finished.
10. **Seed prod-guard weakness (F10)** — a real deploy can ship the published admin password.

## 18. Recommended roadmap

Summarised here; the full NOW / NEXT / LATER / PARKED breakdown with objective, reason, dependencies, acceptance criteria, complexity and risk is in **`TYCOONHOOD_ROADMAP.md`**. In one line: **NOW** = fix the three P0s, restore the build, resolve the deploy contradiction, and add an in-page auth guard (a DAL) — the security-and-shippability floor. **NEXT** = mobile nav, the state system (loading/empty/success/error), pool-floor enforcement, the phase-copy purge, admin authoring, email verification. **LATER** = the type/spacing/motion scale, concurrency tests, Redis rate limiting, Sentry, backups. **PARKED** = chain adapter (legal-gated, D8), Telegram (cut, D18), and — pending your answer on C2 — any WebGL/lattice/red visual direction.

## 19. Definition of done

A feature is **DONE — VERIFIED** only when: implementation exists; the intended journey works end-to-end; loading, empty, error and success states exist where applicable; it is responsive to ~360px and reachable from mobile navigation; accessibility is considered (labels, focus, contrast, keyboard); tests exist for its critical path incl. one concurrency test where money or counts move; no known critical regression; performance is acceptable (no unbounded query, no per-request write it doesn't need); the visual matches the token system (no new arbitrary values, no re-styled primitives); and docs/`PROJECT_STATUS.md` are updated against a real run. Anything short of that is **PARTIAL** and says so.

## 20. Current build status

**Superseded by §0 at the top of this document, which records the 24 September
run.** The section that stood here described the 15 September state, in which
the repository did not build. It is kept out of the document rather than edited,
because a status section that reports two different truths is worse than one
that points at the current one.
