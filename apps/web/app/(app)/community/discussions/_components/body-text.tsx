/**
 * A post or comment body: stored raw, rendered as text. Paragraphs split on
 * blank lines, single newlines kept, http(s) links made clickable. Never HTML.
 */
import { linkify } from "../../../../../lib/linkify";
import { cn } from "@tycoonhood/ui";

export function BodyText({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n{2,}/);
  return (
    <div className={cn("flex flex-col gap-3 break-words text-[15px] leading-relaxed text-ink-1", className)}>
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {linkify(p).map((part, j) =>
            part.kind === "link" ? (
              <a key={j} href={part.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-gold underline decoration-gold-shadow underline-offset-2 hover:text-gold-bright">
                {part.value}
              </a>
            ) : (
              <span key={j}>{part.value}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}
