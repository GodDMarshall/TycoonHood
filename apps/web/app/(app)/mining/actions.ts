"use server";
/**
 * THE MINER's server actions, ported from apps/miner/app/actions.ts.
 *
 * Same services, same rules: accrual, claims, upgrades and watch payouts are
 * all decided by @tycoonhood/core. The browser reports; the server decides.
 * Only async functions are exported from this file — the state shapes live in
 * components/mining/types.ts.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mining, MinerError, watch, WatchError, referrals } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import type { RigActionState, WatchState } from "../../../components/mining/types";

function revalidateMiner() {
  revalidatePath("/mining");
  revalidatePath("/mining/ranks");
  revalidatePath("/wallet");
  revalidatePath("/today");
}

// ───────────────────────────────────────────────────────── THE RIG

export async function claimAction(): Promise<RigActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  try {
    const r = await mining.claim(user.id);
    revalidateMiner();
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
  if (!user) redirect("/login");
  try {
    const s = await mining.upgrade(user.id);
    revalidateMiner();
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

export async function startWatchAction(slug: string): Promise<WatchState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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
  if (!user) redirect("/login");
  try {
    const r = await watch.settle(user.id, slug);
    revalidatePath("/mining/tasks");
    revalidateMiner();
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
  revalidatePath("/mining/squad");
}
