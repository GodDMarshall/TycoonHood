import type { Metadata } from "next";
import { requireUser } from "../../../lib/guard";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Badge, Card, CardContent, PillarBadge, Progress } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";
import { enrollAction } from "./actions";

export const metadata: Metadata = { title: "Academy" };
export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  await requireUser();
  const user = (await getCurrentUser())!;
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    include: {
      modules: { include: { lessons: { select: { id: true } } } },
      enrollments: { where: { userId: user.id } },
      certificates: { where: { userId: user.id } },
    },
  });

  return (
    <main>
      <p className="eyebrow mb-2">Academy</p>
      <h1 className="display text-[34px]">Your programs.</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {courses.map((c) => {
          const enrollment = c.enrollments[0];
          const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0);
          return (
            <Card key={c.id} variant={enrollment ? "raised" : "default"}>
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-center justify-between">
                  <PillarBadge pillar={c.pillar} />
                  {c.certificates[0] ? (
                    <Badge tone="gold">Certified</Badge>
                  ) : enrollment?.status === "COMPLETED" ? (
                    <Badge tone="success">Completed</Badge>
                  ) : enrollment ? (
                    <Badge tone="success">Enrolled</Badge>
                  ) : null}
                </div>
                <h2 className="display text-[22px]">{c.title}</h2>
                <p className="text-[13px] text-ink-2">{c.subtitle}</p>
                {enrollment ? (
                  <>
                    <Progress value={enrollment.progressPct} />
                    <div className="flex items-center justify-between">
                      <span className="figures text-[12px] text-ink-3">
                        {enrollment.progressPct}% · {lessonCount} lessons
                      </span>
                      <Link
                        href={`/academy/${c.slug}`}
                        className="text-[13px] font-semibold text-gold hover:underline underline-offset-4"
                      >
                        {enrollment.status === "COMPLETED" ? "Review →" : "Continue →"}
                      </Link>
                    </div>
                  </>
                ) : (
                  <form action={enrollAction.bind(null, c.slug)}>
                    <button
                      type="submit"
                      className="mt-1 inline-flex h-10 items-center rounded-md bg-gold px-4 text-[14px] font-semibold text-bg-0 hover:bg-gold-bright"
                    >
                      Enroll — free
                    </button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
