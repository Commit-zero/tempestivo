import { expect, type Page } from "@playwright/test";

// Verificação automática dos pontos essenciais da WCAG 2.2 que dá para conferir no
// DOM: estrutura, nomes acessíveis e rótulos. Não substitui o teste com teclado e
// leitor de tela; pega a regressão mais comum, que é o controle sem nome.
export async function verificarAcessibilidade(page: Page): Promise<void> {
  // Com streaming, o esqueleto de carregamento (sem título) chega antes do conteúdo:
  // espera a tela terminar de carregar antes de inspecionar.
  await page.locator("[data-carregando]").waitFor({ state: "detached" });
  const problemas = await page.evaluate(() => {
    const encontrados: string[] = [];
    const visivel = (elemento: Element) => {
      const estilo = getComputedStyle(elemento);
      const caixa = elemento.getBoundingClientRect();
      return estilo.display !== "none" && estilo.visibility !== "hidden" && (caixa.width > 0 || caixa.height > 0 || elemento.closest(".sr-only"));
    };
    const descrever = (elemento: Element) =>
      `<${elemento.tagName.toLowerCase()}${elemento.id ? `#${elemento.id}` : ""}${elemento.getAttribute("name") ? ` name=${elemento.getAttribute("name")}` : ""}> "${(elemento.textContent ?? "").trim().slice(0, 40)}"`;
    const nomeAcessivel = (elemento: Element): string => {
      const rotulo = elemento.getAttribute("aria-label");
      if (rotulo?.trim()) return rotulo;
      const rotuladoPor = elemento.getAttribute("aria-labelledby");
      if (rotuladoPor) return rotuladoPor.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
      if (elemento.id) {
        const associado = document.querySelector(`label[for="${CSS.escape(elemento.id)}"]`);
        if (associado?.textContent?.trim()) return associado.textContent;
      }
      const envolvente = elemento.closest("label");
      if (envolvente?.textContent?.trim()) return envolvente.textContent;
      const imagens = [...elemento.querySelectorAll("img[alt]")].map((imagem) => imagem.getAttribute("alt")).join(" ");
      return `${elemento.textContent ?? ""} ${imagens} ${elemento.getAttribute("title") ?? ""}`.trim();
    };

    if (!document.documentElement.lang) encontrados.push("html sem lang");
    const titulos = [...document.querySelectorAll("h1")].filter(visivel);
    if (titulos.length !== 1) encontrados.push(`esperado 1 h1 visível, encontrado ${titulos.length}`);
    if (document.querySelectorAll("main").length !== 1) encontrados.push("esperado exatamente 1 <main>");

    // Níveis de título sem saltos (h2 depois de h4 pode; h4 depois de h2, não).
    let nivelAnterior = 0;
    for (const titulo of document.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
      const nivel = Number(titulo.tagName[1]);
      if (nivelAnterior > 0 && nivel > nivelAnterior + 1) encontrados.push(`salto de título h${nivelAnterior} para h${nivel}: ${descrever(titulo)}`);
      nivelAnterior = nivel;
    }

    for (const controle of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
      if (!nomeAcessivel(controle)) encontrados.push(`campo sem rótulo: ${descrever(controle)}`);
    }
    for (const interativo of document.querySelectorAll("button, a[href], [role=button]")) {
      if (visivel(interativo) && !nomeAcessivel(interativo)) encontrados.push(`controle sem nome acessível: ${descrever(interativo)}`);
    }
    for (const imagem of document.querySelectorAll("img")) {
      if (!imagem.hasAttribute("alt")) encontrados.push(`imagem sem alt: ${imagem.getAttribute("src")}`);
    }
    // aria-hidden não pode esconder o que recebe foco.
    // Com um diálogo modal aberto, o Radix esconde o resto da página (marca `data-aria-hidden`)
    // e prende o foco no diálogo: isso é o comportamento correto, não um problema.
    const comModal = document.querySelector("[role=alertdialog], [role=dialog]") !== null;
    for (const escondido of document.querySelectorAll("[aria-hidden=true]")) {
      if (comModal && escondido.hasAttribute("data-aria-hidden")) continue;
      if (escondido.matches("a[href], button, input, select, textarea") || escondido.querySelector("a[href], button, input, select, textarea")) {
        encontrados.push(`elemento focável dentro de aria-hidden: ${descrever(escondido)}`);
      }
    }
    return encontrados;
  });
  expect(problemas, `problemas de acessibilidade em ${page.url()}`).toEqual([]);
}
