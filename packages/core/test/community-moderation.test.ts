/**
 * Community staff rules: who can mute and lift mutes, what a removed chat
 * reply leaves behind in notifications, and who can hide programme reviews.
 * Chat tests post only in throwaway channels they create and delete.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import { CommunityService, CommunityError, liftRefusal, type Viewer } from "../src/community/community";
import { CourseAuthoringService, REVIEW_MODERATORS, canModerateReviews } from "../src/lms/authoring";
import { ForbiddenError } from "../src/auth/permissions";
import { createTestUser, uid } from "./helpers";

const community = new CommunityService(prisma);
const authoring = new CourseAuthoringService(prisma);

// The web app's review gates run here as written, with two stand-ins: the
// signed-in user, and Next's cache, which has nothing to revalidate outside a request.
const session = vi.hoisted(() => ({ user: null as { id: string; role: Viewer["role"] } | null }));
vi.mock("../../../apps/web/lib/auth", () => ({ getCurrentUser: async () => session.user }));
vi.mock("../../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: () => {} }));

/** A module of the web app. The path is a variable, so core's typecheck leaves the web app's JSX alone. */
function webModule<T>(path: string): Promise<T> {
  return import(/* @vite-ignore */ new URL(`../../../apps/web/${path}`, import.meta.url).href);
}

async function withRole(role: "MEMBER" | "MODERATOR" | "ADMIN"): Promise<Viewer> {
  const u = await createTestUser();
  if (role !== "MEMBER") await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role };
}

const muted = async (userId: string) => !!(await community.activeMute(userId));
const mutedBy = async (userId: string) => (await prisma.communityMute.findUniqueOrThrow({ where: { userId } })).mutedById;

/**
 * A CommunityService whose writes to a mute row each let the next of `meanwhile`
 * run just before them: another staff member's click landing between this one's
 * check and its write.
 */
