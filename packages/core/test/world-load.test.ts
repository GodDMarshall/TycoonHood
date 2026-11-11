/**
 * The 3D campus loader (DR-31) against the dev database: it only reads, it
 * shows nobody but the viewer, it respects the leaderboard opt-out and the
 * lesson order (DR-25), and its house-wide counts leave suspended members
 * out. The database is shared, so house-wide changes are asserted as
 * "at least", or against one fixed `now`. Courses, channels, groups, posts,
 * achievements and XP made here are deleted.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { loadWorldState } from "../src/world/load";
import { miningView } from "../src/world/state";
import { MiningService } from "../src/mining/mining";
import { LeaderboardService } from "../src/discussions/leaderboard";
import { createTestUser, uid } from "./helpers";

const courses: string[] = [];
const channels: string[] = [];
const achievementIds: string[] = [];
const posts: string[] = [];
const groups: string[] = [];

afterAll(async () => {
  await prisma.course.deleteMany({ where: { id: { in: courses } } });
  await prisma.channel.deleteMany({ where: { id: { in: channels } } });
  await prisma.achievement.deleteMany({ where: { id: { in: achievementIds } } });
  // Posts before their group: a group's posts would otherwise fall into the main feed.
  await prisma.communityPost.deleteMany({ where: { id: { in: posts } } });
  await prisma.communityGroup.deleteMany({ where: { id: { in: groups } } });
});

const grant = (userId: string, amount: number, createdAt: Date) =>
  prisma.xpEvent.create({ data: { userId, amount, source: "ADMIN_GRANT", idempotencyKey: `t:${uid()}`, createdAt } });

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
    // B tops this week's board, so a loader that shipped the top of the board would carry them.
    const xp = await grant(b.id, 1_000_000, new Date());
    try {
      const board = await new LeaderboardService(prisma).board(a.id, "week");
      expect(board.rows[0]?.userId).toBe(b.id);
      const json = JSON.stringify(await loadWorldState(a.id, { fresh: true }));
      for (const secret of [b.id, b.username, b.email, b.name ?? "", a.id, a.email, aProfile.username]) {
        expect(secret.length).toBeGreaterThan(0);
        expect(json).not.toContain(secret);
      }
    } finally {
      await prisma.xpEvent.delete({ where: { id: xp.id } });
    }
  });

  it("gives the week's place exactly as the leaderboard does, from the viewer's figures alone", async () => {
    // A week far in the future, so no other XP lands in it.
    const now = new Date("2099-06-17T12:00:00Z");
    const monday = new Date("2099-06-15T00:00:00Z");
    const [a, b, hidden, idle] = [await createTestUser(), await createTestUser(), await createTestUser(), await createTestUser()];
    await grant(a.id, 300, new Date(monday.getTime() + 3_600_000));
    await grant(b.id, 500, new Date(monday.getTime() + 7_200_000));
    await grant(hidden.id, 900, new Date(monday.getTime() + 3_600_000));
    await prisma.profile.update({ where: { userId: hidden.id }, data: { privacy: { leaderboard: false } } });
    try {
      const lb = new LeaderboardService(prisma);
      for (const m of [a, b, hidden, idle]) {
        const week = (await loadWorldState(m.id, { now, fresh: true })).leaderboard.week;
        expect(week).toEqual((await lb.board(m.id, "week", now)).viewer);
        expect(await lb.standing(m.id, "week", now)).toEqual(week);
      }
      expect((await loadWorldState(a.id, { now, fresh: true })).leaderboard.week).toEqual({ hidden: false, xp: 300, position: 2 });
      expect((await loadWorldState(hidden.id, { now, fresh: true })).leaderboard.week).toEqual({ hidden: true, xp: 900, position: null });
      expect((await loadWorldState(idle.id, { now, fresh: true })).leaderboard.week).toEqual({ hidden: false, xp: 0, position: null });
    } finally {
      await prisma.xpEvent.deleteMany({ where: { userId: { in: [a.id, b.id, hidden.id] } } });
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

  it("counts as discussions only the posts in the discussions feed, not chat or group posts", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const now = new Date();
    const read = async () => (await loadWorldState(a.id, { now, fresh: true })).presence;
    const before = await read();

    const channel = await prisma.channel.create({ data: { slug: `test-${uid().slice(0, 8)}`, name: "Test" } });
    channels.push(channel.id);
    await prisma.message.create({ data: { channelId: channel.id, authorId: b.id, body: "Chat, not a discussion." } });
    const group = await prisma.communityGroup.create({ data: { slug: `t-${uid().slice(0, 8)}`, name: "Test", description: "Throwaway" } });
    groups.push(group.id);
    posts.push((await prisma.communityPost.create({ data: { authorId: b.id, groupId: group.id, title: "In a group", body: "Only the group's feed shows this." } })).id);
    const mid = await read();
    expect(mid.community).toBe(before.community + 2);
    expect(mid.discussions).toBe(before.discussions);

    posts.push((await prisma.communityPost.create({ data: { authorId: b.id, title: "In the feed", body: "The discussions feed shows this." } })).id);
    const after = await read();
    expect(after.discussions).toBe(before.discussions + 1);
    expect(after.community).toBe(mid.community + 1);
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
