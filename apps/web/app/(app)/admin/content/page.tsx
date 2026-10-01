import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/guard";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Badge, Button, Card, CardContent, Input, Label, SectionRule } from "@tycoonhood/ui";
import { setCourseCoverAction, toggleCoursePublishAction } from "../actions";
import { ActionForm } from "../../../../components/admin/action-form";
import { CoverFill } from "../../../../components/art/program-art";

export const metadata: Metadata = { title: "Admin · Content" };
export const dynamic = "force-dynamic";

export default async function AdminContent() {
  await requireAdmin();
  const [courses, posts] = await Promise.all([
    prisma.course.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { enrollments: true } } } }),
    prisma.post.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <main>
      <h1 className="display text-h2">Content</h1>
      <SectionRule label="Programs" className="mb-4 mt-8" />
      <div className="flex flex-col gap-2">
        {courses.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="text-[14px] text-ink-1">
                {c.title} <span className="figures text-[11px] text-ink-3">{c._count.enrollments} enrolled</span>
              </p>
              <span className="flex items-center gap-2">
                <Badge tone={c.status === "PUBLISHED" ? "success" : "neutral"}>{c.status}</Badge>
                <form action={toggleCoursePublishAction.bind(null, c.id)}>
                  <Button size="sm" variant="outline" type="submit">
                    {c.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </Button>
                </form>
              </span>
              <div className="flex w-full flex-col gap-4 border-t border-line pt-3 sm:flex-row sm:items-start">
                <div className="relative aspect-[16/7] w-full shrink-0 overflow-hidden rounded-md bg-bg-2 sm:w-48" aria-hidden>
                  <CoverFill pillar={c.pillar} coverImage={c.coverImage} />
                </div>
                <ActionForm action={setCourseCoverAction.bind(null, c.id)} submit="Save cover" className="min-w-0 flex-1">
                  <Label htmlFor={`cover-${c.id}`}>Cover photo (optional)</Label>
                  <Input
                    id={`cover-${c.id}`}
                    name="coverImage"
                    defaultValue={c.coverImage ?? ""}
                    placeholder="https://… or /covers/warrior.jpg — leave empty for the drawn scene"
                  />
                </ActionForm>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <SectionRule label="Journal" className="mb-4 mt-10" />
      <Link
        href="/admin/content/post/new"
        className="text-[13px] font-semibold text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold"
      >
        + New essay
      </Link>
      <div className="mt-3 flex flex-col gap-2">
        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="text-[14px] text-ink-1">
                {p.title} <span className="figures text-[11px] text-ink-3">/{p.slug}</span>
              </p>
              <span className="flex items-center gap-2">
                <Badge tone={p.publishedAt ? "success" : "neutral"}>{p.publishedAt ? "Published" : "Draft"}</Badge>
                <Link
                  href={`/admin/content/post/${p.id}`}
                  className="text-[13px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold"
                >
                  Edit
                </Link>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
