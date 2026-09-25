# TYCOONHOOD — Master Product & Architecture Specification

**Version:** 1.0-draft · **Written:** 20 September 2026 · **Status:** awaiting Monkey's redline

## How to read this

The codebase cites a master spec by section number in 46 places (`spec §2`
through `spec §33`) — the Prisma schema, the decision log and the blueprint all
point at it. **That document has never existed on disk.** This is it, written
from Monkey's stated intent, and numbered so the existing citations stay true.

Three markers are used throughout, and they are load-bearing:

- **[BUILT]** — exists in `D:\TycoonHood` today; I verified it by reading the
  code and running it. Numbers quoted are measured.
- **[PARTIAL]** — some of it exists; the gap is named.
- **[NEW]** — does not exist in any form. This is the work.
- **[ASSUMED]** — I invented this because it wasn't stated. **Redline these
  first** — a wrong assumption here is cheap now and expensive later.

---

## §1 — Product thesis & scope

TycoonHood is a **gamified self-mastery academy with a real internal economy**.
Free to join. A member learns across four pillars, does verifiable work, earns
THC for it, and spends that THC on things that actually exist — course access,
and physical gear from TycoonHood's own brand.

The distinctive claim, and the one everything else serves: **progress you can
prove, paid in something you can hold.** Not a content library. Not a token with
a chart. An academy where two months of showing up becomes a hoodie you earned.

Scope is thirteen systems: public site, member app, academy/LMS, gamification,
task engine, watch-to-earn, challenges, community (Discord), marketplace and
merch operations, the THC economy, the Miner, admin, analytics. A blockchain
adapter boundary exists but is **inert and legally gated** (§33).

**The core value, non-negotiable:** nothing is ever faked. No invented member
counts, revenue, testimonials, token price, liquidity, partnerships or audits.
Anything unbuilt or unconfigured says so, in plain words, on the surface where a
user would expect it. [BUILT — this discipline is visibly held throughout.]

## §2 — Brand & visual identity

**[BUILT]** The shipped direction is **"the ledger"**: a vault interior in warm
espresso-black (deliberately not blue-black), brass and gold as the house metal,
an engraved serif display face, and mono tabular figures for anything counted.
A reeded-coin mark is the signature — logo, favicon, THC glyph, rank pips.

Tokens live in exactly one file (`packages/ui/src/tokens.css`): 5 surfaces,
3 inks, 3 golds, 4 pillar colours (Warrior `#B5443A`, Builder `#5B87A6`,
Tycoon `#C9A227`, Mind `#6FA08B`), 3 semantics, 3 font stacks, 3 radii,
2 shadows. Components define style; pages compose and never restyle.

**Unresolved — DR-1.** The operating directive names a *runtime WebGL lattice*,
an *exact red*, and an animated *"Ascent"* homepage as decisions to preserve.
None of the three is in this repository, and there is no red in the palette.
Project memory separately recalls a "GSAP/Three.js Ascent homepage in midnight
navy and chrome silver" which is also absent. **This spec does not invent them.**
Until Monkey resolves DR-1, §2 is "the ledger" as built, and any lattice/red
direction is a separate design track.

**Missing from the system** [NEW]: a real type scale (there are 328 hand-typed
font sizes across 24 values today), spacing/motion/z-index tokens, an icon set
(currently Unicode glyphs and emoji), and documented interaction states.

## §3 — Legal posture & disclaimers

Three positions, all load-bearing, all already tracked in the decision log:

1. **THC is a non-redeemable internal utility credit.** Not money, not stored
   value, no fiat exchange, no withdrawal, no member-to-member transfer. Earning
   THC and spending it on TycoonHood goods is a **rewards programme** — the same
   legal shape as airline miles or shop points. This posture must survive the
   merch launch: members redeem credits for goods, they never "cash out".
2. **Education, not advice.** The programme named "Financial Planning and
   Investment Advisory" uses a regulated term. It ships as education with
   prominent disclaimers and **must pass a lawyer before public launch.** The
   safest fix is renaming it; that is Monkey's call. [flagged, unchanged]
