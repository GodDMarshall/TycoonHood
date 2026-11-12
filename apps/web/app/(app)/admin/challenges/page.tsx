import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { challenges as challengeService } from "@tycoonhood/core";
import { Badge, Card, CardContent } from "@tycoonhood/ui";
import { reviewSubmissionAction, setChallengeLifecycleAction } from "../actions";
import { ReviewCard } from "../../../../components/admin-review-card";
import { SectionRule } from "@tycoonhood/ui";
import { ConfirmButton } from "../../../../components/admin-confirm";

export const metadata: Metadata = { title: "Admin · Challenges" };
export const dynamic = "force-dynamic";

export default async function AdminChallenges() {
  await requireAdmin();
  const queue = await challengeService.pendingSubmissions();
  const list = await prisma.challenge.findMany({
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { participations: true } } },
  });
  return (
    <main>
      <h1 className="display text-h2">Challenges</h1>
      <p className="mt-2 text-[13px] text-ink-2">
        Lifecycles advance automatically by date; these controls override. Evidence submissions queue below —
        approvals pay through the same idempotent reward path as check-ins.
      </p>
      <SectionRule label={`Review queue (${queue.length})`} className="mb-4 mt-8" />
      {queue.length === 0 ? (
        <p className="text-[13px] text-ink-3">Nothing pending. Submissions land here the moment members send evidence.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {queue.map((q) => (
            <Card key={q.submissionId}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] text-ink-1">
                    @{q.username} · <span className="text-ink-2">{q.challengeName}</span>
                  </p>
                  <span className="figures text-[11px] text-ink-3">
                    {q.approved}/{q.required} approved · {q.participantStatus}
                  </span>
                </div>
                <p className="whitespace-pre-wrap rounded-md border border-line bg-bg-1 px-3 py-2 text-[13px] text-ink-2">{q.text}</p>
                {q.url && (
                  <a href={q.url} target="_blank" rel="noreferrer" className="figures break-all text-[12px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
                    {q.url}
                  </a>
                )}
                <ReviewCard
                  approveAction={reviewSubmissionAction.bind(null, q.participationId, q.submissionId, true)}
                  rejectAction={reviewSubmissionAction.bind(null, q.participationId, q.submissionId, false)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SectionRule label="Lifecycles" className="mb-4 mt-10" />
      <div className="flex flex-col gap-2">
        {list.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="text-[14px] text-ink-1">
                {c.name}{" "}
                <span className="figures text-[11px] text-ink-3">{c._count.participations} entered</span>
              </p>
              <span className="flex items-center gap-2">
                <Badge tone={c.lifecycle === "ACTIVE" ? "success" : c.lifecycle === "ENDED" ? "neutral" : "gold"}>{c.lifecycle}</Badge>
                {c.lifecycle === "UPCOMING" && (
                  <ConfirmButton action={setChallengeLifecycleAction.bind(null, c.id, "ACTIVE")} label="Activate now" confirmText={`Open '${c.name}' for check-ins now?`} />
                )}
                {c.lifecycle === "ACTIVE" && (
                  <ConfirmButton action={setChallengeLifecycleAction.bind(null, c.id, "ENDED")} label="End now" confirmText={`End '${c.name}'? Unfinished participants will be marked FAILED.`} />
                )}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
