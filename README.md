# TYCOONHOOD

Gamified personal development with an honest economy. Four programs, one
ledger, everything on the books.

**Stack:** TypeScript · Next.js 15 (App Router) · React 19 · PostgreSQL 16 ·
Prisma (engine-free client, committed) · Tailwind v4 · pnpm monorepo.

**Status:** not deployed. See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for what
works and what does not, and [`LAUNCH.md`](LAUNCH.md) to put it online.

---

## Run it (Windows / PowerShell)

```powershell
# prerequisites: Node 22+, pnpm 9+, PostgreSQL 16 running locally
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1
```

That script checks prerequisites, gets you a database, writes `.env`, installs,
migrates, seeds and verifies. To do it by hand instead:

```powershell
Copy-Item .env.example .env        # then edit DATABASE_URL
pnpm install
pnpm db:migrate:sql                # engine-free migration runner
pnpm db:seed                       # genesis, ranks, missions, admin
pnpm db:seed:academy               # the four programs' curriculum
pnpm db:seed:content               # essays, challenges, storefront
pnpm db:seed:merch                 # gear, priced from the live mining rate
pnpm dev                           # site   -> http://localhost:3000
pnpm dev:miner                     # Miner  -> http://localhost:3001
```

**The admin account.** The seed refuses to run without `ADMIN_PASSWORD`, because
the built-in development password is public. Set `ADMIN_EMAIL` and
`ADMIN_PASSWORD` before seeding. For a throwaway local database only,
`ALLOW_DEFAULT_ADMIN=1` opts into the public one — never set it against a real
database.

## Verify it

```powershell
pnpm verify      # typecheck + lint + 101 tests + both builds
pnpm e2e         # a real browser: author a product, buy it, ship it, get paid
pnpm preflight   # the gate between "it builds" and "it is safe to launch"
```

`pnpm e2e` drives Chromium against both production builds and, as an admin and
then as a member, authors a hoodie with five sizes, signs a new member up
through an invite link, buys size M with a delivery address, ships it with
tracking, and confirms the referral pays on a real lesson. Then it deletes
what it made and checks it left nothing behind.

## The map

| Area | Routes |
|---|---|
| Public | `/` `/about` `/programs[/slug]` `/challenges` `/thc` `/marketplace` `/roadmap` `/blog[/slug]` `/faq` `/status` `/styleguide` `/terms` `/privacy` |
| Auth | `/register` `/login` `/onboarding` `/forgot-password` `/reset-password/[token]` |
| Member | `/dashboard` `/academy[/slug[/lesson/id]]` `/leaderboard` `/wallet` `/orders` `/settings` `/library/[slug]` |
| Admin | `/admin` `/admin/{members,economy,content,missions,products,videos,challenges,orders}` |
| API | `/api/webhooks/stripe` `/api/webhooks/discord` |
| Miner | `apps/miner` — five tabs on `:3001`, shared sign-in |

## The Miner

A separate app, its own deployment, phone-first. Five tabs: **Rig** (idle
mining), **Watch** (THC for genuinely watching our videos, timed server-side),
**Squad** (invites that pay on real work, never on signup), **Ranks** (the open
books), **Wallet** (what your balance actually reaches, in months of mining).

See [`START-HERE-MINER.md`](START-HERE-MINER.md).

## The economy, in one paragraph

1 quadrillion THC minted once at genesis into Treasury — provable at `/thc`
because the mint counter-account can only go negative. Everything since is
double-entry: rewards flow from finite pools, purchases flow to REVENUE, the
Miner distributes without minting, upgrades burn THC back. Every balance is a
cached sum the wallet page re-audits live. Merch is priced in **months of
mining**, derived from the live mining rate rather than typed in, so changing
the rate moves every price with it. THC are internal utility credits — not
money, not redeemable, no transfers between members.

## Where things live

| | |
|---|---|
| `apps/web` | the platform: public site, academy, game, admin |
| `apps/miner` | the Miner PWA |
| `packages/core` | ledger, auth, LMS, gamification, mining, commerce, catalog, growth, rules engine |
| `packages/db` | Prisma schema, SQL migrations, seeds, committed engine-free client |
| `packages/ui` | the design system — tokens plus 20 components |
| `packages/config` | every economy constant, in one place |
| `docs/` | BLUEPRINT · DECISIONS · RUNBOOK |

## The documents that matter

| File | What it is for |
|---|---|
| [`LAUNCH.md`](LAUNCH.md) | Deploying it. 45 minutes, step by step. |
| [`PROJECT_STATUS.md`](PROJECT_STATUS.md) | What works, what does not. Verified, not claimed. |
| [`TYCOONHOOD_BLOCKED_ON_YOU.md`](TYCOONHOOD_BLOCKED_ON_YOU.md) | Decisions only the owner can make. |
| [`TYCOONHOOD_STATE.md`](TYCOONHOOD_STATE.md) | Full current-state audit. |
| [`TYCOONHOOD_DECISIONS.md`](TYCOONHOOD_DECISIONS.md) | Every architectural decision, with the alternatives rejected. |
| [`TYCOONHOOD_ROADMAP.md`](TYCOONHOOD_ROADMAP.md) | What is next, in order. |

## Honestly, what is missing

Course and challenge authoring in the admin — content is still seeded by
script. Membership tiers and subscriptions, which is the business model.
Analytics beyond the economy overview. Mobile navigation on the main site.
Telegram, which was cut. The roadmap has all of it, in priority order.
