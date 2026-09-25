import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // ledger tests share one Postgres; keep runs deterministic
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
