import { defineConfig } from "vitest/config";

export default defineConfig({
  // Web pages a test calls compile as Next compiles them: React's automatic JSX runtime.
  esbuild: { jsx: "automatic" },
  test: {
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // ledger tests share one Postgres; keep runs deterministic
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
