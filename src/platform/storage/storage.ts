// Arquivos privados; a entrega é sempre por link temporário.
export interface Storage {
  salvar(chave: string, conteudo: Uint8Array, tipo: string): Promise<void>;
  linkTemporario(chave: string, validadeSegundos: number): Promise<string>;
  remover(chave: string): Promise<void>;
}
