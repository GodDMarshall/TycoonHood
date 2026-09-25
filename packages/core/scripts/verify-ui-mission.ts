/**
 * Proves the mission Monkey authored through /admin/missions actually pays.
 * Nothing here is hard-coded about that mission except its slug: the payout,
 * the event and the threshold all come from the row the admin form wrote.
 *
 * Usage: pnpm --filter @tycoonhood/core exec tsx scripts/verify-ui-mission.ts <slug>
 */
import { readFileSync } from "node:fs"; import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }

const slug = process.argv[2];
if (!slug) { console.error("usage: verify-ui-mission.ts <mission-slug>"); process.exit(2); }

const { prisma } = await import("@tycoonhood/db");
const { accounts, lms, ledger } = await import("../src/index");
const { describeCriteria, parseCriteria } = await import("../src/rules/criteria");

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const mission = await prisma.mission.findUnique({ where: { slug } });
if (!mission) { console.error(`No mission with slug "${slug}".`); process.exit(2); }

const criteria = parseCriteria(mission.criteria);
console.log(`\nMission "${mission.name}" (${mission.slug})`);
console.log(`  rule    : ${describeCriteria(criteria)}`);
console.log(`  pays    : ${mission.thcReward} THC + ${mission.xpReward} XP`);
console.log(`  active  : ${mission.active}`);
console.log(`  source  : written by the admin form, read back from the database\n`);

if (criteria.event !== "LESSON_COMPLETED") {
  console.error(`This script drives lesson completions; that mission listens for ${criteria.event}.`);
  process.exit(2);
}
const need = criteria.count ?? 1;

// A brand-new member, so nothing carries over from another run.
const stamp = Date.now().toString(36);
const user = await accounts.register({ email: `uimission-${stamp}@tycoonhood.test`, password: "a-strong-password-here", name: "UI Mission Check" });
await accounts.completeOnboarding(user.id, { username: `uim_${stamp}`, displayName: "UI Mission Check", goals: ["Build a business"], interests: [], experienceLevel: "Just starting" });
await lms.enroll(user.id, "warrior");

const wallet = await ledger.ensureUserAccount(user.id);
const lessons = await prisma.lesson.findMany({
  where: { module: { course: { slug: "warrior" } } },
  orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  take: need,
});
check(`academy has the ${need} lessons this run needs`, lessons.length === need, `found ${lessons.length}`);
if (lessons.length < need) process.exit(1);

const paid = async () =>
  (await prisma.missionCompletion.count({ where: { userId: user.id, missionId: mission.id } })) > 0;

// Every lesson before the last must NOT complete the mission.
for (let i = 0; i < need - 1; i++) {
  await lms.completeLesson(user.id, lessons[i].id);
  check(`after ${i + 1} of ${need} lessons the mission has not paid`, !(await paid()));
}

const balanceBefore = await ledger.getBalance(wallet.id);
const xpBefore = (await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { xp: true } })).xp;

await lms.completeLesson(user.id, lessons[need - 1].id);

const balanceAfter = await ledger.getBalance(wallet.id);
const xpAfter = (await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { xp: true } })).xp;

check(`mission recorded as completed after lesson ${need}`, await paid());

// The final lesson also pays its own XP and may trip other seeded missions, so
// assert the mission's own payout is present, not that it is the only movement.
const thcDelta = balanceAfter - balanceBefore;
const xpDelta = xpAfter - xpBefore;
check(`${mission.thcReward} THC reached the member`, thcDelta >= mission.thcReward, `wallet moved +${thcDelta}`);
check(`${mission.xpReward} XP reached the member`, xpDelta >= mission.xpReward, `xp moved +${xpDelta}`);

// A ledger line naming this mission is the auditable proof, not just a balance.
const line = await prisma.ledgerTransaction.findFirst({
  where: { sourceType: "mission", sourceId: mission.id, entries: { some: { accountId: wallet.id } } },
  include: { entries: true },
});
check("a ledger transaction names this mission as its source", !!line,
  line ? `${line.id} / ${line.entries.length} entries` : "none found");
if (line) {
  const credit = line.entries.find((e) => e.accountId === wallet.id);
  check("that transaction credits exactly the authored amount", credit?.amount === mission.thcReward, `entry ${credit?.amount}`);
  const sum = line.entries.reduce((t, e) => t + e.amount, 0n);
  check("that transaction sums to zero (double-entry holds)", sum === 0n, `sum ${sum}`);
}

// Completing more lessons must not pay a non-repeatable mission twice.
if (!mission.repeatable) {
  const extra = await prisma.lesson.findFirst({
    where: { module: { course: { slug: "warrior" } }, id: { notIn: lessons.map((l) => l.id) } },
  });
  if (extra) {
    const b = await ledger.getBalance(wallet.id);
    await lms.completeLesson(user.id, extra.id);
    const completions = await prisma.missionCompletion.count({ where: { userId: user.id, missionId: mission.id } });
    check("a further lesson does not pay the mission again", completions === 1, `${completions} completions`);
    const b2 = await ledger.getBalance(wallet.id);
    check("no second payout of the mission amount", b2 - b < mission.thcReward, `wallet moved +${b2 - b}`);
  }
}

console.log(`\n  member: ${user.email}`);
console.log(failures === 0 ? "\n  ALL CHECKS PASSED\n" : `\n  ${failures} CHECK(S) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
