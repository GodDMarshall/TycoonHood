/**
 * THE MIGRATION REHEARSAL NEVER PASSES A RULE THAT HAD NOTHING TO CHECK
 * (review finding safety-F2).
 *
 * scripts/db/rehearse-migrations.mjs --from <database> migrates a copy of a
 * database and checks rules every row must meet: each completion's
 * occurrence, each order's paid time, no session keeping an unkeyed IP
 * hash. A rule over a table with no rows proves nothing about real data, so
 * it is reported NOT EXERCISED, never PASS, and the rehearsal fails unless
 * --allow-empty accepts that.
 *
 * The source here is a throwaway database at the base migrations (those
 * before 20261113000000), applied and recorded by the real runner, with no
 * rows: no backfill of the living-ecosystem migrations has anything to work
 * on. The empty-database mode, whose fixture rows give every rule something
 * to check, is the control.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createThrowawayDb, scriptEnv, start, DB_PACKAGE, REPO_ROOT, TSX, type Throwaway } from "./throwaway-db";

const SLOW = 180_000;
const MIGRATIONS = resolve(DB_PACKAGE, "prisma/migrations");
const FIRST_NEW = "20261113000000";
const REHEARSE = resolve(REPO_ROOT, "scripts/db/rehearse-migrations.mjs");

/** Runs the rehearsal with these arguments, on the test database's server. */
const rehearse = (...args: string[]) => start(process.execPath, [REHEARSE, ...args], { cwd: REPO_ROOT, env: { ...process.env } }).done;

/** Applies the base migrations to `t` with the real runner, which reads prisma/migrations under its working directory. */
async function atBaseMigrations(t: Throwaway) {
  const dir = mkdtempSync(join(tmpdir(), "rehearse-base-"));
  try {
    mkdirSync(join(dir, "prisma/migrations"), { recursive: true });
    for (const name of readdirSync(MIGRATIONS).filter((f) => f < FIRST_NEW)) {
      cpSync(join(MIGRATIONS, name), join(dir, "prisma/migrations", name), { recursive: true });
    }
    const r = await start(process.execPath, [TSX, resolve(DB_PACKAGE, "scripts/migrate-sql.ts")], { cwd: dir, env: scriptEnv(t.url) }).done;
    if (r.code !== 0) throw new Error(`migrate-sql.ts exited ${r.code}:\n${r.output}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The rules a rehearsal's output reports with no rows checked: "(0 X rows checked)" and the like. */
const overNoRows = (output: string, verdict: string) =>
  output.split("\n").filter((l) => l.startsWith(`${verdict}  `) && /\((?:[^()]* and )?0 [^()]*checked\)/.test(l));

describe("the rehearsal's copy mode, from a database with no rows", () => {
  let source: Throwaway;

  beforeAll(async () => {
    source = await createThrowawayDb("rehsrc");
    await atBaseMigrations(source);
  }, SLOW);
  afterAll(async () => {
    await source?.drop();
  });

  it("reports each rule that had no rows as NOT EXERCISED, never PASS, and fails", async () => {
    const r = await rehearse("--from", source.name);

    expect(overNoRows(r.output, "PASS")).toEqual([]);
    const idle = overNoRows(r.output, "NOT EXERCISED").join("\n");
    // The backfills the review named: no rows to check in an empty copy.
    expect(idle).toMatch(/every community post takes its group's academy.*\(0 CommunityPost rows checked\)/);
    expect(idle).toMatch(/every post's last activity.*\(0 CommunityPost rows checked\)/);
    expect(idle).toMatch(/XP events take the academy.*\(0 XpEvent rows checked\)/);
    expect(idle).toMatch(/academy memberships are exactly.*\(0 Enrollment rows checked\)/);
    expect(idle).toMatch(/every completion's occurrence.*\(0 MissionCompletion rows checked\)/);
    expect(idle).toMatch(/Order\.paidAt.*\(0 Order rows checked\)/);
    expect(idle).toMatch(/no referral keeps a signup IP.*\(0 Referral rows and 0 Session rows checked\)/);
    expect(idle).toMatch(/until 000900 lands.*\(0 JSON submissions checked\)/);
    // A rule with rows still passes: the migration inserts the four academies.
    expect(r.output).toMatch(/^PASS {2}each academy's flagship .*\(4 Academy rows checked\)$/m);
    // The summary says what was not exercised and does not read as a pass.
    const n = overNoRows(r.output, "NOT EXERCISED").length;
    expect(r.output).toMatch(new RegExp(`^FAILED: \\d+ checks, \\d+ passed, 0 failed, ${n} not exercised\\.$`, "m"));
    expect(r.output).toContain("--allow-empty");
    expect(r.code).toBe(1);
  }, SLOW);

  it("with --allow-empty, still lists them, and passes", async () => {
    const r = await rehearse("--from", source.name, "--allow-empty");

    expect(overNoRows(r.output, "PASS")).toEqual([]);
    const n = overNoRows(r.output, "NOT EXERCISED").length;
    expect(n).toBeGreaterThan(0);
    expect(r.output).toMatch(/every completion's occurrence.*\(0 MissionCompletion rows checked\)/);
    expect(r.output).toMatch(new RegExp(`^PASSED: \\d+ checks, \\d+ passed, 0 failed, ${n} not exercised \\(--allow-empty\\)\\.$`, "m"));
    expect(r.code).toBe(0);
  }, SLOW);
});

describe("the rehearsal's empty-database mode", () => {
  it("gives every rule fixture rows to check, and passes", async () => {
    const r = await rehearse();

    expect(r.output).not.toMatch(/^NOT EXERCISED/m);
    expect(overNoRows(r.output, "PASS")).toEqual([]);
    expect(r.output).toMatch(/^PASSED: \d+ checks, \d+ passed, 0 failed\.$/m);
    expect(r.code).toBe(0);
  }, SLOW);
});
