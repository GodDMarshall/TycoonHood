/**
 * THE WORLD — renderer, post-processing, the campus, the rooms, the walk.
 *
 * Framework-free. The React host (world-host.tsx) owns data and UI; this
 * owns pixels and physics, and talks back through a handful of callbacks.
 * Nothing per-frame ever causes a React render: projected anchors are
 * written to DOM nodes the host registered.
 */
import {
  AdditiveBlending,
  CapsuleGeometry,
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
import type { WorldAssets } from "./assets";
import { createMaterials, type Materials } from "./materials";
import { Navigator } from "./navigation";
import { FrameGovernor, QUALITY, stepDown, type Quality } from "./quality";
import {
  buildAcademy,
  buildArena,
  buildCommand,
  buildNetwork,
  buildPathways,
  buildPlaza,
  buildSkyline,
  buildTreasury,
  buildVault,
  poolBounds,
  type Building,
  type DistrictId,
} from "../architecture/campus";
import { mesh, planeGeo, rect } from "../architecture/geo";
import { buildLandscape } from "../architecture/landscape";
import { buildRoom, type Room } from "../interiors/rooms";

export type Space = "exterior" | DistrictId;
export type Projected = { key: string; x: number; y: number; visible: boolean; dist: number };
export type Prompt = { kind: "enter"; id: DistrictId } | { kind: "exit"; id: DistrictId } | null;

export type WorldHandlers = {
  onSpace: (space: Space) => void;
  onPrompt: (p: Prompt) => void;
  onHover: (key: string | null) => void;
  onFocus: (key: string | null) => void;
  onProject: (points: Projected[]) => void;
  onPose: (x: number, z: number, yaw: number) => void;
  onFade: (dark: boolean) => void;
  onQuality: (q: Quality) => void;
  onFatal: (reason: string) => void;
};

export type RoomData = { count: number; pillars?: string[] };

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
  private landColliders: import("../architecture/geo").Collider[] = [];
  private rooms = new Map<DistrictId, Room>();
  private roomData = new Map<DistrictId, RoomData>();
  private presence = new Group();
  private space: Space = "exterior";
  private quality: Quality;
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
  private floorMirror: Reflector | null = null;
  private skyEnv: import("three").Texture | null = null;
  private down: { x: number; y: number; moved: boolean; id: number } | null = null;
  private touches = new Map<number, { x: number; y: number }>();
  private cleanup: (() => void)[] = [];

  private tour: boolean;

  constructor(
    private container: HTMLElement,
    private assets: WorldAssets,
    quality: Quality,
    private h: WorldHandlers,
    opts: { tour?: boolean } = {}
  ) {
    this.tour = !!opts.tour;
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

    this.governor = new FrameGovernor(() => {
      const next = stepDown(this.quality);
      if (next) this.setQuality(next);
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    if (!this.tour) this.bindInput(canvas);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.h.onFatal("context-lost");
    });

    this.nav.setSpace(this.exteriorColliders(), { minX: -88, maxX: 88, minZ: -96, maxZ: 80 }, 0.6);
    this.nav.place(0, 72, 0, 0.02);
    if (this.tour) {
      // The tour never comes near geometry; a far near-plane buys the depth
      // precision that 5mm inlays need when seen from 150m.
      this.nav.camera.near = 1.5;
      this.nav.camera.updateProjectionMatrix();
    }
    // Deep link to a viewpoint: /world?cam=x,z,yawDeg[,pitchDeg][&room=academy]
    const qs = new URLSearchParams(window.location.search);
    const cam = qs.get("cam")?.split(",").map(Number);
    if (cam && cam.length >= 3 && cam.every(Number.isFinite)) this.nav.place(cam[0], cam[1], MathUtils.degToRad(cam[2]), MathUtils.degToRad(cam[3] ?? 1));
    // QA only: start the homepage tour at a given second of its path.
    const tourAt = Number(qs.get("tourt"));
    if (this.tour && Number.isFinite(tourAt) && tourAt > 0) this.t = tourAt;
    const room = qs.get("room") as DistrictId | null;
    if (room && ["command", "academy", "arena", "vault", "treasury", "network"].includes(room)) window.setTimeout(() => this.enter(room), 50);
    this.raf = requestAnimationFrame(this.frame);
  }

  // ─────────────────────────────────────────── construction

  private buildExterior(q: (typeof QUALITY)[Quality]) {
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
    s.add(new HemisphereLight("#8fa6c8", "#1b1410", 0.28));

    s.add(buildPlaza(this.m));
    const land = buildLandscape(this.m, this.m.hedge, q.shadow >= 2048 ? 6 : 2);
    s.add(land.group);
    this.landColliders = land.colliders;
    this.buildings = [buildCommand(this.m), buildAcademy(this.m), buildTreasury(this.m), buildVault(this.m), buildArena(this.m), buildNetwork(this.m)];
    for (const b of this.buildings) {
      b.group.userData.district = b.id;
      b.group.traverse((o) => (o.userData.district = b.id));
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
      const still = new Mesh(new PlaneGeometry(p.w, p.d), new MeshPhysicalMaterial({ color: "#020304", roughness: 0.03, metalness: 0.2, clearcoat: 1 }));
      still.rotation.x = -Math.PI / 2;
      still.position.set(p.cx, 0.66, p.cz);
      s.add(still);
    }
    // Polished stone reflects: a dimmed planar mirror added over the plaza
    // floor (cinematic only — it costs a second render at half resolution).
    if (q.reflections) {
      const mirror = new Reflector(new PlaneGeometry(180, 180), {
        textureWidth: Math.round(window.innerWidth * 0.5),
        textureHeight: Math.round(window.innerHeight * 0.5),
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

  private exteriorColliders() {
    const p = poolBounds();
    return [...this.buildings.flatMap((b) => b.colliders), ...this.landColliders, rect(p.cx, p.cz, p.w + 2.4, p.d + 2.4)];
  }

  /** Room sizes come from the host's live data; rebuilt if the data changes shape. */
  setRoomData(id: DistrictId, data: RoomData) {
    const prev = this.roomData.get(id);
    this.roomData.set(id, data);
    if (prev && (prev.count !== data.count || prev.pillars?.join() !== data.pillars?.join())) {
      const r = this.rooms.get(id);
      if (r && this.space !== id) {
        disposeScene(r.scene);
        this.rooms.delete(id);
      }
    }
  }

  /** Anonymous presences: one figure per recent real action near each district (capped). */
  setPresence(counts: Partial<Record<DistrictId, number>>) {
    this.presence.clear();
    const geo = new CapsuleGeometry(0.24, 1.15, 6, 16);
    const mat = new MeshBasicMaterial({ color: new Color("#ffe3b0").multiplyScalar(1.6), transparent: true, opacity: 0.55, depthWrite: false });
    let total = 0;
    for (const b of this.buildings) total += Math.min(8, counts[b.id] ?? 0);
    if (!total) return;
    const inst = new InstancedMesh(geo, mat, total);
    const o = new Object3D();
    let k = 0;
    for (const b of this.buildings) {
      const c = Math.min(8, counts[b.id] ?? 0);
      for (let i = 0; i < c; i++) {
        const a = (i / Math.max(1, c)) * Math.PI * 1.4 - 0.7 + b.entrance.yaw + Math.PI;
        const r = 4 + (i % 3) * 1.6;
        o.position.set(b.entrance.x - Math.sin(a) * r, 0.6 + 0.82, b.entrance.z - Math.cos(a) * r);
        o.updateMatrix();
        inst.setMatrixAt(k++, o.matrix);
      }
    }
    this.presence.add(inst);
  }

  // ─────────────────────────────────────────── spaces

  enter(id: DistrictId) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.h.onFade(true);
    window.setTimeout(() => {
      let room = this.rooms.get(id);
      if (!room) {
        const data = this.roomData.get(id) ?? { count: 3 };
        room = buildRoom(id, this.m, this.interiorEnv(), { count: data.count, pillars: data.pillars, models: this.assets.models });
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
      window.setTimeout(() => {
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
    window.setTimeout(() => {
      this.space = "exterior";
      this.useScene(this.exterior);
      this.nav.setSpace(this.exteriorColliders(), { minX: -88, maxX: 88, minZ: -96, maxZ: 80 }, 0.6);
      const back = b.entrance.yaw + Math.PI;
      this.nav.place(b.entrance.x - Math.sin(b.entrance.yaw) * -1.5, b.entrance.z - Math.cos(b.entrance.yaw) * -1.5, back);
      this.h.onSpace("exterior");
      this.setPrompt(null);
      window.setTimeout(() => {
        this.h.onFade(false);
        this.transitioning = false;
      }, 120);
    }, 420);
  }

  /** Quick travel: from anywhere to the door of a district, then inside. */
  travelTo(id: DistrictId, andEnter = true) {
    const go = () => {
      const b = this.buildings.find((x) => x.id === id)!;
      this.nav.flyTo(b.entrance.x, b.entrance.z, b.entrance.yaw, 2.6, () => andEnter && this.enter(id));
    };
    if (this.space === id) return;
    if (this.space !== "exterior") {
      this.exit();
      window.setTimeout(go, 700);
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

  private roomEnv: import("three").Texture | null = null;
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

  setQuality(q: Quality) {
    this.quality = q;
    const c = QUALITY[q];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, c.dpr));
    if (this.aoPass) {
      if (!c.ao) this.aoPass.enabled = false;
      else this.aoPass.configuration.halfRes = c.aoHalf;
    }
    this.resize();
    this.h.onQuality(q);
  }

  // ─────────────────────────────────────────── input

  private bindInput(canvas: HTMLCanvasElement) {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (/Key[WASDQE]|Arrow|Shift/.test(e.code)) {
        this.nav.keyDown(e.code);
        if (e.code.startsWith("Arrow")) e.preventDefault();
      }
      if (e.code === "Enter" || e.code === "KeyF") {
        if (this.prompt?.kind === "enter") this.enter(this.prompt.id);
        else if (this.prompt?.kind === "exit") this.exit();
      }
      if (e.code === "Escape" && this.space !== "exterior") this.exit();
    };
    const onKeyUp = (e: KeyboardEvent) => this.nav.keyUp(e.code);
    const onBlur = () => this.nav.clearKeys();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const onDown = (e: PointerEvent) => {
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
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
    const id = (hit?.object.userData.district as string | undefined) ?? null;
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
    const id = hit.object.userData.district as DistrictId | undefined;
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
    if (this.tour) {
      // The homepage fly-around: a slow pendulum over the south lawns, so the
      // tower always stands against the western dusk and the promenade leads
      // the eye in. It never swings behind a building.
      const a = Math.PI / 2 - 0.5 * Math.sin(this.t * 0.045);
      const r = 146 + Math.sin(this.t * 0.07) * 8;
      cam.position.set(Math.cos(a) * r, 34 + Math.sin(this.t * 0.11) * 4, -12 + Math.sin(a) * r);
      cam.lookAt(Math.cos(a) * 12, 14, -30);
      for (const b of this.buildings) b.update?.(this.t, dt);
      if (this.water) (this.water.material as unknown as { uniforms: { time: { value: number } } }).uniforms.time.value += dt * 0.35;
      if (this.shadowFrames < 3) {
        this.renderer.shadowMap.needsUpdate = true;
        this.shadowFrames++;
      }
      this.composer.render(dt);
      this.governor.sample(dtMs);
      return;
    }
    this.nav.update(dt);
    if (this.space === "exterior") {
      for (const b of this.buildings) b.update?.(this.t, dt);
      if (this.water) (this.water.material as unknown as { uniforms: { time: { value: number } } }).uniforms.time.value += dt * 0.35;
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
    // On the homepage the headline sits left; shift the frame so the HQ sits right.
    if (this.tour && this.width >= 1280) cam.setViewOffset(this.width, this.height, -this.width * 0.2, 0, this.width, this.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }

  get currentSpace() {
    return this.space;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.cleanup.forEach((f) => f());
    disposeScene(this.exterior);
    this.skyEnv?.dispose();
    this.roomEnv?.dispose();
    for (const r of this.rooms.values()) disposeScene(r.scene);
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function disposeScene(scene: Scene) {
  scene.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
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
