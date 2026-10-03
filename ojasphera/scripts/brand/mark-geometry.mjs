// The Ojasphera mark — every number lives here.
// Canvas 100×100. A rim of light (crescent) around a dark core, broken at the
// upper right by the spark: the eclipse's "diamond ring" moment.
export const G = {
  R: 44, // outer edge of the rim
  r: 32, // inner edge (the core)
  off: 5.2, // core offset away from the spark, so the rim is heaviest beside it
  ang: -46, // spark direction in degrees (screen coords, -90 = 12 o'clock)
  sDist: 40.2, // spark centre distance from canvas centre
  sR: 7.4, // spark radius
  gap: 3.3, // clear space between spark and rim
};

const rad = (d) => (d * Math.PI) / 180;
const f = (n) => +n.toFixed(2);
const pt = (q) => `${f(q[0])} ${f(q[1])}`;
const angle = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);

function intersect(c0, r0, c1, r1) {
  const dx = c1[0] - c0[0], dy = c1[1] - c0[1], d = Math.hypot(dx, dy);
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d), h = Math.sqrt(r0 * r0 - a * a);
  const mx = c0[0] + (a * dx) / d, my = c0[1] + (a * dy) / d;
  return [[mx + (h * dy) / d, my - (h * dx) / d], [mx - (h * dy) / d, my + (h * dx) / d]];
}

export function markGeometry(g = G) {
  const t = rad(g.ang);
  const C = [50, 50];
  const I = [50 - Math.cos(t) * g.off, 50 - Math.sin(t) * g.off];
  const S = [50 + Math.cos(t) * g.sDist, 50 + Math.sin(t) * g.sDist];
  const K = g.sR + g.gap;

  // Order a pair so [0] sits clockwise of the spark direction, [1] anticlockwise.
  const order = (pts) => {
    const rel = (q) => ((angle(C, q) - t + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return pts.sort((p, q) => rel(q) - rel(p));
  };
  // The knockout arc between two cut points that runs through the solid rim.
  const kArc = (A, B, inSolid) => {
    for (const sweep of [0, 1]) {
      const a0 = angle(S, A), a1 = angle(S, B);
      let span = sweep ? a1 - a0 : a0 - a1;
      span = ((span % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const mid = a0 + ((sweep ? 1 : -1) * span) / 2;
      if (inSolid([S[0] + Math.cos(mid) * K, S[1] + Math.sin(mid) * K]))
        return `A${f(K)} ${f(K)} 0 ${span > Math.PI ? 1 : 0} ${sweep} ${pt(B)}`;
    }
    throw new Error("no knockout arc");
  };
  const inOuter = (q) => Math.hypot(q[0] - C[0], q[1] - C[1]) < g.R;
  const outsideCore = (q) => Math.hypot(q[0] - I[0], q[1] - I[1]) > g.r;

  const [Pa, Pb] = order(intersect(C, g.R, S, K));
  const cutsCore = Math.hypot(S[0] - I[0], S[1] - I[1]) - K < g.r;
  let rim;
  if (cutsCore) {
    const [Qa, Qb] = order(intersect(I, g.r, S, K));
    const solid = (q) => inOuter(q) && outsideCore(q);
    rim = `M${pt(Pa)}A${g.R} ${g.R} 0 1 1 ${pt(Pb)}${kArc(Pb, Qb, solid)}A${g.r} ${g.r} 0 1 0 ${pt(Qa)}${kArc(Qa, Pa, solid)}Z`;
  } else {
    // The spark's clearance bites the outer edge only; the core is a hole (evenodd).
    rim =
      `M${pt(Pa)}A${g.R} ${g.R} 0 1 1 ${pt(Pb)}${kArc(Pb, Pa, inOuter)}Z` +
      `M${f(I[0] - g.r)} ${f(I[1])}a${g.r} ${g.r} 0 1 0 ${2 * g.r} 0a${g.r} ${g.r} 0 1 0 ${-2 * g.r} 0Z`;
  }
  return { rim, spark: { cx: f(S[0]), cy: f(S[1]), r: g.sR } };
}
