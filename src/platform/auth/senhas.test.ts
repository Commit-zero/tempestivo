import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/platform/database";
import type { FakeMailer } from "@/platform/mailer";
import { getMailer } from "@/platform/runtime";
import { novoNavegador } from "@/test/next-headers";
import { cadastrar, entrar, pedirRedefinicaoDeSenha, redefinirSenha } from "./acoes";
import { obterSessao } from "./sessao";

vi.mock("next/headers", () => import("@/test/next-headers"));

// Cadastro e redefinição de ponta a ponta no servidor, com Better Auth e Postgres de verdade.
const SENHA = "senha-ficticia-do-cadastro";
const emails: string[] = [];
const enviados = () => (getMailer() as FakeMailer).enviados;

function novoEmail(nome = `teste.${randomUUID().slice(0, 8)}`) {
  const email = `${nome}@exemplo.test`;
  emails.push(email);
  return email;
}

const cadastro = (email: string, senha = SENHA, confirmacao: unknown = senha) =>
  cadastrar({ nome: "Advogada Fictícia", email, senha, confirmacao });

let ip = 1;
beforeEach(() => {
  // Um IP por teste, para um teste não gastar o limite de tentativas do outro.
  novoNavegador(`203.0.113.${ip++}`);
});
afterAll(async () => {
  await getPrisma().user.deleteMany({ where: { email: { in: emails } } });
});

describe("cadastro (integração)", () => {
  it("cria a conta, abre a sessão e registra o aceite dos termos", async () => {
    const email = novoEmail();

    expect(await cadastro(email)).toEqual({ ok: true });
    expect(await obterSessao()).toMatchObject({ email });
    const conta = await getPrisma().conta.findFirst({ where: { usuario: { email } } });
    expect(conta?.termosAceitosEm).toBeInstanceOf(Date);
  });

  it.each([
    ["confirmação diferente", SENHA, "outra-senha-ficticia", "As senhas não conferem."],
    ["sem confirmação", SENHA, null, "Confirme a senha."],
    ["senha curta", "curta", "curta", "A senha precisa ter de 10 a 128 caracteres."],
    ["senha comum", "1234567890", "1234567890", "Essa senha é muito comum. Escolha outra."],
    ["trecho repetido", "abcabcabcabc", "abcabcabcabc", "A senha não pode ser um caractere ou um trecho curto repetido."],
  ])("recusa no servidor: %s", async (_caso, senha, confirmacao, erro) => {
    const email = novoEmail();

    expect(await cadastro(email, senha, confirmacao)).toEqual({ ok: false, erro });
    expect(await getPrisma().user.count({ where: { email } })).toBe(0);
  });

  it("recusa a senha com o nome do e-mail", async () => {
    const email = novoEmail(`mariana.${randomUUID().slice(0, 8)}`);
    const senha = `${email.split("@")[0]}-segredo`;

    expect(await cadastro(email, senha)).toEqual({ ok: false, erro: "A senha não pode conter o nome do seu e-mail." });
  });
});

describe("redefinição de senha (integração)", () => {
  async function pedirLink(email: string): Promise<string> {
    await pedirRedefinicaoDeSenha({ email });
    const mensagem = enviados().findLast((e) => e.para === email && e.assunto.startsWith("Redefinir"));
    const token = /reset-password\/([A-Za-z0-9_-]+)/.exec(mensagem?.texto ?? "")?.[1];
    if (!token) throw new Error("O e-mail de redefinição não trouxe o link.");
    return token;
  }

  it("aplica as regras, inclusive a do e-mail do dono do link, sem gastar o link", async () => {
    const email = novoEmail(`roberta.${randomUUID().slice(0, 8)}`);
    await cadastro(email);
    const token = await pedirLink(email);
    const comNome = `${email.split("@")[0]}-segredo`;
    const nova = "outra-frase-bem-comprida";

    expect(await redefinirSenha({ token, senha: nova, confirmacao: "diferente-da-nova" })).toEqual({
      ok: false, erro: "As senhas não conferem.",
    });
    expect(await redefinirSenha({ token, senha: "1234567890", confirmacao: "1234567890" })).toEqual({
      ok: false, erro: "Essa senha é muito comum. Escolha outra.",
    });
    expect(await redefinirSenha({ token, senha: comNome, confirmacao: comNome })).toEqual({
      ok: false, erro: "A senha não pode conter o nome do seu e-mail.",
    });
    const redefinidas = () => enviados().filter((e) => e.para === email && e.assunto.includes("foi redefinida"));
    expect(redefinidas()).toHaveLength(0);
    expect(await redefinirSenha({ token, senha: nova, confirmacao: nova })).toEqual({ ok: true });
    expect(redefinidas()).toHaveLength(1);

    novoNavegador("203.0.113.200");
    expect(await entrar({ email, senha: SENHA })).toMatchObject({ ok: false });
    expect(await entrar({ email, senha: nova })).toEqual({ ok: true });
  });

  it("link inexistente é recusado", async () => {
    const nova = "outra-frase-bem-comprida";

    expect(await redefinirSenha({ token: "token-que-nao-existe", senha: nova, confirmacao: nova })).toEqual({
      ok: false, erro: "O link de redefinição é inválido ou expirou. Peça um novo.",
    });
  });
});
