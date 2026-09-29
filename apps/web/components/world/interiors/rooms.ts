/**
 * The rooms inside the HQ. One architectural system — polished floor, basalt
 * walls ribbed in brass, coffered ceiling with slots of light — dressed
 * differently for each district, with STATIONS where live exhibits stand.
 *
 * A station is a place in the room (a plinth, an altar, a wall) with an
 * anchor the UI projects a real, interactive panel onto. The room never
 * invents content: stations are sized to the data the host passes in.
 */
import {
  AmbientLight,
  CanvasTexture,
  LatheGeometry,
  SRGBColorSpace,
  Vector2,
  Color,
  CylinderGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  RectAreaLight,
  RingGeometry,
  Scene,
  SpotLight,
  TorusGeometry,
  Vector3,
  type Texture,
} from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import type { Materials } from "../engine/materials";
import type { Bounds } from "../engine/navigation";
import type { DistrictId } from "../architecture/campus";
import { box, boxGeo, cylGeo, mesh, planeGeo, rect, type Collider } from "../architecture/geo";

export type Station = { key: string; anchor: Vector3; stand: Vector3 };
export type Room = {
  id: DistrictId;
  scene: Scene;
  colliders: Collider[];
  bounds: Bounds;
  spawn: { x: number; z: number; yaw: number };
  exit: { x: number; z: number; r: number };
  stations: Station[];
  update?: (t: number, dt: number) => void;
};

const TAU = Math.PI * 2;
let rectLibReady = false;

/** The shell every room shares. W across (x), D deep (−z from the door), H high. */
function shell(m: Materials, env: Texture, W: number, D: number, H: number, floor: "marble" | "oak") {
  if (!rectLibReady) {
    RectAreaLightUniformsLib.init();
    rectLibReady = true;
  }
  const scene = new Scene();
  // Interiors reflect an interior (a neutral studio room), not the sky outside.
  scene.environment = env;
  scene.environmentIntensity = 0.16;
  scene.background = new Color("#050404");
  const g = new Group();
  scene.add(g);
  const cz = -D / 2;
  g.add(mesh(planeGeo(W, D, 3.2), floor === "oak" ? m.oak : m.marbleFloor, 0, 0, cz, { cast: false }));
  // Walls.
  g.add(box(W + 2, H, 1, m.basalt, 0, 0, -D - 0.5, 4));
  g.add(box(W + 2, H, 1, m.basalt, 0, 0, 0.5, 4));
  g.add(box(1, H, D, m.basalt, -W / 2 - 0.5, 0, cz, 4));
  g.add(box(1, H, D, m.basalt, W / 2 + 0.5, 0, cz, 4));
  // Brass ribs on the side walls.
  const ribs = Math.floor(D / 4);
  const rib = new InstancedMesh(boxGeo(0.18, H - 0.6, 0.5, 1), m.brass, ribs * 2);
  const o = new Object3D();
  for (let i = 0; i < ribs; i++) {
    const z = -2 - i * 4;
    for (const [k, x] of [
      [0, -W / 2 + 0.09],
      [1, W / 2 - 0.09],
    ] as const) {
      o.position.set(x, 0, z);
      o.updateMatrix();
      rib.setMatrixAt(i * 2 + k, o.matrix);
    }
  }
  g.add(rib);
  // Skirting in brass, a line of light where the wall meets the floor.
  for (const x of [-W / 2 + 0.01, W / 2 - 0.01]) g.add(box(0.04, 0.06, D, m.goldLightSoft, x, 0.02, cz, 1, { cast: false, receive: false }));
  // Coffered ceiling with light slots.
  g.add(box(W + 2, 1, D + 2, m.concrete, 0, H, cz, 4, { cast: false }));
  const slots = Math.max(2, Math.floor(D / 8));
  for (let i = 0; i < slots; i++) {
    const z = -D / (slots * 2) - (i * D) / slots;
    g.add(box(W * 0.6, 0.05, 0.5, m.whiteLight, 0, H - 0.06, z, 1, { cast: false, receive: false }));
    const area = new RectAreaLight("#ffe7c7", 5, W * 0.6, 0.8);
    area.position.set(0, H - 0.1, z);
    area.lookAt(0, 0, z);
    scene.add(area);
  }
  scene.add(new HemisphereLight("#f3dfc0", "#0a0908", 0.35));
  scene.add(new AmbientLight("#ffffff", 0.04));
  // The door you came through: a lit threshold on the near wall.
  const door = box(4, 6, 0.1, m.goldLightSoft, 0, 0, -0.02, 1, { cast: false, receive: false });
  g.add(door);
  g.add(box(5.2, 0.5, 0.6, m.brassPolished, 0, 6, -0.2, 1));
  return { scene, g, colliders: [] as Collider[] };
}

