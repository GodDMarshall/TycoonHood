/**
 * When the academy seed builds a programme's curriculum.
 *
 * The seed builds each programme once, from the curriculum files. After that
 * the curriculum is staff's: they edit its lessons, modules, quizzes, details,
 * status and instructor in /admin/courses, and a re-run must not undo any of
 * it (DR-33, review finding 17). So a programme is built only when it has
 * never been built: the seed has no record of building it, and it has no
 * modules (a programme an older seed built, before the record existed, has
 * its modules and counts as built).
 *
 * SEED_ACADEMY_FORCE=1 rebuilds it from the files anyway. That deletes the
 * modules, which cascades to lessons, quizzes and every member's
 * LessonProgress on them, so the reason says what would be lost.
 */
export type RebuildDecision = { rebuild: true } | { rebuild: false; reason: string };

export function academyRebuildDecision(opts: {
  slug: string;
  /** The seed has recorded building this programme (SiteSetting ACADEMY_BUILT_SETTING). */
  built: boolean;
  modules: number;
  progressRows: number;
  force: string | undefined;
}): RebuildDecision {
  if (opts.force === "1") return { rebuild: true };
  if (!opts.built && opts.modules === 0) return { rebuild: true };
  const progress = opts.progressRows > 0 ? `, and erases ${opts.progressRows} lesson-progress row(s)` : "";
  return {
    rebuild: false,
    reason:
      `${opts.slug}: already built, left as it is. Staff edit it in /admin/courses. ` +
      `SEED_ACADEMY_FORCE=1 rebuilds it from the curriculum files, which undoes every edit made since${progress}.`,
  };
}

/** The SiteSetting row that lists, by slug, the programmes the academy seed has built. */
export const ACADEMY_BUILT_SETTING = "seed.academy.built";
