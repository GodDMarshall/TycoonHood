import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { COMMENT_MAX, POST_BODY_MAX, POST_TITLE_MAX, POST_TITLE_MIN, discussions, isStaff, type CommentView } from "@tycoonhood/core";
import { Avatar, Badge, Button, Notice } from "@tycoonhood/ui";
import { requireUser } from "../../../../../lib/guard";
import { Page, Panel, SectionTitle } from "../../../../../components/app/page";
import { BodyText } from "../_components/body-text";
import { Reactions } from "../_components/reactions";
import { ReportButton } from "../_components/report-button";
import { CommentForm } from "../_components/comment-form";
import { PostForm } from "../_components/post-form";
import { commentAction, deleteCommentAction, deletePostAction, editPostAction, lockAction, moderateAction, pinAction } from "../actions";

export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }): Promise<Metadata> {
  const { postId } = await params;
  const p = await prisma.communityPost.findUnique({ where: { id: postId }, select: { title: true, state: true, groupId: true } });
  // A post in an archived group is staff-only, so its title stays out of the tab.
  const closed = !!p?.groupId && (await discussions.archived()).groups.includes(p.groupId);
  return { title: p && p.state === "VISIBLE" && !closed ? p.title : "Discussion" };
}

function StateBadge({ state }: { state: "VISIBLE" | "HIDDEN" | "REMOVED" }) {
  if (state === "VISIBLE") return null;
  return <Badge tone="warning">{state === "HIDDEN" ? "Hidden by staff" : "Removed"}</Badge>;
}

