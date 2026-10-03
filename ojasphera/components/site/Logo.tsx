import { MARK } from "@/lib/brand";

/** The Ojasphera mark. `rim`/`spark` default to the brand colours; pass currentColor for one-colour use. */
export function Mark({ size = 24, className, rim = "currentColor", spark = "var(--color-ojas)" }: { size?: number; className?: string; rim?: string; spark?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path fill={rim} fillRule="evenodd" d={MARK.rim} />
      <circle cx={MARK.spark.cx} cy={MARK.spark.cy} r={MARK.spark.r} fill={spark} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <Mark size={26} />
      <span className="text-[13px] font-semibold tracking-[0.18em]">OJASPHERA</span>
    </span>
  );
}
