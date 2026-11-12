/**
 * COMMERCE (spec §23–§24, §28). THC checkout is fully real: order →
 * atomic stock take → ledger spend (linked, idempotent) → fulfilment.
 * Fiat rides the provider abstraction; settleFiatOrder() is the single
 * settlement path every provider (dev or Stripe) converges on.
 *
 * STOCK CORRECTNESS. Stock is taken in ONE guarded UPDATE, not a read
 * followed by a write. Two members buying the last hoodie at the same
 * instant used to both pass the check and both decrement; now exactly one
 * UPDATE matches a row and the other is told it is sold out. A CHECK
 * constraint in the database is the second line of defence.
 *
 * VARIANTS. A product with variant rows sells only through them — size is
 * where the stock lives. A product without variants behaves exactly as it
 * always did.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { Prisma, PrismaClient } from "@tycoonhood/db";
import { can } from "../auth/permissions";
import { LedgerService, InsufficientFundsError } from "../ledger/ledger";
import { LmsService } from "../lms/lms";

export class CommerceError extends Error {}
export class OutOfStockError extends CommerceError {}
export class ProductUnavailableError extends CommerceError {}
export class VariantRequiredError extends CommerceError {}
export class ShippingAddressRequiredError extends CommerceError {}
export { InsufficientFundsError };

/** What the buyer supplies for a physical item. Validated before any money moves. */
export interface ShippingInput {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export interface CheckoutInput {
  /** Required when the product has variants. */
  variantId?: string | null;
  /** Required when the product is PHYSICAL. */
  shipping?: ShippingInput | null;
}

/** A single line's resolved price and stock target. */
interface Resolved {
  productId: string;
  productName: string;
  kind: string;
  variantId: string | null;
  variantLabel: string | null;
  priceThc: bigint | null;
  priceFiatCents: number | null;
  fiatCurrency: string;
  physical: boolean;
}

export function requireShipping(input: ShippingInput | null | undefined): ShippingInput {
  if (!input) throw new ShippingAddressRequiredError("This item ships — we need a delivery address.");
  const need: (keyof ShippingInput)[] = ["fullName", "line1", "city", "postalCode", "country"];
  for (const k of need) {
    if (!String(input[k] ?? "").trim()) {
      throw new ShippingAddressRequiredError("Fill in name, street, city, postcode and country.");
    }
  }
  if (!/^[A-Za-z]{2}$/.test(input.country.trim())) {
    throw new ShippingAddressRequiredError("Country must be a two-letter code, like IN or GB.");
  }
  return input;
}

export class CommerceService {
  private ledger: LedgerService;
  private lms: LmsService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.ledger = new LedgerService(db);
    this.lms = new LmsService(db);
  }

