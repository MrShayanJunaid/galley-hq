import { defineConfig } from "vitest/config";

/**
 * End-to-end suite. Runs against the already-running app (default
 * http://localhost:8080) and the real Supabase project, so tests run
 * sequentially in a single process.
 */
export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.test.ts"],
    environment: "node",
    globals: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    reporters: ["default"],
  },
});
