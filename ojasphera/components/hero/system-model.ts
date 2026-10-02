/**
 * The Ojasphera Intelligence System — the model behind the hero.
 *
 * Space is organised left→right as the company's philosophy:
 *   Real World → Data → Intelligence → System → Experience
 * Each core node sits in one of those stages. Satellites around a node are
 * arranged more chaotically in the real world and more orderly as the stages
 * progress — the visual argument that structure is what gets built.
 */

export const STAGES = ["Real World", "Data", "Intelligence", "System", "Experience"] as const;

export type CoreId = "BUSINESS" | "PROJECTS" | "DATA" | "AI" | "AGENTS" | "AUTOMATION" | "SYSTEMS" | "EXPERIENCE";

export type CoreNode = {
  id: CoreId;
  stage: number;
  pos: [number, number, number];
  role: string;
};

export const CORE: CoreNode[] = [
  { id: "BUSINESS", stage: 0, pos: [-1.7, -0.55, 0.3], role: "The organisation as it actually operates — people, decisions, operations." },
  { id: "PROJECTS", stage: 0, pos: [-1.55, 0.6, -0.35], role: "Physical and conceptual projects — estates, products, ideas, initiatives." },
  { id: "DATA", stage: 1, pos: [-0.8, 0, 0], role: "What the real world produces — records, documents, signals, activity." },
  { id: "AI", stage: 2, pos: [0.05, -0.55, -0.3], role: "Models that read the data, reason about it and form judgements." },
  { id: "AGENTS", stage: 2, pos: [0, 0.55, 0.35], role: "Specialised AI workers that observe, plan, coordinate and act." },
  { id: "SYSTEMS", stage: 3, pos: [0.85, -0.5, 0.25], role: "The infrastructure that holds it together — APIs, databases, real-time state." },
  { id: "AUTOMATION", stage: 3, pos: [0.8, 0.55, -0.25], role: "Workflows that run themselves, with people in the loop where it matters." },
  { id: "EXPERIENCE", stage: 4, pos: [1.65, 0, 0], role: "The interface people use — dashboards, environments, tools." },
];

/** Directed: data flows from the real world toward experience; EXPERIENCE→BUSINESS is the feedback loop. */
export const EDGES: [CoreId, CoreId][] = [
  ["BUSINESS", "DATA"],
  ["PROJECTS", "DATA"],
  ["DATA", "AI"],
  ["DATA", "AGENTS"],
  ["AI", "AGENTS"],
  ["AI", "SYSTEMS"],
  ["AGENTS", "AUTOMATION"],
  ["AGENTS", "SYSTEMS"],
  ["SYSTEMS", "AUTOMATION"],
  ["SYSTEMS", "EXPERIENCE"],
  ["AUTOMATION", "EXPERIENCE"],
  ["EXPERIENCE", "BUSINESS"],
];

export const STAGE_COLOR = ["#6fd3a8", "#7cc7e8", "#f2b45a", "#b9c7ff", "#eceef1"];

export type Satellite = {
  core: number;
  base: [number, number, number];
  phase: number;
  amp: number;
};

/** Deterministic PRNG so server/first-paint and re-mounts look identical. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSatellites(perCore: number): Satellite[] {
  const r = rng(7);
  const out: Satellite[] = [];
  CORE.forEach((node, ci) => {
    for (let i = 0; i < perCore; i++) {
      const k = i / perCore;
      let off: [number, number, number];
      switch (node.stage) {
        case 0: // real world: unstructured cloud
          off = [(r() - 0.5) * 0.7, (r() - 0.5) * 0.7, (r() - 0.5) * 0.7];
          break;
        case 1: // data: dense gathered cloud
          off = [(r() - 0.5) * 0.45, (r() - 0.5) * 0.45, (r() - 0.5) * 0.45];
          break;
        case 2: { // intelligence: spherical shell
          const th = r() * Math.PI * 2;
          const ph = Math.acos(2 * r() - 1);
          const rad = 0.26;
          off = [rad * Math.sin(ph) * Math.cos(th), rad * Math.sin(ph) * Math.sin(th), rad * Math.cos(ph)];
          break;
        }
        case 3: { // system: orbit ring
          const a = k * Math.PI * 2;
          off = [Math.cos(a) * 0.28, Math.sin(a) * 0.1, Math.sin(a) * 0.28];
          break;
        }
        default: { // experience: ordered grid plane
          const cols = Math.ceil(Math.sqrt(perCore));
          const gx = (i % cols) / (cols - 1) - 0.5;
          const gy = Math.floor(i / cols) / (cols - 1) - 0.5;
          off = [0, gy * 0.55, gx * 0.55];
        }
      }
      out.push({
        core: ci,
        base: [node.pos[0] + off[0], node.pos[1] + off[1], node.pos[2] + off[2]],
        phase: r() * Math.PI * 2,
        amp: node.stage === 0 ? 0.05 : node.stage === 1 ? 0.03 : 0.012,
      });
    }
  });
  return out;
}
