import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { LedgerService, paymentsStatusFor, shopCheckout } from "@tycoonhood/core";
import { buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { releaseExpiredHolds } from "../../../lib/stale-orders";
import { Page, PageHeader, Panel, SectionTitle } from "../../../components/app/page";
import { CheckoutForm } from "../../../components/shop/checkout-form";
import { TestModeBanner } from "../../../components/shop/test-mode-banner";
import { inr } from "../../../components/shop/format";
import { placeOrderAction, previewCouponAction } from "./actions";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);

export default async function CheckoutPage() {
  const user = await requireUser();
  // Stale unpaid orders give their stock and coupons back before anyone is told
  // "sold out": this member's own every time, everyone else's at most once a minute.
  await releaseExpiredHolds(user.id);
  const quote = await shopCheckout.quoteInr(user.id);
  const { lines, totals } = quote;
  if (lines.length === 0) redirect("/cart");

  // As this member sees it: with Razorpay test keys in production, only staff
  // with admin.commerce get the rupee rail. startInrCheckout checks it again.
  const pay = paymentsStatusFor(user);
  const wallet = await ledger.ensureUserAccount(user.id);
  const balance = await ledger.getBalance(wallet.id);
  const blocked = lines.find((l) => l.problem);

  const thcWhy = blocked
    ? "Fix the items marked in your cart first."
    : totals.thc.unpriced.length
      ? "Some items cannot be bought with THC."
      : balance < totals.thc.total
        ? `Your balance is ${balance.toLocaleString("en-US")} THC.`
        : undefined;
  const inrWhy = blocked
    ? "Fix the items marked in your cart first."
    : totals.inr.unpriced.length
      ? "Some items have no rupee price."
      : pay.provider === null
        ? pay.summary
        : undefined;

  return (
    <Page>
      <PageHeader title="Checkout" description="One payment for everything in your cart." />
      {pay.mode === "TEST" && <TestModeBanner className="mb-6" />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="p-5 sm:p-6">
          <CheckoutForm
            placeAction={placeOrderAction}
            couponAction={previewCouponAction}
            rails={{ thc: { ok: !thcWhy, why: thcWhy }, inr: { ok: !inrWhy, why: inrWhy } }}
            needsAddress={totals.needsAddress}
            thcTotal={totals.thc.unpriced.length ? "—" : `${totals.thc.total.toLocaleString("en-US")} THC`}
            inrSubtotal={totals.inr.unpriced.length ? "—" : inr(totals.inr.total)}
            testMode={pay.mode === "TEST"}
          />
        </Panel>
        <Panel className="h-fit p-5">
          <SectionTitle action={<Link href="/cart" className={buttonStyles({ variant: "ghost", size: "sm" })}>Edit</Link>}>
            Your order
          </SectionTitle>
          <ul className="flex flex-col gap-2 text-[13.5px]">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {l.qty}× {l.name}
                  {l.variantLabel && ` (${l.variantLabel})`}
                </span>
                <span className="figures shrink-0 text-ink-1">
                  {l.unitInrPaise != null ? inr(l.unitInrPaise * l.qty) : l.unitThc != null ? `${(l.unitThc * BigInt(l.qty)).toLocaleString("en-US")} THC` : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">
            {totals.needsAddress ? "Gear ships from India; you get a tracking number on your order page." : "Digital items and program access are delivered the moment payment is confirmed."}
          </p>
        </Panel>
      </div>
    </Page>
  );
}
