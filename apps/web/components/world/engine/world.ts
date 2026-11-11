/**
 * THE WORLD: renderer, post-processing, the campus, the rooms, the walk.
 *
 * Framework-free. The React host (world-host.tsx) owns data and UI; this
 * owns pixels and physics, and talks back through a handful of callbacks.
 * Nothing per-frame ever causes a React render: projected anchors are
 * written to DOM nodes the host registered.
 *
 * Loaded only by world-host.tsx, with import(), once the device and GPU
 * gates have passed (DR-30). dispose() releases everything, down to the GL
 * context, so a switch to 2D leaves nothing running.
 */
import {
  AdditiveBlending,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HalfFloatType,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  type Material,
  type MeshStandardMaterial,
  NoToneMapping,
  Object3D,
  MathUtils,
  PCFShadowMap,
  PMREMGenerator,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  type Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D as O3D,
} from "three";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";
import { N8AOPostPass } from "n8ao";
import type { BuildingId } from "@tycoonhood/core/src/world/state";
import { disposeAssets, type WorldAssets } from "./assets";
import { createMaterials, disposeMaterials, type Materials } from "./materials";
import { Navigator } from "./navigation";
import { FrameGovernor, QUALITY, stepDown, type Tier } from "./quality";
import {
  buildCommunity,
  buildCourses,
  buildLeaderboard,
  buildMining,
  buildPathways,
  buildPlaza,
  buildSkyline,
  buildStore,
  buildToday,
  poolBounds,
  type Building,
} from "../architecture/campus";
import { mesh, planeGeo, rect, type Collider } from "../architecture/geo";
import { buildLandscape } from "../architecture/landscape";
import { buildRoom, type Room, type RoomData } from "../interiors/rooms";

export type { RoomData };
export type Space = "exterior" | BuildingId;
export type Projected = { key: string; x: number; y: number; visible: boolean; dist: number };
export type Prompt = { kind: "enter"; id: BuildingId } | { kind: "exit"; id: BuildingId } | null;

export type WorldHandlers = {
  onSpace: (space: Space) => void;
  onPrompt: (p: Prompt) => void;
  onHover: (key: string | null) => void;
  onFocus: (key: string | null) => void;
  onProject: (points: Projected[]) => void;
  onPose: (x: number, z: number, yaw: number) => void;
  onFade: (dark: boolean) => void;
  onQuality: (q: Tier) => void;
  /** Frames stayed slow at the lowest tier: the host switches to 2D. */
  onSlow: () => void;
  onFatal: (reason: "context-lost") => void;
};

const EXTERIOR_BOUNDS = { minX: -88, maxX: 88, minZ: -96, maxZ: 80 };

export class World {
  private renderer: WebGLRenderer;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private aoPass: InstanceType<typeof N8AOPostPass> | null = null;
  private bloom: BloomEffect;
  readonly nav: Navigator;
  private m: Materials;
  private exterior = new Scene();
  private buildings: Building[] = [];
  private landColliders: Collider[] = [];
  private rooms = new Map<BuildingId, Room>();
  private roomData = new Map<BuildingId, RoomData>();
  private presence = new Group();
  private space: Space = "exterior";
  private quality: Tier;
  private governor: FrameGovernor;
  private raycaster = new Raycaster();
  private ndc = new Vector2();
  private hitTargets: O3D[] = [];
  private raf = 0;
  private last = performance.now();
  private t = 0;
  private width = 1;
  private height = 1;
  private ro: ResizeObserver;
  private disposed = false;
  private prompt: Prompt = null;
  private focus: string | null = null;
  private hover: string | null = null;
  private exitArmed = false;
  private transitioning = false;
  private poseClock = 0;
  private shadowFrames = 0;
  private water: Water | null = null;
  private stillPool: Mesh | null = null;
  private floorMirror: Reflector | null = null;
  private sun: DirectionalLight | null = null;
  private skyEnv: Texture | null = null;
  private roomEnv: Texture | null = null;
  /** The campus's own materials: shared by every space, released last. */
  private shared: Set<Material>;
  private down: { x: number; y: number; moved: boolean; id: number } | null = null;
  private touches = new Map<number, { x: number; y: number }>();
  private cleanup: (() => void)[] = [];
  private timers = new Set<number>();

