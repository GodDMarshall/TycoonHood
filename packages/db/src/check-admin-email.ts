/**
 * Checks ADMIN_EMAIL the way the seed will (admin-email.ts), before a deploy
 * touches the database. scripts/vercel-build.sh and scripts/deploy-db.mjs run
 * it first, so a value sign-in would refuse stops the deploy before any
 * migration, as a missing one does.
 *
 * Run: pnpm --filter @tycoonhood/db check:admin-email
 */
import { adminEmailFrom } from "./admin-email";

try {
  adminEmailFrom(process.env.ADMIN_EMAIL);
} catch (e) {
  console.error((e as Error).message.replace(/^Refusing to seed: /, ""));
  process.exit(1);
}
