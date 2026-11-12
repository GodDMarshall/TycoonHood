/**
 * ACADEMY CONTENT SEED — builds the four launch programmes from the
 * curriculum files in ./curriculum (format: ./curriculum/types.ts).
 *
 * Each programme is built ONCE. From then on it belongs to staff, who edit its
 * lessons, modules, quizzes, details, status and instructor in /admin/courses,
 * and a re-run leaves it exactly as they left it (DR-33). The rule is
 * academyRebuildDecision in seed-guard.ts: a programme is built when the seed
 * has no record of building it (SiteSetting "seed.academy.built") and it has
 * no modules.
 *
 * A build makes, in one transaction:
 *   modules (objectives + completion) → lessons (minutes → durationSec)
 *   → quizzes with explanations, then a last module "Final Assessment"
 *   holding one QUIZ lesson with isFinal = true (required for the certificate);
 * then marks the course PUBLISHED with the founder as its instructor, gives it
 * its two community channels and records it as built. A build that fails
 * leaves nothing half made, so the next run builds it cleanly.
 *
 * SEED_ACADEMY_FORCE=1 rebuilds every programme from the files anyway. It
 * deletes the modules, which cascades to lessons, quizzes and every member's
 * LessonProgress on them, and undoes every staff edit to the curriculum.
 *
 * A missing curriculum file is skipped with a warning, so the seed runs while
 * the remaining programmes are still being written.
 *
 * Run: pnpm --filter @tycoonhood/db seed:academy
 *      SEED_ACADEMY_FORCE=1 pnpm --filter @tycoonhood/db seed:academy   (destroys edits and progress)
 */
import { prisma, type Prisma } from "./client";
import type { LessonSrc, Programme } from "./curriculum/types";
import { academyRebuildDecision, ACADEMY_BUILT_SETTING } from "./seed-guard";

/** Curriculum file → its named export. Loaded dynamically so a missing file is skippable. */
const SOURCES: { file: string; exportName: string }[] = [
  { file: "warrior", exportName: "warrior" },
  { file: "business-mastery", exportName: "businessMastery" },
  { file: "financial-planning", exportName: "financialPlanning" },
  { file: "mindfulness", exportName: "mindfulness" },
];

/** Descriptions matched to the 8-module launch scope. Titles and slugs are unchanged. */
const DESCRIPTIONS: Record<string, string> = {
  warrior:
    "Eight modules on physical discipline: consistency, conditioning, strength foundations, nutrition, recovery and sleep, mental resilience, habit formation and personal accountability. Every module ends in a knowledge check, and the programme ends in a final assessment.",
  "business-mastery":
    "Eight modules on how businesses are built, run and scaled: from entrepreneurial fundamentals and offers to marketing, sales, operations, business finance and strategy. Every module ends in a knowledge check, and the programme ends in a final assessment.",
  "financial-planning-investment-advisory":
    "Eight modules on personal finance: foundations, budgeting and saving, debt, emergency funds and protection, compounding, investment fundamentals, risk and diversification, and long-term planning. Educational content only — not personalised financial, investment, tax or legal advice.",
  "mindfulness-wellness":
    "Eight modules on the internal foundation: mindfulness, meditation, breath awareness, emotional awareness, stress management, sleep and recovery, daily routines and reflection, and sustainable wellness habits. Educational content, not medical or psychological treatment.",
};

const DEFAULT_XP: Record<LessonSrc["type"], number> = { READING: 50, ASSIGNMENT: 75, QUIZ: 100 };
const FINAL_XP = 250;

const FOUNDER = {
  slug: "harsha",
  name: "Harsha",
  headline: "Founder & Creator of Tycoonhood",
  bio: "Harsha built Tycoonhood to put training, business, money and the mind in one place, where learning is measured by what you actually do. He runs the platform and shapes every programme on it.",
  avatar: "/founder/harsha.jpg",
};

async function loadProgramme(file: string, exportName: string): Promise<Programme | null> {
  try {
    // A computed specifier keeps the compiler from requiring every file to exist yet.
    const spec = `./curriculum/${file}`;
    const mod = (await import(spec)) as Record<string, unknown>;
    const p = mod[exportName] as Programme | undefined;
    if (!p || !Array.isArray(p.modules)) {
      console.warn(`⚠ skip ${file}: no "${exportName}" export with modules`);
      return null;
    }
    return p;
  } catch (e) {
    console.warn(`⚠ skip ${file}: curriculum file not available yet (${(e as Error).message.split("\n")[0]})`);
    return null;
  }
}

/** The programmes the seed has built, by slug. */
async function builtSlugs(): Promise<Set<string>> {
  const row = await prisma.siteSetting.findUnique({ where: { key: ACADEMY_BUILT_SETTING } });
  const slugs = (row?.value as { slugs?: unknown } | undefined)?.slugs;
  return new Set(Array.isArray(slugs) ? slugs.filter((x): x is string => typeof x === "string") : []);
}

async function recordBuilt(db: Prisma.TransactionClient | typeof prisma, slugs: Set<string>) {
  const value = { slugs: [...slugs].sort() };
  await db.siteSetting.upsert({ where: { key: ACADEMY_BUILT_SETTING }, update: { value }, create: { key: ACADEMY_BUILT_SETTING, value } });
}

