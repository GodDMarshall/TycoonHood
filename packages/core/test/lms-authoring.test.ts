/**
 * Course authoring, publish gating, draft invisibility, certificates gated on
 * the final assessment, reviews, role promotion on enrolment, and the
 * academy seed's safety guard. Every course here is a throwaway created and
 * deleted by this file; the house programmes are only read.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LmsService, CourseUnavailableError, NotEnrolledError, QuizRequiredError, questionsForMember } from "../src/lms/lms";
import {
  CourseAuthoringService,
  AuthoringError,
  LessonHasProgressError,
  PublishBlockedError,
  courseInputSchema,
  lessonInputSchema,
  type AuthoringActor,
} from "../src/lms/authoring";
import { CommunityService } from "../src/community/community";
import { countEvidence } from "../src/rules/counters";
import { parseCriteria, weekKey } from "../src/rules/criteria";
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

// ─────────────────────────── completion that cannot get stuck

const notesTitled = (userId: string, title: string) => prisma.notification.findMany({ where: { userId, title } });

/** Lessons marked complete straight in the table: the state a member was left
 *  in when a completion failed half way, before the programme was settled. */
async function stuckProgress(userId: string, lessonIds: string[]) {
  for (const lessonId of lessonIds) await prisma.lessonProgress.create({ data: { userId, lessonId, completedAt: new Date() } });
}

/** The state an earlier build left a 0-XP programme's completer in: every
 *  lesson done and the enrolment COMPLETED, then it failed before the
 *  certificate, the "Program complete" notice and COURSE_COMPLETED. */
async function failedCompletion(userId: string, courseId: string, lessonIds: string[]) {
  await stuckProgress(userId, lessonIds);
  await prisma.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: { status: "COMPLETED", completedAt: new Date(), progressPct: 100 },
  });
}

const statusOf = async (userId: string, courseId: string) =>
  (await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId } } })).status;

/** A repeatable mission like the admin form's defaults (no window, no
 *  cooldown: once per local day). Active and global: delete it after. */
const tempMission = (criteria: object, repeatable = true) =>
  prisma.mission.create({
    data: { slug: `t-m-${uid().slice(0, 8)}`, name: "Test mission", description: "test", criteria, xpReward: 5, repeatable, active: true },
  });

/** Pays each time COURSE_COMPLETED reaches the rules for this programme. */
const courseMission = (courseId: string) => tempMission({ event: "COURSE_COMPLETED", count: 1, scope: { courseId } });

const completions = (missionId: string, userId: string) => prisma.missionCompletion.count({ where: { missionId, userId } });

/** Files a member's completions of a mission under an earlier day, so the
 *  next payment would fall in a new day's bucket: as if it were tomorrow. */
async function moveToAnEarlierDay(missionId: string, userId: string) {
  for (const c of await prisma.missionCompletion.findMany({ where: { missionId, userId } })) {
    await prisma.missionCompletion.update({ where: { id: c.id }, data: { idempotencyKey: `${c.idempotencyKey}:earlier` } });
  }
}

const courseFields = (b: Awaited<ReturnType<typeof buildCourse>>) => ({
  title: b.course.title,
  slug: b.course.slug,
  pillar: "MIND" as const,
  description: b.course.description,
});

