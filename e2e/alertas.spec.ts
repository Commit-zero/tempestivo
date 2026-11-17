import { expect, test } from "@playwright/test";
import { cadastrarContaFicticia, semRolagemHorizontal } from "./apoio";

test("a conta salva o advogado substituto, exige o e-mail dele e espera o aceite", async ({ browser }) => {
  // Conta própria: as três larguras não podem disputar o mesmo substituto.
  const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await contexto.newPage();
  await cadastrarContaFicticia(page);
  await page.goto("/conta");
  await semRolagemHorizontal(page);

  await page.getByLabel("Nome do substituto").fill("Colega Fictício");
  await page.getByLabel("E-mail do substituto").fill("");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Informe o e-mail do substituto.");

  await page.getByLabel("E-mail do substituto").fill("colega@exemplo.test");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Dados salvos." })).toContainText("Enviamos um convite ao substituto");
  await page.reload();
  await expect(page.getByRole("main").getByText("Aguardando o substituto aceitar o convite")).toBeVisible();
  await contexto.close();
});

test.describe("link do e-mail", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("convite de substituto inválido mostra aviso e não oferece aceite", async ({ page }) => {
    await page.goto("/substituto/convite-que-nao-existe-0123456789abcdef");

    await expect(page.getByRole("heading", { level: 1, name: "Convite inválido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceitar ser substituto" })).toHaveCount(0);
    await semRolagemHorizontal(page);
  });

  test("token inválido mostra aviso, sem login e sem vazar nada", async ({ page }) => {
    await page.goto("/conferir/token-que-nao-existe-0123456789abcdef");

    await expect(page.getByRole("heading", { level: 1, name: "Link inválido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Li e conferi" })).toHaveCount(0);
    await semRolagemHorizontal(page);
  });
});

test("o painel pede a confirmação do e-mail enquanto ela não acontece", async ({ page }) => {
  await page.goto("/painel");

  const aviso = page.getByRole("region", { name: "Confirmação de e-mail" });
  await expect(aviso).toContainText("Confirme o seu e-mail para receber os alertas de prazo");
  await aviso.getByRole("button", { name: "Reenviar o link" }).click();
  await expect(aviso.getByRole("status")).toContainText("Enviamos um novo link");
  await semRolagemHorizontal(page);
});
