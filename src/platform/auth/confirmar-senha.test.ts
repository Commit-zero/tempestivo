import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "@/platform/database";
import { confirmarSenhaAtual } from "./acoes";
import { gerarHashDaSenha } from "./senha";

// Confirmação da senha antes de excluir a conta, com um hash Argon2id real gravado
// como o Better Auth grava (conta "credential").
describe("confirmação da senha atual (integração)", () => {
  const usuarioId = randomUUID();
  const SENHA = "senha-ficticia-de-confirmacao";

  beforeAll(async () => {
    await getPrisma().user.create({
      data: {
        id: usuarioId, name: "Titular Fictícia", email: `${usuarioId}@exemplo.test`,
        accounts: { create: { id: randomUUID(), accountId: usuarioId, providerId: "credential", password: await gerarHashDaSenha(SENHA) } },
      },
    });
  });
  afterAll(async () => {
    await getPrisma().user.deleteMany({ where: { id: usuarioId } });
  });

  it("aceita a senha certa e recusa a errada", async () => {
    expect(await confirmarSenhaAtual(usuarioId, SENHA)).toEqual({ ok: true });
    expect(await confirmarSenhaAtual(usuarioId, "outra-senha-qualquer")).toEqual({ ok: false, erro: "Senha incorreta." });
  });

  it("recusa entrada que não é texto ou é longa demais, sem consultar o banco", async () => {
    expect(await confirmarSenhaAtual(usuarioId, undefined)).toEqual({ ok: false, erro: "Informe a sua senha." });
    expect(await confirmarSenhaAtual(usuarioId, "x".repeat(129))).toEqual({ ok: false, erro: "Informe a sua senha." });
  });

  it("usuário sem senha cadastrada não confirma", async () => {
    expect(await confirmarSenhaAtual(randomUUID(), SENHA)).toEqual({ ok: false, erro: "Senha incorreta." });
  });

  it("bloqueia depois de 5 tentativas erradas", async () => {
    const outro = randomUUID();
    const resultados = [];
    for (let tentativa = 0; tentativa < 6; tentativa += 1) resultados.push(await confirmarSenhaAtual(outro, "errada"));

    expect(resultados.at(-1)).toEqual({ ok: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
  });
});
