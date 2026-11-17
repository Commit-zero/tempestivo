import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/preparo.ts"],
    // Folga para os testes que sobem o ESLint ou falam com o Postgres enquanto o Argon2 ocupa a CPU.
    testTimeout: 20_000,
  },
});
