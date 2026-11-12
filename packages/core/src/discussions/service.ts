/**
 * DiscussionService: the one door the web app has used since discussions
 * launched, kept so no caller changes. It holds no logic of its own: each
 * method hands the call to the part that owns it.
 *
 *   posts.ts       posts, comments, reactions, categories, public counts
 *   groups.ts      groups and membership
 *   reports.ts     members filing reports
 *   moderation.ts  the staff queue and staff actions
 *
 * New code may import a part directly (`posts`, `groups`, `reports`,
 * `moderation`). Mind one name: `discussions.reports(viewer, status, take)` is
 * the staff moderation queue (`moderation.queue`), while the `reports` export
 * is the ReportService members file reports through.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { ModerationState, PrismaClient } from "@tycoonhood/db";
import { GroupService } from "./groups";
import { ModerationService } from "./moderation";
import { PostService, type PostDetail } from "./posts";
import { ReportService } from "./reports";
import type { DiscussionViewer, TargetType } from "./shared";

export class DiscussionService {
  private readonly parts: { posts: PostService; groups: GroupService; reports: ReportService; moderation: ModerationService };

  constructor(db: PrismaClient = defaultPrisma) {
    this.parts = {
      posts: new PostService(db),
      groups: new GroupService(db),
      reports: new ReportService(db),
      moderation: new ModerationService(db),
    };
  }

  // ─────────────────────────────── archive (SiteSetting until columns exist)

  async archived(): Promise<{ categories: string[]; groups: string[] }> {
    return this.parts.posts.archived();
  }

  async setArchived(viewer: DiscussionViewer, kind: "category" | "group", id: string, archived: boolean) {
    return this.parts.moderation.setArchived(viewer, kind, id, archived);
  }

  // ─────────────────────────────── categories

  /** Categories members can post in, in order. Staff may ask for archived ones too. */
  async categories(opts?: { includeArchived?: boolean }) {
    return this.parts.posts.categories(opts);
  }

  async saveCategory(
    viewer: DiscussionViewer,
    input: { id?: string; slug: string; name: string; description?: string | null; sortOrder?: number }
  ) {
    return this.parts.posts.saveCategory(viewer, input);
  }

  // ─────────────────────────────── groups

  async groups(viewer: DiscussionViewer, opts?: { includeArchived?: boolean }) {
    return this.parts.groups.groups(viewer, opts);
  }

  /** One group by slug. Archived groups are readable by staff only. */
  async group(viewer: DiscussionViewer, slug: string) {
    return this.parts.groups.group(viewer, slug);
  }

  async joinGroup(viewer: DiscussionViewer, groupId: string) {
    return this.parts.groups.joinGroup(viewer, groupId);
  }

  async leaveGroup(viewer: DiscussionViewer, groupId: string) {
    return this.parts.groups.leaveGroup(viewer, groupId);
  }

  async saveGroup(
    viewer: DiscussionViewer,
    input: { id?: string; slug: string; name: string; description: string; pillar?: "WARRIOR" | "BUILDER" | "TYCOON" | "MIND" | null }
  ) {
    return this.parts.groups.saveGroup(viewer, input);
  }

  // ─────────────────────────────── reading

  async listPosts(
    viewer: DiscussionViewer,
    opts?: { categorySlug?: string | null; groupId?: string | null; page?: number; pageSize?: number }
  ) {
    return this.parts.posts.listPosts(viewer, opts);
  }

  /** A post with its comments, if this viewer may see it. Null otherwise — callers 404.
   *  A post in an archived group is staff-only; one in an archived category stays readable. */
  async post(viewer: DiscussionViewer, postId: string, now?: Date): Promise<PostDetail | null> {
    return this.parts.posts.post(viewer, postId, now);
  }

  // ─────────────────────────────── writing

  async createPost(
    viewer: DiscussionViewer,
    input: { title: string; body: string; categoryId?: string | null; groupId?: string | null },
    now?: Date
  ) {
    return this.parts.posts.createPost(viewer, input, now);
  }

  async editPost(viewer: DiscussionViewer, postId: string, input: { title: string; body: string }, now?: Date) {
    return this.parts.posts.editPost(viewer, postId, input, now);
  }

  /** Authors take their own post down. It stays on record for staff. */
  async deletePost(viewer: DiscussionViewer, postId: string) {
    return this.parts.posts.deletePost(viewer, postId);
  }

  async comment(viewer: DiscussionViewer, postId: string, rawBody: string, now?: Date) {
    return this.parts.posts.comment(viewer, postId, rawBody, now);
  }

  async deleteComment(viewer: DiscussionViewer, commentId: string) {
    return this.parts.posts.deleteComment(viewer, commentId);
  }

  // ─────────────────────────────── reactions

  /** Toggle one reaction kind on a post or comment. Returns whether it is now on. */
  async toggleReaction(viewer: DiscussionViewer, target: { type: TargetType; id: string }, kind: string, now?: Date) {
    return this.parts.posts.toggleReaction(viewer, target, kind, now);
  }

  // ─────────────────────────────── reports

  /** A member reports a post or comment. */
  async report(viewer: DiscussionViewer, target: { type: TargetType; id: string }, rawReason: string) {
    return this.parts.reports.report(viewer, target, rawReason);
  }

  /** The moderation queue (`moderation.queue`), with each report's target resolved
   *  for display. Not the `reports` export, which is the ReportService members file through. */
  async reports(viewer: DiscussionViewer, status?: "OPEN" | "ACTIONED" | "DISMISSED", take?: number) {
    return this.parts.moderation.queue(viewer, status, take);
  }

  async openReportCount() {
    return this.parts.moderation.openReportCount();
  }

  /** Staff act on a report: hide or remove the target (closing every open
   *  report on it and telling each reporter), or dismiss this one report. */
  async resolveReport(viewer: DiscussionViewer, reportId: string, action: "hide" | "remove" | "dismiss", now?: Date) {
    return this.parts.moderation.resolveReport(viewer, reportId, action, now);
  }

  // ─────────────────────────────── staff moderation

  /** Set a post or comment's moderation state. Hiding or removing closes open
   *  reports on it as ACTIONED and tells each reporter. Audited. */
  async moderate(viewer: DiscussionViewer, target: { type: TargetType; id: string }, state: ModerationState, now?: Date) {
    return this.parts.moderation.moderate(viewer, target, state, now);
  }

  async setPinned(viewer: DiscussionViewer, postId: string, pinned: boolean) {
    return this.parts.moderation.setPinned(viewer, postId, pinned);
  }

  async setLocked(viewer: DiscussionViewer, postId: string, locked: boolean) {
    return this.parts.moderation.setLocked(viewer, postId, locked);
  }

  // ─────────────────────────────── public counts

  /** Real counts for the public Community page. Archived groups and categories, and their posts, are left out. */
  async publicCounts() {
    return this.parts.posts.publicCounts();
  }

  /** Visible posts outside archived groups and categories, for the home page figure. */
  async openPostCount() {
    return this.parts.posts.openPostCount();
  }
}

export const discussions = new DiscussionService();
