import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { isTestOrder, opensLibrary, orderTimeline, paidAfterCancel } from "@tycoonhood/core";
import { EmptyState, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../../../lib/guard";
import { Page, PageHeader, Panel } from "../../../../../components/app/page";
import { OrderTimeline } from "../../../../../components/shop/order-timeline";
import { TestModeBanner } from "../../../../../components/shop/test-mode-banner";
import { inr, orderRef } from "../../../../../components/shop/format";

export const metadata: Metadata = { title: "Order confirmation" };
export const dynamic = "force-dynamic";

export default async function DonePage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser();
  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: { include: { product: true } }, payments: true, refundRequests: true },
  });
  if (!order) notFound();
  if (order.status === "PENDING") redirect(`/checkout/${order.id}`);
  const ok = order.status === "PAID" || order.status === "FULFILLED";
  const test = isTestOrder(order);
  // A payment that landed after the order was cancelled is refunded, never kept.
  const late = paidAfterCancel(order);
  const lateRefunded = late && order.payments.some((p) => p.status === "REFUNDED");
  // Digital items open as soon as the order is paid, even while gear in it waits to ship.
  const digital = opensLibrary(order) ? order.items.filter((i) => i.product.kind === "DIGITAL") : [];

  return (
    <Page width="narrow">
      <PageHeader
        kicker={`Order ${orderRef(order.id)}`}
        title={ok ? "Thank you — your order is confirmed" : order.status === "REFUNDED" ? "This order was refunded" : "This order did not go through"}
        description={
          ok
            ? order.status === "FULFILLED"
              ? "Everything in it is yours now."
              : `We are packing it. The tracking number appears on your order page the moment it ships.${digital.length > 0 ? " Digital items are in your library now." : ""}`
            : order.status === "REFUNDED"
              ? "It was refunded in full."
              : late
                ? `Your payment arrived after this order was cancelled, so ${lateRefunded ? "it was refunded in full" : "a full refund has been queued. You do not need to do anything"}. The items went back on the shelf, and your cart is as you left it.`
                : "No payment was completed, so nothing was charged and the items went back on the shelf. Your cart is as you left it."
        }
      />
      {test && <TestModeBanner className="mb-6" />}
      {ok ? (
        <Panel className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] text-ink-2">Paid</span>
            {order.totalThc > 0n ? <ThcAmount amount={order.totalThc} size="sm" /> : <span className="figures">{inr(order.totalFiatCents)}</span>}
          </div>
          <OrderTimeline steps={orderTimeline(order)} />
          <div className="flex flex-wrap gap-2">
            <Link href={`/orders/${order.id}`} className={buttonStyles({ size: "sm" })}>View order</Link>
            {digital.map((i) => (
              <Link key={i.id} href={`/library/${i.product.slug}`} className={buttonStyles({ size: "sm", variant: "secondary" })}>
                {digital.length === 1 ? "Open in library" : `Open ${i.product.name}`}
              </Link>
            ))}
            {order.items.some((i) => i.product.kind === "COURSE") && (
              <Link href="/courses" className={buttonStyles({ size: "sm", variant: "secondary" })}>Go to your courses</Link>
            )}
            <Link href="/store" className={buttonStyles({ size: "sm", variant: "ghost" })}>Keep shopping</Link>
          </div>
        </Panel>
      ) : (
        <EmptyState
          icon="alert"
          title={order.status === "REFUNDED" || lateRefunded ? "Refunded" : late ? "Cancelled, refund queued" : "Cancelled"}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/cart" className={buttonStyles({ size: "sm" })}>Back to the cart</Link>
              {(late || order.status === "REFUNDED") && (
                <Link href={`/orders/${order.id}`} className={buttonStyles({ size: "sm", variant: "secondary" })}>View order</Link>
              )}
            </div>
          }
        />
      )}
    </Page>
  );
}
