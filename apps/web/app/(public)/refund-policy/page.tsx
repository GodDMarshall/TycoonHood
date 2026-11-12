import type { Metadata } from "next";
import Link from "next/link";
import { AFFILIATE_HOLD_DAYS } from "@tycoonhood/config";
import { LegalPage, Clause } from "../../../components/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When you can get your money (or THC) back for something bought on Tycoonhood, and how to ask.",
  alternates: { canonical: "/refund-policy" },
};

const L = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

/** Consistent with Terms clause 4. Pending legal review — see the banner LegalPage renders. */
export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund Policy"
      updated="11 November 2026"
      intro="When you can get your money or THC back, and how to ask. Plain rules, the same for everyone."
    >
      <Clause n="1" heading="How to ask">
        <p>
          Open your{" "}
          <Link href="/orders" className={L}>orders</Link> and request a refund on the order, or write to us through the{" "}
          <Link href="/contact" className={L}>contact page</Link> with the order and the reason. A person reviews every request and replies by email.
        </p>
      </Clause>

      <Clause n="2" heading="Physical goods">
        <p>
          If an item arrives damaged, is not what was described, or does not arrive, tell us within 30 days of the order and we will replace it or refund it.
          We may ask for a photo.
        </p>
      </Clause>

      <Clause n="3" heading="Digital products and course access">
        <p>
          These are delivered immediately. If you have not opened or started what you bought, you can ask for a refund within {AFFILIATE_HOLD_DAYS} days of
          purchase. Once opened or started, they are not refundable — unless what you received is not what was described, in which case it is.
        </p>
      </Clause>

      <Clause n="4" heading="How refunds are paid">
        <p>
          Money is returned by the way you paid, through the same payment provider. Banks can take several working days to show it. Purchases made with THC are
          refunded in THC, recorded on the ledger like every other movement.
        </p>
        <p>
          A refunded order also reverses any affiliate commission it created — which is why commissions wait out a {AFFILIATE_HOLD_DAYS}-day window before they
          can be approved.
        </p>
      </Clause>

      <Clause n="5" heading="Test-mode orders">
        <p>
          While card payments run in test mode, no real money changes hands, so there is nothing to refund. Test orders are labelled as such and are never
          counted as sales.
        </p>
      </Clause>

      <Clause n="6" heading="Your statutory rights">
        <p>Nothing here takes away rights you have under the consumer law of your country. Where that law gives you more, it applies.</p>
      </Clause>
    </LegalPage>
  );
}
