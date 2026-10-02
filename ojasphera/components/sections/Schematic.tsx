import type { OfferingKey } from "@/lib/content";

const S = { line: "var(--color-line-strong)", ink: "var(--color-ink-3)", hot: "var(--color-ojas)", sig: "var(--color-signal)", grow: "var(--color-growth)" };

/** Small technical drawings — each one shows the shape of the system, not a decoration. */
export function Schematic({ kind }: { kind: OfferingKey }) {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true" fill="none" strokeWidth="1">
      {kind === "business" && (
        <g>
          {["DATA", "WORKFLOWS", "AUTOMATION", "AI"].map((l, i) => (
            <g key={l}>
              <rect x="24" y={30 + i * 42} width="96" height="28" stroke={S.line} />
              <text x="34" y={48 + i * 42} fontSize="8" letterSpacing="1.5" fill={S.ink} className="mono">{l}</text>
              <path d={`M120 ${44 + i * 42} C 160 ${44 + i * 42}, 160 110, 196 110`} stroke={S.sig} strokeOpacity="0.6" className="flow-dash" />
            </g>
          ))}
          <rect x="196" y="56" width="104" height="108" stroke={S.hot} />
          <path d="M206 140 L226 120 L244 128 L266 96 L290 104" stroke={S.hot} />
          <rect x="206" y="68" width="40" height="8" fill={S.hot} fillOpacity="0.3" />
          <text x="206" y="182" fontSize="8" letterSpacing="1.5" fill={S.hot} className="mono">ONE SYSTEM</text>
        </g>
      )}
      {kind === "agents" && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const x = 160 + Math.cos(a) * 74, y = 110 + Math.sin(a) * 74;
            const b = ((i + 1) / 5) * Math.PI * 2 - Math.PI / 2;
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={160 + Math.cos(b) * 74} y2={110 + Math.sin(b) * 74} stroke={S.sig} strokeOpacity="0.6" className="flow-dash" />
                <line x1={x} y1={y} x2="160" y2="110" stroke={S.line} />
                <circle cx={x} cy={y} r="13" fill="var(--color-base)" stroke={S.hot} />
                <circle cx={x} cy={y} r="3" fill={S.hot} />
              </g>
            );
          })}
          <rect x="140" y="96" width="40" height="28" stroke={S.ink} fill="var(--color-base)" />
          <text x="146" y="113" fontSize="7" letterSpacing="1" fill={S.ink} className="mono">STATE</text>
        </g>
      )}
      {kind === "environments" && (
        <g>
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i} stroke={S.line}>
              <line x1={40 + i * 20} y1={150 - i * 10} x2={180 + i * 20} y2={220 - i * 10 - 70} />
              <line x1={40 + i * 20} y1={150 + i * 10 - 60} x2={40 + i * 20 + 0} y2={150 - i * 10} />
            </g>
          ))}
          <path d="M40 150 L160 90 L280 150 L160 210 Z" stroke={S.ink} />
          <path d="M110 140 L140 125 L170 140 L140 155 Z" fill={S.grow} fillOpacity="0.18" stroke={S.grow} />
          <path d="M175 120 L195 110 L215 120 L195 130 Z M175 120 L175 96 L195 86 L215 96 L215 120 M195 110 L195 86" stroke={S.hot} />
          <path d="M80 150 Q 160 120 240 150" stroke={S.sig} className="flow-dash" />
          <circle cx="140" cy="140" r="3" fill={S.grow} />
        </g>
      )}
      {kind === "automation" && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={22 + i * 74} y="88" width="56" height="44" stroke={i === 3 ? S.hot : S.line} />
              <text x={30 + i * 74} y="114" fontSize="8" fill={S.ink} className="mono">{["TRIGGER", "CHECK", "ACT", "REPORT"][i]}</text>
              {i < 3 && <line x1={78 + i * 74} y1="110" x2={96 + i * 74} y2="110" stroke={S.sig} className="flow-dash" />}
            </g>
          ))}
          <path d="M270 132 C 270 190, 50 190, 50 132" stroke={S.sig} strokeOpacity="0.6" className="flow-dash" />
          <circle cx="160" cy="176" r="10" stroke={S.grow} fill="var(--color-base)" />
          <text x="176" y="179" fontSize="8" fill={S.grow} className="mono">HUMAN CHECKPOINT</text>
        </g>
      )}
      {kind === "data" && (
        <g>
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={24 + ((i * 37) % 100)} cy={40 + ((i * 53) % 140)} r="2" fill={S.ink} />
          ))}
          <path d="M136 110 L176 110" stroke={S.sig} className="flow-dash" />
          <path d="M170 104 L176 110 L170 116" stroke={S.sig} />
          {[60, 92, 74, 120, 104, 140].map((hgt, i) => (
            <rect key={i} x={194 + i * 18} y={180 - hgt} width="10" height={hgt} fill={i === 5 ? S.hot : S.sig} fillOpacity={i === 5 ? 0.8 : 0.25} />
          ))}
          <line x1="190" y1="180" x2="306" y2="180" stroke={S.line} />
        </g>
      )}
      {kind === "immersive" && (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const y = 110 + i * i * 1.4 + i * 4;
            return <line key={`h${i}`} x1={160 - (60 + i * 18)} y1={y} x2={160 + 60 + i * 18} y2={y} stroke={S.line} />;
          })}
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={160 + (i - 5) * 12} y1="110" x2={160 + (i - 5) * 46} y2="216" stroke={S.line} />
          ))}
          <path d="M120 140 L160 118 L200 140 L200 70 L160 48 L120 70 Z M120 70 L160 92 L200 70 M160 92 L160 140" stroke={S.hot} />
          <circle cx="240" cy="60" r="4" fill={S.sig} />
          <path d="M240 60 L200 70" stroke={S.sig} className="flow-dash" />
        </g>
      )}
      {kind === "custom" && (
        <g>
          <path d="M30 60 H130 V90 C 150 90, 150 130, 130 130 V160 H30 Z" stroke={S.line} />
          <path d="M290 60 H190 V90 C 170 90, 170 130, 190 130 V160 H290 Z" stroke={S.line} />
          <path d="M130 90 C 150 90, 150 130, 130 130 M190 90 C 170 90, 170 130, 190 130" stroke={S.ink} strokeDasharray="2 3" />
          <path d="M131 92 C 148 92, 146 128, 131 128 L189 128 C 172 128, 172 92, 189 92 Z" fill={S.hot} fillOpacity="0.25" stroke={S.hot} />
          <text x="112" y="190" fontSize="8" letterSpacing="1.5" fill={S.hot} className="mono">BUILT TO FIT</text>
        </g>
      )}
    </svg>
  );
}
