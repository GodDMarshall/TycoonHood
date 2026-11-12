/**
 * COMMUNITY SEED — discussion categories, the four programme groups, and the
 * weekly missions. Structure only: no posts, no members, nothing invented.
 *
 * Safe to re-run on a live database (DR-33): a category, group or mission the
 * seeds never made is created, and one they made is left as staff keep it in
 * Admin → Community and Admin → Missions, wording, order and whether it is
 * live included. That holds under a new slug too: the seeds record what they
 * made (seed-record.ts), so a renamed row is not made again under its old one.
 * Run: pnpm --filter @tycoonhood/db seed:community
 *
 * Missions follow the house conventions (seed.ts): criteria as data, modest
 * rewards. Weekly missions use the calendar "week" window (Monday 00:00 UTC)
 * and are repeatable, so they pay at most once per week.
 */
import { prisma } from "./client";
import { SeedRecord } from "./seed-record";

const CATEGORIES = [
  { slug: "introductions", name: "Introductions", description: "Who you are, what you are building, and what you want from the next 90 days.", sortOrder: 10 },
  { slug: "wins", name: "Wins & Progress", description: "Results with proof: a link, a number, the thing done. Progress updates welcome.", sortOrder: 20 },
  { slug: "questions", name: "Questions", description: "Stuck? Say what you tried, what happened, and what you need.", sortOrder: 30 },
  { slug: "warrior", name: "Warrior", description: "Training, conditioning, discipline of the body.", sortOrder: 40 },
  { slug: "business", name: "Business", description: "Building, selling, operating. Specifics over theory.", sortOrder: 50 },
  { slug: "money", name: "Money", description: "Budgeting, saving, planning. Share what you did, not what others should buy.", sortOrder: 60 },
  { slug: "mind", name: "Mind", description: "Focus, rest, habits, the inner work that carries the rest.", sortOrder: 70 },
  { slug: "feedback", name: "Feedback", description: "What to fix or add in Tycoonhood. Staff read every post here.", sortOrder: 80 },
];

const GROUPS = [
  { slug: "warrior-program", name: "Warrior Program", pillar: "WARRIOR" as const, description: "For members working through the Warrior programme: training logs, form questions, and holding each other to the plan." },
  { slug: "business-mastery-program", name: "Business Mastery Program", pillar: "BUILDER" as const, description: "For members working through Business Mastery: offers, customers, numbers and the next thing to ship." },
  { slug: "financial-planning-program", name: "Financial Planning Program", pillar: "TYCOON" as const, description: "For members working through Financial Planning: budgets, saving systems and plans. Education only; no individual advice." },
  { slug: "mindfulness-wellness-program", name: "Mindfulness & Wellness Program", pillar: "MIND" as const, description: "For members working through Mindfulness and Wellness: practice notes, sleep, focus and recovery." },
];

const WEEKLY_MISSIONS = [
  {
    slug: "weekly-five-lessons",
    name: "Five Lessons This Week",
    description: "Complete 5 lessons this week.",
    criteria: { event: "LESSON_COMPLETED", count: 5, within: "week" },
    xpReward: 100,
    thcReward: 200n,
    repeatable: true,
  },
  {
    slug: "weekly-standard-five-days",
    name: "Hold the Standard",
    description: "Meet your full daily standard on 5 days this week.",
    criteria: { event: "STREAK", count: 5, within: "week" },
    xpReward: 125,
    thcReward: 250n,
    repeatable: true,
  },
  {
    slug: "weekly-quiz-pass",
    name: "Prove It",
    description: "Pass 2 knowledge checks this week.",
    criteria: { event: "QUIZ_PASSED", count: 2, within: "week" },
    xpReward: 60,
    thcReward: 120n,
    repeatable: true,
  },
];

async function main() {
  const categories = await SeedRecord.load("categories", [CATEGORIES.map((c) => c.slug)], async (slugs) =>
    (await prisma.communityCategory.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })).map((r) => r.slug)
  );
  for (const c of CATEGORIES) {
    await categories.once(c.slug, () => prisma.communityCategory.upsert({ where: { slug: c.slug }, update: {}, create: c }));
  }
  const groups = await SeedRecord.load("groups", [GROUPS.map((g) => g.slug)], async (slugs) =>
    (await prisma.communityGroup.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })).map((r) => r.slug)
  );
  for (const g of GROUPS) {
    await groups.once(g.slug, () => prisma.communityGroup.upsert({ where: { slug: g.slug }, update: {}, create: g }));
  }
  const missions = await SeedRecord.load("weekly-missions", [WEEKLY_MISSIONS.map((m) => m.slug)], async (slugs) =>
    (await prisma.mission.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })).map((r) => r.slug)
  );
  for (const m of WEEKLY_MISSIONS) {
    // cooldownHours stays null: the weekly bucket is the cap.
    await missions.once(m.slug, () => prisma.mission.upsert({ where: { slug: m.slug }, update: {}, create: { ...m, active: true } }));
  }

  console.log("── Community seed complete ──────────────────────────");
  console.log(` Categories:      ${CATEGORIES.map((c) => c.name).join(", ")}`);
  console.log(` Groups:          ${GROUPS.map((g) => g.name).join(", ")}`);
  console.log(` Weekly missions: ${WEEKLY_MISSIONS.map((m) => m.name).join(", ")}`);
  console.log("─────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
