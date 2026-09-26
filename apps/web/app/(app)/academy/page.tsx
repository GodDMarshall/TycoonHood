import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Badge, Icon, PillarBadge, Progress, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { enrollAction } from "./actions";
import { RoomHeader } from "../../../components/room-header";
import { PILLAR_WORLD, PillarArt } from "../../../components/pillar-art";
import { SubmitButton } from "../../../components/submit-button";

export const metadata: Metadata = { title: "Academy" };
export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const user = await requireUser();
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    include: {
      modules: { include: { lessons: { select: { id: true } } } },
      enrollments: { where: { userId: user.id } },
      certificates: { where: { userId: user.id } },
    },
  });
  const enrolled = courses.filter((c) => c.enrollments[0]).length;

  return (
    <main>
      <RoomHeader
        compact
        icon="academy"
        room="The Academy"
        title="Your programs."
        lead={
          enrolled
            ? `Enrolled in ${enrolled} of ${courses.length}. Every lesson you finish pays XP; every program you finish issues a certificate with a public serial.`
            : "Enrolling is free. Pick the pillar where you are weakest — that is where the compounding starts."
        }
      />
      <div className="grid gap-6 md:grid-cols-2">
        {courses.map((c) => {
          const enrollment = c.enrollments[0];
          const certificate = c.certificates[0];
          const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0);
          const tone = c.pillar === "TYCOON" ? "gold" : (c.pillar.toLowerCase() as "warrior" | "builder" | "mind");
          return (
            <article key={c.id} className="flex flex-col overflow-hidden rounded-lg border border-line bg-bg-1">
              <div className="relative aspect-[3/1] overflow-hidden border-b border-line">
                <PillarArt pillar={c.pillar} />
                <span className="absolute left-5 top-5 flex gap-2">
                  <PillarBadge pillar={c.pillar} />
                  {certificate ? (
                    <Badge tone="gold">
                      <Icon name="seal" size={12} /> Certified
                    </Badge>
                  ) : enrollment?.status === "COMPLETED" ? (
                    <Badge tone="success">Completed</Badge>
                  ) : enrollment ? (
                    <Badge tone="success">Enrolled</Badge>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">{PILLAR_WORLD[c.pillar].line}</p>
                <h2 className="display text-[23px] leading-tight">{c.title}</h2>
                <p className="text-[14px] leading-relaxed text-ink-2">{c.subtitle}</p>
                <div className="mt-auto pt-4">
                  {enrollment ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Progress value={enrollment.progressPct} tone={tone} label={`${c.title} progress`} className="flex-1" />
                        <span className="figures text-[12px] text-ink-2">{enrollment.progressPct}%</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="figures text-[11.5px] text-ink-3">{lessonCount} lessons</span>
                        <Link href={`/academy/${c.slug}`} className={buttonStyles({ size: "sm", variant: enrollment.status === "COMPLETED" ? "secondary" : "primary" })}>
                          {enrollment.status === "COMPLETED" ? "Review" : "Continue"}
                          <Icon name="arrow-right" size={14} />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between border-t border-line pt-4">
                      <span className="figures text-[11.5px] text-ink-3">
                        {lessonCount} lessons · +{c.xpOnCompletion} XP
                      </span>
                      <form action={enrollAction.bind(null, c.slug)}>
                        <SubmitButton size="sm" pendingLabel="Enrolling">
                          Enroll — free
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
