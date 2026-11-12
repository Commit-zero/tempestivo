import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const segredo = "s".repeat(32);

describe("getConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("JOBS_SECRET", segredo);
    vi.stubEnv("AUTH_SECRET", segredo);
    vi.stubEnv("DATABASE_URL", "postgresql://usuario:senha-de-teste@localhost:5432/banco");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lê process.env e guarda o resultado", async () => {
    const { getConfig } = await import("./index");
    const primeira = getConfig();

    vi.stubEnv("APP_URL", "http://outro.local");

    expect(getConfig()).toBe(primeira);
    expect(getConfig().APP_URL).toBe("http://localhost:3000");
  });

  it("lança com o nome da variável quando falta configuração", async () => {
    vi.stubEnv("JOBS_SECRET", "");
    const { getConfig } = await import("./index");

    expect(() => getConfig()).toThrow(/JOBS_SECRET/);
  });
});
