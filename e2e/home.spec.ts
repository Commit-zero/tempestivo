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
