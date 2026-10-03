import { MARK } from "@/lib/brand";

/** Loading state in the brand's own language: the rim turns while the spark breathes. */
export function EclipseLoader({ label = "Initialising", size = 44 }: { label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <svg width={size} height={size} viewBox="0 0 100 100" className="eclipse-loader" aria-hidden="true">
        <path className="eclipse-loader-rim" fill="#eceef1" fillRule="evenodd" d={MARK.rim} />
        <circle className="eclipse-loader-spark" cx={MARK.spark.cx} cy={MARK.spark.cy} r={MARK.spark.r} fill="#f2b45a" />
      </svg>
      <span className="eyebrow">{label}…</span>
    </div>
  );
}
