# TYCOONHOOD — Current state and completion report

**Last updated:** 12 November 2026, on branch `build/full-platform`, the day
before the launch. The gates ran at `e585d36`: the email-change and deploy
review fixes merged at `dd5810e`, plus the fixes for what verifying that
merge found (§6). The browser checks and the deploy rehearsal ran at
`dd5810e`; nothing they exercise has changed since.
**Scope:** the full-platform build spec (11 November 2026), its follow-up
reviews, and the deployment set-up.
**Evidence:** every result below comes from a command that was run on
12 November; the numbers and the commands are in
[`docs/TEST_REPORT.md`](docs/TEST_REPORT.md). The September audit that this
file used to hold is in the git history.

Each item carries one of the spec's five classifications:

- **VERIFIED COMPLETE**: built, and exercised by an automated test or a
  browser journey that ran on 12 November.
- **IMPLEMENTED BUT UNVERIFIED**: built, but not exercised end to end, usually
  because it needs a credential or hardware that is not here.
- **PARTIAL**: works, with a gap that is named.
- **BLOCKED**: needs something only the owner can provide.
- **NOT IMPLEMENTED**.

---

## 1. Build status

| Gate | Result |
|---|---|
| `pnpm typecheck` | clean in all five workspaces |
| `pnpm lint` | clean |
| `pnpm test` | **737 / 737**, in each of two full runs (39 files, against PostgreSQL 16) |
| `pnpm build:web` | compiles; 107 routes |
| 3D bundle rule | no route chunk carries three.js |
| `pnpm e2e:a11y` | 27 public pages at desktop and phone widths: **0** WCAG A/AA violations |
| `pnpm e2e:journeys` | **154 passed, 0 failed, 4 skipped** on the production build. The skipped checks passed in their own runs: shop and Earn with the payment sandbox (26 of 26) and the 3D engine (74 of 74) |
| Vercel deploy rehearsal | fresh clone, empty database: 15 migrations, 5 seeds, build, then served; a second run changed no row; the build stops before touching the database without the admin account, with an address sign-in refuses, or with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` naming different databases; a preview build leaves the database untouched |

**Deployment status:** **not deployed yet.** The Vercel project is configured
and the database is connected (see [`LAUNCH.md`](LAUNCH.md)). The first
production deploy runs when the pull request is merged, after the owner sets
the admin account in Vercel. This file will say "deployed" only after a
production deployment has served the site.

## 2. The spec's deliverables

| # | Deliverable | Classification | Notes |
|---|---|---|---|
| 1 | Accessible public website | **VERIFIED COMPLETE** | Journey 1 opens every public page; the axe audit found no WCAG A/AA violation at 1280 and 390 px. Screen-reader use by a person has not been tested |
| 2 | Authentication | **VERIFIED COMPLETE** | Register, onboarding, sign-in, sign-out, password reset, email confirmation, email change with undo and a 7-day hold, suspension (DR-32). Unit tests plus journey 2. Real email delivery is BLOCKED on Resend |
| 3 | Member dashboard | **VERIFIED COMPLETE** | `/today`: progress, streak, missions, notifications, profile completion. Journeys 2 and 3 |
| 4 | Four complete programmes | **VERIFIED COMPLETE** | Warrior, Business Mastery, Financial Planning and Investment Advisory, Mindfulness and Wellness; all published |
| 5 | At least 96 substantive lessons | **VERIFIED COMPLETE** | 96 taught lessons, 52,839 words, 207 quiz questions with explanations ([`docs/CONTENT_INVENTORY.md`](docs/CONTENT_INVENTORY.md)) |
| 6 | Assessments and progress | **VERIFIED COMPLETE** | Module checks and a 12-question final; lessons open in order; a check completes only when passed. Journey 3 |
| 7 | Certificates | **VERIFIED COMPLETE** | Issued on passing the final, with a serial and a public `/verify/[serial]` page. Unit tests |
| 8 | Earning ecosystem | **VERIFIED COMPLETE** (THC) / **PARTIAL** (rupees) | THC mining, missions and rewards work. Rupee commissions are tested in unit tests and in the sandbox journey; real money waits on Razorpay |
| 9 | Affiliate and referral tracking | **VERIFIED COMPLETE** | `/r/[code]` records hashed clicks (no raw IPs), a 30-day cookie, INR commissions with a 14-day hold, payouts, fraud flags, reversals on refund. Journey 5 and 35 unit tests |
| 10 | Marketplace | **VERIFIED COMPLETE** | `/marketplace` and `/store`. Merch is in draft until real prices exist (BLOCKED, see §6) |
| 11 | Cart and checkout | **VERIFIED COMPLETE** (THC and sandbox) / **BLOCKED** (live card payments) | Cart, wishlist, coupons, checkout, order timeline, refunds. Razorpay is coded and its webhook signature checked in tests; no real payment has been made because no keys exist |
| 12 | Admin centre | **VERIFIED COMPLETE** | Members, roles, courses (authoring and publishing), content, community and moderation, missions, economy, Earn, products, orders, coupons, refunds, videos, site, analytics, audit log. Journey 7 |
| 13 | XP, ranks and achievements | **VERIFIED COMPLETE** | 50 levels, five ranks, achievements and weekly missions as data, leaderboard. Journey 3 and unit tests |
| 14 | Community | **VERIFIED COMPLETE** | Chat channels, a discussion forum, groups, reactions, reports, moderation, mutes. Journey 6 |
| 15 | Founder About page (Harsha) | **IMPLEMENTED BUT UNVERIFIED** | Uses the real photo Marshall supplied (`/founder/harsha.jpg`). The copy awaits Harsha's review |
| 16 | Optional 3D world with a 2D fallback | **VERIFIED COMPLETE** (gates and 2D page) / **IMPLEMENTED BUT UNVERIFIED** (on real GPUs) | `/world`. Phones, tablets, reduced motion and software GPUs get the 2D page; three.js loads only on demand. Journey 9. Never run on real graphics hardware |
| 17 | Responsive mobile experience | **VERIFIED COMPLETE** | Journey 8 at 390×844: no sideways scroll, menus open. Phone-width axe audit clean |
| 18 | Security and testing reports | **VERIFIED COMPLETE** | §5 here, and [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) |
| 19 | Deployment instructions | **VERIFIED COMPLETE** | [`LAUNCH.md`](LAUNCH.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md); the build path was rehearsed. The live deploy itself is still to come |
| 20 | External credentials and assets still needed | **VERIFIED COMPLETE** | [`TYCOONHOOD_BLOCKED_ON_YOU.md`](TYCOONHOOD_BLOCKED_ON_YOU.md) |

Other spec items:

| Item | Classification | Notes |
|---|---|---|
| Seven roles (guest plus six signed-in roles) | **VERIFIED COMPLETE** | Permissions are one table, checked on the server in every page and action. Journey 7 changes a role and checks the walls |
| THC is internal and non-monetary | **VERIFIED COMPLETE** | A double-entry ledger with a provable supply at `/thc`; never converted to money, never transferable between members |
| Payments never simulated outside the labelled sandbox | **VERIFIED COMPLETE** | A production build cannot run the sandbox; test keys only serve admins there |
| Membership tiers and subscriptions | **NOT IMPLEMENTED** | Not in the 11 November spec; on the roadmap (A3) |
| Challenge authoring in the admin | **NOT IMPLEMENTED** | Challenges are seeded; the review queue exists (A2) |

## 3. Courses and lessons created

Four programmes × eight modules × three taught lessons = **96 lessons**, plus
a knowledge check per module and a 12-question final per programme. All are
attributed to the founder instructor, Harsha, and seeded by
`pnpm db:seed:academy`. Details: [`docs/CONTENT_INVENTORY.md`](docs/CONTENT_INVENTORY.md).

## 4. User journeys tested

Nine browser journeys in Chromium against the production build
(`pnpm e2e:journeys`): guest pages, sign-up to Today, learning and quizzes,
shop, Earn, community, admin and roles, mobile, and the 3D campus. Journeys 4
and 5 also ran under `next dev` with the labelled sandbox, because a
production build never runs it. Counts and skips: [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## 5. Security findings

Closed in this build (each with tests):

- An email change waits for the new address; the old address can undo it for
  7 days; no second change while the last can be undone; sign-in cannot
  outlive a password change; reset links die on a password or email change
  (DR-32).
- Orders settle once and ship once under concurrent requests; a refunded
  order cannot be shipped.
- Author Markdown is sanitised (DR-30); open redirects are refused
  (`safeNextPath`); the CSP allows only Razorpay and YouTube beyond the site.
- Raw IP addresses are never stored; affiliate clicks are salted hashes.
- Confirmation resends are limited under a database lock.

Known limits, accepted for launch:

- **Preview deployments share the production database settings.** They never
  migrate or seed and they sit behind Vercel login, but a preview someone
  uses reads and writes production data. A preview built before the
  12 November email-change migrations also writes account rows the live site
  misreads, so none may be used to change an account
  ([`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), "Rows older code writes after
  a migration", with the backfills to run again). Fix: a Neon branch for
  previews.
