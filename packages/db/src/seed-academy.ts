/**
 * ACADEMY CONTENT SEED — builds the four launch programmes from the
 * curriculum files in ./curriculum (format: ./curriculum/types.ts).
 *
 * WARNING: This seed OWNS the launch curriculum. For each programme it
 * deletes and rebuilds the course's modules (cascading lessons, quizzes and
 * LessonProgress), then marks the course PUBLISHED. It therefore REFUSES to
 * rebuild a course that has any LessonProgress rows unless SEED_ACADEMY_FORCE=1
 * is set (see seed-guard.ts). After launch, edit courses in /admin/courses.
 *
 * Each programme becomes:
 *   modules (objectives + completion) → lessons (minutes → durationSec)
 *   → quizzes with explanations, then a last module "Final Assessment"
 *   holding one QUIZ lesson with isFinal = true (required for the certificate).
 *
 * A missing curriculum file is skipped with a warning, so the seed runs while
 * the remaining programmes are still being written.
 *
 * Run: pnpm --filter @tycoonhood/db seed:academy
 *      SEED_ACADEMY_FORCE=1 pnpm --filter @tycoonhood/db seed:academy   (destroys progress)
 */
import { prisma } from "./client";
import type { LessonSrc, Programme } from "./curriculum/types";
import { academyRebuildDecision } from "./seed-guard";

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

async function main() {
  const force = process.env.SEED_ACADEMY_FORCE;
  const founder = await prisma.instructor.upsert({
    where: { slug: FOUNDER.slug },
    update: { name: FOUNDER.name, headline: FOUNDER.headline, bio: FOUNDER.bio, avatar: FOUNDER.avatar },
    create: FOUNDER,
  });
  console.log(`✓ instructor ${founder.name}`);

  for (const src of SOURCES) {
    const programme = await loadProgramme(src.file, src.exportName);
    if (!programme) continue;
    const slug = programme.slug;

    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      console.warn(`⚠ skip ${slug}: course missing (run db:seed first)`);
      continue;
    }

    const progressRows = await prisma.lessonProgress.count({ where: { lesson: { module: { courseId: course.id } } } });
    const decision = academyRebuildDecision({ slug, progressRows, force });
    if (!decision.rebuild) {
      console.error(`✗ ${decision.reason}`);
      // Still attach the instructor; that touches no member data.
      await prisma.course.update({ where: { id: course.id }, data: { instructorId: founder.id } });
      continue;
    }
    if (progressRows > 0) console.warn(`⚠ SEED_ACADEMY_FORCE=1: erasing ${progressRows} progress row(s) in ${slug}`);

    // Deterministic rebuild (the seed owns the launch curriculum).
    await prisma.courseModule.deleteMany({ where: { courseId: course.id } });

    let lessonCount = 0;
    for (const [mi, m] of programme.modules.entries()) {
      const mod = await prisma.courseModule.create({
        data: {
          courseId: course.id,
          title: m.title,
          description: m.description,
          objectives: m.objectives ?? [],
          completion: m.completion ?? null,
          sortOrder: mi,
        },
      });
      for (const [li, l] of m.lessons.entries()) {
        const lesson = await prisma.lesson.create({
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
          await prisma.quiz.create({
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
      const finalModule = await prisma.courseModule.create({
        data: {
          courseId: course.id,
          title: "Final Assessment",
          description: "One assessment across every module. Pass it to earn your certificate.",
          objectives: ["Demonstrate the core ideas of every module in this programme."],
          completion: `Pass the final assessment with ${fa.passScore}% or more. Retries are unlimited and every answer is explained.`,
          sortOrder: programme.modules.length,
        },
      });
      const lesson = await prisma.lesson.create({
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
      await prisma.quiz.create({
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
      console.warn(`⚠ ${slug}: no final assessment questions — members will not be able to earn a certificate`);
    }

    await prisma.course.update({
      where: { id: course.id },
      data: { status: "PUBLISHED", instructorId: founder.id, description: DESCRIPTIONS[slug] ?? course.description },
    });
    console.log(`✓ ${slug}: ${programme.modules.length} modules + final, ${lessonCount} lessons — PUBLISHED`);
    await programChannels(course.id, slug);
  }

  // Programmes whose file is missing still get their instructor.
  await prisma.course.updateMany({
    where: { slug: { in: Object.keys(DESCRIPTIONS) }, instructorId: null },
    data: { instructorId: founder.id },
  });
}

/**
 * A published program gets its two community channels. Mirrors
 * CommunityService.ensureProgramChannels (core cannot be imported from db)
 * and the 20261001000000_academy_community migration. Idempotent.
 */
async function programChannels(courseId: string, slug: string) {
  const rows = [
    { suffix: "discussion", name: "Discussion", kind: "CHAT" as const, sortOrder: 0, topic: "Talk about the work of this program with the people doing it." },
    { suffix: "questions", name: "Questions", kind: "QUESTIONS" as const, sortOrder: 1, topic: "Stuck on a lesson? Ask here. Questions from the lesson page land here with the lesson attached." },
  ];
  for (const r of rows) {
    await prisma.channel.upsert({
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
