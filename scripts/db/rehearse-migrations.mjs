#!/usr/bin/env node
/**
 * MIGRATION REHEARSAL
 *
 *   pnpm db:rehearse                    an empty database: base migrations, fixtures, the new migrations, checks
 *   pnpm db:rehearse --with-pending     the same, then the migrations in docs/ecosystem/pending-migrations
 *   pnpm db:rehearse --from <database>  a copy of <database>, migrated by the real runner, then the checks
 *                                       that hold on any populated database (add --with-pending as above)
 *   --allow-empty                       accept checks that had no rows to run over (NOT EXERCISED, below)
 *
 * What it proves. The living-ecosystem migrations (20261113000000 onwards)
 * apply in order, each in one transaction, on top of this repository's base
 * migrations. Their backfills produce what docs/ecosystem/data-model.md says
 * they produce (c.4). The CHECK, exclusion, unique and RESTRICT rules refuse
 * what they are there to refuse. And the migrated database matches
 * packages/db/prisma/schema.prisma (the drift check). Every check prints
 * what it expected, what it found, and PASS or FAIL. The exit code is 1 when
 * any check fails or a step cannot run, else 0.
 *
 * Mode 1 (the default) starts from an empty throwaway database. It applies
 * every migration folder that sorts before 20261113000000, each with psql in
 * one transaction; then scripts/db/rehearse-fixtures.sql, rows chosen so that
 * every backfill has something to get wrong; then each folder from
 * 20261113000000 on, in name order, each in its own transaction; and with
 * --with-pending, the folders in docs/ecosystem/pending-migrations. The
 * checks that need those run only then.
 *
 * Mode 2 (--from) copies a database with CREATE DATABASE ... TEMPLATE, which
 * only reads the source, and migrates the copy with the real runner
 * (pnpm db:migrate:sql, with DATABASE_URL and DATABASE_URL_UNPOOLED both set
 * to the copy). Its checks are rules every row must meet, never counts of
 * fixture rows. Postgres copies a database only while no other session is
 * connected to it, so stop the app and tests that use the source first.
 *
 * A rule every row must meet proves nothing over a table with no rows, and a
 * copy may have none: a database with seed data only has no orders, sessions
 * or mission completions. Such a check is reported NOT EXERCISED, never PASS,
 * and so is a group of checks that could not run at all (a copy that had the
 * migrations already). The summary lists them, and the rehearsal fails
 * unless --allow-empty accepts them. A wrong answer over no rows still fails.
 *
 * The drift check (both modes) runs prisma migrate diff from the throwaway
 * database to schema.prisma. It removes comment and blank lines and exactly
 * the five searchVector DROP DEFAULT lines Prisma always reports for a
 * generated column (docs/DATABASE.md, "Drift check"), and fails on anything
 * left, which it prints.
 *
 * Safety. The server comes from DATABASE_URL_UNPOOLED or DATABASE_URL (the
 * shell's, else .env's), and the rehearsal refuses unless its host is
 * localhost, 127.0.0.1 or ::1. It creates only databases named
 * tycoonhood_rehearse_<random>_test, and drops only the one it created in the
 * same run: at the end, on failure, and on Ctrl-C (SIGINT), SIGTERM or
 * SIGHUP. It never touches another database, except the source of a copy,
 * which it only reads, and the server's maintenance database, which it
 * connects to only to create and drop its own. Every command it runs is
 * given the throwaway database's address and no other: libpq's PG* variables
 * are taken out of their environment.
 */
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import pg from "pg";
import { databaseTarget } from "../../packages/db/scripts/db-target.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");
const PENDING = join(ROOT, "docs/ecosystem/pending-migrations");
const FIXTURES = join(ROOT, "scripts/db/rehearse-fixtures.sql");
const SCHEMA = join(ROOT, "packages/db/prisma/schema.prisma");
const PRISMA = join(ROOT, "packages/db/node_modules/.bin/prisma");
/** The first living-ecosystem migration: mode 1 loads the fixtures just before it. */
const FIRST_NEW = "20261113000000";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const THROWAWAY = /^tycoonhood_rehearse_[0-9a-f]{8}_test$/;
/** Prisma cannot express a generated column, so it always reports these five lines (docs/DATABASE.md). */
const ALLOWED_DRIFT = new Set(
  ["HelpArticle", "Instructor", "Lesson", "Opportunity", "Post"].map((t) => `ALTER TABLE "${t}" ALTER COLUMN "searchVector" DROP DEFAULT;`)
);
/** The pending migration the evidence checks follow. It moves into the migrations folder, unchanged, with DAILY-B. */
const EVIDENCE_MOVE = "20261113000900_challenge_evidence_move";
const PROGRAMME_GROUPS = [
  ["warrior-program", "warrior"],
  ["business-mastery-program", "business-mastery"],
  ["financial-planning-program", "financial-planning-investment-advisory"],
  ["mindfulness-wellness-program", "mindfulness-wellness"],
];

const USAGE = `Usage: pnpm db:rehearse [--with-pending] [--from <database>] [--allow-empty]

  (no options)        rehearse on an empty throwaway database with the fixture rows
  --with-pending      also apply docs/ecosystem/pending-migrations and check them
  --from <database>   rehearse on a copy of <database> (CREATE DATABASE ... TEMPLATE),
                      migrated by pnpm db:migrate:sql
  --allow-empty       do not fail for checks that had no rows to run over; they are
                      still listed as NOT EXERCISED`;

class Refusal extends Error {}

// ─── state the clean-up needs ───────────────────────────────────────────────
/** The database this run created, and nothing else: the only one it may drop. */
let created = null;
/** The server, once known. */
let server = null;
/** The connection to the throwaway database. */
let db = null;
/** The command running now, so a signal can stop it. */
let current = null;
let cleaning = null;
/** The CREATE DATABASE in flight, so a signal that comes during it waits to see whether there is a database to drop. */
let creating = null;
/** Set by a signal: no new command starts after it. */
let stopping = false;

/** `idle`: the checks that had no rows to run over (NOT EXERCISED), by label. */
const results = { pass: 0, fail: 0, idle: [], stopped: false };

for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) {
  process.on(signal, () => {
    console.error(`\n${signal}: stopping${created ? ` and dropping ${created}` : ""} …`);
    stopping = true;
    stopCurrent();
    cleanup().finally(() => {
      stopCurrent();
      process.exit(code);
    });
  });
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`${e.message}\n\n${USAGE}`);
    return 1;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  try {
    server = serverFromEnv();
    await requireTools();
    const name = `tycoonhood_rehearse_${randomBytes(4).toString("hex")}_test`;
    await createThrowaway(name, opts.from);
    if (opts.from) await rehearseCopy(name, opts);
    else await rehearseEmpty(name, opts);
  } catch (e) {
    if (e instanceof Refusal) console.error(`\n${e.message}`);
    else console.error(`\nThe rehearsal stopped: ${e.message}`);
    results.stopped = true;
  } finally {
    await cleanup();
  }
  const idle = results.idle.length;
  const accepted = idle > 0 && opts.allowEmpty;
  if (idle) {
    console.log(
      `\nNOT EXERCISED${accepted ? " (accepted with --allow-empty)" : ""}: ${idle === 1 ? "1 check" : `${idle} checks`} ` +
        `had no rows to run over or could not run, so ${idle === 1 ? "it proves" : "they prove"} nothing about real data:`
    );
    for (const label of results.idle) console.log(`  - ${label}`);
    if (!accepted) {
      console.log(
        "Rehearse from a copy of a database from before these migrations that holds such rows " +
          "(pnpm db:rehearse --from <database>), or pass --allow-empty to accept them as not exercised."
      );
    }
  }
  const counts =
    `${results.pass + results.fail + idle} checks, ${results.pass} passed, ${results.fail} failed` +
    (idle ? `, ${idle} not exercised${accepted ? " (--allow-empty)" : ""}` : "");
  const failed = results.fail > 0 || (idle > 0 && !accepted);
  if (results.stopped) console.log(`\nFAILED: the rehearsal did not run to the end (${counts} before it stopped).`);
  else console.log(`\n${failed ? "FAILED" : "PASSED"}: ${counts}.`);
  return failed || results.stopped ? 1 : 0;
}

function parseArgs(argv) {
  const opts = { withPending: false, from: null, allowEmpty: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--with-pending") opts.withPending = true;
    else if (a === "--allow-empty") opts.allowEmpty = true;
    else if (a === "--from") opts.from = argv[++i] ?? "";
    else if (a.startsWith("--from=")) opts.from = a.slice("--from=".length);
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--") continue;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (opts.from !== null && !/^[A-Za-z0-9_]{1,63}$/.test(opts.from)) {
    throw new Error("--from needs the name of a database on the same server (letters, digits and _).");
  }
  return opts;
}

// ─── the server and the throwaway database ──────────────────────────────────

