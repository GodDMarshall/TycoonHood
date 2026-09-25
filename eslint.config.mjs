// Flat ESLint config for the TycoonHood monorepo.
// Deliberately lean: it catches real defects (unused symbols, unsafe escapes,
// bad hooks usage, Next.js footguns) without turning into a style argument.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "packages/db/src/generated/**", // engine-free Prisma client, machine-authored
      "**/*.config.js",
      "**/*.config.mjs",
      "**/next-env.d.ts", // Next.js generates this file
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js apps: core-web-vitals adds hooks + image/link correctness rules.
  ...compat.extends("next/core-web-vitals").map((c) => ({
    ...c,
    files: ["apps/web/**/*.{ts,tsx}", "apps/miner/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
  })),

  {
    rules: {
      // Unused code is the signal that actually matters; allow _-prefixed escapes.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // `any` is a smell, not a build-breaker — surfaced, not fatal.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Typographic apostrophes in copy are correct as written and render fine;
      // this rule is pure style noise on a content-heavy site.
      "react/no-unescaped-entities": "off",
    },
  },

  // Node scripts (.mjs operator tools) run outside the browser: declare Node globals.
  {
    files: ["**/*.mjs", "**/scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", Buffer: "readonly", __dirname: "readonly" },
    },
  },

  // Scripts and seeds are operator tools: console output is the point.
  {
    files: ["**/scripts/**", "packages/db/src/seed*.ts", "**/*.test.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },

  // The end-to-end runner is Node, but the callbacks it hands to
  // page.waitForFunction() are serialised and executed inside the browser —
  // so `document` there is correct, and ESLint cannot tell the two apart.
  {
    files: ["scripts/e2e/**/*.mjs"],
    languageOptions: { globals: { document: "readonly", window: "readonly" } },
  },
];
