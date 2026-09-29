"use client";
/**
 * What stands at each station, and what floats over each building.
 * Every value is from WorldState (real rows); every button does something
 * real — a server action or a route in the product. Nothing is decorative.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Icon, RankPips, cn, type IconName } from "@tycoonhood/ui";
import type { WorldState } from "../../../lib/world-state";
import { dailyCheckInAction } from "../../../app/(app)/challenges/actions";

const fmt = (n: string | number | bigint) => BigInt(n).toLocaleString("en-US");
const PILLAR_COLOR: Record<string, string> = {
  WARRIOR: "var(--color-warrior)",
  BUILDER: "var(--color-builder)",
  TYCOON: "var(--color-gold)",
  MIND: "var(--color-mind)",
};

function Thc({ v, signed }: { v: string; signed?: boolean }) {
  return (
    <span className="figures text-gold-bright">
      {signed ? "+" : ""}
      {fmt(v)} <span className="text-[0.72em] text-ink-3">THC</span>
    </span>
  );
}

function Frame({ eyebrow, title, children, tone }: { eyebrow: string; title: ReactNode; children?: ReactNode; tone?: string }) {
  return (
    <div className="w-[300px] max-w-[80vw] rounded-lg border border-gold-deep/50 bg-[linear-gradient(160deg,rgb(24_21_16/0.94),rgb(10_9_8/0.94))] p-5 text-left shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md">
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: tone ?? "var(--color-gold)" }}>
        <span className="size-1.5 rotate-45" style={{ background: tone ?? "var(--color-gold)" }} aria-hidden />
        {eyebrow}
      </p>
      <div className="display mt-2 text-[20px] leading-tight">{title}</div>
      {children && <div className="mt-3 flex flex-col gap-3 text-[13px] leading-relaxed text-ink-2">{children}</div>}
    </div>
  );
}

function Go({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-[13px] font-medium transition-colors",
        primary ? "bg-gold text-bg-0 hover:bg-gold-bright" : "border border-line-strong text-ink-1 hover:border-gold-deep"
      )}
    >
      {children}
      <Icon name="arrow-right" size={13} />
    </Link>
  );
}

function CheckIn({ open, hoursLeft }: { open: boolean; hoursLeft: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!open && !msg)
    return (
      <p className="flex items-center gap-2 text-success">
        <Icon name="check" size={15} /> Done for this window · reopens in ~{hoursLeft}h
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending || !!msg?.ok}
        onClick={() =>
          start(async () => {
            const r = await dailyCheckInAction();
            setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: r.message ?? "Checked in." });
            router.refresh();
          })
        }
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gold px-4 text-[13.5px] font-semibold text-bg-0 transition-colors hover:bg-gold-bright disabled:opacity-60"
      >
        <Icon name="check" size={15} /> {pending ? "Recording…" : msg?.ok ? "Checked in" : "Check in now"}
      </button>
      {msg && <p className={msg.ok ? "text-success" : "text-warning"} role="status">{msg.text}</p>}
    </div>
  );
}

/** Compact form: shown for stations you are not facing. Click to walk there. */
export function StationChip({ label, icon }: { label: string; icon: IconName }) {
  return (
    <span className="flex items-center gap-2 rounded-md border border-line-strong bg-bg-0/85 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-gold backdrop-blur-sm">
      <Icon name={icon} size={13} /> {label}
    </span>
  );
}

export function stationSummary(key: string, s: WorldState): { label: string; icon: IconName } {
  const [kind, idxRaw] = key.split("-");
  const i = Number(idxRaw);
  switch (kind) {
    case "status":
      return { label: "Your standing", icon: "ascent" };
    case "mission":
      return { label: "Today's mission", icon: "mission" };
    case "record":
      return { label: "The record", icon: "journal" };
    case "program":
      return { label: s.programs[i]?.title ?? "Program", icon: "academy" };
    case "challenge":
      return { label: s.challenges[i]?.name ?? "No live challenge", icon: "arena" };
    case "streak":
      return { label: "Your streak", icon: "streak" };
    case "item":
      return { label: s.vault[i]?.name ?? "Empty plinth", icon: "vault" };
    case "figure":
      return { label: TREASURY_FIGURES[i]?.[0] ?? "Figure", icon: "treasury" };
    case "member":
      return { label: s.network.top[i]?.displayName ?? "Open seat", icon: "user" };
    case "map":
      return { label: "The map", icon: "network" };
    default:
      return { label: key, icon: "info" };
  }
}

const TREASURY_FIGURES: [string, (s: WorldState) => string, string][] = [
  ["Total supply", (s) => s.treasury.supply, "Minted once at genesis. Nothing mints after it."],
  ["In member hands", (s) => s.treasury.circulating, "Earned by verified work, never bought."],
  ["Rewards pool", (s) => s.treasury.rewardsPool, "Finite. Pays missions, challenges, achievements."],
  ["Mining pool", (s) => s.treasury.miningPool, "What the Miner distributes from. Not minted."],
  ["Revenue", (s) => s.treasury.revenue, "THC spent in the Vault lands here."],
  ["Your wallet", (s) => s.treasury.wallet, "Audited against the ledger on every visit."],
];
export const TREASURY_COUNT = TREASURY_FIGURES.length;

