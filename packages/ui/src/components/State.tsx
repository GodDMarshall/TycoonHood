import type { ReactNode } from "react";
import { cn } from "../cn";
import { Icon, type IconName } from "./Icon";

/**
 * Empty state: what belongs here, why it matters, what to do next.
 * Never an empty box.
 */
export function EmptyState({
  icon = "info",
  title,
  body,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-lg border border-dashed border-line-strong bg-bg-1/60 px-6 py-8",
        className
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-md border border-line-strong bg-bg-2 text-gold">
        <Icon name={icon} size={18} />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="display text-[17px]">{title}</p>
        {body && <p className="max-w-[52ch] text-[13px] leading-relaxed text-ink-2">{body}</p>}
      </div>
      {action}
    </div>
  );
}

type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTone: Record<NoticeTone, { cls: string; icon: IconName }> = {
  info: { cls: "border-line-strong text-ink-2", icon: "info" },
  success: { cls: "border-success/40 text-success", icon: "check" },
  warning: { cls: "border-warning/40 text-warning", icon: "alert" },
  danger: { cls: "border-danger/40 text-danger", icon: "alert" },
};

/** An inline status line: form results, honest "not configured" states. */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const t = noticeTone[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border bg-bg-1 px-4 py-3 text-[13px] leading-relaxed", t.cls, className)}
    >
      <Icon name={t.icon} size={16} className="mt-[3px]" />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold text-ink-1">{title}</p>}
        {children && <div className={title ? "text-ink-2" : undefined}>{children}</div>}
      </div>
    </div>
  );
}

/** Loading placeholder with a slow metal sweep. Reduced motion: static. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative block overflow-hidden rounded-sm bg-bg-2", className)}
    >
      <span className="absolute inset-0 animate-sweep bg-[linear-gradient(90deg,transparent,rgb(207_169_94/0.06),transparent)]" />
    </span>
  );
}
