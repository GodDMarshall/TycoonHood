import type { Metadata } from "next";
import { requireAdmin } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { Badge, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { reverseTxAction } from "../actions";
import { ConfirmButton } from "../../../../components/admin-confirm";

export const metadata: Metadata = { title: "Admin · Economy" };
export const dynamic = "force-dynamic";
const dt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function AdminEconomy() {
  await requireAdmin();
  const [accounts, txs] = await Promise.all([
    prisma.ledgerAccount.findMany({ where: { type: { not: "USER" } }, orderBy: { type: "asc" } }),
    prisma.ledgerTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { entries: { include: { account: { include: { user: { include: { profile: true } } } } } } },
    }),
  ]);

  return (
    <main>
      <h1 className="display text-h2">The books.</h1>
      <SectionRule label="System accounts" className="mb-4 mt-8" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardContent className="py-4">
              <p className="eyebrow mb-1">{a.type}</p>
              <ThcAmount amount={a.balance} size="sm" />
            </CardContent>
          </Card>
        ))}
      </div>
      <SectionRule label="Recent transactions" className="mb-4 mt-10" />
      <div className="flex flex-col gap-2">
        {txs.map((tx) => (
          <Card key={tx.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[13px] text-ink-1">
                  <Badge>{tx.reason}</Badge>
                  <span className="ml-2">{tx.memo ?? ""}</span>
                </p>
                <p className="figures mt-1 text-[11px] text-ink-3">
                  {dt.format(tx.createdAt)} ·{" "}
                  {tx.entries
                    .map((e) => `${e.account.type === "USER" ? "@" + (e.account.user?.profile?.username ?? "user") : e.account.type} ${e.amount > 0n ? "+" : ""}${e.amount}`)
                    .join("  ")}
                </p>
              </div>
              {tx.reversesId == null && tx.status !== "REVERSED" && (
                <ConfirmButton
                  action={reverseTxAction.bind(null, tx.id)}
                  label="Reverse"
                  confirmText="Post a full reversing transaction? The original stays on the books forever."
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
