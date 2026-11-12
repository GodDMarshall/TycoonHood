/**
 * The admin overview's "Open reports (discussions)" card counts the work the
 * moderation queue it links to lists: open reports on posts and comments
 * (discussions.openReportCount). reports.file also takes reports on events,
 * opportunities, partners, projects and members, which no queue shows yet, so
 * the card must not count those as work waiting in that queue.
 *
 * The page runs as written, with the stand-ins course-admin-web.test.ts uses:
 * the signed-in user, Next's cache and the "server-only" marker.
 */
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import type { UserRole } from "@tycoonhood/db";
import { discussions, reports } from "../src/discussions";
import { createTestUser, uid } from "./helpers";

const session = vi.hoisted(() => ({ user: null as { id: string; role: UserRole } | null }));
vi.mock("../../../apps/web/lib/auth", () => ({ getCurrentUser: async () => session.user }));
vi.mock("../../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: () => {} }));
vi.mock("../../../apps/web/node_modules/server-only/index.js", () => ({}));

/** A module of the web app. The path is a variable, so core's typecheck leaves the web app's JSX alone. */
function webModule<T>(path: string): Promise<T> {
  return import(/* @vite-ignore */ new URL(`../../../apps/web/${path}`, import.meta.url).href);
}
const overview = () => webModule<{ default: () => Promise<unknown> }>("app/(app)/admin/page.tsx").then((m) => m.default);

const reporters: string[] = [];
afterEach(() => {
  session.user = null;
});
afterAll(async () => {
  await prisma.contentReport.deleteMany({ where: { reporterId: { in: reporters } } });
});

/** The value given to the element whose `label` prop is `label` (a Stat), or undefined. */
function statValue(node: unknown, label: string, seen = new WeakSet<object>()): unknown {
  if (!node || typeof node !== "object" || seen.has(node)) return undefined;
  seen.add(node);
  const element = typeof (node as { $$typeof?: unknown }).$$typeof === "symbol" && "props" in node;
  const props = element ? ((node as { props?: Record<string, unknown> }).props ?? {}) : undefined;
  if (props && props.label === label) return props.value;
  for (const v of Object.values(props ?? node)) {
    const found = statValue(v, label, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe("the admin overview's discussion reports card", () => {
  it("counts what the moderation queue lists, not reports on targets no queue shows yet", async () => {
    const Overview = await overview();
    const admin = await createTestUser();
    await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN", emailVerified: new Date() } });
    const member = await createTestUser();
    reporters.push(admin.id, member.id);

    const card = async () => {
      session.user = { id: admin.id, role: "ADMIN" };
      const shown = statValue(await Overview(), "Open reports (discussions)");
      expect(shown, "the overview shows the discussion reports card to an administrator").toBeTypeOf("string");
      return Number(String(shown).replace(/\D/g, ""));
    };

    const before = await card();
    expect(before).toBe(await discussions.openReportCount());

    await reports.file(
      { id: member.id, role: "MEMBER" },
      { targetType: "event_feedback", targetId: `ef-${uid().slice(0, 8)}`, reason: "This feedback describes a session that never happened." }
    );

    expect(await card()).toBe(before);
    expect(await card()).toBe(await discussions.openReportCount());
  });
});
