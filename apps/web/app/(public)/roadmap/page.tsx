import Link from "next/link";
import type { Metadata } from "next";
import { Badge, SectionRule } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Roadmap" };

// Kept true against PROJECT_STATUS.md — "shipped" means built and verified,
// not deployed. Nothing here has served a real member yet.
const phases: [string, string, "done" | "now" | "next"][] = [
  ["Foundation", "The schema, the double-entry THC ledger, the XP engine — all tested before anything was visible.", "done"],
  ["Membership", "Accounts, device-aware sessions, password reset, onboarding that pays your first mission.", "done"],
  ["The academy", "Course player, lesson progress, quizzes and certificates with public serials.", "done"],
  ["The game", "Missions, challenges, achievements, streaks, ranks, the leaderboard and the Command Center.", "done"],
  ["The wallet", "Full THC history, audited against the ledger on every visit.", "done"],
  ["The Vault", "Checkout in THC, sized gear with real stock, delivery addresses and tracking.", "done"],
  ["The Miner", "A separate phone-first app: idle mining from a finite pool, watch-to-earn, invites that pay on real work.", "done"],
  ["The HQ", "The house rebuilt as one world — the 3D headquarters, the Command Center, a room for every part of the product.", "done"],
  ["Authoring in the admin", "Courses, lessons and challenges written in the admin instead of seeded by script.", "now"],
  ["Hardening & launch", "Security review, performance, deployment. Doors open.", "now"],
  ["Membership tiers", "Paid tiers and subscriptions — the business model. Not built yet.", "next"],
  ["On-chain, maybe", "Only after utility is proven and counsel signs off. Utility before speculation.", "next"],
];

export default function RoadmapPage() {
  return (
    <main className="mx-auto max-w-3xl px-[var(--gutter)] py-16 md:py-24">
      <p className="eyebrow mb-3">Roadmap</p>
      <h1 className="display text-h1">
        Built in the open, <span className="accent">in order.</span>
      </h1>
      <p className="mt-4 max-w-xl text-ink-2">
        Each phase ships working and tested before the next begins. &ldquo;Shipped&rdquo; means built and
        verified — the house has not opened its doors yet. Live figures are on the{" "}
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
