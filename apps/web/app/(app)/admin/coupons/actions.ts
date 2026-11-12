"use server";
import { revalidatePath } from "next/cache";
import { audit, coupons, CouponError, parseIstDateTime, type CouponInput } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";

type State = { ok?: string; error?: string };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optInt = (s: string) => (s ? Number(s) : null);

/** A datetime-local field, read as India time. null = left empty; undefined = not a real date and time. */
function istField(fd: FormData, k: string): Date | null | undefined {
  const v = str(fd, k);
  return v ? (parseIstDateTime(v) ?? undefined) : null;
}

export async function createCouponAction(_prev: State, fd: FormData): Promise<State> {
  const admin = await actorWith("admin.commerce");
  const startsAt = istField(fd, "startsAt");
  const endsAt = istField(fd, "endsAt");
  if (startsAt === undefined || endsAt === undefined) {
    return { error: "Enter the start and end as a date and time, or leave them empty." };
  }
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
    startsAt,
    endsAt,
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