function racing(...meanwhile: (() => Promise<unknown>)[]) {
  const pending = [...meanwhile];
  const writes = new Set(["create", "update", "upsert", "updateMany", "delete", "deleteMany"]);
  const mutes = new Proxy(prisma.communityMute, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (typeof prop !== "string" || !writes.has(prop) || typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        const run = pending.shift();
        if (run) await run();
        return value.apply(target, args);
      };
    },
  });
  const db = new Proxy(prisma, { get: (target, prop) => (prop === "communityMute" ? mutes : Reflect.get(target, prop)) });
  return new CommunityService(db);
}

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

  it("a lift removes only the mute it checked, never one an admin set after the check", async () => {
    const [admin, mod1, mod2, member] = [await withRole("ADMIN"), await withRole("MODERATOR"), await withRole("MODERATOR"), await withRole("MEMBER")];
    await community.mute(mod1, member.id, new Date(Date.now() + 86_400_000), null);
    // mod2 lifts mod1's mute; an admin makes it "until lifted" between mod2's check and the delete.
    const adminChangesIt = () => community.mute(admin, member.id, null, "until lifted");
    await expect(racing(adminChangesIt).unmute(mod2, member.id)).rejects.toThrow(/An admin set this mute/);
    expect(await muted(member.id)).toBe(true);
    expect(await mutedBy(member.id)).toBe(admin.id);
    await community.unmute(admin, member.id);
  });

  it("a mute replaces only the row it checked, never an admin's mute set after the check", async () => {
    const [admin, mod1, mod2, member, fresh] = [
      await withRole("ADMIN"),
      await withRole("MODERATOR"),
      await withRole("MODERATOR"),
      await withRole("MEMBER"),
      await withRole("MEMBER"),
    ];
    // Replacing mod1's mute: the admin's lands first, so mod2's is refused rather than written over it.
    await community.mute(mod1, member.id, new Date(Date.now() + 86_400_000), null);
    await expect(
      racing(() => community.mute(admin, member.id, null, "until lifted")).mute(mod2, member.id, new Date(Date.now() + 3_600_000), null)
    ).rejects.toThrow(/An admin set this mute/);
    expect(await mutedBy(member.id)).toBe(admin.id);
    // Muting someone with no mute yet, while an admin mutes them too.
    await expect(racing(() => community.mute(admin, fresh.id, null, "until lifted")).mute(mod2, fresh.id, null, null)).rejects.toThrow(
      /An admin set this mute/
    );
    expect(await mutedBy(fresh.id)).toBe(admin.id);
    // A moderator's mute landing in between is not protected: staff share moderation, so mod2's replaces it.
    await community.unmute(admin, fresh.id);
    await community.mute(mod1, fresh.id, null, null);
    await racing(() => community.mute(mod1, fresh.id, new Date(Date.now() + 7_200_000), null)).mute(mod2, fresh.id, null, null);
    expect(await mutedBy(fresh.id)).toBe(mod2.id);
    await community.unmute(admin, member.id);
    await community.unmute(admin, fresh.id);
  });

  it("gives up with a plain message when the mute keeps changing under it", async () => {
    const [mod1, mod2, mod3, member] = [await withRole("MODERATOR"), await withRole("MODERATOR"), await withRole("MODERATOR"), await withRole("MEMBER")];
    const by = (mod: Viewer) => () => community.mute(mod, member.id, null, null);
    await community.mute(mod1, member.id, null, null);
    // mod1 and mod3 take turns re-muting before each of mod2's writes, three times over.
    await expect(racing(by(mod3), by(mod1), by(mod3)).unmute(mod2, member.id)).rejects.toThrow("This mute changed just now. Check it and try again.");
    expect(await mutedBy(member.id)).toBe(mod3.id);
    await expect(racing(by(mod1), by(mod3), by(mod1)).mute(mod2, member.id, null, null)).rejects.toThrow("This mute changed just now.");
    expect(await mutedBy(member.id)).toBe(mod1.id);
    await community.unmute(mod2, member.id);
    expect(await muted(member.id)).toBe(false);
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

describe("programme reviews: community moderators and administrators can hide them", () => {
  it("names who may hide a review: not instructors, whose own programmes the reviews are about (DR-34)", () => {
    expect([...REVIEW_MODERATORS]).toEqual(["community.moderate"]);
    for (const role of ["MODERATOR", "ADMIN"] as const) expect(canModerateReviews({ role }), role).toBe(true);
    for (const role of ["MEMBER", "STUDENT", "CREATOR", "INSTRUCTOR"] as const) expect(canModerateReviews({ role }), role).toBe(false);
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

  it("the console gives a moderator a Reviews tab, the page and its Hide action; a member gets none of them", async () => {
    type State = { ok?: string; error?: string };
    const { setReviewHiddenAction } = await webModule<{
      setReviewHiddenAction: (reviewId: string, hidden: boolean, prev: State, fd: FormData) => Promise<State>;
    }>("app/(app)/admin/courses/actions.ts");
    const { default: ReviewsPage } = await webModule<{ default: (props: { searchParams: Promise<{ show?: string }> }) => Promise<unknown> }>(
      "app/(app)/admin/courses/reviews/page.tsx"
    );
    const { adminTabsFor } = await webModule<{ adminTabsFor: (user: Viewer) => { href: string }[] }>("lib/admin-nav.ts");

    const [mod, reviewer, plain] = [await withRole("MODERATOR"), await withRole("MEMBER"), await withRole("MEMBER")];
    const course = await prisma.course.findFirstOrThrow({ select: { id: true } });
    const review = await prisma.courseReview.create({ data: { courseId: course.id, userId: reviewer.id, rating: 1, body: "Abusive text" } });
    const hidden = async () => (await prisma.courseReview.findUniqueOrThrow({ where: { id: review.id } })).hidden;
    // Where the page sends this viewer: null when it renders, otherwise the redirect's target.
    const pageSends = () =>
      ReviewsPage({ searchParams: Promise.resolve({}) }).then(
        () => null,
        (e: { digest?: string }) => (e.digest ?? String(e)).split(";")[2] ?? String(e)
      );
    try {
      expect(adminTabsFor(mod).map((t) => t.href)).toContain("/admin/courses/reviews");
      session.user = mod;
      expect(await pageSends()).toBeNull();
      expect(await setReviewHiddenAction(review.id, true, {}, new FormData())).toEqual({ ok: "Hidden." });
      expect(await hidden()).toBe(true);
      expect(await prisma.auditLog.count({ where: { actorId: mod.id, action: "review.hide", targetId: review.id } })).toBe(1);

      session.user = plain;
      expect(await pageSends()).toBe("/today");
      expect(await setReviewHiddenAction(review.id, false, {}, new FormData())).toEqual({ error: "You do not have permission to do that." });
      expect(await hidden()).toBe(true);
    } finally {
      session.user = null;
      await prisma.courseReview.delete({ where: { id: review.id } });
    }
  });
});
