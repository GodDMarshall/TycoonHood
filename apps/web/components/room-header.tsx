/**
 * The entrance to a room. Every page opens the same way: the district it
 * belongs to, one headline (with at most one serif accent), one line of
 * purpose, and the room's primary actions. Public rooms get the full band
 * with the blueprint plane; member rooms use the compact form so the work
 * starts above the fold.
 */
import type { ReactNode } from "react";
import { Icon, cn, type IconName } from "@tycoonhood/ui";

export function RoomHeader({
  icon,
  room,
  title,
  accent,
  lead,
  children,
  aside,
  compact = false,
  className,
}: {
  icon?: IconName;
  room: string;
  title: ReactNode;
  accent?: ReactNode;
  lead?: ReactNode;
  /** Actions, under the lead. */
  children?: ReactNode;
  /** Right-hand column on wide screens (figures, art). */
  aside?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const body = (
    <div className={cn("grid gap-10", aside && "lg:grid-cols-[1.3fr_1fr] lg:items-end")}>
      <div className="animate-rise">
        <p className="mb-5 flex items-center gap-2.5">
          {icon && (
            <span className="flex size-7 items-center justify-center rounded-sm border border-line-strong text-gold">
              <Icon name={icon} size={14} />
            </span>
          )}
          <span className="eyebrow">{room}</span>
        </p>
        <h1 className={cn("display max-w-[18ch]", compact ? "text-h1" : "text-display")}>
          {title}
          {accent && (
            <>
              {" "}
              <span className="accent">{accent}</span>
            </>
          )}
        </h1>
        {lead && <p className={cn("mt-5 max-w-[60ch] text-ink-2", compact ? "text-[15px] leading-relaxed" : "text-lead")}>{lead}</p>}
        {children && <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
      {aside && <div className="animate-fade">{aside}</div>}
    </div>
  );

  if (compact) return <header className={cn("mb-10 md:mb-12", className)}>{body}</header>;

  return (
    <header className={cn("relative overflow-hidden border-b border-line", className)}>
      <div className="grid-plane pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div className="relative mx-auto max-w-[88rem] px-[var(--gutter)] pb-16 pt-16 md:pb-20 md:pt-24">{body}</div>
    </header>
  );
}
