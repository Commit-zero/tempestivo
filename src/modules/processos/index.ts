// API pública do módulo `processos`. Todo caso de uso recebe `contaId` primeiro.
export {
  atualizarProcesso, criarProcesso, excluirProcesso, listarProcessos, mudarStatusDoProcesso, obterProcesso,
  type EntradaDeProcesso,
} from "./servico";
export { formatarNumeroCnj, numeroCnjValido } from "./numero-cnj";
export type { FiltroDeProcessos, Processo, StatusProcesso } from "./repositorio";
