/**
 * Who may edit which programme (DR-34). An instructor edits only the
 * programmes whose instructor profile is linked to their own account.
 * Course managers (`courses.manage`, administrators today) edit every
 * programme, manage instructor profiles and link them to member accounts.
 * Every course, profile and member here is a throwaway made by this file.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import type { UserRole } from "@tycoonhood/db";
import {
  CourseAuthoringService,
  AuthoringError,
  REVIEW_MODERATORS,
  canModerateReviews,
  canSeeReviewerEmails,
  editableCoursesWhere,
  type AuthoringActor,
} from "../src/lms/authoring";
import { LearnerService, ReviewNotAllowedError } from "../src/lms/learner";
import { LmsService } from "../src/lms/lms";
import { can, ForbiddenError, ROLES } from "../src/auth/permissions";
import { createTestUser, uid } from "./helpers";

const authoring = new CourseAuthoringService(prisma);
const learner = new LearnerService(prisma);
const lms = new LmsService(prisma);

const courses: string[] = [];
const profiles: string[] = [];

afterAll(async () => {
  await prisma.course.deleteMany({ where: { id: { in: courses } } });
  await prisma.instructor.deleteMany({ where: { id: { in: profiles } } });
});

async function staff(role: UserRole = "ADMIN"): Promise<AuthoringActor> {
  const u = await createTestUser();
  if (role !== "MEMBER") await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role };
}

/** A public instructor profile, made by an administrator. */
async function profile(admin: AuthoringActor, name = "Test Teacher") {
  const i = await authoring.createInstructor(admin, { slug: `i-${uid().slice(0, 8)}`, name, bio: "Teaches tests for a living." });
  profiles.push(i.id);
  return i;
}

const auditRows = (targetId: string, action: string) => prisma.auditLog.findMany({ where: { targetId, action }, orderBy: { createdAt: "asc" } });

/** An instructor whose account an administrator linked to a profile of their own. */
async function linkedInstructor(admin: AuthoringActor, name = "Linked Teacher") {
  const actor = await staff("INSTRUCTOR");
  const i = await profile(admin, name);
  await authoring.linkInstructorUser(admin, i.id, actor.id);
  return { actor, profile: i };
}

const fields = (slug = `o-${uid().slice(0, 8)}`) => ({
  title: "Owned Programme",
  slug,
  pillar: "BUILDER" as const,
  description: "A throwaway programme for the ownership tests.",
});

/**
 * A programme with one of everything an author can touch, built by `author`:
 * two modules, a reading and a knowledge check with a question, a programme
 * resource and a lesson resource.
 */
async function programme(author: AuthoringActor, instructorId?: string) {
  const course = await authoring.createCourse(author, { ...fields(), ...(instructorId ? { instructorId } : {}) });
  courses.push(course.id);
  const m1 = await authoring.addModule(author, course.id, { title: "One" });
  const m2 = await authoring.addModule(author, course.id, { title: "Two" });
  const reading = await authoring.addLesson(author, m1.id, { title: "Read", type: "READING", contentMd: "Hello" });
  const check = await authoring.addLesson(author, m1.id, { title: "Check", type: "QUIZ" });
  await authoring.saveQuiz(author, check.id, { passScore: 50, questions: [{ prompt: "Two plus two?", options: ["3", "4"], correctIndex: 1 }] });
  const courseResource = await authoring.addResource(author, { courseId: course.id }, { title: "Workbook", url: "https://example.com/workbook" });
  const lessonResource = await authoring.addResource(author, { lessonId: reading.id }, { title: "Notes", url: "/notes.pdf" });
  return { course, m1, m2, reading, check, courseResource, lessonResource };
}
type Programme = Awaited<ReturnType<typeof programme>>;

/** Everything about a programme an author can change, to show that an attempt changed nothing. */
const snapshot = (courseId: string) =>
  prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      resources: { orderBy: { id: "asc" } },
      modules: {
        orderBy: { id: "asc" },
        include: {
          lessons: {
            orderBy: { id: "asc" },
            include: { resources: { orderBy: { id: "asc" } }, quiz: { include: { questions: { orderBy: { id: "asc" } } } } },
          },
        },
      },
    },
  });

