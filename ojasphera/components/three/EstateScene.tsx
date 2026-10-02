"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { rng } from "../hero/system-model";
import { createStage, frameRight, glowTexture, telemetry } from "./engine";

/**
 * Emerald Haven as a place: procedural terrain with plantation blocks, a green
 * belt, a river valley, roads, site buildings and equipment points — the same
 * zones as the interactive map, now standing on real ground. Layout illustrative.
 */

const SIZE = 40;
const ISLAND = 18.5;

/** Seeded 2D value-noise fbm — deterministic terrain on every device. */
function makeNoise(seed: number) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i).sort(() => r() - 0.5);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = Array.from({ length: 256 }, () => r() * 2 - 1);
  const fade = (t: number) => t * t * (3 - 2 * t);
  const v = (x: number, y: number) => vals[perm[(x & 255) + perm[y & 255]]];
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    const u = fade(xf), w = fade(yf);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  return (x: number, y: number) => {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let o = 0; o < 5; o++) {
      s += noise(x * f, y * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return s / norm;
  };
}

type Zone = { name: string; kind: "plantation" | "belt" | "dev"; poly: [number, number][] };
const ZONES: Zone[] = [
  { name: "PLANTATION BLOCK A", kind: "plantation", poly: [[-14, -12], [-4, -13], [-3, -4], [-13, -3]] },
  { name: "PLANTATION BLOCK B", kind: "plantation", poly: [[1, -14], [11, -12], [10, -5], [2, -5]] },
  { name: "PLANTATION BLOCK C", kind: "plantation", poly: [[-13, 3], [-5, 2], [-4, 11], [-12, 12]] },
  { name: "GREEN BELT", kind: "belt", poly: [[12, -10], [17, -9], [17, 6], [12, 5]] },
  { name: "DEVELOPMENT ZONE", kind: "dev", poly: [[3, 3], [10, 3], [10, 10], [3, 10]] },
];

