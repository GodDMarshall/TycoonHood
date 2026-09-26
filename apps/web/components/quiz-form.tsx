"use client";
import { useActionState, useState } from "react";
import { Badge, Button, Icon, Notice, cn } from "@tycoonhood/ui";
import type { QuizState } from "../app/(app)/academy/actions";

interface Props {
  action: (prev: QuizState, data: FormData) => Promise<QuizState>;
  questions: { prompt: string; options: string[] }[];
  /** The lesson is already complete (a pass is on record). */
  completed?: boolean;
}

/**
 * The knowledge check. Stays mounted across the server revalidation that a
 * pass triggers, so the review of the attempt you just made does not vanish
 * the moment the lesson flips to complete. Retakes are real: the form comes
 * back on request, and the recorded pass stands either way.
 */
export function QuizForm({ action, questions, completed = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as QuizState);
  const [retaking, setRetaking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (state.result && !retaking) {
    const r = state.result;
    return (
      <section
        aria-live="polite"
        className={cn(
          "rounded-lg border p-6",
          r.passed ? "border-gold-deep/70 bg-bg-2 shadow-[var(--shadow-gold)]" : "border-line-strong bg-bg-1"
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={r.passed ? "success" : "danger"}>{r.passed ? "Passed" : "Not yet"}</Badge>
          <span className="figures text-[15px]">
            {r.scorePct}% · {r.correct}/{r.total}
          </span>
          <span className="text-[12.5px] text-ink-3">pass mark {r.passScore}%</span>
        </div>
        <ol className="mt-5 flex flex-col divide-y divide-line">
          {r.review.map((q, i) => (
            <li key={i} className="flex gap-3 py-3.5">
              <Icon name={q.correct ? "check" : "x"} size={16} className={cn("mt-1", q.correct ? "text-success" : "text-danger")} />
              <div>
                <p className="text-[14px] text-ink-1">{q.prompt}</p>
                {!q.correct && q.explanation && <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{q.explanation}</p>}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRetaking(true);
              setAttempt((n) => n + 1);
            }}
          >
            {r.passed ? "Retake" : "Try again"}
          </Button>
          <p className="text-[12.5px] text-ink-3">
            {r.passed ? "Your pass is on record; a retake cannot undo it." : "Reread the module first — attempts are unlimited."}
          </p>
        </div>
      </section>
    );
  }

  if (completed && !retaking) {
    return (
      <Notice tone="success" title="Knowledge check passed">
        This lesson is complete.{" "}
        <button type="button" onClick={() => setRetaking(true)} className="text-gold underline-offset-4 hover:underline">
          Retake it
        </button>{" "}
        — the recorded pass stands.
      </Notice>
    );
  }

  return (
    <form
      key={attempt}
      action={(fd) => {
        setRetaking(false);
        return formAction(fd);
      }}
      className="flex flex-col gap-8"
    >
      <p className="eyebrow flex items-center gap-2">
        <Icon name="quiz" size={14} /> Knowledge check · {questions.length} questions
      </p>
      {questions.map((q, i) => (
        <fieldset key={i} className="flex flex-col gap-2.5">
          <legend className="mb-2 flex gap-3 text-[16px] font-medium leading-snug text-ink-1">
            <span className="figures pt-0.5 text-[12px] text-gold">{String(i + 1).padStart(2, "0")}</span>
            {q.prompt}
          </legend>
          {q.options.map((opt, oi) => (
            <label
              key={oi}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-line-strong bg-bg-1 px-4 py-3 text-[14.5px] text-ink-2 transition-colors hover:border-gold-deep has-[:checked]:border-gold has-[:checked]:bg-gold/[0.07] has-[:checked]:text-ink-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold"
            >
              <input type="radio" name={`q${i}`} value={oi} required className="mt-1 accent-[var(--color-gold)]" />
              {opt}
            </label>
          ))}
        </fieldset>
      ))}
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Button type="submit" loading={pending} size="lg" className="self-start">
        Submit answers
      </Button>
    </form>
  );
}
