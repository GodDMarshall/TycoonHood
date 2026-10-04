"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BUDGETS, TIMELINES, briefText, emptyIntake, validateIntake, type FieldErrors, type Intake, type IntakeMode } from "@/lib/intake";
import { MARK } from "@/lib/brand";
import { site } from "@/lib/site";

type FieldKey = Exclude<keyof Intake, "mode" | "website">;

type Step = { key: string; title: string; prompt: string; fields: FieldKey[] };

const PROJECT_STEPS: Step[] = [
  { key: "identity", title: "Identity", prompt: "Who's starting this project?", fields: ["name", "company", "email"] },
  { key: "idea", title: "The idea", prompt: "What are you building, and why?", fields: ["building", "problem"] },
  { key: "reality", title: "Reality", prompt: "Where does it stand today, and where should it go?", fields: ["today", "achieve"] },
  { key: "constraints", title: "Constraints", prompt: "Budget and timing — rough is fine.", fields: ["budget", "timeline", "extra"] },
];
const TALK_STEPS: Step[] = [{ key: "talk", title: "Conversation", prompt: "Tell us what's on your mind.", fields: ["name", "company", "email", "problem"] }];

const LABELS: Record<FieldKey, { label: string; placeholder: string; optional?: boolean; multiline?: boolean }> = {
  name: { label: "Name", placeholder: "Your name" },
  company: { label: "Company", placeholder: "Organisation, if any", optional: true },
  email: { label: "Email", placeholder: "you@company.com" },
  building: { label: "What are you building?", placeholder: "A platform, an agent system, a digital twin of a site, an idea that doesn't have a name yet…", multiline: true },
  problem: { label: "What problem are you solving?", placeholder: "What's slow, invisible, manual, fragile or impossible today?", multiline: true },
  today: { label: "What exists today?", placeholder: "Tools, spreadsheets, data sources, teams, previous attempts…", optional: true, multiline: true },
  achieve: { label: "What would you like to achieve?", placeholder: "What does success look like once the system exists?", optional: true, multiline: true },
  budget: { label: "Budget range", placeholder: "", optional: true },
  timeline: { label: "Timeline", placeholder: "", optional: true },
  extra: { label: "Additional information", placeholder: "Links, context, constraints — anything that helps.", optional: true, multiline: true },
};

const TALK_LABELS: Partial<typeof LABELS> = {
  problem: { label: "Message", placeholder: "What would you like to talk about?", multiline: true },
};

type Phase = "edit" | "sending" | "done" | "failed";

