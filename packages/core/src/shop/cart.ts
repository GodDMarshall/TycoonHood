/**
 * CART. One row per (member, line); a line is a product plus, when the
 * product has sizes, a size. Quantities are 1–20. Totals are computed here,
 * on the server, per rail — the browser is never asked what something costs.
 *
 * A cart is allowed to hold things a rail cannot pay for (a THC-only item
 * next to a rupee-only one); the totals say which lines block which rail so
 * the page can explain it instead of failing at the till.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { CartError } from "./errors";
import { MAX_LINE_QTY, lineKeyOf, unitPrices } from "./pricing";

export interface CartLineView {
  id: string;
  lineKey: string;
  qty: number;
  productId: string;
  slug: string;
  name: string;
  kind: string;
  image: string | null;
  physical: boolean;
  variantId: string | null;
  variantLabel: string | null;
  unitThc: bigint | null;
  unitInrPaise: number | null;
  /** Units on hand right now; null = unlimited. */
  available: number | null;
  /** Why this line cannot be bought right now, if it cannot. */
  problem: string | null;
}

export interface RailTotal<T> {
  /** True when every line can be paid on this rail and nothing blocks it. */
  payable: boolean;
  total: T;
  /** Line keys that have no price on this rail. */
  unpriced: string[];
}

export interface CartTotals {
  itemCount: number;
  thc: RailTotal<bigint>;
  inr: RailTotal<number>;
  needsAddress: boolean;
  blocked: string[];
}

/** Pure: totals for a set of lines. Exported for tests and for the checkout. */
export function cartTotals(lines: Pick<CartLineView, "lineKey" | "qty" | "unitThc" | "unitInrPaise" | "physical" | "problem">[]): CartTotals {
  let thc = 0n;
  let inr = 0;
  const thcUnpriced: string[] = [];
  const inrUnpriced: string[] = [];
  const blocked: string[] = [];
  let count = 0;
  for (const l of lines) {
    count += l.qty;
    if (l.problem) blocked.push(l.lineKey);
    if (l.unitThc == null) thcUnpriced.push(l.lineKey);
    else thc += l.unitThc * BigInt(l.qty);
    if (l.unitInrPaise == null) inrUnpriced.push(l.lineKey);
    else inr += l.unitInrPaise * l.qty;
  }
  const nonEmpty = lines.length > 0;
  return {
    itemCount: count,
    thc: { payable: nonEmpty && thcUnpriced.length === 0 && blocked.length === 0, total: thc, unpriced: thcUnpriced },
    inr: { payable: nonEmpty && inrUnpriced.length === 0 && blocked.length === 0, total: inr, unpriced: inrUnpriced },
    needsAddress: lines.some((l) => l.physical),
    blocked,
  };
}

/**
 * Pure: the cart badge in the app's navigation. Hidden (null) when the cart is
 * empty; the number shown is capped at "99+", the accessible name is exact.
 */
export function cartBadge(itemCount: number): { text: string; label: string } | null {
  const n = Number.isFinite(itemCount) ? Math.floor(itemCount) : 0;
  if (n <= 0) return null;
  return { text: n > 99 ? "99+" : String(n), label: `Cart, ${n} ${n === 1 ? "item" : "items"}` };
}

function checkQty(qty: number) {
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) {
    throw new CartError(`Quantity must be between 1 and ${MAX_LINE_QTY}.`);
  }
}

export class CartService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Validates the product (and size) and returns the line key it lives under. */
  private async resolveLine(productId: string, variantId: string | null) {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { active: true } } },
    });
    if (!product || !product.active) throw new CartError("This item is not on sale.");
    if (product.variants.length > 0) {
      if (!variantId) throw new CartError("Choose a size first.");
      if (!product.variants.some((v) => v.id === variantId)) throw new CartError("That size is not available.");
    } else if (variantId) {
      throw new CartError("That size is not available.");
    }
    return { product, lineKey: lineKeyOf(productId, variantId) };
  }

  async add(userId: string, productId: string, variantId: string | null = null, qty = 1) {
    checkQty(qty);
    const { lineKey } = await this.resolveLine(productId, variantId);
    const existing = await this.db.cartItem.findUnique({ where: { userId_lineKey: { userId, lineKey } } });
    const next = (existing?.qty ?? 0) + qty;
    if (next > MAX_LINE_QTY) throw new CartError(`At most ${MAX_LINE_QTY} of one item per order.`);
    return this.db.cartItem.upsert({
      where: { userId_lineKey: { userId, lineKey } },
      create: { userId, productId, variantId, lineKey, qty },
      update: { qty: next },
    });
  }

  /** Sets a line's quantity. 0 removes it. */
  async update(userId: string, lineKey: string, qty: number) {
    if (qty === 0) return this.remove(userId, lineKey);
    checkQty(qty);
    const row = await this.db.cartItem.findUnique({ where: { userId_lineKey: { userId, lineKey } } });
    if (!row) throw new CartError("That item is no longer in your cart.");
    return this.db.cartItem.update({ where: { id: row.id }, data: { qty } });
  }

  async remove(userId: string, lineKey: string) {
    await this.db.cartItem.deleteMany({ where: { userId, lineKey } });
    return null;
  }

  async clear(userId: string, lineKeys?: string[]) {
    await this.db.cartItem.deleteMany({ where: { userId, ...(lineKeys ? { lineKey: { in: lineKeys } } : {}) } });
  }

  async count(userId: string) {
    const r = await this.db.cartItem.aggregate({ where: { userId }, _sum: { qty: true } });
    return r._sum.qty ?? 0;
  }

  /** Every line, priced and checked against live stock, plus per-rail totals. */
  async list(userId: string): Promise<{ lines: CartLineView[]; totals: CartTotals }> {
    const rows = await this.db.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { product: { include: { variants: { where: { active: true } } } }, variant: true },
    });
    const lines: CartLineView[] = rows.map((r) => {
      const p = r.product;
      const v = r.variant;
      const prices = unitPrices(p, v);
      const available = v ? v.inventory : p.inventory;
      let problem: string | null = null;
      if (!p.active) problem = "No longer on sale — remove it to continue.";
      else if (v && !v.active) problem = "This size was retired — remove it to continue.";
      else if (!v && p.variants.length > 0) problem = "Choose a size — remove this and add it again with a size.";
      else if (available != null && available < r.qty)
        problem = available === 0 ? "Sold out." : `Only ${available} left — lower the quantity.`;
      else if (prices.thc == null && prices.inrPaise == null) problem = "Not priced on any rail.";
      return {
        id: r.id,
        lineKey: r.lineKey,
        qty: r.qty,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        image: p.image,
        physical: p.kind === "PHYSICAL",
        variantId: v?.id ?? null,
        variantLabel: v?.label ?? null,
        unitThc: prices.thc,
        unitInrPaise: prices.inrPaise,
        available,
        problem,
      };
    });
    return { lines, totals: cartTotals(lines) };
  }
}

export const cart = new CartService();
