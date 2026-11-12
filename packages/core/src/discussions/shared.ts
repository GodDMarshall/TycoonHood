/**
 * DISCUSSIONS: what the four parts share (posts.ts, groups.ts, reports.ts,
 * moderation.ts).
 *
 * Internal to discussions/. index.ts re-exports the public names from here
 * (DiscussionError, the viewer and author types, ARCHIVE_SETTING,
 * openPostWhere); the helpers stay private, so each rule is written once: who
 * may see what, what an archive closes, who counts as staff, and how a post or
 * comment changes state.
 */
import type { ModerationState, Prisma, PrismaClient, UserRole } from "@tycoonhood/db";
import { isStaff } from "../auth/permissions";

/** SiteSetting key holding archived category and group ids (no archive column yet). */
export const ARCHIVE_SETTING = "community.archived";

export class DiscussionError extends Error {}

export interface DiscussionViewer {
  id: string;
  role: UserRole;
}

/** What a reaction, a staff decision or the moderation queue can point at. */
export type TargetType = "post" | "comment";

export interface AuthorView {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  rank: string | null;
  staff: boolean;
}

export const authorSelect = {
  select: {
    id: true,
    role: true,
    name: true,
    rank: { select: { name: true } },
    profile: { select: { displayName: true, username: true, avatarUrl: true } },
  },
} satisfies Prisma.UserDefaultArgs;

type AuthorRow = Prisma.UserGetPayload<typeof authorSelect>;

export function authorView(a: AuthorRow): AuthorView {
  return {
    id: a.id,
    name: a.profile?.displayName ?? a.name ?? "Member",
    username: a.profile?.username ?? null,
    avatarUrl: a.profile?.avatarUrl ?? null,
    rank: a.rank?.name ?? null,
    staff: isStaff(a),
  };
}

/** A category or group address. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertStaff(viewer: DiscussionViewer) {
  if (!isStaff(viewer)) throw new DiscussionError("Only community staff can do that.");
}

// ─────────────────────────────── who may see what

/** Members see VISIBLE; an author also sees their own HIDDEN; staff see all. */
export function canSee(viewer: DiscussionViewer, row: { state: ModerationState; authorId: string }) {
  if (row.state === "VISIBLE") return true;
  if (isStaff(viewer)) return true;
  return row.state === "HIDDEN" && row.authorId === viewer.id;
}

/** canSee, as a filter on a list of posts. */
export function visibleWhere(viewer: DiscussionViewer): Prisma.CommunityPostWhereInput {
  if (isStaff(viewer)) return {};
  return { OR: [{ state: "VISIBLE" }, { state: "HIDDEN", authorId: viewer.id }] };
}

// ─────────────────────────────── archive (SiteSetting until columns exist)

export type ArchiveSets = { categories: string[]; groups: string[] };

/** The archived category and group ids. */
export async function readArchive(db: PrismaClient): Promise<ArchiveSets> {
  const row = await db.siteSetting.findUnique({ where: { key: ARCHIVE_SETTING } });
  const v = (row?.value ?? {}) as { categories?: unknown; groups?: unknown };
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : []);
  return { categories: ids(v.categories), groups: ids(v.groups) };
}

/** Visible posts outside archived groups and categories: what Today and public counts show. */
export function openPostWhere(arch: ArchiveSets): Prisma.CommunityPostWhereInput {
  return {
    AND: [
      { state: "VISIBLE" },
      arch.groups.length ? { OR: [{ groupId: null }, { groupId: { notIn: arch.groups } }] } : {},
      arch.categories.length ? { OR: [{ categoryId: null }, { categoryId: { notIn: arch.categories } }] } : {},
    ],
  };
}

export function inArchivedGroup(arch: ArchiveSets, p: { groupId: string | null }) {
  return !!p.groupId && arch.groups.includes(p.groupId);
}

export function inArchive(arch: ArchiveSets, p: { groupId: string | null; categoryId: string | null }) {
  return inArchivedGroup(arch, p) || (!!p.categoryId && arch.categories.includes(p.categoryId));
}

/** An archived group or category is closed to members' writing; staff can still answer. */
export async function assertOpen(db: PrismaClient, viewer: DiscussionViewer, p: { groupId: string | null; categoryId: string | null }) {
  if (isStaff(viewer)) return;
  if (inArchive(await readArchive(db), p)) throw new DiscussionError("This discussion is archived.");
}

/** Whether a notice about this post would lead the user somewhere they can open:
 *  a post in an archived group is staff-only, as in posts.post(). */
export async function canOpen(db: PrismaClient, userId: string, p: { groupId: string | null }) {
  if (!p.groupId || !inArchivedGroup(await readArchive(db), p)) return true;
  return isStaff(await db.user.findUnique({ where: { id: userId }, select: { role: true } }));
}

// ─────────────────────────────── state changes (an author's delete, or staff)

/** Change a post's state. A hidden or removed post is unpinned, and its title leaves the
 *  reaction notices its commenters got. Its author keeps theirs: they wrote the title. */
export async function setPostState(db: PrismaClient, p: { id: string; authorId: string }, state: ModerationState) {
  await db.$transaction(async (tx) => {
    await tx.communityPost.update({ where: { id: p.id }, data: { state, ...(state !== "VISIBLE" ? { pinned: false } : {}) } });
    if (state !== "VISIBLE") {
      await tx.notification.updateMany({
        where: {
          userId: { not: p.authorId },
          type: "COMMUNITY",
          AND: [{ data: { path: ["kind"], equals: "reaction" } }, { data: { path: ["postId"], equals: p.id } }],
        },
        data: { body: null },
      });
    }
  });
}

/** Change a comment's state and keep the post's visible-comment counter true. A hidden
 *  or removed comment's text also leaves the notification its post's author got for it. */
export async function setCommentState(db: PrismaClient, c: { id: string; state: ModerationState; postId: string }, state: ModerationState) {
  if (c.state === state) return;
  const delta = (state === "VISIBLE" ? 1 : 0) - (c.state === "VISIBLE" ? 1 : 0);
  await db.$transaction(async (tx) => {
    await tx.communityComment.update({ where: { id: c.id }, data: { state } });
    if (delta !== 0) await tx.communityPost.update({ where: { id: c.postId }, data: { commentCount: { increment: delta } } });
    if (state !== "VISIBLE") {
      const post = await tx.communityPost.findUnique({ where: { id: c.postId }, select: { authorId: true } });
      if (post) {
        await tx.notification.updateMany({
          where: { userId: post.authorId, type: "COMMUNITY", data: { path: ["commentId"], equals: c.id } },
          data: { body: null },
        });
      }
    }
  });
}
