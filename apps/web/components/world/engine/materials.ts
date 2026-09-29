/**
 * The world's material library. Every surface in the HQ is one of these.
 * Geometry carries metre-scale UVs (architecture/geo.ts), so textures repeat
 * at 1 here and every surface reads at a believable scale.
 */
import { Color, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type Texture } from "three";
import type { PBRSet, WorldAssets } from "./assets";
import { curtainWall, libraryGlass, lobbyGlass } from "../architecture/facades";

/** Clone a PBR set's textures with a repeat so each material can tile independently. */
function tiled(set: PBRSet, repeat: number) {
  const c = (t: Texture) => {
    const n = t.clone();
    n.repeat.set(repeat, repeat);
    n.needsUpdate = true;
    return n;
  };
  return { map: c(set.map), roughnessMap: c(set.roughnessMap), normalMap: c(set.normalMap) };
}

/** Paving bands every `field` metres (world XZ, offset to the plaza centre). */
function banded(mat: MeshPhysicalMaterial, field = 12, band = 0.55, origin = new Vector2(0, -8)) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vPave;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvPave = (modelMatrix * vec4(transformed, 1.0)).xz;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vPave;
        float paveBand() {
          vec2 p = vPave - vec2(${origin.x.toFixed(1)}, ${origin.y.toFixed(1)}) + ${(field / 2).toFixed(2)};
          vec2 d = abs(mod(p, ${field.toFixed(1)}) - ${(field / 2).toFixed(2)});
          vec2 w = fwidth(p) * 1.2;
          vec2 m = smoothstep(vec2(${(field / 2 - band / 2).toFixed(3)}) - w, vec2(${(field / 2 - band / 2).toFixed(3)}) + w, d);
          return max(m.x, m.y);
        }`
      )
      .replace("#include <map_fragment>", "#include <map_fragment>\nfloat pave = paveBand();\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.018, 0.016, 0.014), pave);")
      // The stone's roughness map is authored for a polish (mean ~0.09); remap
      // it into a honed range, keeping its variation, before the bands.
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.42 + roughnessFactor * 0.5, 0.82, pave);")
      .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - pave;\n#endif");
  };
  mat.customProgramCacheKey = () => `pave-${field}-${band}`;
  return mat;
}

export function createMaterials(a: WorldAssets) {
  const s = a.sets;
  const glow = (hex: string, strength: number) => {
    const m = new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(strength), toneMapped: true });
    return m;
  };
  return {
    /** Polished Nero Marquina — plaza and interior floors (clearcoat = the polish). */
    marbleFloor: new MeshPhysicalMaterial({
      ...tiled(s.marble, 1),
      // Darken the stone so the polish, not the pigment, carries the surface.
      color: new Color("#5c5c5c"),
      roughness: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      normalScale: new Vector2(0.06, 0.06),
      envMapIntensity: 1.1,
    }),
    /**
     * The plaza's own floor: the same stone, honed rather than polished —
     * outdoor paving is never mirror-finished (it would be lethal in rain),
     * and a polished floor mirrors the dusk sky at grazing angles until it
     * reads as ice. Laid in 12m fields divided by basalt bands, which give
     * the eye a scale from the air. Drawn in the shader from world
     * position, so no strip can z-fight. The planar mirror (cinematic)
     * still adds the lanterns' reflections.
     */
    plazaFloor: banded(
      new MeshPhysicalMaterial({
        ...tiled(s.marble, 1),
        color: new Color("#5c5c5c"),
        roughness: 1, // the map, unscaled; banded() remaps it to a hone
        clearcoat: 0.12,
        clearcoatRoughness: 0.32,
        normalScale: new Vector2(0.08, 0.08),
        envMapIntensity: 0.5,
      })
    ),
    marbleWall: new MeshPhysicalMaterial({ ...tiled(s.marble, 1), roughness: 1, clearcoat: 0.6, clearcoatRoughness: 0.12 }),
    basalt: new MeshStandardMaterial({ ...tiled(s.basalt, 1), roughness: 1, normalScale: new Vector2(1, 1) }),
    concrete: new MeshStandardMaterial({ ...tiled(s.concrete, 1), roughness: 1 }),
    brass: new MeshStandardMaterial({ ...tiled(s.brass, 1), metalness: 1, roughness: 1, envMapIntensity: 1.2 }),
    brassPolished: new MeshStandardMaterial({ color: "#d9b36a", metalness: 1, roughness: 0.18, envMapIntensity: 1.4 }),
    bronzeDark: new MeshStandardMaterial({ color: "#3a2c1c", metalness: 1, roughness: 0.38 }),
    oak: new MeshStandardMaterial({ ...tiled(s.oak, 1), roughness: 1, normalScale: new Vector2(0.25, 0.25) }),
    /** Smoked curtain-wall glass: a dark mirror of the sky. */
    glass: new MeshPhysicalMaterial({ color: "#0b0d10", metalness: 0.9, roughness: 0.04, envMapIntensity: 1.3 }),
    /** Lit window glass seen from outside: warm interior light. */
    glassLit: new MeshBasicMaterial({ color: new Color("#ffb96a").multiplyScalar(1.6) }),
    /** Emissive gold, pushed past 1.0 so bloom picks it up. */
    goldLight: glow("#ffcf7a", 4),
    goldLightSoft: glow("#ffcf7a", 1.6),
    whiteLight: glow("#fff1dc", 3),
    /** Curtain walls: 48m × 64m modules of offices, a third of them lit at dusk. */
    office: curtainWall({ bays: 32, floors: 16, lit: 0.3, seed: 11 }).mat,
    officeCool: curtainWall({ bays: 32, floors: 16, lit: 0.18, seed: 29, cool: 0.6 }).mat,
    hedge: new MeshStandardMaterial({ ...tiled(s.hedge, 1), roughness: 1 }),
    lobby: lobbyGlass(),
    library: libraryGlass(),
    beam: new MeshBasicMaterial({ color: "#ffd89a", transparent: true, opacity: 0.06, depthWrite: false }),
    shadowCatcher: new MeshBasicMaterial({ color: "#000000" }),
  };
}
export type Materials = ReturnType<typeof createMaterials>;
