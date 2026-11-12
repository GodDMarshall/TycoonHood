/**
 * ENGINE-FREE MIGRATION APPLIER
 *
 * `prisma migrate deploy` is the primary path. It needs Prisma's engine
 * binaries, downloaded from binaries.prisma.sh at install time — which fails
 * in locked-down networks, air-gapped CI, and some container images.
 *
 * This applier does the same job with nothing but `pg`: it reads the same
 * prisma/migrations directory, applies each pending migration inside a
 * transaction, and records it in _prisma_migrations with the same checksum
 * scheme Prisma uses. Prisma will therefore consider the database up to date.
 *
 *   npx tsx scripts/migrate-sql.ts          apply pending migrations
 *   npx tsx scripts/migrate-sql.ts --status show state without changing anything
 *
 * Idempotent: already-applied migrations are skipped.
 *
 * ONE RUN AT A TIME (review finding 19). Two deploys can migrate the same
 * database at once: a redeploy while a build is still running, or two merges
 * close together. Two runs applying the same migration fail or half-apply it.
 * So for its whole run this script holds Postgres's advisory lock under
 * Prisma Migrate's own key. A second run, or a `prisma migrate deploy`, waits
 * for the first to finish, then finds nothing left to apply. It is a session
 * lock: released when the run ends, whether it succeeded or failed, and by
 * Postgres if the process dies.
 *
 * A session lock needs a direct connection. Taken through a pooler it belongs
 * to whichever server connection ran the query, and can outlive the run. So
 * the script connects with DATABASE_URL_UNPOOLED when it is set, else
 * DATABASE_URL, and refuses Neon's pooled address. scripts/with-db-lock.mjs,
 * which holds the deploy lock around a build's whole migrate-and-seed step,
 * follows the same rules.
 *
 * It picks that address with ./db-target.mjs, as the deploy lock does, and
 * says which variable it used. When DATABASE_URL and DATABASE_URL_UNPOOLED
 * name different databases it refuses, rather than migrate one while the
 * seeds, which read DATABASE_URL, fill the other. dotenv never replaces a
 * variable already set, so a shell's DATABASE_URL beside a .env holding
 * DATABASE_URL_UNPOOLED did exactly that (review finding 19, follow-up).
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { Client } from "pg";
import { databaseTarget, isPooled, redacted, type DatabaseTarget } from "./db-target.mjs";

const statusOnly = process.argv.includes("--status");

/** Prisma Migrate's advisory lock key, so this script and `prisma migrate deploy` never run at once. */
const MIGRATION_LOCK = 72707369;
/** How long a run waits for another before giving up, so a stuck run fails the deploy instead of hanging it. */
const LOCK_WAIT_MINUTES = 15;

// Load the database URLs from the repo root if the shell didn't provide one.
if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  const envPath = resolve(process.cwd(), "../../.env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
let target: DatabaseTarget;
try {
  target = databaseTarget();
} catch (e) {
  console.error(`${(e as Error).message} Nothing was changed.`);
  process.exit(1);
}
const { url, from } = target;
if (isPooled(url)) {
  console.error(
    `${from} is a pooled connection (its host name has "-pooler"). Migrations hold a lock for their whole run, ` +
      "and a lock taken through a pooler can outlive the run and stall the next deploy.\n" +
      'Set DATABASE_URL_UNPOOLED to the direct connection (the same address without "-pooler"), then run this again. ' +
      "Nothing was changed."
  );
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), "prisma/migrations");
if (!existsSync(migrationsDir)) {
  console.error(`No migrations directory at ${migrationsDir}`);
  process.exit(1);
}

const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()
  .map((name) => {
    const file = join(migrationsDir, name, "migration.sql");
    if (!existsSync(file)) throw new Error(`${name} has no migration.sql`);
    const sql = readFileSync(file, "utf8");
    return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  });

const client = new Client({
  connectionString: url,
  // Managed Postgres (Neon, Supabase, RDS) terminates TLS with its own chain.
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  // The connection sits idle while it waits for another run's lock. Probe it after
  // 10 seconds of silence, not the system's two hours, so a dropped connection is
  // noticed and the run fails instead of hanging.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  // Shown in pg_stat_activity, so whoever holds the lock can be found.
  application_name: "tycoonhood migrate-sql",
});

