import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { REFUND_REASON_MAX, isTestOrder, opensLibrary, orderTimeline, refundBlocker } from "@tycoonhood/core";
import { Badge, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { Page, PageHeader, Panel, SectionTitle } from "../../../../components/app/page";
import { OrderTimeline } from "../../../../components/shop/order-timeline";
import { RefundForm } from "../../../../components/shop/refund-form";
import { TestModeBanner } from "../../../../components/shop/test-mode-banner";
import { money, orderRef, shortDate } from "../../../../components/shop/format";
import { requestRefundAction } from "../actions";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser();
  const { orderId } = await params;
  const o = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: {
      items: { include: { product: true } },
      address: true,
      payments: { orderBy: { createdAt: "asc" } },
      refundRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!o) notFound();
  const test = isTestOrder(o);
  const open = o.refundRequests.some((r) => r.status === "REQUESTED" || r.status === "APPROVED");
  const blocker = refundBlocker(o, open);
  const fiat = o.totalThc === 0n;
  const library = opensLibrary(o);

  return (
    <Page width="narrow">
      <PageHeader
        kicker={<Link href="/orders" className="hover:text-ink-1">Orders</Link>}
        title={`Order ${orderRef(o.id)}`}
        description={`Placed ${shortDate.format(o.createdAt)} · paid ${o.ledgerTxId ? "with THC" : `in ${o.fiatCurrency}${o.paymentProvider ? ` via ${o.paymentProvider}` : ""}`}`}
        actions={o.status === "PENDING" && o.paymentProvider ? <Link href={`/checkout/${o.id}`} className={buttonStyles({ size: "sm" })}>Pay now</Link> : undefined}
      />
      {test && <TestModeBanner className="mb-6" />}

      <div className="flex flex-col gap-6">
        <Panel className="p-5">
          <SectionTitle>Status</SectionTitle>
          <OrderTimeline steps={orderTimeline(o)} />
        </Panel>

        <Panel className="p-5">
          <SectionTitle>Items</SectionTitle>
          <ul className="flex flex-col gap-2 text-[14px]">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {i.qty}× {i.product.name}
                  {i.variantLabel && ` (${i.variantLabel})`}
                  {library && i.product.kind === "DIGITAL" && (
                    <Link href={`/library/${i.product.slug}`} className="ml-2 text-gold hover:text-gold-bright">
                      Open in library
                    </Link>
                  )}
                </span>
                <span className="figures shrink-0">
                  {i.unitPriceThc != null && !fiat
                    ? `${(i.unitPriceThc * BigInt(i.qty)).toLocaleString("en-US")} THC`
                    : i.unitPriceFiatC != null
                      ? money(i.unitPriceFiatC * i.qty, o.fiatCurrency)
                      : "—"}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 border-t border-line pt-3 text-[14px]">
            {o.discountCents > 0 && (
              <>
                <dt className="text-ink-2">Coupon {o.couponCode}</dt>
                <dd className="figures text-right text-success">−{money(o.discountCents, o.fiatCurrency)}</dd>
              </>
            )}
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold">
              {fiat ? <span className="figures">{money(o.totalFiatCents, o.fiatCurrency)}</span> : <ThcAmount amount={o.totalThc} size="sm" />}
            </dd>
          </dl>
        </Panel>

        {o.address && (
          <Panel className="p-5">
            <SectionTitle>Delivery address</SectionTitle>
            <address className="text-[14px] not-italic leading-relaxed text-ink-2">
              {o.address.fullName}<br />
              {o.address.line1}{o.address.line2 && `, ${o.address.line2}`}<br />
              {o.address.city}{o.address.region && `, ${o.address.region}`} {o.address.postalCode}<br />
              {o.address.country}
            </address>
          </Panel>
        )}

        <Panel className="p-5">
          <SectionTitle>Refund</SectionTitle>
          {o.refundRequests.length > 0 && (
            <ul className="mb-4 flex flex-col gap-2">
              {o.refundRequests.map((r) => (
                <li key={r.id} className="text-[13.5px]">
                  <Badge tone={r.status === "REJECTED" ? "neutral" : r.status === "REFUNDED" ? "success" : "gold"}>{r.status.toLowerCase()}</Badge>
                  <span className="ml-2 text-ink-3">{shortDate.format(r.createdAt)}</span>
                  <p className="mt-1 text-ink-2">{r.reason}</p>
                  {r.adminNote && <p className="mt-1 text-ink-3">Staff note: {r.adminNote}</p>}
                </li>
              ))}
            </ul>
          )}
          {blocker ? (
            <p className="text-[13px] text-ink-3">{blocker}</p>
          ) : (
            <RefundForm action={requestRefundAction.bind(null, o.id)} maxLength={REFUND_REASON_MAX} />
          )}
        </Panel>
      </div>
    </Page>
  );
}