3. **No chain work without counsel** (§33).

**[ASSUMED]** Merch is fulfilled as a rewards redemption, with the member paying
shipping in fiat (§24). Tax treatment of redeemed goods is Monkey's to check
with an accountant in India; I have flagged it, not solved it.

## §4 — Members, roles, accounts

**[BUILT]** Two roles: `MEMBER` and `ADMIN`. One admin is seeded; members default
to MEMBER and cannot escalate (verified over HTTP). Identity is split cleanly:
`User` (auth), `PasswordCredential` (Argon2id), `Profile` (member-facing).

**[NEW]** Email verification on signup. Today a member can register with an
address they do not own. Required before the store handles real fulfilment.

**[NEW]** Profile self-service: change display name, bio, avatar, username,
email, password. None of these exist — the public profile renders a `bio` that
has no write path anywhere in the product.

## §5 — Public content (the Journal)

**[BUILT]** A `Post` model with markdown rendered server-side, presented as
"Journal" in navigation, route stays `/blog`. Three launch essays are seeded and
real. Admin can write and publish posts. Content is first-party, so no sanitizer
sits between the database and the page — **that holds only while authorship
stays internal** (see §31 if guest authors are ever added).

## §6 — Public website & the homepage

**[BUILT]** 17 public routes: `/`, `/about`, `/programs[/slug]`, `/challenges`,
`/thc`, `/marketplace`, `/roadmap`, `/blog[/slug]`, `/faq`, `/status`,
`/styleguide`, `/u/[username]`, `/verify/[serial]`.

The homepage signature is the **open-books band** — four live figures read
straight from the ledger (fixed supply, THC in member hands, members, missions
paid). Every number is a database fact. That band is the product's thesis in one
component and should never become decorative.

**[PARTIAL] Problems to fix:** the hero is text-only (see DR-1); ten public
surfaces still tell users features "arrive in Phase N" for things that shipped
months ago; and "Members: 0 / Missions paid: 0" renders as a virtue on a fresh
database when it reads as abandonment. The open-books band needs an honest
empty state, not a zero.

## §7 — Design system

**[BUILT]** `@tycoonhood/ui` exports 20 components: Button, Card family, Input,
Textarea, Label, Field, Badge, RankBadge, PillarBadge, Progress, XpBar, Avatar,
SectionRule, ThcAmount, CoinMark, Wordmark, Logo, Divider, Stat.

**[NEW]** The gaps that make it a system rather than a folder: the type and
spacing scales, motion tokens, an icon set, `aria-invalid`/disabled states, and
the removal of the eight primary buttons and six error banners that pages
re-implemented by hand instead of using the primitives.

**Accessibility debt to clear** [NEW]: `ink-3` on `bg-0` is 3.40:1 and used ~110
times (fails AA); `gold-deep` is 4.12:1; input borders are 1.56:1 against the
page (effectively invisible until focused); no skip link; auth pages have no
`h1`; the Miner blocks pinch-zoom.

## §8 — Auth, sessions & devices

**[BUILT]** Sessions are ours, not a library's: a 256-bit CSPRNG token in an
httpOnly cookie, SHA-256 of it stored in the database, 30-day sliding expiry
renewing under 15 days, user-agent and hashed IP per session. Argon2id at OWASP
parameters (`m=19456,t=2,p=1`). Password reset uses the same discipline: hashed
token, 30-minute TTL, single use, new password validated *before* the token is
consumed, and success destroys every session. Login is timing-equalised against
account enumeration.

Web and Miner share one cookie via `COOKIE_DOMAIN`, so one sign-in covers both.

**[BUILT 15 Sep]** Authorization is enforced **in every page** via a Data Access
Layer (`apps/web/lib/guard.ts`), not in layouts. Layouts are not a security
boundary in the App Router — a crafted RSC request skips them. This was a live,
reproduced hole and it is closed.

