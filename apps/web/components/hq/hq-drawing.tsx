/**
 * THE HQ, AS AN ARCHITECTURAL DRAWING.
 *
 * The static rendering of the same plan the 3D scene builds — computed from
 * `DISTRICTS` with an isometric projection, server-rendered, zero JS. It is
 * what phones, reduced-motion visitors, Save-Data connections and machines
 * without a real GPU see, and it is the poster the 3D scene fades in over.
 * Premium on its own terms: stone volumes, gold edges, light on the paths.
 */
import type { ReactNode } from "react";
import { DISTRICTS, type DistrictForm } from "./districts";
import { C30, FRAME, S, iso } from "./drawing-frame";

const pts = (list: [number, number][]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const INK = {
  top: "#211e18",
  left: "#15130f",
  right: "#0e0d0b",
  edge: "var(--color-gold-deep)",
  gold: "var(--color-gold)",
  bright: "var(--color-gold-bright)",
};

type Shape = { depth: number; el: ReactNode };

function box(cx: number, cz: number, y0: number, w: number, h: number, d: number, key: string, tone: "stone" | "gold" = "stone"): Shape {
  const [x0, x1, z0, z1, y1] = [cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, y0 + h];
  const top = [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)];
  const front = [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)];
  const side = [iso(x1, y0, z0), iso(x1, y0, z1), iso(x1, y1, z1), iso(x1, y1, z0)];
  const gold = tone === "gold";
  return {
    depth: cx + cz + y0 * 0.01,
    el: (
      <g key={key} stroke={gold ? INK.bright : INK.edge} strokeWidth={gold ? 0.6 : 0.8} strokeLinejoin="miter">
        <polygon points={pts(front)} fill={gold ? "#8f7239" : INK.left} />
        <polygon points={pts(side)} fill={gold ? "#6b5429" : INK.right} />
        <polygon points={pts(top)} fill={gold ? INK.gold : INK.top} />
      </g>
    ),
  };
}

function cylinder(cx: number, cz: number, y0: number, r: number, h: number, key: string, tone: "stone" | "gold" = "stone"): Shape {
  const rx = r * Math.SQRT2 * C30 * S;
  const ry = r * Math.SQRT2 * 0.5 * S;
  const [tx, ty] = iso(cx, y0 + h, cz);
  const [, by] = iso(cx, y0, cz);
  const gold = tone === "gold";
  return {
    depth: cx + cz + y0 * 0.01,
    el: (
      <g key={key} stroke={gold ? INK.bright : INK.edge} strokeWidth={gold ? 0.6 : 0.8}>
        <path
          d={`M${tx - rx},${ty} L${tx - rx},${by} A${rx},${ry} 0 0 0 ${tx + rx},${by} L${tx + rx},${ty} Z`}
          fill={gold ? "#8a6d37" : INK.left}
        />
        <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={gold ? INK.gold : INK.top} />
      </g>
    ),
  };
}

function ringLine(cx: number, cz: number, y: number, r: number, key: string, stroke = INK.gold, width = 0.9): Shape {
  const [x, sy] = iso(cx, y, cz);
  return {
    depth: cx + cz + y * 0.01 + 0.001,
    el: <ellipse key={key} cx={x} cy={sy} rx={r * Math.SQRT2 * C30 * S} ry={r * Math.SQRT2 * 0.5 * S} fill="none" stroke={stroke} strokeWidth={width} />,
  };
}

