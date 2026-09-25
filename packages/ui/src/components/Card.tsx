import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

type CardVariant = "default" | "raised" | "gold";

export function Card({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-bg-1",
        variant === "default" && "border-line",
        variant === "raised" && "border-line shadow-[var(--shadow-raise)]",
        variant === "gold" && "border-gold-deep shadow-[var(--shadow-gold)]",
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
  return <h3 className={cn("display text-[17px] font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] text-ink-2", className)} {...props} />;
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
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">{label}</span>
      <span className="figures text-[24px] leading-none text-ink-1">{value}</span>
      {delta && (
        <span className={cn("figures text-[12px]", delta.positive ? "text-success" : "text-danger")}>
          {delta.positive ? "▲" : "▼"} {delta.value}
        </span>
      )}
    </div>
  );
}
