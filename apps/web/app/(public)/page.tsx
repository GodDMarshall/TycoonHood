/**
 * HOMEPAGE — the walk through the house.
 *
 *   01 Enter       the HQ: the whole ecosystem, visible at once
 *   —  Open books  live figures from the ledger (the signature band, spec §6)
 *   02 Understand  the philosophy: wealth is an outcome of capability
 *   03 Explore     six rooms, each with a real count and a real door
 *   04 Build       the four programs, each in its own atmosphere
 *   05 Execute     missions, stated with their objective and reward
 *   06 Grow        the ascent: five ranks on public thresholds
 *   07 Treasury    one quadrillion, minted once
 *   08 Become      the seat is free
 *
 * Every figure on this page is a query. Nothing is typed in.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { xpRequiredForLevel } from "@tycoonhood/config";
import { CoinMark, Icon, PillarBadge, ThcAmount, buttonStyles, cn, type IconName } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { HQStage } from "../../components/hq/hq-stage";
import { HQDrawing } from "../../components/hq/hq-drawing";
import { PillarArt } from "../../components/pillar-art";

export const metadata: Metadata = {
  title: { absolute: "Tycoonhood — build yourself, the rest compounds" },
  description:
    "A self-mastery academy with an honest internal economy: four programs, missions that pay on verified work, five public ranks and a fixed-supply ledger anyone can audit. Free to enter.",
  alternates: { canonical: "/" },
};
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);
const fmt = (n: number | bigint) => n.toLocaleString("en-US");

export default async function HomePage() {
  const user = await getCurrentUser();
  const member = !!user?.profile?.onboardedAt;

  const [mint, members, missionsPaid, courses, ranks, circulating, missions, openChallenges, liveItems, firstMission] =
    await Promise.all([
      prisma.ledgerAccount.findFirst({ where: { type: "SYSTEM_MINT" } }),
      prisma.user.count(),
      prisma.missionCompletion.count(),
      prisma.course.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        include: { modules: { select: { _count: { select: { lessons: true } } } } },
      }),
      prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
      ledger.circulatingSupply(),
      prisma.mission.findMany({ where: { active: true }, orderBy: [{ repeatable: "desc" }, { xpReward: "desc" }], take: 4 }),
      prisma.challenge.count({ where: { lifecycle: { in: ["UPCOMING", "ACTIVE"] } } }),
      prisma.product.count({ where: { active: true } }),
      prisma.mission.findFirst({ where: { slug: "complete-onboarding", active: true } }),
    ]);

  const supply = -(mint?.balance ?? 0n);
  const lessons = courses.reduce((n, c) => n + c.modules.reduce((m, mod) => m + mod._count.lessons, 0), 0);

  const rooms: { icon: IconName; name: string; note: string; fact: string; href: string }[] = [
    {
      icon: "command",
      name: "Command Center",
      note: "Your seat: today's mission, your streak, your rank and your wallet in one place.",
      fact: "Daily check-in pays every day",
      href: member ? "/dashboard" : "/register",
    },
    {
      icon: "academy",
      name: "Academy",
      note: "Structured programs — modules, lessons, quizzes and certificates with public serials.",
      fact: `${courses.length} programs · ${lessons} lessons`,
      href: member ? "/academy" : "/programs",
    },
    {
      icon: "arena",
      name: "Arena",
      note: "Challenges with real completion criteria, evidence review and real failure states.",
      fact: openChallenges ? `${openChallenges} open or upcoming` : "Next season being set",
      href: "/challenges",
    },
    {
      icon: "vault",
      name: "Vault",
      note: "Gear and the digital library, bought with THC you earned — priced in months of work.",
      fact: liveItems ? `${liveItems} items live` : "Stocking — nothing listed yet",
      href: "/marketplace",
    },
    {
      icon: "treasury",
      name: "Treasury",
      note: "The economy with the books open: supply, pools and every movement, double-entry.",
      fact: "Supply fixed at genesis",
      href: "/thc",
    },
    {
      icon: "network",
      name: "Network",
      note: "Members ranked in the open. Link Discord and your rank follows you there as a role.",
      fact: `${fmt(members)} ${members === 1 ? "member" : "members"}`,
      href: member ? "/leaderboard" : "/register",
    },
  ];

  const ladder = ["yourself", "your mind", "your business", "your wealth", "your network", "your legacy"];

  return (
    <main>
      {/* ─── 01 ENTER ───────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate flex flex-col overflow-hidden border-b border-line lg:block lg:min-h-[max(720px,calc(100svh-4rem))]"
      >
        <div className="grid-plane pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-10%] top-[20%] -z-10 hidden size-[900px] rounded-full bg-[radial-gradient(closest-side,rgb(207_169_94/0.10),transparent)] lg:block"
        />
        <div className="lg:absolute lg:inset-0">
          <div className="mx-auto h-full max-w-[88rem]">
            <HQStage poster={<HQDrawing className="h-full w-full" />} member={member} className="order-2 px-[var(--gutter)] pb-10 lg:px-0 lg:pb-0" />
          </div>
        </div>
        {/* Scrim so the headline always reads over the scene. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-[linear-gradient(90deg,var(--color-bg-0)_30%,transparent)] lg:block"
        />
        <div className="pointer-events-none relative mx-auto flex max-w-[88rem] flex-col px-[var(--gutter)] pb-12 pt-14 max-lg:-order-1 md:pt-20 lg:min-h-[max(720px,calc(100svh-4rem))] lg:justify-center lg:pb-24">
          <div className="pointer-events-auto max-w-[44rem] animate-rise">
            <p className="mb-7 flex items-center gap-3">
              <span className="index">01 — Enter</span>
              <span className="h-px w-8 bg-line-strong" aria-hidden />
              <span className="eyebrow">Tycoonhood HQ</span>
            </p>
            <h1 id="hero-title" className="display text-hero">
              Build yourself.
              <br />
              <span className="accent">The rest compounds.</span>
            </h1>
            <p className="mt-8 max-w-[34rem] text-lead text-ink-2">
              A self-mastery academy with an honest economy. Four programs. Missions that pay the moment the work is
              verified. Five ranks on public thresholds. One ledger, open to anyone.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {member ? (
                <>
                  <Link href="/dashboard" className={buttonStyles({ size: "lg" })}>
                    Open your Command Center
                    <Icon name="arrow-right" size={16} className="transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                  <Link href="/academy" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    Continue learning
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className={buttonStyles({ size: "lg" })}>
                    Enter Tycoonhood
                    <Icon name="arrow-right" size={16} className="transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                  <Link href="#explore" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    Tour the HQ
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-[13px] text-ink-3">Free to enter. Hard to fake. Nothing here is for sale except effort.</p>
          </div>
        </div>
      </section>

      {/* ─── THE OPEN BOOKS — live from the ledger ─────────────────── */}
      <section aria-label="The open books" className="border-b border-line bg-bg-1">
        <div className="mx-auto grid max-w-[88rem] grid-cols-3 px-[var(--gutter)] lg:grid-cols-4">
          <Figure wide label="Total supply · fixed" value={fmt(supply)} note="Minted once, at genesis" />
          <Figure label="THC in member hands" value={fmt(circulating)} note="Earned, never bought" />
          <Figure label="Members" value={fmt(members)} note={members ? "Counted, not estimated" : "The first seat is open"} />
          <Figure
            label="Missions paid"
            value={missionsPaid ? fmt(missionsPaid) : "—"}
            note={missionsPaid ? "Each one a ledger entry" : "The first is two minutes away"}
          />
        </div>
        <div className="mx-auto max-w-[88rem] border-t border-line px-[var(--gutter)] py-3.5">
          <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Live from the double-entry ledger — every figure above is a database fact.
            <Link href="/status" className="text-gold underline-offset-4 hover:underline">
              See all the books
            </Link>
          </p>
        </div>
      </section>

      {/* ─── 02 UNDERSTAND ─────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[88rem] gap-16 px-[var(--gutter)] py-28 lg:grid-cols-[1.1fr_1fr] lg:py-40">
        <div data-reveal>
          <p className="mb-6 flex items-center gap-3">
            <span className="index">02 — Understand</span>
          </p>
          <h2 className="display max-w-[14ch] text-display">
            Wealth is an outcome, <span className="accent">not an aesthetic.</span>
          </h2>
          <p className="mt-8 max-w-[52ch] text-lead text-ink-2">
            No cars, no watches, no highlight reels. Tycoonhood trains the capabilities that wealth comes from —
            discipline, knowledge, execution — and keeps an honest record of the work.
          </p>
          <dl className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              ["Capability first", "Body, business, capital and mind — trained in structured programs, not a feed."],
              ["Value, then wealth", "Businesses built, capital managed. The outcome follows the work."],
              ["Status in public", "Ranks come from verified work, on thresholds anyone can read."],
            ].map(([t, b]) => (
              <div key={t} className="border-t border-line-strong pt-4">
                <dt className="text-[15px] font-semibold text-ink-1">{t}</dt>
                <dd className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div data-reveal className="lg:pt-24">
          <ol className="ladder border-t border-line">
            {ladder.map((w, i) => (
              <li
                key={w}
                className="group flex items-baseline gap-5 border-b border-line py-4 text-ink-2 md:py-5"
              >
                <span className="figures text-[12px] text-ink-3 group-hover:text-gold">{String(i + 1).padStart(2, "0")}</span>
                <span className="display text-[clamp(1.6rem,1.1rem+1.8vw,2.6rem)] leading-none text-current">
                  Build <span className="accent text-current group-hover:text-gold-bright">{w}.</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── 03 EXPLORE ────────────────────────────────────────────── */}
      <section id="explore" className="scroll-mt-20 border-y border-line bg-bg-1/50">
        <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-28">
          <div data-reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="index mb-6">03 — Explore</p>
              <h2 className="display max-w-[16ch] text-h1">
                Six rooms. <span className="accent">One building.</span>
              </h2>
            </div>
            <p className="max-w-[44ch] text-[15px] leading-relaxed text-ink-2">
              Every room of the house is a working part of the product, and every one of them writes to the same
              ledger.
            </p>
          </div>
          <ul className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r, i) => (
              <li key={r.name} data-reveal style={{ transitionDelay: `${(i % 3) * 80}ms` }} className="bg-bg-1">
                <Link
                  href={r.href}
                  className="group relative flex h-full flex-col gap-5 p-7 transition-colors duration-[var(--dur-2)] hover:bg-bg-2 md:p-8"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-md border border-line-strong text-gold transition-colors group-hover:border-gold-deep">
                      <Icon name={r.icon} size={20} />
                    </span>
                    <span className="index">{String(i + 1).padStart(2, "0")}</span>
                  </span>
                  <span>
                    <span className="display block text-[22px]">{r.name}</span>
                    <span className="mt-2 block text-[13.5px] leading-relaxed text-ink-2">{r.note}</span>
                  </span>
                  <span className="mt-auto flex items-center justify-between border-t border-line pt-4">
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{r.fact}</span>
                    <Icon name="arrow-right" size={16} className="text-ink-3 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-gold" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── 04 BUILD ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[88rem] px-[var(--gutter)] py-28 lg:py-36">
        <div data-reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="index mb-6">04 — Build</p>
            <h2 className="display max-w-[18ch] text-h1">
              Four disciplines. <span className="accent">Each its own world.</span>
            </h2>
          </div>
          <Link href="/programs" className="flex items-center gap-2 text-[14px] text-gold underline-offset-4 hover:underline">
            All programs <Icon name="arrow-right" size={15} />
          </Link>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {courses.map((c, i) => {
            const count = c.modules.reduce((n, m) => n + m._count.lessons, 0);
            return (
              <Link
                key={c.id}
                href={`/programs/${c.slug}`}
                data-reveal
                style={{ transitionDelay: `${(i % 2) * 90}ms` }}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-bg-1 transition-[border-color] duration-[var(--dur-3)] hover:border-gold-deep"
              >
                <div className="relative aspect-[5/2] overflow-hidden border-b border-line">
                  <PillarArt pillar={c.pillar} className="transition-transform duration-[1200ms] ease-[var(--ease-premium)] group-hover:scale-[1.03]" />
                  <span className="absolute left-5 top-5">
                    <PillarBadge pillar={c.pillar} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-6 md:p-7">
                  <h3 className="display text-[24px] leading-tight">{c.title}</h3>
                  <p className="text-[14px] leading-relaxed text-ink-2">{c.subtitle}</p>
                  <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                    <span>{c.modules.length} modules</span>
                    <span>{count} lessons</span>
                    <span className="text-gold">+{fmt(c.xpOnCompletion)} XP on completion</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── 05 EXECUTE ────────────────────────────────────────────── */}
      <section className="border-y border-line bg-bg-1/50">
        <div className="mx-auto grid max-w-[88rem] gap-14 px-[var(--gutter)] py-28 lg:grid-cols-[1fr_1.3fr]">
          <div data-reveal>
            <p className="index mb-6">05 — Execute</p>
            <h2 className="display max-w-[14ch] text-h1">
              Every mission states <span className="accent">its reward first.</span>
            </h2>
            <p className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-ink-2">
              You always know the objective and exactly what it pays before you start. XP and THC land the moment the
              work is verified — idempotently, on the ledger, forever.
            </p>
            <Link href="/challenges" className={cn(buttonStyles({ variant: "secondary" }), "mt-8")}>
              <Icon name="arena" size={16} /> Enter the Arena
            </Link>
          </div>
          <ol className="flex flex-col gap-3" data-reveal>
            {missions.map((m, i) => (
              <li key={m.id} className="grid grid-cols-[auto_1fr] gap-5 rounded-lg border border-line bg-bg-2/60 p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
                <span className="flex size-11 items-center justify-center rounded-md border border-line-strong font-mono text-[12px] text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
                    Mission{m.repeatable && <span className="text-gold">· daily</span>}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{m.name}</p>
                  <p className="text-[13.5px] text-ink-2">{m.description}</p>
                </div>
                <div className="col-span-2 flex items-center gap-4 border-t border-line pt-3 md:col-span-1 md:flex-col md:items-end md:gap-1 md:border-0 md:pt-0">
                  <span className="figures text-[14px] text-gold-bright">+{fmt(m.xpReward)} XP</span>
                  <ThcAmount amount={m.thcReward} signed size="sm" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── 06 GROW ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[88rem] px-[var(--gutter)] py-28 lg:py-36">
        <div data-reveal className="max-w-3xl">
          <p className="index mb-6">06 — Grow</p>
          <h2 className="display text-h1">
            Five ranks. <span className="accent">The same thresholds for everyone.</span>
          </h2>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
            Ranks map to levels, levels map to XP, and XP only comes from verified work. Nobody buys a rank, and
            nobody skips one.
          </p>
        </div>
        <ol className="mt-16 grid items-end gap-3 sm:grid-cols-5" aria-label="The ranks, in order">
          {ranks.map((r, i) => (
            <li key={r.id} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="flex flex-col">
              <div
                className={cn(
                  "relative flex flex-col justify-end rounded-t-sm border border-b-0 p-5 max-sm:!h-auto",
                  i === ranks.length - 1
                    ? "border-gold-deep bg-[linear-gradient(180deg,rgb(207_169_94/0.14),rgb(207_169_94/0.02))]"
                    : "border-line-strong bg-bg-1"
                )}
                style={{ height: `${120 + i * 56}px` }}
              >
                <span className="figures text-[11px] text-ink-3">Level {r.minLevel}</span>
                <span className="display mt-1 text-[20px] leading-tight">{r.name.replace(/^Tycoon\s+/, "")}</span>
                <span className="figures mt-1 text-[12px] text-gold">{fmt(xpRequiredForLevel(r.minLevel))} XP</span>
              </div>
              <div className={cn("h-px", i === ranks.length - 1 ? "bg-gold" : "bg-gold-deep")} />
              {r.description && <p className="mt-3 text-[12.5px] leading-snug text-ink-3">{r.description}</p>}
            </li>
          ))}
        </ol>
      </section>

      {/* ─── 07 TREASURY ───────────────────────────────────────────── */}
      <section id="treasury" className="overflow-hidden border-y border-line bg-bg-1">
        <div className="mx-auto grid max-w-[88rem] items-center gap-12 px-[var(--gutter)] py-24 lg:grid-cols-[auto_1fr_auto]">
          <div data-reveal className="relative">
            <div aria-hidden className="absolute inset-0 -z-0 scale-150 rounded-full bg-[radial-gradient(closest-side,rgb(207_169_94/0.18),transparent)]" />
            <CoinMark size={132} className="relative" />
          </div>
          <div data-reveal>
            <p className="index mb-4">07 — Treasury</p>
            <h2 className="display text-h1">
              One quadrillion. <span className="accent">Minted once.</span>
            </h2>
            <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
              THC is earned by doing and spent inside Tycoonhood on things that exist. The supply is provable, every
              movement is double-entry, and{" "}
              <span className="figures text-ink-1">{fmt(circulating)}</span> THC is in member hands right now. Not
              money, not an investment, not redeemable — and no transfers between members.
            </p>
          </div>
          <Link href="/thc" className={buttonStyles({ variant: "secondary", size: "lg" })}>
            Read the economy <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/* ─── 08 BECOME ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="grid-plane pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto flex max-w-[88rem] flex-col items-center px-[var(--gutter)] py-32 text-center lg:py-44">
          <p className="index mb-8" data-reveal>
            08 — Become
          </p>
          <h2 data-reveal className="display max-w-[16ch] text-display">
            The seat is free. <span className="accent">The rank is earned.</span>
          </h2>
          <p data-reveal className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
            {member
              ? "Your next mission is already on the board."
              : firstMission
                ? `Your first mission pays the moment you finish onboarding — ${fmt(firstMission.xpReward)} XP and ${fmt(firstMission.thcReward)} THC for two minutes of honesty about your goals.`
                : "Onboarding takes two minutes. Your first mission is waiting on the other side."}
          </p>
          <div data-reveal className="mt-10">
            <Link href={member ? "/dashboard" : "/register"} className={buttonStyles({ size: "lg", className: "px-8" })}>
              {member ? "Go to your Command Center" : "Take your seat"}
              <Icon name="arrow-right" size={16} className="transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Figure({ label, value, note, wide }: { label: string; value: string; note: string; wide?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 border-line py-6 lg:border-r lg:px-6 lg:py-7 lg:first:pl-0 lg:last:border-r-0",
        wide ? "max-lg:col-span-3 max-lg:border-b" : "max-lg:pr-2 max-lg:[&:not(:nth-child(2))]:border-l max-lg:[&:not(:nth-child(2))]:pl-3"
      )}
    >
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-gold">{label}</span>
      <span className="figures whitespace-nowrap text-[clamp(1rem,0.75rem+0.7vw,1.35rem)] leading-tight text-ink-1">{value}</span>
      <span className="text-[12px] text-ink-3">{note}</span>
    </div>
  );
}
