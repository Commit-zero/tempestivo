import { describe, expect, it } from "vitest";
import { lerConfig } from "@/platform/config";
import { criarFakeLogger } from "@/platform/logger";
import { criarFakeScheduler } from "./fake-scheduler";
import { criarSchedulerHttp } from "./scheduler-http";
import { criarScheduler } from "./index";

const segredo = "segredo-do-job-com-mais-de-32-caracteres-0123456789";

function montar() {
  const logger = criarFakeLogger();
  const scheduler = criarSchedulerHttp({ jobsSecret: segredo, logger });
  return { scheduler, logger };
}

const cabecalhos = (authorization?: string) =>
  new Headers(authorization === undefined ? {} : { authorization });

describe("Scheduler.autorizado", () => {
  it("aceita o segredo certo", () => {
    expect(montar().scheduler.autorizado(cabecalhos(`Bearer ${segredo}`))).toBe(true);
  });

  it.each([
    ["cabeçalho ausente", undefined],
    ["cabeçalho vazio", ""],
    ["sem o esquema Bearer", segredo],
    ["esquema errado", `Basic ${segredo}`],
    ["Bearer sem segredo", "Bearer"],
    ["Bearer com segredo vazio", "Bearer "],
    ["segredo errado do mesmo tamanho", `Bearer ${"x".repeat(segredo.length)}`],
    ["segredo mais curto", `Bearer ${segredo.slice(0, -1)}`],
    ["segredo mais longo", `Bearer ${segredo}x`],
    ["segredo com texto depois", `Bearer ${segredo} extra`],
  ])("recusa: %s", (_descricao, valor) => {
    expect(montar().scheduler.autorizado(cabecalhos(valor))).toBe(false);
  });

  it("não lança erro quando o tamanho do segredo enviado é diferente", () => {
    const { scheduler } = montar();

    expect(() => scheduler.autorizado(cabecalhos("Bearer a"))).not.toThrow();
    expect(() => scheduler.autorizado(cabecalhos(`Bearer ${"a".repeat(5000)}`))).not.toThrow();
  });

  it("falha fechado quando o segredo configurado está vazio", () => {
    const scheduler = criarSchedulerHttp({ jobsSecret: "", logger: criarFakeLogger() });

    expect(scheduler.autorizado(cabecalhos("Bearer "))).toBe(false);
    expect(scheduler.autorizado(cabecalhos("Bearer x"))).toBe(false);
    expect(scheduler.autorizado(cabecalhos())).toBe(false);
  });
});

describe("Scheduler.executar", () => {
  it("registra início e fim e devolve o resultado", async () => {
    const { scheduler, logger } = montar();

    const resultado = await scheduler.executar("ping", async () => 42);

    expect(resultado).toBe(42);
    expect(logger.registros.map((r) => [r.nivel, r.msg])).toEqual([
      ["info", "job iniciado"],
      ["info", "job concluído"],
    ]);
    expect(logger.registros.every((r) => r.contexto.job === "ping")).toBe(true);
    expect(typeof logger.registros[1].contexto.duracaoMs).toBe("number");
  });

  it("registra o erro e relança o mesmo erro", async () => {
    const { scheduler, logger } = montar();
    const falha = new Error("banco fora do ar");

    await expect(scheduler.executar("ping", async () => Promise.reject(falha))).rejects.toBe(falha);

    expect(logger.registros.map((r) => [r.nivel, r.msg])).toEqual([
      ["info", "job iniciado"],
      ["error", "job falhou"],
    ]);
    expect(logger.registros[1].contexto).toMatchObject({ job: "ping", mensagem: "banco fora do ar" });
  });

  it("não grava o segredo no log do erro", async () => {
    const { scheduler, logger } = montar();

    await expect(
      scheduler.executar("ping", async () => {
        throw new Error(`falha ao chamar com Bearer ${segredo}`);
      }),
    ).rejects.toThrow();

    expect(JSON.stringify(logger.registros)).not.toContain(segredo);
  });

  it("registra falha também quando o trabalho lança de forma síncrona ou não é um Error", async () => {
    const { scheduler, logger } = montar();

    await expect(
      scheduler.executar("ping", () => {
        throw "texto solto";
      }),
    ).rejects.toBe("texto solto");

    expect(logger.registros.at(-1)).toMatchObject({ nivel: "error", msg: "job falhou" });
  });
});

describe("criarFakeScheduler", () => {
  it("autoriza conforme programado e guarda os jobs executados", async () => {
    const fake = criarFakeScheduler({ autorizar: true });

    expect(fake.autorizado(new Headers())).toBe(true);
    await expect(fake.executar("ping", async () => "ok")).resolves.toBe("ok");
    expect(fake.executados).toEqual(["ping"]);
  });

  it("recusa por padrão", () => {
    expect(criarFakeScheduler().autorizado(new Headers())).toBe(false);
  });
});

describe("criarScheduler", () => {
  it("usa o JOBS_SECRET da configuração", () => {
    const config = lerConfig({ NODE_ENV: "test", APP_URL: "http://localhost:3000", JOBS_SECRET: segredo });
    const scheduler = criarScheduler(config, criarFakeLogger());

    expect(scheduler.autorizado(cabecalhos(`Bearer ${segredo}`))).toBe(true);
    expect(scheduler.autorizado(cabecalhos("Bearer outro"))).toBe(false);
  });
});
