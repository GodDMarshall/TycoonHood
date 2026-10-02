const ITEMS = ["AI Agent Systems", "Digital Twins", "Intelligent Platforms", "Automation", "Immersive 3D", "Data Intelligence", "Custom Technology"];

/** A kinetic band of what we build. Decorative; the same content is listed elsewhere as text. */
export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-line bg-black py-8 md:py-10" aria-hidden="true">
      <div className="marquee">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 pr-10 text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-none tracking-tight">
            <span className={i % 2 ? "outline-text" : "text-ink"}>{t}</span>
            <span className="text-ojas text-[0.5em]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
