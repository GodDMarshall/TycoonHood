/**
 * The daily standard as a contribution-style grid: one column per week,
 * Monday at the top, one small square per day — met, started, or
 * untouched. Real days from the record; nothing projected.
 */
import { cn } from "@tycoonhood/ui";
import type { StandardHistoryDay } from "@tycoonhood/core";

const label = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** 0 = Monday … 6 = Sunday, for a YYYY-MM-DD key. */
const weekday = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;

export function RecordGrid({ days, metDays, size = 14 }: { days: StandardHistoryDay[]; metDays: number; size?: number }) {
  const pad = days.length ? weekday(days[0].day) : 0;
  return (
    <figure>
      <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-1 text-[10px] leading-none text-ink-3" aria-hidden style={{ gridAutoRows: size }}>
          {["M", "", "W", "", "F", "", ""].map((d, i) => (
            <span key={i} className="flex items-center" style={{ height: size }}>
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label={`Standard met on ${metDays} of the last ${days.length} days`}>
          {Array.from({ length: pad }, (_, i) => (
            <span key={`pad-${i}`} style={{ width: size, height: size }} aria-hidden />
          ))}
          {days.map((d) => (
            <span
              key={d.day}
              title={`${label(d.day)} — ${d.met ? "standard met" : d.ticked ? `${d.ticked} ticked` : "nothing ticked"}`}
              style={{ width: size, height: size }}
              className={cn("rounded-[3px]", d.met ? "bg-gold" : d.ticked ? "bg-gold/35" : "bg-bg-3")}
            />
          ))}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-3">
        <span>
          Met on <span className="tabular-nums text-ink-1">{metDays}</span> of the last {days.length} days
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-bg-3" /> none
          <span aria-hidden className="ml-1.5 size-2.5 rounded-[3px] bg-gold/35" /> started
          <span aria-hidden className="ml-1.5 size-2.5 rounded-[3px] bg-gold" /> met
        </span>
      </figcaption>
    </figure>
  );
}
