import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { authoring, can, liveCourseBlock } from "@tycoonhood/core";
import { Badge, Icon, Input, Label, Notice, Select, Textarea } from "@tycoonhood/ui";
import { requirePermission } from "../../../../../lib/guard";
import { objectivesOf } from "../../../../../lib/learning";
import { Panel, SectionTitle } from "../../../../../components/app/page";
import { ActionForm } from "../../../../../components/admin/action-form";
import { CourseFields, STATUS_TONE } from "../../../../../components/learning/admin/course-fields";
import { InlineAction } from "../../../../../components/learning/admin/inline-action";
import { ResourceFields } from "../../../../../components/learning/admin/resource-fields";
import {
  addLessonAction,
  addModuleAction,
  addResourceAction,
  archiveCourseAction,
  deleteModuleAction,
  deleteResourceAction,
  moveLessonAction,
  moveModuleAction,
  publishCourseAction,
  unpublishCourseAction,
  updateCourseAction,
  updateModuleAction,
} from "../actions";

export const metadata: Metadata = { title: "Admin · Edit program" };
export const dynamic = "force-dynamic";

const TYPE_LABEL = { VIDEO: "Video", READING: "Reading", ASSIGNMENT: "Assignment", QUIZ: "Knowledge check" } as const;

function ModuleFields({ m }: { m?: { id: string; title: string; description: string | null; objectives: unknown; completion: string | null } }) {
  const k = m?.id ?? "new";
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`m-title-${k}`}>Module title</Label>
        <Input id={`m-title-${k}`} name="title" required maxLength={120} defaultValue={m?.title} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`m-desc-${k}`}>Description</Label>
        <Textarea id={`m-desc-${k}`} name="description" rows={2} maxLength={1000} defaultValue={m?.description ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`m-obj-${k}`}>Objectives — one per line</Label>
        <Textarea
          id={`m-obj-${k}`}
          name="objectives"
          rows={4}
          defaultValue={objectivesOf(m?.objectives).join("\n")}
          placeholder={"Explain …\nBuild …\nApply …"}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`m-done-${k}`}>Completion criteria</Label>
        <Input id={`m-done-${k}`} name="completion" maxLength={300} defaultValue={m?.completion ?? ""} placeholder="Complete every lesson and pass the knowledge check." />
      </div>
    </>
  );
}