  /** Resolves product + variant into one priced, purchasable line. */
  private async resolve(productSlug: string, variantId?: string | null): Promise<Resolved> {
    const product = await this.db.product.findUniqueOrThrow({
      where: { slug: productSlug },
      include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!product.active) throw new ProductUnavailableError("This item is not on sale.");

    const physical = product.kind === "PHYSICAL";

    if (product.variants.length > 0) {
      if (!variantId) throw new VariantRequiredError("Choose a size first.");
      const v = product.variants.find((x) => x.id === variantId);
      if (!v) throw new ProductUnavailableError("That size is not available.");
      return {
        productId: product.id,
        productName: product.name,
        kind: product.kind,
        variantId: v.id,
        variantLabel: v.label,
        priceThc: v.priceThc ?? product.priceThc,
        priceFiatCents: v.priceFiatCents ?? product.priceFiatCents,
        fiatCurrency: product.fiatCurrency,
        physical,
      };
    }

    if (variantId) throw new ProductUnavailableError("That size is not available.");
    return {
      productId: product.id,
      productName: product.name,
      kind: product.kind,
      variantId: null,
      variantLabel: null,
      priceThc: product.priceThc,
      priceFiatCents: product.priceFiatCents,
      fiatCurrency: product.fiatCurrency,
      physical,
    };
  }

  /**
   * ONE statement. The row is matched and decremented together, so a
   * concurrent buyer either matches the remaining stock or matches nothing
   * and is told the truth. NULL inventory means unlimited (digital goods).
   */
  private async takeStock(r: Resolved) {
    const affected = r.variantId
      ? await this.db.$executeRaw`
          UPDATE "ProductVariant" SET "inventory" = "inventory" - 1
          WHERE "id" = ${r.variantId} AND "inventory" >= 1`
      : await this.db.$executeRaw`
          UPDATE "Product"
          SET "inventory" = CASE WHEN "inventory" IS NULL THEN NULL ELSE "inventory" - 1 END
          WHERE "id" = ${r.productId} AND ("inventory" IS NULL OR "inventory" >= 1)`;
    if (affected === 0) throw new OutOfStockError("Sold out.");
  }

  /**
   * Multi-unit form of takeStock for the cart checkout (shop/checkout.ts):
   * the same single guarded statement, decrementing by `qty`. Throws
   * OutOfStockError when fewer than `qty` units remain.
   */
  async reserveUnits(productId: string, variantId: string | null, qty: number) {
    if (!Number.isInteger(qty) || qty < 1) throw new CommerceError("Quantity must be a whole number of at least 1.");
    const affected = variantId
      ? await this.db.$executeRaw`
          UPDATE "ProductVariant" SET "inventory" = "inventory" - ${qty}
          WHERE "id" = ${variantId} AND "inventory" >= ${qty}`
      : await this.db.$executeRaw`
          UPDATE "Product"
          SET "inventory" = CASE WHEN "inventory" IS NULL THEN NULL ELSE "inventory" - ${qty} END
          WHERE "id" = ${productId} AND ("inventory" IS NULL OR "inventory" >= ${qty})`;
    if (affected === 0) throw new OutOfStockError("Sold out.");
  }

  /** Puts `qty` units back, inside `db` when it is a transaction. NULL (unlimited) inventory stays NULL. */
  async releaseUnits(productId: string, variantId: string | null, qty: number, db: Prisma.TransactionClient = this.db) {
    if (qty < 1) return;
    if (variantId) {
      await db.$executeRaw`
        UPDATE "ProductVariant" SET "inventory" = "inventory" + ${qty} WHERE "id" = ${variantId}`;
      return;
    }
    await db.$executeRaw`
      UPDATE "Product" SET "inventory" = "inventory" + ${qty}
      WHERE "id" = ${productId} AND "inventory" IS NOT NULL`;
  }

  /** Public door to fulfilment for the cart checkout (same grant + notify + event path). */
  async fulfillOrder(orderId: string) {
    await this.fulfill(orderId);
  }

  private async restoreStock(productId: string, variantId: string | null) {
    if (variantId) {
      await this.db.$executeRaw`
        UPDATE "ProductVariant" SET "inventory" = "inventory" + 1 WHERE "id" = ${variantId}`;
      return;
    }
    await this.db.$executeRaw`
      UPDATE "Product" SET "inventory" = "inventory" + 1
      WHERE "id" = ${productId} AND "inventory" IS NOT NULL`;
  }

  /** THC checkout: end-to-end, on the ledger, fulfilled or queued for shipping. */
  async checkoutWithThc(userId: string, productSlug: string, input: CheckoutInput = {}) {
    const r = await this.resolve(productSlug, input.variantId);
    if (r.priceThc == null) throw new ProductUnavailableError("This item is not purchasable with THC.");
    // Validate the address BEFORE taking stock, so a bad form never holds a unit.
    const shipping = r.physical ? requireShipping(input.shipping) : null;

    await this.takeStock(r);

    let order;
    try {
      order = await this.db.order.create({
        data: {
          userId,
          totalThc: r.priceThc,
          items: {
            create: {
              productId: r.productId,
              variantId: r.variantId,
              variantLabel: r.variantLabel,
              qty: 1,
              unitPriceThc: r.priceThc,
            },
          },
          ...(shipping
            ? {
                address: {
                  create: {
                    fullName: shipping.fullName.trim(),
                    line1: shipping.line1.trim(),
                    line2: shipping.line2?.trim() || null,
                    city: shipping.city.trim(),
                    region: shipping.region?.trim() || null,
                    postalCode: shipping.postalCode.trim(),
                    country: shipping.country.trim().toUpperCase(),
                    phone: shipping.phone?.trim() || null,
                  },
                },
              }
            : {}),
        },
      });
    } catch (e) {
      await this.restoreStock(r.productId, r.variantId);
      throw e;
    }

    let tx;
    try {
      tx = await this.ledger.spend({
        userId,
        amount: r.priceThc,
        idempotencyKey: `order:${order.id}`,
        sourceType: "order",
        sourceId: order.id,
        memo: r.variantLabel ? `${r.productName} (${r.variantLabel})` : r.productName,
      });
    } catch (e) {
      await this.restoreStock(r.productId, r.variantId);
      await this.db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      throw e;
    }

    await this.db.order.update({
      where: { id: order.id },
      data: { status: "PAID", ledgerTxId: tx.id },
    });

    await this.fulfill(order.id);
    return this.db.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: { include: { product: true, variant: true } }, address: true },
    });
  }

  /** Fiat path: PENDING order the provider settles later (or instantly, in dev). */
  async createFiatOrder(userId: string, productSlug: string, provider: string, input: CheckoutInput = {}) {
    const r = await this.resolve(productSlug, input.variantId);
    if (r.priceFiatCents == null) throw new ProductUnavailableError("This item is not purchasable by card.");
    const shipping = r.physical ? requireShipping(input.shipping) : null;

    await this.takeStock(r);
    try {
      return await this.db.order.create({
        data: {
          userId,
          totalFiatCents: r.priceFiatCents,
          fiatCurrency: r.fiatCurrency,
          paymentProvider: provider,
          items: {
            create: {
              productId: r.productId,
              variantId: r.variantId,
              variantLabel: r.variantLabel,
              qty: 1,
              unitPriceFiatC: r.priceFiatCents,
            },
          },
          ...(shipping
            ? {
                address: {
                  create: {
                    fullName: shipping.fullName.trim(),
                    line1: shipping.line1.trim(),
                    line2: shipping.line2?.trim() || null,
                    city: shipping.city.trim(),
                    region: shipping.region?.trim() || null,
                    postalCode: shipping.postalCode.trim(),
                    country: shipping.country.trim().toUpperCase(),
                    phone: shipping.phone?.trim() || null,
                  },
                },
              }
            : {}),
        },
        include: { items: { include: { product: true, variant: true } }, address: true },
      });
    } catch (e) {
      await this.restoreStock(r.productId, r.variantId);
      throw e;
    }
  }

  /**
   * The single fiat settlement path. PENDING → PAID is one conditional write,
   * and the fulfilment runs in the same transaction. When settlements race
   * (a webhook and the browser, a double click, two admins), exactly one
   * write finds the order PENDING; the others wait for it to commit and then
   * change nothing. Every call returns the order as it stands afterwards and
   * whether this call settled it. PURCHASE_MADE goes out once, after the
   * commit, from the call that settled.
   */
  async settleFiatOrder(orderId: string, paymentRef: string) {
    const settled = await this.db.$transaction(async (tx) => {
      const won = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "PAID", paymentRef } });
      if (won.count === 0) return false;
      await this.fulfillIn(tx, orderId);
      return true;
    });
    const order = await this.db.order.findUniqueOrThrow({ where: { id: orderId } });
    if (settled) await this.purchased(order.userId, orderId);
    return { settled, order };
  }

  async cancelFiatOrder(orderId: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "PENDING") return;
    for (const item of order.items) await this.restoreStock(item.productId, item.variantId);
    await this.db.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  }

  /**
   * Marks a physical order shipped. This is the step that closes the loop
   * on "mine for two months, get a hoodie" — until it runs, the member has
   * paid and received nothing.
   */
  async markShipped(orderId: string, carrier: string, trackingNumber: string) {
    const order = await this.db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (order.status !== "PAID") throw new CommerceError(notShippable(order));
    // A test payment moves no money. In production only staff with
    // admin.commerce may pay that way (shop/payments/provider.ts), so a
    // member's order paid in test mode is never shipped.
    if (process.env.NODE_ENV === "production") {
      const testPaid = await this.db.payment.count({ where: { orderId, mode: "TEST", status: "CAPTURED" } });
      const buyer = testPaid > 0 ? await this.db.user.findUnique({ where: { id: order.userId }, select: { role: true } }) : null;
      if (testPaid > 0 && !can(buyer, "admin.commerce")) {
        throw new CommerceError("This order was paid in test mode, so no real money was charged. Do not ship it.");
      }
    }
    // Only while it is still PAID: a refund that lands after the check above
    // has put the stock back (refunds.unwindOrder, under the order's row
    // lock), and a second click must not ship it twice. Whichever write comes
    // second sees the first one's result.
    const shipped = await this.db.order.updateMany({
      where: { id: orderId, status: "PAID" },
      data: {
        status: "FULFILLED",
        shippedAt: new Date(),
        trackingCarrier: carrier.trim(),
        trackingNumber: trackingNumber.trim(),
      },
    });
    const updated = await this.db.order.findUniqueOrThrow({ where: { id: orderId } });
    if (shipped.count === 0) throw new CommerceError(notShippable(updated));
    await this.db.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER",
        title: "Your order is on its way",
        body: `${carrier.trim()} · ${trackingNumber.trim()}`,
        data: { orderId },
      },
    });
    return updated;
  }

  /** Grants what was bought. DIGITAL/COURSE → FULFILLED now; PHYSICAL stays
   *  PAID until an admin ships it. */
  private async fulfill(orderId: string) {
    const userId = await this.fulfillIn(this.db, orderId);
    await this.purchased(userId, orderId);
  }

  /** The writes of a fulfilment, inside `db` (a transaction, when settling). Returns the buyer. */
  private async fulfillIn(db: Prisma.TransactionClient, orderId: string) {
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    let allInstant = true;
    for (const item of order.items) {
      const p = item.product;
      if (p.kind === "COURSE" && p.grantsCourseId) {
        const course = await db.course.findUnique({ where: { id: p.grantsCourseId } });
        if (course) await this.lms.enroll(order.userId, course.slug, db);
      }
      if (p.kind === "PHYSICAL") allInstant = false;
    }
    if (allInstant) {
      await db.order.update({ where: { id: orderId }, data: { status: "FULFILLED" } });
    }
    await db.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER",
        title: allInstant ? "Order confirmed" : "Order confirmed — packing now",
        body: order.items
          .map((i) => (i.variantLabel ? `${i.product.name} (${i.variantLabel})` : i.product.name))
          .join(", "),
        data: { orderId },
      },
    });
    return order.userId;
  }

  /** After the order's writes have committed: achievements, missions and other listeners. */
  private async purchased(userId: string, orderId: string) {
    const { events } = await import("../events/bus");
    await events.emit({ type: "PURCHASE_MADE", userId, orderId });
  }
}

/** Why an order cannot be marked shipped, in words for staff. */
function notShippable(order: { status: string; trackingCarrier: string | null; trackingNumber: string | null }) {
  if (order.status === "REFUNDED") return "This order was refunded. Do not ship it.";
  if (order.status === "FULFILLED" && order.trackingNumber) {
    return `This order was already marked shipped (${order.trackingCarrier ?? ""} ${order.trackingNumber}).`.replace("( ", "(");
  }
  return "Only a paid order can be shipped.";
}

export const commerce = new CommerceService();
