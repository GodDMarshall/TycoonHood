import type { Metadata } from "next";
import { requireAdmin } from "../../../../../../lib/guard";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { savePostAction } from "../../../actions";
import { PostEditor } from "../../../../../../components/admin-post-editor";

export const metadata: Metadata = { title: "Admin · Essay" };
export const dynamic = "force-dynamic";

export default async function PostEditPage({ params }: { params: Promise<{ postId: string }> }) {
  await requireAdmin();
  const { postId } = await params;
  const isNew = postId === "new";
  const post = isNew ? null : await prisma.post.findUnique({ where: { id: postId } });
  if (!isNew && !post) notFound();
  return (
    <main className="max-w-2xl">
      <h1 className="display text-[30px]">{isNew ? "New essay" : "Edit essay"}</h1>
      <PostEditor
        action={savePostAction.bind(null, isNew ? null : postId)}
        initial={post ? { title: post.title, slug: post.slug, excerpt: post.excerpt ?? "", contentMd: post.contentMd, published: !!post.publishedAt } : null}
      />
    </main>
  );
}
