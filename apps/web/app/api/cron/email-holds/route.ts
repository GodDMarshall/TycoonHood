/**
 * The sweep for email changes whose undo notice never went out, on a
 * schedule (platform/email-notice). A change commits before its notice is
 * sent; when the request that confirmed it dies before it can send the
 * notice or put the change back, the change is put back here once it is a
 * few minutes old. apps/web/vercel.json runs it once a day, which every
 * Vercel plan allows; a new change request, a reset request for either
 * address and the admin page sweep what they touch first. Vercel Cron sends
 * "Authorization: Bearer $CRON_SECRET".
 */
import { NextResponse } from "next/server";
import { cronAuth, emailUndo } from "@tycoonhood/core";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = cronAuth(req.headers.get("authorization"));
  if (auth === "unset") return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (auth === "denied") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const putBack = await emailUndo.putBackUnnotified();
  return NextResponse.json({ ok: true, putBack });
}
