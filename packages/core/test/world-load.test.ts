/**
 * The 3D campus loader (DR-30) against the dev database: it only reads, it
 * shows nobody but the viewer, it respects the leaderboard opt-out and the
 * lesson order (DR-25), and its house-wide counts leave suspended members
 * out. The database is shared, so house-wide changes are asserted as
 * "at least". Courses, channels and achievements made here are deleted.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { loadWorldState } from "../src/world/load";
import { miningView } from "../src/world/state";
import { MiningService } from "../src/mining/mining";
import { createTestUser, uid } from "./helpers";

const courses: string[] = [];
const channels: string[] = [];
const achievementIds: string[] = [];

afterAll(async () => {
  await prisma.course.deleteMany({ where: { id: { in: courses } } });
  await prisma.channel.deleteMany({ where: { id: { in: channels } } });
  await prisma.achievement.deleteMany({ where: { id: { in: achievementIds } } });
});

async function program(title: string, lessonCount = 3) {
  const course = await prisma.course.create({
    data: {
      slug: `t-${uid().slice(0, 8)}`,
      title,
      description: "A throwaway programme created by the world loader tests.",
      pillar: "MIND",
      status: "PUBLISHED",
      modules: {
        create: {
          title: "One",
          sortOrder: 0,
          lessons: {
            create: Array.from({ length: lessonCount }, (_, i) => ({ title: `${title} lesson ${i + 1}`, type: "READING" as const, sortOrder: i })),
          },
        },
      },
    },
    include: { modules: { include: { lessons: { orderBy: { sortOrder: "asc" } } } } },
  });
  courses.push(course.id);
  return { course, lessons: course.modules[0].lessons };
}

/** B meets their standard, posts in a house channel and unlocks an achievement. */
async function busyMember() {
  const b = await createTestUser();
  await prisma.standardDay.create({ data: { userId: b.id, day: new Date(Date.UTC(2026, 10, 11)), items: 3, metAt: new Date() } });
  const channel = await prisma.channel.create({ data: { slug: `test-${uid().slice(0, 8)}`, name: "Test" } });
  channels.push(channel.id);
  await prisma.message.create({ data: { channelId: channel.id, authorId: b.id, body: "Shipped the landing page today." } });
  // Inactive, so no other member's achievement count moves.
  const achievement = await prisma.achievement.create({
    data: { slug: `t-${uid().slice(0, 8)}`, name: "Test", description: "Throwaway", criteria: {}, active: false },
  });
  achievementIds.push(achievement.id);
  await prisma.userAchievement.create({ data: { userId: b.id, achievementId: achievement.id } });
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: b.id } });
  return { ...b, username: profile.username };
}

describe("loadWorldState: read-only", () => {
  it("creates nothing for a brand-new member", async () => {
    const a = await createTestUser();
    const tally = () =>
      Promise.all([
        prisma.ledgerAccount.count(),
        prisma.minerState.count(),
        prisma.channelRead.count(),
        prisma.standardDay.count(),
        prisma.standardTick.count(),
        prisma.streak.count(),
      ]);
    const before = await tally();
    const state = await loadWorldState(a.id, { fresh: true });
    expect(await tally()).toEqual(before);

    expect(await prisma.ledgerAccount.findUnique({ where: { userId: a.id } })).toBeNull();
    expect(await prisma.minerState.findUnique({ where: { userId: a.id } })).toBeNull();
    expect(state.mining).toMatchObject({ started: false, rigLevel: 1, accrued: "0", wallet: "0" });
    expect(state.store).toEqual({ cart: 0, wishlist: 0, orders: 0, affiliate: "NONE" });
    expect(state.today.next).toBeNull();
    expect(state.courses.programs).toEqual([]);
  });
});

describe("loadWorldState: privacy", () => {
  it("never carries another member, nor the viewer's own identity", async () => {
    const a = await createTestUser();
    const aProfile = await prisma.profile.findUniqueOrThrow({ where: { userId: a.id } });
    const b = await busyMember();
    const json = JSON.stringify(await loadWorldState(a.id, { fresh: true }));
    for (const secret of [b.id, b.username, b.email, b.name ?? "", a.id, a.email, aProfile.username]) {
      expect(secret.length).toBeGreaterThan(0);
      expect(json).not.toContain(secret);
    }
  });

  it("hides the week's place for a member who opted out", async () => {
    const a = await createTestUser();
    await prisma.profile.update({ where: { userId: a.id }, data: { privacy: { leaderboard: false } } });
    const state = await loadWorldState(a.id);
    expect(state.leaderboard.week.hidden).toBe(true);
    expect(state.leaderboard.week.position).toBeNull();
  });
});

