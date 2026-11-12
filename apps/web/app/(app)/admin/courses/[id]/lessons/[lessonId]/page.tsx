import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { authoring, liveCourseBlock } from "@tycoonhood/core";
import { Badge, Icon, Input, Label, Notice, Select } from "@tycoonhood/ui";
import { requirePermission } from "../../../../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../../../../components/app/page";
import { ActionForm } from "../../../../../../../components/admin/action-form";
import { InlineAction } from "../../../../../../../components/learning/admin/inline-action";
import { MarkdownField } from "../../../../../../../components/learning/admin/markdown-field";
import { QuizEditor } from "../../../../../../../components/learning/admin/quiz-editor";
import { ResourceFields } from "../../../../../../../components/learning/admin/resource-fields";
import { LessonVideo } from "../../../../../../../components/learning/lesson-video";
import { addResourceAction, deleteLessonAction, deleteResourceAction, saveQuizAction, updateLessonAction } from "../../../actions";

export const metadata: Metadata = { title: "Admin · Edit lesson" };
export const dynamic = "force-dynamic";

export default async function AdminLessonEdit({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const user = await requirePermission("courses.author");
  const { id, lessonId } = await params;
  // A program someone else teaches does not exist here (DR-34); the lesson must belong to this one.
  if (!(await authoring.canEditCourse(user, id))) notFound();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { select: { id: true, courseId: true, title: true, course: { select: { title: true, status: true } } } },
      quiz: { include: { questions: { orderBy: { sortOrder: "asc" } }, _count: { select: { attempts: true } } } },
      resources: { orderBy: { title: "asc" } },
      _count: { select: { progress: true } },
    },
  });
  if (!lesson || lesson.module.courseId !== id) notFound();
  const modules = await prisma.courseModule.findMany({ where: { courseId: id }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true } });
  const minutes = lesson.durationSec ? Math.round(lesson.durationSec / 60) : "";
  // Its instructor opens a lesson of a published or archived program, but only an administrator changes it (DR-34).
  const live = liveCourseBlock(user, lesson.module.course.status);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Link href={`/admin/courses/${id}`} className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink-1">
          <Icon name="arrow-left" size={13} /> {lesson.module.course.title}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{lesson.title}</h2>
          {lesson.isFinal && <Badge tone="gold">Final assessment</Badge>}
          {lesson.isPreview && <Badge tone="mind">Preview</Badge>}
          <span className="text-[13px] text-ink-3">
            {lesson.module.title} · {lesson._count.progress} member progress
          </span>
        </div>
        {live && (
          <Notice tone="info" title="Changes go through an administrator">
            {live}
          </Notice>
        )}
      </header>

      <section aria-labelledby="lesson">
        <SectionTitle id="lesson">Lesson</SectionTitle>
        <Panel className="p-5">
          <ActionForm action={updateLessonAction.bind(null, id, lesson.id)} submit="Save lesson">
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-title">Title</Label>
                <Input id="l-title" name="title" required maxLength={160} defaultValue={lesson.title} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-type">Type</Label>
                <Select id="l-type" name="type" defaultValue={lesson.type}>
                  <option value="READING">Reading</option>
                  <option value="VIDEO">Video</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="QUIZ">Knowledge check (quiz)</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-module">Module</Label>
                <Select id="l-module" name="moduleId" defaultValue={lesson.moduleId}>
                  {modules.map((m, i) => (
                    <option key={m.id} value={m.id}>
                      {i + 1}. {m.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-min">Minutes</Label>
                <Input id="l-min" name="minutes" type="number" min={0} max={600} defaultValue={minutes} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-xp">XP</Label>
                <Input id="l-xp" name="xpReward" type="number" min={0} max={1000} defaultValue={lesson.xpReward} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-video">Video URL (YouTube or Vimeo embed; any other https link is shown as a link)</Label>
              <Input id="l-video" name="videoUrl" maxLength={2000} defaultValue={lesson.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" />
            </div>
            <div className="flex flex-wrap gap-6 text-[14px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isPreview" defaultChecked={lesson.isPreview} className="size-4 accent-[var(--color-gold)]" />
                Free preview (readable before enrolling)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isFinal" defaultChecked={lesson.isFinal} className="size-4 accent-[var(--color-gold)]" />
                Final assessment (quiz only; required for the certificate)
              </label>
            </div>
            <MarkdownField name="contentMd" defaultValue={lesson.contentMd} />
          </ActionForm>
          {lesson.videoUrl && (
            <div className="mt-6 max-w-xl">
              <p className="text-[12.5px] text-ink-3">Video as members see it</p>
              <LessonVideo url={lesson.videoUrl} title={lesson.title} />
            </div>
          )}
        </Panel>
      </section>

      {(lesson.type === "QUIZ" || lesson.quiz) && (
        <section aria-labelledby="quiz">
          <SectionTitle id="quiz">Knowledge check</SectionTitle>
          <Panel className="p-5">
            {lesson.quiz && lesson.quiz._count.attempts > 0 && (
              <p className="mb-4 text-[13px] text-ink-3">
                {lesson.quiz._count.attempts} attempt(s) so far. Saving replaces the questions; past attempts and completions are kept.
              </p>
            )}
            <QuizEditor
              action={saveQuizAction.bind(null, id, lesson.id)}
              initial={
                lesson.quiz
                  ? {
                      passScore: lesson.quiz.passScore,
                      questions: lesson.quiz.questions.map((q) => ({
                        prompt: q.prompt,
                        options: (q.options as string[]) ?? [],
                        correctIndex: q.correctIndex,
                        explanation: q.explanation ?? "",
                      })),
                    }
                  : null
              }
            />
          </Panel>
        </section>
      )}

      <section aria-labelledby="resources">
        <SectionTitle id="resources">Lesson resources</SectionTitle>
        <Panel className="p-5">
          {lesson.resources.length > 0 && (
            <ul className="mb-5 flex flex-col divide-y divide-line">
              {lesson.resources.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                  <Badge tone="neutral">{r.kind}</Badge>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-ink-1 hover:text-gold-bright">
                    {r.title}
                  </a>
                  <InlineAction action={deleteResourceAction.bind(null, id, r.id)} label={<Icon name="trash" size={14} />} variant="ghost" ariaLabel={`Remove ${r.title}`} />
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addResourceAction.bind(null, id, lesson.id)} submit="Add resource">
            <ResourceFields k={`lesson-${lesson.id}`} />
          </ActionForm>
        </Panel>
      </section>

      <section aria-labelledby="danger">
        <SectionTitle id="danger">Delete</SectionTitle>
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="max-w-[60ch] text-[13.5px] text-ink-2">
            {lesson._count.progress > 0
              ? "Members have progress on this lesson, so it cannot be deleted. Archive the program instead."
              : "No member has progress on this lesson. Deleting it removes its knowledge check and resources."}
          </p>
          <InlineAction
            action={deleteLessonAction.bind(null, id, lesson.id)}
            label={
              <>
                <Icon name="trash" size={14} /> Delete lesson
              </>
            }
            variant="danger"
            confirm={`Delete “${lesson.title}”? This cannot be undone.`}
          />
        </Panel>
      </section>
    </div>
  );
}
