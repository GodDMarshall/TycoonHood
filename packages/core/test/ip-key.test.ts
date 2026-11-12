/**
 * IP keys (data-model 0.5): an IP is kept only as a keyed hash. A plain
 * SHA-256 of an IPv4 address can be reversed by trying all four billion of
 * them, so sessions and affiliate clicks both store ipKey(ip): a prefix of
 * HMAC-SHA256 under a secret the database never holds. Both use the same key,
 * so the affiliate self-dealing check can still compare a click with a
 * signed-in session.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { prisma } from "@tycoonhood/db";
import { ipKey, privacySecret } from "../src/platform/ip-key";
import { ipKey as ipKeyFromEarn, AffiliateService, visitorHash } from "../src/earn";
import { SessionService } from "../src/auth/session";
import { createTestUser, uid } from "./helpers";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const keyed = (secret: string, ip: string) => createHmac("sha256", secret).update(`ip|${ip}`).digest("hex").slice(0, 32);

const SECRETS = ["IP_HASH_KEY", "AFFILIATE_HASH_SECRET", "DATABASE_URL"] as const;
const saved = Object.fromEntries(SECRETS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of SECRETS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const randomIp = () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

describe("ipKey", () => {
  it("is the first 32 hex characters of HMAC-SHA256(privacySecret(), 'ip|' + ip)", () => {
    process.env.IP_HASH_KEY = "a-long-random-test-key";
    const ip = "203.0.113.7";
    expect(ipKey(ip)).toBe(keyed("a-long-random-test-key", ip));
    expect(ipKey(ip)).toMatch(/^[0-9a-f]{32}$/);
    // Not the old unkeyed prefix, which anyone could rebuild from the address alone.
    expect(ipKey(ip)).not.toBe(sha256(ip).slice(0, 32));
  });

  it("is empty for no address", () => {
    process.env.IP_HASH_KEY = "a-long-random-test-key";
    expect(ipKey(null)).toBe("");
    expect(ipKey(undefined)).toBe("");
    expect(ipKey("")).toBe("");
  });

  it("is stable for one key and different under another", () => {
    const ip = "198.51.100.23";
    process.env.IP_HASH_KEY = "first-key";
    const first = ipKey(ip);
    expect(ipKey(ip)).toBe(first);
    process.env.IP_HASH_KEY = "second-key";
    expect(ipKey(ip)).not.toBe(first);
    expect(ipKey(ip)).toBe(keyed("second-key", ip));
  });

  it("is keyed by IP_HASH_KEY, else AFFILIATE_HASH_SECRET, else a secret derived from DATABASE_URL as affiliates derive theirs", () => {
    process.env.DATABASE_URL = "postgresql://someone:secret@localhost:5432/whatever_test";
    process.env.IP_HASH_KEY = "ip-key";
    process.env.AFFILIATE_HASH_SECRET = "affiliate-secret";
    expect(privacySecret()).toBe("ip-key");

    delete process.env.IP_HASH_KEY;
    expect(privacySecret()).toBe("affiliate-secret");

    process.env.IP_HASH_KEY = ""; // set but empty counts as not set
    expect(privacySecret()).toBe("affiliate-secret");

    delete process.env.AFFILIATE_HASH_SECRET;
    const derived = sha256(`affiliate-visitor|${process.env.DATABASE_URL}`);
    expect(privacySecret()).toBe(derived);
    expect(ipKey("192.0.2.1")).toBe(keyed(derived, "192.0.2.1"));
  });

  it("reads the environment it is given instead of the process's (data-model e.10)", () => {
    process.env.IP_HASH_KEY = "process-key";
    process.env.AFFILIATE_HASH_SECRET = "process-affiliate-secret";
    expect(privacySecret({ IP_HASH_KEY: "given-key", AFFILIATE_HASH_SECRET: "given-affiliate-secret" })).toBe("given-key");
    expect(privacySecret({ AFFILIATE_HASH_SECRET: "given-affiliate-secret" })).toBe("given-affiliate-secret");
    const url = "postgresql://someone:secret@localhost:5432/given_test";
    expect(privacySecret({ DATABASE_URL: url })).toBe(sha256(`affiliate-visitor|${url}`));
    expect(privacySecret({})).toBe(sha256("affiliate-visitor|"));
    // Without one, it is the process's.
    expect(privacySecret()).toBe("process-key");
  });

  it("is the same function the earn module exports", () => {
    expect(ipKeyFromEarn).toBe(ipKey);
  });
});

describe("what is stored", () => {
  it("a new session stores ipKey(ip), never an unkeyed SHA-256 of it", async () => {
    process.env.IP_HASH_KEY = `session-key-${uid()}`;
    const user = await createTestUser();
    const ip = randomIp();
    const { session } = await new SessionService(prisma).create(user.id, { ip, userAgent: "Mozilla/5.0 ip-key test" });
    const stored = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(stored.ipHash).toBe(ipKey(ip));
    expect(stored.ipHash).not.toBe(sha256(ip).slice(0, 32));
    expect(stored.ipHash).not.toContain(ip);
  });

  it("a session with no address stores no key", async () => {
    const user = await createTestUser();
    const { session } = await new SessionService(prisma).create(user.id, { ip: null });
    expect((await prisma.session.findUniqueOrThrow({ where: { id: session.id } })).ipHash).toBeNull();
  });

  it("an affiliate click is hashed from the keyed ipKey, so it matches a session from the same device", async () => {
    process.env.IP_HASH_KEY = `click-key-${uid()}`;
    const admin = await createTestUser();
    const member = await createTestUser();
    await prisma.user.update({ where: { id: member.id }, data: { emailVerified: new Date() } });
    const earn = new AffiliateService(prisma);
    const profile = await earn.register(member.id, {
      channels: "A newsletter about training",
      payoutMethod: { type: "UPI", upiId: `t${uid().replace(/-/g, "").slice(0, 12)}@okbank` },
      acceptTerms: true,
    });
    await earn.approve(admin.id, profile.id);

    const ip = randomIp();
    const userAgent = `Mozilla/5.0 ip-key-${uid()}`;
    expect((await earn.recordClick(profile.code, { ip, userAgent, landingPath: "/store" })).recorded).toBe(true);
    const click = await prisma.affiliateClick.findFirstOrThrow({ where: { affiliateId: profile.id } });
    expect(click.visitorHash).toBe(visitorHash(ipKey(ip), userAgent, click.createdAt));
    expect(click.visitorHash).not.toBe(visitorHash(sha256(ip).slice(0, 32), userAgent, click.createdAt));

    const { session } = await new SessionService(prisma).create(member.id, { ip, userAgent });
    expect(visitorHash(session.ipHash!, session.userAgent, session.createdAt)).toBe(click.visitorHash);
  });
});
