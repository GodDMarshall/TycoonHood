/** Single source of truth for brand, navigation and SEO copy. */
export const site = {
  name: "Ojasphera Labs",
  legalName: "Ojasphera Labs Private Limited",
  wordmark: "OJASPHERA",
  domain: "ojasphera.com",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://ojasphera.com",
  title: "Ojasphera Labs — Intelligent Digital Systems for Real-World Problems",
  description:
    "Ojasphera Labs builds AI-powered digital systems, intelligent agents, automation and immersive technology for businesses, projects and ambitious ideas.",
  tagline: "Building intelligent systems for real-world problems.",
  pillars: ["AI", "Systems", "Automation", "Intelligence", "Experiences"],
  footerPillars: ["AI", "Systems", "Automation", "Experience"],
  /** Optional public contact address. Leave unset until a real inbox exists. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
} as const;

export const nav = [
  { href: "/systems", label: "Systems" },
  { href: "/projects", label: "Projects" },
  { href: "/capabilities", label: "Capabilities" },
  { href: "/about", label: "About" },
] as const;

export const footerLinks = [
  { href: "/projects", label: "Projects" },
  { href: "/capabilities", label: "Capabilities" },
  { href: "/about", label: "About" },
  { href: "/build", label: "Contact" },
  { href: "/brand", label: "Brand" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;