/** Every authoring call that changes a programme, each aimed at `p`, in an order that can all succeed. */
function everyEdit(actor: AuthoringActor, p: Programme) {
  return {
    updateCourse: () => authoring.updateCourse(actor, p.course.id, { ...fields(p.course.slug), title: "Rewritten" }),
    addModule: () => authoring.addModule(actor, p.course.id, { title: "Added" }),
    updateModule: () => authoring.updateModule(actor, p.m1.id, { title: "Renamed" }),
    moveModule: () => authoring.moveModule(actor, p.m2.id, "up"),
    addLesson: () => authoring.addLesson(actor, p.m1.id, { title: "Added", type: "READING" }),
    updateLesson: () => authoring.updateLesson(actor, p.reading.id, { title: "Rewritten", type: "READING", contentMd: "Changed" }),
    moveLesson: () => authoring.moveLesson(actor, p.check.id, "up"),
    saveQuiz: () => authoring.saveQuiz(actor, p.check.id, { questions: [{ prompt: "Changed?", options: ["yes", "no"], correctIndex: 0 }] }),
    addCourseResource: () => authoring.addResource(actor, { courseId: p.course.id }, { title: "Added", url: "https://example.com/added" }),
    addLessonResource: () => authoring.addResource(actor, { lessonId: p.reading.id }, { title: "Added", url: "https://example.com/added" }),
    deleteCourseResource: () => authoring.deleteResource(actor, p.courseResource.id),
    deleteLessonResource: () => authoring.deleteResource(actor, p.lessonResource.id),
    deleteLesson: () => authoring.deleteLesson(actor, p.reading.id),
    deleteModule: () => authoring.deleteModule(actor, p.m2.id),
  };
}

async function allSucceed(edits: Record<string, () => Promise<unknown>>) {
  for (const [name, edit] of Object.entries(edits)) {
    await edit().catch((e: Error) => {
      throw new Error(`${name} was refused: ${e.message}`);
    });
  }
}

describe("the courses.manage permission", () => {
  it("is held by administrators only; instructors keep courses.author", () => {
    for (const role of ROLES) expect(can({ role }, "courses.manage"), role).toBe(role === "ADMIN");
    expect(can({ role: "INSTRUCTOR" }, "courses.author")).toBe(true);
    expect(can({ role: "ADMIN" }, "courses.author")).toBe(true);
    expect(can({ role: "MODERATOR" }, "courses.author")).toBe(false);
    expect(can(null, "courses.manage")).toBe(false);
  });
});

describe("instructor profiles are managed with courses.manage", () => {
  it("instructors and moderators cannot create, edit or delete a profile, not even their own", async () => {
    const admin = await staff();
    const mine = await profile(admin, "Mine");
    const theirs = await profile(admin, "Theirs");
    const instructor = await staff("INSTRUCTOR");
    await authoring.linkInstructorUser(admin, mine.id, instructor.id);

    for (const actor of [instructor, await staff("MODERATOR")]) {
      await expect(
        authoring.createInstructor(actor, { slug: `i-${uid().slice(0, 8)}`, name: "Someone New", bio: "Should never be created." })
      ).rejects.toBeInstanceOf(ForbiddenError);
      for (const target of [mine, theirs]) {
        await expect(authoring.updateInstructor(actor, target.id, { slug: target.slug, name: "Renamed", bio: "Should never be saved." })).rejects.toBeInstanceOf(
          ForbiddenError
        );
        await expect(authoring.deleteInstructor(actor, target.id)).rejects.toBeInstanceOf(ForbiddenError);
      }
    }
    const left = await prisma.instructor.findMany({ where: { id: { in: [mine.id, theirs.id] } }, orderBy: { name: "asc" } });
    expect(left.map((i) => i.name)).toEqual(["Mine", "Theirs"]);
  });

  it("creating or editing a profile never links it to an account; only linkInstructorUser does", async () => {
    const admin = await staff();
    const member = await createTestUser();
    const sneaky = { slug: `i-${uid().slice(0, 8)}`, name: "Sneaky", bio: "Tries to link itself.", userId: member.id };
    const i = await authoring.createInstructor(admin, sneaky);
    profiles.push(i.id);
    expect(i.userId).toBeNull();
    const saved = await authoring.updateInstructor(admin, i.id, sneaky);
    expect(saved.userId).toBeNull();
  });
});

