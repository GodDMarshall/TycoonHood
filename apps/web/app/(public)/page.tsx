/**
 * HOMEPAGE — the front door of a serious academy.
 *
 *   hero         the promise, and the real daily standard every member holds
 *   facts        live counts (only shown when they are real rows)
 *   how          learn in order · hold the standard · prove it · work alongside others
 *   programs     the published programs
 *   standard     the house's daily items, from the database
 *   community    how it is kept useful
 *   rank         earned from verified work, five public thresholds
 *   miner        the one game, kept separate
 *   join         free to join
 *
 * Every figure on this page is a query. Nothing is typed in.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { CoinMark, Icon, PILLAR_LABEL, buttonStyles, cn, type IconName } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { lessonMinutes } from "../../lib/learning";

export const metadata: Metadata = {
  title: { absolute: "Tycoonhood — build yourself, the rest compounds" },
  description:
    "A serious academy for discipline, business and money. Programs that open lesson by lesson, a daily standard you hold every day, and a community that posts proof. Free to join.",
  alternates: { canonical: "/" },
};
export const dynamic = "force-dynamic";

const MINER_URL = process.env.NEXT_PUBLIC_MINER_URL ?? "http://localhost:3001";
const fmt = (n: number) => n.toLocaleString("en-US");

const PILLAR_TEXT = { WARRIOR: "text-warrior", BUILDER: "text-builder", TYCOON: "text-gold", MIND: "text-mind" } as const;
const PILLAR_TINT = { WARRIOR: "from-warrior/20", BUILDER: "from-builder/20", TYCOON: "from-gold/20", MIND: "from-mind/20" } as const;

const HOW: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "courses",
    title: "Learn in order",
    body: "Each program is a sequence. A lesson opens when the one before it is done, so there is always exactly one next step — never a wall of content.",
  },
  {
    icon: "checklist",
    title: "Hold the daily standard",
    body: "Train, study, deep work, read, plan tomorrow. Tick it every day; a met day moves your streak. Lessons tick themselves — you cannot fake study.",
  },
  {
    icon: "seal",
    title: "Prove it",
    body: "Knowledge checks with explained answers and unlimited attempts. Certificates with public serials. Wins posted with proof, not claims.",
  },
  {
    icon: "chat",
    title: "Work alongside others",
    body: "Each program has its own channels. Questions carry the lesson they are about, so answers stay findable. Staff pin what is worth everyone's time.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const member = !!user?.profile?.onboardedAt;

  const [courses, standard, ranks, members, certificates, metDays] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      include: { modules: { include: { lessons: { select: { durationSec: true, contentMd: true } } } } },
    }),
    prisma.standardItem.findMany({ where: { userId: null, active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.profile.count({ where: { onboardedAt: { not: null } } }),
    prisma.certificate.count(),
    prisma.standardDay.count(),
  ]);

  const programs = courses.map((c) => {
    const lessons = c.modules.flatMap((m) => m.lessons);
    return {
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      pillar: c.pillar,
      modules: c.modules.length,
      lessons: lessons.length,
      minutes: lessons.reduce((n, l) => n + (lessonMinutes(l) ?? 0), 0),
    };
  });
  const lessonCount = programs.reduce((n, p) => n + p.lessons, 0);

  const facts = [
    { label: "programs", value: programs.length },
    { label: "lessons", value: lessonCount },
    { label: members === 1 ? "member" : "members", value: members },
    { label: metDays === 1 ? "day of the standard met" : "days of the standard met", value: metDays },
    { label: certificates === 1 ? "certificate issued" : "certificates issued", value: certificates },
  ].filter((f) => f.value > 0);

  const join = member ? { href: "/today", label: "Open the app" } : { href: "/register", label: "Join free" };

  return (
    <main>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="border-b border-line">
        <div className="mx-auto grid max-w-[88rem] grid-cols-1 gap-12 px-[var(--gutter)] pb-16 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16 lg:pb-24">
          <div className="min-w-0 animate-rise">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-bg-1 px-3 py-1 text-[13px] text-ink-2">
              <span aria-hidden className="size-1.5 rounded-full bg-gold" /> The academy for discipline, business and money
            </p>
            <h1 id="hero-title" className="display text-hero">
              Build yourself. <span className="accent">The rest compounds.</span>
            </h1>
            <p className="mt-7 max-w-[36rem] text-lead text-ink-2">
              Programs that open lesson by lesson. A daily standard you hold every single day. A community that posts proof, not noise. No shortcuts are
              sold here — the work is the product.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={join.href} className={buttonStyles({ size: "lg", className: "px-7" })}>
                {join.label} <Icon name="arrow-right" size={16} />
              </Link>
              <Link href="/programs" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                See the programs
              </Link>
            </div>
            <p className="mt-5 text-[13.5px] text-ink-3">Free to join. Every published program is free to enroll in.</p>
          </div>

          {/* The real thing: the house standard, as members see it. */}
          <figure className="min-w-0 animate-fade">
            <div className="rounded-xl border border-line-strong bg-bg-1 p-5 shadow-[var(--shadow-3)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[15px] font-semibold">Today&rsquo;s standard</p>
                <p className="text-[13px] tabular-nums text-ink-3">0 of {standard.length}</p>
              </div>
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-bg-0">
                {standard.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="size-5 shrink-0 rounded-md border border-line-input" />
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-medium">{s.title}</span>
                      {s.detail && <span className="block truncate text-[12.5px] text-ink-3">{s.detail}</span>}
                    </span>
                    {s.autoEvent && <Icon name="bolt" size={14} className="ml-auto shrink-0 text-ink-3" />}
                  </li>
                ))}
              </ul>
            </div>
            <figcaption className="mt-3 text-center text-[13px] text-ink-3">The standard every member holds, every day. Members add up to five of their own.</figcaption>
          </figure>
        </div>
      </section>

      {/* ─── FACTS ───────────────────────────────────────────── */}
      {facts.length > 0 && (
        <section aria-label="Tycoonhood in numbers" className="border-b border-line bg-bg-1/50">
          <dl className="mx-auto flex max-w-[88rem] flex-wrap justify-between gap-x-10 gap-y-6 px-[var(--gutter)] py-8">
            {facts.map((f) => (
              <div key={f.label} className="flex items-baseline gap-2">
                <dd className="text-[28px] font-semibold tabular-nums tracking-[-0.02em]">{fmt(f.value)}</dd>
                <dt className="text-[14px] text-ink-3">{f.label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ─── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how" aria-labelledby="how-title" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
          <p className="eyebrow mb-3">How it works</p>
          <h2 id="how-title" className="display max-w-[22ch] text-h1">
            Four habits. Every day. <span className="accent">For as long as it takes.</span>
          </h2>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
            {HOW.map((h, i) => (
              <li key={h.title} className="flex flex-col bg-bg-0 p-7">
                <span className="flex size-10 items-center justify-center rounded-lg border border-line-strong bg-bg-1 text-gold">
                  <Icon name={h.icon} size={20} />
                </span>
                <p className="mt-6 text-[13px] text-ink-3">Step {i + 1}</p>
                <h3 className="mt-1 text-[19px] font-semibold tracking-[-0.01em]">{h.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{h.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── PROGRAMS ───────────────────────────────────────── */}
      <section aria-labelledby="programs-title" className="border-b border-line">
        <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-3">The programs</p>
              <h2 id="programs-title" className="display max-w-[20ch] text-h1">
                Body, business, money, mind.
              </h2>
            </div>
            <Link href="/programs" className={buttonStyles({ variant: "secondary" })}>
              All programs
            </Link>
          </div>
          {programs.length === 0 ? (
            <p className="mt-10 text-ink-3">The first programs are being written.</p>
          ) : (
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {programs.map((p) => (
                <li key={p.slug}>
                  <Link href={`/programs/${p.slug}`} className="group flex h-full flex-col rounded-xl border border-line bg-bg-1 p-3 transition-colors hover:border-line-strong">
                    <div className={cn("flex aspect-[16/8] items-end rounded-lg bg-gradient-to-br to-bg-2 p-4", PILLAR_TINT[p.pillar])} aria-hidden>
                      <span className={cn("text-[12px] font-semibold uppercase tracking-[0.08em]", PILLAR_TEXT[p.pillar])}>{PILLAR_LABEL[p.pillar]}</span>
                    </div>
                    <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                      <h3 className="text-[17px] font-semibold leading-snug group-hover:text-gold-bright">{p.title}</h3>
                      {p.subtitle && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{p.subtitle}</p>}
                      <p className="mt-auto pt-4 text-[13px] text-ink-3">
                        {p.modules} modules · {p.lessons} lessons{p.minutes ? ` · about ${p.minutes} min` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── COMMUNITY + RANK ───────────────────────────────── */}
      <section aria-labelledby="community-title" className="border-b border-line">
        <div className="mx-auto grid max-w-[88rem] gap-16 px-[var(--gutter)] py-20 md:py-28 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">The community</p>
            <h2 id="community-title" className="display max-w-[18ch] text-h2">
              Built to stay useful.
            </h2>
            <ul className="mt-8 flex flex-col gap-5">
              {[
                ["help", "Questions carry their lesson", "Ask from the lesson page; the answer stays attached to the lesson for the next person."],
                ["trophy", "Wins come with proof", "A link, a number, a result. Claims without proof are just noise."],
                ["pin", "Staff pin what matters", "The only community activity that counts toward anything is what staff choose to pin. Volume never counts."],
                ["mute", "Slow mode, reports and mutes", "Every channel can be slowed. Every report goes to staff. There are no direct messages between members."],
              ].map(([icon, title, body]) => (
                <li key={title} className="flex gap-4">
                  <Icon name={icon as IconName} size={20} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="text-[16px] font-semibold">{title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Rank</p>
            <h2 className="display max-w-[18ch] text-h2">Earned, never bought.</h2>
            <p className="mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-ink-2">
              Rank comes from XP, and XP comes only from verified work: lessons, knowledge checks, challenges and showing up every day. The thresholds are
              public.
            </p>
            <ol className="mt-8 overflow-hidden rounded-xl border border-line">
              {ranks.map((r, i) => (
                <li key={r.id} className={cn("flex items-center justify-between gap-4 px-5 py-4", i > 0 && "border-t border-line")}>
                  <span className="flex items-center gap-3">
                    <span className="text-[13px] tabular-nums text-ink-3">{i + 1}</span>
                    <span className="text-[15.5px] font-medium">{r.name.replace(/^Tycoon\s+/, "")}</span>
                  </span>
                  <span className="text-[14px] tabular-nums text-ink-3">from level {r.minLevel}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ─── THE MINER ──────────────────────────────────────── */}
      <section aria-labelledby="miner-title" className="border-b border-line bg-bg-1/50">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-8 px-[var(--gutter)] py-16 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <CoinMark size={48} />
            <div>
              <h2 id="miner-title" className="text-[22px] font-semibold tracking-[-0.01em]">
                One game, kept in its place: the Miner.
              </h2>
              <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
                The academy is work. The Miner is a separate app where members mine THC — internal credits spent in the Store. THC are not currency, not an
                investment, and not redeemable for money.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            <a href={MINER_URL} className={buttonStyles({ variant: "secondary" })}>
              Open the Miner <Icon name="arrow-up-right" size={15} />
            </a>
            <Link href="/thc" className={buttonStyles({ variant: "ghost" })}>
              How THC works
            </Link>
          </div>
        </div>
      </section>

      {/* ─── JOIN ───────────────────────────────────────────── */}
      <section aria-labelledby="join-title">
        <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-24 text-center md:py-32">
          <h2 id="join-title" className="display mx-auto max-w-[18ch] text-h1">
            Start today. <span className="accent">Not Monday.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-lead text-ink-2">Pick a program, hold the standard tomorrow morning, and let the record show the rest.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={join.href} className={buttonStyles({ size: "lg", className: "px-8" })}>
              {join.label} <Icon name="arrow-right" size={16} />
            </Link>
            <Link href="/faq" className={buttonStyles({ variant: "ghost", size: "lg" })}>
              Questions first
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
