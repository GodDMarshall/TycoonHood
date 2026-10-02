"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { CORE, EDGES, STAGE_COLOR, rng, type CoreId } from "../hero/system-model";
import { NOISE_GLSL, createStage, glowTexture, telemetry } from "./engine";

/**
 * The Ojasphera Core — the hero's WebGL scene.
 * A living sphere (the system) with the eight parts of every Ojasphera build
 * orbiting it on three rings, connected by arcs that carry data packets.
 * Hover a node to see what it does; click it (or a chip) to send a signal
 * through everything it connects to. Drag to spin the whole system.
 */

type Props = {
  selected: CoreId | null;
  pulseKey: number;
  onFocus: (id: CoreId | null) => void;
  onStage: (stage: number | null) => void;
};

const RINGS = [
  { r: 2.45, tilt: [0.35, 0, 0.18], speed: 0.11 },
  { r: 3.0, tilt: [-0.22, 0, -0.32], speed: -0.07 },
  { r: 3.55, tilt: [0.12, 0, 0.42], speed: 0.05 },
];
/** Which ring and where on it each node lives. */
const PLACEMENT: Record<CoreId, { ring: number; angle: number }> = {
  AI: { ring: 0, angle: 0.4 },
  AGENTS: { ring: 0, angle: 3.6 },
  DATA: { ring: 1, angle: 2.2 },
  SYSTEMS: { ring: 1, angle: 4.4 },
  AUTOMATION: { ring: 1, angle: 0.3 },
  BUSINESS: { ring: 2, angle: 2.9 },
  PROJECTS: { ring: 2, angle: 1.5 },
  EXPERIENCE: { ring: 2, angle: 5.3 },
};

const idx = new Map(CORE.map((c, i) => [c.id, i]));
const edgeIdx = EDGES.map(([a, b]) => [idx.get(a)!, idx.get(b)!] as const);
const SEG = 28;

