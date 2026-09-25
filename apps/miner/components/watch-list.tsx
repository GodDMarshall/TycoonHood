"use client";
import { useState } from "react";
import { WatchPlayer, type WatchTaskView } from "./watch-player";

export function WatchList({ tasks, capReached }: { tasks: WatchTaskView[]; capReached: boolean }) {
  const [justPaid, setJustPaid] = useState<string | null>(null);
  const [paidSlugs, setPaidSlugs] = useState<string[]>([]);

  const open = tasks.filter((t) => !t.paid && !paidSlugs.includes(t.slug));
  const done = tasks.filter((t) => t.paid || paidSlugs.includes(t.slug));

  return (
    <div className="flex flex-col gap-3">
      {justPaid && (
        <p role="status" className="rounded-md border border-gold-deep/40 bg-gold-deep/10 px-3 py-2 text-[13px] text-gold-bright">
          +{Number(justPaid).toLocaleString("en-US")} THC in your wallet.
        </p>
      )}

      {capReached && open.length > 0 && (
        <p className="rounded-md border border-line px-3 py-2 text-[12px] text-ink-3">
          You have hit today&rsquo;s limit. These stay here for tomorrow.
        </p>
      )}

      {open.map((t) => (
        <WatchPlayer
          key={t.slug}
          task={t}
          onPaid={(thc) => {
            setJustPaid(thc);
            setPaidSlugs((s) => [...s, t.slug]);
          }}
        />
      ))}

      {done.map((t) => (
        <WatchPlayer key={t.slug} task={{ ...t, paid: true }} onPaid={() => {}} />
      ))}
    </div>
  );
}
