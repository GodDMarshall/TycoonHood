/**
 * Course authoring, publish gating, draft invisibility, certificates gated on
 * the final assessment, reviews, role promotion on enrolment, and the
 * academy seed's safety guard. Every course here is a throwaway created and
 * deleted by this file; the house programmes are only read.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LmsService, CourseUnavailableError, NotEnrolledError } from "../src/lms/lms";
import {
  CourseAuthoringService,
  AuthoringError,
  LessonHasProgressError,
  PublishBlockedError,
  type AuthoringActor,
} from "../src/lms/authoring";
import { LearnerService, ReviewNotAllowedError, rankBySignals } from "../src/lms/learner";
import { ForbiddenError } from "../src/auth/permissions";
import { academyRebuildDecision } from "../../db/src/seed-guard";
import { createTestUser, uid } from "./helpers";

const lms = new LmsService(prisma);
const authoring = new CourseAuthoringService(prisma);
const learner = new LearnerService(prisma);

const created: string[] = [];
const instructors: string[] = [];

afterAll(async () => {
  await prisma.certificate.deleteMany({ where: { courseId: { in: created } } });
  await prisma.course.deleteMany({ where: { id: { in: created } } });
  await prisma.instructor.deleteMany({ where: { id: { in: instructors } } });
});

async function staff(role: "ADMIN" | "INSTRUCTOR" | "MODERATOR" = "ADMIN"): Promise<AuthoringActor> {
  const u = await createTestUser();
  await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role };
}

/**
 * A two-module programme plus a final assessment, built only through the
 * service: READING → module quiz → READING → final.
 */
async function buildCourse(actor: AuthoringActor, opts: { final?: boolean; publish?: boolean } = {}) {
  const slug = `t-${uid().slice(0, 8)}`;
  const course = await authoring.createCourse(actor, {
    title: "Test Programme",
    slug,
    pillar: "MIND",
    subtitle: "For tests",
    description: "A throwaway programme created by the authoring test suite.",
    xpOnCompletion: 100,
  });
  created.push(course.id);
  const m1 = await authoring.addModule(actor, course.id, { title: "One", objectives: "Explain one thing\n\nApply one thing\n", completion: "Pass the check." });
  const read1 = await authoring.addLesson(actor, m1.id, { title: "Read one", type: "READING", contentMd: "# Hi", minutes: 5, xpReward: 10 });
  const quiz1 = await authoring.addLesson(actor, m1.id, { title: "Check one", type: "QUIZ", xpReward: 10 });
  await authoring.saveQuiz(actor, quiz1.id, {
    passScore: 50,
    questions: [{ prompt: "Two plus two?", options: ["3", "4"], correctIndex: 1, explanation: "Arithmetic." }],
  });
  const m2 = await authoring.addModule(actor, course.id, { title: "Two" });
  const read2 = await authoring.addLesson(actor, m2.id, { title: "Read two", type: "READING", contentMd: "More", xpReward: 10 });
  let final: { id: string } | null = null;
  let finalQuizId: string | null = null;
  if (opts.final !== false) {
    const mf = await authoring.addModule(actor, course.id, { title: "Final Assessment" });
    final = await authoring.addLesson(actor, mf.id, { title: "Final", type: "QUIZ", isFinal: true, xpReward: 20 });
    const q = await authoring.saveQuiz(actor, final.id, {
      passScore: 100,
      questions: [
        { prompt: "Sky colour?", options: ["Blue", "Green", "Red"], correctIndex: 0 },
        { prompt: "Grass colour?", options: ["Blue", "Green"], correctIndex: 1 },
      ],
    });
    finalQuizId = q.id;
  }
  if (opts.publish !== false) await authoring.publish(actor, course.id);
  const quiz1Row = await prisma.quiz.findUniqueOrThrow({ where: { lessonId: quiz1.id } });
  return { course, m1, m2, read1, quiz1, quiz1Id: quiz1Row.id, read2, final, finalQuizId };
}

