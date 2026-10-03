import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Ojasphera",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#050607",
    theme_color: "#050607",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/brand/ojasphera-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/ojasphera-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
