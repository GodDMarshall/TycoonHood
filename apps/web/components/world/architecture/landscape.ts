/**
 * The grounds. A formal landscape — the kind that surrounds a serious
 * institution: a stone promenade from the gate to the medallion, clipped
 * hedge parterres in basalt planters, columnar clipped trees, bronze lanterns
 * that actually light the path, oak benches. Geometric on purpose: clipped
 * box and yew are geometry in the real world too.
 *
 * Everything here is instanced, and returns its colliders so you walk
 * around planters, not through them.
 */
import { Color, Group, InstancedMesh, MeshStandardMaterial, Object3D, PointLight, SphereGeometry, type Texture } from "three";
import type { Materials } from "../engine/materials";
import { box, boxGeo, cylGeo, planeGeo, mesh, rect, type Collider } from "./geo";

export function buildLandscape(m: Materials, hedge: MeshStandardMaterial, lights: number) {
  const g = new Group();
  const colliders: Collider[] = [];
  const o = new Object3D();

  // Promenade: a paler honed-stone runner from the south gate to the medallion.
  g.add(mesh(planeGeo(9, 56, 3), m.concrete, 0, 0.612, 46, { cast: false }));
  // Brushed, not polished: a mirror-polished edge reflects the teal sky
  // through brass's gold tint and reads as a strip of green ice.
  for (const x of [-4.55, 4.55]) g.add(box(0.1, 0.02, 56, m.brass, x, 0.6, 46, 1, { cast: false }));

  // Parterres: planters flanking the promenade and ringing the medallion.
  const planters: [number, number, number, number][] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) planters.push([side * 11, 66 - i * 12, 7, 9]);
    planters.push([side * 22, 18, 9, 9], [side * 22, -14, 9, 9]);
  }
  const basin = new InstancedMesh(boxGeo(1, 1, 1, 1), m.basalt, planters.length);
  const top = new InstancedMesh(boxGeo(1, 1, 1, 1.2), hedge, planters.length);
  const lip = new InstancedMesh(boxGeo(1, 1, 1, 1), m.brass, planters.length);
  planters.forEach(([x, z, w, d], i) => {
    o.position.set(x, 0.6, z);
    o.rotation.set(0, 0, 0);
    o.scale.set(w, 0.7, d);
    o.updateMatrix();
    basin.setMatrixAt(i, o.matrix);
    o.position.set(x, 1.3, z);
    o.scale.set(w - 0.5, 0.55, d - 0.5);
    o.updateMatrix();
    top.setMatrixAt(i, o.matrix);
    o.position.set(x, 1.29, z);
    o.scale.set(w + 0.06, 0.03, d + 0.06);
    o.updateMatrix();
    lip.setMatrixAt(i, o.matrix);
    colliders.push(rect(x, z, w, d));
  });
  for (const im of [basin, top]) {
    im.castShadow = true;
    im.receiveShadow = true;
  }
  g.add(basin, top, lip);

  // Columnar clipped trees in the planters: trunk hidden, a tall rounded column.
  const trees: [number, number, number][] = [];
  planters.forEach(([x, z, w], i) => {
    const h = 5 + ((i * 37) % 4);
    if (w < 8) trees.push([x + (i % 2 ? 1.6 : -1.6), z, h]);
    else trees.push([x, z, h + 2]);
  });
  const trunkGeo = cylGeo(0.62, 0.78, 1, 20, 1.2);
  const capGeo = new SphereGeometry(0.62, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const cols = new InstancedMesh(trunkGeo, hedge, trees.length);
  const caps = new InstancedMesh(capGeo, hedge, trees.length);
  trees.forEach(([x, z, h], i) => {
    o.position.set(x, 1.8, z);
    o.scale.set(1, h, 1);
    o.updateMatrix();
    cols.setMatrixAt(i, o.matrix);
    o.position.set(x, 1.8 + h, z);
    o.scale.set(1, 1.4, 1);
    o.updateMatrix();
    caps.setMatrixAt(i, o.matrix);
  });
  cols.castShadow = caps.castShadow = true;
  cols.receiveShadow = true;
  g.add(cols, caps);

  // Lanterns along the promenade and around the medallion.
  const lamps: [number, number][] = [];
  for (let z = 70; z >= 22; z -= 8) lamps.push([-6.2, z], [6.2, z]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    lamps.push([Math.cos(a) * 15, Math.sin(a) * 15]);
  }
  const posts = new InstancedMesh(cylGeo(0.07, 0.1, 4.4, 10, 1), m.bronzeDark, lamps.length);
  const heads = new InstancedMesh(boxGeo(0.24, 0.42, 0.24, 1), m.goldLight, lamps.length);
  const hats = new InstancedMesh(boxGeo(0.4, 0.06, 0.4, 1), m.bronzeDark, lamps.length);
  lamps.forEach(([x, z], i) => {
    o.scale.set(1, 1, 1);
    o.position.set(x, 0.6, z);
    o.updateMatrix();
    posts.setMatrixAt(i, o.matrix);
    o.position.set(x, 4.98, z);
    o.updateMatrix();
    heads.setMatrixAt(i, o.matrix);
    o.position.set(x, 5.4, z);
    o.updateMatrix();
    hats.setMatrixAt(i, o.matrix);
  });
  posts.castShadow = true;
  g.add(posts, heads, hats);
  // Real light from the lanterns nearest the gate — where you arrive.
  for (let i = 0; i < Math.min(lights, 6); i++) {
    const [x, z] = lamps[i];
    const pl = new PointLight(new Color("#ffc27a"), 30, 16, 2);
    pl.position.set(x, 4.7, z);
    g.add(pl);
  }

  // Oak benches facing the promenade.
  for (let z = 62; z >= 30; z -= 16) {
    for (const x of [-6.8, 6.8]) {
      g.add(box(0.6, 0.42, 2.6, m.basalt, x, 0.6, z, 1));
      g.add(box(0.7, 0.08, 2.8, m.oak, x, 1.02, z, 1));
      colliders.push(rect(x, z, 0.8, 2.8));
    }
  }
  return { group: g, colliders };
}

export function hedgeMaterial(sets: { map: Texture; roughnessMap: Texture; normalMap: Texture }) {
  return new MeshStandardMaterial({ ...sets, roughness: 1, color: "#ffffff" });
}

