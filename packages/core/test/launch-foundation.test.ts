import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@tycoonhood/db";
import { CommerceService, OutOfStockError, VariantRequiredError, ShippingAddressRequiredError } from "../src/commerce/commerce";
import { CatalogService, validateProduct, reviewProduct } from "../src/catalog/catalog";
import { ReferralService, SelfReferralError, AlreadyReferredError, UnknownCodeError } from "../src/growth/referrals";
import { WatchService, TooSoonError, NoProgressError, DailyCapReachedError, AlreadyPaidError } from "../src/growth/watch";
import { LedgerService } from "../src/ledger/ledger";
import { priceInTime, judgePrice, thcFor, suggestPrice, dailyYield } from "../src/economy/mining-time";
import { createTestUser, uid } from "./helpers";
import { REFERRAL, WATCH } from "@tycoonhood/config";

const commerce = new CommerceService(prisma);
const catalog = new CatalogService(prisma);
const referrals = new ReferralService(prisma);
const watch = new WatchService(prisma);
const ledger = new LedgerService(prisma);

const products: string[] = [];
const tasks: string[] = [];

afterEach(async () => {
  if (products.length) {
    // Orders point at these products, so they go first. Ledger rows reference
    // an order by string id, not a foreign key, so the book stays intact.
    const orderIds = (
      await prisma.orderItem.findMany({
        where: { productId: { in: products } },
        select: { orderId: true },
      })
    ).map((o) => o.orderId);
    if (orderIds.length) await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.product.deleteMany({ where: { id: { in: products } } });
    products.length = 0;
  }
  if (tasks.length) {
    await prisma.watchTask.deleteMany({ where: { id: { in: tasks } } });
    tasks.length = 0;
  }
});

async function fund(userId: string, amount: bigint) {
  await ledger.reward({
    userId,
    amount,
    reason: "REWARD_ADMIN",
    idempotencyKey: `fund:${uid()}`,
    memo: "test funding",
  });
}

const ADDRESS = {
  fullName: "A Member",
  line1: "1 Test Street",
  city: "Mysore",
  postalCode: "570001",
  country: "IN",
};

// ════════════════════════════════════════════ STOCK

