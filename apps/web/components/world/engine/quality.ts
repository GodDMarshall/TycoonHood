/**
 * Quality tiers for the campus. The decision (device gate, GPU gate, tier)
 * lives in core's gate.ts, which world-host.tsx runs through probe.ts before
 * three.js is fetched; the engine only reads the table and steps down.
 */
export { QUALITY, stepDown, FrameGovernor, GOVERNOR, cadenceOf, type Tier } from "@tycoonhood/core/src/world/gate";