**[NEW]** Per-device revoke (only "sign out everywhere" exists), an absolute
session lifetime cap, and a Redis-backed rate limiter (the current one is an
in-process Map that resets on deploy and is ineffective across instances).

## §9 — Onboarding

**[BUILT]** Username, display name, goals, interests, experience level; pays the
`complete-onboarding` mission (250 THC + 75 XP). Reserved usernames enforced.

**[PARTIAL]** The payout is **silent** — the member is redirected to the
dashboard and never told they just earned 250 THC. First impression of the
economy is nothing happening. Fix: an arrival moment that shows the credit
landing on the ledger.

## §10 — Profiles & privacy

**[BUILT]** Public profile at `/u/[username]` honouring per-facet privacy —
level, rank, streak, achievements, courses, THC. THC and courses default hidden.
Certificates verify publicly at `/verify/[serial]`.

**[PARTIAL] Bug:** saving the settings form replaces the privacy JSON with only
three keys, and the profile treats a missing key as public — so one save
**publishes the member's THC balance and certificates** with no way to re-hide
them. Fix: merge rather than replace, and expose all six facets. Only three
toggles are in the UI today; the FAQ promises six.

## §11 — Member dashboard

**[BUILT]** Streak, daily check-in, wallet balance, XP bar, three mission cards,
achievements, five notifications.

**[PARTIAL]** The mission cards have **no button and no route** — a member
cannot tell how to do them. Wallet is a stat, not a link. Stale copy promises
"wallet history arrives in Phase 7" next to a working wallet. With the task
engine (§17) the dashboard becomes the daily surface: today's tasks, what each
pays, and one tap to start.

## §12 — The Academy

**[BUILT]** Course → Module → Lesson, all database rows, never components.
Four published programs, one per pillar: **Warrior** (body), **Business
Mastery** (business), **Financial Planning & Investment Advisory** (capital),
**Mindfulness & Wellness** (mind). 8 modules, 24 lessons, 4 quizzes, real
authored content, zero placeholders (enforced in CI). Enrollment, progress %,
quizzes with pass scores, certificates with public serials.

**[PARTIAL] / [NEW] — "the whole academy should be ready":**

- Lessons support `videoUrl` and `durationSec` in the schema but **nothing
  renders them** and no video is seeded. The academy is text-only today.
- Prerequisites are displayed on the public program page but **not enforced** on
  enroll.
- `Resource` (downloads, templates) exists in the schema and is never rendered.
- Enrollment is free for **any** course slug including DRAFT ones, which voids
  the paid Warrior product. Must gate on PUBLISHED + purchase.
- Depth: 6 lessons per program is a strong start, not a full academy.
  **[ASSUMED]** target is 4–6 modules and 20–30 lessons per pillar, each lesson
  with a video, a written companion, a practical assignment and a quiz.

## §13 — The course player

**[BUILT]** Sidebar of modules, markdown body, mark-complete, quiz, next-lesson
link. Progress persists server-side. Re-completing a lesson grants no extra XP.

**[PARTIAL]** On mobile the whole module outline renders *above* the lesson, so
the member scrolls past the entire curriculum to reach the content. Mark-complete
has no loading state. A quiz **pass discards the review** — the score and
explanations unmount — while the copy says "retakes welcome" with no retake
control. Video position tracking (`videoPositionSec`) is in the schema, unused.

## §14 — The gamification event pipeline

**[BUILT]** The spine: an action produces XP through an append-only `XpEvent`
log, level and rank are recomputed in the same transaction, and THC rewards post
through the ledger with idempotency keys. `User.xp`/`level` are caches; the
event log is truth.

**[PARTIAL]** The cache write is a read-then-absolute-write under Read
Committed, so two concurrent awards can lose one *from the cache* (events stay
correct). Needs an atomic increment and a concurrency test.

## §15 — Ranks

