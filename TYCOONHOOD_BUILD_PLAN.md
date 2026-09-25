# TYCOONHOOD — Build Plan

**Written:** 20 September 2026 · Derived from `TYCOONHOOD_SPEC.md` and
`TYCOONHOOD_ECONOMY.md`. Ordered by dependency and by the house rule: product
value → core journey → correctness → reliability → UX → polish.

Each phase states what it **produces**, what it **depends on**, how we know it is
**done**, and rough **size** (S = hours, M = a day or two, L = more).
Nothing is marked done until it is verified the way the floor verifies things:
a real run, real output, gate green.

---

## Phase 0 — Already done (15 Sep floor run)

The starting line, so the plan is honest about it. Build restored; three P0
exploits closed and re-verified against the running app (no-login admin read,
reset-link disclosure, free products); finite pools enforced with a migration and
two tests; deploy story collapsed to one; seed refuses the public admin password.
Gate: typecheck, lint, **62/62 tests**, both apps build.

---

## Phase 1 — The spine: local time + event bus + task engine

The single highest-leverage phase. Missions, achievements, watch-to-earn,
streaks and the dashboard all hang off it, so it goes first.

**Produces**
1. **Local-day correctness.** Every day-keyed mechanic — streaks, check-ins,
   mission occurrence keys, future watch caps — derives from the member's
   `Profile.timezone`, not UTC. (§19)
2. **A domain event bus.** One place every meaningful action emits a typed
   event: `LESSON_COMPLETED`, `COURSE_COMPLETED`, `QUIZ_PASSED`, `DAILY_ACTIVE`,
   `STREAK`, `CHALLENGE_COMPLETED`, `MINING_CLAIMED`, `PURCHASE_MADE`,
   `ONBOARDED`, `VIDEO_WATCHED`.
3. **The criteria DSL + evaluator** (§17): typed, versioned, one evaluator
   shared by missions *and* achievements, paying through the existing idempotent
   reward path. Repeatability: one-off / daily / weekly / N-per-period.
4. Retire the three hard-coded mission slugs; the seeded-but-dead missions
   (`first-course`, `seven-day-streak`, `community-contributor`) start working.

**Depends on** nothing. **Size** L.
**Done when** a mission defined purely as data is completed by a member's real
action, pays exactly once, survives a double-click, and the ledger balances —
with no code change. Plus a concurrency test on the XP cache (§14).

## Phase 2 — Admin authoring

Nothing downstream can be filled without it. Today the academy and the store
can only be changed by editing the database.

**Produces** authoring for courses/modules/lessons/quizzes (with ordering and
preview), products (with variants, drops, inventory, THC price), missions (on
the Phase 1 DSL), and challenges. Pagination and search on every admin list.

**Depends on** Phase 1 (for mission authoring). **Size** L.
**Done when** Monkey can create and publish a full course, and a product with
five sizes, from `/admin` with no SQL — and a member can immediately enrol and buy.

## Phase 3 — The merch economy

The thing that makes mining mean something.

**Produces**
- THC prices on every physical product, from the economy ladder.
- **Variants** (size/colour) — new model; required before apparel ships.
- **Drops**: numbered, inventory-capped, windowed releases.
- **Governors**: one physical redemption per member per 90 days; rank gate at
  Apprentice (L5) for the hoodie tier.
- **Checkout for physical goods**: shipping address collected and validated,
  fiat shipping leg alongside THC payment, product detail pages, a cart.
- **Fulfilment** (§24): full state machine, admin pick/pack/track queue, member
  order tracking, refunds that reverse the ledger *and* set `REFUNDED` *and*
  revoke digital access.
- Fix the inventory TOCTOU (§28) and the PENDING-order leak.

**Depends on** Phase 2. **Size** L.
**Done when** a member with 17,500 THC buys a hoodie in their size, pays
shipping, gets tracking, and the ledger, inventory and cooldown all agree —
and a second attempt inside 90 days is refused with a clear reason.

## Phase 4 — Watch-to-earn