/** A plinth with a lit top edge, returning the anchor above it. */
function plinth(m: Materials, g: Group, x: number, z: number, w = 1.6, h = 1.1, color = "#ffcf7a") {
  g.add(box(w, h, w, m.basalt, x, 0, z, 2));
  g.add(box(w + 0.04, 0.05, w + 0.04, m.brassPolished, x, h, z, 1));
  const ring = new Mesh(new RingGeometry(w * 0.62, w * 0.66, 64), new MeshStandardMaterial({ color: "#000", emissive: new Color(color), emissiveIntensity: 3 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.012, z);
  g.add(ring);
  return new Vector3(x, h + 1.2, z);
}

function spot(scene: Scene, x: number, z: number, H: number, color = "#ffe2b8", intensity = 260) {
  const s = new SpotLight(color, intensity, H * 2.4, 0.42, 0.6, 2);
  s.position.set(x, H - 0.4, z);
  s.target.position.set(x, 0, z);
  scene.add(s, s.target);
}

const PILLAR: Record<string, string> = { WARRIOR: "#d9735c", BUILDER: "#86a8c6", TYCOON: "#ffcf7a", MIND: "#8fc0a8" };

// ─────────────────────────────────────────────── the six rooms

export function buildRoom(
  id: DistrictId,
  m: Materials,
  sky: Texture,
  opts: { count: number; pillars?: string[]; models?: { sofa: Group | null; chair: Group | null } }
): Room {
  const n = Math.max(1, Math.min(opts.count, 8));
  switch (id) {
    case "command": {
      const W = 22;
      const D = 26;
      const H = 7.5;
      const { scene, g, colliders } = shell(m, sky, W, D, H, "oak");
      // The window wall: the city at dusk, seen from the top of the tower.
      const win = box(W - 2, H - 1.6, 0.1, m.glass, 0, 0.8, -D + 0.02, 4, { cast: false });
      g.add(win);
      const view = new Mesh(planeGeoVertical(W - 2.4, H - 2.2), new MeshStandardMaterial({ color: "#000", emissive: new Color("#ffffff"), emissiveMap: duskView(), emissiveIntensity: 1.1 }));
      view.position.set(0, H / 2, -D + 0.08);
      g.add(view);
      // Window mullions over the view.
      for (let i = 0; i <= 6; i++) g.add(box(0.12, H - 2.2, 0.14, m.bronzeDark, -((W - 2.4) / 2) + (i * (W - 2.4)) / 6, 1.1, -D + 0.16, 1, { cast: false }));
      // Lounge: the two scanned pieces around a marble table.
      const lounge = new Group();
      lounge.position.set(-5, 0, -13);
      lounge.add(box(2.4, 0.42, 1.2, m.marbleWall, 0, 0, 0, 1));
      if (opts.models?.sofa) {
        const sofa = opts.models.sofa.clone();
        sofa.position.set(0, 0, -2.2);
        lounge.add(sofa);
      }
      if (opts.models?.chair) {
        const chair = opts.models.chair.clone();
        chair.position.set(2.4, 0, 1.2);
        chair.rotation.y = -Math.PI * 0.75;
        lounge.add(chair);
      }
      lounge.traverse((c) => ((c as Mesh).castShadow = (c as Mesh).receiveShadow = true));
      g.add(lounge);
      colliders.push(rect(-5, -14, 5, 5));
      spot(scene, -5, -13, H, "#ffdcb0", 180);
      // Stations: the status wall (right), the mission desk (centre), the record (left).
      const stations: Station[] = [];
      g.add(box(0.3, 4.6, 8, m.marbleWall, W / 2 - 0.2, 1.2, -9, 2));
      g.add(box(0.06, 4.8, 8.2, m.brassPolished, W / 2 - 0.4, 1.1, -9, 1));
      stations.push({ key: "status", anchor: new Vector3(W / 2 - 1.2, 3.4, -9), stand: new Vector3(W / 2 - 6, 0, -9) });
      const desk = box(4, 1.05, 1.6, m.oak, 3, 0, -19, 2);
      g.add(desk, box(4.1, 0.06, 1.7, m.brassPolished, 3, 1.05, -19, 1));
      colliders.push(rect(3, -19, 4.4, 2));
      spot(scene, 3, -19, H, "#fff0d6", 240);
      stations.push({ key: "mission", anchor: new Vector3(3, 2.4, -19), stand: new Vector3(3, 0, -15) });
      stations.push({ key: "record", anchor: new Vector3(-W / 2 + 1.2, 3.2, -6), stand: new Vector3(-W / 2 + 6, 0, -6) });
      return finish(id, scene, colliders, W, D, stations);
    }

    case "academy": {
      const W = 20;
      const D = 44;
      const H = 13;
      const { scene, g, colliders } = shell(m, sky, W, D, H, "marble");
      // Shelves of books along both walls, floor to ceiling.
      const shelfGeo = boxGeo(0.5, H - 1.5, 3.6, 2);
      const books = new InstancedMesh(boxGeo(0.34, 0.9, 0.08, 1), new MeshStandardMaterial({ roughness: 0.7 }), 1400);
      const o = new Object3D();
      const color = new Color();
      let b = 0;
      let seed = 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let side = -1; side <= 1; side += 2) {
        for (let bay = 0; bay < 9; bay++) {
          const z = -3.5 - bay * 4.3;
          const shelf = new Mesh(shelfGeo, m.oak);
          shelf.position.set(side * (W / 2 - 0.6), 0, z);
          shelf.receiveShadow = true;
          g.add(shelf);
          for (let row = 0; row < 9 && b < 1400; row++) {
            const y = 0.35 + row * 1.25;
            let zz = z - 1.7;
            while (zz < z + 1.7 && b < 1400) {
              const w = 0.05 + rnd() * 0.05;
              o.position.set(side * (W / 2 - 0.9), y, zz);
              o.scale.set(1, 0.75 + rnd() * 0.35, w / 0.08);
              o.rotation.set(0, 0, (rnd() - 0.5) * 0.06);
              o.updateMatrix();
              books.setMatrixAt(b, o.matrix);
              const hue = [0.02, 0.07, 0.1, 0.58, 0.33][Math.floor(rnd() * 5)];
              color.setHSL(hue, 0.35 + rnd() * 0.2, 0.12 + rnd() * 0.12);
              books.setColorAt(b, color);
              b++;
              zz += w + 0.012;
            }
          }
        }
      }
      books.count = b;
      g.add(books);
      colliders.push(rect(-W / 2 + 0.8, -D / 2, 1.6, D), rect(W / 2 - 0.8, -D / 2, 1.6, D));
      // Altars down the nave, one per program, each lit in its pillar's thread.
      const stations: Station[] = [];
      for (let i = 0; i < n; i++) {
        const z = -8 - i * (28 / Math.max(1, n - 1 || 1));
        const x = i % 2 ? 3.4 : -3.4;
        const c = PILLAR[opts.pillars?.[i] ?? "TYCOON"] ?? "#ffcf7a";
        const anchor = plinth(m, g, x, z, 1.6, 1.05, c);
        const pl = new PointLight(c, 18, 7, 2);
        pl.position.set(x, 1.6, z);
        scene.add(pl);
        colliders.push(rect(x, z, 1.9, 1.9));
        spot(scene, x, z, H, "#ffe9c9", 320);
        stations.push({ key: `program-${i}`, anchor, stand: new Vector3(x + (i % 2 ? -3.2 : 3.2), 0, z) });
      }
      return finish(id, scene, colliders, W, D, stations);
    }

    case "arena": {
      const W = 34;
      const D = 34;
      const H = 12;
      const { scene, g, colliders } = shell(m, sky, W, D, H, "marble");
      // The ring floor and stepped seating around three sides.
      const cz = -D / 2;
      // Stepped seating in a 240° arc, open toward the door you came in by.
      const steps: Vector2[] = [new Vector2(10.5, 0)];
      for (let i = 0; i < 5; i++) steps.push(new Vector2(10.5 + i * 1.1, 0.45 * (i + 1)), new Vector2(10.5 + (i + 1) * 1.1, 0.45 * (i + 1)));
      steps.push(new Vector2(16, 0));
      const tiers = new Mesh(new LatheGeometry(steps, 96, Math.PI / 3, (Math.PI * 4) / 3), m.concrete);
      tiers.position.set(0, 0, cz);
      tiers.receiveShadow = true;
      tiers.castShadow = true;
      g.add(tiers);
      for (let k = 0; k <= 16; k++) {
        const phi = Math.PI / 3 + (k / 16) * ((Math.PI * 4) / 3);
        colliders.push({ kind: "circle", x: Math.sin(phi) * 13, z: cz + Math.cos(phi) * 13, r: 2.8 });
      }
      const ringMat = new MeshStandardMaterial({ color: "#000", emissive: new Color("#ffcf7a"), emissiveIntensity: 3 });
      for (const r of [7.6, 3.6]) {
        const ring = new Mesh(new RingGeometry(r - 0.08, r, 128), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.015, cz);
        g.add(ring);
      }
      spot(scene, 0, cz, H, "#ffffff", 900);
      const stations: Station[] = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * (Math.PI / Math.max(3, n + 1));
        const x = Math.cos(a) * 5.6;
        const z = cz + Math.sin(a) * 5.6 + 1;
        const anchor = plinth(m, g, x, z, 1.2, 0.9);
        colliders.push(rect(x, z, 1.4, 1.4));
        stations.push({ key: `challenge-${i}`, anchor, stand: new Vector3(x * 0.2, 0, cz + 7) });
      }
      stations.push({ key: "streak", anchor: new Vector3(0, 2.2, cz + 9.5), stand: new Vector3(0, 0, cz + 13) });
      return finish(id, scene, colliders, W, D, stations);
    }

    case "vault": {
      const W = 22;
      const D = 36;
      const H = 9;
      const { scene, g, colliders } = shell(m, sky, W, D, H, "marble");
      // The inner vault door on the far wall, open.
      const far = new Group();
      far.position.set(0, 4.2, -D + 0.6);
      far.add(new Mesh(new TorusGeometry(3.4, 0.35, 24, 96), m.brassPolished));
      const seam = new Mesh(new TorusGeometry(3.85, 0.05, 8, 96), m.goldLight);
      far.add(seam);
      g.add(far);
      // Deposit boxes: a wall of brass-fronted drawers either side.
      const drawers = new InstancedMesh(boxGeo(0.12, 0.5, 0.9, 1), m.brass, 480);
      const o = new Object3D();
      let k = 0;
      for (const side of [-1, 1])
        for (let r = 0; r < 12; r++)
          for (let c = 0; c < 20 && k < 480; c++) {
            o.position.set(side * (W / 2 - 0.08), 0.6 + r * 0.56, -3 - c * 1.0);
            o.updateMatrix();
            drawers.setMatrixAt(k++, o.matrix);
          }
      g.add(drawers);
      const stations: Station[] = [];
      const cols = n > 3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = cols === 2 ? (i % 2 ? 3.6 : -3.6) : 0;
        const z = -8 - Math.floor(i / cols) * 7;
        const anchor = plinth(m, g, x, z, 1.5, 1.1);
        colliders.push(rect(x, z, 1.8, 1.8));
        spot(scene, x, z, H, "#fff1dc", 300);
        stations.push({ key: `item-${i}`, anchor, stand: new Vector3(x + (cols === 2 ? (i % 2 ? -3 : 3) : 0), 0, z + 3.2) });
      }
      return finish(id, scene, colliders, W, D, stations);
    }

    case "treasury": {
      const W = 30;
      const D = 30;
      const H = 16;
      const { scene, g, colliders } = shell(m, sky, W, D, H, "marble");
      const cz = -D / 2;
      // The oculus beam falling onto the medallion at the centre.
      const beam = new Mesh(new CylinderGeometry(1.6, 2.4, H, 32, 1, true), m.beam);
      beam.position.set(0, H / 2, cz);
      g.add(beam);
      const coin = new Group();
      coin.position.set(0, 2.2, cz);
      const disc = new Mesh(new CylinderGeometry(1.4, 1.4, 0.22, 96), m.brassPolished);
      disc.rotation.x = Math.PI / 2;
      coin.add(disc, new Mesh(new TorusGeometry(1.4, 0.04, 6, 96), m.goldLight));
      g.add(coin);
      g.add(mesh(cylGeo(1.6, 1.8, 0.9, 64, 1), m.basalt, 0, 0, cz));
      colliders.push({ kind: "circle", x: 0, z: cz, r: 2 });
      spot(scene, 0, cz, H, "#ffe2b8", 1200);
      const stations: Station[] = [];
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i / n) * TAU - Math.PI / 2;
        const x = Math.cos(a) * 9;
        const z = cz + Math.sin(a) * 9;
        const anchor = plinth(m, g, x, z, 1.3, 1);
        colliders.push(rect(x, z, 1.5, 1.5));
        stations.push({ key: `figure-${i}`, anchor, stand: new Vector3(x * 0.55, 0, cz + Math.sin(a) * 9 * 0.55) });
      }
      return finish(id, scene, colliders, W, D, stations, (t, dt) => {
        coin.rotation.y += dt * 0.4;
      });
    }

    case "network": {
      const W = 26;
      const D = 40;
      const H = 11;
      const { scene, g, colliders } = shell(m, sky, W, D, H, "marble");
      const stations: Station[] = [];
      // A hall of seats: the top members, in order, on plinths of rising height.
      for (let i = 0; i < n; i++) {
        const x = i % 2 ? 4.2 : -4.2;
        const z = -8 - Math.floor(i / 2) * 7;
        const h = 1.8 - Math.min(i, 5) * 0.18;
        g.add(box(1.4, h, 1.4, m.basalt, x, 0, z, 2));
        const obel = mesh(cylGeo(0.05, 0.32, 2.2 - i * 0.12, 4, 1), i < 3 ? m.brassPolished : m.bronzeDark, x, h, z);
        g.add(obel);
        colliders.push(rect(x, z, 1.7, 1.7));
        spot(scene, x, z, H, i === 0 ? "#ffd48a" : "#ffeedd", i === 0 ? 420 : 220);
        stations.push({ key: `member-${i}`, anchor: new Vector3(x, h + 2.9, z), stand: new Vector3(x + (i % 2 ? -3.4 : 3.4), 0, z + 1) });
      }
      stations.push({ key: "map", anchor: new Vector3(0, 4.6, -D + 1.2), stand: new Vector3(0, 0, -D + 8) });
      return finish(id, scene, colliders, W, D, stations);
    }
  }
}

