/**
 * PLATFORM ANALYTICS (spec J) — every figure is a count or sum of real rows.
 *
 * Revenue rule: only CAPTURED payments in LIVE mode are revenue, less any
 * part already refunded (as shopStats.liveRevenue counts it). TEST (sandbox)
 * payments are reported on their own line and never added in.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";

const DAY = 24 * 60 * 60 * 1000;

export interface DayCount {
  day: string; // YYYY-MM-DD (UTC)
  count: number;
}

export interface MoneyLine {
  mode: string;
  currency: string;
  amountCents: number;
  payments: number;
}

export interface PlatformAnalytics {
  generatedAt: Date;
  signups: { perDay: DayCount[]; last30: number; total: number };
  verified: { verified: number; total: number; pct: number | null };
  activeLearners7d: number;
  lessonsCompleted30d: number;
  enrolmentsByProgramme: { courseId: string; title: string; status: string; enrolments: number; completed: number }[];
  quiz: { attempts30d: number; passed30d: number; passRate: number | null };
  certificates: { total: number; last30: number };
  orders: { byStatus: { status: string; count: number }[]; total: number };
  revenue: { live: MoneyLine[]; test: MoneyLine[] };
  affiliates: { approved: number; pending: number; clicks30d: number; conversions30d: number; commissionsByStatus: { status: string; count: number }[] };
  community: { posts30d: number; comments30d: number; postsTotal: number };
}

/** Fill the last `days` UTC days so a quiet day shows as a real zero, not a gap. */
function fillDays(rows: { day: Date; count: number }[], days: number): DayCount[] {
  const map = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
  const out: DayCount[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY).toISOString().slice(0, 10);
    out.push({ day: d, count: map.get(d) ?? 0 });
  }
  return out;
}

export async function platformAnalytics(db: PrismaClient = defaultPrisma): Promise<PlatformAnalytics> {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since7 = new Date(now - 7 * DAY);
  const since30Day = new Date(since30);
  since30Day.setUTCHours(0, 0, 0, 0);

  const [
    signupRows,
    usersTotal,
    usersVerified,
    activeRows,
    lessons30,
    courses,
    enrolGroups,
    attempts30,
    passed30,
    certTotal,
    cert30,
    orderGroups,
    paymentGroups,
    affApproved,
    affPending,
    clicks30,
    conversions30,
    commissionGroups,
    posts30,
    comments30,
    postsTotal,
  ] = await Promise.all([
    db.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS day, count(*)::int AS count
      FROM "User" WHERE "createdAt" >= ${since30Day} GROUP BY 1 ORDER BY 1`,
    db.user.count(),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.$queryRaw<{ n: number }[]>`
      SELECT count(DISTINCT "userId")::int AS n FROM "LessonProgress" WHERE "updatedAt" >= ${since7}`,
    db.lessonProgress.count({ where: { completedAt: { gte: since30 } } }),
    db.course.findMany({ select: { id: true, title: true, status: true }, orderBy: { sortOrder: "asc" } }),
    db.enrollment.groupBy({ by: ["courseId", "status"], _count: { _all: true } }),
    db.quizAttempt.count({ where: { createdAt: { gte: since30 } } }),
    db.quizAttempt.count({ where: { createdAt: { gte: since30 }, passed: true } }),
    db.certificate.count(),
    db.certificate.count({ where: { issuedAt: { gte: since30 } } }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.payment.groupBy({ by: ["mode", "currency"], where: { status: "CAPTURED" }, _sum: { amountCents: true, refundedCents: true }, _count: { _all: true } }),
    db.affiliateProfile.count({ where: { status: "APPROVED" } }),
    db.affiliateProfile.count({ where: { status: "PENDING" } }),
    db.affiliateClick.count({ where: { createdAt: { gte: since30 } } }),
    db.commission.count({ where: { createdAt: { gte: since30 }, status: { notIn: ["REJECTED", "REVERSED"] } } }),
    db.commission.groupBy({ by: ["status"], _count: { _all: true } }),
    db.communityPost.count({ where: { createdAt: { gte: since30 }, state: "VISIBLE" } }),
    db.communityComment.count({ where: { createdAt: { gte: since30 }, state: "VISIBLE" } }),
    db.communityPost.count({ where: { state: "VISIBLE" } }),
  ]);

  const perDay = fillDays(signupRows, 30);
  const enrolments = courses.map((c) => {
    const rows = enrolGroups.filter((g) => g.courseId === c.id);
    return {
      courseId: c.id,
      title: c.title,
      status: c.status,
      enrolments: rows.reduce((n, r) => n + r._count._all, 0),
      completed: rows.filter((r) => r.status === "COMPLETED").reduce((n, r) => n + r._count._all, 0),
    };
  });

  const money = paymentGroups.map((g) => ({
    mode: g.mode,
    currency: g.currency,
    // A partial refund leaves the payment CAPTURED; only what was kept counts.
    amountCents: (g._sum.amountCents ?? 0) - (g._sum.refundedCents ?? 0),
    payments: g._count._all,
  }));

  return {
    generatedAt: new Date(now),
    signups: { perDay, last30: perDay.reduce((n, d) => n + d.count, 0), total: usersTotal },
    verified: { verified: usersVerified, total: usersTotal, pct: usersTotal ? Math.round((usersVerified / usersTotal) * 100) : null },
    activeLearners7d: Number(activeRows[0]?.n ?? 0),
    lessonsCompleted30d: lessons30,
    enrolmentsByProgramme: enrolments,
    quiz: { attempts30d: attempts30, passed30d: passed30, passRate: attempts30 ? Math.round((passed30 / attempts30) * 100) : null },
    certificates: { total: certTotal, last30: cert30 },
    orders: {
      byStatus: orderGroups.map((g) => ({ status: g.status, count: g._count._all })),
      total: orderGroups.reduce((n, g) => n + g._count._all, 0),
    },
    revenue: {
      live: money.filter((m) => m.mode === "LIVE"),
      test: money.filter((m) => m.mode !== "LIVE"),
    },
    affiliates: {
      approved: affApproved,
      pending: affPending,
      clicks30d: clicks30,
      conversions30d: conversions30,
      commissionsByStatus: commissionGroups.map((g) => ({ status: g.status, count: g._count._all })),
    },
    community: { posts30d: posts30, comments30d: comments30, postsTotal },
  };
}
