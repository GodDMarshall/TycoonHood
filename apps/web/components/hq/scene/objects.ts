/**
 * The architecture of the HQ. Each district is built from a small set of
 * primitives — stone volumes with gold edges, and at most one solid gold
 * element — so the whole plaza reads as one building programme rather than
 * six unrelated props. Forms carry the meaning of the room:
 *
 *   Command Center  a monolith on a stepped plinth, crowned, ringed
 *   Academy         a colonnade — the oldest shape of a school
 *   Arena           a tiered ring around a marked floor
 *   Vault           a sealed cube with a wheel door
 *   Treasury        a stack of coins on a plinth, one held aloft
 *   Network         pylons of different heights, their tops connected
 *
 * Pathways run from every district to the core, and light travels along
 * them toward it: every room feeds the same ledger.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { DISTRICTS, type DistrictId } from "../districts";
import { PALETTE, createEdgeMaterial, type Materials } from "./materials";

export type DistrictObject = {
  id: DistrictId;
  root: Group;
  body: Group;
  hit: Mesh;
  edge: LineBasicMaterial;
  path?: MeshBasicMaterial;
  anchor: Vector3;
  hover: number;
  target: number;
  spin: { object: Object3D; axis: "x" | "y" | "z"; idle: number; active: number }[];
};

// Deterministic jitter so the drawing is the same on every load.
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function withEdges(mesh: Mesh, edge: LineBasicMaterial, threshold = 20) {
  mesh.add(new LineSegments(new EdgesGeometry(mesh.geometry, threshold), edge));
  return mesh;
}

/** A box whose base sits at y. */
function block(w: number, h: number, d: number, mat: Material, edge: LineBasicMaterial | null, y = 0) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), mat);
  mesh.position.y = y + h / 2;
  if (edge) withEdges(mesh, edge);
  return mesh;
}

function buildTower(m: Materials, edge: LineBasicMaterial, d: DistrictObject) {
  const b = d.body;
  let y = 0;
  for (const s of [4.6, 3.8, 3.0]) {
    b.add(block(s, 0.22, s, m.stone, edge, y));
    y += 0.22;
  }
  const shaftH = 5.0;
  b.add(block(1.25, shaftH, 1.25, m.stoneLit, edge, y));
  // Gold seams down the two faces the plaza sees.
  for (const [x, z, w, dd] of [
    [0, 0.63, 0.035, 0.02],
    [0.63, 0, 0.02, 0.035],
  ] as const) {
    const seam = new Mesh(new BoxGeometry(w, shaftH - 0.6, dd), m.goldGlow);
    seam.position.set(x, y + shaftH / 2, z);
    b.add(seam);
  }
  y += shaftH;
  b.add(block(1.55, 0.14, 1.55, m.gold, null, y));
  b.add(block(0.9, 0.55, 0.9, m.stone, edge, y + 0.14));
  b.add(block(0.98, 0.06, 0.98, m.gold, null, y + 0.69));

  const rings = new Group();
  rings.position.y = y + 1.25;
  const outer = new Mesh(new TorusGeometry(2.3, 0.014, 6, 160), m.goldGlow);
  outer.rotation.x = Math.PI / 2;
  const inner = new Mesh(new TorusGeometry(1.75, 0.01, 6, 128), m.goldGlow);
  inner.rotation.x = Math.PI / 2 + 0.32;
  rings.add(outer, inner);
  b.add(rings);
  d.spin.push({ object: rings, axis: "y", idle: 0.06, active: 0.35 });
}

function buildColonnade(m: Materials, edge: LineBasicMaterial, d: DistrictObject) {
  const b = d.body;
  b.add(block(3.9, 0.3, 2.7, m.stone, edge, 0));
  const count = 7;
  const cols = new InstancedMesh(new CylinderGeometry(0.085, 0.095, 1.9, 14), m.stoneLit, count * 2);
  const mat4 = new Matrix4();
  let n = 0;
  for (const z of [-1.0, 1.0]) {
    for (let i = 0; i < count; i++) {
      mat4.makeTranslation(-1.65 + (3.3 / (count - 1)) * i, 0.3 + 0.95, z);
      cols.setMatrixAt(n++, mat4);
    }
  }
  b.add(cols);
  b.add(block(4.1, 0.06, 2.9, m.goldSatin, null, 2.2));
  b.add(block(4.1, 0.24, 2.9, m.stone, edge, 2.26));
  // The lit object at the heart of the hall.
  const core = block(0.34, 0.34, 0.34, m.gold, null, 0.3);
  core.rotation.y = Math.PI / 4;
  b.add(core);
  d.spin.push({ object: core, axis: "y", idle: 0.2, active: 1.2 });
}

