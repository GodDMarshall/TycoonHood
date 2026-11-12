/**
 * DISCUSSIONS: members reporting what they think breaks the house rules.
 *
 * Not the moderation queue. Staff read and act on reports in moderation.ts
 * (`moderation.queue`, which `discussions.reports()` still answers to); this
 * file is the member's side: filing one.
 *
 * Frozen API (docs/ECOSYSTEM_PLAN.md W1.4): SOCIAL owns this file; other units
 * ask SOCIAL, through the lead, for an addition instead of editing it.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { DiscussionError, canSee, type DiscussionViewer, type TargetType } from "./shared";

export const DISCUSSION_REPORT_MAX = 500;

export class ReportService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async report(viewer: DiscussionViewer, target: { type: TargetType; id: string }, rawReason: string) {
    const reason = (rawReason ?? "").trim();
    if (reason.length < 3) throw new DiscussionError("Say briefly what is wrong with it.");
    if (reason.length > DISCUSSION_REPORT_MAX) throw new DiscussionError(`Keep the reason under ${DISCUSSION_REPORT_MAX} characters.`);
    const row =
      target.type === "post"
        ? await this.db.communityPost.findUnique({ where: { id: target.id }, select: { authorId: true, state: true } })
        : await this.db.communityComment.findUnique({ where: { id: target.id }, select: { authorId: true, state: true } });
    if (!row || row.state === "REMOVED" || !canSee(viewer, row)) throw new DiscussionError("That no longer exists.");
    if (row.authorId === viewer.id) throw new DiscussionError("You cannot report your own writing. Delete it instead.");
    try {
      await this.db.contentReport.create({ data: { reporterId: viewer.id, targetType: target.type, targetId: target.id, reason } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new DiscussionError("You have already reported this. Staff will see it.");
      }
      throw e;
    }
  }
}

/**
 * Filing reports, on the shared database client. Not to be confused with
 * `discussions.reports()`, the staff moderation queue (moderation.queue).
 */
export const reports = new ReportService();
