/**
 * REWARD PIPELINE (spec §14 event flow, §17, §28)
 *
 * Phase 1 ships the mission path end-to-end to prove the composition:
 *   completion record → XP engine → THC ledger → notification
 * Phase 6 generalizes this into the full rules engine for challenges,
 * achievements, and streaks — same primitives, more triggers.
 */

import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { LedgerService } from "../ledger/ledger";
import { XpService } from "../gamification/xp";
import { localDayKey } from "../time/day";

export class MissionCooldownError extends Error {}

export class RewardsService {
  private ledger: LedgerService;
  private xp: XpService;

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.ledger = new LedgerService(db);
    this.xp = new XpService(db);
  }

  /**
   * Record a mission completion and grant its rewards, idempotently.
   * `occurrence` distinguishes repeats of repeatable missions
   * (e.g. a date bucket). Non-repeatable missions ignore repeats entirely.
   */
  async completeMission(opts: { userId: string; missionSlug: string; occurrence?: string }) {
    const mission = await this.db.mission.findUniqueOrThrow({
      where: { slug: opts.missionSlug },
    });
    if (!mission.active) throw new Error(`Mission ${mission.slug} is not active`);

    if (mission.repeatable && mission.cooldownHours) {
      const last = await this.db.missionCompletion.findFirst({
        where: { userId: opts.userId, missionId: mission.id },
        orderBy: { completedAt: "desc" },
      });
      if (last) {
        const readyAt = last.completedAt.getTime() + mission.cooldownHours * 3_600_000;
        if (Date.now() < readyAt) {
          throw new MissionCooldownError(
            `Available again in ${Math.ceil((readyAt - Date.now()) / 3_600_000)}h.`
          );
        }
      }
    }

    // Repeatable missions bucket by the MEMBER'S local day. The engine passes
    // this in; direct callers get it resolved here so nobody silently gets a
    // UTC bucket and loses a day at the boundary (spec §19).
    let occurrence = "once";
    if (mission.repeatable) {
      if (opts.occurrence) {
        occurrence = opts.occurrence;
      } else {
        const tz =
          (await this.db.profile.findUnique({
            where: { userId: opts.userId },
            select: { timezone: true },
          }))?.timezone ?? null;
        occurrence = localDayKey(new Date(), tz);
      }
    }
    const key = `mission:${mission.id}:${opts.userId}:${occurrence}`;

    let firstCompletion = true;
    try {
      await this.db.missionCompletion.create({
        data: { userId: opts.userId, missionId: mission.id, idempotencyKey: key },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        firstCompletion = false; // already recorded; rewards below stay idempotent too
      } else {
        throw e;
      }
    }

    const xpResult =
      mission.xpReward > 0
        ? await this.xp.awardXp({
            userId: opts.userId,
            amount: mission.xpReward,
            source: "MISSION_COMPLETED",
            sourceId: mission.id,
            idempotencyKey: `xp:${key}`,
          })
        : null;

    const thcTx =
      mission.thcReward > 0n
        ? await this.ledger.reward({
            userId: opts.userId,
            amount: mission.thcReward,
            reason: "REWARD_MISSION",
            idempotencyKey: `thc:${key}`,
            sourceType: "mission",
            sourceId: mission.id,
            memo: `Mission: ${mission.name}`,
          })
        : null;

    if (firstCompletion) {
      await this.db.notification.create({
        data: {
          userId: opts.userId,
          type: "MISSION",
          title: `Mission complete: ${mission.name}`,
          body: [
            mission.xpReward > 0 ? `+${mission.xpReward} XP` : null,
            mission.thcReward > 0n ? `+${mission.thcReward} THC` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          data: { missionSlug: mission.slug },
        },
      });
    }

    return { firstCompletion, xp: xpResult, thcTransactionId: thcTx?.id ?? null };
  }
}

export const rewards = new RewardsService();