describe("stock is taken atomically — the last hoodie sells once", () => {
  it("two simultaneous buyers of one unit produce one order and one sale", async () => {
    const p = await catalog.save({
      slug: `t-stock-${uid().slice(0, 6)}`,
      kind: "PHYSICAL", name: "One Hoodie", description: "the last one",
      priceThc: 100n, inventory: 1, active: true,
    });
    products.push(p.id);

    const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
    await Promise.all([fund(a.id, 1000n), fund(b.id, 1000n)]);

    const results = await Promise.allSettled([
      commerce.checkoutWithThc(a.id, p.slug, { shipping: ADDRESS }),
      commerce.checkoutWithThc(b.id, p.slug, { shipping: ADDRESS }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(OutOfStockError);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.inventory).toBe(0);
  });

  it("stock never goes negative even under a burst", async () => {
    const p = await catalog.save({
      slug: `t-burst-${uid().slice(0, 6)}`,
      kind: "PHYSICAL", name: "Three Caps", description: "three of them",
      priceThc: 10n, inventory: 3, active: true,
    });
    products.push(p.id);

    const buyers = await Promise.all(Array.from({ length: 8 }, () => createTestUser()));
    await Promise.all(buyers.map((u) => fund(u.id, 100n)));

    const results = await Promise.allSettled(
      buyers.map((u) => commerce.checkoutWithThc(u.id, p.slug, { shipping: ADDRESS }))
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.inventory).toBe(0);
  });
});

// ════════════════════════════════════════════ VARIANTS

describe("variants — a hoodie is five sizes with five stock counts", () => {
  it("sells the chosen size and decrements only that size", async () => {
    const slug = `t-var-${uid().slice(0, 6)}`;
    const p = await catalog.save({
      slug, kind: "PHYSICAL", name: "Sized Hoodie", description: "five sizes",
      priceThc: 500n, active: true,
      variants: ["S", "M", "L", "XL", "XXL"].map((label, i) => ({
        sku: `${slug.toUpperCase().slice(0, 8)}-${label}`, label, inventory: 2, sortOrder: i,
      })),
    });
    products.push(p.id);
    expect(p.variants).toHaveLength(5);

    const m = p.variants.find((v) => v.label === "M")!;
    const user = await createTestUser();
    await fund(user.id, 1000n);

    const order = await commerce.checkoutWithThc(user.id, slug, { variantId: m.id, shipping: ADDRESS });
    expect(order.items[0].variantLabel).toBe("M");
    expect(order.status).toBe("PAID"); // physical: waits for shipping

    const fresh = await prisma.productVariant.findMany({ where: { productId: p.id } });
    expect(fresh.find((v) => v.label === "M")!.inventory).toBe(1);
    expect(fresh.find((v) => v.label === "L")!.inventory).toBe(2);
  });

  it("refuses to sell a sized product without a size", async () => {
    const slug = `t-nosize-${uid().slice(0, 6)}`;
    const p = await catalog.save({
      slug, kind: "PHYSICAL", name: "Sized Tee", description: "pick one",
      priceThc: 200n, active: true,
      variants: [{ sku: `TEE-${uid().slice(0, 4).toUpperCase()}`, label: "M", inventory: 5 }],
    });
    products.push(p.id);
    const user = await createTestUser();
    await fund(user.id, 1000n);
    await expect(commerce.checkoutWithThc(user.id, slug, { shipping: ADDRESS }))
      .rejects.toBeInstanceOf(VariantRequiredError);
  });

  it("a size override beats the product price", async () => {
    const slug = `t-ovr-${uid().slice(0, 6)}`;
    const p = await catalog.save({
      slug, kind: "PHYSICAL", name: "Big Hoodie", description: "XXL costs more",
      priceThc: 500n, active: true,
      variants: [
        { sku: `OVR-${uid().slice(0, 4).toUpperCase()}-M`, label: "M", inventory: 1 },
        { sku: `OVR-${uid().slice(0, 4).toUpperCase()}-X`, label: "XXL", inventory: 1, priceThc: 750n },
      ],
    });
    products.push(p.id);
    const xxl = p.variants.find((v) => v.label === "XXL")!;
    const user = await createTestUser();
    await fund(user.id, 2000n);
    const wallet = await ledger.ensureUserAccount(user.id);
    const before = await ledger.getBalance(wallet.id);

    await commerce.checkoutWithThc(user.id, slug, { variantId: xxl.id, shipping: ADDRESS });
    const after = await ledger.getBalance(wallet.id);
    expect(before - after).toBe(750n);
  });
});

// ════════════════════════════════════════════ SHIPPING

describe("a paid parcel has somewhere to go", () => {
  it("refuses a physical checkout with no address, and takes no stock", async () => {
    const slug = `t-addr-${uid().slice(0, 6)}`;
    const p = await catalog.save({
      slug, kind: "PHYSICAL", name: "Chalk", description: "nano chalk",
      priceThc: 50n, inventory: 4, active: true,
    });
    products.push(p.id);
    const user = await createTestUser();
    await fund(user.id, 500n);

    await expect(commerce.checkoutWithThc(user.id, slug))
      .rejects.toBeInstanceOf(ShippingAddressRequiredError);

    // The failed attempt must not have held a unit hostage.
    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.inventory).toBe(4);
  });

  it("stores the address as a snapshot on the order and ships it", async () => {
    const slug = `t-ship-${uid().slice(0, 6)}`;
    const p = await catalog.save({
      slug, kind: "PHYSICAL", name: "Shipped Hoodie", description: "goes in the post",
      priceThc: 100n, inventory: 1, active: true,
    });
    products.push(p.id);
    const user = await createTestUser();
    await fund(user.id, 500n);

    const order = await commerce.checkoutWithThc(user.id, slug, { shipping: ADDRESS });
    expect(order.address?.city).toBe("Mysore");
    expect(order.address?.country).toBe("IN");
    expect(order.status).toBe("PAID");

    const shipped = await commerce.markShipped(order.id, "India Post", "EE123456789IN");
    expect(shipped.status).toBe("FULFILLED");
    expect(shipped.trackingNumber).toBe("EE123456789IN");
    expect(shipped.shippedAt).toBeInstanceOf(Date);
  });
});

// ════════════════════════════════════════════ PRICING RULE

describe("a THC price is stated in months of mining", () => {
  it("reads a price back as time, and flags one that breaks the house rule", () => {
    const cheap = priceInTime(500n);
    expect(cheap.verdict).toBe("too cheap");

    const target = priceInTime(suggestPrice());
    expect(target.verdict).toBe("on target");
    expect(target.summary).toMatch(/month|day/);

    const silly = priceInTime(10_000_000n);
    expect(silly.verdict).toBe("too expensive");
  });

  it("a regular member out-earns a casual one, and neither beats the rig", () => {
    expect(dailyYield(1, "regular")).toBeGreaterThan(dailyYield(1, "casual"));
    expect(dailyYield(1, "dedicated")).toBeGreaterThanOrEqual(dailyYield(1, "regular"));
    expect(dailyYield(1, "dedicated")).toBeLessThanOrEqual(12n * 24n);
  });

  it("judges a small item against its shelf price, not against the hoodie", () => {
    // 3,200 THC for a $16 bottle of chalk is correct at the house rate. The
    // old rule called it "too cheap" purely because it is a small item.
    const chalk = judgePrice(3_200n, 1_600);
    expect(chalk.verdict).toBe("on target");
    expect(priceInTime(3_200n).verdict).toBe("too cheap"); // the naive reading

    // Genuinely underpriced against its own shelf price.
    expect(judgePrice(500n, 1_600).verdict).toBe("too cheap");
    // Genuinely overpriced against its own shelf price.
    expect(judgePrice(20_000n, 1_600).verdict).toBe("too expensive");
  });

  it("falls back to the mining window when there is no shelf price to anchor to", () => {
    expect(judgePrice(500n, null).verdict).toBe("too cheap");
    expect(judgePrice(suggestPrice(), null).verdict).toBe("on target");
  });

  it("the whole catalogue stays in proportion at one exchange rate", () => {
    // Hoodie $89 and chalk $16 should sit at the same THC-per-dollar.
    const hoodie = thcFor(8_900);
    const chalk = thcFor(1_600);
    const ratio = Number(hoodie) / Number(chalk);
    expect(ratio).toBeGreaterThan(4.5);
    expect(ratio).toBeLessThan(6.5);   // 89/16 = 5.6
    expect(judgePrice(hoodie, 8_900).verdict).toBe("on target");
    expect(judgePrice(chalk, 1_600).verdict).toBe("on target");
  });

  it("warns when a THC-only physical item has real cost behind it", () => {
    const notes = reviewProduct({
      slug: "x-hoodie", kind: "PHYSICAL", name: "H", description: "d",
      priceThc: suggestPrice(), costCents: 1800, active: true, inventory: 5,
    });
    expect(notes.join(" ")).toMatch(/real money out/);
  });

  it("refuses a product nobody could buy", () => {
    const errors = validateProduct({ slug: "x", kind: "PHYSICAL", name: "", description: "" });
    expect(errors.length).toBeGreaterThan(2);
    expect(errors.join(" ")).toMatch(/Slug/);
  });
});

// ════════════════════════════════════════════ REFERRALS

describe("referrals pay for work, not for signups", () => {
  it("signing up pays nothing; the first lesson pays both sides", async () => {
    const inviter = await createTestUser();
    const joiner = await createTestUser();
    const code = await referrals.codeFor(inviter.id);
    expect(code).toHaveLength(7);

    await referrals.attach(joiner.id, code);

    const iw = await ledger.ensureUserAccount(inviter.id);
    const jw = await ledger.ensureUserAccount(joiner.id);
    expect(await ledger.getBalance(iw.id)).toBe(0n);
    expect(await ledger.getBalance(jw.id)).toBe(0n);

    await referrals.qualify(joiner.id);

    expect(await ledger.getBalance(iw.id)).toBe(REFERRAL.referrerReward);
    expect(await ledger.getBalance(jw.id)).toBe(REFERRAL.referredReward);
  });

  it("qualifying twice pays once", async () => {
    const inviter = await createTestUser();
    const joiner = await createTestUser();
    await referrals.attach(joiner.id, await referrals.codeFor(inviter.id));
    await referrals.qualify(joiner.id);
    await referrals.qualify(joiner.id);
    const iw = await ledger.ensureUserAccount(inviter.id);
    expect(await ledger.getBalance(iw.id)).toBe(REFERRAL.referrerReward);
  });

  it("nobody refers themselves, and nobody is referred twice", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const c = await createTestUser();
    const codeA = await referrals.codeFor(a.id);
    const codeC = await referrals.codeFor(c.id);

    await expect(referrals.attach(a.id, codeA)).rejects.toBeInstanceOf(SelfReferralError);
    await referrals.attach(b.id, codeA);
    await expect(referrals.attach(b.id, codeC)).rejects.toBeInstanceOf(AlreadyReferredError);
    await expect(referrals.attach(b.id, "NOSUCH1")).rejects.toBeInstanceOf(UnknownCodeError);
  });

  it("a code is minted once and never changes", async () => {
    const u = await createTestUser();
    const first = await referrals.codeFor(u.id);
    expect(await referrals.codeFor(u.id)).toBe(first);
  });
});

