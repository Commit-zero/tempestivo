import { expect, test, type Page } from "@playwright/test";
import { verificarAcessibilidade } from "./acessibilidade";
import { cadastrarCliente, semRolagemHorizontal, unico } from "./apoio";

// Apagar pede confirmação num diálogo do app, e o servidor recusa o envio sem ela.
const dialogo = (page: Page) => page.getByRole("alertdialog");

test("excluir cliente: cancelar e Esc não apagam, o foco volta e confirmar apaga", async ({ page }) => {
  const nativos: string[] = [];
  page.on("dialog", (caixa) => {
    nativos.push(caixa.message());
    void caixa.dismiss();
  });
  const cliente = unico("Cliente Fictício");
  await cadastrarCliente(page, cliente);
  const endereco = page.url();
  const botao = page.getByRole("button", { name: "Excluir cliente" });

  await botao.click();
  await expect(dialogo(page)).toContainText(cliente);
  await expect(dialogo(page).getByRole("button", { name: "Cancelar" })).toBeFocused();
  await verificarAcessibilidade(page);
  await semRolagemHorizontal(page);
  await dialogo(page).getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(botao).toBeFocused();

  await botao.press("Enter");
  await page.keyboard.press("Escape");
  await expect(dialogo(page)).toHaveCount(0);
  await expect(botao).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: cliente })).toBeVisible();

  await botao.click();
  await dialogo(page).getByRole("button", { name: "Excluir cliente" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(page.locator("[data-aviso-da-pagina]")).toContainText("Cliente excluído.");
  await page.goto(endereco);
  await expect(page.getByRole("heading", { level: 1, name: cliente })).toHaveCount(0);
  expect(nativos, "nenhum window.confirm").toEqual([]);
});

test("o servidor recusa a exclusão enviada sem a confirmação", async ({ page }) => {
  const cliente = unico("Cliente Fictício");
  await cadastrarCliente(page, cliente);

  // Envia o formulário sem passar pelo diálogo, como faria um pedido montado à mão.
  await page.getByRole("button", { name: "Excluir cliente" }).evaluate((botao) => botao.closest("form")!.requestSubmit());

  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Confirme na janela antes de apagar.");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: cliente })).toBeVisible();
});

/** Clica no botão da tela, confere que nada acontece ao cancelar e confirma pelo diálogo. */
async function apagarComDialogo(page: Page, botao: ReturnType<Page["getByRole"]>, confirmar: string, aviso: string) {
  await botao.click();
  await expect(dialogo(page)).toBeVisible();
  await dialogo(page).getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(botao).toBeVisible();
  await botao.click();
  await dialogo(page).getByRole("button", { name: confirmar }).click();
  await expect(page.locator("[data-aviso-da-pagina]")).toContainText(aviso);
}

test("tarefas, catálogo e dias sem expediente também pedem confirmação", async ({ page }) => {
  const tarefa = unico("Tarefa fictícia");
  await page.goto("/tarefas");
  await page.getByLabel("Nova tarefa").fill(tarefa);
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  await apagarComDialogo(page, page.getByRole("button", { name: `Excluir "${tarefa}"` }), "Excluir tarefa", "Tarefa excluída.");
  await expect(page.getByText(tarefa)).toHaveCount(0);

  await page.goto("/prazos/catalogo");
  const tipo = unico("Tipo fictício");
  const tipos = page.locator("section").filter({ has: page.getByRole("heading", { name: "Seus tipos" }) });
  await tipos.getByLabel(/Nome/).fill(tipo);
  await tipos.getByLabel(/Dias/).fill("7");
  await tipos.getByRole("button", { name: /Criar|Adicionar|Cadastrar/ }).click();
  await apagarComDialogo(page, page.getByRole("button", { name: `Excluir o tipo ${tipo}` }), "Excluir tipo", "Tipo de prazo excluído.");

  const dias = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dias sem expediente" }) });
  const motivo = unico("Portaria fictícia");
  await dias.getByLabel("Data").fill("2027-04-12");
  await dias.getByLabel("Motivo").fill(motivo);
  await dias.getByRole("button", { name: /Cadastrar|Adicionar/ }).click();
  const linha = page.getByRole("listitem").filter({ hasText: motivo });
  await apagarComDialogo(page, linha.getByRole("button", { name: /Excluir o dia/ }), "Excluir dia", "Dia sem expediente excluído.");
  await expect(linha).toHaveCount(0);
});
