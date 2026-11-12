import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { Catalogue } from "../../../components/shop/catalogue";
import { queryString, normaliseParams } from "../../../components/shop/catalogue-query";

export const metadata: Metadata = {
  title: "Store",
  description: "Program access, working tools and gear, priced in THC earned by doing or in rupees — with honest stock counts.",
  alternates: { canonical: "/marketplace" },
};
export const dynamic = "force-dynamic";

/** The public catalogue. Members shop inside the app, at /store (same filters carried over). */
export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  if (user?.profile?.onboardedAt) redirect(`/store${queryString(normaliseParams(sp))}`);
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--gutter)] py-14 md:py-20">
      <h1 className="display text-h1">Store</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-2">
        Program access, working tools and gear — priced in THC that members earn by doing the work, in rupees, or both. Every gear price is also shown as
        time: how long a member mining steadily takes to earn it.
      </p>
      <div className="mt-10">
        <Catalogue base="/marketplace" searchParams={sp} />
      </div>
    </main>
  );
}
