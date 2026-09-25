import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tycoonhood Miner",
    short_name: "TH Miner",
    description: "Run your rig. Claim your THC. The books stay open.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0b08",
    theme_color: "#0d0b08",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
