"use client";
import { useActionState } from "react";
import { Badge, Button, Card, CardContent } from "@tycoonhood/ui";
import type { QuizState } from "../app/(app)/academy/actions";

interface Props {
  action: (prev: QuizState, data: FormData) => Promise<QuizState>;
  questions: { prompt: string; options: string[] }[];
}

export function QuizForm({ action, questions }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as QuizState);

  if (state.result) {
    const r = state.result;
    return (
      <Card variant={r.passed ? "gold" : "default"}>
        <CardContent className="flex flex-col gap-4 py-5">
          <div className="flex items-center gap-3">
            <Badge tone={r.passed ? "success" : "danger"}>{r.passed ? "Passed" : "Not yet"}</Badge>
            <span className="figures text-[15px]">
              {r.scorePct}% · {r.correct}/{r.total} (pass ≥ {r.passScore}%)
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {r.review.map((q, i) => (
              <div key={i} className="border-b border-line pb-3 last:border-0">
                <p className="text-[14px] text-ink-1">{q.prompt}</p>
                <p className={`mt-1 text-[13px] ${q.correct ? "text-success" : "text-danger"}`}>
                  {q.correct ? "Correct." : "Incorrect."}
                </p>
                {!q.correct && q.explanation && <p className="mt-1 text-[13px] text-ink-2">{q.explanation}</p>}
              </div>
            ))}
          </div>
          {!r.passed && (
            <p className="text-[13px] text-ink-2">Reread the module and take it again — attempts are unlimited.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {questions.map((q, i) => (
        <fieldset key={i} className="flex flex-col gap-2.5">
          <legend className="text-[15px] text-ink-1">
            <span className="figures mr-2 text-[12px] text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
            {q.prompt}
          </legend>
          {q.options.map((opt, oi) => (
            <label key={oi} className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg-1 px-3.5 py-2.5 text-[14px] text-ink-2 transition-colors hover:border-gold-deep has-[:checked]:border-gold-deep has-[:checked]:bg-gold/10 has-[:checked]:text-ink-1">
              <input type="radio" name={`q${i}`} value={oi} className="mt-1 accent-[#c9a227]" />
              {opt}
            </label>
          ))}
        </fieldset>
      ))}
      {state.error && <p className="text-[13px] text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} size="lg">
        Submit answers
      </Button>
    </form>
  );
}
