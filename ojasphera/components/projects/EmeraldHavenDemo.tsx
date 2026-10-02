"use client";

import { useState } from "react";

/**
 * Interactive model of the Emerald Haven environment: a spatial estate model with
 * switchable information layers. The layout is illustrative; each feature shows
 * the data model it carries (fields populated from real estate records).
 */

type LayerKey = "land" | "infra" | "equipment" | "info";

const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: "land", label: "Plantation & land", color: "#6fd3a8" },
  { key: "infra", label: "Infrastructure", color: "#7cc7e8" },
  { key: "equipment", label: "Equipment", color: "#f2b45a" },
  { key: "info", label: "Project information", color: "#eceef1" },
];

type Feature = {
  id: string;
  layer: LayerKey;
  name: string;
  kind: string;
  fields: string[];
  shape: { type: "poly"; d: string } | { type: "line"; d: string } | { type: "point"; x: number; y: number };
};

const FEATURES: Feature[] = [
  { id: "pb-a", layer: "land", name: "Plantation Block A", kind: "Land parcel", fields: ["Crop / species", "Planting date", "Area", "Health observations"], shape: { type: "poly", d: "M90,90 L270,70 L300,200 L120,230 Z" } },
  { id: "pb-b", layer: "land", name: "Plantation Block B", kind: "Land parcel", fields: ["Crop / species", "Planting date", "Area", "Yield records"], shape: { type: "poly", d: "M320,60 L520,80 L500,210 L330,195 Z" } },
  { id: "pb-c", layer: "land", name: "Plantation Block C", kind: "Land parcel", fields: ["Crop / species", "Soil notes", "Area", "Maintenance log"], shape: { type: "poly", d: "M110,270 L300,245 L320,420 L140,450 Z" } },
  { id: "green", layer: "land", name: "Green Belt", kind: "Conserved land", fields: ["Boundary", "Vegetation notes", "Access rules"], shape: { type: "poly", d: "M560,70 L730,90 L740,260 L600,250 Q560,170 560,70 Z" } },
  { id: "dev", layer: "land", name: "Development Zone", kind: "Planned area", fields: ["Planned use", "Phase", "Approvals", "Timeline"], shape: { type: "poly", d: "M360,260 L560,280 L560,450 L370,440 Z" } },
  { id: "road", layer: "infra", name: "Main Access Road", kind: "Access", fields: ["Length", "Surface", "Condition", "Connections"], shape: { type: "line", d: "M20,240 C 160,240 250,238 330,232 S 560,262 780,250" } },
  { id: "paths", layer: "infra", name: "Internal Path Network", kind: "Access", fields: ["Segments", "Usage", "Maintenance"], shape: { type: "line", d: "M300,232 L310,140 M330,232 L345,350 L470,360 M560,262 L640,180" } },
  { id: "water", layer: "infra", name: "Water Infrastructure", kind: "Utility", fields: ["Source", "Distribution lines", "Capacity", "Inspection records"], shape: { type: "line", d: "M650,480 C 600,400 520,470 450,500 M520,470 C 500,380 420,330 300,330" } },
  { id: "facility", layer: "infra", name: "Site Facility", kind: "Structure", fields: ["Function", "Footprint", "Utilities", "Status"], shape: { type: "poly", d: "M600,300 L690,300 L690,360 L600,360 Z" } },
  { id: "eq-1", layer: "equipment", name: "Irrigation Unit", kind: "Equipment", fields: ["Type", "Location", "Service history", "Operating status"], shape: { type: "point", x: 200, y: 160 } },
  { id: "eq-2", layer: "equipment", name: "Machinery Store", kind: "Equipment", fields: ["Inventory", "Allocation", "Service schedule"], shape: { type: "point", x: 645, y: 330 } },
  { id: "eq-3", layer: "equipment", name: "Monitoring Point", kind: "Sensor location", fields: ["Measures", "Readings", "Thresholds"], shape: { type: "point", x: 420, y: 140 } },
  { id: "eq-4", layer: "equipment", name: "Pump Station", kind: "Equipment", fields: ["Capacity", "Power", "Maintenance log"], shape: { type: "point", x: 560, y: 450 } },
  { id: "i-1", layer: "info", name: "Project Overview", kind: "Project information", fields: ["Vision", "Phases", "Documents", "Media"], shape: { type: "point", x: 460, y: 330 } },
  { id: "i-2", layer: "info", name: "Phase Marker", kind: "Project information", fields: ["Phase scope", "Status", "Milestones"], shape: { type: "point", x: 190, y: 350 } },
];

