/**
 * THE RULES ENGINE (spec §17)
 *
 * One evaluator for missions AND achievements. An event arrives, the engine
 * finds every active rule that listens for it, asks the counters whether the
 * member now satisfies it, and pays through the existing idempotent paths.
 *
 * The point of this file: adding a new way to earn is a row, not a deploy.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import type { DomainEvent } from "../events/types";
import { tryParseCriteria } from "./criteria";
import { countEvidence, requiredFor } from "./counters";
import { RewardsService, MissionCooldownError } from "../rewards/rewards";
import { XpService } from "../gamification/xp";
import { LedgerService } from "../ledger/ledger";
import { localDayKey } from "../time/day";

export interface RuleOutcome {
  missions: string[];      // slugs completed by this event
  achievements: string[];  // slugs unlocked by this event
  skipped: { slug: string; why: string }[];
}

export class RulesEngine {
  private rewards: RewardsService;
  private xp: XpService;
  private ledger: LedgerService;

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.rewards = new RewardsService(db);
    this.xp = new XpService(db);
    this.ledger = new LedgerService(db);
  }

  async handle(event: DomainEvent): Promise<RuleOutcome> {
    const now = event.at ?? new Date();
    const out: RuleOutcome = { missions: [], achievements: [], skipped: [] };

    const profile = await this.db.profile.findUnique({
      where: { userId: event.userId },
      select: { timezone: true },
    });
    const tz = profile?.timezone ?? null;

    await this.runMissions(event, now, tz, out);
    await this.runAchievements(event, now, out);
    return out;
  }

  // ---------------------------------------------------------------- missions

  private async runMissions(event: DomainEvent, now: Date, tz: string | null, out: RuleOutcome) {
    const missions = await this.db.mission.findMany({ where: { active: true } });

    for (const m of missions) {
      const c = tryParseCriteria(m.criteria);
      if (!c) {
        out.skipped.push({ slug: m.slug, why: "unreadable criteria" });
        continue;
      }
      if (c.event !== event.type) continue;

      const have = await countEvidence(this.db, event.userId, c, now);
      if (have === null) {
        out.skipped.push({ slug: m.slug, why: `no evidence source for ${c.event}` });
        continue;
      }
      if (have < requiredFor(c)) continue;

      // Repeatable missions bucket by the MEMBER'S local day, so a check-in at
      // 05:00 IST counts for today rather than yesterday (spec §19).
      const occurrence = m.repeatable ? localDayKey(now, tz) : undefined;
      try {
        const r = await this.rewards.completeMission({
          userId: event.userId,
          missionSlug: m.slug,
          occurrence,
        });
        if (r.firstCompletion) out.missions.push(m.slug);
      } catch (e) {
        if (e instanceof MissionCooldownError) {
          out.skipped.push({ slug: m.slug, why: "cooldown" });
          continue;
        }
        throw e;
      }
    }
  }

  // ----------------------------------------------------------- achievements

  private async runAchievements(event: DomainEvent, now: Date, out: RuleOutcome) {
    const candidates = await this.db.achievement.findMany({
      where: { active: true, unlocks: { none: { userId: event.userId } } },
    });

    for (const a of candidates) {
      const c = tryParseCriteria(a.criteria);
      if (!c) {
        out.skipped.push({ slug: a.slug, why: "unreadable criteria" });
        continue;
      }
      if (c.event !== event.type) continue;

      const have = await countEvidence(this.db, event.userId, c, now);
      if (have === null) {
        out.skipped.push({ slug: a.slug, why: `no evidence source for ${c.event}` });
        continue;
      }
      if (have < requiredFor(c)) continue;

      try {
        await this.db.userAchievement.create({ data: { userId: event.userId, achievementId: a.id } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }

      if (a.xpReward > 0) {
        await this.xp.awardXp({
          userId: event.userId,
          amount: a.xpReward,
          source: "ACHIEVEMENT_UNLOCKED",
          sourceId: a.id,
          idempotencyKey: `xp:ach:${a.id}:${event.userId}`,
        });
      }
      if (a.thcReward > 0n) {
        await this.ledger.reward({
          userId: event.userId,
          amount: a.thcReward,
          reason: "REWARD_ACHIEVEMENT",
          idempotencyKey: `thc:ach:${a.id}:${event.userId}`,
          sourceType: "achievement",
          sourceId: a.id,
          memo: `Achievement: ${a.name}`,
        });
      }
      await this.db.notification.create({
        data: {
          userId: event.userId,
          type: "ACHIEVEMENT",
          title: `Achievement unlocked: ${a.name}`,
          body: a.description,
          data: { slug: a.slug },
        },
      });
      out.achievements.push(a.slug);
    }
  }
}

export const rulesEngine = new RulesEngine();
