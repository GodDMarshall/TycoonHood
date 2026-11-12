/**
 * reports.file (docs/ECOSYSTEM_PLAN.md P0s): one way to report anything a
 * member can point at, with the rules the post and comment reports have
 * always had. A reason is trimmed, required and at most DISCUSSION_REPORT_MAX
 * characters; nobody reports themselves or their own writing; one report per
 * member and target. `discussions.report`, the old post and comment path, goes
 * through it, so both paths behave the same.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import {
  DiscussionError,
  DiscussionService,
  DISCUSSION_REPORT_MAX,
  REPORT_TARGET_TYPES,
  ReportService,
  reports,
  type DiscussionViewer,
  type ReportTargetType,
} from "../src/discussions";
import { createTestUser, uid } from "./helpers";

const d = new DiscussionService(prisma);

const reporters: string[] = [];
const categoryIds: string[] = [];
const groupIds: string[] = [];

afterAll(async () => {
  await prisma.contentReport.deleteMany({ where: { reporterId: { in: reporters } } });
  await prisma.communityPost.deleteMany({ where: { categoryId: { in: categoryIds } } });
  await prisma.communityCategory.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.communityGroup.deleteMany({ where: { id: { in: groupIds } } });
});

async function member(): Promise<DiscussionViewer> {
  const u = await createTestUser();
  reporters.push(u.id);
  return { id: u.id, role: u.role };
}

async function moderator(): Promise<DiscussionViewer> {
  const u = await createTestUser();
  reporters.push(u.id);
  await prisma.user.update({ where: { id: u.id }, data: { role: "MODERATOR" } });
  return { id: u.id, role: "MODERATOR" };
}

async function post(author: DiscussionViewer) {
  const c = await prisma.communityCategory.create({ data: { slug: `t-${uid().slice(0, 8)}`, name: "Report tests" } });
  categoryIds.push(c.id);
  return d.createPost(author, { title: "Something to report", body: "A body.", categoryId: c.id });
}

async function group() {
  const g = await prisma.communityGroup.create({
    data: { slug: `t-${uid().slice(0, 8)}`, name: "Report tests", description: "A group made by the report tests." },
  });
  groupIds.push(g.id);
  return g;
}

const rows = (reporterId: string) => prisma.contentReport.findMany({ where: { reporterId }, orderBy: { createdAt: "asc" } });

/** Refused with a DiscussionError (which the web app shows) carrying exactly this message. */
async function refused(attempt: Promise<unknown>, message: string) {
  const error = await attempt.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(DiscussionError);
  expect((error as Error).message).toBe(message);
}

const UNKNOWN = "That cannot be reported.";
const NO_REASON = "Say briefly what is wrong with it.";
const TOO_LONG = `Keep the reason under ${DISCUSSION_REPORT_MAX} characters.`;
const GONE = "That no longer exists.";
const SELF = "You cannot report yourself.";
const OWN = "You cannot report your own writing. Delete it instead.";
const AGAIN = "You have already reported this. Staff will see it.";

