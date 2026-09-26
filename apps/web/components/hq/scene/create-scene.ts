/**
 * Assembles the HQ: renderer, scene, camera rig, lighting, materials,
 * objects, interaction and the performance governor — and owns the loop.
 *
 * Framework-free on purpose. React decides whether this runs at all and
 * hosts the DOM overlay; everything per-frame stays here and never causes
 * a React render. Returns a small controller the host talks to.
 */
import {
  ACESFilmicToneMapping,
  FogExp2,
  PMREMGenerator,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Mesh,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { DistrictId } from "../districts";
import { createCameraRig } from "./camera";
import { addLighting } from "./lighting";
import { PALETTE, createMaterials } from "./materials";
import { buildHQ } from "./objects";
import { FrameGovernor, type Tier } from "./performance";

export type Projection = { id: DistrictId; x: number; y: number; visible: boolean };

export type SceneOptions = {
  tier: Exclude<Tier, "static">;
  onHover: (id: DistrictId | null) => void;
  onSelect: (id: DistrictId) => void;
  onProject: (points: Projection[]) => void;
  onReady: () => void;
  onFallback: (reason: string) => void;
  /** 0 at the top of the hero, 1 once it has scrolled away. */
  getScroll: () => number;
};

export function createHQScene(container: HTMLElement, opts: SceneOptions) {
  const renderer = new WebGLRenderer({
    antialias: opts.tier === "full",
    alpha: true,
    powerPreference: "high-performance",
  });
  let dpr = Math.min(window.devicePixelRatio || 1, opts.tier === "full" ? 2 : 1);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(PALETTE.ground, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;outline:none";
  container.appendChild(canvas);

  const scene = new Scene();
  scene.fog = new FogExp2(PALETTE.ground, 0.028);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.32;

  const rig = createCameraRig();
  addLighting(scene);
  const materials = createMaterials();
  const hq = buildHQ(materials, { particles: opts.tier === "full" });
  scene.add(hq.world);

  // ── Interaction ──────────────────────────────────────────────────
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hits: Mesh[] = hq.districts.map((d) => d.hit);
  let pointerInside = false;
  let hovered: DistrictId | null = null;
  let highlighted: DistrictId | null = null;

  const setTargets = () => {
    const lit = hovered ?? highlighted;
    for (const d of hq.districts) d.target = d.id === lit ? 1 : 0;
  };

  function pick() {
    if (!pointerInside) return null;
    raycaster.setFromCamera(ndc, rig.camera);
    const hit = raycaster.intersectObjects(hits, false)[0];
    return (hit?.object.userData.district as DistrictId | undefined) ?? null;
  }

  const onMove = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    pointerInside = true;
    rig.setPointer(ndc.x, ndc.y);
  };
  const onLeave = () => {
    pointerInside = false;
    rig.setPointer(0, 0);
  };
  const onClick = () => {
    const id = pick();
    if (id) opts.onSelect(id);
  };
  container.addEventListener("pointermove", onMove);
  container.addEventListener("pointerleave", onLeave);
  container.addEventListener("click", onClick);

  // ── Size ─────────────────────────────────────────────────────────
  let width = 1;
  let height = 1;
  const resize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    renderer.setSize(width, height, false);
    rig.resize(width, height);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ── Visibility: never render what nobody can see ─────────────────
  let onScreen = true;
  const io = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting), { threshold: 0 });
  io.observe(container);

  let disposed = false;
  let failed = false;
  const fail = (reason: string) => {
    if (failed) return;
    failed = true;
    opts.onFallback(reason);
  };
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fail("context-lost");
  });

  const governor = new FrameGovernor(
    () => {
      dpr = 1;
      renderer.setPixelRatio(1);
      resize();
    },
    () => fail("slow-gpu")
  );

  // ── Loop ─────────────────────────────────────────────────────────
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const projected: Projection[] = hq.districts.map((d) => ({
    id: d.id,
    x: 0,
    y: 0,
    visible: false,
  }));
  const v = new Vector3();
  let last = performance.now();
  let t = 0;
  let frames = 0;
  let raf = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dtMs = now - last;
    last = now;
    if (!onScreen || document.hidden) return;
    const dt = Math.min(dtMs, 50) / 1000;
    const motion = reduced.matches ? 0 : 1;
    t += dt;

    const next = pick();
    if (next !== hovered) {
      hovered = next;
      container.style.cursor = next ? "pointer" : "";
      setTargets();
      opts.onHover(next);
    }

    rig.update(t, dt, Math.min(1, Math.max(0, opts.getScroll())), motion);
    hq.update(t, dt, motion);
    renderer.render(scene, rig.camera);

    // Project label anchors to container pixels (the overlay is DOM).
    for (let i = 0; i < hq.districts.length; i++) {
      v.copy(hq.districts[i].anchor).project(rig.camera);
      const p = projected[i];
      p.x = (v.x * 0.5 + 0.5) * width;
      p.y = (-v.y * 0.5 + 0.5) * height;
      p.visible = v.z < 1 && p.x > -40 && p.x < width + 40 && p.y > -40 && p.y < height + 40;
    }
    opts.onProject(projected);

    frames++;
    if (frames === 2) opts.onReady();
    if (frames > 20) governor.sample(dtMs);
  };
  raf = requestAnimationFrame(frame);

  return {
    /** Light a district from outside the canvas (keyboard focus on a label). */
    setHighlight(id: DistrictId | null) {
      highlighted = id;
      setTargets();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      container.removeEventListener("click", onClick);
      scene.traverse((o) => {
        const mesh = o as Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

export type HQController = ReturnType<typeof createHQScene>;
