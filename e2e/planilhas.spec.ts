import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { lerPlanilha, valores } from "../src/test/ler-planilha";
import { cadastrarCliente, cadastrarContaFicticia, semRolagemHorizontal, unico } from "./apoio";

// O download de verdade, pelo botão. Conta própria por teste: o limite de planilhas é
// por conta, e a sessão compartilhada é usada pelas três larguras ao mesmo tempo.
test.use({ storageState: { cookies: [], origins: [] } });

// IP próprio por largura: os cadastros daqui não podem gastar o limite por IP dos outros testes.
test.beforeEach(async ({ page }) => {
  const final = { 360: 1, 768: 2, 1280: 3 }[page.viewportSize()!.width] ?? 4;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `192.0.2.${final}` });
});

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

test("cada lista e a conta oferecem a planilha com o filtro da tela, em alvos de 44 px no celular", async ({ page }) => {
  await cadastrarContaFicticia(page);
  for (const [rota, destino, nome] of [
    ["/clientes", "/exportar/clientes", "Baixar planilha"],
    ["/processos?status=todos", "/exportar/processos?status=todos", "Baixar planilha"],
    ["/prazos?filtro=vencidos", "/exportar/prazos?filtro=vencidos", "Baixar planilha"],
    ["/honorarios", "/exportar/honorarios", "Baixar planilha"],
    ["/audiencias", "/exportar/audiencias", "Baixar planilha"],
    ["/tarefas", "/exportar/tarefas", "Baixar planilha"],
    ["/conta", "/exportar/completa", "Baixar a planilha completa"],
  ] as const) {
    await page.goto(rota);
    const botao = page.getByRole("link", { name: nome });
    await expect(botao).toHaveAttribute("href", destino);
    if (page.viewportSize()!.width < 768) expect((await botao.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await semRolagemHorizontal(page);
  }

  const { arquivo, planilha } = await baixar(page, "Baixar a planilha completa");

  expect(arquivo).toMatch(/^tempestivo-completa-/);
  expect(planilha.abas.map((aba) => aba.nome)).toContain("Resumo");
  expect(planilha.temFormula).toBe(false);
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

  // Pelo botão, quem estourou o limite precisa ler o motivo, e não ganhar um download estranho.
  await page.goto("/clientes");
  await page.getByRole("link", { name: "Baixar planilha" }).click();
  await expect(page.locator("body")).toContainText("Muitas planilhas em pouco tempo");
});
