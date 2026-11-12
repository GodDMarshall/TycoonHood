/**
 * Admin → Content (savePostAction), run as written: saving an essay keeps
 * `Post.status` in step with `publishedAt`, the way migration
 * 20261113000700 backfilled it (no time: DRAFT; a past time: PUBLISHED; a
 * future time: SCHEDULED). The migration's CHECK `Post_live_has_time`
 * refuses a SCHEDULED or PUBLISHED post with no time, so an unpublish that
 * clears the time but leaves the status is refused, and an essay saved
 * without a status would read as a draft once the blog reads `status`.
 *
 * Stand-ins, as in course-admin-web.test.ts: the signed-in user and Next's
 * cache. Every essay here is a throwaway.
 */
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import type { PostStatus } from "@tycoonhood/db";
import { createTestUser, uid } from "./helpers";

const session = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("../../../apps/web/lib/auth", () => ({ getCurrentUser: async () => session.user }));
vi.mock("../../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: () => {} }));

type State = { message?: string; error?: string };
type SavePost = (postId: string | null, prev: State, fd: FormData) => Promise<State>;

/** The web app's admin actions. The path is a variable, so core's typecheck leaves the web app alone. */
const savePostAction = (): Promise<SavePost> =>
  import(/* @vite-ignore */ new URL("../../../apps/web/app/(app)/admin/actions.ts", import.meta.url).href).then(
    (m: { savePostAction: SavePost }) => m.savePostAction
  );

const made: string[] = [];
afterEach(() => {
  session.user = null;
});
afterAll(async () => {
  await prisma.post.deleteMany({ where: { id: { in: made } } });
});

async function signInAsAdmin() {
  const u = await createTestUser();
  await prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
  session.user = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, include: { profile: true } });
}

const HOUR = 60 * 60 * 1000;

/** An essay as the migration left it: its status backfilled from its time. */
async function essay(status: PostStatus, publishedAt: Date | null) {
  const slug = `essay-${uid().slice(0, 8)}`;
  const post = await prisma.post.create({
    data: { slug, title: "An essay", excerpt: "Short.", contentMd: "Body.", publishedAt, status },
  });
  made.push(post.id);
  return post;
}

/** The editor's form: the essay's fields, with Published ticked or not. */
function form(post: { title: string; slug: string; contentMd: string }, published: boolean) {
  const fd = new FormData();
  fd.set("title", post.title);
  fd.set("slug", post.slug);
  fd.set("excerpt", "Short.");
  fd.set("contentMd", post.contentMd);
  if (published) fd.set("publish", "on");
  return fd;
}

/** The action's reply, or where its redirect sends the browser. */
async function outcome(action: Promise<State>): Promise<State | { sent: string }> {
  try {
    return await action;
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return { sent: digest.split(";")[2] };
    throw e;
  }
}

const stored = (id: string) => prisma.post.findUniqueOrThrow({ where: { id }, select: { status: true, publishedAt: true } });

describe("savePostAction keeps an essay's status in step with its time", () => {
  it("unpublishes an essay the migration marked PUBLISHED", async () => {
    const save = await savePostAction();
    await signInAsAdmin();
    const post = await essay("PUBLISHED", new Date(Date.now() - 24 * HOUR));

    expect(await outcome(save(post.id, {}, form(post, false)))).toEqual({ sent: "/admin/content" });
    expect(await stored(post.id)).toEqual({ status: "DRAFT", publishedAt: null });
  });

  it("unpublishes an essay the migration marked SCHEDULED", async () => {
    const save = await savePostAction();
    await signInAsAdmin();
    const post = await essay("SCHEDULED", new Date(Date.now() + 24 * HOUR));

    expect(await outcome(save(post.id, {}, form(post, false)))).toEqual({ sent: "/admin/content" });
    expect(await stored(post.id)).toEqual({ status: "DRAFT", publishedAt: null });
  });

  it("publishes a draft: PUBLISHED, from now", async () => {
    const save = await savePostAction();
    await signInAsAdmin();
    const post = await essay("DRAFT", null);
    const before = Date.now();

    expect(await outcome(save(post.id, {}, form(post, true)))).toEqual({ sent: "/admin/content" });
    const after = await stored(post.id);
    expect(after.status).toBe("PUBLISHED");
    expect(after.publishedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(after.publishedAt!.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("keeps a published essay's time and status when it is saved again", async () => {
    const save = await savePostAction();
    await signInAsAdmin();
    const when = new Date(Date.now() - 24 * HOUR);
    const post = await essay("PUBLISHED", when);

    expect(await outcome(save(post.id, {}, form(post, true)))).toEqual({ sent: "/admin/content" });
    expect(await stored(post.id)).toEqual({ status: "PUBLISHED", publishedAt: when });
  });

  it("keeps a scheduled essay SCHEDULED, at its time, when it is saved again", async () => {
    const save = await savePostAction();
    await signInAsAdmin();
    const when = new Date(Date.now() + 24 * HOUR);
    const post = await essay("SCHEDULED", when);

    expect(await outcome(save(post.id, {}, form(post, true)))).toEqual({ sent: "/admin/content" });
    expect(await stored(post.id)).toEqual({ status: "SCHEDULED", publishedAt: when });
  });

  it("marks PUBLISHED an essay saved live without a status before this fix", async () => {
    const save = await savePostAction();
    await signInAsAdmin();
    const when = new Date(Date.now() - 24 * HOUR);
    const post = await essay("DRAFT", when);

    expect(await outcome(save(post.id, {}, form(post, true)))).toEqual({ sent: "/admin/content" });
    expect(await stored(post.id)).toEqual({ status: "PUBLISHED", publishedAt: when });
  });

  it("creates a new essay PUBLISHED when Published is ticked, and DRAFT when it is not", async () => {
    const save = await savePostAction();
    await signInAsAdmin();
    const live = { title: "A new essay", slug: `new-${uid().slice(0, 8)}`, contentMd: "Body." };
    const draft = { title: "A new draft", slug: `new-${uid().slice(0, 8)}`, contentMd: "Body." };

    expect(await outcome(save(null, {}, form(live, true)))).toEqual({ sent: "/admin/content" });
    expect(await outcome(save(null, {}, form(draft, false)))).toEqual({ sent: "/admin/content" });
    const rows = await prisma.post.findMany({
      where: { slug: { in: [live.slug, draft.slug] } },
      select: { id: true, slug: true, status: true, publishedAt: true },
    });
    made.push(...rows.map((r) => r.id));
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
    expect(bySlug[live.slug].status).toBe("PUBLISHED");
    expect(bySlug[live.slug].publishedAt).not.toBeNull();
    expect(bySlug[draft.slug]).toMatchObject({ status: "DRAFT", publishedAt: null });
  });
});
