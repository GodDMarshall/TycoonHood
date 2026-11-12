/**
 * OVERLAPPING DEPLOYS (review finding 19).
 *
 * Two production builds can run at once (a redeploy while one is still
 * building, or two merges close together). Before the locks, both applied the
 * same migrations at the same time, and both seeds could look for the system
 * ledger accounts, find none, and create one each.
 *
 * Now packages/db/scripts/migrate-sql.ts holds Postgres's advisory lock for
 * migrations (Prisma's own key, so `prisma migrate deploy` waits for it too)
 * for its whole run, and scripts/with-db-lock.mjs holds a deploy lock while
 * the build migrates and seeds. A second run waits, then finds the work done.
 *
 * seed.ts also makes the system accounts and genesis in one transaction under
 * a lock of its own, so two seeds run by hand, outside the deploy lock, take
 * turns there too: the ledger treats each system account type as a singleton.
 *
 * To prove the waiting really happens, each test takes the lock itself first,
 * starts two runs, sees both waiting, and only then lets them go.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@tycoonhood/db";
import {
  createThrowawayDb, migrate, mustRun, start, startDbScript, scriptEnv,
  TSX, DB_PACKAGE, REPO_ROOT, type Throwaway,
} from "./throwaway-db";

const SLOW = 120_000;
/** Prisma Migrate's advisory lock key. migrate-sql.ts takes the same one. */
const MIGRATION_LOCK = 72707369n;
/** scripts/with-db-lock.mjs's key, "tyco" in ASCII. */
const DEPLOY_LOCK = 0x7479636fn;
/** seed.ts's key for the system accounts and genesis, "tylg" in ASCII. */
const LEDGER_SEED_LOCK = 0x74796c67n;
const SYSTEM_TYPES = ["SYSTEM_MINT", "TREASURY", "REWARDS_POOL", "MINING_POOL", "REVENUE"] as const;
const WRAPPER = resolve(REPO_ROOT, "scripts/with-db-lock.mjs");
const MIGRATIONS = readdirSync(resolve(DB_PACKAGE, "prisma/migrations"), { withFileTypes: true }).filter((d) => d.isDirectory()).length;

type Run = ReturnType<typeof start>;

/** Waits until every run has printed `pattern`, or every run has ended (so a run that never waits cannot hang the test). */
async function untilAll(runs: Run[], pattern: RegExp, ms = 30_000) {
  const ended = runs.map(() => false);
  runs.forEach((r, i) => void r.done.then(() => (ended[i] = true)));
  const stop = Date.now() + ms;
  while (!runs.every((r, i) => pattern.test(r.output()) || ended[i])) {
    if (Date.now() > stop) throw new Error(`Timed out waiting for ${pattern}:\n${runs.map((r) => r.output()).join("\n────\n")}`);
    await new Promise((res) => setTimeout(res, 50));
  }
}

/** Holds `key` from this test while `body` runs; it is released when body returns. */
async function holding<T>(db: PrismaClient, key: bigint, body: () => Promise<T>): Promise<T> {
  let out!: T;
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key}::bigint)`;
      out = await body();
    },
    { timeout: SLOW, maxWait: 10_000 }
  );
  return out;
}

/**
 * How many sessions are queued for `key` on this database, once `n` are or every
 * run has ended (a run that never waits cannot hang the test).
 */
async function queuedFor(db: PrismaClient, key: bigint, n: number, runs: Run[], ms = 30_000) {
  const ended = runs.map(() => false);
  runs.forEach((r, i) => void r.done.then(() => (ended[i] = true)));
  const stop = Date.now() + ms;
  for (;;) {
    const [row] = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_locks
      WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1
        AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
        AND ((classid::bigint << 32) | objid::bigint) = ${key}::bigint`;
    if (row.n >= n || ended.every(Boolean)) return row.n;
    if (Date.now() > stop) throw new Error(`Timed out with ${row.n} of ${n} queued:\n${runs.map((r) => r.output()).join("\n────\n")}`);
    await new Promise((res) => setTimeout(res, 50));
  }
}

/** True when nothing holds `key` right now. */
async function isFree(db: PrismaClient, key: bigint) {
  return db.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ ok: boolean }[]>`SELECT pg_try_advisory_xact_lock(${key}::bigint) AS ok`;
    return row.ok;
  });
}

const wrapped = (t: Throwaway, args: string[], env: NodeJS.ProcessEnv = scriptEnv(t.url)) =>
  start(process.execPath, [WRAPPER, ...args], { cwd: DB_PACKAGE, env });

