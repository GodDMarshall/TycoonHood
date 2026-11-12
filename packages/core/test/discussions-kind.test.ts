import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@tycoonhood/db";
import { DiscussionService, DiscussionError } from "../src/discussions";
import { createTestUser, uid } from "./helpers";

// The frozen post-kind API (docs/ECOSYSTEM_PLAN.md W1.4 and P0s): createPost({ kind })
// defaults to DISCUSSION, listPosts({ kind }) narrows to one kind, and both views
// carry the kind. GROUPS, OPPS, SKILLS and BOOK build on this before SOCIAL merges.

const d = new DiscussionService(prisma);
const categoryIds: string[] = [];
const groupIds: string[] = [];

afterAll(async () => {
  await prisma.communityPost.deleteMany({ where: { OR: [{ categoryId: { in: categoryIds } }, { groupId: { in: groupIds } }] } });
  await prisma.communityCategory.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.groupMembership.deleteMany({ where: { groupId: { in: groupIds } } });
  await prisma.communityGroup.deleteMany({ where: { id: { in: groupIds } } });
});

async function member() {
  const u = await createTestUser();
  return { id: u.id, role: u.role };
}

async function admin() {
  const u = await createTestUser();
  await prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
  return { id: u.id, role: "ADMIN" as const };
}

async function category() {
  const c = await prisma.communityCategory.create({ data: { slug: `k-${uid().slice(0, 8)}`, name: "Kind test category" } });
  categoryIds.push(c.id);
  return c;
}

async function groupWith(userId: string) {
  const g = await prisma.communityGroup.create({ data: { slug: `k-${uid().slice(0, 8)}`, name: "Kind test group", description: "A group made by a test." } });
  groupIds.push(g.id);
  await prisma.groupMembership.create({ data: { groupId: g.id, userId } });
  return g;
}

describe("post kinds", () => {
  it("stores DISCUSSION when no kind is given, and both views carry the kind", async () => {
    const a = await member();
    const c = await category();
    const p = await d.createPost(a, { title: "A plain discussion", body: "Body", categoryId: c.id });
    expect(p.kind).toBe("DISCUSSION");
    const list = await d.listPosts(a, { categorySlug: c.slug });
    expect(list.posts.map((x) => [x.id, x.kind])).toEqual([[p.id, "DISCUSSION"]]);
    const view = await d.post(a, p.id);
    expect(view?.kind).toBe("DISCUSSION");
  });

  it("stores the given kind, filters on it, and lists every kind without a filter", async () => {
    const a = await member();
    const c = await category();
    const t0 = new Date();
    const disc = await d.createPost(a, { title: "A plain discussion", body: "Body", categoryId: c.id }, t0);
    const q = await d.createPost(a, { title: "A real question", body: "How?", categoryId: c.id, kind: "QUESTION" }, new Date(t0.getTime() + 1000));
    expect((await prisma.communityPost.findUniqueOrThrow({ where: { id: q.id } })).kind).toBe("QUESTION");

    const onlyQuestions = await d.listPosts(a, { categorySlug: c.slug, kind: "QUESTION" });
    expect(onlyQuestions.posts.map((x) => x.id)).toEqual([q.id]);
    expect(onlyQuestions.total).toBe(1);

    const onlyDiscussions = await d.listPosts(a, { categorySlug: c.slug, kind: "DISCUSSION" });
    expect(onlyDiscussions.posts.map((x) => x.id)).toEqual([disc.id]);

    const all = await d.listPosts(a, { categorySlug: c.slug });
    expect(new Set(all.posts.map((x) => x.id))).toEqual(new Set([disc.id, q.id]));
    expect(all.total).toBe(2);
  });

  it("refuses a kind the schema does not have, in both calls", async () => {
    const a = await member();
    const c = await category();
    await expect(
      d.createPost(a, { title: "A bad kind here", body: "Body", categoryId: c.id, kind: "POLL" as never })
    ).rejects.toThrow(DiscussionError);
    await expect(d.listPosts(a, { categorySlug: c.slug, kind: "POLL" as never })).rejects.toThrow(DiscussionError);
    expect(await prisma.communityPost.count({ where: { categoryId: c.id } })).toBe(0);
  });

  it("lets only staff post an announcement in the main feed", async () => {
    const a = await member();
    const staff = await admin();
    const c = await category();
    await expect(
      d.createPost(a, { title: "Big announcement", body: "Body", categoryId: c.id, kind: "ANNOUNCEMENT" })
    ).rejects.toThrow(/Only staff/);
    expect(await prisma.communityPost.count({ where: { categoryId: c.id } })).toBe(0);
    const p = await d.createPost(staff, { title: "Big announcement", body: "Body", categoryId: c.id, kind: "ANNOUNCEMENT" });
    expect(p.kind).toBe("ANNOUNCEMENT");
  });

  it("leaves a group announcement to the caller's group check", async () => {
    // GROUPS calls groupCan(…, "announce") before createPost; the service only
    // refuses announcements outside a group.
    const a = await member();
    const g = await groupWith(a.id);
    const p = await d.createPost(a, { title: "Group announcement", body: "Body", groupId: g.id, kind: "ANNOUNCEMENT" });
    expect(p.kind).toBe("ANNOUNCEMENT");
    const list = await d.listPosts(a, { groupId: g.id, kind: "ANNOUNCEMENT" });
    expect(list.posts.map((x) => x.id)).toEqual([p.id]);
  });
});
