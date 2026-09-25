/**
 * LAUNCH PREFLIGHT — the gate between "it builds" and "it is safe to point
 * the public at it".
 *
 * This is deliberately hostile. It assumes nothing, reads the real
 * environment and the real database, and it FAILS rather than warns on
 * anything that could hurt a member or the business on day one. A warning
 * here means "you will regret this"; a failure means "do not launch".
 *
 *   pnpm preflight
 *
 * Run it against the PRODUCTION environment, from a machine that can reach
 * the production database. It only reads.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env only when the variables are not already set, so a real
// deployment's environment always wins over a local file.
const envPath = resolve(process.cwd(), "../../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"\n\r]*)"?\r?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { prisma } = await import("@tycoonhood/db");

type Level = "FAIL" | "WARN" | "OK";
const results: { level: Level; area: string; label: string; detail: string }[] = [];
const add = (level: Level, area: string, label: string, detail = "") => {
  results.push({ level, area, label, detail });
};
/** Pass or fail one check in a single line, without a statement-position ternary. */
const check = (ok: boolean, area: string, label: string, okDetail = "", failDetail = "", failLevel: Level = "FAIL") => {
  add(ok ? "OK" : failLevel, area, label, ok ? okDetail : failDetail);
};

const env = (k: string) => (process.env[k] ?? "").trim();
const isProd = process.env.NODE_ENV === "production";