**[BUILT]** Five ranks by level: Initiate (1), Apprentice (5), Mastermind (12),
Elite (20), Legend (30). XP curve is `250·(L−1)·L` → L2 at 500, L5 at 5,000,
L10 at 22,500, seeded to L50. Rank-ups fire a Discord role sync.

Ranks gain a second job under §23: **gating the top merch tier.**

## §16 — Challenges

**[BUILT]** Five lifecycle states, three completion modes — daily check-in,
evidence submission, and gated submissions requiring N approvals. Evidence goes
to an admin review queue. Late approvals deliberately rescue failed participants
so slow review never punishes a member. Three challenges seeded.

**[PARTIAL]** The `recurrence` field is never read, so recurring challenges do
not recur. Submissions live in a JSON blob with read-modify-write races that can
lose an approval. Evidence URLs are unvalidated. Join/withdraw errors crash the
page. **[NEW]** THC entry stakes (§26) — pay to enter, forfeit on failure.

## §17 — Missions & the task engine **[NEW — the biggest gap]**

This is the system Monkey describes as "tasks to earn" and it **does not exist**.

What exists: a `Mission` table where every row carries a `criteria` JSON, a
payout helper, and three hard-coded slugs (`complete-onboarding`, `first-lesson`,
`daily-check-in`). **No code ever reads `criteria`.** Missions seeded as data —
`first-course`, `seven-day-streak`, `community-contributor` — can never be
awarded by anything. They are decoration.

**What must be built: a real rule engine.**

- A typed criteria DSL, versioned, e.g.
  `{ event: "LESSON_COMPLETED", count: 5, within: "7d", scope: { pillar: "WARRIOR" } }`.
  Supported events at minimum: `ONBOARDED`, `LESSON_COMPLETED`,
  `COURSE_COMPLETED`, `QUIZ_PASSED`, `CHALLENGE_COMPLETED`, `DAILY_ACTIVE`,
  `STREAK`, `VIDEO_WATCHED` (§20), `MINING_CLAIMED`, `PURCHASE_MADE`,
  `COMMUNITY_CONTRIBUTION`.
- **One evaluator**, called from a single domain-event bus. Every action in the
  product emits an event; the evaluator decides which missions that event
  completes; payouts go through the existing idempotent reward path.
- **Repeatability**: one-off, daily, weekly, or N-per-period, with the occurrence
  key deriving from the member's **local day** (§19), not UTC.
- **Admin authoring**: create and edit missions, set rewards, activate/deactivate,
  preview who would qualify — without touching the database.
- **A member-facing task board**: today's tasks, progress on each, what it pays,
  and where to go to do it. This is what makes the dashboard useful (§11).

**Acceptance:** an admin can create a mission from the console, a member's action
completes it, the reward posts exactly once, and the ledger balances — with no
code change and no seed edit.

## §18 — Achievements

**[BUILT]** Table, unlock rows, XP+THC rewards, secret flag.
**[PARTIAL]** Only `COURSE_COMPLETED` and `STREAK` rules are evaluated;
`COMMUNITY_CONTRIBUTION` is hard-coded to never fire; `isSecret` is never used
anywhere in the UI. Folds into the §17 engine — achievements are missions with a
different presentation, and should share one evaluator.

## §19 — Streaks & leaderboards

**[BUILT]** Current and longest streak; privacy-safe leaderboard of 25 excluding
admins.

**[PARTIAL] Real bug:** the day boundary is UTC everywhere
(`toISOString().slice(0,10)`), and `Profile.timezone` is collected but never
read. A member in India checking in at 05:00 IST is credited to the previous UTC
day; one in California at 17:00 breaks a streak they did not break. **Every
day-keyed mechanic must use the member's local day** — streaks, check-ins,
mission occurrence keys, watch-to-earn caps. This is a correctness bug in the
core loop, not a nicety.

**[NEW]** Leaderboard needs the member's own position and a self-highlight;
today you cannot find yourself.

## §20 — Watch-to-earn **[NEW]**

