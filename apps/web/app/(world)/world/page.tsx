import type { Metadata } from "next";
import { requireUser } from "../../../lib/guard";
import { getWorldState } from "../../../lib/world-state";
import { WorldHost } from "../../../components/world/world-host";

export const metadata: Metadata = { title: "HQ", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The member's home: the walkable HQ, fed by live data read here, authorized here (DR-3). */
export default async function WorldPage() {
  const user = await requireUser();
  const state = await getWorldState(user);
  return <WorldHost state={state} />;
}
