/**
 * A compact rig status for other member pages (e.g. Today).
 *
 * Server-renderable: no "use client", no hooks, no client-only exports. It
 * shows the figures it is handed as of the request — the live ticker belongs
 * to /mining. Feed it straight from mining.preview(userId):
 *
 *   const p = await mining.preview(user.id);
 *   <TodayMiningCard level={p.rigLevel} maxLevel={p.maxLevel}
 *     accrued={p.accrued} capacity={p.capacity} ratePerHour={p.ratePerHour} />
 */
import Link from "next/link";
import { Icon, cn } from "@tycoonhood/ui";

type Amount = bigint | number | string;

export type TodayMiningCardProps = {
  level: number;
  /** Optional; shown as "L3 / 10" when given. */
  maxLevel?: number;
  /** THC in storage now (mining.preview().accrued). */
  accrued: Amount;
  /** Storage cap (mining.preview().capacity). */
  capacity: Amount;
  /** THC per hour (mining.preview().ratePerHour). */
  ratePerHour: Amount;
  className?: string;
};

const big = (v: Amount) => (typeof v === "bigint" ? v : BigInt(typeof v === "number" ? Math.trunc(v) : v));

export function TodayMiningCard({ level, maxLevel, accrued, capacity, ratePerHour, className }: TodayMiningCardProps) {
  const acc = big(accrued);
  const cap = big(capacity);
  const rate = big(ratePerHour);
  const shown = acc > cap ? cap : acc;
  const pct = cap === 0n ? 0 : Number((shown * 1000n) / cap) / 10;
  const full = cap > 0n && shown >= cap;

  return (
    <section
      aria-label="Your rig"
      className={cn(
        "min-w-0 rounded-lg border bg-bg-1 p-4",
        full ? "border-gold-deep/60 shadow-[var(--shadow-gold)]" : "border-line",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[14px] font-semibold text-ink-1">
          <Icon name="miner" size={17} className="shrink-0 text-gold" />
          <span className="truncate">Rig L{level}</span>
          {maxLevel != null && <span className="text-[12px] font-normal tabular-nums text-ink-3">/ {maxLevel}</span>}
        </span>
        <span className={cn("shrink-0 text-[12.5px] font-medium", full ? "text-warning" : "text-success")}>
          {full ? "Storage full" : "Mining"}
        </span>
      </div>

      <p className="mt-3 flex min-w-0 items-baseline gap-1.5">
        <span className="truncate text-[22px] font-semibold leading-none tabular-nums text-gold-bright">
          {shown.toLocaleString("en-US")}
        </span>
        <span className="text-[12px] text-ink-3">/ {cap.toLocaleString("en-US")} THC</span>
      </p>

      <div
        role="progressbar"
        aria-label="Rig storage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold-shadow),var(--color-gold)_70%,var(--color-gold-bright))]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[12.5px] tabular-nums text-ink-3">{rate.toLocaleString("en-US")} THC/h</span>
        <Link href="/mining" className="inline-flex items-center gap-1 text-[13px] font-medium text-gold hover:underline underline-offset-4">
          {full ? "Claim on the rig" : "Open the rig"}
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </section>
  );
}
