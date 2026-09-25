# TYCOONHOOD — Roadmap (`TYCOONHOOD_ROADMAP.md`)

**Derived:** 15 September 2026, from the ranked problem list in `TYCOONHOOD_STATE.md §17`.
**Ordering rule (Directive §18):** product value → core journey → correctness → architecture → reliability → performance → UX → visual polish → micro-interactions. **Do not polish a broken foundation.** Complexity is S / M / L (hours / a day or two / more). Every item carries objective, reason, dependencies, acceptance criteria, complexity, risk.

---

## DONE — closed since this roadmap was written

**15 September:** N1 (build restored) · N2 (RSC authorization, P0-1) · N3 (dev-mode
fail-closed, P0-2 and P0-3) · N4 partial (seed guard hardened; CI env line still
blocked on you) · the mission rules engine (missions are data, not code).

**24 September:** the merch economy end to end · the growth loop · the Miner as
a real application. Decisions DR-10 to DR-16. Verified by 95 unit tests, a
28-check deployment harness, and a 37-check browser run that authors a product,
buys it with a size and an address, ships it with tracking, and watches the
referral pay on a real lesson.

---

## NOW — what stands between here and a launch

### A1 — Course, module and lesson authoring in the admin
- **Objective:** create, edit, order and publish a full course from `/admin` with no SQL.
- **Reason:** the Academy is the product. Today every course is a seed script, which means content is a developer task and you cannot write a lesson without me. This is now the single largest gap in the console.
- **Dependencies:** none. The `catalog` service is the pattern to copy — one door, validation in the service, an idempotent save.
- **Acceptance:** you create a course with three modules, eight lessons and one quiz from the browser; it appears in `/academy`; a member enrols and completes it; the certificate serial verifies. No SQL, no deploy.
- **Complexity:** L · **Risk:** low — additive, and the LMS read path is already proven.

### A2 — Challenge authoring in the admin
- **Objective:** create a challenge with daily tasks, dates and rewards from `/admin`.
- **Reason:** challenges are the engagement mechanism the spec leans on hardest (§9), and the review queue for evidence already exists — only authoring is missing.
- **Dependencies:** A1 (shares the task-list component).
- **Acceptance:** you create a 30-day challenge from the browser; members join it; daily check-ins record; the leaderboard and completion certificate both work.
- **Complexity:** M · **Risk:** low.

### A3 — Membership tiers
- **Objective:** FREE / MEMBER / PREMIUM as data, with a gate that reads the tier, and prices set in `/admin` rather than hard-coded (spec §21).
- **Reason:** this is the business model and it does not exist. Every other revenue stream in the spec depends on tiering being real.
- **Dependencies:** none technically; decide the tier boundaries first — which is a business decision, not an engineering one.
- **Acceptance:** a FREE member is refused a PREMIUM course and told why; upgrading grants it immediately; the tier is visible in `/admin/members`; no price is hard-coded in a component.
- **Complexity:** L · **Risk:** medium — touches authorization everywhere; build it as one gate function, not scattered checks.

### A4 — Mobile navigation on the main site
- **Objective:** a real menu under `md`.
- **Reason:** the member and public headers are `hidden md:flex` with no fallback, so on a phone the main site has no navigation at all. The Miner is mobile-first and unaffected, which has been masking this.
- **Dependencies:** none.
- **Acceptance:** every header link is reachable at 375px wide; keyboard and screen-reader navigable; no horizontal scroll.
- **Complexity:** S · **Risk:** none.

### A5 — Put the project under version control
- **Objective:** `git init`, first commit, push to a remote, CI running on push.
- **Reason:** there is no history and no undo. This is the largest single risk to the project and it is a two-minute fix.
- **Dependencies:** your say-so — the first commit sets the baseline. `.gitignore` and `.gitattributes` are written and waiting.
- **Acceptance:** a bad change can be reverted; CI runs `pnpm verify` on every push.
- **Complexity:** S · **Risk:** none.

---

## COMPLETED — the security-and-shippability floor (kept for the record)

### N1 — Restore the build (fix B1)
- **Objective:** replace the corrupted `apps/web/app/(app)/admin/page.tsx` with the real admin-overview page.
- **Reason:** the repo does not typecheck or build today; every other task is blocked behind it.
- **Dependencies:** none. The correct file is recoverable from `files.zip` in the repo root (I have it staged).
- **Acceptance:** `pnpm typecheck` clean; `pnpm build` builds web + miner; `/admin` renders the economy/floor overview, not the content screen; `pnpm verify` green; `PROJECT_STATUS.md` re-dated against that run.
- **Complexity:** S · **Risk:** none (pure restore of a known-good file).

