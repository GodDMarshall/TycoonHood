import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { marked } from "marked";
import { prisma } from "@tycoonhood/db";
import { learner } from "@tycoonhood/core";
import { Avatar, Badge, Icon, Notice, PillarBadge, buttonStyles } from "@tycoonhood/ui";
import { objectivesOf } from "../../../../lib/learning";
import { getCurrentUser } from "../../../../lib/auth";
import { PILLAR_WORLD } from "../../../../components/pillar-art";
import { CoverFill } from "../../../../components/art/photo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course || course.status !== "PUBLISHED") return { title: "Program" };
  return {
    title: course.title,
    description: course.subtitle ?? course.description.slice(0, 160),
    alternates: { canonical: `/programs/${course.slug}` },
  };
}

const typeLabel = { VIDEO: "Video", READING: "Reading", QUIZ: "Quiz", ASSIGNMENT: "Assignment" } as const;
const typeIcon = { VIDEO: "play", READING: "book", QUIZ: "quiz", ASSIGNMENT: "mission" } as const;

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" } } } },
      prerequisite: true,
      instructor: true,
    },
  });
  // Drafts and archived programmes are never shown publicly.
  if (!course || course.status !== "PUBLISHED") notFound();
  const user = await getCurrentUser();
  const member = !!user?.profile?.onboardedAt;
  // Members study inside the app; the public page is the brochure.
  if (member) redirect(`/courses/${slug}`);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const lessonXp = lessons.reduce((n, l) => n + l.xpReward, 0);
  const checks = lessons.filter((l) => l.type === "QUIZ" && !l.isFinal).length;
  const hasFinal = lessons.some((l) => l.isFinal);
  const minutes = lessons.reduce((n, l) => n + (l.durationSec ? Math.round(l.durationSec / 60) : 0), 0);
  const rating = await learner.rating(course.id);
  // Lesson bodies are public only for preview lessons.
  const previews = new Map<string, string>();
  for (const l of lessons) if (l.isPreview && l.contentMd) previews.set(l.id, await marked.parse(l.contentMd));
  const isFinance = course.pillar === "TYCOON";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    provider: { "@type": "Organization", name: "Tycoonhood" },
    isAccessibleForFree: true,
    ...(course.instructor ? { instructor: { "@type": "Person", name: course.instructor.name } } : {}),
    ...(rating.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, ratingCount: rating.count, bestRating: 5, worstRating: 1 } } : {}),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 opacity-70" aria-hidden>
          <CoverFill pillar={course.pillar} coverImage={course.coverImage} />
        </div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-bg-0)_25%,rgb(10_9_8/0.7)_60%,rgb(10_9_8/0.2))]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg-0 to-transparent" />
        <div className="relative mx-auto max-w-[88rem] px-[var(--gutter)] pb-16 pt-16 md:pb-24 md:pt-28">
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[12.5px] text-ink-3">
            <Link href="/programs" className="hover:text-ink-1">
              Academy
            </Link>
            <Icon name="chevron-right" size={12} />
            <span className="text-ink-2">{PILLAR_WORLD[course.pillar].name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <PillarBadge pillar={course.pillar} />
            {rating.count > 0 && (
              <Badge tone="gold">
                {rating.average?.toFixed(1)} / 5 · {rating.count} review{rating.count === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <h1 className="display mt-5 max-w-[16ch] text-display">{course.title}</h1>
          {course.subtitle && <p className="accent mt-3 text-[clamp(1.4rem,1.1rem+1vw,2rem)]">{course.subtitle}</p>}
          <p className="mt-6 max-w-[60ch] text-lead text-ink-2">{course.description}</p>
          {isFinance && (
            <Notice tone="warning" title="Educational only" className="mt-6 max-w-[60ch]">
              This programme teaches concepts. It is not personalised financial, investment, tax or legal advice, and nothing in it is a recommendation to buy
              or sell anything. Speak to a licensed professional about your own situation.
            </Notice>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href={member ? `/courses/${course.slug}` : "/register"} className={buttonStyles({ size: "lg" })}>
              {member ? "Open in the app" : "Join free to enroll"}
              <Icon name="arrow-right" size={16} />
            </Link>
            <a href="#curriculum" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              See the curriculum
            </a>
          </div>
          {course.prerequisite && (
            <p className="mt-6 text-[13px] text-ink-3">
              Recommended first:{" "}
              <Link
                href={`/programs/${course.prerequisite.slug}`}
                className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold"
              >
                {course.prerequisite.title}
              </Link>
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-[88rem] gap-12 px-[var(--gutter)] py-16 lg:grid-cols-[1fr_340px]">
        <section id="curriculum" aria-labelledby="curriculum-title" className="scroll-mt-24">
          <h2 id="curriculum-title" className="eyebrow mb-6">
            Curriculum
          </h2>
          <ol className="flex flex-col gap-4">
            {course.modules.map((m, mi) => (
              <li key={m.id} data-reveal className="rounded-lg border border-line bg-bg-1">
                <div className="flex items-start gap-5 border-b border-line p-6">
                  <span className="figures text-[13px] text-gold">{String(mi + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="display text-[21px]">{m.title}</h3>
                    {m.description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{m.description}</p>}
                    {objectivesOf(m.objectives).length > 0 && (
                      <ul className="mt-3 list-disc space-y-0.5 pl-5 text-[13.5px] leading-relaxed text-ink-2">
                        {objectivesOf(m.objectives).map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    )}
                    {m.completion && <p className="mt-2 text-[12.5px] text-ink-3">To complete: {m.completion}</p>}
                  </div>
                </div>
                <ul>
                  {m.lessons.map((l) => {
                    const row = (
                      <>
                        <Icon name={typeIcon[l.type]} size={16} className="text-ink-3" />
                        <span className="flex-1 text-[14.5px]">
                          {l.title}
                          {l.isPreview && (
                            <Badge tone="mind" className="ml-3">
                              Preview
                            </Badge>
                          )}
                        </span>
                        <span className="figures hidden text-[11.5px] text-ink-3 sm:inline">
                          {l.isFinal ? "Final assessment" : typeLabel[l.type]}
                          {l.durationSec ? ` · ${Math.round(l.durationSec / 60)} min` : ""}
                        </span>
                        <span className="figures w-16 text-right text-[12px] text-gold">+{l.xpReward} XP</span>
                      </>
                    );
                    const body = previews.get(l.id);
                    return (
                      <li key={l.id} className="border-b border-line last:border-0">
                        {body ? (
                          <details className="group">
                            <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-3.5 hover:bg-bg-2">{row}</summary>
                            <div className="md-content border-t border-line px-6 py-6" dangerouslySetInnerHTML={{ __html: body }} />
                          </details>
                        ) : (
                          <div className="flex items-center gap-4 px-6 py-3.5">{row}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-gold-deep/60 bg-bg-2 p-6 shadow-[var(--shadow-gold)]">
            <p className="eyebrow">What completion pays</p>
            <dl className="mt-5 flex flex-col divide-y divide-line">
              {[
                ["Modules", `${course.modules.length}`],
                ["Lessons", `${lessons.length}`],
                ["Knowledge checks", `${checks}`],
                ...(minutes ? [["Estimated time", minutes >= 60 ? `${Math.round(minutes / 60)} h` : `${minutes} min`]] : []),
                ["Final assessment", hasFinal ? "Yes" : "In preparation"],
                ["XP across lessons", `+${lessonXp.toLocaleString("en-US")}`],
                ["XP on completion", `+${course.xpOnCompletion.toLocaleString("en-US")}`],
                ["Certificate", hasFinal ? "Public serial" : "—"],
                ["Rating", rating.count > 0 ? `${rating.average?.toFixed(1)} / 5 (${rating.count})` : "No reviews yet"],
                ["Cost", "Free"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between py-3">
                  <dt className="text-[13px] text-ink-2">{k}</dt>
                  <dd className="figures text-[14px]">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href={member ? `/courses/${course.slug}` : "/register"} className={buttonStyles({ className: "mt-5 w-full" })}>
              {member ? "Go to the program" : "Join free"}
            </Link>
            <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
              Progress, quizzes and certificates are tracked in your Academy. Education, not advice.
            </p>
          </div>
          {course.instructor && (
            <Link
              href={`/instructors/${course.instructor.slug}`}
              className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-bg-1 p-4 transition-colors hover:border-line-strong"
            >
              <Avatar name={course.instructor.name} src={course.instructor.avatar} size={48} />
              <span className="min-w-0">
                <span className="block text-[12px] text-ink-3">Instructor</span>
                <span className="block text-[15px] font-medium text-ink-1">{course.instructor.name}</span>
                {course.instructor.headline && <span className="block text-[12.5px] text-ink-2">{course.instructor.headline}</span>}
              </span>
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
