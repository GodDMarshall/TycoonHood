/**
 * TYCOONHOOD SEED — the admin, levels, ranks, the ledger's system accounts
 * and genesis, the four course shells, starter missions and achievements.
 *
 * Safe to re-run on a live database (DR-33): it adds what is missing and
 * refreshes what only the seed owns (levels, ranks, achievements). It never
 * rewrites what staff change in the admin: course details, missions, roles
 * and passwords. ADMIN_EMAIL makes the first admin: once an admin can sign
 * in, the seed makes no other. The genesis mint posts exactly once via its
 * ledger idempotency key.
 */

import { prisma, type Prisma } from "./client.js";
import { hash } from "@node-rs/argon2";
import {
  THC_TOTAL_SUPPLY,
  THC_INITIAL_REWARDS_POOL,
  THC_MINING_EPOCH_1,
  xpRequiredForLevel,
  MAX_SEEDED_LEVEL,
} from "@tycoonhood/config";

/** Advisory lock key for the system accounts and genesis, "tylg" in ASCII (see main). */
const LEDGER_SEED_LOCK = 0x74796c67n;

/** Argon2id params — keep in sync with packages/core/src/auth/password.ts */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 as const };

/** An address the way sign-in reads it: loginSchema trims and lower-cases what is typed. */
const normaliseEmail = (raw: string) => raw.trim().toLowerCase();

async function seedAdmin() {
  // Stored as sign-in reads it, or a capitalised ADMIN_EMAIL makes an admin
  // nobody can sign in as (review finding 18).
  const email = normaliseEmail(process.env.ADMIN_EMAIL ?? "admin@tycoonhood.local");
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) {
    throw new Error(`Refusing to seed: ADMIN_EMAIL "${process.env.ADMIN_EMAIL}" is not an email address.`);
  }
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

  const existing = await findAdminAccount(email);
  if (existing) {
    // Once the account exists its password is its own: a re-run never resets it.
    const credential = await prisma.passwordCredential.findUnique({ where: { userId: existing.id }, select: { userId: true } });
    if (!credential) {
      await prisma.passwordCredential.create({ data: { userId: existing.id, hash: await hash(password, ARGON2) } });
    }
    // Roles belong to staff (/admin/members). The seed makes this account an
    // admin only when nobody could otherwise run the platform: on a first
    // deploy where it signed up before the seed ran, or with every admin locked out.
    if (existing.role === "ADMIN") {
      console.log(`── Admin found: ${email}. Its password and role are left as they are.`);
    } else {
      if (await someAdminCanSignIn()) {
        console.log(`── ${email} is ${existing.role}: left as it is. Staff change roles in /admin/members.`);
      } else {
        await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
        console.log(`── ${email} made ADMIN: no admin could sign in.`);
      }
    }
    return existing;
  }

  // No account has the address. ADMIN_EMAIL makes the first admin, and only
  // that: while an admin can sign in, a new or mistyped address makes no
  // other, or every seeding run would mint a full admin, with ADMIN_PASSWORD,
  // for whoever holds that mailbox. Staff add admins in /admin/members.
  if (await someAdminCanSignIn()) {
    console.log(
      `── No account has ${email}, and an admin can already sign in, so no admin was made. ` +
        "ADMIN_EMAIL only makes the first admin. Add others in /admin/members."
    );
    return null;
  }
  // Nor at an address held for an account that changed away from it: that
  // account's undo link puts the address back, and would then find it taken.
  if (await isHeld(email)) {
    throw new Error(
      `Refusing to seed: ${email} is held for the account that changed away from it in the last 7 days, ` +
        "so its owner can undo that change. No admin can sign in. Set ADMIN_EMAIL to the address of the " +
        "account to make admin, or to a new address."
    );
  }

  const username = await freeUsername("admin");
  const admin = await prisma.user.create({
    data: {
      email,
      name: "The House",
      role: "ADMIN",
      credential: { create: { hash: await hash(password, ARGON2) } },
      profile: {
        create: {
          username,
          displayName: "The House",
          goals: [],
          interests: [],
          onboardedAt: new Date(),
        },
      },
    },
  });
  console.log(`── Admin ready: ${email}${username === "admin" ? "" : ` (username ${username}: "admin" is taken)`}`);
  return admin;
}

