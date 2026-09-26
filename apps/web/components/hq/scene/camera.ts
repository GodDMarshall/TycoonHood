/**
 * The camera rig. An architectural photographer's camera: long lens, high
 * vantage, never spinning. Three inputs move it, all eased:
 *   drift   — a slow idle sway, so the scene breathes
 *   pointer — a few degrees of parallax toward the cursor
 *   scroll  — a dolly toward the core as the visitor scrolls past the hero
 * `frame` shifts the projection so the HQ sits right of the headline on
 * wide screens without moving the world.
 */
import { MathUtils, PerspectiveCamera, Vector3 } from "three";

export function createCameraRig() {
  const camera = new PerspectiveCamera(28, 1, 0.5, 140);
  const target = new Vector3(0, 2.1, 0.2);
  const state = { px: 0, py: 0, tx: 0, ty: 0, scroll: 0, shift: 0 };

  function setPointer(nx: number, ny: number) {
    state.tx = MathUtils.clamp(nx, -1, 1);
    state.ty = MathUtils.clamp(ny, -1, 1);
  }

  function resize(width: number, height: number) {
    camera.aspect = width / Math.max(1, height);
    state.shift = width >= 1280 ? 0.22 : width >= 1024 ? 0.18 : 0;
    if (state.shift) camera.setViewOffset(width, height, -width * state.shift, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function update(t: number, dt: number, scroll: number, motion: number) {
    const k = 1 - Math.exp(-dt * 2.2);
    state.px += (state.tx - state.px) * k;
    state.py += (state.ty - state.py) * k;
    state.scroll += (scroll - state.scroll) * (1 - Math.exp(-dt * 5));

    const azimuth = MathUtils.degToRad(36 + Math.sin(t * 0.06) * 3.5 * motion + state.px * 4 * motion);
    const elevation = MathUtils.degToRad(26 - state.scroll * 6 - state.py * 2 * motion);
    const radius = 40 - state.scroll * 8;
    camera.position.set(
      target.x + radius * Math.cos(elevation) * Math.sin(azimuth),
      target.y + radius * Math.sin(elevation),
      target.z + radius * Math.cos(elevation) * Math.cos(azimuth)
    );
    camera.lookAt(target);
  }

  return { camera, setPointer, resize, update };
}
