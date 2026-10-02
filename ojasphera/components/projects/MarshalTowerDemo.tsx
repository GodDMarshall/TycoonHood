"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * An interactive model of the Marshal Tower workspace: agents on floors, a task
 * board, agent-to-agent messages and a live event stream. Simulated in the
 * browser to show the architecture — labelled as such in the UI.
 */

type Agent = { id: string; name: string; floor: string; skills: string[] };
type Task = { id: number; title: string; skill: string; state: "queued" | "active" | "review" | "done"; agent?: string; progress: number };
type Event = { id: number; t: string; text: string; tone: "sys" | "msg" | "task" | "human" };

const AGENTS: Agent[] = [
  { id: "A1", name: "Scout", floor: "Research", skills: ["research"] },
  { id: "A2", name: "Ledger", floor: "Analysis", skills: ["analysis"] },
  { id: "A3", name: "Quill", floor: "Content", skills: ["writing"] },
  { id: "A4", name: "Relay", floor: "Operations", skills: ["ops"] },
  { id: "A5", name: "Sentinel", floor: "Monitoring", skills: ["ops", "analysis"] },
  { id: "A6", name: "Atlas", floor: "Planning", skills: ["research", "writing"] },
];

const TEMPLATES: { title: string; skill: string }[] = [
  { title: "Compile background on a new supplier", skill: "research" },
  { title: "Summarise this week's operating data", skill: "analysis" },
  { title: "Draft a project update for stakeholders", skill: "writing" },
  { title: "Reconcile task statuses across teams", skill: "ops" },
  { title: "Scan for competitor product changes", skill: "research" },
  { title: "Flag anomalies in fulfilment times", skill: "analysis" },
  { title: "Prepare onboarding checklist", skill: "writing" },
  { title: "Schedule follow-ups from yesterday's review", skill: "ops" },
];

const SKILL_COLOR: Record<string, string> = { research: "#7cc7e8", analysis: "#f2b45a", writing: "#b9c7ff", ops: "#6fd3a8" };

const name = (id?: string) => AGENTS.find((a) => a.id === id)?.name ?? "—";
let uid = 100;
let taskSeq = 100;
const clock = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

