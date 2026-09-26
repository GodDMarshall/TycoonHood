import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { Badge, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { shipOrderAction, settlePendingFiatAction } from "../actions";
import { ConfirmButton } from "../../../../components/admin-confirm";
import { ShipForm } from "../../../../components/admin-ship-form";

export const metadata: Metadata = { title: "Admin · Orders" };
export const dynamic = "force-dynamic";
const dt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const money = (c: number, cur: string) => `${cur === "USD" ? "$" : cur + " "}${(c / 100).toFixed(2)}`;
const tone = { PENDING: "neutral", PAID: "gold", FULFILLED: "success", CANCELLED: "neutral", REFUNDED: "danger" } as const;

const PER_PAGE = 20;

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const status = sp.status && sp.status !== "all" ? sp.status : null;

  const include = {
    items: { include: { product: true } },
    user: { include: { profile: true } },
    address: true,
  } as const;

  // The queue is always shown whole — it is a to-do list, not a log. Only the
  // history below it pages, because it grows forever.
  const [toPack, historyCount, history, counts] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PAID", items: { some: { product: { kind: "PHYSICAL" } } } },
      orderBy: { createdAt: "asc" },
      include,
    }),
    prisma.order.count({
      where: {
        ...(status ? { status: status as "PENDING" } : {}),
        NOT: { AND: [{ status: "PAID" }, { items: { some: { product: { kind: "PHYSICAL" } } } }] },
      },
    }),
    prisma.order.findMany({
      where: {
        ...(status ? { status: status as "PENDING" } : {}),
        NOT: { AND: [{ status: "PAID" }, { items: { some: { product: { kind: "PHYSICAL" } } } }] },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include,
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const pages = Math.max(1, Math.ceil(historyCount / PER_PAGE));
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <main>
      <h1 className="display text-h2">Orders</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        {toPack.length === 0
          ? "Nothing waiting to be packed."
          : `${toPack.length} parcel${toPack.length === 1 ? "" : "s"} waiting to be packed. Until these go out, someone mined for months and received nothing.`}
      </p>

      {toPack.length > 0 && (
        <>
          <SectionRule label="Pack and send" className="mb-4 mt-8" />
          <div className="flex flex-col gap-2">
            {toPack.map((o) => <OrderRow key={o.id} o={o} showAddress />)}
          </div>
        </>
      )}

      {/* Everything else. A parcel in the queue above is not repeated here:
          the same order offering the same action twice invites shipping it
          twice and reading the list wrong. */}
      <SectionRule label="Everything else" className="mb-4 mt-10" />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {[["all", "All"], ["PENDING", "Pending"], ["PAID", "Paid"], ["FULFILLED", "Fulfilled"], ["CANCELLED", "Cancelled"]].map(
          ([value, label]) => {
            const on = (status ?? "all") === value;
            return (
              <Link
                key={value}
                href={`/admin/orders?status=${value}`}
                className={`rounded-md border px-2.5 py-1 text-[12px] ${
                  on ? "border-gold-deep bg-gold/10 text-gold-bright" : "border-line text-ink-3 hover:text-ink-1"
                }`}
              >
                {label}
                {value !== "all" && <span className="figures ml-1.5 text-ink-3">{countOf(value)}</span>}
              </Link>
            );
          }
        )}
      </div>

      <div className="flex flex-col gap-2">
        {history.length === 0 && (
          <p className="text-[14px] text-ink-3">
            {historyCount === 0 ? "Nothing here." : "Nothing on this page."}
          </p>
        )}
        {history.map((o) => <OrderRow key={o.id} o={o} />)}
      </div>

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-between" aria-label="Order history pages">
          <span className="text-[12px] text-ink-3">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, historyCount)} of {historyCount}
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/orders?page=${page - 1}${status ? `&status=${status}` : ""}`}
                className="rounded-md border border-line px-3 py-1 text-[12px] text-ink-2 hover:text-ink-1">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={`/admin/orders?page=${page + 1}${status ? `&status=${status}` : ""}`}
                className="rounded-md border border-line px-3 py-1 text-[12px] text-ink-2 hover:text-ink-1">
                Next
              </Link>
            )}
          </span>
        </nav>
      )}
    </main>
  );
}

type Row = Awaited<ReturnType<typeof prisma.order.findMany>>[number] & {
  items: { variantLabel: string | null; product: { name: string; kind: string } }[];
  user: { email: string; profile: { username: string } | null };
  address: {
    fullName: string; line1: string; line2: string | null; city: string;
    region: string | null; postalCode: string; country: string; phone: string | null;
  } | null;
};

function OrderRow({ o, showAddress = false }: { o: Row; showAddress?: boolean }) {
  const physical = o.items.some((i) => i.product.kind === "PHYSICAL");
  const lines = o.items
    .map((i) => (i.variantLabel ? `${i.product.name} (${i.variantLabel})` : i.product.name))
    .join(", ");

  return (
    <Card>
      <CardContent className="py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-ink-1">
              @{o.user.profile?.username ?? o.user.email} — {lines}
            </p>
            <p className="figures mt-0.5 text-[11px] text-ink-3">
              #{o.id.slice(-6).toUpperCase()} · {dt.format(o.createdAt)} · {o.paymentProvider ?? "THC"}
              {o.trackingNumber && ` · ${o.trackingCarrier} ${o.trackingNumber}`}
            </p>

            {showAddress && o.address && (
              <address className="mt-2 rounded border border-line bg-bg-1/50 px-2.5 py-2 text-[12px] not-italic leading-relaxed text-ink-2">
                {o.address.fullName}<br />
                {o.address.line1}{o.address.line2 && <>, {o.address.line2}</>}<br />
                {o.address.city}{o.address.region && `, ${o.address.region}`} {o.address.postalCode}<br />
                {o.address.country}
                {o.address.phone && <> · {o.address.phone}</>}
              </address>
            )}
            {showAddress && !o.address && (
              <p className="mt-2 text-[12px] text-danger">
                No address on this order — it predates address capture. Ask the member before shipping.
              </p>
            )}
          </div>

          <span className="flex flex-wrap items-center gap-2">
            {o.totalThc > 0n
              ? <ThcAmount amount={o.totalThc} size="sm" />
              : <span className="figures text-[13px]">{money(o.totalFiatCents, o.fiatCurrency)}</span>}
            <Badge tone={tone[o.status]}>{o.status}</Badge>
            {o.status === "PAID" && physical && (
              <ShipForm action={shipOrderAction.bind(null, o.id)} />
            )}
            {o.status === "PENDING" && o.paymentProvider && (
              <ConfirmButton
                action={settlePendingFiatAction.bind(null, o.id)}
                label="Settle manually"
                confirmText="Manually settle this fiat order? Only do this when payment is confirmed out-of-band."
              />
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
