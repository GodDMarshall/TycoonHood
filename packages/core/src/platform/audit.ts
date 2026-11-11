/**
 * Audit trail. Every staff write and every money-moving state change calls
 * `audit.log`. Append-only; there is no update or delete path.
 */
import { prisma, type Prisma, type PrismaClient } from "@tycoonhood/db";

export type AuditEntry = {
  actorId: string | null;
  action: string; // dotted verb, e.g. "commission.approve", "course.publish"
  targetType?: string;
  targetId?: string;
  meta?: Prisma.InputJsonValue;
};

export class AuditService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async log(entry: AuditEntry, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        meta: entry.meta ?? undefined,
      },
    });
  }

  async recent(opts: { take?: number; cursor?: string; action?: string } = {}) {
    return this.db.auditLog.findMany({
      where: opts.action ? { action: { startsWith: opts.action } } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(opts.take ?? 50, 200),
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: { actor: { select: { email: true, profile: { select: { displayName: true } } } } },
    });
  }
}

export const audit = new AuditService();
