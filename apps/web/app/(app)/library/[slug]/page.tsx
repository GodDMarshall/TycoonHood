import type { Metadata } from "next";
import { requireUser } from "../../../../lib/guard";
import { notFound, redirect } from "next/navigation";
import { marked } from "marked";
import { prisma } from "@tycoonhood/db";
import { Badge } from "@tycoonhood/ui";
import { Page } from "../../../../components/app/page";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Library" };

export default async function LibraryItem({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const user = (await getCurrentUser())!;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || product.kind !== "DIGITAL") notFound();

  const owned = await prisma.order.findFirst({
    where: { userId: user.id, status: "FULFILLED", items: { some: { productId: product.id } } },
    select: { id: true },
  });
  if (!owned) redirect("/store");

  const html = product.contentMd
    ? await marked.parse(product.contentMd)
    : "<p>This item's content is being prepared — you own it, and it will appear here.</p>";

  return (
    <Page width="narrow">
      <Badge tone="gold">In your library</Badge>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{product.name}</h1>
      <article className="md-content mt-8 border-t border-line pt-8" dangerouslySetInnerHTML={{ __html: html }} />
    </Page>
  );
}
