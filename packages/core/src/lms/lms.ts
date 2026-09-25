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

export class NotEnrolledError extends Error {}

export class LmsService {
  private xp: XpService;
  private streaks: StreakService;

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.xp = new XpService(db);
    this.streaks = new StreakService(db);
  }

  async enroll(userId: string, courseSlug: string) {
    const course = await this.db.course.findUniqueOrThrow({ where: { slug: courseSlug } });
    return this.db.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: {},
      create: { userId, courseId: course.id },
    });
  }

  /** Marks a lesson complete; first completion pays XP, touches the streak,
   *  fires the first-lesson mission, and may complete the course. */
  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.db.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    const course = lesson.module.course;

    const enrollment = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (!enrollment) throw new NotEnrolledError("Enroll in the program before completing lessons.");

    const existing = await this.db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const firstCompletion = !existing?.completedAt;

    await this.db.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completedAt: existing?.completedAt ?? new Date() },
      create: { userId, lessonId, completedAt: new Date() },
    });

    let courseCompleted = false;
    if (firstCompletion) {
      await this.xp.awardXp({
        userId,
        amount: lesson.xpReward,
        source: "LESSON_COMPLETED",
        sourceId: lesson.id,
        idempotencyKey: `xp:lesson:${lesson.id}:${userId}`,
      });
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
    }

    return { firstCompletion, courseCompleted, xpAwarded: firstCompletion ? lesson.xpReward : 0 };
  }

  /** Recomputes progressPct; completes the course when everything is done. */
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
      await this.completeCourse(userId, courseId);
      return true;
    }
    return false;
  }

  private async completeCourse(userId: string, courseId: string) {
    const course = await this.db.course.findUniqueOrThrow({ where: { id: courseId } });

    await this.db.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await this.xp.awardXp({
      userId,
      amount: course.xpOnCompletion,
      source: "COURSE_COMPLETED",
      sourceId: courseId,
      idempotencyKey: `xp:course:${courseId}:${userId}`,
    });

    // Certificate — unique(userId, courseId) makes retries clean.
    try {
      await this.db.certificate.create({
        data: {
          userId,
          courseId,
          serial: `TH-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }

    await this.db.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: `Program complete: ${course.title}`,
        body: `+${course.xpOnCompletion} XP. Your certificate is on your dashboard.`,
        data: { courseId },
      },
    });

    const { events: bus } = await import("../events/bus");
    await bus.emit({ type: "COURSE_COMPLETED", userId, courseId });
  }

  /** Scores a quiz attempt; passing completes the quiz's lesson. */
  async submitQuiz(userId: string, quizId: string, answers: number[]) {
    const quiz = await this.db.quiz.findUniqueOrThrow({
      where: { id: quizId },
      include: { questions: { orderBy: { sortOrder: "asc" } }, lesson: true },
    });

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
      lessonResult = await this.completeLesson(userId, quiz.lessonId);
    }

    return {
      scorePct,
      passed,
      passScore: quiz.passScore,
      correct,
      total: quiz.questions.length,
      lesson: lessonResult,
      review: quiz.questions.map((q, i) => ({
        prompt: q.prompt,
        yourAnswer: answers[i],
        correctIndex: q.correctIndex,
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
