/**
 * DISCUSSIONS — posts, comments, reactions, groups, reports.
 *
 * The chat (community/community.ts) is for talk that scrolls away. Discussions
 * are for things worth finding later: a question with its answer, a win with
 * its proof, a write-up. They sit beside the chat and share its moderation
 * posture (mutes, reports, staff-only removal).
 *
 * Anti-farming, carried from DR-26 ("rank stays unfarmable"):
 *   • Posting, commenting and reacting grant no XP and no THC here. A post emits
 *     DISCUSSION_POSTED; it is worth something only if staff configure a mission
 *     for it, and repeatable missions cap at once per local day.
 *   • You cannot react to your own post or comment.
 *   • Per-member rate limits are enforced by counting real rows, so a restart or
 *     a second server cannot reset them.
 *
 * Bodies are stored raw (plain text / markdown) and rendered escaped by the
 * page; nothing here produces HTML.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { ModerationState, PrismaClient, UserRole } from "@tycoonhood/db";
import { isStaff } from "../auth/permissions";
import { clip } from "../text/clip";
import { AuditService } from "../platform/audit";
import { notify } from "../platform/notify";

// ─────────────────────────────── limits

export const POST_TITLE_MIN = 4;
export const POST_TITLE_MAX = 140;
export const POST_BODY_MAX = 10_000;
export const COMMENT_MAX = 5_000;
export const DISCUSSION_REPORT_MAX = 500;
export const EDIT_WINDOW_MIN = 30;
export const POSTS_PER_HOUR = 5;
export const COMMENTS_PER_HOUR = 30;
export const POSTS_PAGE_SIZE = 20;
export const REACTION_KINDS = ["respect", "insight", "fire"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];
export const REACTION_LABEL: Record<ReactionKind, string> = { respect: "Respect", insight: "Insight", fire: "Fire" };

const HOUR = 3_600_000;
/** SiteSetting key holding archived category and group ids (no archive column yet). */
export const ARCHIVE_SETTING = "community.archived";

export class DiscussionError extends Error {}

export interface DiscussionViewer {
  id: string;
  role: UserRole;
}

export type TargetType = "post" | "comment";

export interface AuthorView {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  rank: string | null;
  staff: boolean;
}

export interface PostSummary {
  id: string;
  title: string;
  excerpt: string;
  state: ModerationState;
  pinned: boolean;
  locked: boolean;
  commentCount: number;
  reactionCount: number;
  createdAt: string;
  mine: boolean;
  author: AuthorView;
  category: { slug: string; name: string } | null;
  group: { slug: string; name: string } | null;
}

export interface CommentView {
  id: string;
  body: string | null;
  state: ModerationState;
  createdAt: string;
  mine: boolean;
  author: AuthorView;
  reactions: Record<ReactionKind, number>;
  myReactions: ReactionKind[];
}

export interface PostDetail extends Omit<PostSummary, "excerpt"> {
  body: string;
  editableUntil: string | null;
  reactions: Record<ReactionKind, number>;
  myReactions: ReactionKind[];
  comments: CommentView[];
  reported: boolean;
  /** In an archived group or category: read-only for members. */
  archived: boolean;
}

const authorSelect = {
  select: {
    id: true,
    role: true,
    name: true,
    rank: { select: { name: true } },
    profile: { select: { displayName: true, username: true, avatarUrl: true } },
  },
} satisfies Prisma.UserDefaultArgs;

type AuthorRow = Prisma.UserGetPayload<typeof authorSelect>;

function authorView(a: AuthorRow): AuthorView {
  return {
    id: a.id,
    name: a.profile?.displayName ?? a.name ?? "Member",
    username: a.profile?.username ?? null,
    avatarUrl: a.profile?.avatarUrl ?? null,
    rank: a.rank?.name ?? null,
    staff: isStaff(a),
  };
}

const excerpt = (s: string, n = 220) => clip(s.replace(/\s+/g, " ").trim(), n);

const emptyReactions = (): Record<ReactionKind, number> => ({ respect: 0, insight: 0, fire: 0 });