export default async function AdminCourseEdit({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("courses.author");
  const { id } = await params;
  // A program someone else teaches does not exist here (DR-34). Every action re-checks it in core.
  if (!(await authoring.canEditCourse(user, id))) notFound();
  const manage = can(user, "courses.manage");
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: { select: { name: true } },
      modules: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          lessons: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: {
              id: true,
              title: true,
              type: true,
              durationSec: true,
              isPreview: true,
              isFinal: true,
              xpReward: true,
              quiz: { select: { _count: { select: { questions: true } } } },
              _count: { select: { progress: true } },
            },
          },
        },
      },
      resources: { orderBy: { title: "asc" } },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });
  if (!course) notFound();
  const [instructors, problems] = await Promise.all([
    manage ? prisma.instructor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : null,
    authoring.publishProblems(course.id),
  ]);
  const canPublish = can(user, "courses.publish");
  // Its instructor opens a published or archived program, but only an administrator changes it (DR-34).
  const live = liveCourseBlock(user, course.status);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Link href="/admin/courses" className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink-1">
          <Icon name="arrow-left" size={13} /> All programs
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{course.title}</h2>
          <Badge tone={STATUS_TONE[course.status]}>{course.status.toLowerCase()}</Badge>
          <span className="text-[13px] text-ink-3">
            {course._count.enrollments} enrolled · {course._count.reviews} reviews
          </span>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {canPublish ? (
            <>
              {course.status !== "PUBLISHED" && <InlineAction action={publishCourseAction.bind(null, course.id)} label="Publish" variant="primary" showOk />}
              {course.status === "PUBLISHED" && <InlineAction action={unpublishCourseAction.bind(null, course.id)} label="Unpublish" showOk />}
              {course.status !== "ARCHIVED" && (
                <InlineAction
                  action={archiveCourseAction.bind(null, course.id)}
                  label="Archive"
                  variant="ghost"
                  confirm="Archive this program? Members lose access to it; their certificates stay valid."
                  showOk
                />
              )}
            </>
          ) : (
            <p className="text-[13px] text-ink-3">Publishing needs the courses.publish permission (an administrator).</p>
          )}
          {course.status === "PUBLISHED" && (
            <Link href={`/programs/${course.slug}`} className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink-1">
              Public page <Icon name="arrow-up-right" size={12} />
            </Link>
          )}
        </div>
        {live && (
          <Notice tone="info" title="Changes go through an administrator">
            {live}
          </Notice>
        )}
        {course.status !== "PUBLISHED" && problems.length > 0 && (
          <Notice tone="warning" title="Before this can be published">
            <ul className="list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Notice>
        )}
      </header>

      <section aria-labelledby="details">
        <SectionTitle id="details">Program details</SectionTitle>
        <Panel className="p-5">
          <ActionForm action={updateCourseAction.bind(null, course.id)} submit="Save details">
            {instructors ? (
              <CourseFields course={course} instructors={instructors} />
            ) : (
              <CourseFields course={course} teacher={course.instructor?.name ?? null} />
            )}
          </ActionForm>
        </Panel>
      </section>

      <section aria-labelledby="modules">
        <SectionTitle id="modules">Modules and lessons</SectionTitle>
        <p className="mb-4 text-[13.5px] text-ink-3">
          Members open lessons in this order: module order, then lesson order. Lessons with member progress cannot be deleted — archive the program instead.
        </p>
        <div className="flex flex-col gap-4">
          {course.modules.map((m, mi) => (
            <Panel key={m.id} className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-ink-3">Module {mi + 1}</p>
                  <h3 className="text-[16px] font-semibold">{m.title}</h3>
                  {objectivesOf(m.objectives).length > 0 && (
                    <p className="mt-1 text-[12.5px] text-ink-3">{objectivesOf(m.objectives).length} objectives</p>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-1">
                  <InlineAction action={moveModuleAction.bind(null, course.id, m.id, "up")} label={<Icon name="chevron-down" size={14} className="rotate-180" />} variant="ghost" ariaLabel="Move module up" />
                  <InlineAction action={moveModuleAction.bind(null, course.id, m.id, "down")} label={<Icon name="chevron-down" size={14} />} variant="ghost" ariaLabel="Move module down" />
                  <InlineAction
                    action={deleteModuleAction.bind(null, course.id, m.id)}
                    label={<Icon name="trash" size={14} />}
                    variant="ghost"
                    ariaLabel="Delete module"
                    confirm={`Delete module “${m.title}” and its ${m.lessons.length} lesson(s)?`}
                  />
                </div>
              </div>

              <ol>
                {m.lessons.map((l, li) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                    <span className="w-6 text-[12.5px] tabular-nums text-ink-3">{li + 1}</span>
                    <Link href={`/admin/courses/${course.id}/lessons/${l.id}`} className="min-w-0 flex-1 text-[14.5px] text-ink-1 hover:text-gold-bright">
                      {l.title}
                      <span className="block text-[12.5px] text-ink-3">
                        {TYPE_LABEL[l.type]}
                        {l.durationSec ? ` · ${Math.round(l.durationSec / 60)} min` : ""} · {l.xpReward} XP
                        {l.type === "QUIZ" ? ` · ${l.quiz?._count.questions ?? 0} questions` : ""}
                        {l._count.progress ? ` · ${l._count.progress} member progress` : ""}
                      </span>
                    </Link>
                    {l.isFinal && <Badge tone="gold">Final</Badge>}
                    {l.isPreview && <Badge tone="mind">Preview</Badge>}
                    <InlineAction action={moveLessonAction.bind(null, course.id, l.id, "up")} label={<Icon name="chevron-down" size={14} className="rotate-180" />} variant="ghost" ariaLabel="Move lesson up" />
                    <InlineAction action={moveLessonAction.bind(null, course.id, l.id, "down")} label={<Icon name="chevron-down" size={14} />} variant="ghost" ariaLabel="Move lesson down" />
                  </li>
                ))}
              </ol>

              <div className="grid gap-4 border-t border-line bg-bg-0/40 px-5 py-4 lg:grid-cols-2">
                <details>
                  <summary className="cursor-pointer text-[13.5px] text-ink-2 hover:text-ink-1">Edit module</summary>
                  <div className="pt-3">
                    <ActionForm action={updateModuleAction.bind(null, course.id, m.id)} submit="Save module">
                      <ModuleFields m={m} />
                    </ActionForm>
                  </div>
                </details>
                <details>
                  <summary className="cursor-pointer text-[13.5px] text-ink-2 hover:text-ink-1">Add a lesson</summary>
                  <div className="pt-3">
                    <ActionForm action={addLessonAction.bind(null, course.id, m.id)} submit="Add and edit">
                      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`nl-title-${m.id}`}>Lesson title</Label>
                          <Input id={`nl-title-${m.id}`} name="title" required maxLength={160} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`nl-type-${m.id}`}>Type</Label>
                          <Select id={`nl-type-${m.id}`} name="type" defaultValue="READING">
                            {Object.entries(TYPE_LABEL).map(([v, label]) => (
                              <option key={v} value={v}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="mt-4 p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Add a module</h3>
          <ActionForm action={addModuleAction.bind(null, course.id)} submit="Add module">
            <ModuleFields />
          </ActionForm>
        </Panel>
      </section>

      <section aria-labelledby="resources">
        <SectionTitle id="resources">Program resources</SectionTitle>
        <Panel className="p-5">
          {course.resources.length > 0 && (
            <ul className="mb-5 flex flex-col divide-y divide-line">
              {course.resources.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                  <Badge tone="neutral">{r.kind}</Badge>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-ink-1 hover:text-gold-bright">
                    {r.title}
                  </a>
                  <InlineAction action={deleteResourceAction.bind(null, course.id, r.id)} label={<Icon name="trash" size={14} />} variant="ghost" ariaLabel={`Remove ${r.title}`} />
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addResourceAction.bind(null, course.id, null)} submit="Add resource">
            <ResourceFields k={`course-${course.id}`} />
          </ActionForm>
        </Panel>
      </section>
    </div>
  );
}
