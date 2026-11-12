import type { Metadata } from "next";
import Link from "next/link";
import { discussions } from "@tycoonhood/core";
import { Badge, Button, EmptyState, PillarBadge } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { Page, PageHeader, Panel } from "../../../../components/app/page";
import { CommunityTabs } from "../../../../components/community/community-frame";
import { joinGroupAction, leaveGroupAction } from "./actions";

export const metadata: Metadata = { title: "Groups" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await discussions.groups({ id: user.id, role: user.role });

  return (
    <Page>
      <CommunityTabs active="groups" className="mb-6 max-w-md" />
      <PageHeader title="Groups" description="Smaller rooms around one programme or one kind of work. Anyone can read a group; join it to post." />
      {groups.length === 0 ? (
        <EmptyState icon="chat" title="No groups yet." body="Staff open groups around the programmes. They will appear here." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Panel as="div" className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/community/groups/${g.slug}`} className="text-[16px] font-semibold text-ink-1 hover:underline">
                    {g.name}
                  </Link>
                  {g.pillar && <PillarBadge pillar={g.pillar} />}
                </div>
                <p className="mt-2 line-clamp-3 flex-1 text-[14px] leading-relaxed text-ink-2">{g.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[12.5px] tabular-nums text-ink-3">
                    {g.members} {g.members === 1 ? "member" : "members"} · {g.posts} {g.posts === 1 ? "post" : "posts"}
                  </span>
                  {g.joined ? (
                    <div className="flex items-center gap-2">
                      <Badge tone="success">Joined</Badge>
                      <form action={leaveGroupAction.bind(null, g.id, g.slug)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Leave
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <form action={joinGroupAction.bind(null, g.id, g.slug)}>
                      <Button type="submit" size="sm" variant="secondary">
                        Join
                      </Button>
                    </form>
                  )}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
