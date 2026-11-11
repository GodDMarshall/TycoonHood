/**
 * Walking the HQ. First person at eye height, like an architectural
 * walkthrough — no bobbing, no pointer lock, nothing that makes people sick.
 *
 *   keyboard  W A S D / arrows to walk, Shift to stride, Q E to turn
 *   mouse     drag to look; click the ground to walk there; click a building
 *             to walk to its door (the world decides what a click means)
 *   touch     drag to look; tap to walk; two-finger drag to walk forward
 *
 * Movement is damped (it accelerates and settles), collides with building
 * footprints by sliding along them, and can be driven programmatically for
 * cinematic travel (the dock, "enter", the tour).
 */
import { MathUtils, PerspectiveCamera, Vector2, Vector3 } from "three";
import type { Collider } from "../architecture/geo";

export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

const EYE = 1.7;
const WALK = 5.5;
const STRIDE = 11;
const RADIUS = 0.6;

type Travel = {
  from: Vector3;
  to: Vector3;
  fromYaw: number;
  toYaw: number;
  fromPitch: number;
  t: number;
  dur: number;
  done?: () => void;
};

export class Navigator {
  readonly camera: PerspectiveCamera;
  pos = new Vector3(0, 0, 60);
  floor = 0.6;
  yaw = 0;
  pitch = -0.04;
  private vel = new Vector2();
  private keys = new Set<string>();
  private colliders: Collider[] = [];
  private bounds: Bounds = { minX: -88, maxX: 88, minZ: -96, maxZ: 80 };
  private travel: Travel | null = null;
  private walkTarget: Vector2 | null = null;
  private onArrive: (() => void) | null = null;
  private lookVel = new Vector2();
  enabled = true;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(58, aspect, 0.1, 2400);
    this.apply();
  }

  setSpace(colliders: Collider[], bounds: Bounds, floor: number) {
    this.colliders = colliders;
    this.bounds = bounds;
    this.floor = floor;
  }

  place(x: number, z: number, yaw: number, pitch = -0.04) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0);
    this.travel = null;
    this.walkTarget = null;
    this.apply();
  }

  // ── input ──────────────────────────────────────────────────────
  keyDown(code: string) {
    if (!this.enabled) return;
    this.keys.add(code);
    this.walkTarget = null;
    if (this.travel && /Key[WASD]|Arrow/.test(code)) this.travel = null;
  }
  keyUp(code: string) {
    this.keys.delete(code);
  }
  clearKeys() {
    this.keys.clear();
  }
  look(dx: number, dy: number) {
    if (!this.enabled || this.travel) return;
    this.lookVel.x += dx * 0.0032;
    this.lookVel.y += dy * 0.0026;
  }
  walkTo(x: number, z: number, onArrive?: () => void) {
    if (!this.enabled) return;
    this.walkTarget = new Vector2(x, z);
    this.onArrive = onArrive ?? null;
  }

  /** A cinematic move: eased position + heading, ignoring input until it lands. */
  flyTo(x: number, z: number, yaw: number, dur = 2.2, done?: () => void) {
    const dist = Math.hypot(x - this.pos.x, z - this.pos.z);
    this.walkTarget = null;
    this.travel = {
      from: this.pos.clone(),
      to: new Vector3(x, 0, z),
      fromYaw: this.yaw,
      toYaw: this.yaw + MathUtils.euclideanModulo(yaw - this.yaw + Math.PI, Math.PI * 2) - Math.PI,
      fromPitch: this.pitch,
      t: 0,
      dur: Math.max(0.8, Math.min(dur, 1 + dist / 22)),
      done,
    };
  }

  get moving() {
    return this.vel.lengthSq() > 0.05 || !!this.travel || !!this.walkTarget;
  }

  // ── simulation ─────────────────────────────────────────────────
  update(dt: number) {
    if (this.travel) {
      const tr = this.travel;
      tr.t = Math.min(1, tr.t + dt / tr.dur);
      const e = tr.t < 0.5 ? 4 * tr.t ** 3 : 1 - (-2 * tr.t + 2) ** 3 / 2;
      this.pos.lerpVectors(tr.from, tr.to, e);
      // A gentle arc: rise a little mid-flight so long moves read as travel.
      this.pos.y = Math.sin(Math.PI * e) * Math.min(6, tr.from.distanceTo(tr.to) * 0.08);
      this.yaw = MathUtils.lerp(tr.fromYaw, tr.toYaw, e);
      this.pitch = MathUtils.lerp(tr.fromPitch, -0.04, e);
      if (tr.t >= 1) {
        this.travel = null;
        this.pos.y = 0;
        tr.done?.();
      }
      this.apply();
      return;
    }

    // Look: damped so a flick feels weighted, not twitchy.
    this.yaw -= this.lookVel.x;
    this.pitch = MathUtils.clamp(this.pitch - this.lookVel.y, -1.1, 1.0);
    this.lookVel.multiplyScalar(Math.pow(0.001, dt));
    if (this.keys.has("KeyQ")) this.yaw += dt * 1.6;
    if (this.keys.has("KeyE")) this.yaw -= dt * 1.6;
    if (this.keys.has("ArrowLeft")) this.yaw += dt * 1.6;
    if (this.keys.has("ArrowRight")) this.yaw -= dt * 1.6;

    // Intent in local space.
    let f = 0;
    let s = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) f += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) f -= 1;
    if (this.keys.has("KeyD")) s += 1;
    if (this.keys.has("KeyA")) s -= 1;
    const speed = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? STRIDE : WALK;
    const want = new Vector2();
    if (f || s) {
      const len = Math.hypot(f, s);
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      want.set((fx * f + -fz * s) / len, (fz * f + fx * s) / len).multiplyScalar(speed);
    } else if (this.walkTarget) {
      const d = this.walkTarget.clone().sub(new Vector2(this.pos.x, this.pos.z));
      const dist = d.length();
      if (dist < 0.35) {
        this.walkTarget = null;
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
      } else {
        want.copy(d.normalize().multiplyScalar(Math.min(speed * 1.4, dist * 2.2)));
        // Turn gently toward where we are walking.
        const targetYaw = Math.atan2(-want.x, -want.y);
        const diff = MathUtils.euclideanModulo(targetYaw - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
        this.yaw += diff * Math.min(1, dt * 2.5);
      }
    }
    const k = 1 - Math.exp(-dt * (want.lengthSq() ? 6 : 9));
    this.vel.lerp(want, k);

    const next = new Vector2(this.pos.x + this.vel.x * dt, this.pos.z + this.vel.y * dt);
    const before = next.clone();
    this.collide(next);
    if (this.walkTarget && next.distanceTo(before) > this.vel.length() * dt * 0.8) this.walkTarget = null; // blocked
    this.pos.x = next.x;
    this.pos.z = next.y;
    this.apply();
  }

  private collide(p: Vector2) {
    const b = this.bounds;
    p.x = MathUtils.clamp(p.x, b.minX + RADIUS, b.maxX - RADIUS);
    p.y = MathUtils.clamp(p.y, b.minZ + RADIUS, b.maxZ - RADIUS);
    for (const c of this.colliders) {
      if (c.kind === "circle") {
        const dx = p.x - c.x;
        const dz = p.y - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + RADIUS;
        if (d < min && d > 1e-6) {
          p.x = c.x + (dx / d) * min;
          p.y = c.z + (dz / d) * min;
        }
      } else {
        const minX = c.minX - RADIUS;
        const maxX = c.maxX + RADIUS;
        const minZ = c.minZ - RADIUS;
        const maxZ = c.maxZ + RADIUS;
        if (p.x > minX && p.x < maxX && p.y > minZ && p.y < maxZ) {
          const pen = [p.x - minX, maxX - p.x, p.y - minZ, maxZ - p.y];
          const i = pen.indexOf(Math.min(...pen));
          if (i === 0) p.x = minX;
          else if (i === 1) p.x = maxX;
          else if (i === 2) p.y = minZ;
          else p.y = maxZ;
        }
      }
    }
  }

  private apply() {
    this.camera.position.set(this.pos.x, this.floor + EYE + this.pos.y, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}
