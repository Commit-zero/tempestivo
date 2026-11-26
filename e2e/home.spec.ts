import { expect, test } from "@playwright/test";
import { verificarAcessibilidade } from "./acessibilidade";
import { semRolagemHorizontal } from "./apoio";

test.use({ storageState: { cookies: [], origins: [] } });

test("a página inicial carrega em português, sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nunca perca um prazo e receba seus honorários.");
  await expect(page.getByRole("link", { name: "Criar conta gratuita" }).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await semRolagemHorizontal(page);
  await verificarAcessibilidade(page);
});

test("a capa mostra a contagem, os problemas e soluções, os diferenciais e os limites", async ({ page }) => {
  await page.goto("/");

  const dias = page.getByRole("list", { name: "Contagem do prazo, dia a dia" }).getByRole("listitem");
  await expect(dias).toHaveCount(23);
  await expect(dias.filter({ hasText: "20/11/2026: não conta (feriado: Consciência Negra)." })).toHaveCount(1);
  await expect(dias.last()).toContainText("15º dia contado. Vencimento.");
  // No computador a contagem cabe numa linha: o vencimento não sobra sozinho embaixo.
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    const alturas = await dias.evaluateAll((celulas) => new Set(celulas.map((celula) => celula.getBoundingClientRect().top)).size);
    expect(alturas).toBe(1);
  }
  await expect(page.getByText("Regras aplicadas (0)")).toHaveCount(0);

  for (const titulo of [
    "Onde o prazo se perde, e o que o Tempestivo faz", "O que não é igual em outras agendas", "O que ele não faz",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
  }
  await expect(page.getByRole("main")).toContainText("vale só para o TJSP e o TRT-2");
  await expect(page.getByRole("main")).toContainText("não se conecta a tribunais");
  await expect(page.getByRole("main")).toContainText("só dados fictícios");
  await expect(page.getByRole("link", { name: "Criar conta gratuita" })).toHaveCount(2);
});

test("em 320 px a capa não rola na horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");

  await semRolagemHorizontal(page);
});

test("com menos movimento, a contagem aparece completa de uma vez", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const ultimo = page.getByRole("list", { name: "Contagem do prazo, dia a dia" }).getByRole("listitem").last();
  await expect(ultimo).toHaveCSS("animation-delay", "0s");
  await expect(ultimo).toHaveCSS("opacity", "1");
});

test("os termos de uso e a política de privacidade abrem sem login e ligam um ao outro", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Termos de uso" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("O cálculo de prazo é auxiliar");
  await semRolagemHorizontal(page);

  await page.getByRole("contentinfo").getByRole("link", { name: "Política de privacidade" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("não é guardado");
  await semRolagemHorizontal(page);
});

const TELAS = ["Prazo com a contagem", "O painel do dia", "Honorários e cobrança", "A agenda no celular"];

test("carrossel: botões e teclado trocam de tela, sem rodar sozinho", async ({ page }) => {
  await page.goto("/");
  const carrossel = page.getByRole("region", { name: "Telas do Tempestivo" });
  const posicao = carrossel.getByTestId("posicao-do-carrossel");
  const anterior = carrossel.getByRole("button", { name: "Tela anterior" });
  const proxima = carrossel.getByRole("button", { name: "Próxima tela" });
  const tela = (nome: string) => carrossel.getByRole("group", { name: new RegExp(nome) });

  await carrossel.scrollIntoViewIfNeeded();
  await expect(posicao).toHaveText(`1 de 4: ${TELAS[0]}`);
  await expect(anterior).toHaveAttribute("aria-disabled", "true");
  // Não roda sozinho: passado um tempo de leitura, continua na primeira.
  await page.waitForTimeout(6_000);
  await expect(posicao).toHaveText(`1 de 4: ${TELAS[0]}`);

  await proxima.press("Enter");
  await expect(posicao).toHaveText(`2 de 4: ${TELAS[1]}`);
  await expect(tela(TELAS[1]!)).toBeInViewport({ ratio: 0.6 });
  await expect(proxima).toBeFocused();
  await proxima.click();
  await proxima.click();
  await expect(posicao).toHaveText(`4 de 4: ${TELAS[3]}`);
  await expect(proxima).toHaveAttribute("aria-disabled", "true");
  await anterior.click();
  await expect(posicao).toHaveText(`3 de 4: ${TELAS[2]}`);

  // A faixa das telas rola com as setas quando está em foco.
  await carrossel.getByTestId("trilho-do-carrossel").focus();
  await page.keyboard.press("ArrowRight");
  await expect(posicao).toHaveText(`4 de 4: ${TELAS[3]}`);
  await semRolagemHorizontal(page);
  await verificarAcessibilidade(page);
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("as quatro telas continuam na página, alcançáveis por rolagem, sem botão morto", async ({ page }) => {
    await page.goto("/");
    const carrossel = page.getByRole("region", { name: "Telas do Tempestivo" });

    for (const nome of TELAS) await expect(carrossel.getByRole("heading", { level: 3, name: nome })).toHaveCount(1);
    await carrossel.getByRole("heading", { level: 3, name: TELAS[3] }).scrollIntoViewIfNeeded();
    await expect(carrossel.getByRole("heading", { level: 3, name: TELAS[3] })).toBeInViewport();
    await expect(carrossel.getByRole("button")).toHaveCount(0);
    await semRolagemHorizontal(page);
  });
});