### N2 — Close P0-1: in-page authorization (stop the RSC admin leak)
- **Objective:** make every `(app)` and `(app)/admin` **page** (not just its layout) load the caller and enforce role/ownership; centralise in a Data Access Layer so a page cannot render data without passing the check.
- **Reason:** **CONFIRMED unauthenticated** dump of member emails, roles, orders and the full ledger via a crafted `RSC:1` + `Next-Router-State-Tree` request; layouts are skipped by Next's partial rendering. Highest blast radius in the codebase.
- **Dependencies:** N1.
- **Acceptance:** the exact anonymous RSC request I used (recorded in the audit) returns a redirect/empty for `/admin/members`, `/admin/economy`, `/admin/orders`, and all other `(app)` pages; a regression test issues that request and asserts no member data in the body; every admin page calls `requireAdmin()` server-side; `leaderboard` loads the user in-page.
- **Complexity:** M · **Risk:** medium — touches every protected page; mitigate with the DAL pattern + one integration test per group.

### N3 — Close P0-2 and P0-3: invert the dev-mode default (fail closed)
- **Objective:** dev boundaries (dev mailer, dev payment provider) activate only when `DEV_MODE==="true"` **and** `NODE_ENV!=="production"`; never return `devLink` from the forgot-password action; when no real mailer/payment provider is configured in production, fail closed with an honest "not configured" message.
- **Reason:** on the shipped default, a forgotten flag hands any visitor a working admin reset link (**CONFIRMED runtime**) and gives away every card-priced product (**CONFIRMED**). Fixing the `dev.ts` tautology alone is not enough — the *default* must be safe.
- **Dependencies:** none (can land beside N1/N2).
- **Acceptance:** with `NODE_ENV=production` and no `DEV_MODE`, forgot-password shows only "check your email" (no link, nothing in logs beyond a neutral audit line) and "Buy with card" is disabled with "card payments not configured"; a test asserts the dev provider/mailer report `available:false` under production env.
- **Complexity:** S · **Risk:** low — but coordinate with RUNBOOK so operators set a real mailer/Stripe before opening those flows.

### N4 — Resolve the deploy/migrate contradiction (C4) + harden the seed guard (F10)
- **Objective:** one deploy story — migrations run out-of-band via `db:migrate:sql` (engine-free), `vercel.json` is build-only, and the three sources (root vercel, app vercel, PROJECT_STATUS) agree. Make the seed **require** `ADMIN_PASSWORD` (min length) unless an explicit `ALLOW_DEFAULT_ADMIN=1` escape is set, instead of guessing "production" from a hostname regex.
- **Reason:** the wired build runs `migrate:deploy`, which needs the Prisma engine the environment's own docs say is blocked (403 — I reproduced it); and the prod-guard is fooled by Docker/VPS/Fly/DO/Azure/GCP/Vercel-PG hosts, so a real deploy can ship the published admin password `tycoon-admin-change-me`.
- **Dependencies:** N1.
- **Acceptance:** a dry-run deploy doc that works end-to-end without the Prisma engine; seeding a fresh DB with no `ADMIN_PASSWORD` **refuses** regardless of hostname; `.env.example` and RUNBOOK updated.
- **Complexity:** S–M · **Risk:** low.

### N5 — Add `.gitattributes` + a single env loader (fix B10)
- **Objective:** force LF on `.env`, `*.sql`, `*.ts`; replace the 11 hand-rolled regex `.env` parsers with one loader (Node `--env-file` or `dotenv`).
- **Reason:** on the documented Windows platform a CRLF `.env` silently fails to load `DATABASE_URL` (reads as "not set") or leaves `DEV_MODE=false\r` truthy — which re-opens N3's holes even after they're fixed, and makes migration checksums differ between Windows and CI.
- **Dependencies:** none.
- **Acceptance:** a CRLF `.env` loads correctly; `db:migrate:sql` checksums match between a Windows checkout and CI; one loader in the tree.
- **Complexity:** S · **Risk:** low.

## NEXT — make the finished platform feel finished and correct

