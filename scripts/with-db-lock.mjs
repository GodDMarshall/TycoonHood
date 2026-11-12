#!/usr/bin/env node
/**
 * ONE BUILD AT A TIME ON ONE DATABASE
 *
 *   node scripts/with-db-lock.mjs <command> [args…]
 *
 * Runs the command while this process holds a Postgres advisory lock on the
 * database, on a connection of its own, and exits with the command's exit
 * code.
 *
 * Why (review finding 19): two production builds can run at once, a redeploy
 * while one is still building or two merges close together. Before this lock
 * both migrated and both seeded the same database at the same time: both
 * seeds could look for the ledger's system accounts, find none, and create
 * one each. scripts/vercel-build.sh runs its whole migrate-and-seed step under
 * this lock, so a second build waits for the first, then finds the work done:
 * the migrations applied, and seeds that are safe to run again (DR-33).
 *
 * It is a session lock. It is released when the command ends, whatever its
 * exit code, and Postgres drops it if this process dies. If the connection
 * that holds it is lost, the command is stopped and the build fails, rather
 * than going on unprotected.
 *
 * A session lock needs a direct connection. Taken through a pooler it belongs
 * to whichever server connection ran the query, and can outlive the build and
 * stall the next one. So this uses DATABASE_URL_UNPOOLED when it is set, else
 * DATABASE_URL, and refuses Neon's pooled address.
 * packages/db/scripts/migrate-sql.ts follows the same rules for the migration
 * lock it takes inside this one.
 *
 * Everything under the lock works on the database that was locked. The
 * address is picked by packages/db/scripts/db-target.mjs, which refuses when
 * DATABASE_URL and DATABASE_URL_UNPOOLED name different databases, and the
 * command gets it as DATABASE_URL too: the seeds read only that variable.
 * Before, they could seed one database while the lock and the migrations
 * held another (review finding 19, follow-up).
 */
import { spawn } from "node:child_process";
import { constants } from "node:os";
import pg from "pg";
import { databaseTarget, isPooled, where } from "../packages/db/scripts/db-target.mjs";

/** "tyco" in ASCII. Any fixed number would do but Prisma Migrate's 72707369, which migrate-sql takes inside this lock. */
const DEPLOY_LOCK = 0x7479636f;
/** How long a build waits for another before giving up, so a stuck one fails the deploy instead of hanging it. */
const WAIT_MINUTES = 15;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error("Usage: node scripts/with-db-lock.mjs <command> [args…]");
  process.exit(2);
}

let target;
try {
  target = databaseTarget();
} catch (e) {
  fail(`${e.message} The database was not touched.`);
}
const { url, from } = target;
if (isPooled(url)) {
  fail(
    `${from} is a pooled connection (its host name has "-pooler"). The deploy lock is held for the whole ` +
      "migrate-and-seed step, and a lock taken through a pooler can outlive the build and stall the next one.\n" +
      'Set DATABASE_URL_UNPOOLED to the direct connection (the same address without "-pooler"), then deploy again. ' +
      "The database was not touched."
  );
}

const client = new pg.Client({
  connectionString: url,
  // Managed Postgres (Neon, Supabase, RDS) terminates TLS with its own chain.
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  // The connection sits idle while the command runs; keep it from being dropped as dead.
  keepAlive: true,
  // Shown in pg_stat_activity, so whoever holds the lock can be found.
  application_name: "tycoonhood deploy lock",
});

let child = null;
let lost = false;

// Signals go to the command once it runs. Before that, stop waiting and leave.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    if (child) child.kill(signal);
    else process.exit(128 + constants.signals[signal]);
  });
}

try {
  await client.connect();
} catch (e) {
  fail(`Cannot reach the database: ${e.message}`);
}
client.on("error", (e) => {
  lost = true;
  console.error(
    `── Lost the database connection that holds the deploy lock (${e.message}). ` +
      "Stopping, so this build does not migrate or seed unprotected."
  );
  if (child) child.kill("SIGTERM");
  else process.exit(1);
});

try {
  await takeLock();
} catch (e) {
  fail(`── Could not take the deploy lock: ${e.message}. The database was not touched.`);
}

const code = await run(command);
await client.query("SELECT pg_advisory_unlock_all()").catch(() => {});
await client.end().catch(() => {});
process.exit(lost ? 1 : code);

/** Takes the lock, waiting and saying so while another build holds it. */
async function takeLock() {
  const { rows } = await client.query("SELECT pg_try_advisory_lock($1::bigint) AS ok", [DEPLOY_LOCK]);
  const db = `${where(url)} (${from})`;
  if (rows[0].ok) {
    console.log(`── Deploy lock taken on ${db}. No other build is migrating or seeding this database.`);
    return;
  }
  console.log(`── Another build is migrating or seeding ${db}. Waiting for it to finish …`);
  const started = Date.now();
  await client.query(`SET lock_timeout = '${WAIT_MINUTES}min'`);
  try {
    await client.query("SELECT pg_advisory_lock($1::bigint)", [DEPLOY_LOCK]);
  } catch (e) {
    if (e.code === "55P03") {
      fail(
        `── Gave up after ${WAIT_MINUTES} minutes: another session still holds the deploy lock. ` +
          'docs/DEPLOYMENT.md ("A deploy waits for the database lock") says how to find it. The database was not touched.'
      );
    }
    throw e;
  }
  await client.query("RESET lock_timeout");
  console.log(`── The other build finished after ${Math.round((Date.now() - started) / 1000)}s. Carrying on.`);
}

/**
 * Runs the command with this process's terminal and environment, but with
 * DATABASE_URL set to the locked address; resolves with its exit code.
 */
function run([cmd, ...args]) {
  return new Promise((resolve) => {
    child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
    child.on("error", (e) => {
      // Only a command that could not be started ends here. A failed kill leaves it running.
      if (child.pid === undefined) {
        console.error(`── Could not start ${cmd}: ${e.message}`);
        resolve(127);
      }
    });
    child.on("close", (exitCode, signal) => resolve(exitCode ?? 128 + (constants.signals[signal] ?? 0)));
  });
}
