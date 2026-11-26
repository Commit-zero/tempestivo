import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/platform/database";
import type { FakeMailer } from "@/platform/mailer";
import { getMailer } from "@/platform/runtime";
import { novoNavegador, usarNavegador } from "@/test/next-headers";
import { cadastrar } from "./acoes";
import { getAuth } from "./auth";
import { obterSessao } from "./sessao";

vi.mock("next/headers", () => import("@/test/next-headers"));

// O link do e-mail confirma o endereço, mas não abre sessão: quem não está conectado
// entra com a senha. Assim o link esquecido numa caixa de e-mail não dá acesso à conta.
const emails: string[] = [];
afterAll(async () => {
  await getPrisma().user.deleteMany({ where: { email: { in: emails } } });
});

async function cadastrarComLink() {
  const email = `teste.${randomUUID().slice(0, 8)}@exemplo.test`;
  emails.push(email);
  const aqui = novoNavegador("203.0.113.90");
  const senha = "senha-ficticia-do-cadastro";
  await cadastrar({ nome: "Advogada Fictícia", email, senha, confirmacao: senha });
  const texto = (getMailer() as FakeMailer).enviados.findLast((e) => e.para === email && e.assunto.startsWith("Confirme"))?.texto;
  const link = /https?:\/\/\S+verify-email\S+/.exec(texto ?? "")?.[0];
  if (!link) throw new Error("O e-mail de confirmação não trouxe o link.");
  return { email, aqui, link };
}

const abrir = (link: string) => getAuth().handler(new Request(link));
const confirmado = async (email: string) => (await getPrisma().user.findUnique({ where: { email } }))?.emailVerified;
const sessoes = (email: string) => getPrisma().session.count({ where: { user: { email } } });

describe("link de confirmação de e-mail (integração)", () => {
  it("aberto sem sessão, confirma o e-mail e não cria sessão", async () => {
    const { email, link } = await cadastrarComLink();
    const antes = await sessoes(email);
    novoNavegador("203.0.113.91");

    const resposta = await abrir(link);

    expect(resposta.headers.get("location")).toBe("/email-confirmado");
    expect(resposta.headers.get("set-cookie")).toBeNull();
    expect(await confirmado(email)).toBe(true);
    expect(await obterSessao()).toBeNull();
    expect(await sessoes(email)).toBe(antes);
  });

  it("quem já está conectado continua conectado", async () => {
    const { email, aqui, link } = await cadastrarComLink();
    usarNavegador(aqui);

    await abrir(link);

    expect(await obterSessao()).toMatchObject({ email, emailConfirmado: true });
  });

  it("link adulterado não confirma e avisa o erro no endereço de destino", async () => {
    const { email, link } = await cadastrarComLink();
    novoNavegador("203.0.113.92");

    const resposta = await abrir(link.replace(/token=[^&]+/, "token=adulterado"));

    expect(resposta.headers.get("location")).toBe("/email-confirmado?error=INVALID_TOKEN");
    expect(await confirmado(email)).toBe(false);
  });
});