// ─────────────────────────────────────────────── 1. ENVIRONMENT
{
  const A = "Environment";
  check(isProd, A, isProd ? "NODE_ENV is production" : "NODE_ENV is not production",
    process.env.NODE_ENV ?? "",
    `got "${process.env.NODE_ENV ?? "(unset)"}" — this check is much weaker outside production`, "WARN");

  const db = env("DATABASE_URL");
  if (!db) add("FAIL", A, "DATABASE_URL is set");
  else if (!/^postgres(ql)?:\/\//.test(db)) add("FAIL", A, "DATABASE_URL is a Postgres URL", db.slice(0, 24) + "…");
  else if (isProd && /localhost|127\.0\.0\.1/.test(db))
    add("FAIL", A, "DATABASE_URL does not point at localhost", "a production app cannot reach your laptop");
  else if (isProd && !/sslmode=require|\.neon\.tech|\.supabase\./.test(db))
    add("WARN", A, "DATABASE_URL requests TLS", "no sslmode=require — traffic may be unencrypted");
  else add("OK", A, "DATABASE_URL is set and remote");

  for (const [k, label] of [
    ["NEXT_PUBLIC_SITE_URL", "site URL"],
    ["NEXT_PUBLIC_MINER_URL", "Miner URL"],
    ["NEXT_PUBLIC_MAIN_SITE_URL", "main-site URL (read by the Miner)"],
  ] as const) {
    const v = env(k);
    if (!v) { add("FAIL", A, `${k} is set`, `the ${label} appears in emails, certificates and OG tags`); continue; }
    if (v.endsWith("/")) add("FAIL", A, `${k} has no trailing slash`, v);
    else if (isProd && !v.startsWith("https://")) add("FAIL", A, `${k} is https`, v);
    else add("OK", A, `${k}`, v);
  }

  // One login must cover both apps. Different hosts without a shared parent
  // domain means signing in to the site does not sign you in to the Miner.
  const site = env("NEXT_PUBLIC_SITE_URL");
  const miner = env("NEXT_PUBLIC_MINER_URL");
  const cookie = env("COOKIE_DOMAIN");
  const hostOf = (u: string) => { try { return new URL(u).hostname; } catch { return ""; } };
  const sh = hostOf(site), mh = hostOf(miner);
  if (sh && mh && sh !== mh) {
    if (!cookie) {
      add("FAIL", A, "COOKIE_DOMAIN is set for two hosts",
        `${sh} and ${mh} differ — without it, signing in to the site does not sign you in to the Miner`);
    } else if (!sh.endsWith(cookie.replace(/^\./, "")) || !mh.endsWith(cookie.replace(/^\./, ""))) {
      add("FAIL", A, "COOKIE_DOMAIN covers both hosts", `${cookie} does not cover both ${sh} and ${mh}`);
    } else {
      add("OK", A, "COOKIE_DOMAIN shares the session across both apps", cookie);
    }
  } else if (sh && sh === mh) {
    add("OK", A, "site and Miner share a host", sh);
  }
}

// ─────────────────────────────────────────────── 2. DEV BOUNDARIES
{
  const A = "Dev boundaries";
  const devMode = env("DEV_MODE");
  check(!(isProd && devMode === "true"), A,
    isProd && devMode === "true" ? "DEV_MODE is not true in production" : "DEV_MODE is off",
    devMode ? `set to "${devMode}"` : "unset",
    "the code refuses to honour it in production, but it should not be set at all", "WARN");

  const { isDevMode } = await import("@tycoonhood/config");
  check(!isDevMode(), A, "dev boundaries are closed",
    "no dev mailer, no free card checkout",
    "isDevMode() is TRUE — reset links and free checkout are live");

  check(!env("ALLOW_DEFAULT_ADMIN"), A, "ALLOW_DEFAULT_ADMIN is unset", "",
    "this opts the seed into the PUBLIC default admin password — never set it on a real database");
}

// ─────────────────────────────────────────────── 3. OPTIONAL SERVICES
{
  const A = "Services";
  check(!!env("RESEND_API_KEY"), A, "email is configured",
    env("MAIL_FROM") || "MAIL_FROM unset — Resend will use its default",
    "no RESEND_API_KEY: password reset is DEAD. Members who forget their password cannot get back in.", "WARN");

  if (!env("MAIL_FROM") && env("RESEND_API_KEY")) {
    add("WARN", A, "MAIL_FROM is set", "reset emails will come from an unbranded address");
  }

  if (env("STRIPE_SECRET_KEY")) {
    check(!!env("STRIPE_WEBHOOK_SECRET"), A, "card payments are configured", "",
      "a Stripe key with no webhook secret means orders are taken and NEVER settled");
  } else {
    add("WARN", A, "card payments are configured",
      "no Stripe key: the card rail is hidden and only THC checkout works. Fine if that is the plan.");
  }
}

// ─────────────────────────────────────────────── 4. DATABASE
{
  const A = "Database";
  try {
    await prisma.$queryRaw`SELECT 1`;
    add("OK", A, "the database is reachable");
  } catch (e) {
    add("FAIL", A, "the database is reachable", e instanceof Error ? e.message.split("\n")[0] : String(e));
  }

  try {
    const applied = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    const onDisk = (await import("node:fs")).readdirSync(
      resolve(process.cwd(), "../db/prisma/migrations")
    ).filter((d) => /^\d{14}_/.test(d));
    const missing = onDisk.filter((d) => !applied.some((a) => a.migration_name === d));
    check(missing.length === 0, A, "every migration is applied",
      `${applied.length} applied`, `missing: ${missing.join(", ")}`);
  } catch (e) {
    add("FAIL", A, "migration state is readable", e instanceof Error ? e.message.split("\n")[0] : String(e));
  }

  // The economy's core invariant. If this is not zero, nothing else matters.
  try {
    const rows = await prisma.ledgerAccount.findMany({ select: { balance: true } });
    const sum = rows.reduce((t, r) => t + r.balance, 0n);
    check(sum === 0n, A, "the books balance",
      `${rows.length} accounts, Σ = 0`, `Σ = ${sum} — the ledger is broken, do not launch`);
  } catch {
    add("FAIL", A, "the books balance", "could not read the ledger");
  }
}

// ─────────────────────────────────────────────── 5. ADMIN ACCESS
{
  const A = "Admin";
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true, credential: { select: { hash: true } } },
    });
    if (admins.length === 0) add("FAIL", A, "an admin account exists", "nobody can reach /admin");
    else if (admins.length > 3) add("WARN", A, "admin accounts are few", `${admins.length} admins`);
    else add("OK", A, `${admins.length} admin account(s)`, admins.map((a) => a.email).join(", "));

    // The published default password must not be in use anywhere.
    const { verifyPassword } = await import("../src/index");
    for (const a of admins) {
      if (!a.credential) { add("FAIL", A, `${a.email} has a password set`, "admin with no credential row"); continue; }
      const isDefault = await verifyPassword(a.credential.hash, "tycoon-admin-change-me").catch(() => false);
      check(!isDefault, A,
        isDefault ? `${a.email} is not using the public default password` : `${a.email} has its own password`,
        "", "tycoon-admin-change-me is printed in the setup script and on GitHub");
    }
  } catch (e) {
    add("FAIL", A, "admin accounts are readable", e instanceof Error ? e.message.split("\n")[0] : String(e));
  }
}

