/**
 * The community's two panes: channels on the left, the open channel on the
 * right. On a phone the list is its own screen (/community) and a channel
 * fills the screen with a way back. Rendered by each page (not a layout), so
 * unread counts are fresh on every navigation.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { ChannelSummary } from "@tycoonhood/core";
import { Icon, cn, type IconName } from "@tycoonhood/ui";

export const CHANNEL_ICON: Record<ChannelSummary["kind"], IconName> = {
  ANNOUNCEMENTS: "megaphone",
  CHAT: "hash",
  WINS: "trophy",
  QUESTIONS: "help",
};

function group(channels: ChannelSummary[]) {
  const out: { title: string; slug: string | null; channels: ChannelSummary[] }[] = [];
  for (const c of channels) {
    const key = c.course?.slug ?? null;
    let g = out.find((x) => x.slug === key);
    if (!g) {
      g = { title: c.course?.title ?? "The house", slug: key, channels: [] };
      out.push(g);
    }
    g.channels.push(c);
  }
  return out;
}

export function ChannelList({ channels, active }: { channels: ChannelSummary[]; active?: string }) {
  const groups = group(channels);
  return (
    <nav aria-label="Channels" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.slug ?? "house"}>
          <p className="mb-1 truncate px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{g.title}</p>
          <ul className="flex flex-col gap-0.5">
            {g.channels.map((c) => {
              const on = c.slug === active;
              return (
                <li key={c.slug}>
                  <Link
                    href={`/community/${c.slug}`}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-md px-2 text-[14.5px] transition-colors lg:h-9 lg:text-[14px]",
                      on ? "bg-bg-3 text-ink-1" : c.unread ? "font-semibold text-ink-1 hover:bg-bg-2" : "text-ink-2 hover:bg-bg-2 hover:text-ink-1"
                    )}
                  >
                    <Icon name={CHANNEL_ICON[c.kind]} size={16} className={on ? "text-gold" : "text-ink-3"} />
                    <span className="truncate">{c.name}</span>
                    {c.unread > 0 && !on && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold tabular-nums text-bg-0">
                        {c.unread > 99 ? "99+" : c.unread}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** The house rules, in five lines. Shown beside the channel list. */
export function HouseRules() {
  return (
    <div>
      <h2 className="text-[14px] font-semibold text-ink-1">House rules</h2>
      <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[13.5px] leading-relaxed text-ink-2">
        <li>Be useful. Ask specific questions; give concrete answers.</li>
        <li>Wins need proof — a link, a number, a result.</li>
        <li>No selling, recruiting or spam. Staff remove it and may mute.</li>
        <li>Disagree with ideas, never with people.</li>
        <li>Report, don&rsquo;t argue. Staff read every report.</li>
      </ol>
    </div>
  );
}

/** Full-height frame. `mode="list"` is the phone's channel screen. */
export function CommunityFrame({
  channels,
  active,
  mode,
  children,
}: {
  channels: ChannelSummary[];
  active?: string;
  mode: "list" | "channel";
  children?: ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem-env(safe-area-inset-bottom))] lg:h-dvh">
      <aside
        className={cn(
          "w-full shrink-0 overflow-y-auto border-line bg-bg-0 px-3 py-5 lg:block lg:w-[260px] lg:border-r lg:bg-bg-1/40",
          mode === "channel" && "hidden"
        )}
      >
        <div className="mb-4 flex items-center justify-between px-2">
          <h1 className="text-[18px] font-semibold tracking-[-0.01em]">Community</h1>
        </div>
        <ChannelList channels={channels} active={active} />
        <p className="mt-6 px-2 text-[12.5px] leading-relaxed text-ink-3">Program channels open when you enroll in the program.</p>
        <div className={cn("mt-6 px-2", mode === "list" ? "lg:hidden" : "hidden")}>
          <HouseRules />
        </div>
      </aside>
      <section className={cn("min-w-0 flex-1", mode === "list" && "hidden lg:flex lg:items-center lg:justify-center")}>
        {mode === "list" ? (
          <div className="max-w-md px-6">
            <Icon name="chat" size={28} className="text-ink-3" />
            <p className="mt-3 text-[15px] text-ink-2">Choose a channel to read and post.</p>
            <div className="mt-8">
              <HouseRules />
            </div>
          </div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}
