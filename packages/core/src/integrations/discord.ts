/**
 * DISCORD INTEGRATION (spec §25, Blueprint D11). The linking flow is fully
 * real: the member generates a short-lived code here, gives it to the bot
 * (/link <code>), and the bot's backend calls claimLinkCode. Role sync
 * goes through a transport: the REST transport does real Discord API
 * calls when DISCORD_BOT_TOKEN + DISCORD_GUILD_ID + DISCORD_ROLE_MAP are
 * configured; the dev transport logs its intent and reports itself as
 * inert — it never pretends success.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { randomInt } from "node:crypto";

export class InvalidLinkCodeError extends Error {}
export class DiscordAlreadyLinkedError extends Error {}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L
const CODE_TTL_MS = 10 * 60 * 1000;

export interface RoleSyncResult {
  applied: boolean;
  transport: string;
  detail: string;
}

export interface DiscordTransport {
  readonly name: string;
  readonly live: boolean;
  assignRankRole(discordUserId: string, rankSlug: string): Promise<RoleSyncResult>;
}

class DevTransport implements DiscordTransport {
  readonly name = "dev";
  readonly live = false;
  async assignRankRole(discordUserId: string, rankSlug: string): Promise<RoleSyncResult> {
    console.log(`[discord:dev] would assign role for rank '${rankSlug}' to ${discordUserId}`);
    return { applied: false, transport: "dev", detail: "Bot not configured — no role was changed." };
  }
}

class RestTransport implements DiscordTransport {
  readonly name = "rest";
  readonly live = true;
  constructor(
    private token: string,
    private guildId: string,
    private roleMap: Record<string, string>
  ) {}
  async assignRankRole(discordUserId: string, rankSlug: string): Promise<RoleSyncResult> {
    const roleId = this.roleMap[rankSlug];
    if (!roleId) {
      return { applied: false, transport: "rest", detail: `No role mapped for rank '${rankSlug}'.` };
    }
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${this.guildId}/members/${discordUserId}/roles/${roleId}`,
      { method: "PUT", headers: { Authorization: `Bot ${this.token}` } }
    );
    if (res.status === 204) return { applied: true, transport: "rest", detail: `Role for '${rankSlug}' assigned.` };
    return { applied: false, transport: "rest", detail: `Discord API ${res.status}: ${await res.text()}` };
  }
}

export function activeDiscordTransport(): DiscordTransport {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const mapRaw = process.env.DISCORD_ROLE_MAP;
  if (token && guildId && mapRaw) {
    try {
      return new RestTransport(token, guildId, JSON.parse(mapRaw));
    } catch {
      console.warn("[discord] DISCORD_ROLE_MAP is not valid JSON — falling back to dev transport");
    }
  }
  return new DevTransport();
}

export class DiscordService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Member side: mint a short-lived link code. Replaces any prior code. */
  async createLinkCode(userId: string) {
    const identifier = `discord:${userId}`;
    await this.db.verificationToken.deleteMany({ where: { identifier } });
    const code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    const expires = new Date(Date.now() + CODE_TTL_MS);
    await this.db.verificationToken.create({ data: { identifier, token: code, expires } });
    return { code, expires };
  }

  /** Bot side: claim a code, binding the Discord account to the member. */
  async claimLinkCode(code: string, discordUserId: string, discordUsername?: string) {
    const token = await this.db.verificationToken.findFirst({
      where: { token: code.toUpperCase(), identifier: { startsWith: "discord:" } },
    });
    if (!token || token.expires < new Date()) {
      throw new InvalidLinkCodeError("That code is invalid or expired — generate a fresh one in Settings.");
    }
    const userId = token.identifier.slice("discord:".length);
    void discordUsername; // display name lives on Discord's side; we store the stable id
    const taken = await this.db.discordLink.findUnique({ where: { discordUserId } });
    if (taken && taken.userId !== userId) {
      throw new DiscordAlreadyLinkedError(
        "That Discord account is already linked to another member. Unlink it there first."
      );
    }
    const link = await this.db.discordLink.upsert({
      where: { userId },
      update: { discordUserId, linkedAt: new Date() },
      create: { userId, discordUserId },
    });
    await this.db.verificationToken.delete({
      where: { identifier_token: { identifier: token.identifier, token: token.token } },
    });
    return link;
  }

  async unlink(userId: string) {
    await this.db.discordLink.deleteMany({ where: { userId } });
  }

  async linkFor(userId: string) {
    return this.db.discordLink.findUnique({ where: { userId } });
  }

  /** Push the member's current rank role through the active transport. */
  async syncRankRole(userId: string): Promise<RoleSyncResult> {
    const [link, user] = await Promise.all([
      this.linkFor(userId),
      this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { rank: true } }),
    ]);
    if (!link) return { applied: false, transport: "none", detail: "Discord not linked." };
    if (!user.rank) return { applied: false, transport: "none", detail: "No rank yet." };
    return activeDiscordTransport().assignRankRole(link.discordUserId, user.rank.slug);
  }
}

export const discord = new DiscordService();
