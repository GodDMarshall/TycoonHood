/**
 * LEARNER SIDE — reviews, learning history and recommendations.
 *
 * Reviews: only an enrolled member who has completed at least one whole
 * module may review a programme; one review per member per programme, which
 * they can edit. The account linked to the programme's instructor profile
 * never may: it teaches the programme, and its review would pad the rating
 * (directive §17). Staff can hide a review (authoring.ts); hidden reviews do
 * not count toward the average.
 */
import { z } from "zod";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { Pillar, PrismaClient } from "@tycoonhood/db";

export class ReviewNotAllowedError extends Error {}

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose 1 to 5 stars.").max(5, "Choose 1 to 5 stars."),
  body: z
    .string()
    .trim()
    .max(2000, "Keep the review under 2,000 characters.")
    .optional()
    .transform((v) => (v ? v : null)),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export interface ReviewEligibility {
  enrolled: boolean;
  completedModules: number;
  canReview: boolean;
  reason: string | null;
}

/** Onboarding goals and interests → the pillars they point at. */
const SIGNALS: Record<string, Pillar[]> = {
  "Build a business": ["BUILDER"],
  "Get in the best shape of my life": ["WARRIOR"],
  "Master my finances": ["TYCOON"],
  "Grow my income": ["BUILDER", "TYCOON"],
  "Build unshakeable discipline": ["WARRIOR", "MIND"],
  "Training & nutrition": ["WARRIOR"],
  "Combat sports": ["WARRIOR"],
  Entrepreneurship: ["BUILDER"],
  "Marketing & sales": ["BUILDER"],
  Investing: ["TYCOON"],
  "Personal finance": ["TYCOON"],
  Mindfulness: ["MIND"],
  Productivity: ["MIND", "BUILDER"],
};

/**
 * Orders programmes by how strongly the member's onboarding answers point
 * at their pillar. Goals weigh double; ties keep the catalogue order.
 */
export function rankBySignals<T extends { pillar: Pillar; sortOrder: number }>(courses: T[], goals: string[], interests: string[]): T[] {
  const score = new Map<Pillar, number>();
  const add = (labels: string[], w: number) => {
    for (const label of labels) for (const p of SIGNALS[label] ?? []) score.set(p, (score.get(p) ?? 0) + w);
  };
  add(goals, 2);
  add(interests, 1);
  return [...courses].sort((a, b) => (score.get(b.pillar) ?? 0) - (score.get(a.pillar) ?? 0) || a.sortOrder - b.sortOrder);
}

export class LearnerService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Modules in which this member has completed every lesson. */
  async completedModules(userId: string, courseId: string): Promise<number> {
    const modules = await this.db.courseModule.findMany({
      where: { courseId },
      select: { lessons: { select: { progress: { where: { userId }, select: { completedAt: true } } } } },
    });
    return modules.filter((m) => m.lessons.length > 0 && m.lessons.every((l) => !!l.progress[0]?.completedAt)).length;
  }

  async reviewEligibility(userId: string, courseId: string): Promise<ReviewEligibility> {
    const [course, enrollment] = await Promise.all([
      this.db.course.findUnique({ where: { id: courseId }, select: { instructor: { select: { userId: true } } } }),
      this.db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { id: true } }),
    ]);
    const teaches = course?.instructor?.userId != null && course.instructor.userId === userId;
    const enrolled = !!enrollment;
    const completedModules = enrolled ? await this.completedModules(userId, courseId) : 0;
    const reason = teaches
      ? "You teach this program, so you cannot review it. Its reviews come from the members who take it."
      : !enrolled
        ? "Enroll in the program to review it."
        : completedModules < 1
          ? "Finish your first module to leave a review."
          : null;
    return { enrolled, completedModules, canReview: reason === null, reason };
  }

  /** Creates or edits the member's one review of a programme. */
  async saveReview(userId: string, courseId: string, input: ReviewInput) {
    const data = reviewSchema.parse(input);
    const course = await this.db.course.findUnique({ where: { id: courseId }, select: { status: true } });
    if (!course || course.status !== "PUBLISHED") throw new ReviewNotAllowedError("This program is not open for reviews.");
    const e = await this.reviewEligibility(userId, courseId);
    if (!e.canReview) throw new ReviewNotAllowedError(e.reason ?? "You cannot review this program yet.");
    return this.db.courseReview.upsert({
      where: { courseId_userId: { courseId, userId } },
      update: { rating: data.rating, body: data.body },
      create: { courseId, userId, rating: data.rating, body: data.body },
    });
  }

  /** Average of visible reviews, rounded to one decimal, and their count. */
  async rating(courseId: string): Promise<{ average: number | null; count: number }> {
    const agg = await this.db.courseReview.aggregate({
      where: { courseId, hidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const avg = agg._avg.rating;
    return { average: avg == null ? null : Math.round(avg * 10) / 10, count: agg._count._all };
  }

  /** Visible reviews, newest first, with the reviewer's display name. */
  async reviews(courseId: string, take = 20) {
    return this.db.courseReview.findMany({
      where: { courseId, hidden: false },
      orderBy: { updatedAt: "desc" },
      take,
      include: { user: { select: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } } },
    });
  }

  /** Recently completed lessons, newest first. */
  async history(userId: string, take = 20) {
    return this.db.lessonProgress.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take,
      select: {
        completedAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            type: true,
            module: { select: { title: true, course: { select: { slug: true, title: true, status: true } } } },
          },
        },
      },
    });
  }

  /**
   * Published programmes the member has not started, ordered by their
   * onboarding goals and interests (catalogue order when there are none).
   */
  async youMightStart(userId: string, take = 3) {
    const [courses, profile] = await Promise.all([
      this.db.course.findMany({
        where: { status: "PUBLISHED", enrollments: { none: { userId } } },
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true, title: true, subtitle: true, pillar: true, sortOrder: true, coverImage: true },
      }),
      this.db.profile.findUnique({ where: { userId }, select: { goals: true, interests: true } }),
    ]);
    return rankBySignals(courses, profile?.goals ?? [], profile?.interests ?? []).slice(0, take);
  }
}

export const learner = new LearnerService();
