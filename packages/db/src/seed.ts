/**
 * TYCOONHOOD SEED — idempotent by design. Run it as many times as you like:
 * everything upserts by slug/key, and the genesis mint posts exactly once
 * via its ledger idempotency key.
 */

import { prisma } from "./client.js";
import { hash } from "@node-rs/argon2";
import {
  THC_TOTAL_SUPPLY,
  THC_INITIAL_REWARDS_POOL,
  THC_MINING_EPOCH_1,
  xpRequiredForLevel,
  MAX_SEEDED_LEVEL,
} from "@tycoonhood/config";

/** Argon2id params — keep in sync with packages/core/src/auth/password.ts */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 as const };

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@tycoonhood.local";
  // The built-in development password is public knowledge — anyone who has read
  // this repository would have full admin access to the economy. Guessing which
  // hosts are "production" from the connection string never worked (a Docker,
  // VPS, Fly, DigitalOcean, Azure, GCP or Vercel-Postgres host walked straight
  // through it). So the rule is explicit and host-independent: a real
  // ADMIN_PASSWORD is required, unless the operator deliberately opts into the
  // public default with ALLOW_DEFAULT_ADMIN=1 for a throwaway local database.
  // See TYCOONHOOD_DECISIONS.md DR-5.
  const allowDefault = process.env.ALLOW_DEFAULT_ADMIN === "1";
  if (!process.env.ADMIN_PASSWORD && !allowDefault) {
    throw new Error(
      "Refusing to seed: ADMIN_PASSWORD is not set. The built-in development " +
        "password is public knowledge. Set ADMIN_PASSWORD (and ADMIN_EMAIL) for any " +
        "real database, or set ALLOW_DEFAULT_ADMIN=1 for a throwaway local one."
    );
  }
  const password = process.env.ADMIN_PASSWORD ?? "tycoon-admin-change-me";
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("⚠ ALLOW_DEFAULT_ADMIN=1 — seeding admin with the PUBLIC development default. Throwaway local use only.");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hash(password, ARGON2);
  if (existing) {
    await prisma.passwordCredential.upsert({
      where: { userId: existing.id },
      update: {},
      create: { userId: existing.id, hash: passwordHash },
    });
    await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    return existing;
  }
  const admin = await prisma.user.create({
    data: {
      email,
      name: "The House",
      role: "ADMIN",
      credential: { create: { hash: passwordHash } },
      profile: {
        create: {
          username: "admin",
          displayName: "The House",
          goals: [],
          interests: [],
          onboardedAt: new Date(),
        },
      },
    },
  });
  console.log(`── Admin ready: ${email}`);
  return admin;
}

