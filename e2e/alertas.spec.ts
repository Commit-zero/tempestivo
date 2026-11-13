import { expect, test } from "@playwright/test";
import { semRolagemHorizontal } from "./apoio";

test("a conta salva o advogado substituto e exige o e-mail dele", async ({ page }) => {
  await page.goto("/conta");
  await semRolagemHorizontal(page);

  await page.getByLabel("Nome do substituto").fill("Colega Fictício");
  await page.getByLabel("E-mail do substituto").fill("");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Informe o e-mail do substituto.");

  await page.getByLabel("E-mail do substituto").fill("colega@exemplo.test");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Dados salvos.");
});

test.describe("link do e-mail", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("token inválido mostra aviso, sem login e sem vazar nada", async ({ page }) => {
    await page.goto("/conferir/token-que-nao-existe-0123456789abcdef");

    await expect(page.getByRole("heading", { level: 1, name: "Link inválido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Li e conferi" })).toHaveCount(0);
    await semRolagemHorizontal(page);
  });
});
