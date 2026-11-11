import type { Metadata } from "next";
import { requireUser } from "../../../lib/guard";
import { getWorldState } from "../../../lib/world-state";
import { WorldHost } from "../../../components/world/world-host";
import { WorldFallback } from "../../../components/world/fallback";

export const metadata: Metadata = { title: "3D campus", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The optional 3D campus (DR-30), for every onboarded member. Authorized
 * here, not by the layout (DR-3). The 2D page is rendered on the server and
 * is the whole page until the device decides it can draw the campus.
 */
export default async function WorldPage() {
  const user = await requireUser();
  const state = await getWorldState(user.id);
  return <WorldHost state={state} fallback={<WorldFallback state={state} />} />;
}
