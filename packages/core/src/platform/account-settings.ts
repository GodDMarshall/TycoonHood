/**
 * ACCOUNT SETTINGS — the member's own security-sensitive changes.
 *
 *  · change email: needs the current password, and waits for the new
 *    address to be confirmed. The address asked for is kept in
 *    User.pendingEmail, with when it was asked for, and gets a link; the
 *    current address gets a notice and stays the sign-in and reset address
 *    until the link is used (see EmailVerificationService.confirm, which
 *    makes the switch). If the current address was never confirmed, the
 *    link works only a day after the request (UNCONFIRMED_CHANGE_WAIT_MS):
 *    nothing could undo the change, so its owner gets that day to stop it.
 *  · change password: needs the current password; every OTHER session is
 *    signed out, the one making the change stays. Reset links and a waiting
 *    email change die with the old password, even a change asked for at the
 *    same moment: changeEmail checks the password again under a lock on the
 *    credential row, so the two run one after the other. changePassword
 *    checks it again the same way, so it cannot land after an undone email
 *    change (platform/email-undo) replaced the password it checked.
 *  · both take the account's lock first (lockEmailOf, platform/email-hold),
 *    as every flow that changes the account's password, address or links
 *    does, so they never deadlock with a confirmation, an undo or a reset.
 *  · an address held for another account (platform/email-hold) is refused
 *    like a taken one; one held for this account is the member moving back.
 *  · no new change while the last one can still be undone (7 days, or
 *    until its undo is used): see EmailChangeTooSoonError. A last change
 *    whose undo notice never went out is put back first (platform/
 *    email-notice), so it neither blocks the request nor loses its way back.
 *  · delete account: a request for staff, recorded as a ContactMessage
 *    that names the account (userId), so it stays the account's whatever
 *    its address becomes. An undo closes one filed since the change it
 *    reverts (platform/email-undo). Accounts are never hard-deleted from
 *    here — ledger rows reference the user with ON DELETE RESTRICT, and the
 *    books must still balance.
 */