async function main() {
  await seedAdmin();
  // ------------------------------------------------------------
  // Levels (curve from @tycoonhood/config)
  // ------------------------------------------------------------
  for (let level = 1; level <= MAX_SEEDED_LEVEL; level++) {
    await prisma.levelDefinition.upsert({
      where: { level },
      update: { xpRequired: xpRequiredForLevel(level) },
      create: { level, xpRequired: xpRequiredForLevel(level) },
    });
  }

  // ------------------------------------------------------------
  // Ranks (spec §15) — extensible: add rows, engine adapts
  // ------------------------------------------------------------
  const ranks = [
    { slug: "initiate", name: "Tycoon Initiate", sortOrder: 1, minLevel: 1, description: "Every empire starts with a first step." },
    { slug: "apprentice", name: "Tycoon Apprentice", sortOrder: 2, minLevel: 5, description: "Learning the craft. Building the habits." },
    { slug: "mastermind", name: "Tycoon Mastermind", sortOrder: 3, minLevel: 12, description: "Strategy over noise. Systems over effort." },
    { slug: "elite", name: "Tycoon Elite", sortOrder: 4, minLevel: 20, description: "Proven across body, business, and capital." },
    { slug: "legend", name: "Tycoon Legend", sortOrder: 5, minLevel: 30, description: "The standard others measure against." },
  ];
  for (const r of ranks) {
    await prisma.rankDefinition.upsert({ where: { slug: r.slug }, update: r, create: r });
  }

  // ------------------------------------------------------------
  // System ledger accounts + genesis (spec §25–§27)
  // ------------------------------------------------------------
  const systemTypes = ["SYSTEM_MINT", "TREASURY", "REWARDS_POOL", "MINING_POOL", "REVENUE"] as const;
  const accounts: Record<string, string> = {};
  for (const type of systemTypes) {
    const existing = await prisma.ledgerAccount.findFirst({ where: { type } });
    const acct = existing ?? (await prisma.ledgerAccount.create({ data: { type, name: type.toLowerCase() } }));
    accounts[type] = acct.id;
  }

  // Genesis mint: 1 quadrillion THC into TREASURY as auditable transaction #1.
  // SYSTEM_MINT goes equally negative — that's the point of double entry:
  // total supply is provable as -balance(SYSTEM_MINT) forever.
  await postOnce("GENESIS", {
    reason: "GENESIS_MINT",
    memo: `Genesis mint: ${THC_TOTAL_SUPPLY} THC`,
    entries: [
      { accountId: accounts.SYSTEM_MINT, amount: -THC_TOTAL_SUPPLY },
      { accountId: accounts.TREASURY, amount: THC_TOTAL_SUPPLY },
    ],
  });

  // Fund the rewards pool so day-to-day rewards never touch the treasury.
  await postOnce("POOL_FUNDING_INITIAL", {
    reason: "POOL_FUNDING",
    memo: `Initial rewards pool: ${THC_INITIAL_REWARDS_POOL} THC`,
    entries: [
      { accountId: accounts.TREASURY, amount: -THC_INITIAL_REWARDS_POOL },
      { accountId: accounts.REWARDS_POOL, amount: THC_INITIAL_REWARDS_POOL },
    ],
  });

  // Fund the Miner's first epoch — ring-fenced so the mining budget is
  // visible on the books and finite by construction.
  await postOnce("MINING_POOL_FUNDING_EPOCH_1", {
    reason: "POOL_FUNDING",
    memo: `Miner epoch 1: ${THC_MINING_EPOCH_1} THC`,
    entries: [
      { accountId: accounts.TREASURY, amount: -THC_MINING_EPOCH_1 },
      { accountId: accounts.MINING_POOL, amount: THC_MINING_EPOCH_1 },
    ],
  });

  // ------------------------------------------------------------
  // The four programs (spec §3) — DATA, not components. Status DRAFT:
  // real content arrives in Phase 5; structure is honest about that.
  // ------------------------------------------------------------
  const courses = [
    {
      slug: "warrior",
      title: "Warrior",
      subtitle: "Build the body. Forge the discipline.",
      pillar: "WARRIOR" as const,
      description:
        "Physical development, discipline, resilience, and capability. Bodybuilding, calisthenics, combat conditioning, and structured training programs with tracked progression and challenges.",
    },
    {
      slug: "business-mastery",
      title: "Business Mastery",
      subtitle: "Learn how businesses are built, run, and scaled.",
      pillar: "BUILDER" as const,
      description:
        "Entrepreneurial fundamentals, marketing, online business models, operations, business finance, and advanced strategy — how value is created, sold, and scaled.",
    },
    {
      slug: "financial-planning-investment-advisory",
      title: "Financial Planning and Investment Advisory",
      subtitle: "Expert guidance on financial management, investment strategies, and wealth-building techniques.",
      pillar: "TYCOON" as const,
      description:
        "Personal financial management, budgeting, asset allocation, portfolio construction, risk management, and long-term wealth building. Educational content only — not personalized financial advice.",
    },
    {
      slug: "mindfulness-wellness",
      title: "Mindfulness and Wellness",
      subtitle: "The internal foundation for everything else.",
      pillar: "MIND" as const,
      description:
        "Mindfulness, self-awareness, emotional discipline, stress management, habit development, and sustained personal growth.",
    },
  ];

  for (const [i, c] of courses.entries()) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, subtitle: c.subtitle, description: c.description, sortOrder: i },
      create: { ...c, sortOrder: i, status: "DRAFT" },
    });

    // NO placeholder curriculum. The real curriculum is owned entirely by
    // seed-academy.ts, which rebuilds each course's modules from scratch.
    // Creating stub "Content pending" lessons here was a production hazard:
    // running `db:seed` after `db:seed:academy` re-introduced empty lessons
    // into a live academy. Course shells are created DRAFT and stay empty
    // until real material is seeded.
    void course;
  }

  // ------------------------------------------------------------
  // Starter missions + achievements (engine fuel; full config UI in Phase 10)
  // ------------------------------------------------------------
  const missions = [
    { slug: "first-lesson", name: "First Steps", description: "Complete your first lesson.", criteria: { event: "LESSON_COMPLETED", count: 1 }, xpReward: 100, thcReward: 500n, repeatable: false },
    { slug: "daily-check-in", name: "Show Up", description: "Check in and take one action today.", criteria: { event: "DAILY_ACTIVE" }, xpReward: 25, thcReward: 50n, repeatable: true, cooldownHours: 20 },
    { slug: "complete-onboarding", name: "Know Thyself", description: "Complete your onboarding profile.", criteria: { event: "ONBOARDED" }, xpReward: 75, thcReward: 250n, repeatable: false },
  ];
  for (const m of missions) {
    await prisma.mission.upsert({ where: { slug: m.slug }, update: m, create: m });
  }

  const achievements = [
    { slug: "first-course", name: "First Course Completed", description: "Finish any Tycoonhood program.", criteria: { event: "COURSE_COMPLETED", count: 1 }, xpReward: 250, thcReward: 1000n },
    { slug: "seven-day-streak", name: "7-Day Streak", description: "Seven consecutive days of action.", criteria: { event: "STREAK", days: 7 }, xpReward: 200, thcReward: 700n },
    { slug: "community-contributor", name: "Community Contributor", description: "Make your presence felt in the community.", criteria: { event: "COMMUNITY_CONTRIBUTION", count: 10 }, xpReward: 150, thcReward: 500n },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { slug: a.slug }, update: a, create: a });
  }

  // ------------------------------------------------------------
  // Report
  // ------------------------------------------------------------
  const [treasury, pool, mint] = await Promise.all([
    prisma.ledgerAccount.findFirst({ where: { type: "TREASURY" } }),
    prisma.ledgerAccount.findFirst({ where: { type: "REWARDS_POOL" } }),
    prisma.ledgerAccount.findFirst({ where: { type: "SYSTEM_MINT" } }),
  ]);
  const courseCount = await prisma.course.count();

  console.log("── Tycoonhood seed complete ─────────────────────────");
  console.log(` Courses:        ${courseCount} (all DRAFT — content pending)`);
  console.log(` Levels seeded:  1–${MAX_SEEDED_LEVEL}`);
  console.log(` Ranks:          ${ranks.map((r) => r.name.replace("Tycoon ", "")).join(" → ")}`);
  console.log(` Total supply:   ${(-(mint?.balance ?? 0n)).toLocaleString()} THC (provable: -SYSTEM_MINT)`);
  console.log(` Treasury:       ${treasury?.balance.toLocaleString()} THC`);
  console.log(` Rewards pool:   ${pool?.balance.toLocaleString()} THC`);
  console.log("─────────────────────────────────────────────────────");
}

/** Minimal in-seed poster with idempotency (core's LedgerService arrives after generate). */
async function postOnce(
  idempotencyKey: string,
  data: {
    reason: "GENESIS_MINT" | "POOL_FUNDING";
    memo: string;
    entries: { accountId: string; amount: bigint }[];
  }
) {
  const prior = await prisma.ledgerTransaction.findUnique({ where: { idempotencyKey } });
  if (prior) return prior;
  return prisma.$transaction(async (tx) => {
    const created = await tx.ledgerTransaction.create({
      data: {
        reason: data.reason,
        idempotencyKey,
        memo: data.memo,
        entries: { create: data.entries },
      },
    });
    for (const e of data.entries) {
      await tx.ledgerAccount.update({
        where: { id: e.accountId },
        data: { balance: { increment: e.amount } },
      });
    }
    return created;
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