Members earn THC for genuinely watching **TycoonHood's own YouTube videos**.
Confirmed scope: our channel only. Nothing in the product pays anyone to watch
third-party videos — incentivised views on other people's content is view
manipulation, it breaks YouTube's terms, and it would put the channel at risk.
Our own content is straightforward and legitimate: it is course delivery.

**Design.**

- A `VideoTask` row: YouTube video id, title, duration, THC reward, XP reward,
  active flag, optional pillar/course link, optional comprehension question.
- Playback happens in **our own embedded player** (YouTube IFrame Player API) on
  a TycoonHood page — never a link out. The player is the only place watch time
  is measured.
- **Verification, layered** (no single signal is trusted):
  1. The IFrame API reports state changes and current time; the client sends
     periodic heartbeats while `PLAYING`.
  2. The **server** accumulates watch time from heartbeats against wall-clock,
     rejecting any session whose reported progress outpaces real elapsed time,
     and ignoring seeks that jump forward.
  3. A completion threshold of **≥85% of duration** [ASSUMED] plus minimum
     elapsed wall-clock ≥ 85% of duration.
  4. **[ASSUMED]** A one-question comprehension check drawn from the video for
     the reward to release. Cheap to author, and it defeats mute-in-a-background-tab
     farming better than any timing heuristic.
  5. One payout per member per video, **permanently** — no re-earning.
- **Caps**: 25–50 THC per video, maximum 3 paid videos per member per local day
  (~150 THC/day ceiling, roughly half of mining). Watch-to-earn is a bonus, never
  a salary; anything richer drowns mining and invites farms.
- Emits `VIDEO_WATCHED` into the §17 engine, so missions like "watch 5 videos
  this week" compose for free.

**Admin**: add a video by pasting a URL — title and duration pull from the
YouTube Data API — set rewards, add the question, activate.

**Acceptance**: a member cannot collect by opening and closing the page, by
seeking to the end, by muting it in a background tab past the cap, or by
replaying a video they already earned on. An honest viewer collects once.

## §21 — Community (Discord)

**[BUILT]** A serverless, Ed25519-verified interactions endpoint inside the web
app — no gateway process to host. `/link CODE` claims a code from Settings;
`/rank` reports rank. Rank-ups sync Discord roles best-effort and report their
real state when unconfigured. **Telegram is cut** (decision D18) — the table
remains, no integration will be built, and the FAQ still wrongly promises it.

**[PARTIAL]** Role sync only adds the new rank role, never removes the previous
one, so members accumulate rank roles. Unlink removes nothing on Discord.

## §22 — Notifications

**[PARTIAL]** Rows are written by eight paths and read in exactly one place
(five on the dashboard). `readAt` is **never set by anything**, so nothing is
ever marked read. Needs: a real inbox, read state, and — once the task engine
lands — "you earned X" as the feedback channel the product currently lacks.

## §23 — Marketplace & the TycoonHood brand

**[PARTIAL — the centre of this build]**

What exists: a `Product` model with dual rails (`priceThc` and/or
`priceFiatCents`), four kinds (DIGITAL, PHYSICAL, COURSE, MEMBERSHIP),
inventory, and a working THC checkout that debits the ledger atomically. Three
products seeded: Founder's Playbook (5,000 THC, digital), Warrior Program access
(12,000 THC / $49), Training Tee ($32, physical, inventory 200).

**The gap that blocks Monkey's whole idea:** the Training Tee has **no THC
price**. Not one physical good can be bought with mined coins. The rails exist;
the catalogue does not.

**What must be built:**

- **The brand catalogue** — TycoonHood-branded apparel and training equipment,
  each with a THC price from the ladder in `TYCOONHOOD_ECONOMY.md`: hoodie
  17,500 · tee 11,500 · cap 8,000 · bottle 6,000 · bands 9,500 · nunchaku/gear
  15,000 · gym bag 20,000 · sticker pack 2,500.
- **Variants** — size and colour. The schema has no variant model at all; a
  hoodie in five sizes is currently five products or a broken assumption.
  This is required before any apparel ships.
