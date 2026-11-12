/**
 * THE ADMIN'S ADDRESS, read the way sign-in reads it (review finding 18 and
 * its follow-up).
 *
 * Sign-in parses what is typed with loginSchema in packages/core
 * (src/auth/schemas.ts): z.string().trim().toLowerCase().email(). An address
 * that rule refuses can never be typed back, so an admin stored with it is an
 * admin nobody can sign in as. A looser check let through addresses like
 * owner@localhost, owner@example.c, and a value entered in Vercel with its
 * quote marks, which Vercel keeps. The seed now applies sign-in's own rule,
 * from the same zod; packages/core/test/seed-admin.test.ts checks that the two
 * accept and store exactly the same addresses.
 *
 * check-admin-email.ts runs the same check on its own, so a deploy refuses a
 * bad ADMIN_EMAIL before it touches the database (scripts/vercel-build.sh,
 * scripts/deploy-db.mjs).
 */
import { z } from "zod";

/** The address rule of loginSchema and registerSchema in packages/core/src/auth/schemas.ts. */
const signInAddress = z.string().trim().toLowerCase().email();

/** The address ADMIN_EMAIL gives, as sign-in will look it up. Throws, saying what is wrong, when sign-in would refuse it. */
export function adminEmailFrom(raw: string | undefined): string {
  const value = raw ?? "admin@tycoonhood.local";
  const parsed = signInAddress.safeParse(value);
  if (parsed.success) return parsed.data;
  if (/^\s*["'“”‘’]|["'“”‘’]\s*$/.test(value)) {
    throw new Error(
      `Refusing to seed: ADMIN_EMAIL has quote marks around it: ${value}. Enter the address alone, without them.`
    );
  }
  throw new Error(
    `Refusing to seed: ADMIN_EMAIL "${value}" is not an address sign-in accepts. ` +
      "Use the full address you will sign in with, like owner@example.com."
  );
}

/** Whether sign-in can find an account stored with this address: typing it back gives the same address. */
export function canSignInAs(stored: string): boolean {
  const parsed = signInAddress.safeParse(stored);
  return parsed.success && parsed.data === stored;
}
