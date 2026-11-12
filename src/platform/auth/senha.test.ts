import { describe, expect, it } from "vitest";
import { conferirSenha, gerarHashDaSenha } from "./senha";

describe("senha", () => {
  it("gera um hash Argon2id que não contém a senha e muda a cada chamada", async () => {
    const senha = "senha-ficticia-de-teste";
    const [primeiro, segundo] = await Promise.all([gerarHashDaSenha(senha), gerarHashDaSenha(senha)]);

    expect(primeiro.startsWith("$argon2id$")).toBe(true);
    expect(primeiro).not.toContain(senha);
    expect(primeiro).not.toBe(segundo);
  });

  it("aceita a senha certa e recusa a errada", async () => {
    const guardado = await gerarHashDaSenha("senha-ficticia-de-teste");

    expect(await conferirSenha({ hash: guardado, password: "senha-ficticia-de-teste" })).toBe(true);
    expect(await conferirSenha({ hash: guardado, password: "outra-senha" })).toBe(false);
  });

  it("trata hash em formato desconhecido como senha errada", async () => {
    expect(await conferirSenha({ hash: "isto-nao-e-um-hash", password: "qualquer" })).toBe(false);
  });
});
