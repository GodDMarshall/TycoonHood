/**
 * Shapes passed from the Miner's server pages to its client components.
 *
 * Types only. They live here, not in the "use server" actions file (which may
 * export async functions only) and not in a "use client" module (whose
 * non-component exports become client references on the server).
 *
 * Every bigint crosses the server/client boundary as a decimal string.
 */

export interface RigActionState {
  message?: string;
  error?: string;
  /** THC actually paid by this claim, as a decimal string. */
  claimed?: string;
}

export interface WatchState {
  error?: string;
  message?: string;
  startedAt?: string;
  paidThc?: string;
}

export interface MinerData {
  rigLevel: number;
  maxLevel: number;
  ratePerHour: string;
  capacity: string;
  accrued: string;
  lastClaimAt: string;
  /** Server clock at render, so the first client paint matches the server's. */
  now: string;
  totalMined: string;
  balance: string;
  nextUpgradeCost: string | null;
  /** What the next level mines and stores, from MiningService itself. */
  nextRatePerHour: string | null;
  nextCapacity: string | null;
  capacityHours: number;
  stats: { poolRemaining: string; miners: number; totalMined: string };
  openTasks: number;
  tasksCapReached: boolean;
  pendingInvites: number;
}

export interface WatchTaskView {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  youtubeVideoId: string;
  durationSec: number;
  requiredSec: number;
  rewardThc: string;
  rewardXp: number;
  paid: boolean;
  secondsWatched: number;
}
