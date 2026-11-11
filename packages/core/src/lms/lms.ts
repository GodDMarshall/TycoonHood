/**
 * LMS SERVICE (spec §12–§13) — enrollment, progress, quizzes, certificates.
 * Completion is idempotent everywhere: XP keys, mission keys, and the
 * certificate's unique constraint make retries and double-clicks harmless.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { XpService } from "../gamification/xp";
import { StreakService } from "../gamification/streaks";
import { randomBytes } from "node:crypto";
import { gateLessons } from "./gating";
import { promoteTo } from "../auth/permissions";

export class NotEnrolledError extends Error {}
/** The lesson is behind one the member has not finished. */
export class LessonLockedError extends Error {}
/** A lesson with a knowledge check completes only by passing it. */
export class QuizRequiredError extends Error {}
/** The program is not published (DRAFT or ARCHIVED): members cannot see or join it. */
export class CourseUnavailableError extends Error {}

/**
 * What stands between a member and the certificate. A certificate is issued
 * only when every lesson is complete AND the programme's final assessment
 * (the lesson marked isFinal) has a passing attempt. A programme without a
 * final assessment completes (XP, status) but issues no certificate.
 */
export interface CertificateEligibility {
  totalLessons: number;
  completedLessons: number;
  lessonsLeft: number;
  hasFinal: boolean;
  finalLessonId: string | null;
  finalTitle: string | null;
  finalPassed: boolean;
  /** Best score on the final assessment so far, if attempted. */
  finalBestScore: number | null;
  eligible: boolean;
}

/** One question of a scored attempt, as the member sees it. No answer key. */
export interface QuizReviewItem {
  prompt: string;
  correct: boolean;
  explanation: string | null;
}

/** A knowledge check's questions as the lesson page sends them to the
 *  browser: the prompt and the options, never the answer or explanation. */
export function questionsForMember(questions: { prompt: string; options: unknown }[]) {
  return questions.map((q) => ({
    prompt: q.prompt,
    options: Array.isArray(q.options) ? q.options.map(String) : [],
  }));
}

