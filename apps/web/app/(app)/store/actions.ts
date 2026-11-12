"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cart, wishlist, CartError } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";

export interface AddState {
  ok?: string;
  error?: string;
}

async function member(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function addToCartAction(productId: string, slug: string, _prev: AddState, fd: FormData): Promise<AddState> {
  const user = await member(`/store/${slug}`);
  const variantId = String(fd.get("variantId") ?? "").trim() || null;
  const qty = Number(fd.get("qty") ?? 1);
  try {
    await cart.add(user.id, productId, variantId, Number.isFinite(qty) ? Math.round(qty) : 1);
  } catch (e) {
    if (e instanceof CartError) return { error: e.message };
    throw e;
  }
  revalidatePath("/cart");
  revalidatePath("/store");
  return { ok: "Added to your cart." };
}

export async function toggleWishlistAction(productId: string, slug: string) {
  const user = await member(`/store/${slug}`);
  try {
    await wishlist.toggle(user.id, productId);
  } catch (e) {
    if (!(e instanceof CartError)) throw e;
  }
  revalidatePath(`/store/${slug}`);
  revalidatePath("/wishlist");
  revalidatePath("/store");
}
