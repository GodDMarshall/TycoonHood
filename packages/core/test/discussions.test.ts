import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@tycoonhood/db";
import { DiscussionService, DiscussionError, POSTS_PER_HOUR } from "../src/discussions/discussions";
import { LeaderboardService, onLeaderboard } from "../src/discussions/leaderboard";
import { can, isStaff } from "../src/auth/permissions";
import { parseCriteria, windowStart, weekKey, describeCriteria } from "../src/rules/criteria";
import { countEvidence } from "../src/rules/counters";
import { createTestUser, uid } from "./helpers";

const d = new DiscussionService(prisma);
const lb = new LeaderboardService(prisma);

const categoryIds: string[] = [];
const groupIds: string[] = [];

afterAll(async () => {
  await prisma.communityPost.deleteMany({ where: { OR: [{ categoryId: { in: categoryIds } }, { groupId: { in: groupIds } }] } });
  await prisma.communityCategory.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.communityGroup.deleteMany({ where: { id: { in: groupIds } } });
});

async function member() {
  const u = await createTestUser();
  return { id: u.id, role: u.role };
}

async function withRole(role: "MODERATOR" | "ADMIN" | "MEMBER") {
  const u = await createTestUser();
  await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role };
}

async function category() {
  const c = await prisma.communityCategory.create({ data: { slug: `t-${uid().slice(0, 8)}`, name: "Test category" } });
  categoryIds.push(c.id);
  return c;
}

async function group() {
  const g = await prisma.communityGroup.create({ data: { slug: `t-${uid().slice(0, 8)}`, name: "Test group", description: "A group made by a test." } });
  groupIds.push(g.id);
  return g;
}

