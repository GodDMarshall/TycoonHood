import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Badge, PILLAR_LABEL } from "@tycoonhood/ui";
import { requirePermission } from "../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../components/app/page";
import { ActionForm } from "../../../../components/admin/action-form";
import { CourseFields, STATUS_TONE } from "../../../../components/learning/admin/course-fields";
import { createCourseAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Courses" };
export const dynamic = "force-dynamic";

export default async function AdminCourses() {
  await requirePermission("courses.author");
  const [courses, instructors] = await Promise.all([
    prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        pillar: true,
        status: true,
        instructor: { select: { name: true } },
        _count: { select: { enrollments: true, modules: true, certificates: true } },
        modules: { select: { _count: { select: { lessons: true } } } },
      },
    }),
    prisma.instructor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="programs">
        <SectionTitle id="programs">Programs</SectionTitle>
        <Panel as="div" className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-b border-line text-[12.5px] text-ink-3">
              <tr>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Modules</th>
                <th className="px-4 py-3 text-right font-medium">Lessons</th>
                <th className="px-4 py-3 text-right font-medium">Enrolments</th>
                <th className="px-4 py-3 text-right font-medium">Certificates</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/courses/${c.id}`} className="font-medium text-ink-1 hover:text-gold-bright">
                      {c.title}
                    </Link>
                    <span className="block text-[12.5px] text-ink-3">
                      {PILLAR_LABEL[c.pillar]} · /{c.slug}
                      {c.instructor ? ` · ${c.instructor.name}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status.toLowerCase()}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c._count.modules}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.modules.reduce((n, m) => n + m._count.lessons, 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c._count.enrollments}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c._count.certificates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>

      <section aria-labelledby="new">
        <SectionTitle id="new">New program</SectionTitle>
        <Panel className="p-5">
          <p className="mb-4 text-[13.5px] text-ink-3">New programs start as drafts. Members never see a draft; publish it when it has its lessons.</p>
          <ActionForm action={createCourseAction} submit="Create draft">
            <CourseFields instructors={instructors} />
          </ActionForm>
        </Panel>
      </section>
    </div>
  );
}
