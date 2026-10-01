/**
 * COMMUNITY
 *
 * Channels are house-wide (courseId null) or belong to one program, where
 * only members enrolled in it — and staff — can read or post. The design
 * answers the failure of chat-first academies, where the chat drowns the
 * learning:
 *
 *   • Questions carry the lesson they are about, so the lesson page can show
 *     them and the answer is findable later.
 *   • Wins carry their proof.
 *   • Slow mode per channel, a per-member mute, member reports, staff pins.
 *   • Nothing a member does in chat raises their rank. Volume is never a
 *     signal. The one community reward — the contributor achievement — counts
 *     messages STAFF chose to pin, which cannot be farmed.
 *   • No direct messages between strangers.
 *
 * Every read goes through `canRead`; every projection leaves out what the
 * viewer may not see (a removed message's body, other members' emails).
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";

export const MESSAGE_MAX = 2000;
export const PROOF_URL_MAX = 500;
export const REPORT_REASON_MAX = 300;
export const PAGE_SIZE = 50;

export class CommunityError extends Error {}

export interface Viewer {
  id: string;
  role: "MEMBER" | "ADMIN";
}

type ChannelRow = Prisma.ChannelGetPayload<{ include: { course: { select: { slug: true; title: true } } } }>;

export interface ChannelSummary {
  id: string;
  slug: string;
  name: string;
  topic: string | null;
  kind: "CHAT" | "ANNOUNCEMENTS" | "WINS" | "QUESTIONS";
  adminOnly: boolean;
  slowModeSec: number;
  course: { slug: string; title: string } | null;
  unread: number;
}

export interface MessageView {
  id: string;
  body: string | null;
  removed: boolean;
  proofUrl: string | null;
  createdAt: string;
  pinned: boolean;
  mine: boolean;
  author: { id: string; name: string; username: string | null; avatarUrl: string | null; rank: string | null; staff: boolean };
  replyTo: { id: string; author: string; excerpt: string | null } | null;
  lesson: { id: string; title: string; courseSlug: string } | null;
}

const messageInclude = {
  author: {
    select: {
      id: true,
      role: true,
      name: true,
      rank: { select: { name: true } },
      profile: { select: { displayName: true, username: true, avatarUrl: true } },
    },
  },
  replyTo: {
    select: {
      id: true,
      body: true,
      deletedAt: true,
      author: { select: { name: true, profile: { select: { displayName: true } } } },
    },
  },
  lesson: { select: { id: true, title: true, module: { select: { course: { select: { slug: true } } } } } },
} satisfies Prisma.MessageInclude;

type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

const excerpt = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function project(m: MessageRow, viewer: Viewer): MessageView {
  const removed = !!m.deletedAt;
  return {
    id: m.id,
    body: removed ? null : m.body,
    removed,
    proofUrl: removed ? null : m.proofUrl,
    createdAt: m.createdAt.toISOString(),
    pinned: !!m.pinnedAt && !removed,
    mine: m.authorId === viewer.id,
    author: {
      id: m.author.id,
      name: m.author.profile?.displayName ?? m.author.name ?? "Member",
      username: m.author.profile?.username ?? null,
      avatarUrl: m.author.profile?.avatarUrl ?? null,
      rank: m.author.rank?.name ?? null,
      staff: m.author.role === "ADMIN",
    },
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          author: m.replyTo.author.profile?.displayName ?? m.replyTo.author.name ?? "Member",
          excerpt: m.replyTo.deletedAt ? null : excerpt(m.replyTo.body),
        }
      : null,
    lesson: m.lesson ? { id: m.lesson.id, title: m.lesson.title, courseSlug: m.lesson.module.course.slug } : null,
  };
}

/** http(s) only, trimmed, bounded. Returns null for empty input. */
export function cleanUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (v.length > PROOF_URL_MAX) throw new CommunityError("That link is too long.");
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new CommunityError("That proof link is not a valid URL.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new CommunityError("Proof links must start with http:// or https://.");
  return u.toString();
}

