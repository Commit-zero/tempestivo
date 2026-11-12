import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lerConfig, schemaEnv } from "./env";

const segredo = "s".repeat(32);

const ambienteValido = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  JOBS_SECRET: segredo,
  DATABASE_URL: "postgresql://usuario:senha-de-teste@localhost:5432/banco",
};

function mensagemDoErro(env: Record<string, string | undefined>): string {
  try {
    lerConfig(env);
  } catch (erro) {
    return (erro as Error).message;
  }
  throw new Error("lerConfig não lançou erro");
}

describe("lerConfig", () => {
  it("aceita um ambiente válido", () => {
    const config = lerConfig(ambienteValido);

    expect(config.APP_URL).toBe("http://localhost:3000");
    expect(config.JOBS_SECRET).toBe(segredo);
    expect(config.LOG_LEVEL).toBe("info");
  });

  it("rejeita JOBS_SECRET com 31 caracteres sem revelar o valor", () => {
    const curto = "x9".repeat(15) + "k";
    expect(curto).toHaveLength(31);

    const mensagem = mensagemDoErro({ ...ambienteValido, JOBS_SECRET: curto });

    expect(mensagem).toContain("JOBS_SECRET");
    expect(mensagem).not.toContain(curto);
  });

  it("aceita JOBS_SECRET com exatamente 32 caracteres", () => {
    expect(() => lerConfig({ ...ambienteValido, JOBS_SECRET: "a".repeat(32) })).not.toThrow();
  });

  it("lista todas as variáveis com erro, não só a primeira", () => {
    const mensagem = mensagemDoErro({});

    expect(mensagem).toContain("NODE_ENV");
    expect(mensagem).toContain("APP_URL");
    expect(mensagem).toContain("JOBS_SECRET");
  });

  it("escreve a mensagem em português", () => {
    expect(mensagemDoErro({})).toContain("Configuração inválida");
  });

  it("não revela o valor de nenhuma variável inválida", () => {
    const urlInvalida = "isto-nao-e-uma-url-secreta";
    const mensagem = mensagemDoErro({ ...ambienteValido, APP_URL: urlInvalida });

    expect(mensagem).toContain("APP_URL");
    expect(mensagem).not.toContain(urlInvalida);
  });

  it("trata variável vazia como ausente", () => {
    const mensagem = mensagemDoErro({ ...ambienteValido, JOBS_SECRET: "" });

    expect(mensagem).toContain("JOBS_SECRET");
  });

  it("assume o driver fake quando a variável está ausente", () => {
    const config = lerConfig(ambienteValido);

    expect(config.STORAGE_DRIVER).toBe("fake");
    expect(config.MAILER_DRIVER).toBe("fake");
    expect(config.NOTIFIER_DRIVER).toBe("fake");
    expect(config.AI_DRIVER).toBe("fake");
  });

  it("rejeita driver desconhecido sem revelar o valor", () => {
    const mensagem = mensagemDoErro({ ...ambienteValido, MAILER_DRIVER: "smtp-desconhecido" });

    expect(mensagem).toContain("MAILER_DRIVER");
    expect(mensagem).not.toContain("smtp-desconhecido");
  });

  it("rejeita LOG_LEVEL desconhecido", () => {
    expect(mensagemDoErro({ ...ambienteValido, LOG_LEVEL: "verboso" })).toContain("LOG_LEVEL");
  });

  it("exige DATABASE_URL de PostgreSQL sem revelar a string de conexão", () => {
    const outroBanco = "mysql://usuario:senha-secreta@localhost/banco";

    const mensagem = mensagemDoErro({ ...ambienteValido, DATABASE_URL: outroBanco });

    expect(mensagem).toContain("DATABASE_URL");
    expect(mensagem).not.toContain("senha-secreta");
    expect(mensagemDoErro({ ...ambienteValido, DATABASE_URL: undefined })).toContain("DATABASE_URL");
  });

  it("devolve uma configuração imutável", () => {
    const config = lerConfig(ambienteValido);

    expect(Object.isFrozen(config)).toBe(true);
  });
});

describe(".env.example", () => {
  const conteudo = readFileSync(resolve(process.cwd(), ".env.example"), "utf-8");
  const linhas = conteudo.split("\n");
  const chaves = linhas
    .filter((linha) => /^[A-Z_]+=/.test(linha))
    .map((linha) => linha.split("=")[0]);

  it("tem as mesmas chaves do schema", () => {
    expect([...chaves].sort()).toEqual(Object.keys(schemaEnv.shape).sort());
  });

  it("tem uma linha de comentário antes de cada variável", () => {
    linhas.forEach((linha, i) => {
      if (/^[A-Z_]+=/.test(linha)) {
        expect(linhas[i - 1]?.startsWith("# "), `sem comentário antes de ${linha.split("=")[0]}`).toBe(true);
      }
    });
  });

  const valores = Object.fromEntries(
    linhas
      .filter((linha) => /^[A-Z_]+=/.test(linha))
      .map((linha) => [linha.split("=")[0], linha.slice(linha.indexOf("=") + 1)]),
  );

  it("deixa o JOBS_SECRET vazio, para ninguém subir com um segredo público", () => {
    expect(valores.JOBS_SECRET).toBe("");
    expect(() => lerConfig(valores)).toThrow(/JOBS_SECRET/);
  });

  it("passa na validação do schema quando o segredo é preenchido", () => {
    expect(() => lerConfig({ ...valores, JOBS_SECRET: segredo })).not.toThrow();
  });
});
