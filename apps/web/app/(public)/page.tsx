/**
 * HOMEPAGE (spec A) — twelve sections, in order:
 *
 *    1 hero               the four-line positioning (admin-editable, SiteSetting "home")
 *    2 value proposition  what Tycoonhood is for
 *    3 learn · earn · shop the three doors, plus the community
 *    4 programmes         published courses, from the database
 *    5 how it works       four steps
 *    6 earning            the affiliate programme, stated honestly
 *    7 marketplace        active products, or an honest empty state
 *    8 community          real counts only; a zero is omitted, never shown
 *    9 founder            Harsha, linking to /about
 *   10 member stories     published Testimonial rows only; hidden when none
 *   11 final call         join free
 *   12 footer             (the public layout)
 *
 * Hero copy and section toggles come from Admin → Site & CMS, with defaults in
 * core (platform/settings.ts). Every figure on this page is a query.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { cms, getSetting } from "@tycoonhood/core";
import { Icon, ThcAmount, buttonStyles, type IconName } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { lessonMinutes } from "../../lib/learning";
import { AppPreview } from "../../components/art/app-preview";
import { CourseCover } from "../../components/learning/course-card";
import { Photo } from "../../components/art/photo";

export const metadata: Metadata = {
  title: { absolute: "Tycoonhood — Master yourself. Build your skills. Create your wealth. Own your freedom." },
  description:
    "A mission-driven ecosystem for learning, earning and building: structured programmes, an honest affiliate programme, a shop and a community that shows its work. Free to join.",
  alternates: { canonical: "/" },
};
export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US");
const price = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
};

const VALUES: { title: string; body: string }[] = [
  { title: "Skills before shortcuts", body: "Programmes teach in order and check what you learned. Nothing here is a hack, a signal or a secret." },
  { title: "Honest about money", body: "Earning is real work with real rules. There is no guaranteed income, and we will never pretend otherwise." },
  { title: "Proof over claims", body: "Certificates carry public serials. Progress is recorded, not self-reported. Numbers on this site are counts of real rows." },
  { title: "Built for the long run", body: "A daily standard, a record that compounds, and a community that keeps itself useful." },
];

const DOORS: { icon: IconName; title: string; body: string; href: string; cta: string }[] = [
  {
    icon: "courses",
    title: "Learn",
    body: "Structured programmes across body, business, money and mind. Lessons open in order, knowledge checks explain their answers, and finishing earns a verifiable certificate.",
    href: "/learning",
    cta: "Explore learning",
  },
  {
    icon: "treasury",
    title: "Earn",
    body: "Approved members can share Tycoonhood and earn a commission on purchases they refer. Clear terms, a refund window, and no promises about income.",
    href: "/earn",
    cta: "How earning works",
  },
  {
    icon: "store",
    title: "Shop",
    body: "Merchandise and learning products from the house. Some items can be paid for with THC you earned by doing the work.",
    href: "/marketplace",
    cta: "Visit the shop",
  },
  {
    icon: "chat",
    title: "Connect",
    body: "Discussions, groups and challenges with people working on the same things. Moderated, with reports that go to staff.",
    href: "/connect",
    cta: "See the community",
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: "Join free", body: "Create an account and confirm your email. It takes a minute and costs nothing." },
  { title: "Choose a programme", body: "Enrol in the area you most want to improve. Every lesson shows you exactly one next step." },
  { title: "Learn and prove it", body: "Finish lessons, pass the knowledge checks, hold your daily standard and earn your certificate." },
  { title: "Earn, shop and connect", body: "Apply to the affiliate programme, spend the THC you earned, and work alongside other members." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const member = !!user?.profile?.onboardedAt;

  const [home, courses, standard, ranks, products, stories, members, certificates, lessonsDone, posts] = await Promise.all([
    getSetting("home"),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      take: 4,
      include: { modules: { include: { lessons: { select: { durationSec: true, contentMd: true } } } } },
    }),
    prisma.standardItem.findMany({ where: { userId: null, active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { slug: true, name: true, kind: true, image: true, priceFiatCents: true, fiatCurrency: true, priceThc: true },
    }),
    cms.publishedTestimonials(6),
    prisma.profile.count({ where: { onboardedAt: { not: null } } }),
    prisma.certificate.count(),
    prisma.lessonProgress.count({ where: { completedAt: { not: null } } }),
    prisma.communityPost.count({ where: { state: "VISIBLE" } }),
  ]);
  const on = home.sections;

  const programmes = courses.map((c) => {
    const lessons = c.modules.flatMap((m) => m.lessons);
    return {
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      pillar: c.pillar,
      coverImage: c.coverImage,
      modules: c.modules.length,
      lessons: lessons.length,
      minutes: lessons.reduce((n, l) => n + (lessonMinutes(l) ?? 0), 0),
    };
  });

  // Only real, non-zero counts are shown. A zero is omitted, not displayed.
  const facts = [
    { label: members === 1 ? "member" : "members", value: members },
    { label: lessonsDone === 1 ? "lesson completed" : "lessons completed", value: lessonsDone },
    { label: certificates === 1 ? "certificate issued" : "certificates issued", value: certificates },
    { label: posts === 1 ? "discussion started" : "discussions started", value: posts },
  ].filter((f) => f.value > 0);

  const join = member ? { href: "/today", label: "Open the app" } : { href: "/register", label: "Join free" };
  const lines = home.heroLines;

  return (
    <main>
      {/* ─── 1 · HERO ─────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="border-b border-line">
        <div className="mx-auto grid max-w-[88rem] grid-cols-1 gap-12 px-[var(--gutter)] pb-16 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16 lg:pb-24">
          <div className="min-w-0 animate-rise">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-bg-1 px-3 py-1 text-[13px] text-ink-2">
              <span aria-hidden className="size-1.5 rounded-full bg-gold" /> {home.heroEyebrow}
            </p>
            <h1 id="hero-title" className="display text-[clamp(2.4rem,1.2rem+4.6vw,5rem)] leading-[1.02]">
              {lines.map((l, i) => (
                <span key={i} className={i === lines.length - 1 && lines.length > 1 ? "accent block" : "block"}>
                  {l}
                </span>
              ))}
            </h1>
            <p className="mt-7 max-w-[38rem] text-lead text-ink-2">{home.heroLead}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={join.href} className={buttonStyles({ size: "lg", className: "px-7" })}>
                {join.label} <Icon name="arrow-right" size={16} />
              </Link>
              <Link href="/learning" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                Explore learning
              </Link>
            </div>
            <p className="mt-5 text-[13.5px] text-ink-3">Free to join. No card needed.</p>
          </div>

          {/* The real thing: the house standard, as members see it. */}
          <figure className="min-w-0 animate-fade">
            <AppPreview
              items={standard.map((s) => ({ id: s.id, title: s.title, detail: s.detail, auto: !!s.autoEvent }))}
              firstRank={ranks[0] ? ranks[0].name.replace(/^Tycoon\s+/, "") : null}
              rankCount={ranks.length}
            />
            <figcaption className="mt-3 text-center text-[13px] text-ink-3">The daily standard every member holds, as it looks in the app.</figcaption>
          </figure>
        </div>
      </section>

      {/* ─── 2 · VALUE PROPOSITION ────────────────────────────── */}
      {on.valueProposition && (
        <section aria-labelledby="value-title" className="border-b border-line">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
            <p className="eyebrow mb-3">Why Tycoonhood</p>
            <h2 id="value-title" className="display max-w-[22ch] text-h1">
              One place to grow — <span className="accent">and to show it.</span>
            </h2>
            <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
              {VALUES.map((v) => (
                <li key={v.title} className="bg-bg-0 p-7">
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{v.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{v.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── 3 · LEARN · EARN · SHOP ──────────────────────────── */}
      {on.pillars && (
        <section aria-labelledby="doors-title" className="border-b border-line bg-bg-1/50">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
            <p className="eyebrow mb-3">The ecosystem</p>
            <h2 id="doors-title" className="display max-w-[20ch] text-h1">
              Learn. Earn. Shop. <span className="accent">Connect.</span>
            </h2>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {DOORS.map((d) => (
                <li key={d.title}>
                  <Link href={d.href} className="group flex h-full flex-col rounded-xl border border-line bg-bg-0 p-6 transition-colors hover:border-gold-deep">
                    <span className="flex size-10 items-center justify-center rounded-lg border border-line-strong bg-bg-1 text-gold">
                      <Icon name={d.icon} size={20} />
                    </span>
                    <h3 className="mt-5 text-[19px] font-semibold">{d.title}</h3>
                    <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-2">{d.body}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-gold group-hover:text-gold-bright">
                      {d.cta} <Icon name="arrow-right" size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── 4 · FEATURED PROGRAMMES ──────────────────────────── */}
      {on.programmes && (
        <section aria-labelledby="programmes-title" className="border-b border-line">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow mb-3">Programmes</p>
                <h2 id="programmes-title" className="display max-w-[20ch] text-h1">
                  Body, business, money, mind.
                </h2>
              </div>
              <Link href="/learning" className={buttonStyles({ variant: "secondary" })}>
                All programmes
              </Link>
            </div>
            {programmes.length === 0 ? (
              <p className="mt-10 max-w-[60ch] text-[15px] text-ink-2">
                Our first programmes are being prepared. Join free and you will be told the moment the first one opens.
              </p>
            ) : (
              <ul className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {programmes.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/programs/${p.slug}`}
                      className="group flex h-full flex-col rounded-xl border border-line bg-bg-1 p-3 transition-colors hover:border-line-strong"
                    >
                      <CourseCover pillar={p.pillar} coverImage={p.coverImage} className="aspect-[16/8] rounded-lg" />
                      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                        <h3 className="text-[17px] font-semibold leading-snug group-hover:text-gold-bright">{p.title}</h3>
                        {p.subtitle && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{p.subtitle}</p>}
                        <p className="mt-auto pt-4 text-[13px] text-ink-3">
                          {p.modules} {p.modules === 1 ? "module" : "modules"} · {p.lessons} {p.lessons === 1 ? "lesson" : "lessons"}
                          {p.minutes ? ` · about ${p.minutes} min` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ─── 5 · HOW IT WORKS ─────────────────────────────────── */}
      {on.howItWorks && (
        <section id="how" aria-labelledby="how-title" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
            <p className="eyebrow mb-3">How it works</p>
            <h2 id="how-title" className="display max-w-[22ch] text-h1">
              Four steps. <span className="accent">Then keep going.</span>
            </h2>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col bg-bg-0 p-7">
                  <span className="flex size-9 items-center justify-center rounded-full border border-gold-deep text-[14px] font-semibold tabular-nums text-gold">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.01em]">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ─── 6 · EARNING ──────────────────────────────────────── */}
      {on.earn && (
        <section aria-labelledby="earn-title" className="border-b border-line bg-bg-1/50">
          <div className="mx-auto grid max-w-[88rem] gap-12 px-[var(--gutter)] py-20 md:py-28 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow mb-3">Earning opportunities</p>
              <h2 id="earn-title" className="display max-w-[18ch] text-h1">
                Share what helped you. <span className="accent">Earn fairly.</span>
              </h2>
              <p className="mt-5 max-w-[56ch] text-[15.5px] leading-relaxed text-ink-2">
                Members can apply to the affiliate programme. Once approved, you get a personal link; when someone buys through it, you earn a commission on that
                purchase after the refund window closes. Earnings depend entirely on your own effort and results.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/earn" className={buttonStyles({ variant: "secondary" })}>
                  How the programme works <Icon name="arrow-right" size={15} />
                </Link>
                <Link href="/earn/terms" className={buttonStyles({ variant: "ghost" })}>
                  Affiliate terms
                </Link>
              </div>
            </div>
            <ul className="flex flex-col gap-4">
              {[
                ["check", "No guaranteed income", "We never promise earnings. Many affiliates earn little or nothing."],
                ["shield", "Clear, published terms", "Commission rates, the refund window and payout rules are written down before you apply."],
                ["user", "Verified members only", "Applicants confirm their email and are reviewed before their link goes live."],
              ].map(([icon, title, body]) => (
                <li key={title} className="flex gap-4 rounded-xl border border-line bg-bg-0 p-5">
                  <Icon name={icon as IconName} size={20} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="text-[16px] font-semibold">{title}</p>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── 7 · MARKETPLACE ──────────────────────────────────── */}
      {on.marketplace && (
        <section aria-labelledby="shop-title" className="border-b border-line">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow mb-3">Marketplace</p>
                <h2 id="shop-title" className="display max-w-[20ch] text-h1">
                  From the house.
                </h2>
              </div>
              <Link href="/marketplace" className={buttonStyles({ variant: "secondary" })}>
                Visit the shop
              </Link>
            </div>
            {products.length === 0 ? (
              <p className="mt-10 max-w-[60ch] text-[15px] text-ink-2">
                The shop has no products on sale right now. New items are announced to members first.
              </p>
            ) : (
              <ul className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/marketplace/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-bg-1 transition-colors hover:border-line-strong">
                      <div className="relative aspect-[4/3] bg-bg-2">
                        {p.image ? (
                          // Product images may be on any https host an admin chose; a plain img avoids remote-pattern config.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-ink-3">
                            <Icon name="store" size={28} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="text-[16px] font-semibold leading-snug group-hover:text-gold-bright">{p.name}</h3>
                        <p className="mt-auto flex flex-wrap items-center gap-x-3 pt-3 text-[14px] text-ink-2">
                          {p.priceFiatCents != null && <span className="tabular-nums">{price(p.priceFiatCents, p.fiatCurrency)}</span>}
                          {p.priceThc != null && <ThcAmount amount={p.priceThc} size="sm" />}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ─── 8 · COMMUNITY & ACHIEVEMENTS ─────────────────────── */}
      {on.community && (
        <section aria-labelledby="community-title" className="border-b border-line bg-bg-1/50">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
            <p className="eyebrow mb-3">Community &amp; achievements</p>
            <h2 id="community-title" className="display max-w-[20ch] text-h1">
              Work alongside people <span className="accent">who show up.</span>
            </h2>
            <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2">
              Discussions, groups and challenges, moderated by staff. Rank is earned from verified work — lessons, knowledge checks, challenges and showing up — and the
              thresholds are public{ranks.length ? `: ${ranks.length} ranks, the same for everyone` : ""}.
            </p>
            {facts.length > 0 && (
              <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-baseline gap-2">
                    <dd className="text-[30px] font-semibold tabular-nums tracking-[-0.02em]">{fmt(f.value)}</dd>
                    <dt className="text-[14px] text-ink-3">{f.label}</dt>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-10">
              <Link href="/connect" className={buttonStyles({ variant: "secondary" })}>
                See the community
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── 9 · FOUNDER ──────────────────────────────────────── */}
      {on.founder && (
        <section aria-labelledby="founder-title" className="border-b border-line">
          <div className="mx-auto grid max-w-[88rem] items-center gap-10 px-[var(--gutter)] py-20 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:py-28 lg:gap-16">
            <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-xl border border-line-strong bg-bg-1">
              <Image
                src="/founder/harsha.jpg"
                alt="Harsha, Founder & Creator of Tycoonhood"
                width={640}
                height={640}
                sizes="(min-width: 768px) 320px, 80vw"
                className="aspect-square h-auto w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="eyebrow mb-3">The founder</p>
              <h2 id="founder-title" className="display text-h1">
                Harsha
              </h2>
              <p className="mt-1 text-[15px] text-gold">Founder &amp; Creator of Tycoonhood</p>
              <p className="mt-6 max-w-[60ch] text-[16px] leading-relaxed text-ink-2">
                Tycoonhood started from a simple belief: that discipline, real skills and honest work compound — and that people deserve one serious place to build all
                three, without hype. It is built as a mission-driven ecosystem, not a get-rich-quick product.
              </p>
              <Link href="/about" className={buttonStyles({ variant: "secondary", className: "mt-8" })}>
                Read Harsha&rsquo;s story <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── 10 · MEMBER STORIES (only when real ones are published) ─── */}
      {on.testimonials && stories.length > 0 && (
        <section aria-labelledby="stories-title" className="border-b border-line">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-20 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow mb-3">Member stories</p>
                <h2 id="stories-title" className="display max-w-[20ch] text-h1">
                  In their words.
                </h2>
              </div>
              <Link href="/success-stories" className={buttonStyles({ variant: "secondary" })}>
                All stories
              </Link>
            </div>
            <ul className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stories.slice(0, 3).map((s) => (
                <li key={s.id}>
                  <figure className="flex h-full flex-col rounded-xl border border-line bg-bg-1 p-6">
                    <blockquote className="flex-1 whitespace-pre-line text-[15.5px] leading-relaxed text-ink-1">&ldquo;{s.quote}&rdquo;</blockquote>
                    <figcaption className="mt-5 text-[14px]">
                      <span className="font-semibold">{s.name}</span>
                      {s.role && <span className="block text-ink-3">{s.role}</span>}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── 11 · FINAL CALL ──────────────────────────────────── */}
      {on.finalCta && (
        <section aria-labelledby="join-title" className="relative overflow-hidden">
          <Photo name="standard" sizes="100vw" />
          <div aria-hidden className="absolute inset-0 bg-bg-0/75" />
          <div className="relative mx-auto max-w-[88rem] px-[var(--gutter)] py-24 text-center md:py-36">
            <h2 id="join-title" className="display mx-auto max-w-[18ch] text-h1">
              Start today. <span className="accent">Not Monday.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-lead text-ink-2">Create your free account, choose a programme, and take the first lesson tonight.</p>
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
      )}
    </main>
  );
}
