/**
 * CHALLENGE ENGINE (spec §16–§17). Lifecycle transitions run on read
 * (UPCOMING→ACTIVE→ENDED by date; unfinished participants FAIL on end).
 * DAILY_CHECKIN challenges verify consecutive-day progress; completion
 * pays through the standard idempotent pipeline.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { XpService } from "./xp";
import { LedgerService } from "../ledger/ledger";
import { StreakService } from "./streaks";
import { localDayKey } from "../time/day";

export interface Submission {
  id: string;
  text: string;
  url?: string;
  submittedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  feedback?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export class ChallengeError extends Error {}

export class ChallengeService {
  private xp: XpService;
  private ledger: LedgerService;
  private streaks: StreakService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.xp = new XpService(db);
    this.ledger = new LedgerService(db);
    this.streaks = new StreakService(db);
  }

  /** Date-driven lifecycle sweep. Cheap; called from pages that list challenges. */
  async sweepLifecycles(now = new Date()) {
    await this.db.challenge.updateMany({
      where: { lifecycle: "UPCOMING", startsAt: { lte: now } },
      data: { lifecycle: "ACTIVE" },
    });
    const ending = await this.db.challenge.findMany({
      where: { lifecycle: "ACTIVE", endsAt: { lt: now } },
      select: { id: true },
    });
    if (ending.length) {
      const ids = ending.map((c) => c.id);
      await this.db.challenge.updateMany({ where: { id: { in: ids } }, data: { lifecycle: "ENDED" } });
      await this.db.challengeParticipation.updateMany({
        where: { challengeId: { in: ids }, status: "JOINED" },
        data: { status: "FAILED" },
      });
    }
  }

  async join(userId: string, challengeSlug: string) {
    const c = await this.db.challenge.findUniqueOrThrow({ where: { slug: challengeSlug } });
    if (!["UPCOMING", "ACTIVE"].includes(c.lifecycle)) {
      throw new ChallengeError("This challenge is not open for entries.");
    }
    try {
      return await this.db.challengeParticipation.create({
        data: { userId, challengeId: c.id, progress: { checkins: [] } },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return this.db.challengeParticipation.findUniqueOrThrow({
          where: { userId_challengeId: { userId, challengeId: c.id } },
        });
      }
      throw e;
    }
  }

  async withdraw(userId: string, challengeSlug: string) {
    const c = await this.db.challenge.findUniqueOrThrow({ where: { slug: challengeSlug } });
    await this.db.challengeParticipation.updateMany({
      where: { userId, challengeId: c.id, status: "JOINED" },
      data: { status: "WITHDRAWN" },
    });
  }

  /** Daily check-in for DAILY_CHECKIN challenges. Completes when the
   *  consecutive-day requirement is met. */
  async checkIn(userId: string, challengeSlug: string, now = new Date()) {
    const c = await this.db.challenge.findUniqueOrThrow({ where: { slug: challengeSlug } });
    const criteria = c.criteria as { event?: string; consecutiveDays?: number };
    if (criteria.event !== "DAILY_CHECKIN") {
      throw new ChallengeError("This challenge is verified by submission, not check-ins.");
    }
    if (c.lifecycle !== "ACTIVE") throw new ChallengeError("Check-ins open when the challenge is live.");

    const p = await this.db.challengeParticipation.findUnique({
      where: { userId_challengeId: { userId, challengeId: c.id } },
    });
    if (!p || p.status !== "JOINED") throw new ChallengeError("Join the challenge before checking in.");

    // The member's own day — a 05:00 IST check-in belongs to today, not to
    // yesterday in UTC (spec §19).
    const tz =
      (await this.db.profile.findUnique({ where: { userId }, select: { timezone: true } }))
        ?.timezone ?? null;

    const progress = (p.progress as { checkins?: string[] } | null) ?? {};
    const checkins = new Set(progress.checkins ?? []);
    const today = localDayKey(now, tz);
    const alreadyToday = checkins.has(today);
    checkins.add(today);
    const list = [...checkins].sort();

    // Consecutive run ending today
    let run = 0;
    for (let d = new Date(now); checkins.has(localDayKey(d, tz)); d = new Date(d.getTime() - 86_400_000)) run++;

    const required = criteria.consecutiveDays ?? 1;
    const completed = run >= required;

    await this.db.challengeParticipation.update({
      where: { id: p.id },
      data: {
        progress: { checkins: list },
        ...(completed ? { status: "COMPLETED", completedAt: now } : {}),
      },
    });

    if (!alreadyToday) await this.streaks.touch(userId, now, tz);

    if (completed) { // pay-once is guaranteed by the idempotency keys inside
      await this.payOut(c, userId, `${run} consecutive days. The reward is on your ledger.`);
    }

    return { day: today, run, required, completed, alreadyToday };
  }

  /** Idempotent reward payout shared by every completion path. */
  private async payOut(
    c: { id: string; slug: string; name: string; xpReward: number; thcReward: bigint },
    userId: string,
    body: string
  ) {
    if (c.xpReward > 0) {
      await this.xp.awardXp({
        userId,
        amount: c.xpReward,
        source: "CHALLENGE_COMPLETED",
        sourceId: c.id,
        idempotencyKey: `xp:chal:${c.id}:${userId}`,
      });
    }
    if (c.thcReward > 0n) {
      await this.ledger.reward({
        userId,
        amount: c.thcReward,
        reason: "REWARD_CHALLENGE",
        idempotencyKey: `thc:chal:${c.id}:${userId}`,
        sourceType: "challenge",
        sourceId: c.id,
        memo: `Challenge: ${c.name}`,
      });
    }
    await this.db.notification.create({
      data: {
        userId,
        type: "CHALLENGE",
        title: `Challenge complete: ${c.name}`,
        body,
        data: { slug: c.slug },
      },
    });
  }

  // ---------- Evidence submissions (SUBMISSION / GATED_SUBMISSIONS) ----------

  static requiredApprovals(criteria: unknown): number | null {
    const c = criteria as { event?: string; gates?: number };
    if (c.event === "SUBMISSION") return 1;
    if (c.event === "GATED_SUBMISSIONS") return Math.max(1, c.gates ?? 1);
    return null; // not an evidence-verified challenge
  }

  /** Member submits evidence. Multiple submissions allowed (gated
   *  challenges need them); hard cap keeps the queue sane. */
  async submit(userId: string, challengeSlug: string, evidence: { text: string; url?: string }) {
    const c = await this.db.challenge.findUniqueOrThrow({ where: { slug: challengeSlug } });
    const required = ChallengeService.requiredApprovals(c.criteria);
    if (required == null) throw new ChallengeError("This challenge is verified by check-ins, not submissions.");
    if (c.lifecycle !== "ACTIVE") throw new ChallengeError("Submissions open while the challenge is live.");
    const text = evidence.text.trim();
    if (text.length < 20) throw new ChallengeError("Tell us what you actually did — at least a few sentences.");

    const p = await this.db.challengeParticipation.findUnique({
      where: { userId_challengeId: { userId, challengeId: c.id } },
    });
    if (!p || p.status !== "JOINED") throw new ChallengeError("Join the challenge before submitting.");

    const progress = (p.progress as { submissions?: Submission[] } | null) ?? {};
    const submissions = progress.submissions ?? [];
    if (submissions.length >= 10) throw new ChallengeError("Submission limit reached for this challenge.");

    submissions.push({
      id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      text: text.slice(0, 4000),
      url: evidence.url?.trim().slice(0, 500) || undefined,
      submittedAt: new Date().toISOString(),
      status: "PENDING",
    });
    await this.db.challengeParticipation.update({
      where: { id: p.id },
      data: { progress: { ...progress, submissions } as object },
    });
    await this.streaks.touch(userId);
    const approved = submissions.filter((s) => s.status === "APPROVED").length;
    return { pending: submissions.filter((s) => s.status === "PENDING").length, approved, required };
  }

  /** Admin reviews one submission. Approvals reaching the requirement
   *  complete the challenge and pay through the shared idempotent path.
   *  Late approvals rescue FAILED participants on purpose — slow review
   *  must never punish the member. */
  async reviewSubmission(
    participationId: string,
    submissionId: string,
    approve: boolean,
    feedback: string | undefined,
    reviewerId: string
  ) {
    const p = await this.db.challengeParticipation.findUniqueOrThrow({
      where: { id: participationId },
      include: { challenge: true },
    });
    const required = ChallengeService.requiredApprovals(p.challenge.criteria);
    if (required == null) throw new ChallengeError("Not an evidence-verified challenge.");

    const progress = (p.progress as { submissions?: Submission[] } | null) ?? {};
    const submissions = progress.submissions ?? [];
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) throw new ChallengeError("Submission not found.");
    if (sub.status !== "PENDING") return { alreadyReviewed: true, completed: p.status === "COMPLETED" };

    sub.status = approve ? "APPROVED" : "REJECTED";
    sub.feedback = feedback?.trim().slice(0, 1000) || undefined;
    sub.reviewedAt = new Date().toISOString();
    sub.reviewedBy = reviewerId;

    const approved = submissions.filter((s) => s.status === "APPROVED").length;
    const completes = approve && approved >= required && p.status !== "COMPLETED";

    await this.db.challengeParticipation.update({
      where: { id: p.id },
      data: {
        progress: { ...progress, submissions } as object,
        ...(completes ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    });

    if (completes) {
      await this.payOut(p.challenge, p.userId, "Evidence verified. The reward is on your ledger.");
    } else if (!approve) {
      await this.db.notification.create({
        data: {
          userId: p.userId,
          type: "CHALLENGE",
          title: `Submission needs work: ${p.challenge.name}`,
          body: sub.feedback ?? "Rework it and submit again — the window is still open.",
          data: { slug: p.challenge.slug },
        },
      });
    }
    return { alreadyReviewed: false, completed: completes, approved, required };
  }

  /** The admin queue: every pending submission across evidence challenges. */
  async pendingSubmissions() {
    const rows = await this.db.challengeParticipation.findMany({
      where: { challenge: { criteria: { path: ["event"], string_contains: "SUBMISSION" } } },
      include: { challenge: true, user: { include: { profile: true } } },
      orderBy: { joinedAt: "asc" },
    });
    const queue: {
      participationId: string;
      submissionId: string;
      challenge: string;
      challengeName: string;
      username: string;
      text: string;
      url?: string;
      submittedAt: string;
      approved: number;
      required: number;
      participantStatus: string;
    }[] = [];
    for (const p of rows) {
      const required = ChallengeService.requiredApprovals(p.challenge.criteria);
      if (required == null) continue;
      const subs = ((p.progress as { submissions?: Submission[] } | null)?.submissions ?? []);
      const approved = subs.filter((s) => s.status === "APPROVED").length;
      for (const s of subs) {
        if (s.status !== "PENDING") continue;
        queue.push({
          participationId: p.id,
          submissionId: s.id,
          challenge: p.challenge.slug,
          challengeName: p.challenge.name,
          username: p.user.profile?.username ?? p.userId,
          text: s.text,
          url: s.url,
          submittedAt: s.submittedAt,
          approved,
          required,
          participantStatus: p.status,
        });
      }
    }
    return queue;
  }

  async leaderboard(limit = 20) {
    const rows = await this.db.user.findMany({
      where: { role: "MEMBER", profile: { isNot: null } },
      orderBy: [{ xp: "desc" }, { createdAt: "asc" }],
      take: limit,
      include: { profile: true, rank: true, streak: true },
    });
    return rows.map((u, i) => {
      const privacy = (u.profile?.privacy ?? {}) as Record<string, boolean>;
      return {
        position: i + 1,
        username: u.profile!.username,
        displayName: u.profile!.displayName,
        level: privacy.level === false ? null : u.level,
        xp: privacy.level === false ? null : u.xp,
        rankSlug: privacy.rank === false ? null : u.rank?.slug ?? null,
        streak: privacy.streak === false ? null : u.streak?.current ?? 0,
      };
    });
  }
}

export const challenges = new ChallengeService();
