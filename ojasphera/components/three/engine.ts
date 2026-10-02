import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export { hasWebGL, telemetry } from "./env";

export type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  size: { w: number; h: number };
  reduced: boolean;
  small: boolean;
  /** Start the loop. `tick(dt, t)` runs before each render. */
  start: (tick: (dt: number, t: number) => void) => void;
  /** Render a single frame (used for reduced motion and on demand). */
  renderOnce: () => void;
  onResize: (fn: (w: number, h: number) => void) => void;
  dispose: () => void;
};

/**
 * One WebGL stage bound to a container element: renderer, camera, bloom,
 * resize handling, and a loop that pauses off-screen and in hidden tabs.
 */
export function createStage(
  container: HTMLElement,
  opts: { fov?: number; bloom?: { strength: number; radius: number; threshold: number }; clear?: number } = {},
): Stage {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.matchMedia("(max-width: 768px)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.4 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Colors are given in sRGB; THREE.Color converts them to the renderer's linear working space.
  renderer.setClearColor(new THREE.Color(opts.clear ?? 0x000000), opts.clear === undefined ? 0 : 1);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.1, 400);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const b = opts.bloom ?? { strength: 0.85, radius: 0.55, threshold: 0.12 };
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), b.strength, b.radius, b.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const size = { w: 1, h: 1 };
  const resizeFns: ((w: number, h: number) => void)[] = [];
  const resize = () => {
    const r = container.getBoundingClientRect();
    size.w = Math.max(1, r.width);
    size.h = Math.max(1, r.height);
    renderer.setSize(size.w, size.h, false);
    composer.setSize(size.w, size.h);
    bloom.setSize(size.w * 0.5, size.h * 0.5);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    resizeFns.forEach((f) => f(size.w, size.h));
  };

  let raf = 0;
  let running = false;
  let visible = true;
  let tickFn: ((dt: number, t: number) => void) | null = null;
  let last = 0;
  let t = 0;

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    t += dt;
    tickFn?.(dt, t);
    composer.render();
    if (running) raf = requestAnimationFrame(frame);
  };
  const play = () => {
    if (running || !visible || reduced || document.hidden || !tickFn) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const ro = new ResizeObserver(() => {
    resize();
    if (!running) composer.render();
  });
  ro.observe(container);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) play();
    else pause();
  });
  io.observe(container);
  const onVis = () => (document.hidden ? pause() : play());
  document.addEventListener("visibilitychange", onVis);
  resize();

  return {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    size,
    reduced,
    small,
    start(tick) {
      tickFn = tick;
      if (reduced) {
        tick(0, 0);
        composer.render();
      } else play();
    },
    renderOnce() {
      tickFn?.(0, t);
      composer.render();
    },
    onResize(fn) {
      resizeFns.push(fn);
      fn(size.w, size.h);
    },
    dispose() {
      pause();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/** A soft round sprite texture for glows and particles. */
export function glowTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** GLSL 3D simplex noise (Ashima / Stefan Gustavson, MIT). */
export const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/** Shift the rendered subject so it sits at `frac` of the 1440px content shell (wide screens only). */
export function frameRight(camera: THREE.PerspectiveCamera, w: number, h: number, frac = 0.68) {
  const side = w >= 1024 && h <= w;
  if (!side) {
    camera.clearViewOffset();
    return false;
  }
  const cw = Math.min(w, 1440);
  const cx = (w - cw) / 2 + cw * frac;
  camera.setViewOffset(w, h, -(cx - w / 2), 0, w, h);
  return true;
}
