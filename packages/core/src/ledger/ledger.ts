/**
 * THC LEDGER SERVICE (spec §25–§28, Blueprint D6/D7)
 *
 * Rules this module enforces:
 *  1. THC only moves via a LedgerTransaction with entries that sum to ZERO.
 *     Enforced here AND by a deferred Postgres constraint trigger.
 *  2. Every post is idempotent: same idempotencyKey → same transaction back,
 *     no double movement. Safe to retry anything.
 *  3. USER accounts can never go negative (service guard + DB CHECK).
 *  4. Nothing is ever mutated or deleted. Corrections are compensating
 *     reversal transactions pointing at the original.
 *  5. Cached balances are updated inside the same DB transaction as the
 *     entries; auditAccount() proves cache == SUM(entries) at any time.
 */

import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { LedgerAccountType, LedgerTransaction, PrismaClient, TxReason } from "@tycoonhood/db";

export class LedgerError extends Error {}
export class UnbalancedTransactionError extends LedgerError {}
export class InsufficientFundsError extends LedgerError {}

export interface EntryInput {
  accountId: string;
  /** Signed BigInt. Positive = credit to account, negative = debit. */
  amount: bigint;
}

export interface PostInput {
  reason: TxReason;
  idempotencyKey: string;
  entries: EntryInput[];
  sourceType?: string;
  sourceId?: string;
  memo?: string;
  createdById?: string;
}

/**
 * Why no Serializable isolation: every invariant is enforced by mechanisms
 * that hold at Postgres's default Read Committed —
 *   · overdraft: atomic guarded UPDATE (WHERE balance >= amount) + DB CHECK
 *   · double-posting: unique idempotencyKey
 *   · zero-sum: service validation + deferred DB trigger
 *   · cache == entries: both written in the same DB transaction
 * Serializable would only manufacture retry storms on hot rows (e.g. the
 * rewards pool). Retries below handle the rare genuine deadlock.
 */
const DEADLOCK_RETRIES = 5;

