/**
 * MEMBER STORIES — genuine stories only: published Testimonial rows, each
 * saved by an admin with the date the member consented. When there are none,
 * the page says so plainly. Nothing here is written for a member.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { cms } from "@tycoonhood/core";
import { EmptyState, buttonStyles } from "@tycoonhood/ui";

export const metadata: Metadata = {
  title: "Success stories",
  description: "Members' stories, in their own words and published with their permission.",
  alternates: { canonical: "/success-stories" },
};
export const dynamic = "force-dynamic";

export default async function SuccessStoriesPage() {
  const stories = await cms.publishedTestimonials(60);
  return (
    <main className="mx-auto max-w-[80rem] px-[var(--gutter)] py-16 md:py-24">
      <p className="eyebrow mb-3">Success stories</p>
      <h1 className="display max-w-[18ch] text-h1">
        Members, <span className="accent">in their own words.</span>
      </h1>
      <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2">
        Every story here comes from a real member and is published only with their permission. We do not edit results, invent quotes or show income claims.
      </p>

      {stories.length === 0 ? (
        <EmptyState
          className="mt-12"
          icon="trophy"
          title="No stories published yet"
          body="We'll publish members' stories here, with their permission, as they happen."
        />
      ) : (
        <ul className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((s) => (
            <li key={s.id}>
              <figure className="flex h-full flex-col rounded-xl border border-line bg-bg-1 p-6">
                <blockquote className="flex-1 whitespace-pre-line text-[15.5px] leading-relaxed text-ink-1">&ldquo;{s.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 text-[14px]">
                  <span className="font-semibold">{s.name}</span>
                  {s.role && <span className="block text-ink-3">{s.role}</span>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="share-title" className="mt-16 rounded-xl border border-line bg-bg-1 p-6 sm:p-8">
        <h2 id="share-title" className="text-[19px] font-semibold">Share your story</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
          Has Tycoonhood helped you? Tell us what changed — in your own words. We will ask for your permission, and the exact name and wording to show, before
          anything is published. You can ask us to remove it at any time.
        </p>
        <Link href="/contact?topic=story" className={buttonStyles({ variant: "secondary", className: "mt-5" })}>
          Send us your story
        </Link>
      </section>
    </main>
  );
}
