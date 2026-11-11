import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { can, ROLES, ROLE_LABEL } from "@tycoonhood/core";
import { Badge, Card, CardContent, Field, SectionRule, Select, ThcAmount } from "@tycoonhood/ui";
import { ActionForm } from "../../../../../components/admin/action-form";
import { ConfirmButton } from "../../../../../components/admin-confirm";
import { GrantForms } from "../../../../../components/admin-grant-forms";
import { grantThcAction, grantXpAction } from "../../actions";
import { cancelEmailChangeAction, changeRoleAction, setSuspendedAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Member" };
export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const money = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
};

export default async function AdminMember({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("admin.users");
  const { id } = await params;
  const m = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      rank: true,
      ledgerAccount: true,
      affiliate: { select: { id: true, code: true, status: true } },
      enrollments: { include: { course: { select: { title: true, slug: true } } }, orderBy: { enrolledAt: "desc" } },
      _count: { select: { certificates: true, sessions: true } },
    },
  });
  if (!m) notFound();

  const [orderGroups, commissionGroups, history, holds] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: { userId: id }, _count: { _all: true } }),
    m.affiliate
      ? prisma.commission.groupBy({ by: ["status", "currency"], where: { affiliateId: m.affiliate.id }, _sum: { amountCents: true }, _count: { _all: true } })
      : Promise.resolve([]),
    prisma.auditLog.findMany({
      where: { OR: [{ targetType: "User", targetId: id }, { actorId: id }] },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { email: true } } },
    }),
    // Addresses this member changed away from in the last 7 days: no one else can take them yet.
    prisma.emailHold.findMany({ where: { userId: id, expires: { gt: new Date() } }, orderBy: { expires: "desc" } }),
  ]);
  const self = actor.id === id;
  const name = m.profile?.displayName ?? m.name ?? m.email;

  return (
    <main className="flex flex-col gap-2">
      <p>
        <Link href="/admin/members" className="text-[13px] text-ink-3 hover:text-ink-1">← All members</Link>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{name}</h2>
        <Badge tone={m.role === "ADMIN" ? "gold" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
        {m.suspendedAt && <Badge tone="danger">Suspended {dt.format(m.suspendedAt)}</Badge>}
      </div>
      <p className="text-[13px] text-ink-3">
        {m.profile ? (
          <>
            <Link href={`/u/${m.profile.username}`} className="hover:text-ink-1">@{m.profile.username}</Link> ·{" "}
          </>
        ) : null}
        {m.email} · joined {dt.format(m.createdAt)}
      </p>

      <SectionRule label="Account" className="mb-3 mt-6" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 text-[14px]">
            <p>
              Email:{" "}
              {m.emailVerified ? <Badge tone="success">Verified {dt.format(m.emailVerified)}</Badge> : <Badge tone="warning">Not verified</Badge>}
            </p>
            {m.pendingEmail && (
              <div className="flex flex-col items-start gap-2">
                <p>
                  Email change waiting: <span className="font-medium">{m.pendingEmail}</span>
                </p>
                <ConfirmButton
                  action={cancelEmailChangeAction.bind(null, m.id)}
                  label="Cancel the email change"
                  confirmText={`The link sent to ${m.pendingEmail} will stop working. ${name} keeps ${m.email}.`}
                />
              </div>
            )}
            {holds.map((h) => (
              <p key={h.id}>
                Previous address <span className="font-medium">{h.address}</span>, held until {dt.format(h.expires)}.{" "}
                <span className="text-ink-3">{h.undoToken ? "Its undo link still works." : "Its undo link no longer works."}</span>
              </p>
            ))}
            <p>Onboarded: {m.profile?.onboardedAt ? dt.format(m.profile.onboardedAt) : "not yet"}</p>
            <p>
              Level {m.level} · {m.xp.toLocaleString()} XP{m.rank ? ` · ${m.rank.name}` : ""}
            </p>
            {m.ledgerAccount && (
              <p className="flex items-center gap-2">
                Balance <ThcAmount amount={m.ledgerAccount.balance} size="sm" />
              </p>
            )}
            <p>Active sessions: {m._count.sessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-4 py-4">
            {self ? (
              <p className="text-[13px] text-ink-3">This is your account. You cannot change your own role or suspend yourself.</p>
            ) : (
              <>
                <ActionForm action={changeRoleAction.bind(null, m.id)} submit="Change role">
                  <Field label="Role" htmlFor="role">
                    <Select id="role" name="role" defaultValue={m.role}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </Select>
                  </Field>
                </ActionForm>
                <div className="border-t border-line pt-4">
                  {m.suspendedAt ? (
                    <ConfirmButton
                      action={setSuspendedAction.bind(null, m.id, false)}
                      label="Lift suspension"
                      confirmText={`${name} will be able to sign in again.`}
                    />
                  ) : (
                    <ConfirmButton
                      action={setSuspendedAction.bind(null, m.id, true)}
                      label="Suspend member"
                      confirmText={`${name} will be signed out everywhere and will not be able to sign in until the suspension is lifted. Nothing is deleted.`}
                    />
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <SectionRule label="Learning" className="mb-3 mt-8" />
      <Card>
        <CardContent className="py-4">
          {m.enrollments.length === 0 ? (
            <p className="text-[14px] text-ink-3">Not enrolled in any programme.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {m.enrollments.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2 text-[14px]">
                  <span>{e.course.title}</span>
                  <span className="text-[13px] tabular-nums text-ink-2">
                    {e.status.toLowerCase()} · {e.progressPct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[13px] text-ink-3">Certificates issued: {m._count.certificates}</p>
        </CardContent>
      </Card>

      <SectionRule label="Orders & earnings" className="mb-3 mt-8" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4 text-[14px]">
            <p className="mb-2 font-medium">Orders</p>
            {orderGroups.length === 0 ? (
              <p className="text-ink-3">No orders.</p>
            ) : (
              <p className="text-ink-2">{orderGroups.map((g) => `${g.status.toLowerCase()} ${g._count._all}`).join(" · ")}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-[14px]">
            <p className="mb-2 font-medium">Affiliate</p>
            {!m.affiliate ? (
              <p className="text-ink-3">Not in the affiliate programme.</p>
            ) : (
              <>
                <p className="text-ink-2">
                  {m.affiliate.status.toLowerCase()} · code <span className="figures">{m.affiliate.code}</span>
                </p>
                {commissionGroups.length === 0 ? (
                  <p className="mt-1 text-ink-3">No commissions.</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1">
                    {commissionGroups.map((g) => (
                      <li key={g.status + g.currency} className="flex justify-between gap-3 text-ink-2">
                        <span>
                          {g.status.toLowerCase()} ({g._count._all})
                        </span>
                        <span className="tabular-nums">{money(g._sum.amountCents ?? 0, g.currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {can(actor, "admin.economy") && m.role === "MEMBER" && (
        <>
          <SectionRule label="Grants" className="mb-3 mt-8" />
          <GrantForms thcAction={grantThcAction.bind(null, m.id)} xpAction={grantXpAction.bind(null, m.id)} />
        </>
      )}

      <SectionRule label="History" className="mb-3 mt-8" />
      {history.length === 0 ? (
        <p className="text-[14px] text-ink-3">No audited actions yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-[13px]">
              <span className="font-medium text-ink-1">{h.action}</span>
              <span className="text-ink-3">
                {h.actor?.email ?? "system"} · {dt.format(h.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
