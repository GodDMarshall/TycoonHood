import type { ReactNode } from "react";
import { Page } from "../../../components/app/page";
import { MinerSubnav } from "../../../components/mining/miner-subnav";

/**
 * THE MINER, inside the member app. Chrome only: every page under here
 * re-authorizes itself with requireUser (DR-3) — a layout is not a boundary.
 */
export default function MiningLayout({ children }: { children: ReactNode }) {
  return (
    <Page>
      <MinerSubnav />
      {children}
    </Page>
  );
}