describe("reports.file", () => {
  it("lists every target type the schema lists, and nothing else", () => {
    expect([...REPORT_TARGET_TYPES]).toEqual([
      "post",
      "comment",
      "user",
      "group",
      "project",
      "event",
      "event_feedback",
      "opportunity",
      "partner",
    ]);
  });

  it("files an open report on every target type", async () => {
    const [author, reporter] = [await member(), await member()];
    const p = await post(author);
    const cm = await d.comment(author, p.id, "A comment to report.");
    const g = await group();
    const target: Record<ReportTargetType, string> = {
      post: p.id,
      comment: cm.id,
      user: author.id,
      group: g.id,
      // No lookup yet: the id is taken as given.
      project: uid(),
      event: uid(),
      event_feedback: uid(),
      opportunity: uid(),
      partner: uid(),
    };
    for (const targetType of REPORT_TARGET_TYPES) {
      const filed = await reports.file(reporter, {
        targetType,
        targetId: target[targetType],
        reason: `  Breaks the rules: ${targetType}  `,
      });
      expect(await prisma.contentReport.findUniqueOrThrow({ where: { id: filed.id } })).toMatchObject({
        reporterId: reporter.id,
        targetType,
        targetId: target[targetType],
        reason: `Breaks the rules: ${targetType}`,
        status: "OPEN",
      });
    }
    expect(await rows(reporter.id)).toHaveLength(REPORT_TARGET_TYPES.length);
  });

  it("refuses a target type it does not know", async () => {
    const reporter = await member();
    for (const targetType of ["message", "Post", "constructor", ""]) {
      await refused(
        reports.file(reporter, { targetType: targetType as ReportTargetType, targetId: uid(), reason: "Spam link" }),
        UNKNOWN
      );
    }
    expect(await rows(reporter.id)).toHaveLength(0);
  });

  it("refuses an empty reason and one over the limit, and keeps one at the limit", async () => {
    const reporter = await member();
    for (const reason of ["", "   ", "ab", " ab "]) {
      await refused(reports.file(reporter, { targetType: "project", targetId: uid(), reason }), NO_REASON);
    }
    await refused(
      reports.file(reporter, { targetType: "project", targetId: uid(), reason: "x".repeat(DISCUSSION_REPORT_MAX + 1) }),
      TOO_LONG
    );
    expect(await rows(reporter.id)).toHaveLength(0);

    await reports.file(reporter, { targetType: "project", targetId: uid(), reason: "x".repeat(DISCUSSION_REPORT_MAX) });
    expect(await rows(reporter.id)).toHaveLength(1);
  });

  it("refuses reporting yourself and your own writing", async () => {
    const [a, b] = [await member(), await member()];
    const p = await post(a);
    const cm = await d.comment(a, p.id, "My own comment.");
    await refused(reports.file(a, { targetType: "user", targetId: a.id, reason: "Myself" }), SELF);
    await refused(reports.file(a, { targetType: "post", targetId: p.id, reason: "My own" }), OWN);
    await refused(reports.file(a, { targetType: "comment", targetId: cm.id, reason: "My own" }), OWN);
    expect(await rows(a.id)).toHaveLength(0);
    // Someone else can.
    await reports.file(b, { targetType: "user", targetId: a.id, reason: "Rude in chat" });
    expect(await rows(b.id)).toHaveLength(1);
  });

  it("refuses a member, group, post or comment that does not exist", async () => {
    const reporter = await member();
    for (const targetType of ["user", "group", "post", "comment"] as const) {
      await refused(reports.file(reporter, { targetType, targetId: uid(), reason: "Spam link" }), GONE);
    }
    // A target with no lookup yet still needs an id, no longer than an id.
    for (const targetId of ["", "x".repeat(65)]) {
      await refused(reports.file(reporter, { targetType: "opportunity", targetId, reason: "Spam link" }), GONE);
    }
    expect(await rows(reporter.id)).toHaveLength(0);
  });

  it("refuses an archived group to members, who cannot see it, and takes it from staff, who can", async () => {
    const [reporter, mod] = [await member(), await moderator()];
    const g = await group();
    await d.setArchived(mod, "group", g.id, true);
    try {
      // groups.group() shows an archived group to staff only.
      expect(await d.group(reporter, g.slug)).toBeNull();
      await refused(reports.file(reporter, { targetType: "group", targetId: g.id, reason: "Spam group" }), GONE);
      expect(await d.group(mod, g.slug)).toMatchObject({ id: g.id, archived: true });
      await reports.file(mod, { targetType: "group", targetId: g.id, reason: "Needs a second look" });
    } finally {
      await d.setArchived(mod, "group", g.id, false);
    }
    expect(await rows(reporter.id)).toHaveLength(0);
    expect(await rows(mod.id)).toMatchObject([{ targetType: "group", targetId: g.id }]);
    // Restored, the group is open to members again, and so is reporting it: it was the archive that refused.
    await reports.file(reporter, { targetType: "group", targetId: g.id, reason: "Spam group" });
    expect(await rows(reporter.id)).toMatchObject([{ targetType: "group", targetId: g.id }]);
  });

  it("takes one report per member and target, and says so the second time", async () => {
    const [author, reporter] = [await member(), await member()];
    const g = await group();
    const projectId = uid();
    for (const [targetType, targetId] of [
      ["user", author.id],
      ["group", g.id],
      ["project", projectId],
    ] as const) {
      await reports.file(reporter, { targetType, targetId, reason: "First report" });
      await refused(reports.file(reporter, { targetType, targetId, reason: "Second report" }), AGAIN);
    }
    expect(await rows(reporter.id)).toHaveLength(3);
    // The same id under another type is another target.
    await reports.file(reporter, { targetType: "event", targetId: projectId, reason: "Different target" });
    expect(await rows(reporter.id)).toHaveLength(4);
  });

  it("tells nobody and audits nothing when a member files a report", async () => {
    const [author, reporter] = [await member(), await member()];
    const p = await post(author);
    const notes = await prisma.notification.count({ where: { userId: author.id } });
    await reports.file(reporter, { targetType: "post", targetId: p.id, reason: "Selling" });
    await reports.file(reporter, { targetType: "user", targetId: author.id, reason: "Selling" });
    expect(await prisma.notification.count({ where: { userId: author.id } })).toBe(notes);
    expect(await prisma.auditLog.count({ where: { actorId: reporter.id } })).toBe(0);
  });
});

