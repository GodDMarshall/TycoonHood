/**
 * SHOP SEED — rupee prices and categories for the seeded products, and one
 * example coupon.
 *
 *  1. Rupee prices and categories. The card rail is INR only (prices in
 *     paise), but seed:content creates its products in the column's old USD
 *     default. This seed moves each of those to its placeholder rupee price
 *     from PLACEHOLDER_INR (placeholder-prices.ts, shared with seed-merch.ts)
 *     and gives it a storefront category, in one write. Category slugs match
 *     SHOP_CATEGORIES in packages/core/src/shop/categories.ts:
 *       PHYSICAL → merchandise · COURSE/MEMBERSHIP → learning · DIGITAL → digital
 *     "books" and "partner" are left empty on purpose. No partner products are
 *     seeded — the store says "No approved partners yet".
 *     The prices are PLACEHOLDERS — sensible round numbers, not decisions. The
 *     owner sets real prices in Admin → Products.
 *     When a product moves from USD to INR its size-level card prices are
 *     cleared (they were dollars), and costCents is reported, because it is
 *     still a dollar figure until someone re-enters it.
 *
 *  2. Coupon WELCOME10 — 10% off, one per member, INACTIVE. Admins activate
 *     it in Admin → Coupons. An existing WELCOME10 is not touched.
 *
 * Safe to re-run on a live database (DR-33): a product already in rupees is
 * never touched. Every save in Admin → Products writes INR, so a rupee row is
 * staff's: a price, a removed price or a category they set stays as they left
 * it. Only a row still in another currency, which only a seed has written,
 * is changed. `--dry` prints what would change and writes nothing.
 * Run: pnpm --filter @tycoonhood/db seed:shop
 */
import { prisma } from "./client";
import { PLACEHOLDER_INR, needsPlaceholderInr, rupees } from "./placeholder-prices";

const DRY = process.argv.includes("--dry");

const CATEGORY_BY_KIND: Record<string, string> = {
  PHYSICAL: "merchandise",
  COURSE: "learning",
  MEMBERSHIP: "learning",
  DIGITAL: "digital",
};

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "asc" },
  });
  const report: string[] = [];
  const warnings: string[] = [];

  for (const p of products) {
    // Throwaway rows created by the test suites are not catalogue items.
    if (/^(scarce-|shoptest-|test-)/.test(p.slug)) continue;
    // Already in rupees: staff's, or moved here on an earlier run. Left alone.
    if (!needsPlaceholderInr(p)) continue;

    const placeholder = PLACEHOLDER_INR[p.slug];
    if (placeholder == null) {
      if (p.priceFiatCents != null) {
        warnings.push(`  ${p.slug}: priced in ${p.fiatCurrency} only — not payable on the rupee rail until an INR price is set.`);
      }
      continue;
    }
    const data: { category?: string; priceFiatCents: number; fiatCurrency: "INR" } = { priceFiatCents: placeholder, fiatCurrency: "INR" };
    if (!p.category && CATEGORY_BY_KIND[p.kind]) data.category = CATEGORY_BY_KIND[p.kind];
    const clearVariantFiat = p.variants.some((v) => v.priceFiatCents != null);
    report.push(
      `  ${p.slug}: ${rupees(placeholder)} (PLACEHOLDER)` +
        (p.priceFiatCents != null ? ` — was ${p.fiatCurrency} ${(p.priceFiatCents / 100).toFixed(2)}` : "") +
        (data.category ? `, category → ${data.category}` : "")
    );
    if (p.costCents != null) {
      warnings.push(`  ${p.slug}: costCents ${p.costCents} is still in ${p.fiatCurrency}; re-enter the landed cost in paise.`);
    }
    if (!DRY) {
      await prisma.product.update({ where: { id: p.id }, data });
      if (clearVariantFiat) {
        await prisma.productVariant.updateMany({ where: { productId: p.id }, data: { priceFiatCents: null } });
      }
    }
  }

  const existing = await prisma.coupon.findUnique({ where: { code: "WELCOME10" } });
  if (existing) {
    report.push(`  WELCOME10 exists (${existing.active ? "active" : "inactive"}) — left as is.`);
  } else {
    report.push("  WELCOME10 created: 10% off, 1 per member, INACTIVE — activate in Admin → Coupons.");
    if (!DRY) {
      await prisma.coupon.create({
        data: {
          code: "WELCOME10",
          description: "Welcome offer — 10% off a first rupee order",
          percentOff: 10,
          perUserLimit: 1,
          active: false,
        },
      });
    }
  }

  console.log(`${DRY ? "[dry run] " : ""}Shop seed:`);
  console.log(report.length ? report.join("\n") : "  nothing to change.");
  console.log("  Partner products: none seeded — the store shows “No approved partners yet”.");
  if (warnings.length) console.log(`Check:\n${warnings.join("\n")}`);
  console.log("Rupee prices marked PLACEHOLDER are not decisions. Set real prices in Admin → Products.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
