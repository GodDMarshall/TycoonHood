import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Clause } from "../../../components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "What you agree to by using Tycoonhood, in plain language.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="24 September 2026"
      intro="What you agree to by using Tycoonhood. Written to be read, not to be skipped."
    >
      <Clause n="1" heading="Who we are, and what this is">
        <p>
          Tycoonhood is a membership platform for structured self-development: programs,
          challenges, a progress record, and an internal credit called THC. Using the site
          or the Miner app means you accept these terms.
        </p>
        <p>
          You must be 18 or older to hold an account. If you are not, do not create one.
        </p>
      </Clause>

      <Clause n="2" heading="Your account">
        <p>
          One account per person. You are responsible for what happens under yours, so keep
          your password to yourself. If you think someone else has it, change it immediately
          and tell us.
        </p>
        <p>
          You can delete your account at any time by asking. Deletion removes your profile
          and your personal details. It does not remove ledger entries, because the ledger is
          append-only by design — those rows are anonymised rather than deleted, so the books
          still balance. This is explained again in the{" "}
          <Link href="/privacy" className="text-gold underline-offset-4 hover:underline">Privacy Policy</Link>.
        </p>
      </Clause>

      <Clause n="3" heading="THC is not money">
        <p>
          THC are internal utility credits. They exist only inside Tycoonhood, on our own
          ledger. The total supply is fixed at one quadrillion and is publicly auditable on
          the{" "}
          <Link href="/status" className="text-gold underline-offset-4 hover:underline">open books</Link>.
        </p>
        <p>
          THC is <strong className="text-ink-1">not</strong> currency, a security, an
          investment, a financial instrument, or a cryptocurrency. It is not redeemable for
          money, cannot be withdrawn, cannot be transferred between members, and has no
          value outside this platform. We make no promise that it ever will. Nobody at
          Tycoonhood will ever tell you that holding THC will make you money, because it
          will not.
        </p>
        <p>
          We may change how THC is earned or what it buys. We will not retroactively take
          away credits you have already earned, except where they were obtained by
          breaking clause 5.
        </p>
      </Clause>

      <Clause n="4" heading="Buying things">
        <p>
          Some items are bought with THC, some with money, some with either. The price shown
          at checkout is the price you pay.
        </p>
        <p>
          <strong className="text-ink-1">Physical goods.</strong> We need a delivery address
          before you can order one. We send a tracking number when it ships. If it arrives
          damaged or does not arrive, tell us within 30 days and we will replace it or refund
          it.
        </p>
        <p>
          <strong className="text-ink-1">Digital goods and course access.</strong> Delivered
          immediately, so they are not refundable once opened — unless the thing you bought is
          not what was described, in which case it is.
        </p>
        <p>
          <strong className="text-ink-1">Refunds in THC</strong> are returned as THC. A refund
          of money is returned by the way you paid.
        </p>
      </Clause>

      <Clause n="5" heading="What will get you removed">
        <p>
          The economy only works because earning is real. Do not: run more than one account,
          use bots or scripts to earn, fake challenge evidence, manipulate the referral
          system, or exploit a bug instead of reporting it.
        </p>
        <p>
          Also: no harassment, no scams, no hate, no spam, no selling to members in our
          community spaces without permission.
        </p>
        <p>
          If you do any of this we may suspend or remove your account and reverse credits
          earned that way. Reversals are recorded on the ledger like everything else — we do
          not quietly delete history.
        </p>
      </Clause>

      <Clause n="6" heading="What we teach is not professional advice">
        <p>
          Tycoonhood teaches business, discipline, training and money skills. None of it is
          financial, legal, medical, or psychological advice, and nobody here is acting as
          your adviser, doctor, lawyer or therapist.
        </p>
        <p>
          Before changing how you train, what you eat, how you invest, or how you structure
          a business, talk to someone qualified in your country. Decisions you make are yours.
        </p>
      </Clause>

      <Clause n="7" heading="Your content">
        <p>
          Challenge evidence, profile text and anything else you post stays yours. By posting
          it you let us store it, show it where you have chosen to make it visible, and use it
          to run the platform. Nothing more.
        </p>
        <p>
          Our content — programs, lessons, the design, the code — stays ours. Use it to learn.
          Do not resell it or republish it as your own.
        </p>
      </Clause>

      <Clause n="8" heading="Availability, and what we do not promise">
        <p>
          We will try to keep the platform up, and we will tell you when something is broken
          rather than pretend it is not. We do not promise it will never go down, never lose
          a request, or always be available in your country.
        </p>
        <p>
          We do not promise outcomes. Nobody can promise you will get fit, get rich, or build
          a business. What we promise is that the record of what you actually did will be
          accurate.
        </p>
      </Clause>

      <Clause n="9" heading="Changes">
        <p>
          We may change these terms. If a change matters — pricing, how THC works, what we do
          with your data — we will tell members directly rather than silently updating this
          page. The date at the top always reflects the current version.
        </p>
      </Clause>

      <Clause n="10" heading="Ending it">
        <p>
          You can stop using Tycoonhood whenever you want. We can close an account that
          breaks clause 5. If we close yours without cause, you keep access to anything you
          paid money for, or we refund it.
        </p>
      </Clause>
    </LegalPage>
  );
}
