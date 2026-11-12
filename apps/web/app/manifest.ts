import type { MetadataRoute } from "next";

/**
 * The installable app. Opening it from a home screen goes straight to Today,
 * full-screen, with the academy's colours. Shortcuts are the three places a
 * member goes most.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/today",
    name: "Tycoonhood",
    short_name: "Tycoonhood",
    description: "The academy for discipline, business and money: programs, the daily standard, and the community.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Courses", url: "/courses", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Community", url: "/community", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