process.exitCode = await main();

async function main(): Promise<number> {
  try {
    await client.connect();
  } catch (e) {
    console.error(`Cannot reach the database: ${(e as Error).message}`);
    return 1;
  }
  try {
    await takeMigrationLock();
    return await migrate();
  } catch (e) {
    console.error(`\n  ${(e as Error).message}\n`);
    return 1;
  } finally {
    // Ending the session releases the lock as well; unlocking first says so plainly.
    await client.query("SELECT pg_advisory_unlock_all()").catch(() => {});
    await client.end().catch(() => {});
  }
}

/** Waits, saying so, while another run holds the lock. Taken before anything is read or created. */
async function takeMigrationLock() {
  const { rows } = await client.query<{ ok: boolean }>("SELECT pg_try_advisory_lock($1::bigint) AS ok", [MIGRATION_LOCK]);
  if (rows[0].ok) return;
  console.log("  Another migration run is applying migrations to this database. Waiting for it to finish …");
  const started = Date.now();
  await client.query(`SET lock_timeout = '${LOCK_WAIT_MINUTES}min'`);
  try {
    await client.query("SELECT pg_advisory_lock($1::bigint)", [MIGRATION_LOCK]);
  } catch (e) {
    if ((e as { code?: string }).code === "55P03") {
      throw new Error(
        `Gave up after ${LOCK_WAIT_MINUTES} minutes: another session still holds the migration lock. ` +
          'docs/DEPLOYMENT.md ("A deploy waits for the database lock") says how to find it. Nothing was changed.',
        { cause: e }
      );
    }
    throw e;
  }
  await client.query("RESET lock_timeout");
  console.log(`  It finished after ${Math.round((Date.now() - started) / 1000)}s. Carrying on.`);
}

async function migrate(): Promise<number> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                  varchar(36) PRIMARY KEY,
      checksum            varchar(64)  NOT NULL,
      finished_at         timestamptz,
      migration_name      varchar(255) NOT NULL,
      logs                text,
      rolled_back_at      timestamptz,
      started_at          timestamptz  NOT NULL DEFAULT now(),
      applied_steps_count integer      NOT NULL DEFAULT 0
    );
  `);

  const { rows: applied } = await client.query<{ migration_name: string; checksum: string }>(
    `SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  const appliedMap = new Map(applied.map((r) => [r.migration_name, r.checksum]));

  console.log(`\ndatabase: ${redacted(url)} (${from})`);
  console.log(`migrations on disk: ${migrations.length} · already applied: ${appliedMap.size}\n`);

  let drift = false;
  for (const m of migrations) {
    const known = appliedMap.get(m.name);
    if (known && known !== m.checksum) {
      console.error(`  ! ${m.name} — CHECKSUM MISMATCH: this migration was edited after being applied.`);
      drift = true;
    }
  }
  if (drift) {
    console.error("\nRefusing to continue. Editing an applied migration desynchronises environments.");
    return 1;
  }

  const pending = migrations.filter((m) => !appliedMap.has(m.name));

  if (statusOnly) {
    for (const m of migrations) {
      console.log(`  ${appliedMap.has(m.name) ? "✓ applied" : "· pending"}  ${m.name}`);
    }
    console.log(`\n${pending.length} pending.\n`);
    return 0;
  }

  if (pending.length === 0) {
    console.log("  Database is already up to date.\n");
    return 0;
  }

  for (const m of pending) {
    process.stdout.write(`  applying ${m.name} … `);
    try {
      await client.query("BEGIN");
      await client.query(m.sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         VALUES ($1, $2, now(), $3, now(), 1)`,
        [randomUUID(), m.checksum, m.name]
      );
      await client.query("COMMIT");
      console.log("ok");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.log("FAILED");
      console.error(`\n  ${(e as Error).message}\n`);
      console.error("  Rolled back. The database is unchanged by this migration.");
      return 1;
    }
  }

  console.log(`\n  ${pending.length} migration(s) applied.\n`);
  return 0;
}
