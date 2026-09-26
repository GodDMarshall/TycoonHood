import type { ReactNode } from "react";
import { cn } from "../cn";

/** The rule: a hairline with an optional small-caps heading and an index. */
export function SectionRule({ label, index, className }: { label?: string; index?: string; className?: string }) {
  if (!label) return <hr className={cn("border-line", className)} />;
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {index && <span className="index">{index}</span>}
      <span className="eyebrow">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" aria-hidden />
    </div>
  );
}

/**
 * The house section heading. One structure everywhere:
 *   index · eyebrow  /  title with an optional serif accent  /  lead
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  accent,
  lead,
  as: Tag = "h2",
  align = "left",
  size = "h1",
  className,
  children,
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  accent?: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  size?: "display" | "h1" | "h2";
  className?: string;
  children?: ReactNode;
}) {
  const sizes = { display: "text-display", h1: "text-h1", h2: "text-h2" } as const;
  return (
    <header className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      {(index || eyebrow) && (
        <p className="flex items-center gap-3">
          {index && <span className="index">{index}</span>}
          {index && eyebrow && <span className="h-px w-6 bg-line-strong" aria-hidden />}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        </p>
      )}
      <Tag className={cn("display max-w-[20ch]", sizes[size], align === "center" && "mx-auto")}>
        {title}
        {accent && (
          <>
            {" "}
            <span className="accent">{accent}</span>
          </>
        )}
      </Tag>
      {lead && (
        <p className={cn("max-w-[58ch] text-lead text-ink-2", align === "center" && "mx-auto")}>{lead}</p>
      )}
      {children}
    </header>
  );
}
