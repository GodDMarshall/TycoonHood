/**
 * What the HUD shows over the campus (DR-31): the label over each building
 * on the plaza, the label and panel at each station inside, and the panel
 * for the building you are in.
 *
 * Every figure is the member's own, from WorldState, and every action is a
 * link into the 2D app: nothing here changes anything. Names, links and
 * presence come from ../sections, the same table the 2D page uses. Ink
 * only: one gold button at most ('Continue'), no chips, no glass.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, buttonStyles, cn, type IconName } from "@tycoonhood/ui";
import type { BuildingId, WorldState } from "@tycoonhood/core/src/world/state";
import { SECTION, discussionsLine, facts, lessonHref, linksFor, num, presenceLine, storageLine, weekLine, type Fact } from "../sections";

const PILLAR_COLOR: Record<string, string> = {
  WARRIOR: "var(--color-warrior)",
  BUILDER: "var(--color-builder)",
  TYCOON: "var(--color-tycoon)",
  MIND: "var(--color-mind)",
};

function Frame({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={cn("w-[290px] max-w-[70vw] rounded-lg border border-line-strong bg-bg-1 p-4 text-left shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)]", className)}>
      <h2 className="text-[15px] font-semibold leading-snug text-ink-1">{title}</h2>
      {children && <div className="mt-3 flex flex-col gap-3 text-[13.5px] leading-relaxed text-ink-2">{children}</div>}
    </section>
  );
}

function Go({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={buttonStyles({ variant: primary ? "primary" : "secondary", size: "sm", className: "self-start" })}>
      {children}
      <Icon name="arrow-right" size={13} />
    </Link>
  );
}

function Bar({ pct, color, label }: { pct: number; color?: string; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} className="h-1 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: color ?? "var(--color-gold)" }} />
    </div>
  );
}

function Facts({ items }: { items: Fact[] }) {
  return (
    <dl className="flex flex-col gap-1.5">
      {items.map((f) => (
        <div key={f.label} className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-[12.5px] text-ink-3">{f.label}</dt>
          <dd className="text-right tabular-nums text-ink-1">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The live fact under a building's name on the plaza: one of the member's own figures. */
export function buildingFact(id: BuildingId, s: WorldState): string {
  switch (id) {
    case "today": {
      const st = s.today.standard;
      if (st.total === 0) return "Nothing to tick yet";
      return st.met ? "Standard met" : `Standard ${st.ticked} of ${st.total}`;
    }
    case "courses": {
      const p = s.courses.programs[0];
      return p ? `${p.title} · ${p.pct}%` : "No enrolments yet";
    }
    case "community":
      return s.community.unread ? `${num(s.community.unread)} unread` : "Nothing unread";
    case "leaderboard":
      return weekLine(s.leaderboard.week);
    case "mining":
      return s.mining.started ? storageLine(s.mining) : "Starts when you open Mining";
    case "store":
      return s.store.cart ? `${num(s.store.cart)} in your cart` : "Your cart is empty";
  }
}

const FIXED: Record<string, { label: string; icon: IconName }[]> = {
  today: [
    { label: "Today's standard", icon: "checklist" },
    { label: "Your record", icon: "streak" },
    { label: "Next lesson", icon: "play" },
  ],
  community: [
    { label: "Unread messages", icon: "chat" },
    { label: "Discussions", icon: "hash" },
    { label: "Challenges", icon: "target" },
  ],
  mining: [
    { label: "Your rig", icon: "miner" },
    { label: "Storage", icon: "clock" },
    { label: "Wallet", icon: "wallet" },
  ],
  store: [
    { label: "Cart", icon: "store" },
    { label: "Wishlist", icon: "pin" },
    { label: "Orders", icon: "orders" },
    { label: "Earn", icon: "treasury" },
  ],
};

/** The short label at a station you are not facing. Its key is "<building>-<index>". */
export function stationLabel(key: string, s: WorldState): { label: string; icon: IconName } {
  const [kind, raw] = key.split("-");
  const i = Number(raw);
  if (kind === "courses") return { label: s.courses.programs[i]?.title ?? "No enrolments yet", icon: "courses" };
  if (kind === "leaderboard") {
    const r = s.leaderboard.ranks[i];
    return { label: r ? (r.you ? `${r.name}, your rank` : r.name) : "No ranks yet", icon: "leaderboard" };
  }
  return FIXED[kind]?.[i] ?? { label: SECTION[kind as BuildingId]?.name ?? "Campus", icon: "info" };
}