describe("discussions", () => {
  it("creates a post, comments on it, counts comments in the same write, and notifies the author", async () => {
    const [a, b] = [await member(), await member()];
    const c = await category();
    const p = await d.createPost(a, { title: "How I kept my standard", body: "Five days straight.", categoryId: c.id });
    await d.comment(b, p.id, "Good work.");
    await d.comment(a, p.id, "Thanks.");
    const view = await d.post(b, p.id);
    expect(view?.commentCount).toBe(2);
    expect(view?.comments.map((x) => x.body)).toEqual(["Good work.", "Thanks."]);
    const notes = await prisma.notification.findMany({ where: { userId: a.id, type: "COMMUNITY" } });
    expect(notes).toHaveLength(1); // b's comment, not a's own
    expect(notes[0].title).toContain("commented");
  });

  it("validates title and body length", async () => {
    const a = await member();
    const c = await category();
    await expect(d.createPost(a, { title: "Hi", body: "x", categoryId: c.id })).rejects.toThrow(DiscussionError);
    await expect(d.createPost(a, { title: "A good title", body: "   ", categoryId: c.id })).rejects.toThrow(DiscussionError);
    await expect(d.createPost(a, { title: "A good title", body: "x".repeat(10_001), categoryId: c.id })).rejects.toThrow(DiscussionError);
  });

  it("lets the author edit within 30 minutes only", async () => {
    const a = await member();
    const c = await category();
    const t0 = new Date();
    const p = await d.createPost(a, { title: "First draft", body: "Body", categoryId: c.id }, t0);
    await d.editPost(a, p.id, { title: "Second draft", body: "Body 2" }, new Date(t0.getTime() + 10 * 60_000));
    await expect(d.editPost(a, p.id, { title: "Third draft", body: "Body 3" }, new Date(t0.getTime() + 31 * 60_000))).rejects.toThrow(/30 minutes/);
    const other = await member();
    await expect(d.editPost(other, p.id, { title: "Hijack it", body: "x" })).rejects.toThrow(DiscussionError);
  });

  it("toggles reactions, keeps the counter true, and refuses self-reactions", async () => {
    const [a, b] = [await member(), await member()];
    const c = await category();
    const p = await d.createPost(a, { title: "Reactions test", body: "Body", categoryId: c.id });
    await expect(d.toggleReaction(a, { type: "post", id: p.id }, "fire")).rejects.toThrow(/own/);
    await expect(d.toggleReaction(b, { type: "post", id: p.id }, "love")).rejects.toThrow(/Unknown/);

    expect((await d.toggleReaction(b, { type: "post", id: p.id }, "fire")).on).toBe(true);
    expect((await d.toggleReaction(b, { type: "post", id: p.id }, "insight")).on).toBe(true);
    let row = await prisma.communityPost.findUniqueOrThrow({ where: { id: p.id } });
    expect(row.reactionCount).toBe(2);
    const view = await d.post(b, p.id);
    expect(view?.reactions).toEqual({ respect: 0, insight: 1, fire: 1 });
    expect(view?.myReactions.sort()).toEqual(["fire", "insight"]);

    expect((await d.toggleReaction(b, { type: "post", id: p.id }, "fire")).on).toBe(false);
    row = await prisma.communityPost.findUniqueOrThrow({ where: { id: p.id } });
    expect(row.reactionCount).toBe(1);

    // Comments: no self-reaction either.
    const cm = await d.comment(b, p.id, "A comment");
    await expect(d.toggleReaction(b, { type: "comment", id: cm.id }, "respect")).rejects.toThrow(/own/);
    expect((await d.toggleReaction(a, { type: "comment", id: cm.id }, "respect")).on).toBe(true);
  });

  it("batches reaction notifications: one per post per hour", async () => {
    const [a, b, c2] = [await member(), await member(), await member()];
    const c = await category();
    const p = await d.createPost(a, { title: "Batch test", body: "Body", categoryId: c.id });
    await d.toggleReaction(b, { type: "post", id: p.id }, "fire");
    await d.toggleReaction(c2, { type: "post", id: p.id }, "respect");
    await d.toggleReaction(b, { type: "post", id: p.id }, "insight");
    const n = await prisma.notification.count({ where: { userId: a.id, type: "COMMUNITY", data: { path: ["kind"], equals: "reaction" } } });
    expect(n).toBe(1);
  });

  it("grants no XP and no THC for posting, commenting or reacting", async () => {
    const [a, b] = [await member(), await member()];
    const c = await category();
    const p = await d.createPost(a, { title: "No farming here", body: "Body", categoryId: c.id });
    await d.comment(b, p.id, "Comment");
    await d.toggleReaction(b, { type: "post", id: p.id }, "fire");
    const xp = await prisma.xpEvent.count({ where: { userId: { in: [a.id, b.id] } } });
    expect(xp).toBe(0);
  });

  it("rate-limits posts per hour by counting rows", async () => {
    const a = await member();
    const c = await category();
    const now = new Date();
    for (let i = 0; i < POSTS_PER_HOUR; i++) {
      await d.createPost(a, { title: `Post number ${i}`, body: "Body", categoryId: c.id }, now);
    }
    await expect(d.createPost(a, { title: "One too many", body: "Body", categoryId: c.id }, now)).rejects.toThrow(/an hour/);
    // An hour later the window has moved on.
    await expect(d.createPost(a, { title: "Next hour", body: "Body", categoryId: c.id }, new Date(now.getTime() + 61 * 60_000))).resolves.toBeTruthy();
  });

  it("blocks muted members from posting and commenting", async () => {
    const [a, b, mod] = [await member(), await member(), await withRole("MODERATOR")];
    const c = await category();
    const p = await d.createPost(a, { title: "Open thread", body: "Body", categoryId: c.id });
    await prisma.communityMute.create({ data: { userId: b.id, mutedById: mod.id, until: null } });
    await expect(d.createPost(b, { title: "Muted post", body: "Body", categoryId: c.id })).rejects.toThrow(/read but not post/);
    await expect(d.comment(b, p.id, "Muted comment")).rejects.toThrow(/read but not post/);
  });

  it("locked posts reject member comments, staff can still answer", async () => {
    const [a, b, mod] = [await member(), await member(), await withRole("MODERATOR")];
    const c = await category();
    const p = await d.createPost(a, { title: "Locking soon", body: "Body", categoryId: c.id });
    await d.setLocked(mod, p.id, true);
    await expect(d.comment(b, p.id, "Too late")).rejects.toThrow(/locked/);
    await expect(d.comment(mod, p.id, "Closing note")).resolves.toBeTruthy();
  });

  it("accepts one report per reporter per target, and none on your own writing", async () => {
    const [a, b] = [await member(), await member()];
    const c = await category();
    const p = await d.createPost(a, { title: "Reportable", body: "Body", categoryId: c.id });
    await d.report(b, { type: "post", id: p.id }, "Spam link");
    await expect(d.report(b, { type: "post", id: p.id }, "Spam again")).rejects.toThrow(/already reported/);
    await expect(d.report(a, { type: "post", id: p.id }, "My own")).rejects.toThrow(/own/);
  });

  it("staff hide hides from members but not from staff; reporters are told", async () => {
    const [a, b, viewer, mod] = [await member(), await member(), await member(), await withRole("MODERATOR")];
    const c = await category();
    const p = await d.createPost(a, { title: "Will be hidden", body: "Body", categoryId: c.id });
    await d.report(b, { type: "post", id: p.id }, "Selling");
    const [rep] = (await d.reports(mod, "OPEN")).filter((r) => r.targetId === p.id);
    expect(rep).toBeTruthy();
    await d.resolveReport(mod, rep.id, "hide");

    expect(await d.post(viewer, p.id)).toBeNull();
    expect((await d.post(mod, p.id))?.state).toBe("HIDDEN");
    expect((await d.post(a, p.id))?.state).toBe("HIDDEN"); // the author sees why it is gone
    const list = await d.listPosts(viewer, { categorySlug: c.slug });
    expect(list.posts.find((x) => x.id === p.id)).toBeUndefined();
    const staffList = await d.listPosts(mod, { categorySlug: c.slug });
    expect(staffList.posts.find((x) => x.id === p.id)).toBeTruthy();

    const report = await prisma.contentReport.findUniqueOrThrow({ where: { id: rep.id } });
    expect(report.status).toBe("ACTIONED");
    expect(await prisma.notification.count({ where: { userId: b.id, title: { contains: "acted on your report" } } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { actorId: mod.id, action: "community.post.hidden", targetId: p.id } })).toBe(1);
  });

  it("removing a comment keeps the comment counter true", async () => {
    const [a, b, mod] = [await member(), await member(), await withRole("MODERATOR")];
    const c = await category();
    const p = await d.createPost(a, { title: "Counter check", body: "Body", categoryId: c.id });
    const cm = await d.comment(b, p.id, "Rude comment");
    await d.comment(b, p.id, "Fine comment");
    await d.moderate(mod, { type: "comment", id: cm.id }, "REMOVED");
    expect((await prisma.communityPost.findUniqueOrThrow({ where: { id: p.id } })).commentCount).toBe(1);
    const view = await d.post(a, p.id);
    expect(view?.comments.find((x) => x.id === cm.id)).toBeUndefined();
    await d.moderate(mod, { type: "comment", id: cm.id }, "VISIBLE");
    expect((await prisma.communityPost.findUniqueOrThrow({ where: { id: p.id } })).commentCount).toBe(2);
  });

  it("moderator permission works; a plain member cannot moderate", async () => {
    const [a, plain, mod] = [await member(), await member(), await withRole("MODERATOR")];
    expect(can(mod, "community.moderate")).toBe(true);
    expect(isStaff(mod)).toBe(true);
    expect(can(mod, "admin.economy")).toBe(false);
    expect(can(plain, "community.moderate")).toBe(false);
    const c = await category();
    const p = await d.createPost(a, { title: "Target post", body: "Body", categoryId: c.id });
    await expect(d.moderate(plain, { type: "post", id: p.id }, "HIDDEN")).rejects.toThrow(/staff/);
    await expect(d.setPinned(plain, p.id, true)).rejects.toThrow(/staff/);
    await expect(d.reports(plain)).rejects.toThrow(/staff/);
    await expect(d.saveCategory(plain, { slug: "nope-nope", name: "Nope" })).rejects.toThrow(/staff/);
    await d.setPinned(mod, p.id, true);
    expect((await prisma.communityPost.findUniqueOrThrow({ where: { id: p.id } })).pinned).toBe(true);
  });

  it("groups: posting requires membership; group posts are readable by all members", async () => {
    const [a, outsider] = [await member(), await member()];
    const g = await group();
    await expect(d.createPost(a, { title: "Before joining", body: "Body", groupId: g.id })).rejects.toThrow(/Join/);
    await d.joinGroup(a, g.id);
    await d.joinGroup(a, g.id); // idempotent
    const p = await d.createPost(a, { title: "Group post", body: "Body", groupId: g.id });
    const list = await d.listPosts(outsider, { groupId: g.id });
    expect(list.posts.map((x) => x.id)).toContain(p.id);
    expect((await d.group(a, g.slug))?.members).toBe(1);
    await d.leaveGroup(a, g.id);
    expect((await d.group(a, g.slug))?.joined).toBe(false);
  });

  it("archived categories refuse new posts", async () => {
    const [a, mod] = [await member(), await withRole("ADMIN")];
    const c = await category();
    await d.setArchived(mod, "category", c.id, true);
    try {
      await expect(d.createPost(a, { title: "Into the archive", body: "Body", categoryId: c.id })).rejects.toThrow(/closed/);
      expect((await d.categories()).find((x) => x.id === c.id)).toBeUndefined();
    } finally {
      await d.setArchived(mod, "category", c.id, false);
    }
  });
});

