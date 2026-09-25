import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { prisma } from "@tycoonhood/db";
import { verifyDiscordSignature, DiscordInteractionHandler } from "../src/integrations/discord-interactions";
import { DiscordService } from "../src/integrations/discord";
import { createTestUser, uid } from "./helpers";

const handler = new DiscordInteractionHandler(prisma);
const discord = new DiscordService(prisma);

/** Real Ed25519 keypair, raw-hex forms as Discord supplies them. */
function makeKeys() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spki = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const publicHex = spki.subarray(spki.length - 32).toString("hex");
  const signHex = (timestamp: string, body: string) =>
    edSign(null, Buffer.from(timestamp + body), privateKey).toString("hex");
  return { publicHex, signHex };
}

describe("Discord interactions — signature", () => {
  it("accepts a genuine signature and rejects tampering, wrong keys, and garbage", () => {
    const { publicHex, signHex } = makeKeys();
    const ts = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ type: 1 });
    const sig = signHex(ts, body);

    expect(verifyDiscordSignature(publicHex, sig, ts, body)).toBe(true);
    expect(verifyDiscordSignature(publicHex, sig, ts, body + " ")).toBe(false);
    expect(verifyDiscordSignature(publicHex, sig, ts + "1", body)).toBe(false);

    const other = makeKeys();
    expect(verifyDiscordSignature(other.publicHex, sig, ts, body)).toBe(false);
    expect(verifyDiscordSignature("zz-not-hex", sig, ts, body)).toBe(false);
    expect(verifyDiscordSignature(publicHex, "deadbeef", ts, body)).toBe(false);
  });
});

describe("Discord interactions — handler", () => {
  it("answers Discord's PING with PONG", async () => {
    expect(await handler.handle({ type: 1 })).toEqual({ type: 1 });
  });

  it("/link claims a real code ephemerally and reports the honest sync status", async () => {
    const user = await createTestUser();
    const { code } = await discord.createLinkCode(user.id);
    const did = `d-${uid().slice(0, 10)}`;

    const res = await handler.handle({
      type: 2,
      data: { name: "link", options: [{ name: "code", value: code }] },
      member: { user: { id: did, username: "monkey" } },
    });
    expect(res.type).toBe(4);
    expect(res.data?.flags).toBe(64);
    expect(res.data?.content).toContain("✅ Linked");
    expect(res.data?.content).toContain("Role sync:"); // dev transport tells the truth

    const link = await prisma.discordLink.findUnique({ where: { userId: user.id } });
    expect(link?.discordUserId).toBe(did);
  });

  it("/link with a bad code fails politely; unknown commands too", async () => {
    const bad = await handler.handle({
      type: 2,
      data: { name: "link", options: [{ name: "code", value: "NOPE99" }] },
      user: { id: `d-${uid().slice(0, 10)}` },
    });
    expect(bad.data?.content).toContain("⚠️");

    const unknown = await handler.handle({ type: 2, data: { name: "moon" }, user: { id: "d-x" } });
    expect(unknown.data?.content).toContain("Unknown command");
  });

  it("/rank shows a linked member their standing and nudges the unlinked", async () => {
    const user = await createTestUser();
    const initiate = await prisma.rankDefinition.findUniqueOrThrow({ where: { slug: "initiate" } });
    await prisma.user.update({ where: { id: user.id }, data: { rankId: initiate.id, level: 3, xp: 1234 } });
    const { code } = await discord.createLinkCode(user.id);
    const did = `d-${uid().slice(0, 10)}`;
    await discord.claimLinkCode(code, did);

    const linked = await handler.handle({ type: 2, data: { name: "rank" }, member: { user: { id: did } } });
    expect(linked.data?.content).toContain("Initiate");
    expect(linked.data?.content).toContain("L3");
    expect(linked.data?.content).toContain("1,234");

    const stranger = await handler.handle({ type: 2, data: { name: "rank" }, user: { id: `d-${uid().slice(0, 10)}` } });
    expect(stranger.data?.content).toContain("Not linked yet");
  });
});