describe("Authoring — create course → modules → lessons → quiz", () => {
  it("builds the structure in order, with objectives, minutes and the quiz", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { publish: false });
    const course = await prisma.course.findUniqueOrThrow({
      where: { id: b.course.id },
      include: { modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" }, include: { quiz: { include: { questions: true } } } } } } },
    });
    expect(course.status).toBe("DRAFT");
    expect(course.modules.map((m) => m.title)).toEqual(["One", "Two", "Final Assessment"]);
    expect(course.modules[0].objectives).toEqual(["Explain one thing", "Apply one thing"]);
    expect(course.modules[0].completion).toBe("Pass the check.");
    expect(course.modules[0].lessons[0].durationSec).toBe(300);
    expect(course.modules[0].lessons[1].quiz?.questions).toHaveLength(1);
    expect(course.modules[2].lessons[0].isFinal).toBe(true);

    const audits = await prisma.auditLog.count({ where: { actorId: admin.id } });
    expect(audits).toBeGreaterThanOrEqual(9);
  });

  it("validates input: quiz options, correct index, final must be a quiz, slug format", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { publish: false });
    await expect(
      authoring.saveQuiz(admin, b.quiz1.id, { questions: [{ prompt: "Only one?", options: ["a"], correctIndex: 0 }] })
    ).rejects.toThrow(/2 to 6 options/);
    await expect(
      authoring.saveQuiz(admin, b.quiz1.id, { questions: [{ prompt: "Out of range", options: ["a", "b"], correctIndex: 2 }] })
    ).rejects.toThrow(/one of the options/);
    await expect(authoring.addLesson(admin, b.m2.id, { title: "Bad final", type: "READING", isFinal: true })).rejects.toThrow(/QUIZ/);
    await expect(
      authoring.createCourse(admin, { title: "Bad", slug: "Bad Slug!", pillar: "MIND", description: "Long enough description." })
    ).rejects.toThrow(/lowercase/);
    await expect(
      authoring.createCourse(admin, { title: "Dup", slug: b.course.slug, pillar: "MIND", description: "Long enough description." })
    ).rejects.toBeInstanceOf(AuthoringError);
  });

  it("marking a second lesson final unmarks the first", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { publish: false });
    const other = await authoring.addLesson(admin, b.m2.id, { title: "Another final", type: "QUIZ", isFinal: true });
    const finals = await prisma.lesson.findMany({ where: { module: { courseId: b.course.id }, isFinal: true }, select: { id: true } });
    expect(finals.map((f) => f.id)).toEqual([other.id]);
  });

  it("reorders modules and lessons", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { publish: false });
    await authoring.moveModule(admin, b.m2.id, "up");
    const mods = await prisma.courseModule.findMany({ where: { courseId: b.course.id }, orderBy: { sortOrder: "asc" } });
    expect(mods[0].id).toBe(b.m2.id);
    await authoring.moveLesson(admin, b.quiz1.id, "up");
    const lessons = await prisma.lesson.findMany({ where: { moduleId: b.m1.id }, orderBy: { sortOrder: "asc" } });
    expect(lessons.map((l) => l.id)).toEqual([b.quiz1.id, b.read1.id]);
  });

  it("only course staff can author; an instructor cannot publish", async () => {
    const instructor = await staff("INSTRUCTOR");
    const moderator = await staff("MODERATOR");
    const b = await buildCourse(instructor, { publish: false });
    await expect(authoring.publish(instructor, b.course.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      authoring.createCourse(moderator, { title: "Nope", slug: `n-${uid().slice(0, 6)}`, pillar: "MIND", description: "Should not be created." })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("Publish gating and draft invisibility", () => {
  it("refuses to publish without lessons, or with an empty knowledge check", async () => {
    const admin = await staff();
    const course = await authoring.createCourse(admin, {
      title: "Empty",
      slug: `e-${uid().slice(0, 8)}`,
      pillar: "WARRIOR",
      description: "Nothing in it yet at all.",
    });
    created.push(course.id);
    await expect(authoring.publish(admin, course.id)).rejects.toBeInstanceOf(PublishBlockedError);
    const m = await authoring.addModule(admin, course.id, { title: "Module" });
    await authoring.addLesson(admin, m.id, { title: "Empty check", type: "QUIZ" });
    await expect(authoring.publish(admin, course.id)).rejects.toThrow(/no questions/);
  });

  it("a DRAFT course cannot be enrolled in or progressed; publishing opens it; unpublishing closes it", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { publish: false });
    const user = await createTestUser();
    await expect(lms.enroll(user.id, b.course.slug)).rejects.toBeInstanceOf(CourseUnavailableError);
    expect((await learner.youMightStart(user.id, 50)).some((c) => c.id === b.course.id)).toBe(false);

    await authoring.publish(admin, b.course.id);
    await lms.enroll(user.id, b.course.slug);
    expect((await learner.youMightStart(user.id, 50)).some((c) => c.id === b.course.id)).toBe(false); // enrolled

    await authoring.unpublish(admin, b.course.id);
    await expect(lms.completeLesson(user.id, b.read1.id)).rejects.toBeInstanceOf(CourseUnavailableError);
    const audit = await prisma.auditLog.findMany({ where: { targetId: b.course.id, action: { in: ["course.publish", "course.unpublish"] } } });
    expect(audit).toHaveLength(2);
  });

  it("blocks deleting a lesson or module with member progress", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    await lms.completeLesson(user.id, b.read1.id);
    await expect(authoring.deleteLesson(admin, b.read1.id)).rejects.toBeInstanceOf(LessonHasProgressError);
    await expect(authoring.deleteModule(admin, b.m1.id)).rejects.toBeInstanceOf(LessonHasProgressError);
    // A lesson nobody has touched can go.
    await authoring.deleteLesson(admin, b.read2.id);
    expect(await prisma.lesson.findUnique({ where: { id: b.read2.id } })).toBeNull();
  });
});

async function walk(userId: string, b: Awaited<ReturnType<typeof buildCourse>>, opts: { passFinal: boolean }) {
  await lms.completeLesson(userId, b.read1.id);
  await lms.submitQuiz(userId, b.quiz1Id, [1]);
  if (!b.final) {
    // read2 is now the last lesson.
    return lms.completeLesson(userId, b.read2.id);
  }
  await lms.completeLesson(userId, b.read2.id);
  return lms.submitQuiz(userId, b.finalQuizId!, opts.passFinal ? [0, 1] : [0, 0]);
}

describe("Certificates require the final assessment", () => {
  it("no certificate until the final is passed; then exactly one", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);

    const failed = await walk(user.id, b, { passFinal: false });
    expect("passed" in failed && failed.passed).toBe(false);
    let e = await lms.certificateEligibility(user.id, b.course.id);
    expect(e).toMatchObject({ hasFinal: true, finalPassed: false, lessonsLeft: 1, eligible: false, finalBestScore: 50 });
    expect(await prisma.certificate.findFirst({ where: { userId: user.id, courseId: b.course.id } })).toBeNull();

    const passed = await lms.submitQuiz(user.id, b.finalQuizId!, [0, 1]);
    expect(passed.passed).toBe(true);
    expect(passed.lesson?.courseCompleted).toBe(true);
    e = await lms.certificateEligibility(user.id, b.course.id);
    expect(e.eligible).toBe(true);
    const certs = await prisma.certificate.findMany({ where: { userId: user.id, courseId: b.course.id } });
    expect(certs).toHaveLength(1);
    expect(certs[0].serial).toMatch(/^TH-\d{4}-[0-9A-F]{8}$/);
  });

  it("a programme without a final assessment completes but issues no certificate", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { final: false });
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    const r = await walk(user.id, b, { passFinal: true });
    expect("courseCompleted" in r && r.courseCompleted).toBe(true);
    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
    expect(enrollment.status).toBe("COMPLETED");
    expect(await prisma.certificate.findFirst({ where: { userId: user.id, courseId: b.course.id } })).toBeNull();
    expect((await lms.certificateEligibility(user.id, b.course.id)).hasFinal).toBe(false);
  });
});

