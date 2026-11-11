/**
 * ONE-OFF REPAIR — programme completions that were never announced.
 *
 * Before the 0-XP fix, completing a programme set to 0 XP marked the
 * enrolment COMPLETED and then failed, before the certificate, the
 * "Program complete" notice and COURSE_COMPLETED. This issues any
 * certificate now due and announces each such completion once (see
 * LmsService.repairUnannouncedCompletions). It pays no completion XP.
 *
 *   pnpm --filter @tycoonhood/core exec tsx scripts/repair-course-completions.ts
 *
 * Run it once on a database that ran an earlier build. Safe to run again:
 * a repaired completion has its notice, so it is skipped.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env only when the variables are not already set, so a real
// deployment's environment always wins over a local file.
const envPath = resolve(process.cwd(), "../../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"\n\r]*)"?\r?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { prisma } = await import("@tycoonhood/db");
const { LmsService } = await import("../src/lms/lms");

const out = await new LmsService(prisma).repairUnannouncedCompletions();
console.log(
  `Completed enrolments checked: ${out.checked}. Announced now: ${out.repaired}. Failed: ${out.failed}.`
);
await prisma.$disconnect();
process.exit(out.failed > 0 ? 1 : 0);