/** The server to rehearse on: host, port and credentials, never a database. Refuses anything not local. */
function serverFromEnv() {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) loadDotEnv(join(ROOT, ".env"));
  let target;
  try {
    target = databaseTarget();
  } catch (e) {
    throw new Refusal(`${e.message} Nothing was created.`);
  }
  let u;
  try {
    u = new URL(target.url);
  } catch {
    throw new Refusal(`${target.from} is not a postgresql:// address. Nothing was created.`);
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Refusal(`${target.from} is not a postgresql:// address. Nothing was created.`);
  if (!LOCAL_HOSTS.has(u.hostname)) {
    throw new Refusal(
      `The rehearsal runs only on a local server (localhost, 127.0.0.1 or ::1); ${target.from} names ` +
        `${u.hostname || "a Unix socket"}. Nothing was created.`
    );
  }
  for (const key of ["host", "hostaddr", "service"]) {
    if (u.searchParams.has(key)) {
      throw new Refusal(`${target.from} sets "${key}" in its query string, which can point a connection elsewhere. Nothing was created.`);
    }
  }
  const host = u.hostname === "[::1]" ? "::1" : u.hostname;
  return {
    host,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    from: target.from,
  };
}

/** Reads KEY="value" lines into process.env without replacing what is set, as migrate-sql.ts does. */
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/** A postgresql:// address of `database` on the rehearsal server; with the password only for tools that need it there. */
function urlFor(database, { password = true } = {}) {
  const auth = encodeURIComponent(server.user) + (password && server.password ? `:${encodeURIComponent(server.password)}` : "");
  const host = server.host.includes(":") ? `[${server.host}]` : server.host;
  return `postgresql://${auth}@${host}:${server.port}/${database}`;
}

const at = (database) => `${server.host}:${server.port}/${database}`;

/** The environment for a command: this process's, without libpq's PG* variables, plus `extra`. */
function childEnv(extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith("PG")) env[k] = v;
  return { ...env, ...extra };
}

/** psql's environment: the password, so it never appears in an address or the process list. */
const psqlEnv = () => childEnv({ ...(server.password ? { PGPASSWORD: server.password } : {}), PGCONNECT_TIMEOUT: "10" });

async function requireTools() {
  const psql = await run("psql", ["--version"], { env: psqlEnv() }).catch(() => null);
  if (!psql || psql.code !== 0) throw new Refusal("psql is not installed or not on PATH. Nothing was created.");
  if (!existsSync(PRISMA)) throw new Refusal(`${PRISMA} is missing: run pnpm install. Nothing was created.`);
}

/** A connection to the server's maintenance database, used only to create and drop the throwaway one. */
async function maintenance() {
  for (const database of ["postgres", "template1"]) {
    const client = new pg.Client({ ...connection(database), application_name: "tycoonhood rehearse (maintenance)" });
    try {
      await client.connect();
      return client;
    } catch (e) {
      await client.end().catch(() => {});
      if (e.code !== "3D000") throw e; // 3D000: no such database; try the next
    }
  }
  throw new Refusal("The server has neither a postgres nor a template1 database to connect to. Nothing was created.");
}

const connection = (database) => ({
  host: server.host,
  port: server.port,
  user: server.user,
  password: server.password,
  database,
  connectionTimeoutMillis: 10_000,
});

async function createThrowaway(name, from) {
  if (!THROWAWAY.test(name)) throw new Error(`Refusing to create ${name}: not a rehearsal database name.`);
  const admin = await maintenance();
  // `created` is set the moment the server confirms the database, never before:
  // a name that was already taken is not this run's to drop.
  const create = (sql) => (creating = admin.query(sql).then(() => void (created = name)));
  try {
    if (from) {
      const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [from]);
      if (!rows.length) throw new Refusal(`There is no database ${from} on ${server.host}:${server.port}. Nothing was created.`);
      try {
        await create(`CREATE DATABASE "${name}" TEMPLATE "${from}"`);
      } catch (e) {
        if (e.code === "55006") {
          throw new Refusal(
            `Postgres copies a database only while nothing else is connected to it, and ${from} has other sessions. ` +
              "Stop the app, tests or tools using it, then run this again. Nothing was created.",
            { cause: e }
          );
        }
        throw e;
      }
      console.log(`Rehearsal database ${at(name)}: a copy of ${from}, which is only read.`);
    } else {
      await create(`CREATE DATABASE "${name}"`);
      console.log(`Rehearsal database ${at(name)}: empty.`);
    }
  } finally {
    await admin.end().catch(() => {});
  }
}

/** Drops the database this run created, once, whatever happened before. */
function cleanup() {
  cleaning ??= (async () => {
    stopCurrent();
    if (db) {
      await db.end().catch(() => {});
      db = null;
    }
    if (creating) await creating.catch(() => {});
    if (!created) return;
    const name = created;
    if (!THROWAWAY.test(name)) throw new Error(`Refusing to drop ${name}: not a rehearsal database.`);
    const admin = await maintenance();
    try {
      // FORCE ends any session still in it, such as a command a signal interrupted.
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      created = null;
      console.log(`Dropped ${name}.`);
    } finally {
      await admin.end().catch(() => {});
    }
  })().catch((e) => {
    console.error(`Could not drop ${created}: ${e.message}\nDrop it by hand: DROP DATABASE "${created}";`);
    results.fail++;
  });
  return cleaning;
}

// ─── running commands ───────────────────────────────────────────────────────

/** Runs a command in a process group of its own, so a signal can stop all of it. Resolves with its output. */
function run(command, args, { env, cwd = ROOT } = {}) {
  return new Promise((resolvePromise, reject) => {
    if (stopping) return reject(new Error("stopped by a signal"));
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
    current = child;
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      if (current === child) current = null;
      reject(e);
    });
    child.on("close", (code, signal) => {
      if (current === child) current = null;
      resolvePromise({ code, signal, out, err });
    });
  });
}

function stopCurrent() {
  const child = current;
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {}
}

/** Applies one SQL file to the throwaway database in one transaction, stopping at the first error. */
async function applyFile(file, label) {
  const r = await run("psql", ["-X", "-q", "-1", "-v", "ON_ERROR_STOP=1", `--dbname=${urlFor(created, { password: false })}`, "-f", file], {
    env: psqlEnv(),
  });
  if (r.code === 0) return;
  if (r.signal) throw new Error(`${label} did not apply: psql was stopped (${r.signal}).`);
  throw new Error(`${label} did not apply:\n${indent((r.err || r.out).trim().split("\n").slice(-12).join("\n"))}`);
}

const folders = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "migration.sql")))
        .map((d) => d.name)
        .sort()
    : [];

async function applyPending() {
  const pending = folders(PENDING);
  if (!pending.length) {
    console.log("No pending migrations in docs/ecosystem/pending-migrations.");
    return;
  }
  for (const name of pending) {
    await applyFile(join(PENDING, name, "migration.sql"), `pending ${name}`);
    console.log(`  applied pending ${name}`);
  }
}

// ─── the two modes ──────────────────────────────────────────────────────────

async function rehearseEmpty(name, opts) {
  const all = folders(MIGRATIONS);
  const base = all.filter((f) => f < FIRST_NEW);
  const fresh = all.filter((f) => f >= FIRST_NEW);
  console.log(`\nApplying ${base.length} base migrations (before ${FIRST_NEW}), each in one transaction …`);
  for (const f of base) await applyFile(join(MIGRATIONS, f, "migration.sql"), f);
  console.log(`  applied ${base.length}: ${base[0]} … ${base[base.length - 1]}`);
  await applyFile(FIXTURES, "scripts/db/rehearse-fixtures.sql");
  console.log("  applied scripts/db/rehearse-fixtures.sql");

  const before = await snapshot(name);

  console.log(`\nApplying ${fresh.length} living-ecosystem migrations, each in one transaction …`);
  for (const f of fresh) {
    await applyFile(join(MIGRATIONS, f, "migration.sql"), f);
    console.log(`  applied ${f}`);
  }
  if (opts.withPending) {
    console.log("\nApplying the pending migrations …");
    await applyPending();
  }

  db = await connect(name);
  await schemaChecks(fresh);
  await invariantChecks(before);
  await evidenceChecks(before, opts);
  await fixtureChecks(opts);
  await behaviourChecks();
  await driftCheck(name);
}

