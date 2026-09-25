"use client";
import { useState } from "react";
import { Button, Card, CardContent } from "@tycoonhood/ui";

export function InviteCode({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard blocked (older browser, or no secure context) — the code is
      // on screen in full, so it can still be read out and typed.
      setCopied(null);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tycoonhood", text: "Come build with me.", url: link });
        return;
      } catch {
        // Cancelled, or unsupported target — fall through to copying.
      }
    }
    copy(link, "link");
  }

  return (
    <Card className="mt-6">
      <CardContent className="py-5">
        <p className="eyebrow mb-2">Your code</p>
        <button
          onClick={() => copy(code, "code")}
          className="figures block w-full rounded-md border border-gold-deep/40 bg-gold-deep/5 py-3 text-center text-[26px] tracking-[0.3em] text-gold-bright"
          aria-label={`Copy invite code ${code}`}
        >
          {code}
        </button>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1" onClick={share}>
            {copied === "link" ? "Link copied" : "Share link"}
          </Button>
          <Button size="sm" variant="ghost" className="flex-1" onClick={() => copy(code, "code")}>
            {copied === "code" ? "Copied" : "Copy code"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
