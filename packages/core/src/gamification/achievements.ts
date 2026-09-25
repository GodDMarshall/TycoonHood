/**
 * ACHIEVEMENTS (spec §18). Criteria live as data ({event, count?/days?});
 * this evaluator checks them on relevant events and unlocks at most once,
 * paying XP + THC through the standard idempotent pipeline.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { XpService } from "./xp";
import { LedgerService } from "../ledger/ledger";

type CriteriaEvent = "COURSE_COMPLETED" | "STREAK" | "COMMUNITY_CONTRIBUTION";

export class AchievementService {
  private xp: XpService;
  private ledger: LedgerService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.xp = new XpService(db);
    this.ledger = new LedgerService(db);
  }

  async evaluate(userId: string, event: CriteriaEvent) {
    const candidates = await this.db.achievement.findMany({
      where: { active: true, unlocks: { none: { userId } } },
    });
    const unlocked: string[] = [];

    for (const a of candidates) {
      const c = a.criteria as { event?: string; count?: number; days?: number };
      if (c.event !== event) continue;

      let met = false;
      if (event === "COURSE_COMPLETED") {
        const n = await this.db.enrollment.count({ where: { userId, status: "COMPLETED" } });
        met = n >= (c.count ?? 1);
      } else if (event === "STREAK") {
        const s = await this.db.streak.findUnique({ where: { userId } });
        met = (s?.current ?? 0) >= (c.days ?? 1);
      } else if (event === "COMMUNITY_CONTRIBUTION") {
        met = false; // wired when community events exist (Phase 9+)
      }
      if (!met) continue;

      try {
        await this.db.userAchievement.create({ data: { userId, achievementId: a.id } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }

      if (a.xpReward > 0) {
        await this.xp.awardXp({
          userId,
          amount: a.xpReward,
          source: "ACHIEVEMENT_UNLOCKED",
          sourceId: a.id,
          idempotencyKey: `xp:ach:${a.id}:${userId}`,
        });
      }
      if (a.thcReward > 0n) {
        await this.ledger.reward({
          userId,
          amount: a.thcReward,
          reason: "REWARD_ACHIEVEMENT",
          idempotencyKey: `thc:ach:${a.id}:${userId}`,
          sourceType: "achievement",
          sourceId: a.id,
          memo: `Achievement: ${a.name}`,
        });
      }
      await this.db.notification.create({
        data: {
          userId,
          type: "ACHIEVEMENT",
          title: `Achievement unlocked: ${a.name}`,
          body: a.description,
          data: { slug: a.slug },
        },
      });
      unlocked.push(a.slug);
    }
    return unlocked;
  }
}

export const achievements = new AchievementService();
