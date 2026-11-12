/**
 * DISCUSSIONS: members reporting what they think breaks the house rules.
 *
 * Not the moderation queue. Staff read and act on reports in moderation.ts
 * (`moderation.queue`, which `discussions.reports()` still answers to); this
 * file is the member's side: filing one. Every report, of a post, a comment
 * or anything else a member can point at, goes through `reports.file`;
 * `discussions.report` (posts and comments) calls it too.
 *
 * Frozen API (docs/ECOSYSTEM_PLAN.md W1.4): SOCIAL owns this file; other units
 * ask SOCIAL, through the lead, for an addition instead of editing it.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { isStaff } from "../auth/permissions";
import { DiscussionError, canSee, readArchive, type DiscussionViewer } from "./shared";

export const DISCUSSION_REPORT_MAX = 500;

/** Everything a member can report: the target types `ContentReport.targetType` holds. */
export const REPORT_TARGET_TYPES = [
  "post",
  "comment",
  "user",
  "group",
  "project",
  "event",
  "event_feedback",
  "opportunity",
  "partner",
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** Longer than any id the house makes (cuid 25, uuid 36): such a target cannot exist. */
const TARGET_ID_MAX = 64;

export class ReportService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /**
   * A member reports something for staff to look at: files an OPEN
   * `ContentReport` and returns its id.
   *
   * - `targetType` is one of REPORT_TARGET_TYPES; any other is refused.
   * - `reason` is trimmed, and must be 3 to DISCUSSION_REPORT_MAX characters.
   * - Nobody reports themselves or their own writing.
   * - The target must exist and, for a post, comment or group, be one the
   *   member can see (staff see hidden writing and archived groups; nobody
   *   sees removed writing). A target type with no lookup yet is taken as
   *   given (see assertReportable).
   * - One report per member and target: a second is refused, saying staff
   *   already have the first.
   *
   * As post and comment reports always have, filing tells nobody (the member
   * reported never learns who reported them), writes no audit row and has no
   * rate limit. Refusals are DiscussionErrors, whose message is written for
   * the member.
   *
   * Staff see post and comment reports in the moderation queue
   * (moderation.queue), and the admin overview counts the same
   * (openReportCount). Reports on the other targets are kept, and wait for
   * SOCIAL's one queue over every ContentReport or the owning unit's own admin
   * page; until then no screen lists or clears them. So no page offers
   * another target type before a staff screen lists its reports
   * (docs/ECOSYSTEM_PLAN.md W1.4).
   */
  async file(
    viewer: DiscussionViewer,
    input: { targetType: ReportTargetType; targetId: string; reason: string }
  ): Promise<{ id: string }> {
    const { targetType, targetId } = input;
    if (!REPORT_TARGET_TYPES.includes(targetType)) throw new DiscussionError("That cannot be reported.");
    const reason = (input.reason ?? "").trim();
    if (reason.length < 3) throw new DiscussionError("Say briefly what is wrong with it.");
    if (reason.length > DISCUSSION_REPORT_MAX) throw new DiscussionError(`Keep the reason under ${DISCUSSION_REPORT_MAX} characters.`);
    if (typeof targetId !== "string" || !targetId || targetId.length > TARGET_ID_MAX) {
      throw new DiscussionError("That no longer exists.");
    }
    await this.assertReportable(viewer, targetType, targetId);
    try {
      return await this.db.contentReport.create({
        data: { reporterId: viewer.id, targetType, targetId, reason },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new DiscussionError("You have already reported this. Staff will see it.");
      }
      throw e;
    }
  }

  /** The target exists, the member may see it, and it is not their own. */
  private async assertReportable(viewer: DiscussionViewer, targetType: ReportTargetType, targetId: string) {
    switch (targetType) {
      case "post":
      case "comment": {
        const row =
          targetType === "post"
            ? await this.db.communityPost.findUnique({ where: { id: targetId }, select: { authorId: true, state: true } })
            : await this.db.communityComment.findUnique({ where: { id: targetId }, select: { authorId: true, state: true } });
        if (!row || row.state === "REMOVED" || !canSee(viewer, row)) throw new DiscussionError("That no longer exists.");
        if (row.authorId === viewer.id) throw new DiscussionError("You cannot report your own writing. Delete it instead.");
        return;
      }
      case "user": {
        if (targetId === viewer.id) throw new DiscussionError("You cannot report yourself.");
        const user = await this.db.user.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!user) throw new DiscussionError("That no longer exists.");
        return;
      }
      case "group": {
        // Only a group the member can see: an archived group is staff-only,
        // as in groups.group(). Groups have no owner column yet, so there is
        // no "your own" to refuse. Once P0a's columns land, GROUPS adds two
        // checks here, through the lead (SOCIAL owns this file), with their
        // cases in reports-file.test.ts: refuse a group the member created
        // or owns (createdById, an OWNER membership), and one they cannot see
        // by its status (PENDING_REVIEW, REJECTED) or visibility.
        const group = await this.db.communityGroup.findUnique({ where: { id: targetId }, select: { id: true } });
        if (!group || (!isStaff(viewer) && (await readArchive(this.db)).groups.includes(group.id))) {
          throw new DiscussionError("That no longer exists.");
        }
        return;
      }
      case "project":
      case "event":
      case "event_feedback":
      case "opportunity":
      case "partner":
        // No lookup yet, so the report is taken as given: no check that the
        // target exists, that the member may see it, or that it is not their
        // own, and every new id makes a new row. The unit that builds on each
        // table adds that lookup here, through the lead (SOCIAL owns this
        // file): SKILLS for project, LIVE-A for event and event_feedback,
        // OPPS-B for opportunity and OPPS-A for partner. No page or server
        // action offers reports.file for one of these types before its
        // lookup has landed.
        return;
    }
  }
}

/**
 * Filing reports, on the shared database client: `reports.file(...)`. Not to
 * be confused with `discussions.reports()`, the staff moderation queue
 * (moderation.queue).
 */
export const reports = new ReportService();
