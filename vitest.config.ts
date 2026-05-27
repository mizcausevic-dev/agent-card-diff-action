import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/cli.ts", "src/index.ts", "src/types.ts"],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 60,
        lines: 80
      }
    }
  }
});
