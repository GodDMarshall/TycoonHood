import type { Metadata } from "next";
import { requireUser } from "../../../../lib/guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lms } from "@tycoonhood/core";
import { Badge, Card, CardContent, PillarBadge, Progress, SectionRule } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../../lib/auth";
import { enrollAction } from "../actions";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Academy · ${slug}` };
}

export default async function CourseHome({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const user = (await getCurrentUser())!;
  const view = await lms.memberCourseView(user.id, slug);
  if (!view || view.course.status !== "PUBLISHED") notFound();
  const { course, enrollment, certificate } = view;

  const lessons = course.modules.flatMap((m) => m.lessons);
  const nextLesson = lessons.find((l) => !l.progress[0]?.completedAt);

  return (
    <main>
      <div className="flex flex-wrap items-center gap-3">
        <PillarBadge pillar={course.pillar} />
        {certificate && (
          <Link href={`/verify/${certificate.serial}`}>
            <Badge tone="gold">Certificate {certificate.serial} →</Badge>
          </Link>
        )}
      </div>
      <h1 className="display mt-3 text-[34px]">{course.title}</h1>
      <p className="mt-2 max-w-xl text-ink-2">{course.subtitle}</p>

      {enrollment ? (
        <div className="mt-6 max-w-md">
          <Progress value={enrollment.progressPct} />
          <div className="mt-2 flex items-center justify-between">
            <span className="figures text-[12px] text-ink-3">{enrollment.progressPct}% complete</span>
            {nextLesson && (
              <Link
                href={`/academy/${slug}/lesson/${nextLesson.id}`}
                className="text-[13px] font-semibold text-gold hover:underline underline-offset-4"
              >
                Continue: {nextLesson.title} →
              </Link>
            )}
          </div>
        </div>
      ) : (
        <form action={enrollAction.bind(null, slug)} className="mt-6">
          <button type="submit" className="inline-flex h-11 items-center rounded-md bg-gold px-5 text-[14px] font-semibold text-bg-0 hover:bg-gold-bright">
            Enroll — free
          </button>
        </form>
      )}

      <SectionRule label="Curriculum" className="mb-6 mt-10" />
      <div className="flex flex-col gap-4">
        {course.modules.map((m, mi) => (
          <Card key={m.id}>
            <CardContent className="py-5">
              <p className="figures text-[12px] text-gold-deep">{String(mi + 1).padStart(2, "0")}</p>
              <h2 className="display text-[19px]">{m.title}</h2>
              <div className="mt-3 flex flex-col">
                {m.lessons.map((l) => {
                  const done = !!l.progress[0]?.completedAt;
                  return (
                    <Link
                      key={l.id}
                      href={enrollment ? `/academy/${slug}/lesson/${l.id}` : "#"}
                      className={`flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0 ${enrollment ? "hover:text-gold-bright" : "pointer-events-none opacity-60"}`}
                    >
                      <span className="flex items-baseline gap-2.5 text-[14px]">
                        <span className={`figures text-[12px] ${done ? "text-success" : "text-ink-3"}`}>{done ? "✓" : "○"}</span>
                        {l.title}
                      </span>
                      <span className="figures shrink-0 text-[12px] text-ink-3">+{l.xpReward} XP</span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
