"use client";
import { useEffect } from "react";

/** Once the list is on screen, mark it read — after the member has seen which items were new. */
export function MarkReadOnView({ action, unread }: { action: () => Promise<void>; unread: number }) {
  useEffect(() => {
    if (unread === 0) return;
    const t = window.setTimeout(() => void action(), 1500);
    return () => window.clearTimeout(t);
  }, [action, unread]);
  return null;
}
