"use server";
import { revalidatePath } from "next/cache";
import { cart, wishlist, CartError } from "@tycoonhood/core";
import { requireUser } from "../../../lib/guard";

export async function setQtyAction(lineKey: string, fd: FormData) {
  const user = await requireUser();
  const qty = Number(fd.get("qty"));
  try {
    await cart.update(user.id, lineKey, Number.isFinite(qty) ? Math.round(qty) : 1);
  } catch (e) {
    if (!(e instanceof CartError)) throw e;
  }
  revalidatePath("/cart");
}

export async function removeLineAction(lineKey: string) {
  const user = await requireUser();
  await cart.remove(user.id, lineKey);
  revalidatePath("/cart");
}

/** Moves a line to the wishlist and out of the cart. */
export async function saveForLaterAction(lineKey: string, productId: string) {
  const user = await requireUser();
  if (!(await wishlist.has(user.id, productId))) {
    try {
      await wishlist.toggle(user.id, productId);
    } catch (e) {
      if (!(e instanceof CartError)) throw e;
    }
  }
  await cart.remove(user.id, lineKey);
  revalidatePath("/cart");
  revalidatePath("/wishlist");
}
