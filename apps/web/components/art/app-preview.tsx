/**
 * The homepage's picture of the app: a phone showing Today, with the real
 * house standard on it, and three cards in the margin beside it — the progress
 * ring, the streak flame, the first rank's emblem.
 *
 * It is a picture of a fresh member's first morning, so every number on it
 * is the honest starting value (0 of N, day 0, the first rank). The
 * standard items are the house's real items, passed in from the database.
 */
import { Icon } from "@tycoonhood/ui";
import { DaySky } from "./day-sky";
import { ProgressRing, RankEmblem, StreakFlame } from "./emblems";

export type PreviewItem = { id: string; title: string; detail: string | null; auto: boolean };

export function AppPreview({ items, firstRank, rankCount }: { items: PreviewItem[]; firstRank: string | null; rankCount: number }) {
  return (
    <div className="relative mx-auto w-full max-w-[540px] py-6" aria-hidden>
      {/* Glow under the phone */}
      <div className="absolute inset-x-8 bottom-0 top-16 rounded-full bg-gold/10 blur-3xl" />

      {/* The phone */}
      <div className="relative mx-auto w-[min(100%,300px)] rounded-[38px] sm:mr-0 border border-line-strong bg-[#050505] p-2.5 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.8)]">
        <div className="overflow-hidden rounded-[30px] bg-bg-0">
          <div className="relative h-[118px]">
            <DaySky phase="dawn" className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/30 to-transparent" />
            <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-[#050505]" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-[10.5px] text-ink-2">Good morning.</p>
              <p className="text-[15px] font-semibold leading-tight">Today&rsquo;s standard</p>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5 px-3 pb-4 pt-1">
            {items.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-bg-1 px-3 py-2.5">
                <span className="size-4 shrink-0 rounded-[5px] border border-line-input" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">{s.title}</span>
                  {s.detail && <span className="block truncate text-[10.5px] text-ink-3">{s.detail}</span>}
                </span>
                {s.auto && <Icon name="bolt" size={11} className="shrink-0 text-ink-3" />}
              </li>
            ))}
          </ul>
          <div className="flex justify-around border-t border-line px-3 py-2.5 text-ink-3">
            {(["today", "courses", "chat", "miner"] as const).map((n, i) => (
              <Icon key={n} name={n} size={16} className={i === 0 ? "text-gold" : undefined} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute left-0 top-20 flex w-[210px] items-center gap-3 rounded-xl border border-line-strong bg-bg-1/95 p-3 pr-4 shadow-[var(--shadow-3)] backdrop-blur max-sm:hidden">
        <ProgressRing value={0} total={items.length} size={44} stroke={5} label="">
          <span className="text-[12px] font-semibold tabular-nums">0/{items.length}</span>
        </ProgressRing>
        <span className="text-[12px] leading-tight text-ink-2">
          Every item,
          <br />
          every day
        </span>
      </div>
      <div className="absolute left-6 top-[13.5rem] flex w-[190px] items-center gap-2.5 rounded-xl border border-line-strong bg-bg-1/95 p-3 pr-4 shadow-[var(--shadow-3)] backdrop-blur max-sm:hidden">
        <StreakFlame days={1} size={30} />
        <span className="text-[12px] leading-tight text-ink-2">
          Day one
          <br />
          starts today
        </span>
      </div>
      {firstRank && (
        <div className="absolute left-0 top-[21rem] flex w-[210px] items-center gap-2.5 rounded-xl border border-line-strong bg-bg-1/95 p-3 pr-4 shadow-[var(--shadow-3)] backdrop-blur max-sm:hidden">
          <RankEmblem tier={0} of={rankCount} size={34} />
          <span className="text-[12px] leading-tight text-ink-2">
            Everyone starts
            <br />
            as <span className="font-medium text-ink-1">{firstRank}</span>
          </span>
        </div>
      )}
    </div>
  );
}
