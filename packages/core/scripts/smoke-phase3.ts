/** Phase 3 smoke: register → onboard (pays mission) → mint session. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
if (!process.env.DATABASE_URL) {
  const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const { accounts, sessions } = await import("../src/index");
const stamp = Date.now().toString(36);
const user = await accounts.register({
  email: `smoke-${stamp}@tycoonhood.test`,
  password: "a-strong-password",
  name: "Smoke Member",
});
await accounts.completeOnboarding(user.id, {
  username: `smoke_${stamp}`,
  displayName: "Smoke Member",
  goals: ["Build a business"],
  interests: ["Investing"],
  experienceLevel: "Just starting",
});
const { raw } = await sessions.create(user.id, { userAgent: "smoke-script", ip: "203.0.113.9" });
console.log(JSON.stringify({ token: raw, username: `smoke_${stamp}` }));
process.exit(0);
