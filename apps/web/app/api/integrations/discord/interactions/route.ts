/** Discord Interactions Endpoint — thin adapter over core (D26).
 *  Set this URL in the Discord Developer Portal; requires
 *  DISCORD_PUBLIC_KEY. Every request is Ed25519-verified before parsing. */
import { NextResponse } from "next/server";
import { discordInteractions, verifyDiscordSignature } from "@tycoonhood/core";

export async function POST(req: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Discord interactions not configured (DISCORD_PUBLIC_KEY)." }, { status: 503 });
  }
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const rawBody = await req.text();
  if (!signature || !timestamp || !verifyDiscordSignature(publicKey, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: "invalid request signature" }, { status: 401 });
  }
  const response = await discordInteractions.handle(JSON.parse(rawBody));
  return NextResponse.json(response);
}
