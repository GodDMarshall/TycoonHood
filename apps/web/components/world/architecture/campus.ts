/**
 * TYCOONHOOD HQ — the campus.
 *
 * A raised plaza of polished black marble at dusk. Six buildings, each a real
 * room of the product, each in a language that says what happens inside:
 *
 *   Command Center  a 90m glass-and-brass tower — your seat, visible from anywhere
 *   Academy         a long concrete colonnade, its library lit from within
 *   Arena           an amphitheatre bowl ringed by floodlight masts
 *   Vault           a sealed basalt cube with a six-metre brass wheel door
 *   Treasury        a rotunda whose oculus throws a column of light into the sky
 *   Network         nine glass pylons joined by lit sky-bridges
 *
 * Units are metres. Yaw 0 looks north (−z). Every building returns its
 * colliders, the point in front of its door, and where its label floats.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
} from "three";
import type { Materials } from "../engine/materials";
import { box, boxGeo, circle, cylGeo, mesh, planeGeo, rect, scaleUV, type Collider } from "./geo";

export type DistrictId = "command" | "academy" | "arena" | "vault" | "treasury" | "network";

export type Building = {
  id: DistrictId;
  group: Group;
  colliders: Collider[];
  /** Where you stand to enter, and which way you face. */
  entrance: { x: number; z: number; yaw: number };
  /** Label anchor in world space. */
  anchor: Vector3;
  update?: (t: number, dt: number) => void;
};

const TAU = Math.PI * 2;

// ─────────────────────────────────────────────── the plaza

export function buildPlaza(m: Materials) {
  const g = new Group();
  // Raised platform: 0.6m above the surrounding ground.
  const W = 180;
  const D = 180;
  const floor = mesh(planeGeo(W, D, 3.2), m.plazaFloor, 0, 0.6, -8, { cast: false });
  g.add(floor);
  // Skirt and steps down to the ground on every side. The skirt stops 2cm
  // short of the floor: a face coplanar with it z-fights across the plaza.
  g.add(box(W + 2, 0.58, D + 2, m.basalt, 0, 0, -8, 4, { cast: false }));
  g.add(box(W + 6, 0.3, D + 6, m.basalt, 0, 0, -8, 4, { cast: false }));
  // Ground beyond the plaza.
  g.add(mesh(planeGeo(1600, 1600, 6), m.basalt, 0, 0, 0, { cast: false }));

  // The medallion: the coin mark inlaid in brass at the centre of the house.
  const inlay = new Group();
  inlay.position.y = 0.61;
  for (const [r, w] of [
    [11, 0.35],
    [9.8, 0.12],
    [6.2, 0.08],
  ] as const) {
    const ring = new Mesh(new RingGeometry(r - w, r, 160), m.brassPolished);
    ring.rotation.x = -Math.PI / 2;
    ring.receiveShadow = true;
    inlay.add(ring);
  }
  // Milled edge ticks.
  const tick = new InstancedMesh(boxGeo(0.12, 0.01, 0.7, 1), m.brassPolished, 96);
  const mat4 = new Matrix4();
  const o = new Object3D();
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * TAU;
    o.position.set(Math.cos(a) * 10.4, 0, Math.sin(a) * 10.4);
    o.rotation.y = -a;
    o.updateMatrix();
    tick.setMatrixAt(i, o.matrix);
  }
  inlay.add(tick);
  // The T.
  inlay.add(box(6.4, 0.012, 1.3, m.brassPolished, 0, 0, -2.1, 1, { cast: false }));
  inlay.add(box(1.3, 0.012, 5.6, m.brassPolished, 0, 0, 0.9, 1, { cast: false }));
  inlay.add(box(3.0, 0.012, 0.5, m.brassPolished, 0, 0, 4.2, 1, { cast: false }));
  g.add(inlay);

  // Perimeter bollards: a rhythm of warm light around the edge of the plaza.
  const bollardGeo = cylGeo(0.14, 0.18, 1.0, 12, 1);
  const capGeo = new CylinderGeometry(0.16, 0.16, 0.08, 12);
  const positions: [number, number][] = [];
  for (let x = -84; x <= 84; x += 12) positions.push([x, 78], [x, -94]);
  for (let z = -82; z <= 66; z += 12) positions.push([-86, z], [86, z]);
  const bollards = new InstancedMesh(bollardGeo, m.bronzeDark, positions.length);
  const caps = new InstancedMesh(capGeo, m.goldLight, positions.length);
  positions.forEach(([x, z], i) => {
    mat4.makeTranslation(x, 0.6, z);
    bollards.setMatrixAt(i, mat4);
    mat4.makeTranslation(x, 1.62, z);
    caps.setMatrixAt(i, mat4);
  });
  bollards.castShadow = true;
  g.add(bollards, caps);
  return g;
}

