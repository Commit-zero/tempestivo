import { expect, test } from "@playwright/test";
import { verificarAcessibilidade } from "./acessibilidade";
import { cadastrarCliente, cadastrarProcesso, semRolagemHorizontal, unico } from "./apoio";

// Todas as telas da área logada passam pela verificação de acessibilidade e de
// rolagem horizontal, nas três larguras (os projetos do Playwright).
const ROTAS_DA_AREA_LOGADA = [
  "/painel", "/prazos", "/prazos?filtro=vencidos", "/prazos/novo", "/prazos/catalogo", "/prazos/intimacao",
  "/processos", "/processos/novo", "/clientes", "/clientes/novo", "/honorarios", "/honorarios/novo",
  "/audiencias", "/audiencias/nova", "/tarefas", "/conta", "/mais",
];

test("telas da área logada: estrutura, nomes acessíveis e sem rolagem horizontal", async ({ page }) => {
  for (const rota of ROTAS_DA_AREA_LOGADA) {
    await page.goto(rota);
    await verificarAcessibilidade(page);
    await semRolagemHorizontal(page);
  }
});

test("telas de detalhe: cliente, processo e prazo", async ({ page }) => {
  const cliente = unico("Cliente Fictício");
  const assunto = unico("Ação fictícia");
  await cadastrarCliente(page, cliente);
  await verificarAcessibilidade(page);
  await cadastrarProcesso(page, cliente, assunto);
  await verificarAcessibilidade(page);

  await page.getByRole("link", { name: "Novo prazo" }).click();
  await page.getByRole("button", { name: "Digitar a data final" }).click();
  await page.getByLabel("Descrição").fill("Prazo fictício");
  await page.getByLabel("Data final").fill("2027-03-10");
  await page.getByRole("button", { name: "Salvar prazo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Prazo fictício" })).toBeVisible();
  await verificarAcessibilidade(page);
  await semRolagemHorizontal(page);
});

test.describe("telas públicas", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const rota of ["/", "/entrar", "/cadastro", "/recuperar-senha", "/termos", "/privacidade", "/conferir/token-invalido-0123456789abcdef", "/rota-que-nao-existe"]) {
    test(`${rota}: estrutura, nomes acessíveis e sem rolagem horizontal`, async ({ page }) => {
      await page.goto(rota);
      await verificarAcessibilidade(page);
      await semRolagemHorizontal(page);
    });
  }
});

test("a 320 px (reflow da WCAG) nenhuma tela principal rola na horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const rota of ["/painel", "/prazos", "/prazos/novo", "/honorarios", "/tarefas", "/conta"]) {
    await page.goto(rota);
    await semRolagemHorizontal(page);
  }
});
