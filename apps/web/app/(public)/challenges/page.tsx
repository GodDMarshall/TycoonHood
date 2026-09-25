import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { challenges as challengeService } from "@tycoonhood/core";
import { Badge, Button, Card, CardContent, PillarBadge, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";
import { joinChallengeAction, withdrawChallengeAction, checkInChallengeAction, submitEvidenceAction } from "../../(app)/challenges/actions";
import { CheckInButton } from "../../../components/checkin-button";
import { SubmitEvidence } from "../../../components/submit-evidence";
import { ChallengeService, type Submission } from "@tycoonhood/core";
import Link from "next/link";

export const metadata: Metadata = { title: "Challenges" };
export const dynamic = "force-dynamic";
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function ChallengesPage() {
  const user = await getCurrentUser();
  await challengeService.sweepLifecycles();
  const list = await prisma.challenge.findMany({
    where: { lifecycle: { in: ["UPCOMING", "ACTIVE", "ENDED"] } },
    orderBy: [{ startsAt: "asc" }],
    include: user ? { participations: { where: { userId: user.id } } } : undefined,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="eyebrow mb-3">Challenges</p>
      <h1 className="display text-[40px] leading-tight">Timeboxed. Verifiable. Failable.</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        Challenges have start dates, completion criteria, and failure states.
        Finish one and the reward posts to your ledger; miss it and the record
        says so. That is the point.
      </p>

      <SectionRule label="The calendar" className="mb-6 mt-12" />
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((c) => {
          const p = (c as typeof c & { participations?: { status: string; progress: unknown }[] }).participations?.[0];
          const prog = p?.progress as { checkins?: string[]; submissions?: Submission[] } | null;
          const progress = prog?.checkins?.length ?? 0;
          const isCheckin = (c.criteria as { event?: string }).event === "DAILY_CHECKIN";
          const required = ChallengeService.requiredApprovals(c.criteria);
          const subs = prog?.submissions ?? [];
          const approvedSubs = subs.filter((x) => x.status === "APPROVED").length;
          const pendingSubs = subs.filter((x) => x.status === "PENDING").length;
          return (
            <Card key={c.id} variant={p?.status === "COMPLETED" ? "gold" : "default"}>
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-center justify-between">
                  {c.pillar ? <PillarBadge pillar={c.pillar} /> : <span />}
                  <Badge tone={c.lifecycle === "ACTIVE" ? "success" : c.lifecycle === "ENDED" ? "neutral" : "gold"}>
                    {c.lifecycle === "ACTIVE" ? "Live" : c.lifecycle === "ENDED" ? "Ended" : "Upcoming"}
                  </Badge>
                </div>
                <h2 className="display text-[20px]">{c.name}</h2>
                <p className="flex-1 text-[13px] leading-relaxed text-ink-2">{c.description}</p>
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="figures text-[12px] text-ink-3">
                    {c.startsAt ? dateFmt.format(c.startsAt) : "TBA"}{c.endsAt ? ` – ${dateFmt.format(c.endsAt)}` : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone="gold">+{c.xpReward} XP</Badge>
                    <ThcAmount amount={c.thcReward} signed size="sm" />
                  </span>
                </div>

                {user ? (
                  p ? (
                    <>
                    <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                      <Badge tone={p.status === "COMPLETED" ? "success" : p.status === "FAILED" ? "danger" : "neutral"}>
                        {p.status === "JOINED" ? `Entered · ${progress} check-ins` : p.status}
                      </Badge>
                      <span className="flex items-center gap-2">
                        {p.status === "JOINED" && c.lifecycle === "ACTIVE" && isCheckin && (
                          <CheckInButton action={checkInChallengeAction.bind(null, c.slug)} label="Check in" />
                        )}
                        {p.status === "JOINED" && (
                          <form action={withdrawChallengeAction.bind(null, c.slug)}>
                            <Button variant="ghost" size="sm" type="submit">Withdraw</Button>
                          </form>
                        )}
                      </span>
                    </div>
                    {p.status === "JOINED" && c.lifecycle === "ACTIVE" && required != null && (
                      <SubmitEvidence
                        action={submitEvidenceAction.bind(null, c.slug)}
                        approved={approvedSubs}
                        required={required}
                        pending={pendingSubs}
                      />
                    )}
                    </>
                  ) : (
                    ["UPCOMING", "ACTIVE"].includes(c.lifecycle) && (
                      <form action={joinChallengeAction.bind(null, c.slug)} className="border-t border-line pt-3">
                        <Button size="sm" type="submit">Enter challenge</Button>
                      </form>
                    )
                  )
                ) : (
                  ["UPCOMING", "ACTIVE"].includes(c.lifecycle) && (
                    <p className="border-t border-line pt-3 text-[12px] text-ink-3">
                      <Link href="/register" className="text-gold hover:underline underline-offset-4">Join Tycoonhood</Link> to enter.
                    </p>
                  )
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
