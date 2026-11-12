// n8ao ships no type declarations; this covers the surface the world uses.
declare module "n8ao" {
  import type { Camera, Scene } from "three";
  import { Pass } from "postprocessing";
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    scene: Scene;
    enabled: boolean;
    configuration: {
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      halfRes: boolean;
      gammaCorrection: boolean;
      aoSamples: number;
      denoiseSamples: number;
      denoiseRadius: number;
      color: import("three").Color;
    };
    setSize(width: number, height: number): void;
  }
}
