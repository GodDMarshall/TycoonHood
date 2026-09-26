/**
 * Materials. Three families and nothing else:
 *   stone — the architecture: near-black, matte, faintly warm
 *   gold  — the one precious material: metal, low roughness, lit by the room
 *   light — the pathways and edges: unlit lines that read as drawn with a rule
 */
import {
  AdditiveBlending,
  Color,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
} from "three";

export const PALETTE = {
  ground: new Color("#0a0908"),
  stone: new Color("#15130f"),
  stoneLit: new Color("#1d1a15"),
  gold: new Color("#cfa95e"),
  goldBright: new Color("#f0d9a0"),
  goldDeep: new Color("#6d5528"),
};

export function createMaterials() {
  return {
    stone: new MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.82, metalness: 0.12 }),
    stoneLit: new MeshStandardMaterial({ color: PALETTE.stoneLit, roughness: 0.7, metalness: 0.18 }),
    ground: new MeshStandardMaterial({ color: PALETTE.ground, roughness: 0.55, metalness: 0.35 }),
    gold: new MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.26, metalness: 1 }),
    goldSatin: new MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.45, metalness: 1 }),
    goldGlow: new MeshBasicMaterial({ color: PALETTE.goldBright }),
    grid: new LineBasicMaterial({ color: PALETTE.goldDeep, transparent: true, opacity: 0.16, depthWrite: false }),
    path: new MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.22, depthWrite: false }),
    pulse: new PointsMaterial({
      color: PALETTE.goldBright,
      size: 0.16,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
    dust: new PointsMaterial({
      color: PALETTE.gold,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
    hit: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  };
}
export type Materials = ReturnType<typeof createMaterials>;

/** Each district owns its edge material so it can light up on its own. */
export function createEdgeMaterial() {
  return new LineBasicMaterial({ color: PALETTE.gold.clone(), transparent: true, opacity: 0.5 });
}
