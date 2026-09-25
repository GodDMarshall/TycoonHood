import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { TabBar } from "../components/tab-bar";
import { getCurrentUser } from "../lib/auth";

export const metadata: Metadata = {
  title: { default: "Tycoonhood Miner", template: "%s · Tycoonhood Miner" },
  description: "Run your rig. Watch, earn, invite. The books stay open.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TH Miner" },
};
export const viewport: Viewport = {
  themeColor: "#0d0b08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The tab bar is meaningless to a signed-out visitor: every tab behind it
  // would bounce straight back to the sign-in screen.
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg-0 text-ink-1 antialiased">
        {children}
        {user && <TabBar />}
      </body>
    </html>
  );
}
