import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/**
 * The Miner moved into the member app at /mining. Every page here is a
 * permanent redirect (see lib/web-url.ts), so this shell renders nothing of
 * its own — no session lookup, no tab bar.
 *
 * components/, app/actions.ts and lib/auth.ts are the pre-move screens and are
 * no longer imported by any page; the live copies are in apps/web.
 */
export const metadata: Metadata = {
  title: { default: "Tycoonhood Miner", template: "%s · Tycoonhood Miner" },
  description: "The Miner now lives in the Tycoonhood member app.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TH Miner" },
};
export const viewport: Viewport = {
  themeColor: "#0a0908",
  width: "device-width",
  initialScale: 1,
  // No maximumScale: pinch-zoom stays available (WCAG 1.4.4).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg-0 text-ink-1 antialiased">{children}</body>
    </html>
  );
}
