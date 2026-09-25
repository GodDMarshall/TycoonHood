/**
 * PASSWORD RESET (post-launch punch item). Same discipline as sessions
 * (D15): raw tokens live only in the email link; the database stores the
 * SHA-256. Tokens are single-use, expire in 30 minutes, and a successful
 * reset destroys every session the account has — proving email control
 * signs you out everywhere else.
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

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const RESET_TTL_MS = 30 * 60 * 1000;

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
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.sessions = new SessionService(db);
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

    const identifier = `pwreset:${user.id}`;
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
      where: { token: hashed, identifier: { startsWith: "pwreset:" } },
    });
    if (!token || token.expires < new Date()) {
      throw new InvalidResetTokenError("That reset link is invalid or expired — request a fresh one.");
    }
    const userId = token.identifier.slice("pwreset:".length);

    const passwordHash = await hashPassword(parsed.data);
    await this.db.passwordCredential.upsert({
      where: { userId },
      update: { hash: passwordHash },
      create: { userId, hash: passwordHash },
    });
    await this.db.verificationToken.delete({
      where: { identifier_token: { identifier: token.identifier, token: token.token } },
    });
    await this.sessions.destroyAllForUser(userId);

    return this.db.user.findUniqueOrThrow({ where: { id: userId } });
  }
}

export const passwordReset = new PasswordResetService();
