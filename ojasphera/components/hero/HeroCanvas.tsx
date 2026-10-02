"use client";

import { useEffect, useRef } from "react";
import { CORE, EDGES, STAGE_COLOR, buildSatellites, type CoreId } from "./system-model";

type Props = {
  /** Node selected from outside (keyboard / chips). */
  selected: CoreId | null;
  /** Increment to fire a propagation pulse from `selected` (or the real world). */
  pulseKey: number;
  onFocus: (id: CoreId | null) => void;
  onStage: (stage: number | null) => void;
};

type Packet = { edge: number; t: number; speed: number };

const coreIndex = new Map(CORE.map((c, i) => [c.id, i]));
const edgeIdx = EDGES.map(([a, b]) => [coreIndex.get(a)!, coreIndex.get(b)!] as const);
const outgoing = CORE.map((_, i) => edgeIdx.map((e, k) => (e[0] === i ? k : -1)).filter((k) => k >= 0));

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function HeroCanvas({ selected, pulseKey, onFocus, onStage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedRef = useRef(selected);
  const pulseRef = useRef<{ start: number; depth: number[] } | null>(null);
  const cbRef = useRef({ onFocus, onStage });
  cbRef.current = { onFocus, onStage };
  const fireRef = useRef<(from: number) => void>(() => {});

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (pulseKey === 0) return;
    const from = selectedRef.current ? coreIndex.get(selectedRef.current)! : 0;
    fireRef.current(from);
  }, [pulseKey]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 768px)").matches;
    const sats = buildSatellites(small ? 9 : 18);
    const monoFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace";

    let w = 0, h = 0, dpr = 1, portrait = false, scale = 1, cx = 0;
    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    let time = 0;

    const pointer = { x: 0, y: 0, tx: 0, ty: 0, sx: -9999, sy: -9999, inside: false };
    let hoverCore = -1;
    let lastReported: number | null = -2;
    let lastStage: number | null = -2;
    const packets: Packet[] = [];
    let spawnAcc = 0;
    let autoPulseAt = 2200;

    // Per-satellite screen-space displacement (pointer reorganises information).
    const disp = sats.map(() => ({ x: 0, y: 0 }));
    const proj = new Float32Array((CORE.length + sats.length) * 3);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      portrait = h > w * 1.1;
      // Wide screens: the system occupies the right of the hero, beside the copy.
      const side = w >= 1280 && !portrait;
      // Anchor to the 1440px content shell so ultra-wide screens keep the same composition.
      const cw = Math.min(w, 1440);
      const left = (w - cw) / 2;
      cx = side ? left + cw * (cw < 1400 ? 0.69 : 0.68) : w / 2;
      scale = portrait ? Math.min(w * 0.33, h * 0.24) : side ? Math.min(cw * (cw < 1400 ? 0.14 : 0.15), h * 0.33) : Math.min(w * 0.21, h * 0.34);
    }

    function fire(from: number) {
      const depth = CORE.map(() => -1);
      depth[from] = 0;
      const q = [from];
      while (q.length) {
        const n = q.shift()!;
        for (const k of outgoing[n]) {
          const to = edgeIdx[k][1];
          if (depth[to] < 0 && !(edgeIdx[k][0] === 7 && to === 0 && from !== 7)) {
            depth[to] = depth[n] + 1;
            q.push(to);
          }
        }
      }
      pulseRef.current = { start: time, depth };
      // Burst of packets along every edge the pulse will travel.
      edgeIdx.forEach(([a, b], k) => {
        if (depth[a] >= 0 && depth[b] === depth[a] + 1) packets.push({ edge: k, t: -depth[a] * 0.9, speed: 1.15 });
      });
    }
    fireRef.current = fire;

    function project(x: number, y: number, z: number, yaw: number, pitch: number, out: number) {
      // Portrait screens run the flow top→bottom.
      if (portrait) [x, y] = [y, x];
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      let X = x * cy - z * sy;
      let Z = x * sy + z * cy;
      const Y = y * cp - Z * sp;
      Z = y * sp + Z * cp;
      const persp = 3.4 / (3.4 + Z);
      X = cx + X * scale * persp - (portrait ? scale * 0.25 : 0);
      proj[out] = X;
      proj[out + 1] = h / 2 + Y * scale * persp;
      proj[out + 2] = persp;
    }

    function frame(now: number) {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reduced) time += dt;

      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      const yaw = (reduced ? 0 : Math.sin(time * 0.00011) * 0.32) + pointer.x * 0.28;
      const pitch = (reduced ? 0 : Math.sin(time * 0.00007) * 0.08) + pointer.y * 0.16;

      CORE.forEach((c, i) => project(c.pos[0], c.pos[1], c.pos[2], yaw, pitch, i * 3));
      const base = CORE.length * 3;
      sats.forEach((s, i) => {
        const j = Math.sin(time * 0.0009 + s.phase) * s.amp;
        const k = Math.cos(time * 0.0007 + s.phase * 1.3) * s.amp;
        project(s.base[0] + j, s.base[1] + k, s.base[2] + j * 0.5, yaw, pitch, base + i * 3);
      });

      // ---- focus: nearest core to the pointer, else external selection ----
      hoverCore = -1;
      if (pointer.inside) {
        let best = 70 * 70;
        for (let i = 0; i < CORE.length; i++) {
          const dx = proj[i * 3] - pointer.sx, dy = proj[i * 3 + 1] - pointer.sy;
          const d = dx * dx + dy * dy;
          if (d < best) { best = d; hoverCore = i; }
        }
      }
      const sel = selectedRef.current ? coreIndex.get(selectedRef.current)! : -1;
      const focus = hoverCore >= 0 ? hoverCore : sel;
      canvas.style.cursor = hoverCore >= 0 ? "pointer" : "default";
      if (focus !== lastReported) {
        lastReported = focus;
        cbRef.current.onFocus(focus >= 0 ? CORE[focus].id : null);
      }

      // ---- pulse state ----
      const pulse = pulseRef.current;
      const pulseT = pulse ? (time - pulse.start) / 900 : -1;
      let stage: number | null = null;
      if (pulse && pulseT < 7) {
        for (let i = 0; i < CORE.length; i++) if (pulse.depth[i] >= 0 && pulse.depth[i] <= pulseT) stage = Math.max(stage ?? 0, CORE[i].stage);
      } else if (pulse) {
        pulseRef.current = null;
      }
      if (stage !== lastStage) {
        lastStage = stage;
        cbRef.current.onStage(stage);
      }
      const nodeHeat = (i: number) => {
        if (!pulse || pulse.depth[i] < 0) return 0;
        const d = pulseT - pulse.depth[i];
        return d < 0 ? 0 : Math.max(0, 1 - d / 2.4);
      };

      // ---- autonomous behaviour: the system is always working ----
      if (!reduced) {
        autoPulseAt -= dt;
        if (autoPulseAt <= 0 && !pulse) {
          fire(Math.random() < 0.5 ? 0 : 1);
          autoPulseAt = 7000 + Math.random() * 3000;
        }
        spawnAcc += dt;
        const rate = focus >= 0 ? 120 : 260;
        while (spawnAcc > rate) {
          spawnAcc -= rate;
          let k: number;
          if (focus >= 0 && Math.random() < 0.65) {
            const touching = edgeIdx.map((e, i) => (e[0] === focus || e[1] === focus ? i : -1)).filter((i) => i >= 0);
            k = touching[(Math.random() * touching.length) | 0];
          } else {
            k = (Math.random() * (edgeIdx.length - 1)) | 0; // skip the feedback loop for ambient traffic
          }
          if (packets.length < 90) packets.push({ edge: k, t: 0, speed: 0.35 + Math.random() * 0.35 });
        }
      }

      // ---- draw ----
      ctx.clearRect(0, 0, w, h);

      // Satellite tethers + satellites (with pointer repulsion)
      for (let i = 0; i < sats.length; i++) {
        const o = base + i * 3;
        const s = sats[i];
        const d = disp[i];
        let tx = 0, ty = 0;
        if (pointer.inside) {
          const dx = proj[o] - pointer.sx, dy = proj[o + 1] - pointer.sy;
          const dist = Math.hypot(dx, dy);
          if (dist < 110 && dist > 0.01) {
            const f = (1 - dist / 110) * 26;
            tx = (dx / dist) * f;
            ty = (dy / dist) * f;
          }
        }
        d.x += (tx - d.x) * 0.12;
        d.y += (ty - d.y) * 0.12;
        const sx = proj[o] + d.x, sy = proj[o + 1] + d.y, p = proj[o + 2];
        const ci = s.core;
        const lit = ci === focus ? 1 : 0;
        const heat = nodeHeat(ci);
        const col = STAGE_COLOR[CORE[ci].stage];
        ctx.strokeStyle = hexA(lit || heat > 0.2 ? col : "#a3a9b4", 0.05 + lit * 0.18 + heat * 0.2);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(proj[ci * 3], proj[ci * 3 + 1]);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.fillStyle = hexA(lit || heat > 0.2 ? col : "#c9ced6", 0.25 + p * 0.25 + lit * 0.4 + heat * 0.4);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.6, 1.3 * p), 0, Math.PI * 2);
        ctx.fill();
      }

      // Core edges
      edgeIdx.forEach(([a, b], k) => {
        const ax = proj[a * 3], ay = proj[a * 3 + 1], bx = proj[b * 3], by = proj[b * 3 + 1];
        const touches = a === focus || b === focus;
        const feedback = k === edgeIdx.length - 1;
        ctx.lineWidth = touches ? 1.1 : 0.7;
        ctx.strokeStyle = touches ? hexA(STAGE_COLOR[CORE[focus].stage], 0.55) : `rgba(163,169,180,${feedback ? 0.08 : 0.16})`;
        ctx.beginPath();
        if (feedback) {
          // The loop back: experience informs the business. Drawn as a wide arc.
          const mx = (ax + bx) / 2, my = Math.max(ay, by) + (portrait ? 0 : scale * 1.15);
          const mxp = portrait ? Math.max(ax, bx) + scale * 1.1 : mx;
          const myp = portrait ? (ay + by) / 2 : my;
          ctx.setLineDash([2, 6]);
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo(mxp, myp, bx, by);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      });

      // Packets (data in motion)
      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i];
        if (!reduced) pk.t += (dt / 1000) * pk.speed;
        if (pk.t > 1) { packets.splice(i, 1); continue; }
        if (pk.t < 0) continue;
        const [a, b] = edgeIdx[pk.edge];
        const feedback = pk.edge === edgeIdx.length - 1;
        const pos = (t: number) => {
          const ax = proj[a * 3], ay = proj[a * 3 + 1], bx = proj[b * 3], by = proj[b * 3 + 1];
          if (!feedback) return [ax + (bx - ax) * t, ay + (by - ay) * t];
          const cx = portrait ? Math.max(ax, bx) + scale * 1.1 : (ax + bx) / 2;
          const cy = portrait ? (ay + by) / 2 : Math.max(ay, by) + scale * 1.15;
          const u = 1 - t;
          return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
        };
        const [x, y] = pos(pk.t);
        const [x2, y2] = pos(Math.max(0, pk.t - 0.08));
        const col = STAGE_COLOR[CORE[a].stage];
        const grad = ctx.createLinearGradient(x2, y2, x, y);
        grad.addColorStop(0, hexA(col, 0));
        grad.addColorStop(1, hexA(col, 0.9));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = hexA(col, 1);
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core nodes + labels, far to near
      const order = CORE.map((_, i) => i).sort((i, j) => proj[i * 3 + 2] - proj[j * 3 + 2]);
      const fontSize = small ? 9 : 10;
      ctx.font = `500 ${fontSize}px ${monoFamily}`;
      ctx.textBaseline = "middle";
      for (const i of order) {
        const x = proj[i * 3], y = proj[i * 3 + 1], p = proj[i * 3 + 2];
        const col = STAGE_COLOR[CORE[i].stage];
        const isF = i === focus;
        const heat = nodeHeat(i);
        const r = (isF ? 7 : 5) * p;
        if (isF || heat > 0) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 34 * p);
          g.addColorStop(0, hexA(col, 0.28 * Math.max(isF ? 1 : 0, heat)));
          g.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 34 * p, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#08090b";
        ctx.strokeStyle = hexA(col, isF || heat > 0.15 ? 1 : 0.7);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hexA(col, isF || heat > 0.15 ? 1 : 0.85);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.5, r - 2.5), 0, Math.PI * 2);
        ctx.fill();
        // Label
        const label = CORE[i].id;
        ctx.fillStyle = isF ? "#eceef1" : `rgba(163,169,180,${0.55 + p * 0.25})`;
        const lx = x + r + 9;
        ctx.fillText(label, lx, y);
        if (isF) {
          ctx.strokeStyle = hexA(col, 0.6);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(lx, y + 9);
          ctx.lineTo(lx + ctx.measureText(label).width, y + 9);
          ctx.stroke();
        }
      }

      if (running) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || !visible) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    function redrawOnce() {
      if (!running) requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.sx = e.clientX - rect.left;
      pointer.sy = e.clientY - rect.top;
      pointer.tx = (pointer.sx / rect.width - 0.5) * 2;
      pointer.ty = (pointer.sy / rect.height - 0.5) * 2;
      pointer.inside = true;
      if (reduced) redrawOnce();
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.tx = 0;
      pointer.ty = 0;
      if (reduced) redrawOnce();
    };
    const onDown = () => {
      if (hoverCore >= 0) fire(hoverCore);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) redrawOnce();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced) start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : visible && !reduced && start());
    document.addEventListener("visibilitychange", onVis);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);

    if (reduced) redrawOnce();
    else start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-pan-y" aria-hidden="true" />;
}