/** Full form: the station you are facing. */
export function StationPanel({ stationKey, s }: { stationKey: string; s: WorldState }) {
  const [kind, idxRaw] = stationKey.split("-");
  const i = Number(idxRaw);
  const m = s.member;
  switch (kind) {
    case "status":
      return (
        <Frame eyebrow="Your standing" title={<span className="flex items-center gap-2"><RankPips filled={m.rank.index + 1} />{m.rank.name} · Level {m.level}</span>}>
          <div>
            <div className="flex justify-between font-mono text-[11px] text-ink-3">
              <span>{fmt(m.xp - m.xpFloor)} / {fmt(m.xpNext - m.xpFloor)} XP</span>
              <span>L{m.level + 1}</span>
            </div>
            <div className="mt-1.5 h-1 bg-line">
              <div className="h-full bg-gold" style={{ width: `${Math.min(100, ((m.xp - m.xpFloor) / Math.max(1, m.xpNext - m.xpFloor)) * 100)}%` }} />
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3">
            <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">Streak</dt><dd className="figures text-[16px] text-ink-1">{m.streak.current}</dd></div>
            <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">Best</dt><dd className="figures text-[16px] text-ink-1">{m.streak.longest}</dd></div>
            <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">Wallet</dt><dd className="figures text-[16px] text-ink-1">{fmt(m.wallet)}</dd></div>
          </dl>
          {m.nextRank ? (
            <p><span className="figures text-gold">{fmt(m.nextRank.xpToGo)} XP</span> to {m.nextRank.name} (level {m.nextRank.level}).</p>
          ) : (
            <p>You hold the highest rank in the house.</p>
          )}
        </Frame>
      );
    case "mission": {
      const t = s.today;
      return (
        <Frame eyebrow="Today's mission" title={t.daily?.name ?? "No daily mission running"}>
          {t.daily && (
            <>
              <p>{t.daily.description}</p>
              <p className="flex gap-3"><span className="figures text-gold-bright">+{t.daily.xp} XP</span><Thc v={t.daily.thc} signed /></p>
              <CheckIn open={t.open} hoursLeft={t.hoursLeft} />
            </>
          )}
          {t.continue && (
            <div className="border-t border-line pt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Continue · {t.continue.title}</p>
              <p className="mt-1 text-ink-1">{t.continue.lessonTitle}</p>
              <div className="mt-2"><Go href={`/academy/${t.continue.slug}/lesson/${t.continue.lessonId}`}>Open the lesson</Go></div>
            </div>
          )}
          {t.nextMission && (
            <div className="border-t border-line pt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Next · {t.nextMission.name}</p>
              <p className="mt-1">{t.nextMission.description} <span className="figures text-gold-bright">+{t.nextMission.xp} XP</span></p>
            </div>
          )}
        </Frame>
      );
    }
    case "record":
      return (
        <Frame eyebrow="The record" title="What the ledger wrote">
          {s.record.length === 0 ? (
            <p>Nothing yet. Your first completed mission writes the first line.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {s.record.map((r) => (
                <li key={r.id} className="py-2">
                  <p className="text-ink-1">{r.title}</p>
                  {r.body && <p className="text-[12px] text-ink-3">{r.body}</p>}
                </li>
              ))}
            </ul>
          )}
          <Go href="/wallet">Full ledger</Go>
        </Frame>
      );
    case "program": {
      const p = s.programs[i];
      if (!p) return <Frame eyebrow="Academy" title="An empty altar" />;
      return (
        <Frame eyebrow={p.pillar.toLowerCase()} tone={PILLAR_COLOR[p.pillar]} title={p.title}>
          <p>{p.subtitle}</p>
          {p.enrolled ? (
            <>
              <div>
                <div className="flex justify-between font-mono text-[11px] text-ink-3"><span>{p.done}/{p.lessons} lessons</span><span>{p.pct}%</span></div>
                <div className="mt-1.5 h-1 bg-line"><div className="h-full" style={{ width: `${p.pct}%`, background: PILLAR_COLOR[p.pillar] }} /></div>
              </div>
              {p.next ? (
                <>
                  <p>Up next: <span className="text-ink-1">{p.next.title}</span></p>
                  <Go primary href={`/academy/${p.slug}/lesson/${p.next.id}`}>Continue</Go>
                </>
              ) : (
                <p className="text-success">Every lesson complete.</p>
              )}
            </>
          ) : (
            <>
              <p className="figures text-[12px] text-ink-3">{p.lessons} lessons · +{p.xpOnCompletion} XP on completion · free</p>
              <Go primary href={`/academy/${p.slug}`}>Enroll</Go>
            </>
          )}
        </Frame>
      );
    }
    case "challenge": {
      const c = s.challenges[i];
      if (!c)
        return (
          <Frame eyebrow="Arena" title="No challenge on the calendar">
            <p>The next season is being set. Challenges appear here with their dates and rewards the moment they are scheduled.</p>
          </Frame>
        );
      return (
        <Frame eyebrow={c.live ? "Live mission" : "Upcoming mission"} title={c.name}>
          <p>{c.objective}</p>
          <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-[12px]">
            <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">Window</dt><dd className="text-ink-1">{c.window}</dd></div>
            <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">Entered</dt><dd className="figures text-ink-1">{c.entered}</dd></div>
            <div className="col-span-2"><dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-3">Reward</dt><dd className="flex gap-3"><span className="figures text-gold-bright">+{c.xp} XP</span><Thc v={c.thc} signed /></dd></div>
          </dl>
          <Go primary={!c.status} href="/challenges">{c.status === "JOINED" ? "You're in — open" : c.status ? "View record" : "Enter mission"}</Go>
        </Frame>
      );
    }
    case "streak":
      return (
        <Frame eyebrow="Your streak" title={`${m.streak.current} ${m.streak.current === 1 ? "day" : "days"}`}>
          <p>Best run: <span className="figures text-ink-1">{m.streak.longest}</span>. Miss a day and it resets — that is what makes it worth something.</p>
          {s.today.daily && <CheckIn open={s.today.open} hoursLeft={s.today.hoursLeft} />}
        </Frame>
      );
    case "item": {
      const v = s.vault[i];
      if (!v)
        return (
          <Frame eyebrow="Vault" title="An empty plinth">
            <p>Gear goes live only once its real landed cost is on the books, so every price is honest the day it appears.</p>
          </Frame>
        );
      return (
        <Frame eyebrow={v.kind.toLowerCase()} title={v.name}>
          <p className="flex flex-wrap gap-3">
            {v.priceThc && <Thc v={v.priceThc} />}
            {v.priceFiat != null && <span className="figures text-ink-1">${(v.priceFiat / 100).toFixed(2)}</span>}
            {v.stock != null && <span className="figures text-ink-3">{v.stock} left</span>}
          </p>
          {v.time && <p className="flex gap-1.5 text-[12px] text-ink-3"><Icon name="clock" size={13} className="mt-0.5" /> {v.time}</p>}
          <Go primary href="/marketplace">Open in the Vault</Go>
        </Frame>
      );
    }
    case "figure": {
      const f = TREASURY_FIGURES[i];
      if (!f) return null;
      return (
        <Frame eyebrow="Treasury · live" title={<span className="figures text-[22px]">{fmt(f[1](s))}</span>}>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-gold">{f[0]}</p>
          <p>{f[2]}</p>
          <Go href="/status">Every figure, audited</Go>
        </Frame>
      );
    }
    case "member": {
      const r = s.network.top[i];
      if (!r)
        return (
          <Frame eyebrow="Network" title="An open seat">
            <p>Seats here are taken by verified XP, and nothing else.</p>
          </Frame>
        );
      return (
        <Frame eyebrow={`#${r.position} in the house`} title={r.displayName}>
          <p className="figures text-[12px] text-ink-3">@{r.username}{r.username === s.network.me ? " · you" : ""}</p>
          <p>{r.xp != null ? <><span className="figures text-ink-1">{fmt(r.xp)} XP</span> · level {r.level}</> : "Figures private — their choice."}</p>
          <Go href={`/u/${r.username}`}>View identity card</Go>
        </Frame>
      );
    }
    case "map":
      return (
        <Frame eyebrow="The map" title="Members by rank">
          <ul className="flex flex-col gap-1.5">
            {s.network.ranks.map((r, k) => (
              <li key={r.name} className={cn("flex items-center justify-between", k === s.network.youIndex && "text-gold-bright")}>
                <span>{r.name}{k === s.network.youIndex ? " · you" : ""}</span>
                <span className="figures">{r.count}</span>
              </li>
            ))}
          </ul>
          <Go href="/leaderboard">Full standings</Go>
        </Frame>
      );
    default:
      return null;
  }
}

/** The live fact under each building's name on the plaza. */
export function buildingFact(id: string, s: WorldState) {
  switch (id) {
    case "command":
      return s.today.open ? "Check-in open" : `Rank ${s.member.rank.name} · streak ${s.member.streak.current}`;
    case "academy": {
      const e = s.programs.filter((p) => p.enrolled).length;
      return e ? `${e} of ${s.programs.length} programs in progress` : `${s.programs.length} programs · free`;
    }
    case "arena": {
      const live = s.challenges.filter((c) => c.live).length;
      return `${live} live · ${s.challenges.length - live} upcoming`;
    }
    case "vault":
      return s.vault.length ? `${s.vault.length} items live` : "Being stocked";
    case "treasury":
      return `${fmt(s.treasury.circulating)} THC in member hands`;
    case "network":
      return `${s.network.ranks.reduce((n, r) => n + r.count, 0)} members`;
    default:
      return "";
  }
}
