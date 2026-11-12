# TYCOONHOOD

A learning platform with an honest economy: four programmes, certificates,
an affiliate programme paid in rupees, a shop, a community, and THC, the
platform's internal credits.

**Stack:** TypeScript · Next.js 15 (App Router) · React 19 · PostgreSQL 16 ·
Prisma (engine-free client, committed) · Tailwind v4 · pnpm monorepo.

**Status:** ready to launch on Vercel. [`LAUNCH.md`](LAUNCH.md) is the runbook,
[`TYCOONHOOD_BLOCKED_ON_YOU.md`](TYCOONHOOD_BLOCKED_ON_YOU.md) lists what only
the owner can do, and [`TYCOONHOOD_STATE.md`](TYCOONHOOD_STATE.md) says what
works and how it was checked.

---

## Run it locally

Prerequisites: Node 22.12 or later, pnpm 9, PostgreSQL 16.

```
cp .env.example .env               # then set DATABASE_URL
pnpm install
pnpm db:migrate:sql                # engine-free migration runner
pnpm db:seed                       # genesis, levels, ranks, missions, the admin
pnpm db:seed:academy               # the four programmes
pnpm db:seed:content               # essays, challenges, storefront items
pnpm --filter @tycoonhood/db seed:shop
pnpm --filter @tycoonhood/db seed:community
pnpm dev                           # http://localhost:3000
```

On Windows, `setup-windows.ps1` does the same.

**The admin account.** The seed refuses to run without `ADMIN_PASSWORD`,
because the built-in development password is public. Set `ADMIN_EMAIL` and
`ADMIN_PASSWORD` before seeding. For a throwaway local database only,
`ALLOW_DEFAULT_ADMIN=1` opts into the public one. Never set it against a real
database.

`DEV_MODE=true` (local only) turns on the labelled payment sandbox and writes
emails to the server log instead of sending them. A production build ignores
it.

## Check it

```
pnpm typecheck && pnpm lint        # all workspaces
pnpm test                          # 610 tests against a real Postgres
pnpm build:web
pnpm e2e:journeys                  # nine browser journeys against a running build on :3000
pnpm preflight                     # reads the production environment before launch
```

Results of the last full run: [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## The map

| Area | Routes |
|---|---|
| Public | `/` `/about` `/learning` `/programs[/slug]` `/instructors/[slug]` `/earn` `/earn/terms` `/marketplace[/slug]` `/connect` `/blog[/slug]` `/success-stories` `/challenges` `/thc` `/roadmap` `/status` `/contact` `/faq` `/terms` `/privacy` `/refund-policy` `/verify/[serial]` `/u/[username]` |
| Sign-in | `/register` `/login` `/onboarding` `/forgot-password` `/reset-password/[token]` `/verify-email/[token]` `/undo-email/[token]` |
| Member | `/today` `/courses[/slug[/lesson/id]]` `/courses/history` `/certificates[/serial]` `/library/[slug]` `/community[/channel]` `/community/discussions/**` `/community/groups[/slug]` `/leaderboard` `/achievements` `/mining` `/mining/{tasks,squad,ranks}` `/wallet` `/store[/slug]` `/cart` `/wishlist` `/checkout/**` `/orders[/id]` `/earnings` `/profile` `/notifications` `/settings` `/world` |
| Admin | `/admin` and `/admin/{members,courses,content,community,moderation,challenges,missions,standard,economy,earn,products,orders,coupons,refunds,videos,site,analytics,audit}` |
| API | `/api/webhooks/razorpay` `/api/cron/expire-orders` `/api/community/[channel]` `/api/integrations/discord/interactions` `/r/[code]` (affiliate links) |

`/world` is the optional 3D campus. Phones, tablets, reduced motion and
software GPUs get its 2D page. `apps/miner` only redirects old Miner links to
`/mining`.

## The economy, in one paragraph

THC is minted once at genesis into a treasury, and every movement since is a
balanced double-entry transaction with an idempotency key, so the supply is
provable at `/thc`. THC are internal credits: not money, not redeemable, not
transferable between members. Rupees are a separate rail: Razorpay payments
and affiliate commissions, stored in integer paise.

## Where things live

| | |
|---|---|
| `apps/web` | the platform: public site, member app, admin centre |
| `apps/miner` | redirects only |
| `packages/core` | every domain rule: auth, permissions, LMS, gamification, ledger, shop, earn, community, platform |
| `packages/db` | Prisma schema, SQL migrations, seeds, the curriculum, the committed engine-free client |
| `packages/ui` | design tokens and shared components |
| `packages/config` | economy and programme constants |
| `scripts/` | the Vercel build, browser journeys, the 3D bundle check |

## The documents that matter

| File | What it is for |
|---|---|
| [`LAUNCH.md`](LAUNCH.md) | Going live on Vercel, step by step |
| [`TYCOONHOOD_BLOCKED_ON_YOU.md`](TYCOONHOOD_BLOCKED_ON_YOU.md) | What only the owner can do |
| [`TYCOONHOOD_STATE.md`](TYCOONHOOD_STATE.md) | What works, what does not, and how it was checked |
| [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) | The latest test and journey results |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Environment variables, Razorpay, scheduled jobs |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DATABASE.md`](docs/DATABASE.md) | How it is built |
| [`docs/CONTENT_INVENTORY.md`](docs/CONTENT_INVENTORY.md) | Programmes, lessons and pages |
| [`docs/AGENT_OWNERSHIP.md`](docs/AGENT_OWNERSHIP.md) | Who built which part |
| [`TYCOONHOOD_DECISIONS.md`](TYCOONHOOD_DECISIONS.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) | Decisions, with the alternatives rejected |
| [`TYCOONHOOD_ROADMAP.md`](TYCOONHOOD_ROADMAP.md) | What is next, in order |