/** Lit brass inlays from the medallion to every door — every room feeds one ledger. */
export function buildPathways(m: Materials, doors: { x: number; z: number }[]) {
  const g = new Group();
  for (const d of doors) {
    const dir = new Vector2(d.x, d.z);
    const len = dir.length() - 12.5;
    const n = dir.clone().normalize();
    const mid = n.clone().multiplyScalar(11.5 + len / 2);
    const strip = box(0.14, 0.012, len, m.goldLightSoft, mid.x, 0.605, mid.y, 1, { cast: false, receive: false });
    strip.rotation.y = Math.atan2(n.x, n.y);
    g.add(strip);
  }
  return g;
}

// ─────────────────────────────────────────────── the buildings

function portal(m: Materials, w: number, h: number) {
  const g = new Group();
  g.add(box(w + 1.2, 0.7, 0.9, m.brassPolished, 0, h, 0, 2));
  g.add(box(0.6, h, 0.9, m.brassPolished, -w / 2 - 0.3, 0, 0, 2));
  g.add(box(0.6, h, 0.9, m.brassPolished, w / 2 + 0.3, 0, 0, 2));
  // A recessed doorway: a deep reveal in bronze, the lit hall beyond.
  g.add(box(w, h, 0.1, m.lobby, 0, 0, -1.4, Math.max(w, 6) * 2, { cast: false, receive: false, tileV: h * 1.2 }));
  g.add(box(0.12, h, 1.4, m.bronzeDark, -w / 2, 0, -0.7, 1));
  g.add(box(0.12, h, 1.4, m.bronzeDark, w / 2, 0, -0.7, 1));
  g.add(box(w, 0.12, 1.4, m.bronzeDark, 0, h - 0.12, -0.7, 1));
  g.add(box(w, 0.02, 1.4, m.goldLightSoft, 0, 0.01, -0.7, 1, { cast: false, receive: false }));
  return g;
}

export function buildCommand(m: Materials): Building {
  const cx = 0;
  const cz = -74;
  const g = new Group();
  g.position.set(cx, 0.6, cz);
  g.add(box(44, 0.6, 44, m.basalt, 0, 0, 0));
  g.add(box(36, 0.6, 36, m.basalt, 0, 0.6, 0));
  const base = 1.2;
  const H = 88;
  // Curtain-wall shaft: offices, some still lit.
  g.add(box(21, H, 21, m.office, 0, base, 0, 48, { tileV: 64 }));
  // Lobby: a double-height hall of warm light at the foot of the tower.
  g.add(box(21.2, 11, 21.2, m.lobby, 0, base + 0.6, 0, 24, { cast: false, tileV: 12 }));
  g.add(box(21.6, 1.2, 21.6, m.basalt, 0, base + 11.6, 0));
  // Brass fins, every 2.1m, full height, all four faces.
  const fins = new InstancedMesh(boxGeo(0.28, H - 12, 1.1, 2), m.brass, 40);
  const o = new Object3D();
  let n = 0;
  for (let i = 0; i < 10; i++) {
    const t = -9.45 + i * 2.1;
    for (const [x, z, ry] of [
      [t, 11, 0],
      [t, -11, 0],
      [11, t, Math.PI / 2],
      [-11, t, Math.PI / 2],
    ] as const) {
      o.position.set(x, base + 12.8, z);
      o.rotation.y = ry;
      o.updateMatrix();
      fins.setMatrixAt(n++, o.matrix);
    }
  }
  fins.castShadow = true;
  g.add(fins);
  // Crown: brass band, a line of light, a spire.
  g.add(box(22.6, 1.6, 22.6, m.brassPolished, 0, base + H, 0));
  g.add(box(22.8, 0.25, 22.8, m.goldLight, 0, base + H + 1.6, 0, 2, { cast: false }));
  g.add(box(14, 5, 14, m.lobby, 0, base + H + 1.85, 0, 24, { tileV: 12 }));
  g.add(mesh(cylGeo(0.25, 0.6, 18, 12, 2), m.brassPolished, 0, base + H + 6.85, 0));
  g.add(mesh(new SphereGeometry(0.7, 16, 12), m.goldLight, 0, base + H + 25.2, 0, { cast: false }));
  // Canopy and portal on the south face.
  g.add(box(16, 0.8, 7, m.basalt, 0, base + 12.4, 13.6));
  const p = portal(m, 7, 10);
  p.position.set(0, base, 11.2);
  g.add(p);
  return {
    id: "command",
    group: g,
    colliders: [rect(cx, cz, 38, 38)],
    entrance: { x: cx, z: cz + 23, yaw: 0 },
    anchor: new Vector3(cx, 26, cz + 12),
  };
}

