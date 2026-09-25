"use server";
/**
 * MISSION AUTHORING (spec §17, §31)
 *
 * The rules engine reads `criteria` as data, so a new way to earn should be a
 * row — not a deploy. This is where that row gets written. Every criteria blob
 * is validated by the same parser the engine uses, so an admin cannot save a
 * rule the engine would silently skip.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { parseCriteria, InvalidCriteriaError, DOMAIN_EVENTS } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export interface MissionFormState { message?: string; error?: string }

const SLUG = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

/** Build the criteria object from the form's discrete fields. */
function criteriaFromForm(fd: FormData) {
  const raw: Record<string, unknown> = { event: String(fd.get("event") ?? "") };
  const count = String(fd.get("count") ?? "").trim();
  const within = String(fd.get("within") ?? "").trim();
  const days = String(fd.get("days") ?? "").trim();
  const minScore = String(fd.get("minScore") ?? "").trim();
  const pillar = String(fd.get("pillar") ?? "").trim();
  if (count) raw.count = Number(count);
  if (within) raw.within = within;
  if (days) raw.days = Number(days);
  if (minScore) raw.minScore = Number(minScore);
  if (pillar) raw.scope = { pillar };
  return raw;
}

export async function saveMissionAction(
  missionId: string | null,
  _prev: MissionFormState,
  fd: FormData
): Promise<MissionFormState> {
  await requireAdmin();

  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const xpReward = Number(String(fd.get("xpReward") ?? "0"));
  const thcRaw = String(fd.get("thcReward") ?? "0").replace(/[, _]/g, "");
  const repeatable = fd.get("repeatable") === "on";
  const cooldownRaw = String(fd.get("cooldownHours") ?? "").trim();
  const active = fd.get("active") === "on";

  if (!SLUG.test(slug)) {
    return { error: "Slug must be lowercase letters, numbers and dashes (3-50 chars)." };
  }
  if (!name) return { error: "Give the mission a name members will read." };
  if (!Number.isInteger(xpReward) || xpReward < 0) return { error: "XP must be a whole number, 0 or more." };

  let thcReward: bigint;
  try {
    thcReward = BigInt(thcRaw || "0");
  } catch {
    return { error: "THC reward must be a whole number." };
  }
  if (thcReward < 0n) return { error: "THC reward cannot be negative." };
  if (xpReward === 0 && thcReward === 0n) return { error: "A mission that pays nothing is not a mission." };

  // The engine's own parser is the gate. If it cannot read the rule, it never
  // gets saved — no silently-skipped missions like the seeded ones were.
  let criteria;
  try {
    criteria = parseCriteria(criteriaFromForm(fd));
  } catch (e) {
    if (e instanceof InvalidCriteriaError) return { error: `Rule is not valid: ${e.message}` };
    throw e;
  }

  const cooldownHours = repeatable && cooldownRaw ? Number(cooldownRaw) : null;
  if (cooldownHours !== null && (!Number.isInteger(cooldownHours) || cooldownHours < 1)) {
    return { error: "Cooldown must be a whole number of hours." };
  }

  const data = {
    slug,
    name,
    description,
    criteria: criteria as object,
    xpReward,
    thcReward,
    repeatable,
    cooldownHours,
    active,
  };

  try {
    if (missionId) {
      await prisma.mission.update({ where: { id: missionId }, data });
    } else {
      await prisma.mission.create({ data });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) return { error: `A mission with slug "${slug}" already exists.` };
    throw e;
  }

  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");
  return { message: missionId ? `Saved "${name}".` : `Created "${name}". It is live for every member now.` };
}

export async function toggleMissionAction(missionId: string) {
  await requireAdmin();
  const m = await prisma.mission.findUniqueOrThrow({ where: { id: missionId } });
  await prisma.mission.update({ where: { id: missionId }, data: { active: !m.active } });
  revalidatePath("/admin/missions");
}

/** The vocabulary the form offers — kept in one place so it cannot drift. */
export async function missionEventOptions(): Promise<readonly string[]> {
  return DOMAIN_EVENTS;
}
