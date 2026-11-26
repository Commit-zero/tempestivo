import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/platform/database";
import type { FakeMailer } from "@/platform/mailer";
import { getMailer } from "@/platform/runtime";
import { novoNavegador, usarNavegador } from "@/test/next-headers";
import { codigoTotp } from "@/test/totp";
import { cadastrar, entrar } from "./acoes";
import { confirmarAtivacao, desativarSegundoFator, gerarNovosCodigos, iniciarAtivacao, segundoFatorLigado } from "./ativacao";
import { confirmarCodigoDeEntrada, confirmarCodigoDeRecuperacao } from "./segundo-fator";
import { obterSessao } from "./sessao";

vi.mock("next/headers", () => import("@/test/next-headers"));

const SENHA = "senha-ficticia-da-ativacao";
const emails: string[] = [];
const enviados = () => (getMailer() as FakeMailer).enviados;
let ip = 1;
const outroNavegador = () => novoNavegador(`198.19.0.${ip++}`);

afterAll(async () => {
  await getPrisma().user.deleteMany({ where: { email: { in: emails } } });
});

async function titularLogado({ emailConfirmado = true } = {}) {
  const email = `teste.${randomUUID().slice(0, 8)}@exemplo.test`;
  emails.push(email);
  const aqui = outroNavegador();
  await cadastrar({ nome: "Advogada Fictícia", email, senha: SENHA, confirmacao: SENHA });
  if (emailConfirmado) await getPrisma().user.update({ where: { email }, data: { emailVerified: true } });
  const sessao = await obterSessao();
  if (!sessao) throw new Error("O cadastro não abriu a sessão.");
  return { email, aqui, titular: { usuarioId: sessao.usuarioId, nome: sessao.nome, email } };
}

async function iniciar(titular: Parameters<typeof iniciarAtivacao>[0]) {
  const inicio = await iniciarAtivacao(titular, SENHA);
  if (!inicio.ok) throw new Error(inicio.erro);
  return inicio;
}

const errado = (chave: string) => {
  const validos = new Set([-1, 0, 1, 2].map((passo) => codigoTotp(chave, passo)));
  return ["000000", "111111", "222222", "333333", "444444"].find((codigo) => !validos.has(codigo))!;
};
const avisos = (email: string) => enviados().filter((e) => e.para === email && e.assunto.includes("ligada"));
const gravados = (usuarioId: string) => getPrisma().twoFactor.count({ where: { userId: usuarioId } });

