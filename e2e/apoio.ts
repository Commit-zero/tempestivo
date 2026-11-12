import { expect, type Page } from "@playwright/test";

export const SENHA_FICTICIA = "senha-ficticia-dos-testes";

/** Sufixo único por execução, para os testes não dependerem de um banco vazio. */
export function unico(prefixo: string): string {
  return `${prefixo} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function emailFicticio(): string {
  return `${unico("teste").replace(" ", ".")}@exemplo.test`;
}

export async function cadastrarContaFicticia(page: Page, email = emailFicticio()): Promise<string> {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Advogada Fictícia");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA_FICTICIA);
  await page.getByLabel("Li e entendi").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/painel");
  return email;
}

export async function semRolagemHorizontal(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "a página não pode ter rolagem horizontal").toBeLessThanOrEqual(clientWidth);
}
