// Só sugere: a saída é `unknown` e quem chama valida com zod. O resultado vira
// rascunho; o prazo só existe depois da confirmação do advogado.
export interface Extrator {
  extrair(texto: string): Promise<unknown>;
}