export function isReactionKind(v: unknown): v is ReactionKind {
  return typeof v === "string" && (REACTION_KINDS as readonly string[]).includes(v);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Members see VISIBLE; an author also sees their own HIDDEN; staff see all. */
function canSee(viewer: DiscussionViewer, row: { state: ModerationState; authorId: string }) {
  if (row.state === "VISIBLE") return true;
  if (isStaff(viewer)) return true;
  return row.state === "HIDDEN" && row.authorId === viewer.id;
}

function visibleWhere(viewer: DiscussionViewer): Prisma.CommunityPostWhereInput {
  if (isStaff(viewer)) return {};
  return { OR: [{ state: "VISIBLE" }, { state: "HIDDEN", authorId: viewer.id }] };
}

type ArchiveSets = { categories: string[]; groups: string[] };

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

function inArchivedGroup(arch: ArchiveSets, p: { groupId: string | null }) {
  return !!p.groupId && arch.groups.includes(p.groupId);
}

function inArchive(arch: ArchiveSets, p: { groupId: string | null; categoryId: string | null }) {
  return inArchivedGroup(arch, p) || (!!p.categoryId && arch.categories.includes(p.categoryId));
}

export class DiscussionService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  // ─────────────────────────────── archive (SiteSetting until columns exist)

  async archived(): Promise<{ categories: string[]; groups: string[] }> {
    const row = await this.db.siteSetting.findUnique({ where: { key: ARCHIVE_SETTING } });
    const v = (row?.value ?? {}) as { categories?: unknown; groups?: unknown };
    const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : []);
    return { categories: ids(v.categories), groups: ids(v.groups) };
  }

  async setArchived(viewer: DiscussionViewer, kind: "category" | "group", id: string, archived: boolean) {
    this.assertStaff(viewer);
    const cur = await this.archived();
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

  private assertStaff(viewer: DiscussionViewer) {
    if (!isStaff(viewer)) throw new DiscussionError("Only community staff can do that.");
  }

  /** An archived group or category is closed to members' writing; staff can still answer. */
  private async assertOpen(viewer: DiscussionViewer, p: { groupId: string | null; categoryId: string | null }) {
    if (isStaff(viewer)) return;
    if (inArchive(await this.archived(), p)) throw new DiscussionError("This discussion is archived.");
  }

  /** Whether a notice about this post would lead the user somewhere they can open:
   *  a post in an archived group is staff-only, as in post(). */
  private async canOpen(userId: string, p: { groupId: string | null }) {
    if (!p.groupId || !inArchivedGroup(await this.archived(), p)) return true;
    return isStaff(await this.db.user.findUnique({ where: { id: userId }, select: { role: true } }));
  }

  // ─────────────────────────────── categories

  /** Categories members can post in, in order. Staff may ask for archived ones too. */
  async categories(opts: { includeArchived?: boolean } = {}) {
    const [rows, arch] = await Promise.all([
      this.db.communityCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { posts: { where: { state: "VISIBLE" } } } } },
      }),
      this.archived(),
    ]);
    const archived = new Set(arch.categories);
    return rows
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        sortOrder: r.sortOrder,
        posts: r._count.posts,
        archived: archived.has(r.id),
      }))
      .filter((r) => opts.includeArchived || !r.archived);
  }

  async saveCategory(
    viewer: DiscussionViewer,
    input: { id?: string; slug: string; name: string; description?: string | null; sortOrder?: number }
  ) {
    this.assertStaff(viewer);
    const slug = input.slug.trim().toLowerCase();
    if (!SLUG.test(slug) || slug.length > 60) throw new DiscussionError("The address must be lowercase letters, numbers and single hyphens.");
    const name = input.name.trim();
    if (name.length < 2 || name.length > 60) throw new DiscussionError("Give the category a name of 2 to 60 characters.");
    const description = input.description?.trim() || null;
    if (description && description.length > 300) throw new DiscussionError("Keep the description under 300 characters.");
    const data = { slug, name, description, sortOrder: Math.floor(input.sortOrder ?? 0) };
    try {
      const row = input.id
        ? await this.db.communityCategory.update({ where: { id: input.id }, data })
        : await this.db.communityCategory.create({ data });
      await this.audit.log({ actorId: viewer.id, action: input.id ? "community.category.update" : "community.category.create", targetType: "category", targetId: row.id, meta: { slug } });
      return row;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DiscussionError("Another category already uses that address.");
      throw e;
    }
  }

  // ─────────────────────────────── groups

  async groups(viewer: DiscussionViewer, opts: { includeArchived?: boolean } = {}) {
    const [rows, arch, mine] = await Promise.all([
      this.db.communityGroup.findMany({
        orderBy: [{ createdAt: "asc" }],
        include: { _count: { select: { members: true, posts: { where: { state: "VISIBLE" } } } } },
      }),
      this.archived(),
      this.db.groupMembership.findMany({ where: { userId: viewer.id }, select: { groupId: true } }),
    ]);
    const archived = new Set(arch.groups);
    const joined = new Set(mine.map((m) => m.groupId));
    return rows
      .map((g) => ({
        id: g.id,
        slug: g.slug,
        name: g.name,
        description: g.description,
        pillar: g.pillar,
        members: g._count.members,
        posts: g._count.posts,
        joined: joined.has(g.id),
        archived: archived.has(g.id),
      }))
      .filter((g) => opts.includeArchived || !g.archived);
  }

  /** One group by slug. Archived groups are readable by staff only. */
  async group(viewer: DiscussionViewer, slug: string) {
    const g = await this.db.communityGroup.findUnique({
      where: { slug },
      include: { _count: { select: { members: true } } },
    });
    if (!g) return null;
    const arch = await this.archived();
    const archived = arch.groups.includes(g.id);
    if (archived && !isStaff(viewer)) return null;
    const m = await this.db.groupMembership.findUnique({ where: { groupId_userId: { groupId: g.id, userId: viewer.id } } });
    return { id: g.id, slug: g.slug, name: g.name, description: g.description, pillar: g.pillar, members: g._count.members, joined: !!m, archived };
  }

  async joinGroup(viewer: DiscussionViewer, groupId: string) {
    const g = await this.db.communityGroup.findUnique({ where: { id: groupId }, select: { id: true } });
    const arch = await this.archived();
    if (!g || arch.groups.includes(groupId)) throw new DiscussionError("That group is not open.");
    try {
      await this.db.groupMembership.create({ data: { groupId, userId: viewer.id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return; // already in
      throw e;
    }
  }

  async leaveGroup(viewer: DiscussionViewer, groupId: string) {
    await this.db.groupMembership.deleteMany({ where: { groupId, userId: viewer.id } });
  }

  async saveGroup(
    viewer: DiscussionViewer,
    input: { id?: string; slug: string; name: string; description: string; pillar?: "WARRIOR" | "BUILDER" | "TYCOON" | "MIND" | null }
  ) {
    this.assertStaff(viewer);
    const slug = input.slug.trim().toLowerCase();
    if (!SLUG.test(slug) || slug.length > 60) throw new DiscussionError("The address must be lowercase letters, numbers and single hyphens.");
    const name = input.name.trim();
    if (name.length < 2 || name.length > 60) throw new DiscussionError("Give the group a name of 2 to 60 characters.");
    const description = input.description.trim();
    if (description.length < 10 || description.length > 1000) throw new DiscussionError("Describe the group in 10 to 1,000 characters.");
    const data = { slug, name, description, pillar: input.pillar ?? null };
    try {
      const row = input.id
        ? await this.db.communityGroup.update({ where: { id: input.id }, data })
        : await this.db.communityGroup.create({ data });
      await this.audit.log({ actorId: viewer.id, action: input.id ? "community.group.update" : "community.group.create", targetType: "group", targetId: row.id, meta: { slug } });
      return row;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DiscussionError("Another group already uses that address.");
      throw e;
    }
  }

  // ─────────────────────────────── reading

  async listPosts(
    viewer: DiscussionViewer,
    opts: { categorySlug?: string | null; groupId?: string | null; page?: number; pageSize?: number } = {}
  ) {
    const pageSize = Math.min(Math.max(opts.pageSize ?? POSTS_PAGE_SIZE, 1), 50);
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const arch = await this.archived();
    // Archived groups are readable by staff only, as in group().
    if (opts.groupId && !isStaff(viewer) && arch.groups.includes(opts.groupId)) return { posts: [], total: 0, page, pages: 1 };
    const where: Prisma.CommunityPostWhereInput = {
      AND: [
        visibleWhere(viewer),
        opts.groupId ? { groupId: opts.groupId } : { groupId: null },
        opts.categorySlug ? { category: { slug: opts.categorySlug } } : {},
        // Archived categories drop out of the main feed for members.
        !opts.groupId && arch.categories.length && !isStaff(viewer)
          ? { OR: [{ categoryId: null }, { categoryId: { notIn: arch.categories } }] }
          : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.db.communityPost.count({ where }),
      this.db.communityPost.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: authorSelect,
          category: { select: { slug: true, name: true } },
          group: { select: { slug: true, name: true } },
        },
      }),
    ]);
    const posts: PostSummary[] = rows.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: excerpt(p.body),
      state: p.state,
      pinned: p.pinned,
      locked: p.locked,
      commentCount: p.commentCount,
      reactionCount: p.reactionCount,
      createdAt: p.createdAt.toISOString(),
      mine: p.authorId === viewer.id,
      author: authorView(p.author),
      category: p.category,
      group: p.group,
    }));
    return { posts, total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  private async reactionsFor(targetKeys: string[], viewerId: string) {
    const counts = new Map<string, Record<ReactionKind, number>>();
    const mine = new Map<string, ReactionKind[]>();
    if (targetKeys.length === 0) return { counts, mine };
    const [grouped, own] = await Promise.all([
      this.db.reaction.groupBy({ by: ["targetKey", "kind"], where: { targetKey: { in: targetKeys } }, _count: { _all: true } }),
      this.db.reaction.findMany({ where: { targetKey: { in: targetKeys }, userId: viewerId }, select: { targetKey: true, kind: true } }),
    ]);
    for (const g of grouped) {
      if (!isReactionKind(g.kind)) continue;
      const c = counts.get(g.targetKey) ?? emptyReactions();
      c[g.kind] = g._count._all;
      counts.set(g.targetKey, c);
    }
    for (const r of own) {
      if (!isReactionKind(r.kind)) continue;
      mine.set(r.targetKey, [...(mine.get(r.targetKey) ?? []), r.kind]);
    }
    return { counts, mine };
  }

  /** A post with its comments, if this viewer may see it. Null otherwise — callers 404.
   *  A post in an archived group is staff-only; one in an archived category stays readable. */
  async post(viewer: DiscussionViewer, postId: string, now = new Date()): Promise<PostDetail | null> {
    const p = await this.db.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: authorSelect,
        category: { select: { slug: true, name: true } },
        group: { select: { slug: true, name: true } },
        comments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { author: authorSelect } },
      },
    });
    if (!p || !canSee(viewer, p)) return null;
    const staff = isStaff(viewer);
    const arch = await this.archived();
    if (!staff && inArchivedGroup(arch, p)) return null;
    const archived = inArchive(arch, p);
    const comments = p.comments.filter((c) => c.state === "VISIBLE" || staff || (c.state === "HIDDEN" && c.authorId === viewer.id));
    const keys = [`post:${p.id}`, ...comments.map((c) => `comment:${c.id}`)];
    const [{ counts, mine }, reported] = await Promise.all([
      this.reactionsFor(keys, viewer.id),
      this.db.contentReport.findUnique({
        where: { reporterId_targetType_targetId: { reporterId: viewer.id, targetType: "post", targetId: p.id } },
        select: { id: true },
      }),
    ]);
    const editDeadline = p.createdAt.getTime() + EDIT_WINDOW_MIN * 60_000;
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      state: p.state,
      pinned: p.pinned,
      locked: p.locked,
      commentCount: p.commentCount,
      reactionCount: p.reactionCount,
      createdAt: p.createdAt.toISOString(),
      mine: p.authorId === viewer.id,
      author: authorView(p.author),
      category: p.category,
      group: p.group,
      editableUntil:
        p.authorId === viewer.id && p.state !== "REMOVED" && (staff || !archived) && now.getTime() < editDeadline ? new Date(editDeadline).toISOString() : null,
      reactions: counts.get(`post:${p.id}`) ?? emptyReactions(),
      myReactions: mine.get(`post:${p.id}`) ?? [],
      reported: !!reported,
      archived,
      comments: comments.map((c) => ({
        id: c.id,
        // A removed comment keeps its place in the thread; only staff read it.
        body: c.state === "REMOVED" && !staff ? null : c.body,
        state: c.state,
        createdAt: c.createdAt.toISOString(),
        mine: c.authorId === viewer.id,
        author: authorView(c.author),
        reactions: counts.get(`comment:${c.id}`) ?? emptyReactions(),
        myReactions: mine.get(`comment:${c.id}`) ?? [],
      })),
    };
  }

  // ─────────────────────────────── writing

  private async assertCanWrite(viewer: DiscussionViewer, now: Date) {
    const m = await this.db.communityMute.findUnique({ where: { userId: viewer.id } });
    if (m && (!m.until || m.until > now)) {
      throw new DiscussionError(
        m.until
          ? `You can read but not post until ${m.until.toUTCString().slice(0, 22)} UTC.`
          : "You can read but not post. Contact staff if you think this is a mistake."
      );
    }
  }

  private cleanTitle(raw: string) {
    const title = raw.replace(/\s+/g, " ").trim();
    if (title.length < POST_TITLE_MIN || title.length > POST_TITLE_MAX) {
      throw new DiscussionError(`Give it a title of ${POST_TITLE_MIN} to ${POST_TITLE_MAX} characters.`);
    }
    return title;
  }

  private cleanBody(raw: string, max: number) {
    const body = raw.replace(/\r\n/g, "\n").trim();
    if (!body) throw new DiscussionError("Write something first.");
    if (body.length > max) throw new DiscussionError(`Keep it under ${max.toLocaleString("en-US")} characters.`);
    return body;
  }

  async createPost(
    viewer: DiscussionViewer,
    input: { title: string; body: string; categoryId?: string | null; groupId?: string | null },
    now = new Date()
  ) {
    await this.assertCanWrite(viewer, now);
    const title = this.cleanTitle(input.title ?? "");
    const body = this.cleanBody(input.body ?? "", POST_BODY_MAX);
    const staff = isStaff(viewer);
    const arch = await this.archived();

    let categoryId: string | null = null;
    let groupId: string | null = null;
    if (input.groupId) {
      const g = await this.db.communityGroup.findUnique({ where: { id: input.groupId }, select: { id: true } });
      if (!g || arch.groups.includes(g.id)) throw new DiscussionError("That group is not open.");
      if (!staff) {
        const m = await this.db.groupMembership.findUnique({ where: { groupId_userId: { groupId: g.id, userId: viewer.id } } });
        if (!m) throw new DiscussionError("Join the group to post in it.");
      }
      groupId = g.id;
    } else {
      if (!input.categoryId) throw new DiscussionError("Choose a category.");
      const c = await this.db.communityCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } });
      if (!c || arch.categories.includes(c.id)) throw new DiscussionError("That category is closed.");
      categoryId = c.id;
    }

    if (!staff) {
      const recent = await this.db.communityPost.count({ where: { authorId: viewer.id, createdAt: { gt: new Date(now.getTime() - HOUR) } } });
      if (recent >= POSTS_PER_HOUR) throw new DiscussionError(`You can start ${POSTS_PER_HOUR} discussions an hour. Try again later.`);
    }

    const post = await this.db.communityPost.create({
      data: { authorId: viewer.id, title, body, categoryId, groupId, createdAt: now },
    });
    const { events } = await import("../events/bus");
    await events.emit({ type: "DISCUSSION_POSTED", userId: viewer.id, postId: post.id, at: now });
    return post;
  }

  async editPost(viewer: DiscussionViewer, postId: string, input: { title: string; body: string }, now = new Date()) {
    const p = await this.db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, state: true, createdAt: true, groupId: true, categoryId: true },
    });
    if (!p || p.authorId !== viewer.id || p.state === "REMOVED") throw new DiscussionError("You can only edit your own posts.");
    if (now.getTime() > p.createdAt.getTime() + EDIT_WINDOW_MIN * 60_000) {
      throw new DiscussionError(`Posts can be edited for ${EDIT_WINDOW_MIN} minutes. Add a comment instead.`);
    }
    await this.assertOpen(viewer, p);
    await this.assertCanWrite(viewer, now);
    const title = this.cleanTitle(input.title ?? "");
    const body = this.cleanBody(input.body ?? "", POST_BODY_MAX);
    return this.db.communityPost.update({ where: { id: p.id }, data: { title, body } });
  }

  /** Authors take their own post down. It stays on record for staff. */
  async deletePost(viewer: DiscussionViewer, postId: string) {
    const p = await this.db.communityPost.findUnique({ where: { id: postId }, select: { id: true, authorId: true, state: true } });
    if (!p || p.authorId !== viewer.id) throw new DiscussionError("You can only delete your own posts.");
    if (p.state === "REMOVED") return;
    await this.setPostState(p, "REMOVED");
  }

  /** Change a post's state. A hidden or removed post is unpinned, and its title leaves the
   *  reaction notices its commenters got. Its author keeps theirs: they wrote the title. */
  private async setPostState(p: { id: string; authorId: string }, state: ModerationState) {
    await this.db.$transaction(async (tx) => {
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

  async comment(viewer: DiscussionViewer, postId: string, rawBody: string, now = new Date()) {
    await this.assertCanWrite(viewer, now);
    const body = this.cleanBody(rawBody ?? "", COMMENT_MAX);
    const p = await this.db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, state: true, locked: true, title: true, groupId: true, categoryId: true },
    });
    const staff = isStaff(viewer);
    if (!p || (p.state !== "VISIBLE" && !staff)) throw new DiscussionError("That post no longer exists.");
    if (p.locked && !staff) throw new DiscussionError("This discussion is locked. Staff closed it to new comments.");
    await this.assertOpen(viewer, p);
    if (!staff) {
      const recent = await this.db.communityComment.count({ where: { authorId: viewer.id, createdAt: { gt: new Date(now.getTime() - HOUR) } } });
      if (recent >= COMMENTS_PER_HOUR) throw new DiscussionError(`You can comment ${COMMENTS_PER_HOUR} times an hour. Take a breath and come back.`);
    }
    const tellAuthor = p.authorId !== viewer.id && (await this.canOpen(p.authorId, p));

    const c = await this.db.$transaction(async (tx) => {
      const c = await tx.communityComment.create({ data: { postId: p.id, authorId: viewer.id, body, createdAt: now } });
      await tx.communityPost.update({ where: { id: p.id }, data: { commentCount: { increment: 1 } } });
      if (tellAuthor) {
        const who = await tx.profile.findUnique({ where: { userId: viewer.id }, select: { displayName: true } });
        await notify(
          p.authorId,
          "COMMUNITY",
          `${who?.displayName ?? "A member"} commented on “${excerpt(p.title, 60)}”`,
          excerpt(body, 140),
          { kind: "comment", postId: p.id, commentId: c.id, href: `/community/discussions/${p.id}#c-${c.id}` },
          tx
        );
      }
      return c;
    });
    return c;
  }

  async deleteComment(viewer: DiscussionViewer, commentId: string) {
    const c = await this.db.communityComment.findUnique({ where: { id: commentId }, select: { id: true, authorId: true, state: true, postId: true } });
    if (!c || c.authorId !== viewer.id) throw new DiscussionError("You can only delete your own comments.");
    await this.setCommentState(c, "REMOVED");
  }

  /** Change a comment's state and keep the post's visible-comment counter true. A hidden
   *  or removed comment's text also leaves the notification its post's author got for it. */
  private async setCommentState(c: { id: string; state: ModerationState; postId: string }, state: ModerationState) {
    if (c.state === state) return;
    const delta = (state === "VISIBLE" ? 1 : 0) - (c.state === "VISIBLE" ? 1 : 0);
    await this.db.$transaction(async (tx) => {
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

  // ─────────────────────────────── reactions

  /** Toggle one reaction kind on a post or comment. Returns whether it is now on. */
  async toggleReaction(viewer: DiscussionViewer, target: { type: TargetType; id: string }, kind: string, now = new Date()) {
    if (!isReactionKind(kind)) throw new DiscussionError("Unknown reaction.");
    let postId: string;
    let authorId: string;
    let postTitle: string;
    let place: { groupId: string | null; categoryId: string | null };
    if (target.type === "post") {
      const p = await this.db.communityPost.findUnique({
        where: { id: target.id },
        select: { id: true, authorId: true, state: true, title: true, groupId: true, categoryId: true },
      });
      if (!p || p.state !== "VISIBLE") throw new DiscussionError("That post no longer exists.");
      postId = p.id;
      authorId = p.authorId;
      postTitle = p.title;
      place = p;
    } else {
      const c = await this.db.communityComment.findUnique({
        where: { id: target.id },
        select: { id: true, authorId: true, state: true, post: { select: { id: true, state: true, title: true, groupId: true, categoryId: true } } },
      });
      if (!c || c.state !== "VISIBLE" || c.post.state !== "VISIBLE") throw new DiscussionError("That comment no longer exists.");
      postId = c.post.id;
      authorId = c.authorId;
      postTitle = c.post.title;
      place = c.post;
    }
    await this.assertOpen(viewer, place);
    if (authorId === viewer.id) throw new DiscussionError("You cannot react to your own writing.");

    const targetKey = `${target.type}:${target.id}`;
    const existing = await this.db.reaction.findUnique({ where: { userId_targetKey_kind: { userId: viewer.id, targetKey, kind } } });

    if (existing) {
      await this.db.$transaction(async (tx) => {
        await tx.reaction.delete({ where: { id: existing.id } });
        if (target.type === "post") await tx.communityPost.update({ where: { id: postId }, data: { reactionCount: { decrement: 1 } } });
      });
      return { on: false };
    }

    try {
      await this.db.$transaction(async (tx) => {
        await tx.reaction.create({
          data: {
            userId: viewer.id,
            kind,
            targetKey,
            postId: target.type === "post" ? target.id : null,
            commentId: target.type === "comment" ? target.id : null,
            createdAt: now,
          },
        });
        if (target.type === "post") await tx.communityPost.update({ where: { id: postId }, data: { reactionCount: { increment: 1 } } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { on: true }; // double click
      throw e;
    }

    // Batched: at most one reaction notification per post per author per hour,
    // and none that would lead the author to a post they cannot open.
    const recent = await this.db.notification.findFirst({
      where: {
        userId: authorId,
        type: "COMMUNITY",
        createdAt: { gt: new Date(now.getTime() - HOUR) },
        AND: [{ data: { path: ["kind"], equals: "reaction" } }, { data: { path: ["postId"], equals: postId } }],
      },
      select: { id: true },
    });
    if (!recent && (await this.canOpen(authorId, place))) {
      await notify(authorId, "COMMUNITY", `People are reacting to ${target.type === "post" ? "your post" : "your comment"}`, `On “${excerpt(postTitle, 80)}”.`, {
        kind: "reaction",
        postId,
        href: `/community/discussions/${postId}`,
      }, this.db);
    }
    return { on: true };
  }

  // ─────────────────────────────── reports

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

  /** The moderation queue, with each report's target resolved for display. */
  async reports(viewer: DiscussionViewer, status: "OPEN" | "ACTIONED" | "DISMISSED" = "OPEN", take = 100) {
    this.assertStaff(viewer);
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
    this.assertStaff(viewer);
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
    this.assertStaff(viewer);
    if (target.type === "post") {
      const p = await this.db.communityPost.findUnique({ where: { id: target.id }, select: { id: true, authorId: true } });
      if (!p) throw new DiscussionError("That post no longer exists.");
      await this.setPostState(p, state);
    } else {
      const c = await this.db.communityComment.findUnique({ where: { id: target.id }, select: { id: true, state: true, postId: true } });
      if (!c) throw new DiscussionError("That comment no longer exists.");
      await this.setCommentState(c, state);
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
    this.assertStaff(viewer);
    await this.db.communityPost.update({ where: { id: postId }, data: { pinned } });
    await this.audit.log({ actorId: viewer.id, action: `community.post.${pinned ? "pin" : "unpin"}`, targetType: "post", targetId: postId });
  }

  async setLocked(viewer: DiscussionViewer, postId: string, locked: boolean) {
    this.assertStaff(viewer);
    await this.db.communityPost.update({ where: { id: postId }, data: { locked } });
    await this.audit.log({ actorId: viewer.id, action: `community.post.${locked ? "lock" : "unlock"}`, targetType: "post", targetId: postId });
  }

  // ─────────────────────────────── public counts

  /** Real counts for the public Community page. Archived groups and categories, and their posts, are left out. */
  async publicCounts() {
    const arch = await this.archived();
    const [discussions, groups, categories] = await Promise.all([
      this.db.communityPost.count({ where: openPostWhere(arch) }),
      this.db.communityGroup.count({ where: { id: { notIn: arch.groups } } }),
      this.db.communityCategory.count({ where: { id: { notIn: arch.categories } } }),
    ]);
    return { discussions, groups, categories };
  }

  /** Visible posts outside archived groups and categories, for the home page figure. */
  async openPostCount() {
    return this.db.communityPost.count({ where: openPostWhere(await this.archived()) });
  }
}

export const discussions = new DiscussionService();
