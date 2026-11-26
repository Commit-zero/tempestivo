import { expect, test, type Page } from "@playwright/test";
import { cadastrarCliente, cadastrarProcesso, semRolagemHorizontal, unico } from "./apoio";

// Toda ação responde: o aviso aparece à vista, não leva dado pessoal e não fica no
// endereço. A região é a mesma em todas as telas da área logada.
const regiao = (page: Page) => page.locator("[data-aviso-da-pagina]");

async function esperarAviso(page: Page, texto: string) {
  await expect(regiao(page)).toContainText(texto);
  await expect(regiao(page).getByText(texto)).toBeInViewport();
}

test("clientes e processos avisam o resultado, sem dado pessoal no endereço ou no cookie", async ({ page, context }) => {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Ação fictícia");

  await cadastrarCliente(page, cliente);
  await esperarAviso(page, "Cliente cadastrado.");
  await semRolagemHorizontal(page);
  expect(page.url()).not.toContain("aviso");
  // Depois de mostrado, o cookie é apagado: recarregar não repete o aviso.
  await expect.poll(async () => (await context.cookies()).filter((cookie) => cookie.name === "tempestivo.aviso")).toEqual([]);
  await page.reload();
  await expect(regiao(page)).toBeEmpty();

  await cadastrarProcesso(page, cliente, assunto);
  await esperarAviso(page, "Processo cadastrado.");

  await page.getByRole("button", { name: /Arquivar/ }).click();
  await esperarAviso(page, "Processo arquivado.");
  await page.getByRole("button", { name: /Reativar/ }).click();
  await esperarAviso(page, "Processo reativado.");

  await regiao(page).getByRole("button", { name: "Fechar o aviso" }).click();
  await expect(regiao(page)).toBeEmpty();
});

test("o aviso sai ao mudar de tela e não volta", async ({ page }) => {
  await cadastrarCliente(page, unico("Cliente Fictício"));
  await esperarAviso(page, "Cliente cadastrado.");

  await page.getByRole("link", { name: "Clientes" }).first().click();
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(regiao(page)).toBeEmpty();
  await page.goBack();
  await expect(regiao(page)).toBeEmpty();
});
