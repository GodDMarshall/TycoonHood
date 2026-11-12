"use client";
/** Markdown body with a Write / Preview toggle. The preview uses the same sanitising renderer as the lesson page. */
import { useState } from "react";
// Deep path, not the package barrel: the barrel would pull Prisma into the browser bundle.
import { renderMarkdown } from "@tycoonhood/core/src/content/markdown";
import { Label, Textarea, cn } from "@tycoonhood/ui";

export function MarkdownField({ name, defaultValue, label = "Body (Markdown)", rows = 18 }: { name: string; defaultValue?: string | null; label?: string; rows?: number }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`md-${name}`}>{label}</Label>
        <div role="tablist" aria-label="Editor mode" className="flex gap-1 rounded-md border border-line p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded px-2.5 py-1 text-[12.5px]", tab === t ? "bg-bg-3 text-ink-1" : "text-ink-3 hover:text-ink-1")}
            >
              {t === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        id={`md-${name}`}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn("font-mono text-[13.5px]", tab === "preview" && "hidden")}
      />
      {tab === "preview" && (
        <div
          className="md-content min-h-[200px] rounded-md border border-line bg-bg-0 p-5"
          dangerouslySetInnerHTML={{ __html: value.trim() ? renderMarkdown(value) : "<p>Nothing to preview yet.</p>" }}
        />
      )}
      <p className="text-[12.5px] text-ink-3">{value.split(/\s+/).filter(Boolean).length} words</p>
    </div>
  );
}
