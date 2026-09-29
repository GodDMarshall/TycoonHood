/**
 * Geometry with world-scale UVs. A texture tile is `tile` metres on every
 * face of every object, so a 40m wall and a 1m plinth share the same stone
 * grain — the single biggest difference between "3D demo" and "a place".
 */
import {
  BoxGeometry,
  BufferAttribute,
  CylinderGeometry,
  Mesh,
  PlaneGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";

export function scaleUV(geo: BufferGeometry, fn: (i: number, u: number, v: number) => [number, number]) {
  const uv = geo.getAttribute("uv") as BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = fn(i, uv.getX(i), uv.getY(i));
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Box, base at y=0, UVs in metres/tile per face (order: +x −x +y −y +z −z). `tileV` for non-square modules. */
export function boxGeo(w: number, h: number, d: number, tile = 4, tileV = tile) {
  const g = new BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  return scaleUV(g, (i, u, v) => {
    const f = Math.floor(i / 4);
    const [a, b] = dims[f];
    // Side faces use the vertical module; top and bottom stay square.
    return [(u * a) / tile, (v * b) / (f === 2 || f === 3 ? tile : tileV)];
  });
}

export function cylGeo(rTop: number, rBot: number, h: number, seg = 48, tile = 4, open = false) {
  const g = new CylinderGeometry(rTop, rBot, h, seg, 1, open);
  g.translate(0, h / 2, 0);
  const circ = Math.PI * 2 * Math.max(rTop, rBot);
  return scaleUV(g, (_i, u, v) => [(u * circ) / tile, (v * h) / tile]);
}

export function planeGeo(w: number, d: number, tile = 4) {
  const g = new PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  return scaleUV(g, (_i, u, v) => [(u * w) / tile, (v * d) / tile]);
}

type MeshOpts = { cast?: boolean; receive?: boolean };

export function mesh(geo: BufferGeometry, mat: Material, x = 0, y = 0, z = 0, o: MeshOpts = {}) {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  return m;
}

export function box(w: number, h: number, d: number, mat: Material, x = 0, y = 0, z = 0, tile = 4, o: MeshOpts & { tileV?: number } = {}) {
  return mesh(boxGeo(w, h, d, tile, o.tileV ?? tile), mat, x, y, z, o);
}

/** Collision shapes on the ground plane. */
export type Collider =
  | { kind: "circle"; x: number; z: number; r: number }
  | { kind: "box"; minX: number; maxX: number; minZ: number; maxZ: number };

export const circle = (x: number, z: number, r: number): Collider => ({ kind: "circle", x, z, r });
export const rect = (cx: number, cz: number, w: number, d: number): Collider => ({
  kind: "box",
  minX: cx - w / 2,
  maxX: cx + w / 2,
  minZ: cz - d / 2,
  maxZ: cz + d / 2,
});

/** Mark every mesh under a root as static for shadows (never cast from emissive/glass bits). */
export function noShadow(o: Object3D) {
  o.traverse((c) => {
    const m = c as Mesh;
    if (m.isMesh) {
      m.castShadow = false;
      m.receiveShadow = false;
    }
  });
  return o;
}
