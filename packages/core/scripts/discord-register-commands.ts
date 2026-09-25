/** One-time setup: registers /link and /rank as guild commands.
 *  Run: npx tsx scripts/discord-register-commands.ts  (from packages/core)
 *  Needs DISCORD_BOT_TOKEN, DISCORD_APP_ID, DISCORD_GUILD_ID in root .env. */
import { readFileSync } from "node:fs"; import { resolve } from "node:path";
try {
  const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
  for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
} catch { /* fine — envs may come from the shell */ }

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APP_ID;
const guildId = process.env.DISCORD_GUILD_ID;
if (!token || !appId || !guildId) {
  console.error("Missing DISCORD_BOT_TOKEN, DISCORD_APP_ID, or DISCORD_GUILD_ID — nothing registered, nothing pretended.");
  process.exit(1);
}

const commands = [
  {
    name: "link",
    description: "Link your Discord to your Tycoonhood account",
    options: [{ type: 3, name: "code", description: "The 6-character code from Settings", required: true }],
  },
  { name: "rank", description: "Show your Tycoonhood rank, level, and XP" },
];

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});
if (!res.ok) {
  console.error(`Discord API ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log("✓ Registered /link and /rank for the guild. They appear in Discord within a minute.");
process.exit(0);
