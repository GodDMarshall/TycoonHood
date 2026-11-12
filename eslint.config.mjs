// Flat ESLint config for the TycoonHood monorepo.
// Deliberately lean: it catches real defects (unused symbols, unsafe escapes,
// bad hooks usage, Next.js footguns) without turning into a style argument.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

// The optional 3D campus (DR-31). three.js and the campus engine reach the
// browser only through components/world/world-host.tsx, which loads them with
// import() once the device and GPU gates pass, so no other page's bundle ever
// carries them. Everywhere else may import their types, never their code.
// ESLint's core rule (typescript-eslint's copy is deprecated) never checks
// import() expressions, which is what lets the host's dynamic import through.
const WORLD_ENGINE = [
  {
    regex: "^(three|postprocessing|n8ao)(/|$)",
    allowTypeImports: true,
    message: "3D code loads only through components/world/world-host.tsx via import() (DR-31).",
  },
  {
    regex: "(^|/)world/(engine|architecture|interiors)(/|$)",
    allowTypeImports: true,
    message: "Engine modules are loaded only by world-host.tsx via import() (DR-31).",
  },
];

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

  // One Markdown renderer: packages/core/src/content/markdown.ts sanitises what
  // marked produces, and nothing else renders Markdown or calls the sanitiser.
  // The typescript-eslint rule, so a later no-restricted-imports block cannot
  // silently replace this one.
  {
    ignores: ["packages/core/src/content/markdown.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "marked", message: "Render Markdown with renderMarkdown() from @tycoonhood/core. It sanitises the HTML." },
            { name: "sanitize-html", message: "Use renderMarkdown() or sanitizeContentHtml() from @tycoonhood/core." },
          ],
        },
      ],
    },
  },

  // The campus engine stays out of every bundle but its own (DR-31).
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    ignores: [
      "apps/web/components/world/engine/**",
      "apps/web/components/world/architecture/**",
      "apps/web/components/world/interiors/**",
      "apps/web/types/**", // n8ao.d.ts names postprocessing's Pass inside `declare module`
    ],
    rules: { "no-restricted-imports": ["error", { patterns: WORLD_ENGINE }] },
  },
  // Beside the engine, relative paths into it count too. Flat config replaces a
  // rule's options per file rather than merging them, so WORLD_ENGINE repeats.
  {
    files: ["apps/web/components/world/*.{ts,tsx}", "apps/web/components/world/hud/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...WORLD_ENGINE,
            {
              regex: "^[.][.]?/([.][.]/)*(engine|architecture|interiors)/",
              allowTypeImports: true,
              message: "Use import type; the host loads the engine with import().",
            },
          ],
        },
      ],
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
