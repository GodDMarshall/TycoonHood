import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@tycoonhood/db";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { SessionService } from "../src/auth/session";
import { AccountService, EmailTakenError, InvalidCredentialsError, UsernameTakenError } from "../src/auth/account";
import { LedgerService } from "../src/ledger/ledger";
import { createTestUser, uid } from "./helpers";
import { PasswordResetService, InvalidResetTokenError } from "../src/auth/password-reset";

const sessions = new SessionService(prisma);
const accounts = new AccountService(prisma);
const ledger = new LedgerService(prisma);

describe("Passwords — Argon2id", () => {
  it("hashes and verifies a roundtrip", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(hash, "wrong password")).toBe(false);
  });

  it("never throws on malformed hashes", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});

describe("Sessions — hashed tokens, expiry, sliding renewal", () => {
  it("stores only the SHA-256 of the token", async () => {
    const user = await createTestUser();
    const { raw, session } = await sessions.create(user.id, { userAgent: "test-agent", ip: "203.0.113.7" });
    expect(session.sessionToken).not.toBe(raw);
    expect(session.sessionToken).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(session.userAgent).toBe("test-agent");
    expect(session.ipHash).toHaveLength(32);
  });

  it("resolves a valid token to its user, unknown tokens to null", async () => {
    const user = await createTestUser();
    const { raw } = await sessions.create(user.id);
    const resolved = await sessions.resolve(raw);
    expect(resolved?.user.id).toBe(user.id);
    expect(await sessions.resolve("definitely-not-a-token")).toBeNull();
  });

  it("deletes expired sessions on sight", async () => {
    const user = await createTestUser();
    const { raw, session } = await sessions.create(user.id);
    await prisma.session.update({
      where: { id: session.id },
      data: { expires: new Date(Date.now() - 1000) },
    });
    expect(await sessions.resolve(raw)).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: session.id } })).toBeNull();
  });

  it("slides expiry forward when under the renewal threshold", async () => {
    const user = await createTestUser();
    const { raw, session } = await sessions.create(user.id);
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day left
    await prisma.session.update({ where: { id: session.id }, data: { expires: soon } });
    await sessions.resolve(raw);
    const renewed = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(renewed.expires.getTime()).toBeGreaterThan(soon.getTime());
  });

  it("destroy ends the session; destroyAllForUser sweeps devices", async () => {
    const user = await createTestUser();
    const a = await sessions.create(user.id);
    const b = await sessions.create(user.id);
    await sessions.destroy(a.raw);
    expect(await sessions.resolve(a.raw)).toBeNull();
    expect(await sessions.resolve(b.raw)).not.toBeNull();
    await sessions.destroyAllForUser(user.id);
    expect(await sessions.resolve(b.raw)).toBeNull();
  });
});

