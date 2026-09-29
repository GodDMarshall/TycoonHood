"use client";
/**
 * The way back in. Member pages are rooms of the HQ; this slim line says
 * which building you are standing in and walks you back into it
 * (`/world?room=…` enters the room directly). It renders only where the
 * world can run — on a device that gets the 2D app, a link into a world it
 * cannot show would be a dead end.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@tycoonhood/ui";
import { DISTRICTS, type DistrictId } from "../hq/districts";
import { detectQuality } from "./engine/quality";

const ROOMS: [prefix: string, id: DistrictId][] = [
  ["/dashboard", "command"],
  ["/academy", "academy"],
  ["/library", "vault"],
  ["/orders", "vault"],
  ["/wallet", "treasury"],
  ["/leaderboard", "network"],
];

export function ReturnToHQ() {
  const path = usePathname();
  const [capable, setCapable] = useState(false);
  useEffect(() => setCapable(detectQuality().tier !== "none"), []);

  const id = ROOMS.find(([p]) => path === p || path.startsWith(p + "/"))?.[1];
  const district = DISTRICTS.find((d) => d.id === id);
  if (!capable || !district) return null;

  return (
    <Link
      href={`/world?room=${district.id}`}
      className="group mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 transition-colors hover:text-gold"
    >
      <Icon name="arrow-left" size={12} className="transition-transform group-hover:-translate-x-0.5" />
      Walk back into the {district.name}
    </Link>
  );
}
