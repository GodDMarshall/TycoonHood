/**
 * CATALOG — the one door through which products are created and changed.
 *
 * The admin form, a seed script and any future import all go through here,
 * so the rules about what a sellable product looks like exist once. A
 * product that reaches the storefront broken is a product this file let
 * through.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { judgePrice, suggestPrice, MERCH_TARGET_DAYS } from "../economy/mining-time";

export class CatalogError extends Error {}

export const PRODUCT_KINDS = ["DIGITAL", "PHYSICAL", "COURSE", "MEMBERSHIP"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/;
const SKU_RE = /^[A-Z0-9][A-Z0-9-]{1,30}[A-Z0-9]$/;

export interface VariantInput {
  /** Present when editing an existing row. */
  id?: string;
  sku: string;
  label: string;
  priceThc?: bigint | null;
  priceFiatCents?: number | null;
  costCents?: number | null;
  inventory: number;
  sortOrder?: number;
  active?: boolean;
}

export interface ProductInput {
  slug: string;
  kind: ProductKind;
  name: string;
  description: string;
  image?: string | null;
  priceThc?: bigint | null;
  priceFiatCents?: number | null;
  costCents?: number | null;
  /** Ignored when variants are supplied — stock lives on the variant then. */
  inventory?: number | null;
  grantsCourseId?: string | null;
  contentMd?: string | null;
  active?: boolean;
  variants?: VariantInput[];
}

/** Everything wrong with this product, in the order a human would fix it. */
export function validateProduct(input: ProductInput): string[] {
  const errors: string[] = [];
  const slug = input.slug?.trim() ?? "";
  if (!SLUG_RE.test(slug)) {
    errors.push("Slug must be lowercase letters, numbers and hyphens — 3 to 62 characters.");
  }
  if (!input.name?.trim()) errors.push("Give it a name.");
  if (!input.description?.trim()) errors.push("Write a description — the storefront shows it.");
  if (!PRODUCT_KINDS.includes(input.kind)) errors.push("Pick a product kind.");

  const hasVariants = (input.variants?.length ?? 0) > 0;
  const thc = input.priceThc ?? null;
  const fiat = input.priceFiatCents ?? null;

  // Price may live on the product, on every variant, or both. What is not
  // allowed is a product nobody can pay for.
  const everyVariantPriced = hasVariants
    ? input.variants!.every((v) => (v.priceThc ?? thc) != null || (v.priceFiatCents ?? fiat) != null)
    : true;
  if (thc == null && fiat == null && !hasVariants) {
    errors.push("Set a THC price, a card price, or both — otherwise it cannot be bought.");
  }
  if (hasVariants && !everyVariantPriced) {
    errors.push("Every size needs a price, or the product needs one they can inherit.");
  }
  if (thc != null && thc <= 0n) errors.push("THC price must be above zero.");
  if (fiat != null && fiat <= 0) errors.push("Card price must be above zero.");
  if (input.costCents != null && input.costCents < 0) errors.push("Cost cannot be negative.");

  if (input.kind === "COURSE" && !input.grantsCourseId) {
    errors.push("A course product must say which course it unlocks.");
  }
  if (input.kind === "DIGITAL" && !input.contentMd?.trim() && !input.grantsCourseId) {
    errors.push("A digital product needs its deliverable — write the content, or point it at a course.");
  }
  if (input.kind === "PHYSICAL" && !hasVariants && input.inventory == null) {
    errors.push("Physical goods need stock: add sizes, or set a unit count.");
  }
  if (!hasVariants && input.inventory != null && input.inventory < 0) {
    errors.push("Stock cannot be negative.");
  }

  if (hasVariants) {
    const seenSku = new Set<string>();
    const seenLabel = new Set<string>();
    input.variants!.forEach((v, i) => {
      const where = `Size ${i + 1}`;
      if (!SKU_RE.test(v.sku?.trim().toUpperCase() ?? "")) {
        errors.push(`${where}: SKU must be uppercase letters, numbers and hyphens.`);
      } else {
        const sku = v.sku.trim().toUpperCase();
        if (seenSku.has(sku)) errors.push(`${where}: SKU ${sku} is used twice.`);
        seenSku.add(sku);
      }
      if (!v.label?.trim()) errors.push(`${where}: give it a label, like M or XL.`);
      else {
        const l = v.label.trim().toLowerCase();
        if (seenLabel.has(l)) errors.push(`${where}: "${v.label.trim()}" is listed twice.`);
        seenLabel.add(l);
      }
      if (!Number.isInteger(v.inventory) || v.inventory < 0) {
        errors.push(`${where}: stock must be zero or more.`);
      }
      if (v.priceThc != null && v.priceThc <= 0n) errors.push(`${where}: THC price must be above zero.`);
      if (v.priceFiatCents != null && v.priceFiatCents <= 0) errors.push(`${where}: card price must be above zero.`);
    });
  }
  return errors;
}

