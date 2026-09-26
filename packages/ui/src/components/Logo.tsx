import { cn } from "../cn";

/**
 * The Tycoonhood mark: a reeded coin — milled edge, inner ring, a T cut
 * like a column capital. Logo, favicon, THC glyph and rank seal.
 *
 * Solid metal rather than an SVG gradient: gradient ids collide when the
 * mark renders more than once per page, and a gradient inside a hidden
 * (display:none) nav stops painting in Chromium.
 */
export function CoinMark({ size = 28, className }: { size?: number; className?: string }) {
  const ticks = size >= 40 ? 60 : 36;
  const lines = Array.from({ length: ticks }, (_, i) => {
    const a = (i / ticks) * Math.PI * 2;
    return (
      <line
        key={i}
        x1={50 + Math.cos(a) * 47}
        y1={50 + Math.sin(a) * 47}
        x2={50 + Math.cos(a) * 42.5}
        y2={50 + Math.sin(a) * 42.5}
        strokeWidth={size >= 40 ? 1.6 : 2.4}
      />
    );
  });
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Tycoonhood"
    >
      <g stroke="var(--color-gold)" fill="none">
        {lines}
        <circle cx="50" cy="50" r="37" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="33" strokeWidth="1" stroke="var(--color-gold-deep)" />
      </g>
      <g fill="var(--color-gold)">
        <path d="M29 29h42v8H56v28h-12V37H29z" />
        <path d="M38 68h24v4H38z" fill="var(--color-gold-bright)" />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-sans font-semibold uppercase tracking-[0.3em] text-ink-1 max-[400px]:tracking-[0.2em]", className)}>
      Tycoonhood
    </span>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <CoinMark size={size} />
      <Wordmark className="text-[13px]" />
    </span>
  );
}
