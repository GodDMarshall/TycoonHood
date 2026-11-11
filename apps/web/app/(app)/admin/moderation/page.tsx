import type { Metadata } from "next";
import Link from "next/link";
import { community, discussions } from "@tycoonhood/core";
import { Avatar, Badge, Button, cn } from "@tycoonhood/ui";
import { requirePermission } from "../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../components/app/page";
import { resolveDiscussionReportAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Reports" };
export const dynamic = "force-dynamic";

const STATUSES = [
  ["OPEN", "Open"],
  ["ACTIONED", "Actioned"],
  ["DISMISSED", "Dismissed"],
] as const;
type Status = (typeof STATUSES)[number][0];
const at = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermission("community.moderate");
  const sp = await searchParams;
  const status: Status = STATUSES.some(([s]) => s === sp.status) ? (sp.status as Status) : "OPEN";
  const viewer = { id: user.id, role: user.role };
  const [reports, openCount, chatReports] = await Promise.all([
    discussions.reports(viewer, status),
    discussions.openReportCount(),
    community.openReports(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Report status" className="flex w-fit gap-1 rounded-md border border-line bg-bg-1 p-1">
          {STATUSES.map(([s, label]) => (
            <Link
              key={s}
              href={s === "OPEN" ? "/admin/moderation" : `/admin/moderation?status=${s}`}
              aria-current={status === s ? "page" : undefined}
              className={cn("flex h-8 items-center gap-2 rounded-[6px] px-3 text-[13.5px] font-medium", status === s ? "bg-bg-3 text-ink-1" : "text-ink-2 hover:bg-bg-2")}
            >
              {label}
              {s === "OPEN" && openCount > 0 && <span className="tabular-nums text-warning">{openCount}</span>}
            </Link>
          ))}
        </nav>
        {chatReports.length > 0 && (
          <Link href="/admin/community" className="text-[13.5px] text-gold underline">
            {chatReports.length} open chat {chatReports.length === 1 ? "report" : "reports"} in Community →
          </Link>
        )}
      </div>

      <section aria-labelledby="queue">
        <SectionTitle id="queue">Discussion reports</SectionTitle>
        {reports.length === 0 ? (
          <p className="text-[14px] text-ink-3">{status === "OPEN" ? "Nothing waiting. Every member report on a post or comment lands here." : "None."}</p>
        ) : (
          <Panel as="ul" className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink-3">
                    {r.targetType === "post" ? "Post" : "Comment"} · reported by {r.reporter} · {at(r.createdAt)}
                    {r.resolvedAt && <> · {r.resolution ?? r.status.toLowerCase()} {at(r.resolvedAt)}</>}
                  </p>
                  {r.target ? (
                    <div className="mt-2 flex gap-3">
                      <Avatar name={r.target.author.name} src={r.target.author.avatarUrl} size={28} />
                      <div className="min-w-0">
                        <p className="text-[13px] text-ink-2">
                          {r.target.author.name}
                          {r.target.author.username && <span className="text-ink-3"> @{r.target.author.username}</span>}
                          {r.target.state !== "VISIBLE" && (
                            <Badge tone="warning" className="ml-2">
                              {r.target.state.toLowerCase()}
                            </Badge>
                          )}
                        </p>
                        {r.target.title && <p className="mt-1 text-[14.5px] font-semibold text-ink-1">{r.target.title}</p>}
                        <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-[14px] text-ink-1">{r.target.body}</p>
                        <Link href={r.target.href} className="mt-1 inline-block text-[13px] text-gold underline">
                          Open in context
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-[14px] italic text-ink-3">The reported content no longer exists.</p>
                  )}
                  <p className="mt-2 text-[13.5px] text-warning">Reason: {r.reason}</p>
                </div>
                {status === "OPEN" && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {r.target && (
                      <>
                        <form action={resolveDiscussionReportAction.bind(null, r.id, "hide")}>
                          <Button type="submit" size="sm" variant="secondary">
                            Hide
                          </Button>
                        </form>
                        <form action={resolveDiscussionReportAction.bind(null, r.id, "remove")}>
                          <Button type="submit" size="sm" variant="danger">
                            Remove
                          </Button>
                        </form>
                      </>
                    )}
                    <form action={resolveDiscussionReportAction.bind(null, r.id, "dismiss")}>
                      <Button type="submit" size="sm" variant="ghost">
                        Dismiss
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </Panel>
        )}
      </section>
    </div>
  );
}
