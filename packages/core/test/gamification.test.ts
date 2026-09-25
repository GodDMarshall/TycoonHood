import { describe, it, expect } from "vitest";
import { prisma } from "@tycoonhood/db";
import { XpService } from "../src/gamification/xp";
import { RewardsService } from "../src/rewards/rewards";
import { LedgerService } from "../src/ledger/ledger";
import { xpRequiredForLevel } from "@tycoonhood/config";
import { createTestUser, uid } from "./helpers";

const xp = new XpService(prisma);
const rewards = new RewardsService(prisma);
const ledger = new LedgerService(prisma);

describe("XP engine", () => {
  it("crossing a threshold levels up and notifies", async () => {
    const user = await createTestUser();
    const need = xpRequiredForLevel(2); // 500
    const result = await xp.awardXp({
      userId: user.id,
      amount: need + 100,
      source: "ADMIN_GRANT",
      idempotencyKey: uid(),
    });
    expect(result.level).toBe(2);
    expect(result.leveledUp).toBe(true);

    const note = await prisma.notification.findFirst({
      where: { userId: user.id, type: "LEVEL_UP" },
    });
    expect(note).not.toBeNull();
  });

  it("is idempotent per key: XP applies once", async () => {
    const user = await createTestUser();
    const key = uid();
    const first = await xp.awardXp({ userId: user.id, amount: 200, source: "ADMIN_GRANT", idempotencyKey: key });
    const second = await xp.awardXp({ userId: user.id, amount: 200, source: "ADMIN_GRANT", idempotencyKey: key });
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.xp).toBe(200);
  });

  it("promotes rank at the configured level (Apprentice @ level 5)", async () => {
    const user = await createTestUser();
    const result = await xp.awardXp({
      userId: user.id,
      amount: xpRequiredForLevel(5), // exactly reach L5
      source: "ADMIN_GRANT",
      idempotencyKey: uid(),
    });
    expect(result.level).toBe(5);
    expect(result.rankSlug).toBe("apprentice");
    expect(result.rankedUp).toBe(true);
  });

  it("caches match the append-only event log", async () => {
    const user = await createTestUser();
    await xp.awardXp({ userId: user.id, amount: 120, source: "ADMIN_GRANT", idempotencyKey: uid() });
    await xp.awardXp({ userId: user.id, amount: 80, source: "ADMIN_GRANT", idempotencyKey: uid() });

    const events = await prisma.xpEvent.aggregate({ where: { userId: user.id }, _sum: { amount: true } });
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.xp).toBe(events._sum.amount);
  });
});

describe("Reward pipeline — mission → XP + THC + notification", () => {
  it("grants everything once, end to end", async () => {
    const user = await createTestUser();
    const mission = await prisma.mission.findUniqueOrThrow({ where: { slug: "first-lesson" } });

    const result = await rewards.completeMission({ userId: user.id, missionSlug: "first-lesson" });
    expect(result.firstCompletion).toBe(true);
    expect(result.xp?.xp).toBe(mission.xpReward);
    expect(result.thcTransactionId).not.toBeNull();

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(mission.thcReward);

    const note = await prisma.notification.findFirst({ where: { userId: user.id, type: "MISSION" } });
    expect(note?.title).toContain(mission.name);
  });

  it("repeat completion of a non-repeatable mission changes nothing", async () => {
    const user = await createTestUser();
    await rewards.completeMission({ userId: user.id, missionSlug: "first-lesson" });
    const again = await rewards.completeMission({ userId: user.id, missionSlug: "first-lesson" });
    expect(again.firstCompletion).toBe(false);

    const mission = await prisma.mission.findUniqueOrThrow({ where: { slug: "first-lesson" } });
    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(mission.thcReward); // not doubled
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.xp).toBe(mission.xpReward); // not doubled
  });
});
