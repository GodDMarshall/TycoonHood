import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load the monorepo-root .env so DATABASE_URL reaches server components.
try {
  const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* .env may legitimately be absent in hosted environments */
}


/**
 * Production security headers.
 *
 * CSP notes: Next.js App Router injects inline bootstrap scripts and inline
 * styles, so 'unsafe-inline' is required for style-src and script-src under
 * the stable (non-nonce) setup. Everything else is locked to self. Stripe
 * frames/scripts are allowed because checkout redirects through them; drop
 * those entries if the card rail is ever removed.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "connect-src 'self' https://api.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Two years, subdomains included. Only meaningful over HTTPS, which is
  // where this ships; browsers ignore it on plain http locally.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't advertise the framework version
  transpilePackages: ["@tycoonhood/db", "@tycoonhood/core", "@tycoonhood/config", "@tycoonhood/ui"],
  serverExternalPackages: ["@prisma/client", "prisma", "pg", "@node-rs/argon2"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  webpack: (config, { isServer }) => {
    // Native modules imported through transpiled workspace packages must be
    // externalized explicitly — serverExternalPackages alone doesn't reach them.
    if (isServer) config.externals.push("@node-rs/argon2");
    return config;
  },
};
export default nextConfig;
