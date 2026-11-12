import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { getCurrentUser } from "../../../../lib/auth";
import { ProductDetail } from "../../../../components/shop/product-detail";
import { sliceWhole } from "@tycoonhood/core";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { name: true, description: true, active: true } });
  if (!p?.active) return { title: "Store" };
  return { title: p.name, description: sliceWhole(p.description, 0, 160), alternates: { canonical: `/marketplace/${slug}` } };
}

export default async function MarketplaceProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, user] = await Promise.all([params, getCurrentUser()]);
  if (user?.profile?.onboardedAt) redirect(`/store/${slug}`);
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--gutter)] py-14 md:py-20">
      <ProductDetail slug={slug} base="/marketplace" user={null} />
    </main>
  );
}