export class LedgerService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  // ---------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------

  /** Get-or-create the single wallet account for a user. */
  async ensureUserAccount(userId: string) {
    const existing = await this.db.ledgerAccount.findUnique({ where: { userId } });
    if (existing) return existing;
    try {
      return await this.db.ledgerAccount.create({
        data: { type: "USER", userId, name: `wallet:${userId}` },
      });
    } catch (e) {
      // Raced with a parallel creation — the unique(userId) makes this safe.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return (await this.db.ledgerAccount.findUnique({ where: { userId } }))!;
      }
      throw e;
    }
  }

  /** System accounts (TREASURY, REWARDS_POOL, …) are singletons by type. */
  async systemAccount(type: Exclude<LedgerAccountType, "USER">) {
    const acct = await this.db.ledgerAccount.findFirst({ where: { type } });
    if (!acct) throw new LedgerError(`System account ${type} missing — run db:seed`);
    return acct;
  }

  async getBalance(accountId: string): Promise<bigint> {
    const acct = await this.db.ledgerAccount.findUniqueOrThrow({ where: { id: accountId } });
    return acct.balance;
  }

  /** Audit: recompute balance from entries and compare with the cache. */
  async auditAccount(accountId: string) {
    const [acct, sum] = await Promise.all([
      this.db.ledgerAccount.findUniqueOrThrow({ where: { id: accountId } }),
      this.db.ledgerEntry.aggregate({ where: { accountId }, _sum: { amount: true } }),
    ]);
    const derived = sum._sum.amount ?? 0n;
    return { cached: acct.balance, derived, consistent: acct.balance === derived };
  }

  // ---------------------------------------------------------------
  // Core posting
  // ---------------------------------------------------------------

  async post(input: PostInput): Promise<LedgerTransaction> {
    this.validate(input);

    // Fast path: already posted under this key → idempotent return.
    const prior = await this.db.ledgerTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (prior) return prior;

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const created = await tx.ledgerTransaction.create({
              data: {
                reason: input.reason,
                idempotencyKey: input.idempotencyKey,
                sourceType: input.sourceType,
                sourceId: input.sourceId,
                memo: input.memo,
                createdById: input.createdById,
                entries: {
                  create: input.entries.map((e) => ({
                    accountId: e.accountId,
                    amount: e.amount,
                  })),
                },
              },
            });

            // Apply balance deltas atomically. The DB CHECK constraint
            // (user_balance_non_negative) is the last line of defense.
            for (const e of input.entries) {
              if (e.amount < 0n) {
                // Guarded decrement: refuse to overdraw USER accounts here,
                // with a clean domain error instead of a raw constraint blast.
                const res = await tx.ledgerAccount.updateMany({
                  where: {
                    id: e.accountId,
                    // Accounts that may NEVER go negative: member wallets and the
                    // finite distribution pools. SYSTEM_MINT alone goes negative
                    // (genesis), and TREASURY/REVENUE/ESCROW are sources/sinks.
                    // This is what makes "finite pool" true instead of aspirational
                    // (TYCOONHOOD_DECISIONS.md DR-6): mining and rewards now refuse
                    // to overdraw, so EpochExhaustedError can actually fire.
                    OR: [
                      { type: { notIn: ["USER", "REWARDS_POOL", "MINING_POOL"] } },
                      { balance: { gte: -e.amount } },
                    ],
                  },
                  data: { balance: { increment: e.amount } },
                });
                if (res.count === 0) {
                  throw new InsufficientFundsError(
                    `Account ${e.accountId} has insufficient THC for ${-e.amount}`
                  );
                }
              } else {
                await tx.ledgerAccount.update({
                  where: { id: e.accountId },
                  data: { balance: { increment: e.amount } },
                });
              }
            }

            return created;
          }
        );
      } catch (e) {
        // Lost the idempotency race to a parallel identical request → return theirs.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const winner = await this.db.ledgerTransaction.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
          });
          if (winner) return winner;
        }
        // Serialization conflict under concurrency → bounded retry.
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2034" &&
          attempt < DEADLOCK_RETRIES
        ) {
          await new Promise((r) => setTimeout(r, attempt * 10 + Math.random() * 20));
          continue;
        }
        throw e;
      }
    }
  }

  private validate(input: PostInput) {
    if (input.entries.length < 2) {
      throw new UnbalancedTransactionError("A transaction needs at least two entries");
    }
    let sum = 0n;
    for (const e of input.entries) {
      if (e.amount === 0n) throw new UnbalancedTransactionError("Zero-amount entry");
      sum += e.amount;
    }
    if (sum !== 0n) {
      throw new UnbalancedTransactionError(`Entries sum to ${sum}, must be 0`);
    }
  }

  // ---------------------------------------------------------------
  // Domain helpers (the only ways the rest of the platform moves THC)
  // ---------------------------------------------------------------

  /** Reward a user from the REWARDS_POOL. */
  async reward(opts: {
    userId: string;
    amount: bigint;
    reason: Extract<TxReason, "REWARD_MISSION" | "REWARD_CHALLENGE" | "REWARD_ACHIEVEMENT" | "REWARD_ADMIN">;
    idempotencyKey: string;
    sourceType?: string;
    sourceId?: string;
    memo?: string;
    createdById?: string;
  }) {
    if (opts.amount <= 0n) throw new LedgerError("Reward must be positive");
    const [pool, wallet] = await Promise.all([
      this.systemAccount("REWARDS_POOL"),
      this.ensureUserAccount(opts.userId),
    ]);
    return this.post({
      reason: opts.reason,
      idempotencyKey: opts.idempotencyKey,
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
      memo: opts.memo,
      createdById: opts.createdById,
      entries: [
        { accountId: pool.id, amount: -opts.amount },
        { accountId: wallet.id, amount: opts.amount },
      ],
    });
  }

  /** User spends THC on a Tycoonhood product → REVENUE. */
  async spend(opts: {
    userId: string;
    amount: bigint;
    idempotencyKey: string;
    sourceType?: string;
    sourceId?: string;
    memo?: string;
  }) {
    if (opts.amount <= 0n) throw new LedgerError("Spend must be positive");
    const [revenue, wallet] = await Promise.all([
      this.systemAccount("REVENUE"),
      this.ensureUserAccount(opts.userId),
    ]);
    return this.post({
      reason: "PURCHASE",
      idempotencyKey: opts.idempotencyKey,
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
      memo: opts.memo,
      entries: [
        { accountId: wallet.id, amount: -opts.amount },
        { accountId: revenue.id, amount: opts.amount },
      ],
    });
  }

  /**
   * Reverse a posted transaction with an equal-and-opposite compensating
   * transaction. The original is marked REVERSED but never altered.
   */
  async reverse(originalTxId: string, opts: { idempotencyKey: string; memo?: string; createdById?: string }) {
    const original = await this.db.ledgerTransaction.findUniqueOrThrow({
      where: { id: originalTxId },
      include: { entries: true },
    });
    if (original.status === "REVERSED") {
      const existing = await this.db.ledgerTransaction.findUnique({
        where: { reversesId: originalTxId },
      });
      if (existing) return existing;
    }

    const reversal = await this.post({
      reason: original.reason === "PURCHASE" ? "REFUND" : "ADJUSTMENT",
      idempotencyKey: opts.idempotencyKey,
      memo: opts.memo ?? `Reversal of ${originalTxId}`,
      createdById: opts.createdById,
      entries: original.entries.map((e) => ({ accountId: e.accountId, amount: -e.amount })),
    });

    await this.db.$transaction([
      this.db.ledgerTransaction.update({
        where: { id: originalTxId },
        data: { status: "REVERSED" },
      }),
      this.db.ledgerTransaction.update({
        where: { id: reversal.id },
        data: { reversesId: originalTxId },
      }),
    ]);

    return reversal;
  }

  /** A member's transaction history, newest first. */
  async history(userId: string, take = 50) {
    const account = await this.ensureUserAccount(userId);
    const entries = await this.db.ledgerEntry.findMany({
      where: { accountId: account.id },
      orderBy: { transaction: { createdAt: "desc" } },
      take,
      include: { transaction: true },
    });
    return { account, entries };
  }

  /** Circulating THC held by members (spec §31 groundwork). */
  async circulatingSupply(): Promise<bigint> {
    const agg = await this.db.ledgerAccount.aggregate({
      where: { type: "USER" },
      _sum: { balance: true },
    });
    return agg._sum.balance ?? 0n;
  }
}

export const ledger = new LedgerService();
