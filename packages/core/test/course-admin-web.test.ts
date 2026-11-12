/**
 * The course admin as each role meets it (DR-34): which programmes a page
 * lists or opens, which server action goes through, and what a page hands to
 * the browser. The web app's pages and actions run here as written, with three
 * stand-ins: the signed-in user; Next's cache, which has nothing to
 * revalidate outside a request; and the "server-only" marker, which throws
 * anywhere but in React's server build. Every course, profile and member here
 * is a throwaway; the house programmes are only read.
 */
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import type { UserRole } from "@tycoonhood/db";
import { CourseAuthoringService, type AuthoringActor } from "../src/lms/authoring";
import { createTestUser, uid } from "./helpers";

const authoring = new CourseAuthoringService(prisma);

const session = vi.hoisted(() => ({ user: null as { id: string; role: UserRole } | null }));
vi.mock("../../../apps/web/lib/auth", () => ({ getCurrentUser: async () => session.user }));
vi.mock("../../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: () => {} }));
// A marker that throws outside React's server build; these pages are server components.
vi.mock("../../../apps/web/node_modules/server-only/index.js", () => ({}));

/** A module of the web app. The path is a variable, so core's typecheck leaves the web app's JSX alone. */
function webModule<T>(path: string): Promise<T> {
  return import(/* @vite-ignore */ new URL(`../../../apps/web/${path}`, import.meta.url).href);
}

type State = { ok?: string; error?: string };
type Page<P> = (props: P) => Promise<unknown>;

const reviewsPage = () =>
  webModule<{ default: Page<{ searchParams: Promise<{ show?: string }> }> }>("app/(app)/admin/courses/reviews/page.tsx").then((m) => m.default);
const coursesLayout = () =>
  webModule<{ default: Page<{ children: unknown }> }>("app/(app)/admin/courses/layout.tsx").then((m) => m.default);
const coursesPage = () => webModule<{ default: Page<Record<string, never>> }>("app/(app)/admin/courses/page.tsx").then((m) => m.default);
const courseEditor = () =>
  webModule<{ default: Page<{ params: Promise<{ id: string }> }> }>("app/(app)/admin/courses/[id]/page.tsx").then((m) => m.default);
const lessonEditor = () =>
  webModule<{ default: Page<{ params: Promise<{ id: string; lessonId: string }> }> }>("app/(app)/admin/courses/[id]/lessons/[lessonId]/page.tsx").then(
    (m) => m.default
  );
const dashboard = () => webModule<{ default: Page<Record<string, never>> }>("app/(app)/admin/page.tsx").then((m) => m.default);
const instructorsPage = () =>
  webModule<{ default: Page<Record<string, never>> }>("app/(app)/admin/courses/instructors/page.tsx").then((m) => m.default);

type Act = (prev: State, fd: FormData) => Promise<State>;
type Dir = "up" | "down";
const courseActions = () =>
  webModule<{
    setReviewHiddenAction: (reviewId: string, hidden: boolean, prev: State, fd: FormData) => Promise<State>;
    createCourseAction: Act;
    updateCourseAction: (courseId: string, ...rest: Parameters<Act>) => Promise<State>;
    addModuleAction: (courseId: string, ...rest: Parameters<Act>) => Promise<State>;
    updateModuleAction: (courseId: string, moduleId: string, ...rest: Parameters<Act>) => Promise<State>;
    moveModuleAction: (courseId: string, moduleId: string, dir: Dir, ...rest: Parameters<Act>) => Promise<State>;
    deleteModuleAction: (courseId: string, moduleId: string, ...rest: Parameters<Act>) => Promise<State>;
    addLessonAction: (courseId: string, moduleId: string, ...rest: Parameters<Act>) => Promise<State>;
    updateLessonAction: (courseId: string, lessonId: string, ...rest: Parameters<Act>) => Promise<State>;
    moveLessonAction: (courseId: string, lessonId: string, dir: Dir, ...rest: Parameters<Act>) => Promise<State>;
    deleteLessonAction: (courseId: string, lessonId: string, ...rest: Parameters<Act>) => Promise<State>;
    saveQuizAction: (courseId: string, lessonId: string, ...rest: Parameters<Act>) => Promise<State>;
    addResourceAction: (courseId: string, lessonId: string | null, ...rest: Parameters<Act>) => Promise<State>;
    deleteResourceAction: (courseId: string, resourceId: string, ...rest: Parameters<Act>) => Promise<State>;
    createInstructorAction: Act;
    updateInstructorAction: (id: string, ...rest: Parameters<Act>) => Promise<State>;
    deleteInstructorAction: (id: string, ...rest: Parameters<Act>) => Promise<State>;
    linkInstructorAction: (id: string, ...rest: Parameters<Act>) => Promise<State>;
    unlinkInstructorAction: (id: string, ...rest: Parameters<Act>) => Promise<State>;
  }>("app/(app)/admin/courses/actions.ts");

const cleanup: (() => Promise<unknown>)[] = [];
afterEach(() => {
  session.user = null;
});
afterAll(async () => {
  for (const undo of cleanup.reverse()) await undo();
});

async function staff(role: UserRole) {
  const u = await createTestUser();
  if (role !== "MEMBER") await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role, email: u.email };
}

