import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { formatDate, isTestOrder, memberZone, opensLibrary } from "@tycoonhood/core";
import { Badge, EmptyState, Icon, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel, SectionTitle } from "../../../components/app/page";
import { money, orderRef } from "../../../components/shop/format";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";
const tone = { PENDING: "neutral", PAID: "gold", FULFILLED: "success", CANCELLED: "neutral", REFUNDED: "danger" } as const;
const statusLabel = { PENDING: "Awaiting payment", PAID: "Paid", FULFILLED: "Fulfilled", CANCELLED: "Cancelled", REFUNDED: "Refunded" } as const;

export default async function OrdersPage() {
  const user = await requireUser();
  const zone = memberZone(user.profile?.timezone);
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } }, payments: { select: { mode: true } } },
    take: 100,
  });
  // Paid is enough: gear in the same order may still be waiting to ship.
  const library = orders.filter(
    (o) => opensLibrary(o) && o.items.some((i) => i.product.kind === "DIGITAL" || i.product.kind === "COURSE")
  );

  return (
    <Page>
      <PageHeader title="Orders" description="Every purchase, every parcel and every tracking number — the same record staff work from." />

      {library.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Your library</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {library.flatMap((o) =>
              o.items
                .filter((i) => i.product.kind !== "PHYSICAL")
                .map((i) => (
                  <Link key={i.id} href={i.product.kind === "COURSE" ? "/courses" : `/library/${i.product.slug}`}>
                    <Badge tone="gold">
                      <Icon name={i.product.kind === "COURSE" ? "academy" : "book"} size={12} /> {i.product.name}
                    </Badge>
                  </Link>
                ))
            )}
          </div>
        </section>
      )}

      <SectionTitle>History</SectionTitle>
      {orders.length === 0 ? (
        <EmptyState
          icon="orders"
          title="No orders yet"
          body="When you buy something it appears here, with its status and, for gear, its tracking number."
          action={<Link href="/store" className={buttonStyles({ size: "sm" })}>Go to the store</Link>}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                <Panel as="div" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:border-line-strong">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-ink-1">
                      {o.items.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ""}${i.product.name}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ")}
                    </p>
                    <p className="figures text-[12px] text-ink-3">
                      #{orderRef(o.id)} · {formatDate(o.createdAt, zone)} · {o.ledgerTxId ? "THC" : o.paymentProvider ?? "THC"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTestOrder(o) && <Badge tone="warning">Test mode</Badge>}
                    {o.totalThc > 0n ? <ThcAmount amount={o.totalThc} size="sm" /> : <span className="figures text-[14px]">{money(o.totalFiatCents, o.fiatCurrency)}</span>}
                    <Badge tone={tone[o.status]}>{statusLabel[o.status]}</Badge>
                  </div>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
