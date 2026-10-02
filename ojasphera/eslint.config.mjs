// Ojasphera's own lint config — self-contained, nothing inherited from outside this folder.
//
// While this folder lives inside the TycoonHood repository, TycoonHood's root
// `eslint .` also lints it with TycoonHood's own config. `pnpm lint` therefore
// runs two passes: this config, then scripts/lint-as-host.mjs, which runs
// TycoonHood's actual lint on this folder. The rules below mirror TycoonHood's
// base rules as a first line of defence for when that second pass can't run.
import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: ["**/node_modules/**", "**/.next/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      // TycoonHood's root config doesn't load the React, hooks, Next.js, a11y or
      // import plugins for this folder, so an inline `eslint-disable` naming one of
      // their rules is an unknown rule there and fails its lint. Fix the code instead.
      "@eslint-community/eslint-comments/no-restricted-disable": [
        "error",
        "react/*",
        "react-hooks/*",
        "@next/next/*",
        "jsx-a11y/*",
        "import/*",
        "@eslint-community/*",
      ],
      // Inline rule-config comments (`/* eslint rule: "off" */`) have the same problem.
      "@eslint-community/eslint-comments/no-use": [
        "error",
        { allow: ["eslint-disable", "eslint-disable-line", "eslint-disable-next-line", "eslint-enable"] },
      ],
      // Rules TycoonHood's newer @eslint/js and typescript-eslint setup treat as errors.
      "no-unassigned-vars": "error",
      "no-useless-assignment": "error",
      "preserve-caught-error": ["error", { requireCatchParameter: false }],
      "@typescript-eslint/no-unused-expressions": "error",
    },
  },
  {
    // Node globals for config files.
    files: ["**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } },
  },
];

export default config;
