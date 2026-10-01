"use client";
/**
 * Today's standard. A tick lands instantly (optimistic) and the server
 * confirms; if the server refuses, the tick rolls back and says why.
 */
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Button, Icon, Notice, cn } from "@tycoonhood/ui";
import type { StandardItemView } from "@tycoonhood/core";
import type { StandardActionState } from "../../app/(app)/today/actions";

type Props = {
  items: StandardItemView[];
  maxOwn: number;
  setTick: (itemId: string, ticked: boolean) => Promise<StandardActionState>;
  addOwn: (prev: StandardActionState, fd: FormData) => Promise<StandardActionState>;
  removeOwn: (itemId: string) => Promise<StandardActionState>;
};

export function StandardChecklist({ items, maxOwn, setTick, addOwn, removeOwn }: Props) {
  const [optimistic, apply] = useOptimistic(items, (state, change: { id: string; ticked: boolean }) =>
    state.map((i) => (i.id === change.id ? { ...i, ticked: change.ticked } : i))
  );
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addState, addAction, addPending] = useActionState(async (prev: StandardActionState, fd: FormData) => {
    const r = await addOwn(prev, fd);
    if (!r.error) setAdding(false);
    return r;
  }, {} as StandardActionState);

  const ownCount = items.filter((i) => i.own).length;
  const ticked = optimistic.filter((i) => i.ticked).length;

  const toggle = (item: StandardItemView) => {
    if (item.auto) return;
    setError(null);
    start(async () => {
      apply({ id: item.id, ticked: !item.ticked });
      const r = await setTick(item.id, !item.ticked);
      if (r.error) setError(r.error);
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-3" aria-hidden>
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-[var(--dur-3)]"
            style={{ width: `${optimistic.length ? (ticked / optimistic.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[13px] tabular-nums text-ink-2" aria-live="polite">
          {ticked} of {optimistic.length}
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-bg-1">
        {optimistic.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={item.ticked}
              aria-disabled={item.auto || undefined}
              aria-label={item.auto ? `${item.title} — ticks itself when you do the work` : item.title}
              onClick={() => toggle(item)}
              title={item.auto ? "Ticks itself when you do the work" : undefined}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                item.ticked ? "border-gold bg-gold text-bg-0" : "border-line-input bg-bg-0 text-transparent hover:border-gold-deep",
                item.auto && "cursor-default"
              )}
            >
              <Icon name="check" size={14} strokeWidth={2.5} />
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[15px] font-medium", item.ticked ? "text-ink-2 line-through decoration-ink-3/60" : "text-ink-1")}>{item.title}</p>
              {(item.detail || item.auto) && (
                <p className="mt-0.5 text-[13px] text-ink-3">{item.detail ?? "Ticks itself when you do the work."}</p>
              )}
            </div>
            {item.own && (
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    const r = await removeOwn(item.id);
                    if (r.error) setError(r.error);
                  })
                }
                aria-label={`Remove “${item.title}” from your standard`}
                className="flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg-3 hover:text-ink-1 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
              >
                <Icon name="x" size={15} />
              </button>
            )}
            {item.auto && <Icon name="bolt" size={15} className="text-ink-3" aria-hidden />}
          </li>
        ))}
      </ul>

      {error && (
        <Notice tone="danger" className="mt-3">
          {error}
        </Notice>
      )}

      <div className="mt-3">
        {adding ? (
          <form action={addAction} className="flex flex-col gap-2 rounded-lg border border-line bg-bg-1 p-4 sm:flex-row sm:items-start">
            <label className="sr-only" htmlFor="own-title">
              Your own item
            </label>
            <input
              id="own-title"
              name="title"
              required
              maxLength={60}
              autoFocus
              placeholder="e.g. 20 minutes of Spanish"
              className="h-10 flex-1 rounded-md border border-line-input/60 bg-bg-0 px-3 text-[14.5px] placeholder:text-ink-3 focus:border-gold-deep focus:outline-none"
            />
            <div className="flex gap-2">
              <Button type="submit" loading={addPending}>
                Add
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : ownCount < maxOwn ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-[13.5px] text-ink-3 hover:bg-bg-2 hover:text-ink-1"
          >
            <Icon name="plus" size={15} /> Add one of your own ({ownCount}/{maxOwn})
          </button>
        ) : (
          <p className="px-2 text-[13px] text-ink-3">You hold {maxOwn} items of your own — the most the standard allows.</p>
        )}
        {addState.error && (
          <Notice tone="danger" className="mt-2">
            {addState.error}
          </Notice>
        )}
      </div>
    </div>
  );
}
