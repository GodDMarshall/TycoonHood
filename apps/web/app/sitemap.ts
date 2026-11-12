import type { MetadataRoute } from "next";
import { prisma } from "@tycoonhood/db";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Built on request, never at build time: the build must not need a database
// (a preview build runs before the first production deploy has created the
// tables), and a new programme or post should appear without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programs, posts] = await Promise.all([
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ where: { publishedAt: { not: null } }, select: { slug: true, updatedAt: true } }),
  ]);
  const statics = ["", "/about", "/learning", "/programs", "/earn", "/earn/terms", "/marketplace", "/connect", "/challenges", "/thc", "/blog", "/success-stories", "/contact", "/faq", "/terms", "/privacy", "/refund-policy", "/status"];
  return [
    ...statics.map((p) => ({ url: `${BASE}${p}`, lastModified: new Date() })),
    ...programs.map((c) => ({ url: `${BASE}/programs/${c.slug}`, lastModified: c.updatedAt })),
    ...posts.map((p) => ({ url: `${BASE}/blog/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
