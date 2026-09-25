import { readFileSync } from "node:fs"; import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { accounts, sessions, commerce, LedgerService } = await import("../src/index");
const { prisma } = await import("@tycoonhood/db");
const ledger = new LedgerService(prisma);
const stamp = Date.now().toString(36);
const user = await accounts.register({ email: `buy-${stamp}@tycoonhood.test`, password: "a-strong-password", name: "Buyer" });
await accounts.completeOnboarding(user.id, { username: `buy_${stamp}`, displayName: "Buyer", goals: ["Build a business"], interests: [], experienceLevel: "Just starting" });
await ledger.reward({ userId: user.id, amount: 20_000n, reason: "REWARD_ADMIN", idempotencyKey: `smoke-fund-${stamp}` });
const order = await commerce.checkoutWithThc(user.id, "founders-playbook");
const { raw } = await sessions.create(user.id, {});
console.log(JSON.stringify({ token: raw, status: order.status }));
process.exit(0);
