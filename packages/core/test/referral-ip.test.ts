/**
 * A referral records who brought whom, and nothing about where they signed up
 * from (data-model 0.5). Referral.signupIp held raw addresses; migration
 * 20261113000100 empties it and nothing writes it again. The column stays
 * only until a later migration drops it.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { prisma } from "@tycoonhood/db";
import { ReferralService } from "../src/growth/referrals";
import { createTestUser } from "./helpers";

const referrals = new ReferralService(prisma);
const ROOT = resolve(__dirname, "../../..");

/** Every source file of the apps and packages: not tests, builds, dependencies or the generated client. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".turbo", "dist", "generated", "test"].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) out.push(path);
  }
  return out;
}

describe("referrals keep no IP", () => {
  it("attach takes a member and a code, and stores no signup IP", async () => {
    const inviter = await createTestUser();
    const joiner = await createTestUser();
    const code = await referrals.codeFor(inviter.id);
    expect(referrals.attach.length).toBe(2);

    // An old caller that still passes an address: it is not stored.
    const attach = referrals.attach.bind(referrals) as (userId: string, code: string, ip?: string) => ReturnType<ReferralService["attach"]>;
    const referral = await attach(joiner.id, code, "203.0.113.9");
    expect(referral).not.toBeNull();
    const row = await prisma.referral.findUniqueOrThrow({ where: { referredId: joiner.id } });
    expect(row.signupIp).toBeNull();
    expect(JSON.stringify(row)).not.toContain("203.0.113.9");
  });

  it("no app or package code reads or writes Referral.signupIp", () => {
    const offenders = [...sourceFiles(join(ROOT, "apps")), ...sourceFiles(join(ROOT, "packages"))]
      .filter((file) => readFileSync(file, "utf8").includes("signupIp"))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
