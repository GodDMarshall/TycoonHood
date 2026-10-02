"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { hasWebGL } from "./env";

const Loading = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="eyebrow animate-pulse">Rendering environment…</span>
  </div>
);

const SCENES = {
  tower: dynamic(() => import("./TowerScene"), { ssr: false, loading: Loading }),
  estate: dynamic(() => import("./EstateScene"), { ssr: false, loading: Loading }),
};

export type SceneName = keyof typeof SCENES;

/**
 * Mounts a 3D scene only when it nears the viewport and the device can run it.
 * Otherwise shows `fallback` (an SVG visual), so nothing is ever blank.
 */
export function Scene3D({
  name,
  mode = "hero",
  fallback,
  desktopOnly = false,
}: {
  name: SceneName;
  mode?: "hero" | "card";
  fallback: ReactNode;
  desktopOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "3d" | "fallback">("idle");

  useEffect(() => {
    const ok = hasWebGL() && !(desktopOnly && window.matchMedia("(max-width: 1023px)").matches);
    if (!ok) {
      setState("fallback");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("3d");
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(ref.current!);
    return () => io.disconnect();
  }, [desktopOnly]);

  const Scene = SCENES[name];
  return (
    <div ref={ref} className="absolute inset-0">
      {state === "3d" ? <Scene mode={mode} /> : state === "fallback" ? fallback : null}
    </div>
  );
}
