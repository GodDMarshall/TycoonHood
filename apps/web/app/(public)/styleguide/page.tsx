/**
 * /styleguide — the living design system reference (DR-17).
 * Foundations → components → composition. The last section runs on live
 * data so the system is proven against reality, not lorem ipsum.
 * Not indexed: this is a working document for whoever builds the house.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { prisma } from "@tycoonhood/db";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CoinMark,
  EmptyState,
  Field,
  Icon,
  Input,
  Logo,
  Metric,
  Notice,
  PillarBadge,
  Progress,
  RankBadge,
  SectionRule,
  Select,
  Skeleton,
  Stat,
  Textarea,
  ThcAmount,
  XpBar,
  iconNames,
} from "@tycoonhood/ui";
import { StyleguideDialogDemo } from "../../../components/styleguide-dialog";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const surfaces = [
  ["bg-0", "#0a0908", "L1 · the ground"],
  ["bg-1", "#100f0d", "L2 · environment, shells"],
  ["bg-2", "#171613", "L3 · content surface"],
  ["bg-3", "#1f1d19", "L4 · interactive, hovered"],
  ["line", "#26241f", "Hairline"],
  ["line-strong", "#37342d", "Structural edge"],
  ["line-input", "#6b665a", "Control boundary · 3.3:1"],
] as const;
const inks = [
  ["ink-1", "#f3efe7", "17.3:1"],
  ["ink-2", "#b4ad9f", "8.9:1"],
  ["ink-3", "#8f897c", "5.7:1"],
] as const;
const metals = [
  ["gold", "#cfa95e", "Primary metal · 9.0:1"],
  ["gold-bright", "#e8cf94", "Lit edge, hover"],
  ["gold-deep", "#a38449", "Hairline metal · 5.6:1"],
  ["gold-shadow", "#5c4a26", "Metal in shadow · borders only"],
] as const;
const pillars = [
  ["warrior", "#c9705f"],
  ["builder", "#7d9cb5"],
  ["tycoon", "#cfa95e"],
  ["mind", "#86ab99"],
] as const;
const semantics = [
  ["success", "#72b28a"],
  ["warning", "#d9a441"],
  ["danger", "#d9705f"],
] as const;
const typeScale = [
  ["text-hero", "Hero", "clamp 48 → 100px · 0.9"],
  ["text-display", "Display", "clamp 40 → 76px · 0.96"],
  ["text-h1", "Heading one", "clamp 32 → 52px"],
  ["text-h2", "Heading two", "clamp 24 → 34px"],
  ["text-h3", "Heading three", "20px"],
  ["text-lead", "Lead paragraph", "18px / 1.6"],
  ["text-body", "Body copy for reading", "15px / 1.6"],
  ["text-small", "Small, secondary detail", "13px"],
  ["text-caption", "Caption", "11px"],
] as const;
const motion = [
  ["--dur-1", "160ms", "Feedback: press, toggle"],
  ["--dur-2", "240ms", "Hover, focus"],
  ["--dur-3", "400ms", "Panels, menus"],
  ["--dur-4", "700ms", "Reveals, scene transitions"],
  ["--ease-premium", "cubic-bezier(.22,1,.36,1)", "Arrivals — fast out, long settle"],
  ["--ease-settle", "cubic-bezier(.65,0,.35,1)", "Loops — symmetric, calm"],
] as const;

function Swatch({ name, hex, note }: { name: string; hex: string; note: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="h-16" style={{ background: hex }} />
      <div className="bg-bg-1 px-3 py-2.5">
        <p className="figures text-[12px] text-ink-1">{name}</p>
        <p className="figures text-[11px] text-ink-3">{hex}</p>
        <p className="mt-0.5 text-[11.5px] text-ink-3">{note}</p>
      </div>
    </div>
  );
}

function Section({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-14">
      <SectionRule index={index} label={title} className="mb-8" />
      {children}
    </section>
  );
}

export default async function Styleguide() {
  const [courses, ranks] = await Promise.all([
    prisma.course.findMany({ where: { status: "PUBLISHED" }, orderBy: { sortOrder: "asc" }, take: 2 }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-[88rem] px-[var(--gutter)] py-16">
      <header className="pb-12">
        <Logo size={32} />
        <h1 className="display mt-10 text-display">
          The house style, <span className="accent">in one page.</span>
        </h1>
        <p className="mt-5 max-w-[60ch] text-lead text-ink-2">
          A black room holding one gold object. Graphite surfaces, gold as a material, architectural geometry and an
          editorial type pairing. Tokens live in exactly one file: <span className="figures text-ink-1">packages/ui/src/tokens.css</span>.
        </p>
      </header>

      <Section index="01" title="Surfaces — five levels of depth">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {surfaces.map(([n, h, note]) => (
            <Swatch key={n} name={n} hex={h} note={note} />
          ))}
        </div>
      </Section>

      <Section index="02" title="Ink, metal and signal">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {inks.map(([n, h, c]) => (
            <Swatch key={n} name={n} hex={h} note={`${c} on bg-0`} />
          ))}
          {metals.map(([n, h, note]) => (
            <Swatch key={n} name={n} hex={h} note={note} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {pillars.map(([n, h]) => (
            <Swatch key={n} name={n} hex={h} note="Pillar thread" />
          ))}
          {semantics.map(([n, h]) => (
            <Swatch key={n} name={n} hex={h} note="Semantic" />
          ))}
        </div>
        <p className="mt-5 max-w-[70ch] text-[13px] text-ink-3">
          Every text colour clears WCAG AA 4.5:1 on every surface it is used on. Gold is for one thing per view: the
          primary action, the lit edge, the figure that matters. Pillar colours are threads — a dot, a line, a tag —
          never a fill.
        </p>
      </Section>

      <Section index="03" title="Type">
        <div className="flex flex-col divide-y divide-line">
          {typeScale.map(([cls, sample, spec]) => (
            <div key={cls} className="grid gap-2 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
              <span className="figures text-[11.5px] text-ink-3">
                {cls} · {spec}
              </span>
              <span className={`${cls} ${cls.startsWith("text-h") || cls === "text-display" || cls === "text-hero" ? "display" : ""}`}>{sample}</span>
            </div>
          ))}
          <div className="grid gap-2 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
            <span className="figures text-[11.5px] text-ink-3">.accent · Instrument Serif italic</span>
            <span className="display text-h2">
              One headline, <span className="accent">one accent phrase.</span>
            </span>
          </div>
          <div className="grid gap-2 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
            <span className="figures text-[11.5px] text-ink-3">.figures · IBM Plex Mono, tabular</span>
            <span className="figures text-[22px]">1,000,000,000,000,000</span>
          </div>
          <div className="grid gap-2 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
            <span className="figures text-[11.5px] text-ink-3">.eyebrow / .index</span>
            <span className="flex items-center gap-3">
              <span className="index">03 — Explore</span>
              <span className="eyebrow">The Academy</span>
            </span>
          </div>
        </div>
      </Section>

      <Section index="04" title="Geometry, elevation, motion">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            {["rounded-sm · 2px", "rounded-md · 3px", "rounded-lg · 4px", "rounded-xl · 6px"].map((r) => (
              <div key={r} className={`border border-line-strong bg-bg-2 px-4 py-3 text-[12.5px] ${r.split(" ")[0]}`}>
                <span className="figures text-ink-2">{r}</span>
              </div>
            ))}
            <p className="text-[12.5px] text-ink-3">Architectural corners. No pills, no bubbles; round only for status dots and avatars of people.</p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              ["--shadow-1", "var(--shadow-1)"],
              ["--shadow-2", "var(--shadow-2)"],
              ["--shadow-3", "var(--shadow-3)"],
              ["--shadow-gold", "var(--shadow-gold)"],
            ].map(([n, v]) => (
              <div key={n} className="rounded-lg border border-line bg-bg-2 px-4 py-4" style={{ boxShadow: v }}>
                <span className="figures text-[12px] text-ink-2">{n}</span>
              </div>
            ))}
          </div>
          <dl className="flex flex-col divide-y divide-line rounded-lg border border-line bg-bg-1">
            {motion.map(([k, v, note]) => (
              <div key={k} className="px-4 py-3">
                <dt className="figures text-[12px] text-gold">
                  {k} <span className="text-ink-2">{v}</span>
                </dt>
                <dd className="text-[12px] text-ink-3">{note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section index="05" title="Icons — one family">
        <ul className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-6 lg:grid-cols-10">
          {iconNames.map((n) => (
            <li key={n} className="flex flex-col items-center gap-2 bg-bg-1 px-2 py-4">
              <Icon name={n} size={22} className="text-ink-1" />
              <span className="figures text-[10px] text-ink-3">{n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] text-ink-3">24px grid, 1.5 stroke, square caps, mitred joins. No emoji anywhere in the interface.</p>
      </Section>

      <Section index="06" title="Buttons">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">
              Large <Icon name="arrow-right" size={16} />
            </Button>
            <Button size="md">Medium</Button>
            <Button size="sm">Small</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      <Section index="07" title="Surfaces as components">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard</CardTitle>
              <CardDescription>L3 — a hairline, no lift.</CardDescription>
            </CardHeader>
            <CardContent className="text-[13px] text-ink-2">Most content lives here.</CardContent>
          </Card>
          <Card variant="raised">
            <CardHeader>
              <CardTitle>Raised</CardTitle>
              <CardDescription>A structural edge and a shadow.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Action
              </Button>
            </CardFooter>
          </Card>
          <Card variant="interactive" tabIndex={0}>
            <CardHeader>
              <CardTitle>Interactive</CardTitle>
              <CardDescription>Hover or focus me.</CardDescription>
            </CardHeader>
            <CardContent className="text-[13px] text-ink-2">Wrap in a link.</CardContent>
          </Card>
          <Card variant="gold" ticks>
            <CardHeader>
              <CardTitle>Premium</CardTitle>
              <CardDescription>The one lit object in a view.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThcAmount amount={18000n} size="lg" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section index="08" title="Controls">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Field label="Text" htmlFor="sg-name" hint="Visible before focus: a 3:1 boundary.">
              <Input id="sg-name" placeholder="Your name" />
            </Field>
            <Field label="Invalid" htmlFor="sg-bad" error="That email is already on the books.">
              <Input id="sg-bad" aria-invalid defaultValue="taken@example.com" />
            </Field>
          </div>
          <div className="flex flex-col gap-4">
            <Field label="Select" htmlFor="sg-select">
              <Select id="sg-select" defaultValue="business">
                <option value="body">Build the body</option>
                <option value="business">Build a business</option>
                <option value="capital">Manage capital</option>
              </Select>
            </Field>
            <Field label="Search" htmlFor="sg-search">
              <span className="relative block">
                <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <Input id="sg-search" type="search" placeholder="Search lessons" className="pl-10" />
              </span>
            </Field>
          </div>
          <div className="flex flex-col gap-4">
            <Field label="Textarea" htmlFor="sg-bio">
              <Textarea id="sg-bio" placeholder="What are you building?" />
            </Field>
            <label className="flex items-center gap-3 text-[14px] text-ink-2">
              <input type="checkbox" defaultChecked className="size-4 accent-[var(--color-gold)]" /> Show my rank publicly
            </label>
          </div>
        </div>
      </Section>

      <Section index="09" title="Status, feedback, states">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Notice tone="success">Checked in. Streak held.</Notice>
            <Notice tone="info" title="Not configured">Email delivery is off — reset links print to the server log, clearly labelled.</Notice>
            <Notice tone="warning">Already counted for this window.</Notice>
            <Notice tone="danger">That size just sold out. Nothing was charged.</Notice>
          </div>
          <div className="flex flex-col gap-4">
            <EmptyState icon="arena" title="Not in a challenge" body="What belongs here, why it matters, and the next step — never an empty box." />
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg-1 p-5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <StyleguideDialogDemo />
          </div>
        </div>
      </Section>

      <Section index="10" title="Tags, rank and progress — on live data">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="gold">Gold</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="danger">Danger</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => (
                <PillarBadge key={c.id} pillar={c.pillar} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ranks.map((r) => (
                <RankBadge key={r.id} slug={r.slug} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Avatar name="Ada Lovelace" size={40} />
              <CoinMark size={40} />
              <ThcAmount amount={2500n} signed />
              <ThcAmount amount={-4000n} />
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-lg border border-line bg-bg-1 p-6">
            <XpBar level={4} currentXp={4200} levelFloorXp={3000} nextLevelXp={5000} />
            <Progress value={62} tone="warrior" label="Warrior progress" />
            <Progress value={35} tone="builder" label="Builder progress" />
            <Progress value={80} tone="mind" label="Mind progress" />
            <div className="grid grid-cols-3 gap-6">
              <Stat label="Level" value="12" />
              <Metric label="Streak" value="41" unit="days" />
              <Stat label="Balance" value={<ThcAmount amount={73420n} size="sm" />} />
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
