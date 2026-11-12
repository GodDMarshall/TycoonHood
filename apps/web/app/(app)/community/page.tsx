import type { Metadata } from "next";
import { community } from "@tycoonhood/core";
import { requireUser } from "../../../lib/guard";
import { CommunityFrame } from "../../../components/community/community-frame";

export const metadata: Metadata = { title: "Community" };
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const user = await requireUser();
  const channels = await community.channelsFor({ id: user.id, role: user.role }, user.createdAt);
  return <CommunityFrame channels={channels} mode="list" />;
}
