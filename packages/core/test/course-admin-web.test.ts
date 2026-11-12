/**
 * The course admin as each role meets it (DR-34): which programmes a page
 * lists or opens, which server action goes through, and what a page hands to
 * the browser. The web app's pages and actions run here as written, with two
 * stand-ins: the signed-in user, and Next's cache, which has nothing to
 * revalidate outside a request. Every course, profile and member here is a
 * throwaway; the house programmes are only read.
 */
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import type { UserRole } from "@tycoonhood/db";
import { createTestUser, uid } from "./helpers";

const session = vi.hoisted(() => ({ user: null as { id: string; role: UserRole } | null }));
vi.mock("../../../apps/web/lib/auth", () => ({ getCurrentUser: async () => session.user }));
vi.mock("../../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: () => {} }));

/** A module of the web app. The path is a variable, so core's typecheck leaves the web app's JSX alone. */
function webModule<T>(path: string): Promise<T> {
  return import(/* @vite-ignore */ new URL(`../../../apps/web/${path}`, import.meta.url).href);
}

type State = { ok?: string; error?: string };
type Page<P> = (props: P) => Promise<unknown>;

const reviewsPage = () =>
  webModule<{ default: Page<{ searchParams: Promise<{ show?: string }> }> }>("app/(app)/admin/courses/reviews/page.tsx").then((m) => m.default);
const coursesLayout = () =>
  webModule<{ default: Page<{ children: unknown }> }>("app/(app)/admin/courses/layout.tsx").then((m) => m.default);
const courseActions = () =>
  webModule<{
    setReviewHiddenAction: (reviewId: string, hidden: boolean, prev: State, fd: FormData) => Promise<State>;
  }>("app/(app)/admin/courses/actions.ts");

const cleanup: (() => Promise<unknown>)[] = [];
afterEach(() => {
  session.user = null;
});
afterAll(async () => {
  for (const undo of cleanup.reverse()) await undo();
});

async function staff(role: UserRole) {
  const u = await createTestUser();
  if (role !== "MEMBER") await prisma.user.update({ where: { id: u.id }, data: { role } });
  return { id: u.id, role, email: u.email };
}

/**
 * What a page does for the signed-in user: its element tree when it renders,
 * otherwise where it sent them ("/today" for a redirect, "404" for notFound).
 */
async function visit(page: Promise<unknown>): Promise<{ tree: unknown; sent?: undefined } | { sent: string; tree?: undefined }> {
  try {
    return { tree: await page };
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) return { sent: "404" };
    if (digest.startsWith("NEXT_REDIRECT")) return { sent: digest.split(";")[2] };
    throw e;
  }
}

/**
 * All the text an element tree carries, in children and in props alike: what
 * the page shows, and what it hands to client components (and so to the
 * browser). Functions are skipped.
 */
function everythingIn(node: unknown, seen = new WeakSet<object>(), out: string[] = []): string {
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") out.push(String(node));
  else if (node instanceof Date) out.push(node.toISOString());
  else if (node && typeof node === "object" && !seen.has(node)) {
    seen.add(node);
    // A React element (core cannot import react): look only at what it was given.
    const element = typeof (node as { $$typeof?: unknown }).$$typeof === "symbol" && "props" in node;
    const values = Object.values(element ? ((node as { props: Record<string, unknown> }).props ?? {}) : node);
    for (const v of values) everythingIn(v, seen, out);
  }
  return out.join(" ");
}

describe("the reviews page", () => {
  it("turns instructors away; shows moderators no email; shows administrators a reviewer's email", async () => {
    const ReviewsPage = await reviewsPage();
    const { setReviewHiddenAction } = await courseActions();
    const [admin, moderator, instructor] = [await staff("ADMIN"), await staff("MODERATOR"), await staff("INSTRUCTOR")];
    const course = await prisma.course.findFirstOrThrow({ select: { id: true } });
    // A reviewer with no profile, whom the page can name only by their email.
    const reviewer = await prisma.user.create({ data: { email: `no-profile-${uid().slice(0, 8)}@tycoonhood.test` } });
    const review = await prisma.courseReview.create({ data: { courseId: course.id, userId: reviewer.id, rating: 2, body: `Mixed feelings ${reviewer.id}` } });
    cleanup.push(() => prisma.courseReview.delete({ where: { id: review.id } }));
    const open = () => visit(ReviewsPage({ searchParams: Promise.resolve({}) }));

    session.user = instructor;
    expect(await open()).toEqual({ sent: "/today" });
    expect(await setReviewHiddenAction(review.id, true, {}, new FormData())).toEqual({ error: "You do not have permission to do that." });
    expect((await prisma.courseReview.findUniqueOrThrow({ where: { id: review.id } })).hidden).toBe(false);

    session.user = moderator;
    const seenByModerator = everythingIn((await open()).tree);
    expect(seenByModerator).toContain(`Mixed feelings ${reviewer.id}`);
    expect(seenByModerator).not.toContain(reviewer.email);

    session.user = admin;
    expect(everythingIn((await open()).tree)).toContain(reviewer.email);
  });
});

describe("the course admin's own navigation", () => {
  it("offers Reviews only to those who moderate reviews", async () => {
    const CoursesLayout = await coursesLayout();
    const links = async (role: UserRole) => {
      session.user = await staff(role);
      return everythingIn(await CoursesLayout({ children: null }));
    };
    expect(await links("INSTRUCTOR")).not.toContain("/admin/courses/reviews");
    expect(await links("MODERATOR")).toContain("/admin/courses/reviews");
    expect(await links("ADMIN")).toContain("/admin/courses/reviews");
  });
});