- **Drops** — a product belongs to a numbered, inventory-capped release with a
  window. Scarcity is the governor, not price (economy §5).
- **Redemption cooldown** — one physical redemption per member per 90 days.
- **Rank gate** — hoodie tier and above requires Apprentice (L5)+.
- **Product pages** — there is no product detail page today, only cards.
- **Cart** — none exists; checkout is one item at a time.

**[BUILT 15 Sep]** Inventory cannot be oversold beyond the existing TOCTOU issue
(flagged, not yet fixed — see §28), and the card rail can no longer settle for
free in production.

## §24 — Orders, fulfilment & merch operations **[NEW]**

Physical goods turn a software product into a logistics one. None of this exists.

- **Shipping address** — not collected anywhere. Required at checkout for
  PHYSICAL kinds, validated, stored against the order, editable before dispatch.
- **Shipping cost in fiat** — the member pays postage even when THC covers the
  goods (economy §5). Needs a second payment leg on a THC order, which the
  current model does not support.
- **Fulfilment states** — beyond PAID/FULFILLED: `AWAITING_STOCK`, `PACKED`,
  `SHIPPED` (+ carrier and tracking number), `DELIVERED`, `RETURNED`.
- **Admin fulfilment queue** — pick list, mark packed, enter tracking, bulk
  export for a courier. Today admin has a single "Mark shipped" button and no
  address to ship to.
- **Member order tracking** — where is it, what did it cost in THC, tracking link.
- **Returns and refunds** — a refund must reverse the ledger transaction **and**
  set `Order.REFUNDED` **and** revoke digital access. Today reversal does the
  first only.
- **[ASSUMED]** Fulfilment is manual from Mysore to start, India-only shipping,
  with international deferred until volume justifies it. Say if that is wrong —
  it changes address validation, shipping cost and the catalogue.

## §25 — THC: the economy

**[BUILT]** One quadrillion THC, minted once at genesis into TREASURY as
transaction #1. Supply is provable forever as `-balance(SYSTEM_MINT)` and
inflation is structurally impossible, not merely disallowed — the mint account is
touched exactly once and nothing else can post to it. No decimals; smallest unit
is 1. No member-to-member transfers, deliberately, pending legal (§3).

## §26 — Faucets & sinks

Full model in `TYCOONHOOD_ECONOMY.md`. In summary:

**Faucets** — mining (12 THC/h × rig level, 10h cap → 240/day for an engaged
member), daily check-in (50), lesson and course completion, challenges, streaks,
and watch-to-earn (capped ~150/day).

**Sinks** — merch redemption (the headline), course access, **rig upgrades**
(500 → 700,000 THC; the best sink in the product because spending makes you earn
more), and [NEW] challenge entry stakes, profile cosmetics, and early access to
drops.

Target: roughly 0.6–0.7 THC returning through non-merch sinks for every 1 THC
paid out. That keeps circulating supply flat without extra rules.

## §27 — The ledger

**[BUILT]** Double-entry, BigInt, append-only. `user.thc_balance = 5000` is
banned by design: balances are cached sums, and the truth is the entry log.
Every transaction's entries sum to zero, enforced **twice** — in the service and
by a deferred Postgres constraint trigger. Member wallets cannot go negative
(guard + CHECK). Idempotency keys make every payout exactly-once. Reversals post
compensating transactions and never mutate the original.

**[BUILT 15 Sep]** `REWARDS_POOL` and `MINING_POOL` can no longer overdraw
(migration `20260915000000_pool_floor`, two tests). The finite pool is finally
finite, and `EpochExhaustedError` can actually fire.

**[PARTIAL]** Reversal runs as two transactions and has no guard against
reversing the genesis mint or an already-reversed row.

## §28 — Checkout atomicity

**[BUILT]** A THC purchase debits the wallet and records the order against one
ledger transaction.