/** The view from the top of the tower: dusk over the city, painted once. */
function duskView() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 384;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 384);
  sky.addColorStop(0, "#0d1422");
  sky.addColorStop(0.45, "#3b3346");
  sky.addColorStop(0.72, "#b8664a");
  sky.addColorStop(0.8, "#f0a060");
  sky.addColorStop(1, "#2a1a14");
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 384);
  let seed = 9;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [base, dark, n] of [
    [300, "#1d1a22", 60],
    [320, "#0c0b0e", 44],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const w = 12 + r() * 34;
      const h = 30 + r() * (base === 300 ? 150 : 220);
      const x = r() * 1024;
      g.fillStyle = dark;
      g.fillRect(x, base - h + 64, w, h);
      for (let y = base - h + 70; y < base + 60; y += 6)
        for (let xx = x + 2; xx < x + w - 2; xx += 4)
          if (r() < 0.22) {
            g.fillStyle = `rgba(255,${190 + r() * 50},120,${0.5 + r() * 0.5})`;
            g.fillRect(xx, y, 2, 3);
          }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function planeGeoVertical(w: number, h: number) {
  const p = planeGeo(w, h, 100);
  p.rotateX(Math.PI / 2);
  return p;
}

function finish(
  id: DistrictId,
  scene: Scene,
  colliders: Collider[],
  W: number,
  D: number,
  stations: Station[],
  update?: (t: number, dt: number) => void
): Room {
  return {
    id,
    scene,
    colliders,
    bounds: { minX: -W / 2 + 0.2, maxX: W / 2 - 0.2, minZ: -D + 0.2, maxZ: -0.2 },
    spawn: { x: 0, z: -3, yaw: 0 },
    exit: { x: 0, z: -0.8, r: 1.6 },
    stations,
    update,
  };
}
