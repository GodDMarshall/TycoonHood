"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { challenges, ChallengeError, events, MissionCooldownError } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";

export interface ChallengeActionState { message?: string; error?: string }

export async function joinChallengeAction(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await challenges.join(user.id, slug);
  revalidatePath("/challenges");
}

export async function withdrawChallengeAction(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await challenges.withdraw(user.id, slug);
  revalidatePath("/challenges");
}

export async function checkInChallengeAction(slug: string): Promise<ChallengeActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  try {
    const r = await challenges.checkIn(user.id, slug);
    revalidatePath("/challenges");
    if (r.completed) return { message: "Challenge complete — reward posted to your ledger." };
    if (r.alreadyToday) return { message: `Already counted today. Run: ${r.run}/${r.required}.` };
    return { message: `Day ${r.run} of ${r.required} recorded.` };
  } catch (e) {
    if (e instanceof ChallengeError) return { error: e.message };
    throw e;
  }
}

export async function dailyCheckInAction(): Promise<ChallengeActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Emit the event and let the rules engine decide what today is worth — the
  // reward is no longer hard-coded into this button (spec §17).
  const r = await events.emitOrThrow({ type: "DAILY_ACTIVE", userId: user.id }).catch((e: unknown) => {
    if (e instanceof MissionCooldownError) return null;
    throw e;
  });
  revalidatePath("/dashboard");
  revalidatePath("/challenges");
  if (!r) return { error: "Already counted for this window." };
  const earned = [...r.missions, ...r.achievements];
  return {
    message: earned.length
      ? `Checked in. Completed: ${earned.join(", ")}.`
      : "Already counted for today.",
  };
}

export async function submitEvidenceAction(
  slug: string,
  _prev: ChallengeActionState,
  fd: FormData
): Promise<ChallengeActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  try {
    const r = await challenges.submit(user.id, slug, {
      text: String(fd.get("text") ?? ""),
      url: String(fd.get("url") ?? "") || undefined,
    });
    revalidatePath("/challenges");
    return { message: `Submitted for review — ${r.approved}/${r.required} approved so far.` };
  } catch (e) {
    if (e instanceof ChallengeError) return { error: e.message };
    throw e;
  }
}
