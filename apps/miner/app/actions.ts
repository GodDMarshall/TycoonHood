"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  accounts,
  sessions,
  loginSchema,
  InvalidCredentialsError,
  mining,
  MinerError,
  watch,
  WatchError,
  referrals,
} from "@tycoonhood/core";
import { deviceInfo, getCurrentUser, setSessionCookie, SESSION_COOKIE } from "../lib/auth";
import { cookies } from "next/headers";

export interface MinerFormState {
  error?: string;
}

export async function minerLoginAction(_prev: MinerFormState, formData: FormData): Promise<MinerFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };
  try {
    const user = await accounts.authenticate(parsed.data);
    const { raw } = await sessions.create(user.id, await deviceInfo());
    await setSessionCookie(raw);
  } catch (e) {
    if (e instanceof InvalidCredentialsError) return { error: e.message };
    throw e;
  }
  redirect("/");
}

export async function minerLogoutAction() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (raw) await sessions.destroy(raw);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

// ───────────────────────────────────────────────────────── THE RIG

export interface RigActionState {
  message?: string;
  error?: string;
  claimed?: string;
}

export async function claimAction(): Promise<RigActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  try {
    const r = await mining.claim(user.id);
    revalidatePath("/");
    revalidatePath("/wallet");
    return r.claimed > 0n
      ? { claimed: r.claimed.toString(), message: `+${r.claimed.toLocaleString("en-US")} THC claimed` }
      : { message: "Nothing to claim yet — the rig just started a fresh window." };
  } catch (e) {
    if (e instanceof MinerError) return { error: e.message };
    throw e;
  }
}

export async function upgradeAction(): Promise<RigActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  try {
    const s = await mining.upgrade(user.id);
    revalidatePath("/");
    revalidatePath("/wallet");
    return { message: `Rig upgraded to level ${s.rigLevel}.` };
  } catch (e) {
    if (e instanceof MinerError) return { error: e.message };
    if (e instanceof Error && /insufficient/i.test(e.message)) {
      return { error: "Not enough THC for this upgrade yet. Keep mining." };
    }
    throw e;
  }
}

// ───────────────────────────────────────────────── WATCH-TO-EARN
//
// Three calls, all server-authoritative. The browser cannot shorten the
// clock, inflate the seconds, or pay itself: it can only report, and the
// server decides what the report was worth.

export interface WatchState {
  error?: string;
  message?: string;
  startedAt?: string;
  paidThc?: string;
}

export async function startWatchAction(slug: string): Promise<WatchState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  try {
    const { completion } = await watch.start(user.id, slug);
    return { startedAt: completion.startedAt.toISOString() };
  } catch (e) {
    if (e instanceof WatchError) return { error: e.message };
    throw e;
  }
}

/** Progress ping. Returns nothing useful on purpose — it is a report, not a request. */
export async function heartbeatWatchAction(slug: string, secondsWatched: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  try {
    await watch.heartbeat(user.id, slug, secondsWatched);
  } catch {
    // A dropped heartbeat is not the member's problem; the next one carries
    // the same cumulative figure.
  }
}

export async function settleWatchAction(slug: string): Promise<WatchState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  try {
    const r = await watch.settle(user.id, slug);
    revalidatePath("/tasks");
    revalidatePath("/wallet");
    revalidatePath("/");
    return {
      paidThc: r.rewardThc.toString(),
      message: `+${r.rewardThc.toLocaleString("en-US")} THC · +${r.rewardXp} XP`,
    };
  } catch (e) {
    if (e instanceof WatchError) return { error: e.message };
    throw e;
  }
}

// ───────────────────────────────────────────────────────── SQUAD

export async function refreshSquadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await referrals.codeFor(user.id);
  revalidatePath("/squad");
}
