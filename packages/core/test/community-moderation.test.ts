/**
 * Community staff rules: who can mute and lift mutes, what a removed chat
 * reply leaves behind in notifications, and who can hide programme reviews.
 * Chat tests post only in throwaway channels they create and delete.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { CommunityService, CommunityError, liftRefusal, type Viewer } from "../src/community/community";
import { CourseAuthoringService, REVIEW_MODERATORS, canModerateReviews } from "../src/lms/authoring";
import { ForbiddenError } from "../src/auth/permissions";
import { createTestUser, uid } from "./helpers";

const community = new CommunityService(prisma);
const authoring = new CourseAuthoringService(prisma);

async function withRole(role: "MEMBER" | "MODERATOR" | "ADMIN"): Promise<Viewer> {
  const u = await createTestUser();
  if (role !== "MEMBER") await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role };
}

const muted = async (userId: string) => !!(await community.activeMute(userId));
const mutedBy = async (userId: string) => (await prisma.communityMute.findUniqueOrThrow({ where: { userId } })).mutedById;

const channels: string[] = [];
afterAll(async () => {
  await prisma.channel.deleteMany({ where: { id: { in: channels } } });
});

describe("mutes: staff share moderation under one rule", () => {
  it("nobody can lift their own mute, admins included", async () => {
    const [admin, otherAdmin, mod] = [await withRole("ADMIN"), await withRole("ADMIN"), await withRole("MODERATOR")];
    await community.mute(admin, mod.id, null, "until lifted");
    await expect(community.unmute(mod, mod.id)).rejects.toThrow(/your own mute/);
    expect(await muted(mod.id)).toBe(true);

    await community.mute(admin, otherAdmin.id, null, null);
    await expect(community.unmute(otherAdmin, otherAdmin.id)).rejects.toThrow(/your own mute/);
    expect(await muted(otherAdmin.id)).toBe(true);

    // Another admin can lift both.
    await community.unmute(otherAdmin, mod.id);
    await community.unmute(admin, otherAdmin.id);
    expect(await muted(mod.id)).toBe(false);
    expect(await muted(otherAdmin.id)).toBe(false);
  });

  it("a moderator cannot mute an admin; an admin can mute an admin", async () => {
    const [admin, otherAdmin, mod] = [await withRole("ADMIN"), await withRole("ADMIN"), await withRole("MODERATOR")];
    await expect(community.mute(mod, admin.id, null, null)).rejects.toThrow(/Only an admin can mute an admin/);
    expect(await muted(admin.id)).toBe(false);
    await community.mute(otherAdmin, admin.id, new Date(Date.now() + 3_600_000), null);
    expect(await muted(admin.id)).toBe(true);
    await community.unmute(otherAdmin, admin.id);
  });

  it("a moderator cannot lift, or overwrite, a mute an admin set", async () => {
    const [admin, mod, member] = [await withRole("ADMIN"), await withRole("MODERATOR"), await withRole("MEMBER")];
    await community.mute(admin, member.id, null, "spam");
    await expect(community.unmute(mod, member.id)).rejects.toThrow(/An admin set this mute/);
    // Re-muting for a day would swap the admin's mute for the moderator's, which they could then lift.
    await expect(community.mute(mod, member.id, new Date(Date.now() + 86_400_000), null)).rejects.toThrow(/An admin set this mute/);
    expect(await muted(member.id)).toBe(true);
    expect(await mutedBy(member.id)).toBe(admin.id);
    await community.unmute(admin, member.id);
    expect(await muted(member.id)).toBe(false);
  });

  it("otherwise staff share moderation: a moderator lifts another moderator's mute, and can mute a moderator", async () => {
    const [mod1, mod2, mod3, member] = [await withRole("MODERATOR"), await withRole("MODERATOR"), await withRole("MODERATOR"), await withRole("MEMBER")];
    await community.mute(mod1, member.id, null, null);
    await community.unmute(mod2, member.id);
    expect(await muted(member.id)).toBe(false);

    await community.mute(mod1, mod2.id, null, null);
    await expect(community.unmute(mod2, mod2.id)).rejects.toThrow(/your own mute/);
    await community.unmute(mod3, mod2.id);
    expect(await muted(mod2.id)).toBe(false);

    // An admin's mute that has run out no longer binds anyone.
    const admin = await withRole("ADMIN");
    await prisma.communityMute.create({ data: { userId: member.id, mutedById: admin.id, until: new Date(Date.now() - 60_000) } });
    await community.mute(mod1, member.id, null, null);
    expect(await mutedBy(member.id)).toBe(mod1.id);
    await community.unmute(mod3, member.id);
  });

  it("members cannot mute or lift; the mutes list marks what each viewer may lift", async () => {
    const [admin, mod, member, target] = [await withRole("ADMIN"), await withRole("MODERATOR"), await withRole("MEMBER"), await withRole("MEMBER")];
    await expect(community.mute(member, target.id, null, null)).rejects.toBeInstanceOf(CommunityError);
    await community.mute(admin, target.id, null, null);
    await community.mute(admin, mod.id, null, null);
    await expect(community.unmute(member, target.id)).rejects.toThrow(/Only staff/);
    try {
      const rows = await community.activeMutes();
      const t = rows.find((r) => r.userId === target.id)!;
      const m = rows.find((r) => r.userId === mod.id)!;
      expect(t.setByAdmin).toBe(true);
      expect(liftRefusal(admin, t)).toBeNull();
      expect(liftRefusal(mod, t)).toMatch(/An admin set this mute/);
      expect(liftRefusal(mod, m)).toMatch(/your own mute/);
      expect(liftRefusal(member, t)).toMatch(/Only staff/);
      expect(liftRefusal(mod, { userId: target.id, setByAdmin: false })).toBeNull();
    } finally {
      await community.unmute(admin, target.id);
      await community.unmute(admin, mod.id);
    }
  });
});

describe("removed chat replies", () => {
  it("removing a reply clears its text from the notification of the member it answered", async () => {
    const [asker, replier, other, mod] = [await withRole("MEMBER"), await withRole("MEMBER"), await withRole("MEMBER"), await withRole("MODERATOR")];
    const ch = await prisma.channel.create({ data: { slug: `test-${uid().slice(0, 8)}`, name: "Test", kind: "CHAT" } });
    channels.push(ch.id);
    const q = await community.post(asker, ch.slug, { body: "Anyone tried cold outreach?" });
    const rude = await community.post(replier, ch.slug, { body: "A reply staff will remove", replyToId: q.id });
    const regret = await community.post(other, ch.slug, { body: "A reply its author will remove", replyToId: q.id });
    const fine = await community.post(mod, ch.slug, { body: "A reply that stays", replyToId: q.id });
    const noteFor = (messageId: string) =>
      prisma.notification.findFirstOrThrow({ where: { userId: asker.id, type: "COMMUNITY", data: { path: ["messageId"], equals: messageId } } });
    expect((await noteFor(rude.id)).body).toBe("A reply staff will remove");

    await community.remove(mod, rude.id);
    await community.remove(other, regret.id);

    expect((await noteFor(rude.id)).body).toBeNull();
    expect((await noteFor(regret.id)).body).toBeNull();
    expect((await noteFor(fine.id)).body).toBe("A reply that stays");
    expect((await noteFor(rude.id)).title).toContain("replied to you");
  });
});

describe("programme reviews: course staff and community moderators can hide them", () => {
  it("names who may hide a review", () => {
    expect([...REVIEW_MODERATORS]).toEqual(["courses.author", "community.moderate"]);
    for (const role of ["MODERATOR", "INSTRUCTOR", "ADMIN"] as const) expect(canModerateReviews({ role }), role).toBe(true);
    for (const role of ["MEMBER", "STUDENT", "CREATOR"] as const) expect(canModerateReviews({ role }), role).toBe(false);
    expect(canModerateReviews(null)).toBe(false);
  });

  it("a moderator hides and restores a review; a member cannot", async () => {
    const [mod, reviewer, plain] = [await withRole("MODERATOR"), await withRole("MEMBER"), await withRole("MEMBER")];
    const course = await prisma.course.findFirstOrThrow({ select: { id: true } });
    const review = await prisma.courseReview.create({ data: { courseId: course.id, userId: reviewer.id, rating: 1, body: "Abusive text" } });
    try {
      await authoring.setReviewHidden(mod, review.id, true);
      expect((await prisma.courseReview.findUniqueOrThrow({ where: { id: review.id } })).hidden).toBe(true);
      await expect(authoring.setReviewHidden(plain, review.id, false)).rejects.toBeInstanceOf(ForbiddenError);
      await authoring.setReviewHidden(mod, review.id, false);
      expect((await prisma.courseReview.findUniqueOrThrow({ where: { id: review.id } })).hidden).toBe(false);
      expect(await prisma.auditLog.count({ where: { actorId: mod.id, action: { in: ["review.hide", "review.unhide"] }, targetId: review.id } })).toBe(2);
    } finally {
      await prisma.courseReview.delete({ where: { id: review.id } });
    }
  });
});
