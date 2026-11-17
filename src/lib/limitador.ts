// Limitador de tentativas por chave (ex.: "entrar:<ip>:<e-mail>"), em memória.
// Protege contra força bruta dentro de uma instância do servidor. Em hospedagem
// com várias instâncias o limite é por instância; a evolução é guardar no banco.
export type Limitador = {
  /** Registra uma tentativa e diz se ela cabe no limite. */
  permitir(chave: string): boolean;
  /** Zera o contador depois de um sucesso. */
  liberar(chave: string): void;
};

export type OpcoesLimitador = { maximo: number; janelaMs: number; agora?: () => number };

const MAXIMO_DE_CHAVES = 10_000;

export function criarLimitador({ maximo, janelaMs, agora = Date.now }: OpcoesLimitador): Limitador {
  const tentativas = new Map<string, number[]>();

  function limparVencidas(instante: number) {
    for (const [chave, momentos] of tentativas) {
      if (momentos.every((momento) => instante - momento >= janelaMs)) tentativas.delete(chave);
    }
  }

  return {
    permitir(chave) {
      const instante = agora();
      const recentes = (tentativas.get(chave) ?? []).filter((momento) => instante - momento < janelaMs);
      if (recentes.length >= maximo) {
        tentativas.set(chave, recentes);
        return false;
      }
      recentes.push(instante);
      tentativas.set(chave, recentes);
      if (tentativas.size > MAXIMO_DE_CHAVES) limparVencidas(instante);
      return true;
    },
    liberar(chave) {
      tentativas.delete(chave);
    },
  };
}
