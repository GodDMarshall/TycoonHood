/**
 * COMMUNITY SEED — discussion categories, the four programme groups, and the
 * weekly missions. Structure only: no posts, no members, nothing invented.
 *
 * Idempotent — upserts by slug. Re-running restores the seeded wording; edits
 * made in Admin → Community to seeded rows are overwritten, new rows are not
 * touched. Run: pnpm --filter @tycoonhood/db seed:community
 *
 * Missions follow the house conventions (seed.ts): criteria as data, modest
 * rewards. Weekly missions use the calendar "week" window (Monday 00:00 UTC)
 * and are repeatable, so they pay at most once per week.
 */
import { prisma } from "./client";

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
  for (const c of CATEGORIES) {
    await prisma.communityCategory.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  for (const g of GROUPS) {
    await prisma.communityGroup.upsert({ where: { slug: g.slug }, update: g, create: g });
  }
  for (const m of WEEKLY_MISSIONS) {
    // cooldownHours stays null: the weekly bucket is the cap. `active` is set on
    // create only, so a mission staff switched off stays off on a re-run.
    await prisma.mission.upsert({ where: { slug: m.slug }, update: m, create: { ...m, active: true } });
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
