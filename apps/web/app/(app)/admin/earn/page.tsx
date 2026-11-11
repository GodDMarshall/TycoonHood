/**
 * ADMIN · EARN — affiliate applications, commissions and payouts.
 *
 * Three queues, each a to-do list first: applications waiting, commissions
 * past their hold, payouts requested. Every button re-checks "admin.earn"
 * on the server and is audited by AffiliateService.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import type { AffiliateStatus, CommissionStatus, PayoutStatus } from "@tycoonhood/db";
import { affiliates, payoutBlocker } from "@tycoonhood/core";
import { AFFILIATE_HOLD_DAYS } from "@tycoonhood/config";
import { Badge, Card, CardContent, EmptyState, cn } from "@tycoonhood/ui";
import { requirePermission } from "../../../../lib/guard";
import { ActionButton, TextActionForm } from "../../../../components/earn/action-form";
import { affiliateTone, commissionLabel, commissionTone, dateFmt, inr, payoutLabel, payoutTone } from "../../../../components/earn/format";
import {
  approveAffiliateAction,
  approveCommissionAction,
  approvePayoutAction,
  markPayoutPaidAction,
  rejectAffiliateAction,
  rejectCommissionAction,
  rejectPayoutAction,
  reverseCommissionAction,
  suspendAffiliateAction,
} from "./actions";

export const metadata: Metadata = { title: "Admin · Earn" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;
type Tab = "applications" | "commissions" | "payouts";
type SP = { tab?: string; status?: string; page?: string };

const FILTERS: Record<Tab, [string, string][]> = {
  applications: [["PENDING", "Waiting"], ["APPROVED", "Approved"], ["SUSPENDED", "Suspended"], ["REJECTED", "Rejected"], ["all", "All"]],
  commissions: [["PENDING", "Pending"], ["flagged", "Flagged"], ["APPROVED", "Approved"], ["PAID", "Paid"], ["REJECTED", "Rejected"], ["REVERSED", "Reversed"], ["all", "All"]],
  payouts: [["REQUESTED", "Requested"], ["APPROVED", "Approved"], ["PAID", "Paid"], ["REJECTED", "Declined"], ["all", "All"]],
};

export default async function AdminEarnPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("admin.earn");
  const sp = await searchParams;
  const tab: Tab = sp.tab === "commissions" || sp.tab === "payouts" ? sp.tab : "applications";
  const status = FILTERS[tab].some(([v]) => v === sp.status) ? sp.status! : FILTERS[tab][0][0];
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const skip = (page - 1) * PER_PAGE;

  const [waitingApps, waitingCommissions, waitingPayouts] = await Promise.all([
    prisma.affiliateProfile.count({ where: { status: "PENDING" } }),
    prisma.commission.count({ where: { status: "PENDING", holdUntil: { lte: new Date() } } }),
    prisma.payoutRequest.count({ where: { status: { in: ["REQUESTED", "APPROVED"] } } }),
  ]);

  const tabs: [Tab, string, number][] = [
    ["applications", "Applications", waitingApps],
    ["commissions", "Commissions", waitingCommissions],
    ["payouts", "Payouts", waitingPayouts],
  ];

  return (
    <main>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink-1">Earn</h2>
      <p className="mt-1 max-w-2xl text-[14px] text-ink-2">
        Affiliate applications, commissions and payouts. Commissions are held {AFFILIATE_HOLD_DAYS} days for refunds
        before they can be approved. Money moves outside the platform; marking a payout paid records that you sent it.
      </p>

      <nav aria-label="Earn sections" className="mt-6 flex flex-wrap gap-1.5">
        {tabs.map(([t, label, n]) => (
          <Link
            key={t}
            href={`/admin/earn?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "rounded-md border px-3 py-1.5 text-[13px]",
              tab === t ? "border-gold-deep bg-gold/10 text-gold-bright" : "border-line text-ink-2 hover:text-ink-1"
            )}
          >
            {label}
            {n > 0 && <span className="figures ml-1.5 text-ink-3">{n}</span>}
          </Link>
        ))}
      </nav>

      <div className="mb-5 mt-4 flex flex-wrap items-center gap-1.5">
        {FILTERS[tab].map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/earn?tab=${tab}&status=${value}`}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[12px]",
              status === value ? "border-gold-deep bg-gold/10 text-gold-bright" : "border-line text-ink-3 hover:text-ink-1"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab !== "applications" && <Unreversed />}
      {tab === "applications" && <Applications status={status} skip={skip} page={page} />}
      {tab === "commissions" && <Commissions status={status} skip={skip} page={page} />}
      {tab === "payouts" && <Payouts status={status} skip={skip} page={page} />}
    </main>
  );
}

// ───────────────────────────────────────────────────────── applications

async function Applications({ status, skip, page }: { status: string; skip: number; page: number }) {
  const { rows, total } = await affiliates.listAffiliates({
    status: status === "all" ? undefined : (status as AffiliateStatus),
    take: PER_PAGE,
    skip,
  });
  if (rows.length === 0) return <Empty total={total} what="applications" />;
  return (
    <>
      <div className="flex flex-col gap-2">
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className="py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink-1">
                    @{a.user.profile?.username ?? a.user.email} · <span className="figures">{a.code}</span>
                  </p>
                  <p className="figures mt-0.5 text-[11px] text-ink-3">
                    {a.user.email} · {a.user.emailVerified ? "email verified" : "email NOT verified"} · member since {dateFmt.format(a.user.createdAt)} · applied {dateFmt.format(a.termsAcceptedAt)} · {a._count.clicks} clicks · {a._count.commissions} commissions
                  </p>
                  {a.channels && <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{a.channels}</p>}
                  <p className="mt-1.5 text-[12px] text-ink-3">Payout: {describeMethod(a.payoutMethod)}</p>
                  {a.statusReason && <p className="mt-1 text-[12px] text-ink-3">Reason on file: {a.statusReason}</p>}
                </div>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={affiliateTone[a.status]}>{a.status}</Badge>
                  {(a.status === "PENDING" || a.status === "SUSPENDED") && (
                    <ActionButton
                      action={approveAffiliateAction.bind(null, a.id)}
                      label={a.status === "SUSPENDED" ? "Reinstate" : "Approve"}
                      variant="primary"
                    />
                  )}
                  {a.status === "PENDING" && (
                    <TextActionForm action={rejectAffiliateAction.bind(null, a.id)} label="Reject" placeholder="Reason (the member sees it)" />
                  )}
                  {a.status === "APPROVED" && (
                    <TextActionForm action={suspendAffiliateAction.bind(null, a.id)} label="Suspend" placeholder="Reason (the member sees it)" variant="danger" />
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Pager tab="applications" status={status} page={page} total={total} />
    </>
  );
}

// ───────────────────────────────────────────────────────── commissions

async function Commissions({ status, skip, page }: { status: string; skip: number; page: number }) {
  const { rows, total } = await affiliates.listCommissions({
    status: status === "all" || status === "flagged" ? undefined : (status as CommissionStatus),
    flagged: status === "flagged",
    take: PER_PAGE,
    skip,
  });
  if (rows.length === 0) return <Empty total={total} what="commissions" />;
  const now = new Date();
  return (
    <>
      <div className="flex flex-col gap-2">
        {rows.map((c) => {
          const flagged = c.reason?.startsWith("flagged:") ?? false;
          const holdPassed = now >= c.holdUntil;
          const orderOk = c.order.status === "PAID" || c.order.status === "FULFILLED";
          const refundOpen = c.order.refundRequests.length > 0;
          const affiliateOk = c.affiliate.status === "APPROVED";
          const live = c.status === "PENDING" || c.status === "APPROVED";
          return (
            <Card key={c.id} className={cn(flagged && c.status === "PENDING" && "border-warning/50")}>
              <CardContent className="py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-1">
                      <span className="figures">{inr(c.amountCents)}</span> to @{c.affiliate.user.profile?.username ?? c.affiliate.user.email}{" "}
                      <span className="text-ink-3">({c.affiliate.code})</span>
                    </p>
                    <p className="figures mt-0.5 text-[11px] text-ink-3">
                      Order #{c.order.id.slice(-6).toUpperCase()} · {c.order.status} · buyer {c.order.user.email} · {inr(c.baseCents)} × {c.rateBps / 100}% · {dateFmt.format(c.createdAt)}
                      {c.status === "PENDING" && ` · hold ${holdPassed ? "passed" : `until ${dateFmt.format(c.holdUntil)}`}`}
                      {c.payoutId && " · in a payout"}
                    </p>
                    {c.reason && (
                      <p className={cn("mt-1.5 text-[12px]", flagged ? "text-warning" : "text-ink-3")}>
                        {flagged ? c.reason.replace(/^flagged:\s*/, "Flagged: ") : `Reason: ${c.reason}`}
                      </p>
                    )}
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    {flagged && c.status === "PENDING" && <Badge tone="warning">Flagged</Badge>}
                    {live && refundOpen && <Badge tone="warning">Refund requested</Badge>}
                    {live && !affiliateOk && <Badge tone={affiliateTone[c.affiliate.status]}>Affiliate {c.affiliate.status.toLowerCase()}</Badge>}
                    <Badge tone={commissionTone[c.status]}>{commissionLabel[c.status]}</Badge>
                    {c.status === "PENDING" && holdPassed && orderOk && !refundOpen && affiliateOk && (
                      <ActionButton
                        action={approveCommissionAction.bind(null, c.id)}
                        label="Approve"
                        variant="primary"
                        confirmText={flagged ? "This commission is flagged. Approve it anyway?" : undefined}
                      />
                    )}
                    {c.status === "PENDING" && !orderOk && <span className="text-[12px] text-danger">Order {c.order.status.toLowerCase()}</span>}
                    {(c.status === "PENDING" || c.status === "APPROVED") && !c.payoutId && (
                      <TextActionForm action={rejectCommissionAction.bind(null, c.id)} label="Reject" placeholder="Reason (the member sees it)" />
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Pager tab="commissions" status={status} page={page} total={total} />
    </>
  );
}

