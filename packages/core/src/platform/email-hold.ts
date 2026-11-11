/**
 * EMAIL HOLDS (OQ-P, option 1). When an email change takes effect, the
 * address it replaced is held for the account for 7 days, and the notice to
 * that address carries a link that undoes the change (platform/email-undo).
 *
 *  · While an address is held, no one can register with it and no other
 *    account can ask for it or move to it. Each refusal uses the words a
 *    taken address gets, so a hold says no more than an account would.
 *  · One undo link per change: single use, valid as long as the hold. A
 *    later change ends every earlier link, so only the latest change can be
 *    undone; the earlier hold itself stays until it runs out.
 *  · A hold ends early when its undo is used (the address is back on the
 *    account) or the member moves back to the address with a normal change.
 *
 * Races. A change releases the old address and holds it in one
 * transaction, so the address is never free in between. The readers check
 * in an order that makes that enough under Read Committed: registration
 * inserts the account first and then looks for a hold (the insert waits for
 * a change of that address still in flight), and a confirmation looks for
 * an account with the address first and then for a hold. A confirmation and
 * an undo of the same account both take lockEmailOf first, so they never
 * interleave.
 */
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@tycoonhood/db";

export const EMAIL_HOLD_MS = 7 * 24 * 60 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** The link that undoes an email change. The raw token only ever travels by mail. */
export interface IssuedUndo {
  rawToken: string;
  expires: Date;
}

/** The account an address is held for right now, or null. */
export async function addressHeldFor(db: Prisma.TransactionClient, address: string): Promise<string | null> {
  const hold = await db.emailHold.findFirst({
    where: { address, expires: { gt: new Date() } },
    select: { userId: true },
  });
  return hold?.userId ?? null;
}

/**
 * Take the lock on one account's address for the rest of `tx`. A
 * confirmation and an undo take it first, so one of them waits for the
 * other to commit and then sees what it did.
 */
export async function lockEmailOf(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`account-email:${userId}`}))`;
}

/**
 * Inside the transaction that moved an account from `address` to
 * `changedTo`: hold `address` for it, with a new undo link. Also end what
 * the change makes moot: every earlier undo link of the account, its hold
 * on `changedTo` (the member moved back to it), and its holds that have run
 * out.
 */
export async function holdReplacedAddress(
  tx: Prisma.TransactionClient,
  change: { userId: string; address: string; changedTo: string }
): Promise<IssuedUndo> {
  const { userId, address, changedTo } = change;
  const rawToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + EMAIL_HOLD_MS);
  await tx.emailHold.deleteMany({ where: { userId, OR: [{ address: changedTo }, { expires: { lte: new Date() } }] } });
  await tx.emailHold.updateMany({ where: { userId, undoToken: { not: null } }, data: { undoToken: null } });
  const hold = { userId, changedTo, undoToken: sha256(rawToken), expires };
  // A row another account left for this address, after its hold ran out, is replaced.
  await tx.emailHold.upsert({
    where: { address },
    create: { address, ...hold },
    update: { ...hold, createdAt: new Date() },
  });
  return { rawToken, expires };
}
