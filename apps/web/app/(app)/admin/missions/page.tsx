import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { tryParseCriteria, describeCriteria } from "@tycoonhood/core";
import { Badge, Button, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { MissionForm } from "../../../../components/admin-mission-form";
import { toggleMissionAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Missions" };
export const dynamic = "force-dynamic";

export default async function AdminMissions() {
  await requireAdmin();

  const missions = await prisma.mission.findMany({
    orderBy: [{ active: "desc" }, { slug: "asc" }],
    include: { _count: { select: { completions: true } } },
  });

  return (
    <main>
      <h1 className="display text-h2">Missions</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-2">
        A mission is a rule, not code. Write one here and the engine starts paying it on the next
        qualifying action — no deploy. The rule is checked against real records every time, so a
        mission added today recognises work a member did last month.
      </p>

      <SectionRule label={`${missions.length} missions`} className="mb-4 mt-8" />

      <div className="flex flex-col gap-2">
        {missions.length === 0 && (
          <p className="text-[14px] text-ink-3">No missions yet. The first one goes below.</p>
        )}
        {missions.map((m) => {
          const c = tryParseCriteria(m.criteria);
          return (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] text-ink-1">
                    {m.name}{" "}
                    <span className="figures text-[11px] text-ink-3">/{m.slug}</span>
                  </p>
                  <p className="text-[12px] text-ink-2">
                    {c ? (
                      <>Pays when they {describeCriteria(c)}.</>
                    ) : (
                      <span className="text-danger">
                        Unreadable rule — the engine skips this mission entirely.
                      </span>
                    )}
                  </p>
                  <p className="figures mt-0.5 text-[11px] text-ink-3">
                    +{m.xpReward} XP · <ThcAmount amount={m.thcReward} size="sm" /> ·{" "}
                    {m.repeatable
                      ? m.cooldownHours
                        ? `repeatable every ${m.cooldownHours}h`
                        : "repeatable daily"
                      : "one-off"}{" "}
                    · {m._count.completions} completed
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <Badge tone={m.active ? "success" : "neutral"}>{m.active ? "Live" : "Paused"}</Badge>
                  <form action={toggleMissionAction.bind(null, m.id)}>
                    <Button size="sm" variant="outline" type="submit">
                      {m.active ? "Pause" : "Activate"}
                    </Button>
                  </form>
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SectionRule label="New mission" className="mb-4 mt-10" />
      <Card>
        <CardContent className="py-5">
          <MissionForm />
        </CardContent>
      </Card>
    </main>
  );
}
