import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { challenges as challengeService, ChallengeService, type Submission } from "@tycoonhood/core";
import { Badge, Button, EmptyState, Icon, PillarBadge, ThcAmount, cn } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { joinChallengeAction, withdrawChallengeAction, checkInChallengeAction, submitEvidenceAction } from "./actions";
import { CheckInButton } from "../../../components/checkin-button";
import { SubmitEvidence } from "../../../components/submit-evidence";
import { SubmitButton } from "../../../components/submit-button";
import { ProgressRing } from "../../../components/progress-ring";
import { Page, PageHeader } from "../../../components/app/page";

export const metadata: Metadata = { title: "Challenges" };
export const dynamic = "force-dynamic";
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const DAY = 86_400_000;

/** The objective, in plain words, derived from the challenge's own criteria. */
function objectiveOf(criteria: unknown) {
  const c = (criteria ?? {}) as { event?: string; consecutiveDays?: number; gates?: number };
  if (c.event === "DAILY_CHECKIN") return `Check in ${c.consecutiveDays ?? 1} days in a row. Miss a day and the run resets.`;
  if (c.event === "GATED_SUBMISSIONS") return `Submit ${c.gates ?? 1} pieces of evidence. Each one is read and approved by a reviewer.`;
  if (c.event === "SUBMISSION") return "Submit your work as evidence. A reviewer approves it before the reward posts.";
  return "Complete the stated objective within the window.";
}

function windowOf(start: Date | null, end: Date | null, lifecycle: string, now: Date) {
  if (lifecycle === "ACTIVE" && end) {
    const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY));
    return days <= 1 ? "Ends within a day" : `${days} days remaining`;
  }
  if (lifecycle === "UPCOMING" && start) {
    const days = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / DAY));
    return days <= 1 ? "Opens within a day" : `Opens in ${days} days`;
  }
  if (lifecycle === "UPCOMING") return "Opening date to be announced";
  return "Closed";
}

