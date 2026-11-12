"use server";
/**
 * Site & CMS actions. Each re-authorizes with actorWith("admin.content");
 * core writes the audit row for every change.
 */
import { revalidatePath } from "next/cache";
import { cms, ForbiddenError, HOME_SECTIONS, InvalidSettingError, setSetting, type SettingValue } from "@tycoonhood/core";
import { actorWith } from "../../../../lib/guard";
import { isZodError, zodMessage } from "../../../../lib/form-errors";

type State = { ok?: string; error?: string };

function fail(e: unknown): State {
  if (isZodError(e)) return { error: zodMessage(e) };
  if (e instanceof InvalidSettingError || e instanceof ForbiddenError) return { error: e.message };
  throw e;
}

export async function saveHomeAction(_prev: State, fd: FormData): Promise<State> {
  const actor = await actorWith("admin.content");
  const heroLines = String(fd.get("heroLines") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const value: SettingValue<"home"> = {
    heroLines,
    heroLead: String(fd.get("heroLead") ?? ""),
    heroEyebrow: String(fd.get("heroEyebrow") ?? ""),
    sections: Object.fromEntries(HOME_SECTIONS.map((s) => [s, fd.get(`section:${s}`) === "on"])) as SettingValue<"home">["sections"],
  };
  try {
    await setSetting("home", value, actor.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/");
  revalidatePath("/admin/site");
  return { ok: "Homepage saved." };
}

export async function saveContactSettingsAction(_prev: State, fd: FormData): Promise<State> {
  const actor = await actorWith("admin.content");
  try {
    await setSetting("contact", { supportEmail: String(fd.get("supportEmail") ?? "").trim() }, actor.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/contact");
  return { ok: "Contact settings saved." };
}

export async function savePlatformSettingsAction(_prev: State, fd: FormData): Promise<State> {
  const actor = await actorWith("admin.content");
  try {
    await setSetting(
      "platform",
      { signupsOpen: fd.get("signupsOpen") === "on", maintenanceBanner: String(fd.get("maintenanceBanner") ?? "") },
      actor.id
    );
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Platform settings saved." };
}

function testimonialInput(fd: FormData) {
  return {
    name: String(fd.get("name") ?? ""),
    role: String(fd.get("role") ?? ""),
    quote: String(fd.get("quote") ?? ""),
    consentAt: String(fd.get("consentAt") ?? ""),
    published: fd.get("published") === "on",
    sortOrder: Number(fd.get("sortOrder") ?? 0) || 0,
  };
}

export async function saveTestimonialAction(id: string | null, _prev: State, fd: FormData): Promise<State> {
  const actor = await actorWith("admin.content");
  try {
    await cms.saveTestimonial(actor, testimonialInput(fd), id ?? undefined);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/site");
  revalidatePath("/success-stories");
  revalidatePath("/");
  return { ok: id ? "Story saved." : "Story added." };
}

export async function deleteTestimonialAction(id: string): Promise<void> {
  const actor = await actorWith("admin.content");
  await cms.deleteTestimonial(actor, id);
  revalidatePath("/admin/site");
  revalidatePath("/success-stories");
  revalidatePath("/");
}

export async function setContactHandledAction(id: string, handled: boolean): Promise<void> {
  const actor = await actorWith("admin.content");
  await cms.setContactHandled(actor, id, handled);
  revalidatePath("/admin/site");
  revalidatePath("/admin");
}

export async function announceAction(_prev: State, fd: FormData): Promise<State> {
  const actor = await actorWith("admin.content");
  if (fd.get("confirm") !== "on") return { error: "Tick the confirmation box — this cannot be unsent." };
  const role = String(fd.get("role") ?? "");
  try {
    const sent = await cms.announce(actor, {
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? "") || undefined,
      href: String(fd.get("href") ?? "") || undefined,
      role: role ? (role as "MEMBER") : null,
    });
    return { ok: `Sent to ${sent.toLocaleString()} ${sent === 1 ? "member" : "members"}.` };
  } catch (e) {
    return fail(e);
  }
}
