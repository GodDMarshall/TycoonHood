import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { loginPath } from "../../lib/guard";
import { verifyLinkStateFor } from "../../lib/mail/verification";
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
  // Same target as the page guards, so the return path survives whichever redirect wins.
  if (!user) redirect(await loginPath());
  if (!user.profile?.onboardedAt) redirect("/onboarding");
  const confirmLink = user.emailVerified ? null : await verifyLinkStateFor(user.email);
  return (
    <AppShell user={user}>
      <MaintenanceBanner />
      {confirmLink && <VerifyBanner email={user.email} link={confirmLink} resend={resendVerificationAction} />}
      {children}
    </AppShell>
  );
}
