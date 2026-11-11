/**
 * The six sections of the optional 3D campus (DR-30), one per building.
 *
 * One table, shared by the server's 2D page (fallback.tsx) and the client's
 * HUD (hud/panels.tsx), so a building and its card always say the same
 * thing. Pure: no three, no server imports, no DOM. Every href is a current
 * route of the 2D app, and every name is the product's own word (DR-24).
 *
 * Figures are the member's own, from WorldState. Presence is a house-wide
 * count for the last 24 hours, never a person (DR-22); the store shows none.
 */
import type { IconName } from "@tycoonhood/ui";
import type { BuildingId, WorldState } from "@tycoonhood/core/src/world/state";

export type SectionLink = { href: string; label: string };

export type Section = {
  id: BuildingId;
  name: string;
  href: string;
  icon: IconName;
  /** Every page the building leads to, its own page first. */
  links: SectionLink[];
  /** The house-wide count for the last 24 hours as a sentence, or null. */
  presence: (n: number | null) => string | null;
};

/** Thousands separators for a whole number, or a bigint sent as a decimal string. */
export function num(v: number | string): string {
  const s = String(v);
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  if (!/^\d+$/.test(digits)) return s;
  return (neg ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;
const lastDay = (one: string, many: string) => (n: number | null) => (n === null ? null : `${plural(n, one, many)} in the last 24 hours`);

/** The buildings in walking order, the same order as the campus and the dock. */
export const SECTIONS: readonly Section[] = [
  {
    id: "today",
    name: "Today",
    href: "/today",
    icon: "today",
    links: [{ href: "/today", label: "Today" }],
    presence: lastDay("member met their standard", "members met their standard"),
  },
  {
    id: "courses",
    name: "Courses",
    href: "/courses",
    icon: "courses",
    links: [
      { href: "/courses", label: "Courses" },
      { href: "/certificates", label: "Certificates" },
    ],
    presence: lastDay("lesson completed", "lessons completed"),
  },
  {
    id: "community",
    name: "Community",
    href: "/community",
    icon: "chat",
    links: [
      { href: "/community", label: "Community" },
      { href: "/community/discussions", label: "Discussions" },
      { href: "/challenges", label: "Challenges" },
    ],
    presence: lastDay("post", "posts"),
  },
  {
    id: "leaderboard",
    name: "Leaderboard",
    href: "/leaderboard",
    icon: "leaderboard",
    links: [
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/achievements", label: "Achievements" },
    ],
    presence: lastDay("achievement unlocked", "achievements unlocked"),
  },
  {
    id: "mining",
    name: "Mining",
    href: "/mining",
    icon: "miner",
    links: [
      { href: "/mining", label: "Mining" },
      { href: "/wallet", label: "Wallet" },
    ],
    presence: lastDay("mining claim", "mining claims"),
  },
  {
    id: "store",
    name: "Store",
    href: "/store",
    icon: "store",
    links: [
      { href: "/store", label: "Store" },
      { href: "/cart", label: "Cart" },
      { href: "/wishlist", label: "Wishlist" },
      { href: "/orders", label: "Orders" },
      { href: "/earnings", label: "Earn" },
    ],
    // Money and sales are never shown as activity.
    presence: () => null,
  },
];

export const SECTION = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<BuildingId, Section>;

/** The presence sentence for a building, from the house-wide counts. */
export function presenceLine(id: BuildingId, s: WorldState): string | null {
  return SECTION[id].presence(s.presence[id]);
}

/** The Discussions station's sentence: the discussions feed's posts only, not chat. */
export function discussionsLine(s: WorldState): string | null {
  return lastDay("discussion post", "discussion posts")(s.presence.discussions);
}

/** A building's links. A member hidden from the leaderboard also gets the setting that hides them. */
export function linksFor(id: BuildingId, s: WorldState): SectionLink[] {
  const links = SECTION[id].links;
  if (id === "leaderboard" && s.leaderboard.week.hidden) return [...links, { href: "/settings", label: "Settings" }];
  return links;
}

export type Fact = { label: string; value: string };

const AFFILIATE: Record<WorldState["store"]["affiliate"], string> = {
  NONE: "Not joined",
  PENDING: "Pending",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  REJECTED: "Not approved",
};

export const lessonHref = (slug: string, lessonId: string) => `/courses/${slug}/lesson/${lessonId}`;

/** The leaderboard's line for this week, in the member's own terms. */
export function weekLine(w: WorldState["leaderboard"]["week"]): string {
  if (w.hidden) return "You're hidden from the leaderboard";
  if (w.position === null) return "No XP yet this week";
  return `#${num(w.position)} · ${num(w.xp)} XP`;
}

/** Storage as the rig shows it: what is waiting, or full. */
export function storageLine(m: WorldState["mining"]): string {
  return m.full ? "Storage full" : `${num(m.accrued)} of ${num(m.capacity)} THC`;
}

/** One to four of the member's own figures for a building. */
export function facts(id: BuildingId, s: WorldState): Fact[] {
  switch (id) {
    case "today": {
      const { standard, streak } = s.today;
      const me = s.me;
      return [
        {
          label: "Standard",
          value: standard.total === 0 ? "Nothing to tick yet" : standard.met ? `Met · ${standard.ticked} of ${standard.total}` : `${standard.ticked} of ${standard.total}`,
        },
        { label: "Streak", value: `${plural(streak.current, "day", "days")} · best ${num(streak.longest)}` },
        { label: "Level", value: `${me.level} · ${num(Math.max(0, me.xpNext - me.xp))} XP to level ${me.level + 1}` },
        { label: "Rank", value: me.rank ? `${me.rank.name} · ${me.rank.index} of ${me.rank.total}` : "None yet" },
      ];
    }
    case "courses":
      // The programs themselves are listed by the card and the room.
      return [{ label: "Certificates", value: num(s.courses.certificates) }];
    case "community":
      return [
        { label: "Unread", value: num(s.community.unread) },
        { label: "Challenges joined", value: num(s.community.challengesJoined) },
      ];
    case "leaderboard": {
      const mine = s.leaderboard.ranks.find((r) => r.you);
      return [
        { label: "This week", value: weekLine(s.leaderboard.week) },
        { label: "Achievements", value: `${num(s.leaderboard.achievements.earned)} of ${num(s.leaderboard.achievements.shown)}` },
        { label: "Your rank", value: mine ? `${mine.name} · ${plural(mine.members, "member", "members")}` : "None yet" },
      ];
    }
    case "mining": {
      const m = s.mining;
      return [
        { label: "Rig", value: m.started ? `Level ${m.rigLevel} of ${m.maxLevel}` : "Starts when you open Mining" },
        { label: "Rate", value: `${num(m.ratePerHour)} THC an hour` },
        { label: "Storage", value: storageLine(m) },
        { label: "Wallet", value: `${num(m.wallet)} THC` },
      ];
    }
    case "store":
      return [
        { label: "Cart", value: plural(s.store.cart, "item", "items") },
        { label: "Wishlist", value: plural(s.store.wishlist, "item", "items") },
        { label: "Orders", value: num(s.store.orders) },
        { label: "Earn", value: AFFILIATE[s.store.affiliate] },
      ];
  }
}
