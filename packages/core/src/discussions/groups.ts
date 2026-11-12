/**
 * DISCUSSIONS: community groups and who is in them.
 *
 * A group's posts are written and read through posts.ts; this file is the
 * groups themselves: listing, one group, joining, leaving, and staff saving
 * one. Archiving a group is a staff decision in moderation.ts.
 *
 * GROUPS owns this file after P0s (docs/ECOSYSTEM_PLAN.md W1.4).
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { isStaff } from "../auth/permissions";
import { AuditService } from "../platform/audit";
import { DiscussionError, SLUG, assertStaff, readArchive, type DiscussionViewer } from "./shared";

export class GroupService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  async groups(viewer: DiscussionViewer, opts: { includeArchived?: boolean } = {}) {
    const [rows, arch, mine] = await Promise.all([
      this.db.communityGroup.findMany({
        orderBy: [{ createdAt: "asc" }],
        include: { _count: { select: { members: true, posts: { where: { state: "VISIBLE" } } } } },
      }),
      readArchive(this.db),
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
    const arch = await readArchive(this.db);
    const archived = arch.groups.includes(g.id);
    if (archived && !isStaff(viewer)) return null;
    const m = await this.db.groupMembership.findUnique({ where: { groupId_userId: { groupId: g.id, userId: viewer.id } } });
    return { id: g.id, slug: g.slug, name: g.name, description: g.description, pillar: g.pillar, members: g._count.members, joined: !!m, archived };
  }

  async joinGroup(viewer: DiscussionViewer, groupId: string) {
    const g = await this.db.communityGroup.findUnique({ where: { id: groupId }, select: { id: true } });
    const arch = await readArchive(this.db);
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
    assertStaff(viewer);
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
}

/** Community groups and their members, on the shared database client. */
export const groups = new GroupService();
