import { expect, test } from "@playwright/test";
import { cadastrarCliente, cadastrarProcesso, semRolagemHorizontal, unico } from "./apoio";

test("cadastra cliente e processo, busca, edita e arquiva", async ({ page }) => {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Cobrança fictícia");

  await page.goto("/clientes");
  await semRolagemHorizontal(page);
  await cadastrarCliente(page, cliente);
  await semRolagemHorizontal(page);

  await cadastrarProcesso(page, cliente, assunto);
  await semRolagemHorizontal(page);
  await expect(page.getByRole("link", { name: cliente })).toBeVisible();

  await page.goto(`/processos?busca=${encodeURIComponent(assunto)}`);
  await expect(page.getByRole("link", { name: new RegExp(assunto) })).toBeVisible();
  await semRolagemHorizontal(page);

  await page.getByRole("link", { name: new RegExp(assunto) }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Vara").fill("2ª Vara Cível");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("2ª Vara Cível")).toBeVisible();

  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByRole("button", { name: "Reativar" })).toBeVisible();
  await page.goto(`/processos?busca=${encodeURIComponent(assunto)}`);
  await expect(page.getByText("Nenhum processo encontrado.")).toBeVisible();
});

test("o formulário de processo recusa número inválido e mantém o que foi digitado", async ({ page }) => {
  const cliente = unico("Cliente Fictício");
  await cadastrarCliente(page, cliente);

  await page.goto("/processos/novo");
  await page.getByLabel("Cliente").selectOption({ label: cliente });
  await page.getByLabel("Número do processo").fill("1234");
  await page.getByLabel("Assunto").fill("Assunto que deve permanecer");
  await page.getByRole("button", { name: "Cadastrar processo" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText("Número do processo inválido");
  await expect(page.getByLabel("Assunto")).toHaveValue("Assunto que deve permanecer");
});
