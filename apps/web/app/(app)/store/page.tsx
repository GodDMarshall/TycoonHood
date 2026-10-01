import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { Icon, ThcAmount } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader } from "../../../components/app/page";
import { ProductShelves } from "../../../components/store/product-shelves";

export const metadata: Metadata = { title: "Store" };
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);

export default async function StorePage() {
  const user = await requireUser();
  const wallet = await ledger.ensureUserAccount(user.id);
  return (
    <Page width="wide">
      <PageHeader
        title="Store"
        description="Program access, working tools and gear — priced in THC you earned, in currency, or both. Every size has a real stock count, and nothing is oversold."
        actions={
          <Link href="/wallet" className="flex h-10 items-center gap-2 rounded-md border border-line bg-bg-1 px-3.5 hover:border-line-strong">
            <span className="text-[13px] text-ink-3">Balance</span>
            <ThcAmount amount={wallet.balance} size="sm" />
          </Link>
        }
      />
      <p className="mb-8 flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-3">
        <Icon name="clock" size={15} className="mt-0.5 shrink-0" />
        Gear prices are also shown as time: how long a member mining steadily takes to earn the item.
      </p>
      <ProductShelves user={user} />
    </Page>
  );
}
