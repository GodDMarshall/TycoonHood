/**
 * Storefront categories. Stored on Product.category as the slug. The seed
 * (packages/db/src/seed-shop.ts) writes the same slugs — keep them in step.
 * "partner" exists so the shelf can say plainly that no partners are approved yet.
 */
export const SHOP_CATEGORIES = [
  { slug: "merchandise", label: "Merchandise" },
  { slug: "learning", label: "Learning products" },
  { slug: "digital", label: "Digital resources" },
  { slug: "books", label: "Books" },
  { slug: "partner", label: "Partner products" },
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number]["slug"];

export function categoryLabel(slug: string | null | undefined) {
  return SHOP_CATEGORIES.find((c) => c.slug === slug)?.label ?? null;
}

export function isShopCategory(s: string | null | undefined): s is ShopCategory {
  return SHOP_CATEGORIES.some((c) => c.slug === s);
}

/** At or below this many units a stocked line is flagged "low" in the admin. */
export const LOW_STOCK_AT = 5;
