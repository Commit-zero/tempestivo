import { expect, test } from "@playwright/test";
import { cadastrarContaFicticia, linkDeConfirmacao, semRolagemHorizontal, SENHA_FICTICIA } from "./apoio";
import { VERSAO_DOS_TERMOS } from "../src/lib/termos";

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
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("E-mail ou senha incorretos.", { timeout: 20_000 });
  await expect(page.getByLabel("E-mail")).toHaveValue(email);

  await page.getByLabel("Senha", { exact: true }).fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("o cadastro marca as regras e recusa no servidor a confirmação diferente", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Advogada Fictícia");
  await page.getByLabel("E-mail").fill("regras@exemplo.test");
  const regras = page.getByRole("list", { name: "Regras da senha" });

  await page.getByLabel("Senha", { exact: true }).fill("regras-do-forum-2026");
  await expect(regras.getByRole("listitem").filter({ hasText: "Sem o nome do seu e-mail" })).toContainText("pendente");

  await page.getByLabel("Senha", { exact: true }).fill(SENHA_FICTICIA);
  await expect(regras.getByRole("listitem").filter({ hasText: ": atendida" })).toHaveCount(4);

  await page.getByLabel("Confirme a senha").fill("outra-senha-ficticia");
  await expect(page.getByText("As senhas ainda não conferem.")).toBeVisible();
  await semRolagemHorizontal(page);
  await page.getByLabel("Li e entendi").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("As senhas não conferem.");
  // O envio limpa as senhas, e a marcação volta ao começo.
  await expect(regras.getByRole("listitem").filter({ hasText: ": atendida" })).toHaveCount(0);
  await expect(page.getByLabel("E-mail")).toHaveValue("regras@exemplo.test");
  await expect(page.getByLabel("Li e entendi")).toBeChecked();
});

test("o cadastro recusa senha curta e a recuperação não revela se o e-mail existe", async ({ page }) => {
  await page.goto("/cadastro");
  await semRolagemHorizontal(page);
  await page.getByLabel("Nome").fill("Advogada Fictícia");
  await page.getByLabel("E-mail").fill("curta@exemplo.test");
  await page.getByLabel("Senha", { exact: true }).fill("curta");
  await page.getByLabel("Confirme a senha").fill("curta");
  await page.getByLabel("Li e entendi").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/cadastro$/);

  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill("ninguem@exemplo.test");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta com este e-mail");
});

test("o link de confirmação confirma o e-mail sem abrir sessão", async ({ page, context }) => {
  const email = await cadastrarContaFicticia(page);
  await context.clearCookies();

  await page.goto(linkDeConfirmacao(email));
  await expect(page).toHaveURL(/\/email-confirmado$/);
  await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();
  await semRolagemHorizontal(page);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);

  await page.goto("/email-confirmado?error=TOKEN_EXPIRED");
  await expect(page.getByRole("heading", { name: "Link inválido ou vencido" })).toBeVisible();

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("region", { name: "Confirmação de e-mail" })).toHaveCount(0);

  // Já conectado, o endereço do link leva direto ao painel, com o aviso.
  await page.goto("/email-confirmado");
  await expect(page).toHaveURL(/\/painel\?email=confirmado$/);
});

test("troca a senha na tela Conta e continua com a sessão aberta", async ({ page }) => {
  const email = await cadastrarContaFicticia(page);
  const NOVA = "uma-frase-nova-bem-comprida";
  await page.goto("/conta");
  await semRolagemHorizontal(page);

  async function enviarTroca(senhaAtual: string) {
    await page.getByLabel("Senha atual").fill(senhaAtual);
    await page.getByLabel("Nova senha", { exact: true }).fill(NOVA);
    await page.getByLabel("Confirme a nova senha").fill(NOVA);
    await page.getByRole("button", { name: "Trocar a senha" }).click();
  }

  await enviarTroca("senha-errada-de-teste");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Senha atual incorreta.");

  await enviarTroca(SENHA_FICTICIA);
  await expect(page.getByRole("status").filter({ hasText: "Senha trocada." })).toBeVisible();
  await expect(page).toHaveURL(/\/conta$/);

  // A sessão deste aparelho continua valendo, e a senha nova é a que entra.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Conta" })).toBeVisible();
  await page.goto("/mais");
  await page.getByRole("main").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(NOVA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("exporta os dados da conta e exclui a conta só com o e-mail certo", async ({ page }) => {
  const email = await cadastrarContaFicticia(page);
  await page.goto("/conta");
  await semRolagemHorizontal(page);

  const exportacao = await page.request.get("/conta/exportar");
  expect(exportacao.status()).toBe(200);
  expect(exportacao.headers()["content-disposition"]).toContain("attachment");
  // O cadastro registrou o aceite dos termos, com a versão lida.
  expect(await exportacao.json()).toMatchObject({
    formato: "tempestivo-exportacao-v1", conta: { usuario: { email }, versaoDosTermos: VERSAO_DOS_TERMOS }, clientes: [],
  });
  expect((await exportacao.json()).conta.termosAceitosEm).toEqual(expect.any(String));

  // Enter no campo da senha não pode apagar nada: só o diálogo confirma.
  await page.getByLabel("Para confirmar, digite a sua senha").fill(SENHA_FICTICIA);
  await page.getByLabel("Para confirmar, digite a sua senha").press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Confirme na janela antes de apagar.");
  expect((await page.request.get("/conta/exportar")).status()).toBe(200);

  // Sem a senha, o diálogo nem abre.
  await page.getByRole("button", { name: "Excluir a conta e todos os dados" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByLabel("Para confirmar, digite a sua senha").fill("senha-errada-de-teste");
  await page.getByRole("button", { name: "Excluir a conta e todos os dados" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir a conta" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Senha incorreta.");

  await page.getByLabel("Para confirmar, digite a sua senha").fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Excluir a conta e todos os dados" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir a conta" }).click();
  await expect(page.getByRole("status")).toHaveText("A conta e todos os dados foram excluídos.");

  // A sessão morreu junto com a conta, e o login não existe mais.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
  expect((await page.request.get("/conta/exportar")).status()).toBe(401);
});
