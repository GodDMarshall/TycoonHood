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
 * EMAIL CHANGE. A new address is confirmed before the account uses it. The
 * address the member asks for waits in User.pendingEmail, and its link is a
 * token with identifier `emailchange:<userId>` (one at a time: a new request
 * or a resend replaces it). Until the link is used, the current address still
 * signs in and still gets reset links. Using it moves the account in one
 * transaction (see confirmEmailChange). Resending it shares the limit above.
 * The address the change replaced is then held for the account for 7 days,
 * and the notice to it carries a link that undoes the change (see
 * platform/email-hold and platform/email-undo).
 *
 * Verification never gates learning. Other modules read User.emailVerified
 * where it matters (the affiliate programme requires it).
 */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, User, VerificationToken } from "@tycoonhood/db";
import { withDeadlockRetry } from "../db/retry";
import { AuditService } from "./audit";
import { addressHeldFor, holdReplacedAddress, lockEmailOf, type IssuedUndo } from "./email-hold";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const VERIFY_RESEND_LIMIT = 3;
export const VERIFY_RESEND_WINDOW_MS = 60 * 60 * 1000;

/** Other tokens that share VerificationToken, under a prefixed identifier. */
export const RESET_TOKEN_PREFIX = "pwreset:";
export const EMAIL_CHANGE_TOKEN_PREFIX = "emailchange:";
export const resetTokenId = (userId: string) => `${RESET_TOKEN_PREFIX}${userId}`;
export const emailChangeTokenId = (userId: string) => `${EMAIL_CHANGE_TOKEN_PREFIX}${userId}`;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export class InvalidVerificationTokenError extends Error {}
/** An email-change link whose change is over: it was cancelled, or its address was taken. A new link cannot help. */
export class EmailChangeEndedError extends InvalidVerificationTokenError {}
/** The address an email change was waiting for now belongs to another account. */
export class EmailChangeTakenError extends EmailChangeEndedError {
  constructor() {
    super("That address now belongs to another account, so we couldn't move yours to it. Your email has not changed.");
  }
}
export class AlreadyVerifiedError extends Error {}
export class NoEmailChangeError extends Error {
  constructor() {
    super("There is no email change waiting.");
  }
}
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

/** A link for an email change, and the two addresses the web app writes to. */
export interface IssuedEmailChange {
  userId: string;
  /** The address the account keeps until the link is used: it still signs in and gets reset links. */
  currentEmail: string;
  /** The address asked for. The link goes here. */
  newEmail: string;
  rawToken: string;
  expires: Date;
}

/** What a used link did. An email change also returns the link that undoes it, for the notice to the old address. */
export type Confirmation =
  | { kind: "verify"; user: User }
  | { kind: "email-change"; user: User; previousEmail: string; undo: IssuedUndo };

