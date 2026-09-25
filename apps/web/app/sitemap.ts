import type { MetadataRoute } from "next";
import { prisma } from "@tycoonhood/db";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programs, posts] = await Promise.all([
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ where: { publishedAt: { not: null } }, select: { slug: true, updatedAt: true } }),
  ]);
  const statics = ["", "/about", "/programs", "/challenges", "/thc", "/marketplace", "/roadmap", "/blog", "/faq", "/status"];
  return [
    ...statics.map((p) => ({ url: `${BASE}${p}`, lastModified: new Date() })),
    ...programs.map((c) => ({ url: `${BASE}/programs/${c.slug}`, lastModified: c.updatedAt })),
    ...posts.map((p) => ({ url: `${BASE}/blog/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