const tag = () => uid().slice(0, 8);

/** An instructor whose account an administrator linked to a profile of their own. */
async function linkedInstructor(admin: AuthoringActor) {
  const actor = await staff("INSTRUCTOR");
  const profile = await authoring.createInstructor(admin, { slug: `i-${tag()}`, name: `Teacher ${tag()}`, bio: "Teaches tests for a living." });
  cleanup.push(() => prisma.instructor.deleteMany({ where: { id: profile.id } }));
  await authoring.linkInstructorUser(admin, profile.id, actor.id);
  return { actor, profile };
}

/** A draft programme with a module, a reading, a knowledge check and a resource on each, built by `author`. */
async function programme(author: AuthoringActor) {
  const course = await authoring.createCourse(author, {
    title: `Programme ${tag()}`,
    slug: `w-${tag()}`,
    pillar: "MIND",
    description: "A throwaway programme for the course admin tests.",
  });
  cleanup.push(() => prisma.course.deleteMany({ where: { id: course.id } }));
  const m1 = await authoring.addModule(author, course.id, { title: "One" });
  const reading = await authoring.addLesson(author, m1.id, { title: "Read", type: "READING", contentMd: "Hello" });
  const check = await authoring.addLesson(author, m1.id, { title: "Check", type: "QUIZ" });
  await authoring.saveQuiz(author, check.id, { passScore: 50, questions: [{ prompt: "Two plus two?", options: ["3", "4"], correctIndex: 1 }] });
  const courseResource = await authoring.addResource(author, { courseId: course.id }, { title: "Workbook", url: "https://example.com/workbook" });
  await authoring.addResource(author, { lessonId: reading.id }, { title: "Notes", url: "/notes.pdf" });
  return { course, m1, reading, check, courseResource };
}

/** Everything about a programme an author can change. */
const snapshot = (courseId: string) =>
  prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      resources: { orderBy: { id: "asc" } },
      modules: {
        orderBy: { id: "asc" },
        include: { lessons: { orderBy: { id: "asc" }, include: { resources: { orderBy: { id: "asc" } }, quiz: { include: { questions: true } } } } },
      },
    },
  });

const form = (fields: Record<string, string> = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

/** A server action's reply, or where its redirect sends the browser. */
async function outcome(action: Promise<State>): Promise<State | { sent: string }> {
  try {
    return await action;
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return { sent: digest.split(";")[2] };
    throw e;
  }
}

/**
 * What a page does for the signed-in user: its element tree when it renders,
 * otherwise where it sent them ("/today" for a redirect, "404" for notFound).
 */
async function visit(page: Promise<unknown>): Promise<{ tree: unknown; sent?: undefined } | { sent: string; tree?: undefined }> {
  try {
    return { tree: await page };
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) return { sent: "404" };
    if (digest.startsWith("NEXT_REDIRECT")) return { sent: digest.split(";")[2] };
    throw e;
  }
}

/**
 * All the text an element tree carries, in children and in props alike: what
 * the page shows, and what it hands to client components (and so to the
 * browser). Functions are skipped.
 */
function everythingIn(node: unknown, seen = new WeakSet<object>(), out: string[] = []): string {
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") out.push(String(node));
  else if (node instanceof Date) out.push(node.toISOString());
  else if (node && typeof node === "object" && !seen.has(node)) {
    seen.add(node);
    // A React element (core cannot import react): look only at what it was given.
    const element = typeof (node as { $$typeof?: unknown }).$$typeof === "symbol" && "props" in node;
    const values = Object.values(element ? ((node as { props: Record<string, unknown> }).props ?? {}) : node);
    for (const v of values) everythingIn(v, seen, out);
  }
  return out.join(" ");
}