describe("ativação do segundo fator (integração)", () => {
  it("exige o e-mail confirmado, mesmo com a senha certa", async () => {
    const { titular } = await titularLogado({ emailConfirmado: false });

    expect(await iniciarAtivacao(titular, SENHA)).toEqual({
      ok: false, erro: "Confirme o seu e-mail antes de ligar a verificação em duas etapas.",
    });
    expect(await gravados(titular.usuarioId)).toBe(0);
  });

  it("exige a senha atual", async () => {
    const { titular } = await titularLogado();

    expect(await iniciarAtivacao(titular, "senha-errada-de-teste")).toEqual({ ok: false, erro: "Senha incorreta." });
    expect(await iniciarAtivacao(titular, null)).toEqual({ ok: false, erro: "Informe a sua senha." });
    expect(await gravados(titular.usuarioId)).toBe(0);
  });

  it("começar mostra o QR code e a chave, e ainda não liga nada", async () => {
    const { email, titular } = await titularLogado();

    const inicio = await iniciar(titular);

    expect(inicio.qrCode).toMatch(/^data:image\/svg\+xml;/);
    expect(inicio.chave).toMatch(/^[A-Z2-7]{32,}$/);
    // Não devolve códigos de recuperação antes de provar que o aplicativo funciona.
    expect(Object.keys(inicio).sort()).toEqual(["chave", "ok", "qrCode"]);
    expect(await segundoFatorLigado(titular.usuarioId)).toBe(false);
    outroNavegador();
    expect(await entrar({ email, senha: SENHA })).toEqual({ ok: true });
  });

  it("recomeçar troca a chave, e só a nova vale", async () => {
    const { titular } = await titularLogado();
    const primeiro = await iniciar(titular);
    const segundo = await iniciar(titular);

    expect(segundo.chave).not.toBe(primeiro.chave);
    expect(await confirmarAtivacao(titular, codigoTotp(primeiro.chave))).toEqual({ ok: false, erro: "Código incorreto." });
    expect(await confirmarAtivacao(titular, codigoTotp(segundo.chave))).toMatchObject({ ok: true });
    expect(await gravados(titular.usuarioId)).toBe(1);
  });

  it("código errado não liga", async () => {
    const { email, titular } = await titularLogado();
    const { chave } = await iniciar(titular);

    expect(await confirmarAtivacao(titular, errado(chave))).toEqual({ ok: false, erro: "Código incorreto." });
    expect(await confirmarAtivacao(titular, "abc")).toEqual({ ok: false, erro: "Digite os 6 números do aplicativo." });
    expect(await segundoFatorLigado(titular.usuarioId)).toBe(false);
    expect(avisos(email)).toHaveLength(0);
  });

  it("confirmar sem ter começado não liga", async () => {
    const { titular } = await titularLogado();

    expect(await confirmarAtivacao(titular, "123456")).toEqual({ ok: false, erro: "Comece de novo: digite a sua senha." });
  });

  it("código certo liga, entrega 10 códigos, mantém só esta sessão e avisa", async () => {
    const { email, aqui, titular } = await titularLogado();
    const outroAparelho = outroNavegador();
    await entrar({ email, senha: SENHA });
    usarNavegador(aqui);
    const { chave } = await iniciar(titular);
    const codigo = codigoTotp(chave);

    const resultado = await confirmarAtivacao(titular, codigo);

    if (!resultado.ok) throw new Error(resultado.erro);
    expect(resultado.codigos).toHaveLength(10);
    expect(new Set(resultado.codigos).size).toBe(10);
    expect(await segundoFatorLigado(titular.usuarioId)).toBe(true);
    expect(await obterSessao()).toMatchObject({ email });
    expect(await getPrisma().session.count({ where: { userId: titular.usuarioId } })).toBe(1);
    usarNavegador(outroAparelho);
    expect(await obterSessao()).toBeNull();
    expect(avisos(email)).toHaveLength(1);
    // O banco não guarda a chave nem os códigos em texto puro.
    const linha = await getPrisma().twoFactor.findFirstOrThrow({ where: { userId: titular.usuarioId } });
    expect(JSON.stringify(linha)).not.toContain(resultado.codigos[0]);

    // O código usado para ligar não serve para entrar; um código de recuperação serve.
    outroNavegador();
    expect(await entrar({ email, senha: SENHA })).toEqual({ ok: true, segundoFator: true });
    expect(await confirmarCodigoDeEntrada(codigo)).toMatchObject({ ok: false, recomecar: "repetido" });
    outroNavegador();
    await entrar({ email, senha: SENHA });
    expect(await confirmarCodigoDeRecuperacao(resultado.codigos[0])).toEqual({ ok: true });
  });

  it("já ligada, não recomeça nem mostra os códigos de novo", async () => {
    const { titular } = await titularLogado();
    const { chave } = await iniciar(titular);
    await confirmarAtivacao(titular, codigoTotp(chave));
    const jaLigada = { ok: false, erro: "A verificação em duas etapas já está ligada." };

    expect(await iniciarAtivacao(titular, SENHA)).toEqual(jaLigada);
    expect(await confirmarAtivacao(titular, codigoTotp(chave, 1))).toEqual(jaLigada);
  });

  it("limita as tentativas de senha e de código", async () => {
    const { titular } = await titularLogado();
    const muitas = { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    const { chave } = await iniciar(titular);
    const codigos = [];
    for (let vez = 0; vez < 11; vez += 1) codigos.push(await confirmarAtivacao(titular, errado(chave)));
    const senhas = [];
    for (let vez = 0; vez < 5; vez += 1) senhas.push(await iniciarAtivacao(titular, "senha-errada-de-teste"));

    expect(codigos.at(-1)).toEqual(muitas);
    expect(senhas.at(-1)).toEqual(muitas);
  });
});

describe("gerenciar o segundo fator (integração)", () => {
  async function comProtecaoLigada() {
    const dados = await titularLogado();
    const { chave } = await iniciar(dados.titular);
    const ligada = await confirmarAtivacao(dados.titular, codigoTotp(chave));
    if (!ligada.ok) throw new Error(ligada.erro);
    return { ...dados, chave, codigos: ligada.codigos };
  }
  const entrarNovo = async (email: string) => {
    outroNavegador();
    return entrar({ email, senha: SENHA });
  };

  it.each([
    ["gerar códigos novos", gerarNovosCodigos],
    ["desativar", desativarSegundoFator],
  ])("%s exige a senha atual", async (_caso, acao) => {
    const { titular } = await comProtecaoLigada();

    expect(await acao(titular, "senha-errada-de-teste")).toEqual({ ok: false, erro: "Senha incorreta." });
    expect(await acao(titular, "")).toEqual({ ok: false, erro: "Informe a sua senha." });
    expect(await segundoFatorLigado(titular.usuarioId)).toBe(true);
  });

  it("códigos novos invalidam os antigos e avisam", async () => {
    const { email, titular, codigos } = await comProtecaoLigada();

    const resultado = await gerarNovosCodigos(titular, SENHA);

    if (!resultado.ok) throw new Error(resultado.erro);
    expect(resultado.codigos).toHaveLength(10);
    expect(resultado.codigos).not.toContain(codigos[0]);
    expect(enviados().filter((e) => e.para === email && e.assunto.startsWith("Novos códigos"))).toHaveLength(1);
    await entrarNovo(email);
    expect(await confirmarCodigoDeRecuperacao(codigos[0])).toMatchObject({ ok: false });
    expect(await confirmarCodigoDeRecuperacao(resultado.codigos[0])).toEqual({ ok: true });
  });

  it("desativar apaga o segredo, mantém a sessão, avisa e o login volta a pedir só a senha", async () => {
    const { email, titular } = await comProtecaoLigada();

    expect(await desativarSegundoFator(titular, SENHA)).toEqual({ ok: true });

    expect(await segundoFatorLigado(titular.usuarioId)).toBe(false);
    expect(await gravados(titular.usuarioId)).toBe(0);
    expect(await obterSessao()).toMatchObject({ email });
    expect(enviados().filter((e) => e.para === email && e.assunto.includes("desligada"))).toHaveLength(1);
    expect(await entrarNovo(email)).toEqual({ ok: true });
  });

  it("desligada, não há o que gerar nem desativar", async () => {
    const { titular } = await titularLogado();
    const desligada = { ok: false, erro: "A verificação em duas etapas não está ligada." };

    expect(await gerarNovosCodigos(titular, SENHA)).toEqual(desligada);
    expect(await desativarSegundoFator(titular, SENHA)).toEqual(desligada);
  });

  it("limita as tentativas de senha", async () => {
    const { titular } = await comProtecaoLigada();
    const resultados = [];
    for (let vez = 0; vez < 6; vez += 1) resultados.push(await desativarSegundoFator(titular, "senha-errada-de-teste"));

    expect(resultados.at(-1)).toEqual({ ok: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
    expect(await segundoFatorLigado(titular.usuarioId)).toBe(true);
  });
});
