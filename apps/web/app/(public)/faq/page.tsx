import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SectionRule } from "@tycoonhood/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Straight answers about learning, certificates, earning, the shop, payments, THC and the community on Tycoonhood.",
  alternates: { canonical: "/faq" },
};

const L = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

const groups: [string, [string, ReactNode][]][] = [
  [
    "The basics",
    [
      ["What is Tycoonhood?", "A mission-driven ecosystem for self-development: structured learning programmes, an affiliate programme, a shop and a community, built around discipline, real skills and honest work."],
      ["What does it cost?", "Joining is free. Any price for a programme or product is shown clearly before you commit to it."],
      ["Do I need to confirm my email?", "Yes, please — we send a link when you join. You can start learning straight away; some features, like the affiliate programme, need a confirmed email."],
      ["Do I need special equipment or 3D graphics?", "No. Tycoonhood runs in any modern browser on a phone or computer. Nothing requires a powerful device or 3D hardware."],
    ],
  ],
  [
    "Learning and certificates",
    [
      ["How do programmes work?", <>Each programme is a sequence of lessons. A lesson opens when the one before it is done, so there is always one clear next step. Browse them on <Link href="/learning" className={L}>Learning</Link>.</>],
      ["Are there tests?", "Knowledge checks follow key lessons. Answers are explained, and you can retry."],
      ["Do I get a certificate?", <>When you complete a programme, you receive a certificate with a public serial number that anyone can verify on Tycoonhood. Certificates record completion on Tycoonhood; they are not accredited qualifications.</>],
      ["Is any of this professional advice?", "No. Lessons on money, business, training and the mind are educational. Talk to a qualified professional before making financial, legal or health decisions."],
    ],
  ],
  [
    "Earning",
    [
      ["Can I earn money with Tycoonhood?", <>Approved members of the <Link href="/earn" className={L}>affiliate programme</Link> earn a commission on purchases made through their link, after the refund window closes. <strong className="text-ink-1">There is no guaranteed income.</strong> Many affiliates earn little or nothing; results depend entirely on your own effort.</>],
      ["How do I join the affiliate programme?", <>Confirm your email, apply from the Earn page and accept the <Link href="/earn/terms" className={L}>affiliate terms</Link>. Applications are reviewed before your link goes live.</>],
      ["When are commissions paid?", "Each commission is held through the refund window, then reviewed. Approved commissions can be paid out once they reach the minimum payout shown on your earnings page."],
    ],
  ],
  [
    "Shop and payments",
    [
      ["What can I buy?", <>Merchandise and learning products in the <Link href="/marketplace" className={L}>marketplace</Link>. Some items can be paid for with THC, some with money, some with either.</>],
      ["What does “test mode” mean at checkout?", "Until live card payments are switched on, checkout may run in a clearly labelled test mode. No real money moves in test mode, and test orders are never counted as sales."],
      ["Can I get a refund?", <>Yes, in the cases set out in the <Link href="/refund-policy" className={L}>Refund Policy</Link>: damaged or missing physical items, unopened digital items within the window, and anything not as described.</>],
    ],
  ],
  [
    "THC",
    [
      ["What is THC?", "Internal utility credits you earn by doing verified work — lessons, challenges, the daily standard — and spend inside Tycoonhood."],
      ["Is THC money or a cryptocurrency?", <>No. THC is not money, not a cryptocurrency, not an investment, and cannot be cashed out, withdrawn or exchanged for currency. It runs on our own ledger. Read more on <Link href="/thc" className={L}>how THC works</Link>.</>],
    ],
  ],
  [
    "Community and your data",
    [
      ["Where is the community?", <>Inside Tycoonhood: discussions, groups, channels and challenges. See <Link href="/connect" className={L}>Community</Link>. It is moderated, and reports go to staff.</>],
      ["Who can see my profile?", "You choose. Your settings control whether your level, rank and streak are shown. Your email, orders and addresses are never public."],
      ["How do I delete my account?", <>From Settings, or through the <Link href="/contact" className={L}>contact page</Link>. The <Link href="/privacy" className={L}>Privacy Policy</Link> explains exactly what is removed and what is anonymised.</>],
    ],
  ],
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-[var(--gutter)] py-16 md:py-24">
      <p className="eyebrow mb-3">FAQ</p>
      <h1 className="display text-h1">Straight answers.</h1>
      <p className="mt-4 text-[15px] text-ink-2">
        Can&rsquo;t find yours?{" "}
        <Link href="/contact" className={L}>
          Ask us
        </Link>
        .
      </p>
      {groups.map(([title, faqs]) => (
        <section key={title} aria-label={title}>
          <SectionRule label={title} className="mb-2 mt-12" />
          <dl className="flex flex-col">
            {faqs.map(([q, a]) => (
              <div key={q} className="border-b border-line py-6 last:border-0">
                <dt className="display text-[19px]">{q}</dt>
                <dd className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