// ─────────────────────────────────────────────── 6. CONTENT
{
  const A = "Content";
  const [courses, lessons, products, liveProducts, missions, challenges, videos, posts] = await Promise.all([
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.lesson.count(),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.mission.count({ where: { active: true } }),
    prisma.challenge.count(),
    prisma.watchTask.count({ where: { active: true } }),
    prisma.post.count({ where: { publishedAt: { not: null } } }),
  ]);

  check(courses > 0, A, courses > 0 ? `${courses} published course(s)` : "at least one published course",
    `${lessons} lessons`, "the Academy is the product; an empty one is not launchable");
  check(missions > 0, A, missions > 0 ? `${missions} active mission(s)` : "any active missions",
    "", "nothing pays on day one", "WARN");
  check(liveProducts > 0, A, liveProducts > 0 ? `${liveProducts} of ${products} products live` : "any live products",
    "", "the marketplace will be empty", "WARN");
  check(videos > 0, A, videos > 0 ? `${videos} watch task(s) live` : "any watch tasks",
    "", "the Miner's Watch tab will be empty", "WARN");
  check(challenges > 0, A, challenges > 0 ? `${challenges} challenge(s)` : "any challenges", "", "", "WARN");
  check(posts > 0, A, posts > 0 ? `${posts} published post(s)` : "any published posts",
    "", "the journal will be empty", "WARN");

  // Physical goods that cannot be fulfilled, or that lose money silently.
  const physical = await prisma.product.findMany({
    where: { active: true, kind: "PHYSICAL" },
    include: { variants: { where: { active: true } } },
  });
  const noCost = physical.filter((p) => p.costCents == null);
  const noStock = physical.filter((p) =>
    p.variants.length ? p.variants.every((v) => v.inventory <= 0) : (p.inventory ?? 0) <= 0
  );
  if (physical.length) {
    check(noCost.length === 0, A, "every live physical product records its cost", "",
      `${noCost.map((p) => p.slug).join(", ")} — margin and burn cannot be reported`, "WARN");
    check(noStock.length === 0, A, "every live physical product has stock", "",
      `${noStock.map((p) => p.slug).join(", ")} — members will see them and be told sold out`, "WARN");
  }
}

// ─────────────────────────────────────────────── 7. LEGAL
{
  const A = "Legal";
  const appDir = resolve(process.cwd(), "../../apps/web/app");
  const need = [
    ["(public)/terms", "Terms of Service"],
    ["(public)/privacy", "Privacy Policy"],
  ] as const;
  for (const [path, label] of need) {
    check(existsSync(resolve(appDir, path, "page.tsx")), A, `${label} page exists`, "",
      `no app/${path}/page.tsx — required before taking a signup`);
  }
}

// ─────────────────────────────────────────────── REPORT
const width = 64;
const byArea = new Map<string, typeof results>();
for (const r of results) {
  if (!byArea.has(r.area)) byArea.set(r.area, []);
  byArea.get(r.area)!.push(r);
}

console.log(`\n${"═".repeat(width)}`);
console.log("  TYCOONHOOD — LAUNCH PREFLIGHT");
console.log(`  ${new Date().toISOString()} · NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);
console.log("═".repeat(width));

for (const [area, rows] of byArea) {
  console.log(`\n── ${area.toUpperCase()}`);
  for (const r of rows) {
    const mark = r.level === "OK" ? " ✓ " : r.level === "WARN" ? " ! " : " ✗ ";
    console.log(`${mark} ${r.label}`);
    if (r.detail) console.log(`     ${r.detail}`);
  }
}

const fails = results.filter((r) => r.level === "FAIL");
const warns = results.filter((r) => r.level === "WARN");

console.log(`\n${"═".repeat(width)}`);
if (fails.length === 0 && warns.length === 0) {
  console.log("  READY TO LAUNCH — every check passed.");
} else if (fails.length === 0) {
  console.log(`  LAUNCHABLE, with ${warns.length} thing(s) you are choosing to live with:`);
  for (const w of warns) console.log(`    · ${w.label}${w.detail ? ` — ${w.detail}` : ""}`);
} else {
  console.log(`  DO NOT LAUNCH — ${fails.length} blocker(s):`);
  for (const f of fails) console.log(`    · ${f.label}${f.detail ? ` — ${f.detail}` : ""}`);
  if (warns.length) console.log(`  …and ${warns.length} warning(s) above.`);
}
console.log(`${"═".repeat(width)}\n`);

process.exit(fails.length === 0 ? 0 : 1);
