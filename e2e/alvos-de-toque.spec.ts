import { expect, test, type Page } from "@playwright/test";
import { semRolagemHorizontal } from "./apoio";

// No celular, o que se toca tem pelo menos 44 px de altura. A exceção é o link no meio
// de uma frase (WCAG 2.5.8): ele segue a altura da linha.
const MINIMO = 44;

async function pequenos(page: Page): Promise<string[]> {
  await page.locator("[data-carregando]").waitFor({ state: "detached" });
  return page.evaluate((minimo) => {
    const noMeioDaFrase = (elemento: Element) => {
      if (getComputedStyle(elemento).display !== "inline") return false;
      const pai = elemento.parentElement;
      return Boolean(pai && [...pai.childNodes].some((no) => no.nodeType === Node.TEXT_NODE && no.textContent!.trim().length > 1));
    };
    return [...document.querySelectorAll("a[href], button, summary, select, input:not([type=hidden]):not([type=checkbox])")]
      .filter((elemento) => {
        const caixa = elemento.getBoundingClientRect();
        // Fora da conta: o que está oculto ou só existe para o teclado ("pular para o conteúdo").
        if (caixa.width <= 1 || caixa.height <= 1 || elemento.closest(".sr-only, [hidden]") || elemento.classList.contains("sr-only")) return false;
        const estreito = elemento.tagName === "A" && caixa.width < minimo - 0.5;
        return (caixa.height < minimo - 0.5 || estreito) && !noMeioDaFrase(elemento);
      })
      .map((elemento) => `${elemento.tagName.toLowerCase()} "${(elemento.textContent || elemento.getAttribute("aria-label") || "").trim().slice(0, 40)}" ${Math.round(elemento.getBoundingClientRect().width)}x${Math.round(elemento.getBoundingClientRect().height)}px`);
  }, MINIMO);
}

async function conferir(page: Page, rotas: readonly string[]) {
  const problemas: string[] = [];
  for (const rota of rotas) {
    await page.goto(rota);
    // Medir a tela errada (login no lugar da tela logada) daria um falso "passou".
    expect(new URL(page.url()).pathname).toBe(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    problemas.push(...(await pequenos(page)).map((item) => `${rota}: ${item}`));
    await semRolagemHorizontal(page);
  }
  expect(problemas).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) > 400, "alvos de toque são conferidos na largura de celular");
});

test.describe("sem sessão", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("telas públicas: alvos de 44 px", async ({ page }) => {
    await conferir(page, ["/", "/entrar", "/cadastro", "/recuperar-senha", "/redefinir-senha", "/email-confirmado", "/termos", "/privacidade", "/rota-que-nao-existe"]);
  });

  test("telas públicas em 320 px não rolam na horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await conferir(page, ["/", "/entrar", "/cadastro", "/termos", "/privacidade"]);
  });
});

test("área logada: alvos de 44 px", async ({ page }) => {
  await conferir(page, [
    "/painel", "/prazos", "/prazos/novo", "/prazos/catalogo", "/processos", "/processos/novo", "/clientes", "/clientes/novo",
    "/honorarios", "/honorarios/novo", "/audiencias", "/audiencias/nova", "/tarefas", "/conta", "/mais",
  ]);
});
