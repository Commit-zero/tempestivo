import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Mede o contraste dos tokens de cor de src/app/globals.css nos dois temas, com o
// algoritmo da WCAG 2.2. Pega a regressão quando alguém mexe numa cor.

type Tokens = Record<string, [number, number, number]>;

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf-8");

function lerTokens(bloco: string): Tokens {
  const tokens: Tokens = {};
  for (const [, nome, l, c, h] of bloco.matchAll(/--([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    tokens[nome] = [Number(l), Number(c), Number(h)];
  }
  return tokens;
}

const claro = lerTokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
const escuro = { ...claro, ...lerTokens(css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf("@layer base"))) };

/** oklch para sRGB linear (Björn Ottosson), recortado ao intervalo exibível. */
function linear([L, C, h]: [number, number, number]): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const recortar = (valor: number) => Math.max(0, Math.min(1, valor));
  return [
    recortar(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    recortar(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    recortar(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const luminancia = (cor: [number, number, number]) => {
  const [r, g, b] = linear(cor);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contraste(tokens: Tokens, frente: string, fundo: string): number {
  expect(tokens[frente], `token --${frente}`).toBeDefined();
  expect(tokens[fundo], `token --${fundo}`).toBeDefined();
  const [maior, menor] = [luminancia(tokens[frente]), luminancia(tokens[fundo])].sort((x, y) => y - x);
  return (maior + 0.05) / (menor + 0.05);
}

// Pares texto/fundo que as telas usam de fato.
const TEXTO: [string, string][] = [
  ["foreground", "background"], ["foreground", "card"], ["card-foreground", "card"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted"],
  ["primary-foreground", "primary"], ["primary", "background"], ["primary", "card"],
  ["secondary-foreground", "secondary"], ["accent-foreground", "accent"],
  ["atencao", "atencao-fundo"], ["atencao", "card"], ["atencao", "background"],
  ["positivo", "positivo-fundo"], ["positivo", "card"],
  ["destructive", "perigo-fundo"], ["destructive", "card"],
];
// Componentes: a borda do campo e o anel de foco precisam de 3:1 (WCAG 1.4.11).
const COMPONENTES: [string, string][] = [["input", "card"], ["input", "background"], ["ring", "card"], ["ring", "background"]];

describe.each([["claro", claro], ["escuro", escuro]] as const)("tema %s", (_nome, tokens) => {
  it.each(TEXTO)("texto --%s sobre --%s tem 4,5:1 ou mais", (frente, fundo) => {
    expect(contraste(tokens, frente, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(COMPONENTES)("componente --%s sobre --%s tem 3:1 ou mais", (frente, fundo) => {
    expect(contraste(tokens, frente, fundo)).toBeGreaterThanOrEqual(3);
  });
});
