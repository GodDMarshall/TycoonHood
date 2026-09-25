/**
 * E2E FIXTURE HELPER — the only privileged operations the browser run needs.
 *
 * The end-to-end check drives the real UI for everything a member or an admin
 * can do. Three things it cannot do from a browser are here instead: minting
 * an admin to sign in as, granting THC the way an admin grant does, and
 * completing a lesson to trigger referral qualification.
 *
 * Usage:
 *   tsx scripts/e2e-fixture.ts admin   <email> <password>
 *   tsx scripts/e2e-fixture.ts onboard <userId> <username>
 *   tsx scripts/e2e-fixture.ts fund    <userId> <amount>
 *   tsx scripts/e2e-fixture.ts lesson  <userId>
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { prisma } = await import("@tycoonhood/db");
const { accounts, ledger, lms } = await import("../src/index");

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "admin": {
    const [email, password] = args;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await accounts.register({ email, password, name: "E2E Admin" });
      await accounts.completeOnboarding(user.id, {
        username: email.split("@")[0].replace(/[^a-z0-9]/g, "").slice(0, 20),
        displayName: "E2E Admin",
        goals: ["Build a business"],
        interests: [],
        experienceLevel: "Just starting",
      });
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log(user.id);
    break;
  }
  case "onboard": {
    const [userId, username] = args;
    await accounts.completeOnboarding(userId, {
      username,
      displayName: "E2E Member",
      goals: ["Build a business"],
      interests: [],
      experienceLevel: "Just starting",
    });
    console.log("onboarded");
    break;
  }
  case "fund": {
    const [userId, amount] = args;
    await ledger.reward({
      userId,
      amount: BigInt(amount),
      reason: "REWARD_ADMIN",
      idempotencyKey: `e2e-fund:${userId}:${amount}`,
      memo: "e2e funding",
    });
    const wallet = await ledger.ensureUserAccount(userId);
    console.log(`balance=${await ledger.getBalance(wallet.id)}`);
    break;
  }
  case "lesson": {
    const [userId] = args;
    await lms.enroll(userId, "warrior");
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { module: { course: { slug: "warrior" } } },
      orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
    console.log(JSON.stringify(await lms.completeLesson(userId, lesson.id)));
    break;
  }
  default:
    console.error(`unknown command: ${cmd}`);
    process.exit(2);
}
process.exit(0);
