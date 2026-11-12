# Test report

**Run:** 12 November 2026, on `build/full-platform`, in a Linux container:
Node 22.23, pnpm 9.15.9, PostgreSQL 16, Chromium through Playwright 1.63.

- The gates (types, lint, the unit and integration tests, the production
  build and the bundle rule) ran at `e585d36`. That is the merge `dd5810e`
  of the fixes from the independent review of the email-change work
  (`fix/account-review`) and of the deploy set-up (`fix/seed-review`), plus
  the fixes for what verifying that merge found ("Fixed since the merge",
  below).
- The browser checks and the Vercel deploy rehearsal ran at `dd5810e` and
  were not repeated. None of them failed, and nothing under `apps/web` has
  changed since. The fixes touch tests, the base seed's output, one new
  function in `packages/core` that the site does not call, the preflight
  script and documents.

Only what was executed is reported. Anything not run is listed under "Not
run" with the reason.

## Summary

| Check | Command | Commit | Result |
|---|---|---|---|
| Types | `pnpm typecheck` | `e585d36` | clean in all five workspaces (at `dd5810e` it failed in `packages/core`; see "Fixed since the merge") |
| Lint | `pnpm lint` | `e585d36` | clean |
| Unit and integration tests | `pnpm test` | `e585d36` | **737 passed, 0 failed**, in each of two full runs (737 tests in 39 files; 135 s and 139 s, against a real PostgreSQL 16) |
| Production build | `pnpm build:web` | `e585d36` | compiles; 107 routes in Next's route table, the new `/api/cron/email-holds` among them |
| three.js bundle rule | `node scripts/world/check-bundle.mjs` | `e585d36` | OK: 120 routes and 131 route chunks checked, none carries three.js; the engine is in 2 async chunks. The script's count adds layouts and Next's own entries to the 107 routes; the 119 reported before `dd5810e` was this count without `/api/cron/email-holds` |
| Accessibility | `pnpm e2e:a11y` | `dd5810e` | 27 public pages × 2 widths (1280×800, 390×844): **0 violations** of WCAG 2.0/2.1 A and AA (axe-core 4.13) |
| Browser journeys, production build | `pnpm e2e:journeys` | `dd5810e` | **154 passed, 0 failed, 4 skipped** (the skips need the sandbox or a GPU; both covered below) |
| Journeys 4 and 5 with the labelled sandbox | `JOURNEYS=4,5` against `next dev` with `DEV_MODE=true` | `dd5810e` | **26 passed, 0 failed, 0 skipped** |
| Journey 9 with the 3D engine | `JOURNEYS=9 TH_WORLD_ENGINE=1`, production build | `dd5810e` | **74 passed, 0 failed, 0 skipped** (Chromium's software GPU posing as a hardware one) |
| Vercel deploy rehearsal | `scripts/vercel-build.sh` with `VERCEL_ENV=production` | `dd5810e` | passed: see below |

## Unit and integration tests, by area

The tests run against a real PostgreSQL database, not mocks, so they cover
the SQL, the locks and the constraints as well as the code.

| Area (spec §11) | Files | Tests |
|---|---|---|
| Authentication and accounts | `auth`, `platform` (verification, suspension, email change, undo, holds, the one-day wait, resets, deletion requests, races), `account-mail`, `client-ip`, `email-change-actions`, `email-notice`, `resend-mailer`, `tx-retry` | 166 |
| Permissions and roles, admin audit | `launch-foundation`, `admin-audit` | 49 |
| Courses, quizzes, certificates | `academy`, `lms-authoring`, `lms-gamification` | 71 |
| XP, levels, missions, ledger, mining | `gamification`, `rules-engine`, `ledger`, `mining` | 41 |
| Cart, checkout, payment webhook, refunds, shipping, the scheduled sweeps' secret | `shop`, `commerce` | 63 |
| Commissions, payouts, affiliate fraud flags | `earn` | 35 |
| Community and moderation | `discussions`, `community-moderation`, `notification-links` | 47 |
| Security: Markdown sanitiser, CSP, redirects, structured data | `markdown`, `web-csp`, `next-path`, `json-ld` | 117 |
| Display: time zones, text cuts, email wording | `time-format`, `text-clip`, `mail-outcome` | 33 |
| 3D campus: device gates, loader, state contract | `world-gate`, `world-load`, `world-state` | 50 |
| Integrations (Discord) | `discord-interactions`, `integrations` | 8 |
| Deploys: one database target, the deploy lock, the seeded admin, seed re-runs | `db-target`, `deploy-lock`, `seed-admin`, `seed-rerun` | 57 |
| **Total** | 39 files | **737**, all passed |

`deploy-lock` and `seed-rerun` are the deploy rehearsal inside the suite. They
run the real migration runner, the five seeds and `scripts/with-db-lock.mjs`
as separate processes against throwaway databases built from nothing: two
builds that migrate and seed at once, a lost lock and a stop signal,
keepalive probes, and a second run of the seeds that changes no row, staff
edits included. All 23 of their tests passed.

## Browser journeys

Chromium against `next start` (a production build), as a guest, a new member,
a second member, a referred visitor, an admin and an instructor. Every check is
something a person could see on screen; the database is read only to learn
ids and quiz answers.

The server was the production build of `dd5810e`, started with
`next start -p 3347` in `apps/web` (the root `.env`, so the test database). The audit and the journeys
were pointed at it with `TH_WEB=http://localhost:3347`, and the journeys also
got `NEXT_PUBLIC_SITE_URL=http://localhost:3347`, so the verification link the
fixture prints goes to that server.

| Journey | What it does | Result |
|---|---|---|
| 1. Guest | every public page answers 200 with a heading and no console errors; the founder photo and name on `/about`; the contact form | pass |
| 2. Sign-up | register → onboarding → `/today`; the unconfirmed-email banner; the confirmation link works once and is then refused | pass |
| 3. Learner | enrol; later lessons stay locked; complete a module's lessons in order and pass its quiz; the next module opens; XP rises (75 → 475); `/certificates` loads | pass |
| 4. Shop | the admin creates a coupon; the store lists products; the cart; THC checkout; the order and its timeline in `/orders`; a refund request reaches the admin | pass; the sandbox card payment and the coupon need `DEV_MODE` (passed separately, below) |
| 5. Earn | apply as an affiliate; the admin approves; the member's `/r/` link sets the affiliate cookie; the referred visitor signs up | pass; the referred rupee purchase and its commission need the sandbox (passed separately, below) |
| 6. Community | post, comment, react (it persists), report; the report reaches `/admin/moderation` and is resolved; leaderboard and achievements load | pass |
| 7. Admin and roles | make a member an instructor; the instructor reaches course admin but not members; members are kept out of `/admin`; suspend (signs the member out) and restore; the audit log shows each change, linked to the member | pass |
| 8. Mobile 390×844 | no sideways scroll on member and public pages; the menus open and navigate | pass |
| 9. 3D campus | phones, tablets, reduced motion and software GPUs get the 2D page, saying why; nothing of the engine is fetched on them; robots and sitemap leave `/world` out | pass; the engine itself needs `TH_WORLD_ENGINE=1` (below) |

### Journeys 4 and 5 with the labelled sandbox

A production build never runs the payment sandbox, so these two ran against
`next dev -p 3348` with `DEV_MODE=true` (from the root `.env`), with
`NEXT_PUBLIC_SITE_URL` set to that address for the server and the journeys.
All 26 checks passed. Shop: the admin creates a coupon; the store lists
products; the cart holds the item; checkout and the payment step both say
"Test mode"; the coupon shows its saving and the order its discount; the
sandbox payment succeeds; the order is in `/orders` with its timeline and the
test-mode label; a refund request reaches the admin. Earn: the application,
the admin's approval, the `/r/` link and its cookie, the referred visitor's
sign-up, the referred buyer's sandbox payment, and the admin seeing the
affiliate's commission, still held. No console errors.

### Journey 9 with the engine

`TH_WORLD_ENGINE=1` makes Chromium's software renderer report a hardware GPU,
so the campus loads, and drives every way back to the 2D page. All 74 checks
passed: it loads, draws one canvas and fetches only its own textures; leaving
the page frees every GL context; "2D view", reduced motion, a lost GL context,
a window narrower than 1024 px, frames over a second apart, textures that fail
and a load that stalls each close it with the matching sentence and release
its GL context; focus lands on the status line or inside the campus with a
visible ring; no console errors. What this cannot show is how fast it runs on
a real graphics card.

## The Vercel deploy, rehearsed

From a fresh clone of `dd5810e` with no `.env`, installed with `pnpm install
--frozen-lockfile` (461 packages, all from the local pnpm store), against
empty PostgreSQL 16 databases. Each run had a clean environment holding only
the variables named here.

- With `VERCEL_ENV=production` and `SEED_ON_DEPLOY=1`, the script stopped
  with its message before it touched the database when `ADMIN_EMAIL` and
  `ADMIN_PASSWORD` were both missing, when only the email was set, when only
  the password was set, when `ADMIN_EMAIL` kept its quote marks
  (`"owner@example.com"`), and when `DATABASE_URL` and
  `DATABASE_URL_UNPOOLED` named different databases. Each time, the
  databases still had no tables.
- With both set (the email typed as `Rehearsal.Admin@Example.COM`),
  `DATABASE_URL` and `DATABASE_URL_UNPOOLED` both naming the empty database, a
  production `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` and
  `AFFILIATE_HASH_SECRET`, the script took the deploy lock over
  `DATABASE_URL_UNPOOLED`, applied 15 migrations, ran the five seeds (the
  four programmes published, 132 lesson rows, one admin stored as
  `rehearsal.admin@example.com`, one of each of the five system ledger
  accounts, one genesis mint) and built the site, in 70 s.
- A second run found the 15 migrations applied, found the admin and left its
  password and role, left the four programmes as they were built, and built
  again, in 55 s. Every row of the 74 tables (all but the migration log) was
  compared by checksum before and after it: none changed.
- `next start` on that build served `/`, `/programs`, `/about`, `/login`,
  `/register`, `/blog`, `robots.txt` and `sitemap.xml` (both with the
  production address), redirected `/store` and `/world` to sign-in, and both
  cron endpoints, `/api/cron/expire-orders` and `/api/cron/email-holds`,
  answered 200 with the secret and 401 without it or with a wrong one.

A preview build was rehearsed the same way, against another empty database
(as the Neon database is until the first production deploy), with
`VERCEL_ENV=preview`: it built in 44 s and left the database with no tables.
Prisma logs seven "table does not exist" lines while Next tries public pages
for static rendering; they come from the maintenance banner, which falls back
to no banner, and those pages are rendered on request anyway.

The first real Vercel build runs on the pull request's preview, which never
touches the database, and then on the production deploy after the merge.

## Fixed since the merge

Verifying `dd5810e` found four problems. Each was reproduced first, then
fixed with its own commit.

1. **`seed-admin.test.ts` met email-change rules it was written before**
   (`84793d2`). At `dd5810e`, `pnpm typecheck` failed in `packages/core`
   (`test/seed-admin.test.ts(276,58): error TS18047: 'moved.undo' is possibly
   'null'`), and two tests in "an ADMIN_EMAIL that an account changed away
   from in the last 7 days" failed with `EmailChangeNotYetError` ("This link
   works from 13 Nov 2026, … The account's current email was never
   confirmed, so a change away from it waits a day"), thrown at
   `src/platform/email-verification.ts:436`. Reproduced as reported: 13 of
   15 passed, the same two failed. Both tests moved an address nobody had
   confirmed (the seeded admin's, and a member's who had just registered).
   Under DR-32 such a change waits a day and gets no hold and no undo link,
   so the second test's premise, that the address is held, was false as
   well. The tests now confirm the address with its real confirmation link
   before the change, narrow the undo link before using it, and check that
   the hold exists before running the seed, so the seed's refusal of a held
   address is tested again. A new case covers an `ADMIN_EMAIL` never
   confirmed: a change away from it holds nothing, and the seed makes an
   admin there only once no admin can sign in.
2. **The seeded admin's address starts unconfirmed, and nothing asked the
   owner to confirm it** (`e8b139a`). Until it is confirmed, a change away
   from the only admin's address gets no hold and no undo link, only the
   day's wait. The seed now says so when it makes an admin, or makes an
   account admin, whose address is not confirmed. LAUNCH.md step 5 asks the
   owner to confirm it from the banner once Resend works, and step 1, the
   owner's list and DEPLOYMENT.md say the same. Two new tests: the seed
   prints the reminder for an unconfirmed admin, made or promoted, and not
   for an account whose owner confirmed it. The seed still does not mark
   the address confirmed: with a mistyped `ADMIN_EMAIL`, that mailbox would
   get the undo link of the owner's first email change.
3. **Rows that code older than the 12 November migrations writes after
   them** (`42334c4`). Reproduced against the test database with rows
   written the way `ca788c8` writes them (a temporary test, not kept): a
   hold without `noticeSentAt` is put back 10 minutes later, though its
   notice went out; a change without `pendingEmailAt` skips the day's wait;
   a deletion request without `userId` is not seen as the account's.
   DEPLOYMENT.md, "Rows older code writes after a migration", now explains
   when that can happen (at launch, only through a preview built before the
   migrations) and gives the three backfills to run again; they were
   checked inside a rolled-back transaction. The comment in
   `20261112100000_email_hold_notice_sent` describes the code before it
   wrongly (`ca788c8` sent the notice in `after()` and never read whether it
   went out); DATABASE.md says so. The migration file itself
   is left as it is: on a scratch copy, changing one comment line made
   `migrate-sql --status` against the test database stop with "CHECKSUM
   MISMATCH" (exit 1), as it would on every database that applied it.
4. **Documents and preflight behind the merged code** (`2c6ad6f`,
   `e585d36`). The preflight now fails without `CRON_SECRET` in production
   (DR-32 made it required) and names both daily sweeps. It is
   `cronPreflight`, beside `cronAuth`, with one new test. Run against the
   test database, the preflight warns in development, fails with
   `NODE_ENV=production`, and passes with a secret set. `.env.example`
   lists `DATABASE_URL_UNPOOLED`, README lists `/api/cron/email-holds`, and
   LAUNCH.md names both sweeps under the plan limits and says that without
   email no email change can happen at all.

## Defects found and fixed in the pass before these merges

1. **Phone menu button name.** With items in the cart, the More button's
   accessible name became "More 1 (Cart, 1 item)", and journey 9, which
   looked for "More", failed after 30 seconds. The number is now hidden from
   screen readers, so the button reads "More (Cart, 1 item)", and the
   journeys accept either name. Journeys 8 and 9 were re-run (71 passed),
   then the full set (154 passed).
2. **Deploy configuration.** Both `vercel.json` files carried a `"//"`
   comment key, which Vercel's schema rejects; it failed the deploy of
   11 November before the build started. Functions were set to Mumbai while
   the database is in Washington. Both fixed (DR-33).
3. **CI workflow.** `.github/workflows/verify.yml` seeded without the
   throwaway-database opt-in (the seed refuses), pinned pnpm twice (the setup
   action refuses), and called a verification script that no longer exists.
   It now mirrors the production deploy: the engine-free migration runner,
   the five seeds, the four gates, the bundle rule.
4. **Sitemap read the database at build time.** `sitemap.xml` was rendered
   during `next build`, so a preview build against the still-empty production
   database would have failed. It is now rendered on request (which also
   lists a new programme or post without a redeploy), and the preview build
   above passes against an empty database.

The review rounds (accounts, money, display, the 3D campus, then the
email-change and deploy reviews merged here) each fixed their findings with
tests; they are recorded in `TYCOONHOOD_DECISIONS.md` (DR-31, DR-32, DR-33)
and the commit history.

## Not run

- **Real card payments.** No Razorpay keys exist, so no payment has gone
  through Razorpay's servers. The sandbox, the webhook signature check and
  the refund and settlement rules are tested.
- **Real email delivery.** No Resend key. The development mailer is exercised
  instead, and the production wording for "no mailer" is tested.
- **Real graphics hardware for `/world`.** Only Chromium's software renderer.
- **Safari and Firefox.** The journeys use Chromium, with iPhone and iPad
  emulation for journeys 8 and 9.
- **Load and performance tests.** None.
- **Screen readers in human hands.** The axe audit checks the markup, not the
  experience.
- **The browser checks and the deploy rehearsal at `e585d36`.** They ran at
  `dd5810e`, where none failed, and were not repeated: nothing under
  `apps/web`, `scripts/` or the migrations has changed since. The one change
  a deploy runs, the base seed's reminder to confirm the admin's address,
  runs in `seed-admin.test.ts`, which starts the real seed script against
  throwaway databases.
- **Two production builds at once, by hand.** The rehearsal in
  `docs/DEPLOYMENT.md` ("Rehearsals") was not repeated; `deploy-lock.test.ts`
  (14 tests, passed) starts overlapping runs of the real lock, migrations and
  seeds instead.
- **A Vercel build of this head.** Nothing was pushed; the rehearsal above
  ran the build script locally.
- **Independent review of the latest fixes.** The findings of an independent
  review of the email-change work and the deploy set-up were fixed on
  `fix/account-review` and `fix/seed-review` and merged here (DR-32, DR-33),
  and what verifying that merge found was fixed after it ("Fixed since the
  merge"). This report checks the branch; it is not a review of those
  fixes, and no independent review of them is recorded.
