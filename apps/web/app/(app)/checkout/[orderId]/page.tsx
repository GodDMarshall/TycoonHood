import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { PENDING_TTL_MINUTES, razorpayOpenTo } from "@tycoonhood/core";
import { requireUser } from "../../../../lib/guard";
import { releaseExpiredOrder } from "../../../../lib/stale-orders";
import { Page, PageHeader, Panel } from "../../../../components/app/page";
import { RazorpayButton } from "../../../../components/shop/razorpay-button";
import { SandboxPay } from "../../../../components/shop/sandbox-pay";
import { TestModeBanner } from "../../../../components/shop/test-mode-banner";
import { SubmitButton } from "../../../../components/submit-button";
import { inr, orderRef } from "../../../../components/shop/format";
import { abandonOrderAction, sandboxFailAction, sandboxPayAction, verifyRazorpayAction } from "../actions";

export const metadata: Metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser();
  const { orderId } = await params;
  // This member's order only, so one whose hold has run out is not offered for
  // payment. A slow Razorpay lookup finishes after the response instead.
  await releaseExpiredOrder(orderId, user.id);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" } }, items: { include: { product: true } } },
  });
  if (!order) notFound();
  if (order.status !== "PENDING") redirect(`/checkout/${order.id}/done`);
  const payment = order.payments[0];
  if (!payment?.providerOrderId) notFound();

  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  // Checked again here, not only at checkout: Razorpay test keys in production
  // are for staff with admin.commerce, so nobody else is shown the button.
  const razorpayKey = payment.provider === "razorpay" && razorpayOpenTo(user) ? keyId : undefined;
  const expires = new Date(order.createdAt.getTime() + PENDING_TTL_MINUTES * 60_000);

  return (
    <Page width="narrow">
      <PageHeader kicker={`Order ${orderRef(order.id)}`} title="Payment" description={`Pay ${inr(order.totalFiatCents)} to confirm your order. Items are held for you until ${expires.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`} />
      {payment.mode === "TEST" && <TestModeBanner className="mb-6" />}
      <Panel className="flex flex-col gap-5 p-5 sm:p-6">
        <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-[14px]">
          <dt className="text-ink-2">Subtotal</dt>
          <dd className="figures text-right">{inr(order.totalFiatCents + order.discountCents)}</dd>
          {order.discountCents > 0 && (
            <>
              <dt className="text-ink-2">Coupon {order.couponCode}</dt>
              <dd className="figures text-right text-success">−{inr(order.discountCents)}</dd>
            </>
          )}
          <dt className="font-semibold text-ink-1">Total</dt>
          <dd className="figures text-right font-semibold">{inr(order.totalFiatCents)}</dd>
        </dl>

        {razorpayKey ? (
          <RazorpayButton
            keyId={razorpayKey}
            providerOrderId={payment.providerOrderId}
            amountPaise={payment.amountCents}
            orderRef={orderRef(order.id)}
            prefill={{ name: user.profile?.displayName ?? user.name ?? undefined, email: user.email }}
            verify={verifyRazorpayAction.bind(null, order.id)}
          />
        ) : payment.provider === "sandbox" ? (
          <SandboxPay pay={sandboxPayAction.bind(null, order.id)} fail={sandboxFailAction.bind(null, order.id)} amount={inr(order.totalFiatCents)} />
        ) : (
          <p className="text-[13px] text-danger">This payment method is not available right now. Cancel this order and check out again.</p>
        )}

        <form action={abandonOrderAction.bind(null, order.id)} className="border-t border-line pt-4">
          <SubmitButton variant="ghost" size="sm">Cancel this order and go back to the cart</SubmitButton>
        </form>
      </Panel>
    </Page>
  );
}
