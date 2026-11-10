import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Fronteiras (RF9). Provadas por src/lint/fronteiras.test.ts.
// Limite conhecido: no-restricted-imports só olha `import`/`export from`, não `require()`
// nem `import()` dinâmico.
const MODULOS = [
  "prazos", "processos", "clientes", "honorarios", "audiencias",
  "tarefas", "documentos", "alertas", "intimacao",
];

const semVercel = {
  group: ["@vercel/*"],
  message: "Nada exclusivo do Vercel (KV, Blob, Edge Config). Use uma porta em src/platform/.",
};

const soPeloIndex = {
  group: ["@/modules/*/*", "**/modules/*/**"],
  message: "Importe o módulo só pelo index.ts (ex.: @/modules/prazos), nunca pelo interior.",
};

const semBanco = [
  {
    group: ["@prisma/client", "@prisma/client/*", "@/generated/*", "@/platform/database", "@/platform/database/*"],
    message: "Telas e rotas chamam serviços dos módulos, nunca o banco direto.",
  },
];

// Um módulo importa os outros só pelo index, inclusive por caminho relativo.
function regraDoModulo(modulo) {
  const outros = MODULOS.filter((m) => m !== modulo);
  return {
    patterns: [
      semVercel,
      {
        group: [
          ...outros.map((m) => `@/modules/${m}/*`),
          ...outros.flatMap((m) => [`../**/${m}`, `../**/${m}/**`]),
        ],
        message: "Módulos só se falam pelo index.ts de cada um (ex.: @/modules/clientes).",
      },
    ],
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [semVercel, soPeloIndex] }] },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [semVercel, soPeloIndex, ...semBanco] }] },
  },
  ...MODULOS.map((modulo) => ({
    files: [`src/modules/${modulo}/**/*.{ts,tsx}`],
    rules: { "no-restricted-imports": ["error", regraDoModulo(modulo)] },
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
