import { mining, watch, referrals } from "@tycoonhood/core";
import { getCurrentUser } from "../lib/auth";
import { MinerLogin } from "../components/miner-login";
import { MinerScreen, type MinerData } from "../components/miner-screen";

export const dynamic = "force-dynamic";

const MAIN_SITE = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000";

export default async function MinerPage() {
  const user = await getCurrentUser();
  if (!user) return <MinerLogin mainSiteUrl={MAIN_SITE} />;

  const [preview, stats, tasks, squad] = await Promise.all([
    mining.preview(user.id),
    mining.stats(),
    watch.listFor(user.id).catch(() => null),
    user.profile?.onboardedAt ? referrals.summary(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  const data: MinerData = {
    rigLevel: preview.rigLevel,
    maxLevel: preview.maxLevel,
    ratePerHour: preview.ratePerHour.toString(),
    capacity: preview.capacity.toString(),
    accrued: preview.accrued.toString(),
    lastClaimAt: preview.lastClaimAt.toISOString(),
    totalMined: preview.totalMined.toString(),
    balance: preview.balance.toString(),
    nextUpgradeCost: preview.nextUpgradeCost?.toString() ?? null,
    displayName: user.profile?.displayName ?? user.name ?? "Miner",
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

  return <MinerScreen data={data} />;
}
