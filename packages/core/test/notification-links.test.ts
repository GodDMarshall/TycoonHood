/**
 * Where a notification leads. Discussions and announcements carry their page
 * in data.href; the inbox and the Today card follow it only when it is a path
 * on this site.
 */
import { describe, expect, it } from "vitest";
import { prisma } from "@tycoonhood/db";
import { notificationLink } from "../src/platform/notify";
import { announcementSchema } from "../src/platform/cms";
import { DiscussionService } from "../src/discussions/discussions";
import { createTestUser, uid } from "./helpers";

const d = new DiscussionService(prisma);

describe("notificationLink", () => {
  it("follows a path on this site, with its fragment", () => {
    expect(notificationLink({ href: "/community/discussions/abc#c-def" })).toBe("/community/discussions/abc#c-def");
    expect(notificationLink({ kind: "reaction", postId: "abc", href: "/community/discussions/abc" })).toBe("/community/discussions/abc");
    expect(notificationLink({ href: "/learning" })).toBe("/learning");
  });

  it("refuses anything that leaves the site", () => {
    for (const href of ["//evil.example", "/\\evil.example", "/\t/evil.example", "https://evil.example", "javascript:alert(1)", "learning", ""]) {
      expect(notificationLink({ href }), JSON.stringify(href)).toBeNull();
    }
  });

  it("follows the sign-in pages too: they are pages on this site", () => {
    for (const href of ["/forgot-password", "/login", "/register", "/reset-password/some-token"]) {
      expect(notificationLink({ href }), href).toBe(href);
    }
  });

  it("is null when there is no href to follow", () => {
    for (const data of [null, undefined, "x", 3, ["/learning"], {}, { channel: "general", messageId: "m1" }, { href: 42 }]) {
      expect(notificationLink(data), JSON.stringify(data)).toBeNull();
    }
  });

  it("leads discussion comment and reaction notifications to the post", async () => {
    const [a, b] = [await createTestUser(), await createTestUser()];
    const c = await prisma.communityCategory.create({ data: { slug: `t-${uid().slice(0, 8)}`, name: "Test category" } });
    try {
      const p = await d.createPost({ id: a.id, role: a.role }, { title: "Where does this lead", body: "Body", categoryId: c.id });
      const cm = await d.comment({ id: b.id, role: b.role }, p.id, "Here");
      await d.toggleReaction({ id: b.id, role: b.role }, { type: "post", id: p.id }, "fire");
      const notes = await prisma.notification.findMany({ where: { userId: a.id, type: "COMMUNITY" }, orderBy: { createdAt: "asc" } });
      expect(notes.map((n) => notificationLink(n.data)).sort()).toEqual([`/community/discussions/${p.id}`, `/community/discussions/${p.id}#c-${cm.id}`].sort());
    } finally {
      await prisma.communityPost.deleteMany({ where: { categoryId: c.id } });
      await prisma.communityCategory.delete({ where: { id: c.id } });
    }
  });
});

describe("announcement links", () => {
  const base = { title: "Something new", role: null };

  it("accept a path on this site", () => {
    expect(announcementSchema.parse({ ...base, href: "/learning" }).href).toBe("/learning");
    expect(announcementSchema.parse({ ...base, href: "" }).href).toBe("");
  });

  it("accept the sign-in pages, which work when signed in", () => {
    for (const href of ["/forgot-password", "/login", "/register"]) {
      expect(announcementSchema.parse({ ...base, title: "Please reset your password", href }).href, href).toBe(href);
    }
  });

  it("refuse links that would leave the site", () => {
    for (const href of ["//evil.example", "/\\evil.example", "https://evil.example", "learning"]) {
      expect(announcementSchema.safeParse({ ...base, href }).success, href).toBe(false);
    }
  });
});
