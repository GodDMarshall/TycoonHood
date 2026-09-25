import { cn } from "../cn";

/** The ledger rule: a hairline with an optional small-caps ledger heading. */
export function SectionRule({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn("border-line", className)} />;
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="eyebrow">{label}</span>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}
