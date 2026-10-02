/** The Ojasphera mark: a sphere (the system) with an orbit (intelligence) and a node (the real-world thing it's built around). */
export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="11.5" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="16" cy="16" rx="11.5" ry="4.6" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.1" transform="rotate(-28 16 16)" />
      <circle cx="25.4" cy="10.6" r="2.6" fill="var(--color-ojas)" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Mark />
      <span className="text-[13px] font-semibold tracking-[0.32em]">OJASPHERA</span>
    </span>
  );
}
