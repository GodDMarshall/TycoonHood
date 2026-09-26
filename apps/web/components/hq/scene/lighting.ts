/**
 * Lighting: a dim warm room, one key light from high left like late sun
 * through a clerestory, a cool restrained rim so the silhouettes separate
 * from the dark, and one gold pool at the core. Physically based units.
 */
import { DirectionalLight, HemisphereLight, PointLight, type Scene } from "three";

export function addLighting(scene: Scene) {
  const hemi = new HemisphereLight(0xe9dcc0, 0x0a0908, 0.5);
  const key = new DirectionalLight(0xffe4b8, 2.1);
  key.position.set(-10, 16, 9);
  const rim = new DirectionalLight(0x9fb2c8, 0.55);
  rim.position.set(8, 7, -14);
  const core = new PointLight(0xd9b36a, 42, 16, 2);
  core.position.set(0, 1.4, 0);
  scene.add(hemi, key, rim, core);
  return { hemi, key, rim, core };
}
