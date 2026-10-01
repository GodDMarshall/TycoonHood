import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { community } from "@tycoonhood/core";
import { Badge, Button, Input, Label, Select, Textarea } from "@tycoonhood/ui";
import { requireAdmin } from "../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../components/app/page";
import { ActionForm } from "../../../../components/admin/action-form";
import {
  announceAction,
  archiveChannelAction,
  ensureProgramChannelsAction,
  muteAction,
  resolveReportAction,
  saveChannelAction,
  unmuteAction,
} from "./actions";

export const metadata: Metadata = { title: "Admin · Community" };
export const dynamic = "force-dynamic";

const KIND = { CHAT: "Discussion", ANNOUNCEMENTS: "Announcements", WINS: "Wins", QUESTIONS: "Questions" } as const;
const ago = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AdminCommunity() {
  await requireAdmin();
  const [reports, mutes, channels, courses] = await Promise.all([
    community.openReports(),
    community.activeMutes(),
    community.allChannels(),
    prisma.course.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="reports">
        <SectionTitle id="reports">
          Reports {reports.length > 0 && <Badge tone="warning">{reports.length} open</Badge>}
        </SectionTitle>
        {reports.length === 0 ? (
          <p className="text-[14px] text-ink-3">Nothing reported. Every member report lands here.</p>
        ) : (
          <Panel as="ul" className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink-3">
                    #{r.message.channel.name} · by {r.message.author.profile?.displayName ?? "member"} · reported by{" "}
                    {r.reporter.profile?.displayName ?? "member"} · {ago(r.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14.5px] text-ink-1">
                    {r.message.deletedAt ? <em className="text-ink-3">already removed</em> : r.message.body}
                  </p>
                  <p className="mt-1 text-[13.5px] text-warning">Reason: {r.reason}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={resolveReportAction.bind(null, r.id, "remove")}>
                    <Button type="submit" size="sm" variant="danger">
                      Remove message
                    </Button>
                  </form>
                  <form action={resolveReportAction.bind(null, r.id, "dismiss")}>
                    <Button type="submit" size="sm" variant="secondary">
                      Dismiss
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </Panel>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="announce">
          <SectionTitle id="announce">Post an announcement</SectionTitle>
          <Panel className="p-5">
            <ActionForm action={announceAction} submit="Post to Announcements">
              <Label htmlFor="ann">Message</Label>
              <Textarea id="ann" name="body" required maxLength={2000} rows={4} placeholder="Shown on every member's Today page." />
            </ActionForm>
          </Panel>
        </section>

        <section aria-labelledby="mutes">
          <SectionTitle id="mutes">Mutes</SectionTitle>
          <Panel className="p-5">
            <ActionForm action={muteAction} submit="Mute">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mute-user">Username</Label>
                  <Input id="mute-user" name="username" required placeholder="@username" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mute-for">For</Label>
                  <Select id="mute-for" name="duration" defaultValue="24h">
                    <option value="24h">24 hours</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="forever">Until lifted</option>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mute-reason">Reason (kept on record)</Label>
                <Input id="mute-reason" name="reason" maxLength={200} />
              </div>
            </ActionForm>
            {mutes.length > 0 && (
              <ul className="mt-5 divide-y divide-line border-t border-line">
                {mutes.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-[14px]">
                      {m.user.profile?.displayName ?? "member"}{" "}
                      <span className="text-ink-3">
                        · {m.until ? `until ${ago(m.until)}` : "until lifted"}
                        {m.reason ? ` · ${m.reason}` : ""}
                      </span>
                    </span>
                    <form action={unmuteAction.bind(null, m.userId)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Lift
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
      </div>

      <section aria-labelledby="channels">
        <SectionTitle
          id="channels"
          action={
            <form action={ensureProgramChannelsAction}>
              <Button type="submit" size="sm" variant="secondary">
                Create missing program channels
              </Button>
            </form>
          }
        >
          Channels
        </SectionTitle>
        <Panel as="div" className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead>
              <tr className="border-b border-line text-left text-[12.5px] text-ink-3">
                <th className="px-5 py-3 font-medium">Channel</th>
                <th className="px-3 py-3 font-medium">Program</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Slow mode</th>
                <th className="px-3 py-3 font-medium">Messages</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {channels.map((c) => (
                <tr key={c.id} className={c.archivedAt ? "text-ink-3" : ""}>
                  <td className="px-5 py-3">
                    <Link href={`/community/${c.slug}`} className="font-medium hover:underline">
                      #{c.slug}
                    </Link>
                    {c.adminOnly && <span className="ml-2 text-[12.5px] text-ink-3">staff only</span>}
                    {c.archivedAt && <span className="ml-2 text-[12.5px]">archived</span>}
                  </td>
                  <td className="px-3 py-3">{c.course?.title ?? "House-wide"}</td>
                  <td className="px-3 py-3">{KIND[c.kind]}</td>
                  <td className="px-3 py-3 tabular-nums">{c.slowModeSec ? `${c.slowModeSec}s` : "off"}</td>
                  <td className="px-3 py-3 tabular-nums">{c._count.messages}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={archiveChannelAction.bind(null, c.id, !c.archivedAt)}>
                      <Button type="submit" size="sm" variant="ghost">
                        {c.archivedAt ? "Restore" : "Archive"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel className="mt-4 p-5">
          <h3 className="mb-4 text-[15px] font-semibold">New channel</h3>
          <ActionForm action={saveChannelAction} submit="Create channel">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ch-name">Name</Label>
                <Input id="ch-name" name="name" required maxLength={40} placeholder="Accountability" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ch-slug">Address</Label>
                <Input id="ch-slug" name="slug" required maxLength={60} placeholder="accountability" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ch-kind">Type</Label>
                <Select id="ch-kind" name="kind" defaultValue="CHAT">
                  {Object.entries(KIND).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ch-course">Program</Label>
                <Select id="ch-course" name="courseId" defaultValue="">
                  <option value="">House-wide (every member)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (enrolled only)
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ch-slow">Slow mode (seconds)</Label>
                <Input id="ch-slow" name="slowModeSec" type="number" min={0} max={3600} defaultValue={10} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ch-sort">Order</Label>
                <Input id="ch-sort" name="sortOrder" type="number" defaultValue={10} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ch-topic">Topic</Label>
              <Input id="ch-topic" name="topic" maxLength={200} placeholder="One line: what belongs here." />
            </div>
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" name="adminOnly" className="accent-[var(--color-gold)]" /> Only staff can post
            </label>
          </ActionForm>
        </Panel>
      </section>
    </div>
  );
}
