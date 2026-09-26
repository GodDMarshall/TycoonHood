import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

/**
 * Surfaces. Four variants, one per level of the depth system:
 *   default     L3 content — a hairline, no lift
 *   raised      L3 lifted — a second structural edge and a shadow
 *   interactive L4 — reacts to hover and focus-within; wrap in a link
 *   gold        L5 — the ONE premium object in a view. Use sparingly.
 * Corners are architectural (4px). No blur, no glass.
 */
type CardVariant = "default" | "raised" | "interactive" | "gold";

export function Card({
  variant = "default",
  ticks = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant; ticks?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-lg border bg-bg-2/70",
        variant === "default" && "border-line",
        variant === "raised" && "border-line-strong bg-bg-2 shadow-[var(--shadow-2)]",
        variant === "interactive" &&
          "border-line transition-[border-color,background-color,transform,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-premium)] " +
            "hover:border-gold-deep hover:bg-bg-3 hover:shadow-[var(--shadow-2)] focus-within:border-gold-deep",
        variant === "gold" &&
          "border-gold-deep/70 bg-[linear-gradient(180deg,rgb(207_169_94/0.07),transparent_55%),var(--color-bg-2)] shadow-[var(--shadow-gold)]",
        ticks && "frame-ticks",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 border-b border-line px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("display text-[17px] leading-snug tracking-[-0.02em]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] leading-relaxed text-ink-2", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-t border-line px-5 py-3", className)} {...props} />;
}

/** Label + value + optional delta, set in ledger figures. */
export function Stat({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean };
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-ink-3">{label}</span>
      <span className="figures text-[24px] leading-none text-ink-1">{value}</span>
      {delta && (
        <span className={cn("figures text-[12px]", delta.positive ? "text-success" : "text-danger")}>
          {delta.positive ? "+" : "−"} {delta.value}
        </span>
      )}
      {hint && <span className="text-[12px] leading-snug text-ink-3">{hint}</span>}
    </div>
  );
}

/**
 * A readout: the instrument-panel version of Stat, for hero-level numbers.
 * The unit is set small and quiet so the figure carries the weight.
 */
export function Metric({
  label,
  value,
  unit,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-ink-3">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="figures text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] leading-none text-ink-1">{value}</span>
        {unit && <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{unit}</span>}
      </span>
      {hint && <span className="text-[12px] leading-snug text-ink-3">{hint}</span>}
    </div>
  );
}
