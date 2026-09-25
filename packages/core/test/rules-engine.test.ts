import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@tycoonhood/db";
import { EventBus } from "../src/events/bus";
import { parseCriteria, InvalidCriteriaError, describeCriteria } from "../src/rules/criteria";
import { localDayKey, localDayKeyOffset } from "../src/time/day";
import { LedgerService } from "../src/ledger/ledger";
import { createTestUser, uid } from "./helpers";

const events = new EventBus(prisma);
const ledger = new LedgerService(prisma);

const created: string[] = [];

// Missions created here are ACTIVE and global, so anything left behind would
// fire during other suites' events and silently change their numbers. Remove
// them after every test (completions cascade).
afterEach(async () => {
  if (created.length) {
    await prisma.mission.deleteMany({ where: { id: { in: created } } });
    created.length = 0;
  }
});

async function makeMission(criteria: object, over: Partial<{ repeatable: boolean; thcReward: bigint; xpReward: number }> = {}) {
  const m = await prisma.mission.create({
    data: {
      slug: `t-${uid().slice(0, 8)}`,
      name: "Test mission",
      description: "created by a test, as data only",
      criteria,
      xpReward: over.xpReward ?? 10,
      thcReward: over.thcReward ?? 100n,
      repeatable: over.repeatable ?? false,
      active: true,
    },
  });
  created.push(m.id);
  return m;
}

describe("rules engine — a mission defined as DATA pays out, with no code change", () => {
  it("completes a brand-new mission from a real event and pays exactly once", async () => {
    const user = await createTestUser();
    const m = await makeMission({ event: "DAILY_ACTIVE" });
    const wallet = await ledger.ensureUserAccount(user.id);

    const before = await ledger.getBalance(wallet.id);
    const first = await events.emitOrThrow({ type: "DAILY_ACTIVE", userId: user.id });
    expect(first.missions).toContain(m.slug);
    const afterFirst = await ledger.getBalance(wallet.id);
    // Our mission's 100 THC landed (the seeded check-in may add its own on top).
    expect(afterFirst - before).toBeGreaterThanOrEqual(100n);

    // Same event again: our mission is recorded once and paid once.
    const second = await events.emitOrThrow({ type: "DAILY_ACTIVE", userId: user.id });
    expect(second.missions).not.toContain(m.slug);
    const afterSecond = await ledger.getBalance(wallet.id);
    expect(afterSecond).toBe(afterFirst);

    const completions = await prisma.missionCompletion.count({ where: { userId: user.id, missionId: m.id } });
    expect(completions).toBe(1);
  });

  it("respects a count threshold, counting real evidence rows", async () => {
    const user = await createTestUser();
    const lessons = await prisma.lesson.findMany({ take: 2, orderBy: { id: "asc" } });
    expect(lessons.length).toBe(2); // academy seed must be present

    const m = await makeMission({ event: "LESSON_COMPLETED", count: 2 });

    // One lesson done — not enough.
    await prisma.lessonProgress.create({
      data: { userId: user.id, lessonId: lessons[0].id, completedAt: new Date() },
    });
    const a = await events.emitOrThrow({
      type: "LESSON_COMPLETED", userId: user.id, lessonId: lessons[0].id, courseId: "x",
    });
    expect(a.missions).not.toContain(m.slug);

    // Second lesson done — threshold met.
    await prisma.lessonProgress.create({
      data: { userId: user.id, lessonId: lessons[1].id, completedAt: new Date() },
    });
    const b = await events.emitOrThrow({
      type: "LESSON_COMPLETED", userId: user.id, lessonId: lessons[1].id, courseId: "x",
    });
    expect(b.missions).toContain(m.slug);
  });

  it("never pays for an event with no source of truth yet", async () => {
    // VIDEO_WATCHED used to be the example here. Watch-to-earn shipped, so it
    // now has a real store and pays. COMMUNITY_CONTRIBUTION still has none:
    // Discord gives us no verifiable contribution feed.
    const user = await createTestUser();
    const m = await makeMission({ event: "COMMUNITY_CONTRIBUTION" });
    const wallet = await ledger.ensureUserAccount(user.id);

    const r = await events.emitOrThrow({ type: "COMMUNITY_CONTRIBUTION", userId: user.id });

    expect(r.missions).not.toContain(m.slug);
    expect(r.skipped.some((s) => s.slug === m.slug)).toBe(true);
    expect(await ledger.getBalance(wallet.id)).toBe(0n); // nothing at all was paid
  });

  it("now DOES pay for a watched video, because that store exists", async () => {
    const user = await createTestUser();
    const m = await makeMission({ event: "VIDEO_WATCHED", count: 1 });
    const task = await prisma.watchTask.create({
      data: {
        slug: `t-rules-watch-${uid().slice(0, 6)}`,
        title: "A video",
        youtubeVideoId: "abc123",
        durationSec: 60,
        requiredSec: 10,
        active: true,
      },
    });
    await prisma.watchCompletion.create({
      data: { userId: user.id, taskId: task.id, completedAt: new Date(), secondsWatched: 60, dayKey: "2026-01-01" },
    });

    const r = await events.emitOrThrow({ type: "VIDEO_WATCHED", userId: user.id, videoTaskId: task.id });
    expect(r.missions).toContain(m.slug);
    await prisma.watchTask.delete({ where: { id: task.id } });
  });

  it("ignores a rule it cannot read instead of crashing the member's action", async () => {
    const user = await createTestUser();
    const m = await makeMission({ event: "NOT_A_REAL_EVENT", count: 1 });

    const r = await events.emitOrThrow({ type: "DAILY_ACTIVE", userId: user.id });

    expect(r.skipped.some((s) => s.slug === m.slug && s.why === "unreadable criteria")).toBe(true);
  });

  it("emit is fail-soft — a broken rule never throws into the caller", async () => {
    const r = await events.emit({ type: "DAILY_ACTIVE", userId: "no-such-user" });
    expect(r.ok === true || r.ok === false).toBe(true); // resolves either way, never throws
  });
});

