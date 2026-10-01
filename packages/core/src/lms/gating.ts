/**
 * LESSON GATING — one rule, used by the server and by every screen.
 *
 * A program is a sequence. A lesson opens when every lesson before it is
 * complete, so the member is always looking at exactly one next step. A
 * completed lesson stays open forever (review is never locked). Order is the
 * module's sortOrder, then the lesson's, then id, so ties cannot reorder a
 * member's path between two requests.
 *
 * Preview lessons are READABLE before enrolling. That is a separate question
 * from completion, which always follows this order.
 */

export type LessonState = "done" | "open" | "locked";

export interface GateLesson {
  id: string;
  title: string;
  sortOrder: number;
  moduleSortOrder: number;
  completed: boolean;
}

export interface Gate {
  state: LessonState;
  /** For a locked lesson: the lesson that must be finished first. */
  blockedBy?: { id: string; title: string };
}

/** Lessons in the order a member walks them. */
export function orderLessons<T extends Pick<GateLesson, "id" | "sortOrder" | "moduleSortOrder">>(lessons: T[]): T[] {
  return [...lessons].sort(
    (a, b) => a.moduleSortOrder - b.moduleSortOrder || a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/** The state of every lesson in a program, keyed by lesson id. */
export function gateLessons(lessons: GateLesson[]): Map<string, Gate> {
  const out = new Map<string, Gate>();
  let firstOpen: { id: string; title: string } | null = null;
  for (const l of orderLessons(lessons)) {
    if (l.completed) out.set(l.id, { state: "done" });
    else if (!firstOpen) {
      firstOpen = { id: l.id, title: l.title };
      out.set(l.id, { state: "open" });
    } else out.set(l.id, { state: "locked", blockedBy: firstOpen });
  }
  return out;
}

/** The member's next lesson in a program, or null when everything is done. */
export function nextLesson(lessons: GateLesson[]): GateLesson | null {
  return orderLessons(lessons).find((l) => !l.completed) ?? null;
}