export function buildAcademy(m: Materials): Building {
  const cx = -64;
  const cz = -10;
  const g = new Group();
  g.position.set(cx, 0.6, cz);
  const L = 54;
  g.add(box(28, 1.2, L + 4, m.concrete, 0, 0, 0));
  // The hall: concrete mass with a lit library face behind the colonnade.
  g.add(box(18, 13, L - 6, m.concrete, -3, 1.2, 0));
  const lit = box(0.2, 11, L - 10, m.library, 6.05, 1.8, 0, 12, { cast: false, tileV: 12 });
  g.add(lit);
  // Mullions over the lit face.
  const mull = new InstancedMesh(boxGeo(0.25, 11, 0.25, 1), m.bronzeDark, 22);
  const o = new Object3D();
  for (let i = 0; i < 22; i++) {
    o.position.set(6.2, 1.8, -(L - 10) / 2 + i * ((L - 10) / 21));
    o.updateMatrix();
    mull.setMatrixAt(i, o.matrix);
  }
  g.add(mull);
  // Colonnade.
  const colGeo = boxGeo(1.3, 13.6, 1.3, 2);
  const cols = new InstancedMesh(colGeo, m.concrete, 26);
  let k = 0;
  for (let i = 0; i < 13; i++) {
    const z = -(L - 2) / 2 + i * ((L - 2) / 12);
    for (const x of [12.2, -12.2]) {
      o.position.set(x, 1.2, z);
      o.updateMatrix();
      cols.setMatrixAt(k++, o.matrix);
    }
  }
  cols.castShadow = true;
  cols.receiveShadow = true;
  g.add(cols);
  // Roof slab with a brass fascia.
  g.add(box(28, 1.6, L + 4, m.concrete, 0, 14.8, 0));
  g.add(box(28.3, 0.45, L + 4.3, m.brass, 0, 14.5, 0, 2));
  const p = portal(m, 5, 8);
  p.position.set(6.3, 1.2, 0);
  p.rotation.y = Math.PI / 2;
  g.add(p);
  return {
    id: "academy",
    group: g,
    colliders: [rect(cx, cz, 30, L + 6)],
    entrance: { x: cx + 20, z: cz, yaw: Math.PI / 2 },
    anchor: new Vector3(cx + 8, 20, cz),
  };
}

