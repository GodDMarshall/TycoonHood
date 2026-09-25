import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { SectionRule } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" });

export default async function BlogIndex() {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow mb-3">Journal</p>
      <h1 className="display text-[40px] leading-tight">Written like we build.</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        Essays on the pillars, the economy, and the standard — published when
        there is something worth saying.
      </p>
      <SectionRule className="my-10" />
      <div className="flex flex-col">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="group border-b border-line py-8 last:border-0">
            <p className="figures text-[12px] text-ink-3">{p.publishedAt ? dateFmt.format(p.publishedAt) : ""}</p>
            <h2 className="display mt-2 text-[26px] leading-snug transition-colors group-hover:text-gold-bright">
              {p.title}
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{p.excerpt}</p>
            <span className="mt-3 inline-block text-[12px] font-semibold uppercase tracking-[0.14em] text-gold opacity-0 transition-opacity group-hover:opacity-100">
              Read →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