/** How many tables the database has: none until something migrates it. */
async function tables(db: PrismaClient) {
  const [row] = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`;
  return row.n;
}

/** The same database's address written another way, as a pooled and a direct address differ. */
const spelledAgain = (url: string, tag: string) => `${url}${url.includes("?") ? "&" : "?"}application_name=${tag}`;

describe("overlapping deploys wait for each other", () => {
  let t: Throwaway;
  beforeEach(async () => {
    t = await createThrowawayDb("lock");
  });
  afterEach(async () => {
    await t?.drop();
  });

  it("two migration runs on an empty database both succeed and apply each migration once", async () => {
    const runs = await holding(t.db, MIGRATION_LOCK, async () => {
      const rs = [startDbScript("scripts/migrate-sql.ts", t.url), startDbScript("scripts/migrate-sql.ts", t.url)];
      await untilAll(rs, /Waiting/);
      return rs;
    });
    const results = await Promise.all(runs.map((r) => r.done));
    expect(results.map((r) => r.code), results.map((r) => r.output).join("\n────\n")).toEqual([0, 0]);

    const rows = await t.db.$queryRaw<{ migration_name: string; n: number }[]>`
      SELECT migration_name, count(*)::int AS n FROM "_prisma_migrations" GROUP BY migration_name`;
    expect(rows).toHaveLength(MIGRATIONS);
    expect(rows.filter((r) => r.n !== 1)).toEqual([]);
  }, SLOW);

  it("two builds that migrate and seed at once both succeed and leave one admin and one of each system account", async () => {
    const node = `"${process.execPath}" "${TSX}"`;
    const migrateAndSeed = ["bash", "-c", `${node} scripts/migrate-sql.ts && ${node} src/seed.ts`];
    const runs = await holding(t.db, DEPLOY_LOCK, async () => {
      const rs = [wrapped(t, migrateAndSeed), wrapped(t, migrateAndSeed)];
      await untilAll(rs, /Waiting/);
      return rs;
    });
    const results = await Promise.all(runs.map((r) => r.done));
    expect(results.map((r) => r.code), results.map((r) => r.output).join("\n────\n")).toEqual([0, 0]);

    expect(await t.db.user.count({ where: { role: "ADMIN" } })).toBe(1);
    for (const type of SYSTEM_TYPES) {
      expect(await t.db.ledgerAccount.count({ where: { type } }), type).toBe(1);
    }
    expect(await t.db.ledgerTransaction.count({ where: { reason: "GENESIS_MINT" } })).toBe(1);
  }, SLOW);

  it("two seeds run by hand at once, outside the deploy lock, take turns over the system accounts and genesis", async () => {
    await migrate(t);
    await mustRun("src/seed.ts", t.url);
    // What two first seeds meet in the ledger: no system accounts yet. Everything
    // else the seed makes is already there, so only the ledger is contested.
    await t.db.$executeRaw`DELETE FROM "LedgerEntry"`;
    await t.db.$executeRaw`DELETE FROM "LedgerTransaction"`;
    await t.db.$executeRaw`DELETE FROM "LedgerAccount"`;

    const { runs, queued } = await holding(t.db, LEDGER_SEED_LOCK, async () => {
      const rs = [startDbScript("src/seed.ts", t.url), startDbScript("src/seed.ts", t.url)];
      return { runs: rs, queued: await queuedFor(t.db, LEDGER_SEED_LOCK, 2, rs) };
    });
    const results = await Promise.all(runs.map((r) => r.done));
    const output = results.map((r) => r.output).join("\n────\n");
    expect(queued, output).toBe(2);
    expect(results.map((r) => r.code), output).toEqual([0, 0]);

    for (const type of SYSTEM_TYPES) {
      expect(await t.db.ledgerAccount.count({ where: { type } }), type).toBe(1);
    }
    const posted = await t.db.ledgerTransaction.findMany({ select: { idempotencyKey: true }, orderBy: { idempotencyKey: "asc" } });
    expect(posted.map((p) => p.idempotencyKey)).toEqual(["GENESIS", "MINING_POOL_FUNDING_EPOCH_1", "POOL_FUNDING_INITIAL"]);
  }, SLOW);

  it("a failed run fails with its own exit code and leaves both locks free", async () => {
    const failed = await wrapped(t, ["bash", "-c", "exit 7"]).done;
    expect(failed.code).toBe(7);
    expect(await isFree(t.db, DEPLOY_LOCK)).toBe(true);

    await migrate(t);
    // An applied migration edited afterwards: migrate-sql refuses to go on.
    await t.db.$executeRaw`UPDATE "_prisma_migrations" SET checksum = 'edited' WHERE migration_name = (SELECT min(migration_name) FROM "_prisma_migrations")`;
    const drift = await startDbScript("scripts/migrate-sql.ts", t.url).done;
    expect(drift.code).toBe(1);
    expect(drift.output).toMatch(/CHECKSUM MISMATCH/);
    expect(await isFree(t.db, MIGRATION_LOCK)).toBe(true);
  }, SLOW);

  it("takes the lock over the direct connection, and refuses Neon's pooled one", async () => {
    // A lock taken through the pooler belongs to whichever server connection
    // ran the query, so it could outlive the build and stall the next one.
    const pooled = "postgresql://u:p@ep-quiet-lake-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const refusedWrap = await wrapped(t, ["true"], scriptEnv(pooled)).done;
    expect(refusedWrap.code).toBe(1);
    expect(refusedWrap.output).toMatch(/DATABASE_URL_UNPOOLED/);
    const refusedMigrate = await startDbScript("scripts/migrate-sql.ts", pooled).done;
    expect(refusedMigrate.code).toBe(1);
    expect(refusedMigrate.output).toMatch(/DATABASE_URL_UNPOOLED/);

    // With the direct address of the same database beside it, both use that one, and say so.
    // (Here the "pooled" one is the same local database, spelled another way.)
    const direct = { ...scriptEnv(spelledAgain(t.url, "pooled")), DATABASE_URL_UNPOOLED: t.url };
    const lock = await wrapped(t, ["true"], direct).done;
    expect(lock.code, lock.output).toBe(0);
    expect(lock.output).toMatch(/\(DATABASE_URL_UNPOOLED\)/);
    const applied = await start(process.execPath, [TSX, "scripts/migrate-sql.ts"], { cwd: DB_PACKAGE, env: direct }).done;
    expect(applied.code, applied.output).toBe(0);
    expect(applied.output).toMatch(/\(DATABASE_URL_UNPOOLED\)/);
    expect(await t.db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "_prisma_migrations"`).toEqual([{ n: MIGRATIONS }]);
  }, SLOW);
});

