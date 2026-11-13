import { defineConfig, devices } from "@playwright/test";
import { ARQUIVO_DA_SESSAO } from "./e2e/sessao";

const PORTA = 3100;
const noCI = Boolean(process.env.CI);
// Opcional, só para máquinas em que o Chromium do Playwright é bloqueado (ex.: política
// de Controle de Aplicativo do Windows): PLAYWRIGHT_CHANNEL=msedge ou chrome usa o navegador instalado.
const canal = process.env.PLAYWRIGHT_CHANNEL || undefined;

// Três larguras exigidas pela regra 8 do projeto, todas no Chromium.
const LARGURAS = [
  { name: "mobile", viewport: { width: 360, height: 740 } },
  { name: "tablet", viewport: { width: 768, height: 1024 } },
  { name: "desktop", viewport: { width: 1280, height: 800 } },
];

export default defineConfig({
  testDir: "e2e",
  forbidOnly: noCI,
  retries: noCI ? 1 : 0,
  workers: 3,
  reporter: noCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "retain-on-failure" },
  projects: [
    // Roda uma vez: cria uma conta fictícia e guarda a sessão que as três larguras reutilizam.
    { name: "preparo", testMatch: /preparo\.ts$/, use: { ...devices["Desktop Chrome"], channel: canal } },
    ...LARGURAS.map(({ name, viewport }) => ({
      name,
      dependencies: ["preparo"],
      use: { ...devices["Desktop Chrome"], channel: canal, viewport, storageState: ARQUIVO_DA_SESSAO },
    })),
  ],
  webServer: {
    // Sempre contra o build de produção: o servidor de desenvolvimento compila cada
    // rota no primeiro acesso e estoura o tempo dos testes. No CI o build já foi feito.
    // `npx --no-install` usa o Next do projeto sem depender da versão global do pnpm.
    command: noCI
      ? `npx --no-install next start -p ${PORTA}`
      : `npx --no-install next build && npx --no-install next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !noCI,
    timeout: 300_000,
    // Valores falsos: o e2e nunca usa segredos reais nem envia e-mail.
    env: {
      APP_URL: `http://localhost:${PORTA}`,
      JOBS_SECRET: "segredo.falso.so.para.o.e2e.0123456789.abcdef",
      AUTH_SECRET: "segredo.falso.de.sessao.so.para.o.e2e.0123456789",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/tempestivo",
      MAILER_DRIVER: "fake",
      LOG_LEVEL: "warn",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
