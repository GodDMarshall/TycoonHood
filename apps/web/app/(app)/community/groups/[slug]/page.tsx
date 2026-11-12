import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { discussions, memberZone } from "@tycoonhood/core";
import { Badge, Button, EmptyState, PillarBadge, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../../../lib/guard";
import { Page, PageHeader } from "../../../../../components/app/page";
import { CommunityTabs } from "../../../../../components/community/community-frame";
import { PostList, Pager } from "../../discussions/_components/post-list";
import { joinGroupAction, leaveGroupAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Group · ${slug}` };
}

export default async function GroupPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const sp = await searchParams;
  const viewer = { id: user.id, role: user.role };
  const group = await discussions.group(viewer, slug);
  if (!group) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const list = await discussions.listPosts(viewer, { groupId: group.id, page });

  return (
    <Page>
      <CommunityTabs active="groups" className="mb-6 max-w-md" />
      <p className="mb-4 text-[13.5px]">
        <Link href="/community/groups" className="text-ink-3 hover:text-ink-1">
          ← All groups
        </Link>
      </p>
      <PageHeader
        kicker={
          <span className="flex items-center gap-2">
            {group.pillar && <PillarBadge pillar={group.pillar} />}
            <span className="tabular-nums">
              {group.members} {group.members === 1 ? "member" : "members"}
            </span>
            {group.archived && <Badge tone="warning">Archived</Badge>}
          </span>
        }
        title={group.name}
        description={group.description}
        actions={
          group.archived ? null : group.joined ? (
            <>
              <Link href={`/community/discussions/new?group=${group.slug}`} className={buttonStyles({ size: "md" })}>
                New post
              </Link>
              <form action={leaveGroupAction.bind(null, group.id, group.slug)}>
                <Button type="submit" variant="ghost">
                  Leave
                </Button>
              </form>
            </>
          ) : (
            <form action={joinGroupAction.bind(null, group.id, group.slug)}>
              <Button type="submit">Join group</Button>
            </form>
          )
        }
      />
      {list.posts.length === 0 ? (
        <EmptyState icon="chat" title="No posts in this group yet." body={group.joined ? "Start the first one." : "Join the group to start the first one."} />
      ) : (
        <>
          <PostList posts={list.posts} zone={memberZone(user.profile?.timezone)} showWhere={false} />
          <Pager page={list.page} pages={list.pages} href={(p) => `/community/groups/${group.slug}${p > 1 ? `?page=${p}` : ""}`} />
        </>
      )}
    </Page>
  );
}