export function MarshalTowerDemo() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    TEMPLATES.slice(0, 4).map((t, i) => ({ id: i + 1, ...t, state: "queued", progress: 0 })),
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [paused, setPaused] = useState(false);
  const [focusAgent, setFocusAgent] = useState<string | null>(null);
  const [link, setLink] = useState<[string, string] | null>(null);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tplIdx = useRef(4);
  const tasksRef = useRef(tasks);

  const log = useCallback(
    (text: string, tone: Event["tone"]) => setEvents((e) => [...e.slice(-40), { id: ++uid, t: clock(), text, tone }]),
    [],
  );
  const booted = useRef(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(rootRef.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    log("Workspace online. 6 agents registered across 6 floors.", "sys");
  }, [log]);

  // The orchestrator tick: assign, progress, hand off, complete.
  useEffect(() => {
    if (paused || !visible) return;
    const id = setInterval(() => {
      const next = tasksRef.current.map((t) => ({ ...t }));
      const logs: [string, Event["tone"]][] = [];
      const busy = new Set(next.filter((t) => t.state === "active").map((t) => t.agent));
      for (const t of next) {
        if (t.state === "active") {
          t.progress = Math.min(100, t.progress + 9 + Math.random() * 14);
          if (t.progress >= 100) {
            t.state = "review";
            const reviewer = AGENTS.find((a) => a.id !== t.agent && a.skills.includes(t.skill === "writing" ? "research" : "analysis"));
            if (reviewer) {
              setLink([t.agent!, reviewer.id]);
              logs.push([`${name(t.agent)} → ${reviewer.name}: "${t.title}" ready for review.`, "msg"]);
            }
          }
        } else if (t.state === "review" && Math.random() < 0.45) {
          t.state = "done";
          logs.push([`Task #${t.id} completed and written to shared state.`, "task"]);
        }
      }
      // Route one queued task to a free agent with the right skill.
      const q = next.find((t) => t.state === "queued");
      if (q) {
        const agent = AGENTS.find((a) => a.skills.includes(q.skill) && !busy.has(a.id));
        if (agent) {
          q.state = "active";
          q.agent = agent.id;
          logs.push([`Orchestrator routed #${q.id} → ${agent.name} (${agent.floor}).`, "sys"]);
        }
      }
      // Keep the board alive.
      const done = next.filter((t) => t.state === "done");
      if (done.length > 3) next.splice(next.indexOf(done[0]), 1);
      if (next.filter((t) => t.state === "queued").length < 2) {
        const tpl = TEMPLATES[tplIdx.current++ % TEMPLATES.length];
        next.push({ id: ++taskSeq, ...tpl, state: "queued", progress: 0 });
      }
      tasksRef.current = next;
      setTasks(next);
      logs.forEach(([text, tone]) => log(text, tone));
    }, 1400);
    return () => clearInterval(id);
  }, [paused, visible, log]);

  useEffect(() => {
    if (!link) return;
    const id = setTimeout(() => setLink(null), 1200);
    return () => clearTimeout(id);
  }, [link]);

  const addTask = (skill: string) => {
    const tpl = TEMPLATES.find((t) => t.skill === skill && !tasks.some((x) => x.title === t.title && x.state !== "done")) ?? TEMPLATES.find((t) => t.skill === skill)!;
    const id = ++taskSeq;
    const next = [...tasksRef.current, { id, ...tpl, state: "queued" as const, progress: 0 }];
    tasksRef.current = next;
    setTasks(next);
    log(`Operator added #${id}: "${tpl.title}".`, "human");
  };

  const activeFor = (id: string) => tasks.find((t) => t.agent === id && (t.state === "active" || t.state === "review"));
  const cols: Task["state"][] = ["queued", "active", "review", "done"];

  return (
    <div ref={rootRef} className="border border-line bg-void">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`pulse-dot ${paused ? "text-ink-4" : "text-ojas"}`} aria-hidden="true" />
          <span className="mono text-[11px] uppercase tracking-[0.16em] text-ink-2">Marshal Tower · Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono hidden text-[10px] uppercase tracking-[0.14em] text-ink-4 sm:inline">Interactive model</span>
          <button type="button" onClick={() => setPaused((p) => !p)} className="mono border border-line px-2.5 py-1 text-[10px] uppercase tracking-wider text-ink-2 hover:border-ink-4">
            {paused ? "Resume" : "Pause"} system
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-12">
        {/* Tower: floors with agents */}
        <div className="border-b border-line p-4 xl:col-span-3 xl:border-b-0 xl:border-r">
          <p className="eyebrow mb-3">Floors</p>
          <ul className="flex flex-col-reverse gap-1.5">
            {AGENTS.map((a) => {
              const task = activeFor(a.id);
              const linked = link && (link[0] === a.id || link[1] === a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setFocusAgent((f) => (f === a.id ? null : a.id))}
                    aria-pressed={focusAgent === a.id}
                    className={`w-full border px-3 py-2.5 text-left transition-colors ${
                      linked ? "border-signal/70 bg-signal-soft" : focusAgent === a.id ? "border-ojas/60" : "border-line hover:border-ink-4"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm text-ink">
                        {a.name} <span className="mono text-[10px] text-ink-4">{a.id}</span>
                      </span>
                      <span className="mono text-[10px] uppercase tracking-wider" style={{ color: task ? SKILL_COLOR[task.skill] : "var(--color-ink-4)" }}>
                        {task ? (task.state === "review" ? "handoff" : "working") : "idle"}
                      </span>
                    </span>
                    <span className="mono mt-1 block text-[10px] uppercase tracking-wider text-ink-4">{a.floor}</span>
                    {task && task.state === "active" ? (
                      <span className="mt-2 block h-px w-full bg-line">
                        <span className="block h-px transition-[width] duration-700" style={{ width: `${task.progress}%`, background: SKILL_COLOR[task.skill] }} />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Task board */}
        <div className="border-b border-line p-4 xl:col-span-6 xl:border-b-0 xl:border-r">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">Task board</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Add a task">
              {Object.keys(SKILL_COLOR).map((s) => (
                <button key={s} type="button" onClick={() => addTask(s)} className="mono border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-ink-3 hover:text-ink" style={{ borderColor: `${SKILL_COLOR[s]}55` }}>
                  + {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {cols.map((c) => (
              <div key={c} className="min-h-[12rem] border border-line p-2">
                <p className="mono mb-2 flex justify-between text-[10px] uppercase tracking-wider text-ink-3">
                  {c} <span>{tasks.filter((t) => t.state === c).length}</span>
                </p>
                <ul className="flex flex-col gap-1.5">
                  {tasks
                    .filter((t) => t.state === c)
                    .map((t) => {
                      const dim = focusAgent && t.agent !== focusAgent;
                      return (
                        <li key={t.id} className={`border-l-2 bg-raise px-2 py-1.5 text-[11px] leading-snug transition-opacity ${dim ? "opacity-30" : ""}`} style={{ borderColor: SKILL_COLOR[t.skill] }}>
                          <span className="text-ink-2">{t.title}</span>
                          <span className="mono mt-1 block text-[9px] uppercase tracking-wider text-ink-4">
                            #{t.id} · {t.agent ? name(t.agent) : "unassigned"}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Event stream */}
        <div className="flex flex-col p-4 xl:col-span-3">
          <p className="eyebrow mb-3">Live system state</p>
          <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["Agents", AGENTS.length],
              ["Active", tasks.filter((t) => t.state === "active").length],
              ["Queued", tasks.filter((t) => t.state === "queued").length],
            ].map(([k, v]) => (
              <div key={k} className="border border-line py-2">
                <dt className="mono text-[9px] uppercase tracking-wider text-ink-4">{k}</dt>
                <dd className="mono mt-1 text-lg text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <ol className="thin-scroll flex h-64 flex-col gap-2 overflow-y-auto xl:h-auto xl:max-h-[22rem] xl:flex-1" aria-live="polite">
            {[...events].reverse().map((e) => (
              <li key={e.id} className="text-[11px] leading-snug">
                <span className="mono text-[9px] text-ink-4">{e.t}</span>{" "}
                <span className={e.tone === "msg" ? "text-signal" : e.tone === "human" ? "text-growth" : e.tone === "task" ? "text-ojas" : "text-ink-3"}>{e.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
