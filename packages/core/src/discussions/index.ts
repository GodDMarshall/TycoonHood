/**
 * DISCUSSIONS: posts, comments, reactions, groups, reports, leaderboard.
 *
 * The chat (community/community.ts) is for talk that scrolls away. Discussions
 * are for things worth finding later: a question with its answer, a win with
 * its proof, a write-up. They sit beside the chat and share its moderation
 * posture (mutes, reports, staff-only removal).
 *
 * Where things live:
 *   posts.ts       posts, comments, reactions, categories, public counts  (`posts`)
 *   groups.ts      groups and membership                                  (`groups`)
 *   reports.ts     members filing reports                                 (`reports`)
 *   moderation.ts  the staff queue and staff actions                      (`moderation`)
 *   service.ts     DiscussionService and `discussions`, which hand each call to the part above
 *   shared.ts      what the parts share (internal; not re-exported wholesale)
 *   discussions.ts the old import path, re-exporting this file
 */
export { DiscussionService, discussions } from "./service";
export { DiscussionError, ARCHIVE_SETTING, openPostWhere } from "./shared";
export type { DiscussionViewer, TargetType, AuthorView } from "./shared";
export {
  PostService,
  posts,
  isReactionKind,
  REACTION_KINDS,
  REACTION_LABEL,
  POST_TITLE_MIN,
  POST_TITLE_MAX,
  POST_BODY_MAX,
  COMMENT_MAX,
  EDIT_WINDOW_MIN,
  POSTS_PER_HOUR,
  COMMENTS_PER_HOUR,
  POSTS_PAGE_SIZE,
} from "./posts";
export type { ReactionKind, PostSummary, PostDetail, CommentView } from "./posts";
export { GroupService, groups } from "./groups";
export { ReportService, reports, DISCUSSION_REPORT_MAX, REPORT_TARGET_TYPES } from "./reports";
export type { ReportTargetType } from "./reports";
export { ModerationService, moderation } from "./moderation";
export { LeaderboardService, leaderboard, onLeaderboard, LEADERBOARD_SIZE } from "./leaderboard";
export type { Leaderboard, LeaderboardRow, LeaderboardPeriod } from "./leaderboard";
export { weekStart, weekKey } from "../rules/criteria";
