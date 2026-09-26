/**
 * TYCOONHOOD HQ — the district plan.
 *
 * One source for the 3D scene, the static architectural drawing, and the
 * link overlay. Every district is a room of the product that exists today;
 * its href is a real route. The plan is in scene units: x to the right,
 * z toward the viewer, y up. The core sits at the origin.
 *
 * Nothing here is decoration: the pathways drawn from each district to the
 * core are the product's actual shape — every room feeds one ledger.
 */
export type DistrictId = "command" | "academy" | "arena" | "vault" | "treasury" | "network";
export type DistrictForm = "tower" | "colonnade" | "ring" | "vault" | "coins" | "lattice";

export type District = {
  id: DistrictId;
  name: string;
  note: string;
  form: DistrictForm;
  /** Plan position (x, z) in scene units. */
  at: [number, number];
  /** Height of the label anchor above the ground. */
  anchor: number;
  guestHref: string;
  memberHref: string;
  /** What a guest is told when the room is members-only. */
  guestNote?: string;
};

export const DISTRICTS: District[] = [
  {
    id: "command",
    name: "Command Center",
    note: "Your seat. Today's mission, your streak, your rank.",
    form: "tower",
    at: [0, 0],
    anchor: 8.3,
    guestHref: "/register",
    memberHref: "/dashboard",
    guestNote: "Take your seat — free to join",
  },
  {
    id: "academy",
    name: "Academy",
    note: "Four programs, one per pillar.",
    form: "colonnade",
    at: [-5.6, 1.2],
    anchor: 3.1,
    guestHref: "/programs",
    memberHref: "/academy",
  },
  {
    id: "arena",
    name: "Arena",
    note: "Challenges with real completion criteria.",
    form: "ring",
    at: [-2.6, 5.4],
    anchor: 2.2,
    guestHref: "/challenges",
    memberHref: "/challenges",
  },
  {
    id: "vault",
    name: "Vault",
    note: "Gear and library, bought with THC.",
    form: "vault",
    at: [3.6, 5.0],
    anchor: 3.2,
    guestHref: "/marketplace",
    memberHref: "/marketplace",
  },
  {
    id: "treasury",
    name: "Treasury",
    note: "One quadrillion, minted once. Books open.",
    form: "coins",
    at: [6.0, 0.4],
    anchor: 2.9,
    guestHref: "/thc",
    memberHref: "/thc",
  },
  {
    id: "network",
    name: "Network",
    note: "Members, ranked in the open.",
    form: "lattice",
    at: [-1.2, -6.6],
    anchor: 3.6,
    guestHref: "/register",
    memberHref: "/leaderboard",
    guestNote: "Members only — join to enter",
  },
];

export function districtHref(d: District, member: boolean) {
  return member ? d.memberHref : d.guestHref;
}
