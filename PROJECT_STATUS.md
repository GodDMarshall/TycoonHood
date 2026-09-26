# TYCOONHOOD — PROJECT STATUS

**Last verified:** 26 September 2026, by a full run in a Linux sandbox
(PostgreSQL 16, Node 22, pnpm 9.15.9), after the HQ visual rebuild (DR-17/18).
**Not deployed.** Nothing here has served a real member.

Every line below is the recorded output of a command, not a claim.

---

## Gates

| Gate | Command | Result |
|---|---|---|
| Types | `pnpm typecheck` | clean · 6 projects |
| Lint | `pnpm lint` | clean |
| Tests | `pnpm test` | **101 / 101** |
| Web build | `pnpm build:web` | 47 routes |
| Miner build | `pnpm build:miner` | 5 routes |
| Deployment harness | `pnpm --filter @tycoonhood/core exec tsx scripts/verify-platform.ts` | **28 / 28** |
| Browser end-to-end | `pnpm e2e` | **39 / 39** |
| Responsive + accessibility | 29 page/audience pairs × 1440·1280·1024·768·390·360, axe WCAG 2.1 AA | 0 overflow · 0 violations |

The browser run is the one worth reading. It opens a real Chromium against
both production builds and, as an admin and then as a member:

1. authors a hoodie with five sizes, a THC price and a landed cost
2. authors a watch-to-earn video task from a pasted YouTube URL
3. signs a new member up through an invite link
4. buys size M with a delivery address, paying in THC
5. confirms only size M lost stock
6. finds the parcel in the pack-and-send queue with the address on screen
7. ships it with a carrier and tracking number
8. confirms the member can see that tracking number
9. completes a lesson and confirms the referrer was paid

It then deletes what it created and checks that it left nothing behind.

---

## What works, end to end

- **Identity** — register, sign in, sessions, password reset, onboarding,
  privacy controls. Argon2id, own session table, 256-bit tokens hashed at rest.
- **The ledger** — double-entry, BigInt, fixed 1-quadrillion supply, deferred
  zero-sum constraint trigger, idempotency keys, provable supply.
- **Academy** — courses, modules, lessons, quizzes, progress, certificates.
- **Gamification** — XP, 50 levels, 5 ranks, achievements, streaks, missions,
  challenges, leaderboard. Missions are **data**: a new one starts paying
  without a deploy.
- **The Miner** — a separate five-tab application. Rig, Watch, Squad, Ranks,
  Wallet. See `START-HERE-MINER.md`.
- **Merch** — sizes with their own stock, atomic stock-taking, shipping
  addresses, tracking, and prices quoted in months of mining.
- **Growth** — referrals that pay on real work, and watch-to-earn timed by the
  server rather than the browser.
- **Admin** — overview, members, economy, content, missions, products, videos,
  challenges, orders.
- **The HQ visual system** — dark/gold design system, self-hosted type, one
  icon family, context-aware navigation with a phone tab bar, the 3D
  headquarters on the homepage (with a static drawing for every device that
  should not run it), the Command Center, pillar atmospheres, mission-style
  challenges, the Network map, identity-card profiles. See
  `docs/DESIGN_SYSTEM.md` and `docs/AUDIT-2026-09-26.md`.

## What does not exist

Stated plainly, because a status file that overstates is worse than none:

- Course / module / lesson authoring in the admin. Content is seeded by script.
- Challenge authoring in the admin.
- Membership tiers and subscriptions — **the business model is not built.**
- Analytics beyond the economy overview.
- The AI layer.
- Telegram (cut, D18).

## What is blocking, and on whom

Seven items, all on you, written up in `TYCOONHOOD_BLOCKED_ON_YOU.md`. The two
that actually stop things: real landed costs for the five products, and your
YouTube video ids. The one that is pure risk: **this project is not under
version control.**

---

## First run on a clean machine

```powershell
cd D:\TycoonHood
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1
```

That installs dependencies, starts or connects a database, applies migrations,
seeds content, and runs the harness. Then:

```powershell
pnpm dev            # the site   → http://localhost:3000
pnpm dev:miner      # the Miner  → http://localhost:3001
```

Seed the merch catalogue (drafts, priced from the live mining rate):

```powershell
pnpm db:seed:merch
```

Re-verify everything at any time:

```powershell
pnpm verify         # typecheck + lint + test + both builds
pnpm e2e            # the browser run described above
```
