import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Clause } from "../../../components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Exactly what Tycoonhood stores about you, why, and how to get rid of it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="24 September 2026"
      intro="Exactly what we store, why we store it, and how to get rid of it. This list was written from the database schema, not from a template."
    >
      <Clause n="1" heading="What we store, item by item">
        <p>Everything below is a real field in our database. Nothing is listed that we do not hold.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-3">
                <th className="py-2 pr-4 font-normal">What</th>
                <th className="py-2 pr-4 font-normal">Why</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              {[
                ["Email address", "Signing in, and password reset. Never sold, never shared."],
                ["Name and display name", "So the platform can address you and the leaderboard can name you."],
                ["Password", "Stored only as an Argon2id hash. We cannot read it, and neither can anyone who steals the database."],
                ["Username, bio, avatar URL", "Your public profile — and you control which parts are public."],
                ["Goals, interests, experience level", "The answers you gave at onboarding, used to recommend where to start."],
                ["Timezone", "So your streak and daily limits follow your day, not UTC's."],
                ["Course and lesson progress", "The record of what you have actually completed."],
                ["Quiz attempts and scores", "Certificates have to be verifiable."],
                ["Challenge participation and evidence", "What you submitted, and whether it was approved."],
                ["XP, level, rank, streak, achievements", "Your progress record."],
                ["Every THC movement", "The ledger. Double-entry, append-only, and the reason the supply is provable."],
                ["Orders, and delivery addresses on physical orders", "To take your money once and send you the thing."],
                ["Session records — device, browser, IP, last used", "So you can see where you are signed in and end a session you do not recognise."],
                ["Discord user ID, if you link it", "Only to sync your rank role. Unlinking removes it."],
                ["Which videos you watched, and for how long", "So watch-to-earn pays once, and cannot be farmed."],
                ["Who invited you, and who you invited", "So a referral pays exactly once, to the right person."],
              ].map(([what, why]) => (
                <tr key={what} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4 align-top text-ink-1">{what}</td>
                  <td className="py-2 pr-4 align-top">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Clause>

      <Clause n="2" heading="What we do not store">
        <p>
          <strong className="text-ink-1">Card numbers.</strong> Card payments, when enabled,
          go to Stripe. The card never touches our servers and we never see the number. We
          keep only Stripe&rsquo;s reference for the payment.
        </p>
        <p>
          <strong className="text-ink-1">Your password.</strong> Only an Argon2id hash, which
          cannot be reversed.
        </p>
        <p>
          <strong className="text-ink-1">Tracking you around the internet.</strong> No
          advertising pixels, no third-party analytics, no cross-site trackers, no data
          brokers. There is one cookie and it exists to keep you signed in.
        </p>
      </Clause>

      <Clause n="3" heading="The one cookie">
        <p>
          A single cookie named <code className="figures text-ink-1">th_session</code> holds
          a random session token. It is httpOnly, so page scripts cannot read it, and
          secure, so it only travels over HTTPS. It lasts 30 days and renews while you use
          the site.
        </p>
        <p>
          It is set on the parent domain so that one sign-in covers both the main site and
          the Miner. Sign out and it is destroyed on our side as well as removed from your
          browser. That is the entire cookie story — there is no banner because there is
          nothing to consent to beyond keeping you logged in.
        </p>
      </Clause>

      <Clause n="4" heading="Who else sees it">
        <p>Only the services we cannot run without, and only what each one needs:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong className="text-ink-1">Our database host</strong> — holds everything in clause 1, encrypted at rest.</li>
          <li><strong className="text-ink-1">Our hosting provider</strong> — runs the app and sees ordinary request logs.</li>
          <li><strong className="text-ink-1">Our email provider</strong> — receives your address to deliver a password-reset link. Nothing else.</li>
          <li><strong className="text-ink-1">Stripe</strong>, if you pay by card — handles the payment; we never see the card.</li>
          <li><strong className="text-ink-1">Discord</strong>, if you link it — receives only your rank, to set a role.</li>
        </ul>
        <p>
          We do not sell your data. We do not share it for advertising. There is no fourth
          category.
        </p>
      </Clause>

      <Clause n="5" heading="What is public, and what is not">
        <p>
          Your profile is yours to control. In{" "}
          <Link href="/settings" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">Settings</Link>{" "}
          you decide, item by item, whether your level, rank, achievements, streak, courses
          and THC balance are visible to anyone else.
        </p>
        <p>
          Your email address, your orders, your delivery address and your session list are
          never public, under any setting.
        </p>
      </Clause>

      <Clause n="6" heading="How long we keep it">
        <p>
          Your account data stays while your account exists. Session records expire after 30
          days of disuse. Password-reset tokens die after 30 minutes or first use, whichever
          comes first.
        </p>
        <p>
          Ledger entries are permanent. That is the point of a ledger — if rows could be
          deleted, the supply would not be provable and the open books would be theatre.
        </p>
      </Clause>

      <Clause n="7" heading="Deleting your account">
        <p>Ask us and we will, within 30 days:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>delete your email, name, username, bio, avatar and onboarding answers;</li>
          <li>delete your sessions, your Discord link, and your delivery addresses;</li>
          <li>remove your name from the leaderboard and your public profile;</li>
          <li>anonymise your ledger entries rather than delete them, so the books still balance.</li>
        </ul>
        <p>
          You can also ask for a copy of everything we hold about you, and we will send it in
          a readable format.
        </p>
      </Clause>

      <Clause n="8" heading="Security, honestly stated">
        <p>
          Passwords are hashed with Argon2id at OWASP-recommended parameters. Session tokens
          are 256 bits of cryptographic randomness and are stored hashed, so a stolen database
          does not hand over live sessions. Sign-in is rate-limited. Every admin action
          re-checks permission on the server.
        </p>
        <p>
          No system is perfect. If we ever discover a breach affecting your data, we will tell
          you what happened, what was taken, and when — not a vague notice weeks later.
        </p>
      </Clause>

      <Clause n="9" heading="Children">
        <p>
          Tycoonhood is for adults. We do not knowingly collect anything from anyone under 18.
          If you believe a minor has an account, tell us and we will remove it.
        </p>
      </Clause>

      <Clause n="10" heading="Changes">
        <p>
          If we start collecting something new, this page changes and members are told
          directly. The list in clause 1 is kept accurate against the actual database — if you
          find something we hold that is not listed, that is a bug in this page and we want to
          know.
        </p>
      </Clause>
    </LegalPage>
  );
}
