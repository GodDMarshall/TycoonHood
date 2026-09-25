"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-bg-0 font-semibold hover:bg-gold-bright active:bg-gold-deep " +
    "shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_16px_rgba(201,162,39,0.18)]",
  outline:
    "border border-line-strong text-ink-1 hover:border-gold-deep hover:text-gold-bright bg-transparent",
  ghost: "text-ink-2 hover:text-ink-1 hover:bg-bg-2 bg-transparent",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-sm",
  md: "h-10 px-4 text-[14px] rounded-md",
  lg: "h-12 px-6 text-[15px] rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
});
