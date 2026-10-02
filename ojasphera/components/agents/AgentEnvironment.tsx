"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { AGENTS, MISSIONS, type AgentId, type Status } from "./agent-script";

const X: Record<AgentId, number> = { research: 100, analysis: 300, planning: 500, execution: 700, monitoring: 900 };
const Y = 130;

const STATUS_COLOR: Record<Status, string> = {
  idle: "var(--color-ink-4)",
  observing: "var(--color-signal)",
  reasoning: "var(--color-ojas)",
  acting: "var(--color-growth)",
  watching: "#b9c7ff",
  waiting: "var(--color-alert)",
};

function pathFor(from: AgentId, to: AgentId) {
  const a = X[from], b = X[to];
  if (b > a) return `M${a},${Y} L${b},${Y}`;
  return `M${a},${Y} C${a},${Y - 110} ${b},${Y - 110} ${b},${Y}`;
}

type LogLine = { id: number; t: number; kind: "msg" | "sys" | "check" | "human"; from?: AgentId; to?: AgentId; text: string };
type State = {
  mission: number;
  beat: number;
  running: boolean;
  waiting: boolean;
  startedAt: number;
  status: Record<AgentId, Status>;
  thought: Record<AgentId, string>;
  log: LogLine[];
  packets: { id: number; from: AgentId; to: AgentId }[];
  seq: number;
};

const idle = () =>
  Object.fromEntries(AGENTS.map((a) => [a.id, "idle"])) as Record<AgentId, Status>;
const blank = () => Object.fromEntries(AGENTS.map((a) => [a.id, ""])) as Record<AgentId, string>;

const initial: State = {
  mission: 0,
  beat: -1,
  running: false,
  waiting: false,
  startedAt: 0,
  status: idle(),
  thought: blank(),
  log: [],
  packets: [],
  seq: 0,
};

type Action = { type: "start"; mission: number; now: number } | { type: "advance"; now: number } | { type: "approve"; now: number; auto: boolean };

function reducer(s: State, a: Action): State {
  if (a.type === "start") {
    const m = MISSIONS[a.mission];
    return {
      ...initial,
      mission: a.mission,
      running: true,
      startedAt: a.now,
      seq: s.seq + 1,
      log: [{ id: s.seq + 1, t: 0, kind: "sys", text: `Mission dispatched: "${m.brief}"` }],
    };
  }
  if (a.type === "approve") {
    if (!s.waiting) return s;
    return {
      ...s,
      waiting: false,
      status: { ...s.status, planning: "idle" },
      seq: s.seq + 1,
      log: [...s.log, { id: s.seq + 1, t: a.now - s.startedAt, kind: "human", text: a.auto ? "Operator checkpoint auto-approved (demo mode)." : "Operator approved the plan." }],
    };
  }
  // advance
  const m = MISSIONS[s.mission];
  const next = s.beat + 1;
  const beat = m.beats[next];
  if (!beat) return { ...s, running: false };
  const t = a.now - s.startedAt;
  const seq = s.seq + 1;
  switch (beat.kind) {
    case "status":
      return { ...s, beat: next, seq, status: { ...s.status, [beat.agent]: beat.status }, thought: { ...s.thought, [beat.agent]: beat.thought } };
    case "message":
      return {
        ...s,
        beat: next,
        seq,
        status: { ...s.status, [beat.from]: beat.from === "monitoring" ? "watching" : "idle", [beat.to]: "observing" },
        log: [...s.log, { id: seq, t, kind: "msg", from: beat.from, to: beat.to, text: beat.text }],
        packets: [...s.packets.slice(-5), { id: seq, from: beat.from, to: beat.to }],
      };
    case "checkpoint":
      return {
        ...s,
        beat: next,
        seq,
        waiting: true,
        status: { ...s.status, planning: "waiting" },
        log: [...s.log, { id: seq, t, kind: "check", text: beat.text }],
      };
    case "done":
      return { ...s, beat: next, seq, running: false, log: [...s.log, { id: seq, t, kind: "sys", text: beat.text }] };
  }
}

const fmt = (ms: number) => `T+${String(Math.floor(ms / 60000)).padStart(2, "0")}:${((ms % 60000) / 1000).toFixed(1).padStart(4, "0")}`;
const short = (id: AgentId) => id.toUpperCase();

