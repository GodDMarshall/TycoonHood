import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { audit } from "@tycoonhood/core";
import { Button, Input, Select } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Admin · Audit log" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const dt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Append-only: this page reads; nothing here can change or remove a row. */
export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ action?: string; prefix?: string; cursor?: string }> }) {
  await requirePermission("admin.audit");
  const sp = await searchParams;
  const action = (sp.action ?? sp.prefix ?? "").trim().slice(0, 80);
  const cursor = sp.cursor && /^[a-z0-9]{10,40}$/i.test(sp.cursor) ? sp.cursor : undefined;

  const [rows, families] = await Promise.all([
    audit.recent({ take: PER_PAGE + 1, cursor, action: action || undefined }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } }),
  ]);
  const more = rows.length > PER_PAGE;
  const page = rows.slice(0, PER_PAGE);
  const prefixes = Array.from(new Set(families.map((f) => f.action.split(".")[0]))).sort();
  const next = more ? `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), cursor: page[page.length - 1].id })}` : null;

  return (
    <main>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Audit log</h2>
      <p className="mt-1 text-[14px] text-ink-3">Every staff write and money-moving change. Newest first. Append-only.</p>

      <form className="mt-4 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto]" role="search">
        <label className="sr-only" htmlFor="prefix">Area</label>
        <Select id="prefix" name="prefix" defaultValue={prefixes.includes(action) ? action : ""}>
          <option value="">All areas</option>
          {prefixes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="action">Action starts with</label>
        <Input id="action" name="action" defaultValue={prefixes.includes(action) ? "" : action} placeholder="Action starts with… e.g. user.role" />
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {page.length === 0 ? (
        <p className="mt-6 text-[14px] text-ink-3">{action ? `No entries start with “${action}”.` : "The audit log is empty."}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-bg-1 text-[12px] text-ink-3">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">When</th>
                <th scope="col" className="px-4 py-2 font-medium">Action</th>
                <th scope="col" className="px-4 py-2 font-medium">Actor</th>
                <th scope="col" className="px-4 py-2 font-medium">Target</th>
                <th scope="col" className="px-4 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {page.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-ink-2">{dt.format(r.createdAt)}</td>
                  <td className="px-4 py-2 font-medium text-ink-1">{r.action}</td>
                  <td className="px-4 py-2 text-ink-2">{r.actor ? (r.actor.profile?.displayName ?? r.actor.email) : "system"}</td>
                  <td className="px-4 py-2 text-ink-2">
                    {r.targetType === "User" && r.targetId ? (
                      <Link href={`/admin/members/${r.targetId}`} className="text-gold hover:text-gold-bright">
                        User
                      </Link>
                    ) : (
                      (r.targetType ?? "—")
                    )}
                    {r.targetId && <span className="figures block text-[11px] text-ink-3">{r.targetId}</span>}
                  </td>
                  <td className="max-w-[320px] px-4 py-2 text-ink-3">
                    {r.meta ? <code className="block truncate text-[11.5px]" title={JSON.stringify(r.meta)}>{JSON.stringify(r.meta)}</code> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav aria-label="Pagination" className="mt-4 flex gap-4 text-[14px]">
        {cursor && (
          <Link href={`/admin/audit${action ? `?action=${encodeURIComponent(action)}` : ""}`} className="text-gold hover:text-gold-bright">
            ← Newest
          </Link>
        )}
        {next && (
          <Link href={next} className="text-gold hover:text-gold-bright">
            Older →
          </Link>
        )}
      </nav>
    </main>
  );
}
