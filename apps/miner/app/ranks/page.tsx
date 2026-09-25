import { mining } from "@tycoonhood/core";
import { Badge, SectionRule } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { MinerLogin } from "../../components/miner-login";
import { MinerHeader } from "../../components/miner-header";
import { prisma } from "@tycoonhood/db";

export const dynamic = "force-dynamic";
const MAIN_SITE = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000";
const fmt = (n: bigint) => n.toLocaleString("en-US");

export default async function RanksPage() {
  const user = await getCurrentUser();
  if (!user) return <MinerLogin mainSiteUrl={MAIN_SITE} />;

  const [stats, mine] = await Promise.all([
    mining.stats(),
    prisma.minerState.findUnique({ where: { userId: user.id } }),
  ]);

  // Your standing, computed rather than guessed: how many rigs have mined more.
  const ahead = mine
    ? await prisma.minerState.count({ where: { totalMined: { gt: mine.totalMined } } })
    : null;
  const myPosition = ahead == null ? null : ahead + 1;
  const inTopTen = stats.top.some((t) => t.username === user.profile?.username);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-8">
      <MinerHeader name={user.profile?.displayName ?? user.name ?? "Miner"} />

      <p className="eyebrow mb-1">Ranks</p>
      <h1 className="display text-[26px] leading-tight">The books are open.</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
        Every figure here is read from the ledger, not from a cache. Anyone can
        check the supply against the mint at any time.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="figures text-[15px]">{fmt(stats.poolRemaining)}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-3">Pool left</p>
        </div>
        <div>
          <p className="figures text-[15px]">{stats.miners.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-3">Miners</p>
        </div>
        <div>
          <p className="figures text-[15px]">{fmt(stats.totalMined)}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-3">Mined total</p>
        </div>
      </div>

      {myPosition != null && (
        <div className="mt-5 rounded-md border border-gold-deep/40 bg-gold-deep/5 px-4 py-3">
          <p className="text-[13px] text-ink-1">
            You are <span className="figures text-gold-bright">#{myPosition}</span> of{" "}
            {stats.miners.toLocaleString()} rigs.
          </p>
          {mine && (
            <p className="figures mt-0.5 text-[11px] text-ink-3">
              {fmt(mine.totalMined)} mined · Rig L{mine.rigLevel}
            </p>
          )}
        </div>
      )}

      <SectionRule label="Top rigs" className="mb-4 mt-8" />
      {stats.top.length === 0 ? (
        <p className="text-[13px] text-ink-3">Nobody has mined yet. Be the first.</p>
      ) : (
        <div className="flex flex-col">
          {stats.top.map((t) => {
            const isMe = t.username === user.profile?.username;
            return (
              <div
                key={t.username}
                className={`flex items-baseline justify-between border-b border-line py-2.5 last:border-0 ${
                  isMe ? "-mx-2 rounded bg-gold-deep/8 px-2" : ""
                }`}
              >
                <span className="flex items-baseline gap-2.5 text-[13px]">
                  <span className="figures w-5 text-[11px] text-gold-deep">
                    {String(t.position).padStart(2, "0")}
                  </span>
                  <span className={isMe ? "text-gold-bright" : "text-ink-1"}>{t.displayName}</span>
                  <Badge className="ml-1">L{t.rigLevel}</Badge>
                </span>
                <span className="figures text-[12px] text-ink-2">{fmt(t.totalMined)}</span>
              </div>
            );
          })}
        </div>
      )}

      {!inTopTen && myPosition != null && myPosition > 10 && (
        <p className="mt-4 text-[12px] text-ink-3">
          {(myPosition - 10).toLocaleString()} places from the board.
        </p>
      )}
    </main>
  );
}