/** Non-blocking advice: what a merchant would want told, not stopped for. */
export function reviewProduct(input: ProductInput): string[] {
  const notes: string[] = [];
  const thc = input.priceThc ?? null;

  if (input.kind === "PHYSICAL" && thc != null) {
    const j = judgePrice(thc, input.priceFiatCents);
    if (j.verdict === "on target") {
      notes.push(j.summary);
    } else if (j.expected != null && input.priceFiatCents != null) {
      notes.push(`${j.summary} Around ${j.expected.toLocaleString("en-US")} THC would put the two rails in step.`);
    } else if (j.verdict === "too cheap") {
      notes.push(
        `${j.summary} That is under the ${MERCH_TARGET_DAYS.min}-day floor for an item with no shelf price — ` +
          `about ${suggestPrice().toLocaleString("en-US")} THC would land on the rule.`
      );
    } else {
      notes.push(`${j.summary} That is past the ${MERCH_TARGET_DAYS.max}-day ceiling; most members never reach it.`);
    }
  }

  const cost = input.costCents ?? null;
  if (input.kind === "PHYSICAL" && cost == null) {
    notes.push("No landed cost recorded — the margin and the burn rate cannot be reported without it.");
  }
  if (cost != null && input.priceFiatCents != null && input.priceFiatCents <= cost) {
    notes.push("The card price is at or below cost — every card sale loses money.");
  }
  if (cost != null && thc != null && input.priceFiatCents == null) {
    notes.push(
      `THC-only item costing $${(cost / 100).toFixed(2)} to fulfil — every redemption is real money out.`
    );
  }
  if (input.active && input.kind === "PHYSICAL") {
    const stock = (input.variants?.length ?? 0) > 0
      ? input.variants!.reduce((t, v) => t + (v.inventory || 0), 0)
      : input.inventory ?? 0;
    if (stock === 0) notes.push("Live with zero stock — members will see it and be told it is sold out.");
  }
  return notes;
}

export class CatalogService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Creates or replaces a product and its sizes, in one transaction. */
  async save(input: ProductInput) {
    const errors = validateProduct(input);
    if (errors.length) throw new CatalogError(errors.join(" "));

    const slug = input.slug.trim();
    const hasVariants = (input.variants?.length ?? 0) > 0;

    const data = {
      kind: input.kind,
      name: input.name.trim(),
      description: input.description.trim(),
      image: input.image?.trim() || null,
      priceThc: input.priceThc ?? null,
      priceFiatCents: input.priceFiatCents ?? null,
      costCents: input.costCents ?? null,
      // Stock lives on the variant when sizes exist; null here means the
      // product-level counter is not the one in charge.
      inventory: hasVariants ? null : input.inventory ?? null,
      grantsCourseId: input.grantsCourseId?.trim() || null,
      contentMd: input.contentMd?.trim() || null,
      active: input.active ?? false,
    };

    return this.db.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { slug },
        create: { slug, ...data },
        update: data,
      });

      if (input.variants) {
        // SKUs are unique across the whole catalogue. Before writing anything,
        // refuse a SKU that belongs to a DIFFERENT product — with a message
        // that names it, rather than a database error the admin cannot act on.
        const skus = input.variants.map((v) => v.sku.trim().toUpperCase());
        const clashes = await tx.productVariant.findMany({
          where: { sku: { in: skus }, productId: { not: product.id } },
          select: { sku: true, product: { select: { name: true, slug: true } } },
        });
        if (clashes.length) {
          const first = clashes[0];
          throw new CatalogError(
            `SKU ${first.sku} already belongs to "${first.product.name}" (/${first.product.slug}). ` +
              `SKUs are unique across the catalogue — give this one a different code.`
          );
        }

        // Existing sizes are matched by SKU when the form did not carry an id,
        // so saving the same product twice updates it instead of colliding.
        const existing = await tx.productVariant.findMany({ where: { productId: product.id } });
        const bySku = new Map(existing.map((v) => [v.sku, v]));

        const kept: string[] = [];
        for (const [i, v] of input.variants.entries()) {
          const sku = v.sku.trim().toUpperCase();
          const vdata = {
            sku,
            label: v.label.trim(),
            priceThc: v.priceThc ?? null,
            priceFiatCents: v.priceFiatCents ?? null,
            costCents: v.costCents ?? null,
            inventory: v.inventory,
            sortOrder: v.sortOrder ?? i,
            active: v.active ?? true,
          };
          const target = v.id ?? bySku.get(sku)?.id;
          if (target) {
            await tx.productVariant.update({ where: { id: target }, data: vdata });
            kept.push(target);
          } else {
            const created = await tx.productVariant.create({
              data: { productId: product.id, ...vdata },
            });
            kept.push(created.id);
          }
        }

        // A size dropped from the form is retired, not deleted: past orders
        // still point at it.
        await tx.productVariant.updateMany({
          where: { productId: product.id, id: { notIn: kept.length ? kept : ["_none_"] } },
          data: { active: false },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      });
    });
  }

  async setActive(slug: string, active: boolean) {
    return this.db.product.update({ where: { slug }, data: { active } });
  }

  async get(slug: string) {
    return this.db.product.findUnique({
      where: { slug },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async list() {
    return this.db.product.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        _count: { select: { orderItems: true } },
      },
    });
  }

  /** Stock across sizes, or the product counter when there are none. */
  stockOf(p: { inventory: number | null; variants: { inventory: number; active: boolean }[] }) {
    if (p.variants.length) {
      return p.variants.filter((v) => v.active).reduce((t, v) => t + v.inventory, 0);
    }
    return p.inventory;
  }

  /** Restocks one size without touching anything else. */
  async restock(variantId: string, units: number) {
    if (!Number.isInteger(units)) throw new CatalogError("Restock must be a whole number.");
    const v = await this.db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    const next = v.inventory + units;
    if (next < 0) throw new CatalogError(`Cannot remove ${Math.abs(units)} — only ${v.inventory} in stock.`);
    return this.db.productVariant.update({ where: { id: variantId }, data: { inventory: next } });
  }
}

export const catalog = new CatalogService();
