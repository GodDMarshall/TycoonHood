/**
 * ACCOUNT SETTINGS — the member's own security-sensitive changes.
 *
 *  · change email: needs the current password; the new address starts
 *    unverified and every token for the old one is revoked.
 *  · change password: needs the current password; every OTHER session is
 *    signed out, the one making the change stays.
 *  · delete account: a request for staff, recorded as a ContactMessage.
 *    Accounts are never hard-deleted from here — ledger rows reference the
 *    user with ON DELETE RESTRICT, and the books must still balance.
 */
import { z } from "zod";
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { hashPassword, verifyPassword } from "../auth/password";
import { newPasswordSchema } from "../auth/password-reset";
import { EmailTakenError } from "../auth/account";
import { SessionService } from "../auth/session";
import { AuditService } from "./audit";

export const DELETION_TOPIC = "account-deletion";

export class WrongPasswordError extends Error {
  constructor() {
    super("Your current password is incorrect.");
  }
}

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email.").max(200);

export class AccountSettingsService {
  private sessions: SessionService;
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.sessions = new SessionService(db);
    this.audit = new AuditService(db);
  }

  private async checkPassword(userId: string, password: string) {
    const cred = await this.db.passwordCredential.findUnique({ where: { userId } });
    if (!cred || !(await verifyPassword(cred.hash, password))) throw new WrongPasswordError();
  }

  /** Returns the updated user; the caller sends the new verification email. */
  async changeEmail(userId: string, newEmailRaw: string, currentPassword: string) {
    const newEmail = emailSchema.parse(newEmailRaw);
    await this.checkPassword(userId, currentPassword);
    const before = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (before.email === newEmail) return before;
    try {
      const user = await this.db.user.update({ where: { id: userId }, data: { email: newEmail, emailVerified: null } });
      await this.db.verificationToken.deleteMany({ where: { identifier: before.email } });
      await this.audit.log({
        actorId: userId,
        action: "account.email.change",
        targetType: "User",
        targetId: userId,
        meta: { from: before.email, to: newEmail },
      });
      return user;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new EmailTakenError("An account with this email already exists.");
      }
      throw e;
    }
  }

  /** Revokes every other session; `keepSessionId` is the one doing the change. */
  async changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionId?: string) {
    const parsed = newPasswordSchema.parse(newPassword);
    await this.checkPassword(userId, currentPassword);
    const hash = await hashPassword(parsed);
    await this.db.passwordCredential.update({ where: { userId }, data: { hash } });
    await this.sessions.destroyAllForUser(userId, keepSessionId);
    await this.audit.log({ actorId: userId, action: "account.password.change", targetType: "User", targetId: userId });
  }

  async signOutOtherDevices(userId: string, keepSessionId: string) {
    await this.sessions.destroyAllForUser(userId, keepSessionId);
    await this.audit.log({ actorId: userId, action: "account.sessions.revoke-others", targetType: "User", targetId: userId });
  }

  /** The open deletion request, if the member already made one. */
  async pendingDeletion(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    return this.db.contactMessage.findFirst({
      where: { topic: DELETION_TOPIC, email: user.email, handled: false },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Record a deletion request for staff. Idempotent while one is open. */
  async requestDeletion(userId: string, note?: string) {
    const existing = await this.pendingDeletion(userId);
    if (existing) return existing;
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } });
    const msg = await this.db.contactMessage.create({
      data: {
        name: user.profile?.displayName ?? user.name ?? user.email,
        email: user.email,
        topic: DELETION_TOPIC,
        message: [
          `Account deletion requested by user ${user.id} (@${user.profile?.username ?? "no-profile"}).`,
          note?.trim() ? `Their note: ${note.trim().slice(0, 1000)}` : "No note given.",
        ].join("\n"),
      },
    });
    await this.audit.log({ actorId: userId, action: "account.delete.request", targetType: "ContactMessage", targetId: msg.id });
    return msg;
  }
}

export const accountSettings = new AccountSettingsService();
