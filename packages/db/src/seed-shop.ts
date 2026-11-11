/**
 * SHOP SEED — categories, rupee prices and one example coupon.
 *
 *  1. Categories. Every existing product gets a storefront category (slugs
 *     match SHOP_CATEGORIES in packages/core/src/shop/categories.ts):
 *       PHYSICAL → merchandise · COURSE/MEMBERSHIP → learning · DIGITAL → digital
 *     "books" and "partner" are left empty on purpose. No partner products are
 *     seeded — the store says "No approved partners yet".
 *     A category an admin already set is never overwritten.
 *
 *  2. Rupee prices. The card rail is INR only (prices in paise). A product
 *     with no INR price gets one from PLACEHOLDER_INR below. These are
 *     PLACEHOLDERS — sensible round numbers, not decisions. The owner sets
 *     real prices in Admin → Products. A product already priced in INR is left
 *     alone. When a product moves from USD to INR, its size-level fiat
 *     overrides are cleared (they were dollars) and costCents is reported,
 *     because it is still a dollar figure until someone re-enters it.
 *
 *  3. Coupon WELCOME10 — 10% off, one per member, INACTIVE. Admins activate
 *     it in Admin → Coupons. An existing WELCOME10 is not touched.
 *
 * Idempotent. `--dry` prints what would change and writes nothing.
 * Run: pnpm --filter @tycoonhood/db seed:shop
 */
import { prisma } from "./client";

const DRY = process.argv.includes("--dry");

/** ₹ in paise. PLACEHOLDERS — replace with real prices before launch. */
const PLACEHOLDER_INR: Record<string, number> = {
  "warrior-hoodie": 2_499_00,
  "operator-tee": 1_199_00,
  "nano-chalk": 499_00,
  "lifting-straps": 699_00,
  "ledger-notebook": 599_00,
  "tycoonhood-training-tee": 999_00,
  "warrior-program-access": 3_999_00,
  "founders-playbook": 799_00,
};

const CATEGORY_BY_KIND: Record<string, string> = {
  PHYSICAL: "merchandise",
  COURSE: "learning",
  MEMBERSHIP: "learning",
  DIGITAL: "digital",
};

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

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
    const data: { category?: string; priceFiatCents?: number; fiatCurrency?: string } = {};

    if (!p.category && CATEGORY_BY_KIND[p.kind]) data.category = CATEGORY_BY_KIND[p.kind];

    let clearVariantFiat = false;
    if (p.fiatCurrency !== "INR" || p.priceFiatCents == null) {
      const placeholder = PLACEHOLDER_INR[p.slug];
      if (placeholder != null) {
        data.priceFiatCents = placeholder;
        data.fiatCurrency = "INR";
        clearVariantFiat = p.fiatCurrency !== "INR" && p.variants.some((v) => v.priceFiatCents != null);
        report.push(
          `  ${p.slug}: ${rupees(placeholder)} (PLACEHOLDER)` +
            (p.priceFiatCents != null && p.fiatCurrency !== "INR" ? ` — was ${p.fiatCurrency} ${(p.priceFiatCents / 100).toFixed(2)}` : "")
        );
        if (p.costCents != null && p.fiatCurrency !== "INR") {
          warnings.push(`  ${p.slug}: costCents ${p.costCents} is still in ${p.fiatCurrency}; re-enter the landed cost in paise.`);
        }
      } else if (p.priceFiatCents != null && p.fiatCurrency !== "INR") {
        warnings.push(`  ${p.slug}: priced in ${p.fiatCurrency} only — not payable on the rupee rail until an INR price is set.`);
      }
    }

    if (Object.keys(data).length === 0) continue;
    if (data.category) report.push(`  ${p.slug}: category → ${data.category}`);
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