  constructor(
    private container: HTMLElement,
    private assets: WorldAssets,
    quality: Tier,
    private h: WorldHandlers
  ) {
    this.quality = quality;
    const q = QUALITY[quality];

    this.renderer = new WebGLRenderer({ antialias: false, stencil: false, depth: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMappingExposure = 0.72;
    this.renderer.shadowMap.autoUpdate = false;
    const canvas = this.renderer.domElement;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    this.nav = new Navigator(1);
    this.m = createMaterials(assets);
    this.shared = new Set(Object.values(this.m) as Material[]);
    this.buildExterior(q);
    bindEnvironment(this.exterior);

    this.composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType });
    this.renderPass = new RenderPass(this.exterior, this.nav.camera);
    this.composer.addPass(this.renderPass);
    if (q.ao) {
      this.aoPass = new N8AOPostPass(this.exterior, this.nav.camera, 1, 1);
      this.aoPass.configuration.aoRadius = 2.2;
      this.aoPass.configuration.distanceFalloff = 1.2;
      this.aoPass.configuration.intensity = 2.6;
      this.aoPass.configuration.halfRes = q.aoHalf;
      this.aoPass.configuration.gammaCorrection = false;
      this.composer.addPass(this.aoPass);
    }
    this.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, intensity: 0.85, radius: 0.72 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.62 });
    const smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });
    this.composer.addPass(new EffectPass(this.nav.camera, this.bloom, tone, vignette, smaa));

    // Slow frames step the tier down; slow at the lowest tier means 2D.
    this.governor = new FrameGovernor(() => {
      const next = stepDown(this.quality);
      if (next) this.setQuality(next);
      else this.h.onSlow();
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.bindInput(canvas);
    const onLost = (e: Event) => {
      e.preventDefault();
      if (!this.disposed) this.h.onFatal("context-lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    this.cleanup.push(() => canvas.removeEventListener("webglcontextlost", onLost));

    this.nav.setSpace(this.exteriorColliders(), EXTERIOR_BOUNDS, 0.6);
    this.nav.place(0, 72, 0, 0.02);
    // QA only: start at a viewpoint, /world?cam=x,z,yawDeg[,pitchDeg].
    const cam = new URLSearchParams(window.location.search).get("cam")?.split(",").map(Number);
    if (cam && cam.length >= 3 && cam.every(Number.isFinite)) this.nav.place(cam[0], cam[1], MathUtils.degToRad(cam[2]), MathUtils.degToRad(cam[3] ?? 1));
    this.raf = requestAnimationFrame(this.frame);
  }

  /** A timeout that never fires after dispose(). */
  private later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(id);
  }

  // ─────────────────────────────────────────── construction

  private buildExterior(q: (typeof QUALITY)[Tier]) {
    const s = this.exterior;
    const a = this.assets;
    // Dusk. A physical sky with the sun a few degrees above the western
    // horizon; the same sky, prefiltered, lights and reflects everything.
    const sunDir = new Vector3().setFromSphericalCoords(1, MathUtils.degToRad(90 - 4.5), MathUtils.degToRad(-118));
    const sky = new Sky();
    sky.scale.setScalar(2000);
    const u = sky.material.uniforms;
    u.turbidity.value = 5;
    u.rayleigh.value = 2.4;
    u.mieCoefficient.value = 0.0042;
    u.mieDirectionalG.value = 0.86;
    u.sunPosition.value.copy(sunDir);
    if (u.cloudCoverage) {
      u.cloudCoverage.value = 0.32;
      u.cloudDensity.value = 0.35;
    }
    const envScene = new Scene();
    const envSky = new Sky();
    envSky.scale.setScalar(1000);
    envSky.material.uniforms = sky.material.uniforms;
    envScene.add(envSky);
    const pmrem = new PMREMGenerator(this.renderer);
    this.skyEnv = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
    s.add(sky);
    s.environment = this.skyEnv;
    s.environmentIntensity = 1.0;
    s.fog = new FogExp2(new Color("#3a2f38"), 0.00115);

    const sun = new DirectionalLight("#ffb67a", 2.6);
    sun.position.copy(sunDir).multiplyScalar(260);
    sun.target.position.set(0, 0, -12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    const sc = sun.shadow.camera;
    sc.left = -120;
    sc.right = 120;
    sc.top = 120;
    sc.bottom = -120;
    sc.near = 20;
    sc.far = 520;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    sun.shadow.radius = 4;
    s.add(sun, sun.target);
    this.sun = sun;
    s.add(new HemisphereLight("#8fa6c8", "#1b1410", 0.28));

    s.add(buildPlaza(this.m));
    const land = buildLandscape(this.m, this.m.hedge, q.shadow >= 2048 ? 6 : 2);
    s.add(land.group);
    this.landColliders = land.colliders;
    this.buildings = [buildToday(this.m), buildCourses(this.m), buildCommunity(this.m), buildLeaderboard(this.m), buildMining(this.m), buildStore(this.m)];
    for (const b of this.buildings) {
      b.group.userData.building = b.id;
      b.group.traverse((o) => (o.userData.building = b.id));
      s.add(b.group);
      this.hitTargets.push(b.group);
    }
    s.add(buildPathways(this.m, this.buildings.map((b) => b.entrance)));

    // The reflecting pool.
    const p = poolBounds();
    s.add(mesh(planeGeo(p.w + 2.4, p.d + 2.4, 2), this.m.basalt, p.cx, 0.62, p.cz, { cast: false }));
    if (q.reflections) {
      const water = new Water(new PlaneGeometry(p.w, p.d), {
        textureWidth: 1024,
        textureHeight: 1024,
        waterNormals: a.waterNormals,
        sunDirection: sunDir.clone(),
        sunColor: 0xffd9a8,
        waterColor: 0x05070a,
        distortionScale: 0.9,
        fog: true,
      });
      water.rotation.x = -Math.PI / 2;
      water.position.set(p.cx, 0.66, p.cz);
      this.water = water;
      s.add(water);
    } else {
      this.addStillPool();
    }
    // Polished stone reflects: a dimmed planar mirror added over the plaza
    // floor (cinematic only — it costs a second render at half resolution).
    if (q.reflections) {
      const mirror = new Reflector(new PlaneGeometry(180, 180), {
        textureWidth: Math.max(1, Math.round(this.container.clientWidth * 0.5)),
        textureHeight: Math.max(1, Math.round(this.container.clientHeight * 0.5)),
        color: new Color(0x121212),
        clipBias: 0.003,
      });
      const mm = mirror.material as MeshBasicMaterial;
      mm.transparent = true;
      mm.blending = AdditiveBlending;
      mm.depthWrite = false;
      // Pull the mirror toward the camera in depth so it never loses to the
      // floor it lies on, however far away the floor is.
      mm.polygonOffset = true;
      mm.polygonOffsetFactor = -4;
      mm.polygonOffsetUnits = -4;
      mirror.rotation.x = -Math.PI / 2;
      mirror.position.set(0, 0.615, -8);
      mirror.renderOrder = 1;
      // The physical sky is undefined below the horizon; keep it out of the
      // mirror pass so the floor reflects the house and its lights, not noise.
      const renderMirror = mirror.onBeforeRender.bind(mirror);
      mirror.onBeforeRender = (...args: Parameters<typeof renderMirror>) => {
        sky.visible = false;
        renderMirror(...args);
        sky.visible = true;
      };
      this.floorMirror = mirror;
      s.add(mirror);
    }
    s.add(buildSkyline(q.skyline));
    s.add(this.presence);
  }

  /** The pool without reflections: a still, dark surface. */
  private addStillPool() {
    const p = poolBounds();
    const still = new Mesh(new PlaneGeometry(p.w, p.d), new MeshPhysicalMaterial({ color: "#020304", roughness: 0.03, metalness: 0.2, clearcoat: 1 }));
    still.rotation.x = -Math.PI / 2;
    still.position.set(p.cx, 0.66, p.cz);
    this.stillPool = still;
    this.exterior.add(still);
  }

  /** Take out the water and the floor mirror, and free their render targets. */
  private dropReflections() {
    if (this.water) {
      const w = this.water;
      w.removeFromParent();
      const mat = w.material as Material & { uniforms?: { mirrorSampler?: { value?: Texture & { renderTarget?: { dispose(): void } | null } } } };
      mat.uniforms?.mirrorSampler?.value?.renderTarget?.dispose();
      w.geometry.dispose();
      mat.dispose();
      this.water = null;
      if (!this.disposed && !this.stillPool) this.addStillPool();
    }
    if (this.floorMirror) {
      const r = this.floorMirror;
      r.removeFromParent();
      r.dispose();
      r.geometry.dispose();
      this.floorMirror = null;
    }
  }

  private exteriorColliders() {
    const p = poolBounds();
    return [...this.buildings.flatMap((b) => b.colliders), ...this.landColliders, rect(p.cx, p.cz, p.w + 2.4, p.d + 2.4)];
  }

  /** Room sizes come from the host's live data; rebuilt if the data changes shape. */
  setRoomData(id: BuildingId, data: RoomData) {
    const prev = this.roomData.get(id);
    this.roomData.set(id, data);
    if (prev && JSON.stringify(prev) !== JSON.stringify(data)) {
      const r = this.rooms.get(id);
      if (r && this.space !== id) {
        disposeScene(r.scene, this.shared);
        this.rooms.delete(id);
      }
    }
  }

  /**
   * Recent activity near each door: small lit markers, never figures, at
   * most 8 a building. Counts only (DR-22); a null count draws nothing.
   */
  setPresence(counts: Partial<Record<BuildingId, number | null>>) {
    for (const old of [...this.presence.children]) {
      old.removeFromParent();
      const inst = old as InstancedMesh;
      inst.geometry.dispose();
      (inst.material as Material).dispose();
      inst.dispose();
    }
    let total = 0;
    for (const b of this.buildings) total += Math.min(8, counts[b.id] ?? 0);
    if (!total) return;
    const geo = new SphereGeometry(0.16, 12, 8);
    const mat = new MeshBasicMaterial({ color: new Color("#fff1dc").multiplyScalar(1.6), transparent: true, opacity: 0.7, depthWrite: false });
    const inst = new InstancedMesh(geo, mat, total);
    const o = new Object3D();
    let k = 0;
    for (const b of this.buildings) {
      const c = Math.min(8, counts[b.id] ?? 0);
      for (let i = 0; i < c; i++) {
        const a = (i / Math.max(1, c)) * Math.PI * 1.4 - 0.7 + b.entrance.yaw + Math.PI;
        const r = 4 + (i % 3) * 1.6;
        o.position.set(b.entrance.x - Math.sin(a) * r, 0.6 + 0.35, b.entrance.z - Math.cos(a) * r);
        o.updateMatrix();
        inst.setMatrixAt(k++, o.matrix);
      }
    }
    this.presence.add(inst);
  }

  // ─────────────────────────────────────────── spaces

  enter(id: BuildingId) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.h.onFade(true);
    this.later(() => {
      let room = this.rooms.get(id);
      if (!room) {
        room = buildRoom(id, this.m, this.interiorEnv(), this.roomData.get(id) ?? { count: 1 });
        this.rooms.set(id, room);
      }
      this.space = id;
      this.useScene(room.scene);
      this.nav.setSpace(room.colliders, room.bounds, 0);
      this.nav.place(room.spawn.x, room.spawn.z, room.spawn.yaw);
      this.exitArmed = false;
      this.shadowFrames = 0;
      this.h.onSpace(id);
      this.setPrompt(null);
      this.later(() => {
        this.h.onFade(false);
        this.transitioning = false;
      }, 120);
    }, 420);
  }

  exit() {
    if (this.space === "exterior" || this.transitioning) return;
    const b = this.buildings.find((x) => x.id === this.space)!;
    this.transitioning = true;
    this.h.onFade(true);
    this.later(() => {
      this.space = "exterior";
      this.useScene(this.exterior);
      this.nav.setSpace(this.exteriorColliders(), EXTERIOR_BOUNDS, 0.6);
      const back = b.entrance.yaw + Math.PI;
      this.nav.place(b.entrance.x - Math.sin(b.entrance.yaw) * -1.5, b.entrance.z - Math.cos(b.entrance.yaw) * -1.5, back);
      this.h.onSpace("exterior");
      this.setPrompt(null);
      this.later(() => {
        this.h.onFade(false);
        this.transitioning = false;
      }, 120);
    }, 420);
  }

  /** Quick travel: from anywhere to the door of a building, then inside. */
  travelTo(id: BuildingId, andEnter = true) {
    const go = () => {
      const b = this.buildings.find((x) => x.id === id)!;
      this.nav.flyTo(b.entrance.x, b.entrance.z, b.entrance.yaw, 2.6, () => andEnter && this.enter(id));
    };
    if (this.space === id) return;
    if (this.space !== "exterior") {
      this.exit();
      this.later(go, 700);
    } else go();
  }

  /** Walk to a station inside the current room. */
  approach(key: string) {
    if (this.space === "exterior") return;
    const st = this.rooms.get(this.space)?.stations.find((s) => s.key === key);
    if (st) this.nav.walkTo(st.stand.x, st.stand.z);
  }

  stations() {
    if (this.space === "exterior") return [];
    return this.rooms.get(this.space)?.stations.map((s) => s.key) ?? [];
  }

  /** A neutral studio room, prefiltered once, for every interior's reflections. */
  private interiorEnv() {
    if (!this.roomEnv) {
      const pmrem = new PMREMGenerator(this.renderer);
      this.roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }
    return this.roomEnv;
  }

  private useScene(scene: Scene) {
    bindEnvironment(scene);
    this.renderPass.mainScene = scene;
    if (this.aoPass) this.aoPass.scene = scene;
    this.renderer.shadowMap.needsUpdate = true;
  }

  private setPrompt(p: Prompt) {
    const same = JSON.stringify(p) === JSON.stringify(this.prompt);
    if (!same) {
      this.prompt = p;
      this.h.onPrompt(p);
    }
  }

  /** Step to a tier: DPR, AO, reflections and the shadow map all follow it. */
  setQuality(q: Tier) {
    this.quality = q;
    const c = QUALITY[q];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, c.dpr));
    if (this.aoPass) {
      if (!c.ao) this.aoPass.enabled = false;
      else this.aoPass.configuration.halfRes = c.aoHalf;
    }
    if (!c.reflections) this.dropReflections();
    if (this.sun && this.sun.shadow.mapSize.x > c.shadow) {
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(c.shadow, c.shadow);
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowFrames = 0;
    }
    this.resize();
    this.h.onQuality(q);
  }

  // ─────────────────────────────────────────── input

  /**
   * Keys go to the focused campus container only, never to the window, so
   * the rest of the page keeps its own shortcuts. A key is consumed only when
   * the campus uses it; Escape outside a building passes through untouched.
   */
  private bindInput(canvas: HTMLCanvasElement) {
    const el = this.container;
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      let used = false;
      if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|Shift(Left|Right))$/.test(e.code)) {
        this.nav.keyDown(e.code);
        used = true;
      } else if (e.code === "Enter" || e.code === "KeyF") {
        if (this.prompt?.kind === "enter") {
          this.enter(this.prompt.id);
          used = true;
        } else if (this.prompt?.kind === "exit") {
          this.exit();
          used = true;
        }
      } else if (e.code === "Escape" && this.space !== "exterior") {
        this.exit();
        used = true;
      }
      if (used) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => this.nav.keyUp(e.code);
    const onBlur = () => this.nav.clearKeys();
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("keyup", onKeyUp);
    el.addEventListener("focusout", onBlur);
    window.addEventListener("blur", onBlur);

    const onDown = (e: PointerEvent) => {
      el.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.touches.size === 1) this.down = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      const r = this.container.getBoundingClientRect();
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const prev = this.touches.get(e.pointerId);
      if (prev) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touches.size >= 2) {
          // Two fingers: walk forward/back with the vertical drag.
          if (dy < -1) this.nav.keyDown("KeyW");
          else if (dy > 1) this.nav.keyDown("KeyS");
        } else if (this.down && e.pointerId === this.down.id) {
          if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5) this.down.moved = true;
          if (this.down.moved) this.nav.look(dx, dy);
        }
      } else {
        this.updateHover();
      }
    };
    const onUp = (e: PointerEvent) => {
      this.touches.delete(e.pointerId);
      if (this.touches.size < 2) {
        this.nav.keyUp("KeyW");
        this.nav.keyUp("KeyS");
      }
      if (this.down && e.pointerId === this.down.id && !this.down.moved) this.click();
      if (this.down?.id === e.pointerId) this.down = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    this.cleanup.push(() => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("focusout", onBlur);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    });
  }

  private pick() {
    this.raycaster.setFromCamera(this.ndc, this.nav.camera);
    const scene = this.renderPass.mainScene as Scene;
    const hits = this.raycaster.intersectObjects(scene.children, true).filter((h) => (h.object as Mesh).visible);
    return hits[0] ?? null;
  }

  private updateHover() {
    if (this.space !== "exterior" || this.transitioning) return;
    const hit = this.pick();
    const id = (hit?.object.userData.building as string | undefined) ?? null;
    if (id !== this.hover) {
      this.hover = id;
      this.container.style.cursor = id ? "pointer" : "";
      this.h.onHover(id);
    }
  }

  private click() {
    if (this.transitioning) return;
    const hit = this.pick();
    if (!hit) return;
    const id = hit.object.userData.building as BuildingId | undefined;
    if (this.space === "exterior" && id) {
      const b = this.buildings.find((x) => x.id === id)!;
      this.nav.walkTo(b.entrance.x, b.entrance.z, () => {
        this.nav.flyTo(b.entrance.x, b.entrance.z, b.entrance.yaw, 0.8);
      });
      return;
    }
    const p = hit.point;
    if (hit.face && hit.face.normal.y > 0.5) this.nav.walkTo(p.x, p.z);
  }

  // ─────────────────────────────────────────── the loop

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dtMs = now - this.last;
    this.last = now;
    if (document.hidden || this.disposed) return;
    const dt = Math.min(dtMs, 50) / 1000;
    this.t += dt;

    const cam = this.nav.camera;
    this.nav.update(dt);
    // Nothing decorative moves: the water's surface stays where it was drawn.
    if (this.space === "exterior") {
      for (const b of this.buildings) b.update?.(this.t, dt);
      // Door prompts.
      let near: Building | null = null;
      for (const b of this.buildings) {
        if (Math.hypot(this.nav.pos.x - b.entrance.x, this.nav.pos.z - b.entrance.z) < 6) near = b;
      }
      if (!this.transitioning) this.setPrompt(near ? { kind: "enter", id: near.id } : null);
    } else {
      const room = this.rooms.get(this.space)!;
      room.update?.(this.t, dt);
      const dExit = Math.hypot(this.nav.pos.x - room.exit.x, this.nav.pos.z - room.exit.z);
      if (dExit > room.exit.r + 1.5) this.exitArmed = true;
      if (!this.transitioning) this.setPrompt(this.exitArmed && dExit < room.exit.r + 0.8 ? { kind: "exit", id: room.id } : null);
      // Focus: the nearest station in front of you, within reach.
      let best: string | null = null;
      let bestD = 9;
      const fwd = new Vector3(-Math.sin(this.nav.yaw), 0, -Math.cos(this.nav.yaw));
      for (const s of room.stations) {
        const to = new Vector3(s.anchor.x - this.nav.pos.x, 0, s.anchor.z - this.nav.pos.z);
        const d = to.length();
        if (d < bestD && to.normalize().dot(fwd) > 0.2) {
          best = s.key;
          bestD = d;
        }
      }
      if (best !== this.focus) {
        this.focus = best;
        this.h.onFocus(best);
      }
    }

    // Static shadows: render the shadow map for a few frames after a scene change.
    if (this.shadowFrames < 3) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowFrames++;
    }
    this.composer.render(dt);

    // Project label anchors to screen pixels for the DOM overlay.
    const pts: Projected[] = [];
    const v = new Vector3();
    const add = (key: string, anchor: Vector3) => {
      v.copy(anchor).project(cam);
      const dist = anchor.distanceTo(cam.position);
      pts.push({
        key,
        x: (v.x * 0.5 + 0.5) * this.width,
        y: (-v.y * 0.5 + 0.5) * this.height,
        visible: v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.2 && v.y < 1.2,
        dist,
      });
    };
    if (this.space === "exterior") for (const b of this.buildings) add(b.id, b.anchor);
    else for (const s of this.rooms.get(this.space)!.stations) add(s.key, s.anchor);
    this.h.onProject(pts);

    this.poseClock += dt;
    if (this.poseClock > 0.1) {
      this.poseClock = 0;
      this.h.onPose(this.nav.pos.x, this.nav.pos.z, this.nav.yaw);
    }
    this.governor.sample(dtMs);
  };

  private resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setSize(this.width, this.height);
    const cam = this.nav.camera;
    cam.aspect = this.width / Math.max(1, this.height);
    cam.updateProjectionMatrix();
  }

  get currentSpace() {
    return this.space;
  }

  /**
   * Release everything: the loop, listeners and observer; every geometry,
   * material, texture and render target; the composer; the assets; then the
   * renderer and its GL context; and the canvas. Safe to call twice.
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    for (const id of this.timers) window.clearTimeout(id);
    this.timers.clear();
    this.ro.disconnect();
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
    this.dropReflections();
    disposeScene(this.exterior, this.shared);
    for (const r of this.rooms.values()) disposeScene(r.scene, this.shared);
    this.rooms.clear();
    this.skyEnv?.dispose();
    this.roomEnv?.dispose();
    this.composer.dispose();
    disposeMaterials(this.m);
    disposeAssets(this.assets);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

/**
 * Dispose a scene's geometries, its own materials and their textures, and
 * its lights' shadow maps. Materials in `keep` are shared between spaces and
 * are released once, by disposeMaterials().
 */
