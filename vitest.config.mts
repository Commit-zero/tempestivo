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
    // O plugin de cookies do Better Auth importa `next/headers`: ele precisa passar pelo
    // Vite para os testes de autenticação conseguirem simular o navegador.
    server: { deps: { inline: ["better-auth"] } },
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/preparo.ts"],
    // Folga para os testes que sobem o ESLint ou falam com o Postgres enquanto o Argon2 ocupa a CPU.
    testTimeout: 20_000,
    // Cobertura do domínio, dos serviços e das portas. As telas e o que depende do
    // contexto de requisição do Next (sessão, configuração do Better Auth, raiz de
    // composição) são cobertos pelos testes de tela (e2e/), não por estes.
    coverage: {
      provider: "v8",
      include: ["src/modules/**", "src/lib/**", "src/platform/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.{md,json}",
        "src/platform/auth/auth.ts",
        "src/platform/auth/sessao.ts",
        "src/platform/runtime/**",
      ],
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});
