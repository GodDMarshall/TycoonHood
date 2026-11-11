/**
 * EMAIL VERIFICATION (spec B, Journey 1: Registration → Verification → Dashboard).
 *
 * Same discipline as sessions and password reset (D15):
 *  · the raw token (32 random bytes) travels only in the email link;
 *    the database stores its SHA-256 in VerificationToken;
 *  · identifier = the member's email, so a token issued for an old address
 *    stops working the moment the email changes;
 *  · 24 hour expiry, single use, and issuing a new token deletes every
 *    earlier one for that address;
 *  · resend is limited to 3 per rolling hour. VerificationToken has no
 *    createdAt column, so the count comes from the audit trail, which records
 *    every issue anyway (`auth.verify.issue` / `auth.verify.resend`). The
 *    count, the new link and its audit row happen in one transaction under a
 *    per-member lock, so parallel requests cannot all pass the check; the
 *    caller sends the email after the commit.
 *
 * Verification never gates learning. Other modules read User.emailVerified
 * where it matters (the affiliate programme requires it).
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { Prisma, PrismaClient, User } from "@tycoonhood/db";
import { AuditService } from "./audit";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const VERIFY_RESEND_LIMIT = 3;
export const VERIFY_RESEND_WINDOW_MS = 60 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export class InvalidVerificationTokenError extends Error {}
export class AlreadyVerifiedError extends Error {}
export class VerificationRateLimitError extends Error {
  constructor(public readonly retryAfterMin: number) {
    super(`You've asked for three emails in the last hour. Try again in about ${retryAfterMin} min.`);
  }
}

export interface IssuedVerification {
  userId: string;
  email: string;
  rawToken: string;
  expires: Date;
}

export class EmailVerificationService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  /**
   * Issue a fresh token for the member's current email, invalidating older
   * ones. The token and its audit row are written together: inside `tx` when
   * the caller passes one, otherwise in a transaction of their own.
   */
  async issue(
    userId: string,
    opts: { reason?: "register" | "resend" | "email-change"; tx?: Prisma.TransactionClient } = {}
  ): Promise<IssuedVerification> {
    const reason = opts.reason ?? "register";
    if (opts.tx) return this.issueIn(opts.tx, userId, reason);
    return this.db.$transaction((tx) => this.issueIn(tx, userId, reason));
  }

  private async issueIn(
    tx: Prisma.TransactionClient,
    userId: string,
    reason: "register" | "resend" | "email-change"
  ): Promise<IssuedVerification> {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerified) throw new AlreadyVerifiedError("This email is already verified.");

    const rawToken = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + VERIFY_TTL_MS);
    const identifier = user.email;
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({ data: { identifier, token: sha256(rawToken), expires } });
    await this.audit.log(
      {
        actorId: userId,
        action: reason === "resend" ? "auth.verify.resend" : "auth.verify.issue",
        targetType: "User",
        targetId: userId,
        meta: { reason },
      },
      tx
    );
    return { userId, email: identifier, rawToken, expires };
  }

  /** Resends issued in the last hour, and when the oldest of them ages out. */
  async resendUsage(userId: string, tx?: Prisma.TransactionClient) {
    const since = new Date(Date.now() - VERIFY_RESEND_WINDOW_MS);
    const rows = await (tx ?? this.db).auditLog.findMany({
      where: { action: "auth.verify.resend", targetType: "User", targetId: userId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const oldest = rows[0]?.createdAt;
    const retryAfterMs = oldest ? oldest.getTime() + VERIFY_RESEND_WINDOW_MS - Date.now() : 0;
    return { used: rows.length, retryAfterMin: Math.max(1, Math.ceil(retryAfterMs / 60_000)) };
  }

  /**
   * Claim one of the member's resends for the rest of `tx`: take their resend
   * lock, then count. Throws at or over the limit. The lock is held until
   * commit, so a parallel resend waits for it and then counts this one's row.
   */
  private async claimResend(tx: Prisma.TransactionClient, userId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`verify-resend:${userId}`}))`;
    const usage = await this.resendUsage(userId, tx);
    if (usage.used >= VERIFY_RESEND_LIMIT) throw new VerificationRateLimitError(usage.retryAfterMin);
  }

  /** A member-initiated resend: rate limited to 3 per rolling hour. Send the email after this returns. */
  async resend(userId: string): Promise<IssuedVerification> {
    return this.db.$transaction(async (tx) => {
      await this.claimResend(tx, userId);
      return this.issueIn(tx, userId, "resend");
    });
  }

  /** Consume a token: marks the email verified. Single use. */
  async verify(rawToken: string): Promise<User> {
    if (!rawToken || rawToken.length > 200) throw new InvalidVerificationTokenError("That link is not valid.");
    const token = await this.db.verificationToken.findUnique({ where: { token: sha256(rawToken) } });
    // Password-reset tokens share the table under a prefixed identifier.
    if (!token || token.identifier.startsWith("pwreset:")) {
      throw new InvalidVerificationTokenError("That link is not valid, or it has already been used.");
    }
    if (token.expires.getTime() <= Date.now()) {
      await this.db.verificationToken.deleteMany({ where: { token: token.token } });
      throw new InvalidVerificationTokenError("That link has expired. Request a fresh one from your account.");
    }
    const user = await this.db.user.findUnique({ where: { email: token.identifier } });
    if (!user) {
      await this.db.verificationToken.deleteMany({ where: { token: token.token } });
      throw new InvalidVerificationTokenError("That link is not valid, or it has already been used.");
    }
    const [, updated] = await this.db.$transaction([
      this.db.verificationToken.deleteMany({ where: { identifier: token.identifier } }),
      this.db.user.update({
        where: { id: user.id },
        data: { emailVerified: user.emailVerified ?? new Date() },
      }),
    ]);
    await this.audit.log({ actorId: user.id, action: "auth.verify.complete", targetType: "User", targetId: user.id });
    return updated;
  }

  /** Drop every outstanding verification token for an address (email change, or a link that could not be sent). */
  async revokeFor(email: string) {
    await this.db.verificationToken.deleteMany({ where: { identifier: email } });
  }

  /**
   * Whether a usable confirmation link exists for this address: issued, not
   * spent, not expired. The web app revokes any link it could not send, so
   * this is also how it knows one went out.
   */
  async hasLiveLink(email: string): Promise<boolean> {
    const live = await this.db.verificationToken.count({ where: { identifier: email, expires: { gt: new Date() } } });
    return live > 0;
  }
}

export const emailVerification = new EmailVerificationService();
