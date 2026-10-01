"use client";
/**
 * THE RIG screen — the live half. Ported from apps/miner's MinerScreen.
 *
 * The ticker is cosmetic: it projects the server's own accrual formula
 * (rate × elapsed, capped at capacity) forward one second at a time. The
 * server recomputes accrual on every claim and never trusts this figure.
 *
 * Components only — nothing else is exported from this "use client" module.
 */
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Badge, Button, Icon, Progress, ThcAmount, cn } from "@tycoonhood/ui";
import { claimAction, upgradeAction } from "../../app/(app)/mining/actions";
import { RigVisual } from "./rig-visual";
import type { MinerData, RigActionState } from "./types";

const fmt = (s: string | bigint) => BigInt(s).toLocaleString("en-US");

/** Cosmetic ticker only — the server recomputes accrual on every claim. */
function useLiveAccrued(data: MinerData) {
  // Start from the server's clock so the first client paint matches the HTML.
  const [now, setNow] = useState(() => new Date(data.now).getTime());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data.now]);
  return useMemo(() => {
    const rate = BigInt(data.ratePerHour);
    const cap = BigInt(data.capacity);
    const elapsed = BigInt(Math.max(0, now - new Date(data.lastClaimAt).getTime()));
    const raw = (rate * elapsed) / 3_600_000n;
    return raw > cap ? cap : raw;
  }, [data.ratePerHour, data.capacity, data.lastClaimAt, now]);
}

