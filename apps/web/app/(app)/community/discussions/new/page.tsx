import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { discussions, POST_BODY_MAX, POST_TITLE_MAX, POST_TITLE_MIN } from "@tycoonhood/core";
import { Notice } from "@tycoonhood/ui";
import { requireUser } from "../../../../../lib/guard";
import { Page, PageHeader, Panel } from "../../../../../components/app/page";
import { HouseRules } from "../../../../../components/community/community-frame";
import { PostForm } from "../_components/post-form";
import { createPostAction } from "../actions";

export const metadata: Metadata = { title: "New discussion" };
export const dynamic = "force-dynamic";

export default async function NewDiscussionPage({ searchParams }: { searchParams: Promise<{ c?: string; group?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const viewer = { id: user.id, role: user.role };
  const limits = { titleMin: POST_TITLE_MIN, titleMax: POST_TITLE_MAX, bodyMax: POST_BODY_MAX };

  const group = sp.group ? await discussions.group(viewer, sp.group) : null;
  if (sp.group && !group) notFound();
  const categories = group ? [] : await discussions.categories();
  const preset = categories.find((c) => c.slug === sp.c);

  return (
    <Page width="narrow">
      <p className="mb-4 text-[13.5px]">
        <Link href={group ? `/community/groups/${group.slug}` : "/community/discussions"} className="text-ink-3 hover:text-ink-1">
          ← {group ? group.name : "Discussions"}
        </Link>
      </p>
      <PageHeader title={group ? `Post in ${group.name}` : "New discussion"} description="Plain text. Links become clickable. You can edit for 30 minutes after posting." />
      {group && !group.joined && !group.archived ? (
        <Notice tone="info" title="Join the group to post in it.">
          Anyone can read a group. Posting is for its members.{" "}
          <Link href={`/community/groups/${group.slug}`} className="text-gold underline">
            Go to the group
          </Link>
        </Notice>
      ) : (
        <Panel className="p-5">
          <PostForm
            action={createPostAction}
            categories={group ? undefined : categories.map((c) => ({ id: c.id, name: c.name }))}
            groupId={group?.id}
            defaultCategoryId={preset?.id}
            submit="Post"
            limits={limits}
          />
        </Panel>
      )}
      <div className="mt-8">
        <HouseRules />
      </div>
    </Page>
  );
}