function disposeScene(scene: Scene, keep: Set<Material>) {
  scene.traverse((o) => {
    const m = o as Mesh;
    m.geometry?.dispose();
    const own = m.material;
    for (const mat of Array.isArray(own) ? own : own ? [own] : []) {
      if (keep.has(mat)) continue;
      for (const v of Object.values(mat)) if ((v as Texture | null)?.isTexture) (v as Texture).dispose();
      mat.dispose();
    }
    (o as { shadow?: { dispose(): void } }).shadow?.dispose();
  });
}

/**
 * Bind a space's environment to its materials explicitly.
 *
 * three r186 overwrites `envMapIntensity` with `scene.environmentIntensity`
 * for every material that inherits `scene.environment` (WebGLRenderer, the
 * `material.envMap === null` branch). Without this, every per-material
 * reflection level in materials.ts is silently ignored. Materials are
 * shared between spaces, so this runs on every switch: each material keeps
 * its authored level, scaled by the space's own (`environmentIntensity`).
 * Both environments are PMREMs of the same size, so a switch never
 * recompiles a program.
 */
function bindEnvironment(scene: Scene) {
  const env = scene.environment;
  if (!env) return;
  const level = scene.environmentIntensity;
  scene.traverse((o) => {
    const own = (o as Mesh).material;
    if (!own) return;
    for (const mat of Array.isArray(own) ? own : [own]) {
      const m = mat as MeshStandardMaterial;
      if (!m.isMeshStandardMaterial) continue;
      if (m.userData.envBase === undefined) {
        m.userData.envBase = m.envMapIntensity;
        // A material that brought its own envMap keeps it.
        m.userData.envInherits = m.envMap === null;
      }
      if (!m.userData.envInherits) continue;
      if (m.envMap === null) m.needsUpdate = true;
      m.envMap = env;
      m.envMapIntensity = m.userData.envBase * level;
    }
  });
}
