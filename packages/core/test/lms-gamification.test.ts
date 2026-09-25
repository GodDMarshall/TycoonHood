import { afterAll, describe, it, expect } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LmsService, NotEnrolledError } from "../src/lms/lms";
import { StreakService } from "../src/gamification/streaks";
import { ChallengeService, ChallengeError } from "../src/gamification/challenges";
import { RewardsService, MissionCooldownError } from "../src/rewards/rewards";
import { LedgerService } from "../src/ledger/ledger";
import { createTestUser, uid } from "./helpers";

const lms = new LmsService(prisma);
const streaks = new StreakService(prisma);
const challenges = new ChallengeService(prisma);
const rewards = new RewardsService(prisma);
const ledger = new LedgerService(prisma);

async function warriorLessons() {
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: "warrior" },
    include: { modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" }, include: { quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } } } } } } },
  });
  return { course, lessons: course.modules.flatMap((m) => m.lessons) };
}

describe("LMS — enrollment & lessons", () => {
  it("blocks lesson completion without enrollment", async () => {
    const user = await createTestUser();
    const { lessons } = await warriorLessons();
    await expect(lms.completeLesson(user.id, lessons[0].id)).rejects.toBeInstanceOf(NotEnrolledError);
  });

  it("first completion pays lesson XP + first-lesson mission; repeat pays nothing", async () => {
    const user = await createTestUser();
    const { lessons } = await warriorLessons();
    await lms.enroll(user.id, "warrior");

    const first = await lms.completeLesson(user.id, lessons[0].id);
    expect(first.firstCompletion).toBe(true);

    const mission = await prisma.mission.findUniqueOrThrow({ where: { slug: "first-lesson" } });
    const fresh1 = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh1.xp).toBe(lessons[0].xpReward + mission.xpReward);

    const again = await lms.completeLesson(user.id, lessons[0].id);
    expect(again.firstCompletion).toBe(false);
    const fresh2 = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh2.xp).toBe(fresh1.xp);

    const streak = await prisma.streak.findUnique({ where: { userId: user.id } });
    expect(streak?.current).toBe(1);
  });

  it("tracks progressPct across the course", async () => {
    const user = await createTestUser();
    const { course, lessons } = await warriorLessons();
    await lms.enroll(user.id, "warrior");
    await lms.completeLesson(user.id, lessons[0].id);
    await lms.completeLesson(user.id, lessons[1].id);
    const e = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    expect(e.progressPct).toBe(Math.round((2 / lessons.length) * 100));
  });
});

describe("LMS — quizzes", () => {
  it("fails below passScore without completing the lesson; passing completes it", async () => {
    const user = await createTestUser();
    const { lessons } = await warriorLessons();
    await lms.enroll(user.id, "warrior");
    const quizLesson = lessons.find((l) => l.quiz)!;
    const quiz = quizLesson.quiz!;

    const wrong = quiz.questions.map((q) => (q.correctIndex + 1) % (q.options as string[]).length);
    const fail = await lms.submitQuiz(user.id, quiz.id, wrong);
    expect(fail.passed).toBe(false);
    const progressAfterFail = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: quizLesson.id } },
    });
    expect(progressAfterFail?.completedAt ?? null).toBeNull();

    const right = quiz.questions.map((q) => q.correctIndex);
    const pass = await lms.submitQuiz(user.id, quiz.id, right);
    expect(pass.passed).toBe(true);
    expect(pass.scorePct).toBe(100);
    expect(pass.lesson?.firstCompletion).toBe(true);

    const attempts = await prisma.quizAttempt.count({ where: { userId: user.id, quizId: quiz.id } });
    expect(attempts).toBe(2);
  });
});

describe("LMS — course completion", () => {
  it("completing every lesson finishes the course: bonus XP, certificate, achievement", async () => {
    const user = await createTestUser();
    const { course, lessons } = await warriorLessons();
    await lms.enroll(user.id, "warrior");

    let courseCompleted = false;
    for (const l of lessons) {
      if (l.quiz) {
        const r = await lms.submitQuiz(user.id, l.quiz.id, l.quiz.questions.map((q) => q.correctIndex));
        courseCompleted = r.lesson?.courseCompleted ?? courseCompleted;
      } else {
        const r = await lms.completeLesson(user.id, l.id);
        courseCompleted = r.courseCompleted || courseCompleted;
      }
    }
    expect(courseCompleted).toBe(true);

    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    expect(enrollment.status).toBe("COMPLETED");
    expect(enrollment.progressPct).toBe(100);

    const cert = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    expect(cert?.serial).toMatch(/^TH-\d{4}-[0-9A-F]{8}$/);

    // XP: lessons + first-lesson mission + course bonus + first-course achievement
    const mission = await prisma.mission.findUniqueOrThrow({ where: { slug: "first-lesson" } });
    const ach = await prisma.achievement.findUniqueOrThrow({ where: { slug: "first-course" } });
    const lessonXp = lessons.reduce((n, l) => n + l.xpReward, 0);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.xp).toBe(lessonXp + mission.xpReward + course.xpOnCompletion + ach.xpReward);

    const unlocked = await prisma.userAchievement.findFirst({
      where: { userId: user.id, achievement: { slug: "first-course" } },
    });
    expect(unlocked).not.toBeNull();

    // THC: first-lesson mission + first-course achievement
    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(mission.thcReward + ach.thcReward);
  });
});