/** The element a page keyed with this id (a list row), to read one row on its own. */
function elementWithKey(node: unknown, key: string, seen = new WeakSet<object>()): unknown {
  if (!node || typeof node !== "object" || seen.has(node)) return undefined;
  seen.add(node);
  if ((node as { key?: unknown }).key === key && "props" in node) return node;
  const element = typeof (node as { $$typeof?: unknown }).$$typeof === "symbol" && "props" in node;
  for (const v of Object.values(element ? ((node as { props: Record<string, unknown> }).props ?? {}) : node)) {
    const found = elementWithKey(v, key, seen);
    if (found) return found;
  }
  return undefined;
}

describe("the reviews page", () => {
  it("turns instructors away; shows moderators no email; shows administrators a reviewer's email", async () => {
    const ReviewsPage = await reviewsPage();
    const { setReviewHiddenAction } = await courseActions();
    const [admin, moderator, instructor] = [await staff("ADMIN"), await staff("MODERATOR"), await staff("INSTRUCTOR")];
    const course = await prisma.course.findFirstOrThrow({ select: { id: true } });
    // A reviewer with no profile, whom the page can name only by their email.
    const reviewer = await prisma.user.create({ data: { email: `no-profile-${uid().slice(0, 8)}@tycoonhood.test` } });
    const review = await prisma.courseReview.create({ data: { courseId: course.id, userId: reviewer.id, rating: 2, body: `Mixed feelings ${reviewer.id}` } });
    cleanup.push(() => prisma.courseReview.delete({ where: { id: review.id } }));
    const open = () => visit(ReviewsPage({ searchParams: Promise.resolve({}) }));

    session.user = instructor;
    expect(await open()).toEqual({ sent: "/today" });
    expect(await setReviewHiddenAction(review.id, true, {}, new FormData())).toEqual({ error: "You do not have permission to do that." });
    expect((await prisma.courseReview.findUniqueOrThrow({ where: { id: review.id } })).hidden).toBe(false);

    session.user = moderator;
    const seenByModerator = everythingIn((await open()).tree);
    expect(seenByModerator).toContain(`Mixed feelings ${reviewer.id}`);
    expect(seenByModerator).not.toContain(reviewer.email);

    session.user = admin;
    expect(everythingIn((await open()).tree)).toContain(reviewer.email);
  });
});

describe("the course admin's own navigation", () => {
  it("offers Reviews only to those who moderate reviews", async () => {
    const CoursesLayout = await coursesLayout();
    const links = async (role: UserRole) => {
      session.user = await staff(role);
      return everythingIn(await CoursesLayout({ children: null }));
    };
    expect(await links("INSTRUCTOR")).not.toContain("/admin/courses/reviews");
    expect(await links("MODERATOR")).toContain("/admin/courses/reviews");
    expect(await links("ADMIN")).toContain("/admin/courses/reviews");
  });

  it("offers Instructors only to course managers", async () => {
    const CoursesLayout = await coursesLayout();
    const links = async (role: UserRole) => {
      session.user = await staff(role);
      return everythingIn(await CoursesLayout({ children: null }));
    };
    expect(await links("INSTRUCTOR")).not.toContain("/admin/courses/instructors");
    expect(await links("INSTRUCTOR")).toContain("/admin/courses");
    expect(await links("ADMIN")).toContain("/admin/courses/instructors");
  });
});

