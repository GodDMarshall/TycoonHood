"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  commerce,
  InsufficientFundsError,
  OutOfStockError,
  ProductUnavailableError,
  VariantRequiredError,
  ShippingAddressRequiredError,
  type ShippingInput,
} from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { activeFiatProvider } from "../../../lib/payments";

export interface BuyState { message?: string; error?: string; dev?: boolean }

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Reads the address fields, or null when the product does not ship. */
function readShipping(fd: FormData): ShippingInput | null {
  if (!str(fd, "line1") && !str(fd, "fullName")) return null;
  return {
    fullName: str(fd, "fullName"),
    line1: str(fd, "line1"),
    line2: str(fd, "line2") || null,
    city: str(fd, "city"),
    region: str(fd, "region") || null,
    postalCode: str(fd, "postalCode"),
    country: str(fd, "country"),
    phone: str(fd, "phone") || null,
  };
}

function explain(e: unknown): BuyState | null {
  if (e instanceof InsufficientFundsError) return { error: "Not enough THC yet. The rig, missions and videos all pay." };
  if (e instanceof OutOfStockError) return { error: "That size just sold out." };
  if (e instanceof VariantRequiredError) return { error: e.message };
  if (e instanceof ShippingAddressRequiredError) return { error: e.message };
  if (e instanceof ProductUnavailableError) return { error: e.message };
  return null;
}

export async function buyWithThcAction(slug: string, _prev: BuyState, fd: FormData): Promise<BuyState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  try {
    const order = await commerce.checkoutWithThc(user.id, slug, {
      variantId: str(fd, "variantId") || null,
      shipping: readShipping(fd),
    });
    revalidatePath("/marketplace");
    revalidatePath("/wallet");
    revalidatePath("/orders");
    const ref = order.id.slice(-6).toUpperCase();
    return {
      message:
        order.status === "FULFILLED"
          ? `Paid with THC — order ${ref} is yours now.`
          : `Paid with THC — order ${ref} confirmed. We pack it and send you tracking.`,
    };
  } catch (e) {
    const known = explain(e);
    if (known) return known;
    throw e;
  }
}

export async function buyWithCardAction(slug: string, _prev: BuyState, fd: FormData): Promise<BuyState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const provider = activeFiatProvider();
  if (!provider) return { error: "Card payments are not configured on this deployment." };
  try {
    const order = await commerce.createFiatOrder(user.id, slug, provider.name, {
      variantId: str(fd, "variantId") || null,
      shipping: readShipping(fd),
    });
    const productName = order.items[0]?.product.name ?? "Tycoonhood order";
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const result = await provider.createCheckout(
      { id: order.id, totalFiatCents: order.totalFiatCents, fiatCurrency: order.fiatCurrency, productName },
      { success: `${base}/orders?paid=1`, cancel: `${base}/marketplace?cancelled=1` }
    );
    if (result.kind === "redirect" && result.url) redirect(result.url);
    revalidatePath("/marketplace");
    revalidatePath("/orders");
    return {
      message: `Order ${order.id.slice(-6).toUpperCase()} settled.`,
      dev: provider.name === "dev",
    };
  } catch (e) {
    const known = explain(e);
    if (known) return known;
    throw e;
  }
}
