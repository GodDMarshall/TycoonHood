import { prisma, type PrismaClient } from "@tycoonhood/db";
import { randomUUID } from "node:crypto";
import { UNCONFIRMED_CHANGE_WAIT_MS } from "../src/platform/email-verification";

/** Each test creates its own throwaway member — tests never share state. */
export async function createTestUser() {
  const id = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `test-${id}@tycoonhood.test`,
      name: `Test ${id}`,
      profile: {
        create: { username: `test_${id}`, displayName: `Test ${id}` },
      },
    },
  });
}

export const uid = () => randomUUID();

/**
 * As if the member's waiting email change was asked for a day ago (and a
 * minute, as the link works from a whole minute). A change away from an
 * address never confirmed can be confirmed only from then
 * (UNCONFIRMED_CHANGE_WAIT_MS), so a test about something else that starts
 * from such a member moves its request back first. `db` is the database the
 * member is in: a throwaway one has a client of its own.
 */
export async function askedADayAgo(userId: string, db: PrismaClient = prisma) {
  await db.user.update({
    where: { id: userId },
    data: { pendingEmailAt: new Date(Date.now() - UNCONFIRMED_CHANGE_WAIT_MS - 60_000) },
  });
}
