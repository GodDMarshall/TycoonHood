/**
 * THE RIG — the Miner's home, ported from apps/miner/app/page.tsx.
 *
 * Every figure on this screen is read from @tycoonhood/core on this request:
 * the rig's state and accrual (mining.preview), the next level's output
 * (mining.ratePerHour / mining.capacity), the open books (mining.stats), and
 * the two nudges (watch.listFor, referrals.summary). Nothing is sample data.
 */
import type { Metadata } from "next";
import { mining, watch, referrals } from "@tycoonhood/core";
import { MINING } from "@tycoonhood/config";
import { requireUser } from "../../../lib/guard";
import { PageHeader } from "../../../components/app/page";
import { RigConsole } from "../../../components/mining/rig-console";
import type { MinerData } from "../../../components/mining/types";

export const metadata: Metadata = { title: "Mining" };
export const dynamic = "force-dynamic";

export default async function MiningPage() {
  const user = await requireUser();
  const now = new Date();

  const [preview, stats, tasks, squad] = await Promise.all([
    mining.preview(user.id, now),
    mining.stats(),
    watch.listFor(user.id).catch(() => null),
    referrals.summary(user.id).catch(() => null),
  ]);

  const next = preview.rigLevel < preview.maxLevel ? preview.rigLevel + 1 : null;

  const data: MinerData = {
    rigLevel: preview.rigLevel,
    maxLevel: preview.maxLevel,
    ratePerHour: preview.ratePerHour.toString(),
    capacity: preview.capacity.toString(),
    accrued: preview.accrued.toString(),
    lastClaimAt: preview.lastClaimAt.toISOString(),
    now: now.toISOString(),
    totalMined: preview.totalMined.toString(),
    balance: preview.balance.toString(),
    nextUpgradeCost: preview.nextUpgradeCost?.toString() ?? null,
    nextRatePerHour: next == null ? null : mining.ratePerHour(next).toString(),
    nextCapacity: next == null ? null : mining.capacity(next).toString(),
    capacityHours: MINING.capacityHours,
    stats: {
      poolRemaining: stats.poolRemaining.toString(),
      miners: stats.miners,
      totalMined: stats.totalMined.toString(),
    },
    // Two nudges, only when there is something real behind them.
    openTasks: tasks ? tasks.tasks.filter((t) => !t.paid).length : 0,
    tasksCapReached: tasks?.capReached ?? false,
    pendingInvites: squad?.pending ?? 0,
  };

  return (
    <>
      <PageHeader
        title="The Rig"
        description="Your rig mines THC from a finite pool while you are away. Storage holds a fixed number of hours; claim before it fills, upgrade to mine faster."
      />
      <RigConsole data={data} />
    </>
  );
}
