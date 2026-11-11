/**
 * EARNINGS — the member's side of the affiliate programme.
 *
 * Every figure is read from AffiliateService.summary and the member's own
 * commission and payout rows. Nothing here is projected or estimated: a
 * commission appears only after a real order is paid.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { affiliates, referrals } from "@tycoonhood/core";
import { AFFILIATE_HOLD_DAYS, AFFILIATE_RATE_BPS, MIN_PAYOUT_CENTS } from "@tycoonhood/config";
import { Badge, EmptyState, Notice, Stat, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel, SectionTitle } from "../../../components/app/page";
import { AffiliateRegisterForm } from "../../../components/earn/register-form";
import { CopyLink } from "../../../components/earn/copy-link";
import { ActionButton } from "../../../components/earn/action-form";
import { commissionLabel, commissionTone, dateFmt, inr, payoutLabel, payoutTone } from "../../../components/earn/format";
import { registerAffiliateAction, requestPayoutAction } from "./actions";

export const metadata: Metadata = { title: "Earnings" };
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const rate = `${AFFILIATE_RATE_BPS / 100}%`;
const link = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

export default async function EarningsPage() {
  const user = await requireUser();
  const [s, squad] = await Promise.all([
    affiliates.summary(user.id),
    referrals.summary(user.id).catch(() => null),
  ]);

  const header = (
    <PageHeader
      title="Earnings"
      description={`Earn a ${rate} commission when someone buys through your link and the order is paid. There is no guaranteed income, and nothing is paid for signups or clicks.`}
      actions={
        <Link href="/earn" className={buttonStyles({ variant: "ghost", size: "sm" })}>
          How it works
        </Link>
      }
    />
  );

  // ── Not applied yet (or rejected and free to apply again)
  if (!s || s.profile.status === "REJECTED") {
    const verified = Boolean(user.emailVerified);
    return (
      <Page width="narrow">
        {header}
        {s?.profile.status === "REJECTED" && (
          <Notice tone="warning" title="Your last application was not approved" className="mb-6">
            {s.profile.statusReason ? `Reason: ${s.profile.statusReason}. ` : ""}You can apply again with updated details.
          </Notice>
        )}
        {!verified && (
          <Notice tone="warning" title="Verify your email first" className="mb-6">
            Affiliates must have a verified email address so we can reach you about payouts.{" "}
            <Link href="/settings" className={link}>Go to Settings</Link> to verify it, then come back.
          </Notice>
        )}
        <Panel className="p-5 sm:p-6">
          <SectionTitle>Apply to the affiliate programme</SectionTitle>
          <p className="mb-5 text-[14px] leading-relaxed text-ink-2">
            An admin reviews every application. Once approved you get a referral link. Commissions are {rate} of a
            paid order after discounts, held {AFFILIATE_HOLD_DAYS} days for refunds, then reviewed. You can request a
            payout once {inr(MIN_PAYOUT_CENTS)} is approved.
          </p>
          <AffiliateRegisterForm action={registerAffiliateAction} disabled={!verified} />
        </Panel>
        {squad && <SquadCard squad={squad} />}
      </Page>
    );
  }

  const { profile } = s;

  // ── Waiting for review
  if (profile.status === "PENDING") {
    return (
      <Page width="narrow">
        {header}
        <EmptyState
          icon="clock"
          title="Your application is being reviewed."
          body={`Sent ${dateFmt.format(profile.termsAcceptedAt)}. An admin reviews applications by hand; you will get a notification when it is decided. Your link is not active until then.`}
        />
        {squad && <SquadCard squad={squad} />}
      </Page>
    );
  }

  const [commissions, payouts] = await Promise.all([affiliates.commissionsFor(user.id, 50), affiliates.payoutsFor(user.id, 50)]);
  const referralLink = `${SITE}/r/${profile.code}`;

  return (
    <Page>
      {header}

      {profile.status === "SUSPENDED" && (
        <Notice tone="warning" title="Your affiliate account is suspended" className="mb-6">
          {profile.statusReason ? `Reason: ${profile.statusReason}. ` : ""}Your link does not record clicks or earn
          commissions while suspended. Your history is below.
        </Notice>
      )}

      {profile.status === "APPROVED" && (
        <Panel className="mb-6 p-5">
          <SectionTitle>Your referral link</SectionTitle>
          <CopyLink link={referralLink} />
          <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
            Add <code className="figures text-ink-2">?to=/store</code> to send people to a specific page. A visit is
            remembered for 30 days on that browser. Buying through your own link earns nothing.
          </p>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Panel as="div" className="p-4">
          <Stat label="Clicks, last 30 days" value={s.clicks30d.toLocaleString("en-IN")} hint={`${s.clicksAll.toLocaleString("en-IN")} all time`} />
        </Panel>
        <Panel as="div" className="p-4">
          <Stat label="Paid orders" value={s.conversions.toLocaleString("en-IN")} hint="Attributed to your link" />
        </Panel>
        <Panel as="div" className="p-4">
          <Stat label="Pending" value={inr(s.totals.pending)} hint={`In the ${AFFILIATE_HOLD_DAYS}-day hold or awaiting review`} />
        </Panel>
        <Panel as="div" className="p-4">
          <Stat label="Paid out" value={inr(s.totals.paid)} hint={s.totals.rejected + s.totals.reversed > 0 ? `${inr(s.totals.rejected + s.totals.reversed)} rejected or reversed` : undefined} />
        </Panel>
      </div>

      <Panel className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-ink-3">Available to withdraw</p>
          <p className="figures mt-1 text-[24px] leading-none text-ink-1">{inr(s.availableCents)}</p>
          <p className="mt-1.5 text-[12px] text-ink-3">
            Approved commissions not yet in a payout. Minimum payout {inr(s.minPayoutCents)}.
            {s.inPayoutCents > 0 && ` ${inr(s.inPayoutCents)} is in your open request.`}
          </p>
        </div>
        <div className="shrink-0">
          {s.openPayout ? (
            <Badge tone={payoutTone[s.openPayout.status]}>
              Payout {payoutLabel[s.openPayout.status].toLowerCase()} · {inr(s.openPayout.amountCents)}
            </Badge>
          ) : s.canRequestPayout ? (
            <ActionButton action={requestPayoutAction} label={`Request ${inr(s.availableCents)}`} variant="primary" />
          ) : (
            <p className="max-w-[28ch] text-[12px] text-ink-3">
              {profile.status !== "APPROVED"
                ? "Payouts are paused while your account is suspended."
                : `You can request a payout once ${inr(s.minPayoutCents)} is approved.`}
            </p>
          )}
        </div>
      </Panel>

      <section className="mt-10" aria-labelledby="earn-commissions">
        <SectionTitle id="earn-commissions">Commissions</SectionTitle>
        {commissions.length === 0 ? (
          <EmptyState
            icon="orders"
            title="No commissions yet."
            body={`A commission appears here when someone buys through your link and the order is paid. It is ${rate} of the order after discounts.`}
          />
        ) : (
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-line text-[12px] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 text-right font-medium">Order value</th>
                  <th className="px-4 py-2.5 text-right font-medium">Commission</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-line align-top last:border-0">
                    <td className="figures whitespace-nowrap px-4 py-3 text-ink-2">{dateFmt.format(c.createdAt)}</td>
                    <td className="figures px-4 py-3 text-ink-2">#{c.order.id.slice(-6).toUpperCase()}</td>
                    <td className="figures px-4 py-3 text-right text-ink-2">{inr(c.baseCents)}</td>
                    <td className="figures px-4 py-3 text-right text-ink-1">
                      {inr(c.amountCents)}
                      <span className="block text-[11px] text-ink-3">{c.rateBps / 100}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={commissionTone[c.status]}>{commissionLabel[c.status]}</Badge>
                      <span className="mt-1 block max-w-[34ch] text-[12px] leading-snug text-ink-3">{commissionNote(c)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </section>

      <section className="mt-10" aria-labelledby="earn-payouts">
        <SectionTitle id="earn-payouts">Payouts</SectionTitle>
        {payouts.length === 0 ? (
          <p className="text-[14px] text-ink-3">No payout requests yet.</p>
        ) : (
          <Panel as="ul" className="px-4">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line py-3 last:border-0">
                <span className="min-w-0">
                  <span className="figures block text-[14px] text-ink-1">{inr(p.amountCents)}</span>
                  <span className="figures block text-[12px] text-ink-3">
                    Requested {dateFmt.format(p.createdAt)} · {p._count.commissions} commission{p._count.commissions === 1 ? "" : "s"}
                    {p.paidAt && ` · paid ${dateFmt.format(p.paidAt)}`}
                    {p.reference && ` · ref ${p.reference}`}
                  </span>
                  {p.reason && <span className="block text-[12px] text-ink-3">Reason: {p.reason}</span>}
                </span>
                <Badge tone={payoutTone[p.status]}>{payoutLabel[p.status]}</Badge>
              </li>
            ))}
          </Panel>
        )}
      </section>

      {squad && <SquadCard squad={squad} />}
    </Page>
  );
}

function commissionNote(c: { status: keyof typeof commissionLabel; reason: string | null; holdUntil: Date; payoutId: string | null }): string {
  switch (c.status) {
    case "PENDING":
      // Fraud flags are for the reviewer, not a hint list for gaming them.
      return c.reason?.startsWith("flagged:")
        ? `Under review. Reviewable from ${dateFmt.format(c.holdUntil)}.`
        : `Held until ${dateFmt.format(c.holdUntil)} for refunds, then reviewed.`;
    case "APPROVED":
      return c.payoutId ? "In your open payout request." : "Available to withdraw.";
    case "PAID":
      return c.reason ?? "Paid out.";
    case "REJECTED":
    case "REVERSED":
      return c.reason ? `Reason: ${c.reason}` : "";
  }
}

function SquadCard({ squad }: { squad: { qualified: number; total: number; earned: bigint } }) {
  return (
    <Panel className="mt-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[14px] font-semibold text-ink-1">THC referrals are separate</p>
        <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-ink-2">
          Inviting members to the academy pays THC, not money, and only when the person you invited finishes their
          first lesson. {squad.total === 0 ? "You have not invited anyone yet." : `${squad.qualified} of ${squad.total} invites qualified, `}
          {squad.total > 0 && (
            <>
              <ThcAmount amount={squad.earned} size="sm" /> earned.
            </>
          )}
        </p>
      </div>
      <Link href="/mining/squad" className={buttonStyles({ variant: "secondary", size: "sm" })}>
        Open your squad
      </Link>
    </Panel>
  );
}
