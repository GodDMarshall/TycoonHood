/**
 * THE DAILY STANDARD
 *
 * The working day of a member, written down. The house sets the standard
 * (StandardItem.userId = null); a member may hold up to MAX_OWN items of
 * their own. A day is MET when every item in force is ticked. The record —
 * one StandardDay row per met day — is what the profile shows. Nothing here
 * is a game: no points are invented in this file.
 *
 *   • The first tick of a member's day is "showing up": it emits DAILY_ACTIVE,
 *     so the existing check-in mission decides what that is worth.
 *   • Meeting the whole standard advances the streak.
 *   • Items with an autoEvent tick themselves from real activity (Study ticks
 *     when a lesson is completed) and can never be ticked by hand.
 *
 * Days are the member's local days (Profile.timezone), like streaks.
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { dayKeyToDate, localDayKey, localDayKeyOffset } from "../time/day";
import { StreakService } from "../gamification/streaks";

export const MAX_OWN_STANDARD_ITEMS = 5;
export const STANDARD_TITLE_MAX = 60;
export const STANDARD_DETAIL_MAX = 140;

export class StandardError extends Error {}

export interface StandardItemView {
  id: string;
  title: string;
  detail: string | null;
  /** Ticks itself from real activity; cannot be ticked by hand. */
  auto: boolean;
  /** The member's own item, not the house's. */
  own: boolean;
  ticked: boolean;
}

export interface StandardToday {
  day: string;
  items: StandardItemView[];
  ticked: number;
  total: number;
  met: boolean;
}

export interface StandardHistoryDay {
  day: string;
  met: boolean;
  ticked: number;
}

