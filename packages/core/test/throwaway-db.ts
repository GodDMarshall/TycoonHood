/**
 * THROWAWAY DATABASES — for tests that run the real migration and seed scripts
 * the way a deploy runs them: as separate processes, against a database built
 * from nothing.
 *
 * Each database lives on the test server, named after the test database with a
 * tag inserted and "_test" kept at the end (tycoonhood_test becomes
 * tycoonhood_rerun_1a2b3c_test), so the setup guard's naming rule holds for it
 * too. The test that makes one drops it.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { prisma, clientFor, type PrismaClient } from "@tycoonhood/db";

export const REPO_ROOT = resolve(__dirname, "../../..");
export const DB_PACKAGE = resolve(REPO_ROOT, "packages/db");
const TSX_CLI = createRequire(import.meta.url).resolve("tsx/cli");

/** The seeds a production deploy runs, in its order (scripts/vercel-build.sh). */
export const DEPLOY_SEEDS = [
  "src/seed.ts",
  "src/seed-academy.ts",
  "src/seed-content.ts",
  "src/seed-shop.ts",
  "src/seed-community.ts",
] as const;

/** The admin every seeded throwaway database gets, unless a test says otherwise. */
export const SEED_ADMIN = { ADMIN_EMAIL: "admin@tycoonhood.test", ADMIN_PASSWORD: "a-long-test-admin-password" };

export interface Throwaway {
  name: string;
  url: string;
  /** A client of its own for this database. drop() disconnects it. */
  db: PrismaClient;
  drop: () => Promise<void>;
}

export async function createThrowawayDb(tag: string): Promise<Throwaway> {
  if (!/^[a-z0-9]{1,12}$/.test(tag)) throw new Error(`Bad tag "${tag}"`);
  const base = new URL(process.env.DATABASE_URL ?? "");
  const stem = base.pathname.replace(/^\//, "").replace(/_test$/, "");
  const name = `${stem}_${tag}_${randomBytes(3).toString("hex")}_test`;
  // The name is built here from [a-z0-9_] only, so quoting it is enough.
  await prisma.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = new URL(base.toString());
  url.pathname = `/${name}`;
  const db = clientFor(url.toString());
  return {
    name,
    url: url.toString(),
    db,
    drop: async () => {
      await db.$disconnect().catch(() => {});
      await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    },
  };
}

export interface RunResult {
  code: number | null;
  output: string;
}

/** The environment a script sees: this database, a known admin, no direct-URL override. */
export function scriptEnv(url: string, env: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...process.env, ...SEED_ADMIN, ALLOW_DEFAULT_ADMIN: undefined, ...env, DATABASE_URL: url };
  delete out.DATABASE_URL_UNPOOLED;
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

/** Starts a command and collects everything it prints, stdout and stderr together. */
export function start(cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }) {
  const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (b: Buffer) => (output += b.toString()));
  child.stderr.on("data", (b: Buffer) => (output += b.toString()));
  const done = new Promise<RunResult>((res) => child.on("close", (code) => res({ code, output })));
  return { child, done, output: () => output };
}

/** Runs one script from packages/db with tsx, as `pnpm --filter @tycoonhood/db <script>` does. */
export function startDbScript(script: string, url: string, env: Record<string, string | undefined> = {}) {
  return start(process.execPath, [TSX_CLI, script], { cwd: DB_PACKAGE, env: scriptEnv(url, env) });
}

export async function runDbScript(script: string, url: string, env: Record<string, string | undefined> = {}) {
  return startDbScript(script, url, env).done;
}

/** Runs a script and fails the test with its output when it does not exit 0. */
export async function mustRun(script: string, url: string, env: Record<string, string | undefined> = {}) {
  const r = await runDbScript(script, url, env);
  if (r.code !== 0) throw new Error(`${script} exited ${r.code}:\n${r.output}`);
  return r.output;
}

export const migrate = (t: Throwaway) => mustRun("scripts/migrate-sql.ts", t.url);

/** The five deploy seeds, in order, stopping at the first failure. */
export async function seedAll(t: Throwaway, env: Record<string, string | undefined> = {}) {
  for (const s of DEPLOY_SEEDS) await mustRun(s, t.url, env);
}

/** The command line for tsx, for tests that build their own shell command. */
export const TSX = TSX_CLI;

// ───────────────────────────────────────────── snapshots

/** Every row of every table (but the migration log), as JSON text, by table. */
export type Snapshot = Record<string, { pk: string[]; rows: Record<string, unknown>[] }>;

export async function snapshot(db: PrismaClient): Promise<Snapshot> {
  const tables = await db.$queryRaw<{ table_name: string }[]>`
    SELECT table_name::text FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
    ORDER BY table_name`;
  const snap: Snapshot = {};
  for (const { table_name: t } of tables) {
    const pk = await db.$queryRawUnsafe<{ col: string }[]>(
      `SELECT a.attname::text AS col FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = '"${t}"'::regclass AND i.indisprimary ORDER BY a.attnum`
    );
    const rows = await db.$queryRawUnsafe<{ j: string }[]>(`SELECT row_to_json(t)::text AS j FROM "${t}" t`);
    snap[t] = { pk: pk.map((p) => p.col), rows: rows.map((r) => JSON.parse(r.j) as Record<string, unknown>) };
  }
  return snap;
}

const show = (v: unknown) => {
  const s = JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
};

/**
 * What changed between two snapshots, one line per row, naming the row by its
 * slug, code, email or key where it has one, and listing each changed column
 * as before → after. Empty when nothing changed.
 */
export function changes(before: Snapshot, after: Snapshot): string[] {
  const out: string[] = [];
  for (const table of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const pk = (before[table] ?? after[table]).pk;
    const keyOf = (r: Record<string, unknown>) => (pk.length ? pk.map((c) => String(r[c])).join("|") : JSON.stringify(r));
    const label = (r: Record<string, unknown>) => {
      const name = r.slug ?? r.code ?? r.email ?? r.sku ?? r.key ?? r.username ?? r.type ?? r.title;
      return `${table}[${name ?? keyOf(r)}]`;
    };
    const a = new Map((before[table]?.rows ?? []).map((r) => [keyOf(r), r]));
    const b = new Map((after[table]?.rows ?? []).map((r) => [keyOf(r), r]));
    for (const [k, r] of a) if (!b.has(k)) out.push(`${label(r)} deleted`);
    for (const [k, r] of b) if (!a.has(k)) out.push(`${label(r)} added`);
    for (const [k, r] of a) {
      const s = b.get(k);
      if (!s) continue;
      const cols = Object.keys({ ...r, ...s }).filter((c) => JSON.stringify(r[c]) !== JSON.stringify(s[c]));
      if (cols.length) out.push(`${label(r)}: ${cols.map((c) => `${c} ${show(r[c])} → ${show(s[c])}`).join("; ")}`);
    }
  }
  return out;
}