describe("an instructor's course admin holds only the programmes they teach", () => {
  it("/admin/courses lists an instructor's own programmes and offers to create one as theirs; a course manager sees every programme", async () => {
    const Courses = await coursesPage();
    const admin = await staff("ADMIN");
    const [a, b] = [await linkedInstructor(admin), await linkedInstructor(admin)];
    const [mine, theirs] = [await programme(a.actor), await programme(b.actor)];
    const list = async () => everythingIn((await visit(Courses({}))).tree);

    session.user = a.actor;
    const seenByA = await list();
    expect(seenByA).toContain(mine.course.title);
    expect(seenByA).not.toContain(theirs.course.title);
    // The new program form names who will teach it, and lists no other profile.
    expect(seenByA).toContain("Create draft");
    expect(seenByA).toContain(a.profile.name);
    expect(seenByA).not.toContain(b.profile.name);

    session.user = await staff("INSTRUCTOR");
    const seenUnlinked = await list();
    expect(seenUnlinked).toContain("not linked to an instructor profile");
    expect(seenUnlinked).not.toContain(mine.course.title);
    expect(seenUnlinked).not.toContain("Create draft");

    session.user = admin;
    const seenByAdmin = await list();
    for (const text of [mine.course.title, theirs.course.title, a.profile.name, b.profile.name]) expect(seenByAdmin).toContain(text);
  });

  it("a programme's editor and its lesson editor open only for someone who may edit that programme", async () => {
    const [Editor, LessonEditor] = [await courseEditor(), await lessonEditor()];
    const admin = await staff("ADMIN");
    const [a, b] = [await linkedInstructor(admin), await linkedInstructor(admin)];
    const [mine, theirs] = [await programme(a.actor), await programme(b.actor)];
    const open = (id: string) => visit(Editor({ params: Promise.resolve({ id }) }));
    const openLesson = (id: string, lessonId: string) => visit(LessonEditor({ params: Promise.resolve({ id, lessonId }) }));

    session.user = a.actor;
    const own = await open(mine.course.id);
    expect(own.tree).toBeTruthy();
    // Who teaches it is shown, not chosen: no list of every profile.
    expect(everythingIn(own.tree)).toContain(a.profile.name);
    expect(everythingIn(own.tree)).not.toContain(b.profile.name);
    expect((await openLesson(mine.course.id, mine.reading.id)).tree).toBeTruthy();
    expect(await open(theirs.course.id)).toEqual({ sent: "404" });
    expect(await openLesson(theirs.course.id, theirs.reading.id)).toEqual({ sent: "404" });
    expect(await openLesson(mine.course.id, theirs.reading.id)).toEqual({ sent: "404" });

    session.user = await staff("INSTRUCTOR");
    expect(await open(mine.course.id)).toEqual({ sent: "404" });
    session.user = await staff("MODERATOR");
    expect(await open(mine.course.id)).toEqual({ sent: "/today" });

    session.user = admin;
    const managed = await open(theirs.course.id);
    expect(everythingIn(managed.tree)).toContain(a.profile.name); // every profile, to choose from
    expect((await openLesson(theirs.course.id, theirs.reading.id)).tree).toBeTruthy();
  });

  it("every server action refuses a programme the instructor does not teach, whatever programme id the form carries", async () => {
    const actions = await courseActions();
    const admin = await staff("ADMIN");
    const [a, b] = [await linkedInstructor(admin), await linkedInstructor(admin)];
    const [mine, theirs] = [await programme(a.actor), await programme(b.actor)];
    const before = await snapshot(theirs.course.id);
    const quiz = JSON.stringify({ passScore: 50, questions: [{ prompt: "Hijacked?", options: ["yes", "no"], correctIndex: 0 }] });
    const link = { title: "Spam", url: "https://spam.example", kind: "link" };

    session.user = a.actor;
    // The programme id an action is bound to only picks the pages to refresh: core finds the programme from the target itself.
    const attempts: Record<string, () => Promise<State>> = {
      updateCourse: () => actions.updateCourseAction(theirs.course.id, {}, form({ title: "Taken", slug: theirs.course.slug, pillar: "MIND", description: "Taken over by someone else." })),
      addModule: () => actions.addModuleAction(theirs.course.id, {}, form({ title: "Injected" })),
      updateModule: () => actions.updateModuleAction(mine.course.id, theirs.m1.id, {}, form({ title: "Renamed" })),
      moveModule: () => actions.moveModuleAction(mine.course.id, theirs.m1.id, "down", {}, form()),
      deleteModule: () => actions.deleteModuleAction(mine.course.id, theirs.m1.id, {}, form()),
      addLesson: () => actions.addLessonAction(mine.course.id, theirs.m1.id, {}, form({ title: "Injected", type: "READING" })),
      updateLesson: () => actions.updateLessonAction(mine.course.id, theirs.reading.id, {}, form({ title: "Rewritten", type: "READING" })),
      moveLesson: () => actions.moveLessonAction(mine.course.id, theirs.check.id, "up", {}, form()),
      deleteLesson: () => actions.deleteLessonAction(mine.course.id, theirs.reading.id, {}, form()),
      saveQuiz: () => actions.saveQuizAction(mine.course.id, theirs.check.id, {}, form({ quiz })),
      addCourseResource: () => actions.addResourceAction(theirs.course.id, null, {}, form(link)),
      addLessonResource: () => actions.addResourceAction(mine.course.id, theirs.reading.id, {}, form(link)),
      deleteResource: () => actions.deleteResourceAction(mine.course.id, theirs.courseResource.id, {}, form()),
    };
    for (const [name, attempt] of Object.entries(attempts)) {
      expect(await outcome(attempt()), name).toEqual({ error: "You can edit only the programs you teach." });
    }
    expect(await snapshot(theirs.course.id)).toEqual(before);

    // The same actions work on the instructor's own programme.
    expect(await actions.addModuleAction(mine.course.id, {}, form({ title: "Added by its teacher" }))).toEqual({ ok: "Module added." });
    expect(await actions.updateLessonAction(mine.course.id, mine.reading.id, {}, form({ title: "Rewritten", type: "READING" }))).toEqual({
      ok: "Lesson saved.",
    });
  });

  it("creating a programme from the course admin makes it the instructor's own, and needs a linked profile", async () => {
    const { createCourseAction } = await courseActions();
    const admin = await staff("ADMIN");
    const [a, b] = [await linkedInstructor(admin), await linkedInstructor(admin)];
    const fields = (slug: string) => ({ title: "Made from the form", slug, pillar: "WARRIOR", description: "A programme created through the action." });

    session.user = a.actor;
    const slug = `f-${tag()}`;
    const created = await outcome(createCourseAction({}, form(fields(slug))));
    const course = await prisma.course.findUniqueOrThrow({ where: { slug } });
    cleanup.push(() => prisma.course.deleteMany({ where: { id: course.id } }));
    expect(created).toEqual({ sent: `/admin/courses/${course.id}` });
    expect(course.instructorId).toBe(a.profile.id);
    // A crafted form naming another instructor is refused.
    expect(await outcome(createCourseAction({}, form({ ...fields(`f-${tag()}`), instructorId: b.profile.id })))).toEqual({
      error: "Only an administrator can choose a program's instructor.",
    });

    session.user = await staff("INSTRUCTOR");
    const refused = await outcome(createCourseAction({}, form(fields(`f-${tag()}`))));
    expect(refused).toEqual({ error: expect.stringMatching(/not linked to an instructor profile/) });
  });
});

