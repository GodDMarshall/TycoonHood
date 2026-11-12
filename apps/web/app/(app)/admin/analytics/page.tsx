import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requirePermission } from "../../../../lib/guard";
import { platformAnalytics, type MoneyLine } from "@tycoonhood/core";
import { Card, CardContent, SectionRule, Stat } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Admin · Analytics" };
export const dynamic = "force-dynamic";

const money = (m: MoneyLine) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: m.currency }).format(m.amountCents / 100);
  } catch {
    return `${(m.amountCents / 100).toFixed(2)} ${m.currency}`;
  }
};
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

function Tile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <Stat label={label} value={value} />
        {note && <p className="mt-1 text-[12px] text-ink-3">{note}</p>}
      </CardContent>
    </Card>
  );
}

/** A horizontal bar row: accessible as a table, readable as a chart. */
function BarTable({ caption, rows, unit }: { caption: string; rows: { label: string; value: number; note?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[420px] text-left text-[13.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-bg-1 text-[12px] text-ink-3">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">{caption}</th>
            <th scope="col" className="w-[45%] px-4 py-2 font-medium">
              <span className="sr-only">Bar</span>
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">{unit}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="px-4 py-2 font-normal text-ink-1">
                {r.label}
                {r.note && <span className="block text-[12px] text-ink-3">{r.note}</span>}
              </th>
              <td className="px-4 py-2" aria-hidden>
                <span className="block h-2 rounded-full bg-bg-3">
                  <span className="block h-2 rounded-full bg-gold" style={{ width: `${(r.value / max) * 100}%` }} />
                </span>
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink-1">{r.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminAnalytics() {
  await requirePermission("admin.analytics");
  const a = await platformAnalytics();
  const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const peak = Math.max(1, ...a.signups.perDay.map((d) => d.count));

  return (
    <main>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Analytics</h2>
      <p className="mt-1 text-[14px] text-ink-3">
        Live counts from the database. Rolling windows end now. Revenue counts captured LIVE payments only — TEST (sandbox) payments are listed separately and never added in.
      </p>

      <SectionRule label="Members" className="mb-4 mt-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Accounts" value={a.signups.total.toLocaleString()} />
        <Tile label="Sign-ups, last 30 days" value={a.signups.last30.toLocaleString()} />
        <Tile label="Email verified" value={pct(a.verified.pct)} note={`${a.verified.verified.toLocaleString()} of ${a.verified.total.toLocaleString()}`} />
        <Tile label="Active learners, 7 days" value={a.activeLearners7d.toLocaleString()} note="Distinct members with lesson activity" />
      </div>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Sign-ups per day (UTC, last 30 days)</h3>
      {a.signups.last30 === 0 ? (
        <p className="text-[14px] text-ink-3">No sign-ups in the last 30 days.</p>
      ) : (
        <figure>
          <div className="flex h-32 items-end gap-[3px] rounded-lg border border-line bg-bg-1 p-3" aria-hidden>
            {a.signups.perDay.map((d) => (
              <span
                key={d.day}
                title={`${d.day}: ${d.count}`}
                className="block flex-1 rounded-sm bg-gold"
                style={{ height: `${Math.max(d.count ? 4 : 1, (d.count / peak) * 100)}%`, opacity: d.count ? 1 : 0.25 }}
              />
            ))}
          </div>
          <figcaption className="mt-2 flex justify-between text-[12px] text-ink-3">
            <span>{dayFmt.format(new Date(a.signups.perDay[0].day))}</span>
            <span>Peak {peak.toLocaleString()} in a day</span>
            <span>{dayFmt.format(new Date(a.signups.perDay[a.signups.perDay.length - 1].day))}</span>
          </figcaption>
          <details className="mt-2 text-[13px]">
            <summary className="cursor-pointer text-ink-2">Show as a table</summary>
            <table className="mt-2 w-full max-w-sm text-left">
              <thead className="text-ink-3">
                <tr>
                  <th scope="col" className="py-1 font-medium">Day</th>
                  <th scope="col" className="py-1 text-right font-medium">Sign-ups</th>
                </tr>
              </thead>
              <tbody>
                {a.signups.perDay.map((d) => (
                  <tr key={d.day} className="border-t border-line">
                    <td className="py-1">{d.day}</td>
                    <td className="py-1 text-right tabular-nums">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </figure>
      )}

      <SectionRule label="Learning" className="mb-4 mt-10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Lessons completed, 30 days" value={a.lessonsCompleted30d.toLocaleString()} />
        <Tile
          label="Quiz pass rate, 30 days"
          value={pct(a.quiz.passRate)}
          note={a.quiz.attempts30d ? `${a.quiz.passed30d} of ${a.quiz.attempts30d} attempts` : "No attempts yet"}
        />
        <Tile label="Certificates issued" value={a.certificates.total.toLocaleString()} note={`${a.certificates.last30} in the last 30 days`} />
      </div>
      <div className="mt-4">
        {a.enrolmentsByProgramme.length === 0 ? (
          <p className="text-[14px] text-ink-3">No programmes exist yet.</p>
        ) : (
          <BarTable
            caption="Enrolments per programme"
            unit="Enrolments"
            rows={a.enrolmentsByProgramme.map((p) => ({
              label: p.title,
              value: p.enrolments,
              note: `${p.status.toLowerCase()} · ${p.completed} completed`,
            }))}
          />
        )}
      </div>

      <SectionRule label="Commerce" className="mb-4 mt-10" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="mb-2 text-[14px] font-medium">Revenue — LIVE payments</p>
            {a.revenue.live.length === 0 ? (
              <p className="text-[14px] text-ink-3">No live payments captured. Nothing has been earned yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[14px]">
                {a.revenue.live.map((m) => (
                  <li key={m.currency} className="flex justify-between">
                    <span>{m.payments} payments</span>
                    <span className="font-semibold tabular-nums">{money(m)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="mb-2 text-[14px] font-medium">Test-mode payments (not revenue)</p>
            {a.revenue.test.length === 0 ? (
              <p className="text-[14px] text-ink-3">None.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[14px] text-ink-2">
                {a.revenue.test.map((m) => (
                  <li key={m.mode + m.currency} className="flex justify-between">
                    <span>
                      {m.payments} {m.mode.toLowerCase()} payments
                    </span>
                    <span className="tabular-nums">{money(m)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        {a.orders.total === 0 ? (
          <p className="text-[14px] text-ink-3">No orders yet.</p>
        ) : (
          <BarTable caption="Orders by status" unit="Orders" rows={a.orders.byStatus.map((o) => ({ label: o.status.toLowerCase(), value: o.count }))} />
        )}
      </div>

      <SectionRule label="Affiliates" className="mb-4 mt-10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Approved affiliates" value={a.affiliates.approved.toLocaleString()} note={`${a.affiliates.pending} awaiting review`} />
        <Tile label="Link clicks, 30 days" value={a.affiliates.clicks30d.toLocaleString()} />
        <Tile label="Conversions, 30 days" value={a.affiliates.conversions30d.toLocaleString()} note="Orders that created a commission" />
        <Tile
          label="Click → conversion"
          value={a.affiliates.clicks30d ? `${Math.round((a.affiliates.conversions30d / a.affiliates.clicks30d) * 1000) / 10}%` : "—"}
        />
      </div>
      {a.affiliates.commissionsByStatus.length > 0 && (
        <p className="mt-3 text-[13px] text-ink-3">
          Commissions: {a.affiliates.commissionsByStatus.map((c) => `${c.status.toLowerCase()} ${c.count}`).join(" · ")}
        </p>
      )}

      <SectionRule label="Community" className="mb-4 mt-10" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Discussion posts, 30 days" value={a.community.posts30d.toLocaleString()} />
        <Tile label="Replies, 30 days" value={a.community.comments30d.toLocaleString()} />
        <Tile label="Visible posts, all time" value={a.community.postsTotal.toLocaleString()} />
      </div>

      <p className="mt-10 text-[12px] text-ink-3">Generated {a.generatedAt.toISOString().replace("T", " ").slice(0, 16)} UTC.</p>
    </main>
  );
}
