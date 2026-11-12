"use client";
/**
 * Knowledge-check editor: questions, 2–6 options each, the correct option,
 * an explanation, and the pass score. Sent to the server as one JSON field;
 * the core service validates it again with zod.
 */
import { useActionState, useState } from "react";
import { Button, Icon, Input, Label, Notice, Textarea } from "@tycoonhood/ui";

type Q = { prompt: string; options: string[]; correctIndex: number; explanation: string };
type State = { ok?: string; error?: string };

const blank = (): Q => ({ prompt: "", options: ["", ""], correctIndex: 0, explanation: "" });

export function QuizEditor({
  action,
  initial,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  initial: { passScore: number; questions: Q[] } | null;
}) {
  const [passScore, setPassScore] = useState(initial?.passScore ?? 70);
  const [questions, setQuestions] = useState<Q[]>(initial?.questions.length ? initial.questions : [blank()]);
  const [state, formAction, pending] = useActionState(action, {} as State);

  const update = (i: number, patch: Partial<Q>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const to = i + d;
      if (to < 0 || to >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });

  const payload = JSON.stringify({
    passScore,
    questions: questions.map((q) => ({ ...q, explanation: q.explanation.trim() || null })),
  });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="quiz" value={payload} />
      <div className="flex max-w-[220px] flex-col gap-1.5">
        <Label htmlFor="passScore">Pass score (%)</Label>
        <Input id="passScore" type="number" min={1} max={100} value={passScore} onChange={(e) => setPassScore(Number(e.target.value))} />
      </div>

      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <li key={i} className="rounded-lg border border-line bg-bg-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-ink-2">Question {i + 1}</span>
              <span className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>
                  <Icon name="chevron-down" size={14} className="rotate-180" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label={`Move question ${i + 1} down`}>
                  <Icon name="chevron-down" size={14} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
                  disabled={questions.length === 1}
                  aria-label={`Remove question ${i + 1}`}
                >
                  <Icon name="trash" size={14} />
                </Button>
              </span>
            </div>
            <Label htmlFor={`q${i}-prompt`}>Prompt</Label>
            <Textarea id={`q${i}-prompt`} rows={2} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} className="mt-1.5" />

            <fieldset className="mt-3">
              <legend className="text-[13px] font-medium text-ink-2">Options — select the correct one</legend>
              <div className="mt-2 flex flex-col gap-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q${i}-correct`}
                      checked={q.correctIndex === oi}
                      onChange={() => update(i, { correctIndex: oi })}
                      aria-label={`Option ${oi + 1} is correct`}
                      className="size-4 accent-[var(--color-gold)]"
                    />
                    <Input
                      value={o}
                      onChange={(e) => update(i, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })}
                      aria-label={`Option ${oi + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={q.options.length <= 2}
                      onClick={() =>
                        update(i, {
                          options: q.options.filter((_, k) => k !== oi),
                          correctIndex: q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex,
                        })
                      }
                      aria-label={`Remove option ${oi + 1}`}
                    >
                      <Icon name="x" size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              {q.options.length < 6 && (
                <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => update(i, { options: [...q.options, ""] })}>
                  <Icon name="plus" size={14} /> Add option
                </Button>
              )}
            </fieldset>

            <Label htmlFor={`q${i}-why`} className="mt-3 block">
              Explanation (shown after submitting)
            </Label>
            <Textarea id={`q${i}-why`} rows={2} value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} className="mt-1.5" />
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => setQuestions((qs) => [...qs, blank()])}>
          <Icon name="plus" size={14} /> Add question
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          Save knowledge check
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