const layerColor = (k: LayerKey) => LAYERS.find((l) => l.key === k)!.color;

export function EmeraldHavenDemo() {
  const [on, setOn] = useState<Record<LayerKey, boolean>>({ land: true, infra: true, equipment: true, info: true });
  const [sel, setSel] = useState<string>("pb-a");
  const [hover, setHover] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const selected = FEATURES.find((f) => f.id === sel)!;
  const visibleFeatures = FEATURES.filter((f) => on[f.layer]);

  const gridRef = (x: number, y: number) => `${String.fromCharCode(65 + Math.min(7, Math.floor(x / 100)))}-${String(Math.min(9, Math.floor(y / 52)) + 1).padStart(2, "0")}`;

  return (
    <div className="border border-line bg-void">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="pulse-dot text-growth" aria-hidden="true" />
          <span className="mono text-[11px] uppercase tracking-[0.16em] text-ink-2">Emerald Haven · Estate environment</span>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.14em] text-ink-4">Illustrative layout · not to scale</span>
      </div>

      <div className="grid lg:grid-cols-12">
        {/* Layers */}
        <div className="border-b border-line p-4 lg:col-span-3 lg:border-b-0 lg:border-r">
          <p className="eyebrow mb-3">Layers</p>
          <ul className="flex flex-col gap-1.5">
            {LAYERS.map((l) => (
              <li key={l.key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on[l.key]}
                  onClick={() => setOn((o) => ({ ...o, [l.key]: !o[l.key] }))}
                  className="flex w-full items-center justify-between border border-line px-3 py-2.5 text-left text-sm hover:border-ink-4"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="h-2 w-2" style={{ background: on[l.key] ? l.color : "transparent", border: `1px solid ${l.color}` }} />
                    <span className={on[l.key] ? "text-ink" : "text-ink-3"}>{l.label}</span>
                  </span>
                  <span className="mono text-[10px] text-ink-4">{FEATURES.filter((f) => f.layer === l.key).length}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="eyebrow mb-3 mt-6">Features</p>
          <ul className="thin-scroll flex max-h-56 flex-col overflow-y-auto lg:max-h-72">
            {visibleFeatures.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSel(f.id)}
                  onMouseEnter={() => setHover(f.id)}
                  onMouseLeave={() => setHover(null)}
                  aria-pressed={sel === f.id}
                  className={`flex w-full items-center gap-2 py-1.5 text-left text-xs ${sel === f.id ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: layerColor(f.layer) }} />
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Map */}
        <div className="relative border-b border-line lg:col-span-6 lg:border-b-0 lg:border-r">
          <svg
            viewBox="0 0 800 520"
            className="block h-auto w-full"
            role="img"
            aria-label="Illustrative estate map with plantation blocks, infrastructure, equipment and project markers"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setCursor({ x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 520 });
            }}
            onMouseLeave={() => setCursor(null)}
          >
            <defs>
              <pattern id="eh-grid" width="100" height="52" patternUnits="userSpaceOnUse">
                <path d="M100 0 L0 0 0 52" fill="none" stroke="rgba(255,255,255,0.04)" />
              </pattern>
              <pattern id="eh-rows" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
                <line x1="0" y1="4" x2="8" y2="4" stroke="#6fd3a8" strokeOpacity="0.25" />
              </pattern>
            </defs>
            <rect width="800" height="520" fill="url(#eh-grid)" />
            {/* Contours */}
            {Array.from({ length: 6 }, (_, i) => (
              <ellipse key={i} cx="430" cy="260" rx={380 - i * 50} ry={240 - i * 32} fill="none" stroke="rgba(255,255,255,0.035)" />
            ))}
            {/* Estate boundary */}
            <path d="M40,50 L760,40 L780,490 L30,500 Z" fill="none" stroke="var(--color-ink-4)" strokeDasharray="6 6" />

            {visibleFeatures.map((f) => {
              const col = layerColor(f.layer);
              const active = sel === f.id || hover === f.id;
              const common = {
                onClick: () => setSel(f.id),
                onMouseEnter: () => setHover(f.id),
                onMouseLeave: () => setHover(null),
                className: "cursor-pointer",
              };
              if (f.shape.type === "poly")
                return (
                  <g key={f.id} {...common}>
                    <path d={f.shape.d} fill={f.layer === "land" && f.id.startsWith("pb") ? "url(#eh-rows)" : col} fillOpacity={f.layer === "land" && f.id.startsWith("pb") ? 1 : active ? 0.18 : 0.07} stroke={col} strokeOpacity={active ? 1 : 0.45} strokeWidth={active ? 1.6 : 1} />
                    {active ? <path d={f.shape.d} fill={col} fillOpacity="0.12" /> : null}
                  </g>
                );
              if (f.shape.type === "line")
                return (
                  <g key={f.id} {...common}>
                    <path d={f.shape.d} fill="none" stroke="transparent" strokeWidth="14" />
                    <path d={f.shape.d} fill="none" stroke={col} strokeOpacity={active ? 1 : 0.6} strokeWidth={f.id === "road" ? 3 : 1.4} strokeDasharray={f.id === "water" ? "5 4" : undefined} className={f.id === "water" ? "flow-dash" : undefined} />
                  </g>
                );
              const { x, y } = f.shape;
              return (
                <g key={f.id} {...common}>
                  <circle cx={x} cy={y} r="16" fill="transparent" />
                  {f.layer === "info" ? (
                    <g>
                      <path d={`M${x},${y - 14} L${x + 8},${y - 2} L${x},${y + 2} L${x - 8},${y - 2} Z`} fill={col} fillOpacity={active ? 1 : 0.7} />
                      <line x1={x} y1={y + 2} x2={x} y2={y + 10} stroke={col} />
                    </g>
                  ) : (
                    <g>
                      <rect x={x - 6} y={y - 6} width="12" height="12" fill="var(--color-void)" stroke={col} strokeWidth={active ? 2 : 1.2} />
                      <rect x={x - 2} y={y - 2} width="4" height="4" fill={col} />
                    </g>
                  )}
                  {active ? <circle cx={x} cy={y} r="20" fill="none" stroke={col} strokeOpacity="0.5" /> : null}
                </g>
              );
            })}

            {/* Compass + scale */}
            <g transform="translate(740 470)" className="mono">
              <path d="M0,-18 L5,0 L0,-4 L-5,0 Z" fill="var(--color-ink-2)" />
              <text x="0" y="14" textAnchor="middle" fontSize="10" fill="var(--color-ink-3)">N</text>
            </g>
            {cursor ? (
              <g pointerEvents="none">
                <line x1={cursor.x} y1="0" x2={cursor.x} y2="520" stroke="rgba(255,255,255,0.08)" />
                <line x1="0" y1={cursor.y} x2="800" y2={cursor.y} stroke="rgba(255,255,255,0.08)" />
              </g>
            ) : null}
          </svg>
          <div className="mono pointer-events-none absolute bottom-3 left-3 text-[10px] uppercase tracking-wider text-ink-4">
            Grid {cursor ? gridRef(cursor.x, cursor.y) : "—"} · {visibleFeatures.length} features visible
          </div>
        </div>

        {/* Inspector */}
        <div className="p-4 lg:col-span-3" aria-live="polite">
          <p className="eyebrow mb-3">Inspector</p>
          <p className="mono text-[10px] uppercase tracking-wider" style={{ color: layerColor(selected.layer) }}>
            {LAYERS.find((l) => l.key === selected.layer)!.label} · {selected.kind}
          </p>
          <h4 className="mt-2 text-xl font-medium tracking-tight">{selected.name}</h4>
          <p className="mt-2 text-xs text-ink-3">Data this feature carries in the environment:</p>
          <dl className="mt-4 flex flex-col">
            {selected.fields.map((f) => (
              <div key={f} className="flex items-center justify-between border-t border-line py-2.5 text-xs">
                <dt className="text-ink-2">{f}</dt>
                <dd className="mono text-[10px] uppercase tracking-wider text-ink-4">from estate records</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink-3">
            Every record attaches to a place. The same model can later carry monitoring, maintenance and AI-assisted analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
