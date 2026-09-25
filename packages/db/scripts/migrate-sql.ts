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
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { Client } from "pg";

const statusOnly = process.argv.includes("--status");

// Load DATABASE_URL from the repo root if the shell didn't provide it.
if (!process.env.DATABASE_URL) {
  const envPath = resolve(process.cwd(), "../../.env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
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
});

await client.connect();

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

console.log(`\ndatabase: ${url.replace(/:[^:@]+@/, ":****@")}`);
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
  await client.end();
  process.exit(1);
}

const pending = migrations.filter((m) => !appliedMap.has(m.name));

if (statusOnly) {
  for (const m of migrations) {
    console.log(`  ${appliedMap.has(m.name) ? "✓ applied" : "· pending"}  ${m.name}`);
  }
  console.log(`\n${pending.length} pending.\n`);
  await client.end();
  process.exit(0);
}

if (pending.length === 0) {
  console.log("  Database is already up to date.\n");
  await client.end();
  process.exit(0);
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
    await client.query("ROLLBACK");
    console.log("FAILED");
    console.error(`\n  ${(e as Error).message}\n`);
    console.error("  Rolled back. The database is unchanged by this migration.");
    await client.end();
    process.exit(1);
  }
}

console.log(`\n  ${pending.length} migration(s) applied.\n`);
await client.end();