import { z } from "zod";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { Prisma, PrismaClient } from "@tycoonhood/db";
import { hashPassword, verifyPassword } from "../auth/password";
import { newPasswordSchema } from "../auth/password-reset";
import { EmailTakenError } from "../auth/account";
import { SessionService } from "../auth/session";
import { AuditService } from "./audit";
import { EmailVerificationService, resetTokenId, type IssuedEmailChange } from "./email-verification";
import { addressHeldFor, EmailChangeTooSoonError, lockEmailOf, undoableUntil } from "./email-hold";
import { putBackUnnotified } from "./email-notice";
import { sliceWhole } from "../text/clip";

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
  private verification: EmailVerificationService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.sessions = new SessionService(db);
    this.audit = new AuditService(db);
    this.verification = new EmailVerificationService(db);
  }

  /** Returns the hash the password matched, so a later transaction can tell whether it has changed since. */
  private async checkPassword(userId: string, password: string): Promise<string> {
    const cred = await this.db.passwordCredential.findUnique({ where: { userId } });
    if (!cred || !(await verifyPassword(cred.hash, password))) throw new WrongPasswordError();
    return cred.hash;
  }

  /**
   * Inside `tx`: lock the member's credential row, and refuse unless its hash
   * is still the one checkPassword matched. changePassword, resetPassword
   * and an undone email change all write that row, so whichever comes
   * second waits for the first and then sees what it did.
   */
  private async passwordUnchanged(tx: Prisma.TransactionClient, userId: string, checkedHash: string) {
    const [cred] = await tx.$queryRaw<{ hash: string }[]>`
      SELECT "hash" FROM "PasswordCredential" WHERE "userId" = ${userId} FOR UPDATE`;
    if (cred?.hash !== checkedHash) throw new WrongPasswordError();
  }

  /**
   * Ask to move the account to another address. Nothing changes yet: the
   * address waits in pendingEmail with a new link (replacing any earlier
   * request), and the caller emails the link to the new address and a notice
   * to the current one. Null when it already is the member's address.
   */
  async changeEmail(userId: string, newEmailRaw: string, currentPassword: string): Promise<IssuedEmailChange | null> {
    const newEmail = emailSchema.parse(newEmailRaw);
    const checkedHash = await this.checkPassword(userId, currentPassword);
    // A last change whose undo notice never went out is put back before anything is read. Left in
    // place it would refuse this request as too soon, and this change would end its undo link.
    await putBackUnnotified(this.db, { userId });
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email === newEmail) return null;
    // Addresses are stored lower-cased (registerSchema, emailSchema), so this is the unique email check.
    const taken = await this.db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    // An address held for another account is refused in the same words; the confirmation checks again.
    const heldFor = taken ? null : await addressHeldFor(this.db, newEmail);
    if (taken || (heldFor && heldFor !== userId)) throw new EmailTakenError("An account with this email already exists.");
    return this.db.$transaction(async (tx) => {
      // The account's address lock first, as a confirmation and an undo take
      // it: a change that takes effect meanwhile is seen by the check below.
      await lockEmailOf(tx, userId);
      // A new password cancels a waiting change, so this request must not
      // land behind one set since the check above. Lock the credential row,
      // which changePassword and resetPassword also lock when they write it,
      // and refuse if the hash moved. So either the new password lands first
      // and this request is refused, or this lands first and the new password
      // then cancels it.
      await this.passwordUnchanged(tx, userId, checkedHash);
      // Not while the last change can still be undone: a second change would end its link.
      const until = await undoableUntil(tx, userId);
      if (until) throw new EmailChangeTooSoonError(until);
      // A new request starts its own wait, if it has one: its notice tells the owner of the address anew.
      const askedAt = new Date();
      await tx.user.update({ where: { id: userId }, data: { pendingEmail: newEmail, pendingEmailAt: askedAt } });
      const issued = await this.verification.issueEmailChangeIn(tx, {
        id: userId,
        email: user.email,
        emailVerified: user.emailVerified,
        pendingEmail: newEmail,
        pendingEmailAt: askedAt,
      });
      await this.audit.log(
        {
          actorId: userId,
          action: "account.email.change.request",
          targetType: "User",
          targetId: userId,
          meta: { from: user.email, to: newEmail },
        },
        tx
      );
      return issued;
    });
  }

  /** Drop the email change waiting for confirmation. Returns the address that was waiting, or null. */
  async cancelEmailChange(userId: string): Promise<string | null> {
    return this.verification.cancelEmailChange(userId, "member");
  }

  /**
   * Revokes every other session; `keepSessionId` is the one doing the change.
   * In the same transaction as the new hash, every reset link and any waiting
   * email change die: whoever holds them asked before the account was
   * secured. Refused if the password changed since it was checked (another
   * change, a reset, or an undone email change). Returns the address of a
   * waiting change it cancelled, if any.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionId?: string) {
    const parsed = newPasswordSchema.parse(newPassword);
    const checkedHash = await this.checkPassword(userId, currentPassword);
    const hash = await hashPassword(parsed);
    const cancelledEmailChange = await this.db.$transaction(async (tx) => {
      // The account's lock first, as an email change, its confirmation, an undo and a reset take it.
      await lockEmailOf(tx, userId);
      await this.passwordUnchanged(tx, userId, checkedHash);
      await tx.passwordCredential.update({ where: { userId }, data: { hash } });
      await tx.verificationToken.deleteMany({ where: { identifier: resetTokenId(userId) } });
      const cancelled = await this.verification.cancelEmailChange(userId, "password-change", tx);
      await this.audit.log({ actorId: userId, action: "account.password.change", targetType: "User", targetId: userId }, tx);
      return cancelled;
    });
    await this.sessions.destroyAllForUser(userId, keepSessionId);
    return { cancelledEmailChange };
  }

  async signOutOtherDevices(userId: string, keepSessionId: string) {
    await this.sessions.destroyAllForUser(userId, keepSessionId);
    await this.audit.log({ actorId: userId, action: "account.sessions.revoke-others", targetType: "User", targetId: userId });
  }

  /** The open deletion request, if the member already made one, from whichever address. */
  async pendingDeletion(userId: string) {
    return this.db.contactMessage.findFirst({
      where: { topic: DELETION_TOPIC, userId, handled: false },
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
        userId: user.id,
        topic: DELETION_TOPIC,
        message: [
          `Account deletion requested by user ${user.id} (@${user.profile?.username ?? "no-profile"}).`,
          note?.trim() ? `Their note: ${sliceWhole(note.trim(), 0, 1000)}` : "No note given.",
        ].join("\n"),
      },
    });
    await this.audit.log({ actorId: userId, action: "account.delete.request", targetType: "ContactMessage", targetId: msg.id });
    return msg;
  }
}

export const accountSettings = new AccountSettingsService();
