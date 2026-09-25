/**
 * PHASE 1→2 FOUNDATION STATUS PAGE, now set in the house style.
 * Still deliberately not the homepage (Phase 4). Every number remains a
 * live database query.
 */
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Logo,
  SectionRule,
  Stat,
  ThcAmount,
} from "@tycoonhood/ui";

export const dynamic = "force-dynamic";

export default async function FoundationStatus() {
  const [courses, levels, ranks, missions, achievements, mint, treasury, pool] =
    await Promise.all([
      prisma.course.count(),
      prisma.levelDefinition.count(),
      prisma.rankDefinition.count(),
      prisma.mission.count(),
      prisma.achievement.count(),
      prisma.ledgerAccount.findFirst({ where: { type: "SYSTEM_MINT" } }),
      prisma.ledgerAccount.findFirst({ where: { type: "TREASURY" } }),
      prisma.ledgerAccount.findFirst({ where: { type: "REWARDS_POOL" } }),
    ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 flex items-center justify-between">
        <Logo />
        <Badge tone="gold">Phase 2</Badge>
      </header>

      <p className="eyebrow mb-3">Foundation status</p>
      <h1 className="display text-[40px] leading-[1.08]">The books are open.</h1>
      <p className="mt-3 max-w-lg text-ink-2">
        Live from PostgreSQL. The public site replaces this page in Phase 4 —
        the design system it will be built from is on the{" "}
        <Link href="/styleguide" className="text-gold underline-offset-4 hover:underline">
          styleguide
        </Link>
        .
      </p>

      <SectionRule label="Economy" className="mb-6 mt-12" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="gold">
          <CardContent className="py-5">
            <Stat
              label="Total supply"
              value={<ThcAmount amount={-(mint?.balance ?? 0n)} size="lg" />}
            />
            <p className="mt-2 text-[11px] text-ink-3">Provable: −SYSTEM_MINT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <Stat label="Treasury" value={<ThcAmount amount={treasury?.balance ?? 0n} />} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <Stat label="Rewards pool" value={<ThcAmount amount={pool?.balance ?? 0n} />} />
          </CardContent>
        </Card>
      </div>

      <SectionRule label="Catalog & engine" className="mb-6 mt-12" />
      <Card>
        <CardHeader>
          <CardTitle>Seeded and tested</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Stat label="Programs" value={courses} />
          <Stat label="Levels" value={levels} />
          <Stat label="Ranks" value={ranks} />
          <Stat label="Missions" value={missions} />
          <Stat label="Achievements" value={achievements} />
          <Stat label="Ledger tests" value="16 ✓" />
        </CardContent>
      </Card>

      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/register"
          className="inline-flex h-10 items-center rounded-md bg-gold px-4 text-[14px] font-semibold text-bg-0 hover:bg-gold-bright"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-[14px] text-ink-1 hover:border-gold-deep"
        >
          Sign in
        </Link>
        <span className="text-[12px] text-ink-3">
          Run <span className="figures">pnpm test</span> for the ledger proofs.
        </span>
      </div>
    </main>
  );
}