describe("XP fields: blank means the default, 0 means nothing", () => {
  it("parses a blank XP field as the default and a typed 0 as 0", () => {
    const lesson = { title: "A lesson", type: "READING" as const };
    expect(lessonInputSchema.parse({ ...lesson, xpReward: "" }).xpReward).toBe(50);
    expect(lessonInputSchema.parse({ ...lesson, xpReward: "   " }).xpReward).toBe(50);
    expect(lessonInputSchema.parse({ ...lesson }).xpReward).toBe(50);
    expect(lessonInputSchema.parse({ ...lesson, xpReward: "0" }).xpReward).toBe(0);
    expect(lessonInputSchema.parse({ ...lesson, xpReward: "35" }).xpReward).toBe(35);
    expect(() => lessonInputSchema.parse({ ...lesson, xpReward: "-1" })).toThrow();
    const course = { title: "A programme", slug: "a-programme", pillar: "MIND" as const, description: "Long enough description." };
    expect(courseInputSchema.parse({ ...course, xpOnCompletion: "" }).xpOnCompletion).toBe(500);
    expect(courseInputSchema.parse({ ...course, xpOnCompletion: "0" }).xpOnCompletion).toBe(0);
  });

  it("a 0-XP lesson and a 0-XP programme still complete, certify and notify", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    await authoring.updateCourse(admin, b.course.id, { ...courseFields(b), xpOnCompletion: "0" });
    await authoring.updateLesson(admin, b.read2.id, { title: "Read two", type: "READING", contentMd: "More", xpReward: "0" });
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);

    await lms.completeLesson(user.id, b.read1.id);
    await lms.submitQuiz(user.id, b.quiz1Id, [1]);
    const zero = await lms.completeLesson(user.id, b.read2.id);
    expect(zero).toMatchObject({ firstCompletion: true, xpAwarded: 0 });
    // The rest of the 0-XP completion ran: progress moved on to 3 of 4.
    const mid = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
    expect(mid.progressPct).toBe(75);
    const passed = await lms.submitQuiz(user.id, b.finalQuizId!, [0, 1]);
    expect(passed.lesson?.courseCompleted).toBe(true);

    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
    expect(enrollment.status).toBe("COMPLETED");
    const cert = await prisma.certificate.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
    const [done] = await notesTitled(user.id, "Program complete: Test Programme");
    expect(done.body).toBe(`Certificate ${cert.serial} is in your certificates.`);
    // Nothing was paid for the 0-XP lesson or the 0-XP programme.
    expect(await prisma.xpEvent.count({ where: { userId: user.id, sourceId: { in: [b.read2.id, b.course.id] } } })).toBe(0);
  });
});

