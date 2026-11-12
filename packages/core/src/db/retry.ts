/**
 * RUNNING A TRANSACTION AGAIN WHEN POSTGRES ENDED IT ON PURPOSE
 *
 * Postgres ends a transaction to break a deadlock (SQLSTATE 40P01), and,
 * under Repeatable Read or Serializable, when it cannot serialize it
 * (40001). Nothing the transaction did is kept, so running it again from
 * the start is safe, and it normally succeeds: the other transaction holds
 * the locks and finishes first.
 *
 * This client (engine-free, with @prisma/adapter-pg) reports these in three
 * shapes, and only one of them carries a Prisma code that names the problem:
 *  · a model query that deadlocks throws the adapter's DriverAdapterError,
 *    with the SQLSTATE in cause.originalCode and no Prisma code at all;
 *  · a raw query ($executeRaw, $queryRaw) throws P2010, with that same
 *    adapter error in meta.driverAdapterError (the older Rust engine put the
 *    SQLSTATE in meta.code, which is read too);
 *  · a model query that cannot be serialized throws P2034.
 * A check for P2034 alone therefore never sees a deadlock.
 * test/tx-retry.test.ts forces real ones to pin the shapes.
 *
 * Account flows do not deadlock with each other: each takes the account's
 * lock first (platform/email-hold, lockEmailOf). This retry is the defence
 * in depth for anything that still meets them head on.
 */
import { Prisma } from "@tycoonhood/db";

/** Deadlock detected, and could not serialize access. */
const RETRYABLE = new Set(["40P01", "40001"]);

/** The SQLSTATE a DriverAdapterError carries, or undefined for anything else. */
function adapterCode(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || (e as { name?: unknown }).name !== "DriverAdapterError") return undefined;
  const code = (e as { cause?: { originalCode?: unknown } }).cause?.originalCode;
  return typeof code === "string" ? code : undefined;
}

/** The SQLSTATE an error from the database carries, in whichever shape it came; undefined when it carries none. */
export function sqlStateOf(e: unknown): string | undefined {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = (e.meta ?? {}) as { code?: unknown; driverAdapterError?: unknown };
    return adapterCode(meta.driverAdapterError) ?? (typeof meta.code === "string" ? meta.code : undefined);
  }
  return adapterCode(e);
}

/** True when Postgres ended the transaction to break a deadlock, or because it could not serialize it. */
export function isDeadlockOrConflict(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") return true;
  const code = sqlStateOf(e);
  return code !== undefined && RETRYABLE.has(code);
}

/**
 * Run `work`, one whole transaction, again when Postgres ended it to break a
 * deadlock or a serialization conflict: `attempts` tries in all. Any other
 * error, and the last try's, is thrown as it came.
 */
export async function withDeadlockRetry<T>(work: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (e) {
      if (!isDeadlockOrConflict(e) || attempt >= attempts) throw e;
    }
  }
}
