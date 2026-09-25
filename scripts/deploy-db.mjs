#!/usr/bin/env node
/**
 * TYCOONHOOD — PRODUCTION DATABASE DEPLOY
 *
 * Everything that can be automated on the database side, in one command:
 *
 *   DATABASE_URL="postgresql://...neon.tech/tycoonhood?sslmode=require" \
 *   ADMIN_EMAIL="you@yourdomain.com" \
 *   ADMIN_PASSWORD="<a real password>" \
 *   node scripts/deploy-db.mjs
 *
 * It will:
 *   1. refuse to run without a real admin password
 *   2. report exactly what it is about to touch, and whether the DB is empty
 *   3. apply migrations (engine-free — no Prisma binaries required)
 *   4. seed in the only safe order: base -> academy -> content
 *   5. run the 26-check verification against the live database
 *
 * It stops at the first failure and tells you which step failed. It never
 * pretends a step succeeded.
 *
 * Vercel deployment itself stays manual on purpose: it needs your account,
 * and a script that "deploys" without credentials would be theatre.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL;
const bail = (msg) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

console.log("\n═══════════ TYCOONHOOD — PRODUCTION DATABASE DEPLOY ═══════════\n");

if (!url) bail("DATABASE_URL is not set.");
const redacted = url.replace(/:[^:@]+@/, ":****@");
const looksProd = /neon\.tech|supabase|rds\.amazonaws|railway|render\.com/i.test(url);

if (looksProd && !process.env.ADMIN_PASSWORD) {
  bail(
    "ADMIN_PASSWORD is not set and this looks like a production database.\n" +
      "  The development default is published in this repository — anyone could sign in as admin.\n" +
      "  Set ADMIN_EMAIL and ADMIN_PASSWORD, then re-run."
  );
}
if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12) {
  bail("ADMIN_PASSWORD is shorter than 12 characters. Use something you'd defend in court.");
}

// ── 1. inspect the target before touching it ────────────────────────────────
const client = new pg.Client({
  connectionString: url,
  ssl: looksProd ? { rejectUnauthorized: false } : undefined,
});
try {
  await client.connect();
} catch (e) {
  bail(`Cannot reach the database:\n  ${e.message}`);
}

const { rows: t } = await client.query(
  `select count(*)::int as n from information_schema.tables where table_schema='public'`
);
let existingUsers = 0;
if (t[0].n > 0) {
  try {
    const r = await client.query(`select count(*)::int as n from "User"`);
    existingUsers = r.rows[0].n;
  } catch {
    /* schema not yet applied */
  }
}
await client.end();

console.log(`  target      : ${redacted}`);
console.log(`  tables      : ${t[0].n}`);
console.log(`  users       : ${existingUsers}`);
console.log(`  admin email : ${process.env.ADMIN_EMAIL ?? "(unset — seed default)"}`);
console.log(`  mode        : ${looksProd ? "PRODUCTION" : "local/dev"}\n`);

if (existingUsers > 1) {
  console.log(
    "  ⚠ This database already holds members. Seeds are upserts and will not\n" +
      "    delete member data, but the academy seed REBUILDS course modules.\n" +
      "    Take a snapshot first if this database is live.\n"
  );
}

// ── 2. run each step, stopping at the first failure ─────────────────────────
const step = (label, cmd) => {
  process.stdout.write(`  → ${label} … `);
  try {
    execSync(cmd, { cwd: root, stdio: "pipe", env: process.env });
    console.log("done");
  } catch (e) {
    console.log("FAILED");
    console.error(`\n${(e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "")}`);
    bail(`Step failed: ${label}. Nothing after this point ran.`);
  }
};

step("apply migrations", "pnpm --filter @tycoonhood/db exec tsx scripts/migrate-sql.ts");
step("seed foundation (levels, ranks, ledger, missions)", "pnpm --filter @tycoonhood/db exec tsx src/seed.ts");
step("seed academy (4 courses, 24 lessons, quizzes)", "pnpm --filter @tycoonhood/db exec tsx src/seed-academy.ts");
step("seed content (essays, challenges, products)", "pnpm --filter @tycoonhood/db exec tsx src/seed-content.ts");

console.log("\n  → verifying the live database (26 end-to-end checks)\n");
try {
  execSync("pnpm --filter @tycoonhood/core exec tsx scripts/verify-platform.ts", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
} catch {
  bail("Verification failed against the deployed database. Do not open registration until this is green.");
}

console.log(`
═══════════ DATABASE READY ═══════════

Remaining steps that need your account (they cannot be scripted):

  1. Import this repository into Vercel twice:
       project A → root directory: .            (the web app)
       project B → root directory: apps/miner   (the Miner PWA)

  2. Set environment variables on BOTH projects (see .env.example):
       DATABASE_URL              the pooled connection string
       NEXT_PUBLIC_SITE_URL      https://your-domain
       NEXT_PUBLIC_MINER_URL     https://miner.your-domain
       NEXT_PUBLIC_MAIN_SITE_URL https://your-domain
       COOKIE_DOMAIN             .your-domain      (shared login across apps)

  3. Deploy. Then sign in at /login with the ADMIN_EMAIL and ADMIN_PASSWORD
     you used here, and confirm /admin loads.

Optional credentials, each of which switches a feature from
"development mode" to live — the platform runs correctly without them:
  STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET   card payments
  RESEND_API_KEY + MAIL_FROM                  real password-reset email
  DISCORD_PUBLIC_KEY/APP_ID/BOT_TOKEN/...     slash commands + rank roles
`);
