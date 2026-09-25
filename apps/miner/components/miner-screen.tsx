"use client";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CoinMark, Progress, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { claimAction, upgradeAction, minerLogoutAction, type RigActionState } from "../app/actions";

export interface MinerData {
  rigLevel: number;
  maxLevel: number;
  ratePerHour: string;
  capacity: string;
  accrued: string;
  lastClaimAt: string;
  totalMined: string;
  balance: string;
  nextUpgradeCost: string | null;
  displayName: string;
  stats: { poolRemaining: string; miners: number; totalMined: string };
  openTasks: number;
  tasksCapReached: boolean;
  pendingInvites: number;
}

const fmt = (s: string) => BigInt(s).toLocaleString("en-US");

/** Cosmetic ticker only — the server recomputes accrual on every claim. */
function useLiveAccrued(data: MinerData) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const rate = BigInt(data.ratePerHour);
    const cap = BigInt(data.capacity);
    const elapsed = BigInt(Math.max(0, now - new Date(data.lastClaimAt).getTime()));
    const raw = (rate * elapsed) / 3_600_000n;
    return raw > cap ? cap : raw;
  }, [data, now]);
}

/** Time until storage fills, so the screen answers "when should I come back". */
function useTimeToFull(data: MinerData, accrued: bigint) {
  const cap = BigInt(data.capacity);
  const rate = BigInt(data.ratePerHour);
  if (accrued >= cap || rate === 0n) return null;
  const remainingMs = Number(((cap - accrued) * 3_600_000n) / rate);
  const h = Math.floor(remainingMs / 3_600_000);
  const m = Math.floor((remainingMs % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m until full` : `${m}m until full`;
}

export function MinerScreen({ data }: { data: MinerData }) {
  const accrued = useLiveAccrued(data);
  const cap = BigInt(data.capacity);
  const pct = cap === 0n ? 0 : Number((accrued * 100n) / cap);
  const full = accrued >= cap;
  const timeToFull = useTimeToFull(data, accrued);

  const [claimState, claimForm, claiming] = useActionState(async () => claimAction(), {} as RigActionState);
  const [upState, upForm, upgrading] = useActionState(async () => upgradeAction(), {} as RigActionState);
  const notice = claimState.error ?? upState.error ?? claimState.message ?? upState.message;
  const noticeIsError = !!(claimState.error ?? upState.error);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow">Tycoonhood Miner</p>
          <p className="text-[13px] text-ink-2">{data.displayName}</p>
        </div>
        <form action={minerLogoutAction}>
          <Button variant="ghost" size="sm" type="submit">Sign out</Button>
        </form>
      </header>

      {/* The rig */}
      <section className="flex flex-col items-center text-center">
        <div className={full ? "" : "rig-active"}>
          <CoinMark size={168} />
        </div>
        <p className="figures mt-6 text-[38px] leading-none text-gold-bright">
          {accrued.toLocaleString("en-US")}
        </p>
        <p className="mt-1 text-[12px] uppercase tracking-[0.2em] text-ink-3">THC in storage</p>

        <div className="mt-5 w-full">
          <Progress value={pct} />
          <div className="mt-1.5 flex justify-between">
            <span className="figures text-[11px] text-ink-3">
              {fmt(data.ratePerHour)} THC/h · Rig L{data.rigLevel}
            </span>
            <span className="figures text-[11px] text-ink-3">
              {full ? "Storage full — you are losing time" : (timeToFull ?? `cap ${fmt(data.capacity)}`)}
            </span>
          </div>
        </div>

        <form action={claimForm} className="mt-6 w-full">
          <Button type="submit" size="lg" loading={claiming} className="w-full" disabled={accrued === 0n}>
            {full ? "Storage full — claim now" : "Claim"}
          </Button>
        </form>

        {notice && (
          <p role="status" className={`mt-3 text-[13px] ${noticeIsError ? "text-danger" : "text-success"}`}>
            {notice}
          </p>
        )}
      </section>

      {/* Wallet + all-time */}
      <section className="mt-8 grid grid-cols-2 gap-3">
        <Card><CardContent className="py-4">
          <p className="eyebrow mb-1">Wallet</p>
          <ThcAmount amount={BigInt(data.balance)} size="sm" />
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="eyebrow mb-1">Mined all-time</p>
          <ThcAmount amount={BigInt(data.totalMined)} size="sm" />
        </CardContent></Card>
      </section>

      {/* Upgrade */}
      <Card variant="gold" className="mt-3">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-[14px] font-semibold text-ink-1">
              {data.nextUpgradeCost ? `Upgrade to Rig L${data.rigLevel + 1}` : "Rig at maximum level"}
            </p>
            {data.nextUpgradeCost && (
              <p className="figures text-[12px] text-ink-3">
                {fmt(data.nextUpgradeCost)} THC · +{fmt(String(BigInt(data.ratePerHour) / BigInt(data.rigLevel)))} THC/h, burned not minted
              </p>
            )}
          </div>
          {data.nextUpgradeCost && (
            <form action={upForm}>
              <Button
                type="submit"
                size="sm"
                loading={upgrading}
                disabled={BigInt(data.balance) < BigInt(data.nextUpgradeCost)}
              >
                Upgrade
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Other ways to earn — shown only when there is something waiting */}
      {(data.openTasks > 0 || data.pendingInvites > 0) && (
        <>
          <SectionRule label="The rig is not the only way" className="mb-4 mt-10" />
          <div className="flex flex-col gap-2">
            {data.openTasks > 0 && (
              <Link href="/tasks" className="block">
                <Card><CardContent className="flex items-center justify-between py-3.5">
                  <span className="text-[13px] text-ink-1">
                    {data.openTasks} video{data.openTasks === 1 ? "" : "s"} waiting
                  </span>
                  <Badge tone={data.tasksCapReached ? "neutral" : undefined}>
                    {data.tasksCapReached ? "Back tomorrow" : "Watch to earn"}
                  </Badge>
                </CardContent></Card>
              </Link>
            )}
            {data.pendingInvites > 0 && (
              <Link href="/squad" className="block">
                <Card><CardContent className="flex items-center justify-between py-3.5">
                  <span className="text-[13px] text-ink-1">
                    {data.pendingInvites} invite{data.pendingInvites === 1 ? "" : "s"} not started yet
                  </span>
                  <Badge tone="neutral">Nudge them</Badge>
                </CardContent></Card>
              </Link>
            )}
          </div>
        </>
      )}

      {/* Global books */}
      <SectionRule label="The open books" className="mb-4 mt-10" />
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="figures text-[15px]">{fmt(data.stats.poolRemaining)}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-3">Pool left</p>
        </div>
        <div>
          <p className="figures text-[15px]">{data.stats.miners.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-3">Miners</p>
        </div>
        <div>
          <p className="figures text-[15px]">{fmt(data.stats.totalMined)}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-3">Mined total</p>
        </div>
      </div>

      <footer className="mt-10 border-t border-line pt-4 text-center">
        <p className="text-[11px] leading-relaxed text-ink-3">
          Mining distributes from a finite pool — supply is fixed and provable.
          THC are internal utility credits, not money and not redeemable.
        </p>
      </footer>
    </main>
  );
}