async function rehearseCopy(name, opts) {
  const all = folders(MIGRATIONS);
  const before = await snapshot(name);
  const applied = before.applied;
  const toApply = all.filter((f) => !applied.has(f));
  console.log(
    `\nThe copy has ${all.length - toApply.length} of ${all.length} migrations. ` +
      (toApply.length ? `The runner applies ${toApply.length}:` : "The runner has none to apply.")
  );
  for (const f of toApply) console.log(`  ${f}`);

  const copyUrl = urlFor(name);
  const r = await run("pnpm", ["db:migrate:sql"], {
    env: childEnv({ DATABASE_URL: copyUrl, DATABASE_URL_UNPOOLED: copyUrl }),
  });
  console.log(`\npnpm db:migrate:sql (the real runner) exited with ${r.code ?? r.signal}:`);
  console.log(indent([r.out.trim(), r.err.trim()].filter(Boolean).join("\n")));
  report("migrations", "the real runner applies the pending migrations to the copy", "exit 0", `exit ${r.code ?? r.signal}`);
  if (r.code !== 0) throw new Error("The runner failed; nothing more is checked.");
  if (opts.withPending) {
    console.log("\nApplying the pending migrations …");
    await applyPending();
  }

  db = await connect(name);
  await runnerRecordCheck(all);
  await schemaChecks(all.filter((f) => f >= FIRST_NEW));
  // The backfill rules describe rows as the migrations leave them. A copy that
  // already had some of these migrations holds rows the app wrote since, so
  // they are checked only when this run applied every one of them.
  const already = [...applied].filter((f) => f >= FIRST_NEW).sort();
  if (already.length) {
    heading("Backfills: rules every row meets");
    notRun(
      `the copy already had ${already.length} of the living-ecosystem migrations ` +
        `(${already[0]} … ${already[already.length - 1]}), so its rows may have been written since by the app`
    );
  } else {
    await invariantChecks(before);
  }
  await evidenceChecks(before, opts);
  await behaviourChecks();
  await driftCheck(name);
}

async function connect(name) {
  const client = new pg.Client({ ...connection(name), application_name: "tycoonhood rehearse" });
  await client.connect();
  return client;
}

