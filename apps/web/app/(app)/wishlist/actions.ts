"use server";
import { revalidatePath } from "next/cache";
import { cart, wishlist, CartError } from "@tycoonhood/core";
import { requireUser } from "../../../lib/guard";

export async function removeSavedAction(productId: string) {
  const user = await requireUser();
  if (await wishlist.has(user.id, productId)) await wishlist.toggle(user.id, productId);
  revalidatePath("/wishlist");
}

/** Moves a size-less item into the cart. Sized items go via the product page to pick a size. */
export async function moveToCartAction(productId: string) {
  const user = await requireUser();
  try {
    await cart.add(user.id, productId);
    if (await wishlist.has(user.id, productId)) await wishlist.toggle(user.id, productId);
  } catch (e) {
    if (!(e instanceof CartError)) throw e;
  }
  revalidatePath("/wishlist");
  revalidatePath("/cart");
}
