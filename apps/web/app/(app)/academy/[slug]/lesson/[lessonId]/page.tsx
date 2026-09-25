import type { Metadata } from "next";
import { requireUser } from "../../../../../../lib/guard";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { marked } from "marked";
import { lms } from "@tycoonhood/core";
import { Badge, Button, Card, CardContent, SectionRule } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../../../../lib/auth";
import { completeLessonAction, submitQuizAction } from "../../../actions";
import { QuizForm } from "../../../../../../components/quiz-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  await requireUser();
  const { slug, lessonId } = await params;
  const user = (await getCurrentUser())!;
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
  const html = lesson.contentMd ? await marked.parse(lesson.contentMd) : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Link href={`/academy/${slug}`} className="text-[12px] text-ink-3 hover:text-ink-1">
          ← {view.course.title}
        </Link>
        <div className="mt-4 flex flex-col gap-4">
          {view.course.modules.map((m) => (
            <div key={m.id}>
              <p className="eyebrow mb-2 text-[10px]">{m.title}</p>
              <div className="flex flex-col">
                {m.lessons.map((l) => {
                  const lDone = !!l.progress[0]?.completedAt;
                  const active = l.id === lessonId;
                  return (
                    <Link
                      key={l.id}
                      href={`/academy/${slug}/lesson/${l.id}`}
                      className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 text-[13px] ${
                        active ? "bg-gold/10 text-gold-bright" : "text-ink-2 hover:text-ink-1"
                      }`}
                    >
                      <span className={`figures text-[11px] ${lDone ? "text-success" : "text-ink-3"}`}>
                        {lDone ? "✓" : "○"}
                      </span>
                      {l.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Lesson body */}
      <main className="min-w-0 max-w-2xl">
        <div className="flex items-center gap-3">
          <Badge>{lesson.type}</Badge>
          {done && <Badge tone="success">Completed</Badge>}
          <span className="figures text-[12px] text-ink-3">+{lesson.xpReward} XP</span>
        </div>
        <h1 className="display mt-3 text-[32px] leading-tight">{lesson.title}</h1>
        <SectionRule className="my-6" />

        {html && <article className="md-content" dangerouslySetInnerHTML={{ __html: html }} />}

        {lesson.quiz ? (
          <div className="mt-8">
            {done ? (
              <Card variant="gold">
                <CardContent className="py-4 text-[14px] text-ink-1">
                  Quiz passed — this lesson is complete. Retakes welcome, results stand.
                </CardContent>
              </Card>
            ) : (
              <QuizForm
                action={submitQuizAction.bind(null, {
                  quizId: lesson.quiz.id,
                  slug,
                  lessonId,
                  questionCount: lesson.quiz.questions.length,
                })}
                questions={lesson.quiz.questions.map((q) => ({
                  prompt: q.prompt,
                  options: q.options as string[],
                }))}
              />
            )}
          </div>
        ) : (
          !done && (
            <form action={completeLessonAction.bind(null, slug, lessonId)} className="mt-8">
              <Button type="submit" size="lg">
                {lesson.type === "ASSIGNMENT" ? "I've done the work — mark complete" : "Mark complete"}
              </Button>
            </form>
          )
        )}

        <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
          {prev ? (
            <Link href={`/academy/${slug}/lesson/${prev.id}`} className="text-[13px] text-ink-2 hover:text-ink-1">
              ← {prev.title}
            </Link>
          ) : <span />}
          {next && (
            <Link href={`/academy/${slug}/lesson/${next.id}`} className="text-[13px] text-gold hover:underline underline-offset-4">
              {next.title} →
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
