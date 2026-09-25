import type { Metadata } from "next";
import { requireUser } from "../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { Badge, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";
import Link from "next/link";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";
const dt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const fiat = (c: number, cur: string) => `${cur === "USD" ? "$" : cur + " "}${(c / 100).toFixed(2)}`;
const tone = { PENDING: "neutral", PAID: "gold", FULFILLED: "success", CANCELLED: "neutral", REFUNDED: "danger" } as const;

export default async function OrdersPage() {
  await requireUser();
  const user = (await getCurrentUser())!;
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } }, address: true },
  });
  const library = orders.filter((o) => o.status === "FULFILLED" && o.items.some((i) => i.product.kind === "DIGITAL" || i.product.kind === "COURSE"));

  return (
    <main>
      <p className="eyebrow mb-2">Orders</p>
      <h1 className="display text-[34px]">Bought and on the books.</h1>

      {library.length > 0 && (
        <>
          <SectionRule label="Your library" className="mb-4 mt-8" />
          <div className="flex flex-wrap gap-2">
            {library.flatMap((o) => o.items.filter((i) => i.product.kind !== "PHYSICAL").map((i) => (
              <Link
                key={i.id}
                href={i.product.kind === "COURSE" ? "/academy" : `/library/${i.product.slug}`}
              >
                <Badge tone="gold">
                  {i.product.kind === "COURSE" ? "🎓" : "📖"} {i.product.name} →
                </Badge>
              </Link>
            )))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Course purchases appear in your Academy immediately.</p>
        </>
      )}

      <SectionRule label="History" className="mb-4 mt-10" />
      {orders.length === 0 ? (
        <p className="text-[14px] text-ink-3">No orders yet — the marketplace takes the THC you earned.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="text-[14px] text-ink-1">
                    {o.items
                      .map((i) => (i.variantLabel ? `${i.product.name} (${i.variantLabel})` : i.product.name))
                      .join(", ")}
                  </p>
                  <p className="figures text-[11px] text-ink-3">
                    #{o.id.slice(-6).toUpperCase()} · {dt.format(o.createdAt)}
                    {o.paymentProvider ? ` · ${o.paymentProvider}` : " · THC"}
                  </p>
                  {/* A member who paid should never have to ask where it is. */}
                  {o.trackingNumber ? (
                    <p className="figures mt-1 text-[12px] text-success">
                      Sent {o.shippedAt ? dt.format(o.shippedAt) : ""} · {o.trackingCarrier} {o.trackingNumber}
                    </p>
                  ) : o.status === "PAID" && o.items.some((i) => i.product.kind === "PHYSICAL") ? (
                    <p className="mt-1 text-[12px] text-gold-bright">
                      Being packed. You get the tracking number here the moment it ships.
                    </p>
                  ) : null}
                  {o.address && (
                    <p className="mt-1 text-[11px] text-ink-3">
                      To {o.address.fullName}, {o.address.city} {o.address.postalCode}, {o.address.country}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {o.totalThc > 0n ? <ThcAmount amount={o.totalThc} size="sm" /> : <span className="figures text-[14px]">{fiat(o.totalFiatCents, o.fiatCurrency)}</span>}
                  <Badge tone={tone[o.status]}>{o.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
