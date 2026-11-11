/**
 * MEMBER ADMINISTRATION — role changes and suspension. Both need
 * `admin.users`, both are audited, and neither can be turned on yourself:
 * an administrator cannot demote or suspend their own account, so the house
 * can never lock itself out by accident.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, UserRole } from "@tycoonhood/db";
import { assertCan, ROLES, type HasRole } from "../auth/permissions";
import { SessionService } from "../auth/session";
import { AuditService } from "./audit";

export type Actor = { id: string } & NonNullable<HasRole>;

export class MemberAdminError extends Error {}

export class MemberAdminService {
  private audit: AuditService;
  private sessions: SessionService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
    this.sessions = new SessionService(db);
  }

  async changeRole(actor: Actor, targetId: string, role: UserRole) {
    assertCan(actor, "admin.users");
    if (!(ROLES as readonly string[]).includes(role)) throw new MemberAdminError("Unknown role.");
    if (actor.id === targetId) throw new MemberAdminError("You cannot change your own role.");
    const target = await this.db.user.findUniqueOrThrow({ where: { id: targetId } });
    if (target.role === role) return target;
    return this.db.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: targetId }, data: { role } });
      await this.audit.log(
        { actorId: actor.id, action: "user.role.change", targetType: "User", targetId, meta: { from: target.role, to: role } },
        tx
      );
      return updated;
    });
  }

  /** Suspending signs the member out everywhere; their sessions stop resolving. */
  async setSuspended(actor: Actor, targetId: string, suspended: boolean, reason?: string) {
    assertCan(actor, "admin.users");
    if (actor.id === targetId) throw new MemberAdminError("You cannot suspend your own account.");
    const updated = await this.db.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: targetId }, data: { suspendedAt: suspended ? new Date() : null } });
      await this.audit.log(
        {
          actorId: actor.id,
          action: suspended ? "user.suspend" : "user.unsuspend",
          targetType: "User",
          targetId,
          meta: reason?.trim() ? { reason: reason.trim().slice(0, 500) } : undefined,
        },
        tx
      );
      return u;
    });
    if (suspended) await this.sessions.destroyAllForUser(targetId);
    return updated;
  }
}

export const memberAdmin = new MemberAdminService();
