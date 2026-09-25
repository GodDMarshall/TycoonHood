/**
 * THE MINER (apps/miner backend) — a server-authoritative idle rig.
 *
 * Economics: mining DISTRIBUTES from a finite MINING_POOL (funded from
 * Treasury at seed). Total supply is untouched — the mint never runs
 * again. Upgrades burn THC back through the standard spend() path, making
 * the rig the economy's first sink.
 *
 * Integrity: accrual is computed on the server from lastClaimAt; the
 * client ticker is cosmetic. Claims are race-safe: the ledger transaction
 * is keyed to the lastClaimAt it settles, so concurrent claims collapse
 * into one payout, and the state advance is a guarded compare-and-set.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { LedgerService, InsufficientFundsError } from "../ledger/ledger";
import { MINING } from "@tycoonhood/config";

export class MinerError extends Error {}
export class RigMaxedError extends MinerError {}
export class EpochExhaustedError extends MinerError {}

export class MiningService {
  private ledger: LedgerService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.ledger = new LedgerService(db);
  }

  async getState(userId: string) {
    return this.db.minerState.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  ratePerHour(level: number): bigint {
    return MINING.baseRatePerHour * BigInt(level);
  }

  capacity(level: number): bigint {
    return this.ratePerHour(level) * BigInt(MINING.capacityHours);
  }

  accruedFor(state: { rigLevel: number; lastClaimAt: Date }, now = new Date()): bigint {
    const elapsedMs = BigInt(Math.max(0, now.getTime() - state.lastClaimAt.getTime()));
    const raw = (this.ratePerHour(state.rigLevel) * elapsedMs) / 3_600_000n;
    const cap = this.capacity(state.rigLevel);
    return raw > cap ? cap : raw;
  }

  /** Everything the miner screen needs. */
  async preview(userId: string, now = new Date()) {
    const state = await this.getState(userId);
    const wallet = await this.ledger.ensureUserAccount(userId);
    const rate = this.ratePerHour(state.rigLevel);
    const cap = this.capacity(state.rigLevel);
    const accrued = this.accruedFor(state, now);
    const nextCost =
      state.rigLevel >= MINING.maxLevel ? null : MINING.upgradeCosts[state.rigLevel];
    return {
      rigLevel: state.rigLevel,
      ratePerHour: rate,
      capacity: cap,
      accrued,
      full: accrued >= cap,
      lastClaimAt: state.lastClaimAt,
      totalMined: state.totalMined,
      balance: wallet.balance,
      nextUpgradeCost: nextCost,
      maxLevel: MINING.maxLevel,
    };
  }

  /**
   * Claim accrued THC. Ledger tx is keyed to the settled lastClaimAt, so
   * retries and races pay exactly once; the state advance is a guarded CAS.
   */
  async claim(userId: string, now = new Date()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const state = await this.getState(userId);
      const accrued = this.accruedFor(state, now);
      if (accrued <= 0n) return { claimed: 0n, totalMined: state.totalMined };

      const [pool, wallet] = await Promise.all([
        this.ledger.systemAccount("MINING_POOL"),
        this.ledger.ensureUserAccount(userId),
      ]);

      try {
        await this.ledger.post({
          reason: "REWARD_MINING",
          idempotencyKey: `mine:${userId}:${state.lastClaimAt.getTime()}`,
          sourceType: "miner",
          sourceId: userId,
          memo: `Rig L${state.rigLevel} claim`,
          entries: [
            { accountId: pool.id, amount: -accrued },
            { accountId: wallet.id, amount: accrued },
          ],
        });
      } catch (e) {
        if (e instanceof InsufficientFundsError) {
          throw new EpochExhaustedError(
            "The mining pool for this epoch is exhausted. The books say so too."
          );
        }
        throw e;
      }

      const advanced = await this.db.minerState.updateMany({
        where: { userId, lastClaimAt: state.lastClaimAt },
        data: { lastClaimAt: now, totalMined: { increment: accrued } },
      });
      if (advanced.count === 1) {
        const { events } = await import("../events/bus");
        await events.emit({ type: "MINING_CLAIMED", userId, amount: accrued });
        return { claimed: accrued, totalMined: state.totalMined + accrued };
      }
      // Lost the CAS to a parallel claim that shared our idempotency key —
      // exactly one payout happened; re-read and report current truth.
    }
    const final = await this.getState(userId);
    return { claimed: 0n, totalMined: final.totalMined };
  }

  /** Upgrade burns THC via spend(); level advance is a guarded CAS keyed
   *  per-level so double-clicks cannot double-charge or double-level. */
  async upgrade(userId: string) {
    const state = await this.getState(userId);
    if (state.rigLevel >= MINING.maxLevel) throw new RigMaxedError("Rig is at maximum level.");
    const cost = MINING.upgradeCosts[state.rigLevel];

    await this.ledger.spend({
      userId,
      amount: cost,
      idempotencyKey: `mine-upgrade:${userId}:${state.rigLevel}`,
      sourceType: "miner-upgrade",
      sourceId: String(state.rigLevel + 1),
      memo: `Rig upgrade L${state.rigLevel} → L${state.rigLevel + 1}`,
    });

    // Bank the accrual at the old rate before the rate changes.
    await this.claim(userId).catch(() => {});

    await this.db.minerState.updateMany({
      where: { userId, rigLevel: state.rigLevel },
      data: { rigLevel: state.rigLevel + 1 },
    });

    return this.getState(userId);
  }

  async stats() {
    const [pool, miners, agg, top] = await Promise.all([
      this.ledger.systemAccount("MINING_POOL"),
      this.db.minerState.count(),
      this.db.minerState.aggregate({ _sum: { totalMined: true } }),
      this.db.minerState.findMany({
        orderBy: { totalMined: "desc" },
        take: 10,
        include: { user: { include: { profile: true } } },
      }),
    ]);
    return {
      poolRemaining: pool.balance,
      miners,
      totalMined: agg._sum.totalMined ?? 0n,
      top: top
        .filter((t) => t.user.profile)
        .map((t, i) => ({
          position: i + 1,
          username: t.user.profile!.username,
          displayName: t.user.profile!.displayName,
          rigLevel: t.rigLevel,
          totalMined: t.totalMined,
        })),
    };
  }
}

export const mining = new MiningService();