describe("Certificates reach every member who qualifies", () => {
  it("marking a passed knowledge check final certifies members who already finished", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { final: false });
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    await walk(user.id, b, { passFinal: true });
    expect(await prisma.certificate.findFirst({ where: { userId: user.id, courseId: b.course.id } })).toBeNull();

    await authoring.updateLesson(admin, b.quiz1.id, { title: "Check one", type: "QUIZ", isFinal: true, xpReward: 10 });

    const cert = await prisma.certificate.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
    const [note] = await notesTitled(user.id, "Certificate issued: Test Programme");
    expect(note.body).toBe(`Certificate ${cert.serial} is in your certificates.`);
    // The programme was already complete: its bonus is not paid twice.
    expect(await prisma.xpEvent.count({ where: { userId: user.id, idempotencyKey: `xp:course:${b.course.id}:${user.id}` } })).toBe(1);
    // Settling again changes nothing.
    expect(await lms.reconcile(user.id, b.course.id)).toBe(false);
    expect(await prisma.certificate.count({ where: { userId: user.id, courseId: b.course.id } })).toBe(1);
  });

  it("removing the only lesson a member had left completes the programme for them", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    await lms.completeLesson(user.id, b.read1.id);
    await lms.submitQuiz(user.id, b.quiz1Id, [1]);
    await lms.completeLesson(user.id, b.read2.id);

    await authoring.deleteLesson(admin, b.final!.id);

    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
    expect(enrollment.status).toBe("COMPLETED");
    expect(await notesTitled(user.id, "Program complete: Test Programme")).toHaveLength(1);
    expect(await prisma.xpEvent.count({ where: { userId: user.id, idempotencyKey: `xp:course:${b.course.id}:${user.id}` } })).toBe(1);
  });

  it("a knowledge check without questions cannot be clicked past; passing it later certifies", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { final: false });
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    await walk(user.id, b, { passFinal: true });

    // A final added to the live programme, its questions not written yet.
    const mf = await authoring.addModule(admin, b.course.id, { title: "Final Assessment" });
    const final = await authoring.addLesson(admin, mf.id, { title: "Final", type: "QUIZ", isFinal: true });
    await expect(lms.completeLesson(user.id, final.id)).rejects.toBeInstanceOf(QuizRequiredError);
    expect(await prisma.lessonProgress.count({ where: { userId: user.id, lessonId: final.id } })).toBe(0);

    const q = await authoring.saveQuiz(admin, final.id, { passScore: 100, questions: [{ prompt: "Sky colour?", options: ["Blue", "Red"], correctIndex: 0 }] });
    const r = await lms.submitQuiz(user.id, q.id, [0]);
    expect(r.passed).toBe(true);
    expect(await prisma.certificate.count({ where: { userId: user.id, courseId: b.course.id } })).toBe(1);
  });

  it("a member left stuck mid-completion is settled by their next pass, and by reconcile", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    // Every lesson on record as complete, the programme never settled.
    await stuckProgress(user.id, [b.read1.id, b.quiz1.id, b.read2.id, b.final!.id]);

    // A retake pass of the final: nothing is paid for the lesson again, but
    // the programme completes and the certificate is issued.
    const r = await lms.submitQuiz(user.id, b.finalQuizId!, [0, 1]);
    expect(r.lesson).toMatchObject({ firstCompletion: false, courseCompleted: true, xpAwarded: 0 });
    expect(await prisma.certificate.count({ where: { userId: user.id, courseId: b.course.id } })).toBe(1);

    // Same state for another member, settled without any new activity, by two
    // racing calls: exactly one completes it, and it pays and notifies once.
    const other = await createTestUser();
    await lms.enroll(other.id, b.course.slug);
    await stuckProgress(other.id, [b.read1.id, b.quiz1.id, b.read2.id, b.final!.id]);
    await prisma.quizAttempt.create({ data: { userId: other.id, quizId: b.finalQuizId!, scorePct: 100, passed: true, answers: [0, 1] } });
    const settled = await Promise.all([lms.reconcile(other.id, b.course.id), lms.reconcile(other.id, b.course.id)]);
    expect(settled.filter(Boolean)).toHaveLength(1);
    expect(await notesTitled(other.id, "Program complete: Test Programme")).toHaveLength(1);
    expect(await prisma.xpEvent.count({ where: { userId: other.id, idempotencyKey: `xp:course:${b.course.id}:${other.id}` } })).toBe(1);
    expect(await prisma.certificate.count({ where: { userId: other.id, courseId: b.course.id } })).toBe(1);
    expect(await lms.reconcile(other.id, b.course.id)).toBe(false);
  });

  it("reconcileCourse settles only members with every lesson done", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { final: false });
    const finished = await createTestUser();
    const halfway = await createTestUser();
    for (const u of [finished, halfway]) await lms.enroll(u.id, b.course.slug);
    await stuckProgress(finished.id, [b.read1.id, b.quiz1.id, b.read2.id]);
    await stuckProgress(halfway.id, [b.read1.id]);
    expect(await lms.reconcileCourse(b.course.id)).toEqual({ checked: 1, settled: 1, failed: 0 });
    const status = async (userId: string) =>
      (await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId: b.course.id } } })).status;
    expect(await status(finished.id)).toBe("COMPLETED");
    expect(await status(halfway.id)).toBe("ACTIVE");
  });

  it("reconcileCourse re-checks only members who can be owed something", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { final: false });
    const done = await createTestUser();
    const stuck = await createTestUser();
    const unpassed = await createTestUser();
    for (const u of [done, stuck, unpassed]) await lms.enroll(u.id, b.course.slug);
    await walk(done.id, b, { passFinal: true });
    await stuckProgress(stuck.id, [b.read1.id, b.quiz1.id, b.read2.id]);
    await failedCompletion(unpassed.id, b.course.id, [b.read1.id, b.quiz1.id, b.read2.id]); // never took the check

    // Without a final, a completer is owed nothing: only the member left
    // unsettled is checked, and then nobody.
    expect(await lms.reconcileCourse(b.course.id)).toEqual({ checked: 1, settled: 1, failed: 0 });
    expect(await statusOf(stuck.id, b.course.id)).toBe("COMPLETED");
    expect(await lms.reconcileCourse(b.course.id)).toEqual({ checked: 0, settled: 0, failed: 0 });

    // With a final, only completers who passed it and hold no certificate.
    await prisma.lesson.update({ where: { id: b.quiz1.id }, data: { isFinal: true } });
    expect(await lms.reconcileCourse(b.course.id)).toEqual({ checked: 1, settled: 1, failed: 0 });
    expect(await prisma.certificate.findMany({ where: { courseId: b.course.id }, select: { userId: true } })).toEqual([{ userId: done.id }]);
    expect(await lms.reconcileCourse(b.course.id)).toEqual({ checked: 0, settled: 0, failed: 0 });
  });

  it("removing a module settles members who had only it left; a draft settles nobody until it is published", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    await walk(user.id, { ...b, final: null }, { passFinal: true }); // everything but the final
    expect(await statusOf(user.id, b.course.id)).toBe("ACTIVE");
    const { moduleId } = await prisma.lesson.findUniqueOrThrow({ where: { id: b.final!.id }, select: { moduleId: true } });
    await authoring.deleteModule(admin, moduleId);
    expect(await statusOf(user.id, b.course.id)).toBe("COMPLETED");

    const c = await buildCourse(admin);
    const other = await createTestUser();
    await lms.enroll(other.id, c.course.slug);
    await walk(other.id, { ...c, final: null }, { passFinal: true });
    await authoring.unpublish(admin, c.course.id);
    await authoring.deleteLesson(admin, c.final!.id);
    expect(await statusOf(other.id, c.course.id)).toBe("ACTIVE");
    await authoring.publish(admin, c.course.id);
    expect(await statusOf(other.id, c.course.id)).toBe("COMPLETED");
    expect(await notesTitled(other.id, "Program complete: Test Programme")).toHaveLength(1);
  });

  it("a late certificate is announced once, even when two settles race", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { final: false });
    const mission = await courseMission(b.course.id);
    try {
      const user = await createTestUser();
      await lms.enroll(user.id, b.course.slug);
      await walk(user.id, b, { passFinal: true });
      expect(await completions(mission.id, user.id)).toBe(1);
      await moveToAnEarlierDay(mission.id, user.id);
      // The check they passed becomes the final, with nobody settled yet.
      await prisma.lesson.update({ where: { id: b.quiz1.id }, data: { isFinal: true } });

      const settled = await Promise.all([lms.reconcile(user.id, b.course.id), lms.reconcile(user.id, b.course.id)]);
      expect(settled.filter(Boolean)).toHaveLength(1);
      const cert = await prisma.certificate.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
      const notes = await notesTitled(user.id, "Certificate issued: Test Programme");
      expect(notes.map((n) => n.body)).toEqual([`Certificate ${cert.serial} is in your certificates.`]);
      // Its completion was announced when it happened, so not again.
      expect(await notesTitled(user.id, "Program complete: Test Programme")).toHaveLength(1);
      expect(await completions(mission.id, user.id)).toBe(1);
      // Only the call that writes a certificate says it created it.
      expect(await lms.issueCertificateIfEligible(user.id, b.course.id)).toEqual({ certificate: cert, created: false });
    } finally {
      await prisma.mission.delete({ where: { id: mission.id } });
    }
  });

  it("a completion that failed before it was announced is announced once, with its late certificate", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    await authoring.updateCourse(admin, b.course.id, { ...courseFields(b), xpOnCompletion: "0" });
    const mission = await courseMission(b.course.id);
    try {
      const user = await createTestUser();
      await lms.enroll(user.id, b.course.slug);
      await failedCompletion(user.id, b.course.id, [b.read1.id, b.quiz1.id, b.read2.id, b.final!.id]);
      await prisma.quizAttempt.create({ data: { userId: user.id, quizId: b.finalQuizId!, scorePct: 100, passed: true, answers: [0, 1] } });

      expect(await lms.reconcile(user.id, b.course.id)).toBe(true);
      const cert = await prisma.certificate.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: b.course.id } } });
      const [note, ...more] = await notesTitled(user.id, "Program complete: Test Programme");
      expect(more).toHaveLength(0);
      expect(note.body).toBe(`Certificate ${cert.serial} is in your certificates.`);
      expect(await notesTitled(user.id, "Certificate issued: Test Programme")).toHaveLength(0);
      expect(await completions(mission.id, user.id)).toBe(1); // COURSE_COMPLETED, at last

      // Settling again on a later day, or the one-off repair, announces nothing more.
      await moveToAnEarlierDay(mission.id, user.id);
      expect(await lms.reconcile(user.id, b.course.id)).toBe(false);
      expect(await lms.repairUnannouncedCompletions({ courseId: b.course.id })).toEqual({ checked: 1, repaired: 0, failed: 0 });
      expect(await completions(mission.id, user.id)).toBe(1);
      expect(await notesTitled(user.id, "Program complete: Test Programme")).toHaveLength(1);
    } finally {
      await prisma.mission.delete({ where: { id: mission.id } });
    }
  });

  it("the one-off repair announces a failed completion once, and a page view never does", async () => {
    const admin = await staff();
    const b = await buildCourse(admin, { final: false });
    await authoring.updateCourse(admin, b.course.id, { ...courseFields(b), xpOnCompletion: "0" });
    const mission = await courseMission(b.course.id);
    try {
      const stuck = await createTestUser();
      const fine = await createTestUser();
      for (const u of [stuck, fine]) await lms.enroll(u.id, b.course.slug);
      await failedCompletion(stuck.id, b.course.id, [b.read1.id, b.quiz1.id, b.read2.id]);
      await walk(fine.id, b, { passFinal: true });
      expect(await completions(mission.id, fine.id)).toBe(1);

      // Opening the programme (reconcile) owes and announces nothing here.
      expect(await lms.reconcile(stuck.id, b.course.id)).toBe(false);
      expect(await completions(mission.id, stuck.id)).toBe(0);

      expect(await lms.repairUnannouncedCompletions({ courseId: b.course.id })).toEqual({ checked: 2, repaired: 1, failed: 0 });
      const [note] = await notesTitled(stuck.id, "Program complete: Test Programme");
      expect(note.body).toBe("You finished every lesson.");
      expect(await completions(mission.id, stuck.id)).toBe(1);
      expect(await notesTitled(fine.id, "Program complete: Test Programme")).toHaveLength(1);
      expect(await completions(mission.id, fine.id)).toBe(1);
      expect(await prisma.xpEvent.count({ where: { source: "COURSE_COMPLETED", sourceId: b.course.id } })).toBe(0);

      // Run again, on a later day: nothing changes.
      await moveToAnEarlierDay(mission.id, stuck.id);
      expect(await lms.repairUnannouncedCompletions({ courseId: b.course.id })).toEqual({ checked: 2, repaired: 0, failed: 0 });
      expect(await completions(mission.id, stuck.id)).toBe(1);
      expect(await notesTitled(stuck.id, "Program complete: Test Programme")).toHaveLength(1);
    } finally {
      await prisma.mission.delete({ where: { id: mission.id } });
    }
  });
});

