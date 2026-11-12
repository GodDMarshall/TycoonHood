import type { TimelineStep } from "@tycoonhood/core";
import { formatDayTime } from "@tycoonhood/core/src/time/format";

const dot: Record<TimelineStep["state"], string> = {
  done: "border-gold bg-gold",
  current: "border-gold bg-bg-0",
  upcoming: "border-line-strong bg-bg-0",
  stopped: "border-danger bg-danger/30",
};

/** The order's history as recorded facts, oldest first, in the member's zone (memberZone). */
export function OrderTimeline({ steps, zone }: { steps: TimelineStep[]; zone: string }) {
  return (
    <ol className="flex flex-col" aria-label="Order status">
      {steps.map((s, i) => (
        <li key={s.key + i} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden className="absolute left-[6px] top-4 h-[calc(100%-8px)] w-px bg-line-strong" />}
          <span aria-hidden className={`relative mt-1 size-[13px] shrink-0 rounded-full border-2 ${dot[s.state]}`} />
          <div className="min-w-0">
            <p className={`text-[14px] ${s.state === "upcoming" ? "text-ink-3" : "text-ink-1"}`}>
              {s.label}
              <span className="sr-only"> — {s.state}</span>
              {s.at && <span className="figures ml-2 text-[12px] text-ink-3">{formatDayTime(s.at, zone)}</span>}
            </p>
            {s.detail && <p className="mt-0.5 text-[12.5px] text-ink-2">{s.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