export default async function ChallengesPage() {
  const user = await requireUser();
  const now = new Date();
  await challengeService.sweepLifecycles();
  const list = await prisma.challenge.findMany({
    where: { lifecycle: { in: ["UPCOMING", "ACTIVE", "ENDED"] } },
    orderBy: [{ startsAt: "asc" }],
    include: {
      participations: { where: { userId: user.id } },
      _count: { select: { participations: { where: { status: { in: ["JOINED", "COMPLETED"] } } } } },
    },
  });
  const order = { ACTIVE: 0, UPCOMING: 1, ENDED: 2 } as Record<string, number>;
  list.sort((a, b) => order[a.lifecycle] - order[b.lifecycle]);
  const live = list.filter((c) => c.lifecycle === "ACTIVE").length;
  const upcoming = list.filter((c) => c.lifecycle === "UPCOMING").length;

  return (
    <Page>
      <PageHeader
        title="Challenges"
        description="Each challenge has a window, an objective and a failure state. Finish it and the reward posts to your ledger; miss it and your record says so."
        actions={
          <p className="text-[13px] text-ink-3">
            <span className="tabular-nums text-ink-1">{live}</span> live · <span className="tabular-nums text-ink-1">{upcoming}</span> upcoming
          </p>
        }
      />
      <div>
        {list.length === 0 ? (
          <EmptyState
            icon="target"
            title="No challenges on the calendar"
            body="The next season is being set. Challenges appear here with their dates and rewards the moment they are scheduled."
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {list.map((c) => {
              const p = c.participations?.[0];
              const prog = p?.progress as { checkins?: string[]; submissions?: Submission[] } | null;
              const criteria = c.criteria as { event?: string; consecutiveDays?: number };
              const isCheckin = criteria.event === "DAILY_CHECKIN";
              const requiredDays = criteria.consecutiveDays ?? 1;
              const checkins = prog?.checkins?.length ?? 0;
              const required = ChallengeService.requiredApprovals(c.criteria);
              const subs = prog?.submissions ?? [];
              const approvedSubs = subs.filter((x) => x.status === "APPROVED").length;
              const pendingSubs = subs.filter((x) => x.status === "PENDING").length;
              const open = ["UPCOMING", "ACTIVE"].includes(c.lifecycle);
              const done = p?.status === "COMPLETED";
              return (
                <li
                  key={c.id}
                  id={c.slug}
                  className={cn(
                    "flex scroll-mt-6 flex-col rounded-lg border bg-bg-1",
                    done ? "border-success/40" : c.lifecycle === "ACTIVE" ? "border-line-strong" : "border-line"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                    <span className="flex items-center gap-2 text-[13px] font-medium">
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          c.lifecycle === "ACTIVE" ? "bg-success" : c.lifecycle === "UPCOMING" ? "bg-gold" : "bg-ink-3"
                        )}
                      />
                      <span className={c.lifecycle === "ACTIVE" ? "text-success" : c.lifecycle === "UPCOMING" ? "text-gold" : "text-ink-3"}>
                        {c.lifecycle === "ACTIVE" ? "Live" : c.lifecycle === "UPCOMING" ? "Upcoming" : "Ended"}
                      </span>
                    </span>
                    {c.pillar && <PillarBadge pillar={c.pillar} />}
                  </div>

                  <div className="flex flex-1 flex-col gap-5 p-5">
                    <div className="flex items-start justify-between gap-5">
                      <h2 className="text-[20px] font-semibold leading-snug tracking-[-0.01em]">{c.name}</h2>
                      {p && isCheckin && <ProgressRing value={Math.min(checkins, requiredDays)} max={requiredDays} label={`${checkins} of ${requiredDays} days checked in`} caption="days" />}
                      {p && required != null && <ProgressRing value={approvedSubs} max={required} label={`${approvedSubs} of ${required} approved`} caption="approved" />}
                    </div>
                    <p className="text-[14px] leading-relaxed text-ink-2">{c.description}</p>

                    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line text-[13px]">
                      <div className="bg-bg-1 p-4 max-sm:col-span-2">
                        <dt className="text-[12.5px] font-medium text-ink-3">Objective</dt>
                        <dd className="mt-1.5 leading-snug text-ink-1">{objectiveOf(c.criteria)}</dd>
                      </div>
                      <div className="bg-bg-1 p-4 max-sm:col-span-2">
                        <dt className="text-[12.5px] font-medium text-ink-3">Window</dt>
                        <dd className="mt-1.5 text-ink-1">{windowOf(c.startsAt, c.endsAt, c.lifecycle, now)}</dd>
                        <dd className="mt-0.5 text-[12.5px] tabular-nums text-ink-3">
                          {c.startsAt ? dateFmt.format(c.startsAt) : "TBA"}
                          {c.endsAt ? ` – ${dateFmt.format(c.endsAt)}` : ""}
                        </dd>
                      </div>
                      <div className="bg-bg-1 p-4">
                        <dt className="text-[12.5px] font-medium text-ink-3">Reward</dt>
                        <dd className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="tabular-nums text-ink-1">+{c.xpReward.toLocaleString("en-US")} XP</span>
                          <ThcAmount amount={c.thcReward} signed size="sm" />
                        </dd>
                      </div>
                      <div className="bg-bg-1 p-4">
                        <dt className="text-[12.5px] font-medium text-ink-3">Entered</dt>
                        <dd className="mt-1.5 tabular-nums text-ink-1">
                          {c._count.participations} {c._count.participations === 1 ? "member" : "members"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto">
                      {p ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                              <Badge tone={done ? "success" : p.status === "FAILED" ? "danger" : "gold"}>
                                {p.status === "JOINED" ? "You're in" : p.status === "COMPLETED" ? "Completed" : p.status === "FAILED" ? "Failed" : "Withdrawn"}
                              </Badge>
                              <span className="flex items-center gap-2">
                                {p.status === "JOINED" && c.lifecycle === "ACTIVE" && isCheckin && (
                                  <CheckInButton action={checkInChallengeAction.bind(null, c.slug)} label="Check in today" />
                                )}
                                {p.status === "JOINED" && (
                                  <form action={withdrawChallengeAction.bind(null, c.slug)}>
                                    <Button variant="ghost" size="sm" type="submit">
                                      Withdraw
                                    </Button>
                                  </form>
                                )}
                              </span>
                            </div>
                            {p.status === "JOINED" && c.lifecycle === "ACTIVE" && required != null && (
                              <SubmitEvidence action={submitEvidenceAction.bind(null, c.slug)} approved={approvedSubs} required={required} pending={pendingSubs} />
                            )}
                          </div>
                      ) : (
                        open && (
                          <form action={joinChallengeAction.bind(null, c.slug)} className="flex items-center justify-between gap-3 border-t border-line pt-4">
                            <span className="text-[13px] text-ink-3">Entering is free. Failing is recorded.</span>
                            <SubmitButton pendingLabel="Joining">
                              <Icon name="target" size={15} /> Join challenge
                            </SubmitButton>
                          </form>
                        )
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Page>
  );
}