function buildRing(m: Materials, edge: LineBasicMaterial, d: DistrictObject) {
  const b = d.body;
  const profile = [
    [1.05, 0.04],
    [1.35, 0.04],
    [1.35, 0.3],
    [1.7, 0.3],
    [1.7, 0.56],
    [2.05, 0.56],
    [2.05, 0.82],
    [2.4, 0.82],
    [2.4, 0.0],
  ].map(([r, y]) => new Vector2(r, y));
  const bowlMat = m.stone.clone();
  bowlMat.side = DoubleSide;
  const bowl = new Mesh(new LatheGeometry(profile, 72), bowlMat);
  withEdges(bowl, edge, 30);
  b.add(bowl);
  const floor = new Mesh(new CylinderGeometry(1.06, 1.06, 0.04, 64), m.stoneLit);
  floor.position.y = 0.02;
  b.add(floor);
  // The mark on the arena floor: a target, drawn in light.
  for (const r of [0.62, 0.3]) {
    const ring = new Mesh(new TorusGeometry(r, 0.012, 4, 96), m.goldGlow);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    b.add(ring);
  }
  const post = block(0.08, 0.5, 0.08, m.gold, null, 0.04);
  b.add(post);
}

function buildVault(m: Materials, edge: LineBasicMaterial, d: DistrictObject) {
  const b = d.body;
  b.add(block(3.0, 0.2, 3.0, m.stone, edge, 0));
  b.add(block(2.3, 2.3, 2.3, m.stoneLit, edge, 0.2));
  b.add(block(2.34, 0.05, 2.34, m.goldSatin, null, 2.42));
  const door = new Group();
  door.position.set(0, 1.35, 1.16);
  door.add(new Mesh(new TorusGeometry(0.64, 0.055, 12, 64), m.gold));
  const wheel = new Group();
  for (let i = 0; i < 3; i++) {
    const spoke = new Mesh(new BoxGeometry(1.08, 0.045, 0.045), m.goldSatin);
    spoke.rotation.z = (i * Math.PI) / 3;
    wheel.add(spoke);
  }
  const hub = new Mesh(new CylinderGeometry(0.13, 0.13, 0.08, 24), m.gold);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  door.add(wheel);
  b.add(door);
  d.spin.push({ object: wheel, axis: "z", idle: 0.08, active: 1.6 });
}

function buildCoins(m: Materials, edge: LineBasicMaterial, d: DistrictObject) {
  const b = d.body;
  const plinth = new Mesh(new CylinderGeometry(1.6, 1.72, 0.32, 72), m.stone);
  plinth.position.y = 0.16;
  withEdges(plinth, edge, 30);
  b.add(plinth);
  const coin = new CylinderGeometry(1.0, 1.0, 0.13, 72);
  for (let i = 0; i < 8; i++) {
    const c = new Mesh(coin, i % 2 ? m.gold : m.goldSatin);
    c.position.set((rand(i) - 0.5) * 0.09, 0.32 + 0.065 + i * 0.135, (rand(i + 9) - 0.5) * 0.09);
    b.add(c);
  }
  const held = new Group();
  held.position.y = 2.35;
  const top = new Mesh(new CylinderGeometry(0.62, 0.62, 0.08, 72), m.gold);
  top.rotation.x = Math.PI / 2;
  held.add(top);
  const rim = new Mesh(new TorusGeometry(0.62, 0.012, 4, 96), m.goldGlow);
  held.add(rim);
  b.add(held);
  d.spin.push({ object: held, axis: "y", idle: 0.35, active: 1.4 });
}

function buildLattice(m: Materials, edge: LineBasicMaterial, d: DistrictObject) {
  const b = d.body;
  b.add(block(3.2, 0.12, 3.2, m.stone, edge, 0));
  const tops: Vector3[] = [];
  const node = new SphereGeometry(0.075, 12, 8);
  for (let ix = 0; ix < 3; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      const h = 1.1 + rand(ix * 3 + iz) * 1.9 + (ix === 1 && iz === 1 ? 0.6 : 0);
      const x = (ix - 1) * 1.0;
      const z = (iz - 1) * 1.0;
      const p = block(0.15, h, 0.15, m.stoneLit, edge, 0.12);
      p.position.x = x;
      p.position.z = z;
      b.add(p);
      const top = new Vector3(x, 0.12 + h + 0.08, z);
      tops.push(top);
      const n = new Mesh(node, m.goldGlow);
      n.position.copy(top);
      b.add(n);
    }
  }
  const idx = (x: number, z: number) => x * 3 + z;
  const pairs: [number, number][] = [];
  for (let x = 0; x < 3; x++)
    for (let z = 0; z < 3; z++) {
      if (x < 2) pairs.push([idx(x, z), idx(x + 1, z)]);
      if (z < 2) pairs.push([idx(x, z), idx(x, z + 1)]);
    }
  pairs.push([idx(0, 0), idx(1, 1)], [idx(2, 2), idx(1, 1)], [idx(0, 2), idx(1, 1)], [idx(2, 0), idx(1, 1)]);
  const pos: number[] = [];
  for (const [a, c] of pairs) pos.push(...tops[a].toArray(), ...tops[c].toArray());
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  b.add(new LineSegments(g, edge));
}

const BUILDERS = {
  tower: buildTower,
  colonnade: buildColonnade,
  ring: buildRing,
  vault: buildVault,
  coins: buildCoins,
  lattice: buildLattice,
} as const;

