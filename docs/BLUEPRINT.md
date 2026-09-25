# TYCOONHOOD — Master Build Blueprint

**Version:** 0.1 (Phase 0 output)
**Source of truth:** Master Product, Architecture & Autonomous Build Specification (your document)
**Status:** Awaiting your green light on Phase 1 + answers to 2 workflow questions

---

## The bar

The complete Tycoonhood platform as specified — all thirteen modules (public site, member app, LMS, gamification engine, Discord/Telegram, marketplace, payments, THC internal economy, blockchain adapter boundary, admin, analytics, CMS/support) — production-grade, no mockups, no fake functionality, built in the numbered phases below.

---

## Delivery model (read once — this shapes everything)

1. **I build real, runnable code each session and hand you the repo.** My build environment resets between sessions, so the repo needs a persistent home — that's Question 1 below. Every phase ends with code you can run.
2. **"Deployed to production" happens on infrastructure you own** (Phase 11). I can't host a live service from inside a chat session — anyone telling you otherwise is selling you the mockup your spec forbids. I write the deploy config, you hold the accounts, we deploy together.
3. **A build this size is exactly what Claude Code is for.** It's included in your Max plan, runs against a persistent repo on your machine, and removes the session-reset problem entirely. This blueprint works either way — chat sessions or Claude Code — same phases, same repo.

---

## Locked architecture decisions

Per your spec ("make technically sound decisions and document them"). Each is cheap to overturn **now**, expensive later — flag anything you disagree with.

