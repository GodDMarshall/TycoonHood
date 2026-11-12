# Test report

**Run:** 12 November 2026, on `build/full-platform` after the account, money
and display reviews were merged, in a Linux container: Node 22.23, pnpm
9.15.9, PostgreSQL 16, Chromium through Playwright 1.63.

Only what was executed is reported. Anything not run is listed under "Not
run" with the reason.

## Summary

| Check | Command | Result |
|---|---|---|
| Types | `pnpm typecheck` | clean, every workspace |
| Lint | `pnpm lint` | clean |
| Unit and integration tests | `pnpm test` | **610 passed, 0 failed** (31 files, 46 s, against a real PostgreSQL 16) |
| Production build | `pnpm build:web` | compiles; 119 routes |
| three.js bundle rule | `node scripts/world/check-bundle.mjs` | OK: no route chunk carries three.js; the engine is in 2 async chunks |
| Accessibility | `pnpm e2e:a11y` | 27 public pages × 2 widths (1280×800, 390×844): **0 violations** of WCAG 2.0/2.1 A and AA (axe-core 4.13) |
| Browser journeys, production build | `pnpm e2e:journeys` | **154 passed, 0 failed, 4 skipped** (the skips need the sandbox or a GPU; both covered below) |
| Journeys 4 and 5 with the labelled sandbox | `JOURNEYS=4,5` against `next dev` with `DEV_MODE=true` | **26 passed, 0 failed, 0 skipped** |
| Journey 9 with the 3D engine | `JOURNEYS=9 TH_WORLD_ENGINE=1`, production build | **74 passed, 0 failed, 0 skipped** (Chromium's software GPU posing as a hardware one) |
| Vercel deploy rehearsal | `scripts/vercel-build.sh` with `VERCEL_ENV=production` | passed: see below |

## Unit and integration tests, by area

The tests run against a real PostgreSQL database, not mocks, so they cover
the SQL, the locks and the constraints as well as the code.

| Area (spec §11) | Files | Tests |
|---|---|---|
| Authentication and accounts | `auth`, `platform` (verification, suspension, email change, undo, holds, resend limits), `account-mail`, `client-ip` | 99 |
| Permissions and roles, admin audit | `launch-foundation`, `admin-audit` | 49 |
| Courses, quizzes, certificates | `academy`, `lms-authoring`, `lms-gamification` | 70 |
| XP, levels, missions, ledger, mining | `gamification`, `rules-engine`, `ledger`, `mining` | 41 |
| Cart, checkout, payment webhook, refunds, shipping | `shop`, `commerce` | 62 |
| Commissions, payouts, affiliate fraud flags | `earn` | 35 |
| Community and moderation | `discussions`, `community-moderation`, `notification-links` | 47 |
| Security: Markdown sanitiser, CSP, redirects, structured data | `markdown`, `web-csp`, `next-path`, `json-ld` | 117 |
| Display: time zones, text cuts, email wording | `time-format`, `text-clip`, `mail-outcome` | 32 |
| 3D campus: device gates, loader, state contract | `world-gate`, `world-load`, `world-state` | 50 |
| Integrations (Discord) | `discord-interactions`, `integrations` | 8 |
| **Total** | 31 files | **610** |

## Browser journeys

Chromium against `next start` (a production build), as a guest, a new member,
a second member, a referred visitor, an admin and an instructor. Every check is
something a person could see on screen; the database is read only to learn
ids and quiz answers.

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
`next dev` with `DEV_MODE=true`. All 26 checks passed. Shop: the admin creates
a coupon; the store lists products; the cart holds the item; checkout and the
payment step both say "Test mode"; the coupon shows its saving and the order
its discount; the sandbox payment succeeds; the order is in `/orders` with its
timeline and the test-mode label; a refund request reaches the admin. Earn:
the application, the admin's approval, the `/r/` link and its cookie, the
referred visitor's sign-up, the referred buyer's sandbox payment, and the
admin seeing the affiliate's commission, still held. No console errors.

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

From a fresh clone with no `.env`, installed with `pnpm install
--frozen-lockfile`, against an empty PostgreSQL 16 database, with
`VERCEL_ENV=production`, `SEED_ON_DEPLOY=1` and a test admin:

- the build script applied 12 migrations, ran the five seeds (the four
  programmes published, 33 lesson rows each) and built the site, in 81 s;
- a second run found the database up to date, and every seed ran again
  without error or change;
- `next start` on that build served `/`, `/programs`, `/about`, `/login`,
  `/register`, `/blog`, `robots.txt` and `sitemap.xml` (with the production
  address), redirected `/store` and `/world` to sign-in, and the cron endpoint
  answered 200 with the secret and 401 without it.

The script then gained a check: with `SEED_ON_DEPLOY=1`, it stops before it
touches the database when `ADMIN_EMAIL` or `ADMIN_PASSWORD` is missing (without
an email, the seed would have created `admin@tycoonhood.local`). With neither,
with only the email and with only the password, it stopped with its message and
the database stayed empty. With both, a fresh database got the 12 migrations,
the five seeds (four programmes published, 132 lesson rows, one admin) and the
build, in 68 s.

A preview build was rehearsed the same way, from the clone with no `.env`,
against an empty database (as the Neon database is until the first production
deploy), with `VERCEL_ENV=preview`: it built in 60 s and left the database with
no tables. Prisma logs seven "table does not exist" lines while Next tries
public pages for static rendering; they come from the maintenance banner,
which falls back to no banner, and those pages are rendered on request anyway.

The first real Vercel build runs on the pull request's preview, which never
touches the database, and then on the production deploy after the merge.

## Defects found and fixed in this final pass

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

The review rounds before this pass (accounts, money, display, the 3D campus)
each fixed their findings with tests; they are recorded in
`TYCOONHOOD_DECISIONS.md` (DR-31, DR-32) and the commit history.

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
- **Independent review of the last fixes.** Independent review agents were
  unavailable for the final stretch; the undo-link fixes (DR-32, updated
  12 November) were reviewed by the same builder.
