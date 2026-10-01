"use client";
/**
 * THE RIG — the Miner's one picture, drawn in code.
 *
 * What it shows is what is true:
 *   • one GPU card per rig level (empty slots up to the next few levels),
 *   • the storage tank filled to the real accrued/capacity ratio,
 *   • THC flowing down the pipe only while the tank has room,
 *   • coins rising from the rig while it mines, and a burst on a claim.
 * Motion is decoration on top of real numbers; under reduced motion the
 * picture is the same, only still.
 */
import { useId, type CSSProperties } from "react";
import { cn } from "@tycoonhood/ui";

export type RigVisualProps = {
  level: number;
  maxLevel: number;
  /** 0..1 — accrued / capacity. */
  fill: number;
  full: boolean;
  /** Change this number to play the claim burst once. */
  burstKey?: number;
  /** Marketing use: no member's numbers exist, so hide the percentage and the label. */
  illustration?: boolean;
  className?: string;
};

const SLOTS = 6;

function Fan({ x, y, r, on, speed }: { x: number; y: number; r: number; on: boolean; speed: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#0b0b0a" stroke={on ? "var(--color-gold-deep)" : "#2a2824"} strokeWidth="1.5" />
      <g className={on ? "rig-spin" : undefined} style={{ "--rig-speed": `${speed}s` } as CSSProperties}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path
            key={a}
            d={`M0 0 C ${r * 0.25} ${-r * 0.2}, ${r * 0.55} ${-r * 0.55}, ${r * 0.18} ${-r * 0.86} C ${-r * 0.05} ${-r * 0.55}, ${-r * 0.1} ${-r * 0.3}, 0 0 Z`}
            transform={`rotate(${a})`}
            fill={on ? "#3a3227" : "#1c1b18"}
          />
        ))}
        <circle r={r * 0.2} fill={on ? "var(--color-gold)" : "#2a2824"} />
      </g>
    </g>
  );
}

