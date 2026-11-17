// Valores em centavos inteiros, para nunca somar dinheiro em ponto flutuante.

const FORMATO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(centavos: number): string {
  // O Intl usa espaço não separável entre "R$" e o número; a tela e os testes usam espaço comum.
  return FORMATO.format(centavos / 100).replace(/ /g, " ");
}

/**
 * Lê um valor digitado no padrão brasileiro ("1.500,00", "1500", "R$ 99,9") e
 * devolve centavos. `null` se não for um valor positivo com até duas casas.
 */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/[R$\s]/g, "").replace(/\./g, "");
  if (!/^\d{1,9}(,\d{1,2})?$/.test(limpo)) return null;
  const [reais, centavos = ""] = limpo.split(",");
  const total = Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
  return total > 0 ? total : null;
}