export function AgentEnvironment() {
  const [s, dispatch] = useReducer(reducer, initial);
  const [selected, setSelected] = useState<AgentId>("planning");
  const [visible, setVisible] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [autoIn, setAutoIn] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const started = useRef(false);

  // Start on first view; pause the clock while off-screen.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(rootRef.current!);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (visible && !started.current) {
      started.current = true;
      dispatch({ type: "start", mission: 0, now: Date.now() });
    }
  }, [visible]);

  // The scheduler: one beat at a time.
  useEffect(() => {
    if (!visible || !s.running || s.waiting) return;
    const beat = MISSIONS[s.mission].beats[s.beat];
    const ms = s.beat < 0 ? 900 : beat && "ms" in beat ? beat.ms : 900;
    const id = setTimeout(() => dispatch({ type: "advance", now: Date.now() }), ms);
    return () => clearTimeout(id);
  }, [visible, s.running, s.waiting, s.beat, s.mission]);

  // Demo mode only: if nobody has touched the environment, approve after a visible countdown.
  useEffect(() => {
    if (!s.waiting || interacted || !visible) {
      setAutoIn(null);
      return;
    }
    let left = 6;
    setAutoIn(left);
    const id = setInterval(() => {
      left -= 1;
      setAutoIn(left);
      if (left <= 0) {
        clearInterval(id);
        dispatch({ type: "approve", now: Date.now(), auto: true });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [s.waiting, interacted, visible]);

  // Autoplay continues to the next mission until the visitor takes over.
  useEffect(() => {
    if (s.running || s.beat < 0 || interacted || !visible) return;
    const id = setTimeout(() => dispatch({ type: "start", mission: (s.mission + 1) % MISSIONS.length, now: Date.now() }), 6000);
    return () => clearTimeout(id);
  }, [s.running, s.beat, s.mission, interacted, visible]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.log.length]);

  const run = (i: number) => {
    setInteracted(true);
    dispatch({ type: "start", mission: i, now: Date.now() });
  };
  const approve = () => {
    setInteracted(true);
    dispatch({ type: "approve", now: Date.now(), auto: false });
  };

  const sel = AGENTS.find((a) => a.id === selected)!;
  const activeEdge = s.packets[s.packets.length - 1];

  return (
    <div ref={rootRef} className="border border-line bg-void/60">
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <span className={`pulse-dot ${s.running ? "text-growth" : "text-ink-4"}`} aria-hidden="true" />
          <span className="mono text-[11px] uppercase tracking-[0.16em] text-ink-2">Agent environment</span>
          <span className="mono hidden text-[11px] text-ink-4 sm:inline">/ {MISSIONS[s.mission].id}</span>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.16em] text-ink-4">Simulation · illustrative behaviour</span>
      </div>

      <div className="grid lg:grid-cols-12">
        {/* Mission control */}
        <div className="border-b border-line p-4 md:p-5 lg:col-span-3 lg:border-b-0 lg:border-r">
          <p className="eyebrow">Dispatch a mission</p>
          <div className="mt-4 flex flex-col gap-2" role="group" aria-label="Missions">
            {MISSIONS.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => run(i)}
                aria-pressed={s.mission === i}
                className={`border px-3 py-3 text-left transition-colors ${
                  s.mission === i ? "border-ojas/60 bg-ojas-soft" : "border-line hover:border-ink-4"
                }`}
              >
                <span className="block text-sm text-ink">{m.title}</span>
                <span className="mt-1 block text-xs text-ink-3">{m.brief}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="eyebrow">Inspect agent</p>
            <p className="mt-3 text-sm text-ink">{sel.name}</p>
            <p className="mt-1 text-sm text-ink-3">{sel.role}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {sel.tools.map((t) => (
                <li key={t} className="mono border border-line px-2 py-0.5 text-[10px] text-ink-3">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Live graph + agents */}
        <div className="lg:col-span-6">
          <div className="relative border-b border-line">
            <svg viewBox="0 0 1000 230" className="h-auto w-full" role="img" aria-label="Agents passing work between each other">
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
              {AGENTS.slice(0, -1).map((a, i) => {
                const b = AGENTS[i + 1];
                const hot = activeEdge && activeEdge.from === a.id && activeEdge.to === b.id;
                return (
                  <line key={a.id} x1={X[a.id]} y1={Y} x2={X[b.id]} y2={Y} stroke={hot ? "var(--color-signal)" : "var(--color-line-strong)"} strokeDasharray="3 6" className={s.running ? "flow-dash" : undefined} />
                );
              })}
              <path d={pathFor("monitoring", "planning")} fill="none" stroke="var(--color-line-strong)" strokeDasharray="3 6" />
              <text x="700" y="34" textAnchor="middle" fontSize="13" letterSpacing="2" fill="var(--color-ink-4)" className="mono">
                FEEDBACK LOOP
              </text>
              {/* Human checkpoint between planning and execution */}
              <g transform={`translate(600 ${Y}) rotate(45)`}>
                <rect x="-8" y="-8" width="16" height="16" fill="var(--color-void)" stroke={s.waiting ? "var(--color-alert)" : "var(--color-ink-3)"} />
              </g>
              <text x="600" y={Y + 32} textAnchor="middle" fontSize="11" letterSpacing="1.6" fill={s.waiting ? "var(--color-alert)" : "var(--color-ink-4)"} className="mono">
                HUMAN CHECKPOINT
              </text>

              {s.packets.map((p) => (
                <g key={p.id}>
                  <circle r="9" fill="var(--color-signal)" opacity="0.5" filter="url(#glow)">
                    <animateMotion dur="1.1s" fill="freeze" path={pathFor(p.from, p.to)} />
                    <animate attributeName="opacity" values="0.6;0.6;0" keyTimes="0;0.85;1" dur="1.3s" fill="freeze" />
                  </circle>
                  <circle r="4" fill="var(--color-signal)">
                    <animateMotion dur="1.1s" fill="freeze" path={pathFor(p.from, p.to)} />
                    <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="1.3s" fill="freeze" />
                  </circle>
                </g>
              ))}

              {AGENTS.map((a) => {
                const st = s.status[a.id];
                const on = st !== "idle";
                return (
                  <g key={a.id} onClick={() => setSelected(a.id)} className="cursor-pointer">
                    {on && <circle cx={X[a.id]} cy={Y} r="30" fill={STATUS_COLOR[st]} opacity="0.14" filter="url(#glow)" />}
                    <circle cx={X[a.id]} cy={Y} r="22" fill="var(--color-void)" stroke={on ? STATUS_COLOR[st] : "var(--color-line-strong)"} strokeWidth={selected === a.id ? 2 : 1.2} />
                    <circle cx={X[a.id]} cy={Y} r="6" fill={on ? STATUS_COLOR[st] : "var(--color-ink-4)"} />
                    <text x={X[a.id]} y={Y + 56} textAnchor="middle" fontSize="17" letterSpacing="1.6" fill={on ? "var(--color-ink)" : "var(--color-ink-3)"} className="mono">
                      {short(a.id)}
                    </text>
                    <text x={X[a.id]} y={Y + 78} textAnchor="middle" fontSize="14" letterSpacing="1.4" fill={STATUS_COLOR[st]} className="mono">
                      {st.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <ul className="grid sm:grid-cols-2 xl:grid-cols-1" role="list">
            {AGENTS.map((a) => {
              const st = s.status[a.id];
              return (
                <li key={a.id} className="border-b border-line last:border-b-0 sm:odd:border-r xl:odd:border-r-0">
                  <button type="button" onClick={() => setSelected(a.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.02] md:px-5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[st] }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="text-sm text-ink">{a.name}</span>
                        <span className="mono text-[10px] uppercase tracking-wider" style={{ color: STATUS_COLOR[st] }}>
                          {st}
                        </span>
                      </span>
                      <span className={`mt-0.5 block truncate text-xs ${st === "idle" ? "text-ink-4" : "text-ink-2"}`}>
                        {s.thought[a.id] || "Standing by."}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Message bus */}
        <div className="flex flex-col border-t border-line lg:col-span-3 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="eyebrow">Message bus</span>
            <span className="mono text-[10px] text-ink-4">{s.log.length} events</span>
          </div>
          <ol ref={logRef} className="thin-scroll h-72 overflow-y-auto px-4 py-3 lg:h-auto lg:max-h-[30rem] lg:flex-1" aria-live="polite" aria-relevant="additions">
            {s.log.map((l) => (
              <li key={l.id} className="mb-3 text-xs leading-relaxed">
                <span className="mono text-[10px] text-ink-4">{fmt(l.t)}</span>{" "}
                {l.kind === "msg" ? (
                  <span className="mono text-[10px] text-signal">
                    {short(l.from!)} → {short(l.to!)}
                  </span>
                ) : l.kind === "check" ? (
                  <span className="mono text-[10px] text-alert">CHECKPOINT</span>
                ) : l.kind === "human" ? (
                  <span className="mono text-[10px] text-growth">OPERATOR</span>
                ) : (
                  <span className="mono text-[10px] text-ink-3">SYSTEM</span>
                )}
                <span className="mt-0.5 block text-ink-2">{l.text}</span>
              </li>
            ))}
            {s.running && !s.waiting ? <li className="caret text-xs text-ink-4">working</li> : null}
          </ol>
          {s.waiting ? (
            <div className="border-t border-alert/40 bg-alert/[0.06] p-4">
              <p className="text-xs text-ink-2">Execution is gated on a person. Nothing acts until the plan is approved.</p>
              <button type="button" onClick={approve} className="btn btn-primary mt-3 h-10 w-full justify-center">
                Approve plan {autoIn !== null ? <span className="mono text-[11px] opacity-60">auto in {autoIn}s</span> : null}
              </button>
            </div>
          ) : !s.running && s.beat >= 0 ? (
            <div className="border-t border-line p-4">
              <button type="button" onClick={() => run((s.mission + 1) % MISSIONS.length)} className="btn btn-ghost h-10 w-full justify-center">
                Run next mission <span className="arrow">→</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
