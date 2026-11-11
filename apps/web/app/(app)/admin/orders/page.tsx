import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@tycoonhood/db";
import { prisma } from "@tycoonhood/db";
import { isTestOrder, paymentsStatus, shopStats } from "@tycoonhood/core";
import { Badge, Card, CardContent, Input, Select, SectionRule, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { requirePermission } from "../../../../lib/guard";
import { releaseExpiredHolds } from "../../../../lib/stale-orders";
import { settlePendingFiatAction } from "../actions";
import { ConfirmButton } from "../../../../components/admin-confirm";
import { ShipForm } from "../../../../components/admin-ship-form";
import { TestModeBanner } from "../../../../components/shop/test-mode-banner";
import { inr, money, orderRef } from "../../../../components/shop/format";
import { cancelPendingAction, shipAuditedAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Orders" };
export const dynamic = "force-dynamic";
const dt = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" });
const tone = { PENDING: "neutral", PAID: "gold", FULFILLED: "success", CANCELLED: "neutral", REFUNDED: "danger" } as const;
const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"] as const;
const PER_PAGE = 20;

const include = {
  items: { include: { product: true } },
  user: { include: { profile: true } },
  address: true,
  payments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.OrderInclude;

type Filters = { status: string; rail: string; mode: string; q: string };

function whereFor(f: Filters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if ((STATUSES as readonly string[]).includes(f.status)) and.push({ status: f.status as "PENDING" });
  if (f.rail === "thc") and.push({ ledgerTxId: { not: null } });
  if (f.rail === "inr") and.push({ ledgerTxId: null, fiatCurrency: "INR", totalFiatCents: { gt: 0 } });
  if (f.mode === "live") and.push({ payments: { some: { mode: "LIVE" } } });
  if (f.mode === "test") and.push({ payments: { some: { mode: "TEST" } } });
  if (f.q) {
    and.push({
      OR: [
        { id: { endsWith: f.q.toLowerCase() } },
        { user: { email: { contains: f.q, mode: "insensitive" } } },
        { user: { profile: { username: { contains: f.q, mode: "insensitive" } } } },
        { payments: { some: { providerPaymentId: f.q } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; rail?: string; mode?: string; q?: string }>;
}) {
  await requirePermission("admin.commerce");
  await releaseExpiredHolds();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const f: Filters = { status: sp.status ?? "", rail: sp.rail ?? "", mode: sp.mode ?? "", q: (sp.q ?? "").trim().slice(0, 80) };
  const where = whereFor(f);
  const pay = paymentsStatus();

  // The packing queue is always shown whole — it is a to-do list, not a log.
  const [toPack, total, history, revenue, testCount] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PAID", items: { some: { product: { kind: "PHYSICAL" } } } },
      orderBy: { createdAt: "asc" },
      include,
    }),
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include }),
    shopStats.liveRevenue(),
    shopStats.testCaptures(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (extra: Record<string, string | number>) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) s.set(k, String(v));
    return `/admin/orders?${s.toString()}`;
  };

  return (
    <main>
      <h1 className="display text-h2">Orders</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        {toPack.length === 0
          ? "Nothing waiting to be packed."
          : `${toPack.length} parcel${toPack.length === 1 ? "" : "s"} waiting to be packed. Until these go out, someone paid and received nothing.`}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="py-4">
          <p className="text-[12px] text-ink-3">Rupee revenue (live payments only)</p>
          <p className="figures mt-1 text-[20px]">{inr(revenue.amountCents)}</p>
          <p className="text-[12px] text-ink-3">{revenue.payments} captured, not refunded</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-[12px] text-ink-3">Test-mode payments</p>
          <p className="figures mt-1 text-[20px]">{testCount}</p>
          <p className="text-[12px] text-ink-3">Never counted as revenue</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-[12px] text-ink-3">Card rail</p>
          <p className="mt-1 text-[15px]">{pay.provider === "razorpay" ? (pay.mode === "LIVE" ? "Razorpay · live" : pay.staffOnly ? "Razorpay · test, staff only" : "Razorpay · test") : pay.provider === "sandbox" ? "Sandbox · test" : "Off"}</p>
          <p className="text-[12px] text-ink-3">{pay.summary}</p>
        </CardContent></Card>
      </div>
      {pay.mode === "TEST" && <TestModeBanner className="mt-4" />}

      {toPack.length > 0 && (
        <>
          <SectionRule label="Pack and send" className="mb-4 mt-8" />
          <div className="flex flex-col gap-2">{toPack.map((o) => <OrderRow key={o.id} o={o} showAddress />)}</div>
        </>
      )}

      <SectionRule label="All orders" className="mb-4 mt-10" />
      <form method="get" action="/admin/orders" className="mb-4 grid gap-2 sm:grid-cols-[1fr_repeat(3,150px)_auto]">
        <Input name="q" defaultValue={f.q} placeholder="Order ref, email, username or payment id" aria-label="Search orders" />
        <Select name="status" defaultValue={f.status} aria-label="Status">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </Select>
        <Select name="rail" defaultValue={f.rail} aria-label="Rail">
          <option value="">Any rail</option>
          <option value="thc">THC</option>
          <option value="inr">Rupees</option>
        </Select>
        <Select name="mode" defaultValue={f.mode} aria-label="Payment mode">
          <option value="">Live or test</option>
          <option value="live">Live only</option>
          <option value="test">Test only</option>
        </Select>
        <button type="submit" className={buttonStyles({ variant: "secondary", className: "h-11" })}>Filter</button>
      </form>

      <div className="flex flex-col gap-2">
        {history.length === 0 && <p className="text-[14px] text-ink-3">{total === 0 ? "No orders match." : "Nothing on this page."}</p>}
        {history.map((o) => <OrderRow key={o.id} o={o} />)}
      </div>

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-between" aria-label="Order pages">
          <span className="text-[12px] text-ink-3">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
          </span>
          <span className="flex gap-2">
            {page > 1 && <Link href={qs({ page: page - 1 })} className="rounded-md border border-line px-3 py-1 text-[12px] text-ink-2 hover:text-ink-1">Previous</Link>}
            {page < pages && <Link href={qs({ page: page + 1 })} className="rounded-md border border-line px-3 py-1 text-[12px] text-ink-2 hover:text-ink-1">Next</Link>}
          </span>
        </nav>
      )}
    </main>
  );
}

