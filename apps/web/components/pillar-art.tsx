/**
 * Each pillar's name and one-line promise, as the public program pages show
 * them. (The drawn scenes live in components/art/program-art.tsx.)
 */
type Pillar = "WARRIOR" | "BUILDER" | "TYCOON" | "MIND";

export const PILLAR_WORLD: Record<Pillar, { name: string; line: string }> = {
  WARRIOR: { name: "Warrior", line: "Body and discipline" },
  BUILDER: { name: "Builder", line: "Business and execution" },
  TYCOON: { name: "Tycoon", line: "Capital and compounding" },
  MIND: { name: "Mind", line: "Focus and clarity" },
};
