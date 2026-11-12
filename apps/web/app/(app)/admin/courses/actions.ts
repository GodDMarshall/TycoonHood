"use server";
/**
 * Course management actions. Each one re-authorizes on the server
 * (actorWith), validates in the core service (zod), and is audit-logged there.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authoring, AuthoringError, ForbiddenError, REVIEW_MODERATORS, type Permission } from "@tycoonhood/core";
import type { UserRole } from "@tycoonhood/db";
import { actorWith, actorWithAny } from "../../../../lib/guard";
import { isZodError, zodMessage } from "../../../../lib/form-errors";

export interface CourseAdminState {
  ok?: string;
  error?: string;
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v == null ? undefined : String(v);
};

function refresh(courseId?: string) {
  revalidatePath("/admin/courses", "layout");
  if (courseId) revalidatePath(`/admin/courses/${courseId}`, "layout");
  revalidatePath("/courses", "layout");
  revalidatePath("/programs", "layout");
  revalidatePath("/learning");
}

/** Runs a write as a permitted actor (one permission, or any of a list) and turns known failures into a message for the form. */
async function run(
  permission: Permission | readonly Permission[],
  write: (actor: { id: string; role: UserRole }) => Promise<unknown>,
  ok: string,
  courseId?: string
): Promise<CourseAdminState> {
  try {
    const user = typeof permission === "string" ? await actorWith(permission) : await actorWithAny(...permission);
    await write({ id: user.id, role: user.role });
  } catch (e) {
    if (isZodError(e)) return { error: zodMessage(e) };
    if (e instanceof AuthoringError || e instanceof ForbiddenError) return { error: e.message };
    if (e instanceof Error && e.message.startsWith("You do not have permission")) return { error: e.message };
    throw e;
  }
  refresh(courseId);
  return { ok };
}

const courseInput = (fd: FormData) => ({
  title: str(fd, "title") ?? "",
  slug: str(fd, "slug") ?? "",
  pillar: (str(fd, "pillar") ?? "") as "WARRIOR",
  subtitle: str(fd, "subtitle"),
  description: str(fd, "description") ?? "",
  coverImage: str(fd, "coverImage"),
  instructorId: str(fd, "instructorId"),
  // Raw: a blank field means the default (Number("") would be 0); the schema decides.
  xpOnCompletion: str(fd, "xpOnCompletion"),
});

// ── courses

export async function createCourseAction(_prev: CourseAdminState, fd: FormData): Promise<CourseAdminState> {
  let id: string | null = null;
  const r = await run(
    "courses.author",
    async (actor) => {
      id = (await authoring.createCourse(actor, courseInput(fd))).id;
    },
    "Created."
  );
  if (r.error || !id) return r;
  redirect(`/admin/courses/${id}`);
}

export async function updateCourseAction(courseId: string, _prev: CourseAdminState, fd: FormData) {
  return run("courses.author", (a) => authoring.updateCourse(a, courseId, courseInput(fd)), "Saved.", courseId);
}

export async function publishCourseAction(courseId: string, _prev: CourseAdminState, _fd: FormData) {
  return run("courses.publish", (a) => authoring.publish(a, courseId), "Published. Members can see it now.", courseId);
}

export async function unpublishCourseAction(courseId: string, _prev: CourseAdminState, _fd: FormData) {
  return run("courses.publish", (a) => authoring.unpublish(a, courseId), "Back to draft. Hidden from members.", courseId);
}

export async function archiveCourseAction(courseId: string, _prev: CourseAdminState, _fd: FormData) {
  return run("courses.publish", (a) => authoring.archive(a, courseId), "Archived. Hidden from members; certificates stay valid.", courseId);
}

// ── modules

const moduleInput = (fd: FormData) => ({
  title: str(fd, "title") ?? "",
  description: str(fd, "description"),
  objectives: str(fd, "objectives") ?? "",
  completion: str(fd, "completion"),
});

export async function addModuleAction(courseId: string, _prev: CourseAdminState, fd: FormData) {
  return run("courses.author", (a) => authoring.addModule(a, courseId, moduleInput(fd)), "Module added.", courseId);
}

export async function updateModuleAction(courseId: string, moduleId: string, _prev: CourseAdminState, fd: FormData) {
  return run("courses.author", (a) => authoring.updateModule(a, moduleId, moduleInput(fd)), "Module saved.", courseId);
}

export async function moveModuleAction(courseId: string, moduleId: string, dir: "up" | "down", _prev: CourseAdminState, _fd: FormData) {
  return run("courses.author", (a) => authoring.moveModule(a, moduleId, dir), "Moved.", courseId);
}

