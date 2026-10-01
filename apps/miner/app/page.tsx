import { forwardToWeb } from "../lib/web-url";

// The Miner lives in the member app now. Old links, bookmarks and installed
// PWAs land here and are sent on, permanently.
export const dynamic = "force-dynamic";

export default function MinerHomeRedirect() {
  forwardToWeb("/mining");
}
