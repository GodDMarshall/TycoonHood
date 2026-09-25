import { readFileSync } from "node:fs"; import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { accounts, sessions } = await import("../src/index");
const admin = await accounts.authenticate({
  email: process.env.ADMIN_EMAIL ?? "admin@tycoonhood.local",
  password: process.env.ADMIN_PASSWORD ?? "tycoon-admin-change-me",
});
const { raw } = await sessions.create(admin.id, {});
console.log(JSON.stringify({ token: raw }));
process.exit(0);