- **The seeded admin's address starts unconfirmed.** The deploy cannot know
  the mailbox is the owner's, so it does not confirm it. Until the owner
  confirms it from the banner ([`LAUNCH.md`](LAUNCH.md), step 5), a change
  away from it waits a day but gets no hold and no undo link. The seed's log
  says so.
- **IP-based rate limits trust one proxy hop** (`TRUSTED_PROXY_HOPS=1`, right
  for Vercel). Behind a different setup, set it correctly.
- **Reviews:** the findings of an independent review of the email-change work
  and the deploy set-up are fixed and merged (DR-32, DR-33), and what
  verifying the merge found is fixed too (§6). The 12 November runs
  exercised the result (§1), but no independent review of these fixes is
  recorded. An outside review before taking real money at scale is worth
  it.

## 6. Outstanding bugs and gaps

- A refunded course order does not revoke the enrolment (roadmap follow-up).
- `archivedAt`, `editedAt` and `paidAt` columns are still to add
  ([`docs/DATABASE.md`](docs/DATABASE.md)).
- **Fixed since the merge `dd5810e`:** verifying it found four problems, each
  now fixed with its own commit. `seed-admin.test.ts` was written before the
  email-change rules it met, so `pnpm typecheck` and two of its tests failed;
  the tests now confirm the address before moving it, and the seed's refusal
  of a held address is tested again. The seeded admin starts unconfirmed and
  nothing asked the owner to confirm it; the seed and `LAUNCH.md` now do
  (§5). Rows that code older than a migration writes after it are now
  documented, with the backfills to run again. The preflight now fails
  without `CRON_SECRET` in production, and the env example, README and
  `LAUNCH.md` match the merged code. One thing was left on purpose: the
  comment of the applied migration `20261112100000_email_hold_notice_sent`
  describes the code before it wrongly, and [`docs/DATABASE.md`](docs/DATABASE.md)
  corrects it instead of the file, because changing an applied migration
  makes the migration runner refuse every database that applied it. Details:
  [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md), "Fixed since the merge".
- The defect found in the pass before these merges (the phone More button's
  name when the cart held items) was fixed and re-run.

## 7. External integrations needing credentials

| Integration | State | What activates it |
|---|---|---|
| Neon (database) | connected | done |
| Vercel (hosting) | configured | merge the pull request |
| Resend (email) | **BLOCKED** | `RESEND_API_KEY`, `MAIL_FROM`, a verified domain |
| Razorpay (card payments) | **BLOCKED** | KYC, then keys and the webhook secret |
| Domain | **BLOCKED** | add it in Vercel and set DNS; set `NEXT_PUBLIC_SITE_URL` |
| Discord role sync | optional | `DISCORD_*` variables |
| YouTube watch-to-earn | optional | real video links in `/admin/videos` |

## 8. Founder image

**Present.** The photo Marshall supplied is at
`apps/web/public/founder/harsha.jpg` and used on `/about`. The page copy needs
Harsha's review.

## 9. Exact remaining blockers

For launch: the admin account in Vercel, the domain, and Resend
(`TYCOONHOOD_BLOCKED_ON_YOU.md` items 1 to 3). Before taking money: Razorpay
KYC, legal review, real merch prices (items 4 to 6).
