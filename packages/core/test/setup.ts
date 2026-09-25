// Load DATABASE_URL from the repo-root .env without adding a dotenv dependency.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(resolve(__dirname, "../../../.env"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    throw new Error("DATABASE_URL not set and no .env found at repo root");
  }
}

/**
 * PRODUCTION GUARD — tests create users, move THC, and mutate challenges.
 * Pointing them at a live database would corrupt real member data, so the
 * suite refuses to run unless the target is explicitly a dev/test database.
 * Override deliberately with ALLOW_TESTS_ON_THIS_DB=1 (never in CI against prod).
 */
const url = process.env.DATABASE_URL ?? "";
const host = (() => {
  try { return new URL(url).host; } catch { return ""; }
})();
const dbName = (() => {
  try { return new URL(url).pathname.replace(/^\//, "").split("?")[0]; } catch { return ""; }
})();
const isLocal = /^(localhost|127\.0\.0\.1|::1|host\.docker\.internal)(:|$)/.test(host);
const isNamedSafe = /(_dev|_test|_local|-dev|-test)$/.test(dbName) || dbName === "tycoonhood_dev";

if (!process.env.ALLOW_TESTS_ON_THIS_DB && !(isLocal || isNamedSafe)) {
  throw new Error(
    `Refusing to run tests against "${host}/${dbName}" — it does not look like a dev or test database. ` +
      `Tests write real rows. Point DATABASE_URL at a throwaway database, or set ALLOW_TESTS_ON_THIS_DB=1 if you are certain.`
  );
}
