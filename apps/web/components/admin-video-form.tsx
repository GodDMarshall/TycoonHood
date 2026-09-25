"use client";
import { useActionState, useMemo, useState } from "react";
import { Button, Field, Input } from "@tycoonhood/ui";
import { saveVideoAction, type VideoFormState } from "../app/(app)/admin/videos/actions";

import { extractVideoId as idFrom, parseDuration as secondsFrom, clockOf as clock } from "../lib/youtube";

export function VideoForm({ defaultFraction, dailyCap }: { defaultFraction: number; dailyCap: number }) {
  const [state, action, pending] = useActionState(saveVideoAction, {} as VideoFormState);
  const [video, setVideo] = useState("");
  const [duration, setDuration] = useState("");
  const [required, setRequired] = useState("");
  const [rewardThc, setRewardThc] = useState("");

  const videoId = useMemo(() => idFrom(video), [video]);
  const durSec = useMemo(() => secondsFrom(duration), [duration]);
  const reqSec = useMemo(() => {
    const explicit = secondsFrom(required);
    if (explicit) return explicit;
    return durSec ? Math.floor(durSec * defaultFraction) : null;
  }, [required, durSec, defaultFraction]);

  const perHour = useMemo(() => {
    const thc = Number(rewardThc.replace(/[,\s]/g, ""));
    if (!thc || !reqSec) return null;
    return Math.round((thc / reqSec) * 3600);
  }, [rewardThc, reqSec]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title members see" htmlFor="title">
          <Input id="title" name="title" required placeholder="How to read a P&L in ten minutes" />
        </Field>
        <Field label="Slug" htmlFor="slug">
          <Input id="slug" name="slug" required placeholder="read-a-pnl" />
        </Field>
      </div>

      <Field label="One line of context" htmlFor="description">
        <Input id="description" name="description" placeholder="Part of the Business Mastery track." />
      </Field>

      <Field label="YouTube link or id" htmlFor="video">
        <Input id="video" name="video" required value={video} onChange={(e) => setVideo(e.target.value)}
          placeholder="https://youtu.be/… or the 11-character id" />
        {video.trim() && (
          videoId
            ? <p className="mt-1 figures text-[12px] text-success">Video {videoId}</p>
            : <p className="mt-1 text-[12px] text-danger">Not a YouTube link or id yet.</p>
        )}
        <p className="mt-1 text-[11px] text-ink-3">
          Our own channel only. This pays for attention to Tycoonhood, not to somebody else.
        </p>
      </Field>

      {videoId && (
        <div className="overflow-hidden rounded-md border border-line" style={{ aspectRatio: "16 / 9", maxWidth: 420 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- preview thumbnail
              for an arbitrary YouTube id, inside the admin only. */}
          <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="How long it is" htmlFor="duration">
          <Input id="duration" name="duration" required value={duration}
            onChange={(e) => setDuration(e.target.value)} placeholder="9:42" />
          <p className="mt-1 text-[11px] text-ink-3">9:42, or 9m42s, or 582.</p>
        </Field>
        <Field label="How much must be watched" htmlFor="required">
          <Input id="required" name="required" value={required}
            onChange={(e) => setRequired(e.target.value)}
            placeholder={durSec ? clock(Math.floor(durSec * defaultFraction)) : "defaults to 90%"} />
          {durSec && reqSec && (
            <p className="mt-1 text-[12px] text-ink-3">
              {clock(reqSec)} of {clock(durSec)} — {Math.round((reqSec / durSec) * 100)}% of the video.
            </p>
          )}
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="THC reward" htmlFor="rewardThc">
          <Input id="rewardThc" name="rewardThc" inputMode="numeric" value={rewardThc}
            onChange={(e) => setRewardThc(e.target.value)} placeholder="150" />
          {perHour != null && (
            <p className="mt-1 figures text-[12px] text-ink-3">
              {perHour.toLocaleString("en-US")} THC per hour of attention.
            </p>
          )}
        </Field>
        <Field label="XP reward" htmlFor="rewardXp">
          <Input id="rewardXp" name="rewardXp" inputMode="numeric" placeholder="20" />
        </Field>
      </div>

      <input type="hidden" name="sortOrder" value="0" />

      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" name="active" />
        Live in the Miner now
      </label>

      <p className="text-[11px] leading-relaxed text-ink-3">
        Paid once per member, for life. Each member can be paid for at most {dailyCap} videos
        a day. The server times every watch independently of the browser, so skipping
        ahead, double speed and background tabs earn nothing.
      </p>

      {state.error && <p className="text-[13px] text-danger">{state.error}</p>}
      {state.message && (
        <div>
          <p className="text-[13px] text-success">{state.message}</p>
          {state.notes?.map((n, i) => <p key={i} className="mt-1 text-[12px] text-ink-3">{n}</p>)}
        </div>
      )}

      <Button type="submit" loading={pending} className="self-start">Save video task</Button>
    </form>
  );
}