**[PARTIAL]** Inventory is taken with a check-then-decrement across two
statements — concurrent buyers of the last unit all pass. Must become a single
guarded `updateMany`. A failed card checkout also leaks the reserved unit
permanently; PENDING orders need an expiry sweep.

## §29 — The Miner

**[BUILT]** A separate mobile-first PWA on its own deployment, sharing accounts,
sessions, ledger and design system. Server-authoritative idle accrual from
`lastClaimAt` with a storage cap; claims are race-collapsed by keying the ledger
transaction to the settled `lastClaimAt`; rig upgrades burn THC back through
`spend()`. **Mining is distribution, never minting** — it pays from the finite
MINING_POOL, and every screen that says "mining" also says supply is fixed.

**[PARTIAL]** No service worker, so no offline shell despite being a PWA. Blocks
pinch-zoom. Dead-ends with no link back to the main site. Stale claim errors
persist after a later success.

## §30 — Economy calibration

Governed by `TYCOONHOOD_ECONOMY.md`, which is the authority on numbers. The
anchor rule: **an engaged member earns a hoodie in about two months.** The
binding constraint is not the pool (571 years of runway) but real fulfilment
cost — roughly $10 per member per month if every member redeems quarterly — which
is why the four governors in economy §5 exist.

All economy constants live in `packages/config` and nowhere else.

## §31 — Admin console

**[BUILT]** Six surfaces — overview, members, economy, content, challenges,
orders. Role-gated at the layout **and** re-checked inside every server action.
Every grant is an audited ledger transaction or XP event; the house has no
invisible hand.

**[NEW] — the biggest operational gap: there is no authoring.** Admin can
publish-toggle a course and write blog posts. It cannot create a course, module,
lesson, quiz, product, mission, challenge or video task. The academy and the
store cannot be filled without opening the database by hand. Required:

- Course/module/lesson/quiz authoring with preview and ordering
- Product authoring with variants, drops, inventory and THC pricing
- Mission authoring on the §17 criteria DSL
- Video-task authoring (§20)
- The fulfilment queue (§24)
- Pagination and search on every list (nothing is paginated today)

## §32 — Analytics

**[NEW]** Nothing exists. Needed, in priority order: activation (register →
onboard → first lesson), retention (D1/D7/D30, streak survival), economy health
(THC issued vs burned, pool drawdown, circulating supply, velocity,
concentration), academy completion by course and lesson drop-off, merch
redemption rate and cost per member, and watch-to-earn abuse signals. Admin gets
an economy dashboard; nothing is published publicly that could be faked.

## §33 — Blockchain boundary

**[BUILT, inert by design]** A `ChainAdapter` interface and a `NullChainAdapter`.
The internal ledger is the source of truth; a chain, if it ever exists, mirrors
it idempotently and only after counsel clears it. No on-chain anything exists or
pretends to. **Unchanged by this spec.**

---

## Assumptions to redline

Listed so a wrong one is cheap to catch. Each is marked [ASSUMED] in place.

1. **§12** — academy depth target of 4–6 modules and 20–30 lessons per pillar,
   each lesson = video + written companion + assignment + quiz.
2. **§20** — 85% watch threshold, a one-question comprehension check, 25–50 THC
   per video, 3 paid videos per day.
3. **§23** — the catalogue list and its THC prices (from the economy ladder).
4. **§24** — manual fulfilment from Mysore, India-only shipping to start.
5. **§24** — member pays shipping in fiat while THC covers the goods.
6. **§23** — hoodie tier rank-gated at Apprentice (L5).
7. **§3** — merch redemption framed as a rewards programme, not a sale.
8. **§2** — "the ledger" remains the visual direction until DR-1 is resolved.

## Open decisions

- **DR-1** — where the WebGL lattice / exact red / "Ascent" homepage live, or
  whether they are superseded. Blocks the visual track entirely.
- **Economy governors** — confirm the four in economy §5.
- **The real catalogue** — actual items and landed costs.
- **Course naming** — "Investment Advisory" needs a lawyer or a rename.
