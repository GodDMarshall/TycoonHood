# TYCOONHOOD

Gamified personal development with an honest economy. Four programs, one
ledger, everything on the books.

**Stack:** TypeScript · Next.js 15 (App Router) · PostgreSQL 16 · Prisma
(engine-free client, committed) · Tailwind v4 · pnpm monorepo.

## Run it (Windows / PowerShell)

```powershell
# prerequisites: Node 22+, pnpm 9+, PostgreSQL 16 running locally
Copy-Item .env.example .env        # then edit DATABASE_URL if needed
pnpm install
pnpm db:migrate                    # applies SQL migrations in order
pnpm db:seed                       # economy genesis + ranks + missions + admin
pnpm db:seed:content               # essays, challenges, marketplace
pnpm db:seed:academy               # the four programs' curriculum (publishes them)
pnpm dev                           # web  -> http://localhost:3000
pnpm dev:miner                     # miner -> http://localhost:3001 (second terminal)
pnpm test                          # 48 integration tests against your local DB
```

Admin: `admin@tycoonhood.local` / `tycoon-admin-change-me` (override with
`ADMIN_EMAIL` / `ADMIN_PASSWORD` **before** seeding).

## The map

| Area | Routes |
|---|---|
| Public | `/` `/about` `/programs[/slug]` `/challenges` `/thc` `/marketplace` `/roadmap` `/blog[/slug]` `/faq` `/status` `/styleguide` |
| Auth | `/register` `/login` `/onboarding` |
| Member | `/dashboard` `/academy[/slug[/lesson/id]]` `/leaderboard` `/wallet` `/orders` `/settings` |
| Admin | `/admin` `/admin/{members,economy,content,challenges,orders}` |
| API | `/api/webhooks/stripe` |
| Miner app | `apps/miner` — mobile-first PWA on :3001, shared sign-in |

## The economy, in one paragraph

1 quadrillion THC minted once at genesis into Treasury — provable at
`/thc` because the mint counter-account can only go negative. Everything
since is double-entry: rewards flow from finite pools (REWARDS_POOL,
MINING_POOL), purchases flow to REVENUE, the Miner distributes without
minting, upgrades burn THC back. Every balance is a cached sum the wallet
page re-audits live. THC are internal utility credits — not money, not
redeemable, no transfers between members (deliberately, pending legal).

## Where things live

```
apps/web        the platform (public site, academy, game, admin)
apps/miner      the Miner PWA
packages/core   services: ledger, auth, lms, gamification, mining, commerce, integrations, chain
packages/db     Prisma schema, SQL migrations, seeds, committed engine-free client
packages/ui     design system ("the ledger & the vault")
packages/config economy + game constants (one block each)
docs/           BLUEPRINT · DECISIONS · RUNBOOK (deploy + checklist)
```

## Phases

0–11 shipped: foundation, design system, ledger, auth, public site, LMS,
gamification, wallet, commerce (+Stripe-ready payments), Discord
integration, admin console, hardening — plus the Miner app. Phase 12
(chain mirror) exists as a legal-gated interface only; see
`packages/core/src/chain/adapter.ts` and D8/D21 in `docs/DECISIONS.md`.
