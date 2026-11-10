import { ErroDeConfiguracao } from "./env";

// Valida a configuração na subida do servidor. Se estiver inválida, escreve a
// mensagem (só nomes de variáveis, nunca valores) e encerra o processo com código 1,
// para que contêiner e supervisor reiniciem ou alertem. Outros erros sobem como estão.
export function validarNaSubida(
  ler: () => unknown,
  escrever: (mensagem: string) => void,
  sair: (codigo: number) => void,
): void {
  try {
    ler();
  } catch (erro) {
    if (!(erro instanceof ErroDeConfiguracao)) throw erro;
    escrever(erro.message);
    sair(1);
  }
}
