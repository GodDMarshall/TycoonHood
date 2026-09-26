import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { Badge, Card, CardContent, Input, ThcAmount } from "@tycoonhood/ui";
import { grantThcAction, grantXpAction } from "../actions";
import { GrantForms } from "../../../../components/admin-grant-forms";

export const metadata: Metadata = { title: "Admin · Members" };
export const dynamic = "force-dynamic";

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const members = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { profile: { username: { contains: q, mode: "insensitive" } } },
            { profile: { displayName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { profile: true, rank: true, ledgerAccount: true },
  });

  return (
    <main>
      <h1 className="display text-h2">Members</h1>
      <form className="mt-4 max-w-sm">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search email, username, name…" />
      </form>
      <div className="mt-6 flex flex-col gap-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-[14px] text-ink-1">
                  {m.profile?.displayName ?? m.name ?? "—"}{" "}
                  <span className="figures text-[11px] text-ink-3">@{m.profile?.username ?? "no-profile"} · {m.email}</span>
                </p>
                <p className="figures mt-1 flex items-center gap-3 text-[12px] text-ink-2">
                  <Badge tone={m.role === "ADMIN" ? "gold" : "neutral"}>{m.role}</Badge>
                  L{m.level} · {m.xp.toLocaleString()} XP
                  {m.ledgerAccount && <ThcAmount amount={m.ledgerAccount.balance} size="sm" />}
                </p>
              </div>
              {m.role === "MEMBER" && (
                <GrantForms
                  thcAction={grantThcAction.bind(null, m.id)}
                  xpAction={grantXpAction.bind(null, m.id)}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
