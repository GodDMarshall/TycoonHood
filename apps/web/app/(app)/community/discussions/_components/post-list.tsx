/** A list of discussion posts with page links. Server-rendered. */
import Link from "next/link";
import { formatDay, type PostSummary } from "@tycoonhood/core";
import { Avatar, Badge, Icon, cn } from "@tycoonhood/ui";
import { Panel } from "../../../../../components/app/page";

/** `zone`: the reader's time zone (memberZone), for the dates. */
export function PostList({ posts, zone, showWhere = true }: { posts: PostSummary[]; zone: string; showWhere?: boolean }) {
  return (
    <Panel as="ul" className="divide-y divide-line">
      {posts.map((p) => (
        <li key={p.id}>
          <Link href={`/community/discussions/${p.id}`} className="flex gap-3 px-4 py-4 transition-colors hover:bg-bg-2 sm:px-5">
            <Avatar name={p.author.name} src={p.author.avatarUrl} size={34} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {p.pinned && <Icon name="pin" size={14} className="text-gold" aria-label="Pinned" />}
                <h3 className="min-w-0 truncate text-[15.5px] font-semibold text-ink-1">{p.title}</h3>
                {p.locked && <Badge>Locked</Badge>}
                {p.state !== "VISIBLE" && <Badge tone="warning">{p.state === "HIDDEN" ? "Hidden" : "Removed"}</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink-2">{p.excerpt}</p>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                <span>
                  {p.author.name}
                  {p.author.staff && <span className="text-gold-deep"> · staff</span>}
                </span>
                <span>{formatDay(p.createdAt, zone)}</span>
                {showWhere && (p.group ? <span>{p.group.name}</span> : p.category ? <span>{p.category.name}</span> : null)}
                <span className="tabular-nums">
                  {p.commentCount} {p.commentCount === 1 ? "comment" : "comments"}
                </span>
                {p.reactionCount > 0 && <span className="tabular-nums">{p.reactionCount} reactions</span>}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </Panel>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const link = (p: number, label: string, disabled: boolean) =>
    disabled ? (
      <span className="inline-flex h-9 items-center rounded-md px-3 text-[14px] text-ink-3 opacity-50">{label}</span>
    ) : (
      <Link href={href(p)} className={cn("inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-[14px] text-ink-1 hover:border-gold-deep")}>
        {label}
      </Link>
    );
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
      {link(page - 1, "Newer", page <= 1)}
      <span className="text-[13px] tabular-nums text-ink-3">
        Page {page} of {pages}
      </span>
      {link(page + 1, "Older", page >= pages)}
    </nav>
  );
}
