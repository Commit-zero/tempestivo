import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { SEGREDO_FALSO_DO_E2E } from "./sessao";

export const SENHA_FICTICIA = "senha-ficticia-dos-testes";

/** Sufixo único por execução, para os testes não dependerem de um banco vazio. */
export function unico(prefixo: string): string {
  return `${prefixo} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function emailFicticio(): string {
  return `${unico("teste").replace(" ", ".")}@exemplo.test`;
}

/** Número de processo fictício com dígito verificador válido, diferente a cada chamada. */
export function numeroCnjFicticio(): string {
  const sequencial = String(Math.floor(Math.random() * 9_999_999)).padStart(7, "0");
  const resto = "20268260100";
  const verificador = String(BigInt(98) - (BigInt(`${sequencial}${resto}00`) % BigInt(97))).padStart(2, "0");
  return `${sequencial}${verificador}${resto}`;
}

export async function cadastrarContaFicticia(page: Page, email = emailFicticio()): Promise<string> {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Advogada Fictícia");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA_FICTICIA);
  await page.getByLabel("Confirme a senha").fill(SENHA_FICTICIA);
  await page.getByLabel("Li e entendi").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/painel");
  return email;
}

/**
 * O mesmo link que o app mandaria por e-mail (o e-mail dos testes de tela é falso):
 * um JWT HS256 assinado com o segredo falso. Abri-lo passa pela rota de verdade.
 */
export function linkDeConfirmacao(email: string): string {
  const parte = (dados: object) => Buffer.from(JSON.stringify(dados)).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${parte({ alg: "HS256" })}.${parte({ email, iat: agora, exp: agora + 3600 })}`;
  const assinatura = createHmac("sha256", SEGREDO_FALSO_DO_E2E).update(corpo).digest("base64url");
  return `/api/auth/verify-email?token=${corpo}.${assinatura}&callbackURL=%2Femail-confirmado`;
}

export async function cadastrarCliente(page: Page, nome: string): Promise<void> {
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Telefone").fill("(11) 91234-5678");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name: nome })).toBeVisible();
}

/** Cadastra o processo (TJSP por padrão) e termina na página dele. */
export async function cadastrarProcesso(page: Page, cliente: string, assunto: string, tribunal = "TJSP"): Promise<void> {
  await page.goto("/processos/novo");
  await page.getByLabel("Cliente").selectOption({ label: cliente });
  await page.getByLabel("Número do processo").fill(numeroCnjFicticio());
  await page.getByLabel("Tribunal").fill(tribunal);
  await page.getByLabel("Assunto").fill(assunto);
  await page.getByRole("button", { name: "Cadastrar processo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: assunto })).toBeVisible();
}

export async function semRolagemHorizontal(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "a página não pode ter rolagem horizontal").toBeLessThanOrEqual(clientWidth);
}
