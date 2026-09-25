/** Builds one richly-lived showcase member + admin session for screenshots. */
import { readFileSync } from "node:fs"; import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { prisma } = await import("@tycoonhood/db");
const { accounts, sessions, lms, commerce, challenges, mining, LedgerService } = await import("../src/index");
const ledger = new LedgerService(prisma);
const stamp = Date.now().toString(36);

const user = await accounts.register({ email: `show-${stamp}@tycoonhood.test`, password: "a-strong-password", name: "Marcus Vale" });
await accounts.completeOnboarding(user.id, { username: `marcus_${stamp.slice(-4)}`, displayName: "Marcus Vale", goals: ["Build a business", "Get in the best shape of my life"], interests: [], experienceLevel: "Building momentum" });
await ledger.reward({ userId: user.id, amount: 18_500n, reason: "REWARD_ADMIN", idempotencyKey: `show-fund-${stamp}`, memo: "Showcase grant" });

// Learning progress: warrior, first two lessons
await lms.enroll(user.id, "warrior");
const lessons = await prisma.lesson.findMany({ where: { module: { course: { slug: "warrior" } } }, orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }], take: 3 });
await lms.completeLesson(user.id, lessons[0].id);
await lms.completeLesson(user.id, lessons[1].id);

// Commerce: owns the Playbook
await commerce.checkoutWithThc(user.id, "founders-playbook");

// Challenge: entered the 1% Ledger with evidence pending
await prisma.challenge.update({ where: { slug: "the-one-percent-ledger" }, data: { lifecycle: "ACTIVE", startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 30 * 86_400_000) } });
await challenges.join(user.id, "the-one-percent-ledger");
await challenges.submit(user.id, "the-one-percent-ledger", { text: "Thirty days tracked in the sheet. Allocation plan written: 55% essentials, 15% buffer, 20% debt, 10% life. Auto-transfer set for the 1st.", url: "https://example.com/ledger-sheet" });

// Miner: level 2 rig, six hours of accrual waiting
await mining.getState(user.id);
await prisma.minerState.update({ where: { userId: user.id }, data: { rigLevel: 2, lastClaimAt: new Date(Date.now() - 6 * 3600_000), totalMined: 4_820n } });

const member = await sessions.create(user.id, {});
const admin = await accounts.authenticate({ email: "admin@tycoonhood.local", password: "tycoon-admin-change-me" });
const adminSession = await sessions.create(admin.id, {});
const lesson = lessons[2];
console.log(JSON.stringify({ member: member.raw, admin: adminSession.raw, lessonId: lesson.id }));
process.exit(0);
