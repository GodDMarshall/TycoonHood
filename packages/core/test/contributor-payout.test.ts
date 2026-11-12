/**
 * A payout may now belong to a contributor instead of an affiliate
 * (data-model 0.5, directive §2 and §12): PayoutRequest.affiliateId is null
 * and contributorId is set, exactly one of the two (PayoutRequest_one_payee).
 * The affiliate programme reads the same table, so each of its payout
 * queries and actions, and the admin earn page, keeps to affiliate payouts:
 * a contributor payout neither breaks them nor shows up as an affiliate's.
 *
 * The admin earn page runs here as written, with the signed-in user, Next's
 * cache and the "server-only" marker stood in for, as in course-admin-web.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import type { UserRole } from "@tycoonhood/db";
import { AffiliateService, EarnError } from "../src/earn";
import { createTestUser, uid } from "./helpers";

const session = vi.hoisted(() => ({ user: null as { id: string; role: UserRole } | null }));
vi.mock("../../../apps/web/lib/auth", () => ({ getCurrentUser: async () => session.user }));
vi.mock("../../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: () => {} }));
vi.mock("../../../apps/web/node_modules/server-only/index.js", () => ({}));

/** A module of the web app. The path is a variable, so core's typecheck leaves the web app's JSX alone. */
function webModule<T>(path: string): Promise<T> {
  return import(/* @vite-ignore */ new URL(`../../../apps/web/${path}`, import.meta.url).href);
}

type State = { message?: string; error?: string };
const earnPage = () =>
  webModule<{ default: (props: { searchParams: Promise<{ tab?: string; status?: string }> }) => Promise<unknown> }>("app/(app)/admin/earn/page.tsx").then(
    (m) => m.default
  );
const earnActions = () =>
  webModule<{
    approvePayoutAction: (id: string, prev: State, fd: FormData) => Promise<State>;
    markPayoutPaidAction: (id: string, prev: State, fd: FormData) => Promise<State>;
    rejectPayoutAction: (id: string, prev: State, fd: FormData) => Promise<State>;
  }>("app/(app)/admin/earn/actions.ts");

const earn = new AffiliateService(prisma);
const OPEN = ["REQUESTED", "APPROVED"] as const;
const upi = () => `t${uid().replace(/-/g, "").slice(0, 12)}@okbank`;

let admin: { id: string; role: UserRole };
let affiliate: { userId: string; profileId: string; code: string };
let affiliatePayout: { id: string };
let contributorPayout: { id: string };
let contributorUserId: string;
const made: { payouts: string[]; accounts: string[] } = { payouts: [], accounts: [] };

beforeAll(async () => {
  const a = await createTestUser();
  admin = { id: a.id, role: "ADMIN" };
  await prisma.user.update({ where: { id: a.id }, data: { role: "ADMIN" } });

  // An approved affiliate with an open payout of their own.
  const member = await createTestUser();
  await prisma.user.update({ where: { id: member.id }, data: { emailVerified: new Date() } });
  const profile = await earn.register(member.id, { channels: "A podcast about money", payoutMethod: { type: "UPI", upiId: upi() }, acceptTerms: true });
  await earn.approve(admin.id, profile.id);
  affiliate = { userId: member.id, profileId: profile.id, code: profile.code };
  affiliatePayout = await prisma.payoutRequest.create({
    data: { affiliateId: profile.id, amountCents: 60_000, status: "REQUESTED", method: { type: "UPI", upiId: upi() } },
  });
  made.payouts.push(affiliatePayout.id);

  // A contributor (a mentor, say) with an open payout: no affiliate at all.
  const contributor = await createTestUser();
  contributorUserId = contributor.id;
  const account = await prisma.contributorAccount.create({
    data: { userId: contributor.id, termsVersion: "test", termsAcceptedAt: new Date(), payoutMethod: { type: "UPI", upiId: upi() } },
  });
  made.accounts.push(account.id);
  contributorPayout = await prisma.payoutRequest.create({
    data: { contributorId: account.id, amountCents: 75_000, status: "REQUESTED", method: { type: "UPI", upiId: upi() } },
  });
  made.payouts.push(contributorPayout.id);
});

afterAll(async () => {
  session.user = null;
  await prisma.payoutRequest.deleteMany({ where: { id: { in: made.payouts } } });
  await prisma.contributorAccount.deleteMany({ where: { id: { in: made.accounts } } });
});

describe("the database", () => {
  it("holds exactly one payee per payout", async () => {
    await expect(
      prisma.payoutRequest.create({ data: { amountCents: 1, method: { type: "UPI", upiId: upi() } } })
    ).rejects.toThrow(/PayoutRequest_one_payee/);
    await expect(
      prisma.payoutRequest.create({
        data: { affiliateId: affiliate.profileId, contributorId: made.accounts[0], amountCents: 1, method: { type: "UPI", upiId: upi() } },
      })
    ).rejects.toThrow(/PayoutRequest_one_payee/);
  });
});