describe("Knowledge checks: what reaches the browser, and what counts", () => {
  it("an attempt's review and the lesson's questions never carry the answer key", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    const failed = await walk(user.id, b, { passFinal: false });
    if (!("review" in failed)) throw new Error("expected a scored attempt");
    expect(failed.review).toEqual([
      { prompt: "Sky colour?", correct: true, explanation: null },
      { prompt: "Grass colour?", correct: false, explanation: null },
    ]);
    expect(JSON.stringify(failed)).not.toMatch(/correctIndex|yourAnswer/);

    const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: b.quiz1Id }, include: { questions: true } });
    const shown = questionsForMember(quiz.questions);
    expect(shown).toEqual([{ prompt: "Two plus two?", options: ["3", "4"] }]);
    expect(JSON.stringify(shown)).not.toMatch(/correctIndex|explanation|Arithmetic/);
  });

  it("passing two different checks in a week pays a weekly quiz mission; a retake adds nothing", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    const mission = await prisma.mission.create({
      data: {
        slug: `t-quiz-${uid().slice(0, 8)}`,
        name: "Two checks this week",
        description: "test",
        criteria: { event: "QUIZ_PASSED", count: 2, within: "week" },
        xpReward: 5,
        repeatable: true,
        active: true,
      },
    });
    try {
      await lms.enroll(user.id, b.course.slug);
      await lms.completeLesson(user.id, b.read1.id);
      await lms.submitQuiz(user.id, b.quiz1Id, [1]);
      await lms.submitQuiz(user.id, b.quiz1Id, [1]); // a retake of the same check
      expect(await prisma.missionCompletion.count({ where: { userId: user.id, missionId: mission.id } })).toBe(0);

      await lms.completeLesson(user.id, b.read2.id);
      await lms.submitQuiz(user.id, b.finalQuizId!, [0, 1]);
      const done = await prisma.missionCompletion.findMany({ where: { userId: user.id, missionId: mission.id } });
      expect(done).toHaveLength(1);
      expect(done[0].idempotencyKey).toBe(`mission:${mission.id}:${user.id}:${weekKey(new Date())}`);
    } finally {
      await prisma.mission.delete({ where: { id: mission.id } });
    }
  });

  it("retaking a check already passed never pays a repeatable quiz mission again; first reaching a minimum score does, once", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    // A check a retake can score better on: one of two right passes.
    await authoring.saveQuiz(admin, b.quiz1.id, {
      passScore: 50,
      questions: [
        { prompt: "Two plus two?", options: ["3", "4"], correctIndex: 1 },
        { prompt: "Three plus three?", options: ["6", "7"], correctIndex: 0 },
      ],
    });
    const anyPass = await tempMission({ event: "QUIZ_PASSED", count: 1 });
    const perfect = await tempMission({ event: "QUIZ_PASSED", count: 1, minScore: 100 });
    try {
      const user = await createTestUser();
      await lms.enroll(user.id, b.course.slug);
      await lms.completeLesson(user.id, b.read1.id);
      expect((await lms.submitQuiz(user.id, b.quiz1Id, [1, 1])).scorePct).toBe(50);
      expect(await completions(anyPass.id, user.id)).toBe(1);
      expect(await completions(perfect.id, user.id)).toBe(0);

      // Another day: the same pass again, then a better one. Neither is a new
      // check; only the better one reaches 100% on it for the first time.
      await moveToAnEarlierDay(anyPass.id, user.id);
      await lms.submitQuiz(user.id, b.quiz1Id, [1, 1]);
      expect((await lms.submitQuiz(user.id, b.quiz1Id, [1, 0])).scorePct).toBe(100);
      expect(await completions(anyPass.id, user.id)).toBe(1);
      expect(await completions(perfect.id, user.id)).toBe(1);
      await moveToAnEarlierDay(perfect.id, user.id);
      await lms.submitQuiz(user.id, b.quiz1Id, [1, 0]);
      expect(await completions(perfect.id, user.id)).toBe(1);

      // A check passed for the first time is new: both pay again.
      await lms.completeLesson(user.id, b.read2.id);
      await lms.submitQuiz(user.id, b.finalQuizId!, [0, 1]);
      expect(await completions(anyPass.id, user.id)).toBe(2);
      expect(await completions(perfect.id, user.id)).toBe(2);
    } finally {
      await prisma.mission.deleteMany({ where: { id: { in: [anyPass.id, perfect.id] } } });
    }
  });

  it("a pass reaches the rules even when completing its lesson fails", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const mission = await tempMission({ event: "QUIZ_PASSED", count: 1 }, false);
    const user = await createTestUser();
    await lms.enroll(user.id, b.course.slug);
    await lms.completeLesson(user.id, b.read1.id);
    const failing = vi.spyOn(lms, "completeLesson").mockRejectedValueOnce(new Error("lesson failed"));
    try {
      await expect(lms.submitQuiz(user.id, b.quiz1Id, [1])).rejects.toThrow("lesson failed");
      expect(await completions(mission.id, user.id)).toBe(1);
    } finally {
      failing.mockRestore();
      await prisma.mission.delete({ where: { id: mission.id } });
    }
  });

  it("counts each check once, in the window of its first pass", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const user = await createTestUser();
    const now = new Date("2099-06-17T12:00:00Z");
    const at = (iso: string) => new Date(iso);
    const attempt = (quizId: string, scorePct: number, createdAt: Date) =>
      prisma.quizAttempt.create({ data: { userId: user.id, quizId, scorePct, passed: true, answers: [], createdAt } });
    await attempt(b.quiz1Id, 70, at("2099-06-08T10:00:00Z")); // first passed last week
    await attempt(b.quiz1Id, 100, at("2099-06-16T10:00:00Z")); // retaken this week
    await attempt(b.finalQuizId!, 100, at("2099-06-16T11:00:00Z")); // first passed this week
    await attempt(b.finalQuizId!, 100, at("2099-06-17T09:00:00Z")); // and again

    const c = (o: object) => parseCriteria({ event: "QUIZ_PASSED", ...o });
    expect(await countEvidence(prisma, user.id, c({ count: 2, within: "week" }), now)).toBe(1);
    expect(await countEvidence(prisma, user.id, c({ count: 2 }), now)).toBe(2);
    // At 80%+, quiz1's first qualifying pass is the retake, this week.
    expect(await countEvidence(prisma, user.id, c({ count: 2, within: "week", minScore: 80 }), now)).toBe(2);
  });
});

describe("Ask about this lesson", () => {
  it("finds the programme's questions channel from the lesson, even after a slug change", async () => {
    const admin = await staff();
    const b = await buildCourse(admin);
    const community = new CommunityService(prisma);
    const channel = await prisma.channel.create({
      data: { slug: `${b.course.slug}-questions`, name: "Questions", kind: "QUESTIONS", courseId: b.course.id },
    });
    await authoring.updateCourse(admin, b.course.id, { ...courseFields(b), slug: `${b.course.slug}-renamed` });

    expect(await community.questionsChannelFor(b.read2.id)).toEqual({ slug: channel.slug });
    const user = await createTestUser();
    await lms.enroll(user.id, `${b.course.slug}-renamed`);
    const found = (await community.questionsChannelFor(b.read1.id))!;
    const posted = await community.post({ id: user.id, role: "STUDENT" }, found.slug, { body: "Why does this work?", lessonId: b.read1.id });
    expect(posted.body).toBe("Why does this work?");

    // No open questions channel: nothing to post to.
    await prisma.channel.update({ where: { id: channel.id }, data: { archivedAt: new Date() } });
    expect(await community.questionsChannelFor(b.read1.id)).toBeNull();
  });
});
