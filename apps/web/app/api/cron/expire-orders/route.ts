/**
 * The stale-order sweep on a schedule. apps/web/vercel.json runs it every 10
 * minutes; Vercel Cron sends "Authorization: Bearer $CRON_SECRET". It lets
 * unpaid rupee orders go once their hold runs out, giving back stock and
 * coupons, even when nobody is browsing the shop. Shop pages also sweep, at
 * most once a minute (lib/stale-orders.ts).
 */
import { NextResponse } from "next/server";
import { cronAuth, shopCheckout } from "@tycoonhood/core";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = cronAuth(req.headers.get("authorization"));
  if (auth === "unset") return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (auth === "denied") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await shopCheckout.expireStale();
  return NextResponse.json({ ok: true, ...result });
}
