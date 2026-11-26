import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { lerPlanilha, valores } from "../src/test/ler-planilha";
import { cadastrarCliente, cadastrarContaFicticia, cadastrarProcesso, semRolagemHorizontal, unico } from "./apoio";

// O download de verdade, pelo botão. Conta própria por teste: o limite de planilhas é
// por conta, e a sessão compartilhada é usada pelas três larguras ao mesmo tempo.
test.use({ storageState: { cookies: [], origins: [] } });

// IP próprio por largura: os cadastros daqui não podem gastar o limite por IP dos outros testes.
test.beforeEach(async ({ page }) => {
  const final = { 360: 1, 768: 2, 1280: 3 }[page.viewportSize()!.width] ?? 4;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `192.0.2.${final}` });
});

/** Um registro fictício em cada lista, pelas próprias telas. */
async function popularCadaLista(page: Page) {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Ação fictícia");
  await cadastrarCliente(page, cliente);
  await cadastrarProcesso(page, cliente, assunto);
  const aviso = page.locator("[data-aviso-da-pagina]");

  await page.goto("/prazos/novo");
  await page.getByRole("button", { name: "Digitar a data final" }).click();
  await page.getByLabel("Processo").selectOption({ index: 1 });
  await page.getByLabel("Descrição").fill("Prazo vencido fictício");
  await page.getByLabel("Data final").fill("2026-01-12");
  const conferi = page.getByRole("checkbox");
  if (await conferi.count()) await conferi.last().check();
  await page.getByRole("button", { name: "Salvar prazo" }).click();
  await expect(aviso).toContainText("Prazo salvo.");

  await page.goto("/honorarios/novo");
  await page.getByLabel("Cliente").selectOption({ label: cliente });
  await page.getByLabel("Descrição").fill("Honorário fictício");
  await page.getByLabel("Valor total").fill("100,00");
  await page.getByLabel("Primeiro vencimento").fill("2027-01-10");
  await page.getByRole("button", { name: "Cadastrar honorário" }).click();
  await expect(aviso).toContainText("Honorário cadastrado.");

  await page.goto("/audiencias/nova");
  await page.getByLabel("Processo").selectOption({ index: 1 });
  await page.getByLabel("Tipo").fill("Audiência fictícia");
  await page.getByLabel("Data").fill("2027-02-10");
  await page.getByLabel("Hora").fill("14:00");
  await page.getByRole("button", { name: "Cadastrar audiência" }).click();
  await expect(aviso).toContainText("Audiência cadastrada.");

  await page.goto("/tarefas");
  await page.getByLabel("Nova tarefa").fill("Tarefa fictícia");
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  await expect(aviso).toContainText("Tarefa adicionada.");
}

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

test("lista vazia não oferece planilha; com registros, cada uma leva o filtro da tela", async ({ page }) => {
  test.setTimeout(150_000);
  await cadastrarContaFicticia(page);
  for (const rota of ["/clientes", "/processos", "/prazos", "/honorarios", "/audiencias", "/tarefas"]) {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Baixar planilha" }), rota).toHaveCount(0);
  }
  await popularCadaLista(page);
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
  // O botão só aparece com registros, e cadastrar um cliente não gasta o limite.
  await cadastrarCliente(page, unico("Cliente Fictício"));
  await page.goto("/clientes");
  await page.getByRole("link", { name: "Baixar planilha" }).click();
  await expect(page.locator("body")).toContainText("Muitas planilhas em pouco tempo");
  await semRolagemHorizontal(page);
  await page.getByRole("link", { name: "Voltar ao Tempestivo" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});