/** Why a waiting email change was dropped, as the audit row records it ("taken" is recorded by confirm). */
export type EmailChangeCancelReason = "member" | "staff" | "password-change" | "password-reset";

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

  /** Resends issued in the last hour (both kinds of link), and when the oldest of them ages out. */
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

  // ── email change

  /**
   * A new link for the member's waiting email change, replacing any earlier
   * one. Runs inside the caller's transaction: the request that set
   * pendingEmail, or a resend. Writes no audit row; the caller does.
   */
  async issueEmailChangeIn(
    tx: Prisma.TransactionClient,
    user: { id: string; email: string; pendingEmail: string }
  ): Promise<IssuedEmailChange> {
    const rawToken = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + VERIFY_TTL_MS);
    const identifier = emailChangeTokenId(user.id);
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({ data: { identifier, token: sha256(rawToken), expires } });
    return { userId: user.id, currentEmail: user.email, newEmail: user.pendingEmail, rawToken, expires };
  }

  /**
   * Send the waiting email change's link again. Shares the resend limit with
   * resend(): same lock, same count (`auth.verify.resend`, reason
   * "email-change"). Send the email after this returns.
   */
  async resendEmailChange(userId: string): Promise<IssuedEmailChange> {
    return this.db.$transaction(async (tx) => {
      // The account's lock first, as a change request, its confirmation and its cancellation take it:
      // the address read below is the one waiting when the link is made, and no other request's link
      // is replaced. Without it a resend could mail one address a link that moves the account to another.
      await lockEmailOf(tx, userId);
      await this.claimResend(tx, userId);
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (!user.pendingEmail) throw new NoEmailChangeError();
      const issued = await this.issueEmailChangeIn(tx, { id: user.id, email: user.email, pendingEmail: user.pendingEmail });
      await this.audit.log(
        { actorId: userId, action: "auth.verify.resend", targetType: "User", targetId: userId, meta: { reason: "email-change" } },
        tx
      );
      return issued;
    });
  }

  /**
   * Drop the member's waiting email change, if there is one: the address and
   * its link. Audited with the reason, as done by `actorId` (the member
   * unless staff did it). Inside `tx` when given. Returns the address that
   * was waiting, or null.
   */
  async cancelEmailChange(
    userId: string,
    reason: EmailChangeCancelReason,
    tx?: Prisma.TransactionClient,
    actorId: string = userId
  ): Promise<string | null> {
    const run = async (t: Prisma.TransactionClient) => {
      // The account's lock first (a caller that passes `tx` holds it already; taking it again is free).
      await lockEmailOf(t, userId);
      await t.verificationToken.deleteMany({ where: { identifier: emailChangeTokenId(userId) } });
      const user = await t.user.findUnique({ where: { id: userId }, select: { pendingEmail: true } });
      if (!user?.pendingEmail) return null;
      await t.user.update({ where: { id: userId }, data: { pendingEmail: null } });
      await this.audit.log(
        { actorId, action: "account.email.change.cancel", targetType: "User", targetId: userId, meta: { to: user.pendingEmail, reason } },
        t
      );
      return user.pendingEmail;
    };
    return tx ? run(tx) : this.db.$transaction(run);
  }

  /** Drop a link for an email change that could not be sent, so no usable link means none went out. */
  async revokeEmailChangeLink(issued: { userId: string; rawToken: string }) {
    await this.db.verificationToken.deleteMany({
      where: { identifier: emailChangeTokenId(issued.userId), token: sha256(issued.rawToken) },
    });
  }

  /** Whether a usable link exists for the member's waiting email change (see hasLiveLink). */
  async hasLiveEmailChangeLink(userId: string): Promise<boolean> {
    const live = await this.db.verificationToken.count({
      where: { identifier: emailChangeTokenId(userId), expires: { gt: new Date() } },
    });
    return live > 0;
  }

  // ── using a link

  /**
   * Use a link from an email, of either kind. A confirmation link marks the
   * member's address verified. An email-change link moves the account to the
   * address it was sent to. Single use. `keepSessionId` is the session of the
   * browser using the link: an email change signs out every other session.
   */
  async confirm(rawToken: string, opts: { keepSessionId?: string } = {}): Promise<Confirmation> {
    if (!rawToken || rawToken.length > 200) throw new InvalidVerificationTokenError("That link is not valid.");
    const token = await this.db.verificationToken.findUnique({ where: { token: sha256(rawToken) } });
    // Password-reset tokens share the table under a prefixed identifier.
    if (!token || token.identifier.startsWith(RESET_TOKEN_PREFIX)) {
      throw new InvalidVerificationTokenError("That link is not valid, or it has already been used.");
    }
    const change = token.identifier.startsWith(EMAIL_CHANGE_TOKEN_PREFIX);
    if (token.expires.getTime() <= Date.now()) {
      await this.db.verificationToken.deleteMany({ where: { token: token.token } });
      throw new InvalidVerificationTokenError(
        change
          ? "That link has expired. Ask for a new one in your settings."
          : "That link has expired. Request a fresh one from your account."
      );
    }
    if (change) return this.confirmEmailChange(token, opts.keepSessionId);
    return { kind: "verify", user: await this.verifyAddress(token) };
  }

  /** Use a link and return the member (see confirm). */
  async verify(rawToken: string, opts: { keepSessionId?: string } = {}): Promise<User> {
    return (await this.confirm(rawToken, opts)).user;
  }

  /** A confirmation link: marks the address it was sent to verified. */
  private async verifyAddress(token: VerificationToken): Promise<User> {
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

  /**
   * An email-change link: the change takes effect, all in one transaction.
   *  · The account's address lock comes first, so an undo of its last
   *    change never interleaves with this (see email-hold).
   *  · The link is spent next, so a second (or parallel) use finds nothing.
   *  · The address must still be waiting, still free, and not held for
   *    another account.
   *  · The account moves to it, verified: the click proves the mailbox.
   *  · Every link for the old address, every reset link and the change link
   *    die, and every other session is signed out. `keepSessionId` survives
   *    only if it is this member's.
   *  · The old address is held for the account with a new undo link, and
   *    every earlier undo link dies.
   * If another account took the address meanwhile, or it is held for one,
   * the change is dropped and EmailChangeTakenError says so.
   */
  private async confirmEmailChange(token: VerificationToken, keepSessionId?: string): Promise<Confirmation> {
    const userId = token.identifier.slice(EMAIL_CHANGE_TOKEN_PREFIX.length);
    let wanted = null as string | null;
    try {
      // Should Postgres still end it to break a deadlock, it starts over: the link is unspent again.
      return await withDeadlockRetry(() => this.db.$transaction(async (tx) => {
        await lockEmailOf(tx, userId);
        const spent = await tx.verificationToken.deleteMany({ where: { token: token.token } });
        if (spent.count === 0) throw new InvalidVerificationTokenError("That link is not valid, or it has already been used.");
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user?.pendingEmail) {
          throw new EmailChangeEndedError("That email change was cancelled, so this link no longer works. Your email has not changed.");
        }
        wanted = user.pendingEmail;
        // An account first, then a hold: a change that frees the address holds it in the same commit.
        const holder = await tx.user.findUnique({ where: { email: wanted }, select: { id: true } });
        if (holder && holder.id !== user.id) throw new EmailChangeTakenError();
        const heldFor = await addressHeldFor(tx, wanted);
        if (heldFor && heldFor !== user.id) throw new EmailChangeTakenError();

        const updated = await tx.user.update({
          where: { id: user.id },
          data: { email: wanted, emailVerified: new Date(), pendingEmail: null },
        });
        await tx.verificationToken.deleteMany({
          where: { identifier: { in: [user.email, resetTokenId(user.id), emailChangeTokenId(user.id)] } },
        });
        await tx.session.deleteMany({
          where: { userId: user.id, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
        });
        const undo = await holdReplacedAddress(tx, { userId: user.id, address: user.email, changedTo: wanted });
        await this.audit.log(
          { actorId: user.id, action: "account.email.change", targetType: "User", targetId: user.id, meta: { from: user.email, to: wanted } },
          tx
        );
        return { kind: "email-change" as const, user: updated, previousEmail: user.email, undo };
      }));
    } catch (e) {
      const taken = e instanceof EmailChangeTakenError || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002");
      if (taken && wanted) {
        await this.dropTakenChange(userId, wanted, token.token);
        throw new EmailChangeTakenError();
      }
      // The transaction rolled back, so spend a link whose change is over here.
      if (e instanceof EmailChangeEndedError) await this.db.verificationToken.deleteMany({ where: { token: token.token } });
      throw e;
    }
  }

  /** The waiting address went to another account: it can never be confirmed, so drop it (unless the member already asked for another). */
  private async dropTakenChange(userId: string, address: string, spentToken: string) {
    await this.db.$transaction(async (tx) => {
      await lockEmailOf(tx, userId);
      const cleared = await tx.user.updateMany({ where: { id: userId, pendingEmail: address }, data: { pendingEmail: null } });
      await tx.verificationToken.deleteMany({
        where: cleared.count ? { identifier: emailChangeTokenId(userId) } : { token: spentToken },
      });
      if (cleared.count) {
        await this.audit.log(
          { actorId: userId, action: "account.email.change.cancel", targetType: "User", targetId: userId, meta: { to: address, reason: "taken" } },
          tx
        );
      }
    });
  }

  /** Drop every outstanding verification token for an address (a link that could not be sent). */
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
