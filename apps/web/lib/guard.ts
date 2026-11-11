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
import { can, type Permission } from "@tycoonhood/core";
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
  if (user.role !== "ADMIN") redirect("/today");
  return user;
}

/** Gate for a staff surface: the user must hold this permission (see core auth/permissions). */
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, permission)) redirect("/today");
  return user;
}

/** For server actions: throws instead of redirecting, so the form can show the error. */
export async function actorWith(permission: Permission) {
  const user = await getCurrentUser();
  if (!user || !can(user, permission)) throw new Error("You do not have permission to do that.");
  return user;
}
