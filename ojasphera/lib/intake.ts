/** Project intake: one schema shared by the console (client) and the API route (server). */

export const BUDGETS = [
  "Exploring — not sure yet",
  "Scoped pilot",
  "Product build",
  "Platform / multi-phase",
  "Prefer to discuss",
] as const;

export const TIMELINES = ["As soon as possible", "1–3 months", "3–6 months", "6+ months", "Flexible"] as const;

export type IntakeMode = "project" | "talk";

export type Intake = {
  mode: IntakeMode;
  name: string;
  company: string;
  email: string;
  building: string;
  problem: string;
  today: string;
  achieve: string;
  budget: string;
  timeline: string;
  extra: string;
  /** Honeypot — humans never see or fill this. */
  website?: string;
};

export const emptyIntake = (mode: IntakeMode = "project"): Intake => ({
  mode,
  name: "",
  company: "",
  email: "",
  building: "",
  problem: "",
  today: "",
  achieve: "",
  budget: "",
  timeline: "",
  extra: "",
  website: "",
});

const LIMITS: Record<keyof Omit<Intake, "mode" | "website">, number> = {
  name: 120,
  company: 160,
  email: 200,
  building: 2000,
  problem: 4000,
  today: 4000,
  achieve: 4000,
  budget: 60,
  timeline: 60,
  extra: 4000,
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldErrors = Partial<Record<keyof Intake, string>>;

export function validateIntake(input: unknown): { ok: true; data: Intake } | { ok: false; errors: FieldErrors } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const mode: IntakeMode = raw.mode === "talk" ? "talk" : "project";
  const data = emptyIntake(mode);
  const errors: FieldErrors = {};
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const v = typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
    if (v.length > LIMITS[key]) errors[key] = `Keep this under ${LIMITS[key]} characters.`;
    data[key] = v;
  }
  data.website = typeof raw.website === "string" ? raw.website : "";

  if (!data.name) errors.name = "Tell us who you are.";
  if (!data.email) errors.email = "We need an email to reply.";
  else if (!EMAIL_RE.test(data.email)) errors.email = "That email doesn't look right.";
  if (mode === "project") {
    if (!data.building) errors.building = "Describe what you're building, even roughly.";
    if (!data.problem) errors.problem = "What problem should the system solve?";
  } else if (!data.problem) {
    errors.problem = "What would you like to talk about?";
  }
  if (data.budget && !(BUDGETS as readonly string[]).includes(data.budget)) errors.budget = "Choose one of the options.";
  if (data.timeline && !(TIMELINES as readonly string[]).includes(data.timeline)) errors.timeline = "Choose one of the options.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

/** Plain-text brief — used for email delivery and the "copy brief" fallback. */
export function briefText(d: Intake, ref?: string) {
  const rows: [string, string][] = [
    ["Reference", ref ?? "—"],
    ["Type", d.mode === "talk" ? "Conversation" : "New project"],
    ["Name", d.name],
    ["Company", d.company],
    ["Email", d.email],
    ["Building", d.building],
    [d.mode === "talk" ? "Message" : "Problem", d.problem],
    ["Exists today", d.today],
    ["Wants to achieve", d.achieve],
    ["Budget", d.budget],
    ["Timeline", d.timeline],
    ["Additional", d.extra],
  ];
  return rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:\n${v}`)
    .join("\n\n");
}