export class StandardService {
  private streaks: StreakService;

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.streaks = new StreakService(db);
  }

  private async timezone(userId: string) {
    return (await this.db.profile.findUnique({ where: { userId }, select: { timezone: true } }))?.timezone ?? null;
  }

  /** Every item in force for this member right now: the house's, then their own. */
  private async itemsInForce(userId: string) {
    const items = await this.db.standardItem.findMany({
      where: { active: true, OR: [{ userId: null }, { userId }] },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    // House first, then own — a member's additions never reorder the house's.
    return [...items.filter((i) => i.userId === null), ...items.filter((i) => i.userId !== null)];
  }

  /** Today's standard for a member, with what is ticked. */
  async today(userId: string, now = new Date()): Promise<StandardToday> {
    const tz = await this.timezone(userId);
    const day = localDayKey(now, tz);
    const [items, ticks] = await Promise.all([
      this.itemsInForce(userId),
      this.db.standardTick.findMany({ where: { userId, day: dayKeyToDate(day) }, select: { itemId: true } }),
    ]);
    const done = new Set(ticks.map((t) => t.itemId));
    const views = items.map((i) => ({
      id: i.id,
      title: i.title,
      detail: i.detail,
      auto: !!i.autoEvent,
      own: i.userId !== null,
      ticked: done.has(i.id),
    }));
    const ticked = views.filter((v) => v.ticked).length;
    return { day, items: views, ticked, total: views.length, met: views.length > 0 && ticked === views.length };
  }

  /** Tick an item by hand. Idempotent within the day. */
  async tick(userId: string, itemId: string, now = new Date()): Promise<StandardToday> {
    const item = await this.db.standardItem.findUnique({ where: { id: itemId } });
    if (!item || !item.active || (item.userId !== null && item.userId !== userId)) {
      throw new StandardError("That item is not on your standard.");
    }
    if (item.autoEvent) throw new StandardError("This one ticks itself when you do the work.");
    const tz = await this.timezone(userId);
    await this.record(userId, [itemId], localDayKey(now, tz), now);
    return this.today(userId, now);
  }

  /** Untick a hand-ticked item, today only. The streak is not taken back. */
  async untick(userId: string, itemId: string, now = new Date()): Promise<StandardToday> {
    const item = await this.db.standardItem.findUnique({ where: { id: itemId } });
    if (!item || (item.userId !== null && item.userId !== userId)) {
      throw new StandardError("That item is not on your standard.");
    }
    if (item.autoEvent) throw new StandardError("This one is recorded from your activity and cannot be unticked.");
    const tz = await this.timezone(userId);
    const day = dayKeyToDate(localDayKey(now, tz));
    await this.db.standardTick.deleteMany({ where: { userId, itemId, day } });
    // The record says "met" only while it is true.
    const today = await this.today(userId, now);
    if (!today.met) await this.db.standardDay.deleteMany({ where: { userId, day } });
    return today;
  }

  /** Tick every item that listens for this event. Called from real activity. */
  async autoTick(userId: string, event: string, now = new Date()) {
    const items = await this.db.standardItem.findMany({
      where: { active: true, autoEvent: event, OR: [{ userId: null }, { userId }] },
      select: { id: true },
    });
    if (items.length === 0) return;
    const tz = await this.timezone(userId);
    await this.record(
      userId,
      items.map((i) => i.id),
      localDayKey(now, tz),
      now
    );
  }

  /** Write ticks, then settle what they mean: showing up, and meeting the day. */
  private async record(userId: string, itemIds: string[], dayKey: string, now: Date) {
    const day = dayKeyToDate(dayKey);
    const before = await this.db.standardTick.count({ where: { userId, day } });
    for (const itemId of itemIds) {
      try {
        await this.db.standardTick.create({ data: { userId, itemId, day, tickedAt: now } });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }

    // Showing up: the first tick of the member's day. The check-in mission
    // decides what that is worth (its cooldown makes a repeat harmless).
    if (before === 0) {
      const { events } = await import("../events/bus");
      await events.emit({ type: "DAILY_ACTIVE", userId, at: now });
    }

    const today = await this.today(userId, now);
    if (today.met) {
      try {
        await this.db.standardDay.create({ data: { userId, day, items: today.total, metAt: now } });
        // A met day is a day of action: it advances the streak once.
        await this.streaks.touch(userId, now);
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
  }

  /** The last `days` local days, oldest first, for the record. */
  async history(userId: string, days = 28, now = new Date()) {
    const tz = await this.timezone(userId);
    const keys = Array.from({ length: days }, (_, i) => localDayKeyOffset(now, tz, i - (days - 1)));
    const from = dayKeyToDate(keys[0]);
    const [met, ticks] = await Promise.all([
      this.db.standardDay.findMany({ where: { userId, day: { gte: from } }, select: { day: true } }),
      this.db.standardTick.groupBy({ by: ["day"], where: { userId, day: { gte: from } }, _count: { _all: true } }),
    ]);
    const metSet = new Set(met.map((m) => m.day.toISOString().slice(0, 10)));
    const tickMap = new Map(ticks.map((t) => [t.day.toISOString().slice(0, 10), t._count._all]));
    const out: StandardHistoryDay[] = keys.map((k) => ({ day: k, met: metSet.has(k), ticked: tickMap.get(k) ?? 0 }));
    const metDays = out.filter((d) => d.met).length;
    return { days: out, metDays };
  }

  /** Total days the member has met the standard, ever. */
  async metDaysTotal(userId: string) {
    return this.db.standardDay.count({ where: { userId } });
  }

  // ─────────────────────────────── a member's own items

  async addOwn(userId: string, input: { title: string; detail?: string | null }) {
    const title = input.title.trim();
    const detail = input.detail?.trim() || null;
    if (title.length < 2 || title.length > STANDARD_TITLE_MAX) {
      throw new StandardError(`Give it a name of 2 to ${STANDARD_TITLE_MAX} characters.`);
    }
    if (detail && detail.length > STANDARD_DETAIL_MAX) {
      throw new StandardError(`Keep the detail under ${STANDARD_DETAIL_MAX} characters.`);
    }
    const count = await this.db.standardItem.count({ where: { userId, active: true } });
    if (count >= MAX_OWN_STANDARD_ITEMS) {
      throw new StandardError(`You can hold ${MAX_OWN_STANDARD_ITEMS} items of your own. Remove one first.`);
    }
    return this.db.standardItem.create({ data: { userId, title, detail, sortOrder: count } });
  }

  async removeOwn(userId: string, itemId: string) {
    const r = await this.db.standardItem.updateMany({ where: { id: itemId, userId }, data: { active: false } });
    if (r.count === 0) throw new StandardError("That item is not one of yours.");
  }

  // ─────────────────────────────── the house standard (admin)

  async houseItems() {
    return this.db.standardItem.findMany({ where: { userId: null }, orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });
  }

  async saveHouseItem(input: { id?: string; title: string; detail?: string | null; autoEvent?: string | null; sortOrder?: number }) {
    const title = input.title.trim();
    const detail = input.detail?.trim() || null;
    if (title.length < 2 || title.length > STANDARD_TITLE_MAX) {
      throw new StandardError(`Give it a name of 2 to ${STANDARD_TITLE_MAX} characters.`);
    }
    if (detail && detail.length > STANDARD_DETAIL_MAX) {
      throw new StandardError(`Keep the detail under ${STANDARD_DETAIL_MAX} characters.`);
    }
    const autoEvent = input.autoEvent || null;
    if (autoEvent && !AUTO_EVENTS.includes(autoEvent as AutoEvent)) throw new StandardError("Unknown automatic source.");
    const data = { title, detail, autoEvent, sortOrder: input.sortOrder ?? 0 };
    if (input.id) {
      return this.db.standardItem.update({ where: { id: input.id, userId: null }, data });
    }
    return this.db.standardItem.create({ data: { ...data, userId: null } });
  }

  async setHouseItemActive(id: string, active: boolean) {
    await this.db.standardItem.update({ where: { id, userId: null }, data: { active } });
  }
}

/** The activities a standard item may tick itself from. */
export const AUTO_EVENTS = ["LESSON_COMPLETED"] as const;
export type AutoEvent = (typeof AUTO_EVENTS)[number];

export const standard = new StandardService();
