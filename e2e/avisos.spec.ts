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

test("tarefas avisam a cada ação, inclusive a mesma duas vezes seguidas", async ({ page }) => {
  await page.goto("/tarefas");
  for (const titulo of [unico("Tarefa fictícia"), unico("Tarefa fictícia")]) {
    await page.getByLabel("Nova tarefa").fill(titulo);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await esperarAviso(page, "Tarefa adicionada.");
    await regiao(page).getByRole("button", { name: "Fechar o aviso" }).click();
    await expect(regiao(page)).toBeEmpty();
  }
});

test("honorários, audiências, prazos e catálogo avisam cada ação", async ({ page }) => {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Ação fictícia");
  await cadastrarCliente(page, cliente);
  await cadastrarProcesso(page, cliente, assunto);

  await page.goto("/honorarios/novo");
  await page.getByLabel("Cliente").selectOption({ label: cliente });
  await page.getByLabel("Descrição").fill(unico("Honorário fictício"));
  await page.getByLabel("Valor total").fill("100,00");
  await page.getByLabel("Primeiro vencimento").fill("2026-12-10");
  await page.getByRole("button", { name: "Cadastrar honorário" }).click();
  await esperarAviso(page, "Honorário cadastrado.");
  await page.getByRole("button", { name: "Marcar como paga a parcela 1" }).click();
  await esperarAviso(page, "Parcela marcada como paga.");
  await page.getByRole("button", { name: "Desfazer o pagamento da parcela 1" }).click();
  await esperarAviso(page, "Pagamento da parcela desfeito.");

  await page.goto("/prazos/novo");
  await page.getByRole("button", { name: "Digitar a data final" }).click();
  await page.getByLabel("Processo").selectOption({ index: 1 });
  await page.getByLabel("Descrição").fill(unico("Prazo fictício"));
  await page.getByLabel("Data final").fill("2027-02-10");
  const conferi = page.getByRole("checkbox");
  if (await conferi.count()) await conferi.last().check();
  await page.getByRole("button", { name: "Salvar prazo" }).click();
  await esperarAviso(page, "Prazo salvo.");
  await page.getByRole("button", { name: "Li e conferi" }).click();
  await esperarAviso(page, "Conferência registrada.");
  await page.getByRole("button", { name: "Marcar como cumprido" }).click();
  await esperarAviso(page, "Prazo marcado como cumprido.");
  await page.getByRole("button", { name: "Desfazer cumprido" }).click();
  await esperarAviso(page, "Cumprido desfeito.");

  await page.goto("/prazos/catalogo");
  const secao = page.getByRole("region", { name: "Dias sem expediente" }).or(page.locator("section").filter({ hasText: "Dias sem expediente" }).last());
  const motivo = unico("Portaria fictícia");
  await secao.getByLabel("Data").fill("2027-03-15");
  await secao.getByLabel("Motivo").fill(motivo);
  await secao.getByRole("button", { name: /Cadastrar|Adicionar/ }).click();
  await expect(page.getByText(motivo)).toBeVisible();
  await page.getByRole("listitem").filter({ hasText: motivo }).getByRole("button", { name: /Excluir o dia/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir dia" }).click();
  await esperarAviso(page, "Dia sem expediente excluído.");
});

test("o sucesso antigo sai na ação seguinte, mesmo que ela não avise", async ({ page }) => {
  const titulo = unico("Tarefa fictícia");
  await page.goto("/tarefas");
  await page.getByLabel("Nova tarefa").fill(titulo);
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  await esperarAviso(page, "Tarefa adicionada.");
  // Mover não gera aviso próprio: o anterior não pode parecer a resposta.
  await page.getByRole("button", { name: `Mover "${titulo}" para Fazendo` }).click();
  await expect(regiao(page)).toBeEmpty();
});

test("a mesma mensagem de novo é um aviso novo, com faixa lateral; fechar não perde o foco", async ({ page }) => {
  await page.goto("/tarefas");
  async function adicionar() {
    await page.getByLabel("Nova tarefa").fill(unico("Tarefa fictícia"));
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await esperarAviso(page, "Tarefa adicionada.");
  }
  await adicionar();
  const caixa = regiao(page).locator("> div");
  await expect(caixa).toHaveCSS("border-left-width", "4px");
  await caixa.evaluate((elemento) => elemento.setAttribute("data-antigo", "sim"));
  await adicionar();
  // Elemento novo na região: o leitor de tela anuncia de novo.
  await expect(regiao(page).locator("[data-antigo]")).toHaveCount(0);

  await regiao(page).getByRole("button", { name: "Fechar o aviso" }).press("Enter");
  await expect(regiao(page)).toBeEmpty();
  await expect(page.locator("#conteudo")).toBeFocused();
});