const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function build(form: DistrictForm, cx: number, cz: number, id: string): Shape[] {
  const k = (s: string) => `${id}-${s}`;
  switch (form) {
    case "tower": {
      const out: Shape[] = [];
      let y = 0;
      [4.6, 3.8, 3.0].forEach((s, i) => {
        out.push(box(cx, cz, y, s, 0.22, s, k(`step${i}`)));
        y += 0.22;
      });
      out.push(box(cx, cz, y, 1.25, 5, 1.25, k("shaft")));
      out.push(box(cx, cz, y + 5, 1.55, 0.14, 1.55, k("crown"), "gold"));
      out.push(box(cx, cz, y + 5.14, 0.9, 0.55, 0.9, k("cap")));
      out.push(box(cx, cz, y + 5.69, 0.98, 0.06, 0.98, k("capgold"), "gold"));
      // The seam of light down the visible faces.
      const [a1, b1] = iso(cx - 0.0, y + 0.3, cz + 0.63);
      const [a2, b2] = iso(cx - 0.0, y + 4.7, cz + 0.63);
      out.push({ depth: cx + cz + 0.2, el: <line key={k("seam")} x1={a1} y1={b1} x2={a2} y2={b2} stroke={INK.bright} strokeWidth={1.2} /> });
      out.push(ringLine(cx, cz, y + 6.2, 2.3, k("ring"), INK.bright, 0.7));
      return out;
    }
    case "colonnade": {
      const out: Shape[] = [box(cx, cz, 0, 3.9, 0.3, 2.7, k("base"))];
      for (const z of [-1.0, 1.0])
        for (let i = 0; i < 7; i++) out.push(box(cx - 1.65 + 0.55 * i, cz + z, 0.3, 0.17, 1.9, 0.17, k(`c${z}${i}`)));
      out.push(box(cx, cz, 0.3, 0.34, 0.34, 0.34, k("core"), "gold"));
      out.push(box(cx, cz, 2.2, 4.1, 0.06, 2.9, k("band"), "gold"));
      out.push(box(cx, cz, 2.26, 4.1, 0.24, 2.9, k("roof")));
      return out;
    }
    case "ring": {
      const out: Shape[] = [cylinder(cx, cz, 0, 2.4, 0.82, k("outer"))];
      out.push(ringLine(cx, cz, 0.82, 2.05, k("t3"), INK.edge, 0.8));
      out.push(ringLine(cx, cz, 0.82, 1.7, k("t2"), INK.edge, 0.8));
      out.push(ringLine(cx, cz, 0.82, 1.35, k("t1"), INK.edge, 0.8));
      const floor = cylinder(cx, cz, 0.82, 1.05, 0.001, k("floor"));
      out.push({ ...floor, depth: floor.depth + 0.002 });
      out.push({ ...ringLine(cx, cz, 0.83, 0.62, k("m1")), depth: floor.depth + 0.003 });
      out.push({ ...ringLine(cx, cz, 0.83, 0.3, k("m2")), depth: floor.depth + 0.004 });
      return out;
    }
    case "vault": {
      const out: Shape[] = [box(cx, cz, 0, 3.0, 0.2, 3.0, k("plinth")), box(cx, cz, 0.2, 2.3, 2.3, 2.3, k("cube"))];
      out.push(box(cx, cz, 2.42, 2.34, 0.05, 2.34, k("band"), "gold"));
      const ring: [number, number][] = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        ring.push(iso(cx + Math.cos(a) * 0.64, 1.35 + Math.sin(a) * 0.64, cz + 1.151));
      }
      const spokes = [0, 1, 2].map((i) => {
        const a = (i * Math.PI) / 3;
        const [x1, y1] = iso(cx + Math.cos(a) * 0.54, 1.35 + Math.sin(a) * 0.54, cz + 1.151);
        const [x2, y2] = iso(cx - Math.cos(a) * 0.54, 1.35 - Math.sin(a) * 0.54, cz + 1.151);
        return <line key={k(`s${i}`)} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK.gold} strokeWidth={1.4} />;
      });
      out.push({
        depth: cx + cz + 1.2,
        el: (
          <g key={k("door")}>
            <polygon points={pts(ring)} fill="none" stroke={INK.gold} strokeWidth={3} />
            {spokes}
          </g>
        ),
      });
      return out;
    }
    case "coins": {
      const out: Shape[] = [cylinder(cx, cz, 0, 1.66, 0.32, k("plinth"))];
      for (let i = 0; i < 8; i++) {
        const c = cylinder(cx + (rand(i) - 0.5) * 0.09, cz + (rand(i + 9) - 0.5) * 0.09, 0.32 + i * 0.135, 1.0, 0.13, k(`coin${i}`), "gold");
        out.push({ ...c, depth: c.depth + i * 0.001 });
      }
      const [hx, hy] = iso(cx, 2.35, cz);
      out.push({
        depth: cx + cz + 1,
        el: (
          <g key={k("held")}>
            <ellipse cx={hx} cy={hy} rx={0.62 * S * 0.72} ry={0.62 * S} fill="#8a6d37" stroke={INK.bright} strokeWidth={0.8} />
            <ellipse cx={hx - 2.2} cy={hy} rx={0.62 * S * 0.72} ry={0.62 * S} fill={INK.gold} stroke={INK.bright} strokeWidth={0.6} />
          </g>
        ),
      });
      return out;
    }
    case "lattice": {
      const out: Shape[] = [box(cx, cz, 0, 3.2, 0.12, 3.2, k("base"))];
      const tops: [number, number][] = [];
      for (let ix = 0; ix < 3; ix++)
        for (let iz = 0; iz < 3; iz++) {
          const h = 1.1 + rand(ix * 3 + iz) * 1.9 + (ix === 1 && iz === 1 ? 0.6 : 0);
          const x = cx + (ix - 1);
          const z = cz + (iz - 1);
          out.push(box(x, z, 0.12, 0.15, h, 0.15, k(`p${ix}${iz}`)));
          tops.push(iso(x, 0.12 + h + 0.08, z));
        }
      const idx = (x: number, z: number) => x * 3 + z;
      const pairs: [number, number][] = [];
      for (let x = 0; x < 3; x++)
        for (let z = 0; z < 3; z++) {
          if (x < 2) pairs.push([idx(x, z), idx(x + 1, z)]);
          if (z < 2) pairs.push([idx(x, z), idx(x, z + 1)]);
        }
      pairs.push([0, 4], [8, 4], [2, 4], [6, 4]);
      out.push({
        depth: cx + cz + 3,
        el: (
          <g key={k("net")}>
            {pairs.map(([a, b], i) => (
              <line key={i} x1={tops[a][0]} y1={tops[a][1]} x2={tops[b][0]} y2={tops[b][1]} stroke={INK.gold} strokeWidth={0.8} opacity={0.8} />
            ))}
            {tops.map(([x, y], i) => (
              <circle key={`n${i}`} cx={x} cy={y} r={2.4} fill={INK.bright} />
            ))}
          </g>
        ),
      });
      return out;
    }
  }
}

