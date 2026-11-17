import { describe, expect, it } from "vitest";
import { criarFakeLogger } from "./fake-logger";
import { criarJsonLogger } from "./json-logger";
import { criarLogger } from "./index";
import type { Contexto } from "./logger";

const instante = new Date("2026-10-28T15:30:00.000Z");

function montar(nivel: Parameters<typeof criarJsonLogger>[0]["nivel"] = "debug") {
  const linhas: string[] = [];
  const logger = criarJsonLogger({ nivel, escrever: (linha) => linhas.push(linha), agora: () => instante });
  return { logger, linhas };
}

const comoContexto = (valor: unknown) => valor as Contexto;

describe("criarJsonLogger", () => {
  it("escreve uma linha de JSON válido por chamada, com nivel, msg e em", () => {
    const { logger, linhas } = montar();

    logger.info("job iniciado", { job: "ping", tentativa: 1 });
    logger.warn("lento");

    expect(linhas).toHaveLength(2);
    expect(linhas.every((linha) => !linha.includes("\n"))).toBe(true);
    expect(JSON.parse(linhas[0])).toEqual({
      nivel: "info",
      msg: "job iniciado",
      em: "2026-10-28T15:30:00.000Z",
      job: "ping",
      tentativa: 1,
    });
    expect(JSON.parse(linhas[1]).nivel).toBe("warn");
  });

  it("mantém numa só linha mensagens com quebra de linha", () => {
    const { logger, linhas } = montar();

    logger.info("primeira\nsegunda");

    expect(linhas).toHaveLength(1);
    expect(JSON.parse(linhas[0]).msg).toBe("primeira\nsegunda");
  });

  it("não deixa o contexto sobrescrever nivel, msg e em", () => {
    const { logger, linhas } = montar();

    logger.error("real", { nivel: "debug", msg: "falso", em: "ontem" });

    expect(JSON.parse(linhas[0])).toMatchObject({ nivel: "error", msg: "real", em: "2026-10-28T15:30:00.000Z" });
  });

  describe("nível mínimo", () => {
    it("descarta o que está abaixo de LOG_LEVEL", () => {
      const { logger, linhas } = montar("warn");

      logger.debug("a");
      logger.info("b");
      logger.warn("c");
      logger.error("d");

      expect(linhas.map((linha) => JSON.parse(linha).msg)).toEqual(["c", "d"]);
    });

    it("com debug deixa tudo passar", () => {
      const { logger, linhas } = montar("debug");

      logger.debug("a");

      expect(linhas).toHaveLength(1);
    });
  });

  describe("filho", () => {
    it("mistura o contexto do filho com o da chamada", () => {
      const { logger, linhas } = montar();

      logger.filho({ job: "ping" }).filho({ requisicao: "r1" }).info("ok", { passo: 2 });

      expect(JSON.parse(linhas[0])).toMatchObject({ job: "ping", requisicao: "r1", passo: 2 });
    });

    it("não altera o logger pai", () => {
      const { logger, linhas } = montar();

      logger.filho({ job: "ping" });
      logger.info("pai");

      expect(JSON.parse(linhas[0])).not.toHaveProperty("job");
    });

    it("herda o nível mínimo", () => {
      const { logger, linhas } = montar("error");

      logger.filho({ a: 1 }).info("ignorada");

      expect(linhas).toHaveLength(0);
    });
  });

  describe("redação de segredos", () => {
    const camposSensiveis = [
      "senha",
      "password",
      "token",
      "secret",
      "authorization",
      "cookie",
      "database_url",
      "JOBS_SECRET",
      "DATABASE_URL",
      "accessToken",
      "Authorization",
      "set-cookie",
      "novaSenha",
      // Dados pessoais de clientes (LGPD): nunca vão para o log.
      "cpf",
      "cnpj",
      "telefone",
      "celular",
      "email",
      "emailDoCliente",
      "texto",
      "conteudo",
      "intimacao",
      "api_key",
      "apiKey",
    ];

    it.each(camposSensiveis)("oculta o campo %s", (campo) => {
      const { logger, linhas } = montar();

      logger.info("x", { [campo]: "valor-super-secreto" });

      expect(linhas[0]).not.toContain("valor-super-secreto");
      expect(JSON.parse(linhas[0])[campo]).toBe("[oculto]");
    });

    it("não oculta campos comuns", () => {
      const { logger, linhas } = montar();

      logger.info("x", { job: "ping", total: 3 });

      expect(JSON.parse(linhas[0])).toMatchObject({ job: "ping", total: 3 });
    });

    it("oculta campos sensíveis aninhados em um nível", () => {
      const { logger, linhas } = montar();

      logger.info("x", comoContexto({ requisicao: { metodo: "POST", authorization: "Bearer abc123", token: "t0k3n" } }));

      expect(linhas[0]).not.toContain("abc123");
      expect(linhas[0]).not.toContain("t0k3n");
      expect(JSON.parse(linhas[0]).requisicao).toEqual({
        metodo: "POST",
        authorization: "[oculto]",
        token: "[oculto]",
      });
    });

    it("oculta o campo sensível vindo do contexto do filho", () => {
      const { logger, linhas } = montar();

      logger.filho({ senha: "valor-super-secreto" }).info("x");

      expect(linhas[0]).not.toContain("valor-super-secreto");
    });

    it("não imprime objetos mais fundos que um nível, porque não dá para vigiá-los", () => {
      const { logger, linhas } = montar();

      logger.info("x", comoContexto({ a: { b: { senha: "valor-super-secreto" } } }));

      expect(linhas[0]).not.toContain("valor-super-secreto");
    });

    it("não lança erro com contexto circular", () => {
      const { logger, linhas } = montar();
      const circular: Record<string, unknown> = {};
      circular.a = circular;

      expect(() => logger.info("x", comoContexto(circular))).not.toThrow();
      expect(linhas).toHaveLength(1);
      expect(() => JSON.parse(linhas[0])).not.toThrow();
    });
  });
});

describe("criarFakeLogger", () => {
  it("guarda o que recebeu", () => {
    const logger = criarFakeLogger();

    logger.info("a", { x: 1 });
    logger.error("b");

    expect(logger.registros).toEqual([
      { nivel: "info", msg: "a", contexto: { x: 1 } },
      { nivel: "error", msg: "b", contexto: {} },
    ]);
  });

  it("o filho grava no mesmo registro, com o contexto misturado", () => {
    const logger = criarFakeLogger();

    logger.filho({ job: "ping" }).warn("c", { y: 2 });

    expect(logger.registros).toEqual([{ nivel: "warn", msg: "c", contexto: { job: "ping", y: 2 } }]);
  });
});

describe("criarLogger", () => {
  const config = { LOG_LEVEL: "warn" } as const;

  it("respeita o LOG_LEVEL da configuração", () => {
    const linhas: string[] = [];
    const logger = criarLogger(config, { escrever: (linha) => linhas.push(linha) });

    logger.info("ignorada");
    logger.warn("passa");

    expect(linhas.map((linha) => JSON.parse(linha).msg)).toEqual(["passa"]);
  });
});