export function buildTreasury(m: Materials): Building {
  const cx = 64;
  const cz = -10;
  const g = new Group();
  g.position.set(cx, 0.6, cz);
  g.add(mesh(cylGeo(18, 18.4, 0.6, 96, 3), m.basalt, 0, 0, 0));
  g.add(mesh(cylGeo(16.4, 16.8, 0.6, 96, 3), m.basalt, 0, 0.6, 0));
  const base = 1.2;
  g.add(mesh(cylGeo(11.5, 11.5, 14, 96, 3), m.basalt, 0, base, 0));
  // Peristyle.
  const colGeo = cylGeo(0.6, 0.7, 14, 20, 2);
  const cols = new InstancedMesh(colGeo, m.concrete, 20);
  const o = new Object3D();
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU + TAU / 40;
    o.position.set(Math.cos(a) * 14.4, base, Math.sin(a) * 14.4);
    o.updateMatrix();
    cols.setMatrixAt(i, o.matrix);
  }
  cols.castShadow = true;
  g.add(cols);
  g.add(mesh(cylGeo(15.6, 15.6, 1.8, 96, 3), m.concrete, 0, base + 14, 0));
  g.add(mesh(cylGeo(15.8, 15.8, 0.3, 96, 2), m.brass, 0, base + 15.8, 0));
  // Bronze dome with a lit oculus.
  const dome = new Mesh(new SphereGeometry(12.6, 64, 24, 0, TAU, 0, Math.PI / 2), m.bronzeDark);
  dome.scale.y = 0.55;
  dome.position.y = base + 16;
  dome.castShadow = true;
  g.add(dome);
  const oculus = new Mesh(new TorusGeometry(1.6, 0.18, 8, 48), m.goldLight);
  oculus.rotation.x = Math.PI / 2;
  oculus.position.y = base + 22.9;
  g.add(oculus);
  // The column of light: the supply is fixed, and anyone can see it from anywhere.
  const beam = new Mesh(new CylinderGeometry(1.4, 1.2, 240, 24, 1, true), m.beam);
  beam.position.y = base + 23 + 120;
  beam.castShadow = false;
  g.add(beam);
  // The coin sculpture in front of the door.
  const coins = new Group();
  coins.position.set(-19, base, 0);
  for (let i = 0; i < 6; i++) {
    const c = mesh(cylGeo(2.2, 2.2, 0.42, 64, 1), m.brassPolished, (i % 2) * 0.12 - 0.06, i * 0.43, ((i * 7) % 3) * 0.08);
    coins.add(c);
  }
  const held = new Group();
  held.position.y = 4.8;
  const coin = new Mesh(new CylinderGeometry(2.6, 2.6, 0.36, 64), m.brassPolished);
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  held.add(coin);
  const rim = new Mesh(new TorusGeometry(2.6, 0.05, 6, 96), m.goldLight);
  held.add(rim);
  coins.add(held);
  g.add(coins);
  const p = portal(m, 4.6, 7.5);
  p.position.set(-11.9, base, 0);
  p.rotation.y = -Math.PI / 2;
  g.add(p);
  return {
    id: "treasury",
    group: g,
    colliders: [circle(cx, cz, 18.5), circle(cx - 19, cz, 3)],
    entrance: { x: cx - 24, z: cz + 5, yaw: -Math.PI / 2 },
    anchor: new Vector3(cx - 8, 30, cz),
    update: (_t, dt) => {
      held.rotation.y += dt * 0.35;
    },
  };
}

export function buildVault(m: Materials): Building {
  const cx = 58;
  const cz = 44;
  const g = new Group();
  g.position.set(cx, 0.6, cz);
  g.add(box(32, 1, 32, m.basalt, 0, 0, 0));
  g.add(box(22, 22, 22, m.basalt, 0, 1, 0, 5));
  g.add(box(22.3, 0.6, 22.3, m.brass, 0, 20.4, 0, 2));
  g.add(box(22.4, 0.14, 22.4, m.goldLight, 0, 21.1, 0, 2, { cast: false }));
  // The wheel door on the west face.
  const door = new Group();
  door.position.set(-11.2, 9.5, 0);
  door.rotation.y = -Math.PI / 2;
  const ring = new Mesh(new TorusGeometry(6, 0.55, 24, 96), m.brassPolished);
  ring.castShadow = true;
  door.add(ring);
  const seam = new Mesh(new TorusGeometry(6.75, 0.07, 8, 128), m.goldLight);
  door.add(seam);
  const plate = new Mesh(new CylinderGeometry(5.5, 5.5, 0.5, 96), m.bronzeDark);
  plate.rotation.x = Math.PI / 2;
  door.add(plate);
  const wheel = new Group();
  wheel.position.z = 0.6;
  for (let i = 0; i < 3; i++) {
    const spoke = box(9, 0.36, 0.36, m.brassPolished, 0, -0.18, 0, 1);
    spoke.rotation.z = (i * Math.PI) / 3;
    wheel.add(spoke);
  }
  const hub = new Mesh(new CylinderGeometry(1, 1, 0.6, 48), m.brassPolished);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  door.add(wheel);
  // Bolts around the ring.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const b = new Mesh(new CylinderGeometry(0.28, 0.28, 0.5, 16), m.brassPolished);
    b.rotation.x = Math.PI / 2;
    b.position.set(Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0.3);
    door.add(b);
  }
  g.add(door);
  return {
    id: "vault",
    group: g,
    colliders: [rect(cx, cz, 33, 33)],
    entrance: { x: cx - 22, z: cz, yaw: -Math.PI / 2 },
    anchor: new Vector3(cx - 12, 27, cz),
    update: (_t, dt) => {
      wheel.rotation.z += dt * 0.08;
    },
  };
}

