import { cn } from "../cn";

/**
 * The Tycoonhood mark: a reeded coin (milled edge ticks), inner ring,
 * engraved T. Used as logo, favicon, THC glyph base, and rank insignia.
 */
export function CoinMark({ size = 28, className }: { size?: number; className?: string }) {
  const ticks = 48;
  const lines = Array.from({ length: ticks }, (_, i) => {
    const a = (i / ticks) * Math.PI * 2;
    const x1 = 50 + Math.cos(a) * 46;
    const y1 = 50 + Math.sin(a) * 46;
    const x2 = 50 + Math.cos(a) * 42;
    const y2 = 50 + Math.sin(a) * 42;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2} />;
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
      <defs>
        <linearGradient id="th-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3be4a" />
          <stop offset="0.55" stopColor="#c9a227" />
          <stop offset="1" stopColor="#8c6f1a" />
        </linearGradient>
      </defs>
      <g stroke="url(#th-gold)" fill="none">
        {lines}
        <circle cx="50" cy="50" r="36" strokeWidth="3" />
      </g>
      <g fill="url(#th-gold)">
        <rect x="30" y="30" width="40" height="9" rx="1.5" />
        <rect x="45.5" y="30" width="9" height="42" rx="1.5" />
        <rect x="41" y="68" width="18" height="4" rx="1" />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("display text-ink-1", className)}
      style={{ letterSpacing: "0.22em", fontWeight: 600 }}
    >
      TYCOONHOOD
    </span>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <CoinMark size={size} />
      <Wordmark className="text-[15px]" />
    </span>
  );
}
