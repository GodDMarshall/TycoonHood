/**
 * HOMEPAGE. The signature is the open-books band: live figures from the
 * actual ledger, because no one else can show you their supply as a
 * database fact. Everything dynamic on this page is a real query.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import {
  Badge,
  Card,
  CardContent,
  CoinMark,
  PillarBadge,
  RankBadge,
  SectionRule,
  ThcAmount,
} from "@tycoonhood/ui";

export const metadata: Metadata = {
  title: "Tycoonhood — build the standard others measure against",
  description:
    "Programs, challenges, and a real internal economy across four pillars: Warrior, Builder, Tycoon, Mind. Progress you can prove.",
};
export const dynamic = "force-dynamic";

const ledger = new LedgerService(prisma);

const steps = [
  ["Learn", "Programs across the four pillars — structured modules, not a content feed."],
  ["Do", "Missions and challenges with real completion criteria and real failure states."],
  ["Earn", "XP and THC pay out through the ledger the moment work is verified."],
  ["Rank", "Five ranks from Initiate to Legend, earned against thresholds that never bend."],
] as const;

export default async function HomePage() {
  const [mint, members, missionsPaid, courses, ranks, circulating] = await Promise.all([
    prisma.ledgerAccount.findFirst({ where: { type: "SYSTEM_MINT" } }),
    prisma.user.count(),
    prisma.missionCompletion.count(),
    prisma.course.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    ledger.circulatingSupply(),
  ]);

  return (
    <main>
      {/* Hero — the thesis */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 md:pt-28">
        <div className="max-w-3xl">
          <p className="eyebrow mb-4">Programs · Challenges · A real economy</p>
          <h1 className="display text-[44px] leading-[1.05] md:text-[64px]">
            Build the standard others measure against.
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-2">
            Tycoonhood trains four pillars — body, business, capital, mind —
            and writes every step into a ledger. No highlight reels. Progress
            you can prove.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md bg-gold px-6 text-[15px] font-semibold text-bg-0 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_16px_rgba(201,162,39,0.18)] hover:bg-gold-bright"
            >
              Join Tycoonhood
            </Link>
            <Link
              href="/programs"
              className="inline-flex h-12 items-center rounded-md border border-line-strong px-6 text-[15px] text-ink-1 hover:border-gold-deep hover:text-gold-bright"
            >
              See the programs
            </Link>
          </div>
        </div>
      </section>

      {/* The open books — signature band, live from the ledger */}
      <section aria-label="The open books" className="border-y border-line bg-bg-1">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="eyebrow mb-1.5">Total supply · fixed</p>
            <p className="figures text-[20px]">{(-(mint?.balance ?? 0n)).toLocaleString("en-US")}</p>
          </div>
          <div>
            <p className="eyebrow mb-1.5">THC in member hands</p>
            <p className="figures text-[20px]">{circulating.toLocaleString("en-US")}</p>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Members</p>
            <p className="figures text-[20px]">{members.toLocaleString("en-US")}</p>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Missions paid</p>
            <p className="figures text-[20px]">{missionsPaid.toLocaleString("en-US")}</p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-5">
          <p className="text-[12px] text-ink-3">
            Live from the double-entry ledger — every figure above is a database fact.{" "}
            <Link href="/thc" className="text-gold hover:underline underline-offset-4">
              How the economy works
            </Link>
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionRule label="The four pillars" className="mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <Link key={c.id} href={`/programs/${c.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-gold-deep">
                <CardContent className="flex h-full flex-col gap-3 py-5">
                  <PillarBadge pillar={c.pillar} />
                  <h2 className="display text-[20px] leading-snug">{c.title}</h2>
                  <p className="flex-1 text-[13px] leading-relaxed text-ink-2">{c.subtitle}</p>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gold opacity-0 transition-opacity group-hover:opacity-100">
                    View program →
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works — a true sequence */}
      <section className="border-y border-line bg-bg-1/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionRule label="How it works" className="mb-8" />
          <div className="grid gap-8 md:grid-cols-4">
            {steps.map(([title, body], i) => (
              <div key={title}>
                <p className="figures mb-2 text-[13px] text-gold-deep">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="display mb-2 text-[19px]">{title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-2">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rank path */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionRule label="The path" className="mb-8" />
        <div className="flex flex-wrap items-center gap-3">
          {ranks.map((r, i) => (
            <span key={r.id} className="flex items-center gap-3">
              <RankBadge slug={r.slug} />
              {i < ranks.length - 1 && <span aria-hidden className="text-ink-3">→</span>}
            </span>
          ))}
        </div>
        <p className="mt-4 max-w-xl text-[13px] text-ink-2">
          Ranks map to levels, levels map to XP, and XP only comes from verified
          work. The thresholds are public and the same for everyone.
        </p>
      </section>

      {/* THC band */}
      <section className="border-y border-line bg-bg-1">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <CoinMark size={56} />
            <div>
              <h2 className="display text-[26px]">One quadrillion. Minted once.</h2>
              <p className="mt-1 max-w-md text-[14px] text-ink-2">
                THC is earned by doing and spent inside Tycoonhood. Utility
                before speculation — and the books stay open.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge tone="gold">Fixed supply</Badge>
            <Link href="/thc" className="text-[14px] text-gold hover:underline underline-offset-4">
              Read the economy →
            </Link>
          </div>
        </div>
      </section>

      {/* Closing call */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="display mx-auto max-w-2xl text-[34px] leading-tight md:text-[44px]">
          Your first mission pays the moment you finish onboarding.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[14px] text-ink-2">
          <ThcAmount amount={250n} signed size="sm" /> and 75 XP for setting up
          your membership. Two minutes. On the ledger forever.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-flex h-12 items-center rounded-md bg-gold px-8 text-[15px] font-semibold text-bg-0 hover:bg-gold-bright"
        >
          Create your account
        </Link>
      </section>
    </main>
  );
}
