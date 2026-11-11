import type { Metadata } from "next";
import { coupons } from "@tycoonhood/core";
import { Badge, Card, CardContent, Input, Label, Select, SectionRule } from "@tycoonhood/ui";
import { requirePermission } from "../../../../lib/guard";
import { ActionForm } from "../../../../components/admin/action-form";
import { SubmitButton } from "../../../../components/submit-button";
import { inr, shortDate } from "../../../../components/shop/format";
import { createCouponAction, setCouponActiveAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Coupons" };
export const dynamic = "force-dynamic";

export default async function AdminCoupons() {
  await requirePermission("admin.commerce");
  const list = await coupons.list();
  const now = new Date();

  return (
    <main>
      <h1 className="display text-h2">Coupons</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        Codes take money off rupee checkouts only — THC prices are never discounted. Redemptions are counted atomically with the order, so a
        limit of 100 means 100. A code whose payment fails is given back.
      </p>

      <SectionRule label={`${list.length} ${list.length === 1 ? "code" : "codes"}`} className="mb-4 mt-8" />
      {list.length === 0 ? (
        <p className="text-[14px] text-ink-3">No coupons yet. Run the shop seed for WELCOME10, or create one below.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((c) => {
            const expired = c.endsAt && c.endsAt < now;
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="figures text-[14px] text-ink-1">
                      {c.code} <span className="text-ink-2">— {c.percentOff != null ? `${c.percentOff}% off` : `${inr(c.amountOffCents ?? 0)} off`}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {c.description && `${c.description} · `}
                      used {c.redeemedCount}
                      {c.maxRedemptions != null && ` of ${c.maxRedemptions}`} · {c.perUserLimit} per member
                      {c.minSubtotalCents > 0 && ` · min ${inr(c.minSubtotalCents)}`}
                      {c.startsAt && ` · from ${shortDate.format(c.startsAt)}`}
                      {c.endsAt && ` · until ${shortDate.format(c.endsAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {expired ? <Badge>Expired</Badge> : <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</Badge>}
                    <form action={setCouponActiveAction.bind(null, c.id, !c.active)}>
                      <SubmitButton size="sm" variant="outline">{c.active ? "Deactivate" : "Activate"}</SubmitButton>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SectionRule label="New coupon" className="mb-4 mt-12" />
      <ActionForm action={createCouponAction} submit="Create coupon" className="max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-code">Code</Label><Input id="c-code" name="code" required placeholder="WELCOME10" className="uppercase" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-desc">Description (internal)</Label><Input id="c-desc" name="description" placeholder="New member offer" /></div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-type">Discount type</Label>
            <Select id="c-type" name="type" defaultValue="percent">
              <option value="percent">Percent off</option>
              <option value="amount">Rupees off</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-value">Value (percent, or rupees)</Label><Input id="c-value" name="value" required inputMode="decimal" placeholder="10" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-min">Minimum subtotal, ₹ (optional)</Label><Input id="c-min" name="minSubtotal" inputMode="decimal" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-max">Max redemptions (empty = no cap)</Label><Input id="c-max" name="maxRedemptions" inputMode="numeric" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-per">Per member</Label><Input id="c-per" name="perUserLimit" inputMode="numeric" defaultValue="1" /></div>
          <div />
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-start">Starts (optional)</Label><Input id="c-start" name="startsAt" type="datetime-local" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="c-end">Ends (optional)</Label><Input id="c-end" name="endsAt" type="datetime-local" /></div>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" name="active" className="accent-[var(--color-gold)]" /> Active now (leave off to review first)
        </label>
      </ActionForm>
    </main>
  );
}
