/**
 * UNDOING AN EMAIL CHANGE (OQ-P, option 1). The notice that tells an old
 * address its account moved carries a link that puts the address back. Using
 * it proves control of that mailbox, which is what the account trusted until
 * the change. Whoever made the change knew the password, so the undo takes
 * that away too. In one transaction:
 *
 *  · the address goes back on the account, verified, and a waiting change is
 *    dropped;
 *  · the password is replaced by one nobody knows, so signing in needs a new
 *    one;
 *  · every session is signed out, and every link the account has dies:
 *    confirmation, email change, reset, and any other undo link;
 *  · a new reset link is made for the restored address. The web app sends
 *    the browser that used the undo link straight to it (it is never
 *    emailed), and tells both addresses what happened.
 *
 * Refused when the link is unknown or spent, has run out (7 days), or the
 * account no longer has the address the change set. A later change ends the
 * earlier links anyway, so only the latest change can be undone, and a
 * second change waits until this one can no longer be undone (see
 * platform/email-hold, which also explains the locks).
 *
 * The raw link exists only in the request that confirmed the change, and
 * only one notice ever carries it. When that notice cannot be sent, the web
 * app puts the change back at once (revertUnnotified), so no change stands
 * that its old address was never told of.
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { hashPassword } from "../auth/password";
import { withDeadlockRetry } from "../db/retry";
import { RESET_TTL_MS } from "../auth/password-reset";
import { AuditService } from "./audit";
import { lockEmailOf } from "./email-hold";
import { emailChangeTokenId, resetTokenId } from "./email-verification";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export class InvalidUndoLinkError extends Error {}
/** An undo link that can never work again: it ran out, or the account's email changed since. */
export class UndoLinkOverError extends InvalidUndoLinkError {}

const NOT_VALID = "That link is not valid, or it has already been used.";

/** What an undo did, for the web app to finish with. */
export interface UndoneEmailChange {
  userId: string;
  /** The address back on the account. It signs in again, and the reset link is for it. */
  restoredEmail: string;
  /** The address the change had set. It no longer signs in. */
  removedEmail: string;
  /** A new reset link for the restored address, for the browser that used the undo link. */
  reset: { rawToken: string; expires: Date };
}

export class EmailUndoService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  /** Use an undo link from the "your email was changed" notice. Single use. */
  async undo(rawToken: string): Promise<UndoneEmailChange> {
    if (!rawToken || rawToken.length > 200) throw new InvalidUndoLinkError(NOT_VALID);
    const undoToken = sha256(rawToken);
    const found = await this.db.emailHold.findUnique({ where: { undoToken }, select: { userId: true } });
    if (!found) throw new InvalidUndoLinkError(NOT_VALID);
    // The password nobody knows. Hashing is slow, so it happens before the transaction.
    const unknownPasswordHash = await hashPassword(randomBytes(32).toString("base64url"));
    try {
      // Should Postgres still end it to break a deadlock, it starts over and reads everything again under its locks.
      return await withDeadlockRetry(() => this.db.$transaction(async (tx) => {
        await lockEmailOf(tx, found.userId);
        // Read again under the lock: a change that took effect meanwhile ended this link.
        const hold = await tx.emailHold.findUnique({ where: { undoToken } });
        if (!hold) throw new InvalidUndoLinkError(NOT_VALID);
        if (hold.expires.getTime() <= Date.now()) throw new UndoLinkOverError("That link has expired.");
        const userId = hold.userId;
        // The credential row next, as a password change and an email-change request lock it
        // and then check the hash: one of them that checked the old password cannot land after this.
        await tx.$executeRaw`SELECT 1 FROM "PasswordCredential" WHERE "userId" = ${userId} FOR UPDATE`;
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
        if (user.email !== hold.changedTo) {
          throw new UndoLinkOverError("The account's email has changed again since, so this link no longer works.");
        }

        // The address is back on the account, so its hold ends with the link.
        await tx.emailHold.delete({ where: { id: hold.id } });
        await tx.user.update({
          where: { id: userId },
          data: { email: hold.address, emailVerified: new Date(), pendingEmail: null },
        });
        await tx.passwordCredential.updateMany({ where: { userId }, data: { hash: unknownPasswordHash } });
        await tx.session.deleteMany({ where: { userId } });
        await tx.verificationToken.deleteMany({
          where: { identifier: { in: [hold.address, hold.changedTo, resetTokenId(userId), emailChangeTokenId(userId)] } },
        });
        await tx.emailHold.updateMany({ where: { userId, undoToken: { not: null } }, data: { undoToken: null } });

        const resetToken = randomBytes(32).toString("base64url");
        const resetExpires = new Date(Date.now() + RESET_TTL_MS);
        await tx.verificationToken.create({
          data: { identifier: resetTokenId(userId), token: sha256(resetToken), expires: resetExpires },
        });
        await this.audit.log(
          { actorId: userId, action: "auth.email.undo", targetType: "User", targetId: userId, meta: { from: hold.changedTo, to: hold.address } },
          tx
        );
        await this.audit.log(
          { actorId: userId, action: "account.password.revoke", targetType: "User", targetId: userId, meta: { reason: "email-undo" } },
          tx
        );
        return {
          userId,
          restoredEmail: hold.address,
          removedEmail: hold.changedTo,
          reset: { rawToken: resetToken, expires: resetExpires },
        };
      }));
    } catch (e) {
      // The transaction rolled back, so spend a link that can never work again here.
      if (e instanceof UndoLinkOverError) await this.db.emailHold.updateMany({ where: { undoToken }, data: { undoToken: null } });
      throw e;
    }
  }

  /**
   * Put the old address back because the notice carrying this undo link
   * could not be sent. The member made the change a moment ago and only the
   * telling failed, so unlike undo() this keeps the password and every
   * session. It ends the hold and the links the change made: reset links,
   * any link for the address taken off, and a waiting change. Audited.
   * Returns false, changing nothing, when the hold is gone or the account
   * has moved again since.
   */
  async revertUnnotified(rawToken: string): Promise<boolean> {
    if (!rawToken || rawToken.length > 200) return false;
    const undoToken = sha256(rawToken);
    const found = await this.db.emailHold.findUnique({ where: { undoToken }, select: { userId: true } });
    if (!found) return false;
    return withDeadlockRetry(() =>
      this.db.$transaction(async (tx) => {
        await lockEmailOf(tx, found.userId);
        // Read again under the lock, as undo() does.
        const hold = await tx.emailHold.findUnique({ where: { undoToken } });
        if (!hold) return false;
        const userId = hold.userId;
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
        if (user.email !== hold.changedTo) return false;

        await tx.emailHold.delete({ where: { id: hold.id } });
        await tx.user.update({
          where: { id: userId },
          data: { email: hold.address, emailVerified: new Date(), pendingEmail: null },
        });
        await tx.verificationToken.deleteMany({
          where: { identifier: { in: [hold.changedTo, resetTokenId(userId), emailChangeTokenId(userId)] } },
        });
        await this.audit.log(
          {
            actorId: userId,
            action: "account.email.change.revert",
            targetType: "User",
            targetId: userId,
            meta: { from: hold.changedTo, to: hold.address, reason: "notice-not-sent" },
          },
          tx
        );
        return true;
      })
    );
  }
}

export const emailUndo = new EmailUndoService();