export class CommunityService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  // ─────────────────────────────── access

  private async enrolledCourseIds(userId: string) {
    const rows = await this.db.enrollment.findMany({
      where: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
      select: { courseId: true },
    });
    return new Set(rows.map((r) => r.courseId));
  }

  async canRead(viewer: Viewer, channel: { courseId: string | null; archivedAt: Date | null }) {
    if (viewer.role === "ADMIN") return true;
    if (channel.archivedAt) return false;
    if (!channel.courseId) return true;
    const e = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId: viewer.id, courseId: channel.courseId } },
      select: { status: true },
    });
    return !!e && e.status !== "DROPPED";
  }

  /** The channel, if this viewer may read it. Null otherwise — callers 404. */
  async channel(viewer: Viewer, slug: string): Promise<ChannelRow | null> {
    const ch = await this.db.channel.findUnique({
      where: { slug },
      include: { course: { select: { slug: true, title: true } } },
    });
    if (!ch) return null;
    return (await this.canRead(viewer, ch)) ? ch : null;
  }

  /** Every channel the viewer can read, house-wide first, with unread counts. */
  async channelsFor(viewer: Viewer, memberSince: Date): Promise<ChannelSummary[]> {
    const enrolled = viewer.role === "ADMIN" ? null : await this.enrolledCourseIds(viewer.id);
    const rows = await this.db.channel.findMany({
      where: {
        archivedAt: null,
        ...(enrolled ? { OR: [{ courseId: null }, { courseId: { in: [...enrolled] } }] } : {}),
      },
      include: { course: { select: { slug: true, title: true, sortOrder: true } } },
    });
    rows.sort(
      (a, b) =>
        (a.course ? 1 : 0) - (b.course ? 1 : 0) ||
        (a.course?.sortOrder ?? 0) - (b.course?.sortOrder ?? 0) ||
        (a.course?.title ?? "").localeCompare(b.course?.title ?? "") ||
        a.sortOrder - b.sortOrder
    );
    const unread = await this.unreadByChannel(viewer.id, rows.map((r) => r.id), memberSince);
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      topic: r.topic,
      kind: r.kind,
      adminOnly: r.adminOnly,
      slowModeSec: r.slowModeSec,
      course: r.course ? { slug: r.course.slug, title: r.course.title } : null,
      unread: unread.get(r.id) ?? 0,
    }));
  }

  /** Unread = messages by others since the viewer last read the channel
   *  (or since they joined, for a channel they have never opened). */
  private async unreadByChannel(userId: string, channelIds: string[], since: Date) {
    if (channelIds.length === 0) return new Map<string, number>();
    const rows = await this.db.$queryRaw<{ channelId: string; n: number }[]>`
      SELECT m."channelId", LEAST(count(*), 99)::int AS n
      FROM "Message" m
      LEFT JOIN "ChannelRead" r ON r."channelId" = m."channelId" AND r."userId" = ${userId}
      WHERE m."channelId" = ANY(${channelIds})
        AND m."deletedAt" IS NULL
        AND m."authorId" <> ${userId}
        AND m."createdAt" > COALESCE(r."lastReadAt", ${since})
      GROUP BY m."channelId"`;
    return new Map(rows.map((r) => [r.channelId, Number(r.n)]));
  }

  async unreadTotal(viewer: Viewer, memberSince: Date) {
    const channels = await this.channelsFor(viewer, memberSince);
    return channels.reduce((n, c) => n + c.unread, 0);
  }

  async markRead(userId: string, channelId: string, at = new Date()) {
    await this.db.channelRead.upsert({
      where: { userId_channelId: { userId, channelId } },
      update: { lastReadAt: at },
      create: { userId, channelId, lastReadAt: at },
    });
  }

  // ─────────────────────────────── reading

  /** A page of messages, oldest first. `before`/`after` are message ids. */
  async messages(viewer: Viewer, channelId: string, opts: { before?: string; after?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), 100);
    const anchorId = opts.after ?? opts.before;
    const anchor = anchorId
      ? await this.db.message.findFirst({ where: { id: anchorId, channelId }, select: { createdAt: true, id: true } })
      : null;

    let rows: MessageRow[];
    if (opts.after && anchor) {
      rows = await this.db.message.findMany({
        where: {
          channelId,
          OR: [{ createdAt: { gt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { gt: anchor.id } }],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: limit,
        include: messageInclude,
      });
    } else {
      rows = await this.db.message.findMany({
        where: {
          channelId,
          ...(opts.before && anchor
            ? { OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        include: messageInclude,
      });
      rows.reverse();
    }
    return rows.map((m) => project(m, viewer));
  }

  /** Changes since a moment: removals and pins on messages already on screen. */
  async changesSince(viewer: Viewer, channelId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.db.message.findMany({
      where: { channelId, id: { in: ids.slice(0, 200) } },
      select: { id: true, deletedAt: true, pinnedAt: true },
    });
    return rows.map((r) => ({ id: r.id, removed: !!r.deletedAt, pinned: !!r.pinnedAt && !r.deletedAt }));
  }

  async pinned(viewer: Viewer, channelId: string) {
    const rows = await this.db.message.findMany({
      where: { channelId, pinnedAt: { not: null }, deletedAt: null },
      orderBy: { pinnedAt: "desc" },
      take: 20,
      include: messageInclude,
    });
    return rows.map((m) => project(m, viewer));
  }

  /** Questions asked about one lesson, newest first, in channels the viewer can read. */
  async lessonQuestions(viewer: Viewer, lessonId: string, limit = 5) {
    const rows = await this.db.message.findMany({
      where: { lessonId, deletedAt: null, channel: { archivedAt: null } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { ...messageInclude, channel: { select: { slug: true, courseId: true, archivedAt: true } } },
    });
    const out: (MessageView & { channelSlug: string })[] = [];
    for (const r of rows) if (await this.canRead(viewer, r.channel)) out.push({ ...project(r, viewer), channelSlug: r.channel.slug });
    return out;
  }

  /** The newest messages in one house channel (e.g. announcements, wins), for Today. */
  async latest(viewer: Viewer, slug: string, limit = 3) {
    const ch = await this.channel(viewer, slug);
    if (!ch) return [];
    const rows = await this.db.message.findMany({
      where: { channelId: ch.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: messageInclude,
    });
    return rows.map((m) => project(m, viewer));
  }

  // ─────────────────────────────── posting

  async activeMute(userId: string, now = new Date()) {
    const m = await this.db.communityMute.findUnique({ where: { userId } });
    if (!m) return null;
    if (m.until && m.until <= now) return null;
    return m;
  }

  async post(
    viewer: Viewer,
    channelSlug: string,
    input: { body: string; proofUrl?: string | null; lessonId?: string | null; replyToId?: string | null },
    now = new Date()
  ): Promise<MessageView> {
    const ch = await this.channel(viewer, channelSlug);
    if (!ch) throw new CommunityError("That channel does not exist, or it is not yours to read.");
    if (ch.archivedAt) throw new CommunityError("This channel is archived.");
    const staff = viewer.role === "ADMIN";
    if (ch.adminOnly && !staff) throw new CommunityError("Only staff post in this channel.");

    const mute = await this.activeMute(viewer.id, now);
    if (mute) {
      throw new CommunityError(
        mute.until
          ? `You can read but not post until ${mute.until.toUTCString().slice(0, 22)} UTC.`
          : "You can read but not post. Contact staff if you think this is a mistake."
      );
    }

    const body = input.body.replace(/\r\n/g, "\n").trim();
    if (!body) throw new CommunityError("Write something first.");
    if (body.length > MESSAGE_MAX) throw new CommunityError(`Keep it under ${MESSAGE_MAX.toLocaleString("en-US")} characters.`);

    if (ch.slowModeSec > 0 && !staff) {
      const last = await this.db.message.findFirst({
        where: { channelId: ch.id, authorId: viewer.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (last) {
        const wait = Math.ceil((last.createdAt.getTime() + ch.slowModeSec * 1000 - now.getTime()) / 1000);
        if (wait > 0) throw new CommunityError(`Slow mode is on here. You can post again in ${wait}s.`);
      }
    }

    const proofUrl = ch.kind === "WINS" ? cleanUrl(input.proofUrl) : null;

    let lessonId: string | null = null;
    if (input.lessonId) {
      const lesson = await this.db.lesson.findUnique({
        where: { id: input.lessonId },
        select: { id: true, module: { select: { courseId: true } } },
      });
      if (!lesson || (ch.courseId && lesson.module.courseId !== ch.courseId)) {
        throw new CommunityError("That lesson does not belong to this program.");
      }
      lessonId = lesson.id;
    }

    let replyTo: { id: string; authorId: string } | null = null;
    if (input.replyToId) {
      replyTo = await this.db.message.findFirst({
        where: { id: input.replyToId, channelId: ch.id, deletedAt: null },
        select: { id: true, authorId: true },
      });
      if (!replyTo) throw new CommunityError("The message you replied to is gone.");
    }

    const m = await this.db.message.create({
      data: { channelId: ch.id, authorId: viewer.id, body, proofUrl, lessonId, replyToId: replyTo?.id ?? null, createdAt: now },
      include: messageInclude,
    });
    await this.markRead(viewer.id, ch.id, now);

    if (replyTo && replyTo.authorId !== viewer.id) {
      const name = m.author.profile?.displayName ?? m.author.name ?? "A member";
      await this.db.notification.create({
        data: {
          userId: replyTo.authorId,
          type: "COMMUNITY",
          title: `${name} replied to you in #${ch.name}`,
          body: excerpt(body, 140),
          data: { channel: ch.slug, messageId: m.id },
        },
      });
    }
    return project(m, viewer);
  }

  // ─────────────────────────────── moderation

  /** Authors remove their own messages; staff remove anyone's. */
  async remove(viewer: Viewer, messageId: string, now = new Date()) {
    const m = await this.db.message.findUnique({ where: { id: messageId }, select: { id: true, authorId: true, deletedAt: true } });
    if (!m) throw new CommunityError("That message no longer exists.");
    const staff = viewer.role === "ADMIN";
    if (m.authorId !== viewer.id && !staff) throw new CommunityError("You can only remove your own messages.");
    if (m.deletedAt) return;
    await this.db.message.update({ where: { id: m.id }, data: { deletedAt: now, deletedById: viewer.id, pinnedAt: null } });
    if (staff) {
      await this.db.messageReport.updateMany({
        where: { messageId: m.id, resolvedAt: null },
        data: { resolvedAt: now, resolvedById: viewer.id, resolution: "removed" },
      });
    }
  }

  /** Staff pin a message worth everyone's attention. Pinning a member's message
   *  is the one community act that counts toward an achievement. */
  async setPinned(viewer: Viewer, messageId: string, pinned: boolean, now = new Date()) {
    if (viewer.role !== "ADMIN") throw new CommunityError("Only staff pin messages.");
    const m = await this.db.message.findUnique({
      where: { id: messageId },
      select: { id: true, authorId: true, deletedAt: true, pinnedAt: true, channel: { select: { name: true, slug: true } } },
    });
    if (!m || m.deletedAt) throw new CommunityError("That message no longer exists.");
    if (!!m.pinnedAt === pinned) return;
    await this.db.message.update({ where: { id: m.id }, data: { pinnedAt: pinned ? now : null } });
    if (pinned && m.authorId !== viewer.id) {
      await this.db.notification.create({
        data: {
          userId: m.authorId,
          type: "COMMUNITY",
          title: `Staff pinned your message in #${m.channel.name}`,
          data: { channel: m.channel.slug, messageId: m.id },
        },
      });
      const { events } = await import("../events/bus");
      await events.emit({ type: "COMMUNITY_CONTRIBUTION", userId: m.authorId, at: now });
    }
  }

  async report(viewer: Viewer, messageId: string, reason: string) {
    const r = reason.trim();
    if (r.length < 3) throw new CommunityError("Say briefly what is wrong with it.");
    if (r.length > REPORT_REASON_MAX) throw new CommunityError(`Keep the reason under ${REPORT_REASON_MAX} characters.`);
    const m = await this.db.message.findUnique({
      where: { id: messageId },
      select: { id: true, authorId: true, deletedAt: true, channel: { select: { courseId: true, archivedAt: true } } },
    });
    if (!m || m.deletedAt || !(await this.canRead(viewer, m.channel))) throw new CommunityError("That message no longer exists.");
    if (m.authorId === viewer.id) throw new CommunityError("You cannot report your own message. Remove it instead.");
    try {
      await this.db.messageReport.create({ data: { messageId: m.id, reporterId: viewer.id, reason: r } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new CommunityError("You have already reported this message. Staff will see it.");
      }
      throw e;
    }
  }

  async openReports() {
    return this.db.messageReport.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        reporter: { select: { profile: { select: { displayName: true, username: true } } } },
        message: {
          include: {
            channel: { select: { name: true, slug: true } },
            author: { select: { id: true, profile: { select: { displayName: true, username: true } } } },
          },
        },
      },
    });
  }

  async resolveReport(viewer: Viewer, reportId: string, action: "remove" | "dismiss", now = new Date()) {
    if (viewer.role !== "ADMIN") throw new CommunityError("Only staff resolve reports.");
    const rep = await this.db.messageReport.findUnique({ where: { id: reportId } });
    if (!rep || rep.resolvedAt) return;
    if (action === "remove") {
      await this.remove(viewer, rep.messageId, now); // resolves every open report on it
    } else {
      await this.db.messageReport.update({
        where: { id: rep.id },
        data: { resolvedAt: now, resolvedById: viewer.id, resolution: "dismissed" },
      });
    }
  }

  async mute(viewer: Viewer, userId: string, until: Date | null, reason: string | null) {
    if (viewer.role !== "ADMIN") throw new CommunityError("Only staff mute members.");
    if (userId === viewer.id) throw new CommunityError("You cannot mute yourself.");
    await this.db.communityMute.upsert({
      where: { userId },
      update: { until, reason, mutedById: viewer.id, createdAt: new Date() },
      create: { userId, until, reason, mutedById: viewer.id },
    });
  }

  async unmute(viewer: Viewer, userId: string) {
    if (viewer.role !== "ADMIN") throw new CommunityError("Only staff lift mutes.");
    await this.db.communityMute.deleteMany({ where: { userId } });
  }

  async activeMutes(now = new Date()) {
    return this.db.communityMute.findMany({
      where: { OR: [{ until: null }, { until: { gt: now } }] },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { profile: { select: { displayName: true, username: true } } } } },
    });
  }

  // ─────────────────────────────── channels (staff)

  /** Two channels per published program — discussion and questions. Idempotent. */
  async ensureProgramChannels() {
    const courses = await this.db.course.findMany({ where: { status: "PUBLISHED" }, select: { id: true, slug: true } });
    let created = 0;
    for (const c of courses) {
      for (const [suffix, name, kind, topic, sortOrder] of [
        ["discussion", "Discussion", "CHAT", "Talk about the work of this program with the people doing it.", 0],
        ["questions", "Questions", "QUESTIONS", "Stuck on a lesson? Ask here. Questions from the lesson page land here with the lesson attached.", 1],
      ] as const) {
        const slug = `${c.slug}-${suffix}`;
        const exists = await this.db.channel.findUnique({ where: { slug }, select: { id: true } });
        if (exists) continue;
        await this.db.channel.create({ data: { slug, name, kind, topic, courseId: c.id, slowModeSec: 10, sortOrder } });
        created++;
      }
    }
    return created;
  }

  async allChannels() {
    return this.db.channel.findMany({
      orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { courseId: { sort: "asc", nulls: "first" } }, { sortOrder: "asc" }],
      include: { course: { select: { title: true, slug: true } }, _count: { select: { messages: true } } },
    });
  }

  async saveChannel(
    viewer: Viewer,
    input: { id?: string; slug: string; name: string; topic?: string | null; kind: ChannelSummary["kind"]; courseId?: string | null; adminOnly: boolean; slowModeSec: number; sortOrder: number }
  ) {
    if (viewer.role !== "ADMIN") throw new CommunityError("Only staff manage channels.");
    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
      throw new CommunityError("The address must be lowercase letters, numbers and single hyphens.");
    }
    const name = input.name.trim();
    if (name.length < 2 || name.length > 40) throw new CommunityError("Give the channel a name of 2 to 40 characters.");
    const slowModeSec = Math.max(0, Math.min(3600, Math.floor(input.slowModeSec || 0)));
    const data = {
      slug,
      name,
      topic: input.topic?.trim() || null,
      kind: input.kind,
      courseId: input.courseId || null,
      adminOnly: input.adminOnly,
      slowModeSec,
      sortOrder: Math.floor(input.sortOrder || 0),
    };
    try {
      if (input.id) return await this.db.channel.update({ where: { id: input.id }, data });
      return await this.db.channel.create({ data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new CommunityError("Another channel already uses that address.");
      }
      throw e;
    }
  }

  async setArchived(viewer: Viewer, channelId: string, archived: boolean) {
    if (viewer.role !== "ADMIN") throw new CommunityError("Only staff manage channels.");
    await this.db.channel.update({ where: { id: channelId }, data: { archivedAt: archived ? new Date() : null } });
  }
}

export const community = new CommunityService();
