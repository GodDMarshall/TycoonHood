"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button, Icon, Notice } from "@tycoonhood/ui";
import type { AskState } from "../../app/(app)/courses/actions";

/** "Ask about this lesson" — the question lands in the program's Questions channel with the lesson attached. */
export function AskQuestion({ action }: { action: (prev: AskState, fd: FormData) => Promise<AskState> }) {
  const [state, formAction, pending] = useActionState(action, {} as AskState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={formAction} className="flex flex-col gap-3">
      <label htmlFor="lesson-question" className="text-[14px] font-medium text-ink-1">
        Ask about this lesson
      </label>
      <textarea
        id="lesson-question"
        name="body"
        required
        maxLength={2000}
        rows={3}
        placeholder="What exactly is unclear? The more specific the question, the better the answer."
        className="w-full resize-y rounded-md border border-line-input/60 bg-bg-0 px-3.5 py-3 text-[15px] leading-relaxed text-ink-1 placeholder:text-ink-3 focus:border-gold-deep focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" loading={pending}>
          <Icon name="send" size={14} /> Post question
        </Button>
        {state.ok && state.channel && (
          <span className="text-[13px] text-success" role="status">
            Posted.{" "}
            <Link href={`/community/${state.channel}`} className="underline underline-offset-4">
              See it in Questions
            </Link>
          </span>
        )}
      </div>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
    </form>
  );
}
