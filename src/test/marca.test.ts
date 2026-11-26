import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EXEMPLO_DE_CONTAGEM as exemplo } from "@/lib/exemplo-de-contagem";

// O símbolo e o exemplo aparecem em arquivos que não se importam entre si (o SVG, o
// componente e o roteiro que gera as imagens). Aqui eles são conferidos um contra o outro.
const ler = (caminho: string) => readFileSync(resolve(process.cwd(), caminho), "utf-8");
// No componente, o React escreve `strokeWidth`; no SVG, `stroke-width`.
const formas = (svg: string) => [...svg.replace(/strokeWidth/g, "stroke-width").matchAll(/\b(?:d|x|y|width|height|rx|fill|stroke)="([^"]+)"/g)].map((m) => m[1]!.toUpperCase());
const semMoldura = (svg: string) => svg.slice(svg.indexOf("<rect"), svg.lastIndexOf("</svg>"));

describe("símbolo Quadra (opção 1, escolhida em 26/11/2026)", () => {
  const escolhido = formas(semMoldura(ler("docs/especificacoes/simbolos/opcao-1-quadra.svg")));

  it("o ícone do app é a opção escolhida", () => {
    expect(formas(semMoldura(ler("src/app/icon.svg")))).toEqual(escolhido);
  });

  it("o componente da marca desenha as mesmas formas", () => {
    expect(formas(semMoldura(ler("src/components/app/marca.tsx")))).toEqual(escolhido);
  });

  it("o manifesto e o roteiro das imagens usam a cor do símbolo", () => {
    expect(ler("src/app/manifest.ts")).toContain('theme_color: "#4136a8"');
    expect(ler("scripts/gerar-imagens.mjs")).toContain('const CARIMBO = "#4136A8"');
  });
});

describe("imagem de compartilhamento", () => {
  it("mostra a mesma contagem da capa", () => {
    const esperado = exemplo.faixa
      .map((dia) => (dia.tipo === "intimacao" ? "I" : dia.tipo === "sem-expediente" ? "F" : `${dia.numero}${dia.data === exemplo.metaInterna ? "M" : ""}${dia.data === exemplo.vencimento ? "V" : ""}`))
      .join(" ");

    expect(ler("scripts/gerar-imagens.mjs")).toContain(`const FAIXA = "${esperado}";`);
  });
});
