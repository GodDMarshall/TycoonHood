import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { IST_TIME_ZONE, REVIEW_MODERATORS, can, formatDate } from "@tycoonhood/core";
import { Badge } from "@tycoonhood/ui";
import { requireAnyPermission } from "../../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../../components/app/page";
import { InlineAction } from "../../../../../components/learning/admin/inline-action";
import { setReviewHiddenAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Reviews" };
export const dynamic = "force-dynamic";

/** Every program review, newest first. Hidden reviews stay stored but leave the average and the page.
 *  Community moderators and administrators moderate reviews here; instructors do not (DR-34). */
export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireAnyPermission(...REVIEW_MODERATORS);
  // A member's email is for staff who administer members, here as everywhere; it is not even loaded otherwise.
  const showEmail = can(user, "admin.users");
  const { show } = await searchParams;
  const hiddenOnly = show === "hidden";
  const reviews = await prisma.courseReview.findMany({
    where: hiddenOnly ? { hidden: true } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      course: { select: { title: true } },
      user: { select: { email: showEmail, profile: { select: { displayName: true, username: true } } } },
    },
  });

  return (
    <section aria-labelledby="reviews">
      <SectionTitle
        id="reviews"
        action={
          <a href={hiddenOnly ? "/admin/courses/reviews" : "/admin/courses/reviews?show=hidden"} className="text-[13px] text-ink-3 hover:text-ink-1">
            {hiddenOnly ? "Show all" : "Show hidden only"}
          </a>
        }
      >
        Reviews {reviews.length ? `(${reviews.length}${reviews.length === 200 ? "+" : ""})` : ""}
      </SectionTitle>
      {reviews.length === 0 ? (
        <Panel className="p-6 text-[14.5px] text-ink-2">No reviews{hiddenOnly ? " are hidden" : " yet"}.</Panel>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <Panel as="div" className={r.hidden ? "p-4 opacity-70" : "p-4"}>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <Badge tone="gold">{r.rating} / 5</Badge>
                  {r.hidden && <Badge tone="warning">Hidden</Badge>}
                  <span className="text-ink-1">{r.course.title}</span>
                  <span className="text-ink-3">
                    · {r.user.profile?.displayName ?? (showEmail ? r.user.email : "Member")}
                    {r.user.profile ? ` (@${r.user.profile.username})` : ""} · {formatDate(r.updatedAt, IST_TIME_ZONE)}
                  </span>
                  <span className="ml-auto">
                    <InlineAction action={setReviewHiddenAction.bind(null, r.id, !r.hidden)} label={r.hidden ? "Unhide" : "Hide"} variant="ghost" />
                  </span>
                </div>
                {r.body && <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{r.body}</p>}
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
