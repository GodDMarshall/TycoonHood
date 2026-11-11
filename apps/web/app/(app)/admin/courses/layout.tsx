import type { ReactNode } from "react";
import Link from "next/link";

/** Course management sub-sections. Every page under here re-checks its own permission. */
export default function AdminCoursesLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav aria-label="Course management" className="mb-6 flex flex-wrap gap-4 border-b border-line pb-3 text-[13.5px]">
        <Link href="/admin/courses" className="text-ink-2 hover:text-ink-1">
          Programs
        </Link>
        <Link href="/admin/courses/instructors" className="text-ink-2 hover:text-ink-1">
          Instructors
        </Link>
        <Link href="/admin/courses/reviews" className="text-ink-2 hover:text-ink-1">
          Reviews
        </Link>
      </nav>
      {children}
    </div>
  );
}