export function HQDrawing({ className }: { className?: string }) {
  const shapes: Shape[] = [];
  for (const d of DISTRICTS) shapes.push(...build(d.form, d.at[0], d.at[1], d.id));
  shapes.sort((a, b) => a.depth - b.depth);

  // Grid on the ground, faded toward the edges by a mask.
  const grid: ReactNode[] = [];
  for (let v = -12; v <= 12; v += 1.5) {
    const [a1, b1] = iso(-12, 0, v);
    const [a2, b2] = iso(12, 0, v);
    const [c1, d1] = iso(v, 0, -12);
    const [c2, d2] = iso(v, 0, 12);
    grid.push(<line key={`gx${v}`} x1={a1} y1={b1} x2={a2} y2={b2} />, <line key={`gz${v}`} x1={c1} y1={d1} x2={c2} y2={d2} />);
  }
  const [px, py] = iso(0, 0, 0);
  const paths = DISTRICTS.filter((d) => d.form !== "tower").map((d) => {
    const [x1, y1] = iso(d.at[0], 0, d.at[1]);
    return <line key={d.id} x1={x1} y1={y1} x2={px} y2={py} />;
  });

  return (
    <svg
      viewBox={`${FRAME.x} ${FRAME.y} ${FRAME.w} ${FRAME.h}`}
      className={className}
      role="img"
      aria-label="Tycoonhood HQ: the Command Center at the centre, surrounded by the Academy, Arena, Vault, Treasury and Network, each connected to the core by a path of light."
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="hq-fade" cx="50%" cy="58%" r="55%">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="hq-mask">
          <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#hq-fade)" />
        </mask>
        <radialGradient id="hq-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#cfa95e" stopOpacity="0.22" />
          <stop offset="1" stopColor="#cfa95e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g mask="url(#hq-mask)" stroke="var(--color-gold-shadow)" strokeWidth={0.6} opacity={0.7}>
        {grid}
      </g>
      <ellipse cx={px} cy={py} rx={8.9 * Math.SQRT2 * C30 * S} ry={8.9 * Math.SQRT2 * 0.5 * S} fill="none" stroke="var(--color-gold-deep)" strokeOpacity={0.5} strokeWidth={0.8} />
      <ellipse cx={px} cy={py} rx={170} ry={100} fill="url(#hq-pool)" />
      <g className="hq-paths" stroke="var(--color-gold)" strokeWidth={1.4} strokeDasharray="2 10" strokeLinecap="round" opacity={0.85}>
        {paths}
      </g>
      {shapes.map((s) => s.el)}
    </svg>
  );
}
