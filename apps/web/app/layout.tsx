import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RevealObserver } from "../components/reveal-observer";
import { RegisterServiceWorker } from "../components/app/register-sw";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Tycoonhood — build yourself, the rest compounds", template: "%s · Tycoonhood" },
  description:
    "A serious academy for discipline, business and money: programs that open lesson by lesson, a daily standard, and a community that posts proof. Free to join.",
  applicationName: "Tycoonhood",
  openGraph: {
    type: "website",
    siteName: "Tycoonhood",
    title: "Tycoonhood — build yourself, the rest compounds",
    description:
      "Programs that open lesson by lesson, a daily standard you hold every day, and a community that posts proof.",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Tycoonhood", statusBarStyle: "black" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
  colorScheme: "dark",
  viewportFit: "cover",
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
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
