"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { rng } from "../hero/system-model";
import { createStage, frameRight, glowTexture, telemetry } from "./engine";

/**
 * Marshal Tower, as a building: a glass tower whose floors are workspaces.
 * Agents (glowing points) work along each floor, ride the central core to hand
 * work to other floors, and exchange data with tools on the ground.
 */

const FLOORS = 22;
const FH = 0.34;
const LABELLED: Record<number, string> = { 21: "L22 · COMMAND", 17: "L18 · PLANNING", 12: "L13 · ANALYSIS", 6: "L7 · RESEARCH", 1: "L2 · OPERATIONS" };

function footprint(f: number) {
  if (f >= 19) return 1.5;
  if (f >= 14) return 1.85;
  return 2.2;
}

export default function TowerScene({ mode = "hero" }: { mode?: "hero" | "card" }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const card = mode === "card";
    const st = createStage(host, { fov: 30, clear: 0x000000, bloom: { strength: card ? 0.6 : 0.75, radius: 0.55, threshold: 0.2 } });
    const { scene, camera, renderer, small } = st;
    const R = rng(23);
    const glow = glowTexture();

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.fog = new THREE.FogExp2(0x000000, 0.045);

    scene.add(new THREE.HemisphereLight(0x8fb3cc, 0x0a0806, 0.5));
    const key = new THREE.DirectionalLight(0xffd7a0, 1.4);
    key.position.set(6, 10, 4);
    scene.add(key);

    const root = new THREE.Group();
    scene.add(root);

    // ---------- ground ----------
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(30, 96),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vP;
          void main(){
            vec2 g = abs(fract(vP*1.0 - 0.5) - 0.5) / max(fwidth(vP*1.0), vec2(1e-4));
            float line = 1.0 - min(min(g.x, g.y), 1.0);
            vec2 g2 = abs(fract(vP*0.2 - 0.5) - 0.5) / max(fwidth(vP*0.2), vec2(1e-4));
            float major = 1.0 - min(min(g2.x, g2.y), 1.0);
            float d = length(vP);
            float fade = smoothstep(16.0, 2.0, d);
            float ring = smoothstep(0.06, 0.0, abs(d - 4.2)) * 0.5 + smoothstep(0.04, 0.0, abs(d - 6.4)) * 0.3;
            vec3 col = vec3(0.45,0.55,0.62) * (line*0.12 + major*0.22) + vec3(0.95,0.7,0.35)*ring;
            gl_FragColor = vec4(col, (line*0.5 + major*0.7 + ring) * fade);
          }`,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    // ---------- tower ----------
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1820, metalness: 0.95, roughness: 0.08, transparent: true, opacity: 0.62, envMapIntensity: 1.4 });
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, metalness: 0.6, roughness: 0.4 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.35 });
    const mullionMat = new THREE.LineBasicMaterial({ color: 0x9fc7dd, transparent: true, opacity: 0.12 });
    const windowMats: THREE.MeshBasicMaterial[] = [];
    const floorActivity: number[] = [];

    for (let f = 0; f < FLOORS; f++) {
      const w = footprint(f);
      const y = f * FH;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.04, w + 0.08), slabMat);
      slab.position.y = y;
      root.add(slab);
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, FH - 0.04, w), glass);
      box.position.y = y + FH / 2;
      root.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), edgeMat);
      edges.position.copy(box.position);
      root.add(edges);
      // mullions
      const m: THREE.Vector3[] = [];
      const n = 8;
      for (let i = 1; i < n; i++) {
        const s = -w / 2 + (i / n) * w;
        for (const [x, z] of [[s, w / 2 + 0.002], [s, -w / 2 - 0.002], [w / 2 + 0.002, s], [-w / 2 - 0.002, s]]) {
          m.push(new THREE.Vector3(x, y + 0.02, z), new THREE.Vector3(x, y + FH - 0.02, z));
        }
      }
      root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(m), mullionMat));
      // interior light band — brightness = how busy the floor is
      const wm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2b45a), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
      windowMats.push(wm);
      floorActivity.push(R());
      const band = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.05, w - 0.12), wm);
      band.position.y = y + FH * 0.55;
      root.add(band);
    }
    const topY = FLOORS * FH;

    // crown + antenna + beacon
    const crown = new THREE.Group();
    crown.position.y = topY + 0.25;
    root.add(crown);
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.008, 8, 160), new THREE.MeshBasicMaterial({ color: 0xf2b45a }));
    crownRing.rotation.x = Math.PI / 2;
    crown.add(crownRing);
    const ticks: THREE.Vector3[] = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const l = i % 6 === 0 ? 0.14 : 0.06;
      ticks.push(new THREE.Vector3(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25), new THREE.Vector3(Math.cos(a) * (1.25 + l), 0, Math.sin(a) * (1.25 + l)));
    }
    crown.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.6 })));
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 1.4, 8), slabMat);
    antenna.position.y = topY + 0.7;
    root.add(antenna);
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff6a4a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    beacon.position.y = topY + 1.42;
    beacon.scale.setScalar(0.5);
    root.add(beacon);

    // central core beam
    const coreBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, topY, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x7cc7e8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    coreBeam.position.y = topY / 2;
    root.add(coreBeam);

    // ---------- agents ----------
    type Agent = { floor: number; target: number; t: number; speed: number; state: "walk" | "ride"; rideFrom: number; color: THREE.Color; sprite: THREE.Sprite; trail: THREE.Vector3[] };
    const palette = [0xf2b45a, 0x7cc7e8, 0x6fd3a8, 0xb9c7ff].map((c) => new THREE.Color(c));
    const agentCount = card ? 14 : small ? 16 : 26;
    const agents: Agent[] = Array.from({ length: agentCount }, (_, i) => {
      const color = palette[i % palette.length];
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      sprite.scale.setScalar(0.32);
      root.add(sprite);
      const floor = Math.floor(R() * FLOORS);
      return { floor, target: floor, t: R(), speed: 0.05 + R() * 0.08, state: "walk", rideFrom: floor, color, sprite, trail: [] };
    });
    const perimeter = (floor: number, t: number, out: THREE.Vector3) => {
      const w = footprint(floor) / 2 - 0.22;
      const frac = ((t % 1) + 1) % 1 || 0;
      const p = frac * 4;
      const side = Math.min(3, Math.max(0, Math.floor(p)));
      const u = p - side;
      const pts = [
        [-w + u * 2 * w, -w],
        [w, -w + u * 2 * w],
        [w - u * 2 * w, w],
        [-w, w - u * 2 * w],
      ][side];
      return out.set(pts[0], floor * FH + FH * 0.5, pts[1]);
    };

    // ---------- ground tools + data links ----------
    const tools: THREE.Vector3[] = [];
    const toolCount = 7;
    for (let i = 0; i < toolCount; i++) {
      const a = (i / toolCount) * Math.PI * 2 + 0.3;
      const r = i % 2 ? 4.2 : 6.4;
      const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      tools.push(p);
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5 + R() * 0.6, 0.16), slabMat);
      pylon.position.set(p.x, pylon.geometry.parameters.height / 2, p.z);
      root.add(pylon);
      const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: palette[i % palette.length], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
      tip.position.set(p.x, pylon.geometry.parameters.height + 0.05, p.z);
      tip.scale.setScalar(0.35);
      root.add(tip);
      p.y = pylon.geometry.parameters.height + 0.05;
    }
    const links = tools.map((p, i) => {
      const floor = 2 + ((i * 5) % (FLOORS - 4));
      const end = new THREE.Vector3(0, floor * FH + FH / 2, 0).add(p.clone().setY(0).normalize().multiplyScalar(footprint(floor) / 2));
      const mid = p.clone().lerp(end, 0.5);
      mid.y += 1.4;
      return new THREE.QuadraticBezierCurve3(p.clone(), mid, end);
    });
    links.forEach((c, i) => {
      root.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(c.getPoints(48)),
          new THREE.LineBasicMaterial({ color: palette[i % palette.length], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
        ),
      );
    });
    const pkN = 40;
    const pkPos = new Float32Array(pkN * 3);
    const pkCol = new Float32Array(pkN * 3);
    const pkGeo = new THREE.BufferGeometry();
    pkGeo.setAttribute("position", new THREE.BufferAttribute(pkPos, 3));
    pkGeo.setAttribute("color", new THREE.BufferAttribute(pkCol, 3));
    root.add(new THREE.Points(pkGeo, new THREE.PointsMaterial({ size: 0.18, map: glow, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    const pk = Array.from({ length: pkN }, (_, i) => ({ link: i % links.length, t: R(), s: 0.15 + R() * 0.25, dir: i % 3 === 0 ? -1 : 1 }));

    // core elevator packets
    const elN = 24;
    const elPos = new Float32Array(elN * 3);
    const elGeo = new THREE.BufferGeometry();
    elGeo.setAttribute("position", new THREE.BufferAttribute(elPos, 3));
    root.add(new THREE.Points(elGeo, new THREE.PointsMaterial({ size: 0.16, map: glow, color: 0x9fdcf5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    const el = Array.from({ length: elN }, () => ({ y: R() * topY, v: (R() < 0.5 ? -1 : 1) * (0.6 + R() * 1.2) }));

    // dust
    const dN = card ? 300 : 900;
    const dPos = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) {
      const r = 2 + R() * 12, a = R() * Math.PI * 2;
      dPos.set([Math.cos(a) * r, R() * 10, Math.sin(a) * r], i * 3);
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.04, map: glow, color: 0x9fb6c8, transparent: true, opacity: 0.5, depthWrite: false }));
    root.add(dust);

    root.position.y = -topY * 0.5;

    // ---------- camera + controls ----------
    const controls = new OrbitControls(camera, st.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = !card;
    controls.zoomToCursor = false;
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.48;
    controls.autoRotate = true;
    controls.autoRotateSpeed = card ? 0.9 : 0.55;
    controls.enabled = !card;
    camera.position.set(11, 1.2, 14);
    controls.target.set(0, 0.9, 0);
    st.renderer.domElement.style.touchAction = card ? "auto" : "pan-y";
    // Zoom only with a modifier so the page keeps scrolling normally.
    const onWheel = (e: WheelEvent) => {
      controls.enableZoom = !card && (e.ctrlKey || e.metaKey);
    };
    st.renderer.domElement.addEventListener("wheel", onWheel, { capture: true, passive: true });
    st.onResize((w, h) => {
      const portrait = h > w;
      const side = !card && frameRight(camera, w, h, 0.7);
      const d = card ? 17 : portrait ? 26 : side ? 20 : 19;
      camera.position.setLength(d);
    });

    // ---------- labels ----------
    const labelEls: { el: HTMLDivElement; floor: number }[] = [];
    if (!card && !small && labelsRef.current) {
      for (const [f, text] of Object.entries(LABELLED)) {
        const d = document.createElement("div");
        d.className = "core-label";
        d.innerHTML = `<i style="background:#f2b45a"></i>${text}`;
        labelsRef.current.appendChild(d);
        labelEls.push({ el: d, floor: +f });
      }
    }

    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    st.start((dt, t) => {
      telemetry.frames++;
      controls.update();
      crown.rotation.y = t * 0.25;
      (beacon.material as THREE.SpriteMaterial).opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 3.2));

      // floor activity breathes; agents light their floor
      const occupancy = new Array(FLOORS).fill(0);
      agents.forEach((a) => a.state === "walk" && occupancy[a.floor]++);
      windowMats.forEach((m, f) => {
        const target = 0.05 + Math.min(0.6, occupancy[f] * 0.22) + 0.06 * Math.sin(t * 1.3 + floorActivity[f] * 6);
        m.opacity += (target - m.opacity) * 0.05;
      });

      agents.forEach((a) => {
        if (a.state === "walk") {
          a.t += dt * a.speed;
          perimeter(a.floor, a.t, tmp);
          if (Math.random() < dt * 0.08) {
            a.state = "ride";
            a.rideFrom = a.floor;
            a.target = Math.floor(Math.random() * FLOORS);
            a.t = 0;
          }
          a.sprite.position.copy(tmp);
        } else {
          a.t += dt * 0.6;
          const from = a.rideFrom * FH + FH * 0.5;
          const to = a.target * FH + FH * 0.5;
          const u = Math.min(1, a.t);
          const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          a.sprite.position.lerp(tmp.set(0, from + (to - from) * e, 0), 0.25);
          if (u >= 1) {
            a.state = "walk";
            a.floor = a.target;
            a.t = Math.random();
          }
        }
        a.sprite.scale.setScalar(a.state === "ride" ? 0.42 : 0.3);
      });

      pk.forEach((p, i) => {
        p.t += dt * p.s;
        if (p.t > 1) p.t -= 1;
        links[p.link].getPoint(p.dir > 0 ? p.t : 1 - p.t, tmp2);
        pkPos.set([tmp2.x, tmp2.y, tmp2.z], i * 3);
        const c = palette[p.link % palette.length];
        pkCol.set([c.r * 1.6, c.g * 1.6, c.b * 1.6], i * 3);
      });
      pkGeo.attributes.position.needsUpdate = true;
      pkGeo.attributes.color.needsUpdate = true;

      el.forEach((p, i) => {
        p.y += p.v * dt;
        if (p.y > topY) p.y = 0;
        if (p.y < 0) p.y = topY;
        elPos.set([0, p.y, 0], i * 3);
      });
      elGeo.attributes.position.needsUpdate = true;
      dust.rotation.y = t * 0.01;

      // labels
      if (labelEls.length) {
        const { w, h } = st.size;
        root.updateMatrixWorld();
        labelEls.forEach(({ el: lab, floor }) => {
          const fw = footprint(floor) / 2;
          tmp.set(fw, floor * FH + FH / 2, fw);
          root.localToWorld(tmp);
          tmp.project(camera);
          lab.style.transform = `translate3d(${(tmp.x * 0.5 + 0.5) * w + 10}px, ${(-tmp.y * 0.5 + 0.5) * h - 6}px, 0)`;
          lab.style.opacity = "0.9";
        });
      }
    });

    return () => {
      st.renderer.domElement.removeEventListener("wheel", onWheel, { capture: true });
      controls.dispose();
      env.dispose();
      pmrem.dispose();
      glow.dispose();
      labelEls.forEach((l) => l.el.remove());
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
