import { afterAll, describe, it, expect } from "vitest";
import { prisma } from "@tycoonhood/db";
import { CommerceService } from "../src/commerce/commerce";
import { ManualSettlementService, ManualSettlementError } from "../src/commerce/manual-settlement";
import { ForbiddenError } from "../src/auth/permissions";
import { auditChanges, auditValue } from "../src/platform/audit";
import { createTestUser, uid } from "./helpers";

const commerce = new CommerceService(prisma);
const settlement = new ManualSettlementService(prisma);

describe("auditChanges — what an admin edit changed", () => {
  it("lists only the fields that differ, as from and to", () => {
    const before = { name: "Daily reader", xpReward: 50, thcReward: 10n, active: true };
    const after = { name: "Daily reader", xpReward: 75, thcReward: 25n, active: false };
    expect(auditChanges(before, after, ["name", "xpReward", "thcReward", "active"])).toEqual({
      xpReward: { from: 50, to: 75 },
      thcReward: { from: "10", to: "25" },
      active: { from: true, to: false },
    });
    expect(auditChanges(before, { ...before }, ["name", "xpReward", "thcReward", "active"])).toEqual({});
  });

  it("reports every listed field of a new record, from null", () => {
    expect(auditChanges(null, { slug: "watch-1", rewardThc: 5n, publishedAt: new Date("2026-11-11T00:00:00Z") }, ["slug", "rewardThc", "publishedAt"])).toEqual({
      slug: { from: null, to: "watch-1" },
      rewardThc: { from: null, to: "5" },
      publishedAt: { from: null, to: "2026-11-11T00:00:00.000Z" },
    });
  });

  it("compares JSON by value, whatever order its keys are in", () => {
    const before = { criteria: { event: "LESSON_COMPLETED", count: 3 } };
    expect(auditChanges(before, { criteria: { count: 3, event: "LESSON_COMPLETED" } }, ["criteria"])).toEqual({});
    expect(auditChanges(before, { criteria: { count: 4, event: "LESSON_COMPLETED" } }, ["criteria"])).toEqual({
      criteria: { from: { event: "LESSON_COMPLETED", count: 3 }, to: { count: 4, event: "LESSON_COMPLETED" } },
    });
  });

  it("keeps rows short: long text is cut, but a change after the cut still counts", () => {
    const long = "a".repeat(300);
    expect(auditValue(long)).toBe(`${"a".repeat(200)}… (300 characters)`);
    const changed = auditChanges({ description: long }, { description: `${long}b` }, ["description"]);
    expect(Object.keys(changed)).toEqual(["description"]);
  });
});

describe("Manual settlement of a legacy rupee order", () => {
  let productSlug = "";

  async function legacyOrder() {
    if (!productSlug) {
      productSlug = `settle-${uid().slice(0, 8)}`;
      await prisma.product.create({
        data: { slug: productSlug, kind: "DIGITAL", name: "Settle test pack", description: "test", active: true, priceFiatCents: 79_900, fiatCurrency: "INR" },
      });
    }
    const member = await createTestUser();
    return commerce.createFiatOrder(member.id, productSlug, "dev");
  }

  async function admin() {
    const u = await createTestUser();
    return prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
  }

  afterAll(async () => {
    if (productSlug) await prisma.product.update({ where: { slug: productSlug }, data: { active: false } });
  });

  it("settles it, fulfils it, and audits who did it with the status before and after", async () => {
    const order = await legacyOrder();
    const staff = await admin();
    const settled = await settlement.settle(staff, order.id);
    expect(settled.status).toBe("FULFILLED");
    expect(settled.paymentRef).toBe(`admin_${staff.id}`);

    const rows = await prisma.auditLog.findMany({ where: { action: "order.settle_manual", targetId: order.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: staff.id, targetType: "order" });
    expect(rows[0].meta).toEqual({ paymentRef: `admin_${staff.id}`, provider: "dev", from: "PENDING", to: "FULFILLED" });
  });

  it("refuses an order the payment flow owns: one with a Payment row", async () => {
    const order = await legacyOrder();
    await prisma.payment.create({ data: { orderId: order.id, provider: "razorpay", amountCents: 79_900, currency: "INR" } });
    const staff = await admin();
    await expect(settlement.settle(staff, order.id)).rejects.toBeInstanceOf(ManualSettlementError);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    expect(await prisma.auditLog.count({ where: { action: "order.settle_manual", targetId: order.id } })).toBe(0);
  });

  // Admin → Orders catches ManualSettlementError and redraws the list (settlePendingFiatAction),
  // so a click from a stale list must be refused with exactly that class, and write nothing.
  it("refuses an order another admin already settled, with a ManualSettlementError, and writes nothing", async () => {
    const order = await legacyOrder();
    const first = await admin();
    const second = await admin();
    await settlement.settle(first, order.id);
    const err = await settlement.settle(second, order.id).catch((e) => e);
    expect(err).toBeInstanceOf(ManualSettlementError);
    expect(err.message).toBe("This order is fulfilled, not pending.");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentRef).toBe(`admin_${first.id}`);
    expect(await prisma.auditLog.count({ where: { action: "order.settle_manual", targetId: order.id } })).toBe(1);
  });

  it("refuses an order cancelled since the list was drawn, with a ManualSettlementError", async () => {
    const order = await legacyOrder();
    await commerce.cancelFiatOrder(order.id);
    const err = await settlement.settle(await admin(), order.id).catch((e) => e);
    expect(err).toBeInstanceOf(ManualSettlementError);
    expect(err.message).toBe("This order is cancelled, not pending.");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect(await prisma.auditLog.count({ where: { action: "order.settle_manual", targetId: order.id } })).toBe(0);
  });

  it("needs admin.commerce", async () => {
    const order = await legacyOrder();
    const moderator = await prisma.user.update({ where: { id: (await createTestUser()).id }, data: { role: "MODERATOR" } });
    await expect(settlement.settle(moderator, order.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
  });
});