### X1 — Mobile navigation
- **Objective:** a working nav (menu/drawer) for the public and member shells below `md`.
- **Reason:** phone users currently cannot reach Academy/Wallet/Settings/Challenges at all (`app/(app)/layout.tsx:21`); this silently excludes a large share of real users.
- **Dependencies:** N1. **Acceptance:** every primary destination reachable at 360px without typing a URL; keyboard-operable; `aria-current` on the active link. **Complexity:** M · **Risk:** low.

### X2 — State system: loading / empty / success / error
- **Objective:** add `loading.tsx`/Suspense to the heavy `force-dynamic` routes; real empty states (zero courses/challenges/orders/leaderboard); success feedback for onboarding payout, privacy save, and card-order placement; wrap throwing server actions so a stale click shows an inline message instead of crashing to the root boundary; stop uncontrolled forms wiping input on validation error; render the register error state.
- **Reason:** the platform reads as unfinished exactly where it is finished — silent success, blank grids, whole-page crashes, lost quiz answers.
- **Dependencies:** N1. **Acceptance:** each route shows a skeleton on slow DB, a purposeful empty state at zero data, and a confirmation on every mutating action; a stale "join" click shows an inline error; forms preserve input on error. **Complexity:** M–L · **Risk:** low.

### X3 — Enforce the finite pools (fix B2) + guard reversal (B11)
- **Objective:** floor system pools (guard `gte` on REWARDS_POOL/MINING_POOL, or an explicit pool-floor) so they cannot overdraw; make reversal atomic and refuse reversing genesis/pool-funding/already-reversed; on refund set `Order.REFUNDED` and revoke `/library` access.
- **Reason:** the "fixed, provable economy" is the brand; today the pools can go negative and `EpochExhaustedError` is dead code — the economy is not actually bounded.
- **Dependencies:** N1. **Acceptance:** draining a pool throws `EpochExhaustedError` (with a test); reversing genesis is refused; a refunded digital order loses library access. **Complexity:** M · **Risk:** medium (economic behaviour change — validate against D17/A3).

### X4 — Privacy save merge (fix F5/B3)
- **Objective:** the privacy write merges into existing JSON and keeps `thc`/`courses` hidden by default; expose all six facets FAQ promises.
- **Reason:** one Settings save currently publishes THC balance + certificates, contradicting D24. **Dependencies:** N1. **Acceptance:** after any privacy save, `/u/[username]` still hides THC/courses unless explicitly enabled; six toggles present. **Complexity:** S · **Risk:** low.

### X5 — Gate enrollment (fix F6/B5)
- **Objective:** `enroll` accepts only PUBLISHED courses and enforces the purchase requirement for paid COURSE products; lesson page checks course status.
- **Reason:** free enroll voids the $49 course product and lets members read DRAFT content. **Dependencies:** N1. **Acceptance:** enrolling in a DRAFT or unpaid paid-course is refused; test covers it. **Complexity:** S–M · **Risk:** low.

### X6 — Purge stale phase copy + fix docs drift (B16)
- **Objective:** remove every "arrives in Phase N" line for shipped features (~10 public surfaces + dashboard + FAQ Telegram promise vs D18); fix `README` 48→60 tests and the "verified over HTTP" claim.
- **Reason:** the product tells users things are unbuilt that are live — the inverse of the "no faking" brand, and it reads as abandoned. **Dependencies:** none. **Acceptance:** no phase-copy remains for shipped features; docs match reality. **Complexity:** S · **Risk:** none.

### X7 — Admin authoring surfaces
- **Objective:** admin CRUD for courses/modules/lessons, products, missions, challenges (today only publish-toggle + blog exist).
- **Reason:** the LMS/marketplace cannot be filled without direct DB access — the platform is not operable by its owner. **Dependencies:** N1, N2. **Acceptance:** a course with modules/lessons and a product can be created and published from `/admin` with no SQL. **Complexity:** L · **Risk:** medium (largest new surface; keep every write behind `requireAdmin` + zod).

### X8 — Email verification + profile editing
- **Objective:** verify email on signup; add profile editor (display name, bio, avatar, username, change email/password).
- **Reason:** registration accepts unowned addresses; `/u/[username]` renders a bio with no way to set it. **Dependencies:** N3 (real mailer). **Acceptance:** unverified accounts are limited until verified; profile fields editable. **Complexity:** M · **Risk:** low.

