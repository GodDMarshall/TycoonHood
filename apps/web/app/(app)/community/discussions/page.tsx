import type { Metadata } from "next";
import Link from "next/link";
import { discussions } from "@tycoonhood/core";
import { EmptyState, buttonStyles, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { Page, PageHeader } from "../../../../components/app/page";
import { CommunityTabs } from "../../../../components/community/community-frame";
import { PostList, Pager } from "./_components/post-list";

export const metadata: Metadata = { title: "Discussions" };
export const dynamic = "force-dynamic";

export default async function DiscussionsPage({ searchParams }: { searchParams: Promise<{ c?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const viewer = { id: user.id, role: user.role };
  const categories = await discussions.categories();
  const active = categories.find((c) => c.slug === sp.c) ?? null;
  const page = Math.max(1, Number(sp.page) || 1);
  const list = await discussions.listPosts(viewer, { categorySlug: active?.slug ?? null, page });

  const qs = (p: number) => {
    const q = new URLSearchParams();
    if (active) q.set("c", active.slug);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/community/discussions${s ? `?${s}` : ""}`;
  };

  return (
    <Page>
      <CommunityTabs active="discussions" className="mb-6 max-w-md" />
      <PageHeader
        title="Discussions"
        description="Questions with answers, wins with proof, write-ups worth finding later. Talking earns nothing here; it helps."
        actions={
          <Link href={`/community/discussions/new${active ? `?c=${active.slug}` : ""}`} className={buttonStyles({ size: "md" })}>
            New discussion
          </Link>
        }
      />

      <nav aria-label="Categories" className="-mx-1 mb-5 flex gap-1 overflow-x-auto pb-1">
        {[{ slug: null as string | null, name: "All" }, ...categories].map((c) => {
          const on = (c.slug ?? null) === (active?.slug ?? null);
          return (
            <Link
              key={c.slug ?? "all"}
              href={c.slug ? `/community/discussions?c=${c.slug}` : "/community/discussions"}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13.5px] transition-colors",
                on ? "border-gold-deep bg-gold/[0.07] text-gold-bright" : "border-line text-ink-2 hover:border-line-strong hover:text-ink-1"
              )}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>

      {active?.description && <p className="mb-4 text-[14px] text-ink-2">{active.description}</p>}

      {list.posts.length === 0 ? (
        <EmptyState
          icon="chat"
          title={active ? `Nothing in ${active.name} yet.` : "No discussions yet."}
          body="Start one. A specific question or a win with proof is the best first post."
          action={
            <Link href={`/community/discussions/new${active ? `?c=${active.slug}` : ""}`} className={buttonStyles({ size: "sm", variant: "secondary" })}>
              Start a discussion
            </Link>
          }
        />
      ) : (
        <>
          <PostList posts={list.posts} showWhere={!active} />
          <Pager page={list.page} pages={list.pages} href={qs} />
        </>
      )}
    </Page>
  );
}
