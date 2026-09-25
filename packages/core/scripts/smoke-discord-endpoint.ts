import { readFileSync, writeFileSync } from "node:fs"; import { resolve } from "node:path";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { accounts, DiscordService } = await import("../src/index");
const { prisma } = await import("@tycoonhood/db");
const discord = new DiscordService(prisma);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const spki = publicKey.export({ format: "der", type: "spki" }) as Buffer;
const publicHex = spki.subarray(spki.length - 32).toString("hex");

const stamp = Date.now().toString(36);
const user = await accounts.register({ email: `dc-${stamp}@tycoonhood.test`, password: "a-strong-password", name: "Discord Smoke" });
const { code } = await discord.createLinkCode(user.id);

const mk = (payload: object) => {
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = edSign(null, Buffer.from(ts + body), privateKey).toString("hex");
  return { body, ts, sig };
};
const ping = mk({ type: 1 });
const link = mk({ type: 2, data: { name: "link", options: [{ name: "code", value: code }] }, member: { user: { id: `d-smoke-${stamp}`, username: "monkey" } } });
const forged = { body: JSON.stringify({ type: 1 }), ts: String(Math.floor(Date.now() / 1000)), sig: "ab".repeat(64) };

writeFileSync("/tmp/discord-smoke.json", JSON.stringify({ publicHex, ping, link, forged }));
console.log("prepared");
process.exit(0);
