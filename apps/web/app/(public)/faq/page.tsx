import type { Metadata } from "next";
import { SectionRule } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "FAQ" };

const faqs: [string, string][] = [
  ["What is Tycoonhood?", "A membership platform that trains four pillars — body, business, capital, mind — through structured programs, verifiable challenges, and an internal economy that records everything you earn."],
  ["What does it cost?", "Creating an account is free, and your first mission pays you. Program pricing goes live with the marketplace; some access will be purchasable with THC you have earned."],
  ["What is THC?", "Internal utility credits with a fixed supply of one quadrillion, moved only by double-entry ledger transactions. You earn THC by completing verified work and spend it inside Tycoonhood."],
  ["Can I cash out THC?", "No. THC is not money, not an investment, and not redeemable or exchangeable for currency — by design, and stated everywhere. Utility before speculation."],
  ["Is THC a cryptocurrency?", "No. It runs on our own audited ledger. If it ever moves on-chain, that happens only after the utility is proven and legal review is complete."],
  ["When do the programs open?", "The four programs are structured and in content production now; the course player ships in the next phase of the public roadmap. Members are notified the moment lessons go live."],
  ["How do ranks work?", "XP from lessons, missions, and challenges accumulates into levels; levels unlock the five ranks from Initiate to Legend. Thresholds are public and identical for everyone."],
  ["Can challenges actually be failed?", "Yes. Challenges have deadlines and criteria, and the record keeps failures as well as completions. Standards you cannot miss are not standards."],
  ["Where is the community?", "Discord and Telegram integration — with rank-linked roles and participation rewards — ships in a later phase. The Journal carries announcements until then."],
  ["Who can see my profile?", "You control it. Privacy settings cover your level, rank, achievements, streak, courses, and THC individually; several are private by default."],
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow mb-3">FAQ</p>
      <h1 className="display text-[40px] leading-tight">Straight answers.</h1>
      <SectionRule className="my-10" />
      <dl className="flex flex-col">
        {faqs.map(([q, a]) => (
          <div key={q} className="border-b border-line py-6 last:border-0">
            <dt className="display text-[19px]">{q}</dt>
            <dd className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{a}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