describe("the admin overview's course cards", () => {
  it("shows a linked instructor their own programmes, tells an unlinked one why there are none, and keeps house-wide counts for course managers", async () => {
    const Overview = await dashboard();
    const admin = await staff("ADMIN");
    const a = await linkedInstructor(admin);
    const mine = await programme(a.actor);
    const look = async () => everythingIn((await visit(Overview({}))).tree);

    session.user = a.actor;
    const seenByA = await look();
    expect(seenByA).toContain("Your courses");
    expect(seenByA).toContain(a.profile.name);
    expect(seenByA).toContain(mine.course.title);
    expect(seenByA).toContain(`/admin/courses/${mine.course.id}`);
    expect(seenByA).not.toContain("Draft courses");

    session.user = await staff("INSTRUCTOR");
    expect(await look()).toContain("not linked to an instructor profile");

    session.user = admin;
    expect(await look()).toContain("Draft courses");
  });
});

describe("the instructors page", () => {
  const NOT_YET_INSTRUCTOR = "until an administrator makes them an Instructor";

  it("is for course managers: an instructor can neither open it nor use its actions", async () => {
    const [Instructors, actions] = [await instructorsPage(), await courseActions()];
    const admin = await staff("ADMIN");
    const a = await linkedInstructor(admin);
    const someone = await staff("INSTRUCTOR");
    const before = await prisma.instructor.findUniqueOrThrow({ where: { id: a.profile.id } });
    const made = { slug: `i-${tag()}`, name: "Self Made", bio: "A profile an instructor tried to make." };
    const refused = { error: "You do not have permission to do that." };

    session.user = a.actor;
    expect(await visit(Instructors({}))).toEqual({ sent: "/today" });
    expect(await actions.createInstructorAction({}, form(made))).toEqual(refused);
    expect(await actions.updateInstructorAction(a.profile.id, {}, form({ ...made, slug: a.profile.slug }))).toEqual(refused);
    expect(await actions.linkInstructorAction(a.profile.id, {}, form({ member: someone.email }))).toEqual(refused);
    expect(await actions.unlinkInstructorAction(a.profile.id, {}, form())).toEqual(refused);
    expect(await actions.deleteInstructorAction(a.profile.id, {}, form())).toEqual(refused);
    expect(await prisma.instructor.findUniqueOrThrow({ where: { id: a.profile.id } })).toEqual(before);
    expect(await prisma.instructor.count({ where: { slug: made.slug } })).toBe(0);

    session.user = await staff("MODERATOR");
    expect(await visit(Instructors({}))).toEqual({ sent: "/today" });

    session.user = admin;
    const page = await visit(Instructors({}));
    const row = everythingIn(elementWithKey(page.tree, a.profile.id));
    const { username } = await prisma.profile.findUniqueOrThrow({ where: { userId: a.actor.id } });
    expect(row).toContain(`@${username}`);
    expect(row).not.toContain(NOT_YET_INSTRUCTOR);
  });

  it("links a profile to a member by email or username, says who is linked, unlinks it, and audits each change", async () => {
    const [Instructors, { linkInstructorAction, unlinkInstructorAction }] = [await instructorsPage(), await courseActions()];
    const admin = await staff("ADMIN");
    const newProfile = async () => {
      const p = await authoring.createInstructor(admin, { slug: `i-${tag()}`, name: `Teacher ${tag()}`, bio: "Teaches tests for a living." });
      cleanup.push(() => prisma.instructor.deleteMany({ where: { id: p.id } }));
      return p;
    };
    const [profile, other] = [await newProfile(), await newProfile()];
    const member = await createTestUser(); // a Member, with a public profile
    const { username, displayName } = await prisma.profile.findUniqueOrThrow({ where: { userId: member.id } });
    const row = async (id: string) => everythingIn(elementWithKey((await visit(Instructors({}))).tree, id));
    const userIdOf = async (id: string) => (await prisma.instructor.findUniqueOrThrow({ where: { id } })).userId;

    session.user = admin;
    expect(await row(profile.id)).toContain("Not linked");
    expect(await linkInstructorAction(profile.id, {}, form({ member: "  " }))).toEqual({ error: "Enter the member's email or username." });
    expect(await linkInstructorAction(profile.id, {}, form({ member: `nobody_${tag()}` }))).toEqual({ error: "No member has that email or username." });
    expect(await userIdOf(profile.id)).toBeNull();

    expect(await linkInstructorAction(profile.id, {}, form({ member: `@${username}` }))).toEqual({ ok: `Linked to ${displayName} (@${username}).` });
    expect(await userIdOf(profile.id)).toBe(member.id);
    const linked = await row(profile.id);
    expect(linked).toContain(`@${username}`);
    expect(linked).toContain(member.email); // an administrator sees which account it is
    expect(linked).toContain(NOT_YET_INSTRUCTOR); // a Member cannot edit programmes yet, and the page says so

    // One profile per member.
    expect(await linkInstructorAction(other.id, {}, form({ member: member.email }))).toEqual({
      error: `That member is already linked to the instructor profile “${profile.name}”. Unlink them there first.`,
    });
    expect(await userIdOf(other.id)).toBeNull();

    expect(await unlinkInstructorAction(profile.id, {}, form())).toEqual({ ok: "Unlinked." });
    expect(await userIdOf(profile.id)).toBeNull();
    expect(await row(profile.id)).toContain("Not linked");

    // By email this time, typed in any case.
    expect(await linkInstructorAction(other.id, {}, form({ member: member.email.toUpperCase() }))).toEqual({ ok: `Linked to ${displayName} (@${username}).` });
    expect(await userIdOf(other.id)).toBe(member.id);

    const audit = await prisma.auditLog.findMany({
      where: { targetId: { in: [profile.id, other.id] }, action: { in: ["instructor.link", "instructor.unlink"] } },
      orderBy: { createdAt: "asc" },
    });
    expect(audit.map((r) => [r.action, r.actorId, r.targetId])).toEqual([
      ["instructor.link", admin.id, profile.id],
      ["instructor.unlink", admin.id, profile.id],
      ["instructor.link", admin.id, other.id],
    ]);
  });
});
