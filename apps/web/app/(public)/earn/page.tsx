/**
 * EARN — the public explanation of every way to earn on Tycoonhood.
 *
 * Every number on this page comes from @tycoonhood/config, the same
 * constants the affiliate service uses, so the worked example cannot drift
 * from what is actually paid. No income claims, no recruitment rewards, and
 * opportunities that do not exist yet say so.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AFFILIATE_HOLD_DAYS, AFFILIATE_RATE_BPS, MIN_PAYOUT_CENTS, REFERRAL } from "@tycoonhood/config";
import { Badge, SectionRule, buttonStyles, cn } from "@tycoonhood/ui";
import { RoomHeader } from "../../../components/room-header";
import { getCurrentUser } from "../../../lib/auth";
import { inr } from "../../../components/earn/format";

export const metadata: Metadata = {
  title: "Earn",
  description:
    "How earning works on Tycoonhood: an affiliate commission on paid orders, THC for referrals that lead to real study, and challenges. No guaranteed income.",
  alternates: { canonical: "/earn" },
};
export const dynamic = "force-dynamic";

const rate = `${AFFILIATE_RATE_BPS / 100}%`;
const link = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

// The worked example: one order, a coupon, the real rate.
const EX_TOTAL = 249_900;
const EX_DISCOUNT = 25_000;
const EX_BASE = EX_TOTAL - EX_DISCOUNT;
const EX_COMMISSION = Math.floor((EX_BASE * AFFILIATE_RATE_BPS) / 10_000);

type Opportunity = {
  title: string;
  status: "Open" | "Members" | "Not open yet" | "Later";
  pays: string;
  body: ReactNode;
};

const opportunities: Opportunity[] = [
  {
    title: "Affiliate programme",
    status: "Open",
    pays: "Money (INR)",
    body: (
      <>
        Share your link. When someone buys through it and the order is paid, you earn {rate} of the order after
        discounts. Apply from <Link href="/earnings" className={link}>Earnings</Link>; an admin reviews every
        application.
      </>
    ),
  },
  {
    title: "Referrals",
    status: "Members",
    pays: "THC",
    body: (
      <>
        Invite someone to the academy. Signing up pays nothing. When they finish their first lesson you receive{" "}
        {REFERRAL.referrerReward.toLocaleString("en-US")} THC and they receive {REFERRAL.referredReward.toLocaleString("en-US")} THC.
        THC is an internal credit, not money. Your invite code is in <Link href="/mining/squad" className={link}>Mining → Squad</Link>.
      </>
    ),
  },
  {
    title: "Creator opportunities",
    status: "Not open yet",
    pays: "—",
    body: "Approved affiliates are marked as creators on their account. There are no paid creator briefs today. When there are, they will be listed here with what they pay before anyone signs up.",
  },
  {
    title: "Community challenges",
    status: "Members",
    pays: "THC and XP",
    body: (
      <>
        Time-boxed challenges in <Link href="/challenges" className={link}>Challenges</Link> pay THC and XP for
        verified completion. They do not pay money.
      </>
    ),
  },
  {
    title: "Approved reward campaigns",
    status: "Not open yet",
    pays: "—",
    body: "From time to time the house may run a reward campaign with its own published rules. None is running now. A campaign only counts if it is announced on Tycoonhood itself.",
  },
  {
    title: "Digital product opportunities",
    status: "Open",
    pays: "Money (INR)",
    body: `Digital products in the Store are covered by the affiliate commission like any other paid order. Selling your own digital product on Tycoonhood is not open.`,
  },
  {
    title: "Marketplace seller",
    status: "Later",
    pays: "—",
    body: "Selling your own goods in the Store is not available. Applications open later; we will not take sign-ups before it exists.",
  },
  {
    title: "Future partner opportunities",
    status: "Later",
    pays: "—",
    body: "Nothing to announce. If partnerships open, the terms will be published here first.",
  },
];

const tone = { Open: "success", Members: "gold", "Not open yet": "neutral", Later: "neutral" } as const;

export default async function EarnPage() {
  const user = await getCurrentUser();
  const cta = user ? { href: "/earnings", label: "Go to Earnings" } : { href: "/register", label: "Create an account" };

  return (
    <main>
      <RoomHeader
        icon="wallet"
        room="Earn"
        title="Earn from real sales."
        accent="Nothing else."
        lead={`Tycoonhood pays a ${rate} affiliate commission when someone buys through your link and the order is paid. Clicks, signups and recruiting other affiliates pay nothing.`}
      >
        <Link href={cta.href} className={buttonStyles({ size: "lg" })}>
          {cta.label}
        </Link>
        <Link href="/earn/terms" className={buttonStyles({ variant: "outline", size: "lg" })}>
          Read the terms
        </Link>
      </RoomHeader>

      <div className="mx-auto max-w-3xl px-[var(--gutter)] pb-24">
        <div role="note" className="mt-12 rounded-lg border border-gold-deep/60 bg-gold/5 px-5 py-4">
          <p className="text-[15px] font-semibold text-gold-bright">No guaranteed income.</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
            You may earn nothing. What you earn here depends entirely on people choosing to buy something. We do not publish earnings claims, and anyone who promises you a figure for
            joining is not speaking for Tycoonhood.
          </p>
        </div>

        <SectionRule label="Ways to earn" className="mb-6 mt-14" />
        <ul className="flex flex-col gap-3">
          {opportunities.map((o) => (
            <li key={o.title} className="rounded-lg border border-line bg-bg-1 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[16px] font-semibold text-ink-1">{o.title}</h2>
                <span className="flex items-center gap-2">
                  <span className="text-[12px] text-ink-3">{o.pays}</span>
                  <Badge tone={tone[o.status]}>{o.status}</Badge>
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{o.body}</p>
            </li>
          ))}
        </ul>

        <SectionRule label="Who can join" className="mb-6 mt-14" />
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[14px] leading-relaxed text-ink-2">
          <li>A Tycoonhood account with a verified email address. You must be 18 or older.</li>
          <li>A real place you intend to share your link, described in your application.</li>
          <li>A UPI ID or an Indian bank account for payouts.</li>
          <li>An admin approves each application by hand and can decline or suspend with a reason.</li>
        </ul>

        <SectionRule label="How a commission works" className="mb-6 mt-14" />
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed text-ink-2">
          <li>Someone opens your link. We remember it on their browser for 30 days. If they open another affiliate&apos;s link later, that one counts instead.</li>
          <li>They buy something and pay in rupees. Orders paid only in THC have no money value and earn nothing.</li>
          <li>A pending commission of {rate} of the order after discounts is created. Buying through your own link earns nothing.</li>
          <li>It is held for {AFFILIATE_HOLD_DAYS} days in case the order is refunded. A refund cancels it.</li>
          <li>After the hold, an admin reviews and approves or rejects it. Rejections come with a reason.</li>
          <li>Once {inr(MIN_PAYOUT_CENTS)} or more is approved, you can request a payout.</li>
        </ol>

        <div className="mt-6 overflow-hidden rounded-lg border border-line">
          <p className="border-b border-line bg-bg-1 px-5 py-3 text-[13px] font-medium text-ink-1">Worked example</p>
          <dl className="divide-y divide-line text-[14px]">
            {[
              ["Order total", inr(EX_TOTAL)],
              ["Coupon discount", `− ${inr(EX_DISCOUNT)}`],
              ["Commissionable amount", inr(EX_BASE)],
              [`Commission at ${rate}`, inr(EX_COMMISSION)],
            ].map(([k, v], i, all) => (
              <div key={k} className={cn("flex items-baseline justify-between gap-4 px-5 py-2.5", i === all.length - 1 && "bg-gold/5")}>
                <dt className="text-ink-2">{k}</dt>
                <dd className={cn("figures", i === all.length - 1 ? "text-gold-bright" : "text-ink-1")}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-ink-3">
            The example is arithmetic, not a forecast. Amounts are rounded down to the paisa.
          </p>
        </div>

        <SectionRule label="Payouts" className="mb-6 mt-14" />
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[14px] leading-relaxed text-ink-2">
          <li>Minimum payout: {inr(MIN_PAYOUT_CENTS)} of approved commissions. One request open at a time.</li>
          <li>Paid by UPI or bank transfer in Indian rupees, by a person, after approval. You get the payment reference.</li>
          <li>If an order is refunded after its commission was paid, we will contact you about recovering it.</li>
          <li>You are responsible for any tax on what you earn.</li>
          <li>
            Payouts are made in money, never in THC. THC from referrals and challenges cannot be cashed out (see the{" "}
            <Link href="/thc" className={link}>THC page</Link>).
          </li>
        </ul>

        <SectionRule className="my-14" />
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[46ch] text-[14px] leading-relaxed text-ink-2">
            Read the full <Link href="/earn/terms" className={link}>Affiliate &amp; Referral Terms</Link> before applying.
          </p>
          <Link href={cta.href} className={buttonStyles({})}>
            {cta.label}
          </Link>
        </div>
      </div>
    </main>
  );
}
