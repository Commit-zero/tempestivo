import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // `server-only` só existe para o build do Next barrar import em componente de cliente.
    alias: { "server-only": fileURLToPath(new URL("./src/test/vazio.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/preparo.ts"],
    // Folga para os testes que sobem o ESLint ou falam com o Postgres enquanto o Argon2 ocupa a CPU.
    testTimeout: 20_000,
  },
});
