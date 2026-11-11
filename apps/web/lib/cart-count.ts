/**
 * Items in a member's cart (quantities summed), read once per request however
 * many places ask: the app chrome's badge and the store page share one query.
 * No member, no cart — 0 — so it is never the thing that breaks a page for a
 * signed-out visitor or a suspended account (whose session resolves to nobody).
 */
import { cache } from "react";
import { cart } from "@tycoonhood/core";

export const cartItemCount = cache(async (userId: string | null | undefined): Promise<number> => {
  if (!userId) return 0;
  return cart.count(userId);
});
