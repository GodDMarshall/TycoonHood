import { describe, it, expect } from "vitest";
import { MINING, xpRequiredForLevel } from "@tycoonhood/config";
import {
  BUILDING_IDS,
  WORLD_STATE_VERSION,
  levelProgress,
  miningView,
  programProgress,
  rankBuckets,
  rankOf,
  type WorldState,
} from "../src/world/state";

const NOW = new Date("2026-11-11T12:00:00.000Z");

describe("levelProgress", () => {
  it("agrees with xpRequiredForLevel", () => {
    for (let level = 1; level <= 30; level++) {
      const p = levelProgress(xpRequiredForLevel(level) + 7, level);
      expect(p.level).toBe(level);
      expect(p.xpFloor).toBe(xpRequiredForLevel(level));
      expect(p.xpNext).toBe(xpRequiredForLevel(level + 1));
      expect(p.xp).toBeGreaterThanOrEqual(p.xpFloor);
    }
    expect(levelProgress(0, 1)).toEqual({ level: 1, xp: 0, xpFloor: 0, xpNext: 500 });
  });
});

describe("programProgress", () => {
  it("is 0% with no lessons", () => {
    expect(programProgress(0, 0)).toEqual({ done: 0, lessons: 0, pct: 0 });
  });

  it("rounds to the nearest percent", () => {
    expect(programProgress(1, 3).pct).toBe(33);
    expect(programProgress(2, 3).pct).toBe(67);
    expect(programProgress(3, 3).pct).toBe(100);
  });

  it("never reports more done than there are lessons", () => {
    expect(programProgress(5, 3)).toEqual({ done: 3, lessons: 3, pct: 100 });
    expect(programProgress(-1, 3)).toEqual({ done: 0, lessons: 3, pct: 0 });
  });
});

describe("miningView", () => {
  it("shows a rig that has not started at level 1, with nothing waiting", () => {
    const v = miningView(null, null, NOW);
    expect(v).toEqual({
      started: false,
      rigLevel: 1,
      maxLevel: MINING.maxLevel,
      ratePerHour: MINING.baseRatePerHour.toString(),
      capacity: (MINING.baseRatePerHour * BigInt(MINING.capacityHours)).toString(),
      accrued: "0",
      full: false,
      wallet: "0",
    });
  });

  it("caps what is waiting at storage", () => {
    const v = miningView({ rigLevel: 3, lastClaimAt: new Date(0) }, 1_234n, NOW);
    expect(v.started).toBe(true);
    expect(v.accrued).toBe(v.capacity);
    expect(v.capacity).toBe((MINING.baseRatePerHour * 3n * BigInt(MINING.capacityHours)).toString());
    expect(v.full).toBe(true);
    expect(v.wallet).toBe("1234");
  });

  it("accrues by the hour", () => {
    const v = miningView({ rigLevel: 2, lastClaimAt: new Date(NOW.getTime() - 30 * 60_000) }, 0n, NOW);
    expect(v.accrued).toBe(((MINING.baseRatePerHour * 2n) / 2n).toString());
    expect(v.full).toBe(false);
  });

  it("sends every amount as a decimal string", () => {
    const v = miningView({ rigLevel: 10, lastClaimAt: new Date(NOW.getTime() - 3_600_000) }, 10n ** 15n, NOW);
    for (const k of ["ratePerHour", "capacity", "accrued", "wallet"] as const) {
      expect(typeof v[k]).toBe("string");
      expect(v[k]).toMatch(/^\d+$/);
    }
    expect(v.wallet).toBe("1000000000000000");
  });
});

describe("ranks", () => {
  const defs = [
    { id: "r3", name: "Tycoon", sortOrder: 3 },
    { id: "r1", name: "Recruit", sortOrder: 1 },
    { id: "r2", name: "Builder", sortOrder: 2 },
  ];

  it("lists every rank in ladder order, drops members without one, and marks yours once", () => {
    const buckets = rankBuckets(
      defs,
      [
        { rankId: "r2", members: 4 },
        { rankId: null, members: 99 },
        { rankId: "gone", members: 5 },
        { rankId: "r1", members: 10 },
      ],
      "r2"
    );
    expect(buckets).toEqual([
      { name: "Recruit", members: 10, you: false },
      { name: "Builder", members: 4, you: true },
      { name: "Tycoon", members: 0, you: false },
    ]);
    expect(buckets.filter((b) => b.you)).toHaveLength(1);
    expect(rankBuckets(defs, [], null).some((b) => b.you)).toBe(false);
  });

  it("places the viewer on the ladder", () => {
    expect(rankOf(defs, "r2")).toEqual({ name: "Builder", index: 2, total: 3 });
    expect(rankOf(defs, null)).toBeNull();
    expect(rankOf(defs, "gone")).toBeNull();
  });
});

describe("the contract", () => {
  it("keeps the buildings in walking order", () => {
    expect(BUILDING_IDS).toEqual(["today", "courses", "community", "leaderboard", "mining", "store"]);
  });

  const sample: WorldState = {
    v: WORLD_STATE_VERSION,
    asOf: NOW.toISOString(),
    me: { ...levelProgress(820, 2), rank: { name: "Builder", index: 2, total: 5 } },
    today: {
      standard: { ticked: 2, total: 4, met: false },
      streak: { current: 3, longest: 9 },
      next: { slug: "warrior", course: "Warrior", lessonId: "l2", lesson: "Lesson two" },
    },
    courses: {
      programs: [{ slug: "warrior", title: "Warrior", pillar: "WARRIOR", ...programProgress(1, 3), next: { lessonId: "l2", lesson: "Lesson two" } }],
      certificates: 1,
    },
    community: { unread: 4, challengesJoined: 1 },
    leaderboard: {
      week: { hidden: false, xp: 120, position: 7 },
      achievements: { earned: 3, shown: 12 },
      ranks: rankBuckets([{ id: "r1", name: "Builder", sortOrder: 1 }], [{ rankId: "r1", members: 20 }], "r1"),
    },
    mining: miningView({ rigLevel: 2, lastClaimAt: new Date(NOW.getTime() - 3_600_000) }, 5_000n, NOW),
    store: { cart: 2, wishlist: 1, orders: 3, affiliate: "PENDING" },
    presence: { today: 5, courses: 12, community: 30, leaderboard: 2, mining: 9, store: null },
  };

  it("is JSON-safe", () => {
    const json = JSON.stringify(sample);
    expect(JSON.parse(json)).toEqual(sample);
  });

  it("carries no field that names a person", () => {
    const deny = new Set(["email", "username", "userId", "name", "displayName", "avatarUrl", "payoutMethod", "statusReason", "isAdmin"]);
    // `name` appears only where it names a rank, never a member.
    const rankName = /^(me\.rank|leaderboard\.ranks\.\d+)\.name$/;
    const hits: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${i}`));
      else if (v && typeof v === "object")
        for (const [k, x] of Object.entries(v)) {
          const at = path ? `${path}.${k}` : k;
          if (deny.has(k) && !rankName.test(at)) hits.push(at);
          walk(x, at);
        }
    };
    walk(sample, "");
    expect(hits).toEqual([]);
    expect(Object.keys(sample.leaderboard.ranks[0])).toEqual(["name", "members", "you"]);
  });
});
