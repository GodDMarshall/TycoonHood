import { describe, it, expect } from "vitest";
import { prisma } from "@tycoonhood/db";
import { MiningService, RigMaxedError } from "../src/mining/mining";
import { LedgerService } from "../src/ledger/ledger";
import { MINING } from "@tycoonhood/config";
import { createTestUser } from "./helpers";

const mining = new MiningService(prisma);
const ledger = new LedgerService(prisma);

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

async function backdate(userId: string, hours: number) {
  await mining.getState(userId);
  await prisma.minerState.update({ where: { userId }, data: { lastClaimAt: hoursAgo(hours) } });
}

describe("Miner — accrual", () => {
  it("accrues at level rate and caps at storage", async () => {
    const user = await createTestUser();
    await backdate(user.id, 3);
    const p3 = await mining.preview(user.id);
    expect(p3.accrued).toBe(MINING.baseRatePerHour * 3n);
    expect(p3.full).toBe(false);

    await backdate(user.id, 500); // way past capacity
    const pFull = await mining.preview(user.id);
    expect(pFull.accrued).toBe(MINING.baseRatePerHour * BigInt(MINING.capacityHours));
    expect(pFull.full).toBe(true);
  });
});

describe("Miner — claims", () => {
  it("claim pays from MINING_POOL onto the ledger, exactly once per accrual window", async () => {
    const user = await createTestUser();
    await backdate(user.id, 5);
    const expected = MINING.baseRatePerHour * 5n;

    const poolBefore = (await ledger.systemAccount("MINING_POOL")).balance;
    const r = await mining.claim(user.id);
    expect(r.claimed).toBe(expected);

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(expected);
    const poolAfter = (await ledger.systemAccount("MINING_POOL")).balance;
    expect(poolBefore - poolAfter).toBe(expected);

    // Immediately claiming again pays ~nothing (fresh window)
    const r2 = await mining.claim(user.id);
    expect(r2.claimed).toBe(0n);
    expect(await ledger.getBalance(wallet.id)).toBe(expected);

    const audit = await ledger.auditAccount(wallet.id);
    expect(audit.consistent).toBe(true);
  });

  it("concurrent claims collapse to a single payout", async () => {
    const user = await createTestUser();
    await backdate(user.id, 4);
    const expected = MINING.baseRatePerHour * 4n;

    await Promise.all(Array.from({ length: 6 }, () => mining.claim(user.id)));

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(expected);
    const state = await prisma.minerState.findUniqueOrThrow({ where: { userId: user.id } });
    expect(state.totalMined).toBe(expected);
  });
});

describe("Miner — upgrades", () => {
  it("upgrade burns the exact cost through spend() and raises the rate", async () => {
    const user = await createTestUser();
    // Fund the wallet enough for L1→L2
    await ledger.reward({
      userId: user.id,
      amount: MINING.upgradeCosts[1] + 100n,
      reason: "REWARD_ADMIN",
      idempotencyKey: `test-fund-${user.id}`,
    });
    const wallet = await ledger.ensureUserAccount(user.id);
    const before = await ledger.getBalance(wallet.id);

    const state = await mining.upgrade(user.id);
    expect(state.rigLevel).toBe(2);

    const after = await ledger.getBalance(wallet.id);
    // Balance dropped by cost, possibly plus a tiny banked claim credited back
    expect(before - after).toBeLessThanOrEqual(MINING.upgradeCosts[1]);
    expect(before - after).toBeGreaterThan(MINING.upgradeCosts[1] - MINING.baseRatePerHour);

    const p = await mining.preview(user.id);
    expect(p.ratePerHour).toBe(MINING.baseRatePerHour * 2n);
  });

  it("refuses to upgrade past max level", async () => {
    const user = await createTestUser();
    await mining.getState(user.id);
    await prisma.minerState.update({ where: { userId: user.id }, data: { rigLevel: MINING.maxLevel } });
    await expect(mining.upgrade(user.id)).rejects.toBeInstanceOf(RigMaxedError);
  });
});