describe("leaderboard", () => {
  // A week far in the future so no other suite's XP lands in it.
  const now = new Date("2099-06-17T12:00:00Z"); // a Wednesday
  const monday = new Date("2099-06-15T00:00:00Z");

  async function xp(userId: string, amount: number, at: Date) {
    await prisma.xpEvent.create({ data: { userId, amount, source: "ADMIN_GRANT", idempotencyKey: `t:${uid()}`, createdAt: at } });
  }

  it("orders by weekly XP, excludes opt-outs, and shows the viewer their own state", async () => {
    const [a, b, hidden] = [await member(), await member(), await member()];
    await xp(a.id, 300, new Date(monday.getTime() + 3_600_000));
    await xp(b.id, 500, new Date(monday.getTime() + 7_200_000));
    await xp(hidden.id, 900, new Date(monday.getTime() + 3_600_000));
    await xp(a.id, 1000, new Date(monday.getTime() - 3_600_000)); // last week: does not count
    await prisma.profile.update({ where: { userId: hidden.id }, data: { privacy: { level: true, leaderboard: false } } });

    const board = await lb.board(a.id, "week", now);
    const ids = board.rows.map((r) => r.userId);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
    expect(ids).not.toContain(hidden.id);
    expect(board.rows.find((r) => r.userId === a.id)?.xp).toBe(300);
    expect(board.viewer).toEqual({ hidden: false, xp: 300, position: ids.indexOf(a.id) + 1 });

    const own = await lb.board(hidden.id, "week", now);
    expect(own.viewer.hidden).toBe(true);
    expect(own.viewer.xp).toBe(900);

    await prisma.xpEvent.deleteMany({ where: { userId: { in: [a.id, b.id, hidden.id] } } });
  });

  it("all-time sums every event; privacy default is visible", async () => {
    expect(onLeaderboard(null)).toBe(true);
    expect(onLeaderboard({ level: false })).toBe(true);
    expect(onLeaderboard({ leaderboard: false })).toBe(false);
    const a = await member();
    await xp(a.id, 7, new Date("2001-01-01T00:00:00Z"));
    await xp(a.id, 5, new Date());
    const board = await lb.board(a.id, "all", new Date(), 200);
    expect(board.viewer.xp).toBe(12);
    expect(board.viewer.position).toBeGreaterThan(0);
    await prisma.xpEvent.deleteMany({ where: { userId: a.id } });
  });
});