export async function deleteModuleAction(courseId: string, moduleId: string, _prev: CourseAdminState, _fd: FormData) {
  return run("courses.author", (a) => authoring.deleteModule(a, moduleId), "Module deleted.", courseId);
}

// ── lessons

const lessonInput = (fd: FormData) => ({
  title: str(fd, "title") ?? "",
  type: (str(fd, "type") ?? "READING") as "READING",
  contentMd: str(fd, "contentMd"),
  videoUrl: str(fd, "videoUrl"),
  minutes: str(fd, "minutes") ? Number(str(fd, "minutes")) : ("" as const),
  xpReward: str(fd, "xpReward"),
  isPreview: fd.get("isPreview") === "on",
  isFinal: fd.get("isFinal") === "on",
  moduleId: str(fd, "moduleId"),
});

export async function addLessonAction(courseId: string, moduleId: string, _prev: CourseAdminState, fd: FormData): Promise<CourseAdminState> {
  let id: string | null = null;
  const r = await run(
    "courses.author",
    async (a) => {
      id = (await authoring.addLesson(a, moduleId, lessonInput(fd))).id;
    },
    "Lesson added.",
    courseId
  );
  if (r.error || !id) return r;
  redirect(`/admin/courses/${courseId}/lessons/${id}`);
}

export async function updateLessonAction(courseId: string, lessonId: string, _prev: CourseAdminState, fd: FormData) {
  return run("courses.author", (a) => authoring.updateLesson(a, lessonId, lessonInput(fd)), "Lesson saved.", courseId);
}

export async function moveLessonAction(courseId: string, lessonId: string, dir: "up" | "down", _prev: CourseAdminState, _fd: FormData) {
  return run("courses.author", (a) => authoring.moveLesson(a, lessonId, dir), "Moved.", courseId);
}

export async function deleteLessonAction(courseId: string, lessonId: string, _prev: CourseAdminState, _fd: FormData): Promise<CourseAdminState> {
  const r = await run("courses.author", (a) => authoring.deleteLesson(a, lessonId), "Lesson deleted.", courseId);
  if (r.error) return r;
  redirect(`/admin/courses/${courseId}`);
}

// ── quiz

export async function saveQuizAction(courseId: string, lessonId: string, _prev: CourseAdminState, fd: FormData) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(fd.get("quiz") ?? "{}"));
  } catch {
    return { error: "The quiz could not be read. Reload the page and try again." };
  }
  return run("courses.author", (a) => authoring.saveQuiz(a, lessonId, parsed as never), "Knowledge check saved.", courseId);
}

// ── resources

export async function addResourceAction(courseId: string, lessonId: string | null, _prev: CourseAdminState, fd: FormData) {
  const input = { title: str(fd, "title") ?? "", url: str(fd, "url") ?? "", kind: (str(fd, "kind") ?? "link") as "link" };
  return run(
    "courses.author",
    (a) => authoring.addResource(a, lessonId ? { lessonId } : { courseId }, input),
    "Resource added.",
    courseId
  );
}

export async function deleteResourceAction(courseId: string, resourceId: string, _prev: CourseAdminState, _fd: FormData) {
  return run("courses.author", (a) => authoring.deleteResource(a, resourceId), "Resource removed.", courseId);
}

// ── instructors

const instructorInput = (fd: FormData) => ({
  slug: str(fd, "slug") ?? "",
  name: str(fd, "name") ?? "",
  headline: str(fd, "headline"),
  bio: str(fd, "bio") ?? "",
  avatar: str(fd, "avatar"),
});

export async function createInstructorAction(_prev: CourseAdminState, fd: FormData) {
  return run("courses.author", (a) => authoring.createInstructor(a, instructorInput(fd)), "Instructor added.");
}

export async function updateInstructorAction(id: string, _prev: CourseAdminState, fd: FormData) {
  const r = await run("courses.author", (a) => authoring.updateInstructor(a, id, instructorInput(fd)), "Saved.");
  revalidatePath("/instructors", "layout");
  return r;
}

export async function deleteInstructorAction(id: string, _prev: CourseAdminState, _fd: FormData) {
  return run("courses.author", (a) => authoring.deleteInstructor(a, id), "Instructor removed.");
}

// ── reviews

export async function setReviewHiddenAction(reviewId: string, hidden: boolean, _prev: CourseAdminState, _fd: FormData) {
  return run(REVIEW_MODERATORS, (a) => authoring.setReviewHidden(a, reviewId, hidden), hidden ? "Hidden." : "Visible again.");
}