describe("Reviews", () => {
  it("needs enrolment and one completed module; one per member, editable; hidden ones do not count", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();

    await expect(learner.saveReview(user.id, b.course.id, { rating: 5 })).rejects.toBeInstanceOf(ReviewNotAllowedError);
    await lms.enroll(user.id, b.course.slug);
    await lms.completeLesson(user.id, b.read1.id);
    expect((await learner.reviewEligibility(user.id, b.course.id)).canReview).toBe(false);
    await expect(learner.saveReview(user.id, b.course.id, { rating: 5 })).rejects.toThrow(/first module/);

    await lms.submitQuiz(user.id, b.quiz1Id, [1]); // module one complete
    const r1 = await learner.saveReview(user.id, b.course.id, { rating: 4, body: "Solid." });
    const r2 = await learner.saveReview(user.id, b.course.id, { rating: 2, body: "" });
    expect(r2.id).toBe(r1.id);
    expect(r2.rating).toBe(2);
    expect(r2.body).toBeNull();
    expect(await prisma.courseReview.count({ where: { courseId: b.course.id } })).toBe(1);
    await expect(learner.saveReview(user.id, b.course.id, { rating: 6 })).rejects.toThrow();

    expect(await learner.rating(b.course.id)).toEqual({ average: 2, count: 1 });
    const moderator = await staff("MODERATOR");
    await authoring.setReviewHidden(moderator, r1.id, true);
    expect(await learner.rating(b.course.id)).toEqual({ average: null, count: 0 });
    const plain = await createTestUser();
    await expect(authoring.setReviewHidden({ id: plain.id, role: "MEMBER" }, r1.id, false)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("Enrolment promotes MEMBER → STUDENT", () => {
  it("promotes a member on first enrolment and never demotes staff", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    expect(user.role).toBe("MEMBER");
    await lms.enroll(user.id, b.course.slug);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("STUDENT");

    const mod = await staff("MODERATOR");
    await lms.enroll(mod.id, b.course.slug);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: mod.id } })).role).toBe("MODERATOR");
  });

  it("an unenrolled member still cannot complete lessons", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await expect(lms.completeLesson(user.id, b.read1.id)).rejects.toBeInstanceOf(NotEnrolledError);
  });
});