export class LmsService {
  private xp: XpService;
  private streaks: StreakService;

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.xp = new XpService(db);
    this.streaks = new StreakService(db);
  }

  /**
   * Free enrolment (DR-6 still open: every published programme is free).
   * DRAFT and ARCHIVED programmes cannot be joined. A member's first
   * enrolment promotes MEMBER → STUDENT (never demotes a staff role).
   */
  async enroll(userId: string, courseSlug: string) {
    const course = await this.db.course.findUnique({ where: { slug: courseSlug } });
    if (!course || course.status !== "PUBLISHED") {
      throw new CourseUnavailableError("This program is not open for enrolment.");
    }
    const enrollment = await this.db.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: {},
      create: { userId, courseId: course.id },
    });
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user) {
      const next = promoteTo(user.role, "STUDENT");
      if (next !== user.role) await this.db.user.update({ where: { id: userId }, data: { role: next } });
    }
    return enrollment;
  }

  /** What is left before this member's certificate can be issued. */
  async certificateEligibility(userId: string, courseId: string): Promise<CertificateEligibility> {
    const lessons = await this.db.lesson.findMany({
      where: { module: { courseId } },
      select: {
        id: true,
        title: true,
        isFinal: true,
        quiz: { select: { id: true } },
        progress: { where: { userId }, select: { completedAt: true } },
      },
    });
    const completedLessons = lessons.filter((l) => !!l.progress[0]?.completedAt).length;
    const final = lessons.find((l) => l.isFinal) ?? null;
    let finalPassed = false;
    let finalBestScore: number | null = null;
    if (final?.quiz) {
      const best = await this.db.quizAttempt.findFirst({
        where: { userId, quizId: final.quiz.id },
        orderBy: { scorePct: "desc" },
        select: { scorePct: true, passed: true },
      });
      finalBestScore = best?.scorePct ?? null;
      finalPassed = !!(await this.db.quizAttempt.findFirst({ where: { userId, quizId: final.quiz.id, passed: true }, select: { id: true } }));
    }
    const lessonsLeft = lessons.length - completedLessons;
    return {
      totalLessons: lessons.length,
      completedLessons,
      lessonsLeft,
      hasFinal: !!final,
      finalLessonId: final?.id ?? null,
      finalTitle: final?.title ?? null,
      finalPassed,
      finalBestScore,
      eligible: lessons.length > 0 && lessonsLeft === 0 && !!final && finalPassed,
    };
  }

  /**
   * Settles one member's standing in a programme when it can change without
   * a new lesson completion: an author marks a final, removes a lesson, or
   * republishes. Completes the programme and issues the certificate if the
   * member now qualifies. Idempotent; nothing is paid twice. Returns true
   * when it completed the programme or issued a certificate.
   */
  async reconcile(userId: string, courseId: string): Promise<boolean> {
    const [enrollment, course, certificate] = await Promise.all([
      this.db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { status: true } }),
      this.db.course.findUnique({ where: { id: courseId }, select: { status: true, title: true } }),
      this.db.certificate.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { id: true } }),
    ]);
    if (!enrollment || course?.status !== "PUBLISHED") return false;
    if (enrollment.status !== "COMPLETED") return this.refreshProgress(userId, courseId);
    if (certificate) return false;
    // Completed already (bonus paid): the certificate is all that can be owed.
    const issued = await this.issueCertificateIfEligible(userId, courseId);
    if (!issued) return false;
    await this.db.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: `Certificate issued: ${course.title}`,
        body: `Certificate ${issued.serial} is in your certificates.`,
        data: { courseId, href: `/certificates/${issued.serial}` },
      },
    });
    return true;
  }

  /**
   * Reconciles every member of a published programme who has every lesson
   * done. Fail-soft per member, so one bad row cannot stop the rest.
   */
  async reconcileCourse(courseId: string) {
    const out = { checked: 0, settled: 0, failed: 0 };
    const course = await this.db.course.findUnique({ where: { id: courseId }, select: { status: true } });
    if (course?.status !== "PUBLISHED") return out;
    const total = await this.db.lesson.count({ where: { module: { courseId } } });
    if (total === 0) return out;
    const [done, certified] = await Promise.all([
      this.db.lessonProgress.groupBy({
        by: ["userId"],
        where: { completedAt: { not: null }, lesson: { module: { courseId } } },
        _count: { _all: true },
      }),
      this.db.certificate.findMany({ where: { courseId }, select: { userId: true } }),
    ]);
    const holders = new Set(certified.map((c) => c.userId)); // nothing left to owe them
    for (const row of done) {
      if (row._count._all < total || holders.has(row.userId)) continue;
      out.checked++;
      try {
        if (await this.reconcile(row.userId, courseId)) out.settled++;
      } catch {
        out.failed++;
      }
    }
    return out;
  }

  /** Issues the certificate when (and only when) the member is eligible. Idempotent. */
  async issueCertificateIfEligible(userId: string, courseId: string) {
    const existing = await this.db.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (existing) return existing;
    const e = await this.certificateEligibility(userId, courseId);
    if (!e.eligible) return null;
    try {
      return await this.db.certificate.create({
        data: {
          userId,
          courseId,
          serial: `TH-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`,
        },
      });
    } catch (err) {
      // unique(userId, courseId) makes a concurrent retry clean.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return this.db.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
      }
      throw err;
    }
  }

  /**
   * The gate for one lesson: done, open, or locked behind an earlier one.
   * The same rule the course page draws, so the server and the screen
   * cannot disagree about what is open.
   */
  async lessonGate(userId: string, courseId: string, lessonId: string) {
    const lessons = await this.db.lesson.findMany({
      where: { module: { courseId } },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        module: { select: { sortOrder: true } },
        progress: { where: { userId }, select: { completedAt: true } },
      },
    });
    const gates = gateLessons(
      lessons.map((l) => ({
        id: l.id,
        title: l.title,
        sortOrder: l.sortOrder,
        moduleSortOrder: l.module.sortOrder,
        completed: !!l.progress[0]?.completedAt,
      }))
    );
    return gates.get(lessonId) ?? { state: "locked" as const };
  }

  /** Marks a lesson complete; first completion pays XP, touches the streak,
   *  fires the first-lesson mission, and may complete the course. A repeat
   *  (a retake pass, a double click) pays nothing, but still settles the
   *  course, which may have become completable since.
   *  Lessons complete in order, and a lesson with a knowledge check completes
   *  only through `submitQuiz` (`viaQuiz`). */
  async completeLesson(userId: string, lessonId: string, opts: { viaQuiz?: boolean } = {}) {
    const lesson = await this.db.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { module: { include: { course: true } }, quiz: { select: { id: true } } },
    });
    const course = lesson.module.course;

    const enrollment = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (!enrollment) throw new NotEnrolledError("Enroll in the program before completing lessons.");
    if (course.status !== "PUBLISHED") throw new CourseUnavailableError("This program is not open right now.");

    if (lesson.quiz && !opts.viaQuiz) {
      throw new QuizRequiredError("Pass the knowledge check to complete this lesson.");
    }
    // A knowledge check whose questions are not written yet cannot be
    // clicked past: it completes by passing it, once it exists.
    if (lesson.type === "QUIZ" && !lesson.quiz) {
      throw new QuizRequiredError("This knowledge check is not ready yet.");
    }

    const existing = await this.db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const firstCompletion = !existing?.completedAt;

    if (firstCompletion) {
      const gate = await this.lessonGate(userId, course.id, lessonId);
      if (gate.state === "locked") {
        throw new LessonLockedError(
          gate.blockedBy ? `Finish “${gate.blockedBy.title}” first.` : "This lesson is not open yet."
        );
      }
    }

    await this.db.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completedAt: existing?.completedAt ?? new Date() },
      create: { userId, lessonId, completedAt: new Date() },
    });

    let courseCompleted: boolean;
    if (firstCompletion) {
      // A lesson an author set to 0 XP pays nothing (awardXp refuses 0); the
      // rest of the completion must still run.
      if (lesson.xpReward > 0) {
        await this.xp.awardXp({
          userId,
          amount: lesson.xpReward,
          source: "LESSON_COMPLETED",
          sourceId: lesson.id,
          idempotencyKey: `xp:lesson:${lesson.id}:${userId}`,
        });
      }
      await this.streaks.touch(userId);
      courseCompleted = await this.refreshProgress(userId, course.id);

      // One event, any number of rules. "first-lesson" used to be hard-coded
      // here; now a mission that says {event:"LESSON_COMPLETED", count:5} works
      // without touching this file (spec §17).
      const { events } = await import("../events/bus");
      await events.emit({
        type: "LESSON_COMPLETED",
        userId,
        lessonId: lesson.id,
        courseId: course.id,
      });

      // A referral qualifies on real work, never on signup (spec §17).
      // Fail-soft: a referral problem must never break a lesson.
      try {
        const { ReferralService } = await import("../growth/referrals");
        await new ReferralService(this.db).qualify(userId);
      } catch {
        // The member finished their lesson; that is what matters here.
      }

      // "Study" on the daily standard ticks itself from the real thing.
      // Fail-soft for the same reason.
      try {
        const { StandardService } = await import("../standard/standard");
        await new StandardService(this.db).autoTick(userId, "LESSON_COMPLETED");
      } catch {
        // The lesson is complete regardless.
      }
    } else {
      // Already complete: nothing is paid again. But the programme may have
      // become completable since (its final passed on a retake, a lesson
      // removed, a final marked), so settle it now. Idempotent.
      courseCompleted = await this.refreshProgress(userId, course.id);
    }

    return { firstCompletion, courseCompleted, xpAwarded: firstCompletion ? lesson.xpReward : 0 };
  }

  /** Recomputes progressPct; completes the course when everything is done.
   *  True only for the call that completed it. */
  private async refreshProgress(userId: string, courseId: string): Promise<boolean> {
    const [lessonIds, completed] = await Promise.all([
      this.db.lesson.findMany({
        where: { module: { courseId } },
        select: { id: true },
      }),
      this.db.lessonProgress.count({
        where: { userId, completedAt: { not: null }, lesson: { module: { courseId } } },
      }),
    ]);
    const total = lessonIds.length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const enrollment = await this.db.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { progressPct: pct },
    });

    if (pct === 100 && enrollment.status !== "COMPLETED") {
      return this.completeCourse(userId, courseId);
    }
    // Completed before a final assessment existed (added later by an author):
    // passing it now still earns the certificate.
    if (pct === 100) await this.issueCertificateIfEligible(userId, courseId);
    return false;
  }

  /** Completes the programme exactly once: only the call that moves the
   *  enrolment to COMPLETED pays the bonus, notifies and emits, even when
   *  two completions race. Returns whether this call did it. */
  private async completeCourse(userId: string, courseId: string): Promise<boolean> {
    const moved = await this.db.enrollment.updateMany({
      where: { userId, courseId, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (moved.count === 0) {
      await this.issueCertificateIfEligible(userId, courseId);
      return false;
    }

    const course = await this.db.course.findUniqueOrThrow({ where: { id: courseId } });

    // A programme set to 0 XP pays no bonus (awardXp refuses 0); the
    // certificate, notification and event below must still happen.
    if (course.xpOnCompletion > 0) {
      await this.xp.awardXp({
        userId,
        amount: course.xpOnCompletion,
        source: "COURSE_COMPLETED",
        sourceId: courseId,
        idempotencyKey: `xp:course:${courseId}:${userId}`,
      });
    }

    // Certificate — only with every lesson done AND the final assessment passed.
    const certificate = await this.issueCertificateIfEligible(userId, courseId);

    const body = [
      course.xpOnCompletion > 0 ? `+${course.xpOnCompletion} XP.` : null,
      certificate ? `Certificate ${certificate.serial} is in your certificates.` : null,
    ].filter(Boolean);
    await this.db.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: `Program complete: ${course.title}`,
        body: body.length ? body.join(" ") : "You finished every lesson.",
        data: certificate ? { courseId, href: `/certificates/${certificate.serial}` } : { courseId },
      },
    });

    const { events: bus } = await import("../events/bus");
    await bus.emit({ type: "COURSE_COMPLETED", userId, courseId });
    return true;
  }

  /** Scores a quiz attempt; passing completes the quiz's lesson. A quiz
   *  behind an unfinished lesson is not scored at all. */
  async submitQuiz(userId: string, quizId: string, answers: number[]) {
    const quiz = await this.db.quiz.findUniqueOrThrow({
      where: { id: quizId },
      include: { questions: { orderBy: { sortOrder: "asc" } }, lesson: { include: { module: true } } },
    });

    const enrolled = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.lesson.module.courseId } },
    });
    if (!enrolled) throw new NotEnrolledError("Enroll in the program before taking its knowledge checks.");
    const owning = await this.db.course.findUnique({ where: { id: quiz.lesson.module.courseId }, select: { status: true } });
    if (owning?.status !== "PUBLISHED") throw new CourseUnavailableError("This program is not open right now.");
    const gate = await this.lessonGate(userId, quiz.lesson.module.courseId, quiz.lessonId);
    if (gate.state === "locked") {
      throw new LessonLockedError(
        gate.blockedBy ? `Finish “${gate.blockedBy.title}” first.` : "This lesson is not open yet."
      );
    }

    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const scorePct = quiz.questions.length === 0 ? 0 : Math.round((correct / quiz.questions.length) * 100);
    const passed = scorePct >= quiz.passScore;

    await this.db.quizAttempt.create({
      data: { quizId, userId, scorePct, passed, answers },
    });

    let lessonResult = null;
    if (passed) {
      try {
        lessonResult = await this.completeLesson(userId, quiz.lessonId, { viaQuiz: true });
      } finally {
        // One event per passing attempt, even if completing the lesson failed:
        // the pass is on record. Rules decide what it is worth; the weekly
        // "pass 2 knowledge checks" counts first passes, so a retake adds
        // nothing there. Fail-soft: never throws.
        const { events } = await import("../events/bus");
        await events.emit({ type: "QUIZ_PASSED", userId, quizId, scorePct });
      }
    }

    return {
      scorePct,
      passed,
      passScore: quiz.passScore,
      correct,
      total: quiz.questions.length,
      lesson: lessonResult,
      // What the member may see after an attempt: right or wrong per
      // question, and its explanation. Never the answer key: this goes back
      // to the browser, and a throwaway attempt must not reveal the final.
      review: quiz.questions.map((q, i): QuizReviewItem => ({
        prompt: q.prompt,
        correct: answers[i] === q.correctIndex,
        explanation: q.explanation,
      })),
    };
  }

  /** Everything the course player needs, in one query. */
  async memberCourseView(userId: string, courseSlug: string) {
    const course = await this.db.course.findUnique({
      where: { slug: courseSlug },
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              include: {
                quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
                progress: { where: { userId } },
              },
            },
          },
        },
        enrollments: { where: { userId } },
        certificates: { where: { userId } },
      },
    });
    if (!course) return null;
    return {
      course,
      enrollment: course.enrollments[0] ?? null,
      certificate: course.certificates[0] ?? null,
    };
  }
}

export const lms = new LmsService();
