import { expect, test } from "@playwright/test";
import { semRolagemHorizontal } from "./apoio";

test.use({ storageState: { cookies: [], origins: [] } });

test("a página inicial carrega em português, sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nunca perca um prazo e receba seus honorários.");
  await expect(page.getByRole("link", { name: "Criar conta gratuita" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await semRolagemHorizontal(page);
});

test("os termos de uso e a política de privacidade abrem sem login e ligam um ao outro", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Termos de uso" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("O cálculo de prazo é auxiliar");
  await semRolagemHorizontal(page);

  await page.getByRole("contentinfo").getByRole("link", { name: "Política de privacidade" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("não é guardado");
  await semRolagemHorizontal(page);
});