/** What the backfills start from, read before the living-ecosystem migrations run. */
async function snapshot(name) {
  const client = await connect(name);
  try {
    const exists = async (table) =>
      (await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1", [table])).rows.length > 0;
    const applied = new Set(
      (await exists("_prisma_migrations"))
        ? (await client.query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")).rows.map(
            (r) => r.migration_name
          )
        : []
    );
    const cooldowns = Object.fromEntries(
      (await client.query('SELECT id, "cooldownHours" FROM "Mission"')).rows.map((r) => [r.id, r.cooldownHours])
    );
    const submissions = (
      await client.query(`
        SELECT p.id AS pid, s->>'id' AS sid, s->>'status' AS status, NULLIF(s->>'url', '') AS url,
               (SELECT u.id FROM "User" u WHERE u.id = s->>'reviewedBy') AS reviewer
        FROM "ChallengeParticipation" p
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.progress->'submissions') = 'array' THEN p.progress->'submissions' ELSE '[]'::jsonb END) AS s`)
    ).rows;
    const withSubmissionsKey = (await client.query(`SELECT count(*)::int AS n FROM "ChallengeParticipation" WHERE progress ? 'submissions'`)).rows[0].n;
    return { applied, cooldowns, submissions, withSubmissionsKey };
  } finally {
    await client.end().catch(() => {});
  }
}

// ─── reporting ──────────────────────────────────────────────────────────────

let section = "";

function heading(title) {
  section = title;
  console.log(`\n== ${title}`);
}

/** Records one check: PASS when actual equals expected (keys in any order). */
function report(where_, name, expected, actual) {
  const pass = same(expected, actual);
  results[pass ? "pass" : "fail"]++;
  const label = section && where_ === section ? name : `${where_}: ${name}`;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  console.log(`      expected: ${show(expected, pass)}`);
  console.log(`      actual:   ${show(actual, pass)}`);
  return pass;
}

const check = (name, expected, actual) => report(section, name, expected, actual);

/**
 * Records a check over rows, `basis` saying how many it ran over ({ "Order rows": 4 },
 * named in the label). When it finds nothing wrong but one of those counts is 0, it
 * proved nothing about real data: NOT EXERCISED, never PASS. A wrong answer fails.
 */
function checkRows(name, basis, expected, actual, legend = "") {
  const over = Object.entries(basis);
  const label = `${name} (${over.map(([what, n]) => `${n} ${what}`).join(" and ")} checked)${legend ? ` ${legend}` : ""}`;
  const empty = over.filter(([, n]) => n === 0).map(([what]) => what);
  if (!empty.length || !same(expected, actual)) return check(label, expected, actual);
  results.idle.push(`${section}: ${label}`);
  console.log(`NOT EXERCISED  ${label}`);
  console.log(`      there were no ${empty.join(" and no ")} to check, so this proves nothing about real data`);
  return true;
}

/** Records a group of checks that could not run at all, as NOT EXERCISED. */
function notRun(why) {
  results.idle.push(`${section}: not run: ${why}`);
  console.log(`NOT EXERCISED  not run: ${why}`);
}

function canonical(v) {
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  return v;
}

const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

function show(v, short) {
  const text = typeof v === "string" ? v : JSON.stringify(canonical(v));
  return short && text.length > 400 ? `${text.slice(0, 400)} …` : text;
}

const indent = (text) => text.split("\n").map((l) => `    ${l}`).join("\n");

/** Rows as arrays, in the order the query gives them. */
async function rows(sql, params = []) {
  return (await db.query({ text: sql, values: params, rowMode: "array" })).rows;
}

const value = async (sql, params) => (await rows(sql, params))[0]?.[0];

// ─── checks: the schema ─────────────────────────────────────────────────────

async function runnerRecordCheck(all) {
  heading("Migrations recorded by the runner");
  const recorded = await rows(
    "SELECT migration_name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name"
  );
  const want = all.map((f) => [f, createHash("sha256").update(readFileSync(join(MIGRATIONS, f, "migration.sql"), "utf8")).digest("hex")]);
  check("every migration folder is recorded as applied, with its file's checksum", want, recorded);
}

async function schemaChecks(fresh) {
  heading("Schema");
  const models = (readFileSync(SCHEMA, "utf8").match(/^model \w+ \{/gm) ?? []).length;
  check(
    "one table per model in schema.prisma",
    models,
    await value(
      "SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'"
    )
  );

  // The hand-written rules, by name, from the migration files themselves.
  const sql = fresh.map((f) => readFileSync(join(MIGRATIONS, f, "migration.sql"), "utf8")).join("\n");
  const names = (re) => [...sql.matchAll(re)].map((m) => m[1]).sort();
  const checks = names(/ADD CONSTRAINT "(\w+)" CHECK/g);
  const exclusions = names(/ADD CONSTRAINT "(\w+)" EXCLUDE/g);
  const partial = names(/CREATE UNIQUE INDEX "(\w+)" ON "\w+" \([^;]*?\)\s*WHERE/g);
  const present = async (sqlText, list) => (await rows(sqlText, [list])).map((r) => r[0]).sort();
  check(
    `the ${checks.length} CHECK constraints the migrations add exist (data-model 0.2: 58)`,
    { count: 58, names: checks },
    { count: checks.length, names: await present("SELECT conname FROM pg_constraint WHERE contype = 'c' AND conname = ANY($1)", checks) }
  );
  check(
    "the exclusion constraint exists (data-model 0.2: 1)",
    ["LiveEvent_mentor_no_overlap"],
    await present("SELECT conname FROM pg_constraint WHERE contype = 'x' AND conname = ANY($1)", exclusions)
  );
  check(
    `the ${partial.length} partial unique indexes exist (data-model 0.2: 11)`,
    { count: 11, names: partial },
    {
      count: partial.length,
      names: await present("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1) AND indexdef LIKE 'CREATE UNIQUE INDEX%WHERE%'", partial),
    }
  );
  check(
    "the five searchVector columns are generated (data-model 0.2: 5)",
    ["HelpArticle", "Instructor", "Lesson", "Opportunity", "Post"],
    (await rows("SELECT table_name FROM information_schema.columns WHERE column_name = 'searchVector' AND is_generated = 'ALWAYS' ORDER BY 1")).map((r) => r[0])
  );
  check("btree_gist is installed (000800)", [["btree_gist"]], await rows("SELECT extname FROM pg_extension WHERE extname = 'btree_gist'"));
  check(
    "defaults and nullability the review settled (c.4)",
    [
      ["AcademyMembership", "notify", "false", "NO"],
      ["MentorProfile", "bookingMode", `'INSTANT'::"BookingMode"`, "NO"],
      ["MentorProfile", "cancellationHours", null, "YES"],
      ["MissionCompletion", "occurrence", null, "NO"],
      ["OpportunityApplication", "sharedFields", `ARRAY[]::"ApplicantContactField"[]`, "YES"],
      ["ScheduledNotification", "notAfter", null, "YES"],
    ],
    await rows(`
      SELECT table_name, column_name, column_default, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND (table_name, column_name) IN (
        ('AcademyMembership', 'notify'), ('MentorProfile', 'bookingMode'), ('MentorProfile', 'cancellationHours'),
        ('MissionCompletion', 'occurrence'), ('OpportunityApplication', 'sharedFields'), ('ScheduledNotification', 'notAfter'))
      ORDER BY 1, 2`)
  );
  check(
    "OrderItem_registrationId_idx is a plain index, not a unique one (c.4)",
    'CREATE INDEX "OrderItem_registrationId_idx" ON public."OrderItem" USING btree ("registrationId")',
    await value("SELECT indexdef FROM pg_indexes WHERE indexname = 'OrderItem_registrationId_idx'")
  );
  check(
    "MissionCompletion is unique per mission, member and occurrence (000400)",
    'CREATE UNIQUE INDEX "MissionCompletion_missionId_userId_occurrence_key" ON public."MissionCompletion" USING btree ("missionId", "userId", occurrence)',
    await value("SELECT indexdef FROM pg_indexes WHERE indexname = 'MissionCompletion_missionId_userId_occurrence_key'")
  );
}

// ─── checks: rules every backfilled row meets (both modes) ──────────────────

async function invariantChecks(before) {
  heading("Backfills: rules every row meets");
  const count = (table) => value(`SELECT count(*)::int FROM "${table}"`);
  /** A rule every row of `table` meets: `badSql` counts the rows that break it. Over no rows it is NOT EXERCISED. */
  const rule = async (name, table, badSql, params) =>
    checkRows(name, { [`${table} rows`]: await count(table) }, 0, await value(badSql, params));

  check(
    "the four academies, one per pillar (000100)",
    [
      ["warrior", "WARRIOR", 1],
      ["business", "BUILDER", 2],
      ["wealth", "TYCOON", 3],
      ["wellness", "MIND", 4],
    ],
    await rows('SELECT slug, pillar::text, "sortOrder" FROM "Academy" ORDER BY "sortOrder"')
  );
  check(
    "the one-to-one event kind, and only one (000300)",
    [["evk_one_to_one", "one-to-one", "ONE_TO_ONE", true]],
    await rows(`SELECT id, slug, mode::text, active FROM "EventKind" WHERE mode = 'ONE_TO_ONE'`)
  );
  await rule(
    "each academy's flagship is its programme course where that course exists; academies that differ",
    "Academy",
    `
      SELECT count(*)::int FROM "Academy" a
      LEFT JOIN "Course" c ON c.slug = CASE a.slug WHEN 'warrior' THEN 'warrior' WHEN 'business' THEN 'business-mastery'
        WHEN 'wealth' THEN 'financial-planning-investment-advisory' WHEN 'wellness' THEN 'mindfulness-wellness' END
      WHERE a."flagshipCourseId" IS DISTINCT FROM c.id`
  );
  for (const table of ["Course", "Challenge", "CommunityGroup"]) {
    await rule(
      `every ${table} is in its pillar's academy, none without a pillar; rows that are not`,
      table,
      `SELECT count(*)::int FROM "${table}" t LEFT JOIN "Academy" a ON a.pillar = t.pillar WHERE t."academyId" IS DISTINCT FROM a.id`
    );
  }
  await rule(
    "community categories: warrior, business, money → wealth, mind → wellness, the rest none; rows that are not",
    "CommunityCategory",
    `
      SELECT count(*)::int FROM "CommunityCategory" cc
      LEFT JOIN "Academy" a ON a.slug = CASE cc.slug WHEN 'warrior' THEN 'warrior' WHEN 'business' THEN 'business'
        WHEN 'money' THEN 'wealth' WHEN 'mind' THEN 'wellness' END
      WHERE cc."academyId" IS DISTINCT FROM a.id`
  );
  await rule(
    "every community post takes its group's academy, else its category's; posts that do not",
    "CommunityPost",
    `
      SELECT count(*)::int FROM "CommunityPost" p
      LEFT JOIN "CommunityGroup" g ON g.id = p."groupId" LEFT JOIN "CommunityCategory" cc ON cc.id = p."categoryId"
      WHERE p."academyId" IS DISTINCT FROM COALESCE(g."academyId", cc."academyId")`
  );
  await rule(
    "every post's last activity is its latest visible comment, else its creation; posts that differ",
    "CommunityPost",
    `
      SELECT count(*)::int FROM "CommunityPost" p
      WHERE p."lastActivityAt" IS DISTINCT FROM GREATEST(p."createdAt", COALESCE(
        (SELECT max(c."createdAt") FROM "CommunityComment" c WHERE c."postId" = p.id AND c.state = 'VISIBLE'), p."createdAt"))`
  );
  await rule(
    "XP events take the academy of their lesson's course, course or challenge, and others none; events that do not",
    "XpEvent",
    `
      SELECT count(*)::int FROM "XpEvent" x
      LEFT JOIN "Lesson" l ON x.source = 'LESSON_COMPLETED' AND l.id = x."sourceId"
      LEFT JOIN "CourseModule" m ON m.id = l."moduleId"
      LEFT JOIN "Course" lc ON lc.id = m."courseId"
      LEFT JOIN "Course" c ON x.source = 'COURSE_COMPLETED' AND c.id = x."sourceId"
      LEFT JOIN "Challenge" ch ON x.source = 'CHALLENGE_COMPLETED' AND ch.id = x."sourceId"
      WHERE x."academyId" IS DISTINCT FROM COALESCE(lc."academyId", c."academyId", ch."academyId")`
  );
  checkRows(
    "academy memberships are exactly the members' non-dropped enrolments: BACKFILL, earliest enrolment, notify off",
    { "Enrollment rows": await count("Enrollment") },
    [0, 0],
    (
      await rows(`
        WITH want AS (
          SELECT e."userId", c."academyId", min(e."enrolledAt") AS joined
          FROM "Enrollment" e JOIN "Course" c ON c.id = e."courseId"
          WHERE e.status <> 'DROPPED' AND c."academyId" IS NOT NULL
          GROUP BY 1, 2)
        SELECT
          (SELECT count(*)::int FROM want w WHERE NOT EXISTS (
            SELECT 1 FROM "AcademyMembership" am WHERE am."userId" = w."userId" AND am."academyId" = w."academyId"
              AND am.source = 'BACKFILL' AND am."joinedAt" = w.joined AND am.notify = false AND am."leftAt" IS NULL)),
          (SELECT count(*)::int FROM "AcademyMembership" am WHERE NOT EXISTS (
            SELECT 1 FROM want w WHERE w."userId" = am."userId" AND w."academyId" = am."academyId"))`)
    )[0],
    "[missing, extra]"
  );
  await rule(
    "mission cadence: weekly repeatable WEEKLY, other repeatable DAILY, the rest ONCE; all published; missions that are not",
    "Mission",
    `
      SELECT count(*)::int FROM "Mission"
      WHERE cadence::text <> CASE WHEN repeatable AND criteria->>'within' = 'week' THEN 'WEEKLY' WHEN repeatable THEN 'DAILY' ELSE 'ONCE' END
         OR "publishedAt" IS NULL`
  );
  const after = Object.fromEntries((await rows('SELECT id, "cooldownHours" FROM "Mission"')).map((r) => [r[0], r[1]]));
  checkRows(
    "every mission keeps its cooldown; missions whose cooldown changed",
    { missions: Object.keys(before.cooldowns).length },
    [],
    Object.keys(before.cooldowns).filter((id) => before.cooldowns[id] !== after[id])
  );
  await rule(
    "every completion's occurrence is its key after mission:<mission>:<member>:, or the whole key; completions that differ",
    "MissionCompletion",
    `
      SELECT count(*)::int FROM "MissionCompletion"
      WHERE occurrence IS DISTINCT FROM CASE
        WHEN left("idempotencyKey", length('mission:' || "missionId" || ':' || "userId" || ':')) = 'mission:' || "missionId" || ':' || "userId" || ':'
        THEN substr("idempotencyKey", length('mission:' || "missionId" || ':' || "userId" || ':') + 1)
        ELSE "idempotencyKey" END`
  );
  await rule(
    "challenge kind from its criteria; published exactly when upcoming, active or ended; challenges that are not",
    "Challenge",
    `
      SELECT count(*)::int FROM "Challenge"
      WHERE kind::text <> CASE criteria->>'event' WHEN 'DAILY_CHECKIN' THEN 'DAILY_CHECKIN' WHEN 'SUBMISSION' THEN 'SUBMISSION'
          WHEN 'GATED_SUBMISSIONS' THEN 'GATED_SUBMISSIONS' ELSE 'RULE' END
         OR (lifecycle IN ('UPCOMING', 'ACTIVE', 'ENDED')) <> ("publishedAt" IS NOT NULL)`
  );
  await rule(
    "Order.paidAt is the paying ledger transaction's time, else the first order.paid or order.settle_manual row, else null; orders that differ",
    "Order",
    `
      SELECT count(*)::int FROM "Order" o
      LEFT JOIN "LedgerTransaction" t ON t.id = o."ledgerTxId"
      LEFT JOIN (SELECT "targetId", min("createdAt") AS first FROM "AuditLog"
                 WHERE "targetType" = 'order' AND action IN ('order.paid', 'order.settle_manual') GROUP BY 1) a ON a."targetId" = o.id
      WHERE o."paidAt" IS DISTINCT FROM COALESCE(t."createdAt", a.first)`
  );
  checkRows(
    "every member with a rank has one GRANDFATHERED award recording their level, and there are no others",
    { "ranked members": await value('SELECT count(*)::int FROM "User" WHERE "rankId" IS NOT NULL') },
    [0, 0],
    (
      await rows(`
        SELECT
          (SELECT count(*)::int FROM "User" u WHERE u."rankId" IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM "RankAward" r WHERE r.id = 'ra' || md5(u.id || ':' || u."rankId") AND r."userId" = u.id AND r."rankId" = u."rankId"
              AND r.reason = 'GRANDFATHERED' AND r.evidence = jsonb_build_object('level', u.level))),
          (SELECT count(*)::int FROM "RankAward") - (SELECT count(*)::int FROM "User" WHERE "rankId" IS NOT NULL)`)
    )[0],
    "[missing, total awards − ranked members]"
  );
  await rule(
    "every existing instructor is ACTIVE with the contributor kind INSTRUCTOR, and only harsha is the founder; instructors that are not",
    "Instructor",
    `
      SELECT count(*)::int FROM "Instructor"
      WHERE "contributorKinds"::text[] <> ARRAY['INSTRUCTOR'] OR status <> 'ACTIVE' OR "isFounder" <> (slug = 'harsha')`
  );
  await rule(
    "blog posts: no time DRAFT, past PUBLISHED, future SCHEDULED, all searchable; posts that are not",
    "Post",
    `
      SELECT count(*)::int FROM "Post"
      WHERE status::text <> CASE WHEN "publishedAt" IS NULL THEN 'DRAFT' WHEN "publishedAt" <= now() THEN 'PUBLISHED' ELSE 'SCHEDULED' END
         OR "searchVector" IS NULL`
  );
  checkRows(
    "no referral keeps a signup IP and no session an unkeyed IP hash",
    { "Referral rows": await count("Referral"), "Session rows": await count("Session") },
    [0, 0],
    (
      await rows(
        'SELECT (SELECT count(*)::int FROM "Referral" WHERE "signupIp" IS NOT NULL), (SELECT count(*)::int FROM "Session" WHERE "ipHash" IS NOT NULL)'
      )
    )[0],
    "[signupIp, ipHash]"
  );
  await rule(
    "programme groups are topic PROGRAMME with their course, every other group OTHER with none; groups that are not",
    "CommunityGroup",
    `
      SELECT count(*)::int FROM "CommunityGroup" g
      LEFT JOIN (SELECT pg.slug AS gslug, c.id AS course FROM unnest($1::text[], $2::text[]) AS pg(slug, cslug) JOIN "Course" c ON c.slug = pg.cslug) p
        ON p.gslug = g.slug
      WHERE (p.course IS NOT NULL AND (g.topic <> 'PROGRAMME' OR g."courseId" IS DISTINCT FROM p.course))
         OR (p.course IS NULL AND (g.topic <> 'OTHER' OR g."courseId" IS NOT NULL))`,
    [PROGRAMME_GROUPS.map((p) => p[0]), PROGRAMME_GROUPS.map((p) => p[1])]
  );
  await rule(
    "every group's member count is its memberships; groups that differ",
    "CommunityGroup",
    'SELECT count(*)::int FROM "CommunityGroup" g WHERE g."memberCount" <> (SELECT count(*) FROM "GroupMembership" m WHERE m."groupId" = g.id)'
  );
  checkRows(
    "the community.archived list became archivedAt (and ARCHIVED for groups), and nothing else did",
    { "CommunityCategory rows": await count("CommunityCategory"), "CommunityGroup rows": await count("CommunityGroup") },
    [0, 0],
    (
      await rows(`
        WITH s AS (SELECT value FROM "SiteSetting" WHERE key = 'community.archived')
        SELECT
          (SELECT count(*)::int FROM "CommunityCategory" c
            WHERE (c."archivedAt" IS NOT NULL) <> COALESCE((SELECT jsonb_typeof(value->'categories') = 'array' AND (value->'categories') ? c.id FROM s), false)),
          (SELECT count(*)::int FROM "CommunityGroup" g
            WHERE ((g."archivedAt" IS NOT NULL AND g.status = 'ARCHIVED') OR (g."archivedAt" IS NULL AND g.status = 'ACTIVE')) IS NOT TRUE
               OR (g."archivedAt" IS NOT NULL) <> COALESCE((SELECT jsonb_typeof(value->'groups') = 'array' AND (value->'groups') ? g.id FROM s), false))`)
    )[0],
    "[categories, groups wrong]"
  );

}

/**
 * The challenge submissions 000900 moves (both modes). Only rows with a
 * legacyId came from the JSON: anything else in EvidenceSubmission was
 * written by the app.
 */
async function evidenceChecks(before, opts) {
  heading("Challenge evidence (20261113000900)");
  if (before.applied.has(EVIDENCE_MOVE)) {
    notRun("the copy had 000900 already, so there is no move to compare");
    return;
  }
  const submissions = { "JSON submissions": before.submissions.length };
  if (!evidenceMoved(opts)) {
    checkRows(
      "until 000900 lands, submissions stay in ChallengeParticipation.progress and none is moved",
      submissions,
      [before.submissions.length, 0],
      (
        await rows(`
          SELECT
            (SELECT count(*)::int FROM "ChallengeParticipation" p
              CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.progress->'submissions') = 'array' THEN p.progress->'submissions' ELSE '[]'::jsonb END)),
            (SELECT count(*)::int FROM "EvidenceSubmission" WHERE "legacyId" IS NOT NULL)`)
      )[0],
      "[JSON submissions, rows with a legacyId]"
    );
    return;
  }
  const md5 = (s) => createHash("md5").update(s).digest("hex");
  const status = (s) => (s === "APPROVED" || s === "REJECTED" ? s : "PENDING");
  checkRows(
    "every JSON submission became one EvidenceSubmission row: id, participation, legacy id, status, surviving reviewer, URL",
    submissions,
    before.submissions
      .map((s) => [`ev${md5(`${s.pid}:${s.sid}`)}`, s.pid, s.sid, status(s.status), s.reviewer, s.url])
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    await rows('SELECT id, "participationId", "legacyId", status::text, "reviewedById", url FROM "EvidenceSubmission" WHERE "legacyId" IS NOT NULL ORDER BY id')
  );
  checkRows(
    "no participation keeps a submissions key",
    { "participations with a submissions key": before.withSubmissionsKey },
    0,
    await value(`SELECT count(*)::int FROM "ChallengeParticipation" WHERE progress ? 'submissions'`)
  );
}

/** True when this run applied 000900: from the migrations folder once DAILY-B lands, else with --with-pending. */
const evidenceMoved = (opts) => folders(MIGRATIONS).includes(EVIDENCE_MOVE) || (opts.withPending && folders(PENDING).includes(EVIDENCE_MOVE));

// ─── checks: the fixture rows (mode 1) ──────────────────────────────────────

async function fixtureChecks(opts) {
  heading("Backfills: the fixture rows (data-model c.4)");
  check(
    "academy flagships: all four linked to their programmes",
    [
      ["warrior", "c_w"],
      ["business", "c_b"],
      ["wealth", "c_f"],
      ["wellness", "c_m"],
    ],
    await rows('SELECT slug, "flagshipCourseId" FROM "Academy" ORDER BY "sortOrder"')
  );
  check(
    "course academies",
    [
      ["c_b", "academy_business"],
      ["c_f", "academy_wealth"],
      ["c_m", "academy_wellness"],
      ["c_w", "academy_warrior"],
      ["c_w2", "academy_warrior"],
    ],
    await rows('SELECT id, "academyId" FROM "Course" ORDER BY id')
  );
  check(
    "challenge academies: one without a pillar stays without",
    [
      ["ch1", null],
      ["ch2", "academy_warrior"],
    ],
    await rows('SELECT id, "academyId" FROM "Challenge" ORDER BY id')
  );
  check(
    "group academies",
    [
      ["g_m", "academy_wellness"],
      ["g_old", null],
      ["g_w", "academy_warrior"],
    ],
    await rows('SELECT id, "academyId" FROM "CommunityGroup" ORDER BY id')
  );
  check(
    "category academies: money → wealth, mind → wellness; introductions, wins, questions and feedback none",
    [
      ["business", "academy_business"],
      ["feedback", null],
      ["introductions", null],
      ["mind", "academy_wellness"],
      ["money", "academy_wealth"],
      ["questions", null],
      ["warrior", "academy_warrior"],
      ["wins", null],
    ],
    await rows('SELECT slug, "academyId" FROM "CommunityCategory" ORDER BY slug')
  );
  check(
    "community posts: a group post takes the group's academy, a money post wealth; last activity ignores a later hidden comment; introductions stay DISCUSSION",
    [
      ["p1", "academy_warrior", "2026-11-05 08:00:00", "DISCUSSION"],
      ["p2", "academy_wealth", "2026-11-02 08:00:00", "DISCUSSION"],
      ["p3", null, "2026-10-01 08:00:00", "DISCUSSION"],
      ["p4", null, "2026-10-02 08:00:00", "DISCUSSION"],
    ],
    await rows(`SELECT id, "academyId", to_char("lastActivityAt", 'YYYY-MM-DD HH24:MI:SS'), kind::text FROM "CommunityPost" ORDER BY id`)
  );
  check(
    "XP events: lesson and course take the course's academy, a challenge its own, ADMIN_GRANT none",
    [
      ["x1", "academy_warrior"],
      ["x2", "academy_warrior"],
      ["x3", "academy_warrior"],
      ["x4", null],
    ],
    await rows('SELECT id, "academyId" FROM "XpEvent" ORDER BY id')
  );
  check(
    "academy memberships: none for a dropped enrolment, both programmes for u2, BACKFILL from the earliest enrolment, notify off",
    [
      ["u1", "academy_warrior", "BACKFILL", "2026-09-20 00:00:00", false],
      ["u2", "academy_warrior", "BACKFILL", "2026-09-01 00:00:00", false],
      ["u2", "academy_wellness", "BACKFILL", "2026-09-05 00:00:00", false],
    ],
    await rows(`
      SELECT "userId", "academyId", source::text, to_char("joinedAt", 'YYYY-MM-DD HH24:MI:SS'), notify
      FROM "AcademyMembership" ORDER BY 1, 2`)
  );
  check(
    "missions: daily-check-in DAILY, the weekly one WEEKLY, first-lesson ONCE, the 72-hour one DAILY keeping its cooldown; all published",
    [
      ["daily-check-in", "DAILY", 20, true],
      ["every-three-days", "DAILY", 72, true],
      ["first-lesson", "ONCE", null, true],
      ["weekly-five", "WEEKLY", null, true],
    ],
    await rows('SELECT slug, cadence::text, "cooldownHours", "publishedAt" IS NOT NULL FROM "Mission" ORDER BY slug')
  );
  check(
    "mission occurrences: once, a day key, and a legacy key kept whole",
    [
      ["mc1", "once"],
      ["mc2", "2026-11-10"],
      ["mc3", "legacy-key-without-prefix"],
    ],
    await rows('SELECT id, occurrence FROM "MissionCompletion" ORDER BY id')
  );
  check(
    "challenge kinds and publication",
    [
      ["ch1", "GATED_SUBMISSIONS", false],
      ["ch2", "DAILY_CHECKIN", true],
    ],
    await rows('SELECT id, kind::text, "publishedAt" IS NOT NULL FROM "Challenge" ORDER BY id')
  );
  check(
    "Order.paidAt: THC the ledger time, rupees the first order.paid, settled by hand the settle time, pending none",
    [
      ["o1", "2026-11-01 09:30:00"],
      ["o2", "2026-11-02 10:05:00"],
      ["o3", "2026-11-03 12:00:00"],
      ["o4", null],
    ],
    await rows(`SELECT id, to_char("paidAt", 'YYYY-MM-DD HH24:MI:SS') FROM "Order" ORDER BY id`)
  );
  check(
    "rank awards: the member with a rank has one GRANDFATHERED award with their level",
    [["u2", "rk1", "GRANDFATHERED", { level: 4 }]],
    await rows('SELECT "userId", "rankId", reason::text, evidence FROM "RankAward" ORDER BY 1')
  );
  check(
    "instructors: harsha is ACTIVE, INSTRUCTOR and the founder; the other is not the founder",
    [
      ["guest-teacher", "ACTIVE", ["INSTRUCTOR"], false],
      ["harsha", "ACTIVE", ["INSTRUCTOR"], true],
    ],
    await rows('SELECT slug, status::text, "contributorKinds"::text[], "isFounder" FROM "Instructor" ORDER BY slug')
  );
  check(
    "blog posts: one DRAFT, one SCHEDULED, three PUBLISHED, all with search vectors",
    [
      ["draft-post", "DRAFT", true],
      ["future-post", "SCHEDULED", true],
      ["money-basics", "PUBLISHED", true],
      ["pillars-in-practice", "PUBLISHED", true],
      ["the-four-pillars", "PUBLISHED", true],
    ],
    await rows('SELECT slug, status::text, "searchVector" IS NOT NULL FROM "Post" ORDER BY slug')
  );
  check(
    'search: "pillars" finds the two published posts about pillars',
    [["pillars-in-practice"], ["the-four-pillars"]],
    await rows(`SELECT slug FROM "Post" WHERE "searchVector" @@ websearch_to_tsquery('english', 'pillars') AND status = 'PUBLISHED' ORDER BY slug`)
  );
  check(
    "privacy clean-up: the referral's signup IP and the session's unkeyed hash are gone",
    [[null, null]],
    await rows(`SELECT (SELECT "signupIp" FROM "Referral" WHERE id = 'r1'), (SELECT "ipHash" FROM "Session" WHERE id = 's1')`)
  );
  check(
    "groups: programme groups PROGRAMME with their course; member counts; the archived group",
    [
      ["g_m", "PROGRAMME", "c_m", 0, "ACTIVE", false],
      ["g_old", "OTHER", null, 0, "ARCHIVED", true],
      ["g_w", "PROGRAMME", "c_w", 2, "ACTIVE", false],
    ],
    await rows('SELECT id, topic::text, "courseId", "memberCount", status::text, "archivedAt" IS NOT NULL FROM "CommunityGroup" ORDER BY id')
  );
  check(
    "categories: only feedback, on the archive list, is archived",
    [["feedback"]],
    await rows('SELECT slug FROM "CommunityCategory" WHERE "archivedAt" IS NOT NULL ORDER BY slug')
  );

  heading("Challenge evidence (20261113000900), fixture rows");
  if (!evidenceMoved(opts)) {
    check(
      "the three submissions are still in cp1's progress",
      [["sub_a", "sub_b", "sub_c"], ["2026-11-01"]],
      (
        await rows(`
          SELECT ARRAY(SELECT s->>'id' FROM jsonb_array_elements(progress->'submissions') s ORDER BY 1),
                 ARRAY(SELECT jsonb_array_elements_text(progress->'checkins'))
          FROM "ChallengeParticipation" WHERE id = 'cp1'`)
      )[0]
    );
    return;
  }
  check(
    "three JSON submissions became three rows; APPROVED keeps its reviewer and URL; a deleted reviewer becomes null",
    [
      ["sub_a", "u1", "ch1", "cp1", "First evidence", "https://example.test/a", "APPROVED", "Good", "adm", "2026-11-03 09:00:00", "2026-11-02 10:00:00"],
      ["sub_b", "u1", "ch1", "cp1", "Second evidence", null, "PENDING", null, null, null, "2026-11-04 10:00:00"],
      ["sub_c", "u1", "ch1", "cp1", "Third", null, "REJECTED", null, null, "2026-11-06 09:00:00", "2026-11-05 10:00:00"],
    ],
    await rows(`
      SELECT "legacyId", "userId", "challengeId", "participationId", text, url, status::text, feedback, "reviewedById",
             to_char("reviewedAt", 'YYYY-MM-DD HH24:MI:SS'), to_char("createdAt", 'YYYY-MM-DD HH24:MI:SS')
      FROM "EvidenceSubmission" ORDER BY "legacyId"`)
  );
  check("cp1's progress keeps only its check-ins", [[{ checkins: ["2026-11-01"] }]], await rows(`SELECT progress FROM "ChallengeParticipation" WHERE id = 'cp1'`));
}

// ─── checks: what the rules refuse (both modes; each in a rolled-back transaction) ──

/**
 * Runs `body` in a transaction that is always rolled back, so the database is
 * left as the migrations made it. Every row it makes has an id starting rh_.
 */
async function scenario(title, body) {
  heading(title);
  await db.query("BEGIN");
  try {
    await body({ exec, refused, accepted, returns });
  } catch (e) {
    check("the scenario's set-up runs", "no error", `error: ${e.message}`);
  } finally {
    await db.query("ROLLBACK").catch(() => {});
  }
}

const exec = (sql, params) => db.query(sql, params);

async function refused(name, sql, constraint, params) {
  await db.query("SAVEPOINT rh");
  let actual;
  try {
    await db.query(sql, params);
    actual = "accepted";
  } catch (e) {
    actual = e.constraint ? `refused by ${e.constraint}` : `error: ${e.message}`;
  }
  await db.query("ROLLBACK TO SAVEPOINT rh");
  check(name, `refused by ${constraint}`, actual);
}

async function accepted(name, sql, params) {
  await db.query("SAVEPOINT rh");
  try {
    await db.query(sql, params);
    await db.query("RELEASE SAVEPOINT rh");
    check(name, "accepted", "accepted");
  } catch (e) {
    await db.query("ROLLBACK TO SAVEPOINT rh");
    check(name, "accepted", e.constraint ? `refused by ${e.constraint}` : `error: ${e.message}`);
  }
}

async function returns(name, sql, expected, params) {
  check(name, expected, (await db.query({ text: sql, values: params, rowMode: "array" })).rows);
}

const user = (id) => exec(`INSERT INTO "User" (id, email, "updatedAt") VALUES ($1, $2, now())`, [id, `${id.replace(/_/g, "-")}@rehearse.example.test`]);
const mentor = async (id) => {
  await exec(`INSERT INTO "Instructor" (id, slug, name, bio, "updatedAt") VALUES ($1, $2, 'Rehearsal mentor', 'b', now())`, [`${id}_i`, id.replace(/_/g, "-")]);
  await exec(`INSERT INTO "MentorProfile" (id, "instructorId", "updatedAt") VALUES ($1, $2, now())`, [id, `${id}_i`]);
};
const oneToOne = (id, status, from, to, mentorId = "rh_mp") =>
  `INSERT INTO "LiveEvent" (id, "kindId", mode, title, "descriptionMd", status, visibility, "mentorId", "startsAt", "endsAt", timezone, capacity, "updatedAt")
   VALUES ('${id}', 'evk_one_to_one', 'ONE_TO_ONE', 'Session', 'x', '${status}', 'PRIVATE', '${mentorId}', '${from}', '${to}', 'Asia/Kolkata', 1, now())`;

async function behaviourChecks() {
  await scenario("Behaviour: notification coalescing (e.5)", async (t) => {
    await user("rh_u");
    const notify = (id, title) =>
      db.query({
        text: `INSERT INTO "Notification" (id, "userId", type, title, "groupKey", topic) VALUES ($1, 'rh_u', 'COMMUNITY', $2, 'reply:rh', 'community.reply')
               ON CONFLICT ("userId", "groupKey") WHERE "groupKey" IS NOT NULL AND "readAt" IS NULL AND "archivedAt" IS NULL
               DO UPDATE SET "groupCount" = "Notification"."groupCount" + 1, title = EXCLUDED.title
               RETURNING id, "groupCount", (xmax = 0) AS inserted`,
        values: [id, title],
        rowMode: "array",
      });
    check("the first notice inserts a row with count 1", [["rh_n1", 1, true]], (await notify("rh_n1", "1 reply")).rows);
    check("a second one updates the same row to count 2", [["rh_n1", 2, false]], (await notify("rh_n2", "2 replies")).rows);
    await t.exec(`UPDATE "Notification" SET "readAt" = now() WHERE id = 'rh_n1'`);
    check("once that row is read, a new notice starts a new row", [["rh_n3", 1, true]], (await notify("rh_n3", "1 reply")).rows);
  });

  await scenario("Behaviour: mentor double booking (000800)", async (t) => {
    await mentor("rh_mp");
    await t.accepted("a scheduled session 10:00–11:00", oneToOne("rh_le1", "SCHEDULED", "2030-01-07 10:00", "2030-01-07 11:00"));
    await t.accepted("a back-to-back session 11:00–12:00", oneToOne("rh_le2", "SCHEDULED", "2030-01-07 11:00", "2030-01-07 12:00"));
    await t.refused(
      "an overlapping SUBMITTED session 10:30–11:30",
      oneToOne("rh_le3", "SUBMITTED", "2030-01-07 10:30", "2030-01-07 11:30"),
      "LiveEvent_mentor_no_overlap"
    );
    await t.accepted("an overlapping CANCELLED session 10:30–11:30", oneToOne("rh_le4", "CANCELLED", "2030-01-07 10:30", "2030-01-07 11:30"));
  });

  await scenario("Behaviour: live events and kinds (000300)", async (t) => {
    await t.refused(
      "a one-to-one event with capacity 2",
      `INSERT INTO "LiveEvent" (id, "kindId", mode, title, "descriptionMd", status, visibility, "startsAt", "endsAt", timezone, capacity, "updatedAt")
       VALUES ('rh_le5', 'evk_one_to_one', 'ONE_TO_ONE', 'S', 'x', 'DRAFT', 'PRIVATE', '2030-01-08 10:00', '2030-01-08 11:00', 'Asia/Kolkata', 2, now())`,
      "LiveEvent_one_to_one_shape"
    );
    await t.refused(
      "a listed event with no slug",
      `INSERT INTO "LiveEvent" (id, "kindId", mode, title, "descriptionMd", status, visibility, "startsAt", "endsAt", timezone, "updatedAt")
       VALUES ('rh_le6', 'evk_one_to_one', 'GROUP', 'G', 'x', 'DRAFT', 'MEMBERS', '2030-01-08 10:00', '2030-01-08 11:00', 'Asia/Kolkata', now())`,
      "LiveEvent_listed_has_slug"
    );
    await t.refused(
      "a second ONE_TO_ONE event kind",
      `INSERT INTO "EventKind" (id, slug, name, mode, "updatedAt") VALUES ('rh_evk', 'rh-one-to-one', 'Second', 'ONE_TO_ONE', now())`,
      "EventKind_one_to_one_key"
    );
  });

  await scenario("Behaviour: booking rules and revenue terms (000300)", async (t) => {
    await mentor("rh_mp");
    await t.refused("a 200-hour cancellation window", `UPDATE "MentorProfile" SET "cancellationHours" = 200 WHERE id = 'rh_mp'`, "MentorProfile_booking_rules_range");
    await t.accepted("no cancellation window (NULL)", `UPDATE "MentorProfile" SET "cancellationHours" = NULL WHERE id = 'rh_mp'`);
    await t.accepted("a 48-hour cancellation window", `UPDATE "MentorProfile" SET "cancellationHours" = 48 WHERE id = 'rh_mp'`);
    await t.refused(
      "a 400-day hold",
      `INSERT INTO "RevenueShareAgreement" (id, scope, "contributorShareBps", version, "termsMd", "effectiveFrom", "holdDays")
       VALUES ('rh_r1', 'MENTORING', 7000, 9001, 't', now(), 400)`,
      "RevenueShareAgreement_terms_range"
    );
    await t.accepted(
      "in-range terms (14-day hold, minimum payout, 24-hour refund window)",
      `INSERT INTO "RevenueShareAgreement" (id, scope, "contributorShareBps", version, "termsMd", "effectiveFrom", "holdDays", "minPayoutCents", "refundWindowHours")
       VALUES ('rh_r2', 'MENTORING', 7000, 9001, 't', now(), 14, 50000, 24)`
    );
    await t.accepted(
      "terms left unset (NULL)",
      `INSERT INTO "RevenueShareAgreement" (id, scope, "contributorShareBps", version, "termsMd", "effectiveFrom") VALUES ('rh_r3', 'EVENT', 6000, 9001, 't', now())`
    );
    await t.refused(
      "a second default agreement for the same scope and version",
      `INSERT INTO "RevenueShareAgreement" (id, scope, "contributorShareBps", version, "termsMd", "effectiveFrom") VALUES ('rh_r4', 'EVENT', 6500, 9001, 't', now())`,
      "RevenueShareAgreement_default_key"
    );
  });

  await scenario("Behaviour: contributor money (000300)", async (t) => {
    await user("rh_c");
    await t.exec(`INSERT INTO "ContributorAccount" (id, "userId", "termsVersion", "termsAcceptedAt", "updatedAt") VALUES ('rh_ca', 'rh_c', 'v1', now(), now())`);
    await t.exec(
      `INSERT INTO "RevenueShareAgreement" (id, "contributorId", scope, "contributorShareBps", version, "termsMd", "effectiveFrom") VALUES ('rh_rsa', 'rh_ca', 'MENTORING', 7000, 1, 't', now())`
    );
    await t.exec(`INSERT INTO "Product" (id, slug, kind, name, description, "updatedAt") VALUES ('rh_prod', 'rh-product', 'DIGITAL', 'P', 'd', now())`);
    await user("rh_buyer");
    await t.exec(`INSERT INTO "Order" (id, "userId", status, "totalFiatCents", "updatedAt") VALUES ('rh_o', 'rh_buyer', 'PAID', 1000, now())`);
    await t.exec(`INSERT INTO "OrderItem" (id, "orderId", "productId", qty) VALUES ('rh_oi', 'rh_o', 'rh_prod', 1)`);
    const earning = (id, amount) =>
      `INSERT INTO "ContributorEarning" (id, "contributorId", scope, "orderId", "orderItemId", "baseCents", "shareBps", "amountCents", "agreementId", "holdUntil")
       VALUES ('${id}', 'rh_ca', 'MENTORING', 'rh_o', 'rh_oi', 1000, 7000, ${amount}, 'rh_rsa', now())`;
    await t.refused("an earning above its base amount", earning("rh_ce1", 2000), "ContributorEarning_amount_range");
    await t.accepted("an earning within its base amount", earning("rh_ce2", 700));
    await t.refused(
      "a payout with no payee",
      `INSERT INTO "PayoutRequest" (id, "amountCents", method) VALUES ('rh_pr1', 100, '{"type":"UPI"}')`,
      "PayoutRequest_one_payee"
    );
    await t.refused(
      "a payout with two payees",
      `INSERT INTO "PayoutRequest" (id, "affiliateId", "contributorId", "amountCents", method) VALUES ('rh_pr2', 'rh-affiliate', 'rh_ca', 100, '{"type":"UPI"}')`,
      "PayoutRequest_one_payee"
    );
    await t.accepted(
      "a payout to the contributor",
      `INSERT INTO "PayoutRequest" (id, "contributorId", "amountCents", method) VALUES ('rh_pr3', 'rh_ca', 100, '{"type":"UPI"}')`
    );
  });

  await scenario("Behaviour: account deletion keeps contributor records (000300, RESTRICT)", async (t) => {
    await user("rh_d");
    await t.exec(`INSERT INTO "ContributorAccount" (id, "userId", "termsVersion", "termsAcceptedAt", "updatedAt") VALUES ('rh_da', 'rh_d', 'v1', now(), now())`);
    await t.refused("deleting a user who has a ContributorAccount", `DELETE FROM "User" WHERE id = 'rh_d'`, "ContributorAccount_userId_fkey");
    await t.accepted("deleting the account first", `DELETE FROM "ContributorAccount" WHERE id = 'rh_da'`);
    await t.accepted("then the user", `DELETE FROM "User" WHERE id = 'rh_d'`);
  });

  await scenario("Behaviour: community rules (000500)", async (t) => {
    await user("rh_u1");
    await user("rh_u2");
    await t.refused("a member following themselves", `INSERT INTO "Follow" ("followerId", "followingId") VALUES ('rh_u1', 'rh_u1')`, "Follow_not_self");
    await t.accepted("a member following another", `INSERT INTO "Follow" ("followerId", "followingId") VALUES ('rh_u1', 'rh_u2')`);
    await t.exec(
      `INSERT INTO "CommunityPost" (id, "authorId", title, body, "updatedAt") VALUES ('rh_p1', 'rh_u1', 'Hi', 'b', now()), ('rh_p2', 'rh_u1', 'Hi again', 'b', now())`
    );
    await t.accepted("a first introduction", `UPDATE "CommunityPost" SET kind = 'INTRODUCTION' WHERE id = 'rh_p1'`);
    await t.refused("a second introduction", `UPDATE "CommunityPost" SET kind = 'INTRODUCTION' WHERE id = 'rh_p2'`, "CommunityPost_introduction_key");
    await t.exec(`INSERT INTO "CommunityGroup" (id, slug, name, description) VALUES ('rh_g', 'rh-group', 'Group', 'd')`);
    await t.exec(`INSERT INTO "GroupMembership" (id, "groupId", "userId") VALUES ('rh_gm1', 'rh_g', 'rh_u1'), ('rh_gm2', 'rh_g', 'rh_u2')`);
    await t.accepted("a group owner", `UPDATE "GroupMembership" SET role = 'OWNER' WHERE id = 'rh_gm1'`);
    await t.refused("a second group owner", `UPDATE "GroupMembership" SET role = 'OWNER' WHERE id = 'rh_gm2'`, "GroupMembership_owner_key");
    await t.exec(`INSERT INTO "CommunityPost" (id, "authorId", "groupId", title, body, "updatedAt") VALUES ('rh_p3', 'rh_u2', 'rh_g', 'In the group', 'b', now())`);
    await t.refused("deleting a group that has posts", `DELETE FROM "CommunityGroup" WHERE id = 'rh_g'`, "CommunityPost_groupId_fkey");
  });

  await scenario("Behaviour: editorial and resources (000300, 000700)", async (t) => {
    await t.refused(
      "publishing a success story without a testimonial",
      `INSERT INTO "Post" (id, slug, title, excerpt, "contentMd", "publishedAt", status, kind, "updatedAt")
       VALUES ('rh_post', 'rh-story', 'Story', 'e', 'c', now(), 'PUBLISHED', 'SUCCESS_STORY', now())`,
      "Post_story_has_testimonial"
    );
    await t.accepted(
      "a success story kept as a draft",
      `INSERT INTO "Post" (id, slug, title, excerpt, "contentMd", status, kind, "updatedAt") VALUES ('rh_post2', 'rh-story-draft', 'Story', 'e', 'c', 'DRAFT', 'SUCCESS_STORY', now())`
    );
    await t.refused("a resource with no owner", `INSERT INTO "Resource" (id, title, url) VALUES ('rh_res', 'R', 'https://example.test')`, "Resource_one_owner");
    await user("rh_app");
    const apply = (id) =>
      `INSERT INTO "ContributorApplication" (id, "userId", kind, answers, "termsVersion", "termsAcceptedAt", "updatedAt") VALUES ('${id}', 'rh_app', 'MENTOR', '{}', 'v1', now(), now())`;
    await t.accepted("an open contributor application", apply("rh_app1"));
    await t.refused("a second open application of the same kind", apply("rh_app2"), "ContributorApplication_open_key");
    await t.exec(
      `INSERT INTO "LiveEvent" (id, slug, "kindId", mode, title, "descriptionMd", status, visibility, "startsAt", "endsAt", timezone, "updatedAt")
       VALUES ('rh_ev', 'rh-event', 'evk_one_to_one', 'GROUP', 'Workshop', 'x', 'SCHEDULED', 'MEMBERS', '2030-01-09 10:00', '2030-01-09 11:00', 'Asia/Kolkata', now())`
    );
    await t.refused(
      "a dispute resolved before it was opened",
      `INSERT INTO "EventRegistration" (id, "eventId", "userId", "attendanceDisputeResolvedAt", "updatedAt") VALUES ('rh_reg', 'rh_ev', 'rh_app', now(), now())`,
      "EventRegistration_dispute_order"
    );
  });

  await scenario("Behaviour: full-text search (000700)", async (t) => {
    await t.exec(
      `INSERT INTO "Post" (id, slug, title, excerpt, "contentMd", "publishedAt", status, "updatedAt") VALUES
         ('rh_s1', 'rh-published', 'Rehearsal', 'e', 'About quillwort and more', now() - interval '1 day', 'PUBLISHED', now()),
         ('rh_s2', 'rh-draft', 'Rehearsal draft', 'e', 'Also about quillwort', NULL, 'DRAFT', now())`
    );
    await t.returns(
      "a published post is found by a word in its body, a draft is not",
      `SELECT slug FROM "Post" WHERE "searchVector" @@ websearch_to_tsquery('english', 'quillwort') AND status = 'PUBLISHED'`,
      [["rh-published"]]
    );
  });
}

// ─── the drift check (both modes) ───────────────────────────────────────────

async function driftCheck(name) {
  heading("Drift: the migrated database against schema.prisma");
  // The address, password included, goes to prisma only through DATABASE_URL, which
  // the schema's datasource reads: any local user can read a command line (ps,
  // /proc/<pid>/cmdline), but not another user's environment.
  const url = urlFor(name);
  const r = await run(PRISMA, ["migrate", "diff", "--from-schema-datasource", SCHEMA, "--to-schema-datamodel", SCHEMA, "--script"], {
    cwd: join(ROOT, "packages/db"),
    env: childEnv({ DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, CHECKPOINT_DISABLE: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1" }),
  });
  if (r.code !== 0) {
    check("prisma migrate diff runs", "exit 0", `exit ${r.code ?? r.signal}: ${(r.err || r.out).trim()}`);
    return;
  }
  const lines = r.out.split("\n").map((l) => l.replace(/\r$/, ""));
  const statements = lines.filter((l) => l.trim() !== "" && !l.trimStart().startsWith("--"));
  const allowed = statements.filter((l) => ALLOWED_DRIFT.has(l));
  const left = statements.filter((l) => !ALLOWED_DRIFT.has(l));
  console.log(`      (${allowed.length} of the 5 known searchVector lines were reported and set aside)`);
  if (!check("nothing differs but the five generated searchVector columns", [], left)) {
    console.log(`      what prisma migrate diff would still change:\n${left.map((l) => `        ${l}`).join("\n")}`);
  }
}

// Last, so every constant above is defined before anything runs.
process.exitCode = await main();