describe("loadWorldState: lessons in order (DR-25)", () => {
  it("continues with the next open lesson and ignores a dropped programme", async () => {
    const a = await createTestUser();
    const kept = await program("Kept");
    await prisma.enrollment.create({ data: { userId: a.id, courseId: kept.course.id, status: "ACTIVE" } });
    await prisma.lessonProgress.create({ data: { userId: a.id, lessonId: kept.lessons[0].id, completedAt: new Date() } });

    // Newer, and touched more recently: it would win if DROPPED counted.
    const dropped = await program("Dropped");
    await prisma.enrollment.create({ data: { userId: a.id, courseId: dropped.course.id, status: "DROPPED", enrolledAt: new Date(Date.now() + 1_000) } });
    await prisma.lessonProgress.create({ data: { userId: a.id, lessonId: dropped.lessons[0].id, videoPositionSec: 30 } });

    const state = await loadWorldState(a.id);
    expect(state.today.next).toEqual({
      slug: kept.course.slug,
      course: "Kept",
      lessonId: kept.lessons[1].id,
      lesson: kept.lessons[1].title,
    });
    expect(state.today.next?.lessonId).not.toBe(kept.lessons[2].id);
    expect(state.courses.programs).toEqual([
      {
        slug: kept.course.slug,
        title: "Kept",
        pillar: "MIND",
        done: 1,
        lessons: 3,
        pct: 33,
        next: { lessonId: kept.lessons[1].id, lesson: kept.lessons[1].title },
      },
    ]);
  });
});

describe("loadWorldState: house-wide counts", () => {
  it("counts the last 24 hours, keeps them for 60 seconds, and reads afresh on request", async () => {
    const a = await createTestUser();
    const before = (await loadWorldState(a.id, { fresh: true })).presence;
    await busyMember();
    const remembered = (await loadWorldState(a.id)).presence;
    expect(remembered).toEqual(before);

    const after = (await loadWorldState(a.id, { fresh: true })).presence;
    expect(after.today).toBeGreaterThanOrEqual(before.today + 1);
    expect(after.community).toBeGreaterThanOrEqual(before.community + 1);
    expect(after.leaderboard).toBeGreaterThanOrEqual(before.leaderboard + 1);
    expect(after.store).toBeNull();
  });

  it("leaves suspended members out of the rank counts", async () => {
    const a = await createTestUser();
    const rank = await prisma.rankDefinition.findFirstOrThrow({ orderBy: { sortOrder: "asc" } });
    const members = async () =>
      (await loadWorldState(a.id, { fresh: true })).leaderboard.ranks.find((r) => r.name === rank.name)!.members;

    const before = await members();
    const s = await createTestUser();
    await prisma.user.update({ where: { id: s.id }, data: { rankId: rank.id, suspendedAt: new Date() } });
    await prisma.profile.update({ where: { userId: s.id }, data: { onboardedAt: new Date() } });
    expect(await members()).toBe(before);

    await prisma.user.update({ where: { id: s.id }, data: { suspendedAt: null } });
    expect(await members()).toBeGreaterThanOrEqual(before + 1);
  });
});

describe("loadWorldState: edges", () => {
  it("throws for an unknown member", async () => {
    await expect(loadWorldState(uid())).rejects.toThrow();
  });

  it("works the rig sums out exactly as MiningService does", () => {
    const mining = new MiningService(prisma);
    const now = new Date("2026-11-11T12:00:00.000Z");
    for (let level = 1; level <= 10; level++) {
      for (const ago of [0, 60_000, 37 * 60_000, 3 * 3_600_000, 30 * 3_600_000]) {
        const state = { rigLevel: level, lastClaimAt: new Date(now.getTime() - ago) };
        const v = miningView(state, null, now);
        expect(v.ratePerHour).toBe(mining.ratePerHour(level).toString());
        expect(v.capacity).toBe(mining.capacity(level).toString());
        expect(v.accrued).toBe(mining.accruedFor(state, now).toString());
      }
    }
  });
});
