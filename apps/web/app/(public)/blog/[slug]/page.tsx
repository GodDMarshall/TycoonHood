import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { renderMarkdown } from "@tycoonhood/core";
import { SectionRule } from "@tycoonhood/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });
  return { title: post?.title ?? "Journal", description: post?.excerpt };
}

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" });

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post || !post.publishedAt) notFound();

  const html = renderMarkdown(post.contentMd);

  return (
    <main className="mx-auto max-w-[var(--measure)] px-[var(--gutter)] py-16 md:py-24">
      <p className="eyebrow mb-3">Journal</p>
      <h1 className="display text-h1">{post.title}</h1>
      <p className="figures mt-3 text-[12px] text-ink-3">
        {dateFmt.format(post.publishedAt)} · {post.authorName}
      </p>
      <SectionRule className="my-8" />
      {/* Authored in our own CMS; renderMarkdown sanitises the HTML. */}
      <article className="md-content" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
