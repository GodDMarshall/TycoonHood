/**
 * Mining parameters, in a module of their own.
 *
 * mining-time.ts reads these at module scope, and index.ts re-exports
 * mining-time — so if MINING lived in index.ts the two would form a cycle and
 * the constant would be read before it was initialised. One small file removes
 * the whole class of problem.
 */
/** THE MINER — distribution parameters. Mining never mints: it pays from
 *  the finite MINING_POOL. Upgrades burn THC back through spend(). */
export const MINING = {
  baseRatePerHour: 12n, // THC/h at rig level 1; level N mines N× this
  capacityHours: 10, // storage: hours of production before the rig idles
  maxLevel: 10,
  /** upgradeCosts[currentLevel] = THC to reach currentLevel+1 */
  upgradeCosts: [0n, 500n, 1_500n, 4_000n, 10_000n, 25_000n, 60_000n, 140_000n, 320_000n, 700_000n] as bigint[],
} as const;
