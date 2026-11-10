import type { Storage } from "./storage";

export type ArquivoFake = { conteudo: Uint8Array; tipo: string };
export type FakeStorage = Storage & { readonly arquivos: Map<string, ArquivoFake> };

export function criarFakeStorage(): FakeStorage {
  const arquivos = new Map<string, ArquivoFake>();
  return {
    arquivos,
    async salvar(chave, conteudo, tipo) {
      arquivos.set(chave, { conteudo, tipo });
    },
    async linkTemporario(chave, validadeSegundos) {
      if (!(validadeSegundos > 0)) throw new Error("A validade do link deve ser maior que zero.");
      if (!arquivos.has(chave)) throw new Error("Arquivo não encontrado.");
      return `fake-storage://${chave}?expira=${validadeSegundos}`;
    },
    async remover(chave) {
      arquivos.delete(chave);
    },
  };
}