export function IntakeConsole() {
  const params = useSearchParams();
  const [mode, setMode] = useState<IntakeMode>(params.get("mode") === "talk" ? "talk" : "project");
  const [data, setData] = useState<Intake>(() => emptyIntake(mode));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>("edit");
  const [ref, setRef] = useState<string>("");
  const [failReason, setFailReason] = useState("");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const steps = mode === "talk" ? TALK_STEPS : PROJECT_STEPS;
  const isReview = mode === "project" && step === steps.length;
  const current = steps[Math.min(step, steps.length - 1)];
  const labelFor = (k: FieldKey) => (mode === "talk" ? TALK_LABELS[k] ?? LABELS[k] : LABELS[k]);

  useEffect(() => {
    setData((d) => ({ ...d, mode }));
    setStep(0);
    setErrors({});
  }, [mode]);

  // Focus the first field of each new step for keyboard users.
  useEffect(() => {
    if (phase !== "edit") return;
    const el = panelRef.current?.querySelector<HTMLElement>("input, textarea, [role=radio]");
    if (step > 0 || mode === "talk") el?.focus({ preventScroll: true });
  }, [step, mode, phase]);

  const set = (k: FieldKey, v: string) => {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validateStep = (fields: FieldKey[]) => {
    const res = validateIntake(data);
    if (res.ok) return true;
    const relevant: FieldErrors = {};
    for (const f of fields) if (res.errors[f]) relevant[f] = res.errors[f];
    setErrors(relevant);
    return Object.keys(relevant).length === 0;
  };

  const next = () => {
    if (!validateStep(current.fields)) return;
    if (mode === "talk") return submit();
    setStep((s) => Math.min(steps.length, s + 1));
  };

  async function submit() {
    const res = validateIntake(data);
    if (!res.ok) {
      setErrors(res.errors);
      const bad = steps.findIndex((s) => s.fields.some((f) => res.errors[f]));
      if (bad >= 0) setStep(bad);
      return;
    }
    setPhase("sending");
    try {
      const r = await fetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const json = await r.json().catch(() => ({}));
      if (r.ok && json.ok) {
        setRef(json.ref);
        setPhase("done");
        return;
      }
      if (r.status === 422 && json.fields) {
        setErrors(json.fields);
        setPhase("edit");
        return;
      }
      setFailReason(
        json.error === "not_configured"
          ? "The intake channel isn't connected yet."
          : json.error === "rate_limited"
            ? "Too many submissions from this connection — try again in a few minutes."
            : "The brief couldn't be delivered.",
      );
      setPhase("failed");
    } catch {
      setFailReason("The network request failed.");
      setPhase("failed");
    }
  }

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const filled = useMemo(() => (Object.keys(LABELS) as FieldKey[]).filter((k) => data[k]), [data]);

  return (
    <div className="grid gap-px border border-line bg-line lg:grid-cols-12">
      {/* Console */}
      <div className="bg-base lg:col-span-7" ref={panelRef}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 md:px-8">
          <div role="radiogroup" aria-label="Type of enquiry" className="flex">
            {(
              [
                ["project", "Start a Project"],
                ["talk", "Talk to Ojasphera"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                disabled={phase === "sending" || phase === "done"}
                onClick={() => setMode(m)}
                className={`h-9 px-3 text-[13px] transition-colors ${mode === m ? "bg-ink text-void" : "text-ink-3 hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-ink-4">
            {phase === "done" ? "Initialised" : isReview ? "Review" : `Step ${step + 1} / ${steps.length}`}
          </span>
        </div>

        {phase === "done" ? (
          <div className="px-5 py-16 md:px-8 md:py-20" role="status">
            <svg width="56" height="56" viewBox="0 0 100 100" className="intake-ignite" aria-hidden="true">
              <path fill="#eceef1" fillRule="evenodd" d={MARK.rim} />
              <circle cx={MARK.spark.cx} cy={MARK.spark.cy} r={MARK.spark.r} fill="#f2b45a" />
            </svg>
            <p className="mono mt-8 flex items-center gap-3 text-xs text-ojas">{mode === "talk" ? "MESSAGE RECEIVED" : "PROJECT INITIALISED"}</p>
            <h2 className="headline mt-6 text-[clamp(2rem,4vw,3.25rem)]">
              {mode === "talk" ? "Thanks — your message is with us." : "Your project is in the system."}
            </h2>
            <p className="lede mt-6 max-w-lg">
              We'll read it properly and reply to <span className="text-ink">{data.email}</span>. Keep this reference if you need to follow up:
            </p>
            <p className="mono mt-6 inline-block border border-line px-4 py-2 text-lg text-ojas">{ref}</p>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (isReview) submit();
              else next();
            }}
            className="px-5 py-10 md:px-8 md:py-14"
          >
            {/* Progress */}
            {mode === "project" ? (
              <ol className="mb-12 grid grid-cols-5 gap-1.5" aria-label="Progress">
                {[...steps.map((s) => s.title), "Initialise"].map((t, i) => (
                  <li key={t}>
                    <button
                      type="button"
                      disabled={i > step}
                      onClick={() => setStep(i)}
                      className="block w-full text-left disabled:cursor-default"
                      aria-current={i === step ? "step" : undefined}
                    >
                      <span className={`block h-px w-full transition-colors duration-500 ${i <= step ? "bg-ojas" : "bg-line-strong"}`} />
                      <span className={`mono mt-2 hidden text-[10px] uppercase tracking-wider sm:block ${i === step ? "text-ink" : "text-ink-4"}`}>{t}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}

            {isReview ? (
              <div>
                <p className="eyebrow">Initialise</p>
                <h2 className="headline mt-4 text-[clamp(1.75rem,3.4vw,2.75rem)]">Review the brief, then initialise.</h2>
                <dl className="mt-10 flex flex-col">
                  {(Object.keys(LABELS) as FieldKey[])
                    .filter((k) => data[k])
                    .map((k) => (
                      <div key={k} className="grid gap-1 border-t border-line py-4 sm:grid-cols-3">
                        <dt className="mono text-[11px] uppercase tracking-wider text-ink-3">{LABELS[k].label}</dt>
                        <dd className="whitespace-pre-wrap text-sm text-ink-2 sm:col-span-2">{data[k]}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : (
              <fieldset>
                <legend className="headline text-[clamp(1.75rem,3.4vw,2.75rem)]">{current.prompt}</legend>
                <div className="mt-10 flex flex-col gap-9">
                  {current.fields.map((k) => {
                    const meta = labelFor(k);
                    const id = `${uid}-${k}`;
                    const err = errors[k];
                    if (k === "budget" || k === "timeline") {
                      const opts = k === "budget" ? BUDGETS : TIMELINES;
                      return (
                        <div key={k}>
                          <p id={id} className="mono mb-3 text-[11px] uppercase tracking-wider text-ink-3">
                            {meta.label} <span className="text-ink-4">· optional</span>
                          </p>
                          <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
                            {opts.map((o) => (
                              <button key={o} type="button" role="radio" aria-checked={data[k] === o} onClick={() => set(k, data[k] === o ? "" : o)} className="chip">
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    const Field = meta.multiline ? "textarea" : "input";
                    return (
                      <div key={k}>
                        <label htmlFor={id} className="mono text-[11px] uppercase tracking-wider text-ink-3">
                          {meta.label} {meta.optional ? <span className="text-ink-4">· optional</span> : null}
                        </label>
                        <Field
                          id={id}
                          name={k}
                          className="field"
                          value={data[k]}
                          placeholder={meta.placeholder}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value)}
                          aria-invalid={!!err}
                          aria-describedby={err ? `${id}-err` : undefined}
                          {...(k === "email" ? { type: "email", autoComplete: "email", inputMode: "email" as const } : {})}
                          {...(k === "name" ? { autoComplete: "name" } : {})}
                          {...(k === "company" ? { autoComplete: "organization" } : {})}
                          {...(meta.multiline ? { rows: 4 } : {})}
                        />
                        {err ? (
                          <p id={`${id}-err`} className="mt-2 text-xs text-alert">
                            {err}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Honeypot */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))} />
              </label>
            </div>

            {phase === "failed" ? (
              <div className="mt-10 border border-alert/40 bg-alert/[0.05] p-5 text-sm" role="alert">
                <p className="text-ink">{failReason} Nothing you've written is lost.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={submit} className="btn btn-ghost h-10">
                    Try again
                  </button>
                  <button type="button" onClick={copyBrief} className="btn btn-ghost h-10">
                    {copied ? "Copied" : "Copy brief"}
                  </button>
                  {site.contactEmail ? (
                    <a
                      className="btn btn-ghost h-10"
                      href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(`Project brief — ${data.name}`)}&body=${encodeURIComponent(briefText(data))}`}
                    >
                      Email it instead
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
              {step > 0 && mode === "project" ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm text-ink-3 hover:text-ink">
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <button type="submit" className="btn btn-primary" disabled={phase === "sending"}>
                {phase === "sending"
                  ? "Initialising…"
                  : isReview
                    ? "Initialise project"
                    : mode === "talk"
                      ? "Send message"
                      : "Continue"}{" "}
                <span className="arrow">→</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Live manifest */}
      <aside className="relative bg-void lg:col-span-5" aria-label="Project manifest preview">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-3">project.manifest</span>
          <span className="mono text-[10px] text-ink-4">{filled.length} / {Object.keys(LABELS).length} fields</span>
        </div>
        <ManifestGraph filled={filled} done={phase === "done"} />
        <pre className="thin-scroll mono max-h-[22rem] overflow-auto whitespace-pre-wrap break-words px-5 pb-6 text-[11px] leading-relaxed text-ink-3">
          <span className="text-ink-4">{"{"}</span>
          {"\n"}
          {"  "}
          <span className="text-signal">"type"</span>: <span className="text-ojas">"{mode === "talk" ? "conversation" : "new_project"}"</span>,{"\n"}
          {(Object.keys(LABELS) as FieldKey[]).map((k) => (
            <span key={k} className={data[k] ? "" : "text-ink-4 [&_span]:!text-ink-4"}>
              {"  "}
              <span className="text-signal">"{k}"</span>: {data[k] ? <span className="text-ink-2">"{data[k].length > 90 ? data[k].slice(0, 90) + "…" : data[k]}"</span> : <span>null</span>},{"\n"}
            </span>
          ))}
          {"  "}
          <span className="text-signal">"status"</span>: <span className={phase === "done" ? "text-growth" : "text-ojas"}>"{phase === "done" ? "initialised" : phase === "sending" ? "initialising" : "draft"}"</span>
          {phase === "done" ? (
            <>
              ,{"\n  "}
              <span className="text-signal">"ref"</span>: <span className="text-growth">"{ref}"</span>
            </>
          ) : null}
          {"\n"}
          <span className="text-ink-4">{"}"}</span>
        </pre>
      </aside>
    </div>
  );
}

/** The system forming as the brief fills in: each answer becomes a connected node. */
function ManifestGraph({ filled, done }: { filled: FieldKey[]; done: boolean }) {
  const all = Object.keys(LABELS) as FieldKey[];
  return (
    <svg viewBox="0 0 400 200" className="block h-auto w-full border-b border-line" aria-hidden="true">
      {all.map((k, i) => {
        const a = (i / all.length) * Math.PI * 2 - Math.PI / 2;
        const x = 200 + Math.cos(a) * 140, y = 100 + Math.sin(a) * 70;
        const on = filled.includes(k);
        return (
          <g key={k} style={{ transition: "opacity 600ms" }} opacity={on ? 1 : 0.25}>
            <line x1="200" y1="100" x2={x} y2={y} stroke={on ? "var(--color-ojas)" : "var(--color-line-strong)"} strokeOpacity={on ? 0.6 : 1} className={on && done ? "flow-dash" : undefined} />
            <circle cx={x} cy={y} r={on ? 4 : 3} fill={on ? "var(--color-ojas)" : "var(--color-void)"} stroke={on ? "var(--color-ojas)" : "var(--color-ink-4)"} />
            <text x={x} y={y + (y > 100 ? 16 : -10)} textAnchor="middle" fontSize="8" letterSpacing="1" fill={on ? "var(--color-ink-2)" : "var(--color-ink-4)"} className="mono">
              {k.toUpperCase()}
            </text>
          </g>
        );
      })}
      <circle cx="200" cy="100" r={done ? 14 : 10} fill="var(--color-void)" stroke={done ? "var(--color-growth)" : "var(--color-ink-2)"} style={{ transition: "all 600ms" }} />
      <circle cx="200" cy="100" r="3" fill={done ? "var(--color-growth)" : "var(--color-ink)"} />
    </svg>
  );
}