/** Time until storage fills, so the screen answers "when should I come back". */
function useTimeToFull(data: MinerData, accrued: bigint) {
  const cap = BigInt(data.capacity);
  const rate = BigInt(data.ratePerHour);
  if (accrued >= cap || rate === 0n) return null;
  const remainingMs = Number(((cap - accrued) * 3_600_000n) / rate);
  const h = Math.floor(remainingMs / 3_600_000);
  const m = Math.floor((remainingMs % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg border border-line bg-bg-1 px-4 py-3.5", className)}>
      <p className="text-[12px] font-medium text-ink-3">{label}</p>
      <div className="mt-1.5 min-w-0 truncate">{children}</div>
    </div>
  );
}

export function RigConsole({ data }: { data: MinerData }) {
  const accrued = useLiveAccrued(data);
  const cap = BigInt(data.capacity);
  const fill = cap === 0n ? 0 : Number((accrued * 10_000n) / cap) / 10_000;
  const full = accrued >= cap;
  const timeToFull = useTimeToFull(data, accrued);
  const [burstKey, setBurstKey] = useState(0);

  const [claimState, claimForm, claiming] = useActionState(async (): Promise<RigActionState> => {
    const r = await claimAction();
    if (r.claimed) setBurstKey((k) => k + 1);
    return r;
  }, {});
  const [upState, upForm, upgrading] = useActionState(async (): Promise<RigActionState> => upgradeAction(), {});
  const notice = claimState.error ?? upState.error ?? claimState.message ?? upState.message;
  const noticeIsError = !!(claimState.error ?? upState.error);

  const balance = BigInt(data.balance);
  const cost = data.nextUpgradeCost == null ? null : BigInt(data.nextUpgradeCost);
  const short = cost != null && balance < cost ? cost - balance : null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* The rig */}
        <section
          aria-label="Your rig"
          className="relative min-w-0 overflow-hidden rounded-xl border border-line-strong bg-bg-2 shadow-[var(--shadow-3)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgb(207_169_94/0.14),transparent_65%)]"
          />
          <div className="relative flex items-center justify-between gap-3 px-5 pt-4">
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <span aria-hidden className={cn("size-1.5 rounded-full", full ? "bg-warning" : "bg-success")} />
              <span className={full ? "text-warning" : "text-success"}>{full ? "Storage full — idle" : "Mining"}</span>
            </span>
            <Badge tone="gold">
              Rig L{data.rigLevel} <span className="text-ink-3">/ {data.maxLevel}</span>
            </Badge>
          </div>
          <div className="relative px-2 pb-2 sm:px-6 sm:pb-4">
            <RigVisual level={data.rigLevel} maxLevel={data.maxLevel} fill={fill} full={full} burstKey={burstKey} />
          </div>
        </section>

        {/* The live counter and the claim */}
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-label="Storage" className="min-w-0 rounded-xl border border-line bg-bg-1 p-5 shadow-[var(--shadow-1)]">
            <p className="text-[13px] font-medium text-ink-3">In storage</p>
            <p className="mt-1 flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[40px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-gold-bright sm:text-[48px]">
                {accrued.toLocaleString("en-US")}
              </span>
              <span className="text-[13px] font-medium tracking-[0.08em] text-ink-3">THC</span>
            </p>

            <Progress value={fill * 100} label="Storage filled" className="mt-5" />
            <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[12.5px] tabular-nums text-ink-3">
              <span>
                {accrued.toLocaleString("en-US")} / {fmt(data.capacity)}
              </span>
              <span className={full ? "text-warning" : undefined}>
                {full ? "Full — you are losing time" : timeToFull ? `${timeToFull} until full` : null}
              </span>
            </div>

            <form action={claimForm} className="mt-5">
              <Button type="submit" size="lg" loading={claiming} className="w-full" disabled={accrued === 0n}>
                <Icon name="download" size={17} />
                {full ? "Storage full — claim now" : "Claim to wallet"}
              </Button>
            </form>
            {notice && (
              <p role="status" className={cn("mt-3 text-[13px]", noticeIsError ? "text-danger" : "text-success")}>
                {notice}
              </p>
            )}
          </section>

          <div className="grid min-w-0 grid-cols-2 gap-3">
            <Tile label="Rate">
              <span className="text-[17px] font-semibold tabular-nums text-ink-1">{fmt(data.ratePerHour)}</span>
              <span className="ml-1 text-[12px] text-ink-3">THC/h</span>
            </Tile>
            <Tile label="Storage">
              <span className="text-[17px] font-semibold tabular-nums text-ink-1">{data.capacityHours}h</span>
              <span className="ml-1 text-[12px] text-ink-3">of output</span>
            </Tile>
            <Tile label="Wallet">
              <ThcAmount amount={balance} size="sm" />
            </Tile>
            <Tile label="Mined all-time">
              <ThcAmount amount={BigInt(data.totalMined)} size="sm" />
            </Tile>
          </div>
        </div>
      </div>

      {/* Upgrade */}
      <section
        aria-label="Upgrade"
        className={cn(
          "min-w-0 rounded-xl border bg-bg-1 p-5",
          cost != null ? "border-gold-deep/60 shadow-[var(--shadow-gold)]" : "border-line"
        )}
      >
        {cost == null ? (
          <div className="flex items-center gap-3">
            <Icon name="check" size={18} className="text-success" />
            <p className="text-[15px] font-semibold text-ink-1">Rig at maximum level (L{data.maxLevel}).</p>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink-3">Next upgrade</p>
              <p className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-ink-1">
                Rig L{data.rigLevel} → L{data.rigLevel + 1}
              </p>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13.5px] tabular-nums sm:grid-cols-2">
                {data.nextRatePerHour && (
                  <div className="flex gap-2">
                    <dt className="text-ink-3">Rate</dt>
                    <dd className="text-ink-1">
                      {fmt(data.ratePerHour)} → <span className="text-gold-bright">{fmt(data.nextRatePerHour)}</span> THC/h
                    </dd>
                  </div>
                )}
                {data.nextCapacity && (
                  <div className="flex gap-2">
                    <dt className="text-ink-3">Storage</dt>
                    <dd className="text-ink-1">
                      {fmt(data.capacity)} → <span className="text-gold-bright">{fmt(data.nextCapacity)}</span> THC
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 max-w-[60ch] text-[12.5px] leading-relaxed text-ink-3">
                Burned, not minted: the cost leaves your wallet as a ledger spend, and no new THC is created to pay
                for the faster rig. Whatever is in storage is banked at the old rate first.
              </p>
            </div>
            <form action={upForm} className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">
              <ThcAmount amount={cost} size="lg" />
              <Button type="submit" variant="secondary" loading={upgrading} disabled={short != null}>
                <Icon name="ascent" size={16} /> Upgrade
              </Button>
              {short != null && (
                <span className="text-[12px] tabular-nums text-ink-3">{short.toLocaleString("en-US")} THC to go</span>
              )}
            </form>
          </div>
        )}
      </section>

      {/* Other ways to earn — shown only when there is something real waiting */}
      {(data.openTasks > 0 || data.pendingInvites > 0) && (
        <section aria-label="Other ways to earn" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {data.openTasks > 0 && (
            <Link
              href="/mining/tasks"
              className="group flex min-w-0 items-center gap-3 rounded-lg border border-line bg-bg-1 px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-2"
            >
              <Icon name="play" size={18} className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink-1">
                {data.openTasks} video{data.openTasks === 1 ? "" : "s"} waiting
              </span>
              <Badge tone={data.tasksCapReached ? "neutral" : "gold"}>{data.tasksCapReached ? "Back tomorrow" : "Watch to earn"}</Badge>
            </Link>
          )}
          {data.pendingInvites > 0 && (
            <Link
              href="/mining/squad"
              className="group flex min-w-0 items-center gap-3 rounded-lg border border-line bg-bg-1 px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-2"
            >
              <Icon name="network" size={18} className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink-1">
                {data.pendingInvites} invite{data.pendingInvites === 1 ? "" : "s"} not started yet
              </span>
              <Badge tone="neutral">Nudge them</Badge>
            </Link>
          )}
        </section>
      )}

      {/* The open books */}
      <section aria-labelledby="open-books" className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="open-books" className="text-[16px] font-semibold tracking-[-0.01em] text-ink-1">
            The open books
          </h2>
          <Link href="/mining/ranks" className="text-[13px] font-medium text-gold hover:underline underline-offset-4">
            Ranks
          </Link>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <Tile label="Pool left">
            <span className="text-[17px] font-semibold tabular-nums text-ink-1">{fmt(data.stats.poolRemaining)}</span>
          </Tile>
          <Tile label="Miners">
            <span className="text-[17px] font-semibold tabular-nums text-ink-1">{data.stats.miners.toLocaleString("en-US")}</span>
          </Tile>
          <Tile label="Mined total">
            <span className="text-[17px] font-semibold tabular-nums text-ink-1">{fmt(data.stats.totalMined)}</span>
          </Tile>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
          Mining distributes from a finite pool — supply is fixed and provable. THC are internal utility credits, not
          money and not redeemable.{" "}
          <Link href="/wallet" className="text-ink-2 underline underline-offset-2 hover:text-ink-1">
            See every movement in your wallet.
          </Link>
        </p>
      </section>
    </div>
  );
}
