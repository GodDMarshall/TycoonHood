import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Avatar, Icon } from "@tycoonhood/ui";
import { requirePermission } from "../../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../../components/app/page";
import { ActionForm } from "../../../../../components/admin/action-form";
import { InlineAction } from "../../../../../components/learning/admin/inline-action";
import { InstructorFields } from "../../../../../components/learning/admin/instructor-fields";
import { createInstructorAction, deleteInstructorAction, updateInstructorAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Instructors" };
export const dynamic = "force-dynamic";

export default async function AdminInstructors() {
  await requirePermission("courses.author");
  const instructors = await prisma.instructor.findMany({
    orderBy: { name: "asc" },
    include: { courses: { select: { title: true }, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="list">
        <SectionTitle id="list">Instructors</SectionTitle>
        {instructors.length === 0 ? (
          <Panel className="p-6 text-[14.5px] text-ink-2">No instructors yet.</Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {instructors.map((i) => (
              <Panel key={i.id} className="p-5">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <Avatar name={i.name} src={i.avatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{i.name}</p>
                    <p className="text-[12.5px] text-ink-3">{i.courses.length ? i.courses.map((c) => c.title).join(" · ") : "No programs"}</p>
                  </div>
                  <Link href={`/instructors/${i.slug}`} className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink-1">
                    Public page <Icon name="arrow-up-right" size={12} />
                  </Link>
                  <InlineAction
                    action={deleteInstructorAction.bind(null, i.id)}
                    label={<Icon name="trash" size={14} />}
                    variant="ghost"
                    ariaLabel={`Delete ${i.name}`}
                    confirm={`Delete ${i.name}? Their programs keep running without an instructor.`}
                  />
                </div>
                <details>
                  <summary className="cursor-pointer text-[13.5px] text-ink-2 hover:text-ink-1">Edit</summary>
                  <div className="pt-3">
                    <ActionForm action={updateInstructorAction.bind(null, i.id)} submit="Save">
                      <InstructorFields i={i} />
                    </ActionForm>
                  </div>
                </details>
              </Panel>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="new">
        <SectionTitle id="new">Add an instructor</SectionTitle>
        <Panel className="p-5">
          <ActionForm action={createInstructorAction} submit="Add instructor">
            <InstructorFields />
          </ActionForm>
        </Panel>
      </section>
    </div>
  );
}
