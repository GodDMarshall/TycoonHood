/**
 * WATCH-TO-EARN — THC for genuinely watching Tycoonhood videos.
 *
 * The threat is obvious: a script that calls "finished" in a loop, or a tab
 * left muted in a corner. The defences are all server-side, because
 * anything the browser reports is a suggestion:
 *
 *   1. START IS STAMPED BY THE SERVER. A completion cannot settle earlier
 *      than requiredSec of real wall-clock after the row was created. No
 *      script outruns a clock.
 *   2. ONE PAYOUT PER VIDEO, FOR LIFE. Unique (userId, taskId) in the
 *      database, not a rule in code.
 *   3. A DAILY CAP in the member's own local day.
 *   4. HEARTBEATS. The client reports progress while the video plays; a
 *      completion with no intermediate heartbeats is refused, so opening
 *      and closing the page at the right interval is not enough.
 *
 * None of this makes farming impossible. It makes farming slower than
 * watching, which is the only honest goal.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { LedgerService } from "../ledger/ledger";
import { XpService } from "../gamification/xp";
import { localDayKey } from "../time/day";
import { WATCH } from "@tycoonhood/config";

export class WatchError extends Error {}
export class TooSoonError extends WatchError {}
export class DailyCapReachedError extends WatchError {}
export class AlreadyPaidError extends WatchError {}
export class NoProgressError extends WatchError {}

export class WatchService {
  private ledger: LedgerService;
  private xp: XpService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.ledger = new LedgerService(db);
    this.xp = new XpService(db);
  }

  private async dayKeyFor(userId: string, at = new Date()) {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    return localDayKey(at, profile?.timezone ?? undefined);
  }

  /** Published tasks, with this member's state on each. */
  async listFor(userId: string, at = new Date()) {
    const dayKey = await this.dayKeyFor(userId, at);
    const [tasks, completions] = await Promise.all([
      this.db.watchTask.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      this.db.watchCompletion.findMany({ where: { userId } }),
    ]);
    const byTask = new Map(completions.map((c) => [c.taskId, c]));
    const paidToday = completions.filter((c) => c.completedAt && c.dayKey === dayKey).length;

    return {
      dayKey,
      paidToday,
      dailyCap: WATCH.dailyTaskCap,
      capReached: paidToday >= WATCH.dailyTaskCap,
      tasks: tasks.map((t) => {
        const c = byTask.get(t.id);
        return {
          id: t.id,
          slug: t.slug,
          title: t.title,
          description: t.description,
          youtubeVideoId: t.youtubeVideoId,
          durationSec: t.durationSec,
          requiredSec: t.requiredSec,
          rewardThc: t.rewardThc,
          rewardXp: t.rewardXp,
          paid: !!c?.completedAt,
          startedAt: c?.startedAt ?? null,
          secondsWatched: c?.secondsWatched ?? 0,
        };
      }),
    };
  }

  /**
   * Opens a watch. Idempotent: reopening returns the original startedAt, so
   * closing and reopening the page does not reset the clock in the member's
   * favour — or against them.
   */
  async start(userId: string, taskSlug: string, at = new Date()) {
    const task = await this.db.watchTask.findUniqueOrThrow({ where: { slug: taskSlug } });
    if (!task.active) throw new WatchError("This task is not available.");

    const existing = await this.db.watchCompletion.findUnique({
      where: { userId_taskId: { userId, taskId: task.id } },
    });
    if (existing?.completedAt) throw new AlreadyPaidError("You have already been paid for this one.");
    if (existing) return { task, completion: existing, resumed: true };

    const dayKey = await this.dayKeyFor(userId, at);
    const paidToday = await this.db.watchCompletion.count({
      where: { userId, dayKey, completedAt: { not: null } },
    });
    if (paidToday >= WATCH.dailyTaskCap) {
      throw new DailyCapReachedError(
        `That is ${WATCH.dailyTaskCap} videos today — the rest are waiting tomorrow.`
      );
    }

    const completion = await this.db.watchCompletion.create({
      data: { userId, taskId: task.id, startedAt: at, dayKey },
    });
    return { task, completion, resumed: false };
  }

  /**
   * Progress ping from the player. Monotonic — the recorded figure only
   * ever goes up, so a client cannot walk it backwards and re-earn.
   */
  async heartbeat(userId: string, taskSlug: string, secondsWatched: number, at = new Date()) {
    const task = await this.db.watchTask.findUniqueOrThrow({ where: { slug: taskSlug } });
    const completion = await this.db.watchCompletion.findUnique({
      where: { userId_taskId: { userId, taskId: task.id } },
    });
    if (!completion) throw new WatchError("Start the video first.");
    if (completion.completedAt) return completion;

    // Never trust a figure larger than the wall-clock allows.
    const elapsed = Math.floor((at.getTime() - completion.startedAt.getTime()) / 1000);
    const honest = Math.max(0, Math.min(Math.floor(secondsWatched), elapsed, task.durationSec));
    if (honest <= completion.secondsWatched) return completion;

    return this.db.watchCompletion.update({
      where: { id: completion.id },
      data: { secondsWatched: honest },
    });
  }

  /** Settles a watch and pays, once. */
  async settle(userId: string, taskSlug: string, at = new Date()) {
    const task = await this.db.watchTask.findUniqueOrThrow({ where: { slug: taskSlug } });
    const completion = await this.db.watchCompletion.findUnique({
      where: { userId_taskId: { userId, taskId: task.id } },
    });
    if (!completion) throw new WatchError("Start the video first.");
    if (completion.completedAt) throw new AlreadyPaidError("You have already been paid for this one.");

    // 1. Real time must have passed.
    const elapsed = Math.floor((at.getTime() - completion.startedAt.getTime()) / 1000);
    const needed = task.requiredSec - WATCH.graceSec;
    if (elapsed < needed) {
      throw new TooSoonError(
        `Keep watching — about ${Math.max(1, needed - elapsed)} more seconds.`
      );
    }

    // 2. The player must have reported progress along the way. A single
    //    settle call with no heartbeats behind it is a script, not a viewer.
    if (completion.secondsWatched < needed) {
      throw new NoProgressError("The player did not report enough of the video as watched.");
    }

    // 3. The cap is checked again at settle time, not only at start.
    const dayKey = await this.dayKeyFor(userId, at);
    const paidToday = await this.db.watchCompletion.count({
      where: { userId, dayKey, completedAt: { not: null } },
    });
    if (paidToday >= WATCH.dailyTaskCap) {
      throw new DailyCapReachedError(
        `That is ${WATCH.dailyTaskCap} videos today — the rest are waiting tomorrow.`
      );
    }

    // Guarded transition: whoever flips completedAt from null pays.
    const claimed = await this.db.watchCompletion.updateMany({
      where: { id: completion.id, completedAt: null },
      data: { completedAt: at, dayKey },
    });
    if (claimed.count === 0) throw new AlreadyPaidError("You have already been paid for this one.");

    let rewardTxId: string | null = null;
    if (task.rewardThc > 0n) {
      const tx = await this.ledger.reward({
        userId,
        amount: task.rewardThc,
        reason: "REWARD_MISSION",
        idempotencyKey: `watch:${completion.id}`,
        sourceType: "watch",
        sourceId: task.id,
        memo: task.title,
      });
      rewardTxId = tx.id;
      await this.db.watchCompletion.update({ where: { id: completion.id }, data: { rewardTxId } });
    }
    if (task.rewardXp > 0) {
      await this.xp.awardXp({
        userId,
        amount: task.rewardXp,
        source: "WATCH_TASK",
        sourceId: task.id,
        idempotencyKey: `xp:watch:${completion.id}`,
      });
    }

    const { events } = await import("../events/bus");
    await events.emit({ type: "VIDEO_WATCHED", userId, videoTaskId: task.id });

    return { task, rewardThc: task.rewardThc, rewardXp: task.rewardXp, rewardTxId };
  }
}

export const watch = new WatchService();
