import type { Metadata } from "next";
import Link from "next/link";
import { refunds, REFUND_WINDOW_DAYS } from "@tycoonhood/core";
import { Badge, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { requirePermission } from "../../../../lib/guard";
import { RefundDecision } from "../../../../components/shop/refund-decision";
import { dateTime, money, orderRef } from "../../../../components/shop/format";
import { decideRefundAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Refunds" };
export const dynamic = "force-dynamic";

const FILTERS = [["REQUESTED", "Waiting"], ["REFUNDED", "Refunded"], ["REJECTED", "Rejected"], ["all", "All"]] as const;

export default async function AdminRefunds({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("admin.commerce");
  const sp = await searchParams;
  const status = (FILTERS.find(([v]) => v === sp.status)?.[0] ?? "REQUESTED") as "REQUESTED";
  const list = await refunds.listQueue(status);

  return (
    <main>
      <h1 className="display text-h2">Refunds</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        Members may ask within {REFUND_WINDOW_DAYS} days. Approving sends the money back on the rail it came in on: THC by ledger reversal,
        live rupee payments through Razorpay, test payments by marking them refunded (nothing moved). Unshipped gear goes back on the shelf
        and any affiliate commission is reversed.
      </p>
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
                    </p>
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