// ════════════════════════════════════════════ WATCH-TO-EARN

async function makeTask(over: Partial<{ requiredSec: number; durationSec: number; rewardThc: bigint }> = {}) {
  const t = await prisma.watchTask.create({
    data: {
      slug: `t-watch-${uid().slice(0, 8)}`,
      title: "A Tycoonhood video",
      youtubeVideoId: "dQw4w9WgXcQ",
      durationSec: over.durationSec ?? 60,
      requiredSec: over.requiredSec ?? 30,
      rewardThc: over.rewardThc ?? 100n,
      rewardXp: 10,
      active: true,
    },
  });
  tasks.push(t.id);
  return t;
}

describe("watch-to-earn pays for attention, not for calling an endpoint", () => {
  it("refuses to settle before the clock says it could have been watched", async () => {
    const user = await createTestUser();
    const task = await makeTask();
    await watch.start(user.id, task.slug);
    await expect(watch.settle(user.id, task.slug)).rejects.toBeInstanceOf(TooSoonError);
  });

  it("refuses to settle when the player never reported progress", async () => {
    const user = await createTestUser();
    const task = await makeTask({ requiredSec: 30 });
    const started = new Date(Date.now() - 60_000);
    await watch.start(user.id, task.slug, started);
    // Enough wall-clock has passed, but no heartbeats ever arrived.
    await expect(watch.settle(user.id, task.slug)).rejects.toBeInstanceOf(NoProgressError);
  });

  it("pays once when the time passed and the player reported it", async () => {
    const user = await createTestUser();
    const task = await makeTask({ requiredSec: 30, rewardThc: 250n });
    const started = new Date(Date.now() - 60_000);
    await watch.start(user.id, task.slug, started);
    await watch.heartbeat(user.id, task.slug, 45);

    const wallet = await ledger.ensureUserAccount(user.id);
    const before = await ledger.getBalance(wallet.id);
    const result = await watch.settle(user.id, task.slug);
    expect(result.rewardThc).toBe(250n);
    expect((await ledger.getBalance(wallet.id)) - before).toBe(250n);

    await expect(watch.settle(user.id, task.slug)).rejects.toBeInstanceOf(AlreadyPaidError);
  });

  it("a heartbeat cannot claim more than the wall-clock allows", async () => {
    const user = await createTestUser();
    const task = await makeTask({ durationSec: 600, requiredSec: 300 });
    await watch.start(user.id, task.slug);
    // Claim five minutes one second after starting.
    const c = await watch.heartbeat(user.id, task.slug, 300);
    expect(c.secondsWatched).toBeLessThan(5);
  });

  it("stops paying after the daily cap", async () => {
    const user = await createTestUser();
    const started = new Date(Date.now() - 120_000);
    for (let i = 0; i < WATCH.dailyTaskCap; i++) {
      const t = await makeTask({ requiredSec: 10 });
      await watch.start(user.id, t.slug, started);
      await watch.heartbeat(user.id, t.slug, 30);
      await watch.settle(user.id, t.slug);
    }
    const extra = await makeTask({ requiredSec: 10 });
    await expect(watch.start(user.id, extra.slug)).rejects.toBeInstanceOf(DailyCapReachedError);
  });

  it("restarting does not reset the clock in the member's favour", async () => {
    const user = await createTestUser();
    const task = await makeTask();
    const first = await watch.start(user.id, task.slug);
    const again = await watch.start(user.id, task.slug);
    expect(again.resumed).toBe(true);
    expect(again.completion.startedAt.getTime()).toBe(first.completion.startedAt.getTime());
  });
});

