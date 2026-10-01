/**
 * Page furniture for the member app: one width, one header pattern, one
 * section heading. Every member page uses these, so the app reads as one
 * product instead of a collection of pages.
 */
import type { ReactNode } from "react";
import { cn } from "@tycoonhood/ui";

export function Page({ children, width = "default", className }: { children: ReactNode; width?: "default" | "narrow" | "wide"; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10",
        width === "narrow" && "max-w-[760px]",
        width === "default" && "max-w-[1120px]",
        width === "wide" && "max-w-[1360px]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  kicker,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** A small line above the title (a date, a program name). */
  kicker?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {kicker && <p className="mb-1.5 text-[13px] font-medium text-ink-3">{kicker}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink-1 sm:text-[30px]">{title}</h1>
        {description && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action, className, id }: { children: ReactNode; action?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 id={id} className="text-[16px] font-semibold tracking-[-0.01em] text-ink-1">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** A plain surface: the app's card. */
export function Panel({ children, className, as: As = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "ul" | "ol" } & Record<string, unknown>) {
  return (
    <As className={cn("rounded-lg border border-line bg-bg-1", className)} {...rest}>
      {children}
    </As>
  );
}
