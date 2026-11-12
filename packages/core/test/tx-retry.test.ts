/**
 * The retry for transactions Postgres ends on purpose (src/db/retry.ts). Each
 * test makes Postgres do it for real, through the Prisma client the app uses,
 * so the shapes the helper reads are the ones this stack actually throws.
 */
import { describe, expect, it } from "vitest";
import { prisma, Prisma } from "@tycoonhood/db";
import { isDeadlockOrConflict, sqlStateOf, withDeadlockRetry } from "../src/db/retry";
import { createTestUser } from "./helpers";

/** Resolves for both callers once both have arrived. */
function meetingPoint() {
  let arrived = 0;
  let open!: () => void;
  const opened = new Promise<void>((r) => (open = r));
  return async () => {
    if (++arrived === 2) open();
    await opened;
  };
}

/**
 * Two transactions that each lock one member's row, wait until the other holds
 * its row, then ask for that row: a real deadlock. Postgres ends one of them.
 * Returns what that one threw.
 */
async function deadlock(lock: (tx: Prisma.TransactionClient, userId: string) => Promise<unknown>): Promise<unknown> {
  const [a, b] = [await createTestUser(), await createTestUser()];
  const bothHoldOne = meetingPoint();
  const run = (first: string, second: string) =>
    prisma.$transaction(async (tx) => {
      await lock(tx, first);
      await bothHoldOne();
      await lock(tx, second);
    });
  const results = await Promise.allSettled([run(a.id, b.id), run(b.id, a.id)]);
  const ended = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  expect(ended).toHaveLength(1);
  return ended[0].reason;
}

/** A Repeatable Read transaction that reads a row, which another one then changes, and then writes it. */
async function serializationFailure(write: (tx: Prisma.TransactionClient, userId: string) => Promise<unknown>): Promise<unknown> {
  const user = await createTestUser();
  let readDone!: () => void;
  const read = new Promise<void>((r) => (readDone = r));
  let goOn!: () => void;
  const otherWrote = new Promise<void>((r) => (goOn = r));
  const late = prisma.$transaction(
    async (tx) => {
      await tx.user.findUnique({ where: { id: user.id } });
      readDone();
      await otherWrote;
      await write(tx, user.id);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
  );
  await read;
  await prisma.user.update({ where: { id: user.id }, data: { name: "changed meanwhile" } });
  goOn();
  return late.then(
    () => {
      throw new Error("expected Postgres to end the late transaction");
    },
    (e: unknown) => e
  );
}

const byModel = (tx: Prisma.TransactionClient, userId: string) => tx.user.update({ where: { id: userId }, data: { name: "locked" } });
const byRawQuery = (tx: Prisma.TransactionClient, userId: string) => tx.$executeRaw`UPDATE "User" SET "name" = 'locked' WHERE "id" = ${userId}`;
/** The check the email undo used to make. */
const isP2034 = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";

describe("A deadlock or serialization failure is recognised in every shape this client throws", () => {
  it("a deadlock in a model query: the adapter's own error, with no Prisma code", async () => {
    const e = await deadlock(byModel);
    expect((e as Error).name).toBe("DriverAdapterError");
    expect(isP2034(e)).toBe(false); // what the undo's retry used to look for, so it never ran
    expect(sqlStateOf(e)).toBe("40P01");
    expect(isDeadlockOrConflict(e)).toBe(true);
  });

  it("a deadlock in a raw query: P2010, with the adapter's error in its meta", async () => {
    const e = await deadlock(byRawQuery);
    expect(e).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((e as Prisma.PrismaClientKnownRequestError).code).toBe("P2010");
    expect(sqlStateOf(e)).toBe("40P01");
    expect(isDeadlockOrConflict(e)).toBe(true);
  });

  it("a serialization failure: P2034 from a model query, P2010 from a raw one", async () => {
    const model = await serializationFailure(byModel);
    expect(isP2034(model)).toBe(true);
    expect(isDeadlockOrConflict(model)).toBe(true);
    const raw = await serializationFailure(byRawQuery);
    expect((raw as Prisma.PrismaClientKnownRequestError).code).toBe("P2010");
    expect(sqlStateOf(raw)).toBe("40001");
    expect(isDeadlockOrConflict(raw)).toBe(true);
  });

  it("anything else is not: a unique violation, a plain error, nothing at all", async () => {
    const user = await createTestUser();
    const unique = await createTestUser().then((other) =>
      prisma.user.update({ where: { id: other.id }, data: { email: user.email } }).catch((e: unknown) => e)
    );
    expect((unique as Prisma.PrismaClientKnownRequestError).code).toBe("P2002");
    expect(isDeadlockOrConflict(unique)).toBe(false);
    expect(isDeadlockOrConflict(new Error("deadlock detected"))).toBe(false);
    expect(isDeadlockOrConflict(undefined)).toBe(false);
  });
});

describe("withDeadlockRetry", () => {
  it("runs the work again after a real deadlock, and returns what the next try returns", async () => {
    const ended = await deadlock(byModel);
    let tries = 0;
    const result = await withDeadlockRetry(async () => {
      if (++tries === 1) throw ended;
      return "done";
    });
    expect(result).toBe("done");
    expect(tries).toBe(2);
  });

  it("gives up after three tries, and never retries any other error", async () => {
    const ended = await deadlock(byRawQuery);
    let tries = 0;
    await expect(
      withDeadlockRetry(async () => {
        tries++;
        throw ended;
      })
    ).rejects.toBe(ended);
    expect(tries).toBe(3);

    tries = 0;
    const other = new Error("not a deadlock");
    await expect(
      withDeadlockRetry(async () => {
        tries++;
        throw other;
      })
    ).rejects.toBe(other);
    expect(tries).toBe(1);
  });
});