describe("criteria DSL", () => {
  it("accepts a well-formed rule and describes it for humans", () => {
    const c = parseCriteria({ event: "LESSON_COMPLETED", count: 5, within: "7d", scope: { pillar: "WARRIOR" } });
    expect(c.event).toBe("LESSON_COMPLETED");
    expect(c.count).toBe(5);
    expect(describeCriteria(c)).toBe("complete 5 lessons in warrior within 7d");
  });

  it("rejects malformed rules loudly", () => {
    expect(() => parseCriteria({ event: "NOPE" })).toThrow(InvalidCriteriaError);
    expect(() => parseCriteria({ event: "LESSON_COMPLETED", count: 0 })).toThrow(InvalidCriteriaError);
    expect(() => parseCriteria({ event: "LESSON_COMPLETED", within: "soon" })).toThrow(InvalidCriteriaError);
    expect(() => parseCriteria({ event: "LESSON_COMPLETED", scope: { pillar: "SPICY" } })).toThrow(InvalidCriteriaError);
    expect(() => parseCriteria(null)).toThrow(InvalidCriteriaError);
  });
});

describe("local day (spec §19) — the member's day, not UTC", () => {
  it("credits a late-evening California action to that member's day", () => {
    // 2026-03-10 01:30 UTC === 2026-03-09 18:30 in Los Angeles.
    const at = new Date("2026-03-10T01:30:00Z");
    expect(localDayKey(at, "America/Los_Angeles")).toBe("2026-03-09");
    expect(localDayKey(at, "UTC")).toBe("2026-03-10");
  });

  it("credits an early-morning India action to that member's day", () => {
    // 2026-03-09 23:45 UTC === 2026-03-10 05:15 IST — the streak bug in one line.
    const at = new Date("2026-03-09T23:45:00Z");
    expect(localDayKey(at, "Asia/Kolkata")).toBe("2026-03-10");
    expect(localDayKey(at, "UTC")).toBe("2026-03-09");
  });

  it("walks consecutive days in the member's zone", () => {
    const at = new Date("2026-03-10T01:30:00Z");
    expect(localDayKeyOffset(at, "Asia/Kolkata", -1)).toBe("2026-03-09");
  });

  it("falls back to UTC on a garbage zone rather than throwing in a reward path", () => {
    const at = new Date("2026-03-09T23:45:00Z");
    expect(localDayKey(at, "Mars/Olympus_Mons")).toBe("2026-03-09");
  });
});
