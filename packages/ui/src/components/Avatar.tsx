import { cn } from "../cn";

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  // First character of each word, whole: w[0] would take half of an emoji,
  // which the server's HTML and the browser render differently (#418).
  const initials = name
    .split(/\s+/)
    .map((w) => Array.from(w)[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-[linear-gradient(145deg,var(--color-bg-3),var(--color-bg-1))] text-ink-2",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={size} height={size} className="size-full object-cover" />
      ) : (
        <span className="font-semibold">{initials}</span>
      )}
    </span>
  );
}
