import type { ReactNode } from "react";
import Link from "next/link";
import { can, canModerateReviews } from "@tycoonhood/core";
import { getCurrentUser } from "../../../../lib/auth";

/** Course management sub-sections. Every page under here re-checks its own permission.
 *  Moderators come here for reviews only, so they see only that link; instructors do not moderate reviews (DR-34). */
export default async function AdminCoursesLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const author = can(user, "courses.author");
  const reviews = canModerateReviews(user);
  return (
    <div>
      <nav aria-label="Course management" className="mb-6 flex flex-wrap gap-4 border-b border-line pb-3 text-[13.5px]">
        {author && (
          <>
            <Link href="/admin/courses" className="text-ink-2 hover:text-ink-1">
              Programs
            </Link>
            <Link href="/admin/courses/instructors" className="text-ink-2 hover:text-ink-1">
              Instructors
            </Link>
          </>
        )}
        {reviews && (
          <Link href="/admin/courses/reviews" className="text-ink-2 hover:text-ink-1">
            Reviews
          </Link>
        )}
      </nav>
      {children}
    </div>
  );
}
