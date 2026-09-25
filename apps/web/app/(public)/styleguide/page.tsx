/**
 * /styleguide — the living design system reference.
 * Sections are a real sequence: foundations → figures → components →
 * composition. The final section runs on live database data so the
 * system is proven against reality, not lorem ipsum.
 */
import type { Metadata } from "next";
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
  Field,
  Input,
  Logo,
  PillarBadge,
  Progress,
  RankBadge,
  SectionRule,
  Stat,
  Textarea,
  ThcAmount,
  XpBar,
} from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Design system" };
export const dynamic = "force-dynamic";

const surfaces = [
  ["bg-0", "#0d0b08", "Base plate"],
  ["bg-1", "#14110c", "Card"],
  ["bg-2", "#1b1712", "Raised / hover"],
  ["line", "#2a241b", "Hairline"],
  ["line-strong", "#3a3226", "Border"],
] as const;

const inks = [
  ["ink-1", "#ede8dd", "Primary"],
  ["ink-2", "#a69f8f", "Secondary"],
  ["ink-3", "#6b655a", "Muted"],
] as const;

const metals = [
  ["gold-bright", "#e3be4a", "Hover / highlight"],
  ["gold", "#c9a227", "The house metal"],
  ["gold-deep", "#8c6f1a", "Pressed / edge"],
] as const;

const pillars = [
  ["warrior", "#b5443a", "Warrior"],
  ["builder", "#5b87a6", "Builder"],
  ["tycoon", "#c9a227", "Tycoon"],
  ["mind", "#6fa08b", "Mind"],
] as const;

function Swatch({ name, hex, note }: { name: string; hex: string; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-bg-1 p-3">
      <span
        className="size-10 shrink-0 rounded-md border border-line-strong"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink-1">{name}</p>
        <p className="figures text-[12px] text-ink-3">
          {hex} <span className="font-sans">· {note}</span>
        </p>
      </div>
    </div>
  );
}

