import { expect, test, type Page } from "@playwright/test";
import { codigoTotp } from "../src/test/totp";
import { verificarAcessibilidade } from "./acessibilidade";
import { cadastrarContaFicticia, linkDeConfirmacao, semRolagemHorizontal, SENHA_FICTICIA } from "./apoio";

// Verificação em duas etapas no navegador de verdade, do ligar ao desligar. Usa uma
// conta própria, para não mexer na sessão compartilhada pelos outros testes.
test.use({ storageState: { cookies: [], origins: [] } });

async function conferirTela(page: Page) {
  await verificarAcessibilidade(page);
  await semRolagemHorizontal(page);
}

async function sair(page: Page) {
  await page.goto("/mais");
  await page.getByRole("main").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
}

async function passarPelaSenha(page: Page, email: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/entrar\/codigo$/);
}

async function usarRecuperacao(page: Page, codigo: string) {
  await page.getByRole("link", { name: /código de recuperação/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Código de recuperação" })).toBeVisible();
  await page.getByLabel("Código de recuperação").fill(codigo);
  await page.getByRole("button", { name: "Entrar com o código" }).click();
}

test("liga, entra com código e com código de recuperação, gera novos e desliga", async ({ page }) => {
  test.setTimeout(180_000);
  const email = await cadastrarContaFicticia(page);

  // Sem o e-mail confirmado, não há como ligar.
  await page.goto("/conta");
  await expect(page.getByText("Para ligar, confirme antes o seu e-mail.")).toBeVisible();
  await page.goto(linkDeConfirmacao(email));
  await expect(page).toHaveURL(/\/painel\?email=confirmado$/);

  await page.goto("/conta");
  await page.getByLabel("Sua senha, para ligar").fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Ligar a verificação em duas etapas" }).click();
  await expect(page.getByRole("img", { name: "QR code para o aplicativo autenticador" })).toBeVisible();
  const chave = (await page.getByTestId("chave-do-autenticador").innerText()).replace(/\s/g, "");
  await conferirTela(page);

  await page.getByLabel("Código de 6 números").fill(codigoTotp(chave));
  await page.getByRole("button", { name: "Confirmar e ligar" }).click();
  const lista = page.getByRole("list", { name: "Códigos de recuperação" });
  await expect(lista.getByRole("listitem")).toHaveCount(10);
  const codigos = (await lista.getByRole("listitem").allInnerTexts()).map((codigo) => codigo.trim());
  await conferirTela(page);
  await page.getByRole("button", { name: "Já guardei os códigos" }).click();
  await expect(page.getByText("O login pede o código do aplicativo.")).toBeVisible();
  await expect(lista).toHaveCount(0);
  await conferirTela(page);

  // Só a senha não abre o app.
  await sair(page);
  await passarPelaSenha(page, email);
  await conferirTela(page);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/entrar/codigo");
  // Um passo à frente: o código usado para ligar não vale de novo.
  await page.getByLabel("Código de 6 números").fill(codigoTotp(chave, 1));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page).toHaveURL(/\/painel$/);

  await sair(page);
  await passarPelaSenha(page, email);
  await usarRecuperacao(page, codigos[0]!);
  await expect(page).toHaveURL(/\/painel$/);

  // O código de recuperação já usado não entra; outro entra.
  await sair(page);
  await passarPelaSenha(page, email);
  await usarRecuperacao(page, codigos[0]!);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Código de recuperação incorreto ou já usado.");
  await conferirTela(page);
  await page.getByLabel("Código de recuperação").fill(codigos[1]!);
  await page.getByRole("button", { name: "Entrar com o código" }).click();
  await expect(page).toHaveURL(/\/painel$/);

  await page.goto("/conta");
  await page.getByLabel("Sua senha, para gerar códigos novos").fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Gerar códigos novos" }).click();
  await expect(lista.getByRole("listitem")).toHaveCount(10);
  await expect(lista).not.toContainText(codigos[2]!);
  await page.getByRole("button", { name: "Já guardei os códigos" }).click();

  await page.getByLabel("Sua senha, para desativar").fill("senha-errada-de-teste");
  await page.getByRole("button", { name: "Desativar a verificação em duas etapas" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Senha incorreta.");
  await page.getByLabel("Sua senha, para desativar").fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Desativar a verificação em duas etapas" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Verificação em duas etapas desligada." })).toBeVisible();
  // A sessão continua, e o próximo login pede só a senha.
  await page.reload();
  await expect(page.getByLabel("Sua senha, para ligar")).toBeVisible();
  await sair(page);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA_FICTICIA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("sem passar pela senha, a tela do código volta ao login e não mostra texto do endereço", async ({ page }) => {
  await page.goto("/entrar/codigo");
  await expect(page).toHaveURL(/\/entrar$/);

  await page.goto("/entrar?codigo=bloqueado");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Muitos códigos errados. Aguarde 15 minutos e entre de novo.");
  await page.goto("/entrar?codigo=texto-inventado");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});
