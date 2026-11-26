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
    "Onde o prazo se perde, e o que o Tempestivo faz", "No que o Tempestivo insiste", "O que ele não faz",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
  }
  await expect(page.getByRole("main")).toContainText("vale só para o TJSP e o TRT-2");
  await expect(page.getByRole("main")).toContainText("Juizados Especiais ficam de fora");
  // O que o app avisa em todo cálculo, a capa também diz.
  await expect(page.getByRole("main")).toContainText("ainda não foram validadas por um advogado");
  await expect(page.getByRole("main")).toContainText("depois que você confirma o seu e-mail");
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
  // A segunda tela ocupa a faixa (compara só na horizontal: ela pode ser mais alta que a janela).
  await expect
    .poll(async () => {
      const faixa = (await carrossel.getByTestId("trilho-do-carrossel").boundingBox())!;
      const caixa = (await tela(TELAS[1]!).boundingBox())!;
      return Math.round(Math.abs(caixa.x - faixa.x));
    })
    .toBeLessThanOrEqual(2);
  await expect(proxima).toBeFocused();
  await proxima.click();
  await proxima.click();
  await expect(posicao).toHaveText(`4 de 4: ${TELAS[3]}`);
  await expect(proxima).toHaveAttribute("aria-disabled", "true");
  await anterior.click();
  await expect(posicao).toHaveText(`3 de 4: ${TELAS[2]}`);

  // A faixa das telas rola com as setas quando está em foco.
  const trilho = carrossel.getByRole("group", { name: "Telas, use as setas para trocar" });
  await trilho.focus();
  await page.keyboard.press("ArrowRight");
  await expect(posicao).toHaveText(`4 de 4: ${TELAS[3]}`);
  await page.keyboard.press("ArrowLeft");
  await expect(posicao).toHaveText(`3 de 4: ${TELAS[2]}`);
  // Atalho com modificador é do navegador, não do carrossel.
  const atalhoInterceptado = await trilho.evaluate((elemento) => {
    const tecla = new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true, bubbles: true, cancelable: true });
    elemento.dispatchEvent(tecla);
    return tecla.defaultPrevented;
  });
  expect(atalhoInterceptado).toBe(false);

  // Insistir na ponta não pode travar a posição: depois, a rolagem por outro meio vale.
  await proxima.click();
  await expect(posicao).toHaveText(`4 de 4: ${TELAS[3]}`);
  await proxima.click({ force: true });
  await trilho.evaluate((elemento) => elemento.scrollTo({ left: 0, behavior: "instant" }));
  await expect(posicao).toHaveText(`1 de 4: ${TELAS[0]}`);

  for (const botao of [anterior, proxima]) {
    const caixa = (await botao.boundingBox())!;
    expect([Math.round(caixa.width), Math.round(caixa.height)]).toEqual([44, 44]);
  }
  await semRolagemHorizontal(page);
  await verificarAcessibilidade(page);
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("as quatro telas continuam na página, alcançáveis por rolagem, sem botão morto", async ({ page }) => {
    await page.goto("/");
    const carrossel = page.getByRole("region", { name: "Telas do Tempestivo" });

    for (const nome of TELAS) await expect(carrossel.getByRole("heading", { level: 3, name: nome })).toHaveCount(1);
    // Rolagem de verdade, como a de quem usa: com `overflow` escondido, nada andaria.
    const trilho = carrossel.getByRole("group", { name: "Telas, use as setas para trocar" });
    await expect(trilho).toHaveCSS("overflow-x", "auto");
    await trilho.scrollIntoViewIfNeeded();
    await trilho.hover();
    await page.mouse.wheel(10_000, 0);
    await expect(carrossel.getByRole("heading", { level: 3, name: TELAS[3] })).toBeInViewport();
    await expect(carrossel.getByRole("button")).toHaveCount(0);
    await semRolagemHorizontal(page);
  });
});
