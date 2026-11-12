import type { Metadata } from "next";
import Link from "next/link";
import { prisma, type UserRole } from "@tycoonhood/db";
import { can, ROLE_LABEL } from "@tycoonhood/core";
import { Avatar, Icon, Input, Label } from "@tycoonhood/ui";
import { requirePermission } from "../../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../../components/app/page";
import { ActionForm } from "../../../../../components/admin/action-form";
import { InlineAction } from "../../../../../components/learning/admin/inline-action";
import { InstructorFields } from "../../../../../components/learning/admin/instructor-fields";
import { createInstructorAction, deleteInstructorAction, linkInstructorAction, unlinkInstructorAction, updateInstructorAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Instructors" };
export const dynamic = "force-dynamic";

type LinkedAccount = {
  id: string;
  email: string;
  emailVerified: Date | null;
  role: UserRole;
  profile: { username: string; displayName: string } | null;
};

/**
 * Which member account teaches as this profile. That account, and only it,
 * edits the profile's programs (DR-34), so the link is set here by hand and
 * never guessed. The row says the account's role and whether its email is
 * verified (a link needs it), so a wrong account stands out. An account's
 * email is shown only to those who manage members.
 */
function teachingAccount(i: { id: string; name: string }, account: LinkedAccount | null, members: boolean) {
  if (!account) {
    return (
      <div className="mb-4 flex flex-col gap-3 rounded-md border border-line px-4 py-3">
        <p className="text-[13.5px] text-ink-2">Not linked to a member account, so no instructor can edit these programs; only an administrator can.</p>
        <ActionForm action={linkInstructorAction.bind(null, i.id)} submit="Link account">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`link-${i.id}`}>The account that teaches as {i.name}: its email or username</Label>
            <Input id={`link-${i.id}`} name="member" required maxLength={254} autoComplete="off" placeholder="name@example.com or @username" />
          </div>
        </ActionForm>
      </div>
    );
  }
  const name = account.profile ? `${account.profile.displayName} (@${account.profile.username})` : "a member with no public profile yet";
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-md border border-line px-4 py-3 text-[13.5px]">
      <div className="flex flex-wrap items-start gap-3">
        <p className="min-w-0 flex-1 text-ink-2">
          Linked to <span className="font-medium text-ink-1">{name}</span>
          {members && <span className="text-ink-3"> · {account.email}</span>}
          <span className="text-ink-3">{` · ${ROLE_LABEL[account.role]} · ${account.emailVerified ? "email verified" : "email not verified"}`}</span>. This
          account edits the programs {i.name} teaches.
        </p>
        <InlineAction
          action={unlinkInstructorAction.bind(null, i.id)}
          label="Unlink"
          variant="ghost"
          confirm={`Unlink ${i.name} from this account? It will no longer be able to edit these programs.`}
          showOk
        />
      </div>
      {!can(account, "courses.author") && (
        <p className="text-[12.5px] text-warning">
          Their role is {ROLE_LABEL[account.role]}, so they cannot edit these programs until an administrator makes them an Instructor
          {members && (
            <>
              {" "}
              on{" "}
              <Link href={`/admin/members/${account.id}`} className="underline underline-offset-4">
                their member page
              </Link>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}

export default async function AdminInstructors() {
  const user = await requirePermission("courses.manage");
  const members = can(user, "admin.users");
  const instructors = await prisma.instructor.findMany({
    orderBy: { name: "asc" },
    include: {
      courses: { select: { title: true }, orderBy: { sortOrder: "asc" } },
      user: { select: { id: true, email: true, emailVerified: true, role: true, profile: { select: { username: true, displayName: true } } } },
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="list">
        <SectionTitle id="list">Instructors</SectionTitle>
        {instructors.length === 0 ? (
          <Panel className="p-6 text-[14.5px] text-ink-2">No instructors yet.</Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {instructors.map(({ user: account, ...i }) => (
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
                {teachingAccount(i, account, members)}
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