describe("Accounts — register, authenticate, onboard", () => {
  it("registers, rejects duplicate emails, authenticates", async () => {
    const email = `reg-${uid().slice(0, 8)}@tycoonhood.test`;
    const user = await accounts.register({ email, password: "a-strong-password", name: "New Member" });
    expect(user.email).toBe(email);

    await expect(
      accounts.register({ email, password: "another-password", name: "Imposter" })
    ).rejects.toBeInstanceOf(EmailTakenError);

    const authed = await accounts.authenticate({ email, password: "a-strong-password" });
    expect(authed.id).toBe(user.id);

    await expect(
      accounts.authenticate({ email, password: "wrong" })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(
      accounts.authenticate({ email: "ghost@tycoonhood.test", password: "whatever" })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("onboarding claims a username, pays the mission once, and is retry-safe", async () => {
    const user = await createTestUser();
    const username = `member_${uid().slice(0, 6)}`;
    const input = {
      username,
      displayName: "Iron Ledger",
      goals: ["Build a business"] as ["Build a business"],
      interests: [],
      experienceLevel: "Just starting" as const,
    };

    const first = await accounts.completeOnboarding(user.id, input);
    expect(first.reward.firstCompletion).toBe(true);

    const mission = await prisma.mission.findUniqueOrThrow({ where: { slug: "complete-onboarding" } });
    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(mission.thcReward);

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { profile: true } });
    expect(fresh.xp).toBe(mission.xpReward);
    expect(fresh.profile?.onboardedAt).not.toBeNull();

    // Retry: nothing double-pays.
    const again = await accounts.completeOnboarding(user.id, input);
    expect(again.reward.firstCompletion).toBe(false);
    expect(await ledger.getBalance(wallet.id)).toBe(mission.thcReward);
  });

  it("rejects a username someone else holds", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const username = `taken_${uid().slice(0, 6)}`;
    const base = {
      displayName: "First",
      goals: ["Build a business"] as ["Build a business"],
      interests: [],
      experienceLevel: "Just starting" as const,
    };
    await accounts.completeOnboarding(a.id, { ...base, username });
    await expect(
      accounts.completeOnboarding(b.id, { ...base, username, displayName: "Second" })
    ).rejects.toBeInstanceOf(UsernameTakenError);
  });
});

describe("Password reset", () => {
  const RESET = new PasswordResetService(prisma);

  it("full round-trip: old password dies, new one works, every session destroyed", async () => {
    const email = `reset-${uid()}@tycoonhood.test`;
    const user = await accounts.register({ email, password: "original-pass-123", name: "Reset Case" });
    await sessions.create(user.id, {});
    await sessions.create(user.id, {});

    const { issued } = await RESET.requestReset(email.toUpperCase()); // case-insensitive in
    expect(issued).not.toBeNull();
    // Raw token is never stored — only its hash
    const stored = await prisma.verificationToken.findFirst({ where: { identifier: `pwreset:${user.id}` } });
    expect(stored?.token).not.toBe(issued!.rawToken);

    await RESET.resetPassword(issued!.rawToken, "brand-new-pass-456");

    await expect(accounts.authenticate({ email, password: "original-pass-123" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    const back = await accounts.authenticate({ email, password: "brand-new-pass-456" });
    expect(back.id).toBe(user.id);

    const remaining = await prisma.session.count({ where: { userId: user.id } });
    expect(remaining).toBe(0);
  });

  it("tokens are single-use and expire", async () => {
    const email = `reset2-${uid()}@tycoonhood.test`;
    await accounts.register({ email, password: "original-pass-123", name: "Reset Two" });

    const first = await RESET.requestReset(email);
    await RESET.resetPassword(first.issued!.rawToken, "another-pass-789");
    await expect(RESET.resetPassword(first.issued!.rawToken, "yet-another-000"))
      .rejects.toBeInstanceOf(InvalidResetTokenError);

    const second = await RESET.requestReset(email);
    await prisma.verificationToken.updateMany({
      where: { identifier: { startsWith: "pwreset:" }, token: { not: undefined } },
      data: { expires: new Date(Date.now() - 1000) },
    });
    await expect(RESET.resetPassword(second.issued!.rawToken, "fresh-pass-111"))
      .rejects.toBeInstanceOf(InvalidResetTokenError);
  });

  it("a weak new password never consumes the token", async () => {
    const email = `reset3-${uid()}@tycoonhood.test`;
    await accounts.register({ email, password: "original-pass-123", name: "Reset Three" });
    const { issued } = await RESET.requestReset(email);

    await expect(RESET.resetPassword(issued!.rawToken, "short")).rejects.toBeInstanceOf(InvalidResetTokenError);
    // Token survived the typo — the same link still works
    await RESET.resetPassword(issued!.rawToken, "long-enough-pass-222");
  });

  it("unknown emails issue nothing but look identical from outside", async () => {
    const r = await RESET.requestReset(`ghost-${uid()}@tycoonhood.test`);
    expect(r.issued).toBeNull();
  });
});
