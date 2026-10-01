import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { community, PAGE_SIZE } from "@tycoonhood/core";
import { requireUser } from "../../../../lib/guard";
import { CommunityFrame } from "../../../../components/community/community-frame";
import { ChatView } from "../../../../components/community/chat-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel } = await params;
  return { title: `#${channel}` };
}

export default async function ChannelPage({ params }: { params: Promise<{ channel: string }> }) {
  const user = await requireUser();
  const { channel: slug } = await params;
  const viewer = { id: user.id, role: user.role };
  const channel = await community.channel(viewer, slug);
  if (!channel) notFound();

  const [channels, messages, pinned, mute] = await Promise.all([
    community.channelsFor(viewer, user.createdAt),
    community.messages(viewer, channel.id, { limit: PAGE_SIZE }),
    community.pinned(viewer, channel.id),
    community.activeMute(user.id),
  ]);

  const staff = user.role === "ADMIN";
  const blocked = channel.archivedAt
    ? "This channel is archived. You can read it, but not post."
    : channel.adminOnly && !staff
      ? "Only staff post here. Discussion happens in General."
      : mute
        ? mute.until
          ? `You can read but not post until ${mute.until.toUTCString().slice(0, 22)} UTC.`
          : "You can read but not post. Contact staff if you think this is a mistake."
        : null;

  return (
    <CommunityFrame channels={channels} active={slug} mode="channel">
      <ChatView
        key={channel.id}
        channel={{
          id: channel.id,
          slug: channel.slug,
          name: channel.name,
          topic: channel.topic,
          kind: channel.kind,
          slowModeSec: channel.slowModeSec,
          course: channel.course,
        }}
        me={{ id: user.id, staff }}
        blocked={blocked}
        initial={messages}
        pinned={pinned}
        hasOlder={messages.length === PAGE_SIZE}
      />
    </CommunityFrame>
  );
}