async function main() {
  const force = process.env.SEED_ACADEMY_FORCE;
  // Created once. Staff edit the founder's profile in /admin/courses.
  const founder = await prisma.instructor.upsert({ where: { slug: FOUNDER.slug }, update: {}, create: FOUNDER });
  console.log(`✓ instructor ${founder.name}`);

  const built = await builtSlugs();
  for (const src of SOURCES) {
    const programme = await loadProgramme(src.file, src.exportName);
    if (!programme) continue;
    const slug = programme.slug;

    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      console.warn(`⚠ skip ${slug}: course missing (run db:seed first)`);
      continue;
    }

    const [modules, progressRows] = await Promise.all([
      prisma.courseModule.count({ where: { courseId: course.id } }),
      prisma.lessonProgress.count({ where: { lesson: { module: { courseId: course.id } } } }),
    ]);
    const decision = academyRebuildDecision({ slug, built: built.has(slug), modules, progressRows, force });
    if (!decision.rebuild) {
      console.log(`· ${decision.reason}`);
      // Built by a seed from before the record existed: record it, so it stays
      // built even if staff later remove every module.
      if (!built.has(slug)) {
        built.add(slug);
        await recordBuilt(prisma, built);
      }
      continue;
    }
    if (progressRows > 0) console.warn(`⚠ SEED_ACADEMY_FORCE=1: erasing ${progressRows} progress row(s) in ${slug}`);

    built.add(slug);
    const lessonCount = await prisma.$transaction(
      async (tx) => {
        await tx.courseModule.deleteMany({ where: { courseId: course.id } });
        const count = await buildCurriculum(tx, course.id, programme);
        await tx.course.update({
          where: { id: course.id },
          data: { status: "PUBLISHED", instructorId: founder.id, description: DESCRIPTIONS[slug] ?? course.description },
        });
        await programChannels(tx, course.id, slug);
        await recordBuilt(tx, built);
        return count;
      },
      // A programme is a few hundred inserts; over a remote connection that takes a while.
      { timeout: 120_000, maxWait: 10_000 }
    );
    console.log(`✓ ${slug}: ${programme.modules.length} modules + final, ${lessonCount} lessons — PUBLISHED`);
  }
}

/** Creates a programme's modules, lessons and quizzes from its curriculum file. Returns the lesson count. */
async function buildCurriculum(tx: Prisma.TransactionClient, courseId: string, programme: Programme) {
  let lessonCount = 0;
  for (const [mi, m] of programme.modules.entries()) {
    const mod = await tx.courseModule.create({
      data: {
        courseId,
        title: m.title,
        description: m.description,
        objectives: m.objectives ?? [],
        completion: m.completion ?? null,
        sortOrder: mi,
      },
    });
    for (const [li, l] of m.lessons.entries()) {
      const lesson = await tx.lesson.create({
        data: {
          moduleId: mod.id,
          title: l.title,
          type: l.type,
          sortOrder: li,
          contentMd: l.md,
          isPreview: l.preview ?? false,
          xpReward: l.xp ?? DEFAULT_XP[l.type],
          durationSec: l.minutes ? l.minutes * 60 : null,
        },
      });
      lessonCount++;
      if (l.quiz) {
        await tx.quiz.create({
          data: {
            lessonId: lesson.id,
            passScore: l.quiz.passScore ?? 70,
            questions: {
              create: l.quiz.questions.map((q, qi) => ({
                sortOrder: qi,
                prompt: q.prompt,
                options: q.options,
                correctIndex: q.correct,
                explanation: q.why,
              })),
            },
          },
        });
      }
    }
  }

  // The final assessment: its own last module, one QUIZ lesson, isFinal.
  const fa = programme.finalAssessment;
  if (fa && fa.questions.length > 0) {
    const finalModule = await tx.courseModule.create({
      data: {
        courseId,
        title: "Final Assessment",
        description: "One assessment across every module. Pass it to earn your certificate.",
        objectives: ["Demonstrate the core ideas of every module in this programme."],
        completion: `Pass the final assessment with ${fa.passScore}% or more. Retries are unlimited and every answer is explained.`,
        sortOrder: programme.modules.length,
      },
    });
    const lesson = await tx.lesson.create({
      data: {
        moduleId: finalModule.id,
        title: "Final Assessment",
        type: "QUIZ",
        sortOrder: 0,
        contentMd: fa.intro,
        isFinal: true,
        xpReward: FINAL_XP,
        durationSec: Math.max(10, fa.questions.length * 2) * 60,
      },
    });
    lessonCount++;
    await tx.quiz.create({
      data: {
        lessonId: lesson.id,
        passScore: fa.passScore,
        questions: {
          create: fa.questions.map((q, qi) => ({
            sortOrder: qi,
            prompt: q.prompt,
            options: q.options,
            correctIndex: q.correct,
            explanation: q.why,
          })),
        },
      },
    });
  } else {
    console.warn(`⚠ ${programme.slug}: no final assessment questions — members will not be able to earn a certificate`);
  }
  return lessonCount;
}

/**
 * A published program gets its two community channels. Mirrors
 * CommunityService.ensureProgramChannels (core cannot be imported from db)
 * and the 20261001000000_academy_community migration. A channel that already
 * exists is left as staff set it.
 */
async function programChannels(tx: Prisma.TransactionClient, courseId: string, slug: string) {
  const rows = [
    { suffix: "discussion", name: "Discussion", kind: "CHAT" as const, sortOrder: 0, topic: "Talk about the work of this program with the people doing it." },
    { suffix: "questions", name: "Questions", kind: "QUESTIONS" as const, sortOrder: 1, topic: "Stuck on a lesson? Ask here. Questions from the lesson page land here with the lesson attached." },
  ];
  for (const r of rows) {
    await tx.channel.upsert({
      where: { slug: `${slug}-${r.suffix}` },
      update: {},
      create: { slug: `${slug}-${r.suffix}`, name: r.name, kind: r.kind, topic: r.topic, courseId, slowModeSec: 10, sortOrder: r.sortOrder },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
