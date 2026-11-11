/**
 * PASSWORD RESET (post-launch punch item). Same discipline as sessions
 * (D15): raw tokens live only in the email link; the database stores the
 * SHA-256. Tokens are single-use, expire in 30 minutes, and a successful
 * reset destroys every session the account has — proving email control
 * signs you out everywhere else. It also spends every other reset link and
 * cancels an email change waiting for confirmation, and it is audited.
 *
 * Reset links die when the account is secured another way too: a password
 * change in Settings and a confirmed email change both delete them.
 *
 * Anti-enumeration: requestReset() does the same work and returns the
 * same shape whether or not the email exists. The caller reveals nothing
 * either way.
 */
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { hashPassword } from "./password";
import { SessionService } from "./session";
import { AuditService } from "../platform/audit";
import { EmailVerificationService, RESET_TOKEN_PREFIX, resetTokenId } from "../platform/email-verification";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const RESET_TTL_MS = 30 * 60 * 1000;
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

  /** Issue a reset token. Constant-shape work whether the email exists or not. */
  async requestReset(emailRaw: string): Promise<ResetRequest> {
    const email = emailRaw.trim().toLowerCase();
    // Generate regardless of match so the two paths cost the same.
    const rawToken = randomBytes(32).toString("base64url");
    const hashed = sha256(rawToken);
    const expires = new Date(Date.now() + RESET_TTL_MS);

    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) return { issued: null };

    const identifier = resetTokenId(user.id);
    await this.db.verificationToken.deleteMany({ where: { identifier } });
    await this.db.verificationToken.create({ data: { identifier, token: hashed, expires } });
    return { issued: { userId: user.id, email, rawToken, expires } };
  }

  /**
   * Complete a reset. The new password is validated BEFORE the token is
   * consumed, so a typo never burns the link. Success rewrites the
   * credential and signs the account out everywhere.
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
      // Spend this link first: a second use of it, even a parallel one, finds nothing.
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