describe("one database for everything a deploy runs", () => {
  let t: Throwaway;
  let other: Throwaway;
  beforeEach(async () => {
    t = await createThrowawayDb("target");
    other = await createThrowawayDb("other");
  });
  afterEach(async () => {
    await t?.drop();
    await other?.drop();
  });

  it("is refused when DATABASE_URL and DATABASE_URL_UNPOOLED name different databases, and neither is touched", async () => {
    // As with `DATABASE_URL=<local> pnpm db:migrate:sql` and a .env holding Neon's DATABASE_URL_UNPOOLED:
    // the migrations and the lock would go to one database, the seeds to the other.
    const split = { ...scriptEnv(t.url), DATABASE_URL_UNPOOLED: other.url };
    const runs = {
      "migrate-sql": await start(process.execPath, [TSX, "scripts/migrate-sql.ts"], { cwd: DB_PACKAGE, env: split }).done,
      "with-db-lock": await wrapped(t, ["true"], split).done,
      "deploy-db": await start(process.execPath, ["scripts/deploy-db.mjs"], { cwd: REPO_ROOT, env: split }).done,
    };
    for (const [name, r] of Object.entries(runs)) {
      expect(r.code, `${name}\n${r.output}`).toBe(1);
      expect(r.output, name).toMatch(/DATABASE_URL and DATABASE_URL_UNPOOLED name different databases/);
    }
    for (const db of [t.db, other.db]) expect(await tables(db)).toBe(0);
  }, SLOW);

  it("stops the Vercel build too, before it touches either database", async () => {
    // The build no longer copies DATABASE_URL_UNPOOLED over DATABASE_URL, which hid the mismatch.
    // Nothing listens at this address, and its database has another name.
    const elsewhere = "postgresql://tycoon:nothing@127.0.0.1:9/tycoonhood_elsewhere_test";
    const r = await start("bash", ["scripts/vercel-build.sh"], {
      cwd: REPO_ROOT,
      env: { ...scriptEnv(t.url), DATABASE_URL_UNPOOLED: elsewhere, VERCEL_ENV: "production" },
    }).done;
    expect(r.code, r.output).toBe(1);
    expect(r.output).toMatch(/DATABASE_URL and DATABASE_URL_UNPOOLED name different databases/);
    expect(r.output).not.toMatch(/Cannot reach the database|Building the site/);
    expect(await tables(t.db)).toBe(0);
  }, SLOW);

  it("hands the commands it runs the address it locked, so the seeds use that database too", async () => {
    const direct = spelledAgain(t.url, "direct");
    const env = { ...scriptEnv(t.url), DATABASE_URL_UNPOOLED: direct };
    const seen = "console.log(['seen', process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED].join(' '))";
    const r = await wrapped(t, [process.execPath, "-e", seen], env).done;
    expect(r.code, r.output).toBe(0);
    expect(r.output).toContain(`seen ${direct} ${direct}`);
  }, SLOW);

  it("deploy:db names the database it will migrate, and the variable it came from, before it connects", async () => {
    const unreachable = "postgresql://tycoon:nothing@127.0.0.1:9/tycoonhood_never_test";
    const env = { ...scriptEnv(unreachable), DATABASE_URL_UNPOOLED: spelledAgain(unreachable, "direct") };
    const r = await start(process.execPath, ["scripts/deploy-db.mjs"], { cwd: REPO_ROOT, env }).done;
    expect(r.code, r.output).toBe(1);
    expect(r.output).toMatch(/target\s*: \S*application_name=direct \(DATABASE_URL_UNPOOLED\)/);
    expect(r.output.indexOf("target")).toBeLessThan(r.output.indexOf("Cannot reach the database"));
  }, SLOW);
});
