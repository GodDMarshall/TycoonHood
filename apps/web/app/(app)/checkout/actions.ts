"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  shopCheckout, ShopError, InsufficientFundsError, OutOfStockError, ShippingAddressRequiredError,
  ProductUnavailableError, VariantRequiredError, type ShippingInput,
} from "@tycoonhood/core";
import { requireUser } from "../../../lib/guard";
import { inr } from "../../../components/shop/format";

export interface CheckoutState {
  error?: string;
}
export interface CouponPreview {
  ok?: boolean;
  message?: string;
  discount?: string;
  total?: string;
  code?: string;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function readShipping(fd: FormData): ShippingInput | null {
  if (!str(fd, "line1") && !str(fd, "fullName")) return null;
  return {
    fullName: str(fd, "fullName"),
    line1: str(fd, "line1"),
    line2: str(fd, "line2") || null,
    city: str(fd, "city"),
    region: str(fd, "region") || null,
    postalCode: str(fd, "postalCode"),
    country: str(fd, "country") || "IN",
    phone: str(fd, "phone") || null,
  };
}

function explain(e: unknown): string | null {
  if (e instanceof InsufficientFundsError) return "Not enough THC for this cart yet. The rig, missions and videos all pay.";
  if (e instanceof OutOfStockError) return "Something in your cart just sold out. Check the cart and try again.";
  if (
    e instanceof ShopError || e instanceof ShippingAddressRequiredError ||
    e instanceof ProductUnavailableError || e instanceof VariantRequiredError
  ) return e.message;
  return null;
}

export async function previewCouponAction(_prev: CouponPreview, fd: FormData): Promise<CouponPreview> {
  const user = await requireUser();
  const code = str(fd, "coupon");
  if (!code) return {};
  const q = await shopCheckout.quoteInr(user.id, code);
  if (q.couponError) return { ok: false, message: q.couponError };
  return { ok: true, code: q.couponCode ?? code, discount: inr(q.discountCents), total: inr(q.totalCents), message: `${q.couponCode} applied.` };
}

export async function placeOrderAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const user = await requireUser();
  const rail = str(fd, "rail");
  let target: string;
  try {
    if (rail === "thc") {
      const order = await shopCheckout.checkoutThc(user.id, { shipping: readShipping(fd) });
      target = `/checkout/${order.id}/done`;
    } else if (rail === "inr") {
      // Affiliate attribution: the httpOnly cookie set by /r/[code]. Never read from the form.
      const affiliateCode = (await cookies()).get("th_aff")?.value ?? null;
      const { order } = await shopCheckout.startInrCheckout(user.id, {
        shipping: readShipping(fd),
        couponCode: str(fd, "coupon") || null,
        affiliateCode,
      });
      target = `/checkout/${order.id}`;
    } else {
      return { error: "Choose how to pay." };
    }
  } catch (e) {
    const msg = explain(e);
    if (msg) return { error: msg };
    throw e;
  }
  revalidatePath("/cart");
  revalidatePath("/orders");
  revalidatePath("/wallet");
  redirect(target);
}

export interface PayState {
  error?: string;
}

/** Razorpay Checkout.js success handler → signature verified on the server. */
export async function verifyRazorpayAction(
  orderId: string,
  payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
): Promise<PayState> {
  const user = await requireUser();
  try {
    await shopCheckout.verifyRazorpayCallback(user.id, {
      razorpayOrderId: payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpay_payment_id,
      signature: payload.razorpay_signature,
    });
  } catch (e) {
    const msg = explain(e);
    if (msg) return { error: msg };
    throw e;
  }
  revalidatePath("/orders");
  redirect(`/checkout/${orderId}/done`);
}

export async function sandboxPayAction(orderId: string, _prev: PayState): Promise<PayState> {
  const user = await requireUser();
  try {
    await shopCheckout.sandboxCapture(user.id, orderId);
  } catch (e) {
    const msg = explain(e);
    if (msg) return { error: msg };
    throw e;
  }
  revalidatePath("/orders");
  redirect(`/checkout/${orderId}/done`);
}

export async function sandboxFailAction(orderId: string, _prev: PayState): Promise<PayState> {
  const user = await requireUser();
  try {
    await shopCheckout.sandboxFail(user.id, orderId);
  } catch (e) {
    const msg = explain(e);
    if (msg) return { error: msg };
    throw e;
  }
  redirect(`/checkout/${orderId}/done`);
}

export async function abandonOrderAction(orderId: string) {
  const user = await requireUser();
  await shopCheckout.abandon(user.id, orderId);
  revalidatePath("/orders");
  redirect("/cart");
}
