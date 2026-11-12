/**
 * WHAT THE SEEDS HAVE MADE
 *
 * A re-run makes only what the seeds have never made (DR-33). Seeded rows are
 * found by slug or SKU, and staff can change both in the admin: a mission's
 * slug in /admin/missions, a size's SKU in /admin/products, and an essay's,
 * a community category's or a group's slug. Found by those alone, a renamed
 * row looked missing and was made again under its old name, live: a mission
 * paid its reward a second time, and a size came back on sale with stock that
 * is not there (review finding 17, follow-up).
 *
 * So the seeds record the slugs and SKUs they made, one SiteSetting per kind
 * ("seed.created.missions" holds { keys: [...] }), as seed-academy records the
 * programmes it built. A recorded key is never made again, whether staff
 * renamed its row or removed it. A key not recorded yet is made if it is
 * missing, then recorded, so an item a later release adds to the seed files
 * still arrives.
 *
 * The first run after the records began finds none. On a new database it
 * makes everything. On one an older seed filled, it counts every key of a
 * group as made when any of that group is there: an older seed made each
 * group in one run, so a missing one was renamed or removed by staff.
 */
import { prisma } from "./client";

export class SeedRecord {
  private constructor(
    private readonly setting: string,
    private readonly keys: Set<string>
  ) {}

  /**
   * The record for one kind of row. `groups` are the keys this seed makes, in
   * the groups it makes them in. `existing` says which of the given keys the
   * database holds now; it is asked only when there is no record yet.
   */
  static async load(kind: string, groups: string[][], existing: (keys: string[]) => Promise<string[]>) {
    const setting = `seed.created.${kind}`;
    let row = await prisma.siteSetting.findUnique({ where: { key: setting } });
    if (!row) {
      const found = new Set(await existing(groups.flat()));
      const made = groups.filter((g) => g.some((k) => found.has(k))).flat();
      // update: {} keeps a record another seed wrote in the meantime.
      row = await prisma.siteSetting.upsert({ where: { key: setting }, update: {}, create: { key: setting, value: { keys: made } } });
    }
    return new SeedRecord(setting, new Set(keysOf(row.value)));
  }

  /**
   * Makes the row for `key`, unless the seeds made it before, and records it.
   * `make` must create the row only when it is missing, as an upsert with
   * `update: {}` does. Resolves true when it ran `make`.
   */
  async once(key: string, make: () => Promise<unknown>): Promise<boolean> {
    if (this.keys.has(key)) return false;
    await make();
    // One statement, so two seeds recording at once cannot drop each other's keys.
    await prisma.$executeRaw`
      INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
      VALUES (${this.setting}, jsonb_build_object('keys', jsonb_build_array(${key}::text)), now() AT TIME ZONE 'UTC')
      ON CONFLICT ("key") DO UPDATE
      SET "value" = jsonb_set(
            "SiteSetting"."value", '{keys}',
            COALESCE("SiteSetting"."value" -> 'keys', '[]'::jsonb) || jsonb_build_array(${key}::text)
          ),
          "updatedAt" = now() AT TIME ZONE 'UTC'
      WHERE NOT COALESCE("SiteSetting"."value" -> 'keys', '[]'::jsonb) @> jsonb_build_array(${key}::text)`;
    this.keys.add(key);
    return true;
  }
}

function keysOf(value: unknown): string[] {
  const keys = (value as { keys?: unknown } | null)?.keys;
  return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === "string") : [];
}
