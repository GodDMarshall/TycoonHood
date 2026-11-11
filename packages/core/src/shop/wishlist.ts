/** WISHLIST. A saved-for-later list; toggling is idempotent per (member, product). */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { CartError } from "./errors";

export class WishlistService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Adds when absent, removes when present. Returns whether it is now saved. */
  async toggle(userId: string, productId: string): Promise<{ saved: boolean }> {
    const removed = await this.db.wishlistItem.deleteMany({ where: { userId, productId } });
    if (removed.count > 0) return { saved: false };
    const product = await this.db.product.findUnique({ where: { id: productId }, select: { active: true } });
    if (!product || !product.active) throw new CartError("This item is not on sale.");
    await this.db.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { saved: true };
  }

  async has(userId: string, productId: string) {
    return !!(await this.db.wishlistItem.findUnique({ where: { userId_productId: { userId, productId } } }));
  }

  async ids(userId: string) {
    const rows = await this.db.wishlistItem.findMany({ where: { userId }, select: { productId: true } });
    return new Set(rows.map((r) => r.productId));
  }

  async list(userId: string) {
    return this.db.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { product: { include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } },
    });
  }
}

export const wishlist = new WishlistService();
