import type { Extrator } from "./extrator";

export type FakeExtrator = Extrator & { readonly recebidos: string[] };

export function criarFakeExtrator(resposta: unknown = {}): FakeExtrator {
  const recebidos: string[] = [];
  return {
    recebidos,
    async extrair(texto) {
      if (!texto.trim()) throw new Error("Texto da intimação vazio.");
      recebidos.push(texto);
      return resposta;
    },
  };
}
