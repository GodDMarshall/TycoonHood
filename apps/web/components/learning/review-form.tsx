"use client";
import { useActionState } from "react";
import { Button, Notice, Textarea, cn } from "@tycoonhood/ui";
import type { ReviewState } from "../../app/(app)/courses/actions";

/** Rate the program 1–5 and say why. Saving again edits the member's one review. */
export function ReviewForm({
  action,
  initial,
}: {
  action: (prev: ReviewState, fd: FormData) => Promise<ReviewState>;
  initial?: { rating: number; body: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ReviewState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <fieldset>
        <legend className="text-[14px] font-medium text-ink-1">{initial ? "Your review" : "Rate this program"}</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="group cursor-pointer">
              <input type="radio" name="rating" value={n} defaultChecked={initial?.rating === n} required className="peer sr-only" />
              <span
                className={cn(
                  "flex h-9 min-w-9 items-center justify-center rounded-md border border-line-strong px-2 text-[14px] text-ink-2",
                  "peer-checked:border-gold-deep peer-checked:bg-gold/10 peer-checked:text-gold-bright peer-focus-visible:ring-2 peer-focus-visible:ring-gold"
                )}
              >
                {n}
                <span className="sr-only"> out of 5</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12.5px] text-ink-3">1 = not useful, 5 = changed how I work.</p>
      </fieldset>
      <label htmlFor="review-body" className="sr-only">
        Review
      </label>
      <Textarea id="review-body" name="body" rows={3} maxLength={2000} defaultValue={initial?.body ?? ""} placeholder="What did this program change for you? (optional)" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" loading={pending}>
          {initial ? "Update review" : "Post review"}
        </Button>
        {state.ok && (
          <span role="status" className="text-[13px] text-success">
            {state.ok}
          </span>
        )}
      </div>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
    </form>
  );
}