describe("linking a profile to a member account", () => {
  it("instructors and moderators cannot link or unlink, even their own profile", async () => {
    const admin = await staff();
    const mine = await profile(admin);
    const instructor = await staff("INSTRUCTOR");
    await expect(authoring.linkInstructorUser(instructor, mine.id, instructor.id)).rejects.toBeInstanceOf(ForbiddenError);
    await authoring.linkInstructorUser(admin, mine.id, instructor.id);
    for (const actor of [instructor, await staff("MODERATOR")]) {
      await expect(authoring.linkInstructorUser(actor, mine.id, null)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(authoring.findMemberForLink(actor, "anyone@tycoonhood.test")).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect((await prisma.instructor.findUniqueOrThrow({ where: { id: mine.id } })).userId).toBe(instructor.id);
  });

  it("link and unlink are audited with who was linked before and after", async () => {
    const admin = await staff();
    const i = await profile(admin);
    const first = await staff("INSTRUCTOR");
    const second = await staff("INSTRUCTOR");
    const name = async (id: string) => (await prisma.profile.findUniqueOrThrow({ where: { userId: id } })).username;

    const linked = await authoring.linkInstructorUser(admin, i.id, first.id);
    expect(linked.userId).toBe(first.id);
    // The same link again changes nothing and writes nothing.
    await authoring.linkInstructorUser(admin, i.id, first.id);
    // Moving the profile to another member records both.
    await authoring.linkInstructorUser(admin, i.id, second.id);
    await authoring.linkInstructorUser(admin, i.id, null);
    expect((await prisma.instructor.findUniqueOrThrow({ where: { id: i.id } })).userId).toBeNull();

    const links = await auditRows(i.id, "instructor.link");
    expect(links.map((r) => [r.actorId, r.targetType, r.meta])).toEqual([
      [admin.id, "Instructor", { slug: i.slug, userId: { from: null, to: first.id }, username: { from: null, to: await name(first.id) } }],
      [
        admin.id,
        "Instructor",
        { slug: i.slug, userId: { from: first.id, to: second.id }, username: { from: await name(first.id), to: await name(second.id) } },
      ],
    ]);
    const unlinks = await auditRows(i.id, "instructor.unlink");
    expect(unlinks.map((r) => r.meta)).toEqual([{ slug: i.slug, userId: { from: second.id, to: null }, username: { from: await name(second.id), to: null } }]);
  });

  it("one profile per member: a member linked elsewhere is refused, even when two links race", async () => {
    const admin = await staff();
    const [a, b, c] = [await profile(admin, "Alpha"), await profile(admin, "Beta"), await profile(admin, "Gamma")];
    const member = await staff("INSTRUCTOR");
    await authoring.linkInstructorUser(admin, a.id, member.id);
    await expect(authoring.linkInstructorUser(admin, b.id, member.id)).rejects.toThrow(/already linked to the instructor profile “Alpha”/);
    expect((await prisma.instructor.findUniqueOrThrow({ where: { id: b.id } })).userId).toBeNull();
    expect(await auditRows(b.id, "instructor.link")).toHaveLength(0);

    // Two administrators link one new member to two profiles at the same moment: one wins.
    const racer = await staff("INSTRUCTOR");
    const results = await Promise.allSettled([authoring.linkInstructorUser(admin, b.id, racer.id), authoring.linkInstructorUser(admin, c.id, racer.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [lost] = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(lost.reason).toBeInstanceOf(AuthoringError);
    expect(String(lost.reason.message)).toMatch(/already linked/);
    expect(await prisma.instructor.count({ where: { userId: racer.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { targetId: { in: [b.id, c.id] }, action: "instructor.link" } })).toBe(1);
  });

  it("refuses a profile or member that does not exist", async () => {
    const admin = await staff();
    const i = await profile(admin);
    await expect(authoring.linkInstructorUser(admin, i.id, "no-such-member")).rejects.toThrow(/No member has that account/);
    await expect(authoring.linkInstructorUser(admin, "no-such-profile", admin.id)).rejects.toThrow(/Instructor not found/);
  });

  it("finds the member to link by exact email or username, never by a partial match", async () => {
    const admin = await staff();
    const member = await createTestUser();
    const username = (await prisma.profile.findUniqueOrThrow({ where: { userId: member.id } })).username;
    expect((await authoring.findMemberForLink(admin, member.email.toUpperCase()))?.id).toBe(member.id);
    expect((await authoring.findMemberForLink(admin, `  ${username}  `))?.id).toBe(member.id);
    expect((await authoring.findMemberForLink(admin, `@${username}`))?.id).toBe(member.id);
    expect(await authoring.findMemberForLink(admin, username.slice(0, -1))).toBeNull();
    expect(await authoring.findMemberForLink(admin, member.email.slice(1))).toBeNull();
    expect(await authoring.findMemberForLink(admin, "   ")).toBeNull();
  });
});

describe("an instructor edits only the programmes they teach", () => {
  it("instructor A cannot change instructor B's programme, module, lesson, knowledge check or resource through any authoring call", async () => {
    const admin = await staff();
    const a = await linkedInstructor(admin, "Teacher A");
    const b = await linkedInstructor(admin, "Teacher B");
    const theirs = await programme(b.actor);
    expect(theirs.course.instructorId).toBe(b.profile.id);
    const before = await snapshot(theirs.course.id);

    const unlinked = await staff("INSTRUCTOR");
    for (const actor of [a.actor, unlinked]) {
      for (const [name, edit] of Object.entries(everyEdit(actor, theirs))) {
        await expect(edit(), name).rejects.toBeInstanceOf(ForbiddenError);
      }
    }
    expect(await prisma.auditLog.count({ where: { actorId: { in: [a.actor.id, unlinked.id] } } })).toBe(0);

    // Nor can A move a lesson of their own into B's programme.
    const mine = await programme(a.actor);
    await expect(authoring.updateLesson(a.actor, mine.reading.id, { title: "Read", type: "READING", moduleId: theirs.m1.id })).rejects.toThrow(
      /same program/
    );
    expect(await snapshot(theirs.course.id)).toEqual(before);
  });

  it("an instructor changes everything in their own programme, but still cannot publish it", async () => {
    const admin = await staff();
    const a = await linkedInstructor(admin);
    const mine = await programme(a.actor);
    expect(mine.course.instructorId).toBe(a.profile.id);
    await allSucceed(everyEdit(a.actor, mine));
    const after = await snapshot(mine.course.id);
    expect(after.title).toBe("Rewritten");
    expect(after.modules.map((m) => m.title).sort()).toEqual(["Added", "Renamed"]);
    expect(after.modules.flatMap((m) => m.lessons.map((l) => l.title)).sort()).toEqual(["Added", "Check"]);
    expect(after.modules.flatMap((m) => m.lessons.flatMap((l) => l.quiz?.questions.map((q) => q.prompt) ?? []))).toEqual(["Changed?"]);
    expect(after.resources.map((r) => r.title)).toEqual(["Added"]);
    await expect(authoring.publish(a.actor, mine.course.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("an instructor whose account is not linked to a profile cannot create a programme", async () => {
    const loose = await staff("INSTRUCTOR");
    const slug = `u-${uid().slice(0, 8)}`;
    const refused = authoring.createCourse(loose, { ...fields(slug), title: "Unlinked" });
    await expect(refused).rejects.toBeInstanceOf(ForbiddenError);
    await expect(refused).rejects.toThrow(/not linked to an instructor profile/);
    expect(await prisma.course.findUnique({ where: { slug } })).toBeNull();
  });

  it("the link is the scope and the role is the capability: unlinking, or a role without courses.author, ends editing", async () => {
    const admin = await staff();
    const a = await linkedInstructor(admin);
    const mine = await programme(a.actor);
    await authoring.linkInstructorUser(admin, a.profile.id, null);
    await expect(authoring.addModule(a.actor, mine.course.id, { title: "After unlinking" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(authoring.createCourse(a.actor, fields())).rejects.toBeInstanceOf(ForbiddenError);

    // A member linked to the profile, but not given an author role, edits nothing.
    const member = await staff("MEMBER");
    await authoring.linkInstructorUser(admin, a.profile.id, member.id);
    for (const [name, edit] of Object.entries(everyEdit(member, mine))) await expect(edit(), name).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("only courses.manage chooses a programme's instructor", async () => {
    const admin = await staff();
    const a = await linkedInstructor(admin, "Teacher A");
    const b = await linkedInstructor(admin, "Teacher B");

    // A programme an instructor creates is always theirs; naming someone else is refused.
    await expect(authoring.createCourse(a.actor, { ...fields(), instructorId: b.profile.id })).rejects.toThrow(/Only an administrator/);
    const own = await authoring.createCourse(a.actor, { ...fields(), instructorId: a.profile.id });
    courses.push(own.id);
    expect(own.instructorId).toBe(a.profile.id);

    // Reassigning it, or clearing its instructor, is refused; leaving the field out keeps the instructor.
    await expect(authoring.updateCourse(a.actor, own.id, { ...fields(own.slug), instructorId: b.profile.id })).rejects.toThrow(/Only an administrator/);
    await expect(authoring.updateCourse(a.actor, own.id, { ...fields(own.slug), instructorId: "" })).rejects.toThrow(/Only an administrator/);
    await authoring.updateCourse(a.actor, own.id, { ...fields(own.slug), instructorId: a.profile.id });
    await authoring.updateCourse(a.actor, own.id, fields(own.slug));
    const instructorOf = async (id: string) => (await prisma.course.findUniqueOrThrow({ where: { id } })).instructorId;
    expect(await instructorOf(own.id)).toBe(a.profile.id);

    // An administrator reassigns it: B can edit it now, and A cannot.
    await authoring.updateCourse(admin, own.id, { ...fields(own.slug), instructorId: b.profile.id });
    expect(await instructorOf(own.id)).toBe(b.profile.id);
    await expect(authoring.addModule(a.actor, own.id, { title: "Too late" })).rejects.toBeInstanceOf(ForbiddenError);
    await authoring.addModule(b.actor, own.id, { title: "Mine now" });
    const [reassigned] = await prisma.auditLog.findMany({ where: { targetId: own.id, action: "course.update", actorId: admin.id } });
    expect(reassigned.meta).toMatchObject({ instructorId: { from: a.profile.id, to: b.profile.id } });
  });

  it("an administrator edits every programme and assigns it to any instructor, or none", async () => {
    const admin = await staff();
    const b = await linkedInstructor(admin);
    const theirs = await programme(b.actor);
    await allSucceed(everyEdit(admin, theirs));
    // An edit that leaves the instructor field out leaves the instructor alone.
    expect(await snapshot(theirs.course.id)).toMatchObject({ title: "Rewritten", instructorId: b.profile.id });

    const forB = await authoring.createCourse(admin, { ...fields(), instructorId: b.profile.id });
    const nobody = await authoring.createCourse(admin, fields());
    courses.push(forB.id, nobody.id);
    expect([forB.instructorId, nobody.instructorId]).toEqual([b.profile.id, null]);
    await authoring.updateCourse(admin, forB.id, { ...fields(forB.slug), instructorId: "" });
    expect((await prisma.course.findUniqueOrThrow({ where: { id: forB.id } })).instructorId).toBeNull();
    await expect(authoring.createCourse(admin, { ...fields(), instructorId: "no-such-profile" })).rejects.toThrow(/Choose an instructor/);
  });

  it("canEditCourse and editableCoursesWhere give the same answer for every role", async () => {
    const admin = await staff();
    const a = await linkedInstructor(admin);
    const b = await linkedInstructor(admin);
    const mine = await programme(a.actor);
    const theirs = await programme(b.actor);
    const both = [mine.course.id, theirs.course.id];
    const listed = async (actor: AuthoringActor) =>
      (await prisma.course.findMany({ where: { AND: [editableCoursesWhere(actor), { id: { in: both } }] }, select: { id: true } })).map((c) => c.id).sort();

    const moderator = await staff("MODERATOR");
    const member = await staff("MEMBER");
    const cases: [AuthoringActor, string[]][] = [
      [a.actor, [mine.course.id]],
      [b.actor, [theirs.course.id]],
      [admin, [...both].sort()],
      [moderator, []],
      [member, []],
      [await staff("INSTRUCTOR"), []],
    ];
    for (const [actor, expected] of cases) {
      expect(await listed(actor), actor.role).toEqual(expected);
      for (const id of both) expect(await authoring.canEditCourse(actor, id), `${actor.role} ${id}`).toBe(expected.includes(id));
    }
    expect(await authoring.canEditCourse(null, mine.course.id)).toBe(false);
    expect(await authoring.canEditCourse(admin, "no-such-course")).toBe(false);
  });
});

describe("instructors cannot hide reviews", () => {
  it("only community moderators and administrators may hide a review", () => {
    expect([...REVIEW_MODERATORS]).toEqual(["community.moderate"]);
    for (const role of ROLES) expect(canModerateReviews({ role }), role).toBe(role === "MODERATOR" || role === "ADMIN");
  });

  it("only those who administer members (admin.users) see a reviewer's email: not instructors, as they did with courses.author, nor moderators", () => {
    for (const role of ROLES) expect(canSeeReviewerEmails({ role }), role).toBe(can({ role }, "admin.users"));
    // INSTRUCTOR is where the rule differs from the old one, which read courses.author.
    expect(can({ role: "INSTRUCTOR" }, "courses.author")).toBe(true);
    expect(canSeeReviewerEmails({ role: "INSTRUCTOR" })).toBe(false);
    expect(canSeeReviewerEmails({ role: "MODERATOR" })).toBe(false);
    expect(canSeeReviewerEmails({ role: "ADMIN" })).toBe(true);
    expect(canSeeReviewerEmails(null)).toBe(false);
  });

  it("an instructor cannot hide or restore a review, even of their own programme; staff still can", async () => {
    const admin = await staff();
    const a = await linkedInstructor(admin);
    const mine = await programme(a.actor);
    const reviewer = await createTestUser();
    const review = await prisma.courseReview.create({ data: { courseId: mine.course.id, userId: reviewer.id, rating: 1, body: "Honest criticism" } });
    const hidden = async () => (await prisma.courseReview.findUniqueOrThrow({ where: { id: review.id } })).hidden;

    await expect(authoring.setReviewHidden(a.actor, review.id, true)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await hidden()).toBe(false);
    await authoring.setReviewHidden(await staff("MODERATOR"), review.id, true);
    expect(await hidden()).toBe(true);
    await expect(authoring.setReviewHidden(a.actor, review.id, false)).rejects.toBeInstanceOf(ForbiddenError);
    await authoring.setReviewHidden(admin, review.id, false);
    expect(await hidden()).toBe(false);
    expect(await prisma.auditLog.count({ where: { actorId: a.actor.id, targetId: review.id } })).toBe(0);
  });
});

describe("an instructor cannot review a programme they teach", () => {
  it("a member who finished a module may review it; its instructor, who did the same, is refused and is not offered the form", async () => {
    const admin = await staff();
    const a = await linkedInstructor(admin);
    const mine = await programme(a.actor);
    await authoring.publish(admin, mine.course.id);
    const check = await prisma.quiz.findUniqueOrThrow({ where: { lessonId: mine.check.id } });
    const student = await createTestUser();

    // Before enrolling, the instructor is told why they can never review it, not invited to enrol.
    expect((await learner.reviewEligibility(a.actor.id, mine.course.id)).reason).toMatch(/You teach this program/);

    // Enrolment is free, so both enrol, and both finish the first module.
    for (const userId of [a.actor.id, student.id]) {
      await lms.enroll(userId, mine.course.slug);
      await lms.completeLesson(userId, mine.reading.id);
      await lms.submitQuiz(userId, check.id, [1]);
    }

    expect(await learner.reviewEligibility(student.id, mine.course.id)).toMatchObject({ canReview: true, reason: null });
    await learner.saveReview(student.id, mine.course.id, { rating: 3, body: "Fair." });

    const gate = await learner.reviewEligibility(a.actor.id, mine.course.id);
    expect(gate).toMatchObject({ enrolled: true, completedModules: 1, canReview: false });
    expect(gate.reason).toMatch(/You teach this program, so you cannot review it/);
    const padded = learner.saveReview(a.actor.id, mine.course.id, { rating: 5, body: "The best program on the site." });
    await expect(padded).rejects.toBeInstanceOf(ReviewNotAllowedError);
    await expect(padded).rejects.toThrow(/You teach this program/);

    expect(await prisma.courseReview.findMany({ where: { courseId: mine.course.id }, select: { userId: true } })).toEqual([{ userId: student.id }]);
    expect(await learner.rating(mine.course.id)).toEqual({ average: 3, count: 1 });
  });
});
