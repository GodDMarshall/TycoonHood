# TYCOONHOOD — The Economy Model

**Written:** 20 September 2026 · **Status:** draft for Monkey's approval
**Basis:** the real constants in `packages/config/src/index.ts`, not estimates.
Every number below is computed, and the computation is shown.

---

## 1. The rule we are designing to

> "If they mine for 2–3 months they can buy 1 hoodie."

That is the anchor. Everything else — task payouts, item prices, rank gates — is
calibrated backwards from it.

## 2. The faucets — what a member actually earns

Mining is `12 THC/hour` at rig level 1, ×rig level, with a **10-hour storage
cap** (the rig idles once storage is full). So earnings depend on how often they
come back to claim, which is the intended retention mechanic.

| Behaviour | THC/day | 60 days | 90 days |
|---|---|---|---|
| 1 claim/day (casual — loses 14h/day to the cap) | 120 | 7,200 | 10,800 |
| **2 claims/day (engaged — the design target)** | **240** | **14,400** | **21,600** |
| Every 10h (perfect, unrealistic) | 288 | 17,280 | 25,920 |

Add the daily check-in mission (50 THC, 20h cooldown) and the engaged member
lands at **290 THC/day → 17,400 in 60 days → 26,100 in 90 days.**

Other faucets, smaller and one-off: first lesson 500, onboarding 250, first
course 1,000, 7-day streak 700, plus challenge rewards. Watch-to-earn (new, §20
of the spec) adds a controlled trickle — see §5 below.

**Rig upgrades multiply this.** Level 2 costs 500 THC and doubles the rate. A
member who reinvests early compounds hard; one who spends everything on merch
stays at level 1. That tension is good design — leave it.

## 3. The price ladder

Calibrated so the engaged member (290/day) hits each tier in the stated time.
Prices rounded to the nearest 500 THC.

| Item | THC | Time to earn | Est. real cost |
|---|---|---|---|
| Sticker pack / patch | 2,500 | 0.3 months | ~$2 |
| Water bottle | 6,000 | 0.7 months | ~$8 |
| Cap | 8,000 | 0.9 months | ~$12 |
| Resistance bands | 9,500 | 1.1 months | ~$10 |
| **Training tee** | **11,500** | **1.3 months** | ~$12 |
| Nunchaku / training gear | 15,000 | 1.7 months | ~$18 |
| **Hoodie** | **17,500** | **2.0 months** | ~$30 |
| Gym bag | 20,000 | 2.3 months | ~$25 |
| Heavy bag / premium kit | 38,500 | 4.4 months | ~$80 |

The hoodie at 17,500 THC is exactly your 2-month mark; a casual miner (120/day)
reaches it in about 5 months, which is the right spread between "shows up" and
"shows up properly."

**Note the existing seed is wrong for this:** the Training Tee currently has
`priceFiatCents: 3200` and **no `priceThc` at all** — it cannot be bought with
mined coins today. Every physical product needs a THC price added.

## 4. The finding that changes the design

**The mining pool is not the constraint. Fulfilment cost is.**

- `MINING_POOL` epoch 1 holds 50,000,000,000 THC.
- At 17,500 THC/hoodie that pool could back **2,857,142 hoodies**.
- At 1,000 members mining 240/day, the pool lasts **571 years**.

So the ledger will never stop you. Real money will:

| Members | Items/yr (1 per member per 3 months) | Real cost/yr @ ~$30 landed |
|---|---|---|
| 100 | 400 | ~$12,000 |
| 1,000 | 4,000 | ~$120,000 |
| 10,000 | 40,000 | ~$1,200,000 |

A free-to-join platform where every member earns a physical good every quarter
is committing to roughly **$10 per member per month in goods and shipping**, with
no revenue attached to it. At a thousand members that is a six-figure annual
liability funded by nothing.

This is not an argument against the idea — the idea is good, and "mine your way
into real gear" is the most distinctive thing in the product. It is an argument
that **price alone cannot be the governor.**

## 5. Recommended governors (decision required)

Use price *plus* these. My recommendation is to take all four.

1. **Limited drops, not open stock.** Merch releases in numbered batches
   (the schema already supports it — the tee is `inventory: 200`). When a drop
   sells out, it is gone until the next one. Scarcity governs spend, and a
   numbered drop is more desirable than an always-available SKU.
2. **One physical redemption per member per 90 days.** Digital goods and course
   access stay unlimited. This caps the per-member liability at exactly the rate
   you intended anyway, and makes the choice of *which* item matter.
3. **Member pays shipping in fiat.** THC covers the goods; the member covers
   postage at checkout. Removes ~$8–10 of the cost per item, and filters the
   people who would redeem simply because it is free.
4. **Rank-gate the top tier.** Hoodie and above require Apprentice (L5) or
   higher. Turns merch into a status object rather than an entitlement, and stops
   a day-one account farming a hoodie out of the pool.

With all four, 1,000 members costs roughly **$30–40k/year** rather than $120k,
and every item that ships is worn by someone who earned it over months.

**Watch-to-earn must be small.** It is the easiest faucet to abuse and the
cheapest to farm. Recommendation: 25–50 THC per completed video, hard cap of
3 videos/day (~150 THC/day maximum), only on our own channel, and only counted
once per video per member — forever. It should feel like a bonus, never like a
salary. Anything richer and it dwarfs mining and the pool drains into bot farms.

## 6. Sinks that are not merch

A healthy economy needs places for THC to go that cost nothing to fulfil:

- **Rig upgrades** (already built) — 500 → 700,000 THC. The best sink; it burns
  coins back to REVENUE and makes the miner earn more, which feels like winning.
- **Course access** (already built) — 12,000 THC for the Warrior program.
- **Challenge entry stakes** — pay THC to enter a challenge, forfeit on failure.
  Real stakes make the challenges mean something.
- **Profile cosmetics** — rank frames, coin-mark variants, name colours. Zero
  marginal cost, pure sink, high perceived value.
- **Early access** — pay THC to join a drop 24h before it opens.

Target ratio: for every 1 THC that leaves the pool as a reward, aim for roughly
0.6–0.7 THC coming back through non-merch sinks. That keeps the circulating
supply from ballooning and keeps merch scarce without extra rules.

## 7. Guardrails already in place

As of the 15 Sep floor run these are live and tested:

- `REWARDS_POOL` and `MINING_POOL` **cannot go negative** (guard + DB CHECK,
  migration `20260915000000_pool_floor`, two tests). When a pool is dry, mining
  throws `EpochExhaustedError` instead of quietly minting from nothing.
- Supply is fixed at 1 quadrillion, provable as `-balance(SYSTEM_MINT)`.
- Every payout is idempotent; double-clicks cannot double-pay.

## 8. What I need from you

1. **Confirm the four governors** (§5) — or tell me which to drop.
2. **The real catalogue** — what actually exists or can be sourced: hoodie, tee,
   cap, bottle, bands, nunchaku, bag, anything else. Names and your landed cost
   per unit if you have it, so I price against reality rather than my estimates.
3. **Watch-to-earn cap** — confirm 25–50 THC/video and 3/day, or set your own.

Once those are answered the prices above become the seeded catalogue.