/**
 * The account for ADMIN_EMAIL. Earlier seeds stored the address exactly as
 * given, so " Owner@Example.com" made an admin no sign-in could match. Such a
 * row is found by its normalised address and repaired in place. Sign-up and
 * email changes always store addresses normalised, so a row like that can
 * only be one a seed made. It is not repaired onto an address held for
 * another account: that would take the address the hold keeps for it.
 */
async function findAdminAccount(email: string) {
  const exact = await prisma.user.findUnique({ where: { email } });
  if (exact) return exact;
  const near = await prisma.user.findMany({
    where: { email: { contains: email, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
  });
  const legacy = near
    .filter((u) => normaliseEmail(u.email) === email)
    .sort((a, b) => Number(b.role === "ADMIN") - Number(a.role === "ADMIN"))[0];
  if (!legacy || (await isHeld(email))) return null;
  console.log(`── Admin address "${legacy.email}" stored as "${email}", so it can sign in.`);
  return prisma.user.update({ where: { id: legacy.id }, data: { email } });
}

/** Whether any admin can sign in today: a password, an address sign-in can match, not suspended. */
async function someAdminCanSignIn() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", suspendedAt: null, credential: { isNot: null } },
    select: { email: true },
  });
  return admins.some((a) => a.email === normaliseEmail(a.email));
}

/**
 * Whether the address is held for an account that changed away from it in the
 * last 7 days (packages/core/src/platform/email-hold.ts). Sign-up and email
 * changes refuse a held address; so does the seed.
 */
async function isHeld(email: string) {
  return (await prisma.emailHold.count({ where: { address: email, expires: { gt: new Date() } } })) > 0;
}

