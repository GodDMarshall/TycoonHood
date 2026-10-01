"use client";
/**
 * A channel. Messages arrive by polling the channel feed every few seconds
 * while the tab is visible (no socket server to run or pay for); a post
 * appears for its author immediately. Staff can pin and remove; members can
 * reply, remove their own and report anyone else's.
 *
 * Times render in the reader's own clock, so they are filled in after mount.
 */
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { MessageView } from "@tycoonhood/core";
import { Avatar, Badge, Button, Icon, Notice, cn } from "@tycoonhood/ui";
import { linkify } from "../../lib/linkify";
import { markReadAction, pinMessageAction, removeMessageAction, reportMessageAction, sendMessageAction } from "../../app/(app)/community/actions";

type ChannelInfo = {
  id: string;
  slug: string;
  name: string;
  topic: string | null;
  kind: "CHAT" | "ANNOUNCEMENTS" | "WINS" | "QUESTIONS";
  slowModeSec: number;
  course: { slug: string; title: string } | null;
};

type Props = {
  channel: ChannelInfo;
  me: { id: string; staff: boolean };
  /** Null when the member may post; otherwise why not. */
  blocked: string | null;
  initial: MessageView[];
  pinned: MessageView[];
  hasOlder: boolean;
};

const POLL_MS = 4000;
const MAX = 2000;
const GROUP_MS = 5 * 60_000;

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function Body({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-1">
      {linkify(text).map((p, i) =>
        p.kind === "link" ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-gold underline decoration-gold-shadow underline-offset-2 hover:decoration-gold">
            {p.value}
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </p>
  );
}

export function ChatView({ channel, me, blocked, initial, pinned: initialPinned, hasOlder }: Props) {
  const mounted = useMounted();
  const [messages, setMessages] = useState<MessageView[]>(initial);
  const [pinned, setPinned] = useState<MessageView[]>(initialPinned);
  const [older, setOlder] = useState(hasOlder);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [body, setBody] = useState("");
  const [proof, setProof] = useState("");
  const [replyTo, setReplyTo] = useState<MessageView | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [newBelow, setNewBelow] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const preserve = useRef<number | null>(null);

  const nearBottom = () => {
    const el = scroller.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  const toBottom = (smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewBelow(false);
  };

  // First paint: jump to a linked message (#m-<id>) or to the newest.
  useLayoutEffect(() => {
    const id = window.location.hash.startsWith("#m-") ? window.location.hash.slice(3) : null;
    const target = id ? document.getElementById(`m-${id}`) : null;
    if (target) {
      target.scrollIntoView({ block: "center" });
      setHighlight(id);
      stick.current = false;
    } else toBottom();
    void markReadAction(channel.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the reading position when older messages are prepended.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && preserve.current !== null) {
      el.scrollTop = el.scrollHeight - preserve.current;
      preserve.current = null;
    } else if (stick.current) toBottom();
  }, [messages]);

  // Poll for new messages and for removals/pins of what is on screen.
  const lastId = messages[messages.length - 1]?.id;
  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const ids = messages.slice(-60).map((m) => m.id).join(",");
    const qs = new URLSearchParams();
    if (lastId) qs.set("after", lastId);
    if (ids) qs.set("ids", ids);
    try {
      const r = await fetch(`/api/community/${channel.slug}?${qs}`, { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as { messages: MessageView[]; changes: { id: string; removed: boolean; pinned: boolean }[] };
      const changed = new Map(data.changes.map((c) => [c.id, c]));
      const fresh = data.messages;
      if (fresh.length === 0 && data.changes.every((c) => {
        const m = messages.find((x) => x.id === c.id);
        return m && m.removed === c.removed && m.pinned === c.pinned;
      })) return;
      const atBottom = nearBottom();
      stick.current = atBottom;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const updated = prev.map((m) => {
          const c = changed.get(m.id);
          return c ? { ...m, removed: c.removed, pinned: c.pinned, body: c.removed ? null : m.body, proofUrl: c.removed ? null : m.proofUrl } : m;
        });
        return [...updated, ...fresh.filter((m) => !seen.has(m.id))];
      });
      if (fresh.some((m) => !m.mine)) {
        if (atBottom) void markReadAction(channel.id);
        else setNewBelow(true);
      }
    } catch {
      // Offline for a moment; the next poll tries again.
    }
  }, [channel.id, channel.slug, lastId, messages]);

  useEffect(() => {
    const t = window.setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // Slow mode countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const loadOlder = async () => {
    const first = messages[0]?.id;
    if (!first) return;
    setLoadingOlder(true);
    try {
      const r = await fetch(`/api/community/${channel.slug}?before=${first}`, { cache: "no-store" });
      const data = (await r.json()) as { messages: MessageView[]; hasMore: boolean };
      const el = scroller.current;
      preserve.current = el ? el.scrollHeight - el.scrollTop : null;
      stick.current = false;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...data.messages.filter((m) => !seen.has(m.id)), ...prev];
      });
      setOlder(data.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const text = body.trim();
    if (!text || sending || cooldown > 0) return;
    setSending(true);
    setError(null);
    const r = await sendMessageAction(channel.slug, { body: text, proofUrl: channel.kind === "WINS" ? proof : null, replyToId: replyTo?.id ?? null });
    setSending(false);
    if (r.error || !r.message) {
      setError(r.error ?? "That did not send. Try again.");
      return;
    }
    stick.current = true;
    setMessages((prev) => (prev.some((m) => m.id === r.message!.id) ? prev : [...prev, r.message!]));
    setBody("");
    setProof("");
    setReplyTo(null);
    if (channel.slowModeSec > 0 && !me.staff) setCooldown(channel.slowModeSec);
    input.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
    if (e.key === "Escape" && replyTo) setReplyTo(null);
  };

  const remove = async (m: MessageView) => {
    if (!window.confirm(m.mine ? "Remove your message?" : "Remove this message for everyone?")) return;
    const r = await removeMessageAction(m.id);
    if (r.error) return setError(r.error);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, removed: true, body: null, proofUrl: null, pinned: false } : x)));
    setPinned((prev) => prev.filter((x) => x.id !== m.id));
  };

  const togglePin = async (m: MessageView) => {
    const r = await pinMessageAction(m.id, !m.pinned);
    if (r.error) return setError(r.error);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !m.pinned } : x)));
    setPinned((prev) => (m.pinned ? prev.filter((x) => x.id !== m.id) : [{ ...m, pinned: true }, ...prev]));
  };

  const report = async (id: string) => {
    const r = await reportMessageAction(id, reportReason);
    if (r.error) return setError(r.error);
    setReporting(null);
    setReportReason("");
    setFlash("Reported. Staff will review it.");
    window.setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 lg:px-6">
        <Link href="/community" className="-ml-1 flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-bg-2 lg:hidden" aria-label="All channels">
          <Icon name="arrow-left" size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-semibold">
            {channel.name}
            {channel.course && <span className="font-normal text-ink-3"> · {channel.course.title}</span>}
          </h1>
          {channel.topic && <p className="truncate text-[13px] text-ink-3">{channel.topic}</p>}
        </div>
        {pinned.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPins((v) => !v)}
            aria-expanded={showPins}
            className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-2 hover:bg-bg-2 hover:text-ink-1"
          >
            <Icon name="pin" size={15} /> {pinned.length}
            <span className="max-sm:sr-only"> pinned</span>
          </button>
        )}
      </header>

      {showPins && (
        <div className="max-h-[40%] shrink-0 overflow-y-auto border-b border-line bg-bg-1 px-4 py-3 lg:px-6">
          <p className="mb-2 text-[12.5px] font-medium text-ink-3">Pinned by staff</p>
          <ul className="flex flex-col gap-2">
            {pinned.map((p) => (
              <li key={p.id}>
                <a href={`#m-${p.id}`} onClick={() => setShowPins(false)} className="block rounded-md border border-line bg-bg-0 p-3 hover:border-line-strong">
                  <span className="text-[12.5px] text-ink-3">{p.author.name}</span>
                  <span className="mt-0.5 line-clamp-3 block whitespace-pre-wrap text-[14px] text-ink-1">{p.body}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scroller}
        onScroll={() => {
          stick.current = nearBottom();
          if (stick.current && newBelow) {
            setNewBelow(false);
            void markReadAction(channel.id);
          }
        }}
        className="relative min-h-0 flex-1 overflow-y-auto px-2 py-4 lg:px-4"
      >
        {older ? (
          <div className="mb-4 flex justify-center">
            <Button variant="ghost" size="sm" loading={loadingOlder} onClick={loadOlder}>
              Load earlier messages
            </Button>
          </div>
        ) : (
          <div className="mx-2 mb-6 rounded-lg border border-line bg-bg-1 p-5 lg:mx-2">
            <p className="text-[15px] font-semibold">Welcome to {channel.name}</p>
            {channel.topic && <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{channel.topic}</p>}
            {messages.length === 0 && <p className="mt-2 text-[14px] text-ink-3">Nothing here yet.</p>}
          </div>
        )}

        <ol role="log" aria-label={`Messages in ${channel.name}`} className="flex flex-col">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            const compact =
              !newDay && !!prev && prev.author.id === m.author.id && !m.replyTo && !prev.removed && +new Date(m.createdAt) - +new Date(prev.createdAt) < GROUP_MS;
            const canRemove = !m.removed && (m.mine || me.staff);
            return (
              <li key={m.id}>
                {newDay && (
                  <div className="my-4 flex items-center gap-3 px-2" aria-hidden={!mounted}>
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[12px] font-medium text-ink-3" suppressHydrationWarning>
                      {mounted ? dayLabel(m.createdAt) : ""}
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <article
                  id={`m-${m.id}`}
                  className={cn(
                    "group relative flex gap-3 rounded-md px-2 transition-colors hover:bg-bg-1",
                    compact ? "py-0.5" : "mt-2 pt-2 pb-1",
                    highlight === m.id && "bg-gold/[0.08] ring-1 ring-gold-deep/50",
                    m.pinned && "border-l-2 border-gold-deep"
                  )}
                >
                  <div className="w-9 shrink-0">
                    {!compact && <Avatar name={m.author.name} src={m.author.avatarUrl} size={36} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {!compact && (
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        {m.author.username ? (
                          <Link href={`/u/${m.author.username}`} className="text-[14.5px] font-semibold text-ink-1 hover:underline">
                            {m.author.name}
                          </Link>
                        ) : (
                          <span className="text-[14.5px] font-semibold text-ink-1">{m.author.name}</span>
                        )}
                        {m.author.staff ? <Badge tone="gold">Staff</Badge> : m.author.rank ? <span className="text-[12.5px] text-ink-3">{m.author.rank.replace(/^Tycoon\s+/, "")}</span> : null}
                        <time dateTime={m.createdAt} className="text-[12px] text-ink-3" suppressHydrationWarning>
                          {mounted ? timeOf(m.createdAt) : ""}
                        </time>
                        {m.pinned && (
                          <span className="inline-flex items-center gap-1 text-[12px] text-gold">
                            <Icon name="pin" size={12} /> Pinned
                          </span>
                        )}
                      </p>
                    )}
                    {m.replyTo && (
                      <a href={`#m-${m.replyTo.id}`} className="mb-1 mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-ink-3 hover:text-ink-2">
                        <Icon name="reply" size={13} className="shrink-0" />
                        <span className="font-medium text-ink-2">{m.replyTo.author}</span>
                        <span className="truncate">{m.replyTo.excerpt ?? "a removed message"}</span>
                      </a>
                    )}
                    {m.removed ? (
                      <p className="text-[14px] italic text-ink-3">This message was removed.</p>
                    ) : (
                      <>
                        <Body text={m.body ?? ""} />
                        {(m.lesson || m.proofUrl) && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {m.lesson && (
                              <Link
                                href={`/courses/${m.lesson.courseSlug}/lesson/${m.lesson.id}`}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-bg-1 px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink-1"
                              >
                                <Icon name="book" size={13} className="shrink-0 text-ink-3" /> <span className="truncate">About: {m.lesson.title}</span>
                              </Link>
                            )}
                            {m.proofUrl && (
                              <a
                                href={m.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow ugc"
                                className="inline-flex items-center gap-1.5 rounded-md border border-gold-deep/60 bg-gold/[0.06] px-2.5 py-1 text-[12.5px] text-gold-bright hover:border-gold"
                              >
                                <Icon name="external" size={13} /> Proof
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {!m.removed && (
                    <div className="absolute -top-3 right-2 hidden items-center gap-0.5 rounded-md border border-line-strong bg-bg-2 p-0.5 shadow-[var(--shadow-2)] group-focus-within:flex group-hover:flex">
                      {!blocked && (
                        <button type="button" onClick={() => { setReplyTo(m); input.current?.focus(); }} className="flex size-8 items-center justify-center rounded text-ink-2 hover:bg-bg-3 hover:text-ink-1" aria-label={`Reply to ${m.author.name}`}>
                          <Icon name="reply" size={15} />
                        </button>
                      )}
                      {me.staff && (
                        <button type="button" onClick={() => togglePin(m)} className="flex size-8 items-center justify-center rounded text-ink-2 hover:bg-bg-3 hover:text-ink-1" aria-label={m.pinned ? "Unpin" : "Pin for everyone"}>
                          <Icon name="pin" size={15} />
                        </button>
                      )}
                      {!m.mine && (
                        <button type="button" onClick={() => setReporting(m.id)} className="flex size-8 items-center justify-center rounded text-ink-2 hover:bg-bg-3 hover:text-ink-1" aria-label="Report to staff">
                          <Icon name="flag" size={15} />
                        </button>
                      )}
                      {canRemove && (
                        <button type="button" onClick={() => remove(m)} className="flex size-8 items-center justify-center rounded text-ink-2 hover:bg-bg-3 hover:text-danger" aria-label={m.mine ? "Remove your message" : "Remove message"}>
                          <Icon name="trash" size={15} />
                        </button>
                      )}
                    </div>
                  )}

                  {reporting === m.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void report(m.id);
                      }}
                      className="absolute inset-x-2 top-full z-10 mt-1 flex flex-col gap-2 rounded-md border border-line-strong bg-bg-2 p-3 shadow-[var(--shadow-3)] sm:flex-row"
                    >
                      <label htmlFor={`reason-${m.id}`} className="sr-only">
                        What is wrong with this message?
                      </label>
                      <input
                        id={`reason-${m.id}`}
                        autoFocus
                        required
                        minLength={3}
                        maxLength={300}
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="What is wrong with it? (spam, abuse, …)"
                        className="h-9 flex-1 rounded-md border border-line-input/60 bg-bg-0 px-3 text-[14px] focus:border-gold-deep focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">
                          Report
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setReporting(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </article>
              </li>
            );
          })}
        </ol>

        {newBelow && (
          <button
            type="button"
            onClick={() => {
              toBottom(true);
              void markReadAction(channel.id);
            }}
            className="sticky bottom-2 left-1/2 mx-auto mt-2 flex -translate-x-0 items-center gap-1.5 rounded-full border border-gold-deep bg-bg-2 px-3.5 py-1.5 text-[13px] text-gold-bright shadow-[var(--shadow-2)]"
          >
            New messages <Icon name="chevron-down" size={14} />
          </button>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line bg-bg-0 px-3 pb-3 pt-2 lg:px-6 lg:pb-4">
        {flash && (
          <p className="mb-2 text-[13px] text-success" role="status">
            {flash}
          </p>
        )}
        {error && (
          <Notice tone="danger" className="mb-2">
            {error}
          </Notice>
        )}
        {blocked ? (
          <p className="flex items-center gap-2 rounded-md border border-line bg-bg-1 px-4 py-3 text-[14px] text-ink-3">
            <Icon name="lock" size={15} /> {blocked}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="rounded-lg border border-line-strong bg-bg-1 focus-within:border-gold-deep"
          >
            {replyTo && (
              <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[13px] text-ink-3">
                <Icon name="reply" size={13} />
                Replying to <span className="font-medium text-ink-2">{replyTo.author.name}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="ml-auto flex size-6 items-center justify-center rounded hover:bg-bg-3 hover:text-ink-1" aria-label="Cancel reply">
                  <Icon name="x" size={13} />
                </button>
              </div>
            )}
            <label htmlFor="composer" className="sr-only">
              Message {channel.name}
            </label>
            <textarea
              ref={input}
              id="composer"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX))}
              onKeyDown={onKey}
              rows={channel.kind === "WINS" ? 2 : 1}
              placeholder={
                channel.kind === "WINS"
                  ? "What did you do, and what did it get you?"
                  : channel.kind === "QUESTIONS"
                    ? "Ask a specific question…"
                    : `Message ${channel.name}`
              }
              className="block max-h-48 min-h-11 w-full resize-y bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-ink-1 placeholder:text-ink-3 focus:outline-none"
            />
            {channel.kind === "WINS" && (
              <div className="border-t border-line px-3.5 py-2">
                <label htmlFor="proof" className="sr-only">
                  Proof link
                </label>
                <input
                  id="proof"
                  type="url"
                  inputMode="url"
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Proof link (https://…) — a screenshot, a page, a result"
                  className="h-8 w-full bg-transparent text-[14px] text-ink-1 placeholder:text-ink-3 focus:outline-none"
                />
              </div>
            )}
            <div className="flex items-center gap-3 border-t border-line px-3 py-2">
              <span className="text-[12px] text-ink-3">
                {cooldown > 0 ? `Slow mode: ${cooldown}s` : body.length > MAX - 200 ? `${MAX - body.length} left` : channel.slowModeSec > 0 && !me.staff ? `Slow mode ${channel.slowModeSec}s` : "Enter to send · Shift+Enter for a new line"}
              </span>
              <Button type="submit" size="sm" className="ml-auto" loading={sending} disabled={!body.trim() || cooldown > 0}>
                <Icon name="send" size={14} /> Send
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