// ───────────────────────────────────────────────────────── payouts

async function Payouts({ status, skip, page }: { status: string; skip: number; page: number }) {
  const { rows, total } = await affiliates.listPayouts({
    status: status === "all" ? undefined : (status as PayoutStatus),
    take: PER_PAGE,
    skip,
  });
  if (rows.length === 0) return <Empty total={total} what="payouts" />;
  return (
    <>
      <div className="flex flex-col gap-2">
        {rows.map((p) => {
          const open = p.status === "REQUESTED" || p.status === "APPROVED";
          // The same check approvePayout and markPayoutPaid enforce on the server.
          const blocked = open ? payoutBlocker(p) : null;
          return (
            <Card key={p.id} className={cn(blocked && "border-warning/50")}>
              <CardContent className="py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-1">
                      <span className="figures">{inr(p.amountCents)}</span> to @{p.affiliate.user.profile?.username ?? p.affiliate.user.email}{" "}
                      <span className="text-ink-3">({p.affiliate.code})</span>
                    </p>
                    <p className="figures mt-0.5 text-[11px] text-ink-3">
                      Requested {dateFmt.format(p.createdAt)} · {p._count.commissions} commission{p._count.commissions === 1 ? "" : "s"}
                      {p.paidAt && ` · paid ${dateFmt.format(p.paidAt)}`}
                      {p.reference && ` · ref ${p.reference}`}
                    </p>
                    <p className="mt-1.5 text-[12px] text-ink-2">Send to: {describeMethod(p.method)}</p>
                    {p.reason && <p className="mt-1 text-[12px] text-ink-3">Reason: {p.reason}</p>}
                    {blocked && <p className="mt-1.5 text-[12px] text-warning">{blocked}</p>}
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    {open && p.affiliate.status !== "APPROVED" && (
                      <Badge tone={affiliateTone[p.affiliate.status]}>Affiliate {p.affiliate.status.toLowerCase()}</Badge>
                    )}
                    <Badge tone={payoutTone[p.status]}>{payoutLabel[p.status]}</Badge>
                    {p.status === "REQUESTED" && !blocked && (
                      <ActionButton action={approvePayoutAction.bind(null, p.id)} label="Approve" variant="primary" />
                    )}
                    {p.status === "APPROVED" && !blocked && (
                      <TextActionForm
                        action={markPayoutPaidAction.bind(null, p.id)}
                        label="Mark paid"
                        field="reference"
                        placeholder="UTR / transaction reference"
                        variant="primary"
                      />
                    )}
                    {(p.status === "REQUESTED" || p.status === "APPROVED") && (
                      <TextActionForm action={rejectPayoutAction.bind(null, p.id)} label="Decline" placeholder="Reason (the member sees it)" />
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Pager tab="payouts" status={status} page={page} total={total} />
    </>
  );
}

// ───────────────────────────────────────────────────────── refunded, not reversed

async function Unreversed() {
  const rows = await affiliates.listUnreversed();
  if (rows.length === 0) return null;
  return (
    <Card className="mb-4 border-danger/50">
      <CardContent className="py-3.5">
        <p className="text-[13px] text-ink-1">Refunded orders with a commission still standing</p>
        <p className="mt-0.5 text-[12px] text-ink-3">
          The automatic reversal failed or did not run. Reverse each one so it is never paid out. A payout it is in is
          lowered, or closed if that leaves less than the minimum.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-ink-2">
                <span className="figures">{inr(c.amountCents)}</span> to {c.affiliate.code} · order #{c.orderId.slice(-6).toUpperCase()} ·{" "}
                {commissionLabel[c.status].toLowerCase()}
                {c.payoutId && " · in a payout"}
                {c.lastFailure?.error && (
                  <span className="block text-danger">
                    Failed {dateFmt.format(c.lastFailure.at)}: {c.lastFailure.error}
                  </span>
                )}
              </span>
              <ActionButton
                action={reverseCommissionAction.bind(null, c.id)}
                label="Reverse"
                variant="primary"
                confirmText={c.status === "PAID" ? "This commission was already paid out. Reverse it? The money has to be recovered by hand." : undefined}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────── bits

function describeMethod(m: unknown): string {
  const v = m as { type?: string; upiId?: string; accountName?: string; accountNumber?: string; ifsc?: string; bankName?: string } | null;
  if (!v?.type) return "none on file";
  if (v.type === "UPI") return `UPI ${v.upiId ?? "?"}`;
  return `Bank · ${v.accountName ?? "?"} · A/C ${v.accountNumber ?? "?"} · IFSC ${v.ifsc ?? "?"}${v.bankName ? ` · ${v.bankName}` : ""}`;
}

function Empty({ total, what }: { total: number; what: string }) {
  return total === 0 ? (
    <EmptyState icon="check" title={`No ${what} here.`} body="Nothing is waiting in this list." />
  ) : (
    <p className="text-[14px] text-ink-3">Nothing on this page.</p>
  );
}

function Pager({ tab, status, page, total }: { tab: Tab; status: string; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (pages <= 1) return null;
  const href = (p: number) => `/admin/earn?tab=${tab}&status=${status}&page=${p}`;
  return (
    <nav className="mt-5 flex items-center justify-between" aria-label="Pages">
      <span className="text-[12px] text-ink-3">
        {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="rounded-md border border-line px-3 py-1 text-[12px] text-ink-2 hover:text-ink-1">
            Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="rounded-md border border-line px-3 py-1 text-[12px] text-ink-2 hover:text-ink-1">
            Next
          </Link>
        )}
      </span>
    </nav>
  );
}
