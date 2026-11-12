import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService, wishlist } from "@tycoonhood/core";
import { Icon, ThcAmount } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { cartItemCount } from "../../../lib/cart-count";
import { Page, PageHeader } from "../../../components/app/page";
import { Catalogue } from "../../../components/shop/catalogue";

export const metadata: Metadata = { title: "Store" };
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);
const pill = "flex h-10 items-center gap-2 rounded-md border border-line bg-bg-1 px-3.5 text-[13px] hover:border-line-strong";

export default async function StorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const [wallet, inCart, saved, sp] = await Promise.all([
    ledger.ensureUserAccount(user.id),
    cartItemCount(user.id),
    wishlist.ids(user.id),
    searchParams,
  ]);
  return (
    <Page width="wide">
      <PageHeader
        title="Store"
        description="Program access, working tools and gear — priced in THC you earned, in rupees, or both. Every size has a real stock count, and nothing is oversold."
        actions={
          <>
            <Link href="/wallet" className={pill}>
              <span className="text-ink-3">Balance</span>
              <ThcAmount amount={wallet.balance} size="sm" />
            </Link>
            <Link href="/wishlist" className={pill}>
              Wishlist <span className="figures text-ink-3">{saved.size}</span>
            </Link>
            <Link href="/cart" className={pill}>
              <Icon name="store" size={15} /> Cart <span className="figures text-gold">{inCart}</span>
            </Link>
          </>
        }
      />
      <Catalogue base="/store" searchParams={sp} wishlistIds={saved} />
    </Page>
  );
}