describe("post and comment reports, through discussions.report and reports.file", () => {
  it("discussions.report files through reports.file", async () => {
    const [author, reporter] = [await member(), await member()];
    const p = await post(author);
    const file = vi.spyOn(ReportService.prototype, "file");
    try {
      await expect(d.report(reporter, { type: "post", id: p.id }, "Spam link")).resolves.toBeUndefined();
      expect(file).toHaveBeenCalledTimes(1);
      expect(file).toHaveBeenCalledWith(reporter, { targetType: "post", targetId: p.id, reason: "Spam link" });
    } finally {
      file.mockRestore();
    }
    expect(await rows(reporter.id)).toMatchObject([{ targetType: "post", targetId: p.id, reason: "Spam link", status: "OPEN" }]);
  });

  it("gives the same answers on both paths", async () => {
    const [author, reporter, other] = [await member(), await member(), await member()];
    const p = await post(author);
    const cm = await d.comment(author, p.id, "A comment.");

    // Filed on one path, a second report on the other is the same duplicate.
    await d.report(reporter, { type: "post", id: p.id }, "Spam link");
    await refused(reports.file(reporter, { targetType: "post", targetId: p.id, reason: "Again" }), AGAIN);
    await reports.file(reporter, { targetType: "comment", targetId: cm.id, reason: "Rude" });
    await refused(d.report(reporter, { type: "comment", id: cm.id }, "Rude again"), AGAIN);

    // Every refusal reads the same on both paths.
    const both = (who: DiscussionViewer, type: "post" | "comment", id: string, reason: string) => [
      () => d.report(who, { type, id }, reason),
      () => reports.file(who, { targetType: type, targetId: id, reason }),
    ];
    for (const attempt of both(other, "post", p.id, "  ")) await refused(attempt(), NO_REASON);
    for (const attempt of both(other, "post", p.id, "x".repeat(DISCUSSION_REPORT_MAX + 1))) await refused(attempt(), TOO_LONG);
    for (const attempt of both(other, "comment", uid(), "Spam link")) await refused(attempt(), GONE);
    for (const attempt of both(author, "comment", cm.id, "My own")) await refused(attempt(), OWN);
    expect(await rows(other.id)).toHaveLength(0);
    expect(await rows(reporter.id)).toHaveLength(2);
  });

  it("hidden writing is reportable only by those who can see it, and removed writing by nobody", async () => {
    const [author, plain, mod] = [await member(), await member(), await moderator()];
    const hidden = await post(author);
    const removed = await post(author);
    await prisma.communityPost.update({ where: { id: hidden.id }, data: { state: "HIDDEN" } });
    await prisma.communityPost.update({ where: { id: removed.id }, data: { state: "REMOVED" } });

    await refused(reports.file(plain, { targetType: "post", targetId: hidden.id, reason: "Spam link" }), GONE);
    await refused(d.report(plain, { type: "post", id: hidden.id }, "Spam link"), GONE);
    // The author still sees a hidden post, and still cannot report it.
    await refused(reports.file(author, { targetType: "post", targetId: hidden.id, reason: "Mine" }), OWN);
    // Staff see it, so staff can.
    await reports.file(mod, { targetType: "post", targetId: hidden.id, reason: "Needs a second look" });
    await refused(reports.file(mod, { targetType: "post", targetId: removed.id, reason: "Gone" }), GONE);
    expect(await rows(plain.id)).toHaveLength(0);
    expect(await rows(mod.id)).toMatchObject([{ targetType: "post", targetId: hidden.id }]);
  });
});
