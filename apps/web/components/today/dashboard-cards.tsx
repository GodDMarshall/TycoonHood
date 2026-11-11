/**
 * Dashboard cards for Today (spec C). Presentational server components: the
 * page loads the data (app/(app)/today/dashboard.ts) and hands it in.
 *
 * Rule for every card: if there is nothing real to show, say so and offer the
 * next step. A zero is shown only where zero is the honest answer to a
 * question the member asked (e.g. "unread").
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Icon, Progress, ThcAmount, XpBar, buttonStyles, cn, type IconName } from "@tycoonhood/ui";
import { Panel, SectionTitle } from "../app/page";
import type { DashboardData } from "../../app/(app)/today/dashboard";

const linkCls = "text-[13px] text-ink-3 hover:text-ink-1";
const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const money = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
};

function Quiet({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Panel className="flex flex-col items-start gap-3 p-5">
      <p className="text-[14px] leading-relaxed text-ink-2">{children}</p>
      {action}
    </Panel>
  );
}

// ─── Recommended next actions ─────────────────────────────────────

export type NextAction = { key: string; icon: IconName; label: string; detail: string; href: string };

export function NextActions({ actions }: { actions: NextAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section aria-labelledby="next-actions">
      <SectionTitle id="next-actions">Recommended next</SectionTitle>
      <Panel as="div" className="divide-y divide-line">
        {actions.map((a) => (
          <Link key={a.key} href={a.href} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-bg-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line-strong text-gold">
              <Icon name={a.icon} size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-ink-1">{a.label}</span>
              <span className="block text-[13px] text-ink-3">{a.detail}</span>
            </span>
            <Icon name="chevron-right" size={16} className="text-ink-3" />
          </Link>
        ))}
      </Panel>
    </section>
  );
}

// ─── Profile completion ───────────────────────────────────────────

export function ProfileCompletionCard({ completion }: { completion: DashboardData["completion"] }) {
  if (completion.score === 100) return null;
  return (
    <section aria-labelledby="profile-completion">
      <SectionTitle
        id="profile-completion"
        action={
          <Link href="/settings#profile" className={linkCls}>
            Edit profile
          </Link>
        }
      >
        Your profile
      </SectionTitle>
      <Panel className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[14px] text-ink-2">
            {completion.done} of {completion.total} done
          </p>
          <p className="text-[14px] font-semibold tabular-nums text-ink-1">{completion.score}%</p>
        </div>
        <Progress value={completion.score} max={100} label="Profile completion" className="mt-2" />
        <ul className="mt-4 flex flex-col gap-1.5">
          {completion.missing.map((m) => (
            <li key={m.key}>
              <Link href={m.href} className="flex items-center gap-2 text-[14px] text-gold hover:text-gold-bright">
                <Icon name="plus" size={14} /> {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}

// ─── XP / level / rank ────────────────────────────────────────────

export function ProgressCard({
  xp,
  rank,
  nextRank,
  emblem,
}: {
  xp: DashboardData["xp"];
  rank: string | null;
  nextRank: { name: string; minLevel: number; xpAway: number } | null;
  emblem?: ReactNode;
}) {
  return (
    <section aria-labelledby="xp-title">
      <SectionTitle
        id="xp-title"
        action={
          <Link href="/profile" className={linkCls}>
            Profile
          </Link>
        }
      >
        Level &amp; rank
      </SectionTitle>
      <Panel className="flex flex-col gap-4 p-5">
        {xp.current === 0 ? (
          <p className="text-[14px] leading-relaxed text-ink-2">
            No XP yet. Your first completed lesson earns your first XP — every point here comes from verified work.
          </p>
        ) : (
          <XpBar currentXp={xp.current} levelFloorXp={xp.floor} nextLevelXp={xp.next} level={xp.level} />
        )}
        <div className="flex gap-4 border-t border-line pt-4">
          {emblem}
          <div className="min-w-0">
            <p className="text-[12.5px] text-ink-3">Rank</p>
            <p className="mt-0.5 text-[15px] font-medium">
              {rank ?? "Unranked"} <span className="font-normal text-ink-3">· level {xp.level}</span>
            </p>
            {nextRank && (
              <p className="mt-1 text-[13px] text-ink-3">
                {nextRank.name} at level {nextRank.minLevel} — {nextRank.xpAway.toLocaleString("en-US")} XP of verified work away.
              </p>
            )}
          </div>
        </div>
      </Panel>
    </section>
  );
}

// ─── Missions ─────────────────────────────────────────────────────

export function MissionsCard({ missions }: { missions: DashboardData["missions"] }) {
  const groups = (["daily", "weekly"] as const).map((c) => ({ cadence: c, items: missions.filter((m) => m.cadence === c) }));
  const weekly = missions.filter((m) => m.cadence === "weekly");
  const weeklyLabel = weekly.every((m) => m.calendarWeek)
    ? "Weekly · resets every Monday"
    : weekly.every((m) => !m.calendarWeek)
      ? "Weekly · resets every 7 days"
      : "Weekly";
  return (
    <section aria-labelledby="missions-title">
      <SectionTitle
        id="missions-title"
        action={
          <Link href="/challenges" className={linkCls}>
            Challenges
          </Link>
        }
      >
        Missions
      </SectionTitle>
      {missions.length === 0 ? (
        <Quiet>No daily or weekly missions are running right now. Lessons, challenges and the daily standard still earn XP.</Quiet>
      ) : (
        <div className="flex flex-col gap-4">
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <Panel key={g.cadence} as="div" className="divide-y divide-line">
                <p className="px-4 pb-2 pt-3 text-[12.5px] font-medium text-ink-3">{g.cadence === "daily" ? "Daily · resets every 24 hours" : weeklyLabel}</p>
                {g.items.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                        m.doneThisPeriod ? "border-success/40 bg-success/10 text-success" : "border-line-strong text-ink-3"
                      )}
                    >
                      {m.doneThisPeriod ? <Icon name="check" size={13} /> : <Icon name="mission" size={13} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[14.5px] font-medium", m.doneThisPeriod ? "text-ink-2" : "text-ink-1")}>{m.name}</p>
                      <p className="text-[13px] text-ink-3">{m.rule ? m.rule.charAt(0).toUpperCase() + m.rule.slice(1) : m.description}</p>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-0.5 text-[12.5px] text-ink-3">
                      {m.xpReward > 0 && <span className="tabular-nums">+{m.xpReward} XP</span>}
                      {m.thcReward > 0n && <ThcAmount amount={m.thcReward} size="sm" />}
                    </span>
                  </div>
                ))}
              </Panel>
            ))}
        </div>
      )}
    </section>
  );
}

// ─── Earnings ─────────────────────────────────────────────────────

const COMMISSION_LABEL: Record<string, string> = {
  PENDING: "Pending (in the refund window)",
  APPROVED: "Approved, awaiting payout",
  PAID: "Paid out",
  REJECTED: "Rejected",
  REVERSED: "Reversed (refunded order)",
};

export function EarningsCard({ earnings, affiliateStatus }: { earnings: DashboardData["earnings"]; affiliateStatus: string | null }) {
  const title = (
    <SectionTitle
      id="earnings-title"
      action={
        earnings ? (
          <Link href="/earnings" className={linkCls}>
            Details
          </Link>
        ) : undefined
      }
    >
      Earnings
    </SectionTitle>
  );
  if (!earnings) {
    return (
      <section aria-labelledby="earnings-title">
        {title}
        <Quiet
          action={
            <Link href="/earn" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              How the affiliate programme works
            </Link>
          }
        >
          You are not in the affiliate programme. Members can apply to earn a commission on purchases they refer — no guaranteed income.
        </Quiet>
      </section>
    );
  }
  const visible = earnings.byStatus.filter((s) => s.status !== "REJECTED");
  return (
    <section aria-labelledby="earnings-title">
      {title}
      <Panel className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={affiliateStatus === "APPROVED" ? "success" : affiliateStatus === "PENDING" ? "warning" : "neutral"}>
            {affiliateStatus === "APPROVED" ? "Affiliate" : affiliateStatus === "PENDING" ? "Application in review" : (affiliateStatus ?? "").toLowerCase()}
          </Badge>
          {affiliateStatus === "APPROVED" && <span className="figures text-[12.5px] text-ink-3">code {earnings.code}</span>}
        </div>
        {visible.length === 0 ? (
          <p className="text-[14px] text-ink-2">
            {affiliateStatus === "APPROVED"
              ? "No commissions yet. They appear here when someone buys through your link."
              : "Once approved, commissions from purchases you refer appear here."}
          </p>
        ) : (
          <dl className="flex flex-col gap-2">
            {visible.map((s) => (
              <div key={s.status + s.currency} className="flex items-baseline justify-between gap-4 text-[14px]">
                <dt className="text-ink-2">{COMMISSION_LABEL[s.status] ?? s.status}</dt>
                <dd className="font-semibold tabular-nums">{money(s.amountCents, s.currency)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>
    </section>
  );
}

// ─── Referrals ────────────────────────────────────────────────────

export function ReferralsCard({ referrals }: { referrals: DashboardData["referrals"] }) {
  const total = referrals.pending + referrals.qualified;
  return (
    <section aria-labelledby="referrals-title">
      <SectionTitle
        id="referrals-title"
        action={
          <Link href="/mining/squad" className={linkCls}>
            Your invites
          </Link>
        }
      >
        Invites
      </SectionTitle>
      {total === 0 ? (
        <Quiet
          action={
            referrals.code ? (
              <Link href="/mining/squad" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Get your invite link
              </Link>
            ) : undefined
          }
        >
          Nobody has joined with your invite yet. When someone you invite finishes their first lesson, you both earn THC.
        </Quiet>
      ) : (
        <Panel className="p-5">
          <p className="text-[14px] text-ink-2">
            <span className="font-semibold text-ink-1 tabular-nums">{total}</span> {total === 1 ? "person has" : "people have"} joined with your invite.
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            {referrals.qualified} finished a first lesson (THC paid) · {referrals.pending} still to start
          </p>
        </Panel>
      )}
    </section>
  );
}

// ─── Orders ───────────────────────────────────────────────────────

const ORDER_LABEL: Record<string, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrdersCard({ orders }: { orders: DashboardData["orders"] }) {
  return (
    <section aria-labelledby="orders-title">
      <SectionTitle
        id="orders-title"
        action={
          orders.length > 0 ? (
            <Link href="/orders" className={linkCls}>
              All orders
            </Link>
          ) : undefined
        }
      >
        Recent orders
      </SectionTitle>
      {orders.length === 0 ? (
        <Quiet
          action={
            <Link href="/marketplace" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Visit the shop
            </Link>
          }
        >
          You have not ordered anything yet.
        </Quiet>
      ) : (
        <Panel as="ul" className="divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href="/orders" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-2">
                <span className="min-w-0">
                  <span className="block text-[14px] text-ink-1">
                    {o._count.items} {o._count.items === 1 ? "item" : "items"} · {short(o.createdAt)}
                  </span>
                  <span className="block text-[12.5px] text-ink-3">{ORDER_LABEL[o.status] ?? o.status}</span>
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-ink-2">
                  {o.totalFiatCents > 0 ? money(o.totalFiatCents, o.fiatCurrency) : o.totalThc > 0n ? <ThcAmount amount={o.totalThc} size="sm" /> : null}
                </span>
              </Link>
            </li>
          ))}
        </Panel>
      )}
    </section>
  );
}

// ─── Community activity ───────────────────────────────────────────

export function CommunityActivityCard({ posts, groupCount }: { posts: DashboardData["posts"]; groupCount: number }) {
  return (
    <section aria-labelledby="discussions-title">
      <SectionTitle
        id="discussions-title"
        action={
          <Link href="/community/discussions" className={linkCls}>
            All discussions
          </Link>
        }
      >
        Latest discussions
      </SectionTitle>
      {posts.length === 0 ? (
        <Quiet
          action={
            <Link href="/community/discussions/new" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Start a discussion
            </Link>
          }
        >
          No discussions have been posted yet.
        </Quiet>
      ) : (
        <Panel as="ul" className="divide-y divide-line">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/community/discussions/${p.id}`} className="block px-4 py-3 hover:bg-bg-2">
                <span className="line-clamp-2 block text-[14px] text-ink-1">{p.title}</span>
                <span className="block text-[12.5px] text-ink-3">
                  {p.author.profile?.displayName ?? p.author.name ?? "Member"}
                  {p.group ? ` · ${p.group.name}` : ""} · {short(p.createdAt)}
                  {p.commentCount > 0 ? ` · ${p.commentCount} ${p.commentCount === 1 ? "reply" : "replies"}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </Panel>
      )}
      {groupCount > 0 && (
        <p className="mt-2 text-[12.5px] text-ink-3">
          You are in {groupCount} {groupCount === 1 ? "group" : "groups"}.
        </p>
      )}
    </section>
  );
}

// ─── Notifications preview ────────────────────────────────────────

export function NotificationsCard({ notifications, unread }: { notifications: DashboardData["notifications"]; unread: number }) {
  return (
    <section aria-labelledby="notifications-title">
      <SectionTitle
        id="notifications-title"
        action={
          <Link href="/notifications" className={linkCls}>
            {unread > 0 ? `${unread} unread` : "All"}
          </Link>
        }
      >
        Notifications
      </SectionTitle>
      {notifications.length === 0 ? (
        <Quiet>Nothing yet. XP, rank changes, orders and announcements will show up here.</Quiet>
      ) : (
        <Panel as="ul" className="divide-y divide-line">
          {notifications.map((n) => {
            const href = (n.data as { href?: string } | null)?.href;
            const body = (
              <>
                <span className="flex items-center gap-2 text-[14px] text-ink-1">
                  {!n.readAt && <span aria-label="Unread" className="size-1.5 shrink-0 rounded-full bg-gold" />}
                  <span className="line-clamp-1">{n.title}</span>
                </span>
                <span className="block text-[12.5px] text-ink-3">{short(n.createdAt)}</span>
              </>
            );
            return (
              <li key={n.id}>
                <Link href={href && href.startsWith("/") ? href : "/notifications"} className="block px-4 py-3 hover:bg-bg-2">
                  {body}
                </Link>
              </li>
            );
          })}
        </Panel>
      )}
    </section>
  );
}
