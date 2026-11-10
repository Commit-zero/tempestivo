import { expect, test } from "@playwright/test";

test("a página inicial carrega em português, sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Tempestivo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastro em breve" })).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
