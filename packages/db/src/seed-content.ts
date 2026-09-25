/**
 * Phase 4 content seed: launch essays, public challenges, preview products.
 * Idempotent — upserts by slug. Run via: pnpm --filter @tycoonhood/db seed:content
 */
const PLAYBOOK_MD = '# The Founder\'s Playbook\n### The first ten customers, done by hand\n\nThis is the operating document for going from zero to your first ten paying\ncustomers. It assumes you finished the Business Mastery foundations: you\nhave an offer sentence and you know what a real customer conversation\nsounds like. Everything here is manual on purpose — at this stage you are\nnot building a machine, you are collecting the parts.\n\n---\n\n## Part I — The offer, weaponized\n\nTake your offer sentence and pressure-test it against three questions:\n\n1. **Would the person it names recognize themselves in one read?** If your\n   "who" is "small businesses," it fails. "Independent gym owners doing\n   under $30k/mo" passes.\n2. **Is the outcome something they already want, in their words?** You are\n   not allowed to educate a market with your first offer. Sell the thing\n   they are already trying to buy, better.\n3. **Does the mechanism make the promise believable?** "Through a\n   referral system with done-for-you scripts" earns trust. "Through my\n   proven methods" earns nothing.\n\nRewrite until all three pass. This sentence is going to do heavy lifting:\nit opens every conversation, heads every message, and becomes your first\nlanding page. Sharpen it now, on paper, where edits are free.\n\n## Part II — The list of forty\n\nTen customers come out of roughly forty real conversations. Build the list\nbefore you send anything:\n\n- **Ten people you have already helped free.** They know your work. The\n  ask is the softest sell in business: "I\'ve turned this into a paid\n  offer — want in before the price is real?"\n- **Ten warm intro paths.** One message each to people who know people:\n  "Who do you know dealing with [problem]? One intro would mean a lot."\n- **Ten watering holes.** Threads, groups, communities where the problem\n  is discussed weekly. Your job there for two weeks: be the single most\n  useful reply in every relevant thread. No links, no pitch.\n- **Ten cold, saved for last.** Cold works only after the first thirty\n  conversations taught you the customer\'s exact vocabulary.\n\nWrite the forty down with a status column. This document is your CRM\nuntil customer ten. Anything fancier is procrastination with a login.\n\n## Part III — The conversation, then the close\n\nRun the five-question script from the course. When someone\'s answers show\nthe problem is live and costing them, close like this — verbatim is fine:\n\n> "This is exactly what I fix. Here\'s the deal for the first ten: [offer\n> sentence, with the price]. I deliver it personally, and in exchange I\'ll\n> ask you two questions afterward and, if it works, for a few sentences I\n> can quote. Want the first slot?"\n\nThree rules at the moment of the price:\n\n- **Say the number, then stop talking.** The silence is theirs.\n- **No preemptive discounts.** The founders\' price IS the deal; framing it\n  as early access preserves your future pricing.\n- **A "maybe" gets one follow-up, one week later, then the slot goes to\n  the next name.** Scarcity you actually enforce is the only kind that\n  works.\n\n## Part IV — Deliver like it\'s the product demo, because it is\n\nFor customers one through ten, over-deliver to an economically absurd\ndegree. You are not optimizing margin; you are buying three assets:\n\n1. **The process document.** Write down every step you take for every\n   customer. By customer six, patterns emerge. That document becomes your\n   onboarding, your training material, and eventually your product.\n2. **The objection ledger.** After each delivery, ask: "What nearly\n   stopped you from saying yes?" Collect the answers word-for-word. This\n   is your future landing page, written by the market.\n3. **The testimonial with numbers.** Not "great to work with" — "filled 23\n   trial memberships in 19 days." Ask for it while the win is fresh, and\n   ask permission to use their name.\n\n## Part V — The weekly cadence\n\nUntil customer ten, run this loop every week, ideally the same morning:\n\n- Update the list of forty: statuses, next actions, one new name per slot\n  that went dead.\n- Send every follow-up that is due. Fortunes live in the second message.\n- Book the conversations. Three per week is the floor; five is the pace.\n- Deliver what\'s sold. Document while delivering, not after.\n- Review the objection ledger and adjust ONE thing — the offer sentence,\n  the price, or the close. One variable per week, or you learn nothing.\n\n## The graduation line\n\nAt ten customers you will have: repeatable language, a delivery process on\npaper, proof with numbers, and revenue that came from decisions rather\nthan luck. That is the raw material of an actual business. Then — and\nonly then — you get to think about scale.\n\nNow open the list of forty and send the first message. Today counts.\n';

