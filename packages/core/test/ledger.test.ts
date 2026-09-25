import { describe, it, expect } from "vitest";
import { prisma } from "@tycoonhood/db";
import { LedgerService, UnbalancedTransactionError, InsufficientFundsError } from "../src/ledger/ledger";
import { THC_TOTAL_SUPPLY } from "@tycoonhood/config";
import { createTestUser, uid } from "./helpers";

const ledger = new LedgerService(prisma);

describe("THC ledger — genesis invariants", () => {
  it("total supply is provable from the mint account", async () => {
    const mint = await ledger.systemAccount("SYSTEM_MINT");
    expect(-mint.balance).toBe(THC_TOTAL_SUPPLY);
  });

  it("all entries across the entire ledger sum to zero", async () => {
    const sum = await prisma.ledgerEntry.aggregate({ _sum: { amount: true } });
    expect(sum._sum.amount ?? 0n).toBe(0n);
  });

  it("genesis posted exactly once despite repeated seeding", async () => {
    const count = await prisma.ledgerTransaction.count({ where: { reason: "GENESIS_MINT" } });
    expect(count).toBe(1);
  });
});

describe("THC ledger — posting rules", () => {
  it("rejects unbalanced transactions", async () => {
    const user = await createTestUser();
    const wallet = await ledger.ensureUserAccount(user.id);
    const pool = await ledger.systemAccount("REWARDS_POOL");
    await expect(
      ledger.post({
        reason: "ADJUSTMENT",
        idempotencyKey: uid(),
        entries: [
          { accountId: pool.id, amount: -100n },
          { accountId: wallet.id, amount: 99n },
        ],
      })
    ).rejects.toBeInstanceOf(UnbalancedTransactionError);
  });

  it("rejects single-entry and zero-amount transactions", async () => {
    const pool = await ledger.systemAccount("REWARDS_POOL");
    await expect(
      ledger.post({ reason: "ADJUSTMENT", idempotencyKey: uid(), entries: [{ accountId: pool.id, amount: 0n }] })
    ).rejects.toBeInstanceOf(UnbalancedTransactionError);
  });

  it("is idempotent: same key twice moves THC once", async () => {
    const user = await createTestUser();
    const key = uid();
    const tx1 = await ledger.reward({ userId: user.id, amount: 1_000n, reason: "REWARD_ADMIN", idempotencyKey: key });
    const tx2 = await ledger.reward({ userId: user.id, amount: 1_000n, reason: "REWARD_ADMIN", idempotencyKey: key });
    expect(tx2.id).toBe(tx1.id);

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(1_000n);
  });

  it("refuses to overdraw a user wallet", async () => {
    const user = await createTestUser();
    await ledger.reward({ userId: user.id, amount: 100n, reason: "REWARD_ADMIN", idempotencyKey: uid() });
    await expect(
      ledger.spend({ userId: user.id, amount: 200n, idempotencyKey: uid() })
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    // Failed spend must leave no trace: balance intact, cache == derived.
    const wallet = await ledger.ensureUserAccount(user.id);
    const audit = await ledger.auditAccount(wallet.id);
    expect(audit.cached).toBe(100n);
    expect(audit.consistent).toBe(true);
  });

  it("stays consistent under concurrent rewards", async () => {
    const user = await createTestUser();
    await Promise.all(
      Array.from({ length: 10 }, () =>
        ledger.reward({ userId: user.id, amount: 5n, reason: "REWARD_ADMIN", idempotencyKey: uid() })
      )
    );
    const wallet = await ledger.ensureUserAccount(user.id);
    const audit = await ledger.auditAccount(wallet.id);
    expect(audit.cached).toBe(50n);
    expect(audit.derived).toBe(50n);
    expect(audit.consistent).toBe(true);
  });

  it("concurrent identical requests (same key) settle to one transaction", async () => {
    const user = await createTestUser();
    const key = uid();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        ledger.reward({ userId: user.id, amount: 77n, reason: "REWARD_ADMIN", idempotencyKey: key })
      )
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(77n);
  });
});

describe("THC ledger — reversals", () => {
  it("reverses with a compensating transaction, never mutating the original", async () => {
    const user = await createTestUser();
    await ledger.reward({ userId: user.id, amount: 500n, reason: "REWARD_ADMIN", idempotencyKey: uid() });
    const purchase = await ledger.spend({ userId: user.id, amount: 300n, idempotencyKey: uid(), memo: "test product" });

    const reversal = await ledger.reverse(purchase.id, { idempotencyKey: uid(), memo: "refund" });

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(500n);

    const original = await prisma.ledgerTransaction.findUniqueOrThrow({
      where: { id: purchase.id },
      include: { entries: true },
    });
    expect(original.status).toBe("REVERSED");
    expect(original.entries.length).toBe(2); // untouched
    expect(reversal.reason).toBe("REFUND");

    const audit = await ledger.auditAccount(wallet.id);
    expect(audit.consistent).toBe(true);
  });
});

describe("THC ledger — finite pools cannot overdraw (DR-6)", () => {
  it("refuses to drive MINING_POOL negative and leaves it untouched", async () => {
    const user = await createTestUser();
    const wallet = await ledger.ensureUserAccount(user.id);
    const pool = await ledger.systemAccount("MINING_POOL");
    const before = pool.balance;

    await expect(
      ledger.post({
        reason: "REWARD_MINING",
        idempotencyKey: uid(),
        entries: [
          { accountId: pool.id, amount: -(before + 1n) },
          { accountId: wallet.id, amount: before + 1n },
        ],
      })
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    const after = await ledger.systemAccount("MINING_POOL");
    expect(after.balance).toBe(before); // pool untouched by the refused payout

    const sum = await prisma.ledgerEntry.aggregate({ _sum: { amount: true } });
    expect(sum._sum.amount ?? 0n).toBe(0n); // book still balances
  });

  it("refuses to drive REWARDS_POOL negative", async () => {
    const user = await createTestUser();
    const wallet = await ledger.ensureUserAccount(user.id);
    const pool = await ledger.systemAccount("REWARDS_POOL");
    const before = pool.balance;
    await expect(
      ledger.post({
        reason: "REWARD_ADMIN",
        idempotencyKey: uid(),
        entries: [
          { accountId: pool.id, amount: -(before + 1n) },
          { accountId: wallet.id, amount: before + 1n },
        ],
      })
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    const after = await ledger.systemAccount("REWARDS_POOL");
    expect(after.balance).toBe(before);
  });
});
