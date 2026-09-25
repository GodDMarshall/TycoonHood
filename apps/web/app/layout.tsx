import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tycoonhood", template: "%s · Tycoonhood" },
  description: "Build yourself. Build skills. Build businesses. Build wealth. Build freedom.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg-0 text-ink-1 antialiased">{children}</body>
    </html>
  );
}
