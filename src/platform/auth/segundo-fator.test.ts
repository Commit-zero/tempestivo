import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { afterAll, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/auth/[...all]/route";
import { getPrisma } from "@/platform/database";
import type { FakeMailer } from "@/platform/mailer";
import { getMailer } from "@/platform/runtime";
import { cookies as pote, novoNavegador, usarNavegador } from "@/test/next-headers";
import { codigoTotp } from "@/test/totp";
import { cadastrar, entrar, pedirRedefinicaoDeSenha, redefinirSenha, trocarSenha } from "./acoes";
import { confirmarAtivacao, iniciarAtivacao } from "./ativacao";
import { getAuth } from "./auth";
import {
  confirmarCodigoDeEntrada, confirmarCodigoDeRecuperacao, haPassoPendente, registrarCodigoUsado,
} from "./segundo-fator";
import { obterSessao } from "./sessao";

vi.mock("next/headers", () => import("@/test/next-headers"));

// Login com segundo fator, com o Better Auth e o Postgres de verdade.
const SENHA = "senha-ficticia-do-segundo-fator";
const emails: string[] = [];
const enviados = () => (getMailer() as FakeMailer).enviados;
let ip = 1;
const outroNavegador = () => novoNavegador(`198.18.0.${ip++}`);

afterAll(async () => {
  await getPrisma().user.deleteMany({ where: { email: { in: emails } } });
});

/** Cria uma pessoa com a verificação ligada direto pela biblioteca. */
async function comSegundoFator() {
  const email = `teste.${randomUUID().slice(0, 8)}@exemplo.test`;
  emails.push(email);
  outroNavegador();
  await cadastrar({ nome: "Advogada Fictícia", email, senha: SENHA, confirmacao: SENHA });
  const ativacao = await getAuth().api.enableTwoFactor({ body: { password: SENHA }, headers: await headers() });
  if (!("totpURI" in ativacao)) throw new Error("A ativação não devolveu a chave.");
  const chave = new URL(ativacao.totpURI).searchParams.get("secret")!;
  // O código anterior, para o login do teste poder usar o atual.
  await getAuth().api.verifyTOTP({ body: { code: codigoTotp(chave, -1) }, headers: await headers() });
  const usuario = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  await getPrisma().session.deleteMany({ where: { userId: usuario.id } });
  outroNavegador();
  return { email, usuarioId: usuario.id, chave, codigos: ativacao.backupCodes };
}

async function passarPelaSenha(email: string) {
  outroNavegador();
  return entrar({ email, senha: SENHA });
}

const sessoes = (usuarioId: string) => getPrisma().session.count({ where: { userId: usuarioId } });
const errado = (chave: string) => {
  const validos = new Set([-1, 0, 1, 2].map((passo) => codigoTotp(chave, passo)));
  return ["000000", "111111", "222222", "333333", "444444"].find((codigo) => !validos.has(codigo))!;
};

describe("login com segundo fator (integração)", () => {
  it("a senha certa não cria sessão: pede o código", async () => {
    const { email, usuarioId } = await comSegundoFator();

    expect(await passarPelaSenha(email)).toEqual({ ok: true, segundoFator: true });
    expect(await obterSessao()).toBeNull();
    expect(await sessoes(usuarioId)).toBe(0);
    expect(await haPassoPendente()).toBe(true);
  });

  it("o código do aplicativo, mesmo digitado com espaço, completa o login", async () => {
    const { email, chave } = await comSegundoFator();
    await passarPelaSenha(email);
    const codigo = codigoTotp(chave);

    expect(await confirmarCodigoDeEntrada(`${codigo.slice(0, 3)} ${codigo.slice(3)}`)).toEqual({ ok: true });
    expect(await obterSessao()).toMatchObject({ email });
    expect(await haPassoPendente()).toBe(false);
  });

  it("código errado ou fora do formato não entra", async () => {
    const { email, chave } = await comSegundoFator();
    await passarPelaSenha(email);

    expect(await confirmarCodigoDeEntrada(errado(chave))).toEqual({ ok: false, erro: "Código incorreto." });
    expect(await confirmarCodigoDeEntrada("12ab56")).toEqual({ ok: false, erro: "Digite os 6 números do aplicativo." });
    expect(await confirmarCodigoDeEntrada(null)).toEqual({ ok: false, erro: "Digite os 6 números do aplicativo." });
    expect(await obterSessao()).toBeNull();
  });

  it("quem completa o segundo fator não é barrado pelo limite de login; quem para na senha é", async () => {
    const { email, codigos } = await comSegundoFator();
    const aqui = "198.18.200.1";
    for (let vez = 0; vez < 6; vez += 1) {
      novoNavegador(aqui);
      expect(await entrar({ email, senha: SENHA })).toEqual({ ok: true, segundoFator: true });
      expect(await confirmarCodigoDeRecuperacao(codigos[vez])).toEqual({ ok: true });
    }
    const soComASenha = [];
    for (let vez = 0; vez < 6; vez += 1) {
      novoNavegador(aqui);
      soComASenha.push(await entrar({ email, senha: SENHA }));
    }

    expect(soComASenha.at(-1)).toEqual({ ok: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
  }, 60_000);

  it("o mesmo código não entra duas vezes", async () => {
    const { email, usuarioId, chave } = await comSegundoFator();
    const codigo = codigoTotp(chave);
    await passarPelaSenha(email);
    expect(await confirmarCodigoDeEntrada(codigo)).toEqual({ ok: true });

    await passarPelaSenha(email);

    expect(await confirmarCodigoDeEntrada(codigo)).toEqual({
      ok: false, recomecar: "repetido",
      erro: "Este código já foi usado. Espere o aplicativo mostrar o próximo e entre de novo.",
    });
    expect(await obterSessao()).toBeNull();
    expect(await sessoes(usuarioId)).toBe(1);
  });

  it("com dois envios ao mesmo tempo, só um registra o código", async () => {
    const usuarioId = randomUUID();

    const resultados = await Promise.all(Array.from({ length: 5 }, () => registrarCodigoUsado(usuarioId, "123456")));

    expect(resultados.filter(Boolean)).toHaveLength(1);
    expect(await registrarCodigoUsado(usuarioId, "654321")).toBe(true);
    // Depois que vence, o registro sai do caminho.
    expect(await registrarCodigoUsado(usuarioId, "123456", new Date(Date.now() + 3 * 60_000))).toBe(true);
    await getPrisma().verification.deleteMany({ where: { identifier: `totp-usado:${usuarioId}` } });
  });

  it("cada código de recuperação entra uma única vez e avisa o titular", async () => {
    const { email, codigos } = await comSegundoFator();
    const avisos = () => enviados().filter((e) => e.para === email && e.assunto.includes("código de recuperação"));
    await passarPelaSenha(email);

    expect(await confirmarCodigoDeRecuperacao(`  ${codigos[0]} `)).toEqual({ ok: true });
    expect(await obterSessao()).toMatchObject({ email });
    expect(avisos()).toHaveLength(1);

    await passarPelaSenha(email);
    expect(await confirmarCodigoDeRecuperacao(codigos[0])).toEqual({ ok: false, erro: "Código de recuperação incorreto ou já usado." });
    expect(await obterSessao()).toBeNull();
    expect(await confirmarCodigoDeRecuperacao(codigos[1])).toEqual({ ok: true });
    expect(avisos()).toHaveLength(2);
  });

  it("depois de 5 erros, o passo pendente acaba", async () => {
    const { email, chave } = await comSegundoFator();
    await passarPelaSenha(email);
    for (let vez = 0; vez < 5; vez += 1) await confirmarCodigoDeEntrada(errado(chave));

    expect(await confirmarCodigoDeEntrada(codigoTotp(chave))).toMatchObject({ ok: false, recomecar: "tentativas" });
    expect(await obterSessao()).toBeNull();
  });

  it("depois de 10 erros seguidos, a conta fica bloqueada mesmo com o código certo", async () => {
    const { email, chave } = await comSegundoFator();
    for (let rodada = 0; rodada < 2; rodada += 1) {
      await passarPelaSenha(email);
      for (let vez = 0; vez < 5; vez += 1) await confirmarCodigoDeEntrada(errado(chave));
    }
    await passarPelaSenha(email);

    expect(await confirmarCodigoDeEntrada(codigoTotp(chave))).toEqual({
      ok: false, recomecar: "bloqueado", erro: "Muitos códigos errados. Aguarde 15 minutos e entre de novo.",
    });
    expect(await obterSessao()).toBeNull();
  });

  it("sem passar pela senha, nenhum código serve", async () => {
    const { chave } = await comSegundoFator();
    outroNavegador();

    expect(await haPassoPendente()).toBe(false);
    expect(await confirmarCodigoDeEntrada(codigoTotp(chave))).toEqual({
      ok: false, recomecar: "expirado", erro: "O tempo para digitar o código acabou. Entre de novo com a senha.",
    });
  });

  it("o link de confirmação de e-mail não cria sessão", async () => {
    const { email, usuarioId } = await comSegundoFator();
    outroNavegador();
    await getAuth().api.sendVerificationEmail({ body: { email, callbackURL: "/email-confirmado" } });
    await vi.waitFor(() => expect(enviados().some((e) => e.para === email && e.assunto.startsWith("Confirme"))).toBe(true));
    const texto = enviados().findLast((e) => e.para === email && e.assunto.startsWith("Confirme"))!.texto;

    await getAuth().handler(new Request(/https?:\/\/\S+verify-email\S+/.exec(texto)![0]));

    expect(await obterSessao()).toBeNull();
    expect(await sessoes(usuarioId)).toBe(0);
  });

  it("redefinir a senha não desliga o segundo fator", async () => {
    const { email } = await comSegundoFator();
    await pedirRedefinicaoDeSenha({ email });
    const texto = enviados().findLast((e) => e.para === email && e.assunto.startsWith("Redefinir"))!.texto;
    const token = /reset-password\/([A-Za-z0-9_-]+)/.exec(texto)![1]!;
    const nova = "outra-frase-bem-comprida";

    expect(await redefinirSenha({ token, senha: nova, confirmacao: nova })).toEqual({ ok: true });

    outroNavegador();
    expect(await entrar({ email, senha: nova })).toEqual({ ok: true, segundoFator: true });
    expect(await obterSessao()).toBeNull();
  });

  it.each([
    "enable", "disable", "verify-totp", "verify-backup-code", "get-totp-uri", "generate-backup-codes", "view-backup-codes",
    "send-otp", "verify-otp",
  ])("/api/auth/two-factor/%s continua fechada por HTTP", async (rota) => {
    const endereco = `http://localhost:3000/api/auth/two-factor/${rota}`;

    expect((await GET(new Request(endereco))).status).toBe(404);
    expect(POST().status).toBe(404);
  });
});

describe("as ações do código na entrada não valem para quem já está conectado", () => {
  const JA_CONECTADO = { ok: false, erro: "Você já está conectado. Abra o painel." };

  it("não ligam uma ativação pendente (sem aviso e sem encerrar sessões)", async () => {
    const email = `teste.${randomUUID().slice(0, 8)}@exemplo.test`;
    emails.push(email);
    outroNavegador();
    await cadastrar({ nome: "Advogada Fictícia", email, senha: SENHA, confirmacao: SENHA });
    await getPrisma().user.update({ where: { email }, data: { emailVerified: true } });
    const sessao = (await obterSessao())!;
    const inicio = await iniciarAtivacao({ usuarioId: sessao.usuarioId, nome: sessao.nome, email }, SENHA);
    if (!inicio.ok) throw new Error(inicio.erro);

    expect(await confirmarCodigoDeEntrada(codigoTotp(inicio.chave))).toEqual(JA_CONECTADO);
    expect(await confirmarCodigoDeRecuperacao("abcde-fghij")).toEqual(JA_CONECTADO);

    const usuario = await getPrisma().user.findUniqueOrThrow({ where: { email } });
    expect(usuario.twoFactorEnabled).toBeFalsy();
    // A ativação pela tela Conta continua possível.
    expect(await confirmarAtivacao({ usuarioId: sessao.usuarioId, nome: sessao.nome, email }, codigoTotp(inicio.chave)))
      .toMatchObject({ ok: true });
  });

  it("não gastam códigos com a proteção ligada", async () => {
    const { email, chave, codigos } = await comSegundoFator();
    await passarPelaSenha(email);
    await confirmarCodigoDeEntrada(codigoTotp(chave));

    expect(await confirmarCodigoDeRecuperacao(codigos[0])).toEqual(JA_CONECTADO);

    await passarPelaSenha(email);
    expect(await confirmarCodigoDeRecuperacao(codigos[0])).toEqual({ ok: true });
  });
});

describe("falhas e senha trocada no meio do login", () => {
  it("se o banco falhar ao registrar o código, o navegador fica sem sessão", async () => {
    const { email, chave } = await comSegundoFator();
    await passarPelaSenha(email);
    const registrar = vi.spyOn(getPrisma().verification, "createMany").mockRejectedValueOnce(new Error("banco fora"));
    const apagar = vi.spyOn(getPrisma().session, "deleteMany").mockRejectedValueOnce(new Error("banco fora"));

    expect(await confirmarCodigoDeEntrada(codigoTotp(chave))).toMatchObject({ ok: false });

    registrar.mockRestore();
    apagar.mockRestore();
    expect((await pote()).getAll().filter((cookie) => cookie.name.includes("session_token"))).toEqual([]);
    expect(await obterSessao()).toBeNull();
  });

  it("redefinir a senha cancela o passo pendente de quem passou pela senha antiga", async () => {
    const { email, chave } = await comSegundoFator();
    const invasor = outroNavegador();
    await entrar({ email, senha: SENHA });
    outroNavegador();
    await pedirRedefinicaoDeSenha({ email });
    const texto = enviados().findLast((e) => e.para === email && e.assunto.startsWith("Redefinir"))!.texto;
    const nova = "outra-frase-bem-comprida";
    await redefinirSenha({ token: /reset-password\/([A-Za-z0-9_-]+)/.exec(texto)![1]!, senha: nova, confirmacao: nova });

    usarNavegador(invasor);
    expect(await confirmarCodigoDeEntrada(codigoTotp(chave))).toMatchObject({ ok: false, recomecar: "expirado" });
    expect(await obterSessao()).toBeNull();
  });

  it("trocar a senha também cancela o passo pendente", async () => {
    const { email, usuarioId, chave, codigos } = await comSegundoFator();
    const titular = outroNavegador();
    await entrar({ email, senha: SENHA });
    await confirmarCodigoDeRecuperacao(codigos[0]);
    const invasor = outroNavegador();
    await entrar({ email, senha: SENHA });

    usarNavegador(titular);
    const nova = "outra-frase-bem-comprida";
    expect(await trocarSenha({ usuarioId, nome: "Advogada Fictícia", email }, { senhaAtual: SENHA, senha: nova, confirmacao: nova }))
      .toEqual({ ok: true });

    usarNavegador(invasor);
    expect(await confirmarCodigoDeEntrada(codigoTotp(chave))).toMatchObject({ ok: false, recomecar: "expirado" });
  });
});
