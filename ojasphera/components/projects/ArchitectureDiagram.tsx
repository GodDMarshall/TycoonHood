import type { ArchitectureLayer } from "@/lib/projects";

/** A layered system architecture with live flow between layers (top = what people touch). */
export function ArchitectureDiagram({ layers, accent }: { layers: ArchitectureLayer[]; accent: string }) {
  return (
    <div className="relative">
      <ol className="flex flex-col">
        {layers.map((l, i) => (
          <li key={l.name} className="relative">
            <div className="grid gap-4 border border-line bg-raise/30 p-5 md:grid-cols-12 md:items-center md:p-6">
              <div className="md:col-span-4">
                <span className="mono text-[10px] text-ink-4">L{layers.length - i}</span>
                <p className="mt-1 text-lg font-medium tracking-tight" style={{ color: i === 0 ? accent : undefined }}>
                  {l.name}
                </p>
              </div>
              <ul className="flex flex-wrap gap-1.5 md:col-span-8 md:justify-end">
                {l.items.map((it) => (
                  <li key={it} className="mono border border-line px-2.5 py-1.5 text-[11px] text-ink-2">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
            {i < layers.length - 1 ? (
              <svg className="mx-auto block h-8 w-24" viewBox="0 0 96 32" aria-hidden="true">
                {[24, 48, 72].map((x, k) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="32" stroke={k === 1 ? accent : "var(--color-line-strong)"} strokeOpacity={k === 1 ? 0.8 : 1} className="flow-dash" style={{ animationDirection: k === 1 ? "reverse" : "normal" }} />
                ))}
              </svg>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
