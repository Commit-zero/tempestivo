import { expect, test } from "@playwright/test";
import { cadastrarCliente, cadastrarProcesso, semRolagemHorizontal, unico } from "./apoio";

test("honorário: cria parcelas, marca como paga e oferece a cobrança pelo WhatsApp", async ({ page }) => {
  const cliente = unico("Cliente Fictício");
  const descricao = unico("Honorários fictícios");
  await cadastrarCliente(page, cliente);

  await page.goto("/honorarios/novo");
  await page.getByLabel("Cliente").selectOption({ label: cliente });
  await page.getByLabel("Descrição").fill(descricao);
  await page.getByLabel("Valor total (R$)").fill("3.000,00");
  await page.getByLabel("Parcelas").fill("3");
  await page.getByLabel("Primeiro vencimento").fill("2026-01-10");
  await page.getByRole("button", { name: "Cadastrar honorário" }).click();

  await expect(page.getByRole("heading", { level: 1, name: descricao })).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByText("1/3 · R$ 1.000,00")).toBeVisible();
  await expect(main.getByText("em atraso").first()).toBeVisible();
  await semRolagemHorizontal(page);

  const cobranca = main.getByRole("link", { name: "Cobrar pelo WhatsApp" }).first();
  await expect(cobranca).toHaveAttribute("href", /^https:\/\/wa\.me\/5511912345678\?text=/);

  await page.getByRole("button", { name: "Marcar como paga a parcela 1" }).click();
  await expect(main.getByText("Paga em")).toBeVisible();
  await expect(page.getByRole("button", { name: "Desfazer o pagamento da parcela 1" })).toBeVisible();

  await page.goto("/honorarios");
  await expect(main.getByText("Recebido neste mês")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(descricao) })).toContainText("1 de 3 parcelas pagas");
  await semRolagemHorizontal(page);
});

test("audiência: cadastra, mostra rota e agenda, e o .ics é só de quem está logado", async ({ page, browser }) => {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Ação com audiência");
  const tipo = unico("Conciliação");
  await cadastrarCliente(page, cliente);
  await cadastrarProcesso(page, cliente, assunto);

  await page.goto("/audiencias/nova");
  await page.getByLabel("Processo").selectOption({ label: `${cliente} · ${assunto}` });
  await page.getByLabel("Tipo").fill(tipo);
  await page.getByLabel("Data").fill("2030-05-20");
  await page.getByLabel("Hora").fill("14:30");
  await page.getByLabel("Local").fill("Praça João Mendes, São Paulo");
  await page.getByRole("button", { name: "Cadastrar audiência" }).click();

  await expect(page).toHaveURL(/\/audiencias$/);
  const item = page.getByRole("listitem").filter({ hasText: tipo });
  await expect(item).toContainText("20/05/2030 às 14:30");
  await expect(item.getByRole("link", { name: "Rota" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
  await semRolagemHorizontal(page);

  const caminho = await item.getByRole("link", { name: "Adicionar à agenda" }).getAttribute("href");
  const resposta = await page.request.get(caminho!);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toContain("text/calendar");
  expect(await resposta.text()).toContain("DTSTART:20300520T173000Z");

  const anonimo = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  expect((await anonimo.request.get(`http://localhost:3100${caminho}`)).status()).toBe(401);
  await anonimo.close();
});

test("tarefas: adiciona, move entre as colunas e exclui", async ({ page }) => {
  const titulo = unico("Tarefa fictícia");
  await page.goto("/tarefas");
  await semRolagemHorizontal(page);

  await page.getByLabel("Nova tarefa").fill(titulo);
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  await expect(page.getByRole("region", { name: "A fazer" }).getByText(titulo)).toBeVisible();

  await page.getByRole("button", { name: `Mover "${titulo}" para Fazendo` }).click();
  await expect(page.getByRole("region", { name: "Fazendo" }).getByText(titulo)).toBeVisible();
  // O foco do teclado acompanha a tarefa até a nova coluna, e a mudança é anunciada.
  await expect(page.getByRole("region", { name: "Fazendo" }).locator("li", { hasText: titulo })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Tarefa movida para Fazendo." })).toBeAttached();

  await page.getByRole("button", { name: `Mover "${titulo}" para Feito` }).click();
  await expect(page.getByRole("region", { name: "Feito", exact: true }).getByText(titulo)).toBeVisible();

  await page.getByRole("button", { name: `Excluir "${titulo}"` }).click();
  await expect(page.getByText(titulo)).toHaveCount(0);
});

test("o painel mostra o que pede atenção e não tem rolagem horizontal", async ({ page }) => {
  await page.goto("/painel");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Olá, Advogada");
  await expect(page.getByRole("link", { name: "Novo prazo" })).toBeVisible();
  await semRolagemHorizontal(page);
});
