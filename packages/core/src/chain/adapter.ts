/**
 * CHAIN ADAPTER (Blueprint D8 — Phase 12, LEGAL-GATED).
 *
 * THC is an internal, non-redeemable utility credit. Any on-chain
 * representation changes its legal character, so nothing beyond this
 * interface ships until counsel signs off. What this file guarantees
 * today:
 *
 *  1. The internal ledger is the source of truth. A chain, if one ever
 *     exists, MIRRORS the ledger — it never originates balance changes.
 *  2. The integration surface is exactly this interface, so the day the
 *     gate opens, implementation slots in without touching the economy.
 *  3. Until then, the active adapter is NullChainAdapter, which says so.
 *
 * A future adapter would be driven by an outbox worker replaying
 * LedgerTransaction rows in order (id + idempotencyKey give exactly-once
 * semantics); mirrorTransaction must therefore be idempotent per txId.
 */

export interface ChainAnchor {
  /** Chain-side identifier for a mirrored transaction (tx hash, etc.). */
  ref: string;
  chain: string;
  at: Date;
}

export interface ChainAdapter {
  readonly name: string;
  /** True only when a real chain integration is configured AND legally cleared. */
  readonly enabled: boolean;

  /** Mirror one settled internal transaction. MUST be idempotent per txId. */
  mirrorTransaction(tx: {
    id: string;
    idempotencyKey: string;
    reason: string;
    entries: { accountId: string; amount: bigint }[];
    createdAt: Date;
  }): Promise<ChainAnchor | null>;

  /** Read back an anchor for reconciliation/audit display. */
  getAnchor(txId: string): Promise<ChainAnchor | null>;
}

export class NullChainAdapter implements ChainAdapter {
  readonly name = "none";
  readonly enabled = false;
  async mirrorTransaction(): Promise<null> {
    return null; // Nothing pretends: no chain is configured.
  }
  async getAnchor(): Promise<null> {
    return null;
  }
}

/** The only adapter that exists pre-clearance. */
export function activeChainAdapter(): ChainAdapter {
  return new NullChainAdapter();
}
