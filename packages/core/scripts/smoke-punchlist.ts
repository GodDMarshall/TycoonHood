import { readFileSync } from "node:fs"; import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { prisma } = await import("@tycoonhood/db");
const { accounts, sessions, commerce, challenges, LedgerService } = await import("../src/index");
const ledger = new LedgerService(prisma);
const stamp = Date.now().toString(36);
const user = await accounts.register({ email: `pl-${stamp}@tycoonhood.test`, password: "a-strong-password", name: "Punch List" });
await accounts.completeOnboarding(user.id, { username: `pl_${stamp}`, displayName: "Punch List", goals: ["Build a business"], interests: [], experienceLevel: "Just starting" });
await ledger.reward({ userId: user.id, amount: 20_000n, reason: "REWARD_ADMIN", idempotencyKey: `pl-fund-${stamp}` });
await commerce.checkoutWithThc(user.id, "founders-playbook");
// Activate the ledger challenge + join + submit so member UI + admin queue have live rows
await prisma.challenge.update({ where: { slug: "the-one-percent-ledger" }, data: { lifecycle: "ACTIVE", startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 30 * 86_400_000) } });
await challenges.join(user.id, "the-one-percent-ledger");
await challenges.submit(user.id, "the-one-percent-ledger", { text: "Thirty days tracked, allocation plan attached, automation set for payday.", url: "https://example.com/sheet" });
const { raw } = await sessions.create(user.id, {});
console.log(JSON.stringify({ token: raw, username: `pl_${stamp}` }));
process.exit(0);