describe("weekly criteria window", () => {
  it('parses "week", starts on Monday 00:00 UTC, and buckets by week', () => {
    const c = parseCriteria({ event: "LESSON_COMPLETED", count: 5, within: "week" });
    expect(c.within).toBe("week");
    expect(describeCriteria(c)).toBe("complete 5 lessons this week");
    const sun = new Date("2026-11-15T23:59:00Z");
    const mon = new Date("2026-11-16T00:01:00Z");
    expect(windowStart("week", sun)?.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(windowStart("week", mon)?.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(weekKey(sun)).not.toBe(weekKey(mon));
    expect(weekKey(new Date("2026-11-10T08:00:00Z"))).toBe(weekKey(sun));
    expect(() => parseCriteria({ event: "LESSON_COMPLETED", within: "month" })).toThrow();
  });

  it("STREAK with count + week counts met standard days in the week", async () => {
    const a = await member();
    const now = new Date("2099-06-17T12:00:00Z");
    for (const day of ["2099-06-12", "2099-06-15", "2099-06-16", "2099-06-17"]) {
      await prisma.standardDay.create({ data: { userId: a.id, day: new Date(`${day}T00:00:00Z`), items: 3 } });
    }
    const c = parseCriteria({ event: "STREAK", count: 5, within: "week" });
    expect(describeCriteria(c)).toBe("hold the daily standard 5 days this week");
    expect(await countEvidence(prisma, a.id, c, now)).toBe(3);
  });
});

describe("weekly missions", () => {
  it("a repeatable weekly mission pays once per calendar week", async () => {
    const { EventBus } = await import("../src/events/bus");
    const bus = new EventBus(prisma);
    const a = await member();
    const m = await prisma.mission.create({
      data: {
        slug: `t-week-${uid().slice(0, 8)}`,
        name: "Hold the standard twice this week",
        description: "test",
        criteria: { event: "STREAK", count: 2, within: "week" },
        xpReward: 5,
        repeatable: true,
        active: true,
      },
    });
    try {
      for (const day of ["2099-06-15", "2099-06-16", "2099-06-17"]) {
        await prisma.standardDay.create({ data: { userId: a.id, day: new Date(`${day}T00:00:00Z`), items: 1 } });
      }
      await bus.emitOrThrow({ type: "STREAK", userId: a.id, days: 1, at: new Date("2099-06-16T12:00:00Z") });
      await bus.emitOrThrow({ type: "STREAK", userId: a.id, days: 2, at: new Date("2099-06-17T12:00:00Z") });
      expect(await prisma.missionCompletion.count({ where: { userId: a.id, missionId: m.id } })).toBe(1);
      // Next week starts fresh: no met days yet, nothing pays.
      await bus.emitOrThrow({ type: "STREAK", userId: a.id, days: 3, at: new Date("2099-06-22T12:00:00Z") });
      expect(await prisma.missionCompletion.count({ where: { userId: a.id, missionId: m.id } })).toBe(1);
    } finally {
      await prisma.mission.delete({ where: { id: m.id } });
    }
  });
});
