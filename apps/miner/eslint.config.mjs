// Per-app config so `next build` detects the Next.js plugin.
// Repo-wide rules live in ../../eslint.config.mjs.
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [
  { ignores: ["**/.next/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals"),
  { rules: { "react/no-unescaped-entities": "off" } },
];
