"use server";
import { revalidatePath } from "next/cache";
import { audit, coupons, CouponError, type CouponInput } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";

type State = { ok?: string; error?: string };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optInt = (s: string) => (s ? Number(s) : null);

export async function createCouponAction(_prev: State, fd: FormData): Promise<State> {
  const admin = await actorWith("admin.commerce");
  const type = str(fd, "type");
  const value = str(fd, "value");
  const rupees = Number(value);
  const input: CouponInput = {
    code: str(fd, "code"),
    description: str(fd, "description") || null,
    percentOff: type === "percent" ? optInt(value) : null,
    amountOffCents: type === "amount" && value ? Math.round(rupees * 100) : null,
    minSubtotalCents: str(fd, "minSubtotal") ? Math.round(Number(str(fd, "minSubtotal")) * 100) : 0,
    maxRedemptions: optInt(str(fd, "maxRedemptions")),
    perUserLimit: optInt(str(fd, "perUserLimit")) ?? 1,
    startsAt: str(fd, "startsAt") ? new Date(str(fd, "startsAt")) : null,
    endsAt: str(fd, "endsAt") ? new Date(str(fd, "endsAt")) : null,
    active: fd.get("active") === "on",
  };
  try {
    const c = await coupons.create(input);
    await audit.log({ actorId: admin.id, action: "coupon.create", targetType: "coupon", targetId: c.id, meta: { code: c.code, active: c.active } });
  } catch (e) {
    if (e instanceof CouponError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/coupons");
  return { ok: `Saved ${input.code.toUpperCase()}.` };
}

export async function setCouponActiveAction(id: string, active: boolean) {
  const admin = await actorWith("admin.commerce");
  const c = await coupons.setActive(id, active);
  await audit.log({ actorId: admin.id, action: active ? "coupon.activate" : "coupon.deactivate", targetType: "coupon", targetId: id, meta: { code: c.code } });
  revalidatePath("/admin/coupons");
}