| # | Decision | Why | Trade-off accepted |
|---|----------|-----|-------------------|
| D1 | **TypeScript everywhere; Next.js (App Router) for web** | One language across frontend/backend/bots; largest ecosystem; hosts anywhere (Vercel, VPS, Docker) | Node runtime lock-in |
| D2 | **PostgreSQL from day one** (no SQLite dev shortcut) | The THC ledger's correctness depends on real transactional guarantees; dev/prod parity | You need Docker Desktop or a free Neon cloud DB for local dev (setup steps in Phase 1 README) |
| D3 | **Prisma ORM + migrations** | Typed queries, auditable schema history | Some raw SQL for ledger hot paths |
| D4 | **pnpm monorepo:** `apps/web`, `apps/bots` (later), `packages/db`, `packages/core`, `packages/ui`, `packages/config` | Your spec demands decoupled modules; this enforces it structurally | Slightly more setup than one flat app |
| D5 | **One web app, two route groups** — `(public)` site + `(app)` member area | Shared design system and auth; simpler ops | Can split later if scale demands |
| D6 | **THC = double-entry ledger, integer BigInt amounts, smallest unit = 1** | Your spec §27 explicitly bans `user.thc_balance = 5000`; double-entry makes every unit traceable; 1 quadrillion fits comfortably in BigInt | No fractional THC unless we add a decimals config (reversible, it's one constant) |
| D7 | **Genesis mint: 1,000,000,000,000,000 THC → Treasury account as transaction #1** | Supply exists as an auditable ledger event, not a config lie | Supply is a seed parameter — changeable before launch, ceremonial after |
| D8 | **Blockchain = adapter interface only** until legally cleared (spec §32) | Internal ledger is source of truth; adapter defines the future migration boundary | No on-chain anything in Phases 0–11 |
| D9 | **Auth.js (NextAuth v5) + Argon2id password hashing + DB sessions** | Battle-tested, supports email verification, social login later, MFA architecture | — |
| D10 | **Payments behind a provider-agnostic interface; Stripe as first adapter** | Spec §23 requires configurable provider; webhooks + idempotency built into the interface | Stripe adapter stays in dev-mode until you have keys |
| D11 | **Every external dependency gets a real dev-mode boundary** — outbound email → local mailbox viewer, Discord/Telegram → simulator, payments → test harness | Spec forbids fake functionality; dev-mode is honest: clearly labeled, same code path, swap credentials to go live | — |

---

## Repo layout (Phase 1 creates this)

```
tycoonhood/
├── apps/
│   └── web/                  # Next.js — (public) site + (app) member area + /api
├── packages/
│   ├── db/                   # Prisma schema, migrations, seed
│   ├── core/                 # Domain services: ledger, gamification, rewards, LMS logic
│   ├── ui/                   # Design system (Phase 2)
│   └── config/               # Shared env/flags/constants (THC supply lives here)
├── docs/
│   ├── BLUEPRINT.md          # This file
│   ├── DECISIONS.md          # Running decision log
│   └── RUNBOOK.md            # Grows per phase
└── package.json              # pnpm workspaces
```

---

## The phases

Each phase produces named, runnable artifacts. Point at any phase and say "not that."

**Phase 0 — Blueprint & decisions** *(this document — done)*
Produces: this file, locked decisions D1–D11, workflow questions.

**Phase 1 — Foundation** *(next session, on your green light)*
Monorepo scaffold · complete Prisma schema for **all** domains (users/auth/profiles, LMS hierarchy, XP/levels/ranks/achievements/challenges/missions/streaks, ledger accounts/transactions/entries, marketplace, Discord/Telegram links, notifications) · migrations · seed: the 4 programs as draft courses, the 5 ranks (Initiate → Legend), level curve, system ledger accounts, THC genesis mint · **working ledger service** (atomic double-entry posting, idempotency keys, balance invariant tests) · XP award service with level evaluation · test suite passing.
Produces: a repo where `pnpm db:seed` builds the world and `pnpm test` proves the ledger can't leak a single THC.

**Phase 2 — Design system**
Tokens (type, color, spacing, radius, shadow) · every component from spec §7 including rank cards, wallet components, progress bars · dark premium visual identity per spec §2 (no crypto-bro, no get-rich-quick aesthetics) · `/styleguide` route rendering everything · responsive + keyboard-accessible.
Produces: `packages/ui` + a live styleguide page.

**Phase 3 — Auth, accounts & onboarding**
Register/login/logout · email verification + password reset (dev-mode mailbox until SMTP exists) · session/device management · account recovery · member profile with privacy controls · short onboarding flow (goals, interests, experience) feeding the profile.
Produces: real accounts, end to end.

**Phase 4 — Public website**
All 16 public routes · homepage per spec §6 (hero, philosophy, four pillars, "How Tycoonhood Works", gamification preview, community, THC explained as internal economy, marketplace preview, roadmap) · content from DB/CMS models, not hard-coded · blog + FAQ engines.
Produces: the complete public face, content-manageable.

**Phase 5 — LMS + course player**
Course→Module→Lesson engine from database (spec §12 — the four courses are seed *data*, never frontend components) · enrollment, progress %, video progress, quizzes, resources, prerequisites, completion, certificates · course player per spec §13 with server-persisted progress.
Produces: a real LMS ready to receive content.

**Phase 6 — Gamification, full**
Event pipeline per spec §14 (lesson completed → XP → achievements → challenges → rank → rewards → notifications) · configurable challenge engine with all 5 states · mission engine · achievement rules · streaks · configurable leaderboards (privacy-safe) · the member dashboard per spec §11.
Produces: the progression system, entirely server-side.

**Phase 7 — THC wallet & economy surface**
Wallet UI + transaction history · reward wiring from Phase 6 events into the ledger · earn/spend flows · admin economic dashboard per spec §31 (issued, spent, circulating, velocity, concentration).
Produces: members earn and spend THC; you watch the economy live.

**Phase 8 — Marketplace + payments**
Catalog (digital/physical), search/filter, cart, checkout · fiat path through the payment interface (Stripe adapter, dev-mode until keys) · THC checkout path through the ledger · orders, order history, digital delivery, refund states, inventory architecture.
Produces: a working store with dual currency rails.

**Phase 9 — Discord + Telegram**
Account linking + membership verification · rank→role sync with least-privilege bot permissions · access revocation on expiry · Telegram bot for missions/notifications, talking only to backend APIs · dev-mode simulators until you create the bots and hand me tokens.
Produces: community layer wired to the progression engine.

**Phase 10 — Admin console**
User management · course/content authoring · challenge/mission/achievement configuration · ledger operations (grants, adjustments — every action audited) · orders/refunds · moderation · CMS for public pages.
Produces: you run the platform without touching code.

**Phase 11 — Hardening, analytics & deploy**
Security pass (rate limiting, headers, input validation audit, session hardening) · analytics events · backups · CI pipeline · deployment to your chosen infrastructure · RUNBOOK complete.
Produces: Tycoonhood live at a domain.

**Phase 12 — Blockchain adapter** *(gated: legal/financial review first, per your own spec §30–33)*
Adapter interface implementation · internal-balance migration/conversion architecture · testnet spike · multisig + audit plan.
Produces: the bridge, built only when it's cleared to exist.

---

## Named plainly: what's missing before certain phases can go live

Per house rules — no silent stubs. Each of these gets a real dev-mode boundary until you provide it:

| Needed | Blocks going live for | You'll need |
|--------|----------------------|-------------|
| Domain name | Phase 11 | Registrar account |
| Hosting + managed Postgres | Phase 11 | Vercel/VPS + Neon/RDS (or one VPS running both) |
| SMTP / email provider | Phase 3 (live email) | Resend, Postmark, or SES account |
| Payment provider keys | Phase 8 (live payments) | Stripe (or chosen provider) account |
| Discord server + bot token | Phase 9 | Discord Developer Portal, ~10 min |
| Telegram bot token | Phase 9 | @BotFather, ~5 min |
| Course content (video/text) | Phase 5 having substance | Your material, any format |

**Two legal flags — not blockers to building, real blockers to launching:**
1. The course name **"Financial Planning and Investment Advisory"** — "investment advisory" is a regulated term in many jurisdictions. The platform ships with education-only positioning and prominent disclaimers per your spec §3.3, but the *name itself* should pass a lawyer before public launch.
2. **THC** ships framed as non-redeemable internal utility credits (like game points), not stored monetary value — the safest posture until counsel reviews your jurisdiction. Everything about the ledger is built so upgrading its legal status later is a policy change, not a rebuild.

---

## Windows dev setup (Phase 1 README will walk you through it)

PowerShell, in order:
```powershell
winget install OpenJS.NodeJS.LTS
corepack enable pnpm
# Database — pick ONE:
winget install Docker.DockerDesktop     # option A: local Postgres container
# option B: free cloud Postgres at neon.tech — zero install, paste one URL
```
Then per session: `pnpm install`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev` → http://localhost:3000
