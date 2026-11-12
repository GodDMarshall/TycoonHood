// The optional 3D campus (DR-31). Server-side: the loader and its contract.
// The device gate is deliberately not re-exported: client code deep-imports
// "@tycoonhood/core/src/world/gate", which has no imports of its own.
export { loadWorldState } from "./load";
export { WORLD_STATE_VERSION, BUILDING_IDS } from "./state";
export type { WorldState, BuildingId } from "./state";
export type { WorldFallbackReason, WorldDecision, Tier } from "./gate";
