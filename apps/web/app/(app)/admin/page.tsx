import type { Metadata } from "next";
import { requireAdmin } from "../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { Card, CardContent, SectionRule, Stat, ThcAmount } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Admin · Overview" };
export const dynamic = "force-dynamic";
const ledger = new LedgerService(prisma);

export default async function AdminOverview() {
  await requireAdmin();
  const [mint, treasury, rewards, miningPool, revenue, circulating, members, orders, enrollments, activeChallenges, miners] =
    await Promise.all([
      ledger.systemAccount("SYSTEM_MINT"),
      ledger.systemAccount("TREASURY"),
      ledger.systemAccount("REWARDS_POOL"),
      ledger.systemAccount("MINING_POOL"),
      ledger.systemAccount("REVENUE"),
      ledger.circulatingSupply(),
      prisma.user.count({ where: { role: "MEMBER" } }),
      prisma.order.groupBy({ by: ["status"], _count: true }),
      prisma.enrollment.count(),
      prisma.challenge.count({ where: { lifecycle: "ACTIVE" } }),
      prisma.minerState.count(),
    ]);
  const orderCounts = Object.fromEntries(orders.map((o) => [o.status, o._count]));

  return (
    <main>
      <h1 className="display text-h2">The house sees everything.</h1>
      <SectionRule label="Economy" className="mb-4 mt-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card variant="gold"><CardContent className="py-4"><Stat label="Provable supply" value={<ThcAmount amount={-mint.balance} size="sm" />} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Treasury" value={<ThcAmount amount={treasury.balance} size="sm" />} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Rewards pool" value={<ThcAmount amount={rewards.balance} size="sm" />} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Mining pool" value={<ThcAmount amount={miningPool.balance} size="sm" />} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Revenue (THC sink)" value={<ThcAmount amount={revenue.balance} size="sm" />} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Circulating (members)" value={<ThcAmount amount={circulating} size="sm" />} /></CardContent></Card>
      </div>
      <SectionRule label="The floor" className="mb-4 mt-10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="py-4"><Stat label="Members" value={members.toLocaleString()} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Enrollments" value={enrollments.toLocaleString()} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Active challenges" value={activeChallenges} /></CardContent></Card>
        <Card><CardContent className="py-4"><Stat label="Miners" value={miners.toLocaleString()} /></CardContent></Card>
      </div>
      <p className="figures mt-6 text-[12px] text-ink-3">
        Orders — pending {orderCounts.PENDING ?? 0} · paid {orderCounts.PAID ?? 0} · fulfilled {orderCounts.FULFILLED ?? 0} · cancelled {orderCounts.CANCELLED ?? 0}
      </p>
    </main>
  );
}
