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
 * "The command" means everything it started. The work runs in its children
 * (bash runs pnpm, which runs tsx, which runs node), and a bash or node that
 * is killed does not pass the signal on. Signalling only the first process
 * left the migrations and seeds running after the lock was gone (review
 * finding 19, follow-up). So the command gets a process group of its own,
 * and a stop, from a signal or a lost connection, goes to the whole group.
 * Whatever is still running 10 seconds later is killed, and only then does
 * this exit. (Windows has no process groups: there the stop reaches the
 * first process only.)
 *
 * The lock's connection sits idle while the command runs, and a waiting
 * build's sits idle in pg_advisory_lock. Keepalive probes start after 10
 * seconds of silence: Linux's default is two hours, long after a NAT or
 * firewall has dropped an idle flow, which leaves the waiting build hanging
 * and makes the holder lose its connection at the end.
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
import { readdirSync, readFileSync } from "node:fs";
import { constants } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";
import { databaseTarget, isPooled, where } from "../packages/db/scripts/db-target.mjs";

/** "tyco" in ASCII. Any fixed number would do but Prisma Migrate's 72707369, which migrate-sql takes inside this lock. */
const DEPLOY_LOCK = 0x7479636f;
/** How long a build waits for another before giving up, so a stuck one fails the deploy instead of hanging it. */
const WAIT_MINUTES = 15;
/** How long the command has to stop after a signal before it is killed. */
const GRACE_SECONDS = 10;
/** Windows has no process groups, so there only the command itself can be signalled. */
const GROUPS = process.platform !== "win32";

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
  // The connection sits idle while the command runs. Probe it after 10 seconds of
  // silence, not the system's two hours, so it is neither dropped nor lost unnoticed.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  // Shown in pg_stat_activity, so whoever holds the lock can be found.
  application_name: "tycoonhood deploy lock",
});

let child = null;
/** A stop under way: it resolves once nothing the command started is running. */
let stopping = null;
let lost = false;

// Signals go to the command once it runs. Before that, stop waiting and leave.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    if (child) stopping ??= stop(signal);
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
  if (child) stopping ??= stop("SIGTERM");
  else process.exit(1);
});

try {
  await takeLock();
} catch (e) {
  fail(`── Could not take the deploy lock: ${e.message}. The database was not touched.`);
}

const code = await run(command);
// After a stop, wait until nothing the command started runs before the lock goes.
await stopping;
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
    // detached: the command leads a process group of its own, which stop() signals as one.
    child = spawn(cmd, args, { stdio: "inherit", detached: GROUPS, env: { ...process.env, DATABASE_URL: url } });
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

/**
 * Stops the command and everything it started: `signal` to its process group,
 * then SIGKILL to whatever still runs GRACE_SECONDS later. Resolves once
 * nothing in the group runs.
 */
async function stop(signal) {
  if (!signalCommand(signal)) return;
  const deadline = Date.now() + GRACE_SECONDS * 1000;
  while (commandRunning()) {
    if (Date.now() >= deadline) {
      console.error(`── The command did not stop within ${GRACE_SECONDS} seconds of ${signal}. Killing it.`);
      signalCommand("SIGKILL");
      return;
    }
    await sleep(100);
  }
}

/** Sends `signal` to the command's process group. False when nothing is left to signal. */
function signalCommand(signal) {
  if (!GROUPS) return child.kill(signal);
  try {
    process.kill(-child.pid, signal);
    return true;
  } catch {
    return false;
  }
}

/** True while anything in the command's process group runs. */
function commandRunning() {
  if (!GROUPS) return child.exitCode === null && child.signalCode === null;
  if (process.platform !== "linux") return signalCommand(0);
  // On Linux, read the process table: a process that exited but was never
  // reaped (a zombie, which an init that does not reap leaves behind) still
  // answers a signal, but it has stopped.
  for (const pid of readdirSync("/proc")) {
    if (!/^\d+$/.test(pid)) continue;
    let stat;
    try {
      stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    } catch {
      continue; // it ended while we looked
    }
    // After the command name, in brackets: its state, its parent, its process group.
    const [state, , group] = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    if (group === String(child.pid) && state !== "Z") return true;
  }
  return false;
}