type Row = Prisma.OrderGetPayload<{ include: typeof include }>;

function OrderRow({ o, showAddress = false }: { o: Row; showAddress?: boolean }) {
  const physical = o.items.some((i) => i.product.kind === "PHYSICAL");
  const lines = o.items.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ""}${i.product.name}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ");
  const payment = o.payments[0];
  const test = isTestOrder(o);
  const legacyPending = o.status === "PENDING" && o.paymentProvider && o.payments.length === 0;

  return (
    <Card>
      <CardContent className="py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-ink-1">@{o.user.profile?.username ?? o.user.email} — {lines}</p>
            <p className="figures mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-3">
              <span>#{orderRef(o.id)} · {dt.format(o.createdAt)} · {o.ledgerTxId ? "THC" : o.paymentProvider ?? "—"}</span>
              {payment && <span>payment {payment.status.toLowerCase()}{payment.providerPaymentId ? ` · ${payment.providerPaymentId}` : ""}</span>}
              {o.couponCode && <span>coupon {o.couponCode} (−{inr(o.discountCents)})</span>}
              {o.affiliateCode && <span>via {o.affiliateCode}</span>}
              {o.trackingNumber && <span>{o.trackingCarrier} {o.trackingNumber}</span>}
            </p>
            {showAddress && o.address && (
              <address className="mt-2 rounded border border-line bg-bg-1/50 px-2.5 py-2 text-[12px] not-italic leading-relaxed text-ink-2">
                {o.address.fullName}<br />
                {o.address.line1}{o.address.line2 && <>, {o.address.line2}</>}<br />
                {o.address.city}{o.address.region && `, ${o.address.region}`} {o.address.postalCode}<br />
                {o.address.country}{o.address.phone && <> · {o.address.phone}</>}
              </address>
            )}
            {showAddress && !o.address && (
              <p className="mt-2 text-[12px] text-danger">No address on this order — it predates address capture. Ask the member before shipping.</p>
            )}
          </div>
          <span className="flex flex-wrap items-center gap-2">
            {o.ledgerTxId ? null : test ? <Badge tone="warning">Test</Badge> : payment?.mode === "LIVE" ? <Badge tone="gold">Live</Badge> : null}
            {o.totalThc > 0n ? <ThcAmount amount={o.totalThc} size="sm" /> : <span className="figures text-[13px]">{money(o.totalFiatCents, o.fiatCurrency)}</span>}
            <Badge tone={tone[o.status]}>{o.status}</Badge>
            {o.status === "PAID" && physical && <ShipForm action={shipAuditedAction.bind(null, o.id)} />}
            {o.status === "PENDING" && o.payments.length > 0 && (
              <ConfirmButton action={cancelPendingAction.bind(null, o.id)} label="Cancel" confirmText="Cancel this unpaid order? Its stock and coupon go back. If the member pays afterwards, the payment is queued for refund." />
            )}
            {legacyPending && (
              <ConfirmButton
                action={settlePendingFiatAction.bind(null, o.id)}
                label="Settle manually"
                confirmText="Manually settle this legacy fiat order? Only do this when payment is confirmed out-of-band."
              />
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
