import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { ProductShelves } from "../../../components/store/product-shelves";

export const metadata: Metadata = {
  title: "Store",
  description: "Program access, working tools and gear, priced in THC earned by doing — and translated into the months of work each price represents.",
  alternates: { canonical: "/marketplace" },
};
export const dynamic = "force-dynamic";

/** The public store. Members shop inside the app, at /store. */
export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (user?.profile?.onboardedAt) redirect("/store");
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--gutter)] py-14 md:py-20">
      <h1 className="display text-h1">Store</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-2">
        Program access, working tools and gear — priced in THC that members earn by doing the work, in currency, or both. Every gear price is also shown as
        time: how long a member mining steadily takes to earn it.
      </p>
      <div className="mt-12">
        <ProductShelves user={user} />
      </div>
    </main>
  );
}
