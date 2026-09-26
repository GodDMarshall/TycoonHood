/**
 * The isometric frame shared by the static drawing (server) and the label
 * overlay (client). Kept tiny so the client never bundles the drawing.
 */
import { DISTRICTS, type DistrictId } from "./districts";

export const S = 30; // px per scene unit
export const C30 = Math.cos(Math.PI / 6);
export const iso = (x: number, y: number, z: number): [number, number] => [
  (x - z) * C30 * S,
  (x + z) * 0.5 * S - y * S,
];

/** Fixed frame around the plan, sized to the plaza ring and the tallest crown. */
export const FRAME = { x: -330, y: -300, w: 660, h: 500 };
export const DRAWING_ASPECT = FRAME.w / FRAME.h;

const toPct = ([sx, sy]: [number, number]) => ({
  left: ((sx - FRAME.x) / FRAME.w) * 100,
  top: ((sy - FRAME.y) / FRAME.h) * 100,
});

/** Label anchors as percentages of the drawing box. */
export const DRAWING_ANCHORS = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, toPct(iso(d.at[0], d.anchor * 0.86, d.at[1]))])
) as Record<DistrictId, { left: number; top: number }>;
