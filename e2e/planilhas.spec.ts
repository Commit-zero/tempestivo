import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { lerPlanilha, valores } from "../src/test/ler-planilha";
import { cadastrarCliente, cadastrarContaFicticia, semRolagemHorizontal, unico } from "./apoio";

// O download de verdade, pelo botão. Conta própria por teste: o limite de planilhas é
// por conta, e a sessão compartilhada é usada pelas três larguras ao mesmo tempo.
test.use({ storageState: { cookies: [], origins: [] } });

async function baixar(page: Page, nome = "Baixar planilha") {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: nome }).click()]);
  return { arquivo: download.suggestedFilename(), planilha: lerPlanilha(await readFile((await download.path())!)) };
}

test("clientes: o botão baixa a planilha com a busca da tela", async ({ page }) => {
  await cadastrarContaFicticia(page);
  const [procurado, outro] = [unico("Marina Fictícia"), unico("Otávio Fictício")];
  await cadastrarCliente(page, procurado);
  await cadastrarCliente(page, outro);
  await page.goto("/clientes");
  await page.getByLabel("Buscar por nome").fill("Marina");
  await page.getByLabel("Buscar por nome").press("Enter");
  await expect(page).toHaveURL(/busca=Marina/);
  await semRolagemHorizontal(page);
  await expect(page.getByText("O arquivo traz dados pessoais dos seus clientes")).toBeVisible();

  const { arquivo, planilha } = await baixar(page);

  expect(arquivo).toMatch(/^tempestivo-clientes-\d{4}-\d{2}-\d{2}\.xlsx$/);
  expect(valores(planilha.abas[0]!).map((linha) => linha[0])).toEqual([procurado]);
});

test("sem sessão é 401, lista desconhecida é 404 e há limite por minuto", async ({ page }) => {
  expect((await page.request.get("/exportar/clientes")).status()).toBe(401);

  await cadastrarContaFicticia(page);
  expect((await page.request.get("/exportar/usuarios")).status()).toBe(404);

  const primeira = await page.request.get("/exportar/clientes");
  expect(primeira.status()).toBe(200);
  expect(primeira.headers()["content-type"]).toContain("spreadsheetml");
  expect(primeira.headers()["cache-control"]).toBe("private, no-store");
  const seguintes = [];
  for (let vez = 0; vez < 10; vez += 1) seguintes.push((await page.request.get("/exportar/clientes")).status());
  expect(seguintes).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200, 429]);
});
