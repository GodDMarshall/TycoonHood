/**
 * Signs in as the seeded admin and prints a session token, for smoke checks
 * against a running site. Reads the repository's .env when there is one;
 * variables already set win.
 *
 * ADMIN_EMAIL goes through loginSchema, as the sign-in form sends it: the seed
 * stores the address trimmed and lower-cased, so the raw value would not
 * match an admin made from "Owner@Example.com" (review finding 18).
 */
import { existsSync, readFileSync } from "node:fs"; import { resolve } from "node:path";
const envPath = resolve(process.cwd(), "../../.env");
const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { accounts, sessions, loginSchema } = await import("../src/index");
const admin = await accounts.authenticate(
  loginSchema.parse({
    email: process.env.ADMIN_EMAIL ?? "admin@tycoonhood.local",
    password: process.env.ADMIN_PASSWORD ?? "tycoon-admin-change-me",
  })
);
const { raw } = await sessions.create(admin.id, {});
console.log(JSON.stringify({ token: raw }));
process.exit(0);