describe("Streaks & mission cooldowns", () => {
  it("consecutive days extend; a gap resets; longest survives", async () => {
    const user = await createTestUser();
    const d1 = new Date("2026-08-01T10:00:00Z");
    const d2 = new Date("2026-08-02T10:00:00Z");
    const d4 = new Date("2026-08-04T10:00:00Z");
    await streaks.touch(user.id, d1);
    await streaks.touch(user.id, d2);
    await streaks.touch(user.id, d2); // same-day idempotent
    let s = await prisma.streak.findUniqueOrThrow({ where: { userId: user.id } });
    expect(s.current).toBe(2);
    await streaks.touch(user.id, d4); // gap
    s = await prisma.streak.findUniqueOrThrow({ where: { userId: user.id } });
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });

  it("repeatable mission enforces cooldown", async () => {
    const user = await createTestUser();
    await rewards.completeMission({ userId: user.id, missionSlug: "daily-check-in" });
    await expect(
      rewards.completeMission({ userId: user.id, missionSlug: "daily-check-in" })
    ).rejects.toBeInstanceOf(MissionCooldownError);
  });
});

afterAll(async () => {
  // Keep the shared dev DB clean: park every fixture challenge out of sight.
  await prisma.challenge.updateMany({ where: { slug: { startsWith: "test-" } }, data: { lifecycle: "ARCHIVED" } });
});

describe("Challenge engine", () => {
  async function makeActiveChallenge(days: number) {
    return prisma.challenge.create({
      data: {
        slug: `test-chal-${uid().slice(0, 8)}`,
        name: "Test Sprint",
        description: "test",
        lifecycle: "ACTIVE",
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 30 * 86_400_000),
        criteria: { event: "DAILY_CHECKIN", consecutiveDays: days },
        xpReward: 100,
        thcReward: 300n,
      },
    });
  }

  it("check-in requires joining; consecutive days complete and pay once", async () => {
    const user = await createTestUser();
    const c = await makeActiveChallenge(3);
    await expect(challenges.checkIn(user.id, c.slug)).rejects.toBeInstanceOf(ChallengeError);

    await challenges.join(user.id, c.slug);
    const t0 = new Date("2026-08-10T08:00:00Z");
    const r1 = await challenges.checkIn(user.id, c.slug, t0);
    expect(r1.run).toBe(1);
    const r2 = await challenges.checkIn(user.id, c.slug, new Date("2026-08-11T08:00:00Z"));
    expect(r2.completed).toBe(false);
    const r3 = await challenges.checkIn(user.id, c.slug, new Date("2026-08-12T08:00:00Z"));
    expect(r3.completed).toBe(true);

    const p = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { userId_challengeId: { userId: user.id, challengeId: c.id } },
    });
    expect(p.status).toBe("COMPLETED");

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(300n);

    // extra check-in after completion pays nothing more
    await challenges.checkIn(user.id, c.slug, new Date("2026-08-13T08:00:00Z")).catch(() => {});
    expect(await ledger.getBalance(wallet.id)).toBe(300n);
  });

  it("lifecycle sweep fails unfinished participants when time expires", async () => {
    const user = await createTestUser();
    const c = await prisma.challenge.create({
      data: {
        slug: `test-ended-${uid().slice(0, 8)}`,
        name: "Expired",
        description: "test",
        lifecycle: "ACTIVE",
        startsAt: new Date(Date.now() - 10 * 86_400_000),
        endsAt: new Date(Date.now() - 86_400_000),
        criteria: { event: "DAILY_CHECKIN", consecutiveDays: 30 },
      },
    });
    await prisma.challengeParticipation.create({ data: { userId: user.id, challengeId: c.id } });
    await challenges.sweepLifecycles();
    const p = await prisma.challengeParticipation.findFirstOrThrow({
      where: { userId: user.id, challengeId: c.id },
    });
    expect(p.status).toBe("FAILED");
    const fresh = await prisma.challenge.findUniqueOrThrow({ where: { id: c.id } });
    expect(fresh.lifecycle).toBe("ENDED");
  });
});

