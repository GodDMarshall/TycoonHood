"use client";
import { useState } from "react";
import { Button } from "@tycoonhood/ui";

/** The member's referral link with a copy button. The link stays on screen in full if the clipboard is blocked. */
export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <code className="figures min-w-0 flex-1 truncate rounded-md border border-line-strong bg-bg-0/60 px-3 py-2.5 text-[13px] text-ink-1" title={link}>
        {link}
      </code>
      <Button size="sm" onClick={copy} aria-live="polite">
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