### X9 — Miner login rate limit (fix F4) + shared limiter store
- **Objective:** apply `throttled()` to miner login; move the limiter behind an interface ready for Redis; derive client IP from a platform-trusted header (fix F8).
- **Reason:** miner login is an unthrottled Argon2 amplifier; the XFF-first-hop key is spoofable on the VPS path. **Dependencies:** none. **Acceptance:** miner login throttles; a spoofed XFF does not lift the web limit. **Complexity:** S–M · **Risk:** low.

## LATER — quality, scale and hardening (after the foundation is stable)

### L1 — Design-system scale
Replace 328 arbitrary `text-[Npx]` values (24 sizes) with a type scale; add spacing/sizing/motion/z-index tokens, an icon set (retire emoji/Unicode glyphs), documented interaction/disabled/`aria-invalid` states; delete the 8 re-styled buttons and 6 copied error banners (restore D14). **Reason:** coherence + a11y (Directive §7). **Dep:** X2. **Acceptance:** no new arbitrary values in changed files; buttons/banners use primitives; a contrast pass fixes ink-3/gold-deep/danger-on-tint failures. **Complexity:** L · **Risk:** low.

### L2 — Concurrency test suite
Add tests for inventory oversell (B4), XP-cache race (B6), pool overdraw (B2), and challenge-JSON races (B7); make the harness assert something real (fix the `tokenHash` dead assertion) and add an HTTP-level authorization matrix so `PROJECT_STATUS`'s claim has an artifact. **Reason:** these bugs are invisible to the current serial suite. **Dep:** X3. **Acceptance:** each race has a failing-before/passing-after test. **Complexity:** M · **Risk:** low.

### L3 — Performance pass
Add streaming/Suspense to the heaviest pages; stop the per-request session-renewal write; make the lesson page load one lesson, not the whole course; `cache` the double-queried `generateMetadata` records; paginate admin lists. **Reason:** Neon cold-starts will read as hangs; unbounded reads. **Dep:** X2. **Acceptance:** measured TTFB improvement on `/dashboard` and lesson pages against a cold DB; no full-course load for one lesson. **Complexity:** M · **Risk:** low.

### L4 — Production reliability
Redis-backed rate limiter (multi-instance), Sentry, Neon PITR backups, an orphaned-PENDING-order/inventory reconciliation job, a user-deletion/GDPR path, markdown sanitisation (defence-in-depth for D16), remove dead Stripe CSP + `unsafe-eval`. **Reason:** operational readiness for real traffic. **Dep:** deployed staging. **Acceptance:** limiter survives redeploy; errors reach Sentry; a backup restore is tested. **Complexity:** M–L · **Risk:** low.

### L5 — Deploy to staging + invite ~10 members
The milestone `PROJECT_STATUS.md:184` already recommends; everything after is informed by real usage. **Dep:** all NOW + X1–X6. **Acceptance:** live on a domain, admin password rotated, P0s verified closed on the live instance. **Complexity:** M · **Risk:** medium (first real infra).

## PARKED — do not spend engineering resources now

- **P1 — Chain adapter / on-chain THC.** Legal-gated by the project's own D8/D21; inert interface only. Revisit only after counsel clears it.
- **P2 — Telegram.** Cut by D18; the `TelegramLink` table stays but no integration is built. Remove the FAQ promise (X6), not the schema.
- **P3 — WebGL lattice / "exact red" / animated "Ascent" homepage.** **Blocked on decision C2.** None of this exists in `D:\TycoonHood`; the shipped brand is "the ledger" (espresso + brass/gold, no red). Until you tell me where that work lives — a chat-exported zip, another folder, or "not built yet" — this stays parked and is not invented. If it *is* intended direction, it becomes a NEXT/LATER design track with its own blueprint, gated behind the WebGL audit checklist in Directive §8 (init, lifecycle, resize, capability detection, cleanup, reduced-motion, graceful fallback) — and it must never compromise the mobile-nav and state-system work above.
- **P4 — Fractional THC / decimals.** A5 says no decimals; one-constant change if ever wanted. Not now.

---

## Sequencing at a glance

**Week-one floor:** N1 → (N2, N3 in parallel) → N4 → N5, then re-run `pnpm verify` and re-date `PROJECT_STATUS.md`. That is the minimum to make the platform buildable and safe to expose. **Then** X1–X6 make it feel finished, X7–X9 make it operable, and only **then** L1 (visual scale) — because polishing the type scale before the admin leak is closed would violate the Directive's foundation-first rule.