describe("Challenge engine — evidence submissions", () => {
  async function makeSubmissionChallenge(event: "SUBMISSION" | "GATED_SUBMISSIONS", gates?: number) {
    return prisma.challenge.create({
      data: {
        slug: `test-sub-${uid().slice(0, 8)}`,
        name: "Evidence Test",
        description: "test",
        lifecycle: "ACTIVE",
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 30 * 86_400_000),
        criteria: event === "SUBMISSION" ? { event, kind: "test" } : { event, gates },
        xpReward: 200,
        thcReward: 500n,
      },
    });
  }

  it("SUBMISSION: submit → approve completes and pays exactly once; re-review is a no-op", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const c = await makeSubmissionChallenge("SUBMISSION");
    await challenges.join(user.id, c.slug);

    await expect(
      challenges.submit(user.id, c.slug, { text: "too short" })
    ).rejects.toBeInstanceOf(ChallengeError);

    const r = await challenges.submit(user.id, c.slug, {
      text: "I wrote the allocation plan, set the automatic transfer, and attached the sheet.",
      url: "https://example.com/plan",
    });
    expect(r.pending).toBe(1);

    const queue = await challenges.pendingSubmissions();
    const mine = queue.find((q) => q.challenge === c.slug)!;
    expect(mine).toBeDefined();

    const review = await challenges.reviewSubmission(mine.participationId, mine.submissionId, true, undefined, admin.id);
    expect(review.completed).toBe(true);

    const p = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { userId_challengeId: { userId: user.id, challengeId: c.id } },
    });
    expect(p.status).toBe("COMPLETED");
    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(500n);

    const again = await challenges.reviewSubmission(mine.participationId, mine.submissionId, true, undefined, admin.id);
    expect(again.alreadyReviewed).toBe(true);
    expect(await ledger.getBalance(wallet.id)).toBe(500n);
  });

  it("GATED_SUBMISSIONS: rejection sends feedback; completion only at the gate count", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const c = await makeSubmissionChallenge("GATED_SUBMISSIONS", 2);
    await challenges.join(user.id, c.slug);

    await challenges.submit(user.id, c.slug, { text: "Gate one evidence: offer sentence and the list of forty." });
    let q = (await challenges.pendingSubmissions()).find((x) => x.challenge === c.slug)!;
    const rej = await challenges.reviewSubmission(q.participationId, q.submissionId, false, "Name the forty.", admin.id);
    expect(rej.completed).toBe(false);
    const note = await prisma.notification.findFirst({
      where: { userId: user.id, type: "CHALLENGE", title: { contains: "needs work" } },
    });
    expect(note?.body).toContain("Name the forty");

    await challenges.submit(user.id, c.slug, { text: "Gate one, reworked: forty names attached with statuses." });
    q = (await challenges.pendingSubmissions()).find((x) => x.challenge === c.slug)!;
    const a1 = await challenges.reviewSubmission(q.participationId, q.submissionId, true, undefined, admin.id);
    expect(a1.completed).toBe(false);
    expect(a1.approved).toBe(1);

    await challenges.submit(user.id, c.slug, { text: "Gate two: five conversations done, notes and quotes attached." });
    q = (await challenges.pendingSubmissions()).find((x) => x.challenge === c.slug)!;
    const a2 = await challenges.reviewSubmission(q.participationId, q.submissionId, true, undefined, admin.id);
    expect(a2.completed).toBe(true);

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(500n);
  });

  it("late approval rescues a FAILED participant", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const c = await makeSubmissionChallenge("SUBMISSION");
    await challenges.join(user.id, c.slug);
    await challenges.submit(user.id, c.slug, { text: "Submitted right before the deadline with the full plan." });

    await prisma.challenge.update({ where: { id: c.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    await challenges.sweepLifecycles();
    let p = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { userId_challengeId: { userId: user.id, challengeId: c.id } },
    });
    expect(p.status).toBe("FAILED");

    const q = (await challenges.pendingSubmissions()).find((x) => x.challenge === c.slug)!;
    const review = await challenges.reviewSubmission(q.participationId, q.submissionId, true, undefined, admin.id);
    expect(review.completed).toBe(true);
    p = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { userId_challengeId: { userId: user.id, challengeId: c.id } },
    });
    expect(p.status).toBe("COMPLETED");
  });
});
