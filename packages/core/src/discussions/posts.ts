/**
 * DISCUSSIONS: posts, comments, reactions and the categories posts are filed in.
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
 *
 * Frozen API (docs/ECOSYSTEM_PLAN.md W1.4): what this file exports is what
 * GROUPS, OPPS, SKILLS and BOOK build on. SOCIAL owns the file; other units ask
 * SOCIAL, through the lead, for an addition instead of editing it.
 */
import { CommunityPostKind, Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { ModerationState, PrismaClient } from "@tycoonhood/db";
import { isStaff } from "../auth/permissions";
import { clip } from "../text/clip";
import { AuditService } from "../platform/audit";
import { notify } from "../platform/notify";
import { formatIst } from "../time/ist";
import {
  DiscussionError,
  SLUG,
  assertOpen,
  assertStaff,
  authorSelect,
  authorView,
  canOpen,
  canSee,
  inArchive,
  inArchivedGroup,
  openPostWhere,
  readArchive,
  setCommentState,
  setPostState,
  visibleWhere,
  type AuthorView,
  type DiscussionViewer,
  type TargetType,
} from "./shared";

// ─────────────────────────────── limits

export const POST_TITLE_MIN = 4;
export const POST_TITLE_MAX = 140;
export const POST_BODY_MAX = 10_000;
export const COMMENT_MAX = 5_000;
export const EDIT_WINDOW_MIN = 30;
export const POSTS_PER_HOUR = 5;
export const COMMENTS_PER_HOUR = 30;
export const POSTS_PAGE_SIZE = 20;
export const REACTION_KINDS = ["respect", "insight", "fire"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];
export const REACTION_LABEL: Record<ReactionKind, string> = { respect: "Respect", insight: "Insight", fire: "Fire" };

const HOUR = 3_600_000;

const POST_KINDS: ReadonlySet<string> = new Set(Object.values(CommunityPostKind));

/** A kind from a caller, checked against the schema's enum. */
function postKind(kind: unknown): CommunityPostKind {
  if (typeof kind !== "string" || !POST_KINDS.has(kind)) throw new DiscussionError("Unknown post kind.");
  return kind as CommunityPostKind;
}

export interface PostSummary {
  id: string;
  /** DISCUSSION unless the post was created with another kind. */
  kind: CommunityPostKind;
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

const excerpt = (s: string, n = 220) => clip(s.replace(/\s+/g, " ").trim(), n);

const emptyReactions = (): Record<ReactionKind, number> => ({ respect: 0, insight: 0, fire: 0 });

export function isReactionKind(v: unknown): v is ReactionKind {
  return typeof v === "string" && (REACTION_KINDS as readonly string[]).includes(v);
}

export class PostService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  /** The archived category and group ids (a SiteSetting until archive columns exist). */
  async archived(): Promise<{ categories: string[]; groups: string[] }> {
    return readArchive(this.db);
  }

  // ─────────────────────────────── categories

  /** Categories members can post in, in order. Staff may ask for archived ones too. */
  async categories(opts: { includeArchived?: boolean } = {}) {
    const [rows, arch] = await Promise.all([
      this.db.communityCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { posts: { where: { state: "VISIBLE" } } } } },
      }),
      readArchive(this.db),
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
    assertStaff(viewer);
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

  // ─────────────────────────────── reading

  /**
   * Frozen API (W1.4): `kind` narrows the list to one post kind. Without it the
   * list holds every kind, as it did before kinds existed.
   */
  async listPosts(
    viewer: DiscussionViewer,
    opts: { categorySlug?: string | null; groupId?: string | null; kind?: CommunityPostKind; page?: number; pageSize?: number } = {}
  ) {
    const pageSize = Math.min(Math.max(opts.pageSize ?? POSTS_PAGE_SIZE, 1), 50);
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const arch = await readArchive(this.db);
    // Archived groups are readable by staff only, as in groups.group().
    if (opts.groupId && !isStaff(viewer) && arch.groups.includes(opts.groupId)) return { posts: [], total: 0, page, pages: 1 };
    const where: Prisma.CommunityPostWhereInput = {
      AND: [
        visibleWhere(viewer),
        opts.groupId ? { groupId: opts.groupId } : { groupId: null },
        opts.categorySlug ? { category: { slug: opts.categorySlug } } : {},
        opts.kind ? { kind: postKind(opts.kind) } : {},
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
      kind: p.kind,
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
    const arch = await readArchive(this.db);
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
      kind: p.kind,
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
          ? `You can read but not post until ${formatIst(m.until)}.`
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

  /**
   * Frozen API (W1.4): `kind` defaults to DISCUSSION. The caller decides who may
   * use a kind (GROUPS checks groupCan(…, "announce") before an ANNOUNCEMENT);
   * here only staff may post an ANNOUNCEMENT outside a group.
   */
  async createPost(
    viewer: DiscussionViewer,
    input: { title: string; body: string; categoryId?: string | null; groupId?: string | null; kind?: CommunityPostKind },
    now = new Date()
  ) {
    const kind = postKind(input.kind ?? CommunityPostKind.DISCUSSION);
    if (kind === CommunityPostKind.ANNOUNCEMENT && !input.groupId && !isStaff(viewer)) {
      throw new DiscussionError("Only staff post announcements in the main feed.");
    }
    await this.assertCanWrite(viewer, now);
    const title = this.cleanTitle(input.title ?? "");
    const body = this.cleanBody(input.body ?? "", POST_BODY_MAX);
    const staff = isStaff(viewer);
    const arch = await readArchive(this.db);

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
      data: { authorId: viewer.id, kind, title, body, categoryId, groupId, createdAt: now },
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
    await assertOpen(this.db, viewer, p);
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
    await setPostState(this.db, p, "REMOVED");
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
    await assertOpen(this.db, viewer, p);
    if (!staff) {
      const recent = await this.db.communityComment.count({ where: { authorId: viewer.id, createdAt: { gt: new Date(now.getTime() - HOUR) } } });
      if (recent >= COMMENTS_PER_HOUR) throw new DiscussionError(`You can comment ${COMMENTS_PER_HOUR} times an hour. Take a breath and come back.`);
    }
    const tellAuthor = p.authorId !== viewer.id && (await canOpen(this.db, p.authorId, p));

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
    await setCommentState(this.db, c, "REMOVED");
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
    await assertOpen(this.db, viewer, place);
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
    if (!recent && (await canOpen(this.db, authorId, place))) {
      await notify(authorId, "COMMUNITY", `People are reacting to ${target.type === "post" ? "your post" : "your comment"}`, `On “${excerpt(postTitle, 80)}”.`, {
        kind: "reaction",
        postId,
        href: `/community/discussions/${postId}`,
      }, this.db);
    }
    return { on: true };
  }

  // ─────────────────────────────── public counts

  /** Real counts for the public Community page. Archived groups and categories, and their posts, are left out. */
  async publicCounts() {
    const arch = await readArchive(this.db);
    const [discussions, groups, categories] = await Promise.all([
      this.db.communityPost.count({ where: openPostWhere(arch) }),
      this.db.communityGroup.count({ where: { id: { notIn: arch.groups } } }),
      this.db.communityCategory.count({ where: { id: { notIn: arch.categories } } }),
    ]);
    return { discussions, groups, categories };
  }

  /** Visible posts outside archived groups and categories, for the home page figure. */
  async openPostCount() {
    return this.db.communityPost.count({ where: openPostWhere(await readArchive(this.db)) });
  }
}

/** Posts, comments, reactions and categories, on the shared database client. */
export const posts = new PostService();
