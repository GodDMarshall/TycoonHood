/**
 * GET /api/community/:channel — the chat's polling feed.
 *
 *   ?after=<id>        messages newer than the one on screen
 *   ?before=<id>       an older page, for "load earlier"
 *   ?ids=a,b,c         removal/pin state of messages already on screen
 *
 * Members only, and only for channels they can read (the same rule as the
 * page). Responses carry the MessageView projection — never a removed body,
 * never another member's email. Not cached anywhere.
 */
import { NextResponse, type NextRequest } from "next/server";
import { community } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const user = await getCurrentUser();
  if (!user?.profile?.onboardedAt) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { channel: slug } = await params;
  const viewer = { id: user.id, role: user.role };
  const channel = await community.channel(viewer, slug);
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const after = sp.get("after") ?? undefined;
  const before = sp.get("before") ?? undefined;
  const ids = (sp.get("ids") ?? "").split(",").filter((s) => /^[a-z0-9]{10,40}$/i.test(s)).slice(0, 100);

  const [messages, changes] = await Promise.all([
    community.messages(viewer, channel.id, { after, before, limit: 50 }),
    community.changesSince(viewer, channel.id, ids),
  ]);
  return NextResponse.json(
    { messages, changes, hasMore: before ? messages.length === 50 : undefined },
    { headers: { "Cache-Control": "no-store" } }
  );
}
