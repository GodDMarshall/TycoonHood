/**
 * Safety guard for the academy seed. Rebuilding a course deletes its modules,
 * which cascades to lessons and every member's LessonProgress on them. The
 * seed refuses to do that to a course with real progress unless the operator
 * says so explicitly with SEED_ACADEMY_FORCE=1.
 */
export type RebuildDecision = { rebuild: true } | { rebuild: false; reason: string };

export function academyRebuildDecision(opts: { slug: string; progressRows: number; force: string | undefined }): RebuildDecision {
  if (opts.progressRows === 0) return { rebuild: true };
  if (opts.force === "1") return { rebuild: true };
  return {
    rebuild: false,
    reason:
      `refusing to rebuild "${opts.slug}": ${opts.progressRows} lesson-progress row(s) exist and a rebuild would erase them. ` +
      `Edit it in /admin/courses instead, or re-run with SEED_ACADEMY_FORCE=1 if you really mean to reset this curriculum.`,
  };
}