function inPoly(x: number, z: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export default function EstateScene({ mode = "hero" }: { mode?: "hero" | "card" }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const card = mode === "card";
    const st = createStage(host, { fov: 32, clear: 0x000000, bloom: { strength: 0.5, radius: 0.5, threshold: 0.7 } });
    const { scene, camera, renderer, small } = st;
    const R = rng(91);
    const glow = glowTexture();
    const fbm = makeNoise(5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.fog = new THREE.Fog(0x020304, 45, 110);

    // Golden-hour light
    scene.add(new THREE.HemisphereLight(0x9cc4d8, 0x1b2a14, 0.55));
    const sun = new THREE.DirectionalLight(0xffc98a, 2.6);
    sun.position.set(-18, 14, -10);
    scene.add(sun);
    const shadows = !small && !card;
    if (shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      sun.castShadow = true;
      sun.shadow.mapSize.set(1536, 1536);
      const c = sun.shadow.camera as THREE.OrthographicCamera;
      c.left = -24; c.right = 24; c.top = 24; c.bottom = -24; c.near = 1; c.far = 80;
      sun.shadow.bias = -0.0008;
    }

    // Sky dome: dusk gradient
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vP; void main(){
          float h = vP.y;
          vec3 top = vec3(0.0,0.0,0.0);
          vec3 hor = vec3(0.035,0.03,0.025);
          vec3 sunDir = normalize(vec3(-0.75,0.25,-0.45));
          float s = pow(max(dot(normalize(vP), sunDir), 0.0), 18.0);
          vec3 col = mix(hor, top, smoothstep(-0.05, 0.45, h)) + vec3(1.0,0.62,0.3)*s*0.12;
          gl_FragColor = vec4(col, 1.0);
        }`,
      }),
    );
    scene.add(sky);

    const root = new THREE.Group();
    scene.add(root);

    // ---------- terrain ----------
    const seg = card ? 100 : small ? 130 : 180;
    const WATER = -0.55;
    const heightAt = (x: number, z: number) => {
      let h = fbm(x * 0.06 + 3, z * 0.06 - 7) * 3.2 + fbm(x * 0.18, z * 0.18) * 0.4;
      // a river valley winding through the estate
      const rx = Math.sin(z * 0.12) * 4 - 1;
      const d = Math.abs(x - rx);
      h -= Math.max(0, 1 - d / 3.2) * 2.2;
      // flatten the development zone a little
      if (inPoly(x, z, ZONES[4].poly)) h = h * 0.4 + 0.25;
      const edge = Math.hypot(x, z) / ISLAND;
      if (edge > 1) return -4;
      return h - Math.pow(Math.max(0, edge - 0.82) * 5.5, 2) * 1.2;
    };
    const tgeo = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg);
    tgeo.rotateX(-Math.PI / 2);
    const tp = tgeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(tp.count * 3);
    const cLow = new THREE.Color("#5b5236"), cGrass = new THREE.Color("#2c4a2b"), cHigh = new THREE.Color("#4b6a37"), cRock = new THREE.Color("#5d6150");
    const tmpC = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i);
      const h = heightAt(x, z);
      tp.setY(i, h);
      if (Math.hypot(x, z) > ISLAND) tmpC.setRGB(0, 0, 0); // beyond the plinth: invisible
      else if (h < WATER + 0.25) tmpC.copy(cLow);
      else if (h < 1.0) tmpC.copy(cGrass).lerp(cHigh, (h - WATER) / 2);
      else tmpC.copy(cHigh).lerp(cRock, Math.min(1, (h - 1) / 1.6));
      tmpC.offsetHSL(0, 0, (fbm(x * 0.9, z * 0.9) * 0.04));
      colors.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    }
    tgeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    tgeo.computeVertexNormals();
    const terrain = new THREE.Mesh(tgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
    terrain.receiveShadow = shadows;
    root.add(terrain);

    // contour lines — the surveyor's view
    const contour = new THREE.Mesh(
      tgeo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        vertexShader: `varying float vY; varying vec3 vW; void main(){ vY = position.y; vW = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying float vY; varying vec3 vW; void main(){
          // max() guards flat ground, where fwidth is 0 and 0/0 would emit NaN (bloom spreads NaN to the whole frame).
          float f = abs(fract(vY*2.5) - 0.5) / max(fwidth(vY*2.5), 1e-4);
          float l = 1.0 - min(f, 1.0);
          float fade = smoothstep(18.0, 12.0, length(vW.xz));
          gl_FragColor = vec4(vec3(0.75,0.95,0.8), l*0.13*fade);
        }`,
      }),
    );
    root.add(contour);

    // water
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(ISLAND, 128).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x164453, metalness: 0.85, roughness: 0.1, transparent: true, opacity: 0.9, envMapIntensity: 1.6 }),
    );
    water.position.y = WATER;
    root.add(water);

    // the plinth — presented like an architect's model
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(ISLAND + 0.05, ISLAND + 0.4, 2.4, 160, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0d10, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }),
    );
    plinth.position.y = WATER - 1.2;
    root.add(plinth);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(ISLAND + 0.06, 0.025, 8, 256), new THREE.MeshBasicMaterial({ color: 0xf2b45a }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = WATER + 0.02;
    root.add(rim);
    const rimTicks: THREE.Vector3[] = [];
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const l = i % 15 === 0 ? 0.9 : 0.3;
      rimTicks.push(new THREE.Vector3(Math.cos(a) * (ISLAND + 0.1), WATER - 0.05, Math.sin(a) * (ISLAND + 0.1)), new THREE.Vector3(Math.cos(a) * (ISLAND + 0.1), WATER - 0.05 - l, Math.sin(a) * (ISLAND + 0.1)));
    }
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rimTicks), new THREE.LineBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.35 })));

    // ---------- vegetation ----------
    const treeGeo = new THREE.ConeGeometry(0.16, 0.5, 6);
    treeGeo.translate(0, 0.25, 0);
    const crownGeo = new THREE.IcosahedronGeometry(0.2, 0);
    crownGeo.translate(0, 0.32, 0);
    const maxTrees = card ? 1600 : small ? 2200 : 4200;
    const rows = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x3f7a3c, roughness: 0.8, flatShading: true }), maxTrees);
    const forest = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x1f4a2a, roughness: 0.85, flatShading: true }), Math.floor(maxTrees * 0.6));
    rows.castShadow = forest.castShadow = shadows;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
    const col = new THREE.Color();
    let nRows = 0;
    for (const zone of ZONES.filter((z) => z.kind === "plantation")) {
      for (let x = -16; x <= 16; x += 0.55) {
        for (let z = -16; z <= 16; z += 0.42) {
          if (nRows >= maxTrees) break;
          // rows follow the slope a little: offset alternate rows
          const zz = z + (Math.round(x / 0.55) % 2 ? 0.21 : 0);
          if (!inPoly(x, zz, zone.poly)) continue;
          const h = heightAt(x, zz);
          if (h < WATER + 0.15) continue;
          const sc = 0.75 + R() * 0.45;
          m4.compose(p3.set(x, h, zz), q.setFromAxisAngle(s3.set(0, 1, 0), R() * 6), s3.set(sc, sc, sc));
          rows.setMatrixAt(nRows, m4);
          rows.setColorAt(nRows, col.setHSL(0.28 + R() * 0.05, 0.45, 0.28 + R() * 0.1));
          nRows++;
        }
      }
    }
    rows.count = nRows;
    let nForest = 0;
    const forestMax = forest.count;
    for (let i = 0; i < forestMax * 3 && nForest < forestMax; i++) {
      const x = -SIZE / 2 + R() * SIZE, z = -SIZE / 2 + R() * SIZE;
      if (Math.hypot(x, z) > ISLAND - 0.6) continue;
      const inBelt = inPoly(x, z, ZONES[3].poly);
      const wild = !ZONES.some((zn) => inPoly(x, z, zn.poly)) && R() < 0.25;
      if (!inBelt && !wild) continue;
      const h = heightAt(x, z);
      if (h < WATER + 0.2) continue;
      const sc = 0.8 + R() * 0.9;
      m4.compose(p3.set(x, h, z), q.identity(), s3.set(sc, sc * (1 + R() * 0.5), sc));
      forest.setMatrixAt(nForest, m4);
      forest.setColorAt(nForest, col.setHSL(0.36 + R() * 0.05, 0.4, 0.15 + R() * 0.08));
      nForest++;
    }
    forest.count = nForest;
    root.add(rows, forest);

    // ---------- roads with path lights ----------
    const roadPts = [
      [-20, 1], [-12, 0.5], [-6, -0.5], [0, 0.5], [6, 1.5], [12, 0.5], [20, 1],
    ].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const roadCurve = new THREE.CatmullRomCurve3(roadPts);
    const spurCurve = new THREE.CatmullRomCurve3([[4, 1.4], [5, 4], [6.5, 6.5], [8, 8]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const lightsPos: number[] = [];
    for (const curve of [roadCurve, spurCurve]) {
      const pts = curve.getPoints(160).map((p) => p.setY(Math.max(heightAt(p.x, p.z), WATER + 0.12) + 0.05));
      const c2 = new THREE.CatmullRomCurve3(pts);
      const road = new THREE.Mesh(new THREE.TubeGeometry(c2, 300, 0.09, 6, false), new THREE.MeshStandardMaterial({ color: 0x8d8a80, roughness: 0.7 }));
      road.receiveShadow = shadows;
      root.add(road);
      for (let i = 0; i <= 40; i++) {
        const p = c2.getPoint(i / 40);
        lightsPos.push(p.x, p.y + 0.12, p.z);
      }
    }
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute("position", new THREE.Float32BufferAttribute(lightsPos, 3));
    const pathLights = new THREE.Points(lgeo, new THREE.PointsMaterial({ size: 0.28, map: glow, color: 0xffc27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    root.add(pathLights);

    // ---------- buildings (development zone) ----------
    const bMat = new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.6, metalness: 0.15 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffc98a });
    const buildings: [number, number, number, number, number][] = [
      [5, 5, 1.6, 0.6, 1.0], [7.6, 5.2, 1.0, 0.9, 1.0], [5.2, 7.8, 1.2, 0.5, 1.6], [8.4, 8.2, 0.9, 1.3, 0.9], [6.6, 6.6, 0.6, 0.4, 0.6],
    ];
    buildings.forEach(([x, z, w, hgt, d]) => {
      const y = heightAt(x, z);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), bMat);
      b.position.set(x, y + hgt / 2, z);
      b.castShadow = b.receiveShadow = shadows;
      root.add(b);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.05, d + 0.01), winMat);
      strip.position.set(x, y + hgt * 0.62, z);
      root.add(strip);
    });

    // ---------- zone boundaries draped on the ground ----------
    const zoneColor = { plantation: 0x6fd3a8, belt: 0x3fa877, dev: 0xf2b45a } as const;
    const zoneCenters: { name: string; p: THREE.Vector3 }[] = [];
    ZONES.forEach((z) => {
      const pts: THREE.Vector3[] = [];
      const loop = [...z.poly, z.poly[0]];
      for (let i = 0; i < loop.length - 1; i++) {
        const [ax, az] = loop[i], [bx, bz] = loop[i + 1];
        for (let k = 0; k <= 24; k++) {
          const x = ax + ((bx - ax) * k) / 24, zz = az + ((bz - az) * k) / 24;
          pts.push(new THREE.Vector3(x, Math.max(heightAt(x, zz), WATER) + 0.06, zz));
        }
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: zoneColor[z.kind], dashSize: 0.4, gapSize: 0.25, transparent: true, opacity: 0.9 }));
      line.computeLineDistances();
      root.add(line);
      const cx = z.poly.reduce((s, p) => s + p[0], 0) / z.poly.length;
      const cz = z.poly.reduce((s, p) => s + p[1], 0) / z.poly.length;
      zoneCenters.push({ name: z.name, p: new THREE.Vector3(cx, heightAt(cx, cz) + 1.6, cz) });
    });

    // ---------- equipment beacons ----------
    const beaconSpots: [number, number, string][] = [[-9, -8, "IRRIGATION UNIT"], [6, -9, "MONITORING POINT"], [-1, 2.2, "PUMP STATION"], [9, 4, "MACHINERY STORE"]];
    const beacons = beaconSpots.map(([x, z, name]) => {
      const y = Math.max(heightAt(x, z), WATER);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.6 }));
      pole.position.set(x, y + 0.6, z);
      root.add(pole);
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xf2b45a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.position.set(x, y + 1.25, z);
      g.scale.setScalar(0.5);
      root.add(g);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 48), new THREE.MeshBasicMaterial({ color: 0xf2b45a, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, y + 0.05, z);
      root.add(ring);
      return { sprite: g, ring, name, top: new THREE.Vector3(x, y + 1.25, z) };
    });

    // fireflies / pollen drifting above the estate
    const fN = card ? 200 : 500;
    const fPos = new Float32Array(fN * 3);
    for (let i = 0; i < fN; i++) fPos.set([-18 + R() * 36, 0.5 + R() * 4, -18 + R() * 36], i * 3);
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));
    const flies = new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 0.07, map: glow, color: 0xfff1c9, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    root.add(flies);

    // ---------- camera + controls ----------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 16;
    controls.maxDistance = 70;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.25;
    controls.autoRotate = true;
    controls.autoRotateSpeed = card ? 0.7 : 0.35;
    controls.enabled = !card;
    camera.position.set(-22, 15, 24);
    controls.target.set(0, -0.5, 0);
    renderer.domElement.style.touchAction = card ? "auto" : "pan-y";
    const onWheel = (e: WheelEvent) => {
      controls.enableZoom = !card && (e.ctrlKey || e.metaKey);
    };
    renderer.domElement.addEventListener("wheel", onWheel, { capture: true, passive: true });
    st.onResize((w, h) => {
      const side = !card && frameRight(camera, w, h, 0.66);
      camera.position.setLength(card ? 50 : h > w ? 74 : side ? 56 : 54);
    });

    // ---------- labels ----------
    const labels: { el: HTMLDivElement; p: THREE.Vector3; color: string }[] = [];
    if (!card && !small && labelsRef.current) {
      zoneCenters.forEach((z) => labels.push({ el: document.createElement("div"), p: z.p, color: z.name.startsWith("DEV") ? "#f2b45a" : "#6fd3a8" }));
      beacons.forEach((b) => labels.push({ el: document.createElement("div"), p: b.top, color: "#f2b45a" }));
      const names = [...zoneCenters.map((z) => z.name), ...beacons.map((b) => b.name)];
      labels.forEach((l, i) => {
        l.el.className = "core-label";
        l.el.innerHTML = `<i style="background:${l.color}"></i>${names[i]}`;
        labelsRef.current!.appendChild(l.el);
      });
    }

    const tmp = new THREE.Vector3();
    st.start((dt, t) => {
      telemetry.frames++;
      controls.update();
      beacons.forEach((b, i) => {
        const k = (t * 0.6 + i * 0.25) % 1;
        b.ring.scale.setScalar(1 + k * 5);
        (b.ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.7;
        b.sprite.scale.setScalar(0.45 + Math.sin(t * 2 + i) * 0.08);
      });
      flies.rotation.y = t * 0.01;
      flies.position.y = Math.sin(t * 0.5) * 0.15;
      if (labels.length) {
        const { w, h } = st.size;
        labels.forEach((l) => {
          tmp.copy(l.p).project(camera);
          const vis = tmp.z < 1;
          l.el.style.transform = `translate3d(${(tmp.x * 0.5 + 0.5) * w + 8}px, ${(-tmp.y * 0.5 + 0.5) * h - 6}px, 0)`;
          l.el.style.opacity = vis ? "0.9" : "0";
        });
      }
    });

    return () => {
      renderer.domElement.removeEventListener("wheel", onWheel, { capture: true });
      controls.dispose();
      env.dispose();
      pmrem.dispose();
      glow.dispose();
      labels.forEach((l) => l.el.remove());
      st.dispose();
    };
  }, [mode]);

  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />
    </div>
  );
}