/** The station you are facing, in full. */
export function StationPanel({ stationKey, s }: { stationKey: string; s: WorldState }) {
  const [kind, raw] = stationKey.split("-");
  const i = Number(raw);
  switch (`${kind}-${kind === "courses" || kind === "leaderboard" ? "n" : i}`) {
    case "today-0": {
      const st = s.today.standard;
      return (
        <Frame title="Today's standard">
          {st.total === 0 ? (
            <p>Nothing to tick yet.</p>
          ) : (
            <>
              <p>
                <span className="tabular-nums text-ink-1">
                  {st.ticked} of {st.total}
                </span>{" "}
                done{st.met ? ". Standard met." : "."}
              </p>
              <Bar pct={(st.ticked * 100) / st.total} label="Today's standard" />
            </>
          )}
          <Go href="/today">Open Today</Go>
        </Frame>
      );
    }
    case "today-1": {
      const me = s.me;
      const span = Math.max(1, me.xpNext - me.xpFloor);
      return (
        <Frame title="Your record">
          <Facts
            items={[
              { label: "Streak", value: `${num(s.today.streak.current)} ${s.today.streak.current === 1 ? "day" : "days"}` },
              { label: "Best", value: `${num(s.today.streak.longest)} ${s.today.streak.longest === 1 ? "day" : "days"}` },
              { label: "Level", value: String(me.level) },
              { label: "Rank", value: me.rank ? me.rank.name : "None yet" },
            ]}
          />
          <p className="text-[12.5px] text-ink-3">
            {num(Math.max(0, me.xpNext - me.xp))} XP to level {me.level + 1}
          </p>
          <Bar pct={((me.xp - me.xpFloor) * 100) / span} label={`Progress to level ${me.level + 1}`} />
          <Go href="/today">Open Today</Go>
        </Frame>
      );
    }
    case "today-2": {
      const n = s.today.next;
      if (!n)
        return (
          <Frame title="Next lesson">
            <p>No lesson waiting.</p>
            <Go href="/courses">Find a course</Go>
          </Frame>
        );
      return (
        <Frame title="Next lesson">
          <p>
            <span className="text-ink-1">{n.lesson}</span>
            <br />
            <span className="text-[12.5px] text-ink-3">{n.course}</span>
          </p>
          <Go primary href={lessonHref(n.slug, n.lessonId)}>
            Continue
          </Go>
        </Frame>
      );
    }
    case "courses-n": {
      const p = s.courses.programs[i];
      if (!p)
        return (
          <Frame title="No enrolments yet">
            <p>Courses you join show up here.</p>
            <Go href="/courses">Browse courses</Go>
          </Frame>
        );
      return (
        <Frame title={p.title}>
          <p className="tabular-nums">
            {p.done} of {p.lessons} lessons · {p.pct}%
          </p>
          <Bar pct={p.pct} color={PILLAR_COLOR[p.pillar]} label={`${p.title} progress`} />
          {p.next ? (
            <>
              <p>
                Next: <span className="text-ink-1">{p.next.lesson}</span>
              </p>
              <Go primary href={lessonHref(p.slug, p.next.lessonId)}>
                Continue
              </Go>
            </>
          ) : (
            <>
              <p>{p.lessons === 0 ? "No lessons yet." : "Every lesson done."}</p>
              <Go href={`/courses/${p.slug}`}>Open the course</Go>
            </>
          )}
        </Frame>
      );
    }
    case "community-0":
      return (
        <Frame title="Unread messages">
          <p>
            {s.community.unread ? (
              <>
                <span className="tabular-nums text-ink-1">{num(s.community.unread)}</span> unread in your channels.
              </>
            ) : (
              "You're all caught up."
            )}
          </p>
          <Go href="/community">Open Community</Go>
        </Frame>
      );
    case "community-1": {
      const line = discussionsLine(s);
      return (
        <Frame title="Discussions">
          {line && <p>{line}.</p>}
          <Go href="/community/discussions">Open discussions</Go>
        </Frame>
      );
    }
    case "community-2":
      return (
        <Frame title="Challenges">
          <p>
            {s.community.challengesJoined ? (
              <>
                You're in <span className="tabular-nums text-ink-1">{num(s.community.challengesJoined)}</span>{" "}
                {s.community.challengesJoined === 1 ? "challenge" : "challenges"}.
              </>
            ) : (
              "You haven't joined a challenge yet."
            )}
          </p>
          <Go href="/challenges">Open challenges</Go>
        </Frame>
      );
    case "leaderboard-n": {
      const r = s.leaderboard.ranks[i];
      if (!r)
        return (
          <Frame title="No ranks yet">
            <Go href="/leaderboard">Open the leaderboard</Go>
          </Frame>
        );
      return (
        <Frame title={r.name}>
          <p>
            Held by <span className="tabular-nums text-ink-1">{num(r.members)}</span> {r.members === 1 ? "member" : "members"}
            {r.you ? ", you among them." : "."}
          </p>
          <Go href="/leaderboard">Open the leaderboard</Go>
        </Frame>
      );
    }
    case "mining-0": {
      const m = s.mining;
      return (
        <Frame title="Your rig">
          {m.started ? (
            <Facts
              items={[
                { label: "Level", value: `${m.rigLevel} of ${m.maxLevel}` },
                { label: "Rate", value: `${num(m.ratePerHour)} THC an hour` },
              ]}
            />
          ) : (
            <p>Your rig starts when you open Mining.</p>
          )}
          <Go href="/mining">Open Mining</Go>
        </Frame>
      );
    }
    case "mining-1": {
      const m = s.mining;
      const cap = Number(m.capacity);
      return (
        <Frame title="Storage">
          <p className="tabular-nums">{storageLine(m)}</p>
          <Bar pct={cap > 0 ? (Number(m.accrued) * 100) / cap : 0} label="Rig storage" />
          <p className="text-[12.5px] text-ink-3">You claim it on the Mining page.</p>
          <Go href="/mining">Open Mining</Go>
        </Frame>
      );
    }
    case "mining-2":
      return (
        <Frame title="Wallet">
          <p className="tabular-nums text-ink-1">{num(s.mining.wallet)} THC</p>
          <Go href="/wallet">Open the wallet</Go>
        </Frame>
      );
    case "store-0":
      return (
        <Frame title="Cart">
          <p>{s.store.cart ? `${num(s.store.cart)} ${s.store.cart === 1 ? "item" : "items"} in your cart.` : "Your cart is empty."}</p>
          <Go href="/cart">Open the cart</Go>
        </Frame>
      );
    case "store-1":
      return (
        <Frame title="Wishlist">
          <p>{s.store.wishlist ? `${num(s.store.wishlist)} ${s.store.wishlist === 1 ? "item" : "items"} saved.` : "Nothing saved yet."}</p>
          <Go href="/wishlist">Open the wishlist</Go>
        </Frame>
      );
    case "store-2":
      return (
        <Frame title="Orders">
          <p>{s.store.orders ? `${num(s.store.orders)} completed ${s.store.orders === 1 ? "order" : "orders"}.` : "No orders yet."}</p>
          <Go href="/orders">Open orders</Go>
        </Frame>
      );
    case "store-3":
      return (
        <Frame title="Earn">
          <Facts items={facts("store", s).filter((f) => f.label === "Earn")} />
          <Go href="/earnings">Open Earn</Go>
        </Frame>
      );
    default:
      return null;
  }
}

/** The building you are in: its figures, the house's last 24 hours, and every way into the 2D app. */
export function PlacePanel({ id, s }: { id: BuildingId; s: WorldState }) {
  const presence = presenceLine(id, s);
  return (
    <Frame title={SECTION[id].name}>
      <Facts items={facts(id, s)} />
      {presence && <p className="text-[12.5px] text-ink-3">{presence}</p>}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
        {linksFor(id, s).map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink-1">
              {l.label}
              <Icon name="arrow-right" size={12} />
            </Link>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
