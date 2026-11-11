import type { Metadata } from "next";
import Link from "next/link";
import { AFFILIATE_HOLD_DAYS, AFFILIATE_RATE_BPS, MIN_PAYOUT_CENTS, REFERRAL } from "@tycoonhood/config";
import { LegalPage, Clause } from "../../../../components/legal-page";
import { inr } from "../../../../components/earn/format";

export const metadata: Metadata = {
  title: "Affiliate & Referral Terms",
  description: "The rules of the Tycoonhood affiliate programme and THC referrals, in plain language.",
  alternates: { canonical: "/earn/terms" },
};

const rate = `${AFFILIATE_RATE_BPS / 100}%`;
const link = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

export default function AffiliateTermsPage() {
  return (
    <LegalPage
      eyebrow="Legal · Pending legal review"
      title="Affiliate & Referral Terms"
      updated="11 November 2026"
      intro="The rules for earning a commission on sales you refer, and for THC referral rewards. They describe what the platform actually does."
    >
      <Clause n="1" heading="Two separate things">
        <p>
          <strong className="text-ink-1">The affiliate programme</strong> pays money (Indian rupees) as a commission on
          paid orders made through your link. You must apply and be approved.
        </p>
        <p>
          <strong className="text-ink-1">Referrals</strong> pay THC, an internal credit that is not money, when a member
          you invited finishes their first lesson: {REFERRAL.referrerReward.toLocaleString("en-US")} THC to you and{" "}
          {REFERRAL.referredReward.toLocaleString("en-US")} THC to them. THC cannot be cashed out. See the{" "}
          <Link href="/terms" className={link}>Terms of Service</Link>.
        </p>
      </Clause>

      <Clause n="2" heading="No guaranteed income">
        <p>
          Joining does not entitle you to any payment. You earn only when someone you referred pays for an order. You
          may earn nothing. We make no promise about how much anyone will earn, and nobody is authorised to make one
          on our behalf.
        </p>
        <p>
          There is no fee to join and nothing to buy. There are no rewards for recruiting other affiliates, and no
          commissions on other affiliates&apos; sales.
        </p>
      </Clause>

      <Clause n="3" heading="Who can apply">
        <p>
          You need a Tycoonhood account with a verified email address, and you must be 18 or older. You describe where
          you will share your link and give a UPI ID or an Indian bank account for payouts. An admin reviews every
          application and may approve, decline or later suspend an account, with a reason.
        </p>
      </Clause>

      <Clause n="4" heading="How a sale is credited to you">
        <p>
          When someone opens your link, their browser remembers your code for 30 days. If they open a different
          affiliate&apos;s link afterwards, the most recent one is used. The code is attached to an order when it is
          placed.
        </p>
        <p>
          We record that a click happened, the page it led to and the referring site. We do not store the visitor&apos;s
          IP address; we store a one-way hash that changes every day, used only to count each visitor once per day
          and to detect abuse.
        </p>
      </Clause>

      <Clause n="5" heading="Commission">
        <p>
          The commission is {rate} of the order total after discounts, on orders paid in rupees. Orders paid only in
          THC, free orders, and orders you place yourself earn nothing. Amounts are rounded down to the paisa.
        </p>
        <p>
          Each commission is held for {AFFILIATE_HOLD_DAYS} days in case of a refund, then reviewed by an admin. If the
          order is refunded or cancelled, the commission is reversed. We may reject a commission that breaks these
          terms, and we tell you why.
        </p>
      </Clause>

      <Clause n="6" heading="Payouts">
        <p>
          You can request a payout once you have at least {inr(MIN_PAYOUT_CENTS)} of approved commissions. You can have
          one payout request open at a time. Payouts are reviewed and sent by a person, by UPI or bank transfer, and
          you receive the payment reference.
        </p>
        <p>
          If an order is refunded after its commission was paid to you, we will contact you to recover that amount.
          You are responsible for declaring and paying any tax on what you earn. We may ask for details needed to
          meet our own legal obligations before paying.
        </p>
      </Clause>

      <Clause n="7" heading="What is not allowed">
        <p>
          Buying through your own link, or having others do it for you. Creating accounts to place orders. Spam,
          misleading claims, or presenting yourself as Tycoonhood. Promising anyone income, results or returns.
          Bidding on our name in paid search. Coupon or cashback sites, unless we agree in writing.
        </p>
        <p>
          Commissions that look like any of these are flagged for review. Breaking these rules can mean rejected
          commissions and a suspended or closed affiliate account.
        </p>
      </Clause>

      <Clause n="8" heading="Changes and ending">
        <p>
          We may change the rate, hold period or minimum payout. Changes apply to commissions created after the
          change, never to ones that already exist. You can stop at any time; approved commissions stay yours and can be
          requested once they reach the minimum.
        </p>
      </Clause>
    </LegalPage>
  );
}
