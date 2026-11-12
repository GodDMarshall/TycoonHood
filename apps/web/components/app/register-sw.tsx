"use client";
import { useEffect } from "react";

/** Registers the service worker in production only (dev keeps a clean cache). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // The site works without it; installation just loses its offline page.
    });
  }, []);
  return null;
}
