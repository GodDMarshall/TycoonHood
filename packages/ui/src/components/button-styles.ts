import { cn } from "../cn";

/**
 * Button styling as a plain function, so a server-rendered <Link> can wear
 * exactly the same surface as a <Button>. Lives outside the client module
 * on purpose: a non-component export from a "use client" file becomes a
 * client reference when a server component imports it.
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  // The lit object. Solid metal, a top-edge highlight, a low warm shadow.
  primary:
    "bg-gold text-bg-0 font-semibold hover:bg-gold-bright active:bg-gold-deep " +
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_28px_-12px_rgb(207_169_94/0.55)]",
  // A framed surface — the default for any second action.
  secondary:
    "bg-bg-2 text-ink-1 font-medium border border-line-strong hover:border-gold-deep hover:bg-bg-3",
  outline:
    "bg-transparent text-ink-1 font-medium border border-line-strong hover:border-gold-deep hover:text-gold-bright",
  ghost: "bg-transparent text-ink-2 font-medium hover:text-ink-1 hover:bg-bg-2",
  danger: "bg-danger/10 text-danger font-medium border border-danger/40 hover:bg-danger/20",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-[14px] gap-2",
  lg: "h-12 px-6 text-[15px] gap-2.5",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "group/btn relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-md",
    "tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-[var(--dur-2)] ease-[var(--ease-premium)] active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    variants[variant],
    sizes[size],
    className
  );
}