export default async function Styleguide() {
  const [courses, pool, treasury, ranks] = await Promise.all([
    prisma.course.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerAccount.findFirst({ where: { type: "REWARDS_POOL" } }),
    prisma.ledgerAccount.findFirst({ where: { type: "TREASURY" } }),
    prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <header className="mb-14">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Badge tone="gold">Phase 2</Badge>
        </div>
        <p className="eyebrow mb-3">Design system</p>
        <h1 className="display text-[44px] leading-[1.08]">The house style.</h1>
        <p className="mt-4 max-w-xl text-[15px] text-ink-2">
          Warm dark surfaces, engraved display type, and ledger figures for
          anything counted. Everything below ships from{" "}
          <code className="figures text-[13px] text-gold">@tycoonhood/ui</code>{" "}
          — pages compose these parts and never restyle them.
        </p>
      </header>

      {/* 01 — Foundations */}
      <section className="mb-14">
        <SectionRule label="01 · Foundations" className="mb-6" />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="display text-[20px]">Surfaces & ink</h2>
            <div className="grid gap-2">
              {[...surfaces, ...inks].map(([n, h, note]) => (
                <Swatch key={n} name={n} hex={h} note={note} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="display text-[20px]">Metal, pillars, semantics</h2>
            <div className="grid gap-2">
              {[...metals, ...pillars].map(([n, h, note]) => (
                <Swatch key={n} name={n} hex={h} note={note} />
              ))}
              <Swatch name="success" hex="#58a279" note="Confirmations" />
              <Swatch name="danger" hex="#c75548" note="Destructive, losses" />
              <Swatch name="warning" hex="#d9a441" note="Caution" />
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="py-6">
              <p className="eyebrow mb-2">Display · Georgia</p>
              <p className="display text-[28px] leading-tight">
                Build the standard others measure against.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <p className="eyebrow mb-2">Interface · Segoe UI</p>
              <p className="text-[15px] text-ink-2">
                Quiet, legible, never the point. Labels are small caps with
                wide tracking; body text stays at 15px.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <p className="eyebrow mb-2">Figures · Consolas</p>
              <p className="figures text-[22px] text-ink-1">
                1,000,000,000,000,000
              </p>
              <p className="mt-1 text-[13px] text-ink-3">
                Tabular, always. If it counts, it is set in figures.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 02 — Ledger figures */}
      <section className="mb-14">
        <SectionRule label="02 · Ledger figures" className="mb-6" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>THC amounts</CardTitle>
              <CardDescription>
                Credits read gold and signed. Debits read bone with a minus.
                Plain amounts are statements of fact.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ThcAmount amount={500n} signed />
              <ThcAmount amount={-300n} />
              <ThcAmount amount={12_750n} />
              <ThcAmount amount={1_000_000n} size="lg" ruled />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Book alignment</CardTitle>
              <CardDescription>
                Tabular numerals keep every column honest without tables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                {[
                  ["Mission: First Steps", 500n],
                  ["Mission: Show Up", 50n],
                  ["Marketplace: Playbook", -300n],
                ].map(([label, amt]) => (
                  <div
                    key={String(label)}
                    className="flex items-baseline justify-between border-b border-line py-2 last:border-0"
                  >
                    <span className="text-[13px] text-ink-2">{String(label)}</span>
                    <ThcAmount amount={amt as bigint} signed={(amt as bigint) > 0n} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 03 — Components */}
      <section className="mb-14">
        <SectionRule label="03 · Components" className="mb-6" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button>Claim reward</Button>
              <Button variant="outline">View ledger</Button>
              <Button variant="ghost">Not now</Button>
              <Button variant="danger">Withdraw entry</Button>
              <Button loading>Posting…</Button>
              <Button disabled>Locked</Button>
              <Button size="sm" variant="outline">
                Small
              </Button>
              <Button size="lg">Begin the Warrior program</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badges & insignia</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <PillarBadge pillar="WARRIOR" />
                <PillarBadge pillar="BUILDER" />
                <PillarBadge pillar="TYCOON" />
                <PillarBadge pillar="MIND" />
              </div>
              <div className="flex flex-wrap gap-2">
                {ranks.map((r) => (
                  <RankBadge key={r.slug} slug={r.slug} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">Posted</Badge>
                <Badge tone="danger">Reversed</Badge>
                <Badge>Draft</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fields</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Username" htmlFor="sg-user" hint="Public. Letters, numbers, underscores.">
                <Input id="sg-user" placeholder="e.g. iron_ledger" />
              </Field>
              <Field label="Email" htmlFor="sg-email" error="This email is already enrolled.">
                <Input id="sg-email" defaultValue="member@tycoonhood" aria-invalid />
              </Field>
              <Field label="Goal" htmlFor="sg-goal">
                <Textarea id="sg-goal" placeholder="What are you building this quarter?" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress & identity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <XpBar level={4} currentXp={4120} levelFloorXp={3000} nextLevelXp={5000} />
              <Progress value={62} />
              <div className="flex items-center gap-3">
                <Avatar name="Monkey Founder" size={44} />
                <Avatar name="Iron Ledger" />
                <Avatar name="A" size={28} />
                <div className="ml-2">
                  <p className="text-[14px] font-semibold">Monkey Founder</p>
                  <p className="text-[12px] text-ink-3">Member since day zero</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 04 — In situ, on live data */}
      <section>
        <SectionRule label="04 · In situ — live catalog data" className="mb-6" />
        <div className="grid gap-4 md:grid-cols-5">
          <Card variant="gold" className="md:col-span-3">
            <CardHeader>
              <CardTitle>Programs</CardTitle>
              <CardDescription>
                Straight from PostgreSQL — the four launch programs as seeded.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="display text-[16px]">{c.title}</p>
                    <p className="truncate text-[12px] text-ink-3">{c.subtitle}</p>
                  </div>
                  <PillarBadge pillar={c.pillar} />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Badge>Draft — content pending</Badge>
              <span className="text-[12px] text-ink-3">Publishing flow arrives in Phase 5</span>
            </CardFooter>
          </Card>

          <Card variant="raised" className="md:col-span-2">
            <CardHeader>
              <CardTitle>Economy</CardTitle>
              <CardDescription>Provable balances, live.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Stat
                label="Treasury"
                value={<ThcAmount amount={treasury?.balance ?? 0n} size="lg" />}
              />
              <Stat
                label="Rewards pool"
                value={<ThcAmount amount={pool?.balance ?? 0n} size="lg" />}
              />
              <div className="flex items-center gap-2 rounded-md border border-line bg-bg-0 p-3">
                <CoinMark size={18} />
                <p className="text-[12px] text-ink-3">
                  Every figure here is the cached balance of a double-entry
                  account, auditable against its entries.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="mt-16 border-t border-line pt-6">
        <p className="text-[12px] text-ink-3">
          Tycoonhood design system · Phase 2 · Tokens live in{" "}
          <span className="figures">packages/ui/src/tokens.css</span>
        </p>
      </footer>
    </main>
  );
}
