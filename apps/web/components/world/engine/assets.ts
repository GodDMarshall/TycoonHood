/**
 * Asset loading with one progress stream for the loading screen.
 *
 * Every texture is a generated PBR set in /world/tex, made by
 * scripts/world/generate-textures.mjs: Tycoonhood originals (DR-23, DR-30).
 * There are no HDRIs and no models. The sky and the rooms' reflections are
 * built in code (Sky and RoomEnvironment in world.ts).
 */
import { LoadingManager, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from "three";

export const MATERIAL_SETS = ["marble", "basalt", "concrete", "brass", "oak", "hedge"] as const;
export type MaterialSet = (typeof MATERIAL_SETS)[number];
export type PBRSet = { map: Texture; roughnessMap: Texture; normalMap: Texture };

export type WorldAssets = {
  sets: Record<MaterialSet, PBRSet>;
  waterNormals: Texture;
};

/** Rejects if any texture fails, so the host can fall back to 2D. */
export async function loadWorldAssets(opts: { anisotropy: number; onProgress: (p: number) => void }): Promise<WorldAssets> {
  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => opts.onProgress(total ? loaded / total : 0);
  const tex = new TextureLoader(manager);
  const loaded: Texture[] = [];

  const load = (url: string, color = false) =>
    tex.loadAsync(url).then((t) => {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = opts.anisotropy;
      if (color) t.colorSpace = SRGBColorSpace;
      loaded.push(t);
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

  try {
    const [waterNormals, sets] = await Promise.all([
      load("/world/tex/water_normal.jpg"),
      Promise.all(setPromises).then((e) => Object.fromEntries(e) as Record<MaterialSet, PBRSet>),
    ]);
    return { sets, waterNormals };
  } catch (e) {
    for (const t of loaded) t.dispose();
    throw e;
  }
}

export function disposeAssets(a: WorldAssets) {
  for (const set of Object.values(a.sets)) {
    set.map.dispose();
    set.roughnessMap.dispose();
    set.normalMap.dispose();
  }
  a.waterNormals.dispose();
}
