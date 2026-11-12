import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { can, DELETION_TOPIC, LedgerService } from "@tycoonhood/core";
import { Card, CardContent, Notice, SectionRule, Stat, ThcAmount } from "@tycoonhood/ui";
import { mailMode } from "../../../lib/mail";

export const metadata: Metadata = { title: "Admin · Overview" };
export const dynamic = "force-dynamic";
const ledger = new LedgerService(prisma);

const linkCls = "text-[13px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

/** Each role sees the cards for the work it can do; every block re-queries only what it shows. */
export default async function AdminOverview() {
  const user = await requirePermission("admin.access");
  const show = {
    economy: can(user, "admin.economy"),
    floor: can(user, "admin.users") || can(user, "admin.analytics"),
    courses: can(user, "courses.author"),
    moderation: can(user, "community.moderate"),
    content: can(user, "admin.content"),
  };

  const [economy, floor, courses, moderation, content] = await Promise.all([
    show.economy
      ? Promise.all([
          ledger.systemAccount("SYSTEM_MINT"),
          ledger.systemAccount("TREASURY"),
          ledger.systemAccount("REWARDS_POOL"),
          ledger.systemAccount("MINING_POOL"),
          ledger.systemAccount("REVENUE"),
          ledger.circulatingSupply(),
        ])
      : null,
    show.floor
      ? Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { suspendedAt: { not: null } } }),
          prisma.enrollment.count(),
          prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
          prisma.challenge.count({ where: { lifecycle: "ACTIVE" } }),
          prisma.minerState.count(),
        ])
      : null,
    show.courses
      ? Promise.all([
          prisma.course.groupBy({ by: ["status"], _count: { _all: true } }),
          prisma.instructor.findUnique({
            where: { userId: user.id },
            select: { name: true, courses: { select: { id: true, title: true, status: true, _count: { select: { enrollments: true, certificates: true } } } } },
          }),
        ])
      : null,
    show.moderation
      ? Promise.all([prisma.contentReport.count({ where: { status: "OPEN" } }), prisma.messageReport.count({ where: { resolvedAt: null } }).catch(() => 0)])
      : null,
    show.content
      ? Promise.all([
          prisma.contactMessage.count({ where: { handled: false, topic: { not: DELETION_TOPIC } } }),
          prisma.contactMessage.count({ where: { handled: false, topic: DELETION_TOPIC } }),
          prisma.testimonial.count({ where: { published: true } }),
        ])
      : null,
  ]);

  return (
    <main>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Overview</h2>
      <p className="mt-1 text-[14px] text-ink-3">What needs attention in the areas you look after.</p>

      {show.content && mailMode() === "off" && (
        <Notice tone="warning" title="Email is not set up" className="mt-6">
          No mail provider is configured, so confirmation and password-reset emails are not being sent. Members are told email isn&rsquo;t
          available right now, and anyone who forgets their password cannot reset it. Set <code className="figures">RESEND_API_KEY</code> and{" "}
          <code className="figures">MAIL_FROM</code> (a sender verified with Resend) in the site&rsquo;s environment, then redeploy. See LAUNCH.md, steps 3 and 5.
        </Notice>
      )}

      {moderation && (
        <>
          <SectionRule label="Moderation" className="mb-4 mt-8" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card variant={moderation[0] > 0 ? "gold" : "default"}>
              <CardContent className="flex flex-col gap-2 py-4">
                <Stat label="Open reports (discussions)" value={moderation[0].toLocaleString()} />
                <Link href="/admin/moderation" className={linkCls}>Review reports</Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-2 py-4">
                <Stat label="Open reports (chat)" value={moderation[1].toLocaleString()} />
                <Link href="/admin/community" className={linkCls}>Open chat moderation</Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {courses && (
        <>
          <SectionRule label="Courses" className="mb-4 mt-10" />
          <div className="grid gap-4 sm:grid-cols-3">
            {(["PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((s) => (
              <Card key={s}>
                <CardContent className="py-4">
                  <Stat label={`${s.charAt(0)}${s.slice(1).toLowerCase()} courses`} value={(courses[0].find((g) => g.status === s)?._count._all ?? 0).toLocaleString()} />
                </CardContent>
              </Card>
            ))}
          </div>
          {courses[1] && (
            <Card className="mt-4">
              <CardContent className="py-4">
                <p className="mb-3 text-[14px] font-medium">Your courses, {courses[1].name}</p>
                {courses[1].courses.length === 0 ? (
                  <p className="text-[13px] text-ink-3">No courses are assigned to your instructor profile yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-line">
                    {courses[1].courses.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-[14px]">
                        <span>
                          {c.title} <span className="text-[12px] text-ink-3">· {c.status.toLowerCase()}</span>
                        </span>
                        <span className="text-[13px] tabular-nums text-ink-2">
                          {c._count.enrollments} enrolled · {c._count.certificates} certificates
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
          <p className="mt-3">
            <Link href="/admin/courses" className={linkCls}>Open the course editor</Link>
          </p>
        </>
      )}

      {content && (
        <>
          <SectionRule label="Site" className="mb-4 mt-10" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Card variant={content[0] > 0 ? "gold" : "default"}>
              <CardContent className="flex flex-col gap-2 py-4">
                <Stat label="Unhandled contact messages" value={content[0].toLocaleString()} />
                <Link href="/admin/site#inbox" className={linkCls}>Open the inbox</Link>
              </CardContent>
            </Card>
            <Card variant={content[1] > 0 ? "gold" : "default"}>
              <CardContent className="py-4">
                <Stat label="Open deletion requests" value={content[1].toLocaleString()} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <Stat label="Published member stories" value={content[2].toLocaleString()} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {floor && (
        <>
          <SectionRule label="The floor" className="mb-4 mt-10" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="py-4"><Stat label="Accounts" value={floor[0].toLocaleString()} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Suspended" value={floor[1].toLocaleString()} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Enrolments" value={floor[2].toLocaleString()} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Active challenges" value={floor[4].toLocaleString()} /></CardContent></Card>
          </div>
          <p className="figures mt-4 text-[12px] text-ink-3">
            Orders —{" "}
            {floor[3].length === 0
              ? "none yet"
              : floor[3].map((o) => `${o.status.toLowerCase()} ${o._count._all}`).join(" · ")}{" "}
            · miners {floor[5].toLocaleString()}
          </p>
        </>
      )}

      {economy && (
        <>
          <SectionRule label="Economy" className="mb-4 mt-10" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card variant="gold"><CardContent className="py-4"><Stat label="Provable supply" value={<ThcAmount amount={-economy[0].balance} size="sm" />} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Treasury" value={<ThcAmount amount={economy[1].balance} size="sm" />} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Rewards pool" value={<ThcAmount amount={economy[2].balance} size="sm" />} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Mining pool" value={<ThcAmount amount={economy[3].balance} size="sm" />} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Revenue (THC sink)" value={<ThcAmount amount={economy[4].balance} size="sm" />} /></CardContent></Card>
            <Card><CardContent className="py-4"><Stat label="Circulating (members)" value={<ThcAmount amount={economy[5]} size="sm" />} /></CardContent></Card>
          </div>
        </>
      )}
    </main>
  );
}
