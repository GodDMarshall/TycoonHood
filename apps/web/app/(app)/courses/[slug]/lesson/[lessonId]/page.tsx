import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { prisma } from "@tycoonhood/db";
import { community } from "@tycoonhood/core";
import { Avatar, Badge, Icon, Progress, buttonStyles, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../../../../lib/guard";
import { courseDetail, LESSON_TYPE } from "../../../../../../lib/learning";
import { extractVideoId } from "../../../../../../lib/youtube";
import { askAboutLessonAction, completeLessonAction, submitQuizAction } from "../../../actions";
import { QuizForm } from "../../../../../../components/quiz-form";
import { SubmitButton } from "../../../../../../components/submit-button";
import { AskQuestion } from "../../../../../../components/learning/ask-question";
import { Panel } from "../../../../../../components/app/page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  const l = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  return { title: l?.title ?? "Lesson" };
}

const since = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/**
 * The lesson. Reading comes first on every device. A locked lesson says
 * exactly which lesson opens it; a preview lesson is readable before
 * enrolling but completes only in order, after enrolling.
 */
export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const user = await requireUser();
  const { slug, lessonId } = await params;
  const d = await courseDetail(user.id, slug);
  if (!d) notFound();
  const idx = d.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) notFound();
  const lesson = d.lessons[idx];
  const enrolled = !!d.enrollment;
  const state = lesson.gate.state;

  // Not readable: locked behind an earlier lesson, or not enrolled (and not a preview).
  if ((enrolled && state === "locked") || (!enrolled && !lesson.isPreview)) {
    return (
      <div className="mx-auto max-w-[620px] px-4 py-16 text-center sm:px-6">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-line-strong text-ink-3">
          <Icon name="lock" size={20} />
        </span>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.02em]">{lesson.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {enrolled && lesson.gate.blockedBy ? (
            <>This lesson opens when you finish “{lesson.gate.blockedBy.title}”. Each lesson builds on the one before it.</>
          ) : (
            <>Enroll in {d.course.title} to open this lesson. It&rsquo;s free.</>
          )}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {enrolled && lesson.gate.blockedBy ? (
            <Link href={`/courses/${slug}/lesson/${lesson.gate.blockedBy.id}`} className={buttonStyles()}>
              Go to that lesson <Icon name="arrow-right" size={15} />
            </Link>
          ) : (
            <Link href={`/courses/${slug}`} className={buttonStyles()}>
              View the program
            </Link>
          )}
        </div>
      </div>
    );
  }

  const full = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } }, resources: true },
  });
  const html = full.contentMd ? await marked.parse(full.contentMd) : "";
  const videoId = full.videoUrl ? extractVideoId(full.videoUrl) : null;
  const done = state === "done";
  const prev = d.lessons[idx - 1] ?? null;
  const next = d.lessons[idx + 1] ?? null;
  const nextOpen = next && (next.gate.state !== "locked" || (!enrolled && next.isPreview));
  const viewer = { id: user.id, role: user.role };
  const questions = enrolled ? await community.lessonQuestions(viewer, lessonId, 5) : [];
  const questionsChannel = d.channels.find((c) => c.kind === "QUESTIONS");

  const outline = (
    <ol className="flex flex-col gap-4">
      {d.modules.map((m, mi) => (
        <li key={m.id}>
          <p className="mb-1.5 px-2 text-[12.5px] font-medium text-ink-3">
            Module {mi + 1} · {m.title}
          </p>
          <ul className="flex flex-col">
            {m.lessons.map((l) => {
              const active = l.id === lessonId;
              const reachable = enrolled ? l.gate.state !== "locked" : l.isPreview;
              const icon = l.gate.state === "done" ? "check" : reachable ? "play" : "lock";
              const cls = cn(
                "flex items-start gap-2.5 rounded-md px-2 py-2 text-[13.5px] leading-snug",
                active ? "bg-bg-3 text-ink-1" : reachable ? "text-ink-2 hover:bg-bg-2 hover:text-ink-1" : "text-ink-3"
              );
              const body = (
                <>
                  <Icon name={icon} size={13} className={cn("mt-[3px]", l.gate.state === "done" ? "text-success" : active ? "text-gold" : "text-ink-3")} />
                  <span>{l.title}</span>
                </>
              );
              return (
                <li key={l.id}>
                  {reachable ? (
                    <Link href={`/courses/${slug}/lesson/${l.id}`} aria-current={active ? "page" : undefined} className={cls}>
                      {body}
                    </Link>
                  ) : (
                    <span className={cls}>{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px] text-ink-3">
        <Link href="/courses" className="hover:text-ink-1">
          Courses
        </Link>
        <Icon name="chevron-right" size={12} />
        <Link href={`/courses/${slug}`} className="truncate hover:text-ink-1">
          {d.course.title}
        </Link>
      </nav>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0 max-w-[740px]">
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
            <span>
              Lesson {idx + 1} of {d.total}
            </span>
            <span aria-hidden>·</span>
            <span>{lesson.moduleTitle}</span>
            <span aria-hidden>·</span>
            <span>
              {LESSON_TYPE[lesson.type]}
              {lesson.minutes ? `, ${lesson.minutes} min` : ""}
            </span>
            {done && (
              <Badge tone="success">
                <Icon name="check" size={11} /> Complete
              </Badge>
            )}
            {!enrolled && <Badge tone="neutral">Free preview</Badge>}
          </p>
          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{lesson.title}</h1>

          {videoId && (
            <div className="mt-6 aspect-video overflow-hidden rounded-lg border border-line bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                title={lesson.title}
                className="size-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}

          {html && <div className="md-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />}

          {full.resources.length > 0 && (
            <Panel className="mt-8 p-5">
              <h2 className="text-[15px] font-semibold">Resources</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {full.resources.map((r) => (
                  <li key={r.id}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[14px] text-gold underline-offset-4 hover:underline">
                      <Icon name="external" size={14} /> {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Completing the lesson. */}
          <div className="mt-10">
            {!enrolled ? (
              <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
                <p className="text-[14.5px] text-ink-2">Enroll to keep going. Progress counts from your first lesson.</p>
                <Link href={`/courses/${slug}`} className={buttonStyles()}>
                  Enroll — free
                </Link>
              </Panel>
            ) : full.quiz ? (
              <QuizForm
                completed={done}
                action={submitQuizAction.bind(null, { quizId: full.quiz.id, slug, lessonId, questionCount: full.quiz.questions.length })}
                questions={full.quiz.questions.map((q) => ({ prompt: q.prompt, options: q.options as string[] }))}
              />
            ) : done ? (
              <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
                <p className="flex items-center gap-2 text-[14.5px] text-success">
                  <Icon name="check" size={16} /> You completed this lesson.
                </p>
                {next && nextOpen && (
                  <Link href={`/courses/${slug}/lesson/${next.id}`} className={buttonStyles()}>
                    Next lesson <Icon name="arrow-right" size={15} />
                  </Link>
                )}
              </Panel>
            ) : (
              <form action={completeLessonAction.bind(null, slug, lessonId)}>
                <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <p className="text-[14.5px] text-ink-2">
                    {lesson.type === "ASSIGNMENT" ? "Done the assignment? Mark it complete to open the next lesson." : "Finished reading? Mark it complete to open the next lesson."}
                  </p>
                  <SubmitButton pendingLabel="Saving">
                    <Icon name="check" size={16} /> {next ? "Complete and continue" : "Complete the program"}
                  </SubmitButton>
                </Panel>
              </form>
            )}
          </div>

          {/* Questions about this lesson. */}
          {enrolled && questionsChannel && (
            <section aria-labelledby="questions" className="mt-12 border-t border-line pt-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="questions" className="text-[16px] font-semibold">
                  Questions about this lesson
                </h2>
                <Link href={`/community/${questionsChannel.slug}`} className="text-[13px] text-ink-3 hover:text-ink-1">
                  All questions
                </Link>
              </div>
              {questions.length > 0 && (
                <ul className="mb-6 flex flex-col gap-3">
                  {questions.map((q) => (
                    <li key={q.id}>
                      <Link href={`/community/${q.channelSlug}#m-${q.id}`} className="flex gap-3 rounded-md border border-line bg-bg-1 p-3.5 hover:border-line-strong">
                        <Avatar name={q.author.name} src={q.author.avatarUrl} size={28} />
                        <span className="min-w-0">
                          <span className="block text-[13px] text-ink-3">
                            {q.author.name} · {since(q.createdAt)}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[14.5px] text-ink-1">{q.body}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <AskQuestion action={askAboutLessonAction.bind(null, slug, lessonId)} />
            </section>
          )}

          <nav aria-label="Lesson navigation" className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            {prev ? (
              <Link href={`/courses/${slug}/lesson/${prev.id}`} className="group flex flex-col gap-1 rounded-md border border-line p-4 hover:border-line-strong">
                <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                  <Icon name="arrow-left" size={12} /> Previous
                </span>
                <span className="text-[14px] text-ink-2 group-hover:text-ink-1">{prev.title}</span>
              </Link>
            ) : (
              <span className="max-sm:hidden" />
            )}
            {next &&
              (nextOpen ? (
                <Link href={`/courses/${slug}/lesson/${next.id}`} className="group flex flex-col items-end gap-1 rounded-md border border-line p-4 text-right hover:border-gold-deep">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-gold">
                    Next <Icon name="arrow-right" size={12} />
                  </span>
                  <span className="text-[14px] text-ink-1">{next.title}</span>
                </Link>
              ) : (
                <span className="flex flex-col items-end gap-1 rounded-md border border-dashed border-line p-4 text-right">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                    <Icon name="lock" size={12} /> Next
                  </span>
                  <span className="text-[14px] text-ink-3">{next.title}</span>
                </span>
              ))}
          </nav>
        </article>

        <aside className="max-xl:order-first xl:sticky xl:top-6 xl:self-start">
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-3 px-2">
              <Progress value={d.pct} label="Program progress" className="flex-1" />
              <span className="text-[12.5px] tabular-nums text-ink-3">
                {d.done}/{d.total}
              </span>
            </div>
            <details className="group xl:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-2 text-[14px] font-medium hover:bg-bg-2">
                Course outline
                <Icon name="chevron-down" size={15} className="text-ink-3 transition-transform group-open:rotate-180" />
              </summary>
              <div className="pt-2">{outline}</div>
            </details>
            <div className="hidden xl:block">{outline}</div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
