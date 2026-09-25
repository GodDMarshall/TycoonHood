import Link from "next/link";
import type { Metadata } from "next";
import { Badge, SectionRule } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Roadmap" };

const phases: [string, string, "done" | "now" | "next"][] = [
  ["Foundation", "The schema, the double-entry THC ledger, the XP engine — all tested before anything was visible.", "done"],
  ["Design system", "The house style: vault palette, engraved type, ledger figures, the coin mark.", "done"],
  ["Membership", "Accounts, device-aware sessions, onboarding that pays your first mission.", "done"],
  ["Public site", "Everything you are reading now — programs, challenges, the open books.", "done"],
  ["The academy", "Course player, lesson progress, quizzes, certificates. Programs go live.", "next"],
  ["The game", "Challenge engine, achievements, streaks, leaderboards, the full dashboard.", "next"],
  ["The wallet", "Full THC history, transfers, and the economy dashboard.", "next"],
  ["The marketplace", "Checkout in THC and currency. Orders, fulfillment, refunds — all on the ledger.", "next"],
  ["The community", "Discord linked to your rank, with rewards for showing up.", "next"],
  ["The admin house", "Content, economy, and member management for the team.", "next"],
  ["Hardening & launch", "Security review, performance, deployment. Doors open.", "next"],
  ["On-chain, maybe", "Only after utility is proven and counsel signs off. Utility before speculation.", "next"],
];

export default function RoadmapPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow mb-3">Roadmap</p>
      <h1 className="display text-[40px] leading-tight">Built in the open, in order.</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        Each phase ships working and tested before the next begins. Live status
        of the foundation is on the{" "}
        <Link href="/status" className="text-gold hover:underline underline-offset-4">
          open books
        </Link>{" "}
        page.
      </p>
      <SectionRule className="my-10" />
      <ol className="flex flex-col">
        {phases.map(([title, body, state], i) => (
          <li key={title} className="flex gap-5 border-b border-line py-5 last:border-0">
            <span className="figures w-8 shrink-0 pt-0.5 text-[13px] text-gold-deep">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="display text-[19px]">{title}</h2>
                {state === "done" && <Badge tone="success">Shipped</Badge>}
                {state === "now" && <Badge tone="gold">In progress</Badge>}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
