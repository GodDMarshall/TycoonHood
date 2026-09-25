/**
 * XP ENGINE (spec §14–§15)
 *
 * XP is an append-only event log (XpEvent). User.xp / User.level / User.rankId
 * are caches recomputed inside the same transaction that appends the event —
 * "do not simply increment a frontend number."
 */

import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, XpSource } from "@tycoonhood/db";

export interface AwardXpInput {
  userId: string;
  amount: number;
  source: XpSource;
  sourceId?: string;
  note?: string;
  idempotencyKey: string;
}

export interface AwardXpResult {
  applied: boolean; // false when the idempotency key had already been used
  xp: number;
  level: number;
  leveledUp: boolean;
  rankSlug: string | null;
  rankedUp: boolean;
}

export class XpService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async awardXp(input: AwardXpInput): Promise<AwardXpResult> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error("XP amount must be a positive integer");
    }
    const result = await this.awardXpInner(input);
    if (result.rankedUp) {
      // Best-effort community sync AFTER the transaction — the honest
      // transport (integrations/discord) decides whether anything real
      // happens. Never allowed to fail an XP award.
      import("../integrations/discord")
        .then(({ discord }) => discord.syncRankRole(input.userId))
        .catch(() => {});
    }
    return result;
  }

  private async awardXpInner(input: AwardXpInput): Promise<AwardXpResult> {

    try {
      return await this.db.$transaction(async (tx) => {
        await tx.xpEvent.create({
          data: {
            userId: input.userId,
            amount: input.amount,
            source: input.source,
            sourceId: input.sourceId,
            note: input.note,
            idempotencyKey: input.idempotencyKey,
          },
        });

        // ATOMIC increment. This used to read xp, add in JS, then write an
        // absolute value — under Read Committed two concurrent awards (a lesson
        // and a check-in landing together) would each read the same baseline and
        // the second write would erase the first from the cache, while both
        // XpEvents persisted. Incrementing in the database and reading the
        // result back makes the cache match the log under concurrency.
        const before = await tx.user.findUniqueOrThrow({
          where: { id: input.userId },
          select: { level: true, rankId: true },
        });

        const incremented = await tx.user.update({
          where: { id: input.userId },
          data: { xp: { increment: input.amount } },
          select: { xp: true },
        });
        const newXp = incremented.xp;

        // Highest level whose cumulative requirement is met.
        const levelRow = await tx.levelDefinition.findFirst({
          where: { xpRequired: { lte: newXp } },
          orderBy: { level: "desc" },
        });
        const newLevel = levelRow?.level ?? 1;

        // Highest rank unlocked at this level.
        const rankRow = await tx.rankDefinition.findFirst({
          where: { minLevel: { lte: newLevel } },
          orderBy: { sortOrder: "desc" },
        });

        await tx.user.update({
          where: { id: input.userId },
          data: { level: newLevel, rankId: rankRow?.id ?? null },
        });

        const leveledUp = newLevel > before.level;
        const rankedUp = !!rankRow && rankRow.id !== before.rankId;

        if (leveledUp) {
          await tx.notification.create({
            data: {
              userId: input.userId,
              type: "LEVEL_UP",
              title: `Level ${newLevel} reached`,
              body: `You are now level ${newLevel}. Keep building.`,
              data: { level: newLevel },
            },
          });
        }
        if (rankedUp && rankRow) {
          await tx.notification.create({
            data: {
              userId: input.userId,
              type: "RANK_UP",
              title: `Rank up: ${rankRow.name}`,
              body: `You have been promoted to ${rankRow.name}.`,
              data: { rank: rankRow.slug },
            },
          });
        }

        return {
          applied: true,
          xp: newXp,
          level: newLevel,
          leveledUp,
          rankSlug: rankRow?.slug ?? null,
          rankedUp,
        };
      });
    } catch (e) {
      // Idempotency: this exact award already happened → report current state.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const user = await this.db.user.findUniqueOrThrow({
          where: { id: input.userId },
          include: { rank: true },
        });
        return {
          applied: false,
          xp: user.xp,
          level: user.level,
          leveledUp: false,
          rankSlug: user.rank?.slug ?? null,
          rankedUp: false,
        };
      }
      throw e;
    }
  }
}

export const xpService = new XpService();
