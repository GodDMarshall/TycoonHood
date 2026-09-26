import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { SiteHeader } from "../../components/shell/site-header";

/**
 * The member shell. The redirects here are convenience, not security —
 * every page re-authorizes itself through lib/guard (DR-3).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.profile?.onboardedAt) redirect("/onboarding");

  return (
    <div className="min-h-dvh pb-24 lg:pb-0">
      <SiteHeader />
      <div id="content" tabIndex={-1} className="mx-auto max-w-[88rem] px-[var(--gutter)] py-8 outline-none md:py-12">
        {children}
      </div>
    </div>
  );
}
