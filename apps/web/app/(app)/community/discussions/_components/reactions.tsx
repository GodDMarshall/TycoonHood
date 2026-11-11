"use client";
import { useState, useTransition } from "react";
import { cn } from "@tycoonhood/ui";
import { reactAction } from "../actions";

const KINDS = [
  { kind: "respect", label: "Respect" },
  { kind: "insight", label: "Insight" },
  { kind: "fire", label: "Fire" },
] as const;
type Kind = (typeof KINDS)[number]["kind"];

/** Three reactions. Your own writing shows counts but cannot be reacted to. */
export function Reactions({
  postId,
  target,
  counts,
  mine,
  own,
  disabled,
}: {
  postId: string;
  target: { type: "post" | "comment"; id: string };
  counts: Record<Kind, number>;
  mine: Kind[];
  own: boolean;
  disabled?: boolean;
}) {
  const [state, setState] = useState({ counts, mine: new Set(mine) });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (k: Kind) => {
    const on = !state.mine.has(k);
    const next = new Set(state.mine);
    if (on) next.add(k);
    else next.delete(k);
    setState({ counts: { ...state.counts, [k]: Math.max(0, state.counts[k] + (on ? 1 : -1)) }, mine: next });
    setError(null);
    start(async () => {
      const r = await reactAction(postId, target.type, target.id, k);
      if (r.error) {
        setError(r.error);
        setState({ counts, mine: new Set(mine) });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {KINDS.map(({ kind, label }) => {
        const on = state.mine.has(kind);
        const n = state.counts[kind];
        if (own || disabled) {
          return n > 0 ? (
            <span key={kind} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-[12.5px] text-ink-3">
              {label} <span className="tabular-nums">{n}</span>
            </span>
          ) : null;
        }
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            disabled={pending}
            aria-pressed={on}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] transition-colors",
              on ? "border-gold-deep bg-gold/[0.08] text-gold-bright" : "border-line-strong text-ink-2 hover:border-gold-deep hover:text-ink-1"
            )}
          >
            {label}
            {n > 0 && <span className="tabular-nums">{n}</span>}
          </button>
        );
      })}
      {error && <span role="status" className="text-[12.5px] text-danger">{error}</span>}
    </div>
  );
}
