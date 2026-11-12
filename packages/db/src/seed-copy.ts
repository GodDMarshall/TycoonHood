/**
 * SEEDED COPY — achievements and challenges have no admin for their copy, so
 * the seeds keep it current. A re-run on an untouched database must still
 * change nothing (DR-33), and both tables keep an updatedAt that Prisma sets
 * on every update, changed or not. So the copy is written only when it
 * differs from what is stored.
 */

/** A value with its object keys in one order and BigInts as text, so equal values compare equal. */
function canonical(v: unknown): unknown {
  if (typeof v === "bigint") return `${v}n`;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, canonical(o[k])]));
  }
  return v;
}

/** True when the stored row already holds every field of `copy`. */
export function holdsCopy(row: object, copy: object): boolean {
  const stored = row as Record<string, unknown>;
  return Object.entries(copy).every(([k, v]) => JSON.stringify(canonical(stored[k])) === JSON.stringify(canonical(v)));
}
