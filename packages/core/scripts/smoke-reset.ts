import { readFileSync } from "node:fs"; import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { accounts, passwordReset } = await import("../src/index");
const stamp = Date.now().toString(36);
const email = `rs-${stamp}@tycoonhood.test`;
await accounts.register({ email, password: "original-pass-123", name: "Reset Smoke" });
const { issued } = await passwordReset.requestReset(email);
console.log(JSON.stringify({ token: issued!.rawToken }));
process.exit(0);
