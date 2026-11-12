/**
 * DISCUSSIONS: what staff do. The moderation queue of members' reports, acting
 * on a report, hiding or removing a post or comment, pinning, locking, and
 * archiving a category or group. Every method checks the viewer is staff, and
 * every change is audited.
 *
 * Members file reports through reports.ts; the queue here reads them.
 *
 * SOCIAL owns this file after P0s (docs/ECOSYSTEM_PLAN.md W1.4).
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { ModerationState, PrismaClient } from "@tycoonhood/db";
import { AuditService } from "../platform/audit";
import { notify } from "../platform/notify";
import {
  ARCHIVE_SETTING,
  DiscussionError,
  assertStaff,
  authorSelect,
  authorView,
  readArchive,
  setCommentState,
  setPostState,
  type DiscussionViewer,
  type TargetType,
} from "./shared";

export class ModerationService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  // ─────────────────────────────── archive (SiteSetting until columns exist)

  async setArchived(viewer: DiscussionViewer, kind: "category" | "group", id: string, archived: boolean) {
    assertStaff(viewer);
    const cur = await readArchive(this.db);
    const key = kind === "category" ? "categories" : "groups";
    const set = new Set(cur[key]);
    if (archived) set.add(id);
    else set.delete(id);
    const value = { ...cur, [key]: [...set] };
    await this.db.siteSetting.upsert({
      where: { key: ARCHIVE_SETTING },
      update: { value },
      create: { key: ARCHIVE_SETTING, value },
    });
    await this.audit.log({
      actorId: viewer.id,
      action: `community.${kind}.${archived ? "archive" : "restore"}`,
      targetType: kind,
      targetId: id,
    });
  }

  // ─────────────────────────────── the report queue

  /** The moderation queue, with each report's target resolved for display.
   *  The web app reaches it as `discussions.reports(viewer, status, take)`. */
  async queue(viewer: DiscussionViewer, status: "OPEN" | "ACTIONED" | "DISMISSED" = "OPEN", take = 100) {
    assertStaff(viewer);
    const rows = await this.db.contentReport.findMany({
      where: { status, targetType: { in: ["post", "comment"] } },
      orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
      take: Math.min(take, 200),
      include: { reporter: { select: { profile: { select: { displayName: true, username: true } } } } },
    });
    const postIds = rows.filter((r) => r.targetType === "post").map((r) => r.targetId);
    const commentIds = rows.filter((r) => r.targetType === "comment").map((r) => r.targetId);
    const [posts, comments] = await Promise.all([
      this.db.communityPost.findMany({ where: { id: { in: postIds } }, select: { id: true, title: true, body: true, state: true, author: authorSelect } }),
      this.db.communityComment.findMany({ where: { id: { in: commentIds } }, select: { id: true, body: true, state: true, postId: true, author: authorSelect } }),
    ]);
    const pm = new Map(posts.map((p) => [p.id, p]));
    const cm = new Map(comments.map((c) => [c.id, c]));
    return rows.map((r) => {
      const p = r.targetType === "post" ? pm.get(r.targetId) : undefined;
      const c = r.targetType === "comment" ? cm.get(r.targetId) : undefined;
      const t = p ?? c;
      return {
        id: r.id,
        status: r.status,
        reason: r.reason,
        resolution: r.resolution,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        reporter: r.reporter.profile?.displayName ?? "member",
        targetType: r.targetType as TargetType,
        targetId: r.targetId,
        target: t
          ? {
              title: p?.title ?? null,
              body: t.body,
              state: t.state,
              author: authorView(t.author),
              href: `/community/discussions/${p ? p.id : c!.postId}${c ? `#c-${c.id}` : ""}`,
            }
          : null,
      };
    });
  }

  async openReportCount() {
    return this.db.contentReport.count({ where: { status: "OPEN", targetType: { in: ["post", "comment"] } } });
  }

  /** Staff act on a report: hide or remove the target (closing every open
   *  report on it and telling each reporter), or dismiss this one report. */
  async resolveReport(viewer: DiscussionViewer, reportId: string, action: "hide" | "remove" | "dismiss", now = new Date()) {
    assertStaff(viewer);
    const rep = await this.db.contentReport.findUnique({ where: { id: reportId } });
    if (!rep || rep.status !== "OPEN") return;
    if (action === "dismiss") {
      await this.db.contentReport.update({ where: { id: rep.id }, data: { status: "DISMISSED", resolution: "dismissed", resolvedAt: now } });
      await this.audit.log({ actorId: viewer.id, action: "community.report.dismiss", targetType: rep.targetType, targetId: rep.targetId, meta: { reportId: rep.id } });
      return;
    }
    if (rep.targetType !== "post" && rep.targetType !== "comment") throw new DiscussionError("This report has no discussion target.");
    await this.moderate(viewer, { type: rep.targetType, id: rep.targetId }, action === "hide" ? "HIDDEN" : "REMOVED", now);
  }

  // ─────────────────────────────── staff moderation

  /** Set a post or comment's moderation state. Hiding or removing closes open
   *  reports on it as ACTIONED and tells each reporter. Audited. */
  async moderate(viewer: DiscussionViewer, target: { type: TargetType; id: string }, state: ModerationState, now = new Date()) {
    assertStaff(viewer);
    if (target.type === "post") {
      const p = await this.db.communityPost.findUnique({ where: { id: target.id }, select: { id: true, authorId: true } });
      if (!p) throw new DiscussionError("That post no longer exists.");
      await setPostState(this.db, p, state);
    } else {
      const c = await this.db.communityComment.findUnique({ where: { id: target.id }, select: { id: true, state: true, postId: true } });
      if (!c) throw new DiscussionError("That comment no longer exists.");
      await setCommentState(this.db, c, state);
    }
    await this.audit.log({ actorId: viewer.id, action: `community.${target.type}.${state.toLowerCase()}`, targetType: target.type, targetId: target.id });

    if (state !== "VISIBLE") {
      const open = await this.db.contentReport.findMany({ where: { targetType: target.type, targetId: target.id, status: "OPEN" } });
      if (open.length) {
        const resolution = state === "HIDDEN" ? "hidden" : "removed";
        await this.db.contentReport.updateMany({
          where: { id: { in: open.map((r) => r.id) } },
          data: { status: "ACTIONED", resolution, resolvedAt: now },
        });
        for (const r of open) {
          await notify(r.reporterId, "COMMUNITY", "Thanks — staff acted on your report", `The ${target.type} you reported has been ${resolution}.`, { kind: "report", reportId: r.id }, this.db);
        }
      }
    }
  }

  async setPinned(viewer: DiscussionViewer, postId: string, pinned: boolean) {
    assertStaff(viewer);
    await this.db.communityPost.update({ where: { id: postId }, data: { pinned } });
    await this.audit.log({ actorId: viewer.id, action: `community.post.${pinned ? "pin" : "unpin"}`, targetType: "post", targetId: postId });
  }

  async setLocked(viewer: DiscussionViewer, postId: string, locked: boolean) {
    assertStaff(viewer);
    await this.db.communityPost.update({ where: { id: postId }, data: { locked } });
    await this.audit.log({ actorId: viewer.id, action: `community.post.${locked ? "lock" : "unlock"}`, targetType: "post", targetId: postId });
  }
}

/** Staff moderation, on the shared database client. */
export const moderation = new ModerationService();
