"use server";
import { revalidatePath } from "next/cache";
import { catalog, CatalogError, reviewProduct, PRODUCT_KINDS, type ProductInput, type VariantInput } from "@tycoonhood/core";
import { requireAdmin } from "../../../../lib/guard";

export interface ProductFormState {
  error?: string;
  message?: string;
  /** Non-blocking merchant advice: margin, mining time, stock. */
  notes?: string[];
  slug?: string;
}

/** Empty string → null, so an untouched field never becomes 0. */
const optInt = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
const optBig = (v: FormDataEntryValue | null): bigint | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    return BigInt(s.replace(/[,\s]/g, ""));
  } catch {
    return null;
  }
};
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/**
 * Reads the size rows out of the form. They arrive as parallel arrays —
 * variantSku[], variantLabel[] and so on — which is how a repeating fieldset
 * posts without any JavaScript on the page.
 */
function readVariants(fd: FormData): VariantInput[] {
  const skus = fd.getAll("variantSku").map(String);
  const labels = fd.getAll("variantLabel").map(String);
  const ids = fd.getAll("variantId").map(String);
  const stocks = fd.getAll("variantStock").map(String);
  const prices = fd.getAll("variantPriceThc").map(String);

  const out: VariantInput[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = (labels[i] ?? "").trim();
    const sku = (skus[i] ?? "").trim();
    // A completely blank row is a row the admin did not fill in.
    if (!label && !sku) continue;
    out.push({
      id: ids[i]?.trim() || undefined,
      sku,
      label,
      inventory: Number(stocks[i] ?? "0") || 0,
      priceThc: prices[i]?.trim() ? BigInt(prices[i].replace(/[,\s]/g, "")) : null,
      sortOrder: i,
      active: true,
    });
  }
  return out;
}

export async function saveProductAction(
  _prev: ProductFormState,
  fd: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  const kindRaw = str(fd.get("kind"));
  if (!(PRODUCT_KINDS as readonly string[]).includes(kindRaw)) {
    return { error: "Pick a product kind." };
  }

  const priceThc = optBig(fd.get("priceThc"));
  const priceFiat = optInt(fd.get("priceFiatCents"));
  const costCents = optInt(fd.get("costCents"));
  const inventory = optInt(fd.get("inventory"));
  if (Number.isNaN(priceFiat) || Number.isNaN(costCents) || Number.isNaN(inventory)) {
    return { error: "Prices, cost and stock must be whole numbers." };
  }
  if (str(fd.get("priceThc")) && priceThc == null) {
    return { error: "THC price must be a whole number." };
  }

  const variants = readVariants(fd);

  const input: ProductInput = {
    slug: str(fd.get("slug")),
    kind: kindRaw as ProductInput["kind"],
    name: str(fd.get("name")),
    description: str(fd.get("description")),
    image: str(fd.get("image")) || null,
    priceThc,
    priceFiatCents: priceFiat,
    costCents,
    inventory: variants.length ? null : inventory,
    grantsCourseId: str(fd.get("grantsCourseId")) || null,
    contentMd: str(fd.get("contentMd")) || null,
    active: fd.get("active") === "on",
    variants: variants.length ? variants : undefined,
  };

  try {
    const saved = await catalog.save(input);
    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
    return {
      message: `Saved "${saved.name}".${saved.active ? " It is live in the marketplace now." : " It is saved but not live — tick Live when you are ready."}`,
      notes: reviewProduct(input),
      slug: saved.slug,
    };
  } catch (e) {
    if (e instanceof CatalogError) return { error: e.message };
    if (e instanceof Error && /Unique constraint/i.test(e.message)) {
      return { error: "That slug or SKU is already used by another product." };
    }
    throw e;
  }
}

export async function toggleProductAction(slug: string, next: boolean) {
  await requireAdmin();
  await catalog.setActive(slug, next);
  revalidatePath("/admin/products");
  revalidatePath("/marketplace");
}

export async function restockAction(_prev: ProductFormState, fd: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const variantId = str(fd.get("variantId"));
  const units = Number(str(fd.get("units")));
  if (!variantId || !Number.isFinite(units) || units === 0) {
    return { error: "Say how many units to add or remove." };
  }
  try {
    const v = await catalog.restock(variantId, Math.round(units));
    revalidatePath("/admin/products");
    revalidatePath("/marketplace");
    return { message: `${v.label}: now ${v.inventory} in stock.` };
  } catch (e) {
    if (e instanceof CatalogError) return { error: e.message };
    throw e;
  }
}