import { prisma } from "./client";

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  // ---------------- Launch essays ----------------
  const posts = [
    {
      slug: "why-tycoonhood-exists",
      title: "Why Tycoonhood exists",
      excerpt:
        "Self-improvement content is everywhere. Standards are not. Tycoonhood is built around one idea: progress you can prove.",
      publishedAt: new Date("2026-08-01T09:00:00Z"),
      contentMd: `Most self-improvement lives in your head. You watch, you nod, you feel briefly capable, and nothing in your life has a record of it.

Tycoonhood is built around one idea: **progress you can prove.**

Every lesson you finish is written down. Every mission you complete pays out. Every rank you hold was earned against thresholds that are the same for everyone. Your account here is not a feed — it is a ledger, and the ledger does not flatter anyone.

## The four pillars

We train four things, because a strong life is not one thing:

- **Warrior** — the body, and the discipline it teaches everything else.
- **Builder** — how value is created, sold, and scaled.
- **Tycoon** — how money is managed, allocated, and grown.
- **Mind** — the internal foundation that makes the other three sustainable.

Pick one to start. The others will pull you in.

## What we are not

We are not a highlight reel, a guru funnel, or a place to talk about work instead of doing it. Challenges have failure states. Ranks have floors. The economy has a fixed supply. If that sounds strict, good — the strictness is the product.

The books are open. Come put your name in them.`,
    },
    {
      slug: "thc-utility-before-speculation",
      title: "THC: utility before speculation",
      excerpt:
        "One quadrillion units, minted once, moved only by double-entry transactions. Here is exactly how the Tycoonhood economy works — and what it deliberately is not.",
      publishedAt: new Date("2026-08-08T09:00:00Z"),
      contentMd: `THC is the internal currency of Tycoonhood. Before anything else, three facts:

1. **The supply is fixed.** 1,000,000,000,000,000 THC was minted in a single genesis transaction. The mint account's negative balance is the permanent, auditable proof of total supply.
2. **Every movement is double-entry.** THC never appears or disappears. Every transaction's entries sum to zero, enforced by the application *and* by the database itself.
3. **You earn it by doing.** Missions, challenges, and achievements pay from a rewards pool. Nobody can quietly edit a balance — corrections are visible reversal transactions.

## What THC is for

Spending it. Course access, digital tools, marketplace goods, and community perks are priced in THC. It is a utility inside Tycoonhood, and its value is what it unlocks.

## What THC is not

THC is not a cryptocurrency, not an investment, and **not redeemable for money.** There is no exchange, no withdrawal, and no promise of future value. We say this plainly because the economy only works if it is honest.

Could THC live on a chain someday? The architecture keeps that door open behind a clean interface — and it stays closed until utility is proven and counsel signs off. Utility before speculation. Always in that order.`,
    },
    {
      slug: "the-four-pillars",
      title: "The four pillars, explained",
      excerpt:
        "Warrior, Builder, Tycoon, Mind — why these four, in this order, and how the programs train each one.",
      publishedAt: new Date("2026-08-15T09:00:00Z"),
      contentMd: `Every Tycoonhood program belongs to one of four pillars. They are ordered deliberately.

## Warrior

The body first, because the body is where discipline is cheapest to practice and hardest to fake. Training programs, conditioning, and physical challenges with tracked progression. You cannot negotiate with a barbell.

## Builder

Then the craft of value: entrepreneurial fundamentals, marketing, operations, and business finance. Builder programs are biased toward shipping — missions here end with something that exists.

## Tycoon

Then capital. Budgeting, allocation, portfolio thinking, risk. Tycoon content is educational — we teach how these instruments work, and we do not tell you what to buy. The goal is a member who cannot be sold nonsense.

## Mind

Underneath everything: attention, emotional discipline, stress, habits. Mind is last in the list and first in importance, which is exactly the kind of paradox it trains you to hold.

Start where you are weakest. That is where the XP is.`,
    },
  ];

  for (const p of posts) {
    await prisma.post.upsert({ where: { slug: p.slug }, update: p, create: p });
  }

  // ---------------- Public challenges ----------------
  const challenges = [
    {
      slug: "30-days-of-iron",
      name: "30 Days of Iron",
      description:
        "Train every single day for 30 days. Any modality counts — lifting, calisthenics, combat, conditioning — but zero days are the only way to fail. Daily check-ins on your streak are the record.",
      pillar: "WARRIOR" as const,
      lifecycle: "UPCOMING" as const,
      startsAt: days(14),
      endsAt: days(44),
      criteria: { event: "DAILY_CHECKIN", consecutiveDays: 30 },
      xpReward: 750,
      thcReward: 2500n,
    },
    {
      slug: "launch-week",
      name: "Launch Week",
      description:
        "Seven days to take one offer from idea to first real customer conversation. Ship the landing page, write the pitch, talk to five prospects. Proof required at each gate.",
      pillar: "BUILDER" as const,
      lifecycle: "UPCOMING" as const,
      startsAt: days(28),
      endsAt: days(35),
      criteria: { event: "GATED_SUBMISSIONS", gates: 3 },
      xpReward: 1000,
      thcReward: 4000n,
    },
    {
      slug: "the-one-percent-ledger",
      name: "The 1% Ledger",
      description:
        "Track every unit of money in and out for 30 days, then submit your first written allocation plan. The habit that makes every Tycoon lesson stick.",
      pillar: "TYCOON" as const,
      lifecycle: "DRAFT" as const,
      criteria: { event: "SUBMISSION", kind: "allocation-plan" },
      xpReward: 600,
      thcReward: 2000n,
    },
  ];

  for (const c of challenges) {
    await prisma.challenge.upsert({ where: { slug: c.slug }, update: c, create: c });
  }

  // ---------------- Preview products (inactive until Phase 8) ----------------
  const products = [
    {
      slug: "founders-playbook",
      kind: "DIGITAL" as const,
      name: "The Founder's Playbook",
      description:
        "A working document, not an ebook: the checklists, templates, and scripts used across the Builder program, in one downloadable pack.",
      active: false,
      priceThc: 5_000n,
    },
    {
      slug: "warrior-program-access",
      kind: "COURSE" as const,
      name: "Warrior Program",
      description: "Full access to the Warrior program: every module, mission, and challenge in the pillar.",
      active: false,
      priceThc: 12_000n,
      priceFiatCents: 4900,
    },
    {
      slug: "tycoonhood-training-tee",
      kind: "PHYSICAL" as const,
      name: "Training Tee — Coin Mark",
      description: "Heavyweight training tee with the reeded coin mark. For sets, not for scrolling.",
      active: false,
      priceFiatCents: 3200,
      inventory: 200,
    },
  ];

  const warrior = await prisma.course.findUnique({ where: { slug: "warrior" } });
  for (const p of products) {
    const data = { ...p, active: true, ...(p.kind === "COURSE" ? { grantsCourseId: warrior?.id ?? null } : {}), ...(p.slug === "founders-playbook" ? { contentMd: PLAYBOOK_MD } : {}) };
    await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: data });
  }

  const [postCount, challengeCount, productCount] = await Promise.all([
    prisma.post.count({ where: { publishedAt: { not: null } } }),
    prisma.challenge.count(),
    prisma.product.count(),
  ]);
  console.log(`── Content seed complete: ${postCount} essays · ${challengeCount} challenges · ${productCount} products (preview)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
