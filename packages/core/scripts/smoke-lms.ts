import { readFileSync } from "node:fs"; import { resolve } from "node:path";
const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { prisma } = await import("@tycoonhood/db");
const { accounts, sessions, lms } = await import("../src/index");
const stamp = Date.now().toString(36);
const user = await accounts.register({ email: `lms-${stamp}@tycoonhood.test`, password: "a-strong-password", name: "LMS Smoke" });
await accounts.completeOnboarding(user.id, { username: `lms_${stamp}`, displayName: "LMS Smoke", goals: ["Build a business"], interests: [], experienceLevel: "Just starting" });
await lms.enroll(user.id, "warrior");
const lesson = await prisma.lesson.findFirstOrThrow({ where: { module: { course: { slug: "warrior" } }, sortOrder: 0, type: "READING" } });
const { raw } = await sessions.create(user.id, {});
console.log(JSON.stringify({ token: raw, lessonId: lesson.id }));
process.exit(0);
