"use server";
/** Member administration. Every action re-authorizes (actorWith) and core audits every write. */
import { revalidatePath } from "next/cache";
import { memberAdmin, MemberAdminError, ForbiddenError, ROLES } from "@tycoonhood/core";
import type { UserRole } from "@tycoonhood/db";
import { actorWith } from "../../../../lib/guard";

type State = { ok?: string; error?: string };

export async function changeRoleAction(targetId: string, _prev: State, fd: FormData): Promise<State> {
  const actor = await actorWith("admin.users");
  const role = String(fd.get("role") ?? "") as UserRole;
  if (!(ROLES as readonly string[]).includes(role)) return { error: "Choose a role." };
  try {
    await memberAdmin.changeRole(actor, targetId, role);
  } catch (e) {
    if (e instanceof MemberAdminError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/admin/members/${targetId}`);
  revalidatePath("/admin/members");
  return { ok: "Role updated." };
}

export async function setSuspendedAction(targetId: string, suspended: boolean): Promise<void> {
  const actor = await actorWith("admin.users");
  await memberAdmin.setSuspended(actor, targetId, suspended);
  revalidatePath(`/admin/members/${targetId}`);
  revalidatePath("/admin/members");
}

/** Drop a member's waiting email change; its link stops working. Audited as done by this staff member. */
export async function cancelEmailChangeAction(targetId: string): Promise<void> {
  const actor = await actorWith("admin.users");
  await memberAdmin.cancelEmailChange(actor, targetId);
  revalidatePath(`/admin/members/${targetId}`);
}
