import { expect, test } from "@playwright/test";
import { cadastrarContaFicticia, semRolagemHorizontal, SENHA_FICTICIA } from "./apoio";

// Estes testes começam sem sessão.
test.use({ storageState: { cookies: [], origins: [] } });

test("área logada exige sessão", async ({ page }) => {
  await page.goto("/painel");

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await semRolagemHorizontal(page);
});

test("cadastra, sai e entra de novo; senha errada não entra", async ({ page }) => {
  const email = await cadastrarContaFicticia(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Olá, Advogada");

  await page.goto("/mais");
  await page.getByRole("main").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-errada-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("E-mail ou senha incorretos.", { timeout: 20_000 });
  await expect(page.getByLabel("E-mail")).toHaveValue(email);

  await page.getByLabel("Senha").fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("o cadastro recusa senha curta e a recuperação não revela se o e-mail existe", async ({ page }) => {
  await page.goto("/cadastro");
  await semRolagemHorizontal(page);
  await page.getByLabel("Nome").fill("Advogada Fictícia");
  await page.getByLabel("E-mail").fill("curta@exemplo.test");
  await page.getByLabel("Senha").fill("curta");
  await page.getByLabel("Li e entendi").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/cadastro$/);

  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill("ninguem@exemplo.test");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta com este e-mail");
});

test("exporta os dados da conta e exclui a conta só com o e-mail certo", async ({ page }) => {
  const email = await cadastrarContaFicticia(page);
  await page.goto("/conta");
  await semRolagemHorizontal(page);

  const exportacao = await page.request.get("/conta/exportar");
  expect(exportacao.status()).toBe(200);
  expect(exportacao.headers()["content-disposition"]).toContain("attachment");
  expect(await exportacao.json()).toMatchObject({ formato: "tempestivo-exportacao-v1", conta: { usuario: { email } }, clientes: [] });

  await page.getByLabel("Para confirmar, digite a sua senha").fill("senha-errada-de-teste");
  await page.getByRole("button", { name: "Excluir a conta e todos os dados" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Senha incorreta.");

  await page.getByLabel("Para confirmar, digite a sua senha").fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Excluir a conta e todos os dados" }).click();
  await expect(page.getByRole("status")).toHaveText("A conta e todos os dados foram excluídos.");

  // A sessão morreu junto com a conta, e o login não existe mais.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
  expect((await page.request.get("/conta/exportar")).status()).toBe(401);
});