export default function CoreScene({ selected, pulseKey, onFocus, onStage }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const cb = useRef({ onFocus, onStage });
  const selectedRef = useRef(selected);
  const fireRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    cb.current = { onFocus, onStage };
  }, [onFocus, onStage]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    if (pulseKey > 0) fireRef.current(selectedRef.current ? idx.get(selectedRef.current)! : 0);
  }, [pulseKey]);

  useEffect(() => {
    const host = hostRef.current!;
    const st = createStage(host, { fov: 32, clear: 0x000000, bloom: { strength: 0.7, radius: 0.5, threshold: 0.22 } });
    const { scene, camera, small, reduced } = st;
    const glow = glowTexture();
    const R = rng(11);

    const world = new THREE.Group();
    scene.add(world);
    const system = new THREE.Group(); // spins with drag
    world.add(system);

    // ---------- the core ----------
    const coreUniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uA: { value: new THREE.Color("#7cc7e8") },
      uB: { value: new THREE.Color("#f2b45a") },
    };
    const coreMat = new THREE.ShaderMaterial({
      uniforms: coreUniforms,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uPulse;
        varying vec3 vN; varying vec3 vV; varying float vNoise; varying vec3 vObj;
        ${NOISE_GLSL}
        void main(){
          float n = snoise(position*0.85 + vec3(uTime*0.18));
          float n2 = snoise(position*2.4 - vec3(uTime*0.12));
          vNoise = n*0.7 + n2*0.3;
          vec3 p = position + normal * (vNoise*0.11 + uPulse*0.12);
          vObj = p;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          vV = -mv.xyz; vN = normalize(normalMatrix*normal);
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uPulse; uniform vec3 uA; uniform vec3 uB;
        varying vec3 vN; varying vec3 vV; varying float vNoise; varying vec3 vObj;
        void main(){
          vec3 n = normalize(vN); vec3 v = normalize(vV);
          float fres = pow(1.0 - max(dot(n,v),0.0), 3.2);
          vec3 deep = mix(vec3(0.012,0.018,0.026), vec3(0.03,0.07,0.1), vNoise*0.5+0.5);
          vec3 rim = mix(uA, uB, smoothstep(-0.35,0.65,vNoise));
          float bands = smoothstep(0.46,0.5,abs(fract(vObj.y*5.5 + uTime*0.06)-0.5));
          float merid = smoothstep(0.485,0.5,abs(fract(atan(vObj.z,vObj.x)*3.8197 - uTime*0.03)-0.5));
          vec3 col = deep + rim*fres*1.05 + rim*(bands*0.32 + merid*0.16)*(0.25+fres)
                   + uB*uPulse*0.6*(0.4+fres);
          gl_FragColor = vec4(col,1.0);
        }`,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, small ? 48 : 96), coreMat);
    system.add(core);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.45, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: { uPulse: coreUniforms.uPulse },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform float uPulse; varying vec3 vN; varying vec3 vV; void main(){ float d=abs(dot(normalize(vN),normalize(vV))); float i=pow(d,5.0)*(0.55+uPulse*0.9); gl_FragColor=vec4(vec3(0.49,0.78,0.91)*i,i); }`,
      }),
    );
    halo.scale.setScalar(1.22);
    system.add(halo);

    const cage = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.95, 1)),
      new THREE.LineBasicMaterial({ color: 0x9fb6c8, transparent: true, opacity: 0.09 }),
    );
    system.add(cage);

    // Shockwave for pulses
    const shock = new THREE.Mesh(
      new THREE.RingGeometry(0.98, 1, 128),
      new THREE.MeshBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    world.add(shock);

    // ---------- orbit rings + nodes ----------
    const ringGroups: THREE.Group[] = [];
    RINGS.forEach((rg) => {
      const g = new THREE.Group();
      g.rotation.set(rg.tilt[0], rg.tilt[1], rg.tilt[2]);
      const pts = new THREE.EllipseCurve(0, 0, rg.r, rg.r, 0, Math.PI * 2).getPoints(256).map((p) => new THREE.Vector3(p.x, 0, p.y));
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x8aa0b4, transparent: true, opacity: 0.22 }),
      );
      g.add(line);
      // tick marks around the ring — engineered, not decorative
      const ticks: THREE.Vector3[] = [];
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const len = i % 8 === 0 ? 0.09 : 0.035;
        ticks.push(new THREE.Vector3(Math.cos(a) * rg.r, 0, Math.sin(a) * rg.r), new THREE.Vector3(Math.cos(a) * (rg.r + len), 0, Math.sin(a) * (rg.r + len)));
      }
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0x8aa0b4, transparent: true, opacity: 0.18 })));
      system.add(g);
      ringGroups.push(g);
    });

    type NodeObj = { anchor: THREE.Object3D; dot: THREE.Mesh; aura: THREE.Sprite; hit: THREE.Mesh; color: THREE.Color; heat: number; hover: number };
    const nodes: NodeObj[] = CORE.map((c) => {
      const pl = PLACEMENT[c.id];
      const ring = RINGS[pl.ring];
      const anchor = new THREE.Object3D();
      anchor.position.set(Math.cos(pl.angle) * ring.r, 0, Math.sin(pl.angle) * ring.r);
      ringGroups[pl.ring].add(anchor);
      const color = new THREE.Color(STAGE_COLOR[c.stage]);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 24), new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.6) }));
      anchor.add(dot);
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.162, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
      );
      anchor.add(ringMesh);
      ringMesh.userData.billboard = true;
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      aura.scale.setScalar(0.7);
      anchor.add(aura);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      anchor.add(hit);
      return { anchor, dot, aura, hit, color, heat: 0, hover: 0 };
    });
    const billboards: THREE.Object3D[] = [];
    scene.traverse((o) => o.userData.billboard && billboards.push(o));

    // ---------- arcs between nodes (updated each frame) ----------
    const arcPos = new Float32Array(edgeIdx.length * SEG * 2 * 3);
    const arcCol = new Float32Array(edgeIdx.length * SEG * 2 * 3);
    const arcGeo = new THREE.BufferGeometry();
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
    arcGeo.setAttribute("color", new THREE.BufferAttribute(arcCol, 3));
    const arcs = new THREE.LineSegments(arcGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    world.add(arcs);

    // spokes from each node down to the core surface
    const spokePos = new Float32Array(nodes.length * 2 * 3);
    const spokeGeo = new THREE.BufferGeometry();
    spokeGeo.setAttribute("position", new THREE.BufferAttribute(spokePos, 3));
    world.add(new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ color: 0x7cc7e8, transparent: true, opacity: 0.07, depthWrite: false })));

    // ---------- packets ----------
    const MAXP = 160;
    const pkPos = new Float32Array(MAXP * 3);
    const pkCol = new Float32Array(MAXP * 3);
    const pkGeo = new THREE.BufferGeometry();
    pkGeo.setAttribute("position", new THREE.BufferAttribute(pkPos, 3));
    pkGeo.setAttribute("color", new THREE.BufferAttribute(pkCol, 3));
    const packetsMesh = new THREE.Points(
      pkGeo,
      new THREE.PointsMaterial({ size: 0.16, map: glow, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
    );
    world.add(packetsMesh);
    type Packet = { e: number; t: number; s: number };
    const packets: Packet[] = [];

    // ---------- accretion disk + star field ----------
    const diskN = small ? 900 : 2200;
    const dPos = new Float32Array(diskN * 3);
    const dCol = new Float32Array(diskN * 3);
    const cA = new THREE.Color("#7cc7e8"), cB = new THREE.Color("#f2b45a"), cC = new THREE.Color("#eceef1");
    for (let i = 0; i < diskN; i++) {
      const r = 1.9 + Math.pow(R(), 1.6) * 2.6;
      const a = R() * Math.PI * 2;
      dPos[i * 3] = Math.cos(a) * r;
      dPos[i * 3 + 1] = (R() - 0.5) * 0.06 * r;
      dPos[i * 3 + 2] = Math.sin(a) * r;
      const c = R() < 0.12 ? cB : R() < 0.5 ? cA : cC;
      const k = 0.25 + R() * 0.5;
      dCol[i * 3] = c.r * k; dCol[i * 3 + 1] = c.g * k; dCol[i * 3 + 2] = c.b * k;
    }
    const diskGeo = new THREE.BufferGeometry();
    diskGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    diskGeo.setAttribute("color", new THREE.BufferAttribute(dCol, 3));
    const disk = new THREE.Points(diskGeo, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, map: glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    disk.rotation.set(1.22, 0, 0.22);
    system.add(disk);

    const starN = small ? 1200 : 3200;
    const sPos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const r = 9 + R() * 30;
      const th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1);
      sPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      sPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      sPos[i * 3 + 2] = r * Math.cos(ph) - 10;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.06, color: 0xb9c7d6, map: glow, transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(stars);

    // ---------- labels (HTML, projected each frame) ----------
    const labelHost = labelsRef.current!;
    const labelEls = CORE.map((c) => {
      const el = document.createElement("div");
      el.className = "core-label";
      el.innerHTML = `<i style="background:${STAGE_COLOR[c.stage]}"></i>${c.id}`;
      labelHost.appendChild(el);
      return el;
    });

    // ---------- layout: sit beside the copy on wide screens ----------
    let baseZ = 12;
    st.onResize((w, h) => {
      const portrait = h > w * 1.1;
      const side = w >= 1280 && !portrait;
      const need = 8.4;
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const aspect = side ? Math.min(w * 0.6, 900) / h : w / h;
      baseZ = need / (2 * tanHalf * Math.min(1, aspect)) * (side ? 1.02 : 1.05);
      if (side) {
        const cw = Math.min(w, 1440);
        const cx = (w - cw) / 2 + cw * 0.69;
        camera.setViewOffset(w, h, -(cx - w / 2), 0, w, h);
      } else camera.clearViewOffset();
    });

    // ---------- interaction ----------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -1e4, py: -1e4, inside: false };
    const drag = { on: false, moved: 0, lx: 0, vel: 0.06, yaw: 0 };
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hover = -1;
    let reported = -2;

    const pulse = { start: -1, depth: [] as number[] };
    let pulseFlash = 0;
    let shockT = 1;
    let clock = 0;
    const outgoing = CORE.map((_, i) => edgeIdx.map((e, k) => (e[0] === i ? k : -1)).filter((k) => k >= 0));
    const fire = (from: number) => {
      const depth = CORE.map(() => -1);
      depth[from] = 0;
      const q = [from];
      while (q.length) {
        const n = q.shift()!;
        for (const k of outgoing[n]) {
          const to = edgeIdx[k][1];
          if (depth[to] < 0 && !(n === idx.get("EXPERIENCE") && to === idx.get("BUSINESS") && from !== n)) {
            depth[to] = depth[n] + 1;
            q.push(to);
          }
        }
      }
      pulse.start = clock;
      pulse.depth = depth;
      pulseFlash = 1;
      shockT = 0;
      telemetry.pulses++;
      edgeIdx.forEach(([a, b], k) => {
        if (depth[a] >= 0 && depth[b] === depth[a] + 1) for (let j = 0; j < 3; j++) packets.push({ e: k, t: -depth[a] * 0.75 - j * 0.07, s: 1.05 });
      });
      if (reduced) st.renderOnce();
    };
    fireRef.current = fire;

    const el = st.renderer.domElement;
    el.style.touchAction = "pan-y";
    const toLocal = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.px = e.clientX - r.left;
      pointer.py = e.clientY - r.top;
      pointer.tx = (pointer.px / r.width - 0.5) * 2;
      pointer.ty = (pointer.py / r.height - 0.5) * 2;
      ndc.set((pointer.px / r.width) * 2 - 1, -(pointer.py / r.height) * 2 + 1);
    };
    const onMove = (e: PointerEvent) => {
      toLocal(e);
      pointer.inside = true;
      telemetry.interactions++;
      if (drag.on && e.pointerType === "mouse") {
        const dx = e.clientX - drag.lx;
        drag.lx = e.clientX;
        drag.moved += Math.abs(dx);
        drag.vel = dx * 0.006;
      }
      if (reduced) st.renderOnce();
    };
    const onDown = (e: PointerEvent) => {
      toLocal(e);
      drag.on = true;
      drag.moved = 0;
      drag.lx = e.clientX;
    };
    const onUp = () => {
      if (drag.on && drag.moved < 6 && hover >= 0) fire(hover);
      drag.on = false;
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.tx = pointer.ty = 0;
      drag.on = false;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);

    // ---------- loop ----------
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpM = new THREE.Vector3();
    const nodePos = CORE.map(() => new THREE.Vector3());
    let spawn = 0;
    let intro = reduced ? 1 : 0;
    const proj = new THREE.Vector3();

    const arcPoint = (a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) => {
      tmpM.addVectors(a, b).multiplyScalar(0.5);
      const lift = tmpM.length() + 0.55 + a.distanceTo(b) * 0.18;
      tmpC.copy(tmpM).normalize().multiplyScalar(lift);
      const u = 1 - t;
      return out.set(
        u * u * a.x + 2 * u * t * tmpC.x + t * t * b.x,
        u * u * a.y + 2 * u * t * tmpC.y + t * t * b.y,
        u * u * a.z + 2 * u * t * tmpC.z + t * t * b.z,
      );
    };

    st.start((dt, t) => {
      clock = t;
      telemetry.frames++;
      intro = Math.min(1, intro + dt * 0.55);
      const ei = 1 - Math.pow(1 - intro, 3);

      // scroll-driven camera
      const rect = host.getBoundingClientRect();
      const sp = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      camera.position.set(pointer.x * 0.6, -pointer.y * 0.35 + sp * 1.4, baseZ * (1.35 - 0.35 * ei) - sp * 2.2);
      camera.lookAt(0, sp * 0.6, 0);

      // drag inertia + idle spin
      if (!drag.on) drag.vel += (0.0012 - drag.vel) * 0.03;
      drag.yaw += drag.vel * (dt * 60);
      system.rotation.y = drag.yaw;
      system.rotation.x = 0.18 + pointer.y * 0.12;
      system.scale.setScalar(0.6 + 0.4 * ei);

      coreUniforms.uTime.value = t;
      pulseFlash *= Math.pow(0.08, dt);
      coreUniforms.uPulse.value = pulseFlash;
      cage.rotation.y = -t * 0.05;
      cage.rotation.x = t * 0.03;
      disk.rotation.z = 0.22 + t * 0.02;
      stars.rotation.y = t * 0.004;
      ringGroups.forEach((g, i) => (g.rotation.y = t * RINGS[i].speed));

      // shockwave
      shockT = Math.min(1, shockT + dt * 0.7);
      shock.scale.setScalar(1.5 + shockT * 4.5);
      (shock.material as THREE.MeshBasicMaterial).opacity = (1 - shockT) * 0.5;
      shock.quaternion.copy(camera.quaternion);

      // nodes
      world.updateMatrixWorld();
      nodes.forEach((n, i) => n.anchor.getWorldPosition(nodePos[i]));
      billboards.forEach((b) => b.quaternion.copy(camera.quaternion).premultiply(b.parent!.getWorldQuaternion(new THREE.Quaternion()).invert()));

      // hover via raycast
      hover = -1;
      if (pointer.inside && !drag.on) {
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(nodes.map((n) => n.hit), false);
        if (hits.length) hover = nodes.findIndex((n) => n.hit === hits[0].object);
      }
      el.style.cursor = hover >= 0 ? "pointer" : drag.on ? "grabbing" : "grab";
      const sel = selectedRef.current ? idx.get(selectedRef.current)! : -1;
      const focus = hover >= 0 ? hover : sel;
      if (focus !== reported) {
        reported = focus;
        cb.current.onFocus(focus >= 0 ? CORE[focus].id : null);
      }

      // pulse heat + stage readout
      const pt = pulse.start >= 0 ? (t - pulse.start) / 0.75 : -1;
      let stage: number | null = null;
      nodes.forEach((n, i) => {
        const d = pulse.depth[i] ?? -1;
        const h = pt >= 0 && d >= 0 && pt >= d ? Math.max(0, 1 - (pt - d) / 2.2) : 0;
        n.heat = h;
        if (pt >= 0 && d >= 0 && pt >= d && pt < 8) stage = Math.max(stage ?? 0, CORE[i].stage);
        n.hover += ((i === focus ? 1 : 0) - n.hover) * 0.15;
        const s = 1 + n.hover * 0.8 + h * 1.2;
        n.dot.scale.setScalar(s);
        n.aura.scale.setScalar(0.7 + n.hover * 0.9 + h * 1.6);
        (n.aura.material as THREE.SpriteMaterial).opacity = 0.45 + n.hover * 0.4 + h * 0.5;
      });
      if (pt > 8) pulse.start = -1;
      cb.current.onStage(stage);

      // arcs
      edgeIdx.forEach(([a, b], k) => {
        const touches = a === focus || b === focus;
        const ha = Math.max(nodes[a].heat, nodes[b].heat);
        const ca = nodes[a].color;
        const base = k === edgeIdx.length - 1 ? 0.12 : 0.32;
        const inten = base + (touches ? 0.55 : 0) + ha * 0.7;
        for (let s = 0; s < SEG; s++) {
          arcPoint(nodePos[a], nodePos[b], s / SEG, tmpA);
          arcPoint(nodePos[a], nodePos[b], (s + 1) / SEG, tmpB);
          const o = (k * SEG + s) * 6;
          arcPos.set([tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z], o);
          const fade = 0.55 + 0.45 * Math.sin((s / SEG) * Math.PI);
          const v = inten * fade;
          arcCol.set([ca.r * v, ca.g * v, ca.b * v, ca.r * v, ca.g * v, ca.b * v], o);
        }
      });
      arcGeo.attributes.position.needsUpdate = true;
      arcGeo.attributes.color.needsUpdate = true;

      nodes.forEach((_, i) => {
        tmpA.copy(nodePos[i]).normalize().multiplyScalar(1.55);
        spokePos.set([nodePos[i].x, nodePos[i].y, nodePos[i].z, tmpA.x, tmpA.y, tmpA.z], i * 6);
      });
      spokeGeo.attributes.position.needsUpdate = true;

      // ambient traffic: the system is always working
      spawn += dt;
      const rate = focus >= 0 ? 0.06 : 0.14;
      while (spawn > rate) {
        spawn -= rate;
        if (packets.length >= MAXP) break;
        let k: number;
        if (focus >= 0 && Math.random() < 0.7) {
          const touching = edgeIdx.map((e, j) => (e[0] === focus || e[1] === focus ? j : -1)).filter((j) => j >= 0);
          k = touching[(Math.random() * touching.length) | 0];
        } else k = (Math.random() * (edgeIdx.length - 1)) | 0;
        packets.push({ e: k, t: 0, s: 0.3 + Math.random() * 0.35 });
      }
      let n = 0;
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += dt * p.s;
        if (p.t > 1) {
          packets.splice(i, 1);
          continue;
        }
        if (p.t < 0 || n >= MAXP) continue;
        const [a, b] = edgeIdx[p.e];
        arcPoint(nodePos[a], nodePos[b], p.t, tmpA);
        pkPos.set([tmpA.x, tmpA.y, tmpA.z], n * 3);
        const c = nodes[a].color;
        const k2 = p.s > 1 ? 2.2 : 1.3;
        pkCol.set([c.r * k2, c.g * k2, c.b * k2], n * 3);
        n++;
      }
      pkGeo.setDrawRange(0, n);
      pkGeo.attributes.position.needsUpdate = true;
      pkGeo.attributes.color.needsUpdate = true;

      // labels
      const { w, h } = st.size;
      CORE.forEach((c, i) => {
        proj.copy(nodePos[i]).project(camera);
        const x = (proj.x * 0.5 + 0.5) * w;
        const y = (-proj.y * 0.5 + 0.5) * h;
        const behind = nodePos[i].clone().applyMatrix4(camera.matrixWorldInverse).z < -baseZ - 0.4;
        const lab = labelEls[i];
        lab.style.transform = `translate3d(${x + 14}px, ${y - 7}px, 0)`;
        lab.style.opacity = String((behind ? 0.32 : 0.92) * ei);
        lab.classList.toggle("is-on", i === focus || nodes[i].heat > 0.2);
      });
    });

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      labelEls.forEach((l) => l.remove());
      glow.dispose();
      st.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />
    </div>
  );
}
