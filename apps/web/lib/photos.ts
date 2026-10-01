/**
 * The house photographs. Real photos from Unsplash (Unsplash License), graded
 * to the house look by scripts/covers/run.mjs and stored in /public/photos —
 * credits in /public/photos/CREDITS.json.
 *
 * Each photo ships at two widths. Landscape photos are 1920×1080 and 960×540;
 * the portrait one is 1200×1600 and 600×800.
 */
export type PhotoName = "warrior" | "builder" | "tycoon" | "mind" | "iron" | "launch" | "ledger" | "standard" | "dawn";

const PORTRAIT: ReadonlySet<PhotoName> = new Set(["dawn"]);

export function photo(name: PhotoName) {
  const [big, small] = PORTRAIT.has(name) ? [1200, 600] : [1920, 960];
  return {
    src: `/photos/${name}-${big}.webp`,
    srcSet: `/photos/${name}-${small}.webp ${small}w, /photos/${name}-${big}.webp ${big}w`,
  };
}

/** Each program pillar's cover when an admin has not set one. */
export const PILLAR_PHOTO = { WARRIOR: "warrior", BUILDER: "builder", TYCOON: "tycoon", MIND: "mind" } as const satisfies Record<string, PhotoName>;

/** Seeded challenges' banners, by slug. Challenges not listed show none. */
export const CHALLENGE_PHOTO: Record<string, PhotoName> = {
  "30-days-of-iron": "iron",
  "launch-week": "launch",
  "the-one-percent-ledger": "ledger",
};
