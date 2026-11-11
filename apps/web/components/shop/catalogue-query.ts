/**
 * Reads the storefront's search params into one Prisma query, so /store and
 * /marketplace filter identically. Server-only.
 */
import type { Prisma } from "@tycoonhood/db";
import { isShopCategory } from "@tycoonhood/core";

export interface CatalogueParams {
  q?: string;
  category?: string;
  kind?: string;
  rail?: string;
  sort?: string;
}

export const SORTS = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name" },
] as const;

const KINDS = ["DIGITAL", "PHYSICAL", "COURSE", "MEMBERSHIP"] as const;

export function normaliseParams(sp: Record<string, string | string[] | undefined>): Required<CatalogueParams> {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v ?? "").trim();
  };
  const category = one("category");
  const kind = one("kind").toUpperCase();
  const rail = one("rail").toLowerCase();
  const sort = one("sort");
  return {
    q: one("q").slice(0, 80),
    category: isShopCategory(category) ? category : "",
    kind: (KINDS as readonly string[]).includes(kind) ? kind : "",
    rail: rail === "thc" || rail === "inr" ? rail : "",
    sort: SORTS.some((s) => s.value === sort) ? sort : "new",
  };
}

export function catalogueQuery(p: Required<CatalogueParams>): {
  where: Prisma.ProductWhereInput;
  orderBy: Prisma.ProductOrderByWithRelationInput[];
} {
  const where: Prisma.ProductWhereInput = { active: true };
  const and: Prisma.ProductWhereInput[] = [];
  if (p.q) and.push({ OR: [{ name: { contains: p.q, mode: "insensitive" } }, { description: { contains: p.q, mode: "insensitive" } }] });
  if (p.category) and.push({ category: p.category });
  if (p.kind) and.push({ kind: p.kind as "DIGITAL" });
  if (p.rail === "thc") and.push({ priceThc: { not: null } });
  if (p.rail === "inr") and.push({ priceFiatCents: { not: null }, fiatCurrency: "INR" });
  if (and.length) where.AND = and;

  // Price sorting follows the chosen rail; without one, rupee price leads.
  const priceField = p.rail === "thc" ? "priceThc" : "priceFiatCents";
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    p.sort === "price-asc"
      ? [{ [priceField]: { sort: "asc", nulls: "last" } }]
      : p.sort === "price-desc"
        ? [{ [priceField]: { sort: "desc", nulls: "last" } }]
        : p.sort === "name"
          ? [{ name: "asc" }]
          : [{ createdAt: "desc" }];
  return { where, orderBy };
}

export function queryString(p: Partial<CatalogueParams>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) s.set(k, v);
  const out = s.toString();
  return out ? `?${out}` : "";
}