export default async function PostPage({ params, searchParams }: { params: Promise<{ postId: string }>; searchParams: Promise<{ edit?: string }> }) {
  const user = await requireUser();
  const { postId } = await params;
  const sp = await searchParams;
  const viewer = { id: user.id, role: user.role };
  const post = await discussions.post(viewer, postId);
  if (!post) notFound();
  const staff = isStaff(user);
  const mute = await prisma.communityMute.findUnique({ where: { userId: user.id } });
  const muted = !!mute && (!mute.until || mute.until > new Date());
  const editing = sp.edit === "1" && !!post.editableUntil;
  const back = post.group ? { href: `/community/groups/${post.group.slug}`, label: post.group.name } : { href: post.category ? `/community/discussions?c=${post.category.slug}` : "/community/discussions", label: post.category?.name ?? "Discussions" };
  const live = post.state === "VISIBLE";
  // Archived: members can read but not comment or react. Staff can still answer.
  const readOnly = post.archived && !staff;

  return (
    <Page width="narrow">
      <p className="mb-4 text-[13.5px]">
        <Link href={back.href} className="text-ink-3 hover:text-ink-1">
          ← {back.label}
        </Link>
      </p>

      <article aria-labelledby="post-title">
        <header className="mb-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {post.pinned && <Badge tone="gold">Pinned</Badge>}
            {post.locked && <Badge>Locked</Badge>}
            {post.archived && <Badge tone="warning">Archived</Badge>}
            <StateBadge state={post.state} />
          </div>
          <h1 id="post-title" className="text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">
            {post.title}
          </h1>
          <div className="mt-3 flex items-center gap-2.5 text-[13.5px] text-ink-3">
            <Avatar name={post.author.name} src={post.author.avatarUrl} size={28} />
            <span>
              {post.author.username ? (
                <Link href={`/u/${post.author.username}`} className="text-ink-2 hover:text-ink-1">
                  {post.author.name}
                </Link>
              ) : (
                <span className="text-ink-2">{post.author.name}</span>
              )}
              {post.author.staff && <span className="text-gold-deep"> · staff</span>} · <time dateTime={post.createdAt}>{when.format(new Date(post.createdAt))}</time>
            </span>
          </div>
        </header>

        {editing ? (
          <Panel className="p-5">
            <PostForm
              action={editPostAction.bind(null, post.id)}
              initial={{ title: post.title, body: post.body }}
              submit="Save changes"
              limits={{ titleMin: POST_TITLE_MIN, titleMax: POST_TITLE_MAX, bodyMax: POST_BODY_MAX }}
            />
          </Panel>
        ) : (
          <BodyText text={post.body} />
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <Reactions postId={post.id} target={{ type: "post", id: post.id }} counts={post.reactions} mine={post.myReactions} own={post.mine} disabled={!live || readOnly} />
          <div className="flex flex-wrap items-center gap-1">
            {post.editableUntil && !editing && (
              <Link href={`/community/discussions/${post.id}?edit=1`} className="inline-flex h-7 items-center rounded px-1.5 text-[12.5px] text-ink-3 hover:bg-bg-2 hover:text-ink-1">
                Edit
              </Link>
            )}
            {post.mine && post.state !== "REMOVED" && (
              <form action={deletePostAction.bind(null, post.id)}>
                <button type="submit" className="inline-flex h-7 items-center rounded px-1.5 text-[12.5px] text-ink-3 hover:bg-bg-2 hover:text-danger">
                  Delete
                </button>
              </form>
            )}
            {!post.mine && live && <ReportButton type="post" id={post.id} already={post.reported} />}
          </div>
        </div>

        {staff && (
          <Panel className="mt-4 flex flex-wrap items-center gap-2 p-3">
            <span className="mr-1 text-[12.5px] font-medium text-ink-3">Staff</span>
            <form action={pinAction.bind(null, post.id, !post.pinned)}>
              <Button type="submit" size="sm" variant="ghost">{post.pinned ? "Unpin" : "Pin"}</Button>
            </form>
            <form action={lockAction.bind(null, post.id, !post.locked)}>
              <Button type="submit" size="sm" variant="ghost">{post.locked ? "Unlock" : "Lock"}</Button>
            </form>
            {post.state !== "VISIBLE" && (
              <form action={moderateAction.bind(null, post.id, "post", post.id, "VISIBLE")}>
                <Button type="submit" size="sm" variant="secondary">Restore</Button>
              </form>
            )}
            {post.state !== "HIDDEN" && (
              <form action={moderateAction.bind(null, post.id, "post", post.id, "HIDDEN")}>
                <Button type="submit" size="sm" variant="ghost">Hide</Button>
              </form>
            )}
            {post.state !== "REMOVED" && (
              <form action={moderateAction.bind(null, post.id, "post", post.id, "REMOVED")}>
                <Button type="submit" size="sm" variant="danger">Remove</Button>
              </form>
            )}
          </Panel>
        )}
      </article>

      <section aria-labelledby="comments" className="mt-10">
        <SectionTitle id="comments">
          {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
        </SectionTitle>

        {post.comments.length > 0 && (
          <ol className="mb-6 flex flex-col divide-y divide-line">
            {post.comments.map((c) => (
              <Comment key={c.id} c={c} postId={post.id} staff={staff} live={live} readOnly={readOnly} />
            ))}
          </ol>
        )}

        {!live && !staff ? null : readOnly ? (
          <Notice tone="info">This discussion is archived. You can read it, but not comment or react.</Notice>
        ) : post.locked && !staff ? (
          <Notice tone="info">This discussion is locked. Staff closed it to new comments.</Notice>
        ) : muted ? (
          <Notice tone="warning">You can read but not post{mute?.until ? ` until ${mute.until.toUTCString().slice(0, 22)} UTC` : ""}.</Notice>
        ) : (
          <CommentForm action={commentAction.bind(null, post.id)} max={COMMENT_MAX} />
        )}
      </section>
    </Page>
  );
}

function Comment({ c, postId, staff, live, readOnly }: { c: CommentView; postId: string; staff: boolean; live: boolean; readOnly: boolean }) {
  return (
    <li id={`c-${c.id}`} className="flex scroll-mt-20 gap-3 py-4">
      <Avatar name={c.author.name} src={c.author.avatarUrl} size={30} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
          <span className="font-medium text-ink-2">{c.author.name}</span>
          {c.author.staff && <span className="text-gold-deep">staff</span>}
          <time dateTime={c.createdAt}>{when.format(new Date(c.createdAt))}</time>
          <StateBadge state={c.state} />
        </p>
        {c.body === null ? <p className="mt-1 text-[14px] italic text-ink-3">Removed.</p> : <BodyText text={c.body} className="mt-1 text-[14.5px]" />}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Reactions postId={postId} target={{ type: "comment", id: c.id }} counts={c.reactions} mine={c.myReactions} own={c.mine} disabled={!live || readOnly || c.state !== "VISIBLE"} />
          {c.mine && c.state !== "REMOVED" && (
            <form action={deleteCommentAction.bind(null, postId, c.id)}>
              <button type="submit" className="inline-flex h-7 items-center rounded px-1.5 text-[12.5px] text-ink-3 hover:bg-bg-2 hover:text-danger">
                Delete
              </button>
            </form>
          )}
          {!c.mine && c.state === "VISIBLE" && live && <ReportButton type="comment" id={c.id} />}
          {staff && (
            <>
              {c.state !== "VISIBLE" && (
                <form action={moderateAction.bind(null, postId, "comment", c.id, "VISIBLE")}>
                  <button type="submit" className="h-7 rounded px-1.5 text-[12.5px] text-ink-3 hover:bg-bg-2 hover:text-ink-1">Restore</button>
                </form>
              )}
              {c.state !== "HIDDEN" && (
                <form action={moderateAction.bind(null, postId, "comment", c.id, "HIDDEN")}>
                  <button type="submit" className="h-7 rounded px-1.5 text-[12.5px] text-ink-3 hover:bg-bg-2 hover:text-ink-1">Hide</button>
                </form>
              )}
              {c.state !== "REMOVED" && (
                <form action={moderateAction.bind(null, postId, "comment", c.id, "REMOVED")}>
                  <button type="submit" className="h-7 rounded px-1.5 text-[12.5px] text-danger hover:bg-bg-2">Remove</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}
