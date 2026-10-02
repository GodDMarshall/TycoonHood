import { NextResponse } from "next/server";
import { briefText, validateIntake } from "@/lib/intake";

/**
 * Receives a project brief and delivers it to Ojasphera.
 *
 * Delivery channels (configure at least one in production):
 *   INTAKE_WEBHOOK_URL                — JSON POST (Slack/Zapier/Make/your CRM)
 *   RESEND_API_KEY + INTAKE_TO_EMAIL  — email via Resend (INTAKE_FROM_EMAIL optional)
 * With neither configured, production returns 503 so a brief is never silently
 * dropped; development logs the brief to the server console instead.
 */

const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const result = validateIntake(body);
  if (!result.ok) return NextResponse.json({ error: "invalid", fields: result.errors }, { status: 422 });
  const data = result.data;

  const ref = `OJS-${Date.now().toString(36).toUpperCase()}`;
  // Bots fill the hidden field; accept silently so they learn nothing.
  if (data.website) return NextResponse.json({ ok: true, ref });

  const { website: _hp, ...payload } = data;
  const webhook = process.env.INTAKE_WEBHOOK_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.INTAKE_TO_EMAIL;
  const deliveries: Promise<boolean>[] = [];

  if (webhook) {
    deliveries.push(
      fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref, receivedAt: new Date().toISOString(), ...payload, text: briefText(data, ref) }),
      }).then((r) => r.ok, () => false),
    );
  }
  if (resendKey && to) {
    deliveries.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: process.env.INTAKE_FROM_EMAIL || "Ojasphera Intake <onboarding@resend.dev>",
          to: [to],
          reply_to: data.email,
          subject: `[${ref}] ${data.mode === "talk" ? "Conversation" : "New project"} — ${data.name}${data.company ? ` (${data.company})` : ""}`,
          text: briefText(data, ref),
        }),
      }).then((r) => r.ok, () => false),
    );
  }

  if (deliveries.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[intake] ${ref} (no delivery channel configured — dev log)\n${briefText(data, ref)}`);
      return NextResponse.json({ ok: true, ref, delivered: "dev-log" });
    }
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const results = await Promise.all(deliveries);
  if (!results.some(Boolean)) return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  return NextResponse.json({ ok: true, ref });
}