export function buildArena(m: Materials): Building {
  const cx = -58;
  const cz = 44;
  const g = new Group();
  g.position.set(cx, 0.6, cz);
  // The bowl: an outer wall and tiers stepping down to a marked floor.
  const pts: Vector2[] = [];
  const outer = 22;
  const inner = 9;
  const tiers = 8;
  pts.push(new Vector2(inner - 0.01, 0.2));
  for (let i = 0; i < tiers; i++) {
    const r = inner + ((outer - 1.2 - inner) / tiers) * i;
    const y = 0.2 + i * 1.3;
    pts.push(new Vector2(r, y), new Vector2(r, y + 1.3));
  }
  pts.push(new Vector2(outer - 1.2, 0.2 + tiers * 1.3), new Vector2(outer, 0.2 + tiers * 1.3 + 1.2), new Vector2(outer, 0));
  // Metre-scale UVs: around the circumference and along the profile.
  const profileLen = pts.reduce((n, p2, i) => (i ? n + p2.distanceTo(pts[i - 1]) : 0), 0);
  const bowlGeo = scaleUV(new LatheGeometry(pts, 128), (_i, u, v) => [(u * TAU * outer) / 4, (v * profileLen) / 4]);
  const bowl = new Mesh(bowlGeo, m.concrete);
  (bowl.material as Material).side = DoubleSide;
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  g.add(bowl);
  g.add(mesh(cylGeo(inner, inner, 0.2, 96, 3), m.marbleFloor, 0, 0, 0));
  for (const [r, w] of [
    [5, 0.12],
    [2.4, 0.1],
  ] as const) {
    const ring = new Mesh(new RingGeometry(r - w, r, 96), m.goldLight);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.22;
    g.add(ring);
  }
  // Floodlight masts.
  const o = new Object3D();
  const masts = new InstancedMesh(cylGeo(0.3, 0.45, 26, 12, 2), m.bronzeDark, 8);
  const heads = new InstancedMesh(boxGeo(3.2, 1.1, 0.6, 1), m.whiteLight, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + TAU / 16;
    o.position.set(Math.cos(a) * (outer + 2.5), 0, Math.sin(a) * (outer + 2.5));
    o.rotation.set(0, -a + Math.PI / 2, 0);
    o.updateMatrix();
    masts.setMatrixAt(i, o.matrix);
    o.position.y = 26;
    o.rotation.x = -0.4;
    o.updateMatrix();
    heads.setMatrixAt(i, o.matrix);
  }
  masts.castShadow = true;
  g.add(masts, heads);
  // Facade fins: the bowl's outer wall read as architecture, not a drum.
  const fins = new InstancedMesh(boxGeo(0.6, 12.2, 1.6, 2), m.concrete, 48);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.16) continue; // leave the gate clear
    o.position.set(Math.cos(a) * (outer + 0.6), 0, Math.sin(a) * (outer + 0.6));
    o.rotation.set(0, -a, 0);
    o.updateMatrix();
    fins.setMatrixAt(i, o.matrix);
  }
  fins.castShadow = true;
  fins.receiveShadow = true;
  g.add(fins);
  g.add(mesh(cylGeo(outer + 1.4, outer + 1.4, 0.8, 128, 3, true), m.brass, 0, 12.2, 0));
  const p = portal(m, 5, 8);
  p.position.set(outer + 1.5, 0, 0);
  p.rotation.y = Math.PI / 2;
  g.add(p);
  return {
    id: "arena",
    group: g,
    colliders: [circle(cx, cz, outer + 3.4)],
    entrance: { x: cx + outer + 8, z: cz, yaw: Math.PI / 2 },
    anchor: new Vector3(cx + 10, 18, cz),
  };
}