describe("History and recommendations", () => {
  it("lists completed lessons newest first", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    await lms.completeLesson(user.id, b.read1.id);
    await lms.submitQuiz(user.id, b.quiz1Id, [1]);
    const h = await learner.history(user.id);
    expect(h.map((x) => x.lesson.id)).toEqual([b.quiz1.id, b.read1.id]);
  });

  it("ranks programmes by onboarding goals and interests", () => {
    const courses = [
      { pillar: "WARRIOR" as const, sortOrder: 0 },
      { pillar: "BUILDER" as const, sortOrder: 1 },
      { pillar: "TYCOON" as const, sortOrder: 2 },
      { pillar: "MIND" as const, sortOrder: 3 },
    ];
    expect(rankBySignals(courses, ["Master my finances"], ["Mindfulness"]).map((c) => c.pillar)).toEqual(["TYCOON", "MIND", "WARRIOR", "BUILDER"]);
    expect(rankBySignals(courses, [], []).map((c) => c.pillar)).toEqual(["WARRIOR", "BUILDER", "TYCOON", "MIND"]);
  });
});

describe("Instructors", () => {
  it("creates, updates and deletes; deleting unlinks the course", async () => {
    const admin = await staff();
    const i = await authoring.createInstructor(admin, { slug: `i-${uid().slice(0, 8)}`, name: "Test Teacher", bio: "Teaches tests for a living." });
    instructors.push(i.id);
    const b = await buildCourse(admin, { publish: false });
    await authoring.updateCourse(admin, b.course.id, {
      title: b.course.title,
      slug: b.course.slug,
      pillar: "MIND",
      description: b.course.description,
      instructorId: i.id,
    });
    await authoring.updateInstructor(admin, i.id, { slug: i.slug, name: "Renamed", bio: "Still teaches tests." });
    expect((await prisma.instructor.findUniqueOrThrow({ where: { id: i.id } })).name).toBe("Renamed");
    await authoring.deleteInstructor(admin, i.id);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: b.course.id } })).instructorId).toBeNull();
  });
});

describe("Academy seed safety guard", () => {
  it("rebuilds an untouched course, refuses one with progress, unless forced", () => {
    expect(academyRebuildDecision({ slug: "warrior", progressRows: 0, force: undefined })).toEqual({ rebuild: true });
    const refused = academyRebuildDecision({ slug: "warrior", progressRows: 3, force: undefined });
    expect(refused.rebuild).toBe(false);
    if (!refused.rebuild) expect(refused.reason).toMatch(/SEED_ACADEMY_FORCE=1/);
    expect(academyRebuildDecision({ slug: "warrior", progressRows: 3, force: "true" }).rebuild).toBe(false);
    expect(academyRebuildDecision({ slug: "warrior", progressRows: 3, force: "1" })).toEqual({ rebuild: true });
  });
});
