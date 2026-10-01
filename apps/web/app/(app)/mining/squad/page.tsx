/**
 * YOUR SQUAD — ported from apps/miner/app/squad/page.tsx.
 *
 * The rule, from ReferralService: signing somebody up pays nothing; the
 * referrer and the invitee are both paid when the invitee finishes their
 * first lesson. Every figure here is read from referrals.summary.
 */
import type { Metadata } from "next";
import { referrals } from "@tycoonhood/core";
import { Badge, EmptyState, ThcAmount } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { PageHeader, Panel, SectionTitle } from "../../../../components/app/page";
import { InviteCode } from "../../../../components/mining/invite-code";

export const metadata: Metadata = { title: "Mining squad" };
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function MiningSquadPage() {
  // requireUser guarantees an onboarded member, which codeFor() needs.
  const user = await requireUser();
  const s = await referrals.summary(user.id);
  const link = `${SITE}/register?ref=${s.code}`;

  return (
    <>
      <PageHeader
        kicker="Your squad"
        title="Bring someone who will actually show up."
        description="Signing somebody up pays nothing. You both get paid when they finish their first lesson — so the only way to earn here is to bring someone real and help them start."
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <InviteCode code={s.code} link={link} />

          <div className="grid min-w-0 grid-cols-3 gap-3 text-center">
            <Panel as="div" className="min-w-0 px-2 py-3.5">
              <p className="text-[20px] font-semibold tabular-nums text-ink-1">{s.qualified}</p>
              <p className="mt-0.5 text-[12px] text-ink-3">Qualified</p>
            </Panel>
            <Panel as="div" className="min-w-0 px-2 py-3.5">
              <p className="text-[20px] font-semibold tabular-nums text-ink-1">{s.pending}</p>
              <p className="mt-0.5 text-[12px] text-ink-3">Started</p>
            </Panel>
            <Panel as="div" className="min-w-0 px-2 py-3.5">
              <p className="truncate text-[20px] font-semibold tabular-nums text-ink-1">{s.earned.toLocaleString("en-US")}</p>
              <p className="mt-0.5 text-[12px] text-ink-3">THC earned</p>
            </Panel>
          </div>

          <div className="rounded-xl border border-gold-deep/60 bg-bg-1 p-5 shadow-[var(--shadow-gold)]">
            <p className="text-[14px] leading-relaxed text-ink-1">
              <ThcAmount amount={s.perInvite} size="sm" /> to you, and <ThcAmount amount={s.welcomeBonus} size="sm" /> to
              them, the moment they finish their first lesson.
            </p>
          </div>
        </div>

        <section aria-labelledby="squad-who" className="min-w-0">
          <SectionTitle id="squad-who">Who you brought</SectionTitle>
          {s.invites.length === 0 ? (
            <EmptyState icon="network" title="Nobody yet." body="Send the link to one person who would use this." />
          ) : (
            <Panel as="ul" className="px-4">
              {s.invites.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
                  <span className="min-w-0 truncate text-[14px] text-ink-1">{i.name}</span>
                  <Badge tone={i.status === "QUALIFIED" ? "success" : "neutral"}>
                    {i.status === "QUALIFIED" ? "Paid" : "Not started"}
                  </Badge>
                </li>
              ))}
            </Panel>
          )}
          <p className="mt-6 text-[12px] leading-relaxed text-ink-3">
            One referrer per member, for life. You cannot invite yourself, and a second code never overwrites the
            first.
          </p>
        </section>
      </div>
    </>
  );
}