export function buildHQ(m: Materials, opts: { particles: boolean }) {
  const world = new Group();
  const districts: DistrictObject[] = [];

  // Ground, grid and plaza.
  const ground = new Mesh(new PlaneGeometry(160, 160), m.ground);
  ground.rotation.x = -Math.PI / 2;
  world.add(ground);

  const gridPos: number[] = [];
  const span = 36;
  const step = 1.5;
  for (let v = -span; v <= span + 0.001; v += step) {
    gridPos.push(-span, 0.002, v, span, 0.002, v, v, 0.002, -span, v, 0.002, span);
  }
  const gridGeo = new BufferGeometry();
  gridGeo.setAttribute("position", new Float32BufferAttribute(gridPos, 3));
  world.add(new LineSegments(gridGeo, m.grid));

  for (const [r, w] of [
    [8.9, 0.03],
    [9.4, 0.012],
  ] as const) {
    const ring = new Mesh(new RingGeometry(r, r + w, 180), m.path);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    world.add(ring);
  }

  // Districts.
  for (const plan of DISTRICTS) {
    const root = new Group();
    root.position.set(plan.at[0], 0, plan.at[1]);
    const body = new Group();
    root.add(body);
    const edge = createEdgeMaterial();
    const radius = plan.form === "tower" ? 2.4 : 2.3;
    const hit = new Mesh(new CylinderGeometry(radius, radius, plan.anchor, 16), m.hit);
    hit.position.y = plan.anchor / 2;
    hit.userData.district = plan.id;
    root.add(hit);
    const d: DistrictObject = {
      id: plan.id,
      root,
      body,
      hit,
      edge,
      anchor: new Vector3(plan.at[0], plan.anchor, plan.at[1]),
      hover: 0,
      target: 0,
      spin: [],
    };
    BUILDERS[plan.form](m, edge, d);
    // Plan orientation: the Vault's door and the Academy's long side face the plaza's viewer.
    if (plan.form === "colonnade") root.rotation.y = 0.35;
    if (plan.form === "vault") root.rotation.y = 0.5;
    world.add(root);
    districts.push(d);
  }

  // Pathways and the light travelling along them.
  const PULSES = 5;
  const lanes: { from: Vector3; to: Vector3 }[] = [];
  for (const d of districts) {
    if (d.id === "command") continue;
    const from = new Vector3(d.root.position.x, 0.012, d.root.position.z);
    const dir = from.clone().setY(0).normalize();
    const start = from.clone().sub(dir.clone().multiplyScalar(2.3));
    const end = dir.clone().multiplyScalar(2.5).setY(0.012);
    const len = start.distanceTo(end);
    const pathMat = m.path.clone();
    d.path = pathMat;
    const strip = new Mesh(new PlaneGeometry(len, 0.045), pathMat);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = -Math.atan2(end.z - start.z, end.x - start.x);
    strip.position.copy(start.clone().add(end).multiplyScalar(0.5));
    world.add(strip);
    lanes.push({ from: start, to: end });
  }
  const pulseGeo = new BufferGeometry();
  const pulsePos = new Float32Array(lanes.length * PULSES * 3);
  pulseGeo.setAttribute("position", new Float32BufferAttribute(pulsePos, 3));
  const pulses = new Points(pulseGeo, m.pulse);
  world.add(pulses);

  let dust: Points | null = null;
  const DUST = 240;
  if (opts.particles) {
    const pos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      pos[i * 3] = (rand(i * 3) - 0.5) * 34;
      pos[i * 3 + 1] = rand(i * 3 + 1) * 10;
      pos[i * 3 + 2] = (rand(i * 3 + 2) - 0.5) * 30;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    dust = new Points(g, m.dust);
    world.add(dust);
  }

  const tmp = new Vector3();
  function update(t: number, dt: number, motion: number) {
    const k = 1 - Math.exp(-dt * 7);
    for (const d of districts) {
      d.hover += (d.target - d.hover) * k;
      d.body.position.y = d.hover * 0.16;
      d.edge.opacity = 0.42 + d.hover * 0.58;
      d.edge.color.copy(PALETTE.gold).lerp(PALETTE.goldBright, d.hover);
      if (d.path) d.path.opacity = 0.16 + d.hover * 0.6;
      for (const s of d.spin) s.object.rotation[s.axis] += dt * motion * (s.idle + (s.active - s.idle) * d.hover);
    }
    const attr = pulses.geometry.getAttribute("position") as Float32BufferAttribute;
    let n = 0;
    for (let l = 0; l < lanes.length; l++) {
      for (let p = 0; p < PULSES; p++) {
        const f = (((t * 0.09 * motion + p / PULSES + l * 0.137) % 1) + 1) % 1;
        tmp.lerpVectors(lanes[l].from, lanes[l].to, f);
        attr.setXYZ(n++, tmp.x, 0.05, tmp.z);
      }
    }
    attr.needsUpdate = true;
    if (dust) {
      const a = dust.geometry.getAttribute("position") as Float32BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        let y = a.getY(i) + dt * 0.14 * motion;
        if (y > 10) y = 0;
        a.setY(i, y);
      }
      a.needsUpdate = true;
    }
  }

  return { world, districts, update };
}