export function buildNetwork(m: Materials): Building {
  const cx = -60;
  const cz = -64;
  const g = new Group();
  g.position.set(cx, 0.6, cz);
  g.add(box(36, 0.8, 36, m.basalt, 0, 0, 0));
  const tops: Vector3[] = [];
  const heights = [26, 38, 22, 44, 58, 30, 24, 34, 20];
  let k = 0;
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      const h = heights[k++];
      const x = ix * 11;
      const z = iz * 11;
      g.add(box(4, h, 4, m.officeCool, x, 0.8, z, 48, { tileV: 64 }));
      g.add(box(4.3, 0.6, 4.3, m.brass, x, 0.8 + h, z, 2));
      // Corner light strips.
      for (const [sx, sz] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const) {
        g.add(box(0.1, h - 1, 0.1, m.goldLightSoft, x + sx * 2.02, 1.3, z + sz * 2.02, 1, { cast: false, receive: false }));
      }
      tops.push(new Vector3(x, 0.8 + h * 0.62, z));
    }
  }
  // Sky-bridges between neighbours.
  const link = (a: Vector3, b: Vector3) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b) - 4;
    const bridge = box(1.4, 0.35, len, m.goldLightSoft, 0, 0, 0, 1, { cast: false, receive: false });
    bridge.position.copy(mid);
    bridge.lookAt(b);
    g.add(bridge);
  };
  const idx = (x: number, z: number) => x * 3 + z;
  for (let x = 0; x < 3; x++)
    for (let z = 0; z < 3; z++) {
      if (x < 2) link(tops[idx(x, z)], new Vector3(tops[idx(x + 1, z)].x, tops[idx(x, z)].y, tops[idx(x + 1, z)].z));
      if (z < 2) link(tops[idx(x, z)], new Vector3(tops[idx(x, z + 1)].x, tops[idx(x, z)].y, tops[idx(x, z + 1)].z));
    }
  // The gateway, facing the plaza.
  const p = portal(m, 6, 9);
  p.position.set(14, 0.8, 14);
  p.rotation.y = Math.PI / 4;
  g.add(p);
  const colliders: Collider[] = [rect(cx, cz, 38, 38)];
  return {
    id: "network",
    group: g,
    colliders,
    entrance: { x: cx + 24, z: cz + 24, yaw: Math.PI / 4 },
    anchor: new Vector3(cx + 10, 30, cz + 10),
  };
}

/** Reflecting pool between the medallion and the tower. */
export function poolBounds() {
  return { cx: 0, cz: -34, w: 16, d: 34 };
}

/** The city beyond: towers with lit windows, 260–760m out, never reachable. */
export function buildSkyline(count: number, seed = 7) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  // One canvas of windows; towers sample different slices of it via scale.
  // The canvas spans 96m × 448m of facade: 128 floors of 3.5m, windows ~2.25m wide.
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 1024;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, cv.width, cv.height);
  for (let y = 0; y < cv.height; y += 8) {
    const floorLit = rnd() < 0.8;
    for (let x = 0; x < cv.width; x += 6) {
      const r = rnd();
      if (floorLit && r < 0.32) {
        ctx.fillStyle =
          r < 0.27
            ? `rgba(255,${176 + Math.floor(rnd() * 50)},${100 + Math.floor(rnd() * 40)},${0.5 + rnd() * 0.5})`
            : `rgba(185,205,255,${0.3 + rnd() * 0.3})`;
        ctx.fillRect(x + 1, y + 2, 4, 5);
      }
    }
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  const mat = new MeshStandardMaterial({
    color: "#07080a",
    metalness: 0.6,
    roughness: 0.45,
    envMapIntensity: 0.35,
    emissive: new Color("#ffffff"),
    emissiveMap: tex,
    emissiveIntensity: 1.6,
  });
  const geo = new BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  // Scale the window grid with the tower so floors stay a constant size.
  const inst = new InstancedMesh(geo, mat, count);
  const o = new Object3D();
  for (let i = 0; i < count; i++) {
    const a = rnd() * TAU;
    const r = 520 + Math.pow(rnd(), 0.8) * 900;
    const w = 20 + rnd() * 34;
    const h = 40 + Math.pow(rnd(), 1.6) * 280;
    o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    o.rotation.y = rnd() * TAU;
    o.scale.set(w, h, w * (0.7 + rnd() * 0.6));
    o.updateMatrix();
    inst.setMatrixAt(i, o.matrix);
  }
  inst.castShadow = false;
  inst.receiveShadow = false;
  // World-scale window UVs for a unit box scaled per instance.
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\nvarying vec2 vCity;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec3 ap = abs(normal);
        vec2 f = ap.x > 0.5 ? vec2(position.z * sc.z, position.y * sc.y) : vec2(position.x * sc.x, position.y * sc.y);
        vCity = f / vec2(96.0, 448.0) + vec2(instanceMatrix[3].x, instanceMatrix[3].z) * 0.013;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <uv_pars_fragment>", "#include <uv_pars_fragment>\nvarying vec2 vCity;")
      .replace("#include <emissivemap_fragment>", "totalEmissiveRadiance *= texture2D(emissiveMap, vCity).rgb;");
  };
  return inst;
}
