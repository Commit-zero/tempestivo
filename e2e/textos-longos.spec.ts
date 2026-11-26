import { expect, test, type Page } from "@playwright/test";
import { cadastrarCliente, cadastrarContaFicticia, cadastrarProcesso, semRolagemHorizontal, unico } from "./apoio";

// O que a pessoa digita pode não ter espaço nenhum (um endereço colado num título, um
// nome grudado). Isso não pode alargar a página nem empurrar os botões do diálogo.
const PALAVRA = "Palavraficticiasemnenhumespacoparaquebrarlinha";

async function botoesDoDialogoCabem(page: Page) {
  const largura = page.viewportSize()!.width;
  for (const botao of await page.getByRole("alertdialog").getByRole("button").all()) {
    const caixa = (await botao.boundingBox())!;
    expect(caixa.x).toBeGreaterThanOrEqual(0);
    expect(caixa.x + caixa.width).toBeLessThanOrEqual(largura + 1);
  }
  const sobra = await page.getByRole("alertdialog").evaluate((d) => d.scrollWidth - d.clientWidth);
  expect(sobra, "o diálogo não rola para o lado").toBeLessThanOrEqual(0);
}

for (const [nome, tamanho] of [["na largura do projeto", null], ["em 320 px", { width: 320, height: 568 }]] as const) {
  test(`texto sem espaços não alarga tarefas nem quebra o diálogo, ${nome}`, async ({ page }) => {
    if (tamanho) await page.setViewportSize(tamanho);
    const titulo = `${unico("Ver")} https://exemplo.test/documentos/peticao-inicial-versao-final-${PALAVRA}`.slice(0, 160);
    await page.goto("/tarefas");
    await page.getByLabel("Nova tarefa").fill(titulo);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    const excluir = page.getByRole("button", { name: `Excluir "${titulo}"` });
    await expect(excluir).toBeVisible();
    await semRolagemHorizontal(page);
    // Cada cartão fica dentro da própria coluna.
    const cartao = page.getByRole("listitem").filter({ has: excluir });
    const vazamento = await cartao.evaluate((item) => item.scrollWidth - item.closest("section")!.clientWidth);
    expect(vazamento).toBeLessThanOrEqual(0);

    await excluir.click();
    await botoesDoDialogoCabem(page);
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir tarefa" }).click();
    await expect(excluir).toHaveCount(0);
  });
}

test("nome sem espaços não alarga as telas de cliente, processo e honorário", async ({ page }) => {
  test.setTimeout(150_000);
  // Conta própria: nomes assim não podem ficar nas listas dos outros testes.
  await page.context().clearCookies();
  await cadastrarContaFicticia(page);
  await page.setViewportSize({ width: 320, height: 640 });
  const cliente = unico(PALAVRA);
  await cadastrarCliente(page, cliente);
  await semRolagemHorizontal(page);
  await page.getByRole("button", { name: "Excluir cliente" }).click();
  await botoesDoDialogoCabem(page);
  await page.keyboard.press("Escape");

  await cadastrarProcesso(page, cliente, unico("Ação fictícia"));
  await semRolagemHorizontal(page);
  await page.goto("/honorarios/novo");
  await page.getByLabel("Cliente").selectOption({ label: cliente });
  await page.getByLabel("Descrição").fill(PALAVRA);
  await page.getByLabel("Valor total").fill("100,00");
  await page.getByLabel("Primeiro vencimento").fill("2026-11-10");
  await page.getByRole("button", { name: "Cadastrar honorário" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(PALAVRA);
  await semRolagemHorizontal(page);
  for (const rota of ["/honorarios", "/clientes", "/processos", "/painel"]) {
    await page.goto(rota);
    await semRolagemHorizontal(page);
  }
});

test("em 320 px, a conta não alarga ao mostrar o link novo da agenda", async ({ page }) => {
  await page.context().clearCookies();
  await cadastrarContaFicticia(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/conta");
  await page.getByRole("button", { name: "Criar o link da agenda" }).click();
  await expect(page.getByLabel("Link da agenda")).toBeVisible();
  await semRolagemHorizontal(page);
});
