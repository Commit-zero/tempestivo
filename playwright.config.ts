import { defineConfig, devices } from "@playwright/test";

const PORTA = 3100;
const noCI = Boolean(process.env.CI);
// Opcional, só para máquinas em que o Chromium do Playwright é bloqueado (ex.: política
// de Controle de Aplicativo do Windows): PLAYWRIGHT_CHANNEL=msedge ou chrome usa o navegador instalado.
const canal = process.env.PLAYWRIGHT_CHANNEL || undefined;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: noCI,
  retries: noCI ? 1 : 0,
  reporter: noCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "retain-on-failure" },
  // Três larguras exigidas pela regra 8: 360, 768 e 1280 px, todas no Chromium.
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], channel: canal, viewport: { width: 360, height: 740 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], channel: canal, viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: canal, viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // No CI o build já foi feito antes; localmente usa o servidor de desenvolvimento.
    // `npx --no-install` usa o Next do projeto sem depender da versão global do pnpm.
    command: `npx --no-install next ${noCI ? "start" : "dev"} -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !noCI,
    timeout: 120_000,
    // Valores falsos: o e2e nunca usa segredos reais.
    env: {
      APP_URL: `http://localhost:${PORTA}`,
      JOBS_SECRET: "segredo.falso.so.para.o.e2e.0123456789.abcdef",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/tempestivo",
      LOG_LEVEL: "warn",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