**Produces** the `VideoTask` model, our own embedded YouTube player, server-side
heartbeat accumulation with seek/overrun rejection, the ≥85% threshold plus
comprehension check, per-video once-ever payout, the 3/day local-day cap, and
admin authoring by pasting a URL. Emits `VIDEO_WATCHED` into the Phase 1 engine.

**Depends on** Phases 1 and 2. **Size** M.
**Done when** an honest viewer earns once, and none of these pay: opening and
closing, seeking to the end, a muted background tab past the cap, or a replay.

## Phase 5 — Fill the academy

**Produces** video support in the lesson player (with resume from
`videoPositionSec`), `Resource` rendering (downloads/templates), prerequisite
enforcement, enrollment gated on PUBLISHED + purchase, the mobile player fix
(content before outline), quiz retakes with the review preserved — then **the
content itself**: each pillar built out toward 4–6 modules and 20–30 lessons,
every lesson a video + written companion + assignment + quiz.

**Depends on** Phase 2. **Size** L (the engineering is M; the content is the long
pole and needs Monkey's material).
**Done when** a member can complete a full pillar end to end on a phone, with
video, and come out with a certificate.

## Phase 6 — The member experience

**Produces** the daily task board on the dashboard (today's tasks, payouts, one
tap to start — §11); **mobile navigation** (today there is none below `md`);
loading, empty and success states across the app; the onboarding payout moment;
a notifications inbox with read state; the privacy-save fix (§10); leaderboard
self-position; and the purge of the stale "arrives in Phase N" copy.

**Depends on** Phase 1. **Size** M–L.
**Done when** a new member on a phone can find everything, always knows their
action worked, and is never told a shipped feature is coming later.

## Phase 7 — Correctness & hardening

**Produces** fixes for the remaining audit findings: challenge JSON
read-modify-write races, reversal atomicity and genesis guard, Discord role
removal on rank change, Redis-backed rate limiting, miner login throttle,
XFF trust, Stripe webhook timestamp + `payment_status` + event dedupe, markdown
sanitisation, email verification, per-device session revoke, evidence URL
validation. Plus the concurrency test suite the project has never had.

**Depends on** nothing; runs alongside. **Size** M.
**Done when** each has a failing-before/passing-after test.

## Phase 8 — Analytics

**Produces** activation, retention, economy health (issued vs burned, pool
drawdown, velocity, concentration), academy drop-off, merch redemption rate and
cost per member, watch-to-earn abuse signals — as an admin dashboard. Nothing
public that could be mistaken for a vanity metric.

**Depends on** Phases 3 and 4 (needs the events). **Size** M.

## Phase 9 — Design system & accessibility

**Produces** the type/spacing/motion/z-index scales, an icon set, the contrast
fixes (`ink-3`, `gold-deep`, input borders), skip links, `h1`s on auth pages,
focus management, the removal of the eight hand-rolled buttons and six copied
error banners, and the Miner's pinch-zoom fix.

**Depends on** Phase 6. **Size** M. *Deliberately late — polish does not go
before the foundation, per the house rule.*

## Phase 10 — Launch readiness

**Produces** the CI env line Monkey still has to paste, Sentry, Neon PITR
backups, the orphaned-order sweep, a load pass, the production checklist walked
end to end, admin password rotated, and a staging deploy with ~10 real members
before opening the doors.

**Depends on** everything. **Size** M.

---

## Sequencing

Phase 1 alone, because everything else composes on it. Then 2. Then 3, 4 and 5
can run in parallel across desks — 3 is KAI + ATLAS, 4 is ATLAS + KAI, 5 is
Monkey's content plus ATLAS. 6 lands as they land. 7 runs continuously in the
background. 8, 9, 10 close it out.

## What blocks the plan today

1. **DR-1** — the WebGL/red/"Ascent" question. Blocks the visual track only;
   everything above proceeds without it.
2. **The economy governors** — confirm the four (economy §5) before Phase 3
   prices anything.
3. **The real catalogue** — actual items and landed costs, for Phase 3.
4. **Course content** — Phase 5's long pole is Monkey's material, not code.