describe("the affiliate programme's payout queries", () => {
  it("the admin list shows affiliate payouts only, and counts only those", async () => {
    for (const status of [undefined, "REQUESTED"] as const) {
      const { rows, total } = await earn.listPayouts({ status, take: 200 });
      expect(rows.map((p) => p.id)).not.toContain(contributorPayout.id);
      expect(rows.map((p) => p.id)).toContain(affiliatePayout.id);
      for (const p of rows) expect(p.affiliate).not.toBeNull();
      expect(total).toBe(await prisma.payoutRequest.count({ where: { affiliateId: { not: null }, ...(status ? { status } : {}) } }));
    }
  });

  it("a member's own payouts and summary are about their affiliate payouts", async () => {
    expect((await earn.payoutsFor(affiliate.userId)).map((p) => p.id)).toEqual([affiliatePayout.id]);
    expect((await earn.summary(affiliate.userId))?.openPayout?.id).toBe(affiliatePayout.id);
    // The contributor has no affiliate profile, so the affiliate programme has nothing of theirs.
    expect(await earn.payoutsFor(contributorUserId)).toEqual([]);
    expect(await earn.summary(contributorUserId)).toBeNull();
  });

  it("approving, paying or declining a contributor payout through the affiliate programme is refused and changes nothing", async () => {
    const before = await prisma.payoutRequest.findUniqueOrThrow({ where: { id: contributorPayout.id } });
    for (const attempt of [
      () => earn.approvePayout(admin.id, contributorPayout.id),
      () => earn.markPayoutPaid(admin.id, contributorPayout.id, "UTR123"),
      () => earn.rejectPayout(admin.id, contributorPayout.id, "Not an affiliate payout"),
    ]) {
      const err = await attempt().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(EarnError);
      expect((err as Error).message).toBe("Payout request not found.");
    }
    expect(await prisma.payoutRequest.findUniqueOrThrow({ where: { id: contributorPayout.id } })).toEqual(before);
    expect(await prisma.auditLog.count({ where: { targetType: "PayoutRequest", targetId: contributorPayout.id } })).toBe(0);
  });

  it("the admin's buttons for it answer with that message instead of failing", async () => {
    const actions = await earnActions();
    session.user = admin;
    const fd = new FormData();
    fd.set("reference", "UTR123");
    fd.set("reason", "Not an affiliate payout");
    try {
      expect(await actions.approvePayoutAction(contributorPayout.id, {}, fd)).toEqual({ error: "Payout request not found." });
      expect(await actions.markPayoutPaidAction(contributorPayout.id, {}, fd)).toEqual({ error: "Payout request not found." });
      expect(await actions.rejectPayoutAction(contributorPayout.id, {}, fd)).toEqual({ error: "Payout request not found." });
    } finally {
      session.user = null;
    }
    expect((await prisma.payoutRequest.findUniqueOrThrow({ where: { id: contributorPayout.id } })).status).toBe("REQUESTED");
  });
});

// ───────────────────────────────────────────────────────── the admin earn page

/** A React element (core cannot import react). */
type El = { $$typeof: symbol; type: unknown; key: string | null; props: Record<string, unknown> };
const isElement = (n: unknown): n is El => !!n && typeof n === "object" && typeof (n as { $$typeof?: unknown }).$$typeof === "symbol" && "props" in n;

/**
 * The page's tree with each async server component it uses (the payout list,
 * the unreversed-commission warning) rendered in place, as React would on the
 * server: that is where the rows are loaded and drawn.
 */
async function rendered(node: unknown): Promise<unknown> {
  if (Array.isArray(node)) return Promise.all(node.map(rendered));
  if (!isElement(node)) return node;
  if (typeof node.type === "function" && node.type.constructor.name === "AsyncFunction") {
    return rendered(await (node.type as (p: unknown) => Promise<unknown>)(node.props));
  }
  const props: Record<string, unknown> = { ...node.props };
  if ("children" in props) props.children = await rendered(props.children);
  return { ...node, props };
}

/** The element keyed with this id (a list row), if the tree has one. */
function elementWithKey(node: unknown, key: string): El | undefined {
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = elementWithKey(n, key);
      if (found) return found;
    }
    return undefined;
  }
  if (!isElement(node)) return undefined;
  if (node.key === key) return node;
  return elementWithKey(node.props.children, key);
}

/** The number a tab link shows beside its label, or 0 when it shows none. */
function tabCount(tab: El): number {
  const children = ([] as unknown[]).concat(tab.props.children);
  const badge = children.find((c): c is El => isElement(c) && String(c.props.className ?? "").includes("figures"));
  return badge ? Number(badge.props.children) : 0;
}

describe("the admin earn page", () => {
  it("lists the affiliate payouts, not the contributor's, and counts only affiliate payouts as waiting", async () => {
    const AdminEarnPage = await earnPage();
    session.user = admin;
    let tree: unknown;
    try {
      tree = await rendered(await AdminEarnPage({ searchParams: Promise.resolve({ tab: "payouts", status: "all" }) }));
    } finally {
      session.user = null;
    }
    expect(elementWithKey(tree, affiliatePayout.id)).toBeDefined();
    expect(elementWithKey(tree, contributorPayout.id)).toBeUndefined();

    const payoutsTab = elementWithKey(tree, "payouts");
    expect(payoutsTab).toBeDefined();
    expect(tabCount(payoutsTab!)).toBe(await prisma.payoutRequest.count({ where: { status: { in: [...OPEN] }, affiliateId: { not: null } } }));
  });
});
