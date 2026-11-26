import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Mede o contraste dos tokens de cor de src/app/globals.css nos dois temas, com o
// algoritmo da WCAG 2.2. Pega a regressão quando alguém mexe numa cor.

type Tokens = Record<string, string>;

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf-8");

function lerTokens(bloco: string): Tokens {
  return Object.fromEntries([...bloco.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)].map(([, nome, cor]) => [nome, cor!.toUpperCase()]));
}

const claro = lerTokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
const escuro = { ...claro, ...lerTokens(css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf("@layer base"))) };

const luminancia = (cor: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((inicio) => parseInt(cor.slice(inicio, inicio + 2), 16) / 255)
    .map((canal) => (canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

function contraste(tokens: Tokens, frente: string, fundo: string): number {
  expect(tokens[frente], `token --${frente}`).toBeDefined();
  expect(tokens[fundo], `token --${fundo}`).toBeDefined();
  const [maior, menor] = [luminancia(tokens[frente]!), luminancia(tokens[fundo]!)].sort((x, y) => y - x);
  return (maior! + 0.05) / (menor! + 0.05);
}

// Pares texto/fundo que as telas usam de fato.
const TEXTO: [string, string][] = [
  ["foreground", "background"], ["foreground", "card"], ["card-foreground", "card"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted"],
  ["primary-foreground", "primary"], ["primary", "background"], ["primary", "card"],
  ["secondary-foreground", "secondary"], ["accent-foreground", "accent"],
  ["atencao", "atencao-fundo"], ["atencao", "card"], ["atencao", "background"],
  ["positivo", "positivo-fundo"], ["positivo", "card"],
  ["destructive", "perigo-fundo"], ["destructive", "card"], ["destructive", "background"], ["positivo", "background"],
  ["foreground", "muted"], ["foreground", "secondary"], ["primary", "secondary"], ["muted-foreground", "secondary"],
  // Texto corrido dentro de avisos coloridos.
  ["foreground", "atencao-fundo"], ["foreground", "positivo-fundo"], ["foreground", "perigo-fundo"],
];

// Direção "Protocolo" (docs/adr/0013-identidade-avisos-e-confirmacao.md). Cada cor quente tem um
// único sentido: âmbar pede atenção, verde diz conferido ou concluído, vermelho é atraso,
// erro ou exclusão. A ação usa a tinta de carimbo.
const PALETA = {
  claro: {
    background: "#F4F6FA", card: "#FFFFFF", foreground: "#122240", "muted-foreground": "#4C5A74",
    primary: "#4136A8", atencao: "#8A5200", positivo: "#146240", destructive: "#B3261E",
  },
  escuro: {
    background: "#0D1424", card: "#141D31", foreground: "#EEF1F8", "muted-foreground": "#A9B4CB",
    primary: "#B3AEFF", atencao: "#F0B455", positivo: "#6FD3A2", destructive: "#FF9A90",
  },
} as const;
// Componentes: a borda do campo e o anel de foco precisam de 3:1 (WCAG 1.4.11).
const COMPONENTES: [string, string][] = [["input", "card"], ["input", "background"], ["ring", "card"], ["ring", "background"], ["ring", "muted"], ["ring", "secondary"]];

describe.each([["claro", claro], ["escuro", escuro]] as const)("tema %s", (_nome, tokens) => {
  it.each(TEXTO)("texto --%s sobre --%s tem 4,5:1 ou mais", (frente, fundo) => {
    expect(contraste(tokens, frente, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(COMPONENTES)("componente --%s sobre --%s tem 3:1 ou mais", (frente, fundo) => {
    expect(contraste(tokens, frente, fundo)).toBeGreaterThanOrEqual(3);
  });
});

describe("paleta aprovada", () => {
  it.each([["claro", claro], ["escuro", escuro]] as const)("tema %s usa as cores da especificação", (nome, tokens) => {
    for (const [token, cor] of Object.entries(PALETA[nome])) expect(tokens[token], `--${token}`).toBe(cor);
  });

  it("o tema escuro redefine todas as cores do claro", () => {
    const proprios = lerTokens(css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf("@layer base")));
    expect(Object.keys(proprios).sort()).toEqual(Object.keys(claro).sort());
  });
});
