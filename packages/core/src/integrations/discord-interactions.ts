/**
 * DISCORD INTERACTIONS (the "bot", serverless edition — D26).
 *
 * Instead of a long-running gateway process, slash commands arrive as
 * Ed25519-signed HTTPS POSTs to /api/integrations/discord/interactions.
 * Discord verifies the endpoint with a PING on save; every request is
 * signature-checked with Node's built-in crypto — no gateway library, no
 * extra host, deploys wherever the web app deploys.
 *
 * This module is the whole brain: the route is a thin adapter around
 * verifyDiscordSignature() + handleDiscordInteraction(), so everything
 * here is covered by the core test suite with real keypairs.
 *
 * Commands: /link <code>  — binds Discord ↔ Tycoonhood, fires role sync
 *           /rank         — shows the member their own standing
 */
import { createPublicKey, verify as edVerify } from "node:crypto";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { DiscordAlreadyLinkedError, DiscordService, InvalidLinkCodeError } from "./discord";

/** Raw 32-byte Ed25519 public keys need this SPKI DER prefix for Node. */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordSignature(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string
): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return edVerify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

// Minimal slices of Discord's interaction shapes — only what we consume.
interface DiscordUser {
  id: string;
  username?: string;
}
export interface DiscordInteraction {
  type: number; // 1 PING, 2 APPLICATION_COMMAND
  data?: { name?: string; options?: { name: string; value: string }[] };
  member?: { user?: DiscordUser };
  user?: DiscordUser;
}
export interface DiscordResponse {
  type: number; // 1 PONG, 4 CHANNEL_MESSAGE_WITH_SOURCE
  data?: { content: string; flags?: number };
}

const EPHEMERAL = 64;
const say = (content: string): DiscordResponse => ({ type: 4, data: { content, flags: EPHEMERAL } });

export class DiscordInteractionHandler {
  private discord: DiscordService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.discord = new DiscordService(db);
  }

  async handle(i: DiscordInteraction): Promise<DiscordResponse> {
    if (i.type === 1) return { type: 1 }; // PING → PONG (endpoint verification)
    if (i.type !== 2 || !i.data?.name) return say("I only understand slash commands.");

    const duser = i.member?.user ?? i.user;
    if (!duser?.id) return say("Couldn't read who's asking — try again from the server.");

    switch (i.data.name) {
      case "link":
        return this.link(duser, i.data.options ?? []);
      case "rank":
        return this.rank(duser);
      default:
        return say(`Unknown command \`/${i.data.name}\`.`);
    }
  }

  private async link(duser: DiscordUser, options: { name: string; value: string }[]): Promise<DiscordResponse> {
    const code = options.find((o) => o.name === "code")?.value?.trim();
    if (!code) return say("Usage: `/link CODE` — get your code at tycoonhood → Settings.");
    try {
      const link = await this.discord.claimLinkCode(code, duser.id, duser.username);
      const sync = await this.discord.syncRankRole(link.userId);
      const syncLine = sync.applied
        ? "Rank role assigned."
        : `Role sync: ${sync.detail}`;
      return say(`✅ Linked to your Tycoonhood account. ${syncLine}`);
    } catch (e) {
      if (e instanceof InvalidLinkCodeError || e instanceof DiscordAlreadyLinkedError) {
        return say(`⚠️ ${e.message}`);
      }
      throw e;
    }
  }

  private async rank(duser: DiscordUser): Promise<DiscordResponse> {
    const link = await this.db.discordLink.findUnique({
      where: { discordUserId: duser.id },
      include: { user: { include: { rank: true, profile: true } } },
    });
    if (!link) {
      return say("Not linked yet. Grab a code at tycoonhood → Settings, then `/link CODE`.");
    }
    const u = link.user;
    const rankName = u.rank?.name ?? "Unranked";
    return say(
      `**${u.profile?.displayName ?? "Member"}** — ${rankName} · L${u.level} · ${u.xp.toLocaleString("en-US")} XP. The books don't lie.`
    );
  }
}

export const discordInteractions = new DiscordInteractionHandler();
