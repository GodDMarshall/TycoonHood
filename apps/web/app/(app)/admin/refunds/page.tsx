import type { Metadata } from "next";
import Link from "next/link";
import { refunds, REFUND_WINDOW_DAYS } from "@tycoonhood/core";
import { Badge, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { requirePermission } from "../../../../lib/guard";
import { ActionButton } from "../../../../components/earn/action-form";
import { RefundDecision } from "../../../../components/shop/refund-decision";
import { dateTime, money, orderRef } from "../../../../components/shop/format";
import { countRefundsAction, decideRefundAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Refunds" };
export const dynamic = "force-dynamic";

const FILTERS = [["REQUESTED", "Waiting"], ["REFUNDED", "Refunded"], ["REJECTED", "Rejected"], ["all", "All"]] as const;

export default async function AdminRefunds({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("admin.commerce");
  const sp = await searchParams;
  const status = (FILTERS.find(([v]) => v === sp.status)?.[0] ?? "REQUESTED") as "REQUESTED";
  const [list, failed, uncounted] = await Promise.all([refunds.listQueue(status), refunds.listFailedRefunds(), refunds.listUncountedRefunds()]);

  return (
    <main>
      <h1 className="display text-h2">Refunds</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        Members may ask within {REFUND_WINDOW_DAYS} days. Approving sends the money back on the rail it came in on: THC by ledger reversal,
        live rupee payments through Razorpay, test payments by marking them refunded (nothing moved). Unshipped gear goes back on the shelf
        and any affiliate commission is reversed. A refund made in the Razorpay dashboard counts too: a partial one leaves the order as it
        is, and approving a request then sends only the rest. To refund an order yourself, at any age, use Refund on the orders page.
      </p>
      {uncounted.length > 0 && (
        <Card className="mt-6 border-warning/50">
          <CardContent className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-ink-1">Refunds to count</p>
              <p className="mt-0.5 text-[12px] text-ink-3">
                These live payments were marked refunded before refund amounts were kept, so some may have been refunded only in part, and
                their orders may still stand. They cannot be refunded here until Razorpay&apos;s own record of their refunds is counted.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {uncounted.map((p) => (
                  <li key={p.id} className="figures flex flex-wrap items-center gap-2 text-[12px] text-ink-2">
                    order #{orderRef(p.order.id)} · {p.order.status.toLowerCase()} · {p.order.user.email} · {money(p.amountCents, p.currency)} paid
                    {p.providerPaymentId && <span className="text-ink-3">· {p.providerPaymentId}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <ActionButton action={countRefundsAction} label="Check with Razorpay" variant="primary" />
          </CardContent>
        </Card>
      )}
      {failed.length > 0 && (
        <Card className="mt-6 border-danger/50">
          <CardContent className="py-3.5">
            <p className="text-[13px] text-ink-1">Money still to send back</p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              These orders were refunded or cancelled, but the payment is still with us and no refund request is open. Usually Razorpay could
              not complete the refund. Refund each one from the Razorpay dashboard. It is counted here when Razorpay confirms it.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {failed.map((p) => (
                <li key={p.id} className="figures flex flex-wrap items-center gap-2 text-[12px] text-ink-2">
                  order #{orderRef(p.order.id)} · {p.order.status.toLowerCase()} · {p.order.user.email} · {money(p.amountCents - p.refundedCents, p.currency)} to send
                  {p.providerPaymentId && <span className="text-ink-3">· {p.providerPaymentId}</span>}
                  {p.mode === "TEST" && <Badge tone="warning">Test</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <nav className="mb-4 mt-6 flex flex-wrap gap-1.5" aria-label="Filter refunds">
        {FILTERS.map(([v, l]) => (
          <Link key={v} href={`/admin/refunds?status=${v}`}
            className={`rounded-md border px-2.5 py-1 text-[12px] ${status === v ? "border-gold-deep bg-gold/10 text-gold-bright" : "border-line text-ink-3 hover:text-ink-1"}`}>
            {l}
          </Link>
        ))}
      </nav>
      <SectionRule label={`${list.length} ${list.length === 1 ? "request" : "requests"}`} className="mb-4" />
      {list.length === 0 ? (
        <p className="text-[14px] text-ink-3">{status === "REQUESTED" ? "Nothing waiting." : "Nothing here."}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((r) => {
            const o = r.order;
            const pay = o.payments.find((p) => p.status === "CAPTURED" || p.status === "REFUNDED");
            return (
              <Card key={r.id}>
                <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-ink-1">
                      @{r.user.profile?.username ?? r.user.email} — order #{orderRef(o.id)} ·{" "}
                      {o.items.map((i) => `${i.qty}× ${i.product.name}`).join(", ")}
                    </p>
                    <p className="figures mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                      {dateTime.format(r.createdAt)} · order {o.status.toLowerCase()} · {o.ledgerTxId ? "THC" : `${pay?.provider ?? o.paymentProvider ?? "?"}`}
                      {pay?.mode === "TEST" && <Badge tone="warning">Test</Badge>}
                      {pay?.mode === "LIVE" && <Badge tone="gold">Live</Badge>}
                      {o.shippedAt && <Badge>Shipped</Badge>}
                      {pay && <span>· payment {pay.status.toLowerCase()}</span>}
                      {pay && pay.refundedCents > 0 && pay.refundedCents < pay.amountCents && (
                        <span>
                          · {money(pay.refundedCents, pay.currency)} of {money(pay.amountCents, pay.currency)} refunded
                        </span>
                      )}
                    </p>
                    {r.status === "REQUESTED" && pay?.status === "CAPTURED" && pay.refundedCents > 0 && (
                      <p className="mt-1 text-[12px] text-warning">
                        {money(pay.refundedCents, pay.currency)} was already refunded in Razorpay. Approving sends the other{" "}
                        {money(pay.amountCents - pay.refundedCents, pay.currency)}.
                      </p>
                    )}
                    <p className="mt-2 text-[13.5px] text-ink-2">“{r.reason}”</p>
                    {r.adminNote && <p className="mt-1 text-[12.5px] text-ink-3">Note: {r.adminNote}</p>}
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:w-[320px] lg:items-end">
                    {o.totalThc > 0n ? <ThcAmount amount={o.totalThc} size="sm" /> : <span className="figures text-[14px]">{money(o.totalFiatCents, o.fiatCurrency)}</span>}
                    {r.status === "REQUESTED" ? (
                      <RefundDecision action={decideRefundAction.bind(null, r.id)} />
                    ) : (
                      <Badge tone={r.status === "REFUNDED" ? "success" : "neutral"}>{r.status.toLowerCase()}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
