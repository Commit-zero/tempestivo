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
