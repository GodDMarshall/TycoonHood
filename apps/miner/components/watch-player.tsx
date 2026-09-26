"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardContent, Icon, Progress } from "@tycoonhood/ui";
import { startWatchAction, heartbeatWatchAction, settleWatchAction } from "../app/actions";

export interface WatchTaskView {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  youtubeVideoId: string;
  durationSec: number;
  requiredSec: number;
  rewardThc: string;
  rewardXp: number;
  paid: boolean;
  secondsWatched: number;
}

/**
 * The player reports; the server decides.
 *
 * Progress comes from the real YouTube player's own clock, sent up every few
 * seconds. The server clamps every figure to the wall-clock time since it
 * stamped the start, so a forged report buys nothing. Settling is refused
 * until both the clock and the reports agree the video was watched.
 */
export function WatchPlayer({ task, onPaid }: { task: WatchTaskView; onPaid: (thc: string) => void }) {
  const [open, setOpen] = useState(false);
  const [watched, setWatched] = useState(task.secondsWatched);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "ready" | "settling" | "paid">(
    task.paid ? "paid" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const watchedRef = useRef(watched);
  watchedRef.current = watched;

  const needed = task.requiredSec;
  const pct = Math.min(100, Math.round((watched / needed) * 100));
  const ready = watched >= needed;

  // ── Open: ask the server to stamp a start, then mount the real player ──
  const begin = useCallback(async () => {
    setError(null);
    setStatus("loading");
    const r = await startWatchAction(task.slug);
    if (r.error) {
      setError(r.error);
      setStatus("idle");
      return;
    }
    setOpen(true);
  }, [task.slug]);

  // ── Mount the YouTube iframe player once the panel is open ──
  useEffect(() => {
    if (!open || !mountRef.current) return;
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId: task.youtubeVideoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.PLAYING) setStatus("playing");
            if (e.data === YT.PlayerState.ENDED) setStatus((s) => (s === "paid" ? s : "ready"));
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [open, task.youtubeVideoId]);

  // ── Heartbeat: report the player's own clock every 5s while it plays ──
  useEffect(() => {
    if (!open || status === "paid") return;
    const id = setInterval(async () => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      const t = Math.floor(p.getCurrentTime());
      if (t <= watchedRef.current) return;
      setWatched(t);
      await heartbeatWatchAction(task.slug, t);
    }, 5000);
    return () => clearInterval(id);
  }, [open, status, task.slug]);

  // ── Settle ──
  const settle = useCallback(async () => {
    setStatus("settling");
    setError(null);
    // Send the latest figure first so the server is not a heartbeat behind.
    const p = playerRef.current;
    if (p?.getCurrentTime) await heartbeatWatchAction(task.slug, Math.floor(p.getCurrentTime()));
    const r = await settleWatchAction(task.slug);
    if (r.error) {
      setError(r.error);
      setStatus(ready ? "ready" : "playing");
      return;
    }
    setStatus("paid");
    onPaid(r.paidThc ?? "0");
  }, [task.slug, ready, onPaid]);

  if (status === "paid") {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="min-w-0">
            <p className="truncate text-[14px] text-ink-2 line-through">{task.title}</p>
            <p className="text-[11px] text-success">Paid · {Number(task.rewardThc).toLocaleString("en-US")} THC</p>
          </div>
          <Icon name="check" size={18} className="text-success" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink-1">{task.title}</p>
            {task.description && (
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{task.description}</p>
            )}
            <p className="figures mt-1.5 text-[11px] text-gold-deep">
              {Number(task.rewardThc).toLocaleString("en-US")} THC
              {task.rewardXp > 0 && ` · ${task.rewardXp} XP`}
              {" · watch "}
              {formatSec(needed)} of {formatSec(task.durationSec)}
            </p>
          </div>
          {!open && (
            <Button size="sm" onClick={begin} loading={status === "loading"}>
              Watch
            </Button>
          )}
        </div>

        {open && (
          <div className="mt-3">
            <div className="relative w-full overflow-hidden rounded-md border border-line" style={{ aspectRatio: "16 / 9" }}>
              <div ref={mountRef} className="absolute inset-0 h-full w-full" />
            </div>

            <div className="mt-3">
              <Progress value={pct} />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="figures text-[11px] text-ink-3">
                  {formatSec(Math.min(watched, needed))} / {formatSec(needed)} counted
                </span>
                <Button size="sm" onClick={settle} disabled={!ready} loading={status === "settling"}>
                  {ready ? "Claim reward" : "Keep watching"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}

// ───────────────────────────── YouTube iframe API ─────────────────────────

interface YTPlayer {
  getCurrentTime?: () => number;
  destroy?: () => void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
  PlayerState: { PLAYING: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads the official iframe API once, no matter how many tasks are on screen. */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve(window.YT!);
    };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}
