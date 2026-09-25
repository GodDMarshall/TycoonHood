import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { catalog, judgePrice, suggestPrice, dailyYield, thcPerDollar, MERCH_TARGET_DAYS } from "@tycoonhood/core";
import { Badge, Card, CardContent, SectionRule } from "@tycoonhood/ui";
import { ProductForm } from "../../../../components/admin-product-form";
import { toggleProductAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Products" };
export const dynamic = "force-dynamic";

const money = (c: number | null) => (c == null ? "—" : `$${(c / 100).toFixed(2)}`);

export default async function AdminProducts() {
  await requireAdmin();

  const [products, courses] = await Promise.all([
    catalog.list(),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const economics = {
    thcPerDayRegular: dailyYield(1, "regular").toString(),
    targetMinDays: MERCH_TARGET_DAYS.min,
    targetMaxDays: MERCH_TARGET_DAYS.max,
    suggested: suggestPrice().toString(),
    // The house exchange rate, so the form can check a THC price against the
    // shelf price rather than against a one-size window.
    thcPerDollar: Math.round(thcPerDollar()),
  };

  return (
    <main>
      <h1 className="display text-[30px]">Products</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        Everything a member can spend on. A THC price here is not a number — it
        is an amount of someone&rsquo;s time, so the form tells you how many
        months of mining you just asked for.
      </p>

      <SectionRule label={`${products.length} in the catalogue`} className="mb-4 mt-8" />

      {products.length === 0 ? (
        <p className="text-[14px] text-ink-3">Nothing yet. The first product goes below.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => {
            const stock = catalog.stockOf(p);
            const time = p.priceThc != null && p.kind === "PHYSICAL" ? judgePrice(p.priceThc, p.priceFiatCents) : null;
            const margin =
              p.costCents != null && p.priceFiatCents != null
                ? Math.round(((p.priceFiatCents - p.costCents) / p.priceFiatCents) * 100)
                : null;
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-ink-1">
                      {p.name} <span className="figures text-[11px] text-ink-3">/{p.slug}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2">
                      <span>{p.kind}</span>
                      {p.priceThc != null && (
                        <span className="figures">{p.priceThc.toLocaleString("en-US")} THC</span>
                      )}
                      {p.priceFiatCents != null && <span className="figures">{money(p.priceFiatCents)}</span>}
                      {p.costCents != null && (
                        <span className="text-ink-3">cost {money(p.costCents)}{margin != null && ` · ${margin}% margin`}</span>
                      )}
                      <span className="text-ink-3">
                        {stock == null ? "unlimited" : `${stock} in stock`}
                      </span>
                      {p._count.orderItems > 0 && (
                        <span className="text-ink-3">{p._count.orderItems} sold</span>
                      )}
                    </p>

                    {p.variants.length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        {p.variants.map((v) => (
                          <span key={v.id}
                            className={`figures rounded border px-1.5 py-0.5 text-[11px] ${
                              !v.active ? "border-line text-ink-3 line-through"
                              : v.inventory === 0 ? "border-danger/40 text-danger"
                              : "border-line text-ink-2"
                            }`}>
                            {v.label} · {v.inventory}
                          </span>
                        ))}
                      </p>
                    )}

                    {time && (
                      <p className={`mt-1 text-[12px] ${
                        time.verdict === "on target" ? "text-ink-3"
                        : time.verdict === "too cheap" ? "text-danger" : "text-gold-bright"
                      }`}>
                        {time.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={p.active ? undefined : "neutral"}>{p.active ? "Live" : "Draft"}</Badge>
                    <form action={toggleProductAction.bind(null, p.slug, !p.active)}>
                      <button type="submit" className="text-[12px] text-ink-3 underline hover:text-ink-1">
                        {p.active ? "Take down" : "Publish"}
                      </button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SectionRule label="Add or replace a product" className="mb-6 mt-12" />
      <p className="mb-6 max-w-2xl text-[13px] text-ink-2">
        Saving with an existing slug replaces that product. Sizes you remove are
        retired rather than deleted, because past orders still point at them.
      </p>
      <ProductForm courses={courses} economics={economics} />
    </main>
  );
}
