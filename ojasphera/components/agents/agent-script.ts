/**
 * Scripted missions for the agent-environment demonstration.
 * These are illustrative simulations of how a coordinated agent system behaves —
 * not output from a live model — and the UI labels them as such.
 */

export type AgentId = "research" | "analysis" | "planning" | "execution" | "monitoring";

export const AGENTS: { id: AgentId; name: string; role: string; tools: string[] }[] = [
  { id: "research", name: "Research Agent", role: "Finds and gathers the information a task needs.", tools: ["Search", "Document ingestion", "Data connectors"] },
  { id: "analysis", name: "Analysis Agent", role: "Turns raw information into findings, with stated confidence.", tools: ["Statistics", "Comparison", "Summarisation"] },
  { id: "planning", name: "Planning Agent", role: "Converts findings into a plan with steps, owners and thresholds.", tools: ["Task decomposition", "Scheduling", "Risk checks"] },
  { id: "execution", name: "Execution Agent", role: "Carries out approved steps through connected systems.", tools: ["APIs", "Workflow engine", "Notifications"] },
  { id: "monitoring", name: "Monitoring Agent", role: "Watches results against the plan and raises deviations.", tools: ["Metrics", "Alerts", "Event log"] },
];

export type Status = "idle" | "observing" | "reasoning" | "acting" | "watching" | "waiting";

export type Beat =
  | { kind: "status"; agent: AgentId; status: Status; thought: string; ms: number }
  | { kind: "message"; from: AgentId; to: AgentId; text: string; ms: number }
  | { kind: "checkpoint"; text: string }
  | { kind: "done"; text: string };

export type Mission = { id: string; title: string; brief: string; beats: Beat[] };

export const MISSIONS: Mission[] = [
  {
    id: "market",
    title: "Evaluate a new market",
    brief: "Should we expand our product into a new region?",
    beats: [
      { kind: "status", agent: "research", status: "observing", thought: "Gathering market reports, competitor listings and internal sales history.", ms: 1800 },
      { kind: "message", from: "research", to: "analysis", text: "Source bundle ready — market reports, competitor data, internal sales history.", ms: 1300 },
      { kind: "status", agent: "analysis", status: "reasoning", thought: "Segmenting demand, comparing price bands, looking for gaps.", ms: 2000 },
      { kind: "message", from: "analysis", to: "planning", text: "Two segments show unmet demand; one is crowded. Confidence: moderate.", ms: 1300 },
      { kind: "status", agent: "planning", status: "reasoning", thought: "Drafting an entry plan: pilot region, pricing, channel, success thresholds.", ms: 2000 },
      { kind: "checkpoint", text: "Pilot plan drafted — 1 region, 2 channels, thresholds defined. Approve to execute." },
      { kind: "message", from: "planning", to: "execution", text: "Plan approved by operator. Executing pilot setup.", ms: 1200 },
      { kind: "status", agent: "execution", status: "acting", thought: "Creating pilot workspace, assigning tasks, configuring tracking.", ms: 1900 },
      { kind: "message", from: "execution", to: "monitoring", text: "Pilot live. Tracking configured against plan thresholds.", ms: 1200 },
      { kind: "status", agent: "monitoring", status: "watching", thought: "Comparing incoming signals with the plan's thresholds.", ms: 2000 },
      { kind: "message", from: "monitoring", to: "planning", text: "One channel is under threshold. Recommend reallocating effort.", ms: 1300 },
      { kind: "status", agent: "planning", status: "reasoning", thought: "Adjustment drafted and queued for the next review.", ms: 1600 },
      { kind: "done", text: "Cycle complete. Monitoring continues; the plan adapts as signals arrive." },
    ],
  },
  {
    id: "ops",
    title: "Diagnose an operational slowdown",
    brief: "Orders are taking longer to fulfil. Why?",
    beats: [
      { kind: "status", agent: "research", status: "observing", thought: "Pulling order timestamps, staffing rosters and system logs.", ms: 1800 },
      { kind: "message", from: "research", to: "analysis", text: "Order lifecycle data assembled across intake, picking, dispatch.", ms: 1300 },
      { kind: "status", agent: "analysis", status: "reasoning", thought: "Measuring time spent at each stage; isolating where delay accumulates.", ms: 2000 },
      { kind: "message", from: "analysis", to: "planning", text: "Delay concentrates at hand-off between intake and picking.", ms: 1300 },
      { kind: "status", agent: "planning", status: "reasoning", thought: "Proposing an automated hand-off with an exception queue for edge cases.", ms: 2000 },
      { kind: "checkpoint", text: "Proposed fix: automate intake → picking hand-off, route exceptions to a person. Approve?" },
      { kind: "message", from: "planning", to: "execution", text: "Approved. Deploying the hand-off workflow in staged mode.", ms: 1200 },
      { kind: "status", agent: "execution", status: "acting", thought: "Enabling workflow for a subset of orders; exceptions routed to the ops lead.", ms: 1900 },
      { kind: "message", from: "execution", to: "monitoring", text: "Staged rollout active. Watching stage timings.", ms: 1200 },
      { kind: "status", agent: "monitoring", status: "watching", thought: "Comparing staged orders with the control group.", ms: 2000 },
      { kind: "message", from: "monitoring", to: "planning", text: "Hand-off time reduced in staged group; exception queue stable.", ms: 1300 },
      { kind: "status", agent: "planning", status: "reasoning", thought: "Recommending wider rollout at the next review.", ms: 1600 },
      { kind: "done", text: "Cycle complete. The workflow keeps running; monitoring keeps watching." },
    ],
  },
  {
    id: "brief",
    title: "Prepare a weekly operations brief",
    brief: "What changed this week, and what needs attention?",
    beats: [
      { kind: "status", agent: "research", status: "observing", thought: "Collecting this week's activity across connected systems.", ms: 1700 },
      { kind: "message", from: "research", to: "analysis", text: "Weekly activity collected from operations, finance and support systems.", ms: 1300 },
      { kind: "status", agent: "analysis", status: "reasoning", thought: "Comparing against last week; ranking changes by impact.", ms: 1900 },
      { kind: "message", from: "analysis", to: "planning", text: "Three notable changes, one open risk, two items trending well.", ms: 1300 },
      { kind: "status", agent: "planning", status: "reasoning", thought: "Structuring the brief and proposing owners for the open risk.", ms: 1800 },
      { kind: "checkpoint", text: "Brief drafted with 1 proposed action. Approve distribution?" },
      { kind: "message", from: "planning", to: "execution", text: "Approved. Distributing brief and creating the follow-up task.", ms: 1200 },
      { kind: "status", agent: "execution", status: "acting", thought: "Publishing to the team workspace; assigning the follow-up.", ms: 1700 },
      { kind: "message", from: "execution", to: "monitoring", text: "Brief delivered. Follow-up task created with a due date.", ms: 1200 },
      { kind: "status", agent: "monitoring", status: "watching", thought: "Tracking the follow-up and the flagged risk through the week.", ms: 1900 },
      { kind: "message", from: "monitoring", to: "planning", text: "Risk indicator unchanged; follow-up on schedule.", ms: 1300 },
      { kind: "status", agent: "planning", status: "reasoning", thought: "Carrying context into next week's brief.", ms: 1500 },
      { kind: "done", text: "Cycle complete. Next week starts with this week's context." },
    ],
  },
];
