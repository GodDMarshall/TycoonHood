import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { Badge, Card, CardContent, PillarBadge, SectionRule } from "@tycoonhood/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug } });
  return { title: course?.title ?? "Program" };
}

const typeLabel = { VIDEO: "Video", READING: "Reading", QUIZ: "Quiz", ASSIGNMENT: "Assignment" } as const;

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" } } } },
      prerequisite: true,
    },
  });
  if (!course) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center gap-3">
        <PillarBadge pillar={course.pillar} />
        {course.status !== "PUBLISHED" && <Badge>In production — content pending</Badge>}
      </div>
      <h1 className="display mt-4 text-[42px] leading-tight">{course.title}</h1>
      {course.subtitle && <p className="mt-2 text-[17px] text-ink-2">{course.subtitle}</p>}
      <p className="mt-5 max-w-2xl leading-relaxed text-ink-2">{course.description}</p>
      {course.prerequisite && (
        <p className="mt-4 text-[13px] text-ink-3">
          Prerequisite:{" "}
          <Link href={`/programs/${course.prerequisite.slug}`} className="text-gold hover:underline">
            {course.prerequisite.title}
          </Link>
        </p>
      )}

      <SectionRule label="Curriculum" className="mb-6 mt-12" />
      <div className="flex flex-col gap-5">
        {course.modules.map((m, mi) => (
          <Card key={m.id}>
            <CardContent className="py-5">
              <p className="figures mb-1 text-[12px] text-gold-deep">{String(mi + 1).padStart(2, "0")}</p>
              <h2 className="display text-[20px]">{m.title}</h2>
              {m.description && <p className="mt-1 text-[13px] text-ink-2">{m.description}</p>}
              <div className="mt-4 flex flex-col">
                {m.lessons.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0"
                  >
                    <span className="text-[14px] text-ink-1">
                      {l.title}
                      {l.isPreview && <span className="ml-2 text-[11px] uppercase tracking-wider text-mind">Preview</span>}
                    </span>
                    <span className="figures shrink-0 text-[12px] text-ink-3">
                      {typeLabel[l.type]} · +{l.xpReward} XP
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-gold-deep bg-gold/5 p-6">
        <h3 className="display text-[18px]">Completion pays {course.xpOnCompletion} XP</h3>
        <p className="mt-1 text-[13px] text-ink-2">
          Lesson progress, quizzes, and certificates go live with the course
          player in Phase 5.{" "}
          <Link href="/register" className="text-gold hover:underline underline-offset-4">
            Join now
          </Link>{" "}
          and your seat is ready.
        </p>
      </div>
    </main>
  );
}
