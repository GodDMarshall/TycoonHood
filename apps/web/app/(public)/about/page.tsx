import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { RankBadge, SectionRule } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "About" };
export const dynamic = "force-dynamic";

const principles = [
  ["Progress you can prove", "Everything you do here is recorded, rewarded, and rankable. If it is not on the ledger, it did not happen."],
  ["Failure states are features", "Challenges can be failed and streaks can break. Standards that cannot be missed are not standards."],
  ["The house plays by house rules", "Fixed supply. Open books. Visible corrections. The system constrains us before it constrains you."],
  ["Utility before speculation", "THC exists to be earned and spent. Anything beyond that waits for proof and legal sign-off, in that order."],
] as const;

export default async function AboutPage() {
  const ranks = await prisma.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow mb-3">About</p>
      <h1 className="display text-[40px] leading-tight">A house with standards.</h1>
      <p className="mt-4 leading-relaxed text-ink-2">
        Tycoonhood is a membership for people building all four things at once:
        a capable body, a working business, growing capital, and a mind that
        can carry them. Programs teach, missions and challenges make you do,
        the ledger keeps the score, and ranks make the score mean something.
      </p>

      <SectionRule label="Principles" className="mb-6 mt-12" />
      <div className="flex flex-col gap-6">
        {principles.map(([title, body]) => (
          <div key={title}>
            <h2 className="display text-[19px]">{title}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{body}</p>
          </div>
        ))}
      </div>

      <SectionRule label="The path" className="mb-6 mt-12" />
      <div className="flex flex-wrap items-center gap-3">
        {ranks.map((r, i) => (
          <span key={r.id} className="flex items-center gap-3">
            <RankBadge slug={r.slug} />
            {i < ranks.length - 1 && <span aria-hidden className="text-ink-3">→</span>}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
        {ranks.map((r) => r.description).filter(Boolean).join(" ")}
      </p>
    </main>
  );
}
