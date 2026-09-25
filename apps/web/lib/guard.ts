/**
 * Server-side authorization gate — the Data Access Layer.
 *
 * Layouts are NOT a security boundary in the Next.js App Router: a crafted RSC
 * navigation (RSC:1 + a Next-Router-State-Tree that already lists the parent
 * segment) makes the framework skip the layout and render the page alone. So a
 * layout-only check leaks every page under it. Each protected page MUST call one
 * of these itself, so authorization travels with the data, not with the chrome.
 *
 * See TYCOONHOOD_DECISIONS.md DR-3.
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

/** Gate for member pages. Returns the onboarded user or redirects. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.profile?.onboardedAt) redirect("/onboarding");
  return user;
}

/** Gate for member pages that must load before onboarding is complete. */
export async function requireSignedIn() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Gate for admin pages. Re-checks role in the page itself, not just the layout. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
