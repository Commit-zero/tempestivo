import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { headers } from "next/headers";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/platform/database";
import type { FakeMailer } from "@/platform/mailer";
import { getMailer } from "@/platform/runtime";
import { novoNavegador } from "@/test/next-headers";
import { codigoTotp } from "@/test/totp";
import { cadastrar, entrar, pedirRedefinicaoDeSenha, redefinirSenha } from "./acoes";
import { confirmarAtivacao, iniciarAtivacao } from "./ativacao";
import { obterSessao } from "./sessao";

vi.mock("next/headers", () => import("@/test/next-headers"));

// Ensaia o SQL escrito em docs/operacao/runbooks/perda-do-segundo-fator.md para quem perdeu o celular e os códigos:
// se o esquema mudar e o procedimento deixar de funcionar, este teste quebra.
const SENHA = "senha-ficticia-da-perda";
const email = `teste.${randomUUID().slice(0, 8)}@exemplo.test`;
afterAll(async () => {
  await getPrisma().user.deleteMany({ where: { email } });
});

function comandosDoProcedimento(): string[] {
  const documento = readFileSync("docs/operacao/runbooks/perda-do-segundo-fator.md", "utf8").replace(/\r\n/g, "\n");
  const bloco = /### Perda do celular e dos códigos[\s\S]*?```sql\n([\s\S]*?)```/.exec(documento)?.[1];
  if (!bloco) throw new Error("docs/operacao/runbooks/perda-do-segundo-fator.md não traz o SQL do procedimento.");
  return bloco
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((comando) => comando.trim())
    .filter((comando) => comando && !/^(begin|commit)$/i.test(comando));
}

describe("procedimento de perda de acesso (docs/operacao/runbooks/perda-do-segundo-fator.md)", () => {
  it("desliga o segundo fator, encerra as sessões e obriga a criar uma senha nova", async () => {
    const aqui = novoNavegador("192.0.2.10");
    await cadastrar({ nome: "Advogada Fictícia", email, senha: SENHA, confirmacao: SENHA });
    await getPrisma().user.update({ where: { email }, data: { emailVerified: true } });
    const sessao = (await obterSessao())!;
    const titular = { usuarioId: sessao.usuarioId, nome: sessao.nome, email };
    const inicio = await iniciarAtivacao(titular, SENHA);
    if (!inicio.ok) throw new Error(inicio.erro);
    expect(await confirmarAtivacao(titular, codigoTotp(inicio.chave))).toMatchObject({ ok: true });
    expect((await headers()).get("cookie")).toContain("session_token");
    expect(aqui.cookies.size).toBeGreaterThan(0);

    const comandos = comandosDoProcedimento();
    await getPrisma().$transaction(
      comandos.map((comando) => getPrisma().$executeRawUnsafe(comando.replaceAll("EMAIL_DO_TITULAR", email))),
    );

    expect(await obterSessao()).toBeNull();
    expect(await getPrisma().twoFactor.count({ where: { userId: titular.usuarioId } })).toBe(0);
    novoNavegador("192.0.2.11");
    expect(await entrar({ email, senha: SENHA })).toEqual({ ok: false, erro: "E-mail ou senha incorretos." });

    await pedirRedefinicaoDeSenha({ email });
    const texto = (getMailer() as FakeMailer).enviados.findLast((e) => e.para === email && e.assunto.startsWith("Redefinir"))!.texto;
    const token = /reset-password\/([A-Za-z0-9_-]+)/.exec(texto)![1]!;
    const nova = "outra-frase-bem-comprida";
    expect(await redefinirSenha({ token, senha: nova, confirmacao: nova })).toEqual({ ok: true });
    novoNavegador("192.0.2.12");
    expect(await entrar({ email, senha: nova })).toEqual({ ok: true });
  });
});
