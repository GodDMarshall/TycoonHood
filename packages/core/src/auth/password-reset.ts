/**
 * PASSWORD RESET (post-launch punch item). Same discipline as sessions
 * (D15): raw tokens live only in the email link; the database stores the
 * SHA-256. Tokens are single-use, expire in 30 minutes, and a successful
 * reset destroys every session the account has — proving email control
 * signs you out everywhere else. It also spends every other reset link and
 * cancels an email change waiting for confirmation, and it is audited.
 *
 * Reset links die when the account is secured another way too: a password
 * change in Settings, a confirmed email change and an undone one all delete
 * them. An undo then makes one new link for the restored address, which the
 * web app hands straight to the browser that used the undo link
 * (platform/email-undo).
 *
 * A new request never takes a live link away. Anyone who knows an address
 * can ask for a link to it, so if asking ended the earlier links, a stranger
 * could end the one an undo just handed its owner. A request clears the
 * account's links that ran out instead, and issues nothing while three are
 * alive (RESET_LIVE_LIMIT). It takes the account's lock and reads the
 * account again under it, and issues a link only while the account still
 * has the address asked for: a request that meets an email change or an
 * undo issues nothing for the address that left the account.
 *
 * The web app revokes a link it could not send (revoke), as it does the
 * other kinds of link. So the three live links are ones that went out: sends
 * the provider refused, in an outage or a burst someone provoked, never use
 * them up and leave the owner's own request issuing nothing.
 *
 * A request first puts back an email change to or from the address whose
 * undo notice never went out (platform/email-notice). An owner who was told
 * nothing finds that their address no longer signs in and asks for a reset
 * link: the account is theirs again, and the link goes to them.
 *
 * Anti-enumeration: requestReset() does the same work and returns the
 * same shape whether or not the email exists, and whether or not it issued
 * a link. The caller reveals nothing either way.
 */
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { hashPassword } from "./password";
import { SessionService } from "./session";
import { AuditService } from "../platform/audit";
import { lockEmailOf } from "../platform/email-hold";
import { putBackUnnotified } from "../platform/email-notice";
import { EmailVerificationService, RESET_TOKEN_PREFIX, resetTokenId } from "../platform/email-verification";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const RESET_TTL_MS = 30 * 60 * 1000;
/** The most reset links one account can have alive at once. */
export const RESET_LIVE_LIMIT = 3;
const INVALID = "That reset link is invalid or expired — request a fresh one.";

/** Mirrors registerSchema's password rule — one standard, two doors. */
export const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "Keep it under 200 characters.");

export class InvalidResetTokenError extends Error {}

export interface ResetRequest {
  /** Present only when the email matched — the caller must not reveal which. */
  issued: { userId: string; email: string; rawToken: string; expires: Date } | null;
}

export class PasswordResetService {
  private sessions: SessionService;
  private audit: AuditService;
  private verification: EmailVerificationService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.sessions = new SessionService(db);
    this.audit = new AuditService(db);
    this.verification = new EmailVerificationService(db);
  }

  /**
   * Issue a reset token. Constant-shape work whether the email exists or not,
   * and the same answer when it issues nothing for an account that has it.
   */
  async requestReset(emailRaw: string): Promise<ResetRequest> {
    const email = emailRaw.trim().toLowerCase();
    // Generate regardless of match so the two paths cost the same.
    const rawToken = randomBytes(32).toString("base64url");
    const hashed = sha256(rawToken);
    const expires = new Date(Date.now() + RESET_TTL_MS);

    await putBackUnnotified(this.db, { address: email });
    const found = await this.db.user.findUnique({ where: { email }, select: { id: true } });
    if (!found) return { issued: null };
    const userId = found.id;

    const identifier = resetTokenId(userId);
    const made = await this.db.$transaction(async (tx) => {
      await lockEmailOf(tx, userId);
      // Read again under the lock: an email change or an undo that committed meanwhile took the address away.
      if ((await tx.user.count({ where: { id: userId, email } })) === 0) return false;
      // Links that ran out make room; live ones stay, whoever asks.
      await tx.verificationToken.deleteMany({ where: { identifier, expires: { lt: new Date() } } });
      if ((await tx.verificationToken.count({ where: { identifier } })) >= RESET_LIVE_LIMIT) return false;
      await tx.verificationToken.create({ data: { identifier, token: hashed, expires } });
      return true;
    });
    return { issued: made ? { userId, email, rawToken, expires } : null };
  }

  /** Drop a reset link that could not be sent, so it never counts toward the account's live links. */
  async revoke(issued: { userId: string; rawToken: string }) {
    await this.db.verificationToken.deleteMany({
      where: { identifier: resetTokenId(issued.userId), token: sha256(issued.rawToken) },
    });
  }

  /**
   * Complete a reset. The new password is validated BEFORE the token is
   * consumed, so a typo never burns the link. Success rewrites the
   * credential and signs the account out everywhere. The link names the
   * account, so its lock is taken before the link is spent.
   */
  async resetPassword(rawToken: string, newPassword: string) {
    const parsed = newPasswordSchema.safeParse(newPassword);
    if (!parsed.success) {
      throw new InvalidResetTokenError(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
    }

    const hashed = sha256(rawToken);
    const token = await this.db.verificationToken.findFirst({
      where: { token: hashed, identifier: { startsWith: RESET_TOKEN_PREFIX } },
    });
    if (!token || token.expires < new Date()) {
      throw new InvalidResetTokenError(INVALID);
    }
    const userId = token.identifier.slice(RESET_TOKEN_PREFIX.length);

    const passwordHash = await hashPassword(parsed.data);
    await this.db.$transaction(async (tx) => {
      // The account's lock first, as every flow that changes its password, address or links takes it:
      // an email change or an undo at the same moment runs before or after this one, never halfway.
      await lockEmailOf(tx, userId);
      // Then spend this link: a second use of it, even a parallel one, finds nothing.
      const spent = await tx.verificationToken.deleteMany({ where: { token: token.token } });
      if (spent.count === 0) throw new InvalidResetTokenError(INVALID);
      await tx.passwordCredential.upsert({
        where: { userId },
        update: { hash: passwordHash },
        create: { userId, hash: passwordHash },
      });
      // Every other reset link, and any email change waiting for confirmation, die with the old password.
      await tx.verificationToken.deleteMany({ where: { identifier: token.identifier } });
      await this.verification.cancelEmailChange(userId, "password-reset", tx);
      await this.audit.log({ actorId: userId, action: "account.password.reset", targetType: "User", targetId: userId }, tx);
    });
    await this.sessions.destroyAllForUser(userId);

    return this.db.user.findUniqueOrThrow({ where: { id: userId } });
  }
}

export const passwordReset = new PasswordResetService();
