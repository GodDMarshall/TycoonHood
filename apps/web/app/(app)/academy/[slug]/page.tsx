import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lms } from "@tycoonhood/core";
import { Badge, Icon, PillarBadge, Progress, buttonStyles, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { enrollAction } from "../actions";
import { PILLAR_WORLD, PillarArt } from "../../../../components/pillar-art";
import { SubmitButton } from "../../../../components/submit-button";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Academy · ${slug}` };
}

export default async function CourseHome({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const view = await lms.memberCourseView(user.id, slug);
  if (!view || view.course.status !== "PUBLISHED") notFound();
  const { course, enrollment, certificate } = view;

  const lessons = course.modules.flatMap((m) => m.lessons);
  const nextLesson = lessons.find((l) => !l.progress[0]?.completedAt);
  const doneCount = lessons.filter((l) => l.progress[0]?.completedAt).length;
  const tone = course.pillar === "TYCOON" ? "gold" : (course.pillar.toLowerCase() as "warrior" | "builder" | "mind");

  return (
    <main>
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[12.5px] text-ink-3">
        <Link href="/academy" className="hover:text-ink-1">
          Academy
        </Link>
        <Icon name="chevron-right" size={12} />
        <span className="text-ink-2">{course.title}</span>
      </nav>

      <header className="relative overflow-hidden rounded-lg border border-line">
        <div className="absolute inset-0 opacity-60" aria-hidden>
          <PillarArt pillar={course.pillar} />
        </div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-bg-1)_35%,rgb(16_15_13/0.55))]" />
        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <PillarBadge pillar={course.pillar} />
              {certificate && (
                <Link href={`/verify/${certificate.serial}`}>
                  <Badge tone="gold">
                    <Icon name="seal" size={12} /> Certificate {certificate.serial}
                  </Badge>
                </Link>
              )}
            </div>
            <h1 className="display mt-4 text-h1">{course.title}</h1>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">{course.subtitle}</p>
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">{PILLAR_WORLD[course.pillar].line}</p>
          </div>
          <div className="rounded-md border border-line-strong bg-bg-0/70 p-5 backdrop-blur-sm">
            {enrollment ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">Progress</span>
                  <span className="figures text-[13px]">
                    {doneCount}/{lessons.length} · {enrollment.progressPct}%
                  </span>
                </div>
                <Progress value={enrollment.progressPct} tone={tone} label={`${course.title} progress`} className="mt-3" />
                {nextLesson ? (
                  <>
                    <p className="mt-5 text-[13px] text-ink-3">
                      Up next: <span className="text-ink-1">{nextLesson.title}</span>
                    </p>
                    <Link href={`/academy/${slug}/lesson/${nextLesson.id}`} className={buttonStyles({ className: "mt-3 w-full" })}>
                      Continue <Icon name="arrow-right" size={15} />
                    </Link>
                  </>
                ) : (
                  <p className="mt-5 flex items-center gap-2 text-[13.5px] text-success">
                    <Icon name="check" size={16} /> Every lesson complete.
                  </p>
                )}
              </>
            ) : (
              <form action={enrollAction.bind(null, slug)} className="flex flex-col gap-3">
                <p className="text-[13.5px] text-ink-2">
                  {lessons.length} lessons · +{course.xpOnCompletion} XP on completion
                </p>
                <SubmitButton size="lg" className="w-full" pendingLabel="Enrolling">
                  Enroll — free
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </header>

      <h2 className="eyebrow mb-5 mt-12">Curriculum</h2>
      <ol className="flex flex-col gap-4">
        {course.modules.map((m, mi) => {
          const modDone = m.lessons.filter((l) => l.progress[0]?.completedAt).length;
          return (
            <li key={m.id} className="rounded-lg border border-line bg-bg-1">
              <div className="flex items-center gap-5 border-b border-line px-6 py-5">
                <span className="figures text-[13px] text-gold">{String(mi + 1).padStart(2, "0")}</span>
                <h3 className="display flex-1 text-[19px]">{m.title}</h3>
                <span className="figures text-[11.5px] text-ink-3">
                  {modDone}/{m.lessons.length}
                </span>
              </div>
              <ul>
                {m.lessons.map((l) => {
                  const done = !!l.progress[0]?.completedAt;
                  const isNext = l.id === nextLesson?.id;
                  const row = (
                    <>
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-sm border",
                          done ? "border-success/50 text-success" : isNext ? "border-gold text-gold" : "border-line-strong text-ink-3"
                        )}
                      >
                        {done ? <Icon name="check" size={13} /> : isNext ? <Icon name="play" size={10} /> : null}
                      </span>
                      <span className={cn("flex-1 text-[14.5px]", done ? "text-ink-2" : "text-ink-1")}>
                        {l.title}
                        {isNext && <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Up next</span>}
                      </span>
                      <span className="figures text-[12px] text-ink-3">+{l.xpReward} XP</span>
                    </>
                  );
                  return (
                    <li key={l.id} className="border-b border-line last:border-0">
                      {enrollment ? (
                        <Link href={`/academy/${slug}/lesson/${l.id}`} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-bg-2">
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-4 px-6 py-3.5 opacity-70" aria-disabled>
                          {row}
                          <Icon name="lock" size={14} className="text-ink-3" />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