/** "admin", or "admin_2", "admin_3"… when another account has it: usernames are unique. */
async function freeUsername(base: string) {
  for (let n = 1; n <= 1000; n++) {
    const username = n === 1 ? base : `${base}_${n}`;
    if (!(await prisma.profile.findUnique({ where: { username }, select: { userId: true } }))) return username;
  }
  throw new Error(`No free username left for the admin (tried ${base} to ${base}_1000).`);
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
  // One transaction, one seed at a time (review finding 19). The ledger treats
  // each system account type as a singleton, so two seeds that both found no
  // TREASURY must not each create one. Builds already take turns under the
  // deploy lock (scripts/with-db-lock.mjs); this lock keeps apart seeds run by
  // hand as well. The second seed waits here, then finds everything made.
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LEDGER_SEED_LOCK}::bigint)`;

      const systemTypes = ["SYSTEM_MINT", "TREASURY", "REWARDS_POOL", "MINING_POOL", "REVENUE"] as const;
      const accounts: Record<string, string> = {};
      for (const type of systemTypes) {
        const existing = await tx.ledgerAccount.findFirst({ where: { type } });
        const acct = existing ?? (await tx.ledgerAccount.create({ data: { type, name: type.toLowerCase() } }));
        accounts[type] = acct.id;
      }

      // Genesis mint: 1 quadrillion THC into TREASURY as auditable transaction #1.
      // SYSTEM_MINT goes equally negative — that's the point of double entry:
      // total supply is provable as -balance(SYSTEM_MINT) forever.
      await postOnce(tx, "GENESIS", {
        reason: "GENESIS_MINT",
        memo: `Genesis mint: ${THC_TOTAL_SUPPLY} THC`,
        entries: [
          { accountId: accounts.SYSTEM_MINT, amount: -THC_TOTAL_SUPPLY },
          { accountId: accounts.TREASURY, amount: THC_TOTAL_SUPPLY },
        ],
      });

      // Fund the rewards pool so day-to-day rewards never touch the treasury.
      await postOnce(tx, "POOL_FUNDING_INITIAL", {
        reason: "POOL_FUNDING",
        memo: `Initial rewards pool: ${THC_INITIAL_REWARDS_POOL} THC`,
        entries: [
          { accountId: accounts.TREASURY, amount: -THC_INITIAL_REWARDS_POOL },
          { accountId: accounts.REWARDS_POOL, amount: THC_INITIAL_REWARDS_POOL },
        ],
      });

      // Fund the Miner's first epoch — ring-fenced so the mining budget is
      // visible on the books and finite by construction.
      await postOnce(tx, "MINING_POOL_FUNDING_EPOCH_1", {
        reason: "POOL_FUNDING",
        memo: `Miner epoch 1: ${THC_MINING_EPOCH_1} THC`,
        entries: [
          { accountId: accounts.TREASURY, amount: -THC_MINING_EPOCH_1 },
          { accountId: accounts.MINING_POOL, amount: THC_MINING_EPOCH_1 },
        ],
      });
    },
    // Waiting for another seed counts against the timeout, so allow for it.
    { timeout: 120_000, maxWait: 10_000 }
  );

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
    // Created once. Title, subtitle, description and status are staff's from
    // then on (/admin/courses), so a re-run writes nothing here.
    await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i, status: "DRAFT" },
    });

    // NO placeholder curriculum. The real curriculum comes from
    // seed-academy.ts, which builds each course's modules once. Creating stub
    // "Content pending" lessons here was a production hazard: running
    // `db:seed` after `db:seed:academy` re-introduced empty lessons into a
    // live academy. Course shells are created DRAFT and stay empty until
    // real material is seeded.
  }

  // ------------------------------------------------------------
  // Starter missions + achievements (engine fuel; full config UI in Phase 10)
  // ------------------------------------------------------------
  const missions = [
    { slug: "first-lesson", name: "First Steps", description: "Complete your first lesson.", criteria: { event: "LESSON_COMPLETED", count: 1 }, xpReward: 100, thcReward: 500n, repeatable: false },
    { slug: "daily-check-in", name: "Show Up", description: "Check in and take one action today.", criteria: { event: "DAILY_ACTIVE" }, xpReward: 25, thcReward: 50n, repeatable: true, cooldownHours: 20 },
    { slug: "complete-onboarding", name: "Know Thyself", description: "Complete your onboarding profile.", criteria: { event: "ONBOARDED" }, xpReward: 75, thcReward: 250n, repeatable: false },
  ];
  // Missions are created once: staff edit them in /admin/missions, wording,
  // rewards and whether they are live included. Achievements and ranks have
  // no admin, so the seed keeps their copy current.
  for (const m of missions) {
    await prisma.mission.upsert({ where: { slug: m.slug }, update: {}, create: m });
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
  const [courseCount, published] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
  ]);

  console.log("── Tycoonhood seed complete ─────────────────────────");
  console.log(` Courses:        ${courseCount} (${published} published; seed:academy builds and publishes them)`);
  console.log(` Levels seeded:  1–${MAX_SEEDED_LEVEL}`);
  console.log(` Ranks:          ${ranks.map((r) => r.name.replace("Tycoon ", "")).join(" → ")}`);
  console.log(` Total supply:   ${(-(mint?.balance ?? 0n)).toLocaleString()} THC (provable: -SYSTEM_MINT)`);
  console.log(` Treasury:       ${treasury?.balance.toLocaleString()} THC`);
  console.log(` Rewards pool:   ${pool?.balance.toLocaleString()} THC`);
  console.log("─────────────────────────────────────────────────────");
}

/**
 * Minimal in-seed poster with idempotency (core's LedgerService arrives after
 * generate). Runs inside the caller's transaction, under its lock.
 */
async function postOnce(
  tx: Prisma.TransactionClient,
  idempotencyKey: string,
  data: {
    reason: "GENESIS_MINT" | "POOL_FUNDING";
    memo: string;
    entries: { accountId: string; amount: bigint }[];
  }
) {
  const prior = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey } });
  if (prior) return prior;
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