export function RigVisual({ level, maxLevel, fill, full, burstKey = 0, illustration = false, className }: RigVisualProps) {
  const id = useId().replace(/:/g, "");
  const f = Math.max(0, Math.min(1, fill));
  const active = !full;
  const shown = Math.min(SLOTS, Math.max(level, 1));
  const slots = Math.min(SLOTS, Math.max(shown + 2, 3));
  // Faster fans at higher levels — 2.2s at L1 down to 0.6s at the top.
  const speed = Math.max(0.6, 2.2 - (level - 1) * (1.6 / Math.max(1, maxLevel - 1)));

  // Tank geometry.
  const tank = { x: 352, y: 70, w: 92, h: 220 };
  const liquidH = (tank.h - 16) * f;
  const liquidY = tank.y + tank.h - 8 - liquidH;

  // Chassis geometry.
  const chassis = { x: 40, y: 92, w: 260, h: 196 };
  const cardW = (chassis.w - 28 - (slots - 1) * 8) / slots;

  return (
    <svg
      viewBox="0 0 480 360"
      className={cn("h-auto w-full", className)}
      role={illustration ? undefined : "img"}
      aria-hidden={illustration || undefined}
      aria-label={
        illustration ? undefined : `Mining rig, level ${level} of ${maxLevel}. Storage ${Math.round(f * 100)}% full${full ? " — claim to keep mining" : ""}.`
      }
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="58%" r="60%">
          <stop offset="0%" stopColor="rgb(207 169 94 / 0.22)" />
          <stop offset="70%" stopColor="rgb(207 169 94 / 0.03)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2824" />
          <stop offset="100%" stopColor="#141311" />
        </linearGradient>
        <linearGradient id={`${id}-card`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#24211c" />
          <stop offset="100%" stopColor="#15140f" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1d99c" />
          <stop offset="45%" stopColor="#cfa95e" />
          <stop offset="100%" stopColor="#8a6b33" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(255 255 255 / 0.10)" />
          <stop offset="35%" stopColor="rgb(255 255 255 / 0.02)" />
          <stop offset="100%" stopColor="rgb(255 255 255 / 0.06)" />
        </linearGradient>
        <clipPath id={`${id}-tank`}>
          <rect x={tank.x + 6} y={tank.y + 6} width={tank.w - 12} height={tank.h - 12} rx="34" />
        </clipPath>
      </defs>

      {/* Atmosphere */}
      <rect width="480" height="360" fill={`url(#${id}-glow)`} />
      <ellipse cx="240" cy="318" rx="210" ry="16" fill="rgb(0 0 0 / 0.55)" />

      {/* Floor plate */}
      <rect x="28" y="290" width="424" height="14" rx="4" fill="#1b1a17" stroke="#2c2a25" />

      {/* Chassis */}
      <g>
        <rect x={chassis.x} y={chassis.y} width={chassis.w} height={chassis.h} rx="14" fill={`url(#${id}-metal)`} stroke="#3a372f" />
        <rect x={chassis.x + 10} y={chassis.y + 10} width={chassis.w - 20} height="22" rx="6" fill="#0e0d0b" />
        <text x={chassis.x + 22} y={chassis.y + 25.5} fill="var(--color-gold)" fontSize="11" fontWeight="600" letterSpacing="1.5">
          RIG · L{level}
        </text>
        {/* Status LEDs */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={chassis.x + chassis.w - 30 + i * 9}
            cy={chassis.y + 21}
            r="3"
            fill={full ? (i === 2 ? "var(--color-danger)" : "#3a372f") : "var(--color-success)"}
            className={!full ? "rig-blink" : undefined}
            style={{ animationDelay: `${i * 0.35}s` } as CSSProperties}
          />
        ))}

        {/* GPU cards */}
        {Array.from({ length: slots }, (_, i) => {
          const x = chassis.x + 14 + i * (cardW + 8);
          const y = chassis.y + 44;
          const h = chassis.h - 58;
          const owned = i < shown;
          return (
            <g key={i}>
              {owned ? (
                <>
                  <rect x={x} y={y} width={cardW} height={h} rx="7" fill={`url(#${id}-card)`} stroke="#3e392f" />
                  <Fan x={x + cardW / 2} y={y + h * 0.3} r={Math.min(cardW * 0.36, 17)} on={active} speed={speed} />
                  <Fan x={x + cardW / 2} y={y + h * 0.66} r={Math.min(cardW * 0.36, 17)} on={active} speed={speed * 1.1} />
                  <rect
                    x={x + 6}
                    y={y + h - 9}
                    width={cardW - 12}
                    height="3"
                    rx="1.5"
                    fill={active ? "var(--color-gold)" : "#3a372f"}
                    className={active ? "rig-pulse" : undefined}
                  />
                </>
              ) : (
                <rect x={x} y={y} width={cardW} height={h} rx="7" fill="none" stroke="#34312a" strokeDasharray="4 5" />
              )}
            </g>
          );
        })}
      </g>

      {/* Pipe from the rig to the tank */}
      <path
        d={`M ${chassis.x + chassis.w} 150 H 326 Q 340 150 340 164 V 250 Q 340 262 352 262`}
        fill="none"
        stroke="#2c2a25"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={`M ${chassis.x + chassis.w} 150 H 326 Q 340 150 340 164 V 250 Q 340 262 352 262`}
        fill="none"
        stroke={active ? "var(--color-gold)" : "#3a372f"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="6 10"
        className={active ? "rig-flow" : undefined}
      />

      {/* Storage tank */}
      <g>
        <rect
          x={tank.x}
          y={tank.y}
          width={tank.w}
          height={tank.h}
          rx="40"
          fill="#0d0c0a"
          stroke={full ? "var(--color-gold)" : "#3a372f"}
          strokeWidth={full ? 2.5 : 1.5}
          className={full ? "rig-full" : undefined}
        />
        <g clipPath={`url(#${id}-tank)`}>
          <rect x={tank.x} y={liquidY} width={tank.w} height={liquidH + 20} fill={`url(#${id}-gold)`} opacity="0.92" />
          {f > 0.01 && f < 0.999 && (
            <path
              className="rig-wave"
              d={`M ${tank.x - 40} ${liquidY} q 15 -6 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 V ${liquidY + 14} H ${tank.x - 40} Z`}
              fill="#f1d99c"
              opacity="0.55"
            />
          )}
        </g>
        <rect x={tank.x} y={tank.y} width={tank.w} height={tank.h} rx="40" fill={`url(#${id}-glass)`} pointerEvents="none" />
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={tank.x + tank.w - 18}
            x2={tank.x + tank.w - 8}
            y1={tank.y + 8 + (tank.h - 16) * (1 - t)}
            y2={tank.y + 8 + (tank.h - 16) * (1 - t)}
            stroke="rgb(255 255 255 / 0.25)"
            strokeWidth="1.5"
          />
        ))}
        <text x={tank.x + tank.w / 2} y={tank.y - 12} textAnchor="middle" fill="var(--color-ink-3)" fontSize="11" fontWeight="600" letterSpacing="1.5">
          STORAGE
        </text>
        {!illustration && (
          <text
            x={tank.x + tank.w / 2}
            y={tank.y + tank.h / 2 + 6}
            textAnchor="middle"
            fill={f > 0.55 ? "#1a1408" : "var(--color-ink-1)"}
            fontSize="20"
            fontWeight="700"
          >
            {Math.round(f * 100)}%
          </text>
        )}
      </g>

      {/* Coins rising while it mines */}
      {active &&
        [0, 1, 2, 3].map((i) => (
          <g key={i} className="rig-coin" style={{ animationDelay: `${i * 0.9}s`, "--rig-x": `${(i % 2 ? 1 : -1) * (8 + i * 6)}px` } as CSSProperties}>
            <circle cx={chassis.x + 60 + i * 52} cy={chassis.y + 4} r="7" fill={`url(#${id}-gold)`} stroke="#8a6b33" />
            <text x={chassis.x + 60 + i * 52} y={chassis.y + 7.5} textAnchor="middle" fontSize="9" fontWeight="800" fill="#4a3815">
              T
            </text>
          </g>
        ))}

      {/* Claim burst */}
      {burstKey > 0 && (
        <g key={burstKey}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={tank.x + tank.w / 2}
                cy={tank.y + 20}
                r="6"
                fill={`url(#${id}-gold)`}
                className="rig-burst"
                style={{ "--bx": `${Math.cos(a) * 70}px`, "--by": `${Math.sin(a) * 50 - 40}px` } as CSSProperties}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}
