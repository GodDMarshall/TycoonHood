import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RevealObserver } from "../components/reveal-observer";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Tycoonhood — build yourself, the rest compounds", template: "%s · Tycoonhood" },
  description:
    "A self-mastery academy with an honest internal economy. Four programs, real missions, five ranks, one open ledger. Free to enter.",
  applicationName: "Tycoonhood",
  openGraph: {
    type: "website",
    siteName: "Tycoonhood",
    title: "Tycoonhood — build yourself, the rest compounds",
    description:
      "Four programs, real missions, five ranks and a fixed-supply ledger you can audit. Progress you can prove.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
  colorScheme: "dark",
};

// Runs before first paint: opt into scroll reveals, with a watchdog that
// backs out if the client bundle never arrives to run the observer.
const revealBoot = `document.documentElement.classList.add("js-reveal");setTimeout(function(){if(!window.__thReveal)document.documentElement.classList.remove("js-reveal")},2500);`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: revealBoot }} />
      </head>
      <body className="min-h-dvh bg-bg-0 text-ink-1 antialiased">
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        {children}
        <RevealObserver />
      </body>
    </html>
  );
}
