import { expect, test, type Page } from "@playwright/test";
import { cadastrarCliente, cadastrarProcesso, semRolagemHorizontal, unico } from "./apoio";

async function prepararProcesso(page: Page): Promise<string> {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Ação fictícia");
  await cadastrarCliente(page, cliente);
  await cadastrarProcesso(page, cliente, assunto);
  return assunto;
}

test("cadastra um prazo vendo o passo a passo, confere, edita e cumpre", async ({ page }) => {
  await prepararProcesso(page);
  await page.getByRole("link", { name: "Novo prazo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Novo prazo" })).toBeVisible();
  await semRolagemHorizontal(page);

  // Sem calcular, não dá para salvar: o que se salva é sempre o que se viu.
  await expect(page.getByRole("button", { name: "Salvar prazo" })).toBeDisabled();

  await page.getByLabel("Tipo de prazo").selectOption({ label: "Contestação (cível) (15 dias úteis)" });
  await expect(page.getByLabel("Descrição")).toHaveValue("Contestação (cível)");
  await page.getByLabel("Data do evento").fill("2026-11-12");
  await page.getByRole("button", { name: "Calcular data final" }).click();

  const main = page.getByRole("main");
  await expect(main.getByText("04/12/2026 (sexta-feira)").first()).toBeVisible();
  await expect(main.getByText("Cálculo auxiliar, confira.")).toBeVisible();
  await expect(main.getByText("20/11/2026 (feriado: Consciência Negra)")).toBeVisible();
  await semRolagemHorizontal(page);

  // Com regras pendentes, só salva depois da declaração de conferência.
  await expect(page.getByRole("button", { name: "Salvar prazo" })).toBeDisabled();
  await page.getByLabel("Conferi esta data final nos autos").check();
  await page.getByRole("button", { name: "Salvar prazo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Contestação (cível)" })).toBeVisible();
  await expect(main.getByText("Você ainda não registrou que conferiu este prazo.")).toBeVisible();
  await expect(main.getByText("Como contamos")).toBeVisible();
  await semRolagemHorizontal(page);

  await page.getByRole("button", { name: "Li e conferi" }).click();
  await expect(main.getByText("conferido hoje")).toBeVisible();
  await expect(main.getByText("pelo aplicativo")).toBeVisible();

  // Editar os dias recalcula e zera a conferência.
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Dias").fill("5");
  await page.getByRole("button", { name: "Calcular data final" }).click();
  await expect(main.getByText("19/11/2026 (quinta-feira)").first()).toBeVisible();
  await page.getByLabel("Conferi esta data final nos autos").check();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(main.getByText("a conferência foi zerada")).toBeVisible();
  await expect(main.getByText("Histórico de alterações")).toBeVisible();
  await expect(main.getByText("Dias: 15 → 5")).toBeVisible();

  await page.getByRole("button", { name: "Marcar como cumprido" }).click();
  await expect(page.getByRole("button", { name: "Desfazer cumprido" })).toBeVisible();
});

test("tribunal fora do escopo pede a data manual e o prazo aparece na lista", async ({ page }) => {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Ação em outro tribunal");
  await cadastrarCliente(page, cliente);
  await cadastrarProcesso(page, cliente, assunto, "TJRJ");

  await page.getByRole("link", { name: "Novo prazo" }).click();
  await expect(page.getByLabel("Data final")).toBeVisible();
  const descricao = unico("Recurso");
  await page.getByLabel("Descrição").fill(descricao);
  await page.getByLabel("Data final").fill("2027-03-10");
  await page.getByRole("button", { name: "Salvar prazo" }).click();

  await expect(page.getByRole("main").getByText("Data final (data manual)")).toBeVisible();
  await page.goto("/prazos");
  await expect(page.getByRole("link", { name: new RegExp(descricao) })).toContainText("data manual");
  await semRolagemHorizontal(page);
});

test("o catálogo ajusta os dias de um tipo e cadastra dia sem expediente", async ({ page }) => {
  await page.goto("/prazos/catalogo");
  await semRolagemHorizontal(page);

  const motivo = unico("Portaria fictícia");
  await page.getByLabel("Data", { exact: true }).fill("2027-06-15");
  await page.getByLabel("Motivo").fill(motivo);
  await page.getByRole("button", { name: "Cadastrar dia" }).click();
  await expect(page.getByRole("main").getByText(new RegExp(motivo))).toBeVisible();

  const nome = unico("Memoriais");
  await page.getByLabel("Nome do tipo").fill(nome);
  await page.getByLabel("Dias", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Criar tipo" }).click();
  await expect(page.getByRole("main").getByText(nome)).toBeVisible();
});

test("lê uma intimação, mostra o rascunho com a origem de cada campo e só cria o prazo depois da conferência", async ({ page }) => {
  await page.goto("/prazos/intimacao");
  await semRolagemHorizontal(page);
  await page.getByLabel("Texto da intimação").fill(
    "Disponibilizado no DJe em 12/11/2026. Fica a parte ré intimada para apresentar contestação no prazo de 15 (quinze) dias úteis.",
  );
  await page.getByRole("button", { name: "Ler intimação" }).click();

  const rascunho = page.getByRole("region", { name: "Rascunho lido" });
  await expect(rascunho).toContainText("15 dias úteis");
  await expect(rascunho).toContainText("12/11/2026 (disponibilização no diário)");
  await expect(rascunho).toContainText("Contestação");
  await expect(rascunho).toContainText("Não achei o número do processo");
  await expect(rascunho).toContainText("Isto é só uma sugestão");
  await semRolagemHorizontal(page);

  await rascunho.getByRole("link", { name: "Conferir e cadastrar o prazo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Rascunho lido da intimação" })).toBeVisible();
  await expect(page.getByLabel("Descrição")).toHaveValue("Contestação");
  await expect(page.getByLabel("Data do evento")).toHaveValue("2026-11-12");
  await expect(page.getByLabel("Evento que inicia o prazo")).toHaveValue("disponibilizacao");
  // Nada foi criado: ainda falta escolher o processo, calcular e salvar.
  await expect(page.getByRole("button", { name: "Salvar prazo" })).toBeDisabled();
});
