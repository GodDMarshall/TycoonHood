import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { marked } from "marked";
import { lms } from "@tycoonhood/core";
import { Badge, Icon, Progress, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../../../../lib/guard";
import { completeLessonAction, submitQuizAction } from "../../../actions";
import { QuizForm } from "../../../../../../components/quiz-form";
import { SubmitButton } from "../../../../../../components/submit-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lesson" };

const TYPE = { VIDEO: "Video", READING: "Reading", QUIZ: "Knowledge check", ASSIGNMENT: "Assignment" } as const;

/**
 * The lesson room. Reading comes first on every device: on a phone the
 * course outline folds into a disclosure instead of standing between the
 * member and the lesson (spec §13).
 */
export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const user = await requireUser();
  const { slug, lessonId } = await params;
  const view = await lms.memberCourseView(user.id, slug);
  if (!view) notFound();
  if (!view.enrollment) redirect(`/academy/${slug}`);

  const lessons = view.course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const idx = lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) notFound();
  const lesson = lessons[idx];
  const prev = lessons[idx - 1] ?? null;
  const next = lessons[idx + 1] ?? null;
  const done = !!lesson.progress[0]?.completedAt;
  const doneCount = lessons.filter((l) => l.progress[0]?.completedAt).length;
  const html = lesson.contentMd ? await marked.parse(lesson.contentMd) : "";

  const outline = (
    <div className="flex flex-col gap-5">
      {view.course.modules.map((m, mi) => (
        <div key={m.id}>
          <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
            <span className="text-gold">{String(mi + 1).padStart(2, "0")}</span> {m.title}
          </p>
          <ul className="flex flex-col">
            {m.lessons.map((l) => {
              const lDone = !!l.progress[0]?.completedAt;
              const active = l.id === lessonId;
              return (
                <li key={l.id}>
                  <Link
                    href={`/academy/${slug}/lesson/${l.id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-start gap-2.5 rounded-sm border-l px-3 py-2 text-[13.5px] leading-snug transition-colors",
                      active ? "border-gold bg-gold/[0.07] text-gold-bright" : "border-line text-ink-2 hover:border-line-strong hover:text-ink-1"
                    )}
                  >
                    <Icon name={lDone ? "check" : "chevron-right"} size={13} className={cn("mt-[3px]", lDone ? "text-success" : "text-ink-3")} />
                    {l.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-16">
      <aside className="max-lg:order-2 lg:sticky lg:top-24 lg:self-start">
        <Link href={`/academy/${slug}`} className="mb-5 flex items-center gap-2 text-[12.5px] text-ink-3 hover:text-ink-1">
          <Icon name="arrow-left" size={13} /> {view.course.title}
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <Progress value={view.enrollment.progressPct} label="Program progress" className="flex-1" />
          <span className="figures text-[11.5px] text-ink-3">
            {doneCount}/{lessons.length}
          </span>
        </div>
        <details className="group rounded-md border border-line bg-bg-1 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13.5px]">
            Course outline
            <Icon name="chevron-down" size={15} className="text-ink-3 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line p-4">{outline}</div>
        </details>
        <div className="hidden lg:block">{outline}</div>
      </aside>

      <main className="min-w-0 max-lg:order-1">
        <article className="max-w-[var(--measure)]">
          <p className="flex flex-wrap items-center gap-2">
            <Badge>{TYPE[lesson.type]}</Badge>
            {done && (
              <Badge tone="success">
                <Icon name="check" size={11} /> Completed
              </Badge>
            )}
            <span className="figures text-[12px] text-gold">+{lesson.xpReward} XP</span>
            <span className="text-[12px] text-ink-3">· {lesson.moduleTitle}</span>
          </p>
          <h1 className="display mt-5 text-h1">{lesson.title}</h1>
          <div className="my-8 h-px bg-gradient-to-r from-line-strong to-transparent" />
          {html && <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />}
        </article>

        <div className="mt-10 max-w-[var(--measure)]">
          {lesson.quiz ? (
            <QuizForm
              completed={done}
              action={submitQuizAction.bind(null, {
                quizId: lesson.quiz.id,
                slug,
                lessonId,
                questionCount: lesson.quiz.questions.length,
              })}
              questions={lesson.quiz.questions.map((q) => ({ prompt: q.prompt, options: q.options as string[] }))}
            />
          ) : done ? (
            <p className="flex items-center gap-2 text-[14px] text-success">
              <Icon name="check" size={16} /> Lesson complete — XP is on your record.
            </p>
          ) : (
            <form action={completeLessonAction.bind(null, slug, lessonId)} className="flex flex-wrap items-center gap-4 rounded-lg border border-line-strong bg-bg-1 p-5">
              <SubmitButton size="lg" pendingLabel="Recording">
                <Icon name="check" size={16} />
                {lesson.type === "ASSIGNMENT" ? "I've done the work — mark complete" : "Mark complete"}
              </SubmitButton>
              <span className="text-[13px] text-ink-3">Pays +{lesson.xpReward} XP, once.</span>
            </form>
          )}
        </div>

        <nav aria-label="Lesson navigation" className="mt-12 grid max-w-[var(--measure)] gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={`/academy/${slug}/lesson/${prev.id}`} className="group flex flex-col gap-1 rounded-md border border-line p-4 hover:border-line-strong">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                <Icon name="arrow-left" size={12} /> Previous
              </span>
              <span className="text-[14px] text-ink-2 group-hover:text-ink-1">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/academy/${slug}/lesson/${next.id}`} className="group flex flex-col items-end gap-1 rounded-md border border-line p-4 text-right hover:border-gold-deep">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                Next <Icon name="arrow-right" size={12} />
              </span>
              <span className="text-[14px] text-ink-1">{next.title}</span>
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}
