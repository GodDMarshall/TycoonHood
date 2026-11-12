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

/** Long text is cut in audit meta, so a row stays short. */
const AUDIT_TEXT_MAX = 200;

function jsonSafe(v: unknown, cut: boolean): Prisma.InputJsonValue | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return cut && v.length > AUDIT_TEXT_MAX ? `${v.slice(0, AUDIT_TEXT_MAX)}… (${v.length} characters)` : v;
  if (Array.isArray(v)) return v.map((x) => jsonSafe(x, cut));
  if (typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, jsonSafe(x, cut)]));
  }
  return v as Prisma.InputJsonValue;
}

/** A value as audit meta can hold it: bigint and Date become strings, and text over 200 characters is cut. */
export function auditValue(v: unknown): Prisma.InputJsonValue | null {
  return jsonSafe(v, true);
}

/** JSON with object keys sorted, so two equal values compare equal whatever order their keys came in. */
function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/**
 * What an edit changed, for an audit row's meta: `{ field: { from, to } }`
 * for each listed field whose value differs (compared in full, shown through
 * auditValue). With no `before` (a new record) every listed field is
 * reported, from null.
 */
export function auditChanges<K extends string>(
  before: { readonly [P in K]?: unknown } | null,
  after: { readonly [P in K]?: unknown },
  fields: readonly K[]
): Record<string, { from: Prisma.InputJsonValue | null; to: Prisma.InputJsonValue | null }> {
  const changes: Record<string, { from: Prisma.InputJsonValue | null; to: Prisma.InputJsonValue | null }> = {};
  for (const field of fields) {
    if (before && stableJson(jsonSafe(before[field], false)) === stableJson(jsonSafe(after[field], false))) continue;
    changes[field] = { from: before ? auditValue(before[field]) : null, to: auditValue(after[field]) };
  }
  return changes;
}
