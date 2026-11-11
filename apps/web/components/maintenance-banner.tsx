/** The admin's site-wide notice (Admin → Site & CMS → Platform). Renders nothing when empty. */
import { getSetting } from "@tycoonhood/core";

export async function MaintenanceBanner() {
  const { maintenanceBanner } = await getSetting("platform").catch(() => ({ maintenanceBanner: "" }));
  if (!maintenanceBanner) return null;
  return (
    <div role="status" className="border-b border-warning/40 bg-bg-1 px-4 py-2 text-center text-[13px] text-ink-1">
      {maintenanceBanner}
    </div>
  );
}