// ════════════════════════════════════════════ AUTHORING IS IDEMPOTENT

describe("saving the same product twice edits it instead of colliding", () => {
  it("re-saving with the same SKUs updates stock rather than failing", async () => {
    const slug = `t-again-${uid().slice(0, 6)}`;
    const sku = `AGAIN${uid().slice(0, 4).toUpperCase()}`;
    const first = await catalog.save({
      slug, kind: "PHYSICAL", name: "Re-saved Hoodie", description: "saved twice",
      priceThc: 500n, active: true,
      variants: [{ sku: `${sku}-M`, label: "M", inventory: 4 }],
    });
    products.push(first.id);
    expect(first.variants[0].inventory).toBe(4);

    // Exactly what the admin form posts on a second save: no variant ids.
    const second = await catalog.save({
      slug, kind: "PHYSICAL", name: "Re-saved Hoodie", description: "saved twice",
      priceThc: 500n, active: true,
      variants: [{ sku: `${sku}-M`, label: "M", inventory: 9 }],
    });
    expect(second.variants.filter((v) => v.active)).toHaveLength(1);
    expect(second.variants[0].id).toBe(first.variants[0].id);
    expect(second.variants[0].inventory).toBe(9);
  });

  it("refuses a SKU that belongs to another product, and names it", async () => {
    const sku = `TAKEN${uid().slice(0, 4).toUpperCase()}-M`;
    const a = await catalog.save({
      slug: `t-owner-${uid().slice(0, 6)}`, kind: "PHYSICAL", name: "Owner Hoodie",
      description: "owns the sku", priceThc: 500n,
      variants: [{ sku, label: "M", inventory: 1 }],
    });
    products.push(a.id);

    await expect(
      catalog.save({
        slug: `t-thief-${uid().slice(0, 6)}`, kind: "PHYSICAL", name: "Thief Hoodie",
        description: "wants the sku", priceThc: 500n,
        variants: [{ sku, label: "M", inventory: 1 }],
      })
    ).rejects.toThrow(/Owner Hoodie/);
  });

  it("a size dropped from the form is retired, never deleted", async () => {
    const slug = `t-retire-${uid().slice(0, 6)}`;
    const base = `RET${uid().slice(0, 4).toUpperCase()}`;
    const first = await catalog.save({
      slug, kind: "PHYSICAL", name: "Retiring Hoodie", description: "loses a size",
      priceThc: 500n,
      variants: [
        { sku: `${base}-M`, label: "M", inventory: 2 },
        { sku: `${base}-L`, label: "L", inventory: 2 },
      ],
    });
    products.push(first.id);

    const second = await catalog.save({
      slug, kind: "PHYSICAL", name: "Retiring Hoodie", description: "loses a size",
      priceThc: 500n,
      variants: [{ sku: `${base}-M`, label: "M", inventory: 2 }],
    });
    const retired = second.variants.find((v) => v.label === "L");
    expect(retired).toBeDefined();           // the row survives — orders point at it
    expect(retired!.active).toBe(false);     // but it is off the storefront
  });
});
