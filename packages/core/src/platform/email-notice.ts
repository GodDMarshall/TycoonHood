/**
 * THE NOTICE THAT CARRIES AN UNDO LINK (OQ-P, DR-32). A change away from a
 * confirmed address stands only if that address is told, with the link that
 * undoes it. The raw link exists only in the request that confirmed the
 * change, and the change commits before the notice is tried, so the hold
 * records whether the notice went out:
 *
 *  · EmailHold.noticeSentAt is null while the notice is being sent, and is
 *    set once the mail provider accepts it (markNoticeSent).
 *  · A request that could not send it puts the change back at once
 *    (EmailUndoService.revertUnnotified), and tells the member.
 *  · A request that never got that far leaves the hold unmarked: a provider
 *    that stalled until the platform ended the function, a crash or a
 *    deploy, or a revert that failed. Once the change is older than
 *    NOTICE_GRACE_MS, which is longer than any request can run, it is put
 *    back the same way (putBackUnnotified): by the daily cron, and first in
 *    whatever would otherwise trust the hold: a new change request for the
 *    account, a reset request for either address, and the admin page.
 *
 * Putting a change back restores the old address, confirmed, and ends the
 * hold, the reset links, any link for the address taken off and a waiting
 * change. The password stays and no one is signed out, because only the
 * telling failed; the devices the confirmation signed out stay signed out.
 * Audited as `account.email.change.revert` (reason `notice-not-sent`). It
 * never runs once the hold has run out: the old address is free by then,
 * and may be someone else's.
 *
 * A leaf module: account settings and password reset call the sweep, and
 * platform/email-undo imports both of them.
 */
import { createHash } from "node:crypto";
import type { PrismaClient } from "@tycoonhood/db";
import { withDeadlockRetry } from "../db/retry";
import { AuditService } from "./audit";
import { lockEmailOf } from "./email-hold";
import { emailChangeTokenId, resetTokenId } from "./email-verification";

/**
 * How long a change may wait for its notice to be recorded before it counts
 * as never told. Longer than any request runs (Vercel ends a function after
 * 300 s by default, and a send gives up after 10 s), so a request still
 * sending is never overtaken.
 */
export const NOTICE_GRACE_MS = 10 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Record that the mail provider accepted the notice carrying this undo link. */
export async function markNoticeSent(db: PrismaClient, rawUndo: string): Promise<void> {
  await db.emailHold.updateMany({ where: { undoToken: sha256(rawUndo), noticeSentAt: null }, data: { noticeSentAt: new Date() } });
}

/** Where a hold's undo link stands: sent, being sent, never sent (the change is about to be put back), or ended. */
export type UndoLinkState = "sent" | "sending" | "unsent" | "ended";

export function undoLinkState(
  hold: { undoToken: string | null; noticeSentAt: Date | null; createdAt: Date },
  now: Date = new Date()
): UndoLinkState {
  if (!hold.undoToken) return "ended";
  if (hold.noticeSentAt) return "sent";
  return now.getTime() - hold.createdAt.getTime() < NOTICE_GRACE_MS ? "sending" : "unsent";
}

/**
 * Put back the change that made one hold (found by its undo link's hash or
 * its id), under the account's lock. Only while the hold still has its
 * link, its notice is still not recorded as sent, it has not run out, and
 * the account still has the address the change set; with `madeBefore`, only
 * a change at least that old. Returns whether it did.
 */
export async function putBackChange(db: PrismaClient, where: { undoToken: string } | { id: string }, madeBefore?: Date): Promise<boolean> {
  const found = await db.emailHold.findUnique({ where, select: { userId: true } });
  if (!found) return false;
  const audit = new AuditService(db);
  return withDeadlockRetry(() =>
    db.$transaction(async (tx) => {
      await lockEmailOf(tx, found.userId);
      // Read again under the lock: an undo, a later change or another sweep may have ended it.
      const hold = await tx.emailHold.findUnique({ where });
      if (!hold?.undoToken || hold.noticeSentAt || hold.expires.getTime() <= Date.now()) return false;
      if (madeBefore && hold.createdAt > madeBefore) return false;
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
      await audit.log(
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

/**
 * Put back every change older than NOTICE_GRACE_MS whose notice is still not
 * recorded as sent: all of them (the cron), one account's, or those to or
 * from one address. Returns how many it put back.
 */
export async function putBackUnnotified(
  db: PrismaClient,
  scope: { userId?: string; address?: string } = {},
  now: Date = new Date()
): Promise<number> {
  const madeBefore = new Date(now.getTime() - NOTICE_GRACE_MS);
  const holds = await db.emailHold.findMany({
    where: {
      undoToken: { not: null },
      noticeSentAt: null,
      createdAt: { lte: madeBefore },
      expires: { gt: now },
      ...(scope.userId ? { userId: scope.userId } : {}),
      ...(scope.address ? { OR: [{ address: scope.address }, { changedTo: scope.address }] } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true },
  });
  let putBack = 0;
  for (const { id } of holds) if (await putBackChange(db, { id }, madeBefore)) putBack++;
  return putBack;
}
