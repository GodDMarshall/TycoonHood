/**
 * Asset loading with one progress stream for the loading screen.
 * Materials are the generated PBR sets in /world/tex (see
 * scripts/world/generate-textures.mjs); skies are Poly Haven HDRIs (CC0).
 */
import {
  EquirectangularReflectionMapping,
  LoadingManager,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type DataTexture,
  type Group,
  type Texture,
} from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const MATERIAL_SETS = ["marble", "basalt", "concrete", "brass", "oak", "hedge"] as const;
export type MaterialSet = (typeof MATERIAL_SETS)[number];
export type PBRSet = { map: Texture; roughnessMap: Texture; normalMap: Texture };

export type WorldAssets = {
  sky: DataTexture;
  sets: Record<MaterialSet, PBRSet>;
  waterNormals: Texture;
  models: { sofa: Group | null; chair: Group | null };
};

export async function loadWorldAssets(opts: { anisotropy: number; onProgress: (p: number) => void; night?: boolean; models?: boolean }) {
  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => opts.onProgress(total ? loaded / total : 0);
  const tex = new TextureLoader(manager);
  const hdr = new HDRLoader(manager);
  const gltf = new GLTFLoader(manager);

  const load = (url: string, color = false) =>
    tex.loadAsync(url).then((t) => {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = opts.anisotropy;
      if (color) t.colorSpace = SRGBColorSpace;
      return t;
    });

  const setPromises = MATERIAL_SETS.map(async (name) => {
    const [map, roughnessMap, normalMap] = await Promise.all([
      load(`/world/tex/${name}_albedo.jpg`, true),
      load(`/world/tex/${name}_rough.jpg`),
      load(`/world/tex/${name}_normal.jpg`),
    ]);
    return [name, { map, roughnessMap, normalMap }] as const;
  });

  const [sky, waterNormals, sets, sofa, chair] = await Promise.all([
    hdr.loadAsync(opts.night ? "/world/hdri/moonless_golf_1k.hdr" : "/world/hdri/venice_sunset_1k.hdr").then((t) => {
      t.mapping = EquirectangularReflectionMapping;
      return t;
    }),
    load("/world/tex/water_normal.jpg"),
    Promise.all(setPromises).then((e) => Object.fromEntries(e) as Record<MaterialSet, PBRSet>),
    opts.models === false ? null : gltf.loadAsync("/world/models/GlamVelvetSofa.glb").then((g) => g.scene).catch(() => null),
    opts.models === false ? null : gltf.loadAsync("/world/models/ChairDamaskPurplegold.glb").then((g) => g.scene).catch(() => null),
  ]);

  return { sky, sets, waterNormals, models: { sofa, chair } } satisfies WorldAssets;
}
