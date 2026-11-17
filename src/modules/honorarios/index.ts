// API pública do módulo `honorarios`. Todo caso de uso recebe `contaId` primeiro.
export {
  criarHonorario, definirPagamentoDaParcela, excluirHonorario, listarHonorarios, obterHonorario, resumoFinanceiro,
  type EntradaDeHonorario, type HonorarioComSituacao, type ParcelaComSituacao, type ResumoFinanceiro,
} from "./servico";
export { linkDeCobranca, type SituacaoDaParcela } from "./parcelas";
