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

/**
 * The instructor the academy seed leaves on a house programme. Since DR-34 a
 * programme's instructor decides which account may edit it, and changing it is
 * a course manager's decision, made in the course admin and audited. So the
 * seed gives the founder only a programme that has no instructor, and never
 * moves one that has: re-running it, or deploying with SEED_ON_DEPLOY=1, must
 * not take a programme from the instructor an administrator assigned.
 */
export type InstructorDecision = { instructorId: string; note: string | null };

export function academyInstructorDecision(opts: { slug: string; current: string | null; founderId: string }): InstructorDecision {
  if (!opts.current) return { instructorId: opts.founderId, note: null };
  if (opts.current === opts.founderId) return { instructorId: opts.current, note: null };
  return {
    instructorId: opts.current,
    note: `"${opts.slug}" is taught by another instructor profile, chosen in /admin/courses; the seed leaves it as it is.`,
  };
}
