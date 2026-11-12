/**
 * A mission payout records which occurrence it filled (data-model 0.5).
 * MissionCompletion.occurrence is the period the completion counts for:
 * "once", or a member day key for a repeatable mission. It was only ever
 * folded into the idempotency key; now it is a column of its own, unique per
 * (mission, member, occurrence), so the daily engine can ask for it directly.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { RewardsService } from "../src/rewards/rewards";
import { localDayKey } from "../src/time/day";
import { createTestUser, uid } from "./helpers";

const rewards = new RewardsService(prisma);
const missions: string[] = [];

async function mission(repeatable: boolean) {
  const m = await prisma.mission.create({
    data: {
      slug: `occurrence-${uid().slice(0, 8)}`,
      name: "Occurrence test",
      description: "A throwaway mission for the occurrence tests.",
      criteria: { event: "LESSON_COMPLETED" },
      repeatable,
      xpReward: 0,
      thcReward: 0n,
    },
  });
  missions.push(m.id);
  return m;
}

afterAll(async () => {
  await prisma.mission.updateMany({ where: { id: { in: missions } }, data: { active: false } });
});

describe("mission completions record their occurrence", () => {
  it("a one-off mission's completion is the 'once' occurrence", async () => {
    const m = await mission(false);
    const user = await createTestUser();
    await rewards.completeMission({ userId: user.id, missionSlug: m.slug });
    const row = await prisma.missionCompletion.findFirstOrThrow({ where: { missionId: m.id, userId: user.id } });
    expect(row.occurrence).toBe("once");
    expect(row.idempotencyKey).toBe(`mission:${m.id}:${user.id}:once`);
  });

  it("a repeatable mission's completion is the occurrence it was given, the same one its key carries", async () => {
    const m = await mission(true);
    const user = await createTestUser();
    expect((await rewards.completeMission({ userId: user.id, missionSlug: m.slug, occurrence: "2026-11-10" })).firstCompletion).toBe(true);
    expect((await rewards.completeMission({ userId: user.id, missionSlug: m.slug, occurrence: "2026-11-11" })).firstCompletion).toBe(true);
    // The same occurrence again pays nothing and records nothing new.
    expect((await rewards.completeMission({ userId: user.id, missionSlug: m.slug, occurrence: "2026-11-10" })).firstCompletion).toBe(false);

    const rows = await prisma.missionCompletion.findMany({ where: { missionId: m.id, userId: user.id }, orderBy: { occurrence: "asc" } });
    expect(rows.map((r) => r.occurrence)).toEqual(["2026-11-10", "2026-11-11"]);
    for (const r of rows) expect(r.idempotencyKey).toBe(`mission:${m.id}:${user.id}:${r.occurrence}`);
  });

  it("a repeatable mission with no occurrence given records the member's local day", async () => {
    const m = await mission(true);
    const user = await createTestUser();
    await prisma.profile.update({ where: { userId: user.id }, data: { timezone: "Asia/Kolkata" } });
    const before = localDayKey(new Date(), "Asia/Kolkata");
    await rewards.completeMission({ userId: user.id, missionSlug: m.slug });
    const after = localDayKey(new Date(), "Asia/Kolkata");
    const row = await prisma.missionCompletion.findFirstOrThrow({ where: { missionId: m.id, userId: user.id } });
    expect([before, after]).toContain(row.occurrence);
    expect(row.idempotencyKey).toBe(`mission:${m.id}:${user.id}:${row.occurrence}`);
  });
});
