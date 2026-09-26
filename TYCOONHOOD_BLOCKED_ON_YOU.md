# BLOCKED ON YOU
**Updated 24 September 2026 · seven items · nothing here can be decided by code**

Everything else is moving. These are the calls only the owner makes, or the
inputs only you have. Each one says what happens if you leave it — because in
most cases "leave it" is a real option for now, and in two cases it is not.

---

## 1. Real landed costs for the five products
**Status: blocking launch of the merch economy.**

The catalogue is seeded with placeholder costs. The economy model already found
that fulfilment cost — not the THC pool — is the binding constraint, so margin
and burn-rate reporting is fiction until these are real numbers.

What I need, per item: **goods cost + shipping to you + shipping to the member**,
in cents, landed.

| Product | Placeholder cost | THC price | Card price |
|---|---|---|---|
| Warrior Hoodie | $31.00 | 18,000 | $89.00 |
| Operator Tee | $12.00 | 8,000 | $39.00 |
| Nano Chalk | $4.80 | 3,200 | $16.00 |
| Lifting Straps | $7.00 | 4,500 | $24.00 |
| The Ledger (notebook) | $6.50 | 4,000 | $22.00 |

**If you leave it:** the five products stay as drafts. Nothing breaks, nothing
ships, and the marketplace shows only the digital items. This is safe but it is
also the thing your members are mining *for*.

**Where it goes:** `/admin/products` → "Your cost, in cents" on each product.
Or tell me the numbers and I will put them in.

---

## 2. Your YouTube video IDs for watch-to-earn
**Status: blocking the Watch tab.**

The Miner's Watch tab is built and works. It has nothing to show because no
video task exists, and I will not invent video ids — a wrong id pays your
members for watching somebody else's channel.

What I need, per video: **the YouTube link, and its length**. That is all;
the form works out the rest.

**If you leave it:** the Watch tab shows "No videos are published yet" and says
they appear the moment one goes live. Honest, and harmless.

**Where it goes:** `/admin/videos` → paste the link, type the length, set the
reward, tick Live. Takes about thirty seconds per video.

**My proposed caps, for you to confirm or overrule:**
- 5 paid videos per member per day
- 90% of the video must actually be watched
- ~150 THC per video (≈ 2,800 THC/hour of attention — roughly ten hours of rig output)
- One payout per video per member, for life

---

## 3. DR-1 — the WebGL lattice, the Ascent homepage, and the exact red
**Status: CLOSED 26 September by your takeover directive — see DR-17/DR-18.**
The 3D direction is built (the HQ). No lattice and no red were invented. Six
smaller calls the rebuild surfaced — rank ladder, three vs four pillars, free
enrollment, draft programs, the hero line, photography — are listed as
OQ-A…OQ-F at the end of `TYCOONHOOD_DECISIONS.md`. None blocks anything.

*Original entry, kept for the record:*

Your original directive told me to preserve decision history around "the
headline, the runtime WebGL lattice, and the exact red / visual red
specification". I have now searched the repository twice. **None of those three
things exist anywhere in this codebase.** The site is built on a dark/gold
system, there is no Three.js, no shader, no lattice, and no red token.

Three possibilities, and I am not going to guess between them:

- **(a)** They live in a different project of yours and the directive was
  pasted across. Most likely — `D:\AI workspace\Office\arya-tower-replica`
  does contain real Three.js.
- **(b)** They are a design you intend to build and have not yet.
- **(c)** They were in a version of this site that predates this repo.

**If you leave it:** I keep building on the dark/gold system that is actually
here, and I will not invent a red or a lattice to satisfy the instruction.

**What would unblock it:** one sentence — "(a), wrong project", or "(b), build
it", or a screenshot / hex code.

---

## 4. `ALLOW_DEFAULT_ADMIN` in the CI workflow
**Status: your CI is red until you paste one line. Two minutes.**

`.github/workflows/verify.yml` is a protected path I am not permitted to write
to. The seed now refuses the public default admin password unless explicitly
opted into, which is correct — but CI seeds a throwaway database and therefore
needs the opt-in.

Add this to the workflow's `env:` block:

```yaml
env:
  ALLOW_DEFAULT_ADMIN: "1"
```

**If you leave it:** CI fails at the seed step on every push, so the build gate
that would have caught the broken `admin/page.tsx` stays off.

---

## 5. The four economy governors
**Status: not blocking. Confirm or overrule at your convenience.**

I have set these to defensible values and marked them as mine, not yours:

| Governor | Current value | What it controls |
|---|---|---|
| Merch target window | 60–90 days of mining | Whether a THC price is "too cheap", "on target" or "too expensive" |
| Referrer reward | 2,000 THC | Paid to the inviter when their invite finishes a lesson |
| Joiner reward | 1,000 THC | Paid to the new member on the same event |
| Watch daily cap | 5 videos | How many paid videos one member can watch per day |

All four live in `packages/config/src/index.ts`, in one place, with the
reasoning written next to them. Changing a number changes every price and
every screen that quotes it.

**If you leave it:** these stand. They are conservative and they hold together.

---

## 6. Git — this project is not under version control
**Status: the largest single risk to the project, and a two-minute fix.**

`D:\TycoonHood` is not a git repository. There is no history, no branches, no
way to undo a bad change, and no way for CI to run on a push. Every change
either of us makes is permanent the moment it is saved.

I have written a `.gitignore` and can initialise the repository and make the
first commit whenever you say. I have not done it unasked, because the first
commit records the current state as the baseline and that is your call.

**If you leave it:** one bad save loses work with no recovery.

---

## 7. Legal text before any of this is public
**Status: blocking public launch, not development.**

Terms, privacy policy, refund policy and the THC disclosure need a qualified
professional. The platform is already careful in what it *claims* — THC is
described throughout as internal utility credits, not money, not redeemable —
but careful copy is not a legal review.

**If you leave it:** fine while the site is private. Not fine the day you take
a payment from a stranger.

---

## What I did NOT need you for

For contrast, the decisions I made and recorded rather than asking about:
atomic stock-taking, the variant model, address snapshotting, referral
qualification on real work, server-side watch timing, SKU namespacing, and the
order queue layout. All seven are written up in `TYCOONHOOD_DECISIONS.md` as
DR-10 through DR-16, with the alternatives I rejected and why. Overturn any of
them and I will change the code, not argue.
