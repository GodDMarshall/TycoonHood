import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { requireUser } from "../../../../lib/guard";
import { Page } from "../../../../components/app/page";
import { ProductDetail } from "../../../../components/shop/product-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { name: true } });
  return { title: p ? `${p.name} · Store` : "Store" };
}

export default async function StoreProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  return (
    <Page width="wide">
      <ProductDetail slug={slug} base="/store" user={user} />
    </Page>
  );
}
