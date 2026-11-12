/**
 * Asset loading with one progress stream for the loading strip.
 *
 * Every texture is a generated PBR set in /world/tex, made by
 * scripts/world/generate-textures.mjs: Tycoonhood originals (DR-23, DR-31).
 * There are no HDRIs and no models. The sky and the rooms' reflections are
 * built in code (Sky and RoomEnvironment in world.ts).
 *
 * Each image is fetched, so the host can abort the whole set when the member
 * leaves or picks the 2D view, then decoded off the main thread before it
 * becomes a texture. three's TextureLoader uses a bare <img>, which can't be
 * stopped.
 */
import { RepeatWrapping, SRGBColorSpace, Texture } from "three";

export const MATERIAL_SETS = ["marble", "basalt", "concrete", "brass", "oak", "hedge"] as const;
export type MaterialSet = (typeof MATERIAL_SETS)[number];
export type PBRSet = { map: Texture; roughnessMap: Texture; normalMap: Texture };

export type WorldAssets = {
  sets: Record<MaterialSet, PBRSet>;
  waterNormals: Texture;
};

/** Three maps per set, and the water. */
const TEXTURES = MATERIAL_SETS.length * 3 + 1;

/**
 * Rejects if any texture fails or the signal aborts, so the host can fall
 * back to 2D. The first failure stops the requests still running.
 */
export async function loadWorldAssets(opts: { anisotropy: number; signal: AbortSignal; onProgress: (p: number) => void }): Promise<WorldAssets> {
  const batch = new AbortController();
  const stop = () => batch.abort();
  if (opts.signal.aborted) stop();
  else opts.signal.addEventListener("abort", stop, { once: true });
  const made: Texture[] = [];
  let done = 0;

  const load = async (url: string, color = false) => {
    const img = await fetchImage(url, batch.signal);
    // Loads still running when the set fails, or the host aborts, make no texture.
    if (batch.signal.aborted) throw new DOMException("The campus stopped loading.", "AbortError");
    const t = new Texture(img);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = opts.anisotropy;
    if (color) t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    made.push(t);
    opts.onProgress(++done / TEXTURES);
    return t;
  };

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
    stop();
    for (const t of made) t.dispose();
    throw e;
  } finally {
    opts.signal.removeEventListener("abort", stop);
  }
}

/** One image, fetched and decoded. Throws on an HTTP error, a bad image or an abort. */
async function fetchImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const src = URL.createObjectURL(await res.blob());
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  } finally {
    // The decoded image keeps its pixels; the URL was only the way in.
    URL.revokeObjectURL(src);
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
