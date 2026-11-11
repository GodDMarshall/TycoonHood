import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { AppShell } from "../../components/app/app-shell";
import { VerifyBanner } from "../../components/app/verify-banner";
import { MaintenanceBanner } from "../../components/maintenance-banner";
import { resendVerificationAction } from "./settings/actions";

/**
 * The member app. The redirects here are convenience, not security —
 * every page re-authorizes itself through lib/guard (DR-3).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.profile?.onboardedAt) redirect("/onboarding");
  return (
    <AppShell user={user}>
      <MaintenanceBanner />
      {!user.emailVerified && <VerifyBanner email={user.email} resend={resendVerificationAction} />}
      {children}
    </AppShell>
  );
}
